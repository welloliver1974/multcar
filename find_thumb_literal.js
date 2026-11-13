const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find offset of "sendDataJNI"
const idx = buf.indexOf('sendDataJNI');
console.log('sendDataJNI in 32-bit at 0x' + idx.toString(16));

// In ARM Thumb:
// Often: ldr rX, =literal or adr rX, label
// Or literal pool: 32-bit word matching idx
for (let i = 0; i < buf.length - 4; i += 2) {
  const w = buf.readUInt32LE(i);
  if (w === idx) {
    console.log(`Literal pool match at 0x${i.toString(16)}`);
  }
}
