# Team Jellie Retirement & Benefits Command Center

A polished static web app for retirement and benefits planning, focused on **cash-flow management**, **Social Security timing**, **countable-income pressure**, **tax layers**, and **forever-home housing strategy**.

## What the app does

- Models monthly retirement cash flow with Social Security starting on day one of retirement.
- Supports claim-age scenarios for Jason and Kellie (62/65/67 and mixed ages).
- Projects account balances with monthly growth assumptions and configurable withdrawal order.
- Adds configurable tax model layers: federal bracket estimate + IRMAA-style surcharge thresholds + RMD logic.
- Tracks warning lines (SNAP-style, medical-style, custom monthly, annual tax warning).
- Compares housing strategy with current mortgage+HELOC vs merged-loan scenario.
- Includes scenario lab (save/load and compare up to 3).
- Includes Monte Carlo stress testing with percentile confidence bands (P10/P50/P90).
- Includes guided 62 vs 65 vs 67 wizard with side-by-side recommendation scoring.
- Includes JSON import/export, localStorage auto-save, and PDF/image statement ingest with approval-before-apply.

## Run locally

1. Open a terminal in `team-jellie-retirement-tool`.
2. Run a static server, for example: `python3 -m http.server 8080`
3. Open `http://localhost:8080`.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (or make it repo root).
2. In GitHub: **Settings → Pages**.
3. Set Source to your branch and folder (`/root` or `/docs`).
4. Save. GitHub Pages will publish shortly.

## Built-in assumptions

- Social Security starts immediately at retirement start.
- Forever-home strategy (no downsizing assumption).
- Mortgage+HELOC merge is a probable scenario to test.
- Reverse mortgage is optional and advanced only (not core plan).
- Goal is realistic living with intelligent countable/taxable-income management.

## Static-app reliability notes

- PDF parsing uses `pdf.js` CDN and OCR uses `tesseract.js` CDN.
- If browser/network policy blocks CDN scripts, ingest fails gracefully with manual fallback guidance.
- Monte Carlo is a planning stress test, not a prediction guarantee.

## Files

- `index.html` — multi-file production app entrypoint.
- `single-file-fallback.html` — one-file fallback version.
- `assets/css/styles.css` — dashboard styles.
- `assets/js/app.js` — UI wiring, wizard, scenarios, charts, Monte Carlo.
- `assets/js/calculations.js` — projection engine + tax/RMD + Monte Carlo backend.
- `assets/js/storage.js` — localStorage and JSON utilities.
- `assets/js/importers.js` — PDF/OCR statement ingest.
- `assets/data/sample-team-jellie.json` — prefilled Team Jellie sample scenario.
