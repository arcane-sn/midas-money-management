# MIDAS

Personal finance: double-tap iPhone after paying → transaction recorded. Spec/plan in `docs/superpowers/`.

## Run
1. `cp .env.example .env` and set `MIDAS_TOKEN` (long random) and `MIDAS_PASSWORD`.
2. `npm start` → http://127.0.0.1:5003 (tests: `npm test`).
3. Cloudflare Tunnel: hostname `midas.arcane-magus.site` → `http://localhost:5003`.

## iPhone Shortcut (Back Tap)
1. Shortcuts → new shortcut "MIDAS": **Take Screenshot** → **Convert Image** (to JPEG) → **Get Contents of URL**:
   URL `https://midas.arcane-magus.site/api/capture`, Method POST, Headers `Authorization: Bearer <MIDAS_TOKEN>`, Request Body **File** = the image.
2. Settings → Accessibility → Touch → Back Tap → Double Tap → Shortcut "MIDAS".
3. Double-tap on the payment-success screen (BCA, Jago, GoPay, OVO). Items flagged `review` in the app need a quick look.

Cash is entered manually in the app. Auto-debits: Settings → Recurring.
