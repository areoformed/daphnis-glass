// Run against the loopback demo with a disposable Chrome debugging port.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const port=Number(process.env.FELT_TEST_CDP_PORT),origin=process.env.FELT_TEST_ORIGIN||'http://127.0.0.1:8798';
assert.ok(port>0);assert.equal(new URL(origin).hostname,'127.0.0.1');
const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json(),ws=new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
let seq=0,checks=0,injection;const pending=new Map(),errors=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);};
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function ev(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;}
async function wait(expression){const end=Date.now()+15000;while(Date.now()<end){if(await ev(expression))return;await new Promise(r=>setTimeout(r,40));}throw Error('Timed out: '+expression);}
function check(value,label){assert.ok(value,label);console.log('PASS',++checks,label);}
async function navigate(fault=''){
 if(injection)await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection});
 ({identifier:injection}=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:fault}));
 await cdp('Page.navigate',{url:origin+'/demo/'});await wait('!!window.glassDemo');
}
const ready="glassDemo.state.surfaces[0].renderer==='svg'&&!!glassDemo.state.surfaces[0].optics";
try{
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Emulation.setDeviceMetricsOverride',{width:1200,height:1000,deviceScaleFactor:1,mobile:false});
 await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'none'},{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-contrast',value:'no-preference'}]});
 await navigate();await wait(ready);
 check(await ev("glassDemo.state.optics.refractiveIndex===1.52&&document.querySelector('#render-status').textContent.includes('Snell')"),'Index-only definition reaches the real SVG backdrop through the demo control');
 await ev("window.originalMap=document.querySelector('filter[id$=optical] feImage').getAttribute('href');const i=document.querySelector('#refractive-index');i.value='1.333';i.dispatchEvent(new Event('change'))");await wait(ready);
 check(await ev("glassDemo.state.optics.refractiveIndex===1.333&&document.querySelector('filter[id$=optical] feImage').getAttribute('href')!==originalMap"),'Custom refractive index changes the generated map');
 await ev('glassDemo.setOptics({refractiveIndex:1})');await wait(ready);
 check(await ev("document.querySelector('filter[id$=optical] feDisplacementMap').getAttribute('scale')==='0'&&glassDemo.state.surfaces[0].optics.maxDisplacement===0"),'Matched indices display exactly zero displacement');
 await ev('glassDemo.setOptics({refractiveIndex:1.52})');await wait(ready);
 await ev("window.encodes=0;window.originalEncode=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=function(...args){encodes++;return originalEncode.apply(this,args)};glassDemo.refresh();glassDemo.refresh();document.dispatchEvent(new Event('visibilitychange'));document.querySelector('.scene').scrollTop=150");
 await wait(ready);await new Promise(r=>setTimeout(r,100));check(await ev('encodes===0'),'Scroll, refresh and visibility recovery reuse the retained map');
 await ev("glassDemo.setRecipes({refracted:{blur:.8}});glassDemo.setMaterial('frosted')");await wait(ready);
 check(await ev("encodes===0&&glassDemo.state.surfaces[0].material==='frosted'"),'Finish changes share the optical map');
 await ev("glassDemo.setMaterial('refracted');document.querySelector('#glass').style.width='400px'");await wait(ready+'&&encodes>0');
 check(true,'Changing pane dimensions bakes a new map');
 await ev("window.before=JSON.stringify(glassDemo.state.optics);window.rejected=0;for(const p of [{refractiveIndex:0},{thickness:NaN},{gap:-1},{unrecognized:1}])try{glassDemo.setOptics(p)}catch{rejected++}");
 check(await ev('rejected===4&&JSON.stringify(glassDemo.state.optics)===before'),'Invalid optical updates preserve the working configuration');
 await ev("glassDemo.setOptics({refractiveIndex:1.1});glassDemo.setOptics({refractiveIndex:1.8});glassDemo.setOptics({refractiveIndex:1.333})");await wait(ready);
 check(await ev("(async()=>{const {generateOpticalMap}=await import('/optics.js');const r=document.querySelector('#glass').getBoundingClientRect(),expected=generateOpticalMap({w:Math.ceil(r.width),h:Math.ceil(r.height),radius:Math.min(40,r.width/2,r.height/2),optics:glassDemo.state.optics});return Math.abs(glassDemo.state.surfaces[0].optics.maxDisplacement-expected.stats.maxDisplacement)<1e-10})()"),'Stale generation cannot overwrite the latest material');
 await ev('glassDemo.setOptics({gap:4096})');await wait("glassDemo.state.surfaces[0].renderer==='css'&&!!glassDemo.state.surfaces[0].opticsError");
 check(await ev("glassDemo.state.surfaces[0].opticsError.includes('precision budget')"),'Extreme displacement retains a usable CSS surface and reports the precision limit');
 await ev('glassDemo.setOptics({gap:0})');await wait(ready);check(true,'A corrected optical definition recovers after fallback');
 await ev("(async()=>{const {createGlass}=await import('/glass.js');window.many=[];for(let j=0;j<6;j++){const e=document.createElement('div');e.style.cssText='width:'+(100+j*5)+'px;height:40px;border-radius:12px';document.body.append(e);many.push(e)}window.group=createGlass(many,{optics:{refractiveIndex:1.52}})})()");
 await wait('group.state.surfaces.every(s=>s.optics)');await ev('window.retainedCount=encodes;group.refresh()');await wait('group.state.surfaces.every(s=>s.optics)');
 check(await ev('encodes===retainedCount'),'Live surfaces retain maps beyond the shared four-image cache');await ev('group.destroy();many.forEach(e=>e.remove())');
 await ev("(async()=>{const {createGlass}=await import('/glass.js');window.mixed=[];for(const radius of [0,24]){const e=document.createElement('div');e.style.cssText='width:150px;height:60px;border-radius:'+radius+'px';document.body.append(e);mixed.push(e)}window.isolated=createGlass(mixed,{optics:{refractiveIndex:1.52,gap:4096}})})()");
 await wait("!!isolated.state.surfaces[0].optics&&!!isolated.state.surfaces[1].opticsError");
 check(await ev("isolated.state.surfaces[0].renderer==='svg'&&isolated.state.surfaces[1].renderer==='css'"),'A precision failure affects only its own pane');await ev('isolated.destroy();mixed.forEach(e=>e.remove())');
 await ev("document.querySelector('.round').focus()");await cdp('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});await wait("glassDemo.state.surfaces[0].material==='solid'");
 check(await ev("document.activeElement.classList.contains('round')&&glassDemo.state.surfaces[0].optics===null"),'Forced colors preserve focused controls and report the actual solid renderer');
 await cdp('Emulation.setEmulatedMedia',{features:[]});await wait(ready);
 if(process.env.FELT_TEST_SCREENSHOTS){const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.env.FELT_TEST_SCREENSHOTS+'/snell-desktop.png',Buffer.from(shot.data,'base64'));}
 await cdp('Emulation.setDeviceMetricsOverride',{width:320,height:844,deviceScaleFactor:2,mobile:true});await ev("document.querySelector('#glass').style.removeProperty('width')");await wait(ready);
 check(await ev('document.documentElement.scrollWidth<=innerWidth'),'Optical controls and pane fit a 320px viewport');
 if(process.env.FELT_TEST_SCREENSHOTS){const shot=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.env.FELT_TEST_SCREENSHOTS+'/snell-mobile.png',Buffer.from(shot.data,'base64'));}
 await ev('glassDemo.destroy()');check(await ev("!document.querySelector('#glass').hasAttribute('data-fg-engine')&&document.querySelectorAll('svg[id^=fg-]').length===0"),'Destroy restores DOM and releases the owned filters');
 await navigate("Object.defineProperty(navigator,'gpu',{value:undefined});WebAssembly.instantiate=async()=>{throw Error('Injected rejection')}");await ev('glassDemo.setOptics({refractiveIndex:1.77})');await wait(ready);
 check(await ev("glassDemo.state.surfaces[0].engine==='javascript'"),'Snell generation works when both older compute engines are unavailable');
 await navigate("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>v?.includes('url(')?false:original(p,v)");await ev('glassDemo.setOptics({refractiveIndex:1.52})');
 check(await ev("glassDemo.state.surfaces[0].renderer==='css'&&glassDemo.state.surfaces[0].optics===null"),'Unavailable SVG retains CSS and does not claim a physical map');
 await ev('glassDemo.destroy()');check(errors.length===0,'No uncaught exceptions across optical lifecycle and fallback checks');
 console.log(`${checks} optical browser checks passed.`);
}finally{try{await cdp('Page.close');}catch{}ws.close();}
