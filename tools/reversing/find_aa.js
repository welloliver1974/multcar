const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

// Thumb instruction: CMP r0-r7, #0xAA -> 0x28AA, 0x29AA, 0x2AAA, 0x2BAA, 0x2CAA, 0x2DAA, 0x2EAA, 0x2FAA
// Also check for 0xAA in literal or byte comparisons
for (let p = 0; p < buf.length - 2; p += 2) {
  const op = buf.readUInt16LE(p);
  const hi = op >>> 8;
  const lo = op & 0xff;
  if (lo === 0xaa && hi >= 0x20 && hi <= 0x2f) {
    const reg = hi & 0x7;
    const isCmp = (hi & 0x8) !== 0;
    console.log(`0x${p.toString(16)}: ${isCmp ? 'CMP' : 'MOV'} r${reg}, #0xAA`);
  }
}
