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
