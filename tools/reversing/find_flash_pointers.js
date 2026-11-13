const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

const ptrCounts = {};
for (let i = 0; i < buf.length - 4; i += 4) {
  const val = buf.readUInt32LE(i);
  const upper = val >>> 16;
  if (upper === 0x0800 || upper === 0x0801 || upper === 0x0802 || upper === 0x0803) {
    const page = val & 0xfffff000;
    ptrCounts[page] = (ptrCounts[page] || 0) + 1;
  }
}
console.log(ptrCounts);
