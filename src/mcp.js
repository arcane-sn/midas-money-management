import { safeEqual } from './auth.js'

// MCP (Streamable HTTP, stateless JSON-RPC) in front of the REST API. Every tool is a thin call to /api/*,
// so all validation lives in one place. Auth: `Authorization: Bearer <MIDAS_TOKEN>` or `/mcp/<MIDAS_TOKEN>`
// (claude.ai custom connectors can't send headers, so the secret may live in the URL path).
const int = d => ({ type: 'integer', description: d })
const str = d => ({ type: 'string', description: d })
const obj = (properties, required = []) => ({ type: 'object', properties, required })
const ID = { id: int('Row id') }
const KIND = { type: 'string', enum: ['income', 'expense', 'transfer'] }
const TX = {
  date: str('YYYY-MM-DD'), kind: KIND, amount: int('Positive integer, Rupiah'), account_id: int('Source account id'),
  to_account_id: int('Destination account id (transfer only)'), category_id: int('Category or sub-category id'), note: str('Free text'),
}
const REC = {
  kind: KIND, amount: int('Positive integer, Rupiah'), account_id: int('Account id'), category_id: int('Category id'),
  note: str('Free text'), day_of_month: int('1-31'), active: int('1 = active, 0 = paused'),
}
const ACC = { name: str('Account name (unique)'), group_id: int('Account group id'), type: str('asset | liability'), opening_balance: int('Opening balance, negative for debt') }
const body = (a, drop = ['id']) => Object.fromEntries(Object.entries(a).filter(([k, v]) => !drop.includes(k) && v !== undefined))

// name -> [description, inputSchema, (args) => [method, path, payload?, pick?, contentType?]]
const TOOLS = {
  get_summary: ['Month overview: totals (assets/liabilities/net worth), every account with its current balance, and budget status per category.', obj({ month: str('YYYY-MM, default current month') }),
    a => ['GET', `/api/summary${a.month ? '?month=' + encodeURIComponent(a.month) : ''}`]],
  list_groups: ['List account groups (e.g. BANK, E-WALLET, Credit Card).', obj({}), () => ['GET', '/api/groups']],
  create_group: ['Create an account group.', obj({ name: str('Group name'), type: str('asset | liability') }, ['name', 'type']), a => ['POST', '/api/groups', body(a)]],
  update_group: ['Update an account group.', obj({ ...ID, name: str('New name'), type: str('asset | liability') }, ['id']), a => ['PUT', `/api/groups/${a.id}`, body(a)]],
  delete_group: ['Delete an account group (fails if it still has accounts).', obj(ID, ['id']), a => ['DELETE', `/api/groups/${a.id}`]],

  list_accounts: ['List accounts with their current balance.', obj({}), () => ['GET', '/api/summary', undefined, r => r.accounts]],
  create_account: ['Create an account.', obj(ACC, ['name', 'group_id', 'type']), a => ['POST', '/api/accounts', body(a)]],
  update_account: ['Update an account (rename, move group, change opening balance).', obj({ ...ID, ...ACC }, ['id']), a => ['PUT', `/api/accounts/${a.id}`, body(a)]],
  delete_account: ['Delete an account.', obj(ID, ['id']), a => ['DELETE', `/api/accounts/${a.id}`]],

  list_categories: ['List categories and sub-categories (sub-categories have parent_id).', obj({}), () => ['GET', '/api/categories']],
  create_category: ['Create a top-level category.', obj({ name: str('Category name'), kind: { type: 'string', enum: ['income', 'expense'] }, icon: str('Icon key'), monthly_budget: int('Monthly budget, Rupiah') }, ['name', 'kind']),
    a => ['POST', '/api/categories', body(a)]],
  create_sub_category: ['Create a sub-category under a category.', obj({ parent_id: int('Parent category id'), name: str('Sub-category name') }, ['parent_id', 'name']), a => ['POST', '/api/categories', body(a)]],
  update_category: ['Update a category or sub-category (name, icon, monthly_budget).', obj({ ...ID, name: str('New name'), icon: str('Icon key'), monthly_budget: int('Monthly budget, Rupiah') }, ['id']),
    a => ['PUT', `/api/categories/${a.id}`, body(a)]],
  delete_category: ['Delete a category or sub-category. Its transactions move to Uncategorized / Other.', obj(ID, ['id']), a => ['DELETE', `/api/categories/${a.id}`]],

  list_transactions: ['List transactions, newest first. Filter by month (YYYY-MM) or account_id; with neither, returns all.', obj({ month: str('YYYY-MM'), account_id: int('Account id') }),
    a => ['GET', '/api/transactions' + (a.account_id ? `?account=${a.account_id}` : a.month ? `?month=${encodeURIComponent(a.month)}` : '')]],
  create_transaction: ['Record an income, expense or transfer.', obj(TX, ['date', 'kind', 'amount', 'account_id']), a => ['POST', '/api/transactions', body(a)]],
  update_transaction: ['Edit a transaction; only the fields you pass change.', obj({ ...ID, ...TX }, ['id']), a => ['PUT', `/api/transactions/${a.id}`, body(a)]],
  delete_transaction: ['Delete a transaction (balances recompute).', obj(ID, ['id']), a => ['DELETE', `/api/transactions/${a.id}`]],

  list_recurring: ['List recurring transactions (installments, subscriptions).', obj({}), () => ['GET', '/api/recurring']],
  create_recurring: ['Create a recurring monthly transaction.', obj(REC, ['kind', 'amount', 'account_id', 'day_of_month']), a => ['POST', '/api/recurring', body(a)]],
  update_recurring: ['Update a recurring transaction (amount, day, pause with active=0, ...).', obj({ ...ID, ...REC }, ['id']), a => ['PUT', `/api/recurring/${a.id}`, body(a)]],
  delete_recurring: ['Delete a recurring transaction. Transactions it already created are kept.', obj(ID, ['id']), a => ['DELETE', `/api/recurring/${a.id}`]],

  list_captures: ['List the last 50 screenshot captures and their processing status.', obj({}), () => ['GET', '/api/captures']],
  capture_image: ['Submit a payment screenshot; Midas extracts the transaction in the background (source=auto).', obj({ image_base64: str('Base64 image data'), mime_type: str('image/png | image/jpeg | image/webp') }, ['image_base64']),
    a => ['POST', '/api/capture', Buffer.from(a.image_base64, 'base64'), null, a.mime_type ?? 'image/jpeg']],
}
export const TOOL_NAMES = Object.keys(TOOLS)

