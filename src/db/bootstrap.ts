import type { SQLiteDatabase } from 'expo-sqlite';

// Phase 1 has exactly one schema version, so we bootstrap with idempotent
// CREATE TABLE statements rather than drizzle-kit migrations: the installed
// drizzle-kit@rc / drizzle-orm@rc pairing emits a migrations.js bundle whose
// shape (no `journal`) the expo-sqlite migrator does not accept yet.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS account_groups (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  is_built_in INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  group_label TEXT NOT NULL,
  balance INTEGER NOT NULL,
  description TEXT
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subcategories (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY NOT NULL,
  category_id TEXT NOT NULL REFERENCES categories(id),
  subcategory_id TEXT REFERENCES subcategories(id),
  limit_amount INTEGER NOT NULL,
  base_spent INTEGER NOT NULL DEFAULT 0,
  raise_amount INTEGER NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly'
);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  to_account_id TEXT REFERENCES accounts(id),
  category_id TEXT REFERENCES categories(id),
  subcategory_id TEXT REFERENCES subcategories(id),
  note TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS goal_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals(id),
  account_id TEXT NOT NULL REFERENCES accounts(id)
);
`;

export async function ensureSchema(expoDb: SQLiteDatabase): Promise<void> {
  await expoDb.execAsync(SCHEMA_SQL);
}
