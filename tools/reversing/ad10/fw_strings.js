const fs = require("fs");

function strings(buf, min = 4) {
  const out = [];
  let cur = "";
  let start = 0;
  for (let i = 0; i < buf.length; i++) {
    const c = buf[i];
    if (c >= 0x20 && c < 0x7f) {
      if (cur.length === 0) start = i;
      cur += String.fromCharCode(c);
    } else {
      if (cur.length >= min) out.push({ off: start, s: cur });
      cur = "";
    }
  }
  if (cur.length >= min) out.push({ off: start, s: cur });
  return out;
}

const target = process.argv[2];
const min = parseInt(process.argv[3] || "4", 10);
const buf = fs.readFileSync(target);
const ss = strings(buf, min);
console.log("=== " + target + " strings (" + ss.length + ") ===");
for (const { off, s } of ss) {
  console.log("0x" + off.toString(16).padStart(6, "0") + "  " + s);
}
