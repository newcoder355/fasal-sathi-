# FasalSathi

A tomato-focused crop assistant with photo assessments, location-based disease weather forecasts, saved field records and nearby disease-report alerts.

**[Open the app](https://newcoder355.github.io/fasal-sathi-/)**

## Features

- **Tomato photo checks:** upload or capture a photo to receive a likely issue, match confidence, and available symptoms, severity information, treatment suggestions and alternative matches.
- **Tomato-only validation:** confident non-tomato predictions are rejected. Uncertain crop identification can fall back to a registered Tomato field when the issue result is usable. Rejected scans offer clearer-photo guidance and cannot be saved or submitted through the app's reporting flow.
- **Weather-based disease risk:** Open-Meteo hourly forecasts feed the TOMCAST calculation for early blight, Septoria leaf spot and anthracnose. Farmers see Low, Moderate, High or Very high rather than raw scores. Today and the next five days are shown separately; stale or incomplete data is not presented as low risk.
- **Field records:** automatic location permission request, map pin adjustment, crop details and saved photo assessments. Language selection opens the homepage directly, with no login screen.
- **Nearby reports:** Supabase-backed report grouping within 5 km of saved fields. Single reports appear separately; multiple unique fields can trigger nearby-activity or outbreak-watch cards. These are reports, not confirmed outbreaks or background push notifications.
- **Mobile interface:** English, Hindi and Marathi labels, a neutral layout and soft green action buttons. Provider-supplied assessment text may remain in English.

## How it works

The frontend is a static HTML/CSS/JavaScript app hosted on GitHub Pages. There is no build step.

| Component | Responsibility |
| --- | --- |
| Browser | Interface, field records, photo previews and saved assessments |
| Open-Meteo + `tomcast.js` | Hourly weather retrieval and local weather-risk calculations |
| Supabase Edge Function | Securely calls Kindwise Crop.health for image analysis |
| Supabase `disease_reports` | Receives eligible saved field reports and supplies nearby alerts |

The browser sends `POST { "image": "<base64 image>" }` to the configured `rapid-endpoint` function with the Supabase publishable key in the `apikey` header. The Kindwise API key stays in the Edge Function's server-side secrets. It must never be added to this repository or browser code.

The image is sent for analysis when the user selects **Check photo**. Saving an accepted disease assessment to a field also invokes the existing cloud report flow, which includes field ID, issue, coordinates and confidence. Field records and photo assessments themselves are stored in the current browser; clearing site data can remove them.

## Run locally

Clone the repository and serve its root directory:

```sh
git clone https://github.com/newcoder355/fasal-sathi-.git
cd fasal-sathi-
python -m http.server 8080
```

Open `http://localhost:8080`. Internet access is needed for weather, map tiles, image analysis and nearby reports. Location access requires browser permission and a secure context such as localhost or HTTPS.

### Service configuration

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are configured in `index.html`. The deployed function is called at `${SUPABASE_URL}/functions/v1/rapid-endpoint`.

For a separate deployment, provide your own Supabase project, deployed function and `disease_reports` table with appropriate access policies. The frontend uses `field_id`, `disease`, `latitude`, `longitude`, `confidence` and `source`, and reads `created_at` when present. The deployed Edge Function source and database migrations are **not included** in this repository; cloning the frontend does not provision them.

Tomato validation settings are in `CropScan.TOMATO_VALIDATION` in `crop-scan.js`:

| Setting | Initial threshold |
| --- | --- |
| Reject a non-tomato crop prediction | 60% |
| Accept a positive tomato crop prediction | 50% |
| Require a usable top issue/healthy match | 50% |

These are configurable product rules, not accuracy guarantees. Disease confidence is never reduced or recalculated from crop confidence.

## Tests

With a current Node.js installation, run the dependency-free model and response tests:

```sh
node --test tests/tomcast.test.cjs tests/crop-scan.test.cjs
```

For browser checks, install Playwright and its Chromium browser locally:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/browser.cjs
```

The browser suite starts a local server and mocks external scan, weather and database responses. It does not spend Crop.health credits or insert test reports into the live database. `CHROMIUM_PATH` can point to an existing Chromium executable; `BASE_URL` can select another served instance.

Optional checks against the published site:

```sh
# Checks deployed source and live weather
node tests/deployment.cjs

# Uses a real test photo and consumes a provider identification
SCAN_TEST_IMAGE=/absolute/path/to/tomato-photo.jpg node tests/scan-deployment.cjs

# Check rejection using a known non-tomato test image
SCAN_EXPECT_REJECTION=1 SCAN_TEST_IMAGE=/absolute/path/to/non-tomato.jpg node tests/scan-deployment.cjs
```

Live scan checks do not submit a cloud report. `DEPLOYMENT_URL` overrides the default GitHub Pages URL.

## Repository files

| Path | Purpose |
| --- | --- |
| `index.html` | App screens, styling, translations, field storage and service wiring |
| `tomcast.js` | Weather retrieval, scoring, freshness validation and history |
| `crop-scan.js` | Scan response parsing, request handling and tomato validation |
| `tests/` | Model, API-adapter, browser and opt-in deployment checks |
| [MODEL.md](MODEL.md) | Method details, sources and limitations |
| [PROGRESS.md](PROGRESS.md) | Current checkpoint and instructions for resuming work |
| `.nojekyll` | GitHub Pages static-serving marker |

## Limits to understand

Photo assessments are automated suggestions, not confirmed diagnoses. Confidence is a match score, not the proportion of crop damage; returned severity and symptoms describe the suggested condition. Weather risk estimates favourable conditions rather than proving infection, and leaf wetness is estimated from humidity rather than measured in the field.

Nearby alerts depend on report quality. The current compatibility logic retains records with missing or invalid timestamps, so those records cannot be guaranteed to be from the stated five-day window. Local field validation and expert confirmation remain necessary before treatment decisions.
