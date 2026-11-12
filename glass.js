// MIT License. Developed by Codex in collaboration with areoform.
import {createMapFactory} from './maps.js';
import {normalizeOptics} from './optics.js';
export {defaultOptics,interfaceRay} from './optics.js';

export const materials=Object.freeze(['auto','refracted','frosted','translucent','solid']);
export const defaultRecipes=Object.freeze({
 refracted:Object.freeze({bend:.9,roughness:0,rim:18,blur:1,displacement:24,saturation:1,fallbackBlur:18,grainSize:160,seed:1945}),
 frosted:Object.freeze({bend:0,roughness:1,rim:18,blur:1.5,displacement:6,saturation:.65,fallbackBlur:18,grainSize:160,seed:1945})
});
const limits={bend:[0,1],roughness:[0,1],rim:[.5,64],blur:[0,32],displacement:[0,64],saturation:[0,2],fallbackBlur:[0,40],grainSize:[32,512],seed:[0,4294967295]};
const owners=new WeakMap();let serial=0;
function material(value){if(!materials.includes(value))throw new TypeError('Unknown glass material: '+value);return value;}
function recipesWith(base,patch={}){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('recipes must be an object');
 const result={};for(const name of Object.keys(base))result[name]={...base[name]};
 for(const [name,recipe] of Object.entries(patch)){
  if(!Object.hasOwn(result,name)||!recipe||typeof recipe!=='object'||Array.isArray(recipe))throw new TypeError('Invalid glass recipe: '+name);
  for(const [key,value] of Object.entries(recipe)){
   const range=limits[key];if(!range||!Number.isFinite(value)||value<range[0]||value>range[1]||(key==='seed'&&!Number.isInteger(value)))throw new RangeError('Invalid recipe parameter: '+key);
   result[name][key]=value;
  }
 }return result;
}

