// MIT. Codex and areoform. Geometric optics for smooth, isotropic dielectrics.
// No browser dependency. See OPTICS.md for geometry, units and renderer limits.
export const defaultOptics=Object.freeze({refractiveIndex:1.52,surroundingIndex:1,thickness:6,gap:0});
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function positive(value,name){if(!Number.isFinite(value)||value<=0)throw new RangeError(name+' must be finite and positive');return value;}
function unit(v,name){
 if(!v||v.length!==3||!Array.from(v).every(Number.isFinite))throw new TypeError(name+' must contain three finite coordinates');
 const length=positive(Math.hypot(...v),name+' length');return Array.from(v,x=>x/length);
}
export function normalizeOptics(patch={},base=defaultOptics){
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new TypeError('optics must be an object');
 for(const key of Object.keys(patch))if(!Object.hasOwn(defaultOptics,key))throw new TypeError('Unknown optical parameter: '+key);
 const result={...base,...patch};
 positive(result.refractiveIndex,'refractiveIndex');positive(result.surroundingIndex,'surroundingIndex');
 if(!Number.isFinite(result.thickness)||result.thickness<=0||result.thickness>512)throw new RangeError('thickness must be > 0 and <= 512 CSS pixels');
 if(!Number.isFinite(result.gap)||result.gap<0||result.gap>4096)throw new RangeError('gap must be between 0 and 4096 CSS pixels');
 positive(result.refractiveIndex/result.surroundingIndex,'relative index');positive(result.surroundingIndex/result.refractiveIndex,'inverse relative index');
 return Object.freeze(result);
}

// Incident direction points toward the interface; normal points into its incident medium.
// Both refractive indices are absolute values in the same convention.
export function interfaceRay(incident,normal,n1,n2){
 positive(n1,'incident index');positive(n2,'transmitted index');
 const d=unit(incident,'incident'),N=unit(normal,'normal'),cosine=-dot(d,N);
 if(cosine < -1e-10)throw new RangeError('normal must point into the incident medium');
 const ci=Math.min(1,Math.max(0,cosine)),eta=positive(n1/n2,'relative index');
 const reflected=d.map((v,i)=>v+2*ci*N[i]);
 if(n1===n2)return {transmitted:d,reflected,reflectance:0,Rs:0,Rp:0,tir:false};
 const tangent=d.map((v,i)=>v+ci*N[i]),st=eta*Math.hypot(...tangent);
 if(st>1)return {transmitted:null,reflected,reflectance:1,Rs:1,Rp:1,tir:true};
 const ct=Math.sqrt(Math.max(0,1-st*st));
 const transmitted=unit(tangent.map((v,i)=>eta*v-ct*N[i]),'transmitted');
 const rs=(eta*ci-ct)/(eta*ci+ct),rp=(ci-eta*ct)/(ci+eta*ct);
 const Rs=rs*rs,Rp=rp*rp;
 return {transmitted,reflected,reflectance:(Rs+Rp)/2,Rs,Rp,tir:false};
}

export function validateOpticalMapParameters(p){
 if(!p||![p.w,p.h].every(Number.isInteger)||p.w<1||p.h<1||p.w>4096||p.h>4096||p.w*p.h>300000)throw new RangeError('Invalid optical map dimensions');
 if(!Number.isFinite(p.radius)||p.radius<0||p.radius>Math.min(p.w,p.h)/2)throw new RangeError('Invalid optical map radius');
 normalizeOptics(p.optics);return p;
}

