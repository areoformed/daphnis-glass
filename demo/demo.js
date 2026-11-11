import {createGlass} from '../glass.js';
const bar=document.querySelector('#glass'),choice=document.querySelector('#material'),status=document.querySelector('#render-status');
const glass=createGlass(bar,{material:choice.value,recipes:{refracted:{blur:.35}}});
window.glassDemo=glass; // Local demo diagnostics and lifecycle testing.
choice.addEventListener('change',()=>glass.setMaterial(choice.value));
document.querySelector('#etched').addEventListener('change',event=>{for(const button of bar.querySelectorAll('.tool'))button.classList.toggle('fg-etch',event.target.checked)});
document.querySelector('#etch-width').addEventListener('input',event=>{bar.style.setProperty('--fg-etch-width',event.target.value+'px');document.querySelector('#etch-value').value=event.target.value+' px'});
for(const button of bar.querySelectorAll('.tool'))button.addEventListener('click',()=>{document.querySelector('#action').textContent=button.getAttribute('aria-label')+' selected'});
const observer=new MutationObserver(()=>{const s=glass.state.surfaces[0];choice.value=glass.state.requested;status.textContent=s.renderer==='svg'?`Optical surface · ${s.material} · ${s.engine} map`:`CSS surface · ${s.material}`});
observer.observe(bar,{attributes:true,attributeFilter:['data-fg-material','data-fg-renderer','data-fg-engine']});
addEventListener('pagehide',event=>{if(event.persisted)return;observer.disconnect();glass.destroy()});
