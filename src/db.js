import { DatabaseSync } from 'node:sqlite'

const SCHEMA = `
create table if not exists account_groups(id integer primary key, name text not null unique, type text not null check(type in ('asset','liability')));
create table if not exists accounts(id integer primary key, name text not null unique, group_id integer references account_groups(id),
  type text not null check(type in ('asset','liability')), opening_balance integer not null default 0);
create table if not exists categories(id integer primary key, name text not null, kind text not null check(kind in ('income','expense')),
  parent_id integer references categories(id) on delete cascade, monthly_budget integer not null default 0);
create table if not exists transactions(id integer primary key, date text not null check(date glob '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  kind text not null check(kind in ('income','expense','transfer')), amount integer not null check(amount > 0),
  account_id integer references accounts(id), to_account_id integer references accounts(id),
  category_id integer references categories(id) on delete set null, note text not null default '',
  source text not null default 'manual' check(source in ('manual','auto','recurring')), flag text);
create index if not exists tx_date on transactions(date);
create table if not exists recurring(id integer primary key, kind text not null check(kind in ('income','expense')), amount integer not null check(amount > 0),
  account_id integer references accounts(id), category_id integer references categories(id) on delete set null, note text not null default '',
  day_of_month integer not null check(day_of_month between 1 and 31), active integer not null default 1, last_run text);
create table if not exists captures(id integer primary key, created text not null default (datetime('now')), image_path text not null,
  status text not null default 'pending' check(status in ('pending','done','review','failed')), raw_json text, transaction_id integer references transactions(id) on delete set null);
`

export function openDb(path = ':memory:') {
  const db = new DatabaseSync(path)
  db.exec('pragma foreign_keys=on; pragma journal_mode=wal;')
  db.exec(SCHEMA)
  return db
}

export function seed(db) {
  if (db.prepare('select count(*) c from account_groups').get().c) return
  const g = db.prepare('insert into account_groups(name,type) values(?,?)')
  const gid = {}
  for (const [n, t] of [['BANK','asset'],['E-Wallet','asset'],['Cash','asset'],['Paylater','liability'],['Credit Card','liability'],['Mortgage','liability']])
    gid[n] = g.run(n, t).lastInsertRowid
  const a = db.prepare('insert into accounts(name,group_id,type) values(?,?,?)')
  for (const [n, grp] of [['BCA','BANK'],['JAGO','BANK'],['GOPAY','E-Wallet'],['OVO','E-Wallet'],['Cash','Cash']]) a.run(n, gid[grp], 'asset')
  const c = db.prepare('insert into categories(name,kind,parent_id,monthly_budget) values(?,?,?,?)')
  for (const [n, subs] of [['Food',['Kopi','Makan']],['Transport',['Ojol']],['Shopping',[]],['Bills',[]]]) {
    const id = c.run(n, 'expense', null, 0).lastInsertRowid
    for (const s of subs) c.run(s, 'expense', id, 0)
  }
  c.run('Salary', 'income', null, 0)
}
