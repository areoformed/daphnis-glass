import {createGlass} from '../glass.js';
const bar=document.querySelector('#glass'),choice=document.querySelector('#material'),status=document.querySelector('#render-status');
const optical=document.querySelector('#optical'),index=document.querySelector('#refractive-index');
const glass=createGlass(bar,{material:choice.value,optics:optical.checked?{refractiveIndex:index.valueAsNumber}:null,recipes:{refracted:{blur:.35}}});
window.glassDemo=glass; // Local demo diagnostics and lifecycle testing.
choice.addEventListener('change',()=>glass.setMaterial(choice.value));
function updateOptics(){
 index.disabled=!optical.checked;
 if(optical.checked&&!index.reportValidity())return;
 glass.setOptics(optical.checked?{refractiveIndex:index.valueAsNumber}:null);
}
optical.addEventListener('change',updateOptics);index.addEventListener('change',updateOptics);
document.querySelector('#etched').addEventListener('change',event=>{for(const button of bar.querySelectorAll('.tool'))button.classList.toggle('fg-etch',event.target.checked)});
document.querySelector('#etch-width').addEventListener('input',event=>{bar.style.setProperty('--fg-etch-width',event.target.value+'px');document.querySelector('#etch-value').value=event.target.value+' px'});
for(const button of bar.querySelectorAll('.tool'))button.addEventListener('click',()=>{document.querySelector('#action').textContent=button.getAttribute('aria-label')+' selected'});
const observer=new MutationObserver(()=>{const s=glass.state.surfaces[0];choice.value=glass.state.requested;status.textContent=s.renderer==='svg'?s.optics?`Snell optics · refractive index ${glass.state.optics.refractiveIndex} · smooth rounded pane`:`Optical surface · ${s.material} · ${s.engine} map`:`CSS surface · ${s.material}`});
observer.observe(bar,{attributes:true,attributeFilter:['data-fg-material','data-fg-renderer','data-fg-engine']});
addEventListener('pagehide',event=>{if(event.persisted)return;observer.disconnect();glass.destroy()});
