// Bounded, parameter-driven RGBA optical maps. No imports, allocation or DOM access.
// Build with LLVM clang (wasm32 target):
// clang --target=wasm32 -O3 -nostdlib -Wl,--no-entry -Wl,--export=fill -Wl,--export-memory -Wl,--initial-memory=1572864 -Wl,--max-memory=1572864 -Wl,--strip-all glass-map.c -o glass-map.wasm
// Embed resulting bytes in maps.js's WASM_BASE64 constant.
static unsigned pixels[300000];
static float max(float a,float b){return a>b?a:b;}
static float min(float a,float b){return a<b?a:b;}
static unsigned hash(unsigned x){x^=x>>16;x*=0x7feb352dU;x^=x>>15;x*=0x846ca68bU;return x^(x>>16);}
unsigned fill(unsigned w,unsigned h,unsigned kind,unsigned seed,float radius,float rim,float strength,float roughness){
  if(!w||!h||w>4096||h>4096||w*h>300000)return 0;
  for(unsigned i=0;i<w*h;++i){
    float nx=0,ny=0;
    if(kind){
      float px=(float)(i%w)+.5f-(float)w/2,py=(float)(i/w)+.5f-(float)h/2;
      float qx=__builtin_fabsf(px)-((float)w/2-radius),qy=__builtin_fabsf(py)-((float)h/2-radius);
      float ox=max(qx,0),oy=max(qy,0),len=__builtin_sqrtf(ox*ox+oy*oy);
      float distance=len+min(max(qx,qy),0)-radius;
      if(len>0){nx=ox/len*(px<0?-1:1);ny=oy/len*(py<0?-1:1);}else if(qx>qy)nx=px<0?-1:1;else ny=py<0?-1:1;
      float edge=max(0,min(1,1+distance/rim)),bend=edge*(2-edge)*strength;
      nx*=bend;ny*=bend;
    }
    nx+=((float)(hash(i+seed)&255)-128)/127*roughness;
    ny+=((float)(hash(i+seed+5374)&255)-128)/127*roughness;
    unsigned r=(unsigned)max(0,min(255,128+nx*127)+.5f),g=(unsigned)max(0,min(255,128+ny*127)+.5f);
    pixels[i]=r|(g<<8)|0xff800000U;
  }
  return (unsigned)pixels;
}
