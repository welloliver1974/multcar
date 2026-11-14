import struct
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

ds=[s for s in secs if s['name']=='.dynsym'][0]
dstr=[s for s in secs if s['name']=='.dynstr'][0]
syms={}
n=ds['size']//24
for i in range(n):
    o=ds['offset']+i*24
    st_name,st_info,st_other,st_shndx,st_value,st_size=struct.unpack_from('<IBBHQQ',d,o)
    e=d.index(b'\x00',dstr['offset']+st_name)
    name=d[dstr['offset']+st_name:e].decode('latin1')
    if name and st_value: syms[name]=(st_value,st_size)

def va2off(va):
    for s in secs:
        if s['addr'] and s['addr'] <= va < s['addr']+s['size']:
            return s['offset']+(va-s['addr'])
    return None

md=Cs(CS_ARCH_ARM64,CS_MODE_ARM); md.detail=True
def dis(va,size):
    o=va2off(va)
    return list(md.disasm(d[o:o+size],va))

if __name__=='__main__':
    import sys
    pat=sys.argv[1]
    for name,(v,sz) in sorted(syms.items()):
        if pat.lower() in name.lower():
            print(f"  {name}  va=0x{v:08x} size={sz}")
