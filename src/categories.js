// Data layer for Categories (More > Categories): category/sub-category CRUD, validation and
// reassignment to "Uncategorized / Other" on delete.
// Model: Category { id, name, icon, type: 'expense'|'income', subs: Sub[] }, Sub { id, name }.
// Storage: `categories` table (sub = row with parent_id). Transactions reference category_id,
// which is either a category or a sub-category id.
// Operations return { ok: true, ... } or { ok: false, error: { field: 'name', code, message } }.

export const UNCATEGORIZED_NAME = 'Uncategorized / Other'
export const MSG = {
  empty: 'Nama tidak boleh kosong',
  duplicate: 'Nama sudah dipakai',
  system: 'Kategori Uncategorized / Other tidak dapat diubah atau dihapus',
  notFound: 'Kategori tidak ditemukan',
  type: 'Tipe kategori tidak valid',
}
const TYPES = ['expense', 'income']
const DEFAULT_ICON = 'tag'

const err = (code, field = 'name') => ({ ok: false, error: { field, code, message: MSG[code] } })

export function migrateCategories(db) {
  const cols = db.prepare('pragma table_info(categories)').all().map(c => c.name)
  if (!cols.includes('icon')) db.exec("alter table categories add column icon text not null default 'tag'")
  if (!cols.includes('is_system')) db.exec('alter table categories add column is_system integer not null default 0')
}

export function ensureUncategorized(db) {
  for (const kind of TYPES) {
    if (db.prepare('select 1 from categories where kind=? and is_system=1 and parent_id is null').get(kind)) continue
    db.prepare('insert into categories(name,kind,parent_id,monthly_budget,icon,is_system) values(?,?,null,0,?,1)')
      .run(UNCATEGORIZED_NAME, kind, 'help-circle')
  }
}

const uncategorizedId = (db, kind) =>
  db.prepare('select id from categories where kind=? and is_system=1 and parent_id is null').get(kind).id

// Run fn atomically (single SQLite transaction); rolls back if fn throws.
function atomic(db, fn) {
  db.exec('begin')
  try { const r = fn(); db.exec('commit'); return r } catch (e) { db.exec('rollback'); throw e }
}

const clean = name => String(name ?? '').trim()

function checkName(db, name, parentId, kind, exceptId = null) {
  if (!name) return err('empty')
  const rows = parentId == null
    ? db.prepare('select id from categories where parent_id is null and kind=? and lower(name)=lower(?) and id is not ?').all(kind, name, exceptId)
    : db.prepare('select id from categories where parent_id=? and lower(name)=lower(?) and id is not ?').all(parentId, name, exceptId)
  return rows.length ? err('duplicate') : null
}

const getCat = (db, id) => db.prepare('select * from categories where id=? and parent_id is null').get(id)
const getSub = (db, id) => db.prepare('select * from categories where id=? and parent_id is not null').get(id)
const toSub = r => ({ id: r.id, name: r.name })
const toCategory = (db, r) => ({
  id: r.id, name: r.name, icon: r.icon, type: r.kind, system: !!r.is_system,
  subs: db.prepare('select * from categories where parent_id=? order by id').all(r.id).map(toSub),
})

// Categories of a type with their subs; Uncategorized / Other is listed last.
export function listCategoryTree(db, type) {
  if (!TYPES.includes(type)) return []
  return db.prepare('select * from categories where kind=? and parent_id is null order by is_system, id').all(type)
    .map(r => toCategory(db, r))
}

export function addCategory(db, { name, icon, type } = {}) {
  if (!TYPES.includes(type)) return err('type', 'type')
  const n = clean(name)
  const bad = checkName(db, n, null, type)
  if (bad) return bad
  const id = Number(db.prepare('insert into categories(name,kind,parent_id,monthly_budget,icon) values(?,?,null,0,?)')
    .run(n, type, icon || DEFAULT_ICON).lastInsertRowid)
  return { ok: true, category: toCategory(db, getCat(db, id)) }
}

export function updateCategory(db, id, { name, icon } = {}) {
  const cur = getCat(db, id)
  if (!cur) return err('notFound', 'id')
  if (cur.is_system) return err('system', 'id')
  const n = name === undefined ? cur.name : clean(name)
  const bad = checkName(db, n, null, cur.kind, id)
  if (bad) return bad
  db.prepare('update categories set name=?, icon=? where id=?').run(n, icon || cur.icon, id)
  return { ok: true, category: toCategory(db, getCat(db, id)) }
}

// Moves transactions/recurring from `ids` to the Uncategorized / Other category of `kind`.
function reassign(db, ids, kind) {
  const other = uncategorizedId(db, kind)
  const ph = ids.map(() => '?').join(',')
  db.prepare(`update transactions set category_id=? where category_id in (${ph})`).run(other, ...ids)
  db.prepare(`update recurring set category_id=? where category_id in (${ph})`).run(other, ...ids)
}

export function deleteCategory(db, id) {
  const cur = getCat(db, id)
  if (!cur) return err('notFound', 'id')
  if (cur.is_system) return err('system', 'id')
  const subIds = db.prepare('select id from categories where parent_id=?').all(id).map(r => r.id)
  const moved = atomic(db, () => {
    const ids = [id, ...subIds]
    const n = db.prepare(`select count(*) c from transactions where category_id in (${ids.map(() => '?').join(',')})`).get(...ids).c
    reassign(db, ids, cur.kind)
    db.prepare('delete from categories where id=?').run(id) // subs cascade
    return n
  })
  return { ok: true, movedTransactions: moved }
}

export function addSub(db, categoryId, { name } = {}) {
  const cat = getCat(db, categoryId)
  if (!cat) return err('notFound', 'id')
  if (cat.is_system) return err('system', 'id')
  const n = clean(name)
  const bad = checkName(db, n, categoryId, cat.kind)
  if (bad) return bad
  const id = Number(db.prepare('insert into categories(name,kind,parent_id,monthly_budget,icon) values(?,?,?,0,?)')
    .run(n, cat.kind, categoryId, cat.icon).lastInsertRowid)
  return { ok: true, sub: toSub(getSub(db, id)) }
}

export function updateSub(db, id, { name } = {}) {
  const cur = getSub(db, id)
  if (!cur) return err('notFound', 'id')
  const n = clean(name)
  const bad = checkName(db, n, cur.parent_id, cur.kind, id)
  if (bad) return bad
  db.prepare('update categories set name=? where id=?').run(n, id)
  return { ok: true, sub: toSub(getSub(db, id)) }
}

export function deleteSub(db, id) {
  const cur = getSub(db, id)
  if (!cur) return err('notFound', 'id')
  const moved = atomic(db, () => {
    const n = db.prepare('select count(*) c from transactions where category_id=?').get(id).c
    reassign(db, [id], cur.kind)
    db.prepare('delete from categories where id=?').run(id)
    return n
  })
  return { ok: true, movedTransactions: moved }
}
