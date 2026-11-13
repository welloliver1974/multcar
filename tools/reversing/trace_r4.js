const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// Disassemble from 0x3b40 to 0x3ba4
for (let p = 0x3b40; p < 0x3ba4; p += 2) {
  const op = buf.readUInt16LE(p);
  const off = p.toString(16).padStart(4, '0');
  console.log(`0x${off}: 0x${op.toString(16).padStart(4, '0')}`);
}
