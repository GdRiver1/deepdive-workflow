# Team Jellie Hub v4 Status

Date checked: 2026-06-07

## Classification

Team Jellie Hub v4 is a personal static kitchen dashboard for a GE Kitchen Hub / Android browser screen.

It is not an AI Factory helper tool, not part of the YouTube Social Pipeline, and should not be registered in Factory Command Center unless that is explicitly requested later.

## Current State

- Static browser app: `index.html`, `styles.css`, `app.js`
- No build step, package install, local server, API key, or credential file required
- State persists only in browser `localStorage`
- Optional browser network calls are limited to public weather/radar endpoints
- Govee sections are recommendation/reference tools only; they do not control devices
- Blogger path is manual copy/paste only; the app does not post or publish

## Safety Boundaries

- Do not add secrets, API keys, OAuth tokens, cookies, passwords, or private automation credentials.
- Do not wire this app to uploads, posts, email sends, Git commits, deletes, or background agents.
- Do not add live Govee, Google Calendar, Blogger, or smart-home control without a separate approval and safety review.
- Before publishing outside a private/local workflow, review saved localStorage data, personal links, and household-specific text.

## Verified

- `node --check apps\team-jellie-hub-v4\app.js` passes.
- `index.html` references only local `styles.css` and `app.js`.
- README documents direct browser opening and Blogger-safe manual copy path.

## Next Useful Improvements

- Browser visual pass on the GE Kitchen Hub target dimensions.
- Add a manual "screen profile" preset for kitchen display size and brightness.
- Add a one-file Blogger export helper only if needed.
- Keep integrations read-only/manual until a separate safety plan exists.
