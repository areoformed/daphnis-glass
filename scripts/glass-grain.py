"""Generate Felt's static frost grain. Standard library only; no runtime work.

python3 scripts/glass-grain.py /tmp/frost-grain.png
The 256px tile is displayed at 160 CSS px. Density varies smoothly across the
seamless tile; individual grains vary in radius, strength and aspect ratio.
"""
import argparse, math, random, struct, zlib
from pathlib import Path

def generate(seed=194507):
    rng=random.Random(seed);size=256;world=160;scale=size/world
    density=[[rng.uniform(.3,.95) for _ in range(8)] for _ in range(8)]
    field=[0.0]*(size*size)
    for _ in range(17000):
        x,y=rng.random()*size,rng.random()*size
        gx,gy=x/size*8,y/size*8;ix,iy=int(gx),int(gy)
        tx,ty=gx-ix,gy-iy;tx=tx*tx*(3-2*tx);ty=ty*ty*(3-2*ty)
        a=density[iy%8][ix%8]*(1-tx)+density[iy%8][(ix+1)%8]*tx
        b=density[(iy+1)%8][ix%8]*(1-tx)+density[(iy+1)%8][(ix+1)%8]*tx
        if rng.random()>a*(1-ty)+b*ty:continue
        radius=rng.uniform(.48,.88)*scale
        rx=radius*rng.uniform(.8,1.2);ry=radius*rng.uniform(.8,1.2)
        strength=rng.uniform(.075,.16)*(-1 if rng.random()<.53 else 1)
        for yy in range(math.floor(y-ry*1.3),math.ceil(y+ry*1.3)+1):
            for xx in range(math.floor(x-rx*1.3),math.ceil(x+rx*1.3)+1):
                distance=((xx+.5-x)/rx)**2+((yy+.5-y)/ry)**2
                if distance>1.7:continue
                field[(yy%size)*size+xx%size]+=strength*math.exp(-2.5*distance)
    palette=b''.join(bytes((25,38,34) if i<32 else (255,255,255)) for i in range(64))
    alpha=bytes(list(range(32))*2);rows=[]
    for y in range(size):
        row=bytearray()
        for v in field[y*size:(y+1)*size]:
            level=min(31,round(abs(v)*255));row.append(level+(32 if v>0 else 0))
        rows.append(b'\0'+row)
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,3,0,0,0))+chunk(b'PLTE',palette)+chunk(b'tRNS',alpha)+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('output',type=Path);parser.add_argument('--seed',type=int,default=194507);args=parser.parse_args()
    png=generate(args.seed);args.output.write_bytes(png);print(f'{args.output}: {len(png)} bytes')
