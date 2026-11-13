const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);
const typeIdsOff = dex.readUInt32LE(0x44);
const fieldIdsOff = dex.readUInt32LE(0x4C);
const methodIdsOff = dex.readUInt32LE(0x54);
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
  const descriptorIdx = dex.readUInt32LE(typeIdsOff + typeIdx * 4);
  return getString(descriptorIdx);
}
function getFieldName(fIdx) {
  const classIdx = dex.readUInt16LE(fieldIdsOff + fIdx * 8);
  const nameIdx = dex.readUInt32LE(fieldIdsOff + fIdx * 8 + 4);
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

for (let c = 0; c < classDefsSize; c++) {
  const cOff = classDefsOff + c * 32;
  const classIdx = dex.readUInt32LE(cOff);
  const className = getTypeName(classIdx);
  if (className === 'Lcom/diagnosis/obdbluetooth/BleConnector;') {
    console.log('Found BleConnector!');
    const classDataOff = dex.readUInt32LE(cOff + 24);
    let p = classDataOff;
    let res = readUleb128(dex, p); const sFields = res.val; p = res.next;
    res = readUleb128(dex, p); const iFields = res.val; p = res.next;
    res = readUleb128(dex, p); const dMethods = res.val; p = res.next;
    res = readUleb128(dex, p); const vMethods = res.val; p = res.next;
    for (let i = 0; i < sFields + iFields; i++) {
      res = readUleb128(dex, p); p = res.next;
      res = readUleb128(dex, p); p = res.next;
    }
    let mIdx = 0;
    for (let i = 0; i < dMethods + vMethods; i++) {
      if (i === dMethods) mIdx = 0;
      res = readUleb128(dex, p); mIdx += res.val; p = res.next;
      res = readUleb128(dex, p); p = res.next;
      res = readUleb128(dex, p); const codeOff = res.val; p = res.next;
      const mNameIdx = dex.readUInt32LE(methodIdsOff + mIdx * 8 + 4);
      const mName = getString(mNameIdx);
      console.log(`Method #${mIdx}: ${mName} at 0x${codeOff.toString(16)}`);
      if (codeOff > 0) {
        const insnsSize = dex.readUInt32LE(codeOff + 12) * 2;
        const codeStart = codeOff + 16;
        let cp = codeStart;
        while (cp < codeStart + insnsSize) {
          const op = dex[cp];
          if (op === 0x1a) {
            const sIdx = dex.readUInt16LE(cp + 2);
            console.log(`  [0x${(cp-codeStart).toString(16)}] const-string v${dex[cp+1]} = "${getString(sIdx)}"`);
            cp += 4;
          } else if (op >= 0x59 && op <= 0x6d) {
            const fIdx = dex.readUInt16LE(cp + 2);
            console.log(`  [0x${(cp-codeStart).toString(16)}] put field -> ${getFieldName(fIdx)}`);
            cp += 4;
          } else if (op >= 0x52 && op <= 0x58) {
            const fIdx = dex.readUInt16LE(cp + 2);
            console.log(`  [0x${(cp-codeStart).toString(16)}] get field -> ${getFieldName(fIdx)}`);
            cp += 4;
          } else {
            cp += 2;
          }
        }
      }
    }
  }
}
