import {drop,trace,waterIndex,paraxialJacobian,rainbow,rainbowStationary,radians} from './model.mjs';
const $=id=>document.getElementById(id),controls=['angle','volume','gap','thickness','wavelength'];
const cvs=$('view'),ctx=cvs.getContext('2d'),side=$('section').getContext('2d'),bow=$('rainbow').getContext('2d');
if(!ctx||!side||!bow){$('status').textContent='This browser cannot draw the study. The model and literature are available below and in MODEL.md.';}else{
const tile=document.createElement('canvas');tile.width=tile.height=600;const tex=tile.getContext('2d');
let pixels,queued=false;
function pattern(){
 tex.fillStyle='#fff';tex.fillRect(0,0,600,600);const dots=$('pattern').value==='dots';
 tex.strokeStyle='#bacfdc';tex.lineWidth=1;
 for(let i=0;i<600;i+=50){if(!dots){tex.beginPath();tex.moveTo(i,0);tex.lineTo(i,600);tex.moveTo(0,i);tex.lineTo(600,i);tex.stroke();}for(let j=0;j<600;j+=50){tex.fillStyle='#28576c';tex.beginPath();tex.arc(i,j,dots?4:1.5,0,Math.PI*2);tex.fill();}}
 if(!dots){tex.fillStyle='#243e4b';tex.font='28px Georgia';for(let i=30;i<600;i+=300){tex.fillText('Water & light',i,72);tex.fillText('Aa 012345',i,222);tex.fillText('Look closely.',i,372);tex.fillText('Through a drop',i,522);}tex.fillText('Aa',285,310);}
 pixels=tex.getImageData(0,0,600,600).data;
}
const mod=(x,n)=>(x%n+n)%n;
function section(g,options){
 const c=side,w=c.canvas.width,h=c.canvas.height,min=-options.thickness-options.gap,max=g.h+g.R;
 c.clearRect(0,0,w,h);const scale=Math.min((w-60)/(4*g.R),(h-60)/(max-min||1));
 const x=v=>w/2+v*scale,z=v=>25+(max-v)*scale;
 c.fillStyle='#e1edf3';c.fillRect(10,z(0),w-20,Math.max(1,options.thickness*scale));
 c.strokeStyle='#8fa8b7';c.lineWidth=1;c.beginPath();c.moveTo(10,z(0));c.lineTo(w-10,z(0));c.stroke();
 c.beginPath();for(let i=0;i<=240;i++){const a=-radians(g.angle)+2*radians(g.angle)*i/240;const px=x(g.R*Math.sin(a)),py=z(g.zc+g.R*Math.cos(a));i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.fillStyle='#d6ecf4';c.fill();c.strokeStyle='#247b9b';c.lineWidth=2;c.stroke();
 const rayColors=['#d36b35','#8455a2','#188b7c'];
 for(const [j,r] of [-.75,-.38,0,.38,.75].entries()){
  const result=trace(g,r*g.silhouette,options);c.beginPath();for(const [i,q]of result.path.entries())i?c.lineTo(x(q.p[0]),z(q.p[2])):c.moveTo(x(q.p[0]),z(q.p[2]));c.strokeStyle=rayColors[j%3];c.lineWidth=1.25;c.stroke();
 }
 c.strokeStyle='#536c7a';c.setLineDash([5,4]);c.beginPath();c.moveTo(10,z(min));c.lineTo(w-10,z(min));c.stroke();c.setLineDash([]);
 c.fillStyle='#163345';c.font='13px system-ui';c.fillText('Page / pattern',15,z(min)-7);c.fillText('Transparent support',15,z(0)+15);
 c.strokeStyle='#8555a0';c.setLineDash([3,3]);c.beginPath();c.moveTo(x(-g.a),z(0));c.lineTo(x(g.a),z(0));c.stroke();c.setLineDash([]);
 c.beginPath();c.arc(x(-g.a),z(0),24,0,-radians(g.angle),true);c.stroke();c.fillText(`θ = ${g.angle}°`,x(-g.a)-40,z(0)-30);
}
function rainbowFigure(){
 const c=bow,w=c.canvas.width,h=c.canvas.height,R=94,cx=w*.50,cy=h/2;
 const incidence=+$('incidence').value;const p=q=>[cx+q[0]*R,cy-q[1]*R];
 c.clearRect(0,0,w,h);c.strokeStyle='#a0bccb';c.fillStyle='#f3f9fc';c.beginPath();c.arc(cx,cy,R,0,2*Math.PI);c.fill();c.stroke();
 for(const [nm,color]of [[650,'#bf413a'],[550,'#338a58'],[450,'#356bc1']]){
  const q=rainbow(incidence,waterIndex(nm)),entry=p(q.entry),back=p(q.back),exit=p(q.exit);
  c.strokeStyle=color;c.lineWidth=1.8;c.beginPath();c.moveTo(20,entry[1]);c.lineTo(...entry);c.lineTo(...back);c.lineTo(...exit);c.lineTo(exit[0]+q.direction[0]*200,exit[1]-q.direction[1]*200);c.stroke();
 }
 const n=waterIndex(+$('wavelength').value),q=rainbow(incidence,n);
 $('incidence-out').value=`${incidence.toFixed(1)}°`;
 $('rainbow-info').textContent=`At the selected wavelength: r = ${q.r.toFixed(2)}°, φ = 4r − 2i = ${q.phi.toFixed(2)}°; deflection = ${q.deviation.toFixed(2)}°. The one-reflection branch carries ${(100*q.energy).toFixed(2)}% of the incident ray power in this ideal model. Red, green and blue paths use 650, 550 and 450 nm; their colors identify rays.`;
}
function render(){
 queued=false;const begin=performance.now(),g=drop({volume:+$('volume').value,angle:+$('angle').value});
 const options={gap:+$('gap').value,thickness:+$('thickness').value,nWater:waterIndex(+$('wavelength').value),nSolid:1.52};
 for(const id of controls)$(`${id}-out`).value=id==='angle'?`${$(id).value}°`:id==='wavelength'?`${$(id).value} nm`:id==='volume'?`${(+$('volume').value).toFixed(2)} µL`:`${(+$(id).value).toFixed(2)} mm`;
 const N=1024,lookup=Array.from({length:N+1},(_,i)=>trace(g,g.silhouette*Math.min(i/N,.999999999),options));
 const dry=trace(g,g.silhouette*2+1,options),basePower=dry.throughput,scale=200,w=cvs.width,h=cvs.height;
 const image=ctx.createImageData(w,h);let unavailable=0;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const dx=(x-w/2)/scale,dy=(y-h/2)/scale,r=Math.hypot(dx,dy);let sx=dx,sy=dy,power=basePower,valid=true;
  if(r<g.silhouette){const f=r/g.silhouette*N,i=Math.min(N-1,Math.floor(f)),u=f-i,a=lookup[i],b=lookup[i+1];
   if(a.status==='source'&&b.status==='source'){const source=a.sourceRadius*(1-u)+b.sourceRadius*u,k=r>1e-12?source/r:1;sx=dx*k;sy=dy*k;power=a.throughput*(1-u)+b.throughput*u;}
   else{valid=false;unavailable++;}
  }
  const at=(y*w+x)*4;
  if(valid){
   const tx=mod(sx*scale+300,600),ty=mod(sy*scale+300,600),ix=Math.floor(tx),iy=Math.floor(ty),u=tx-ix,v=ty-iy;
   const a=(iy*600+ix)*4,b=(iy*600+(ix+1)%600)*4,c=(((iy+1)%600)*600+ix)*4,d=(((iy+1)%600)*600+(ix+1)%600)*4;
   const wa=(1-u)*(1-v)*power,wb=u*(1-v)*power,wc=(1-u)*v*power,wd=u*v*power;
   for(let channel=0;channel<3;channel++)image.data[at+channel]=pixels[a+channel]*wa+pixels[b+channel]*wb+pixels[c+channel]*wc+pixels[d+channel]*wd;
  }else{const hatch=((x+y)%12)<3?116:220;image.data[at]=image.data[at+1]=image.data[at+2]=hatch;}
  image.data[at+3]=255;
 }
 ctx.putImageData(image,0,0);ctx.strokeStyle='#247b9b';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(w/2,h/2,g.silhouette*scale,0,2*Math.PI);ctx.stroke();ctx.setLineDash([5,5]);ctx.strokeStyle='#8555a0';ctx.beginPath();ctx.arc(w/2,h/2,g.a*scale,0,2*Math.PI);ctx.stroke();ctx.setLineDash([]);
 const J=paraxialJacobian(g,options),magnification=Math.abs(J)<.005?'Near singular':`${(1/J).toFixed(2)}×`;
 const facts=[['Height',g.h.toFixed(3)+' mm'],['Contact radius',g.a.toFixed(3)+' mm'],['Curvature radius',g.R.toFixed(3)+' mm'],['Water index',options.nWater.toFixed(6)],['Central signed magnification',magnification],['Bond number (height)',g.bondH.toFixed(3)]];
 $('facts').replaceChildren(...facts.map(([name,value])=>{const item=document.createElement('span');item.textContent=name;const v=document.createElement('strong');v.textContent=value;item.append(v);return item;}));
 const high=Math.max(g.bondA,g.bondH)>.1;$('validity').classList.toggle('gravity',high);
 $('validity').textContent=high?'Gravity may noticeably change this shape. The spherical cap is still shown for comparison; a Young–Laplace gravity solver is the next model. The 0.1 marker is an engineering caution, not a validated error bound.':'Surface tension dominates this first approximation. The small Bond numbers support a spherical cap; they do not establish an exact experimental match.';
 section(g,options);rainbowFigure();$('status').textContent=`1,025 radial rays · ${(performance.now()-begin).toFixed(0)} ms on this device${unavailable?' · some paths miss the page':''}.`;
 window.study={geometry:g,options,lookup,centralJacobian:J,unavailable};
}
function request(){if(!queued){queued=true;requestAnimationFrame(render);}}
for(const id of controls)$(id).addEventListener('input',request);
$('pattern').addEventListener('change',()=>{pattern();request();});
$('incidence').addEventListener('input',rainbowFigure);
$('stationary').addEventListener('click',()=>{$('incidence').value=rainbowStationary(waterIndex(+$('wavelength').value)).toFixed(1);rainbowFigure();});
for(const button of document.querySelectorAll('[data-angle]'))button.addEventListener('click',()=>{$('angle').value=button.dataset.angle;request();});
pattern();render();

}
