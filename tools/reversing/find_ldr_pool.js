const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

for (let p = 0x8f18; p < 0x55000; p += 4) {
  const val = buf.readUInt32LE(p);
  // Check if val is in rodata
  if (val >= 0x5b5c0 && val < 0x5f000) {
    let end = val;
    while (end < buf.length && buf[end] >= 32 && buf[end] <= 126) end++;
    const str = buf.toString('utf8', val, end);
    if (str.length >= 4) {
      console.log(`Pool at 0x${p.toString(16)} -> 0x${val.toString(16)}: "${str}"`);
    }
  }
}
