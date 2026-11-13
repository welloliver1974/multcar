const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const classDefsSize = dex.readUInt32LE(0x60);
const classDefsOff = dex.readUInt32LE(0x64);
const typeIdsSize = dex.readUInt32LE(0x40);
const typeIdsOff = dex.readUInt32LE(0x44);
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);
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
function getMethodDesc(mIdx) {
  const classIdx = dex.readUInt16LE(methodIdsOff + mIdx * 8);
  const nameIdx = dex.readUInt32LE(methodIdsOff + mIdx * 8 + 4);
  return `${getTypeName(classIdx)}->${getString(nameIdx)}`;
}
function readUleb128(buf, offset) {
  let result = 0, shift = 0, p = offset;
  while (true) {
    const b = buf[p++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
  }
  return { val: result, next: p };
}

const targetOff = 0x74dfae;

for (let c = 0; c < classDefsSize; c++) {
  const cOff = classDefsOff + c * 32;
  const classIdx = dex.readUInt32LE(cOff);
  const classDataOff = dex.readUInt32LE(cOff + 24);
  if (!classDataOff) continue;
  let p = classDataOff;
  const sf = readUleb128(dex, p); p = sf.next;
  const ifields = readUleb128(dex, p); p = ifields.next;
  const dmethods = readUleb128(dex, p); p = dmethods.next;
  const vmethods = readUleb128(dex, p); p = vmethods.next;
  for (let i = 0; i < sf.val; i++) { p = readUleb128(dex, p).next; p = readUleb128(dex, p).next; }
  for (let i = 0; i < ifields.val; i++) { p = readUleb128(dex, p).next; p = readUleb128(dex, p).next; }
  let lastMIdx = 0;
  for (let i = 0; i < dmethods.val; i++) {
    const mDiff = readUleb128(dex, p); p = mDiff.next;
    const flags = readUleb128(dex, p); p = flags.next;
    const codeOff = readUleb128(dex, p); p = codeOff.next;
    lastMIdx += mDiff.val;
    if (codeOff.val) {
      const insnsSize = dex.readUInt32LE(codeOff.val + 12) * 2;
      const start = codeOff.val + 16;
      if (targetOff >= start && targetOff < start + insnsSize) {
        console.log(`Target inside direct method: ${getMethodDesc(lastMIdx)}`);
      }
    }
  }
  lastMIdx = 0;
  for (let i = 0; i < vmethods.val; i++) {
    const mDiff = readUleb128(dex, p); p = mDiff.next;
    const flags = readUleb128(dex, p); p = flags.next;
    const codeOff = readUleb128(dex, p); p = codeOff.next;
    lastMIdx += mDiff.val;
    if (codeOff.val) {
      const insnsSize = dex.readUInt32LE(codeOff.val + 12) * 2;
      const start = codeOff.val + 16;
      if (targetOff >= start && targetOff < start + insnsSize) {
        console.log(`Target inside virtual method: ${getMethodDesc(lastMIdx)}`);
      }
    }
  }
}
