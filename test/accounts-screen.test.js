// MID-5: data kontrak layar Accounts (GET /api/summary) + format Rupiah.
// Skenario manual UI (lebar ponsel): lihat docs/MID-5-accounts-screen.md
import { test } from 'node:test'; import assert from 'node:assert/strict'
import { start } from './helpers.js'
import { fmtRupiah } from '../src/money.js'

const accounts = async s => (await s.call('GET', '/api/summary?month=2026-11')).json.accounts

test('accounts screen: ada akun -> name & balance, saldo terformat Rupiah', async () => {
  const s = await start(); await s.login()
  const acc = await s.call('POST', '/api/accounts', { name: 'X', type: 'asset', opening_balance: 10000 })
  const x = (await accounts(s)).find(a => a.id === acc.json.id)
  assert.equal(x.name, 'X'); assert.equal(x.balance, 10000)
  assert.equal(fmtRupiah(x.balance), 'Rp 10.000,00'); s.close()
})
test('accounts screen: kosong -> accounts [] (UI menampilkan "Belum ada akun.")', async () => {
  const s = await start(); await s.login()
  s.db.exec('delete from transactions; delete from accounts')
  assert.deepEqual(await accounts(s), []); s.close()
})
test('accounts screen: data terbaru -> saldo berubah setelah transaksi, dibuka ulang', async () => {
  const s = await start(); await s.login()
  const acc = await s.call('POST', '/api/accounts', { name: 'X', type: 'asset', opening_balance: 1000 })
  const bal = async () => (await accounts(s)).find(a => a.id === acc.json.id).balance
  assert.equal(await bal(), 1000)
  await s.call('POST', '/api/transactions', { date: '2026-11-01', kind: 'expense', amount: 300, account_id: acc.json.id })
  assert.equal(await bal(), 700); s.close()
})
