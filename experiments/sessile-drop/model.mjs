// Daphnis Glass optics study. Lengths in mm, angles in degrees at public boundaries.
// Fresh reference implementation: no DOM, canvas, WASM or production renderer dependency.
export const radians=d=>d*Math.PI/180, degrees=r=>r*180/Math.PI;
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const add=(a,b,k=1)=>a.map((x,i)=>x+k*b[i]);
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
export const reflect=(d,n)=>add(d,n,-2*dot(d,n));
function bound(value,lo,hi,name){if(!Number.isFinite(value)||value<lo||value>hi)throw RangeError(`${name} must be between ${lo} and ${hi}`);return value;}

// IAPWS R9-97, Eq.1/Table1. Absolute index relative to vacuum, not a color fit.
// Default density is a nominal 20°C liquid density, not an equation of state.
export function waterIndex(wavelengthNm=550,temperatureK=293.15,density=998.207){
  bound(wavelengthNm,200,1100,'wavelength');bound(temperatureK,261.15,773.15,'temperature');bound(density,0,1060,'density');
  const l=wavelengthNm/589,l2=l*l,T=temperatureK/273.15,r=density/1000;
  const B=r*(.244257733+.00974634476*r-.00373234996*T+.000268678472*l2*T+.00158920570/l2+.00245934259/(l2-.2292020**2)+.900704920/(l2-5.4329374**2)-.0166626219*r*r);
  return Math.sqrt((1+2*B)/(1-B));
}
export function drop({volume=1,angle=110}={}){
  bound(volume,.001,1000,'volume');bound(angle,5,175,'contact angle');
  const theta=radians(angle),c=Math.cos(theta),R=Math.cbrt(3*volume/(Math.PI*(2-3*c+c*c*c)));
  const h=R*(1-c),a=R*Math.sin(theta),zc=-R*c;
  const capillaryLength=Math.sqrt(.0728/(998.207*9.80665))*1000;
  return {volume,angle,R,h,a,zc,silhouette:angle>90?R:a,capillaryLength,bondA:(a/capillaryLength)**2,bondR:(R/capillaryLength)**2,bondH:(h/capillaryLength)**2};
}
// Normal points into the incident medium. Null transmitted direction means TIR.
export function interfaceRay(incident,normal,n1,n2){
  const d=norm(incident),N=norm(normal),ci=Math.max(0,Math.min(1,-dot(d,N))),eta=n1/n2;
  const k=1-eta*eta*(1-ci*ci),reflected=reflect(d,N);
  if(k<0)return {transmitted:null,reflected,reflectance:1,Rs:1,Rp:1,tir:true};
  const ct=Math.sqrt(Math.max(0,k)),transmitted=norm(add(d.map(x=>eta*x),N,eta*ci-ct));
  // Unpolarized Fresnel power reflectance. n^2 radiance factors cancel for air→air paths.
  const rs=(n1*ci-n2*ct)/(n1*ci+n2*ct),rp=(n2*ci-n1*ct)/(n2*ci+n1*ct);
  const Rs=ci<1e-13&&ct<1e-13?0:rs*rs,Rp=ci<1e-13&&ct<1e-13?0:rp*rp;
  return {transmitted,reflected,reflectance:(Rs+Rp)/2,Rs,Rp,tir:false};
}
function roots(p,d,g){
  const q=[p[0],p[1],p[2]-g.zc],b=dot(q,d),disc=b*b-dot(q,q)+g.R*g.R;
  return disc<0?[]:[-b-Math.sqrt(Math.max(0,disc)),-b+Math.sqrt(Math.max(0,disc))];
}
// Full sphere clipped at the support plane; never a truncated single-valued height field.
// Dominant transmitted branch + TIR. Partial reflected branches are not composited.
export function trace(g,r,{nWater=waterIndex(),nSolid=1.52,thickness=.3,gap=.35,maxEvents=12}={}){
  bound(nWater,1,2,'water index');bound(nSolid,1,2,'substrate index');bound(thickness,0,4,'substrate thickness');bound(gap,0,10,'source gap');
  const eps=1e-8*g.R,sourceZ=-thickness-gap,indices={air:1,water:nWater,solid:nSolid};
  let p=[r,0,g.h+g.R],d=[0,0,-1],medium='air',throughput=1,Ts=1,Tp=1;const path=[{p:[...p],medium}],events=[];
  for(let iteration=0;iteration<maxEvents;iteration++){
    const candidates=[];
    const plane=(z,kind,normal,to)=>{if(Math.abs(d[2])<1e-12)return;const t=(z-p[2])/d[2];if(t>eps)candidates.push({t,kind,normal,to});};
    if(medium==='air'||medium==='water'){
      for(const t of roots(p,d,g))if(t>eps){const q=add(p,d,t);if(q[2]>eps){const out=norm([q[0],q[1],q[2]-g.zc]);candidates.push({t,kind:'curved',normal:medium==='water'?out.map(x=>-x):out,to:medium==='water'?'air':'water'});}}
    }
    if(medium==='water')plane(0,'contact',[0,0,1],thickness>0?'solid':'air');
    if(medium==='solid'){
      if(d[2]<0)plane(-thickness,'substrate back',[0,0,1],'air');
      else{
        const t=-p[2]/d[2],q=add(p,d,t);
        plane(0,'substrate front',[0,0,-1],Math.hypot(q[0],q[1])<=g.a?'water':'air');
      }
    }
    if(medium==='air'&&p[2]>=0&&d[2]<0&&thickness>0)plane(0,'dry substrate',[0,0,1],'solid');
    if(medium==='air'&&p[2]<-thickness&&d[2]>0&&thickness>0)plane(-thickness,'substrate back',[0,0,-1],'solid');
    if(d[2]<0&&p[2]>=sourceZ-eps){const t=(sourceZ-p[2])/d[2];if(t>=0)candidates.push({t,kind:'source'});}
    candidates.sort((a,b)=>a.t-b.t);const hit=candidates[0];
    if(!hit)return {status:'escaped',path,events,throughput};
    p=add(p,d,hit.t);path.push({p:[...p],medium});
    if(hit.kind==='source')return {status:'source',sourceRadius:p[0],throughput,path,events};
    const optics=interfaceRay(d,hit.normal,indices[medium],indices[hit.to]);
    events.push({at:[...p],kind:hit.kind,from:medium,to:hit.to,...optics});
    if(optics.tir)d=optics.reflected;
    else{d=optics.transmitted;Ts*=1-optics.Rs;Tp*=1-optics.Rp;throughput=(Ts+Tp)/2;medium=hit.to;}
    // Distances to the next event are filtered by eps; keep the exact surface point.
  }
  return {status:'event limit',path,events,throughput};
}
export function paraxialJacobian(g,{nWater=waterIndex(),nSolid=1.52,thickness=.3,gap=.35}={}){
  return 1-(nWater-1)/g.R*(g.h/nWater+thickness/nSolid+gap);
}
// User's rainbow diagram: one PARTIAL internal reflection in a free sphere.
// This is a distinct ray family from the drop-on-substrate transmission experiment.
export function rainbow(incidenceDeg=59.4,n=waterIndex()){
  bound(incidenceDeg,0,89.99,'incidence');bound(n,1.000001,1.99999,'index');
  const i=radians(incidenceDeg),r=Math.asin(Math.sin(i)/n);
  const entry=[-Math.cos(i),Math.sin(i),0],g={R:1,zc:0};let d=[1,0,0];
  const a=interfaceRay(d,entry,1,n);d=a.transmitted;
  const next=(p,d)=>{const t=roots(p,d,g).filter(t=>t>1e-8).sort((a,b)=>a-b)[0];return add(p,d,t);};
  const back=next(entry,d),b=interfaceRay(d,back.map(x=>-x),n,1);d=b.reflected;
  const exit=next(back,d),c=interfaceRay(d,exit.map(x=>-x),n,1);
  return {i:incidenceDeg,r:degrees(r),phi:degrees(4*r-2*i),deviation:degrees(Math.PI+2*i-4*r),entry,back,exit,direction:c.transmitted,internalReflectance:b.reflectance,energy:((1-a.Rs)*b.Rs*(1-c.Rs)+(1-a.Rp)*b.Rp*(1-c.Rp))/2,internalTir:b.tir};
}
export const rainbowStationary=n=>degrees(Math.asin(Math.sqrt((4-n*n)/3)));
