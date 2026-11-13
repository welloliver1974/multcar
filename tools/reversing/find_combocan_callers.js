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

// Find method index of comboCanCommand
let targetMIdx = -1;
for (let m = 0; m < methodIdsSize; m++) {
  const desc = getMethodDesc(m);
  if (desc === 'Lcom/xtooltech/ad10/Utils;->comboCanCommand') {
    targetMIdx = m;
    console.log(`Found comboCanCommand at methodIdx: ${m}`);
    break;
  }
}

// Now search for invokes of targetMIdx in classes.dex
const targetLo = targetMIdx & 0xff;
const targetHi = (targetMIdx >> 8) & 0xff;
for (let p = 0; p < dex.length - 4; p += 2) {
  const op = dex[p];
  if ((op >= 0x6e && op <= 0x72) || (op >= 0x74 && op <= 0x78)) {
    if (dex[p + 2] === targetLo && dex[p + 3] === targetHi) {
      console.log(`Invoke found at offset 0x${p.toString(16)}!`);
    }
  }
}
