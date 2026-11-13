const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// Print all occurrences of pointers in literal pools
for (let i = 0; i < buf.length - 4; i += 4) {
  const val = buf.readUInt32LE(i);
  if (val >= 0x08000000 && val < 0x08020000) {
    const diff = val - 0x08000000;
    // check if diff corresponds to any known string
    if (diff < buf.length) {
      // check if it points to printable ASCII
      let isStr = true;
      for (let k = 0; k < 5; k++) {
        const ch = buf[diff + k];
        if (ch < 32 || ch > 126) { isStr = false; break; }
      }
      if (isStr) {
        let end = diff;
        while (end < buf.length && buf[end] >= 32 && buf[end] <= 126) end++;
        console.log(`Pool at 0x${i.toString(16)} -> 0x${val.toString(16)} (file offset 0x${diff.toString(16)}): "${buf.toString('utf8', diff, end)}"`);
      }
    }
  }
}
