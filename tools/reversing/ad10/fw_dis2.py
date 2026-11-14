import sys, struct
from capstone import *
import os
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FW = os.path.join(_ROOT, 'unpacked_apk', 'assets', 'ble_obd.bin')

d = open(FW, 'rb').read()
BASE = 0x08002000
def u32(o): return struct.unpack_from('<I', d, o)[0]
def u16(o): return struct.unpack_from('<H', d, o)[0]
def f(a): return a - BASE
def cstr(o):
    try:
        e = d.index(b'\x00', o)
        return d[o:e].decode('latin1')
    except Exception:
        return None

md = Cs(CS_ARCH_ARM, CS_MODE_THUMB)
md.detail = True

def disasm(start, end, note=""):
    o = f(start)
    print(f"\n===== {note} 0x{start:08x} (file 0x{o:x}) =====")
    for i in md.disasm(d[o:o+(end-start)], start):
        extra = ""
        if i.mnemonic.startswith('ldr') and '[pc' in i.op_str:
            # resolve literal
            try:
                imm = int(i.op_str.split('#')[1].rstrip(']'), 0)
                tgt = ((i.address + 4) & ~3) + imm
                v = u32(f(tgt))
                s = cstr(f(v)) if BASE <= v < BASE+len(d) else None
                extra = f"   ; =0x{v:08x} " + (repr(s) if s else "")
            except Exception as e:
                extra = "  ; <err>"
        print(f"  0x{i.address:08x}: {i.mnemonic:<9} {i.op_str}{extra}")

if __name__ == '__main__':
    a = int(sys.argv[1], 0); b = int(sys.argv[2], 0)
    disasm(a, b, sys.argv[3] if len(sys.argv)>3 else "")
