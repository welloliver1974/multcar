const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);
const typeIdsSize = dex.readUInt32LE(0x40);
const typeIdsOff = dex.readUInt32LE(0x44);
const fieldIdsSize = dex.readUInt32LE(0x50);
const fieldIdsOff = dex.readUInt32LE(0x54);
const methodIdsSize = dex.readUInt32LE(0x58);
const methodIdsOff = dex.readUInt32LE(0x5C);
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
function getMethodName(mIdx) {
  return getString(dex.readUInt32LE(methodIdsOff + mIdx * 8 + 4));
}
function getMethodClass(mIdx) {
  return getTypeName(dex.readUInt16LE(methodIdsOff + mIdx * 8));
}
function getMethodDesc(mIdx) {
  return `${getMethodClass(mIdx)}->${getMethodName(mIdx)}`;
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

function disasmClass(targetClassName) {
  for (let c = 0; c < classDefsSize; c++) {
    const cOff = classDefsOff + c * 32;
    const classIdx = dex.readUInt32LE(cOff);
    const className = getTypeName(classIdx);
    if (className === targetClassName) {
      console.log(`\n======================================================`);
      console.log(`Disassembling ${className}`);
      console.log(`======================================================`);
      const classDataOff = dex.readUInt32LE(cOff + 24);
      let p = classDataOff;
      const sf = readUleb128(dex, p); p = sf.next;
      const ifields = readUleb128(dex, p); p = ifields.next;
      const dmethods = readUleb128(dex, p); p = dmethods.next;
      const vmethods = readUleb128(dex, p); p = vmethods.next;
      for (let i = 0; i < sf.val; i++) { p = readUleb128(dex, p).next; p = readUleb128(dex, p).next; }
      for (let i = 0; i < ifields.val; i++) { p = readUleb128(dex, p).next; p = readUleb128(dex, p).next; }
      let lastMIdx = 0;
      const allMethods = [];
      for (let i = 0; i < dmethods.val; i++) {
        const mDiff = readUleb128(dex, p); p = mDiff.next;
        const flags = readUleb128(dex, p); p = flags.next;
        const codeOff = readUleb128(dex, p); p = codeOff.next;
        lastMIdx += mDiff.val;
        allMethods.push({ mIdx: lastMIdx, codeOff: codeOff.val });
      }
      lastMIdx = 0;
      for (let i = 0; i < vmethods.val; i++) {
        const mDiff = readUleb128(dex, p); p = mDiff.next;
        const flags = readUleb128(dex, p); p = flags.next;
        const codeOff = readUleb128(dex, p); p = codeOff.next;
        lastMIdx += mDiff.val;
        allMethods.push({ mIdx: lastMIdx, codeOff: codeOff.val });
      }
      for (const m of allMethods) {
        console.log(`\nMethod: ${getMethodDesc(m.mIdx)} (code: 0x${m.codeOff.toString(16)})`);
        if (!m.codeOff) continue;
        const insnsSize = dex.readUInt32LE(m.codeOff + 12) * 2;
        const codeStart = m.codeOff + 16;
        let cp = codeStart;
        while (cp < codeStart + insnsSize) {
          const op = dex[cp];
          const off = (cp - codeStart).toString(16).padStart(4, '0');
          if (op === 0x1a) {
            const sIdx = dex.readUInt16LE(cp + 2);
            console.log(`  0x${off}: const-string "${getString(sIdx)}"`);
            cp += 4;
          } else if (op === 0x1b) {
            const sIdx = dex.readUInt32LE(cp + 2);
            console.log(`  0x${off}: const-string/jumbo "${getString(sIdx)}"`);
            cp += 6;
          } else if (op >= 0x6e && op <= 0x72) {
            const mIdx = dex.readUInt16LE(cp + 2);
            console.log(`  0x${off}: invoke ${getMethodDesc(mIdx)}`);
            cp += 6;
          } else {
            cp += 2;
          }
        }
      }
    }
  }
}

disasmClass('Lcom/xtooltech/ad10/AD10Device;');
disasmClass('Lcom/xtooltech/ad10/Utils;');