/** Decorate existing light-DOM elements. Foreground content is never replaced. */
export function createGlass(targets,options={}){
 if(typeof document==='undefined')throw new Error('createGlass needs a browser document');
 const elements=typeof targets==='string'?[...document.querySelectorAll(targets)]:targets?.nodeType===1?[targets]:Array.from(targets||[]);
 if(!elements.length||new Set(elements).size!==elements.length)throw new TypeError('Provide one or more distinct elements');
 for(const element of elements)if(element?.nodeType!==1||element.ownerDocument!==document||element.getRootNode()!==document||owners.has(element))throw new TypeError('Targets must be unowned elements in the current document');
 let choice=material(options.material??'auto'),recipes=recipesWith(defaultRecipes,options.recipes),optics=options.optics==null?null:normalizeOptics(options.optics),generation=0,destroyed=false,observer;
 const doc=document,win=doc.defaultView,media=q=>win.matchMedia?.(q)||{matches:false};
 const transparency=media('(prefers-reduced-transparency: reduce)'),contrast=media('(prefers-contrast: more)'),forced=media('(forced-colors: active)');
 const supports=(p,v)=>Boolean(win.CSS?.supports?.(p,v));
 const alpha=supports('background-color','rgba(255,255,255,0.9)'),blur=supports('backdrop-filter','blur(5px)')||supports('-webkit-backdrop-filter','blur(5px)');
 const chromium=Boolean(win.navigator.userAgentData?.brands?.some(b=>/Chromium|Google Chrome|Microsoft Edge/.test(b.brand)))||/Chrome\//.test(win.navigator.userAgent);
 const svgCapable=chromium&&supports('backdrop-filter','url("#fg-probe")')&&typeof win.SVGFEImageElement==='function'&&typeof win.SVGFEDisplacementMapElement==='function';
 const mapFactory=createMapFactory(),failed=new Set(),pending=new WeakMap(),sizes=new WeakMap(),filters=new Map(),failures=new WeakMap(),rejected=new WeakMap(),listeners=[];
 const attrs=['data-fg-material','data-fg-preference','data-fg-renderer','data-fg-engine'],properties=['--fg-filter','--fg-blur','--fg-grain-size'];
 const saved=elements.map(element=>({element,hadClass:element.classList.contains('fg-glass'),attrs:attrs.map(k=>[k,element.getAttribute(k)]),properties:properties.map(k=>[k,element.style.getPropertyValue(k),element.style.getPropertyPriority(k)])}));
 let prefix;do{prefix='fg-'+(++serial);}while(doc.getElementById(prefix));
 const ns='http://www.w3.org/2000/svg';
 function node(tag,attributes={}){const n=doc.createElementNS(ns,tag);for(const [k,v] of Object.entries(attributes))n.setAttribute(k,String(v));return n;}
 const svg=node('svg',{id:prefix,width:0,height:0,'aria-hidden':'true',focusable:'false'}),defs=node('defs');svg.append(defs);svg.style.position='absolute';svg.style.pointerEvents='none';
 elements.forEach((element,index)=>{
  owners.set(element,prefix);element.classList.add('fg-glass');const own={};filters.set(element,own);
  for(const name of ['refracted','frosted','optical']){
   const id=`${prefix}-${index}-${name}`,filter=node('filter',{id,x:0,y:0,width:'100%',height:'100%','color-interpolation-filters':'sRGB'}),image=node('feImage',{result:'map',preserveAspectRatio:'none'});
   filter.append(image);
   if(name==='optical')filter.append(node('feDisplacementMap',{in:'SourceGraphic',in2:'map',scale:0,xChannelSelector:'R',yChannelSelector:'G',result:'warped'}),node('feColorMatrix',{in:'map',type:'matrix',values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 1 0 0',result:'transmission'}),node('feComposite',{in:'warped',in2:'transmission',operator:'in','color-interpolation-filters':'linearRGB',result:'transmitted'}),node('feGaussianBlur',{in:'transmitted',stdDeviation:1,result:'softened'}),node('feColorMatrix',{in:'softened',type:'saturate',values:1}));
   else if(name==='frosted'){image.setAttribute('width','128');image.setAttribute('height','128');filter.append(node('feTile',{in:'map',result:'roughness'}),node('feGaussianBlur',{in:'SourceGraphic',stdDeviation:1.5,result:'diffuse'}),node('feDisplacementMap',{in:'diffuse',in2:'roughness',scale:6,xChannelSelector:'R',yChannelSelector:'G'}),node('feColorMatrix',{type:'saturate',values:.65}));}
   else filter.append(node('feDisplacementMap',{in:'SourceGraphic',in2:'map',scale:24,xChannelSelector:'R',yChannelSelector:'G'}),node('feGaussianBlur',{stdDeviation:1}));
   defs.append(filter);own[name]={id,filter,image};
  }
 });(doc.body||doc.documentElement).append(svg);
 function fallback(){
  if(forced.matches||(choice==='auto'&&(transparency.matches||contrast.matches))||choice==='solid'||!alpha)return 'solid';
  if(choice==='translucent'||!blur)return 'translucent';
  if(choice==='frosted')return 'frosted';
  return svgCapable&&typeof win.ResizeObserver==='function'&&!failed.has('refracted')?'refracted':'frosted';
 }
 function baseline(element,mode){
  element.dataset.fgMaterial=mode;element.dataset.fgRenderer='css';delete element.dataset.fgEngine;
  element.style.removeProperty('--fg-filter');for(const {image} of Object.values(filters.get(element)))image.removeAttribute('href');sizes.delete(element);pending.delete(element);
 }
 function parameters(element,name,recipe){
  const box=element.getBoundingClientRect(),tile=!optics&&name==='frosted',w=tile?128:Math.ceil(box.width),h=tile?128:Math.ceil(box.height);
  if(box.width<1||box.height<1||w<1||h<1||w>4096||h>4096||w*h>300000)return null;
  const measured=parseFloat(win.getComputedStyle(element).borderRadius),radius=tile?0:Math.min(Number.isFinite(measured)?measured:24,w/2,h/2);
  if(optics)return {w,h,radius,optics};
  return {w,h,kind:tile?0:1,seed:recipe.seed,radius,rim:Math.max(.5,Math.min(recipe.rim,radius||recipe.rim)),strength:recipe.bend,roughness:recipe.roughness};
 }
 async function build(element,name,token){
  const recipe=recipes[name],p=parameters(element,name,recipe);if(!p){baseline(element,'frosted');return;}
  const own=filters.get(element)[p.optics?'optical':name],size=JSON.stringify(p);if(sizes.get(element)===size)return;
  if(p.optics&&rejected.get(element)===size){baseline(element,'frosted');return;}
  const apply=result=>{
   if(!own.filter.isConnected||!own.image.isConnected)throw Error('Optical filter unavailable');
   own.filter.querySelector('feGaussianBlur').setAttribute('stdDeviation',recipe.blur);own.filter.querySelector('feDisplacementMap').setAttribute('scale',result.scale??recipe.displacement);own.filter.querySelector('feColorMatrix[type="saturate"]')?.setAttribute('values',recipe.saturation);
   own.image.setAttribute('href',result.source);own.image.setAttribute('width',p.w);own.image.setAttribute('height',p.h);
   element.style.setProperty('--fg-filter',`url("#${own.id}")`);element.dataset.fgMaterial=name;element.dataset.fgRenderer='svg';element.dataset.fgEngine=result.engine;
   if(!win.getComputedStyle(element).backdropFilter?.includes(own.id))throw Error('SVG backdrop rejected');
   failures.delete(element);rejected.delete(element);own.key=size;own.result=result;
  };
  baseline(element,'frosted');sizes.set(element,size);const request={};pending.set(element,request);
  try{
   if(own.key===size&&own.result){apply(own.result);return;}
   const result=await mapFactory.image(p);if(destroyed||token!==generation||pending.get(element)!==request||doc.hidden)return;
   apply(result);
  }catch(error){if(!destroyed&&token===generation&&pending.get(element)===request){failures.set(element,String(error.message||error));if(p.optics){rejected.set(element,size);baseline(element,'frosted');}else{failed.add(name);refresh();}}}
 }
 function refresh(){
  if(destroyed)return;const token=++generation;observer?.disconnect();observer=null;const mode=fallback(),recipe=recipes[mode];
  for(const element of elements){element.dataset.fgPreference=choice;element.style.setProperty('--fg-blur',(recipe?.fallbackBlur??18)+'px');element.style.setProperty('--fg-grain-size',(recipe?.grainSize??recipes.frosted.grainSize)+'px');baseline(element,mode==='refracted'?'frosted':mode);}
  if(!recipe||!svgCapable||failed.has(mode)||(mode==='frosted'&&typeof win.SVGFETileElement!=='function'))return;
  if(mode==='frosted'&&!optics){for(const element of elements)void build(element,mode,token);return;}
  if(typeof win.ResizeObserver!=='function')return;
  try{observer=new win.ResizeObserver(entries=>{for(const {target} of entries)void build(target,mode,token);});elements.forEach(element=>{observer.observe(element);void build(element,mode,token);});}
  catch{failed.add(mode);refresh();}
 }
 function listen(target,event,fn){if(target.addEventListener){target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));}else if(target.addListener){target.addListener(fn);listeners.push(()=>target.removeListener(fn));}}
 for(const setting of [transparency,contrast,forced])listen(setting,'change',refresh);
 listen(doc,'visibilitychange',()=>{if(!doc.hidden)refresh();});
 const controller={
  setMaterial(value){if(destroyed)throw Error('Glass controller was destroyed');choice=material(value);refresh();},
  setRecipes(patch){if(destroyed)throw Error('Glass controller was destroyed');recipes=recipesWith(recipes,patch);refresh();},
  setOptics(patch){if(destroyed)throw Error('Glass controller was destroyed');const next=patch==null?null:normalizeOptics(patch,optics||undefined);optics=next;failed.clear();for(const element of elements)rejected.delete(element);refresh();},
  refresh,
  get state(){return {requested:choice,destroyed,optics,surfaces:elements.map(element=>({element,material:element.dataset.fgMaterial,renderer:element.dataset.fgRenderer,engine:element.dataset.fgEngine??null,optics:!destroyed&&optics&&element.dataset.fgRenderer==='svg'?filters.get(element)?.optical.result?.stats??null:null,opticsError:failures.get(element)??null}))};},
  destroy(){if(destroyed)return;destroyed=true;++generation;observer?.disconnect();for(const off of listeners)off();mapFactory.destroy();svg.remove();for(const item of saved){const {element}=item;for(const [k,v] of item.attrs){if(v===null)element.removeAttribute(k);else element.setAttribute(k,v);}for(const [k,v,priority] of item.properties){if(v)element.style.setProperty(k,v,priority);else element.style.removeProperty(k);}if(!item.hadClass)element.classList.remove('fg-glass');owners.delete(element);}filters.clear();}
 };refresh();return controller;
}
