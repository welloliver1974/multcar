const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const dynsym_off = 0x148;
const dynsym_size = 0x2280;
const dynstr_off = 0x23c8;

function getString(offset) {
  let end = dynstr_off + offset;
  while (buf[end] !== 0) end++;
  return buf.toString('utf8', dynstr_off + offset, end);
}

for (let p = dynsym_off; p < dynsym_off + dynsym_size; p += 16) {
  const st_name = buf.readUInt32LE(p);
  const st_value = buf.readUInt32LE(p + 4);
  const st_size = buf.readUInt32LE(p + 8);
  const name = getString(st_name);
  if (name.includes('AD10') || name.includes('Prot') || name.includes('Device')) {
    console.log(`0x${st_value.toString(16)} (${st_size}b): ${name}`);
  }
}
