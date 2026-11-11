import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGlass,materials,defaultRecipes} from '../glass.js';
import {generateJavaScriptMap,validateMapParameters,WASM_BASE64} from '../maps.js';
const params={w:128,h:128,kind:0,seed:1945,radius:0,rim:18,strength:0,roughness:1};
test('Imports are safe without a browser; creation explains the boundary',()=>{assert.throws(()=>createGlass([]),/browser document/);assert.deepEqual(materials,['auto','refracted','frosted','translucent','solid']);assert.ok(Object.isFrozen(defaultRecipes));assert.ok(Object.isFrozen(defaultRecipes.frosted));});
test('Independent WASM and JavaScript implementations agree for both materials and mixed recipes',async()=>{
 const bytes=Buffer.from(WASM_BASE64,'base64'),module=new WebAssembly.Module(bytes),{exports:{fill,memory}}=new WebAssembly.Instance(module);assert.equal(WebAssembly.Module.imports(module).length,0);assert.equal(memory.buffer.byteLength,1572864);
 for(const p of [params,{...params,w:1015,h:61,kind:1,radius:30.5,strength:.9,roughness:0},{...params,w:409,h:85,kind:1,radius:28,strength:.9,roughness:0},{...params,w:273,h:79,kind:1,radius:24,strength:.55,roughness:.3}]){
  const offset=fill(p.w,p.h,p.kind,p.seed,p.radius,p.rim,p.strength,p.roughness),wasm=new Uint8Array(memory.buffer,offset,p.w*p.h*4),js=generateJavaScriptMap(p);let delta=0;for(let i=0;i<js.length;i++)delta=Math.max(delta,Math.abs(js[i]-wasm[i]));assert.ok(delta<=(p.kind?1:0),'backend channel error <= '+(p.kind?1:0));
 }
});
test('Invalid and oversized maps fail before allocation',()=>{for(const patch of [{w:0},{h:0},{w:4097},{w:1000,h:1000},{roughness:NaN},{rim:0},{seed:-1},{radius:Infinity},{kind:2}])assert.throws(()=>validateMapParameters({...params,...patch}),RangeError)});
test('Seed changes the roughness field while retaining dimensions and opacity',()=>{const a=generateJavaScriptMap({...params,w:32,h:32}),b=generateJavaScriptMap({...params,w:32,h:32,seed:1946});assert.equal(a.length,4096);assert.notDeepEqual(a,b);for(let i=3;i<a.length;i+=4)assert.equal(a[i],255)});
test('MIT and contribution credits are explicit',async()=>{const license=await readFile(new URL('../LICENSE',import.meta.url),'utf8'),credits=await readFile(new URL('../AUTHORS.md',import.meta.url),'utf8');assert.ok(license.startsWith('MIT License'));assert.ok(credits.includes('**Codex:**'));assert.ok(credits.includes('**areoform:**'))});
