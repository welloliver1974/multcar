const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// Search for references to strings in 0x3c00 - 0x3d00
for (let p = 0; p < buf.length - 4; p += 2) {
  const val = buf.readUInt32LE(p);
  if (val >= 0x08003c00 && val <= 0x08003d00) {
    const strOff = val - 0x08000000;
    let end = strOff;
    while (end < buf.length && buf[end] >= 32 && buf[end] <= 126) end++;
    console.log(`Ref at 0x${p.toString(16)} -> 0x${val.toString(16)}: "${buf.toString('utf8', strOff, end)}"`);
  }
}
