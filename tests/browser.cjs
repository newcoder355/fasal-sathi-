/* Start a static server first: python -m http.server 8080 */
const assert=require('node:assert/strict');const fs=require('node:fs');
const pw=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
const {fixture,NOW}=require('./fixture.cjs');
(async()=>{
 const http=require('http'),path=require('path'),root=path.resolve(__dirname,'..');let server;if(!process.env.BASE_URL){server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]==='/'?'/index.html':req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));process.env.BASE_URL='http://127.0.0.1:'+server.address().port;}
 const options={headless:true};if(process.env.CHROMIUM_PATH){options.executablePath=process.env.CHROMIUM_PATH;options.args=['--no-sandbox','--disable-dev-shm-usage'];}
 if(process.env.HTTPS_PROXY){const proxy=new URL(process.env.HTTPS_PROXY);options.proxy={server:proxy.origin,bypass:'127.0.0.1,localhost',...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})};}
 const browser=await pw.chromium.launch(options);let passed=0;const errors=[];
 const check=(name,condition)=>{assert.ok(condition,name);console.log('PASS '+name);passed++;};
 try{
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844}});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',req=>{if(req.url().startsWith('https://api.open-meteo.com'))console.log('Weather network:',req.failure()?.errorText);});
 await page.clock.install({time:NOW});let requests=0,mode='wet';
 await page.route('https://api.open-meteo.com/**',async route=>{requests++;if(mode==='failed')return route.fulfill({status:503,body:'unavailable'});const f=fixture();if(mode==='dry')f.hourly.relative_humidity_2m.fill(50);if(mode==='missing')f.hourly.temperature_2m[15*24]=null;await route.fulfill({json:f});});
 // Maps are independent of the manual coordinate and forecast flow.
 await page.route('https://unpkg.com/**',route=>route.abort());
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8080');check('language page opens first',await page.locator('#screen-language').evaluate(el=>el.classList.contains('active')));check('login and OTP screens removed',await page.locator('#screen-login,#screen-otp,#signOut').count()===0);await page.locator('[data-lang="en"]').click();
 check('language selection opens homepage directly',await page.locator('#screen-home').evaluate(el=>el.classList.contains('active')));
 await page.locator('#bottomNav [data-route="fields"]').click();await page.locator('[data-add-field]').filter({visible:true}).first().click();
 await page.locator('.manual-coords summary').click();await page.locator('#manualLat').fill('23.525');await page.locator('#manualLon').fill('77.808');
 const manualId=await page.evaluate(()=>document.getElementById('manualLat').closest('form')?.id);if(manualId)await page.locator('#'+manualId).evaluate(f=>f.requestSubmit());else await page.locator('#applyCoordinates').click();
 await page.waitForFunction(()=>state.weatherStatus==='ready');check('weather API request uses field coordinates',requests>0);
 await page.locator('#saveLocationBtn').click();await page.locator('#cropSelect').selectOption('tomato');
 await page.locator('#fieldName').fill('Vidisha tomatoes');await page.locator('#fieldDetailsForm').evaluate(f=>f.requestSubmit());
 await page.locator('#openFieldTools').click();
 check('five future DSV rows',await page.locator('#tomcastBreakdown tr').count()===5);
 check('wet forecast totals 20',await page.locator('#tomcastTotal').innerText()==='20');
 check('completed-day history excludes forecast', (await page.locator('#accumulatedDsv').innerText()).includes('56 DSV'));
 check('no overflow at 390px',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/fasal-dashboard.png',fullPage:true,animations:'disabled'});
 mode='dry';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('changing weather changes forecast to zero',await page.locator('#tomcastTotal').innerText()==='0');
 mode='missing';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('missing hour shows unavailable total',await page.locator('#tomcastTotal').innerText()==='—');check('missing data does not show low risk',(await page.locator('#tomcastRiskBadge').innerText()).includes('Unavailable'));
 mode='failed';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('HTTP failure has retry message',(await page.locator('#fieldForecastStatus').innerText()).includes('could not'));
 for(const lang of ['hi','mr','en']){await page.locator('#languageSwitch').selectOption(lang);check('language '+lang+' retains forecast state',await page.locator('#tomcastTotal').innerText()==='—');check('language '+lang+' has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
 mode='wet';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);
 await page.locator('#fieldStartScan').click();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8uoAAAAASUVORK5CYII=','base64');
 await page.locator('#globalScanInput').setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);await page.locator('#runGlobalScan').click();
 check('photo has no fake confidence',!(await page.locator('#globalScanResult').innerText()).includes('87%'));
 check('field scanner preselects field',await page.locator('#scanFieldSelect').inputValue()!=='unlinked');
 await page.locator('#saveGlobalScan').click();await page.locator('#viewUpdatedField').click();check('photo history is unassessed',(await page.locator('#scanHistory').textContent()).includes('not assessed'));check('photo does not alter forecast',await page.locator('#tomcastTotal').innerText()==='20');
 await page.reload();check('reload starts at language page',await page.locator('#screen-language').evaluate(el=>el.classList.contains('active')));await page.locator('[data-lang="en"]').click();await page.locator('#bottomNav [data-route="fields"]').click();check('field survives reload',(await page.locator('#fieldList').innerText()).includes('Vidisha tomatoes'));await page.locator('[data-open-field]').first().click();check('photo survives reload',(await page.locator('#scanHistory').textContent()).includes('not assessed'));
 await page.evaluate(()=>{activeField().weather.fetchedAt-=7*3600000;renderFieldDashboard();});check('expired weather becomes unavailable',await page.locator('#tomcastTotal').innerText()==='—');
 await page.locator('#bottomNav [data-route="alerts"]').click();check('alerts do not show stale scores',!(await page.locator('#forecastAlertList').innerText()).includes('20 DSV'));check('no sample outbreak cards',await page.locator('#screen-alerts .alert-card').count()===0);
 await page.locator('#bottomNav [data-route="scan"]').click();await page.locator('#globalScanInput').setInputFiles({name:'bad.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>document.getElementById('globalScanError').textContent.length>0);check('invalid image cannot be saved',await page.locator('#runGlobalScan').isDisabled());
 await page.locator('#bottomNav [data-route="fields"]').click();mode='wet';await page.locator('[data-open-field]').first().click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('opening stale field refreshes it',await page.locator('#tomcastTotal').innerText()==='20');
 for(const width of [320,768,1280]){await page.setViewportSize({width,height:900});check('layout fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}await page.setViewportSize({width:390,height:844});
 const oldHistory=await page.evaluate(()=>activeField().tomcastHistory.start);await page.locator('#fieldEditDetails').click();await page.locator('#fieldName').fill('Renamed field');await page.locator('#cropContinue').click();await page.locator('#openFieldTools').click();check('details edit retains history',await page.evaluate(()=>activeField().tomcastHistory.start)===oldHistory);
 await page.locator('#bottomNav [data-route="scan"]').click();await page.locator('#globalScanInput').setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);await page.locator('#runGlobalScan').click();check('quick photo defaults to unlinked',await page.locator('#scanFieldSelect').inputValue()==='unlinked');
 await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('quota');};});await page.locator('#saveGlobalScan').click();check('storage failure does not claim saved',await page.locator('#scanSavedPanel').isHidden());check('failed photo save is rolled back',await page.evaluate(()=>account().unlinkedScans.length)===0);await page.evaluate(()=>Storage.prototype.setItem=window.savedSetItem);await page.locator('#saveGlobalScan').click();check('retry saves photo once',await page.evaluate(()=>account().unlinkedScans.length)===1);
 const legacy=await context.newPage();await legacy.route('https://api.open-meteo.com/**',route=>route.fulfill({json:fixture()}));await legacy.goto(process.env.BASE_URL);await legacy.clock.install({time:NOW});
 await legacy.evaluate(()=>{localStorage.setItem('fasalsathi.demo.v2',JSON.stringify({lang:'en',accounts:{'9876543210':{id:'OLD',fields:[{id:'old-field',name:'Existing tomatoes',crop:'tomato',lat:23.525,lon:77.808,weather:{tomcastDays:[{date:'2026-09-30',wetHours:24,avgWetTemp:23}]},scanHistory:[{at:1,prototype:true,confidence:87,result:'early_blight_like'}]}]}}}));sessionStorage.setItem('fasalsathi.demo.session','9876543210');});await legacy.reload();await legacy.locator('[data-lang="en"]').click();await legacy.locator('#bottomNav [data-route="fields"]').click();check('legacy field records retained',(await legacy.locator('#fieldList').innerText()).includes('Existing tomatoes'));check('legacy cached score rejected',(await legacy.locator('#fieldList').innerText()).includes('—'));await legacy.locator('[data-open-field]').click();await legacy.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('legacy weather refresh migrates',(await legacy.locator('#tomcastTotal').innerText())==='20');check('legacy demo is labelled, never diagnosed',(await legacy.locator('#scanHistory').textContent()).includes('Earlier demo'));
 await legacy.close();
 check('no JavaScript runtime errors',errors.length===0);
 if(process.env.LIVE_WEATHER==='1'){
   const liveContext=await browser.newContext({ignoreHTTPSErrors:true});const livePage=await liveContext.newPage();await livePage.goto(process.env.BASE_URL);livePage.on('console',m=>{if(m.type()==='error')console.log('Live browser:',m.text().slice(0,250));});
   const live=await livePage.evaluate(async()=>{const s=await Tomcast.fetchSnapshot(23.525,77.808);return {forecast:Tomcast.assess({weather:s}),timezone:s.timezone,temp:s.currentTemp};});
   check('live API returns five valid future dates',live.forecast.days.length===5&&live.forecast.available);console.log('LIVE '+JSON.stringify(live));await liveContext.close();
 }
 console.log(`${passed} browser checks passed`);await context.close();
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
