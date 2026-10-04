// Opt-in live scan smoke test: uses one API identification. Supply a public/test crop image.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {chromium}=require(require.resolve('playwright',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
(async()=>{
 if(!process.env.SCAN_TEST_IMAGE)throw new Error('Set SCAN_TEST_IMAGE to a test crop photo (one paid API identification).');
 const proxy=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox'],...(proxy?{proxy:{server:proxy.origin}}:{})});
 try{
  const page=await browser.newPage({ignoreHTTPSErrors:process.env.TEST_IGNORE_HTTPS_ERRORS==='1',viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.DEPLOYMENT_URL||'https://newcoder355.github.io/fasal-sathi-/',{timeout:45000});
  for(const file of ['index.html','crop-scan.js']){const actual=await page.evaluate(async f=>(await fetch(f,{cache:'no-store'})).text(),file);assert.equal(actual,fs.readFileSync(path.join(__dirname,'..',file),'utf8'),'Deployment mismatch: '+file);}
  await page.locator('[data-lang="en"]').click();await page.locator('#homeQuickScan').click();await page.locator('#globalScanInput').setInputFiles(process.env.SCAN_TEST_IMAGE);await page.waitForFunction(()=>!document.getElementById('runGlobalScan').disabled);
  await page.locator('#runGlobalScan').click();await page.waitForFunction(()=>!!state.pendingScan||!!document.getElementById('globalScanError').textContent,{},{timeout:75000});
  assert.equal(await page.locator('#globalScanError').innerText(),'');
  const result=await page.evaluate(()=>({crop:state.pendingScan.assessment.crops[0]?.name,disease:state.pendingScan.result,confidence:state.pendingScan.confidence,provider:state.pendingScan.provider}));
  assert.equal(result.provider,'crop.health');assert.ok(result.crop&&result.disease&&result.confidence>=0&&result.confidence<=100);
  for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/fasal-real-scan.png',fullPage:true});assert.deepEqual(errors,[]);
  console.log('PASS: deployed photo upload, real Edge Function call, parsed result and responsive layout. No cloud report submitted.');console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
