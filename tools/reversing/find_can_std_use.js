const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find where 0x5bb17 is referenced
// In PIC code, delta = 0x5bb17 - PC
for (let p = 0x8f18; p < 0x55000; p += 4) {
  const d = buf.readInt32LE(p);
  for (let offset = -16; offset <= 16; offset += 4) {
    if (p + offset + d === 0x5bb17) {
      console.log(`Pool at 0x${p.toString(16)}: delta=0x${d.toString(16)} -> 0x5bb17!`);
      // Find instruction that references this pool
      for (let i = p - 100; i < p; i += 2) {
        const op = buf.readUInt16LE(i);
        if ((op & 0xf800) === 0x4800) {
          const imm = (op & 0xff) * 4;
          if (((i & ~3) + 4 + imm) === p) {
            console.log(`  Loaded by instr at 0x${i.toString(16)}`);
          }
        }
      }
    }
  }
}
