const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');
const base = 0x08000000;
const targetStr = base + 0x9f44;

for (let i = 0; i < buf.length - 4; i++) {
  const val = buf.readUInt32LE(i);
  if (val === targetStr) {
    console.log(`Reference found at offset 0x${i.toString(16)} (code addr: 0x${(base + i).toString(16)})`);
  }
}
