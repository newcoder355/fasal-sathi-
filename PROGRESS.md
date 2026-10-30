# Current work checkpoint

Repository: `newcoder355/fasal-sathi-` · branch: `main`

Live app: https://newcoder355.github.io/fasal-sathi-/

## Current implementation

- Language selection opens the local workspace directly. Fields and photo assessments are preserved in browser storage.
- New field setup requests location permission; manual map adjustment and GPS retry remain available. Coordinates and technical model inputs are hidden from farmer-facing screens.
- Open-Meteo feeds local TOMCAST weather-risk calculations with stale/missing-data handling and automatic refresh. The UI uses readable risk levels.
- Real Crop.health photo checks use the deployed Supabase `rapid-endpoint` function. The provider secret stays server-side. Accepted results retain symptoms, severity, treatment and alternatives when supplied.
- Tomato validation rejects non-tomato predictions at >=60%. Positive tomato identification and usable issue confidence use 50% thresholds. Uncertain crops can use a registered Tomato field; disease probabilities remain unchanged. Rejected results cannot be saved or reported through the app.
- Supabase-backed nearby alerts preserve the latest report-grouping changes, including separate isolated-report cards. See README and MODEL for limitations.

## Latest functional checkpoint

Commit `0ed07714976ea14b46fa7b0ad2056739888f917c`: tomato-only scan validation. Validation completed with 26 unit/model tests and 82 mocked browser checks, including accepted tomato, low-confidence crop fallback, confident wrong-crop rejection, weak-result rejection, retry, storage, language and mobile cases.

Real photo analysis and real weather retrieval were verified during the earlier integration. Later validation/display changes were tested with controlled API responses; do not describe those checks as new live API calls.

## Repository cleanup

Updated README to reflect current functionality, service configuration, local setup, tests, storage and limitations. Removed local leftovers of `index (1).html` and `nojekyll`; both had already been deleted from GitHub. Retained the actual `.nojekyll` marker, application modules, test fixtures and useful documentation. Added ignores for local dependencies, test output and environment secrets. Older checkpoint narratives remain recoverable from Git history.

## Resume workflow

1. Inspect `git status`, recent commits and current GitHub `main` before editing. Other sessions may have pushed newer changes.
2. Preserve the existing app and merge current remote changes; never overwrite them with an old full-file copy.
3. Run relevant checks documented in README. Live image tests consume provider credits; use mocked responses for routine regressions.
4. Push tested, coherent checkpoints during longer tasks. Record completed work and any remaining blockers here.
5. Never commit Kindwise secrets. The Supabase publishable key is frontend configuration, not a provider secret.


## Interface redesign checkpoint — 31 October 2026

- Added `app.css` as a dedicated visual layer, preserving the existing static HTML/JavaScript deployment model.
- Replaced the narrow centered app shell on signed-in screens with a responsive workspace: forest-green desktop sidebar, sticky utility header, spacious content canvas, and compact mobile bottom navigation.
- Rebuilt the home screen as a data-driven farm overview with field count, photo assessment count, selected field, TOMCAST five-day outlook, local Open-Meteo conditions, field list and recent photo assessments.
- Connected dashboard cards to the existing browser-stored field and scan records. Forecast labels are derived from the existing TOMCAST engine; unavailable/stale data remain unavailable rather than being represented as low risk.
- Preserved `tomcast.js`, `crop-scan.js`, Supabase calls, field storage, language dictionaries, existing setup flow and existing screen IDs.
- No new backend or diagnostic claims were introduced. The dashboard continues to describe photo results as automated suggestions and TOMCAST as weather favourability, not confirmed infection.
- Changes committed to `main`: `d2c722a` (stylesheet), `52f85b3` (application shell and dashboard markup), `364af83` (live dashboard data binding), `b0d3683` (header polish).
- Automated CI status checks were not configured/reported for these commits. Run the repository's documented Node and Playwright suites before treating the UI as fully regression-verified.

- Follow-up layout fix: offset the signed-in desktop app canvas by the fixed 258px sidebar width above 1120px, preventing the navigation rail from covering the dashboard content. The compact-rail and mobile breakpoints retain their own offsets.

- Second sidebar-overlap correction: reserve the fixed rail width using `body.signed-in { padding-left: ... }` at desktop/tablet breakpoints instead of relying on shifting the app wrapper that contains the fixed rail. The app wrapper is explicitly reset to full width of the body's remaining content area; mobile returns to zero left padding.
