# FasalSathi TOMCAST implementation

## What this service does

The browser fetches real, location-specific Open-Meteo hourly weather and calculates weather favourability for tomato early blight, Septoria leaf spot and anthracnose. These diseases share a TOMCAST warning signal. This is not a classifier, disease detection, three independent probabilities, or a guarantee that infection will occur. No Gemini, trained neural network or inference API is involved.

## Calculation and conventions

The daily DSV lookup uses the FAST/TOMCAST table published by UC IPM:
https://ipm.ucanr.edu/DISEASE/DATABASE/dsvtable.html

- Count hourly relative humidity >=90% as estimated leaf-wet hours.
- Average temperature **only during those wet hours**.
- Round that mean to the nearest whole degree Celsius before using the published integer temperature bands: 13–17, 18–20, 21–25, 26–29. This is an explicit discretisation convention, not a continuous-temperature calibration.
- Use one complete local calendar day (24 unique hourly records). Missing or duplicate hours invalidate the day. A 23/25-hour daylight-saving day is unavailable under this 24-hour implementation.
- With no wet hours, DSV is zero. With wet hours and temperature outside the table, show “Outside model range”, not zero.
- Today is a whole-day estimate, including remaining forecast hours. The five-day forecast begins **tomorrow**. Neither today nor future estimates enter completed-day accumulation.
- Peak daily favourability maps DSV 0/1/2/3/4 to low/mild/moderate/high/very high. It is a display scale, not a probability or a validated five-day treatment threshold.

RH is a proxy, not a direct leaf-wetness measurement. It can miss wetness caused by rain or irrigation below the humidity threshold and can misestimate dew. A gridded weather forecast is not an in-field sensor. The conventional method needs actual leaf-wetness duration and its corresponding mean temperature. Stored manual spot readings are therefore **not** substituted into a daily score or future forecast. An hourly sensor integration and local agronomic validation are still required for field-calibrated advice.

## Time, history and data quality

Open-Meteo request: 14 past days plus 6 forecast days (today and five following days); Celsius, millimetres, timezone=auto. Past data are archived weather-model forecasts, not measured observations. Current temperature/humidity retain nulls. Every scored day requires 24 valid temperature/RH pairs. Incomplete five-day coverage gives no five-day total or overall risk class; available daily estimates are still displayed.

A versioned dated ledger records completed days, deduplicates refreshes, retains previously valid days if a later response is incomplete, and identifies missing dates. Changing a field's coordinates resets its ledger. Its start is the earliest recorded date, initially up to 14 days before first sync. The UI reports an incomplete total when a gap exists. It is **recorded weather accumulation**, not a spray-scheduling accumulation reset after fungicide application; no spray threshold or pesticide schedule is implemented.

Forecasts expire after six hours or at the field's next local midnight. Old-format caches and future-clock anomalies are rejected. Opening a stale field, returning to its page, reconnecting, or the periodic foreground check refreshes weather. Requests time out after 30 seconds. Failed updates retain the old timestamp; expired data cannot appear as a current low-risk forecast. Rapidly switching locations/fields ignores superseded responses.

## Photos, accounts and persistence

Crop photos are compressed and stored locally as **unassessed** records. No diagnosis or confidence is invented. Earlier demo scan history is explicitly labelled as a demo and excluded from weather scores. Nearby sample outbreak cards have been removed.

The app starts with language selection, which opens the homepage directly. A local workspace is selected automatically, preserving the active or first existing profile. The login and OTP screens have been removed. Browser storage is not secure authentication, a server backup, or cross-device synchronisation. Storage failures are surfaced. Image diagnosis, cloud accounts, real-time sensor ingestion and community outbreak monitoring are not connected.

## Validation and sources

- UC IPM, FAST disease-severity table, above.
- UConn Extension, TOM-CAST accumulated DSV and limitations:
  https://ipm.cahnr.uconn.edu/early-blight-management-in-fresh-market-tomatoes/
- TOMcast disease scope (Early Blight, Septoria Leaf Spot, Anthracnose):
  https://www.weatherinnovations.com/tomcast.html
- Open-Meteo API documentation and data attribution:
  https://open-meteo.com/en/docs

Software tests verify the calculation and app behaviour; they do **not** establish predictive accuracy in Indian tomato fields. Regional disease observations, sensor comparisons and prospective field validation are needed to measure that accuracy.

Run `node --test tests/tomcast.test.cjs`. Browser regression tests use Playwright: `node tests/browser.cjs` with `BASE_URL` pointing to this directory served over HTTP. The browser test starts a local static server automatically unless BASE_URL is supplied. `LIVE_WEATHER=1` enables a live API smoke check rather than a fixture.

### Verification on 1 October 2026

18 model tests passed, including all 425 integer temperature/wet-hour table cases. 41 Chromium browser checks passed, including live Open-Meteo retrieval for Vidisha, five dated future forecasts, changing weather, incomplete responses, failed requests, stale-data refresh, field creation/edit/reload, migration of old fields and demo scans, photo save/retry, storage failure rollback, English/Hindi/Marathi, and layouts at 320/390/768/1280 px. A live cross-origin request returned five valid forecast days. This establishes tested software behaviour, not field diagnostic accuracy.
