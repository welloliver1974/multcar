const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// In Thumb-2: LDR.W Rt, [Rn, #imm12]
// for CallBooleanMethod (offset 0xac = 172)
// 0xf8d0 ...
for (let p = 0x8f18; p < 0x55000; p += 2) {
  const w1 = buf.readUInt16LE(p);
  const w2 = buf.readUInt16LE(p + 2);
  // LDR.W Rt, [Rn, #0xac]
  if ((w1 & 0xfff0) === 0xf8d0 && (w2 & 0x0fff) === 0x0ac) {
    console.log(`CallBooleanMethod invocation at 0x${p.toString(16)}!`);
    // Print around it
    for (let k = p - 30; k <= p + 30; k += 2) {
      console.log(`  0x${k.toString(16)}: 0x${buf.readUInt16LE(k).toString(16).padStart(4, '0')}`);
    }
  }
}
