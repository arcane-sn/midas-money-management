import { eq } from 'drizzle-orm';
import type { Database } from './client';
import { accountGroups, accounts, categories, subcategories, budgets, transactions } from './schema';
import { daysAgoISO } from '../utils/date';
import { slugify } from '../utils/slug';

const BUILT_IN_GROUPS: { kind: 'assets' | 'liabilities'; label: string }[] = [
  { kind: 'assets', label: 'Cash' },
  { kind: 'assets', label: 'Account' },
  { kind: 'assets', label: 'Savings' },
  { kind: 'assets', label: 'Top Up / Prepaid' },
  { kind: 'assets', label: 'Other' },
  { kind: 'liabilities', label: 'Credit Card' },
  { kind: 'liabilities', label: 'Loan' },
  { kind: 'liabilities', label: 'Other' },
];

const CATS: { name: string; kind: 'expense' | 'income' | 'transfer'; subs: string[]; isSystem?: boolean }[] = [
  { name: 'Food & Drink', kind: 'expense', subs: ['Groceries', 'Coffee', 'Dining out'] },
  { name: 'Transport', kind: 'expense', subs: ['Fuel', 'Ride-hailing', 'Parking'] },
  { name: 'Home', kind: 'expense', subs: ['Rent', 'Electricity', 'Internet'] },
  { name: 'Lifestyle', kind: 'expense', subs: ['Streaming', 'Fitness', 'Shopping'] },
  { name: 'Income', kind: 'income', subs: ['Salary', 'Freelance', 'Interest'] },
  { name: 'Admin', kind: 'transfer', subs: ['Transfer between accounts', 'Bank charge'], isSystem: true },
];

function catId(name: string): string {
  return slugify(name);
}
function subId(catName: string, subName: string): string {
  return `${catId(catName)}__${slugify(subName)}`;
}

export async function isSeeded(db: Database): Promise<boolean> {
  const rows = await db.select().from(accounts).limit(1);
  return rows.length > 0;
}

export async function seedDatabase(db: Database): Promise<void> {
  if (await isSeeded(db)) return;

  await db.insert(accountGroups).values(
    BUILT_IN_GROUPS.map((g) => ({
      id: `${g.kind}__${slugify(g.label)}`,
      kind: g.kind,
      label: g.label,
      isBuiltIn: true,
    }))
  );

  await db.insert(accounts).values([
    { id: 'a1', name: 'BCA Payroll', kind: 'assets', groupLabel: 'Account', balance: 8420000 },
    { id: 'a2', name: 'Cash Wallet', kind: 'assets', groupLabel: 'Cash', balance: 640000 },
    { id: 'a3', name: 'Emergency Fund', kind: 'assets', groupLabel: 'Savings', balance: 22000000 },
    { id: 'a4', name: 'GoPay', kind: 'assets', groupLabel: 'Top Up / Prepaid', balance: 185000 },
    { id: 'a5', name: 'Visa Signature', kind: 'liabilities', groupLabel: 'Credit Card', balance: -3240000 },
    { id: 'a6', name: 'Motorbike Loan', kind: 'liabilities', groupLabel: 'Loan', balance: -9600000 },
  ]);

  for (const cat of CATS) {
    await db.insert(categories).values({
      id: catId(cat.name),
      name: cat.name,
      kind: cat.kind,
      isSystem: !!cat.isSystem,
    });
    await db.insert(subcategories).values(
      cat.subs.map((sub) => ({ id: subId(cat.name, sub), categoryId: catId(cat.name), name: sub }))
    );
  }

  await db.insert(budgets).values([
    { id: 'b1', categoryId: catId('Food & Drink'), subcategoryId: subId('Food & Drink', 'Coffee'), limitAmount: 400000, baseSpent: 332000 },
    { id: 'b2', categoryId: catId('Food & Drink'), subcategoryId: subId('Food & Drink', 'Dining out'), limitAmount: 1200000, baseSpent: 940000 },
    { id: 'b3', categoryId: catId('Food & Drink'), subcategoryId: subId('Food & Drink', 'Groceries'), limitAmount: 2500000, baseSpent: 935000 },
    { id: 'b4', categoryId: catId('Transport'), subcategoryId: null, limitAmount: 900000, baseSpent: 573000 },
    { id: 'b5', categoryId: catId('Lifestyle'), subcategoryId: null, limitAmount: 1500000, baseSpent: 1285000 },
  ]);

  await db.insert(transactions).values([
    { id: 't1', date: daysAgoISO(1), type: 'expense', amount: 68000, accountId: 'a2', categoryId: catId('Food & Drink'), subcategoryId: subId('Food & Drink', 'Coffee'), note: 'Kopi + pastry' },
    { id: 't2', date: daysAgoISO(1), type: 'expense', amount: 245000, accountId: 'a1', categoryId: catId('Food & Drink'), subcategoryId: subId('Food & Drink', 'Groceries'), note: 'Weekly run' },
    { id: 't3', date: daysAgoISO(2), type: 'income', amount: 12500000, accountId: 'a1', categoryId: catId('Income'), subcategoryId: subId('Income', 'Salary'), note: 'Payroll' },
    { id: 't4', date: daysAgoISO(2), type: 'transfer', amount: 3000000, accountId: 'a1', toAccountId: 'a3', categoryId: catId('Admin'), note: 'Emergency top-up' },
    { id: 't5', date: daysAgoISO(3), type: 'expense', amount: 185000, accountId: 'a5', categoryId: catId('Lifestyle'), subcategoryId: subId('Lifestyle', 'Shopping'), note: 'Running socks' },
    { id: 't6', date: daysAgoISO(3), type: 'expense', amount: 42000, accountId: 'a4', categoryId: catId('Transport'), subcategoryId: subId('Transport', 'Ride-hailing'), note: 'To office' },
    { id: 't7', date: daysAgoISO(4), type: 'expense', amount: 1350000, accountId: 'a1', categoryId: catId('Home'), subcategoryId: subId('Home', 'Rent'), note: 'Monthly rent' },
    { id: 't8', date: daysAgoISO(4), type: 'income', amount: 1800000, accountId: 'a1', categoryId: catId('Income'), subcategoryId: subId('Income', 'Freelance'), note: 'Freelance work' },
  ]);
}
