const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/assets/ble_obd.bin');

function searchString(str) {
  const off = buf.indexOf(str);
  console.log(`String "${str}" at offset 0x${off.toString(16)} (addr 0x${(0x8000000 + off).toString(16)})`);
  const target = 0x8000000 + off;
  for (let p = 0; p < buf.length - 4; p += 2) {
    if (buf.readUInt32LE(p) === target) {
      console.log(`  Referenced in literal pool at 0x${p.toString(16)}`);
    }
  }
}

searchString('[ble] send_can_id');
searchString('[ble] obd_protocol');
searchString('[ble] can_type');
searchString('[obd_scan] obd systerm enter');
searchString('[obd_scan] iso 15765 enter');
