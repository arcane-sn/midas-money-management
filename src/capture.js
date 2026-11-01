import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const todayJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())

export function buildPrompt(db) {
  const cats = db.prepare('select c.name, p.name parent, c.kind from categories c left join categories p on p.id=c.parent_id order by c.id').all()
    .map(c => `${c.kind}: ${c.parent ? c.parent + ' › ' : ''}${c.name}`).join('\n')
  const accs = db.prepare('select name from accounts').all().map(a => a.name).join(', ')
  return `You read a payment-success screenshot (BCA, Jago, GoPay, OVO or similar) for a personal finance app.
Reply with ONLY one JSON object, no prose, with keys: type ("expense"|"income"), amount (integer rupiah, no separators), merchant (string), date (YYYY-MM-DD, or "" if not visible), account (which app/wallet paid, one of: ${accs}), category (parent category name), subcategory (sub category name or ""), confidence (0..1).
Categories:
${cats}`
}

export async function defaultRunClaude(prompt, imagePath) {
  const { stdout } = await promisify(execFile)('claude', ['-p', `${prompt}\n\nThe screenshot file is: ${imagePath}`, '--allowedTools', 'Read'],
    { cwd: dirname(imagePath), timeout: 90000, maxBuffer: 4e6 })
  return stdout
}

export function createCapture(db, dataDir, buf, ext) {
  const id = Number(db.prepare("insert into captures(image_path) values('') returning id").get().id)
  const dir = join(dataDir, 'captures'); mkdirSync(dir, { recursive: true })
  const path = join(dir, `${id}.${ext}`); writeFileSync(path, buf)
  db.prepare('update captures set image_path=? where id=?').run(path, id)
  return id
}

const find = (db, sql, ...p) => db.prepare(sql).get(...p)?.id ?? null

export async function processCapture(db, id, runClaude = defaultRunClaude) {
  const set = (status, raw, txId = null) => db.prepare('update captures set status=?, raw_json=?, transaction_id=? where id=?').run(status, raw, txId, id)
  let raw = ''
  try {
    raw = await runClaude(buildPrompt(db), db.prepare('select image_path from captures where id=?').get(id).image_path)
    const o = JSON.parse(raw.replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/, '$1'))
    const amount = Number(o.amount)
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('bad amount')
    let review = !(Number(o.confidence) >= 0.7)
    const kind = o.type === 'income' ? 'income' : 'expense'
    if (o.type !== 'income' && o.type !== 'expense') review = true
    const account = find(db, 'select id from accounts where lower(name)=lower(?)', String(o.account ?? ''))
    let category = find(db, 'select id from categories where kind=? and parent_id is null and lower(name)=lower(?)', kind, String(o.category ?? ''))
    if (category && o.subcategory)
      category = find(db, 'select id from categories where parent_id=? and lower(name)=lower(?)', category, String(o.subcategory)) ?? category
    if (!account || !category) review = true
    let date = /^\d{4}-\d{2}-\d{2}$/.test(o.date ?? '') ? o.date : null
    if (!date) { date = todayJakarta(); review = true }
    const txId = Number(db.prepare("insert into transactions(date,kind,amount,account_id,category_id,note,source,flag) values(?,?,?,?,?,?,'auto',?) returning id")
      .get(date, kind, amount, account, category, String(o.merchant ?? '').slice(0, 200), review ? 'review' : null).id)
    set(review ? 'review' : 'done', raw, txId)
  } catch (e) { set('failed', `${e.message}\n${raw}`.slice(0, 2000)) }
}
