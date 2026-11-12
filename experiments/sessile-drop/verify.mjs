import assert from 'node:assert/strict';
import {drop,trace,interfaceRay,waterIndex,paraxialJacobian,rainbow,rainbowStationary,radians,degrees} from './model.mjs';
let checks=0;const near=(a,b,tol,label)=>{assert.ok(Math.abs(a-b)<=tol,`${label}: ${a} != ${b}`);checks++;};
const yes=(x,label)=>{assert.ok(x,label);checks++;};
const hemi=drop({volume:2*Math.PI/3,angle:90});near(hemi.R,1,1e-12,'known hemisphere radius');near(hemi.h,1,1e-12,'known hemisphere height');near(hemi.a,1,1e-12,'known hemisphere contact radius');
for(const angle of [15,45,89,90,91,110,150,165]){
 const g=drop({volume:.5,angle});
 near(Math.PI*g.h*g.h*(3*g.R-g.h)/3,.5,1e-10,'cap reconstructs independent volume formula');
 near(g.a*g.a+g.zc*g.zc,g.R*g.R,1e-10,'contact lies on sphere');near(g.h/g.a,Math.tan(radians(angle)/2),1e-10,'contact-angle geometry');
 yes(angle<=90||g.silhouette>g.a,'hydrophobic silhouette retains overhang');
}
near(waterIndex(589,293.15,0),1,0,'zero-density IAPWS limit');
// Independent rounded values from NIST/IAPWS-based room-temperature data.
near(waterIndex(600),1.3330,5e-5,'water 600nm reference');near(waterIndex(450),1.3396,5e-5,'water 450nm reference');
// IAPWS Table3: at 0°C, 0.1MPa, density approximately 999.8428 kg/m³.
near(waterIndex(589,273.15,999.8428),1.334344,1e-6,'IAPWS Table3 visible-wavelength check');
yes(waterIndex(450)>waterIndex(650),'normal visible dispersion');
const normal=interfaceRay([0,0,-1],[0,0,1],1,4/3);near(normal.reflectance,1/49,1e-12,'normal Fresnel analytic result');
const inc=radians(35),ray=interfaceRay([Math.sin(inc),0,-Math.cos(inc)],[0,0,1],1,4/3);
near(Math.hypot(...ray.transmitted),1,1e-12,'unit refracted ray');near((4/3)*ray.transmitted[0],Math.sin(inc),1e-12,'Snell tangential conservation');
const tir=interfaceRay([Math.sin(radians(60)),0,-.5],[0,0,1],4/3,1);yes(tir.tir&&!tir.transmitted,'critical-angle TIR');near(Math.hypot(...tir.reflected),1,1e-12,'unit TIR reflection');
for(const angle of [30,90,110,150,165])for(const volume of [.1,.5,2]){
 const g=drop({volume,angle}),r=g.R*1e-5,opts={gap:.2,thickness:.2,nWater:waterIndex(),nSolid:1.52};
 const pos=trace(g,r,opts),neg=trace(g,-r,opts);yes(pos.status==='source','central ray reaches source');
 near(pos.sourceRadius/r,paraxialJacobian(g,opts),1e-7,'ray tracing vs independently derived paraxial limit');
 near(pos.sourceRadius,-neg.sourceRadius,1e-10,'meridional symmetry');
 for(const fraction of [0,.1,.5,.9,.99]){
  const sample=trace(g,g.silhouette*fraction,opts);yes(sample.path.every(q=>q.p.every(Number.isFinite)),'finite event geometry');yes(sample.throughput>=0&&sample.throughput<=1,'bounded power');
  const identity=trace(g,g.silhouette*fraction,{...opts,nWater:1,nSolid:1});yes(identity.status==='source','equal-index source path');near(identity.sourceRadius,g.silhouette*fraction,1e-8,'equal indices remove all displacement');
 }
}
const g=drop({volume:.5,angle:110}),center=trace(g,0,{gap:.2,thickness:.2,nWater:4/3,nSolid:1.5});
const power=(1-((1-4/3)/(1+4/3))**2)*(1-((4/3-1.5)/(4/3+1.5))**2)*(1-((1.5-1)/(1.5+1))**2);
near(center.throughput,power,1e-12,'central three-interface Fresnel power');
for(const n of [1.3317,4/3,1.3396]){
 const i=rainbowStationary(n),q=rainbow(i,n);
 near(degrees(Math.atan2(-q.direction[1],-q.direction[0])),q.phi,1e-9,'traced rainbow agrees with user angle formula');near(q.deviation+q.phi,180,1e-12,'rainbow angle convention');yes(!q.internalTir,'primary stationary rainbow is partial reflection');
 const delta=.01;yes(q.phi>=rainbow(i-delta,n).phi&&q.phi>=rainbow(i+delta,n).phi,'stationary rainbow extremum');yes(q.energy>0&&q.energy<.2,'bounded rainbow branch power');
}
near(rainbow(rainbowStationary(4/3),4/3).phi,42.029,1e-3,'classical 42-degree rainbow reference');
for(const bad of [-1,NaN,180])assert.throws(()=>drop({angle:bad}),RangeError);checks+=3;
console.log(`${checks} optical reference checks passed.`);
