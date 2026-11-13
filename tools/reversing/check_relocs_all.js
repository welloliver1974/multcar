const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const rel_dyn_off = 0x64dc;
const rel_dyn_size = 0x1ba0;

for (let p = rel_dyn_off; p < rel_dyn_off + rel_dyn_size; p += 8) {
  const r_offset = buf.readUInt32LE(p);
  const r_info = buf.readUInt32LE(p + 4);
  const r_type = r_info & 0xff;
  if (r_type === 0x17) { // R_ARM_RELATIVE
    let fileOff = r_offset >= 0x60c00 ? r_offset - 0x1000 : r_offset;
    if (fileOff >= 0 && fileOff <= buf.length - 4) {
      const val = buf.readUInt32LE(fileOff);
      if (val >= 0x5b980 && val <= 0x5ba50) {
        console.log(`Reloc at 0x${r_offset.toString(16)} (file 0x${fileOff.toString(16)}) -> 0x${val.toString(16)}`);
      }
    }
  }
}
