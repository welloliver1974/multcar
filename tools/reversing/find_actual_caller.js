const fs = require('fs');
const dex = fs.readFileSync('unpacked_apk/classes.dex');
const methodIdsSize = dex.readUInt32LE(0x58);
const methodIdsOff = dex.readUInt32LE(0x5C);
const typeIdsSize = dex.readUInt32LE(0x40);
const typeIdsOff = dex.readUInt32LE(0x44);
const stringIdsSize = dex.readUInt32LE(0x38);
const stringIdsOff = dex.readUInt32LE(0x3C);

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

let targetMIdx = -1;
for (let m = 0; m < methodIdsSize; m++) {
  if (getMethodDesc(m) === 'Lcom/xtooltech/ad10/Utils;->comboCanCommand') {
    targetMIdx = m;
    break;
  }
}

// In Dalvik bytecode, invoke is 0x6e..0x72 or 0x74..0x78
// Format 35c: op {vC, vD, vE, vF, vG}, meth@BBBB
// Format 3rc: op {vCCCC .. vNNNN}, meth@BBBB
// So the 16-bit word at cp + 2 is targetMIdx!
console.log(`targetMIdx = 0x${targetMIdx.toString(16)} (${targetMIdx})`);
for (let p = 0; p < dex.length - 4; p += 2) {
  const op = dex[p];
  if ((op >= 0x6e && op <= 0x72) || (op >= 0x74 && op <= 0x78)) {
    const m = dex.readUInt16LE(p + 2);
    if (m === targetMIdx) {
      console.log(`Found actual invoke at 0x${p.toString(16)} (op=0x${op.toString(16)})`);
    }
  }
}
