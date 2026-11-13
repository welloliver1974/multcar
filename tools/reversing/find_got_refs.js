const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Target string: 0x5b9a0 ("com/diagnosis/obdbluetooth/BleConnector")
// In ARM PIC Thumb:
// LDR rX, [PC, #imm] -> loads offset D
// ADD rX, PC -> rX = PC + D
// So (PC + D) === 0x5b9a0 !
const target = 0x5b9a0;

for (let p = 0x8f18; p < 0x55000; p += 4) {
  const d = buf.readInt32LE(p);
  // Check if (p + 4 + d) === target or similar
  for (let offset = -8; offset <= 8; offset += 4) {
    if (p + offset + d === target) {
      console.log(`Pool at 0x${p.toString(16)}: delta=0x${d.toString(16)}, base=0x${(p+offset).toString(16)} -> 0x${target.toString(16)}`);
    }
  }
}
