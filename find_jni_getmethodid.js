const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/arm64-v8a/libobdcore.so');

// Find offset of "sendDataJNI" string: 0x6aa52
const sendDataJNI_off = 0x6aa52;
console.log('sendDataJNI at 0x' + sendDataJNI_off.toString(16));

// Search for ADRP + ADD or literal pointing to 0x6aa52
// In ARM64, 0x6aa52 page is 0x6a000, page offset is 0xa52
for (let i = 0; i < buf.length - 8; i += 4) {
  const inst1 = buf.readUInt32LE(i);
  // Check if ADRP
  if ((inst1 & 0x9F000000) === 0x90000000) {
    const rd = inst1 & 0x1F;
    const immlo = (inst1 >> 29) & 0x03;
    const immhi = (inst1 >> 5) & 0x7FFFF;
    let imm = (immhi << 2) | immlo;
    if (imm & 0x100000) imm -= 0x200000;
    const page = (i & ~0xFFF) + (imm << 12);
    if (page === 0x6a000) {
      // Check next instruction for ADD or LDR with 0xa52
      const inst2 = buf.readUInt32LE(i + 4);
      // ADD rd, rn, #imm12: (inst2 & 0xFFC00000) === 0x91000000
      if ((inst2 & 0xFFC00000) === 0x91000000) {
        const imm12 = (inst2 >> 10) & 0xFFF;
        if (imm12 === 0xa52) {
          console.log(`Found ADRP+ADD to sendDataJNI at 0x${i.toString(16)}`);
        }
      }
    }
  }
}
