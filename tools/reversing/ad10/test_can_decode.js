/**
 * Testa o decoder de frames CAN (handleAd10CanFrame) do app contra
 * diferentes layouts de payload que o dongle pode enviar.
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'multcar-app', 'www', 'index.html'), 'utf8');

function extract(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('não encontrada: ' + name);
  let depth = 0, i = html.indexOf('{', start);
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  return html.slice(start, i + 1);
}

const src = `
let CAPTURED = [];
function hexDump(a){return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join(' ');}
function logBle(m){}
function handleObdPidResponse(pid,a,b){ CAPTURED.push({pid,a,b}); }
function renderDtcResults(b){ CAPTURED.push({dtc:[...b]}); }
${extract('handleAd10CanFrame')}
module.exports = { handleAd10CanFrame, CAPTURED };
`;
fs.writeFileSync(path.join(__dirname, '_can_mod.js'), src);
const { handleAd10CanFrame, CAPTURED } = require('./_can_mod.js');

let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ✅ ' + name);
  else { console.log('  ❌ ' + name + (extra ? '  -> ' + extra : '')); fails++; }
}

function run(payload) {
  CAPTURED.length = 0;
  handleAd10CanFrame(payload);
  return CAPTURED[0];
}

console.log('\n=== Layout A: [len][41][PID][A][B] ===');
{
  const r = run([0x04, 0x41, 0x0C, 0x1A, 0xF8]);
  check('PID 0x0C detectado', r && r.pid === 0x0C, JSON.stringify(r));
  check('A=0x1A B=0xF8', r && r.a === 0x1A && r.b === 0xF8, JSON.stringify(r));
}

console.log('\n=== Layout B: [DLC][len][41][PID][A][B] ===');
{
  const r = run([0x08, 0x04, 0x41, 0x0C, 0x1A, 0xF8, 0x00, 0x00]);
  check('PID 0x0C detectado', r && r.pid === 0x0C, JSON.stringify(r));
  check('A/B corretos', r && r.a === 0x1A && r.b === 0xF8, JSON.stringify(r));
}

console.log('\n=== Layout C: [len][ID_HI][ID_LO][DLC][len][41][PID][A][B] ===');
{
  const r = run([0x09, 0x07, 0xE8, 0x08, 0x04, 0x41, 0x0D, 0x1E, 0x00]);
  check('PID 0x0D (velocidade) detectado', r && r.pid === 0x0D, JSON.stringify(r));
  check('A=0x1E', r && r.a === 0x1E, JSON.stringify(r));
}

console.log('\n=== Layout D: DLC + padding GM 0x55 ===');
{
  const r = run([0x08, 0x05, 0x41, 0x05, 0x50, 0x55, 0x55, 0x55]);
  check('PID 0x05 (temperatura) detectado', r && r.pid === 0x05, JSON.stringify(r));
  check('A=0x50 (=> 40°C)', r && r.a === 0x50, JSON.stringify(r));
}

console.log('\n=== Layout E: sem byte de comprimento (fallback) ===');
{
  const r = run([0x41, 0x0B, 0x20, 0x00]);
  check('PID 0x0B (MAP) detectado', r && r.pid === 0x0B, JSON.stringify(r));
}

console.log('\n=== Layout F: payload sem resposta OBD (não deve quebrar) ===');
{
  const r = run([0x02, 0x03, 0x04]);
  check('nenhuma leitura espúria', r === undefined, JSON.stringify(r));
}

console.log('\n' + (fails === 0 ? '🎉 TODOS OS TESTES PASSARAM' : `⚠️ ${fails} TESTE(S) FALHARAM`));
process.exit(fails === 0 ? 0 : 1);
