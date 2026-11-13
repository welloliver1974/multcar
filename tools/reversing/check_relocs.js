const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

const rel_dyn_off = 0x64dc;
const rel_dyn_size = 0x1ba0;

for (let p = rel_dyn_off; p < rel_dyn_off + rel_dyn_size; p += 8) {
  const r_offset = buf.readUInt32LE(p);
  const r_info = buf.readUInt32LE(p + 4);
  const r_type = r_info & 0xff;
  if (r_type === 0x17) { // R_ARM_RELATIVE
    // Look at what is at r_offset
    // Find the file offset corresponding to r_offset (in .data.rel.ro, virtual addr 0x60000+ maps to file off 0x5f000+)
    // let's calculate file offset:
    let fileOff = 0;
    if (r_offset >= 0x60c00) {
      fileOff = r_offset - 0x1000; // 0x60c00 -> 0x5fc00
    } else {
      fileOff = r_offset;
    }
    if (fileOff >= 0 && fileOff < buf.length - 4) {
      const val = buf.readUInt32LE(fileOff);
      if (val >= 0x5b900 && val <= 0x5c000) {
        console.log(`Reloc at 0x${r_offset.toString(16)} (file 0x${fileOff.toString(16)}) -> targets 0x${val.toString(16)}`);
      }
    }
  }
}
