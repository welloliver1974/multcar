const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find offset of "CAN,std"
const str = 'CAN,std,0,pin:6+14,07df/07e0/07f0,period:0/2/200/80/1000';
const idx = buf.indexOf(str);
console.log('CAN,std string in 32-bit at: 0x' + idx.toString(16));

// Find references to idx in 32-bit binary
const b = Buffer.alloc(4);
b.writeUInt32LE(idx);
let p = 0;
while ((p = buf.indexOf(b, p)) !== -1) {
  console.log('Reference at 0x' + p.toString(16));
  p += 4;
}

// In arm64
const buf64 = fs.readFileSync('unpacked_apk/lib/arm64-v8a/libobdcore.so');
const idx64 = buf64.indexOf(str);
console.log('CAN,std string in 64-bit at: 0x' + idx64.toString(16));
const b64 = Buffer.alloc(8);
b64.writeBigUInt64LE(BigInt(idx64));
p = 0;
while ((p = buf64.indexOf(b64, p)) !== -1) {
  console.log('64-bit Reference at 0x' + p.toString(16));
  p += 8;
}
