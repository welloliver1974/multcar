// Valida a sintaxe dos blocos <script> do index.html (ferramenta permanente)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'multcar-app/www/index.html'), 'utf8');
const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let m, i = 0, ok = true;
while ((m = re.exec(html)) !== null) {
  const code = m[1].trim();
  if (code.length < 50) continue;
  i++;
  try {
    new vm.Script(code, { filename: `script#${i}.js` });
    console.log(`script #${i}: OK (${code.length} bytes)`);
  } catch (e) {
    ok = false;
    console.error(`script #${i}: ERRO -> ${e.message}`);
  }
}
process.exit(ok ? 0 : 1);
