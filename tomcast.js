/* TOMCAST / FAST daily DSV table: https://ipm.ucanr.edu/DISEASE/DATABASE/dsvtable.html
 * This implementation estimates wetness from RH >= 90%; it is not a leaf-wetness sensor.
 * See MODEL.md for the temperature convention, calendar-day convention and limitations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.Tomcast=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const VERSION=2, MAX_AGE=6*60*60*1000;
  const numeric=(v,min=-Infinity,max=Infinity)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  const datePattern=/^\d{4}-\d{2}-\d{2}$/;
  function shiftDate(date,days){return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
  function localDate(now,timezone){try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));const get=key=>parts.find(p=>p.type===key).value;return get('year')+'-'+get('month')+'-'+get('day');}catch{return null;}}
  function dailyDsv(temp,wetHours){
    if(!numeric(wetHours,0,24))return null;
    if(wetHours===0)return 0;
    if(!numeric(temp,-80,65))return null;
    // Whole-degree table: round the wet-period mean to nearest Celsius degree.
    const band=Math.round(temp);
    if(band<13||band>29)return null; // outside this published table, not evidence of safety
    const limits=band<=17?[6,15,20,24]:band<=20||band>=26?[3,8,15,22,24]:[2,5,12,20,24];
    return limits.findIndex(limit=>wetHours<=limit);
  }
  function summarizeDay(date,rows){
    const hours=new Set(rows.map(r=>r.time.slice(11,16)));
    const complete=rows.length===24&&hours.size===24&&rows.every(r=>/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(r.time)&&numeric(r.temp,-80,65)&&numeric(r.rh,0,100));
    if(!complete)return {date,wetHours:null,avgWetTemp:null,dsv:null,quality:'missing',validHours:rows.filter(r=>numeric(r.temp,-80,65)&&numeric(r.rh,0,100)).length};
    const wet=rows.filter(r=>r.rh>=90),avg=wet.length?wet.reduce((s,r)=>s+r.temp,0)/wet.length:null;
    const dsv=dailyDsv(avg,wet.length);
    return {date,wetHours:wet.length,avgWetTemp:avg,dsv,quality:dsv===null?'outside':'complete',validHours:24};
  }
  function buildSnapshot(data,now=Date.now()){
    if(!data||data.error||!data.timezone)throw new Error('weather-data');
    const today=localDate(now,data.timezone);if(!today)throw new Error('weather-timezone');
    const h=data.hourly||{},times=h.time,temps=h.temperature_2m,rh=h.relative_humidity_2m,rain=h.precipitation;
    if(!Array.isArray(times)||!times.length||!Array.isArray(temps)||!Array.isArray(rh)||!Array.isArray(rain)||[temps,rh,rain].some(a=>a.length!==times.length))throw new Error('weather-data');
    if(data.hourly_units?.temperature_2m!=='°C'||data.hourly_units?.relative_humidity_2m!=='%'||data.hourly_units?.precipitation!=='mm')throw new Error('weather-units');
    const currentTime=data.current?.time;
    if(typeof currentTime!=='string'||currentTime.slice(0,10)!==today)throw new Error('weather-date');
    const groups={};for(let i=0;i<times.length;i++){
      if(typeof times[i]!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(times[i]))throw new Error('weather-time');
      const date=times[i].slice(0,10);(groups[date]||=[]).push({time:times[i],temp:temps[i],rh:rh[i]});
    }
    const getDay=date=>summarizeDay(date,groups[date]||[]);
    const historyDays=Array.from({length:14},(_,i)=>getDay(shiftDate(today,i-14)));
    const todayDay=getDay(today),forecastDays=Array.from({length:5},(_,i)=>getDay(shiftDate(today,i+1)));
    const start=times.findIndex(time=>time>=currentTime),indices=start<0?[]:Array.from({length:24},(_,i)=>start+i).filter(i=>i<times.length);
    const complete24=indices.length===24&&indices.every(i=>numeric(temps[i],-80,65)&&numeric(rh[i],0,100));
    const wet=complete24?indices.filter(i=>rh[i]>=90):[];
    return {version:VERSION,source:'Open-Meteo',fetchedAt:now,timezone:data.timezone,currentDate:today,historyDays,todayDay,forecastDays,
      currentTemp:numeric(data.current?.temperature_2m,-80,65)?data.current.temperature_2m:null,
      currentHumidity:numeric(data.current?.relative_humidity_2m,0,100)?data.current.relative_humidity_2m:null,
      rain24h:indices.length===24&&indices.every(i=>numeric(rain[i],0))?indices.reduce((s,i)=>s+rain[i],0):null,
      estimatedWetHours:complete24?wet.length:null,avgWetTemp:wet.length?wet.reduce((s,i)=>s+temps[i],0)/wet.length:null,wetnessMethod:'rh90_proxy'};
  }
  function fresh(weather,now=Date.now()){
    return !!(weather?.version===VERSION&&numeric(weather.fetchedAt)&&now-weather.fetchedAt>=-300000&&now-weather.fetchedAt<=MAX_AGE&&localDate(now,weather.timezone)===weather.currentDate);
  }
  function safeDay(day){
    if(!day||!datePattern.test(day.date||''))return null;
    const dsv=day.quality==='complete'?dailyDsv(day.avgWetTemp,day.wetHours):null;
    return {...day,dsv,quality:dsv===null?(day.quality==='outside'?'outside':'missing'):'complete'};
  }
  function assess(field,now=Date.now()){
    const w=field?.weather,isFresh=fresh(w,now),expected=w?.currentDate&&datePattern.test(w.currentDate)?Array.from({length:5},(_,i)=>shiftDate(w.currentDate,i+1)):[];
    const days=expected.map(date=>safeDay(w?.forecastDays?.find(d=>d.date===date))||{date,dsv:null,quality:'missing',wetHours:null,avgWetTemp:null});
    const complete=isFresh&&days.length===5&&days.every(d=>d.dsv!==null),total=complete?days.reduce((s,d)=>s+d.dsv,0):null;
    const peak=complete?Math.max(...days.map(d=>d.dsv)):null,risk=complete?['low','mild','moderate','high','veryHigh'][peak]:'unknown';
    return {days,total,peak,risk,available:complete,stale:!!w&&!isFresh,today:isFresh?safeDay(w.todayDay):null,sourceKey:'weatherProxySource'};
  }
  function mergeHistory(previous,weather,sameLocation=true){
    const ledger={};
    if(sameLocation&&previous?.version===VERSION)for(const d of previous.days||[]){const day=safeDay(d);if(day&&day.date<weather.currentDate)ledger[day.date]=day;}
    for(const d of weather.historyDays||[]){const day=safeDay(d);if(day&&day.date<weather.currentDate){if(day.dsv!==null||!ledger[day.date])ledger[day.date]=day;}}
    const dates=Object.keys(ledger).sort(),start=dates[0]||null;
    return {version:VERSION,start,days:dates.map(date=>ledger[date])};
  }
  function historySummary(history,today){
    if(history?.version!==VERSION||!datePattern.test(history.start||'')||!datePattern.test(today||''))return {total:null,knownTotal:0,missing:0,count:0,start:null};
    const byDate=new Map((history.days||[]).map(d=>[d.date,safeDay(d)]));let knownTotal=0,missing=0,count=0;
    const length=Math.round((Date.parse(today)-Date.parse(history.start))/86400000);
    if(length<1||length>3660)return {total:null,knownTotal:0,missing:0,count:0,start:history.start};
    for(let i=0;i<length;i++){const d=byDate.get(shiftDate(history.start,i));if(d?.dsv!==null&&d?.dsv!==undefined){knownTotal+=d.dsv;count++;}else missing++;}
    return {total:missing?null:knownTotal,knownTotal,missing,count,start:history.start};
  }
  function weatherUrl(lat,lon){
    if(!numeric(lat,-90,90)||!numeric(lon,-180,180))throw new Error('coordinates');
    return 'https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({latitude:lat,longitude:lon,current:'temperature_2m,relative_humidity_2m,precipitation',hourly:'temperature_2m,relative_humidity_2m,precipitation',past_days:14,forecast_days:6,timezone:'auto',temperature_unit:'celsius',precipitation_unit:'mm'});
  }
  async function fetchSnapshot(lat,lon,{fetcher=globalThis.fetch,now=()=>Date.now(),timeoutMs=30000}={}){
    const url=weatherUrl(lat,lon),controller=new AbortController();
    let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('weather-timeout'));},timeoutMs);});
    try{return await Promise.race([(async()=>{const response=await fetcher(url,{signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('weather-http-'+response.status);return buildSnapshot(await response.json(),now());})(),timeout]);}finally{clearTimeout(timer);}
  }
  return {VERSION,MAX_AGE,dailyDsv,buildSnapshot,fresh,assess,mergeHistory,historySummary,weatherUrl,fetchSnapshot,shiftDate,localDate};
});
