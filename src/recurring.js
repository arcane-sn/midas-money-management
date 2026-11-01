const lastDay = (y, m) => new Date(y, m, 0).getDate() // m is 1-based

export function runDue(db, today) {
  const [y, m, d] = today.split('-').map(Number), ym = today.slice(0, 7)
  const ins = db.prepare("insert into transactions(date,kind,amount,account_id,category_id,note,source) values(?,?,?,?,?,?,'recurring')")
  const done = db.prepare('update recurring set last_run=? where id=?')
  let n = 0
  for (const r of db.prepare('select * from recurring where active=1').all()) {
    const day = Math.min(r.day_of_month, lastDay(y, m))
    if (d < day || (r.last_run && r.last_run.slice(0, 7) === ym)) continue
    ins.run(`${ym}-${String(day).padStart(2, '0')}`, r.kind, r.amount, r.account_id, r.category_id, r.note)
    done.run(today, r.id); n++
  }
  return n
}
