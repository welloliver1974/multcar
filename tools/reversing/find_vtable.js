const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const target = 0x5e1b0;
for (let p = 0; p < buf.length - 4; p += 4) {
  const v = buf.readUInt32LE(p);
  if (v === target) {
    console.log(`Reference to CAD10Prot typeinfo at 0x${p.toString(16)}`);
    // Print around it to find vtable!
    for (let k = p - 16; k <= p + 160; k += 4) {
      const fn = buf.readUInt32LE(k);
      console.log(`  [0x${k.toString(16)}]: 0x${fn.toString(16)}`);
    }
  }
}
