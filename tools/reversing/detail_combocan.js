const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');

const codeOff = 0x3878f4;
const insnsSize = dex.readUInt32LE(codeOff + 12) * 2;
const codeStart = codeOff + 16;
let cp = codeStart;

while (cp < codeStart + insnsSize) {
  const off = (cp - codeStart).toString(16).padStart(4, '0');
  const b0 = dex[cp];
  const b1 = dex[cp + 1];
  console.log(`0x${off}: [0x${b0.toString(16).padStart(2, '0')}, 0x${b1.toString(16).padStart(2, '0')}]`);
  if (b0 === 0x4f || b0 === 0x4d || b0 === 0x4e || b0 === 0x50 || b0 === 0x51) {
    // aput
    console.log(`    aput v${b1 & 0xf}, array v${(b1 >> 4) & 0xf}, idx v${dex[cp+2]}`);
    cp += 4;
    continue;
  }
  if (b0 === 0x13) {
    const val = dex.readInt16LE(cp + 2);
    console.log(`    const/16 v${b1}, #0x${(val & 0xffff).toString(16)} (${val})`);
    cp += 4;
    continue;
  }
  if (b0 === 0x23) {
    const sizeReg = (b1 >> 4) & 0xf;
    const arrReg = b1 & 0xf;
    console.log(`    new-array v${arrReg}, size v${sizeReg}`);
    cp += 4;
    continue;
  }
  cp += 2;
}
