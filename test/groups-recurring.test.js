// MID-7: verifikasi layar Groups & Recurring (kontrak API yang dipakai UI v2) + runDue.
// UI ada di public/index.html (tanpa harness DOM), jadi bagian UI dicek lewat pemeriksaan statis markup/handler.
import { test } from 'node:test'; import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { start } from './helpers.js'
import { runDue } from '../src/recurring.js'

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8')
const setup = async () => { const s = await start(); await s.login(); return s }

// ---------- Groups (DoD 1-3) ----------
test('groups: daftar memuat nama & tipe', async () => {
  const s = await setup()
  const { status, json } = await s.call('GET', '/api/groups')
  assert.equal(status, 200); assert.ok(json.length > 0)
  for (const g of json) { assert.ok(g.name); assert.ok(['asset', 'liability'].includes(g.type)) }
  s.close()
})
test('groups: tambah, ubah, hapus tersimpan di backend', async () => {
  const s = await setup()
  const add = await s.call('POST', '/api/groups', { name: 'Reksa', type: 'asset' })
  assert.equal(add.status, 201)
  const id = add.json.id
  assert.equal((await s.call('PUT', `/api/groups/${id}`, { name: 'Reksa2', type: 'liability' })).status, 200)
  const g = (await s.call('GET', '/api/groups')).json.find(x => x.id === id)
  assert.deepEqual([g.name, g.type], ['Reksa2', 'liability'])
  assert.equal((await s.call('DELETE', `/api/groups/${id}`)).status, 200)
  assert.equal((await s.call('GET', '/api/groups')).json.some(x => x.id === id), false)
  s.close()
})
test('groups: tipe selain asset/liability ditolak; nama harus unik', async () => {
  const s = await setup()
  assert.equal((await s.call('POST', '/api/groups', { name: 'Z', type: 'equity' })).status, 400)
  const g = (await s.call('GET', '/api/groups')).json[0]
  assert.equal((await s.call('POST', '/api/groups', { name: g.name, type: 'asset' })).status, 400)
  s.close()
})
test('groups: form UI hanya menawarkan asset & liability', () => {
  assert.match(html, /const GROUP_TYPES = \[\['asset', 'Asset'\], \['liability', 'Liability'\]\]/)
})
test('groups: hapus grup berakun ditolak dengan pesan error, grup tetap ada', async () => {
  const s = await setup()
  const g = (await s.call('POST', '/api/groups', { name: 'Berakun', type: 'asset' })).json.id
  await s.call('POST', '/api/accounts', { name: 'Akun di grup', group_id: g, type: 'asset' })
  const del = await s.call('DELETE', `/api/groups/${g}`)
  assert.equal(del.status, 400); assert.match(del.json.error, /FOREIGN KEY/i)
  assert.ok((await s.call('GET', '/api/groups')).json.some(x => x.id === g))
  assert.match(html, /FOREIGN KEY[^\n]*masih memiliki akun/) // UI memetakan error ke pesan ramah
  s.close()
})
test('groups: hapus grup kosong berhasil', async () => {
  const s = await setup()
  const g = (await s.call('POST', '/api/groups', { name: 'Kosong', type: 'liability' })).json.id
  assert.equal((await s.call('DELETE', `/api/groups/${g}`)).status, 200)
  s.close()
})
test('groups: UI punya state kosong, error+retry, dan aksi tambah/ubah', () => {
  assert.match(html, /Belum ada grup\./); assert.match(html, /Gagal memuat grup/)
  assert.match(html, /data-a="groupsRetry"/); assert.match(html, /grpAdd/); assert.match(html, /grpEdit/)
})

