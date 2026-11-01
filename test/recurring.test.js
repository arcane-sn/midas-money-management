import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb } from '../src/db.js'
import { runDue } from '../src/recurring.js'
function setup(day, active = 1) {
  const db = openDb()
  db.exec(`insert into account_groups(name,type) values('BANK','asset'); insert into accounts(name,group_id,type) values('A',1,'asset')`)
  db.prepare("insert into recurring(kind,amount,account_id,note,day_of_month,active) values('expense',100,1,'cicilan',?,?)").run(day, active)
  return db
}
const n = db => db.prepare("select count(*) c from transactions where source='recurring'").get().c
test('creates on due day, once per month', () => {
  const db = setup(5); assert.equal(runDue(db, '2026-11-05'), 1); assert.equal(runDue(db, '2026-11-05'), 0); assert.equal(n(db), 1)
  assert.equal(db.prepare('select date from transactions').get().date, '2026-11-05')
})
test('day 31 clamps to last day of month', () => { const db = setup(31); assert.equal(runDue(db, '2026-11-29'), 0); assert.equal(runDue(db, '2026-11-30'), 1) })
test('not before due day; inactive skipped', () => { assert.equal(runDue(setup(10), '2026-11-09'), 0); assert.equal(runDue(setup(5, 0), '2026-11-09'), 0) })
test('runs again next month', () => { const db = setup(5); runDue(db, '2026-11-05'); assert.equal(runDue(db, '2026-12-05'), 1) })
