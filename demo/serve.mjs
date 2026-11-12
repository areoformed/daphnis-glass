// Local demo/test server. Deliberately serves only the public component files.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),port=Number(process.env.PORT||8798);
const allowed=new Set(['demo/index.html','demo/demo.css','demo/demo.js','glass.js','maps.js','optics.js','OPTICS.md','glass.css','README.md','examples/as-we-may-think/index.html','examples/as-we-may-think/reading.css','examples/as-we-may-think/reading.js','examples/as-we-may-think/README.md']);
const types={html:'text/html',css:'text/css',js:'text/javascript',md:'text/plain'};
const csp="default-src 'none'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const server=http.createServer(async(req,res)=>{
 let path;try{path=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')}catch{res.writeHead(400);res.end();return}
 if(path===''||path==='demo/'||path==='demo')path='demo/index.html';
 if(path==='examples/as-we-may-think'){res.writeHead(302,{'location':'/examples/as-we-may-think/'});res.end();return}
 if(path==='examples/as-we-may-think/')path='examples/as-we-may-think/index.html';
 if(req.method!=='GET'||!allowed.has(path)){res.writeHead(404);res.end('Not found');return}
 try{const body=await readFile(new URL(path,root));res.writeHead(200,{'content-type':(types[path.split('.').at(-1)]||'text/plain')+'; charset=utf-8','cache-control':'no-store','content-security-policy':csp,'x-content-type-options':'nosniff'});res.end(body)}catch{res.writeHead(404);res.end('Not found')}
});
server.listen(port,'127.0.0.1',()=>console.log('Felt Glass demo: http://127.0.0.1:'+port+'/demo/'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close(()=>process.exit(0)));
