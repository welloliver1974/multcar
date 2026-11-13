const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const e_shoff = buf.readUInt32LE(0x20);
const e_shentsize = buf.readUInt16LE(0x2e);
const e_shnum = buf.readUInt16LE(0x30);
const e_shstrndx = buf.readUInt16LE(0x32);

const shstrtab_off = buf.readUInt32LE(e_shoff + e_shstrndx * e_shentsize + 0x10);

function getSectionName(offset) {
  let end = offset;
  while (buf[end] !== 0) end++;
  return buf.toString('utf8', offset, end);
}

for (let i = 0; i < e_shnum; i++) {
  const sh_offset = e_shoff + i * e_shentsize;
  const sh_name_idx = buf.readUInt32LE(sh_offset);
  const sh_type = buf.readUInt32LE(sh_offset + 0x04);
  const sh_addr = buf.readUInt32LE(sh_offset + 0x0c);
  const sh_offset_val = buf.readUInt32LE(sh_offset + 0x10);
  const sh_size = buf.readUInt32LE(sh_offset + 0x14);
  const name = getSectionName(shstrtab_off + sh_name_idx);
  console.log(`[${i}] ${name}: addr=0x${sh_addr.toString(16)}, off=0x${sh_offset_val.toString(16)}, size=0x${sh_size.toString(16)}`);
}
