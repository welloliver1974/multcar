const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

for (let p = 0; p < buf.length - 2; p += 2) {
  const op = buf.readUInt16LE(p);
  if ((op & 0xf800) === 0xa000) {
    const rd = (op >> 8) & 7;
    const imm8 = op & 0xff;
    const pc = (p & ~3) + 4;
    const target = pc + (imm8 * 4);
    if (target < buf.length && buf[target] >= 32 && buf[target] <= 126) {
      let end = target;
      while (end < buf.length && buf[end] >= 32 && buf[end] <= 126) end++;
      const str = buf.toString('utf8', target, end);
      if (str.length >= 4) {
        console.log(`0x${p.toString(16)}: ADR r${rd}, 0x${target.toString(16)} -> "${str}"`);
      }
    }
  }
}
