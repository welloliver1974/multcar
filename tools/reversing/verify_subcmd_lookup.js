const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// In 0x44ac:
// Let's print each instruction with its exact registers
for (let p = 0x44b8; p < 0x44f8; p += 2) {
  const op = buf.readUInt16LE(p);
  const off = p.toString(16);
  console.log(`0x${off}: 0x${op.toString(16).padStart(4, '0')}`);
}
