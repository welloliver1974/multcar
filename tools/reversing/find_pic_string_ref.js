const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// In 32-bit ARM:
// PC-relative address:
// LDR Rd, [PC, #offset] loads a 32-bit delta, then ADD Rd, PC
// So (PC + 4 + delta) === 0x5b9f0
const target = 0x5b9f0;

for (let p = 0x8f18; p < 0x55000; p += 2) {
  // Check if at p, a delta is stored
  if ((p % 4) === 0) {
    const delta = buf.readInt32LE(p);
    // If this is in a literal pool, what instruction loaded it?
    // Let's check if (base + delta) === target for various bases around p
    for (let instr = p - 200; instr < p; instr += 2) {
      // Check if instr is LDR Rx, [PC, #(p - (instr&~3) - 4)]
      const op = buf.readUInt16LE(instr);
      if ((op & 0xf800) === 0x4800) {
        const imm = (op & 0xff) * 4;
        const targetPool = ((instr & ~3) + 4) + imm;
        if (targetPool === p) {
          // instr loads delta! Then there should be an ADD Rx, PC nearby
          const pc = (instr & ~3) + 4;
          // check if delta + pc === target or delta + (pc + 4) === target
          const calculatedAddr = pc + delta;
          if (Math.abs(calculatedAddr - target) < 16) {
            console.log(`Found string load at instr 0x${instr.toString(16)} (pool 0x${p.toString(16)}, delta=0x${delta.toString(16)}) -> 0x${calculatedAddr.toString(16)}`);
          }
        }
      }
    }
  }
}
