# FasalSathi

Location-specific tomato disease weather-risk forecasts for early blight, Septoria leaf spot and anthracnose, using live Open-Meteo weather and a local TOMCAST calculation.

[Open FasalSathi](https://newcoder355.github.io/fasal-sathi-/)

- Today’s full-day estimate and five future daily DSV forecasts.
- Completed-day DSV history with missing/stale-data handling.
- Device-local field records and unassessed crop photos.
- English, Hindi and Marathi interfaces.

Serve this directory with `python -m http.server 8080`. No build step or weather API key is needed for the current non-commercial Open-Meteo endpoint. For commercial or larger-scale use, review the provider’s terms and service limits.

Run model tests: `node --test tests/tomcast.test.cjs`.

Read [MODEL.md](MODEL.md) for calculation conventions, data limitations, test instructions and sources. Weather-risk forecasts are not infection diagnoses or automated spray advice. Photos are not analysed by an image model. Records stay in this browser.
