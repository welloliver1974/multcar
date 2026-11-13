const fs = require('fs');
const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

function find(str) {
  let idx = 0;
  console.log(`Searching for "${str}":`);
  while ((idx = buf.indexOf(str, idx)) !== -1) {
    console.log(`  Found at 0x${idx.toString(16)}`);
    idx += str.length;
  }
}

find('CAN,std');
find('enterSystem');
find('createDevice');
find('5005');
find('AD10');
find('sendDataJNI');
