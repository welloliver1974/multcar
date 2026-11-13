const fs = require('fs');

const buf = fs.readFileSync('unpacked_apk/lib/armeabi-v7a/libobdcore.so');

// Find all functions mentioning CAD10 or AD10 in .dynsym or symbol names
// Let's search strings for mangled C++ names:
// _ZN9CAD10...
const mangled = [];
let p = 0;
while ((p = buf.indexOf('_ZN9CAD10', p)) !== -1) {
  let end = p;
  while (buf[end] !== 0) end++;
  mangled.push({ off: p, name: buf.toString('utf8', p, end) });
  p = end + 1;
}

console.log('Mangled CAD10 symbols in armeabi-v7a:', mangled.length);
mangled.forEach(m => console.log(`  [0x${m.off.toString(16)}] ${m.name}`));

// Also check arm64
const buf64 = fs.readFileSync('unpacked_apk/lib/arm64-v8a/libobdcore.so');
const mangled64 = [];
p = 0;
while ((p = buf64.indexOf('_ZN9CAD10', p)) !== -1) {
  let end = p;
  while (buf64[end] !== 0) end++;
  mangled64.push({ off: p, name: buf64.toString('utf8', p, end) });
  p = end + 1;
}
console.log('\nMangled CAD10 symbols in arm64:', mangled64.length);
mangled64.forEach(m => console.log(`  [0x${m.off.toString(16)}] ${m.name}`));
