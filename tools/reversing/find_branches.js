const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

function checkTarget(target) {
  console.log(`Checking callers of 0x${target.toString(16)}:`);
  for (let p = 0; p < buf.length - 4; p += 2) {
    const w1 = buf.readUInt16LE(p);
    const w2 = buf.readUInt16LE(p + 2);
    if ((w1 & 0xf800) === 0xf000 && (w2 & 0xd000) === 0x9000) {
      let imm10 = w1 & 0x3ff;
      let imm11 = w2 & 0x7ff;
      let s = (w1 >> 10) & 1;
      let j1 = (w2 >> 13) & 1;
      let j2 = (w2 >> 11) & 1;
      let i1 = ~(j1 ^ s) & 1;
      let i2 = ~(j2 ^ s) & 1;
      let imm32 = (s << 24) | (i1 << 23) | (i2 << 22) | (imm10 << 12) | (imm11 << 1);
      if (s) imm32 |= 0xfe000000;
      const dest = p + 4 + imm32;
      if (dest === target) {
        console.log(`  BL at 0x${p.toString(16)} -> 0x${dest.toString(16)}`);
      }
    }
  }
}

checkTarget(0x4bd0); // send_can_id
checkTarget(0x4b1c); // obd_protocol
checkTarget(0x47a6); // bps