// ---------- Recurring (DoD 4-6) ----------
const newRec = async (s, extra = {}) => {
  const a = (await s.call('POST', '/api/accounts', { name: 'RA' + Math.random(), type: 'asset' })).json.id
  const r = await s.call('POST', '/api/recurring', { kind: 'expense', amount: 500, account_id: a, note: 'cicilan', day_of_month: 5, active: 1, ...extra })
  return { id: r.json.id, a, status: r.status }
}
test('recurring: daftar memuat semua field yang ditampilkan', async () => {
  const s = await setup(); const r = await newRec(s); assert.equal(r.status, 201)
  const row = (await s.call('GET', '/api/recurring')).json.find(x => x.id === r.id)
  for (const k of ['kind', 'amount', 'account_id', 'category_id', 'note', 'day_of_month', 'active', 'last_run']) assert.ok(k in row, k)
  s.close()
})
test('recurring: ubah dan toggle aktif/nonaktif tersimpan', async () => {
  const s = await setup(); const { id } = await newRec(s)
  await s.call('PUT', `/api/recurring/${id}`, { amount: 900, day_of_month: 31, active: 0 })
  const row = (await s.call('GET', '/api/recurring')).json.find(x => x.id === id)
  assert.deepEqual([row.amount, row.day_of_month, row.active], [900, 31, 0])
  await s.call('PUT', `/api/recurring/${id}`, { active: 1 })
  assert.equal((await s.call('GET', '/api/recurring')).json.find(x => x.id === id).active, 1)
  s.close()
})
test('recurring: input tidak valid ditolak (error API)', async () => {
  const s = await setup(); const { a } = await newRec(s)
  assert.equal((await s.call('POST', '/api/recurring', { kind: 'expense', amount: 0, account_id: a, day_of_month: 5 })).status, 400)
  assert.equal((await s.call('POST', '/api/recurring', { kind: 'expense', amount: 1, account_id: a, day_of_month: 32 })).status, 400)
  assert.equal((await s.call('POST', '/api/recurring', { kind: 'transfer', amount: 1, account_id: a, day_of_month: 5 })).status, 400)
  s.close()
})
test('recurring: hapus recurring tidak menghapus transaksi yang sudah dibuat', async () => {
  const s = await setup(); const { id, a } = await newRec(s)
  assert.equal(runDue(s.db, '2026-11-05'), 1)
  const count = () => s.db.prepare("select count(*) c from transactions where account_id=? and source='recurring'").get(a).c
  assert.equal(count(), 1)
  assert.equal((await s.call('DELETE', `/api/recurring/${id}`)).status, 200)
  assert.equal((await s.call('GET', '/api/recurring')).json.some(x => x.id === id), false)
  assert.equal(count(), 1)
  s.close()
})
test('recurring: UI punya state kosong, error+retry, dan konfirmasi hapus', () => {
  assert.match(html, /Belum ada transaksi berulang/); assert.match(html, /Gagal memuat recurring/)
  assert.match(html, /data-a="recRetry"/); assert.match(html, /Transaksi yang sudah dibuat sebelumnya tidak ikut dihapus/)
})

// ---------- runDue (DoD 7) ----------
test('runDue: recurring aktif dieksekusi sekali per bulan pada day_of_month, dibatasi hari terakhir (Feb)', async () => {
  const s = await start(); const db = s.db
  const a = db.prepare("insert into accounts(name,type) values('RD','asset') returning id").get().id
  db.prepare("insert into recurring(kind,amount,account_id,day_of_month,active) values('expense',10,?,31,1)").run(a)
  assert.equal(runDue(db, '2027-02-27'), 0)
  assert.equal(runDue(db, '2027-02-28'), 1)               // Februari non-kabisat: 31 -> 28
  assert.equal(runDue(db, '2027-02-28'), 0)
  assert.equal(db.prepare("select date from transactions where account_id=?").get(a).date, '2027-02-28')
  assert.equal(runDue(db, '2028-02-28'), 0)               // kabisat: hari ke-29 belum tiba
  assert.equal(runDue(db, '2028-02-29'), 1)
  s.close()
})
test('runDue: terlambat menjalankan tetap membuat transaksi bertanggal day_of_month, sekali saja', async () => {
  const s = await start(); const db = s.db
  const a = db.prepare("insert into accounts(name,type) values('RD2','asset') returning id").get().id
  db.prepare("insert into recurring(kind,amount,account_id,day_of_month,active) values('income',10,?,5,1)").run(a)
  assert.equal(runDue(db, '2026-11-20'), 1); assert.equal(runDue(db, '2026-11-25'), 0)
  assert.equal(db.prepare('select date from transactions where account_id=?').get(a).date, '2026-11-05')
  s.close()
})
