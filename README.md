# Midas

Local-first budget & money manager, built with Expo (React Native) + TypeScript.
Every account, transaction, and budget lives in an on-device SQLite database — no
sign-in, no sync, nothing leaves the phone.

## Status: feature-complete against the original design

All 13 screens from the Claude Design canvas are built and wired to the real
local database (no more mock/in-memory data anywhere):

- Start (onboarding, sample-data seed, first-account CTA)
- Home (left-to-spend, budget burn-down, recent transactions)
- Accounts (net worth, grouped by Assets/Liabilities) + Account detail
- Budgets (burn-down list) + Budget detail (with "raise limit")
- Ledger ("Money in & out", filterable by type/account, grouped by day)
- Categories (add category/sub-category, tap a sub to attach a budget)
- Settings (spent-out sub-category lock/hide toggle, biometric app lock,
  export-to-file backup)
- Add Account, Add Category, Add Budget, Add Transaction (numeric keypad +
  category/account/date/note bottom sheets, with the budget-lock flow when a
  spent-out sub-category is picked)

**Known simplifications** (see also the migrations note below):
- The category picker's "hide vs. lock" behavior and the biometric app-lock
  both read the `settings` table on each relevant screen — toggling them takes
  effect immediately for the picker, and on next app launch for the lock.
- Transactions update account balances directly (income/expense/transfer) —
  the original design mock never did this since its balances were static demo
  numbers, but a real app needs it for the numbers to stay meaningful.
- Backup is export-only (share/save a JSON snapshot via the OS share sheet);
  there's no import/restore flow yet.

## Stack

- **Expo (managed) + Expo Router** — file-based navigation, `app/` is routes only.
- **expo-sqlite + Drizzle ORM** — local relational database. Schema lives in
  `src/db/schema.ts`; DB access goes through the repository layer in
  `src/db/repositories/*`, never raw queries from screens.
- **Fonts**: Archivo (UI) + Pinyon Script (the "Midas" wordmark only), via
  `@expo-google-fonts/*`.
- **Design tokens**: `src/theme/` — colors, spacing, and font names transcribed
  from the original Claude Design canvas ("Modernist" design system).

## Getting started

```bash
npm install
npm run ios      # or: npm run android / npm run web
```

On first launch, the Start screen offers "Look around with sample data," which
seeds the same accounts/categories/budgets/transactions used during design.

## Testing

Unit tests cover the business-logic layer only (budget burn-down math, net
worth, ledger grouping/filtering, currency formatting) — the parts most worth
protecting with tests at this stage:

```bash
npm test
```

## Project layout

```
app/                  Expo Router routes (screens only, no business logic)
app/add-*.tsx          Modal-presented create forms (account/category/budget/transaction)
src/theme/             Colors, spacing, font tokens
src/utils/              Pure helpers (currency, date math, slugs, digit grouping, ids)
src/db/schema.ts        Drizzle table definitions
src/db/bootstrap.ts     Idempotent CREATE TABLE bootstrap (see note below)
src/db/seed.ts          Sample-data seeding
src/db/backup.ts        Builds the exportable JSON snapshot for Settings' backup
src/db/repositories/    All DB access + the pure, unit-tested business logic
src/components/         Shared UI primitives (BudgetBar, TxRow, BottomSheet, NumericKeypad, ...)
```

### Note on migrations

`drizzle-kit generate` is wired up (`drizzle.config.ts`), but the installed
`drizzle-orm@rc` / `drizzle-kit@rc` pairing emits a migration bundle whose shape
the Expo SQLite migrator (`useMigrations`) doesn't accept yet. Since Phase 1 has
exactly one schema version, `src/db/bootstrap.ts` creates tables directly with
idempotent `CREATE TABLE IF NOT EXISTS` statements instead. Revisit this once
the ecosystem settles, before Phase 2 needs a real schema migration.
