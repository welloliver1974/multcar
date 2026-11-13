const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');
console.log('Bytes at 0x2184:');
for (let i = 0x2184; i < 0x2194; i++) {
  console.log(`0x${i.toString(16)}: 0x${buf[i].toString(16)}`);
}

// Let's search for the string "[ble] ble_protocol_analy_char" offset
const str = "[ble] ble_protocol_analy_char";
const strOff = buf.indexOf(str);
console.log(`String offset in file: 0x${strOff.toString(16)}`);

// Search for (base + strOff) for various base values
for (let base = 0x08000000; base <= 0x08010000; base += 0x800) {
  const target = base + strOff;
  for (let i = 0; i < buf.length - 4; i += 2) {
    if (buf.readUInt32LE(i) === target) {
      console.log(`Match with base 0x${base.toString(16)} at offset 0x${i.toString(16)}!`);
    }
  }
}
