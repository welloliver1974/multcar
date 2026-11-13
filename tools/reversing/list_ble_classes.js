const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const classDefsSize = dex.readUInt32LE(0x60);
const classDefsOff = dex.readUInt32LE(0x64);
const stringIdsOff = dex.readUInt32LE(0x3C);
const typeIdsOff = dex.readUInt32LE(0x44);

function getString(idx) {
  let p = dex.readUInt32LE(stringIdsOff + idx * 4);
  while ((dex[p++] & 0x80) !== 0) {}
  let end = p;
  while (dex[end] !== 0) end++;
  return dex.toString('utf8', p, end);
}
function getTypeName(t) {
  return getString(dex.readUInt32LE(typeIdsOff + t * 4));
}

for (let c = 0; c < classDefsSize; c++) {
  const cOff = classDefsOff + c * 32;
  const classIdx = dex.readUInt32LE(cOff);
  const className = getTypeName(classIdx);
  if (className.includes('BleConnector')) {
    const superIdx = dex.readUInt32LE(cOff + 4);
    console.log(`Class: ${className}, super: ${getTypeName(superIdx)} (superIdx: ${superIdx})`);
  }
}
