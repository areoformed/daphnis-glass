// A running demo on 8798 and an isolated Chrome debugging port are required.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const port=Number(process.env.FELT_TEST_CDP_PORT),origin=process.env.FELT_TEST_ORIGIN||'http://127.0.0.1:8798';
assert.ok(port>0);assert.equal(new URL(origin).hostname,'127.0.0.1');
const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0,checks=0,injection;const pending=new Map(),errors=[];ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id){const p=pending.get(v.id);if(p){pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result)}}else if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails.text)};
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function ev(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(fn,label){const end=Date.now()+12000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,35))}throw Error('Timed out: '+label)}
function check(v,label){assert.ok(v,label);checks++;console.log('PASS',label)}
async function navigate(fault=''){if(injection)await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection});({identifier:injection}=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:fault}));await cdp('Page.navigate',{url:origin+'/demo/'});await wait(()=>ev('!!window.glassDemo'),'demo ready');await ev("if(glassDemo.state.optics)document.querySelector('#optical').click()");}
async function choose(value){await ev(`glassDemo.setMaterial('${value}')`)}
async function mode(value,renderer,engine){await wait(()=>ev(`(()=>{const s=glassDemo.state.surfaces[0];return s.material==='${value}'${renderer?`&&s.renderer==='${renderer}'`:''}${engine?`&&s.engine==='${engine}'`:''}})()`),[value,renderer,engine].join(' '))}
async function shot(name){if(!process.env.FELT_TEST_SCREENSHOTS)return;const s=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.env.FELT_TEST_SCREENSHOTS+'/'+name+'.png',Buffer.from(s.data,'base64'))}
async function click(selector){const p=await ev(`(()=>{const r=document.querySelector('${selector}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1})}
try{
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1200,height:1000,deviceScaleFactor:1,mobile:false});await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'none'},{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-contrast',value:'no-preference'}]});
 console.log('Browser:',(await cdp('Browser.getVersion')).product);
 await navigate();await mode('refracted','svg');console.log('Actual map engine:',await ev('glassDemo.state.surfaces[0].engine'));check(true,'Standalone refraction runs');
 check(await ev("getComputedStyle(document.querySelector('#glass')).borderTopColor===getComputedStyle(document.querySelector('.green')).backgroundColor"),'Outline matches confirmation button');
 check(await ev("[...document.querySelectorAll('.tool')].every(e=>getComputedStyle(e,'::before').pointerEvents==='none'&&getComputedStyle(e).boxShadow.includes('inset'))"),'Etching stays local to inset control footprints');
 await click('.round');check(await ev("document.querySelector('#action').textContent==='Done selected'"),'Etched decoration leaves pointer activation intact');await shot('release-etched');
 await click('#etched');check(await ev("!document.querySelector('.round').classList.contains('fg-etch')"),'Etched finish can be removed independently');await click('#etched');
 await ev("document.querySelector('#etched').focus()");for(const value of ['frosted','translucent','solid','refracted']){await choose(value);await mode(value);check(await ev("document.activeElement.id==='etched'"),value+' retains focus and existing content')}
 await choose('frosted');await mode('frosted','svg');await shot('release-burred');
 await ev("(async()=>{const {createGlass}=await import('/glass.js');window.factory=createGlass;window.other=document.createElement('div');other.textContent='Independent surface';other.style.cssText='width:220px;height:80px;position:fixed;top:40px;right:20px;border-radius:24px';other.dataset.fgMaterial='original';document.body.append(other);window.extra=createGlass(other,{material:'solid'})})()");
 check(await ev("extra.state.surfaces[0].material==='solid'&&glassDemo.state.surfaces[0].material==='frosted'"),'Independent controllers retain independent choices');
 check(await ev("(()=>{try{factory(other);return false}catch{return true}})()"),'Duplicate ownership fails before mutation');
 check(await ev("(()=>{const before=extra.state.requested;try{extra.setMaterial('unknown')}catch{}try{extra.setRecipes({frosted:{roughness:NaN}})}catch{}return extra.state.requested===before})()"),'Invalid material/recipe preserves working state');
 await ev("extra.destroy();extra.destroy()");check(await ev("other.dataset.fgMaterial==='original'&&!other.classList.contains('fg-glass')&&document.querySelectorAll('svg[id^=fg-]').length===1"),'Destroy is idempotent and restores prior DOM state');
 await ev("window.extra=factory(other,{material:'frosted'});extra.destroy()");check(await ev("other.dataset.fgMaterial==='original'&&glassDemo.state.surfaces[0].renderer==='svg'"),'Destroy during upgrade cannot damage another controller');
 await navigate("Object.defineProperty(navigator,'gpu',{value:undefined})");for(const value of ['refracted','frosted']){await choose(value);await mode(value,'svg','wasm');check(true,value+' uses WASM without GPU')}
 await navigate("Object.defineProperty(navigator,'gpu',{value:undefined});WebAssembly.instantiate=async()=>{throw Error('Injected WASM rejection')}");for(const value of ['refracted','frosted']){await choose(value);await mode(value,'svg','javascript');check(true,value+' uses JavaScript when WASM fails')}
 await navigate("Object.defineProperty(navigator,'gpu',{value:{requestAdapter:()=>new Promise(()=>{})}})");await mode('refracted','svg','wasm');check(true,'Hung GPU setup times out to WASM');
 await navigate("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>v?.includes('url(')?false:original(p,v)");await mode('frosted','css');check(true,'Unavailable SVG retains CSS frost and live controls');
 await navigate("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>p.includes('backdrop-filter')?false:original(p,v)");await mode('translucent','css');check(true,'No blur retains translucency');
 await navigate("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>p==='background-color'||p.includes('backdrop-filter')?false:original(p,v)");await mode('solid','css');check(true,'No transparency retains solid baseline');
 await navigate();await mode('refracted','svg');await ev("document.querySelector('#etched').focus()");await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});await mode('solid','css');check(await ev("getComputedStyle(document.querySelector('.round'),'::before').display==='none'&&document.activeElement.id==='etched'"),'Forced colors remove decorative rim and preserve focus');
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});await choose('auto');await mode('solid','css');check(true,'Automatic honors reduced transparency');
 await cdp('Emulation.setEmulatedMedia',{features:[]});await choose('frosted');await mode('frosted','svg');await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});await shot('release-mobile');check(await ev("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.bar').getBoundingClientRect().right<=innerWidth"),'Narrow layout and etched controls fit viewport');
 await ev('glassDemo.destroy()');check(await ev("document.querySelectorAll('svg[id^=fg-]').length===0&&!document.querySelector('#glass').hasAttribute('data-fg-renderer')"),'Final destroy removes owned filters/attributes');
 check(errors.length===0,'No uncaught runtime errors across lifecycle and fallback cases');
 for(const path of ['/../package.json','/.dev.vars','/LICENSE','/tests/browser.mjs'])check((await fetch(origin+path)).status===404,'Demo server refuses '+path);
 console.log(`${checks} standalone browser checks passed.`);
}finally{try{await cdp('Page.close')}catch{}ws.close()}
