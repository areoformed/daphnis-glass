// MIT. Codex and areoform. Explicit static-site export; no dependencies or publishing.
import {readFile,writeFile,mkdir,readdir,lstat} from 'node:fs/promises';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(process.argv[2]||'site');
if(output===resolve(root)||relative(output,root).split('/')[0]!=='..')throw Error('Choose a dedicated output directory, not the source tree or its parents.');
const files=['glass.js','maps.js','optics.js','OPTICS.md','glass.css','README.md','AUTHORS.md','LICENSE','VALIDATION.md','demo/index.html','demo/demo.css','demo/demo.js','examples/as-we-may-think/index.html','examples/as-we-may-think/reading.css','examples/as-we-may-think/reading.js','examples/as-we-may-think/README.md'];
files.push('experiments/sessile-drop/index.html','experiments/sessile-drop/standalone.html','experiments/sessile-drop/model.mjs','experiments/sessile-drop/lab.mjs','experiments/sessile-drop/MODEL.md');
const generated=['index.html','404.html','.daphnis-build.json'];
await mkdir(output,{recursive:true});
if((await lstat(output)).isSymbolicLink())throw Error('Output cannot be a symbolic link.');
const existing=await readdir(output);
if(existing.length){
 const previous=JSON.parse(await readFile(resolve(output,'.daphnis-build.json'),'utf8').catch(()=>{throw Error('Refusing to overwrite a nonempty directory that is not a Daphnis build.')}));
 if(previous.builder!=='daphnis-static-v1')throw Error('Unrecognized build output.');
 const allowed=new Set([...files,...generated]);
 async function inspect(dir){for(const name of await readdir(dir)){const p=resolve(dir,name),s=await lstat(p);if(s.isSymbolicLink())throw Error('Refusing symbolic links in build output.');if(s.isDirectory())await inspect(p);else if(!s.isFile()||!allowed.has(relative(output,p)))throw Error('Unknown file in build output: '+relative(output,p));}}
 await inspect(output);
}
for(const rel of files){const data=await readFile(resolve(root,rel));const dest=resolve(output,rel);await mkdir(dirname(dest),{recursive:true});await writeFile(dest,data);}
await writeFile(resolve(output,'index.html'),'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=examples/as-we-may-think/"><title>Daphnis Glass</title></head><body><p><a href="examples/as-we-may-think/">Read As We May Think</a></p></body></html>\n');
await writeFile(resolve(output,'404.html'),'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Page not found</title></head><body><h1>Page not found</h1><p><a href="/">Return to the reading example</a></p></body></html>\n');
await writeFile(resolve(output,'.daphnis-build.json'),JSON.stringify({builder:'daphnis-static-v1',files:[...files,...generated]},null,2)+'\n');
console.log('Built '+files.length+' allowlisted assets, a root entry page and a 404 page in '+output);
