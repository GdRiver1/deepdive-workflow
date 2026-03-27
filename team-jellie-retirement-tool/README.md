# Team Jellie Retirement & Benefits Command Center

A polished static web app for retirement and benefits planning, focused on **cash-flow management**, **Social Security timing**, **countable-income pressure**, and **forever-home housing strategy**.

## What the app does

- Models monthly retirement cash flow with Social Security starting on day one of retirement.
- Supports Social Security claim-age scenarios for Jason and Kellie (62/65/67 and mixed ages).
- Projects account balances (cash, taxable, Roth, HSA, traditional) with monthly growth assumptions.
- Uses configurable withdrawal order and automatically fills shortfalls by source.
- Tracks warning lines (SNAP-style, medical-style, custom monthly, annual tax warning).
- Compares housing strategy with current mortgage+HELOC vs merged-loan scenario.
- Provides scenario lab (save/load scenarios and compare up to 3).
- Includes JSON import/export plus auto-save/restore via localStorage.
- Includes statement ingest for PDF/image files with review-before-apply detected values.
- Renders monthly/annual tables and charts for balance timeline, income vs spending, warning pressure, and housing comparison.

## Run locally

1. Open a terminal in `team-jellie-retirement-tool`.
2. Run a static server, for example:
   - `python3 -m http.server 8080`
3. Open `http://localhost:8080`.

> Using a local web server is recommended so `fetch()` can load sample JSON and external libraries cleanly.

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository (or make it repo root).
2. In GitHub: **Settings → Pages**.
3. Set Source to your branch (for example `main`) and folder (`/root` or `/docs` depending on repo setup).
4. Save. GitHub Pages will publish a URL in ~1–2 minutes.

## Built-in assumptions

- Social Security starts immediately at retirement start (no delayed start in base model).
- Forever-home strategy (no downsizing assumption).
- Mortgage+HELOC merge is a probable scenario to test.
- Reverse mortgage is optional and advanced only (not core plan).
- Goal is realistic living with intelligent countable/taxable-income management (not extreme austerity).

## Static-app reliability notes

- PDF parsing uses `pdf.js` CDN and OCR uses `tesseract.js` CDN.
- If browser/network policy blocks CDN scripts, ingest will fail gracefully with actionable fallback instructions.
- OCR quality depends on image clarity; user confirmation is required before applying detected values.

## Files

- `index.html` — multi-file production app entrypoint.
- `single-file-fallback.html` — one-file fallback version.
- `assets/css/styles.css` — dashboard styles.
- `assets/js/app.js` — UI wiring, rendering, scenarios, charts.
- `assets/js/calculations.js` — projection engine.
- `assets/js/storage.js` — localStorage and JSON utilities.
- `assets/js/importers.js` — PDF/OCR statement ingest.
- `assets/data/sample-team-jellie.json` — prefilled Team Jellie sample scenario.
