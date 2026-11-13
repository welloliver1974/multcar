const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// In 32-bit ARM ELF, strings are referenced via PC-relative or literal pools.
// Let's search for literal 0x5bb17 or relative offsets.
const target = 0x5bb17;
for (let i = 0; i < buf.length - 4; i += 4) {
  const val = buf.readUInt32LE(i);
  if (val === target) {
    console.log(`Direct pointer to 0x5bb17 found at 0x${i.toString(16)}`);
  }
}
