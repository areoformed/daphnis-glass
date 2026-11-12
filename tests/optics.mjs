import test from 'node:test';
import assert from 'node:assert/strict';
import {interfaceRay,normalizeOptics,defaultOptics,tracePane,generateOpticalMap,generateOpticalMapAsync} from '../optics.js';
import {interfaceRay as reference} from '../experiments/sessile-drop/model.mjs';
const near=(a,b,tolerance=1e-10)=>assert.ok(Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const pane={w:101,h:61,radius:24,optics:{refractiveIndex:1.52}};
test('Snell law, Fresnel and ray reciprocity agree with independent reference over index/angle sweeps',()=>{
 for(const n1 of [.8,1,1.333,1.52,2.42])for(const n2 of [.8,1,1.333,1.52,2.42])for(const angle of [0,5,20,40,60,80,89]){
  const theta=angle*Math.PI/180,d=[Math.sin(theta),0,-Math.cos(theta)],r=interfaceRay(d,[0,0,1],n1,n2),other=reference(d,[0,0,1],n1,n2);
  assert.equal(r.tir,other.tir);near(r.reflectance,other.reflectance);near(Math.hypot(...r.reflected),1);
  if(r.tir){assert.equal(r.transmitted,null);assert.equal(r.reflectance,1);continue;}
  near(n1*Math.sin(theta),n2*Math.hypot(r.transmitted[0],r.transmitted[1]));near(Math.hypot(...r.transmitted),1);
  r.transmitted.forEach((x,i)=>near(x,other.transmitted[i]));
  const back=interfaceRay(r.transmitted.map(x=>-x),[0,0,-1],n2,n1);assert.ok(back.transmitted);back.transmitted.forEach((x,i)=>near(x,-d[i]));
 }
});
test('Normal incidence, Brewster angle, grazing identity and critical-angle reflection have known limits',()=>{
 for(const n of [1,1.333,1.52,2.42])near(interfaceRay([0,0,-1],[0,0,1],1,n).reflectance,((n-1)/(n+1))**2);
 const theta=Math.atan(1.52);near(interfaceRay([Math.sin(theta),0,-Math.cos(theta)],[0,0,1],1,1.52).Rp,0);
 assert.deepEqual(interfaceRay([1,0,0],[0,0,1],1,1).transmitted,[1,0,0]);
 assert.ok(interfaceRay([Math.sin(Math.PI/3),0,-.5],[0,0,1],1.52,1).tir);
});
test('Invalid media, vectors and optical configurations fail explicitly',()=>{
 for(const n of [0,-1,NaN,Infinity])assert.throws(()=>interfaceRay([0,0,-1],[0,0,1],1,n));
 for(const v of [[0,0,0],[0,NaN,1],[0,1],null])assert.throws(()=>interfaceRay(v,[0,0,1],1,1.5));
 assert.throws(()=>interfaceRay([0,0,1],[0,0,1],1,1.5),/incident medium/);
 for(const patch of [{refractiveIndex:0},{surroundingIndex:Infinity},{thickness:0},{thickness:513},{gap:-1},{gap:4097},{bend:1},[],null])assert.throws(()=>normalizeOptics(patch));
 const custom=normalizeOptics({refractiveIndex:1.77});assert.equal(custom.thickness,6);assert.ok(Object.isFrozen(custom));assert.equal(defaultOptics.refractiveIndex,1.52);
});
test('A matched material is the identity; a parallel flat pane at normal incidence has no displacement',()=>{
 for(const options of [{refractiveIndex:1},{refractiveIndex:1.52,surroundingIndex:1.52}]){
  const p={...pane,optics:options},m=generateOpticalMap(p);assert.equal(m.scale,0);assert.equal(m.stats.quantizationError,0);assert.equal(m.stats.tir,0);
  for(const [x,y] of [[0,0],[40,0],[-40,10]]){const r=tracePane(p,x,y);near(r.dx,0);near(r.dy,0);near(r.transmission,1);}
 }
 const m=generateOpticalMap({...pane,radius:0,optics:{refractiveIndex:1.52,thickness:50,gap:20}});assert.equal(m.scale,0);
 near(m.data[2]/255,(1-((1.52-1)/(1.52+1))**2)**2,1/510);
});
test('Rounded-pane rays are symmetric and respond to material and source distance',()=>{
 const right=tracePane(pane,45,5),left=tracePane(pane,-45,-5);assert.equal(right.status,'source');near(right.dx,-left.dx);near(right.dy,-left.dy);near(right.transmission,left.transmission);
 const water=tracePane({...pane,optics:{refractiveIndex:1.333}},45,5);assert.ok(Math.abs(water.dx)<Math.abs(right.dx));
 const distant=tracePane({...pane,optics:{refractiveIndex:1.52,gap:10}},45,5);assert.ok(Math.abs(distant.dx)>Math.abs(right.dx));
 assert.equal(tracePane(pane,100,100).status,'outside');
 assert.ok(generateOpticalMap({...pane,optics:{refractiveIndex:2.42}}).stats.tir>0);
});
test('Encoded source coordinates stay within the reported rounding budget and transmission tolerance',()=>{
 const m=generateOpticalMap(pane);assert.equal(m.data.length,pane.w*pane.h*4);
 assert.equal(Object.values(m.stats).filter(Number.isInteger).slice(0,4).reduce((a,b)=>a+b,0),pane.w*pane.h);
 for(let y=0;y<pane.h;y+=3)for(let x=0;x<pane.w;x+=3){
  const r=tracePane(pane,x+.5-pane.w/2,y+.5-pane.h/2),i=(y*pane.w+x)*4;
  if(r.status==='source'){near(m.scale*(m.data[i]/255-.5),r.dx,m.stats.quantizationError+1e-6);near(m.scale*(m.data[i+1]/255-.5),r.dy,m.stats.quantizationError+1e-6);near(m.data[i+2]/255,r.transmission,1/510+1e-7);}
  else assert.equal(m.data[i+2],0);
  assert.equal(m.data[i+3],255);
 }
});
test('Map allocation and SVG precision limits reject oversized results instead of clamping physics',()=>{
 for(const patch of [{w:0},{h:4097},{w:1000,h:1000},{radius:100},{radius:-1},{radius:NaN}])assert.throws(()=>generateOpticalMap({...pane,...patch}),RangeError);
 assert.throws(()=>generateOpticalMap({...pane,optics:{refractiveIndex:1.52,gap:4096}}),/precision budget/);
});
test('Cooperative baking agrees with synchronous baking and supports cancellation',async()=>{
 const sync=generateOpticalMap(pane),asyncMap=await generateOpticalMapAsync(pane);assert.deepEqual(asyncMap,sync);
 let cancel=false;const task=generateOpticalMapAsync(pane,()=>cancel);cancel=true;await assert.rejects(task,/cancelled/);
});
