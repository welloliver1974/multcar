const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find offset of "sendDataJNI" string
const sendStr = buf.indexOf('sendDataJNI\0');
console.log('sendDataJNI string at: 0x' + sendStr.toString(16));

// Find offset of "getDataJNI" string
const getStr = buf.indexOf('getDataJNI\0');
console.log('getDataJNI string at: 0x' + getStr.toString(16));

// Find pointer references in the whole binary (either exact offset or in rel.dyn)
const sBuf = Buffer.alloc(4);
sBuf.writeUInt32LE(sendStr);

let p = 0;
while ((p = buf.indexOf(sBuf, p)) !== -1) {
  console.log('Reference to sendDataJNI string at: 0x' + p.toString(16));
  p += 4;
}

const gBuf = Buffer.alloc(4);
gBuf.writeUInt32LE(getStr);

p = 0;
while ((p = buf.indexOf(gBuf, p)) !== -1) {
  console.log('Reference to getDataJNI string at: 0x' + p.toString(16));
  p += 4;
}
