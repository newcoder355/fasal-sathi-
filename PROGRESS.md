# FasalSathi work checkpoint

## Saved implementation

The live-weather correction is saved in commit `ccbbf492957b85f57da80663f89f0a4ce5bbbc4d` on `main`. GitHub Pages deployment run `36866362635` completed successfully. The application remains hosted at https://newcoder355.github.io/fasal-sathi-/.

Implemented: location-specific Open-Meteo inputs; TOMCAST daily weather favourability for early blight, Septoria leaf spot and anthracnose; today separate from five future forecast days; completed-day history; missing/stale-data handling; request timeouts and refresh; old-record migration; unassessed crop photos instead of fabricated diagnoses; browser-local workspace.

## Verification

- 1 October: 18 model tests and 41 browser checks passed, including real weather retrieval.
- 4 October: GitHub main and successful deployment verified; deployed HTML and model source match the saved implementation; all 18 model tests passed again.
- 4 October: deployed browser check passed with live Vidisha weather and five future dates (5–9 October); no JavaScript runtime errors. Final deployment verification is complete.
- See `MODEL.md` for scientific conventions and limitations. Software checks do not establish local field accuracy.

## Resume workflow

1. Read this file, `git log -5`, current GitHub main, and the latest Pages deployment before changing anything.
2. Keep tested, coherent changes in GitHub checkpoints during extended work; do not depend on temporary workspace files.
3. Run `node --test tests/tomcast.test.cjs` for model changes. Run `node tests/browser.cjs` for affected browser flows (requires Playwright and Chromium).
4. Run `node tests/deployment.cjs` after publishing to verify the actual deployed source and current live weather. It uses an isolated browser session. Optional variables: `DEPLOYMENT_URL`, `CHROMIUM_PATH`. `TEST_IGNORE_HTTPS_ERRORS=1` is only for a test environment with an intercepting proxy.

## Scope still not implemented

Photo-based disease classification, direct hourly sensor ingestion, cloud accounts/synchronisation, community outbreak reporting and validated pesticide scheduling are not connected. TOMCAST estimates weather favourability; it does not diagnose infection. The humidity proxy and temperature-table convention are documented in `MODEL.md`.

## Latest update: direct entry (4 October 2026)

At the user's request, the language page now opens first on every launch/reload; selecting a language goes straight to Home. Login/OTP markup, handlers, timers and the sign-out/account section were removed. Existing browser records and storage keys are preserved; an existing active or first local profile is selected automatically. Forecasting, fields, photos and alerts are otherwise unchanged. All 43 browser regression checks passed after this edit. Deployment verification is performed after pushing this checkpoint.

## Latest update: neutral visual styling (4 October 2026)

Changed decorative surfaces to white/grey and text/icons to neutral dark tones. Primary action buttons use muted green (#526b5c). The crop-problem prompt stays inside a white bordered card. Photos now uses the same bottom-tab styling, size and alignment as the other tabs. Fixed a mobile overflow caused by the hidden upload input and replaced its emoji with a monochrome icon. Targeted browser checks passed for matching navigation geometry, card/button colours, photo navigation, all bottom tabs, 320/390/1280px home layouts and photo-page overflow; home and photo screenshots visually reviewed. App logic and TOMCAST are unchanged.


## Farmer-readable risk labels

- Replaced numeric DSV outputs on field cards, dashboard, daily forecast and alerts with Low / Moderate / High / Very high, translated into Hindi and Marathi. Unavailable weather remains explicitly unavailable.
- Kept the TOMCAST model and stored history unchanged. Removed cumulative score display rather than inventing a cumulative risk threshold. The five-day label represents the highest daily weather risk, not an infection probability.
- Simplified the daily table and adjusted the risk panel for longer labels. Passed 18 model tests and 51 browser checks, including 320px layout and translated labels.

## Soft light-green actions and automatic weather refresh

- Replaced dark muted green actions with a soft light-green background (#d8eadb) and dark readable text. Kept white surfaces, outlined cards and equal bottom navigation tabs.
- Fixed expired saved forecasts remaining stuck on Home/Fields/Alerts: visible main screens now fetch missing or expired weather automatically, including on return to the app and periodic foreground checks.
- Shared in-flight requests per field, persisted results after screen changes, guarded changed/deleted fields, and synchronized an open details edit with refreshed weather. Failed requests retain unavailable/stale scores and show the connection/retry message; automatic attempts have a one-minute cooldown, while manual retry remains immediate.
- Validation: 18 model tests (including all 425 table combinations), 49 browser checks, and mobile/desktop style checks passed. Added regression coverage for background refresh, navigation deduplication, persistence, legacy cache migration and fresh-cache reuse. Deployment check now exercises automatic real-weather loading.

## Farmer-facing screens and automatic field location

- Removed technical weather readings, latitude/longitude, manual coordinate entry and model names from farmer-facing screens. Retained readable risk labels, update time, simple forecast availability and existing photo records. Technical model documentation remains separate.
- New field location selection requests geolocation immediately, selects the returned position and centres the map at zoom 16. A saved field keeps its own pin. The current-location button remains available for retries; map taps and marker dragging remain available. Farmers confirm the pin before saving because their current position may not be their field.
- Manual selection, clearing the pin or leaving the page invalidates pending GPS results. Permission denial never creates a fictional location.
- Validation: 18 model tests and 64 browser checks passed, including granted/denied/retried/delayed GPS, hidden technical details in all three languages, saved field edits, weather refresh and mobile layouts. Preserved remote deletion of the old backup HTML and duplicate nojekyll file.

## Real crop-photo assessment through the deployed Edge Function

- Replaced the demo result selector and fixed confidence scores with POST /functions/v1/rapid-endpoint. Existing JPEG preview conversion is reused; only raw base64 is sent. The public Supabase key is an apikey header, never a Bearer token or Kindwise secret.
- Added crop-scan.js for the actual proxy response (crop/diseases arrays) and raw provider response, optional detail normalization, error handling, timeout and cancellation. UI shows likely crop, top match, probability, reference symptoms/severity, treatments and alternative matches. Missing details remain explicitly unavailable.
- Added loading, duplicate-request protection, retry and stale-result guards when navigating or choosing another image. Stored assessments include genuine results and match scores. Prior demo records remain labelled; weather calculations remain separate. Existing cloud disease reporting and latest outbreak loading changes are preserved.
- All 25 unit/model tests and 70 mocked browser checks passed. One real proxy request returned HTTP 200 and the expected rich result structure. tests/scan-deployment.cjs provides an explicit opt-in live browser scan check using one provider identification and never submits a cloud report.

## Low-confidence crop display fallback

- Crop suggestions below 50%, missing probabilities and absent crop suggestions now use the selected field's registered crop, or Uncertain when none is available. A small translated note explains when a registered crop is used. Suggestions at exactly 50% or above retain their existing display.
- Field selection changes immediately update the displayed crop and survive language changes. Saved field history follows the same display rule. The original API assessment, disease result/probability, optional details, weather calculations and Edge Function request are unchanged.
- Verification: 78 browser checks passed. Explicitly tested Tobacco 0.6% → registered Tomato with Target Spot 80.4% unchanged; unlinked → Uncertain; 49.9%/50% boundary; missing probabilities; other registered crops; English/Hindi/Marathi; and saved-history display. Preserved newer GitHub outbreak changes before editing.
