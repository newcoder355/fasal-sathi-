/* Browser/Node adapter for the deployed Crop.health proxy. No provider secret belongs here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CropScan=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const probability=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1?v:null;
 function text(value,depth=0){
  if(depth>5||value==null)return '';
  if(typeof value==='string')return value.trim().slice(0,12000);
  if(typeof value==='number')return Number.isFinite(value)?String(value):'';
  if(Array.isArray(value))return value.slice(0,30).map(v=>text(v,depth+1)).filter(Boolean).join('\n');
  if(typeof value==='object')return Object.entries(value).slice(0,30).map(([k,v])=>{const s=text(v,depth+1);return s?k+': '+s:'';}).filter(Boolean).join('\n');
  return '';
 }
 function suggestions(value){
  const list=Array.isArray(value)?value:Array.isArray(value?.suggestions)?value.suggestions:[];
  return list.filter(v=>v&&typeof v.name==='string'&&v.name.trim()).map(v=>({name:v.name.slice(0,200),probability:probability(v.probability),scientificName:text(v.scientific_name),symptoms:text(v.details?.symptoms??v.symptoms),severity:text(v.details?.severity??v.severity),treatment:text(v.details?.treatment??v.treatment)})).sort((a,b)=>(b.probability??-1)-(a.probability??-1)).slice(0,5);
 }
 function parse(data){
  if(!data||typeof data!=='object'||data.success===false||data.error)throw new Error('scanServiceError');
  const result=data.result||data.raw?.result||data.data?.result||{};
  if(result.is_plant?.binary===false)throw new Error('scanNotPlant');
  const crops=suggestions(data.crop??result.crop),diseases=suggestions(data.diseases??result.disease);
  if(!crops.length&&!diseases.length)throw new Error('scanNoMatch');
  const top=diseases[0]||null;
  return {crops,diseases,healthy:!!top&&/^healthy(?:\s+plant)?$/i.test(top.name.trim())};
 }
 async function identify(image,{url,key,signal,fetcher=globalThis.fetch,timeoutMs=60000}={}){
  const base64=String(image||'').replace(/^data:image\/[a-z0-9.+-]+;base64,/i,'');
  if(!base64||!/^[A-Za-z0-9+/]+={0,2}$/.test(base64))throw new Error('invalidImage');
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort();if(signal?.aborted)cancel();signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  try{
   const response=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json',...(key?{apikey:key}:{} )},body:JSON.stringify({image:base64}),signal:controller.signal});
   if(!response.ok)throw new Error(response.status===401||response.status===403?'scanAuthError':response.status===429?'scanLimitError':'scanServiceError');
   let data;try{data=await response.json();}catch{throw new Error('scanInvalidResponse');}
   return parse(data);
  }catch(error){if(timedOut)throw new Error('scanTimeout');if(controller.signal.aborted)throw new Error('scanCancelled');if(error instanceof TypeError)throw new Error('scanNetworkError');throw error;}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
 }
 return {parse,identify};
});
