const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');
const strOff = buf.indexOf("[ble] ble_protocol_analy_char");

for (let base = 0x08000000; base <= 0x08010000; base += 0x800) {
  const target = base + strOff;
  for (let i = 0; i < buf.length - 4; i += 2) {
    if (buf.readUInt32LE(i) === target) {
      console.log(`Match with base 0x${base.toString(16)} at offset 0x${i.toString(16)}!`);
    }
  }
}
