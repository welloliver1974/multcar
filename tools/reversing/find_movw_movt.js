const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

function searchTarget(targetAddr, name) {
  console.log(`\nSearching target 0x${targetAddr.toString(16)} (${name}):`);
  const targetOff = targetAddr - 0x08000000;
  const lo16 = targetAddr & 0xffff;
  const hi16 = (targetAddr >>> 16) & 0xffff;

  for (let p = 0; p < buf.length - 8; p += 2) {
    // Check ADR: ADR.W Rd, label
    // Check MOVW / MOVT
    const w1 = buf.readUInt16LE(p);
    const w2 = buf.readUInt16LE(p + 2);
    // MOVW: 1111 0 i 10 0 1 0 0 imm4  0 imm3 Rd imm8
    if ((w1 & 0xfbf0) === 0xf240 && (w2 & 0x8000) === 0) {
      const imm4 = w1 & 0x0f;
      const i = (w1 >> 10) & 1;
      const imm3 = (w2 >> 12) & 7;
      const imm8 = w2 & 0xff;
      const val = (imm4 << 12) | (i << 11) | (imm3 << 8) | imm8;
      if (val === lo16) {
        console.log(`  MOVW at 0x${p.toString(16)}: lo16=0x${val.toString(16)}`);
      }
    }
  }
}

searchTarget(0x8004c14, "send_can_id");
searchTarget(0x8004b38, "obd_protocol");
searchTarget(0x8003cf4, "can_type");
searchTarget(0x8007ad8, "obd systerm enter");
searchTarget(0x8006e44, "iso 15765 enter");
