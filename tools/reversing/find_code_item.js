const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');

const target = 0x74dfae;
for (let p = target - 2000; p < target; p += 4) {
  const insnsSize = dex.readUInt32LE(p + 12);
  const codeStart = p + 16;
  const codeEnd = codeStart + insnsSize * 2;
  if (target >= codeStart && target < codeEnd) {
    console.log(`Code item at 0x${p.toString(16)}: insnsSize=${insnsSize}, codeEnd=0x${codeEnd.toString(16)}`);
    // Now search classDefs for this codeOff
    // ...
  }
}
