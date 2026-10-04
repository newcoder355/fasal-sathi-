// Verify the deployed files and real weather path. Requires Playwright.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright', {
  paths: [process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || process.cwd()]
}));
(async () => {
  const options = { headless: true };
  if (process.env.CHROMIUM_PATH) {
    options.executablePath = process.env.CHROMIUM_PATH;
    options.args = ['--no-sandbox', '--disable-dev-shm-usage'];
  }
  if (process.env.HTTPS_PROXY) {
    const proxy = new URL(process.env.HTTPS_PROXY);
    options.proxy = { server: proxy.origin,
      ...(proxy.username ? { username: decodeURIComponent(proxy.username), password: decodeURIComponent(proxy.password) } : {}) };
  }
  const browser = await chromium.launch(options);
  try {
    const page = await browser.newPage({
      ignoreHTTPSErrors: process.env.TEST_IGNORE_HTTPS_ERRORS === '1',
      viewport: { width: 390, height: 844 }
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.DEPLOYMENT_URL || 'https://newcoder355.github.io/fasal-sathi-/', { timeout: 45000 });
    await page.waitForFunction(() => typeof Tomcast !== 'undefined');
    for (const file of ['index.html', 'tomcast.js']) {
      const deployed = await page.evaluate(async file => {
        const response = await fetch(file, { cache: 'no-store' });
        if (!response.ok) throw new Error('Deployment HTTP ' + response.status);
        return response.text();
      }, file);
      assert.equal(deployed, fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), file + ' differs from tested source');
    }
    await page.locator('[data-lang="en"]').click();
    const result = await page.evaluate(async () => {
      const weather = await Tomcast.fetchSnapshot(23.525, 77.808);
      const field = { id: 'deployment-check', name: 'Vidisha verification', crop: 'tomato', lat: 23.525, lon: 77.808, scanHistory: [] };
      applyFieldWeather(field, weather);
      account().fields.push(field);
      openFieldDashboard(field.id);
      const forecast = calculateTomcast(field);
      return { currentDate: weather.currentDate, dates: forecast.days.map(day => day.date), available: forecast.available, risk: forecast.risk, total: forecast.total };
    });
    assert.equal(result.dates.length, 5);
    assert.ok(result.dates.every(date => date > result.currentDate));
    assert.equal(result.available, true, 'Live weather has incomplete or out-of-model-range days');
    assert.equal(await page.locator('#tomcastBreakdown tr').count(), 5);
    assert.deepEqual(errors, []);
    console.log('PASS: deployed files match tested source; live weather renders five future dates.');
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
