const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);
const typeIdsSize = dex.readUInt32LE(0x40);
const typeIdsOff = dex.readUInt32LE(0x44);
const methodIdsSize = dex.readUInt32LE(0x58);
const methodIdsOff = dex.readUInt32LE(0x5C);
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
function getMethodName(mIdx) {
  return getString(dex.readUInt32LE(methodIdsOff + mIdx * 8 + 4));
}
function getMethodClass(mIdx) {
  return getTypeName(dex.readUInt16LE(methodIdsOff + mIdx * 8));
}
for (let m = 0; m < methodIdsSize; m++) {
  const cls = getMethodClass(m);
  const name = getMethodName(m);
  if (cls && cls.includes('BleConnector') && (name.includes('JNI') || name.includes('Data') || name.includes('Buffer') || name.includes('send') || name.includes('get'))) {
    console.log(`${cls}->${name}`);
  }
}
