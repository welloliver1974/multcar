const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const target = 0x5b9f0;
for (let i = 0; i < buf.length - 4; i += 4) {
  const val = buf.readUInt32LE(i);
  if (val === target) {
    console.log(`Direct pointer to sendDataJNI found at 0x${i.toString(16)}`);
  }
}
// Also search non-aligned
for (let i = 0; i < buf.length - 4; i++) {
  const val = buf.readUInt32LE(i);
  if (val === target) {
    console.log(`Unaligned pointer to sendDataJNI found at 0x${i.toString(16)}`);
  }
}
