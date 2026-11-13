const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);
const typeIdsSize = dex.readUInt32LE(0x40);
const typeIdsOff = dex.readUInt32LE(0x44);
const classDefsSize = dex.readUInt32LE(0x60);
const classDefsOff = dex.readUInt32LE(0x64);

function getString(idx) {
  if (idx < 0 || idx >= stringIdsSize) return null;
  const strDataOff = dex.readUInt32LE(stringIdsOff + idx * 4);
  let p = strDataOff;
  while ((dex[p++] & 0x80) !== 0) {}
  let end = p;
  while (dex[end] !== 0) end++;
  return dex.toString('utf8', p, end);
}
function getTypeName(typeIdx) {
  if (typeIdx < 0 || typeIdx >= typeIdsSize) return null;
  return getString(dex.readUInt32LE(typeIdsOff + typeIdx * 4));
}

for (let c = 0; c < classDefsSize; c++) {
  const cOff = classDefsOff + c * 32;
  const classIdx = dex.readUInt32LE(cOff);
  const className = getTypeName(classIdx);
  if (className && (className.includes('Obd') || className.includes('AD10') || className.includes('ad10'))) {
    console.log(className);
  }
}
