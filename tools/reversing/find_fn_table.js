const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

const target = 0x8004bd1; // Thumb address
const targetEven = 0x8004bd0;

for (let p = 0; p < buf.length - 4; p += 2) {
  const val = buf.readUInt32LE(p);
  if (val === target || val === targetEven) {
    console.log(`Found pointer to send_can_id at 0x${p.toString(16)} (val=0x${val.toString(16)})`);
    // Print table around it!
    console.log('Surrounding table:');
    for (let k = p - 32; k <= p + 32; k += 4) {
      if (k >= 0 && k < buf.length - 4) {
        console.log(`  [0x${k.toString(16)}]: 0x${buf.readUInt32LE(k).toString(16)}`);
      }
    }
  }
}
