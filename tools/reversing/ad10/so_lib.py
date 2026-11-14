import struct, sys, re
from capstone import *

import os
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FW = os.path.join(_ROOT, 'unpacked_apk', 'lib', 'arm64-v8a', 'libobdcore.so')

d = open(PATH,'rb').read()

# ---- ELF64 parse ----
assert d[:4] == b'\x7fELF'
e_shoff = struct.unpack_from('<Q', d, 0x28)[0]
e_shentsize = struct.unpack_from('<H', d, 0x3a)[0]
e_shnum = struct.unpack_from('<H', d, 0x3c)[0]
e_shstrndx = struct.unpack_from('<H', d, 0x3e)[0]

secs = []
for i in range(e_shnum):
    o = e_shoff + i*e_shentsize
    name, typ, flags, addr, offset, size, link, info, align, entsize = struct.unpack_from('<IIQQQQIIQQ', d, o)
    secs.append(dict(name_off=name, type=typ, addr=addr, offset=offset, size=size))
shstr = secs[e_shstrndx]
for s in secs:
    e = d.index(b'\x00', shstr['offset']+s['name_off'])
    s['name'] = d[shstr['offset']+s['name_off']:e].decode('latin1')

def sec(name):
    for s in secs:
        if s['name'] == name: return s
    return None

print("=== Secoes ===")
for s in secs:
    if s['size']: print(f"  {s['name']:<20} addr=0x{s['addr']:08x} off=0x{s['offset']:06x} size=0x{s['size']:x}")

# ---- strings with vaddr ----
def vaddr_strings():
    out = {}
    i = 0
    while i < len(d):
        if 32 <= d[i] < 127:
            j = i
            while j < len(d) and 32 <= d[j] < 127: j += 1
            if j - i >= 4:
                # map file off -> vaddr
                va = None
                for s in secs:
                    if s['type'] != 8 and s['offset'] <= i < s['offset']+s['size'] and s['addr']:
                        va = s['addr'] + (i - s['offset']); break
                if va is not None:
                    out[va] = d[i:j].decode('latin1')
            i = j
        else:
            i += 1
    return out

VS = vaddr_strings()

def find_str(sub):
    return sorted([(a,s) for a,s in VS.items() if sub in s])

if __name__ == '__main__':
    pat = sys.argv[1]
    for a,s in find_str(pat):
        print(f"  0x{a:08x}  {s!r}")
