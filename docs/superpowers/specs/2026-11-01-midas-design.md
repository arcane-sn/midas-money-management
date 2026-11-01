# MIDAS — design (2026-11-01)

Personal finance tracker. After paying, double-tap iPhone → transaction recorded automatically. Money Manager–style mobile web app. Public at `midas.arcane-magus.site` → `localhost:5003`.

## Goals
- Capture: iPhone Back Tap → Shortcut screenshots the success screen (BCA, Jago, GoPay, OVO) → `POST /api/capture` → `claude -p` extracts fields → transaction saved as `source=auto`.
- Dashboard (mobile-first, 5 screens): Trans. (Daily list), New Transaction (Income/Expense/Transfer), Stats (+Budget tab), Accounts, Settings.
- CRUD for income, expense, transfer; Category › Sub Category; Budget paired with Category; Account with type asset|liability and Group (BANK, E-Wallet, Paylater, Credit Card, Mortgage).
- Editing a wrong transaction fixes budget and account automatically.
- Recurring (auto-debit, fixed amount): created by the system on the due day.

## Non-goals
Reading bank notifications automatically, multi-user, real bank sync, cash capture by double-tap (cash is manual).

## Constraints / decisions
- Node 24, `node:sqlite` (single file `data/midas.db`), no framework, no new deps unless unavoidable. One server on **port 5003** serves static frontend + `/api/*`, bound to 127.0.0.1.
- Balances and budget remaining are **computed from transactions**, never stored/mutated. Account balance = opening balance + Σ(income) − Σ(expense) ± transfers. Budget used = Σ expense in category (incl. subcategories) for the month.
- Auth: `/api/capture` requires `Authorization: Bearer <MIDAS_TOKEN>` (from `.env`, gitignored). App/API otherwise require login (single user, password from `.env`, cookie session). Never open without auth.
- Capture is saved raw first (`captures` table, status pending→done|failed|review) so nothing is lost if Claude fails.
- Extraction: spawn `claude -p` with the image path and the user's category/account lists; expect JSON `{type, amount, merchant, date, account, category, subcategory, confidence}`. Validate against existing rows; unknown category/account or confidence < 0.7 → status `review` (transaction still created, flagged).
- Money stored as integer rupiah. Dates ISO, timezone Asia/Jakarta.

## Tables
accounts(id,name,group_id,type,opening_balance) · account_groups(id,name,type) · categories(id,name,kind,parent_id,monthly_budget) · transactions(id,date,kind,amount,account_id,to_account_id,category_id,note,source,flag) · recurring(id,kind,amount,account_id,category_id,note,day_of_month,active,last_run) · captures(id,created,image_path,status,raw_json,transaction_id)

## Left to the builder
UI styling details, exact endpoints, seed data (starter categories/accounts), how the recurring job is scheduled (check on server start + hourly timer is enough), Shortcut setup instructions (write a short README).
