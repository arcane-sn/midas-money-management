import { createHmac, timingSafeEqual } from 'node:crypto'

export const safeEqual = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y) }
// ponytail: stateless cookie = HMAC(password); changing the password logs everyone out. Add per-session ids if multi-user ever matters.
const sessionValue = pw => createHmac('sha256', pw).update('midas-session').digest('hex')

export function isAuthed(req, pw) {
  const m = /(?:^|;\s*)midas=([0-9a-f]+)/.exec(req.headers.cookie ?? '')
  return !!m && safeEqual(m[1], sessionValue(pw))
}
export function sessionCookie(req, pw) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''
  return `midas=${sessionValue(pw)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure}`
}
export const hasBearer = (req, token) => { const m = /^Bearer (.+)$/.exec(req.headers.authorization ?? ''); return !!m && safeEqual(m[1], token) }

// 10 failed logins per 10 minutes (global: single user, behind a tunnel so per-IP is unreliable)
export function makeLimiter(max = 10, windowMs = 600000) {
  let fails = []
  const prune = () => { const t = Date.now() - windowMs; fails = fails.filter(x => x > t) }
  return { locked: () => (prune(), fails.length >= max), fail: () => fails.push(Date.now()), reset: () => { fails = [] } }
}
