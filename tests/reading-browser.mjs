// Start the local demo (8798) or point FELT_TEST_ORIGIN at a built static site.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
const port=Number(process.env.FELT_TEST_CDP_PORT),origin=process.env.FELT_TEST_ORIGIN||'http://127.0.0.1:8798';
assert.ok(port>0);assert.equal(new URL(origin).hostname,'127.0.0.1');
const tab=await(await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'})).json();
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0,checks=0,injection;const pending=new Map(),errors=[];
ws.onmessage=e=>{const v=JSON.parse(e.data);if(v.id){const p=pending.get(v.id);pending.delete(v.id);v.error?p.reject(Error(JSON.stringify(v.error))):p.resolve(v.result)}else if(v.method==='Runtime.exceptionThrown')errors.push(v.params.exceptionDetails.text)};
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
async function ev(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value}
async function wait(expression){const end=Date.now()+12000;while(Date.now()<end){if(await ev(expression))return;await new Promise(r=>setTimeout(r,35))}throw Error('Timed out: '+expression+' '+JSON.stringify(await ev("({dataset:{...document.querySelector('.reading-bar')?.dataset},finish:document.querySelector('#finish-status')?.textContent})")))}
function check(v,label){assert.ok(v,label);checks++;console.log('PASS',label)}
async function nav(fault=''){
 if(injection)await cdp('Page.removeScriptToEvaluateOnNewDocument',{identifier:injection});
 ({identifier:injection}=await cdp('Page.addScriptToEvaluateOnNewDocument',{source:fault}));
 await cdp('Page.navigate',{url:origin+'/examples/as-we-may-think/'});
 await wait("document.querySelector('#larger') && !document.querySelector('#larger').disabled");
}
async function click(selector){const p=await ev(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await cdp('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await cdp('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',buttons:0,clickCount:1})}
async function shot(name){if(!process.env.FELT_TEST_SCREENSHOTS)return;const r=await cdp('Page.captureScreenshot',{format:'png'});await writeFile(process.env.FELT_TEST_SCREENSHOTS+'/'+name+'.png',Buffer.from(r.data,'base64'))}
async function choose(material){await ev(`document.querySelector('#surface').value='${material}';document.querySelector('#surface').dispatchEvent(new Event('input'))`)}
async function media(features=[{name:'forced-colors',value:'none'},{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-contrast',value:'no-preference'}]){await cdp('Emulation.setEmulatedMedia',{features})}
const visiblePane="(()=>{const e=document.querySelector('.reading-bar'),s=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>280&&r.height>=60&&parseFloat(s.borderTopWidth)>=1&&(s.backgroundColor!=='rgba(0, 0, 0, 0)'||s.backgroundImage!=='none')})()";
try{
 await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
 await cdp('Emulation.setDeviceMetricsOverride',{width:1280,height:960,deviceScaleFactor:1,mobile:false});
 await media([{name:'forced-colors',value:'none'},{name:'prefers-reduced-transparency',value:'no-preference'},{name:'prefers-contrast',value:'no-preference'}]);
 console.log('Browser:',(await cdp('Browser.getVersion')).product);
 await nav();await wait("document.querySelector('.reading-bar').dataset.fgRenderer==='svg'");
 check(await ev("document.querySelectorAll('[id^=passage-]').length===73&&document.querySelectorAll('[id^=section-]').length===8"),'Complete essay structure survives the new bar');
 check(await ev("document.querySelector('.reading-bar').getBoundingClientRect().width>=640"),'A continuous full-width reading bar');
 check(await ev("!document.querySelector('#glass-settings').open"),'Fine adjustments are discreet by default');
 check(await ev("!document.querySelector('#surface').closest('#glass-settings')&&document.querySelector('#surface').getBoundingClientRect().height>=40"),'Named finish selector is directly available on the bar');
 await shot('bar-desktop');
 await click('.settings-toggle');check(await ev("document.querySelector('#glass-settings').open"),'Pointer opens native glass settings');
 await choose('frosted');await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='frosted'&&document.querySelector('.reading-bar').dataset.fgRenderer==='svg'");
 check(await ev("document.querySelector('#roughness').value==='1'&&document.querySelector('#finish-name').textContent==='Burred glass'"),'Named burred finish applies its declared recipe');
 await ev("document.querySelector('#tint').value='.8';document.querySelector('#tint').dispatchEvent(new Event('input'))");
 await wait("document.querySelector('.reading-bar').style.getPropertyValue('--pane-tint')==='0.8'");check(true,'A custom tint combines with the chosen material');
 await choose('translucent');await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='translucent'");
 check(await ev("!document.querySelector('#smaller').classList.contains('fg-etch')"),'Translucent finish declares its simpler control treatment');
 await choose('refracted');await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='refracted'");
 check(await ev("document.querySelector('#tint').value==='0.55'&&document.querySelector('#smaller').classList.contains('fg-etch')"),'Liquid glass selects a complete declared combination');
 check(await ev("document.querySelector('.settings-panel').getBoundingClientRect().bottom<innerHeight"),'Settings remain within the available viewport');
 await shot('bar-settings');
 await ev("document.querySelector('#blur').value='8';document.querySelector('#blur').dispatchEvent(new Event('input'))");
 await wait("document.querySelector('output[for=blur]').textContent==='8'");
 await ev("document.querySelector('#blur').value='0';document.querySelector('#blur').dispatchEvent(new Event('input'))");
 await wait("document.querySelector('output[for=blur]').textContent==='0'");
 await click('#reset-glass');check(await ev("document.querySelector('#surface').value==='refracted'&&document.querySelector('#blur').value==='0.75'"),'Reset restores the selected finish without changing the finish choice');
 await cdp('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await cdp('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 check(await ev("!document.querySelector('#glass-settings').open&&document.activeElement.matches('summary')"),'Escape closes settings and returns focus');
 await click('#larger');check(await ev("getComputedStyle(document.querySelector('.essay')).fontSize==='21px'"),'Reading control works by pointer');
 await ev("for(let i=0;i<12;i++)document.querySelector('#larger').click()");check(await ev("document.querySelector('#larger').disabled&&getComputedStyle(document.querySelector('.essay')).fontSize==='26px'"),'Text size upper bound');
 await ev("for(let i=0;i<12;i++)document.querySelector('#smaller').click()");check(await ev("document.querySelector('#smaller').disabled&&getComputedStyle(document.querySelector('.essay')).fontSize==='17px'"),'Text size lower bound');
 await ev("document.querySelector('a[href=\"#section-6\"]').click()");
 await wait("parseInt(document.querySelector('#progress').textContent)>0");
 check(await ev("document.querySelector('#section-6').getBoundingClientRect().top>document.querySelector('.reading-bar').getBoundingClientRect().bottom"),'Section anchor stays below the sticky bar');
 await shot('bar-over-text');
 for(const width of [390,360,320]){
  await cdp('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
  await ev("document.querySelector('#glass-settings').open=true");
  check(await ev("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.settings-panel').getBoundingClientRect().right<=innerWidth"),width+' px bar and settings fit the viewport');
 }
 await shot('bar-mobile-settings');await ev("document.querySelector('#glass-settings').open=false");
 await choose('auto');await media([{name:'prefers-reduced-transparency',value:'reduce'}]);await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='solid'");check(await ev(visiblePane),'Reduced transparency retains a solid continuous bar');
 await media([{name:'forced-colors',value:'active'}]);check(await ev("getComputedStyle(document.querySelector('.reading-bar'),'::after').display==='none'"),'Forced colors remove the tinted decorative layer');await media();
 await cdp('Network.setBlockedURLs',{urls:['*/glass.css']});await nav();
 await wait("document.querySelector('#finish-status').textContent.includes('basic finish')");
 check(await ev(visiblePane),'Missing shared stylesheet retains its own visible pane');
 check(await ev("!document.querySelector('.reading-bar').hasAttribute('data-glass-ready')"),'Unstyled optical enhancement is never activated');
 await shot('bar-missing-css');
 await cdp('Network.setBlockedURLs',{urls:['*/glass.css','*/glass.js']});await nav();
 await click('#larger');check(await ev("getComputedStyle(document.querySelector('.essay')).fontSize==='20px'"),'Missing enhancement CSS and JS leave reading controls usable');
 await choose('solid');await wait("document.querySelector('.reading-bar').dataset.fallbackMaterial==='solid'");check(await ev(visiblePane),'Basic material selection works without enhancement files');
 check(await ev("document.querySelector('#bend').disabled&&!document.querySelector('#tint').disabled"),'Unavailable optics are disabled while supported controls remain live');
 await cdp('Network.setBlockedURLs',{urls:[]});
 await nav("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>v?.includes('url(')?false:original(p,v)");
 await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='frosted'");check(await ev(visiblePane),'No SVG backdrop support keeps a visible CSS frosted bar');
 await nav("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>p.includes('backdrop-filter')?false:original(p,v)");
 await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='translucent'");check(await ev(visiblePane),'No backdrop blur keeps a visible translucent bar');
 await nav("const original=CSS.supports.bind(CSS);CSS.supports=(p,v)=>p==='background-color'||p.includes('backdrop-filter')?false:original(p,v)");
 await wait("document.querySelector('.reading-bar').dataset.fgMaterial==='solid'");check(await ev(visiblePane),'No transparency support keeps an opaque bar');
 await cdp('Network.setBlockedURLs',{urls:['*/glass.css']});await cdp('Emulation.setScriptExecutionDisabled',{value:true});
 await cdp('Page.navigate',{url:origin+'/examples/as-we-may-think/'});await wait("document.querySelectorAll('[id^=passage-]').length===73");
 check(await ev(visiblePane),'No JS and no shared stylesheet still produces a solid bar');
 check(errors.length===0,'No uncaught reader errors across fallback cases');
 console.log(`${checks} reading-bar browser checks passed.`);
}finally{await cdp('Emulation.setScriptExecutionDisabled',{value:false});try{await cdp('Page.close')}catch{}ws.close()}
