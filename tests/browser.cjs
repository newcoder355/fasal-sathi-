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
 const context=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:390,height:844},permissions:['geolocation'],geolocation:{latitude:23.525,longitude:77.808}});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',req=>{if(req.url().startsWith('https://api.open-meteo.com'))console.log('Weather network:',req.failure()?.errorText);});
 await page.clock.install({time:NOW});let requests=0,mode='wet';
 await page.route('https://api.open-meteo.com/**',async route=>{requests++;if(mode==='failed')return route.fulfill({status:503,body:'unavailable'});const f=fixture();if(mode==='dry')f.hourly.relative_humidity_2m.fill(50);if(mode==='missing')f.hourly.temperature_2m[15*24]=null;await route.fulfill({json:f});});
 let scanMode='success',scanRequests=0,cloudWrites=0;
 const scanFixture={success:true,crop:[{name:'tomato',probability:.91}],diseases:[{name:'early blight',probability:.92,details:{symptoms:{Leaves:'Brown spots'},severity:'Can damage foliage',treatment:{prevention:['Avoid wet foliage']}}},{name:'Septoria leaf spot',probability:.06}]};
 await context.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient:()=>({from:()=>({insert:async()=>({error:null}),select:async()=>({data:[],error:null})})})};'}));
 await page.route('**/functions/v1/rapid-endpoint',async route=>{scanRequests++;const body=route.request().postDataJSON();assert.ok(body.image&&!body.image.startsWith('data:'));assert.ok(route.request().headers().apikey.startsWith('sb_publishable_'));if(scanMode==='fail')return route.fulfill({status:503,body:'unavailable'});if(scanMode==='delay')await new Promise(r=>setTimeout(r,300));return route.fulfill({json:scanFixture});});
 // Maps are independent of the manual coordinate and forecast flow.
 await page.route('https://unpkg.com/**',route=>route.abort());
 await page.goto(process.env.BASE_URL||'http://127.0.0.1:8080');check('language page opens first',await page.locator('#screen-language').evaluate(el=>el.classList.contains('active')));check('login and OTP screens removed',await page.locator('#screen-login,#screen-otp,#signOut').count()===0);await page.locator('[data-lang="en"]').click();
 check('language selection opens homepage directly',await page.locator('#screen-home').evaluate(el=>el.classList.contains('active')));
 await page.locator('#bottomNav [data-route="fields"]').click();await page.locator('[data-add-field]').filter({visible:true}).first().click();
 check('coordinate entry is hidden',await page.locator('.manual-coords').isHidden());
 await page.waitForFunction(()=>state.weatherStatus==='ready');check('weather API request uses field coordinates',requests>0);
 await page.locator('#saveLocationBtn').click();await page.locator('#cropSelect').selectOption('tomato');
 await page.locator('#fieldName').fill('Vidisha tomatoes');await page.locator('#fieldDetailsForm').evaluate(f=>f.requestSubmit());
 await page.locator('#openFieldTools').click();
 check('five future DSV rows',await page.locator('#tomcastBreakdown tr').count()===5);
 check('wet forecast displays Very high',await page.locator('#tomcastTotal').innerText()==='Very high');
 check('no farmer-facing DSV numbers',!(await page.locator('#screen-field').innerText()).includes('DSV'));
 check('daily labels cover all score bands',await page.evaluate(()=>[0,1,2,3,4,null].map(dailyRiskLabel).join('|'))==='Low|Low|Moderate|High|Very high|Unavailable');
 check('completed-day history excludes forecast', await page.evaluate(()=>Tomcast.historySummary(activeField().tomcastHistory,activeField().weather.currentDate).total===56));
 check('no overflow at 390px',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
 await page.screenshot({path:process.env.SCREENSHOT_PATH||'/tmp/fasal-dashboard.png',fullPage:true,animations:'disabled'});
 mode='dry';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('dry weather displays Low',await page.locator('#tomcastTotal').innerText()==='Low');
 mode='missing';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('missing hour shows unavailable total',await page.locator('#tomcastTotal').innerText()===await page.evaluate(()=>t('riskUnknown')));check('missing data does not show low risk',(await page.locator('#tomcastRiskBadge').innerText()).includes('Unavailable'));
 mode='failed';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('HTTP failure has retry message',(await page.locator('#fieldForecastStatus').innerText()).includes('could not'));
 for(const lang of ['hi','mr','en']){await page.locator('#languageSwitch').selectOption(lang);check('language '+lang+' retains forecast state',await page.locator('#tomcastTotal').innerText()===await page.evaluate(()=>t('riskUnknown')));check('language '+lang+' has no overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}
 mode='wet';await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);
 await page.locator('#fieldStartScan').click();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8uoAAAAASUVORK5CYII=','base64');
 await page.locator('#globalScanInput').setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);await page.locator('#runGlobalScan').click();await page.locator('#globalScanResult').waitFor({state:'visible'});
 check('scan displays real response confidence',(await page.locator('#scanResultConfidence').innerText())==='92%');check('demo selector removed',await page.locator('#demoDiseaseSelect').count()===0);
 check('field scanner preselects field',await page.locator('#scanFieldSelect').inputValue()!=='unlinked');
 await page.locator('#saveGlobalScan').click();await page.locator('#viewUpdatedField').click();check('real result is saved in history',(await page.locator('#scanHistory').textContent()).includes('early blight'));check('photo does not alter forecast',await page.locator('#tomcastTotal').innerText()==='Very high');
 await page.reload();check('reload starts at language page',await page.locator('#screen-language').evaluate(el=>el.classList.contains('active')));await page.locator('[data-lang="en"]').click();await page.locator('#bottomNav [data-route="fields"]').click();check('field survives reload',(await page.locator('#fieldList').innerText()).includes('Vidisha tomatoes'));await page.locator('[data-open-field]').first().click();check('real result survives reload',(await page.locator('#scanHistory').textContent()).includes('early blight'));
 await page.evaluate(()=>{activeField().weather.fetchedAt-=7*3600000;renderFieldDashboard();});check('expired weather becomes unavailable',await page.locator('#tomcastTotal').innerText()===await page.evaluate(()=>t('riskUnknown')));
 mode='failed';await page.locator('#bottomNav [data-route="alerts"]').click();check('alerts do not show stale scores',!(await page.locator('#forecastAlertList').innerText()).includes('Very high'));check('no sample outbreak cards',await page.locator('#screen-alerts .alert-card').count()===0);
 await page.locator('#bottomNav [data-route="scan"]').click();await page.locator('#globalScanInput').setInputFiles({name:'bad.jpg',mimeType:'image/jpeg',buffer:Buffer.from('not an image')});await page.waitForFunction(()=>document.getElementById('globalScanError').textContent.length>0);check('invalid image cannot be saved',await page.locator('#runGlobalScan').isDisabled());
 await page.locator('#bottomNav [data-route="fields"]').click();mode='wet';await page.locator('[data-open-field]').first().click();await page.locator('#refreshFieldForecast').click();await page.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('opening stale field refreshes it',await page.locator('#tomcastTotal').innerText()==='Very high');
 for(const width of [320,768,1280]){await page.setViewportSize({width,height:900});check('layout fits '+width+'px',await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));}await page.setViewportSize({width:390,height:844});
 const oldHistory=await page.evaluate(()=>activeField().tomcastHistory.start);await page.locator('#fieldEditDetails').click();await page.locator('#fieldName').fill('Renamed field');await page.locator('#cropContinue').click();await page.locator('#openFieldTools').click();check('details edit retains history',await page.evaluate(()=>activeField().tomcastHistory.start)===oldHistory);
 await page.locator('#bottomNav [data-route="scan"]').click();await page.locator('#globalScanInput').setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);await page.locator('#runGlobalScan').click();await page.locator('#globalScanResult').waitFor({state:'visible'});check('quick photo defaults to unlinked',await page.locator('#scanFieldSelect').inputValue()==='unlinked');
 await page.evaluate(()=>{window.savedSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new Error('quota');};});await page.locator('#saveGlobalScan').click();check('storage failure does not claim saved',await page.locator('#scanSavedPanel').isHidden());check('failed photo save is rolled back',await page.evaluate(()=>account().unlinkedScans.length)===0);await page.evaluate(()=>Storage.prototype.setItem=window.savedSetItem);await page.locator('#saveGlobalScan').click();check('retry saves photo once',await page.evaluate(()=>account().unlinkedScans.length)===1);

 // Expiry refresh is shared across routes and persists even after leaving the dashboard.
 await page.evaluate(()=>{
  window.originalWeatherFetch=fetchWeatherSnapshot;window.refreshCalls=0;
  window.refreshFixture=activeField().weather;
  fetchWeatherSnapshot=()=>{window.refreshCalls++;return new Promise(resolve=>window.finishWeatherRefresh=()=>resolve({...window.refreshFixture,fetchedAt:Date.now()}));};
  activeField().weather={...activeField().weather,fetchedAt:Date.now()-7*3600000};
  forecastRefreshes.delete(activeField());showScreen('home');
 });
 await page.locator('#bottomNav [data-route="fields"]').click();
 check('expired saved field refreshes automatically from home',await page.evaluate(()=>window.refreshCalls===1));
 check('pending refresh does not expose stale score',(await page.locator('#fieldList .field-meta-row').innerText()).includes('Unavailable'));
 await page.locator('[data-open-field]').first().click();await page.locator('#bottomNav [data-route="alerts"]').click();
 check('navigation shares one weather request',await page.evaluate(()=>window.refreshCalls===1));
 await page.evaluate(()=>window.finishWeatherRefresh());await page.waitForFunction(()=>Tomcast.fresh(activeField().weather));
 check('refresh survives navigation and updates alerts',(await page.locator('#forecastAlertList').innerText()).includes('Very high'));
 check('automatic refresh is saved',await page.evaluate(()=>Tomcast.fresh(JSON.parse(localStorage.getItem(STORAGE_KEY)).accounts[state.user].fields[0].weather)));
 await page.locator('#bottomNav [data-route="home"]').click();check('fresh cache avoids extra requests',await page.evaluate(()=>window.refreshCalls===1));
 await page.evaluate(()=>fetchWeatherSnapshot=window.originalWeatherFetch);
 const legacy=await context.newPage();await legacy.route('https://api.open-meteo.com/**',route=>route.fulfill({json:fixture()}));await legacy.goto(process.env.BASE_URL);await legacy.clock.install({time:NOW});
 await legacy.evaluate(()=>{localStorage.setItem('fasalsathi.demo.v2',JSON.stringify({lang:'en',accounts:{'9876543210':{id:'OLD',fields:[{id:'old-field',name:'Existing tomatoes',crop:'tomato',lat:23.525,lon:77.808,weather:{tomcastDays:[{date:'2026-09-30',wetHours:24,avgWetTemp:23}]},scanHistory:[{at:1,prototype:true,confidence:87,result:'early_blight_like'}]}]}}}));sessionStorage.setItem('fasalsathi.demo.session','9876543210');});await legacy.reload();await legacy.locator('[data-lang="en"]').click();await legacy.locator('#bottomNav [data-route="fields"]').click();check('legacy field records retained',(await legacy.locator('#fieldList').innerText()).includes('Existing tomatoes'));await legacy.waitForFunction(()=>Tomcast.fresh(account().fields[0].weather));check('legacy weather refreshes without opening field',await legacy.evaluate(()=>Tomcast.fresh(account().fields[0].weather)));await legacy.locator('[data-open-field]').click();await legacy.waitForFunction(()=>!document.getElementById('refreshFieldForecast').disabled);check('legacy weather refresh migrates',(await legacy.locator('#tomcastTotal').innerText())==='Very high');check('legacy demo is labelled, never diagnosed',(await legacy.locator('#scanHistory').textContent()).includes('Earlier demo'));
 await legacy.close();

 await page.locator('#bottomNav [data-route="scan"]').click();await page.locator('#globalScanInput').setInputFiles({name:'leaf.png',mimeType:'image/png',buffer:png});await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);
 scanMode='fail';await page.locator('#runGlobalScan').click();await page.waitForFunction(()=>document.getElementById('globalScanError').textContent.length>0);
 check('failed scan shows retryable error and no fake result',await page.locator('#scanLinkPanel').isHidden()&&await page.locator('#globalScanResult').isHidden()&&await page.locator('#runGlobalScan').isEnabled());
 scanMode='delay';const before=scanRequests;await page.locator('#runGlobalScan').click();check('loading state disables duplicate scans',await page.locator('#scanLoading').isVisible()&&await page.locator('#runGlobalScan').isDisabled());await page.locator('#globalScanResult').waitFor({state:'visible'});check('retry succeeds with one request',scanRequests===before+1);
 for(const summary of await page.locator('#scanResultDetails summary').all())await summary.click();
 check('all optional details and alternatives displayed',/Brown spots/.test(await page.locator('#scanResultDetails').innerText())&&/Avoid wet foliage/.test(await page.locator('#scanResultDetails').innerText())&&/Septoria/.test(await page.locator('#scanResultDetails').innerText()));
 await page.locator('#runGlobalScan').click();await page.locator('#bottomNav [data-route="home"]').click();await new Promise(r=>setTimeout(r,400));check('leaving screen cancels pending scan',await page.evaluate(()=>scanController===null&&state.pendingScan===null));
 // GPS and manual selection must cooperate even with delayed or denied permission.
 await page.evaluate(()=>{
  window.realGeolocation=navigator.geolocation;
  window.gpsRequests=[];
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success,error)=>window.gpsRequests.push({success,error})}});
  window.mapViews=[];map={setView:(point,zoom)=>window.mapViews.push({point,zoom}),invalidateSize:()=>{},removeLayer:()=>{}};
  window.realDrawMarker=drawMarker;drawMarker=()=>{};
  startField();
 });
 check('new field requests location automatically',await page.evaluate(()=>gpsRequests.length===1));
 await page.evaluate(()=>gpsRequests[0].error({code:1}));
 check('denied location keeps retry available',await page.locator('#currentLocationBtn').isEnabled());
 check('denied location cannot save an invented pin',await page.locator('#saveLocationBtn').isDisabled());
 await page.locator('#currentLocationBtn').click();await page.evaluate(()=>gpsRequests[1].success({coords:{latitude:23.52,longitude:77.81}}));
 check('GPS selects position and zooms map',await page.evaluate(()=>state.lat===23.52&&state.lon===77.81&&mapViews.at(-1).zoom===16));
 await page.locator('#currentLocationBtn').click();await page.evaluate(()=>{setFieldLocation(23.6,77.9);gpsRequests[2].success({coords:{latitude:1,longitude:2}});});
 check('delayed GPS cannot overwrite manually selected pin',await page.evaluate(()=>state.lat===23.6&&state.lon===77.9));
 await page.locator('#currentLocationBtn').click();await page.locator('#bottomNav [data-route="home"]').click();await page.evaluate(()=>gpsRequests[3].success({coords:{latitude:1,longitude:2}}));
 check('leaving location page ignores pending GPS',await page.evaluate(()=>state.lat===23.6));
 await page.evaluate(()=>{Object.defineProperty(navigator,'geolocation',{configurable:true,value:window.realGeolocation});drawMarker=window.realDrawMarker;map=null;openFieldDashboard(account().fields[0].id);});
 for(const lang of ['en','hi','mr']){
  await page.locator('#languageSwitch').selectOption(lang);
  check('farmer dashboard hides technical inputs '+lang,await page.locator('#tomcastWetHours').isHidden()&&await page.locator('#tomcastSource').isHidden());
  check('farmer dashboard hides model names and coordinates '+lang,!/TOMCAST|23\.525|77\.808|≥90%/.test(await page.locator('#screen-field').innerText()));
 }
 check('no JavaScript runtime errors',errors.length===0);
 if(process.env.LIVE_WEATHER==='1'){
   const liveContext=await browser.newContext({ignoreHTTPSErrors:true});const livePage=await liveContext.newPage();await livePage.goto(process.env.BASE_URL);livePage.on('console',m=>{if(m.type()==='error')console.log('Live browser:',m.text().slice(0,250));});
   const live=await livePage.evaluate(async()=>{const s=await Tomcast.fetchSnapshot(23.525,77.808);return {forecast:Tomcast.assess({weather:s}),timezone:s.timezone,temp:s.currentTemp};});
   check('live API returns five valid future dates',live.forecast.days.length===5&&live.forecast.available);console.log('LIVE '+JSON.stringify(live));await liveContext.close();
 }
 console.log(`${passed} browser checks passed`);await context.close();
 }finally{await browser.close();if(server)server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
