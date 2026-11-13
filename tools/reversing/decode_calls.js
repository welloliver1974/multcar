const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

function decodeBL(p) {
  const w1 = buf.readUInt16LE(p);
  const w2 = buf.readUInt16LE(p + 2);
  let imm10 = w1 & 0x3ff;
  let imm11 = w2 & 0x7ff;
  let s = (w1 >> 10) & 1;
  let j1 = (w2 >> 13) & 1;
  let j2 = (w2 >> 11) & 1;
  let i1 = ~(j1 ^ s) & 1;
  let i2 = ~(j2 ^ s) & 1;
  let imm32 = (s << 24) | (i1 << 23) | (i2 << 22) | (imm10 << 12) | (imm11 << 1);
  if (s) imm32 |= 0xfe000000;
  return p + 4 + imm32;
}

console.log('0x918e calls: 0x' + decodeBL(0x918e).toString(16));
console.log('0x91a4 calls: 0x' + decodeBL(0x91a4).toString(16));
console.log('0x91cc calls: 0x' + decodeBL(0x91cc).toString(16));
console.log('0x91e8 calls: 0x' + decodeBL(0x91e8).toString(16));
