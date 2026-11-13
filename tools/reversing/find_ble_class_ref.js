const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const target = 0x5b9a0;
for (let p = 0; p <= buf.length - 4; p += 4) {
  if (buf.readUInt32LE(p) === target) {
    console.log(`Ref to BleConnector class string at 0x${p.toString(16)}`);
  }
}
