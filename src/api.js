import { readFileSync, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isAuthed, sessionCookie, hasBearer, safeEqual, makeLimiter } from './auth.js'
import { accountBalance, budgetStatus, totals } from './calc.js'
import { addCategory, updateCategory, deleteCategory, addSub, updateSub, deleteSub, MSG } from './categories.js'
import { createCapture, processCapture, defaultRunClaude } from './capture.js'

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url))
const MONTH_NAV = fileURLToPath(new URL('./month-nav.js', import.meta.url))
const MONEY = fileURLToPath(new URL('./money.js', import.meta.url))
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
const RES = {
  groups: ['account_groups', ['name', 'type']],
  accounts: ['accounts', ['name', 'group_id', 'type', 'opening_balance']],
  categories: ['categories', ['name', 'kind', 'parent_id', 'monthly_budget']],
  transactions: ['transactions', ['date', 'kind', 'amount', 'account_id', 'to_account_id', 'category_id', 'note', 'source', 'flag']],
  recurring: ['recurring', ['kind', 'amount', 'account_id', 'category_id', 'note', 'day_of_month', 'active', 'last_run']],
}
const bad = m => Object.assign(new Error(m), { status: 400 })

function checkTx(r) {
  if (!['income', 'expense', 'transfer'].includes(r.kind)) throw bad('kind')
  if (!Number.isInteger(r.amount) || r.amount <= 0) throw bad('amount must be a positive integer')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '')) throw bad('date must be YYYY-MM-DD')
  if (r.kind === 'transfer') { if (!r.account_id || !r.to_account_id || r.account_id === r.to_account_id) throw bad('transfer needs two different accounts') }
  else r.to_account_id = null
}

async function readBody(req, limit) {
  const chunks = []; let n = 0
  for await (const c of req) { n += c.length; if (n > limit) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(c) }
  return Buffer.concat(chunks)
}

