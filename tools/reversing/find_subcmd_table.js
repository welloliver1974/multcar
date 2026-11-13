const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// In ble_obd.bin, search for a table of 7 entries of 8 bytes (or 4 bytes)
// with sub-command IDs
for (let p = 0; p < buf.length - 56; p += 4) {
  // Check if p has subcommands:
  // Let's check if p has bytes like 0x80, 0x81, 0x83 or 1, 2, 3
  const b0 = buf[p];
  const b8 = buf[p + 8];
  const b16 = buf[p + 16];
  const b24 = buf[p + 24];
  if (b0 === 0x80 || b0 === 0x81 || b0 === 0x83 || b0 === 0x01) {
    // Check if subsequent entries also look like subcommands and function pointers
    const fn0 = buf.readUInt32LE(p + 4);
    const fn1 = buf.readUInt32LE(p + 12);
    if (fn0 >= 0x08000000 && fn0 < 0x08010000 && fn1 >= 0x08000000 && fn1 < 0x08010000) {
      console.log(`Table found at 0x${p.toString(16)}:`);
      for (let k = 0; k < 7; k++) {
        const id = buf.readUInt32LE(p + k * 8);
        const fn = buf.readUInt32LE(p + k * 8 + 4);
        console.log(`  Entry ${k}: id=0x${id.toString(16)}, fn=0x${fn.toString(16)} (off 0x${(fn - 0x08000000).toString(16)})`);
      }
    }
  }
}
