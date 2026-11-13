const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

for (let p = 0x4498; p < 0x44c4; p += 2) {
  const op = buf.readUInt16LE(p);
  console.log(`0x${p.toString(16)}: 0x${op.toString(16).padStart(4, '0')}`);
}