export function createApp(db, { token, password, runClaude = defaultRunClaude, dataDir = 'data' }) {
  const limiter = makeLimiter()
  const send = (res, status, body, headers = {}) => {
    const isStr = typeof body === 'string' || Buffer.isBuffer(body)
    res.writeHead(status, { 'content-type': isStr ? 'text/plain' : 'application/json', 'x-content-type-options': 'nosniff', ...headers })
    res.end(isStr ? body : JSON.stringify(body))
  }

  // Category/sub-category writes go through the validating data layer (empty/duplicate names, move to Uncategorized on delete).
  async function categoryMutation(req, res, method, id) {
    const body = method === 'DELETE' ? {} : JSON.parse((await readBody(req, 1e5)).toString() || '{}')
    const row = id ? db.prepare('select parent_id from categories where id=?').get(id) : null
    let out
    if (method === 'POST') {
      if (body.parent_id) out = addSub(db, Number(body.parent_id), body)
      else out = addCategory(db, { name: body.name, icon: body.icon, type: body.kind })
    } else {
      if (!row) return send(res, 404, { error: MSG.notFound })
      const isSub = row.parent_id != null
      if (method === 'PUT') out = isSub ? updateSub(db, Number(id), body) : updateCategory(db, Number(id), body)
      else if (method === 'DELETE') out = isSub ? deleteSub(db, Number(id)) : deleteCategory(db, Number(id))
      else return send(res, 405, { error: 'method not allowed' })
    }
    if (!out.ok) return send(res, 400, { error: out.error.message, code: out.error.code })
    const newId = out.category?.id ?? out.sub?.id ?? Number(id)
    if (method !== 'DELETE' && Number.isInteger(body.monthly_budget) && !isSystemOrSub(newId))
      db.prepare('update categories set monthly_budget=? where id=?').run(body.monthly_budget, newId)
    return send(res, method === 'POST' ? 201 : 200, { ok: true, id: newId, movedTransactions: out.movedTransactions })
  }
  const isSystemOrSub = cid => { const c = db.prepare('select parent_id, is_system from categories where id=?').get(cid); return !c || c.parent_id != null || c.is_system }

  async function api(req, res, url, parts) {
    const [, name, id] = parts, method = req.method
    if (name === 'login' && method === 'POST') {
      if (limiter.locked()) return send(res, 429, { error: 'too many attempts' })
      const b = JSON.parse((await readBody(req, 1e4)).toString() || '{}')
      if (!safeEqual(b.password ?? '', password)) { limiter.fail(); return send(res, 401, { error: 'wrong password' }) }
      limiter.reset(); return send(res, 200, { ok: true }, { 'set-cookie': sessionCookie(req, password) })
    }
    if (name === 'capture' && method === 'POST') {
      if (!hasBearer(req, token)) return send(res, 401, { error: 'unauthorized' })
      const type = req.headers['content-type'] ?? ''
      const ext = /png/.test(type) ? 'png' : /webp/.test(type) ? 'webp' : 'jpg'
      const buf = await readBody(req, 15e6)
      if (!buf.length) throw bad('empty body')
      const cid = createCapture(db, dataDir, buf, ext)
      setImmediate(() => processCapture(db, cid, runClaude))
      return send(res, 202, { id: cid })
    }
    if (!isAuthed(req, password)) return send(res, 401, { error: 'login required' })

    if (name === 'summary' && method === 'GET') {
      const month = url.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
      const accounts = db.prepare('select * from accounts order by group_id, id').all().map(a => ({ ...a, balance: accountBalance(db, a.id) }))
      return send(res, 200, { month, totals: totals(db), accounts, budgets: budgetStatus(db, month) })
    }
    if (name === 'captures' && method === 'GET') return send(res, 200, db.prepare('select id,created,status,transaction_id from captures order by id desc limit 50').all())
    if (name === 'categories' && method !== 'GET') return await categoryMutation(req, res, method, id)
    const r = RES[name]
    if (!r) return send(res, 404, { error: 'not found' })
    const [table, cols] = r
    if (method === 'GET' && !id) {
      const month = url.searchParams.get('month')
      const rows = name === 'transactions' && month
        ? db.prepare('select * from transactions where substr(date,1,7)=? order by date desc, id desc').all(month)
        : db.prepare(`select * from ${table} order by id`).all()
      return send(res, 200, rows)
    }
    const body = ['POST', 'PUT'].includes(method) ? JSON.parse((await readBody(req, 1e5)).toString() || '{}') : {}
    if (method === 'POST' && !id) {
      const row = Object.fromEntries(cols.filter(c => body[c] !== undefined).map(c => [c, body[c]]))
      if (name === 'transactions') checkTx(row)
      const k = Object.keys(row)
      const out = db.prepare(`insert into ${table}(${k.join(',')}) values(${k.map(() => '?').join(',')}) returning id`).get(...Object.values(row))
      return send(res, 201, { id: Number(out.id) })
    }
    if (!id) return send(res, 404, { error: 'not found' })
    const cur = db.prepare(`select * from ${table} where id=?`).get(id)
    if (!cur) return send(res, 404, { error: 'not found' })
    if (method === 'PUT') {
      const row = { ...cur, ...Object.fromEntries(cols.filter(c => body[c] !== undefined).map(c => [c, body[c]])) }
      if (name === 'transactions') checkTx(row)
      db.prepare(`update ${table} set ${cols.map(c => `${c}=?`).join(',')} where id=?`).run(...cols.map(c => row[c]), id)
      return send(res, 200, { ok: true })
    }
    if (method === 'DELETE') { db.prepare(`delete from ${table} where id=?`).run(id); return send(res, 200, { ok: true }) }
    return send(res, 405, { error: 'method not allowed' })
  }

  function serveStatic(res, pathname) {
    if (pathname === '/month-nav.js') return send(res, 200, readFileSync(MONTH_NAV), { 'content-type': MIME['.js'] })
    if (pathname === '/money.js') return send(res, 200, readFileSync(MONEY), { 'content-type': MIME['.js'] })
    const rel = normalize(decodeURIComponent(pathname === '/' ? '/index.html' : pathname))
    const file = join(PUBLIC, rel)
    if (rel.includes('..') || !file.startsWith(PUBLIC.endsWith(sep) ? PUBLIC : PUBLIC + sep) || !existsSync(file) || !statSync(file).isFile()) return send(res, 404, 'not found')
    send(res, 200, readFileSync(file), { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
  }

  return async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x'), parts = url.pathname.split('/').filter(Boolean)
      if (parts[0] === 'api') return await api(req, res, url, parts)
      if (req.method !== 'GET') return send(res, 405, 'method not allowed')
      serveStatic(res, url.pathname)
    } catch (e) {
      const status = e.status ?? (/constraint|SQLITE|JSON/i.test(e.message) ? 400 : 500)
      if (status === 500) console.error(e)
      if (!res.headersSent) send(res, status, { error: status === 500 ? 'server error' : e.message })
    }
  }
}
