const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const target = 0x60c9c;
const text_start = 0x8f18;
const text_end = 0x8f18 + 0x4ce18;

// In ARM literal pools, 32-bit constants are stored at word-aligned addresses
for (let i = text_start; i < text_end; i += 4) {
  const val = buf.readUInt32LE(i);
  if (val === target || val === 0x5fc9c) {
    console.log(`Reference to config table found at 0x${i.toString(16)} (val=0x${val.toString(16)})`);
  }
}
