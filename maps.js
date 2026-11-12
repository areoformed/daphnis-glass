// MIT License. Developed by Codex in collaboration with areoform.
// Internal optical-map machinery; DOM backdrop composition belongs to glass.js.
import {validateOpticalMapParameters,generateOpticalMapAsync} from './optics.js';
export const WASM_BASE64='AGFzbQEAAAABDQFgCH9/f399fX19AX8DAgEABQQBARgYBxECBm1lbW9yeQIABGZpbGwAAArgBQHdBQUCfwZ9AX8FfQF/QQAhCAJAQYAgIAFrQYAgIABrckH/H0sNACABIABsIglB4KcSSw0AAkAgCUUNACAEIAGzQwAAAD+UIgqTIQsgBCAAs0MAAAA/lCIMkyENQQAhAUGAgISAACEIA0BDAAAAACEOQwAAAAAhDwJAIAJFDQAgDSABIAEgAG4iECAAbGuzQwAAAD+SIAyTIhGLkiIOIAsgELNDAAAAP5IgCpMiEouSIg8gDiAPXiIQGyITQwAAAAAgE0MAAAAAXRsgDkMAAAAAIA5DAAAAAF4bIg4gDpQgD0MAAAAAIA9DAAAAAF4bIg8gD5SSIhORIhSSIASTIRUCQAJAIBNDAAAAAF5FDQAgDyAUlSIPjCAPIBJDAAAAAF0bIQ8gDiAUlSIOjCAOIBFDAAAAAF0bIRMMAQsCQCAQRQ0AQwAAAAAhD0MAAIC/QwAAgD8gEUMAAAAAXRshEwwBC0MAAAAAIRNDAACAv0MAAIA/IBJDAAAAAF0bIQ8LIAZDAAAAAEMAAIA/IBUgBZVDAACAP5IiDiAOQwAAgD9eGyIOIA5DAAAAAF0bIg5DAAAAQCAOk5SUIhQgD5QhDiAUIBOUIQ8LIAhDAAAAAEMAAH9DIAMgAWoiEEH+KWoiFkEQdiAWc0Gt6qz/B2wiFkEPdiAWc0GLzbKjeGwiFkEQdiAWc0H/AXFBgH9qskMAAP5ClSAHlCAOkkMAAP5ClEMAAABDkiIOIA5DAAB/Q14bQwAAAD+SIg4gDkMAAAAAXRv8AUEIdEMAAAAAQwAAf0MgEEEQdiAQc0Gt6qz/B2wiEEEPdiAQc0GLzbKjeGwiEEEQdiAQc0H/AXFBgH9qskMAAP5ClSAHlCAPkkMAAP5ClEMAAABDkiIOIA5DAAB/Q14bQwAAAD+SIg4gDkMAAAAAXRv8AXJBgICAfHI2AgAgCEEEaiEIIAkgAUEBaiIBRw0ACwtBgICEgAAhCAsgCAs='; // scripts/glass-map.c; no imports; bounded 1.5 MiB memory.
 const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
 function bounded(task,ms,onTimeout=()=>{}){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{onTimeout();reject(Error('Optional effect timed out'));},ms);Promise.resolve(task).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
 function hash(x){x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);return(x^(x>>>16))>>>0;}
