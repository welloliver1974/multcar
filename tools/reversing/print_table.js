const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

for (let p = 0x3c80; p < 0x3d40; p += 4) {
  const val = buf.readUInt32LE(p);
  console.log(`[0x${p.toString(16)}]: 0x${val.toString(16)}`);
}
