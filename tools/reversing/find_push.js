const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

for (let p = 0x6c00; p < 0x6cb0; p += 2) {
  const op = buf.readUInt16LE(p);
  if ((op & 0xf600) === 0xb400) { // PUSH
    console.log(`PUSH found at 0x${p.toString(16)}: 0x${op.toString(16)}`);
  }
}