export function validateMapParameters(p){
 if(p?.optics)return validateOpticalMapParameters(p);
 if(!p||![p.w,p.h,p.kind,p.seed].every(Number.isInteger)||p.w<1||p.h<1||p.w>4096||p.h>4096||p.w*p.h>300000||![0,1].includes(p.kind)||p.seed<0||p.seed>4294967295)throw new RangeError('Invalid optical map dimensions');
 for(const [key,lo,hi] of [['radius',0,2048],['rim',.5,64],['strength',0,1],['roughness',0,1]])if(!Number.isFinite(p[key])||p[key]<lo||p[key]>hi)throw new RangeError('Invalid optical map parameter: '+key);
 return p;
}
export function generateJavaScriptMap(p){
 validateMapParameters(p);
  const {w,h,kind,seed,radius,rim,strength,roughness}=p,data=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<w*h;i++){
   let nx=0,ny=0;
   if(kind){
    const px=i%w+.5-w/2,py=Math.floor(i/w)+.5-h/2,qx=Math.abs(px)-(w/2-radius),qy=Math.abs(py)-(h/2-radius),ox=Math.max(qx,0),oy=Math.max(qy,0),length=Math.hypot(ox,oy),distance=length+Math.min(Math.max(qx,qy),0)-radius;
    if(length>0){nx=ox/length*Math.sign(px);ny=oy/length*Math.sign(py);}else if(qx>qy)nx=Math.sign(px);else ny=Math.sign(py);
    const edge=clamp(1+distance/rim,0,1),bend=edge*(2-edge)*strength;nx*=bend;ny*=bend;
   }
   nx+=((hash(i+seed)&255)-128)/127*roughness;ny+=((hash(i+seed+5374)&255)-128)/127*roughness;
   data[i*4]=Math.round(clamp(128+nx*127,0,255));data[i*4+1]=Math.round(clamp(128+ny*127,0,255));data[i*4+2]=128;data[i*4+3]=255;
  }return data;
 }

