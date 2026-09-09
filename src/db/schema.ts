import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export type AccountKind = 'assets' | 'liabilities';
export type CategoryKind = 'expense' | 'income' | 'transfer';
export type TransactionType = 'expense' | 'income' | 'transfer';

export const accountGroups = sqliteTable('account_groups', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull().$type<AccountKind>(),
  label: text('label').notNull(),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull().$type<AccountKind>(),
  groupLabel: text('group_label').notNull(),
  balance: integer('balance').notNull(),
  description: text('description'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  kind: text('kind').notNull().$type<CategoryKind>(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
});

export const subcategories = sqliteTable('subcategories', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  name: text('name').notNull(),
});

export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => categories.id),
  subcategoryId: text('subcategory_id').references(() => subcategories.id),
  limitAmount: integer('limit_amount').notNull(),
  baseSpent: integer('base_spent').notNull().default(0),
  raiseAmount: integer('raise_amount').notNull().default(0),
  period: text('period').notNull().default('monthly'),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // ISO YYYY-MM-DD
  type: text('type').notNull().$type<TransactionType>(),
  amount: integer('amount').notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id),
  toAccountId: text('to_account_id').references(() => accounts.id),
  categoryId: text('category_id').references(() => categories.id),
  subcategoryId: text('subcategory_id').references(() => subcategories.id),
  note: text('note'),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
});

export const goalAccounts = sqliteTable('goal_accounts', {
  id: text('id').primaryKey(),
  goalId: text('goal_id').notNull().references(() => goals.id),
  accountId: text('account_id').notNull().references(() => accounts.id),
});