async function readJson(req, limit = 22e6) {
  const chunks = []; let n = 0
  for await (const c of req) { n += c.length; if (n > limit) throw Object.assign(new Error('too large'), { status: 413 }); chunks.push(c) }
  return JSON.parse(Buffer.concat(chunks).toString() || 'null')
}

export function createMcp({ token, password }) {
  let cookie = ''
  async function call(base, method, path, payload, ctype) {
    const go = async () => {
      const raw = Buffer.isBuffer(payload)
      const res = await fetch(base + path, { method, headers: { cookie, authorization: `Bearer ${token}`, ...(payload !== undefined ? { 'content-type': raw ? ctype : 'application/json' } : {}) },
        body: payload === undefined ? undefined : raw ? payload : JSON.stringify(payload) })
      const text = await res.text(); let json; try { json = JSON.parse(text) } catch { json = text }
      return { status: res.status, json }
    }
    let r = await go()
    if (r.status === 401 && path !== '/api/capture') {
      const l = await fetch(base + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
      cookie = (l.headers.get('set-cookie') ?? '').split(';')[0]; r = await go()
    }
    return r
  }

  async function runTool(base, name, args = {}) {
    const t = TOOLS[name]; if (!t) return { isError: true, content: [{ type: 'text', text: `Unknown tool: ${name}` }] }
    const [method, path, payload, pick, ctype] = t[2](args)
    const r = await call(base, method, path, payload, ctype)
    const data = r.status < 400 && pick ? pick(r.json) : r.json
    return { isError: r.status >= 400, content: [{ type: 'text', text: JSON.stringify(data) }] }
  }

  async function rpc(base, m) {
    const ok = result => ({ jsonrpc: '2.0', id: m.id, result }), err = (code, message) => ({ jsonrpc: '2.0', id: m.id ?? null, error: { code, message } })
    if (m.id === undefined) return null // notification
    switch (m.method) {
      case 'initialize': return ok({ protocolVersion: m.params?.protocolVersion ?? '2025-03-26', capabilities: { tools: {} }, serverInfo: { name: 'midas', version: '1.0.0' },
        instructions: 'Midas personal money manager. Amounts are integer Rupiah. Dates are YYYY-MM-DD, months YYYY-MM.' })
      case 'ping': return ok({})
      case 'tools/list': return ok({ tools: TOOL_NAMES.map(n => ({ name: n, description: TOOLS[n][0], inputSchema: TOOLS[n][1] })) })
      case 'tools/call': return ok(await runTool(base, m.params?.name, m.params?.arguments))
      default: return err(-32601, `Method not found: ${m.method}`)
    }
  }

  return async (req, res, pathToken) => {
    const send = (status, b, h = {}) => { res.writeHead(status, { 'content-type': 'application/json', ...h }); res.end(b === undefined ? '' : JSON.stringify(b)) }
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? '')?.[1]
    if (!safeEqual(bearer ?? pathToken ?? '', token)) return send(401, { error: 'unauthorized' })
    if (req.method !== 'POST') return send(405, { error: 'POST only' }, { allow: 'POST' })
    let msg; try { msg = await readJson(req) } catch (e) { return send(e.status ?? 400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }) }
    const base = `http://127.0.0.1:${req.socket.localPort}`
    try {
      if (Array.isArray(msg)) { const out = (await Promise.all(msg.map(m => rpc(base, m)))).filter(Boolean); return out.length ? send(200, out) : send(202) }
      const out = await rpc(base, msg ?? {}); return out ? send(200, out) : send(202)
    } catch (e) { return send(200, { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32603, message: e.message } }) }
  }
}