export function createMapFactory(){
 let gpuFailed=false,wasmFailed=false,wasmModule,disposed=false;
 const images=new Map(),cancelJobs=new Set(),queue=[];let active=0;
 function schedule(work){
  if(disposed||queue.length>=32)return Promise.reject(Error('Optional glass work unavailable'));
  return new Promise((resolve,reject)=>{queue.push({work,resolve,reject});pump();});
 }
 function pump(){
  while(!disposed&&active<2&&queue.length){const job=queue.shift();active++;Promise.resolve().then(job.work).then(job.resolve,job.reject).finally(()=>{active--;pump();});}
 }

 async function wasmMap(p){
  if(typeof WebAssembly==='undefined'||typeof WebAssembly.instantiate!=='function')throw Error('WASM unavailable');
  if(!wasmModule)wasmModule=WebAssembly.instantiate(Uint8Array.from(atob(WASM_BASE64),c=>c.charCodeAt(0)));
  const {instance}=await wasmModule,{memory,fill}=instance.exports;
  const offset=fill(p.w,p.h,p.kind,p.seed,p.radius,p.rim,p.strength,p.roughness),bytes=p.w*p.h*4;
  if(!offset||offset+bytes>memory.buffer.byteLength)throw Error('Invalid optical buffer');
  // Copy synchronously: another surface may use the same bounded WASM buffer next.
  return new Uint8ClampedArray(memory.buffer.slice(offset,offset+bytes));
 }
 async function gpuMap(p){
  if(!globalThis.isSecureContext||!globalThis.navigator?.gpu)throw Error('WebGPU unavailable');
  let cancelled=false,device,output,readback,uniform;
  const cancel=()=>{cancelled=true;device?.destroy();};cancelJobs.add(cancel);
  const task=(async()=>{
   const adapter=await navigator.gpu.requestAdapter({powerPreference:'low-power'});if(!adapter||cancelled)throw Error('No GPU adapter');
   device=await adapter.requestDevice();if(cancelled){device.destroy();throw Error('GPU expired');}
   const lost=device.lost.then(()=>{throw Error('GPU device lost');});
   const work=(async()=>{
    device.pushErrorScope('validation');
    const shader=device.createShaderModule({code:`
     struct Params{w:u32,h:u32,kind:u32,seed:u32,radius:f32,rim:f32,strength:f32,roughness:f32}
     @group(0) @binding(0) var<storage,read_write> pixels:array<u32>;
     @group(0) @binding(1) var<uniform> p:Params;
     fn hash(v:u32)->u32{var x=v;x=x^(x>>16u);x=x*0x7feb352du;x=x^(x>>15u);x=x*0x846ca68bu;return x^(x>>16u);}
     @compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
      let i=gid.x;if(i>=p.w*p.h){return;}var n=vec2<f32>(0.0);
      if(p.kind!=0u){let v=vec2<f32>(f32(i%p.w)+0.5-f32(p.w)/2.0,f32(i/p.w)+0.5-f32(p.h)/2.0);let q=abs(v)-(vec2<f32>(f32(p.w),f32(p.h))/2.0-p.radius);let o=max(q,vec2<f32>(0.0));let len=length(o);let distance=len+min(max(q.x,q.y),0.0)-p.radius;
       if(len>0.0){n=o/len*sign(v);}else if(q.x>q.y){n=vec2<f32>(sign(v.x),0.0);}else{n=vec2<f32>(0.0,sign(v.y));}let edge=clamp(1.0+distance/p.rim,0.0,1.0);n*=edge*(2.0-edge)*p.strength;}
      n+=(vec2<f32>(f32(hash(i+p.seed)&255u),f32(hash(i+p.seed+5374u)&255u))-128.0)/127.0*p.roughness;
      let c=vec2<u32>(clamp(vec2<f32>(128.0)+n*127.0,vec2<f32>(0.0),vec2<f32>(255.0))+0.5);pixels[i]=c.x|(c.y<<8u)|0xff800000u;
     }`});
    const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:shader,entryPoint:'main'}});if(cancelled)throw Error('GPU expired');
    const bytes=p.w*p.h*4;
    output=device.createBuffer({size:bytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});readback=device.createBuffer({size:bytes,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
    const values=new ArrayBuffer(32),u=new Uint32Array(values),f=new Float32Array(values);u.set([p.w,p.h,p.kind,p.seed]);f.set([p.radius,p.rim,p.strength,p.roughness],4);device.queue.writeBuffer(uniform,0,values);
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:output}},{binding:1,resource:{buffer:uniform}}]});
    const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(p.w*p.h/64));pass.end();encoder.copyBufferToBuffer(output,0,readback,0,bytes);device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);if(cancelled)throw Error('GPU expired');const data=new Uint8ClampedArray(readback.getMappedRange().slice(0));readback.unmap();if(await device.popErrorScope())throw Error('GPU effect rejected');return data;
   })();return Promise.race([work,lost]);
  })();
  try{return await bounded(task,1800,()=>{cancelled=true;device?.destroy();});}
  finally{cancelJobs.delete(cancel);cancelled=true;output?.destroy();readback?.destroy();uniform?.destroy();device?.destroy();}
 }
 async function mapImage(p){
  validateMapParameters(p);const cacheKey=JSON.stringify(p);if(images.has(cacheKey))return images.get(cacheKey);
  const task=schedule(async()=>{
   if(disposed)throw Error('Glass controller was destroyed');
   let data,engine,optical;
   if(p.optics){const result=await generateOpticalMapAsync(p,()=>disposed);data=result.data;engine='javascript';optical={scale:result.scale,stats:result.stats};}
   if(!data&&!gpuFailed)try{data=await gpuMap(p);engine='webgpu';}catch{gpuFailed=true;}
   if(disposed)throw Error('Glass controller was destroyed');
   if(!data&&!wasmFailed)try{data=await bounded(wasmMap(p),500);engine='wasm';}catch{wasmFailed=true;}
   if(disposed)throw Error('Glass controller was destroyed');
   if(!data){data=generateJavaScriptMap(p);engine='javascript';}
   if(disposed)throw Error('Glass controller was destroyed');
   const canvas=document.createElement('canvas');canvas.width=p.w;canvas.height=p.h;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image encoding unavailable');
   const pixels=ctx.createImageData(p.w,p.h);pixels.data.set(data);ctx.putImageData(pixels,0,0);const source=canvas.toDataURL();if(!source.startsWith('data:image/png'))throw Error('Optical image unavailable');
   await bounded(new Promise((resolve,reject)=>{const image=new Image();image.onload=resolve;image.onerror=reject;image.src=source;}),1000);return {source,engine,...optical};
  });
  images.set(cacheKey,task);while(images.size>4)images.delete(images.keys().next().value);
  task.catch(()=>{if(images.get(cacheKey)===task)images.delete(cacheKey);});return task;
 }

 return {image:mapImage,destroy(){if(disposed)return;disposed=true;for(const job of queue.splice(0))job.reject(Error('Glass controller was destroyed'));for(const cancel of cancelJobs)cancel();cancelJobs.clear();images.clear();wasmModule=undefined;}};
}
