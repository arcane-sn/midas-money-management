import http from 'node:http'
import { openDb, seed } from '../src/db.js'
import { createApp } from '../src/api.js'
export async function start(opts = {}) {
  const db = openDb(); seed(db)
  const server = http.createServer(createApp(db, { token: 'tok', password: 'pw', dataDir: opts.dataDir ?? '/tmp/midas-test', runClaude: opts.runClaude }))
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  let cookie = ''
  const call = async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, { method, headers: { cookie, ...(body && !(body instanceof Uint8Array) ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : body instanceof Uint8Array ? body : JSON.stringify(body) })
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]
    const text = await res.text(); let json; try { json = JSON.parse(text) } catch {}
    return { status: res.status, json, text }
  }
  return { db, call, login: () => call('POST', '/api/login', { password: 'pw' }), close: () => server.close() }
}
