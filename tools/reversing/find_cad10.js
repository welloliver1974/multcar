const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

let p = 0;
while (p < buf.length) {
  if (buf[p] >= 32 && buf[p] <= 126) {
    let s = p;
    while (p < buf.length && buf[p] >= 32 && buf[p] <= 126) p++;
    const str = buf.toString('utf8', s, p);
    if (str.includes('AD10') || str.includes('Prot')) {
      console.log(`0x${s.toString(16)}: "${str}"`);
    }
  }
  p++;
}
