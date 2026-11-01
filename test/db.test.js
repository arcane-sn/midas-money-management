import { test } from 'node:test'; import assert from 'node:assert/strict'
import { openDb, seed } from '../src/db.js'
test('openDb creates all 6 tables', () => {
  const db = openDb()
  const t = db.prepare("select name from sqlite_master where type='table'").all().map(r => r.name)
  for (const n of ['accounts','account_groups','categories','transactions','recurring','captures']) assert.ok(t.includes(n), n)
})
test('seed is idempotent (5 accounts)', () => {
  const db = openDb(); seed(db); seed(db)
  assert.equal(db.prepare('select count(*) c from accounts').get().c, 5)
})