function paneTracer(p){
 const {w,h,radius:r}=p,o=normalizeOptics(p.optics),t=o.thickness,ax=w/2-r,ay=h/2-r;
 const footprint=(x,y)=>Math.abs(x)<=w/2+1e-9&&Math.abs(y)<=h/2+1e-9&&(!r||Math.hypot(Math.max(Math.abs(x)-ax,0),Math.max(Math.abs(y)-ay,0))<=r+1e-9);
 return (x,y)=>{
  if(!footprint(x,y))return {status:'outside',dx:0,dy:0,transmission:0};
  const qx=r?Math.max(Math.abs(x)-ax,0)/r:0,qy=r?Math.max(Math.abs(y)-ay,0)/r:0;
  const z=t*Math.sqrt(Math.max(0,1-qx*qx-qy*qy));
  const normal=r?[Math.sign(x)*qx/r,Math.sign(y)*qy/r,z/(t*t)]:[0,0,1];
  const entry=interfaceRay([0,0,-1],normal,o.surroundingIndex,o.refractiveIndex);
  if(entry.tir)return {status:'tir',dx:0,dy:0,transmission:0};
  const d=entry.transmitted;
  if(d[2]>=-1e-12)return {status:'escaped',dx:0,dy:0,transmission:0};
  const xb=x-d[0]*z/d[2],yb=y-d[1]*z/d[2];
  // The cap is convex: a segment with both endpoints inside cannot leave it.
  // Other exit branches and internal bounces are deliberately not composited.
  if(!footprint(xb,yb))return {status:'escaped',dx:0,dy:0,transmission:0};
  const exit=interfaceRay(d,[0,0,1],o.refractiveIndex,o.surroundingIndex);
  if(exit.tir)return {status:'tir',dx:0,dy:0,transmission:0};
  const e=exit.transmitted;
  if(e[2]>=-1e-12)return {status:'escaped',dx:0,dy:0,transmission:0};
  const dx=xb-e[0]*o.gap/e[2]-x,dy=yb-e[1]*o.gap/e[2]-y;
  if(!Number.isFinite(dx)||!Number.isFinite(dy))throw new RangeError('Optical source coordinate is not finite');
  // Meridional entry/exit planes share their s/p bases. The exterior medium matches.
  const transmission=((1-entry.Rs)*(1-exit.Rs)+(1-entry.Rp)*(1-exit.Rp))/2;
  return {status:'source',dx,dy,transmission};
 };
}
export function tracePane(p,x,y){validateOpticalMapParameters(p);if(!Number.isFinite(x)||!Number.isFinite(y))throw new RangeError('Ray coordinates must be finite');return paneTracer(p)(x,y);}

function mapJob(p){
 validateOpticalMapParameters(p);
 const trace=paneTracer(p),values=new Float32Array(p.w*p.h*3),counts={source:0,tir:0,escaped:0,outside:0};let maximum=0;
 return {
  row(y){for(let x=0;x<p.w;x++){
   const i=(y*p.w+x)*3,s=trace(x+.5-p.w/2,y+.5-p.h/2);counts[s.status]++;
   maximum=Math.max(maximum,Math.abs(s.dx),Math.abs(s.dy));
   // The bounded 8-bit SVG adapter guarantees <= .5 CSS px rounding error per axis.
   // Fail to the CSS finish rather than silently clipping an extreme optical result.
   if(maximum>127.5)throw new RangeError('Optical displacement exceeds the SVG precision budget');
   values[i]=s.dx;values[i+1]=s.dy;values[i+2]=s.transmission;
  }},
  finish(){
   const scale=2*maximum,data=new Uint8ClampedArray(p.w*p.h*4);
   for(let i=0;i<p.w*p.h;i++){
    data[i*4]=Math.round(255*(.5+(scale?values[i*3]/scale:0)));
    data[i*4+1]=Math.round(255*(.5+(scale?values[i*3+1]/scale:0)));
    data[i*4+2]=Math.round(255*values[i*3+2]);data[i*4+3]=255;
   }
   return {data,scale,stats:Object.freeze({model:'rounded-cap-direct',...counts,maxDisplacement:maximum,quantizationError:scale/510})};
  }
 };
}
export function generateOpticalMap(p){const job=mapJob(p);for(let y=0;y<p.h;y++)job.row(y);return job.finish();}
// Cooperative batches keep the CSS fallback usable while a larger map is baked.
export async function generateOpticalMapAsync(p,cancelled=()=>false){
 const job=mapJob(p),rowsPerBatch=Math.max(1,Math.floor(2048/p.w));
 for(let y=0;y<p.h;y++){
  if(cancelled())throw new Error('Optical map generation cancelled');
  job.row(y);if(y%rowsPerBatch===rowsPerBatch-1)await new Promise(resolve=>setTimeout(resolve,0));
 }
 if(cancelled())throw new Error('Optical map generation cancelled');return job.finish();
}
