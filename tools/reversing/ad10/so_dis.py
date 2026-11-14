import struct, sys
from capstone import *
import os
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FW = os.path.join(_ROOT, 'unpacked_apk', 'lib', 'arm64-v8a', 'libobdcore.so')

d=open(PATH,'rb').read()
e_shoff=struct.unpack_from('<Q',d,0x28)[0]; e_shentsize=struct.unpack_from('<H',d,0x3a)[0]
e_shnum=struct.unpack_from('<H',d,0x3c)[0]; e_shstrndx=struct.unpack_from('<H',d,0x3e)[0]
secs=[]
for i in range(e_shnum):
    o=e_shoff+i*e_shentsize
    name,typ,flags,addr,offset,size,link,info,align,entsize=struct.unpack_from('<IIQQQQIIQQ',d,o)
    secs.append(dict(name_off=name,type=typ,addr=addr,offset=offset,size=size))
sh=secs[e_shstrndx]
for s in secs:
    e=d.index(b'\x00',sh['offset']+s['name_off']); s['name']=d[sh['offset']+s['name_off']:e].decode('latin1')

def off2va(o):
    for s in secs:
        if s['type']!=8 and s['size'] and s['offset']<=o<s['offset']+s['size']: return s['addr']+(o-s['offset'])
    return None
def va2off(va):
    for s in secs:
        if s['addr'] and s['addr']<=va<s['addr']+s['size']: return s['offset']+(va-s['addr'])
    return None

STR={}
i=0
while i<len(d):
    if 32<=d[i]<127:
        j=i
        while j<len(d) and 32<=d[j]<127: j+=1
        if j-i>=4:
            va=off2va(i)
            if va: STR[va]=d[i:j].decode('latin1')
        i=j
    else: i+=1

md=Cs(CS_ARCH_ARM64,CS_MODE_ARM); md.detail=True

def dis(va,size,mark=None):
    o=va2off(va); out=[]
    for i in md.disasm(d[o:o+size],va):
        ann=''
        if i.mnemonic=='adrp':
            p=int(i.op_str.split(',')[1].strip().replace('#',''),0)
            reg=i.op_str.split(',')[0].strip()
            nxt=out
            out.append((i,ann,f"adrp {reg} -> 0x{p:x}"))
            continue
        if out and i.mnemonic=='add' and out[-1][0].mnemonic=='adrp':
            prev=out[-1]
            reg=prev[2].split()[1]
            try:
                imm=int(i.op_str.split('#')[-1].strip().rstrip(']'),0)
                tgt=prev[2].split('-> ')[1].split()[0]
                tgt=int(tgt,16)+imm
                s=STR.get(tgt)
                ann=f"  ; => 0x{tgt:x} {s!r}" if s else f"  ; => 0x{tgt:x}"
            except Exception: ann=''
        # bytes store immediate
        if i.mnemonic in ('mov','movz','movk') and '#' in i.op_str:
            try:
                v=int(i.op_str.split('#')[-1].strip().rstrip(']'),0)
                if v in (0xAA,0xAB,0x55,0x56,0x6002,0x6001,0x6003,0x6004,0x6005,0x6006,0x6007,0x6008,0x6009,0x07DF,0x7E0,0x7E8):
                    ann+=f"   <<< {v:#x}"
            except Exception: pass
        out.append((i,ann,''))
    return out

if __name__=='__main__':
    va=int(sys.argv[1],0); size=int(sys.argv[2],0) if len(sys.argv)>2 else 200
    for i,ann,extra in dis(va,size):
        print(f"  0x{i.address:08x}: {i.mnemonic:<8} {i.op_str:<40}{ann}{extra}")
