const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

for (let i = 0x200; i < 0x800; i += 4) {
  const val = buf.readUInt32LE(i);
  if (val >= 0x08000000 && val < 0x08050000) {
    console.log(`[0x${i.toString(16)}]: 0x${val.toString(16)}`);
  }
}
