const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/arm64-v8a/libobdcore.so');

// Find .dynsym
const e_shoff = Number(buf.readBigUInt64LE(0x28));
const e_shentsize = buf.readUInt16LE(0x3a);
const e_shnum = buf.readUInt16LE(0x3c);
const e_shstrndx = buf.readUInt16LE(0x3e);

const strtabSec = e_shoff + e_shstrndx * e_shentsize;
const strtabOff = Number(buf.readBigUInt64LE(strtabSec + 24));

function getSecName(offset) {
  let p = strtabOff + offset;
  let end = p;
  while (buf[end] !== 0) end++;
  return buf.toString('utf8', p, end);
}

let dynsym = null;
for (let i = 0; i < e_shnum; i++) {
  const sOff = e_shoff + i * e_shentsize;
  const name = getSecName(buf.readUInt32LE(sOff));
  if (name === '.dynsym') {
    dynsym = {
      offset: Number(buf.readBigUInt64LE(sOff + 24)),
      size: Number(buf.readBigUInt64LE(sOff + 32)),
      link: buf.readUInt32LE(sOff + 40),
      entsize: Number(buf.readBigUInt64LE(sOff + 56))
    };
  }
}

if (dynsym) {
  const strSec = e_shoff + dynsym.link * e_shentsize;
  const strOff = Number(buf.readBigUInt64LE(strSec + 24));
  function getSymName(off) {
    let p = strOff + off;
    let end = p;
    while (buf[end] !== 0) end++;
    return buf.toString('utf8', p, end);
  }
  const count = dynsym.size / dynsym.entsize;
  for (let i = 0; i < count; i++) {
    const symOff = dynsym.offset + i * dynsym.entsize;
    const st_name = buf.readUInt32LE(symOff);
    const st_value = Number(buf.readBigUInt64LE(symOff + 8));
    const name = getSymName(st_name);
    if (name.includes('nativeInitDevice') || name.includes('nativeEnterSystem') || name.includes('nativeSendReceive')) {
      console.log(`64-bit Symbol: ${name} at 0x${st_value.toString(16)}`);
    }
  }
}
