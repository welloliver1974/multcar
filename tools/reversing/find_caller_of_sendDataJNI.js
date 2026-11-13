const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const target = 0x5b9f0;
for (let p = 0; p <= buf.length - 4; p += 4) {
  const val = buf.readUInt32LE(p);
  if (val === target) {
    console.log(`Direct ref to sendDataJNI at 0x${p.toString(16)}`);
  }
}
