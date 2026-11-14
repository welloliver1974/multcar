/**
 * Teste de round-trip do protocolo AD10.
 *  - Extrai buildAd10Packet() do index.html do app
 *  - Simula o parser EXATO do firmware do dongle (ble_protocol_analy_char @ 0x08005af0)
 *  - Simula o construtor de RESPOSTA do firmware (0x080065dc)
 *  - Simula o parser de resposta do app
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'multcar-app', 'www', 'index.html'), 'utf8');

// ---- extrai as funções do app ----
function extract(name) {
  const start = html.indexOf(`function ${name}(`);
  if (start < 0) throw new Error('função não encontrada: ' + name);
  let depth = 0, i = html.indexOf('{', start);
  const from = i;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  return html.slice(start, i + 1);
}

const src = [
  'let ad10TxSeq = 0;',
  extract('buildAd10Packet'),
  extract('buildAd10ConfigPayload'),
  'module.exports = { buildAd10Packet, buildAd10ConfigPayload };'
].join('\n');
fs.writeFileSync(path.join(__dirname, '_ad10_mod.js'), src);
const { buildAd10Packet, buildAd10ConfigPayload } = require('./_ad10_mod.js');

// ---- parser do firmware (TX -> dongle) ----
function firmwareParser(bytes) {
  let state = 0, buf = [], idx = 0;
  for (const c of bytes) {
    if (state === 0) { if (c === 0xAA) { state = 1; buf = [0xAA]; } continue; }
    if (state === 2) {
      if (c === 0x02) buf.push(0xAA); else if (c === 0x01) buf.push(0xAB); else buf.push(c);
      state = 1;
    } else {
      if (c === 0xAB) { state = 2; continue; }
      buf.push(c);
    }
    if (buf.length >= 3 && buf.length >= buf[2] + 5) {
      const total = buf[2] + 5;
      const frame = buf.slice(0, total);
      // checksum
      let chk = 0;
      for (let i = 1; i < frame.length - 1; i++) chk ^= frame[i];
      if (chk !== frame[frame.length - 1]) return { error: 'checksum' };
      // comando: (frame[4]<<8)|frame[3] com rev16 => (frame[3]<<8)|frame[4]
      const cmd = ((frame[3] << 8) | frame[4]) & 0xFFFF;
      return { cmd, payload: frame.slice(5, frame.length - 1), seq: frame[1], L: frame[2] };
    }
  }
  return { error: 'incompleto' };
}

// ---- construtor de RESPOSTA do firmware (dongle -> app) ----
function firmwareBuildResponse(cmd, payload, seq) {
  const raw = [0x55, seq, payload.length + 1, (cmd >> 8) & 0xFF, cmd & 0xFF, ...payload];
  let chk = 0;
  for (let i = 1; i < raw.length; i++) chk ^= raw[i];
  raw.push(chk & 0xFF);
  const out = [0x55];                       // frame[0] nunca é escapado
  for (let i = 1; i < raw.length; i++) {
    const b = raw[i];
    if (b === 0x55) out.push(0x56, 0x02);
    else if (b === 0x56) out.push(0x56, 0x01);
    else out.push(b);
  }
  return out;
}

// ---- parser de resposta do APP (novo) ----
function appParseResponse(chunks) {
  let state = 0, frame = [], out = [];
  for (const data of chunks) {
    for (const b of data) {
      if (state === 0) { if (b === 0x55) { state = 1; frame = [0x55]; } continue; }
      if (state === 2) {
        if (b === 0x02) frame.push(0x55); else if (b === 0x01) frame.push(0x56); else frame.push(b);
        state = 1;
      } else {
        if (b === 0x56) { state = 2; continue; }
        frame.push(b);
      }
      if (frame.length >= 3 && frame.length >= frame[2] + 5) {
        const total = frame[2] + 5;
        const f = frame.slice(0, total);
        let chk = 0;
        for (let i = 1; i < f.length - 1; i++) chk ^= f[i];
        if (chk !== f[f.length - 1]) { frame = []; state = 0; continue; }
        out.push({ cmd: ((f[3] << 8) | f[4]) & 0xFFFF, payload: f.slice(5, f.length - 1) });
        frame = []; state = 0;
      }
    }
  }
  return out;
}

// ===================== TESTES =====================
let fails = 0;
function check(name, cond, extra) {
  if (cond) console.log('  ✅ ' + name);
  else { console.log('  ❌ ' + name + (extra ? '  -> ' + extra : '')); fails++; }
}

console.log('\n=== 1) buildAd10Packet: framing aceito pelo firmware ===');
{
  const p = buildAd10Packet(0x6002, [0x01, 0x82]);
  console.log('     bytes: ' + Array.from(p).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' '));
  const r = firmwareParser(Array.from(p));
  check('comando reconhecido como 0x6002', r.cmd === 0x6002, 'obtido 0x' + (r.cmd || 0).toString(16));
  check('payload = [0x01, 0x82]', JSON.stringify(r.payload) === '[1,130]', JSON.stringify(r.payload));
  check('L = payload+1', r.L === 3, 'L=' + r.L);
}

console.log('\n=== 2) buildAd10Packet: big-endian do comando ===');
{
  const p = buildAd10Packet(0x6001, [0x00]);
  check('byte [3] = MSB do cmd (0x60)', p[3] === 0x60, 'p[3]=' + p[3].toString(16));
  check('byte [4] = LSB do cmd (0x01)', p[4] === 0x01, 'p[4]=' + p[4].toString(16));
}

console.log('\n=== 3) escape (byte stuffing) ===');
{
  // payload contendo 0xAA e 0xAB precisa ser escapado
  const p = buildAd10Packet(0x6002, [0xAA, 0xAB]);
  const r = firmwareParser(Array.from(p));
  check('payload com 0xAA/0xAB volta idêntico', JSON.stringify(r.payload) === '[170,171]', JSON.stringify(r.payload));
}

console.log('\n=== 4) sequência (seq) incrementa ===');
{
  const a = buildAd10Packet(0x6002, [0x01]);
  const b = buildAd10Packet(0x6002, [0x01]);
  check('seq incrementa', (b[1] - a[1]) === 1, a[1] + ' -> ' + b[1]);
}

console.log('\n=== 5) quadro de configuração CAN (0x6001) ===');
{
  const entries = [
    [0x01, [0x01]],
    [0x02, [0x00, 0x07, 0xA1, 0x20]],
    [0x10, [0x02]],
    [0x11, [0x02]],
    [0x12, [0x00, 0x00, 0x07, 0xE0, 0x00, 0x00, 0x07, 0xE8]],
    [0x04, [0x00, 0x00]],
    [0x05, [0x00, 0x02]],
    [0x06, [0x00, 0xC8]],
    [0x07, [0x50]],
    [0x0B, [0x00, 0x00]]
  ];
  const payload = buildAd10ConfigPayload(entries);
  check('payload[0] = número de entradas', payload[0] === entries.length, 'payload[0]=' + payload[0]);
  const p = buildAd10Packet(0x6001, payload);
  const r = firmwareParser(Array.from(p));
  check('comando reconhecido como 0x6001', r.cmd === 0x6001, 'obtido 0x' + (r.cmd || 0).toString(16));
  check('payload preservado', JSON.stringify(r.payload) === JSON.stringify(payload));

  // simula o despachante do firmware: percorre as entradas
  const TABLE = { 0x01: 1, 0x02: 4, 0x03: 2, 0x04: 2, 0x05: 2, 0x06: 2, 0x07: 1, 0x0B: 2,
                  0x0E: 1, 0x0F: -1, 0x10: 1, 0x11: 1, 0x12: -2, 0x16: 4 };
  let i = 1, seen = [], ok = true;
  const n = r.payload[0];
  for (let k = 0; k < n; k++) {
    const sub = r.payload[i];
    const sz = TABLE[sub];
    if (sz === undefined) { ok = false; break; }
    seen.push(sub);
    i += 1 + (sz === -1 ? 0 : (sz === -2 ? 8 : sz));
  }
  check('todas as entradas são reconhecidas pelo despachante', ok && seen.length === n, 'viu ' + seen.length + '/' + n);
  check('consumo exato dos bytes do payload', i === r.payload.length, 'i=' + i + ' len=' + r.payload.length);
}

console.log('\n=== 6) resposta 0x55 do firmware é lida pelo parser do app ===');
{
  const resp = firmwareBuildResponse(0x600A, [0x07, 0xE8, 0x04, 0x41, 0x0C, 0x1A, 0xF8], 0x05);
  const parsed = appParseResponse([resp]);
  check('quadro decodificado', parsed.length === 1, JSON.stringify(parsed));
  if (parsed.length) {
    check('cmd = 0x600A', parsed[0].cmd === 0x600A, '0x' + parsed[0].cmd.toString(16));
    check('payload correto', JSON.stringify(parsed[0].payload) === '[7,232,4,65,12,26,248]', JSON.stringify(parsed[0].payload));
  }
}

console.log('\n=== 7) resposta dividida em vários blocos BLE ===');
{
  const resp = firmwareBuildResponse(0x6002, [0x01, 0x82, 0x41, 0x42, 0x43], 0x07);
  const parsed = appParseResponse([resp.slice(0, 3), resp.slice(3, 8), resp.slice(8)]);
  check('quadro re-assemblado', parsed.length === 1, JSON.stringify(parsed));
  if (parsed.length) check('payload correto', JSON.stringify(parsed[0].payload) === '[1,130,65,66,67]', JSON.stringify(parsed[0].payload));
}

console.log('\n=== 8) resposta com escape (0x55 dentro do payload) ===');
{
  const resp = firmwareBuildResponse(0x6001, [0x55, 0x56, 0x01], 0x09);
  const parsed = appParseResponse([resp]);
  check('escape desfeito corretamente', parsed.length === 1 && JSON.stringify(parsed[0].payload) === '[85,86,1]', JSON.stringify(parsed));
}

console.log('\n' + (fails === 0 ? '🎉 TODOS OS TESTES PASSARAM' : `⚠️ ${fails} TESTE(S) FALHARAM`));
process.exit(fails === 0 ? 0 : 1);
