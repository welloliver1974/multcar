const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

let p = 0;
while (p < buf.length) {
  if (buf[p] >= 32 && buf[p] <= 126) {
    let s = p;
    while (p < buf.length && buf[p] >= 32 && buf[p] <= 126) p++;
    const str = buf.toString('utf8', s, p);
    if (str.length >= 3) {
      console.log(`0x${s.toString(16)}: ${str}`);
    }
  }
  p++;
}
