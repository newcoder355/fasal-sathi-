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
