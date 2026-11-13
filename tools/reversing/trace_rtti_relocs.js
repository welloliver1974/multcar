const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Search for any 32-bit LE word pointing to 0x5fefc or 0x5fef8
function findWord(val) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(val);
  let p = 0;
  const matches = [];
  while ((p = buf.indexOf(b, p)) !== -1) {
    matches.push(p);
    p += 4;
  }
  return matches;
}

console.log('Matches for 0x5fefc:', findWord(0x5fefc).map(x => '0x' + x.toString(16)));
console.log('Matches for 0x5fef8:', findWord(0x5fef8).map(x => '0x' + x.toString(16)));

// Let's also check in .rel.dyn
// In ELF, relocations in .rel.dyn: r_offset (uint32), r_info (uint32)
// For R_ARM_RELATIVE (type 23 = 0x17), r_info & 0xff == 0x17
// The location buf.readUInt32LE(r_offset) has the addend!
const e_shoff = buf.readUInt32LE(0x20);
const e_shentsize = buf.readUInt16LE(0x2e);
const e_shnum = buf.readUInt16LE(0x30);
const e_shstrndx = buf.readUInt16LE(0x32);
const strtabOff = buf.readUInt32LE(e_shoff + e_shstrndx * e_shentsize + 16);

function getSecName(offset) {
  let p = strtabOff + offset;
  let end = p;
  while (buf[end] !== 0) end++;
  return buf.toString('utf8', p, end);
}

for (let i = 0; i < e_shnum; i++) {
  const sOff = e_shoff + i * e_shentsize;
  const name = getSecName(buf.readUInt32LE(sOff));
  if (name === '.rel.dyn') {
    const offset = buf.readUInt32LE(sOff + 16);
    const size = buf.readUInt32LE(sOff + 20);
    const count = size / 8;
    console.log(`Found .rel.dyn at 0x${offset.toString(16)} with ${count} entries`);
    for (let r = 0; r < count; r++) {
      const r_offset = buf.readUInt32LE(offset + r * 8);
      const r_info = buf.readUInt32LE(offset + r * 8 + 4);
      const target = buf.readUInt32LE(r_offset);
      if (target === 0x5fefc || target === 0x5fef8 || target === 0x5e1b0) {
        console.log(`Relocation at 0x${r_offset.toString(16)} points to target 0x${target.toString(16)} (type: ${r_info & 0xff})`);
      }
    }
  }
}
