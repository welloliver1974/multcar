import sys, struct
from capstone import *

import os
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FW = os.path.join(_ROOT, 'unpacked_apk', 'assets', 'ble_obd.bin')

data = open(FW, 'rb').read()

# Vector table
sp = struct.unpack_from('<I', data, 0)[0]
reset = struct.unpack_from('<I', data, 4)[0]
print(f"Initial SP = 0x{sp:08x}")
print(f"Reset vector = 0x{reset:08x}")
print(f"file size = {len(data)} (0x{len(data):x})")

# Guess flash base: reset vector & 0xFFFFFF00
base = 0x08002000
print(f"Assumed flash base = 0x{base:08x}")

def disasm(start, end, label=""):
    off = start - base
    chunk = data[off:off + (end - start)]
    md = Cs(CS_ARCH_ARM, CS_MODE_THUMB)
    md.detail = False
    print(f"\n===== {label} 0x{start:08x} - 0x{end:08x} =====")
    for i in md.disasm(chunk, start):
        print(f"  0x{i.address:08x}: {i.bytes.hex():<12} {i.mnemonic:<10} {i.op_str}")

if __name__ == '__main__':
    a = int(sys.argv[1], 0)
    b = int(sys.argv[2], 0)
    disasm(a, b, sys.argv[3] if len(sys.argv) > 3 else "")
