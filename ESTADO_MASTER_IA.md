# 📋 ESTADO-MASTER DO PROJETO MULTCAR PRO — Para qualquer IA continuar daqui

> **Última atualização:** 20/nov/2026 · **Versão atual do código:** v1.6.6 (badge `v1.6.6 • 20/11`)
> **Último commit:** `5ad12c8` · **Branch:** `main` sincronizado com origin ✅
>
> ## 🏆 SUCESSO NO CARRO (19/11) — O APP ESTÁ PRONTO E FUNCIONANDO!
> Teste de campo confirmou: o carro responde **todos os PIDs**. Prints e log mostram
> **RPM 1020–1259**, velocidade 2–21 km/h, temperatura 28–50 °C, alternador 14,2–14,8 V — tudo ao vivo.
> O protocolo `0x6009` replicado do `blecmd.log` está **100% validado no veículo**.
>
> **Versões finais do dia 19/11 (todas commitadas):**
> - v1.6.0 → 26 PIDs + painel flutuante (que ficou ruim, removido depois)
> - v1.6.1 → removeu overlay + RPM prioritário (a cada 2 ciclos)
> - v1.6.2 → nova **aba 📈 Dados** com 18 sensores (no lugar do overlay)
> - v1.6.3 → **IA ajustada**: Gemini removido, OpenRouter padrão, OmniRoute adicionado
> - v1.6.4 → **polling fluido (120ms) + reconexão sem duplicatas** (corrigiu travamento e desconexão do log 07:47)
> - v1.6.5 → aba Bateria ligada à tensão real (PID 0x42)
> - v1.6.6 → **sequência de PIDs EXATA do app oficial** (descoberta 40 PIDs + polling `05 05 0C 10 0D` a 90ms) — RPM agora a cada ~450ms
> - v1.6.7 → **VIN real da ECU** via modo 09 PID 02 (aba Veículo antes tinha valores fixos)

**ℹ️ Sobre o CONSUMO (pergunta do usuário em 20/11):** o AD10 **não fornece consumo**.
O app calcula via **Speed-Density**: `L/h = RPM × MAP(kPa) × 0.00034 × (1 + LTFT/100)`,
com RPM/MAP/LTFT **reais do AD10** (PIDs 0x0C/0x0B/0x07). É uma **estimativa** (o app
oficial XTOOL também calcula, não lê consumo direto). Confiável como tendência, não medição exata.
> **📌 Único ajuste cosmético pendente (opcional):** suprimir o toast "💡 Dica de Comunicação"
> que aparece quando o dongle ainda não respondeu (falso positivo no início).

---

## 1. 🎯 O OBJETIVO (o que o usuário quer de verdade)

Fazer o app **Multcar Pro** ler **telemetria OBD2 em tempo real** (RPM, velocidade, etc.)
do dongle **XTOOL Advancer AD10 (BLE)** num **Chevrolet Prisma 1.4 SPE/4 Flex 2015**.

- **Problema histórico:** "TX sobe, RX = 0" — persistiu da v1.2.0 à v1.2.4.
- **Usuário está exausto** e quer fechar o app. Tem pressa, mas **NÃO quer arriscar a bateria
  do carro** (já descarregou uma vez em 15/11 por deixar ignição ligada ~2 h nos testes).
- **Restrição de gasolina:** todos os testes são com **ignição II, motor DESLIGADO** (0 consumo).
- **Alvos:** K2401 head unit (Android 10, 1024×600) e celular SM-A566E (Android 17).

---

## 2. ✅ O QUE JÁ FOI FEITO E PROVADO (não refazer)

### 2.1. O protocolo BLE binário está 100% decifrado e correto

Fonte da verdade: `PROTOCOLO_AD10_REVERIFICADO.md`. Validado em **3 frentes**:
firmware do dongle (`unpacked_apk/assets/ble_obd.bin`, base `0x08002000`),
app oficial (`unpacked_apk/lib/arm64-v8a/libobdcore.so`) e testes de campo via logcat.

| Item | Status | Evidência |
|---|---|---|
| Framing `AA seq len cmd payload chk` | ✅ | idêntico ao `frame_builder @ 0x18040` do app oficial |
| **Cmd BIG-ENDIAN** (bug da v1.2.4) | ✅ | `rev16 @ 0x0800766a`; `set_cmd @ 0x1a4c4` grava byte alto primeiro |
| Resposta `0x55` / escape `0x56` (bug da v1.2.4) | ✅ | logs de campo + firmware |
| Tabela sub-comandos `0x6001` (`0x01..0x16`) | ✅ | tabela firmware `0x0800bc3c` |
| Sub `0x80`=volt, `0x81`=versão, `0x82`=SN | ✅ | logcat ao vivo (V01.20, ~11–15 V) |
| `0x600B` = ACK de config, payload `[cmdHi,cmdLo,status]`, status `0x01`=aceito | ✅ | firmware `0x08006246` |

### 2.2. A sequência de inicialização correta (implementada)

```
0x6002  → sondagem (SN / versão V01.20 / tensão / status)
0x6001  → config CAN (bps, filtros, protocolo, períodos)
0x6003/0x05 → can_scan  → LIGA o scanner CAN e REINICIA o dongle
silêncio 20 s → RECONEXÃO automática → reaplica config
polling: 0x6001 [01][0F][frame CAN 10B]  +  0x6001 [01][16][CAN ID]
```

### 2.3. Bugs já corrigidos (histórico de versões)

| Versão | Correção |
|---|---|
| v1.2.5 | little-endian → big-endian; decoder `0xAB` → `0x55/0x56`; tabelas de sub-comandos |
| v1.3.4 | descoberto `can_scan` (`0x6003/0x05`) — reinicia o dongle; silence + auto-reconnect |
| v1.3.5 | envelope oficial `0x6001[01][0F][CAN 10B]` |
| v1.3.8 | **loop infinito do can_scan** (flag zerada dentro de `initAd10Device`) |
| v1.3.9 | filtros CAN oficiais `07DF/07E0/07F0` + enter system por ECU |
| v1.4.0 | **exportar log completo** (botões Copiar / Salvar .txt — Plugins Filesystem+Share) |
| v1.4.1 | `protocolo 0x07` no topo do sweep (do `initDevice` do app oficial) |

### 2.4. Link BLE e log

- ✅ Link BLE **estável** (não desconecta mais durante o teste).
- ✅ Log exportável: modal de Diagnóstico tem **📋 Copiar log inteiro** e **💾 Salvar/compartilhar .txt**.
  Buffer de log ampliado de 120 → **2000 linhas**.
- Badge no topo mostra a versão (texto curto pra não estourar a tela da K2401).

### 2.5. Ferramentas de RE (todas em `tools/reversing/ad10/`)

- `fw_selfcheck.py` — valida base/alinhamento/tabelas (rode ANTES de qualquer RE)
- `fw_dis.py` / `fw_dis2.py` — disassembla firmware (base `0x08002000`; endereço ímpar = bit Thumb → subtrair 1)
- `so_dis.py` — disassembla `libobdcore.so` (ARM64; ⚠️ era `open(PATH)` → corrigido para `open(FW)`)
- `decode_btsnoop.py` — decodifica `.btsnoop` em escritas ATT
- `capturar_oficial.ps1` — Fase C da captura HCI
- `preparar_snoop.ps1` — Fase A da captura HCI (novo)
- `test_frame.js` / `test_can_decode.js` — testes de round-trip
- `README.md` — endereços-chave (JNI: `nativeEnterSystem @ 0xda24`, `nativeSendReceive @ 0x10cc0`, etc.)
- `tools/validate_js.js` — valida sintaxe dos `<script>` do index.html

---

## 3. ❌ O QUE NÃO FUNCIONA (RESOLVIDO em 18/11 — veja §3.3)

### 3.1. Sintoma (4 testes: v1.3.9, v1.4.0, v1.4.1)
Só ACK `0x600B`, nunca `0x600A`. Handshake OK, ECU muda.

### 3.2. Causa (antiga, agora entendida)
Estávamos mandando o **comando errado**: `0x6001 [01][0F][frame]` pra pedir PID.
O app oficial usa **`0x6009`**. Chutar protocolo/filtro não resolvia.

### 3.3. ✅ DESCOBERTA DECISIVA (18/11) — `blecmd.log` do app oficial

**Achado em `C:\Users\welld\AppData\Local\Temp\blecmd.log`** (1,1 MB, gravado pelo próprio
app oficial XTOOL em **15/11**, loga `sendDataJNI:` = TX e `read:` = RX com todos os bytes).
Cópia salva em `scratch/capture/blecmd_oficial.log`. **3925 respostas `0x600A` reais** = o carro
respondendo (RPM `41 0C 00 00`, VIN, coolant, battery etc).

**O protocolo EXATO do app oficial (replicado na v1.5.0):**

1. **Config (1x):** `AA seq 28 60 01 0C 0E 00 13 00 02 00 07 A1 20 10 02 11 02
   12 00 00 07 E0 00 00 00 0F 01 00 06 00 00 05 00 02 04 00 C8 03 00 50 07 00 chk`
   → 12 sub-comandos: protocolo **`0x00`**, filtros **`0x07E0` + `0x000F`**,
   frame2frame=`0x00C8` (200), bye2bye=`0x0050` (80).
2. **Pedido de cada PID (centenas de vezes):** `AA seq 0D 60 09 0B 08 07 DF 02 01 <PID> 00 00 00 00 00 chk`
   → **cmd `0x6009`**, payload `[0B][08][07 DF][02][01][PID][00×5]`. O `0B`=tamanho, `08`=DLC,
   `07 DF`=CAN ID broadcast, `02`=len ISO-TP, `01`=modo 1, PID (0x00,0x0C,0x20,0x40,0x60...).
3. **Resposta:** `0x600A payload=[0B][08][07 E8][len][41][PID][A][B][C][D]...`
   → `41`=modo 1 resposta; `41 0C A B` = RPM `((A*256)+B)/4` (774 respostas reais no log).
4. **NUNCA manda `0x6003` (can_scan)** — removido do handshake.

**Implementado na v1.5.0:** `sendAd10ObdRequestOficial(pid)`, config de 12 subs copiada
byte a byte, can_scan removido, decoder `0x600A` validado contra os bytes reais.

**v1.6.0 (18/11 — app "bem completo"):** ampliado pra **26 PIDs** no polling
(RPM, vel, temp, load, MAF, TPS, tensão, MAP, lambda, EGR, combustível, avanço, etc.);
decoder aceita bytes C/D e tem cases pra todos; **painel flutuante "Dados Estendidos"**
mostra os valores em tempo real; polling simplificado (só `0x6009`, sem reenvio de config,
idêntico ao oficial).

➡️ **Falta só o teste final no carro** (5 min, chave II). Se aparecer `🛰️ Frame CAN ID 0x07E8`
e `📊 Resposta OBD2 PID=0x0C` → **FECHAR O APP**.

> Outros logs uteis em `/Temp/`: `debug20261115114222.log`, `debug20261115114617.log`
> (e `debug*.log` de 01 e 07/11) — outro material do app oficial, nao analisado a fundo.

---

## 4. 🎯 O QUE FALTA (o próximo passo exato)

### 🔥 DESCOBERTA EM 18/11: os logs do app oficial JÁ EXISTEM no celular!

O `logcat_full.log` (15/11, 36 MB) prova que o app oficial **gravou 8–9 arquivos de log**
e o upload **falhou por certificado** — então os arquivos **ainda estão no celular**:

```
11-15 11:44:37 D LogSpecial: upload log file start service,file count=8
11-15 11:46:17 W LogSpecial: at LogSpecial.endRecordLogCmd(LogSpecial.java:359)
11-15 11:44:38 I LogSpecial: upload log file error: CertPathValidatorException
11-15 11:47:37 D LogSpecial: upload log file start service,file count=9
```

Caminhos extraídos do dex: **`/BLELogs/`**, `/DbgLogs/`, `/LogSpecial/`, `AD10Log.zip`, `AD10debug.txt`.
O app estava lendo a ECU com sucesso (`CmdToObd` → run_avgfuel, coolant, battery) quando gravou.

➡️ **NOVO PLANO (sem ir ao carro):**
1. Conectar celular no **USB do PC** e me falar **"puxar logs"**.
2. Eu rodo `tools\reversing\ad10\puxar_logs_app_oficial.ps1` → traz os `/BLELogs/` pra `scratch/capture/app_oficial_logs/`.
3. Extraio os bytes BLE exatos (escritas ATT) → comparo com o nosso log → patch 1:1 → rebuild → teste final (5 min, chave II).

### 📋 Plano alternativo (se os logs não estiverem mais no celular)

Roteiro em **`CAPTURA_HCI_ROTEIRO.md`** (3 fases, minimiza tempo no carro):

| Fase | Onde | Ação | Tempo |
|---|---|---|---|
| **A** | Em casa, PC | Conectar celular USB → rodar `tools\reversing\ad10\preparar_snoop.ps1` (ativa HCI snoop) + reiniciar Bluetooth | 2 min |
| **B** | No carro | AD10 no OBD2, chave II (motor DESLIGADO), abrir **app oficial XTOOL**, deixar ler ~15 s, desligar | ~1 min |
| **C** | Em casa, PC | Conectar USB → rodar `tools\reversing\ad10\capturar_oficial.ps1` → extrai `.btsnoop` do bugreport e decodifica com `decode_btsnoop.py` | 3 min |

**Depois:** comparar o `decoded_*.txt` (bytes exatos do oficial) com o nosso log
→ identificar o payload/sequência corretos → aplicar patch 1:1 no `multcar-app/www/index.html`
→ rebuild → **1 teste final no carro (5 min, chave II)**.

### ⚠️ Notas críticas

- **Não sobrou `.btsnoop` salvo** em `scratch/capture/` (só logs de logcat: `live.log`,
  `live2.log`, `logcat_full.log` e zips `br1/br2/br_final.zip` — estes últimos **não contêm**
  o snoop, bloqueado pelo Android 17 da Samsung).
- Se o HCI snoop não ativar via `adb shell` (Android 12+ sem root), ativar manualmente:
  Configurações → Opções do desenvolvedor → **"Ativar registro de log HCI de Bluetooth"**.
- **NUNCA** deixar ignição ligada por muito tempo — bateria já descarregou uma vez.

---

## 5. 🧭 Decisão pendente do usuário (na última mensagem)

Usuário escolheu **Opção 1 = fazer a captura HCI** (não desistir). Está usando o **Opencode
via túnel no celular**, então neste momento o `adb devices` do PC não vê o celular.
Quando ele conectar o USB no PC e avisar, seguir as fases A→B→C.

**Alternativa já oferecida e recusada:** fechar na v1.4.1 com suporte AD10 nativo documentado
como "em aberto — falta captura HCI".

---

## 6. 📦 estado do repositório / build

- `multcar-app/www/index.html` — código-fonte (toda a lógica BLE)
- `index.html` e `preview-dashboard.html` — **espelhos idênticos** (sempre copiar após editar)
- `Multcar_Pro_v1.2.apk` — APK final (nome mantém "v1.2" por compatibilidade de links;
  **dentro está a v1.4.1**). Atualizado em 18/11 19:12.
- `git status`: branch `main` **ahead 7** do `origin/main` → **FAZER `git push origin main`**.
- Plugins Capacitor instalados: `@capacitor-community/bluetooth-le`, `@capacitor/filesystem`, `@capacitor/share`.
- Build: `cd multcar-app; npx cap copy android; cd android; .\gradlew.bat assembleDebug` (~1 min).

---

## 7. ⚙️ Comandos rápidos (para a IA)

```powershell
# Validar ambiente de RE (SEMPRE primeiro)
python tools\reversing\ad10\fw_selfcheck.py

# Validar sintaxe do JS do app
node tools\validate_js.js

# Editar e rebuildar
# 1) editar multcar-app/www/index.html
node tools\validate_js.js
Copy-Item 'multcar-app\www\index.html' 'index.html' -Force
Copy-Item 'multcar-app\www\index.html' 'preview-dashboard.html' -Force
cd multcar-app; npx cap copy android; cd android; .\gradlew.bat assembleDebug --no-daemon
cd ..\..; Copy-Item 'multcar-app\android\app\build\outputs\apk\debug\app-debug.apk' 'Multcar_Pro_v1.2.apk' -Force

# Captura HCI (quando o celular estiver no USB)
powershell -ExecutionPolicy Bypass -File tools\reversing\ad10\preparar_snoop.ps1   # Fase A
powershell -ExecutionPolicy Bypass -File tools\reversing\ad10\capturar_oficial.ps1 # Fase C
```

---

---

## 9. 📅 Registro do dia 19/11/2026 — SUCESSO + acabamentos finais

### 9.1. Teste de campo (04:42, ignição II, motor desligado)
- Handshake perfeito: V01.20, tensão 14,24 V, status 133=1.
- Config `0x6001` (12 subs) aceita (ACK `0x600B [60 01 01]`).
- Pedido `0x6009 PID=0x0C` → **resposta `0x600A ... 41 0C 15 FB` = ~1400 RPM imediato!**
- Todos os 26 PIDs responderam (RPM, vel, temp, MAP, load, tensão, lambda, EGR...).
- Prints salvos em `E:\Apps\Multcar\WhatsApp Image 2026-11-19 05.06*.jpeg`.
- Log completo: mensagem do usuário (04:42–04:43).

### 9.2. Problemas relatados e corrigidos
| Problema | Causa | Correção |
|---|---|---|
| "tela em cima da outra" | painel flutuante `extendedDataBox` (position:fixed) criado na v1.6.0 | removido; dados foram pro log (v1.6.1) |
| "RPM travando" | 26 PIDs rotacionados um por vez → RPM só a cada ~15 s | RPM prioritário a cada 2 ciclos (v1.6.1) |
| pedido de dados estendidos sumiu | log só não era visível | nova **aba 📈 Dados** com 18 cards (v1.6.2) |
| DTC não funcionava | botão usava `0x6002` | corrigido p/ `0x6009` modo 03/04 (v1.5.0, commit b01f99b) |

### 9.3. Aba 📈 Dados (v1.6.2)
Cards: MAF, avanço de ignição, sonda lambda 1/2, nível de combustível, purga,
tensão do sistema, avanço máximo, EGR, pressão absoluta, carga de referência,
comando/erro EGR, temp. ambiente/compartimento, controle de marcha, tempo com MIL,
MAF alternativo. `setExtended()` atualiza os cards via `EXT_MAP` (PID → id do elemento).

### 9.4. Preferências de IA do usuário (v1.6.3, commit ca6df4a)
- ❌ **Gemini removido** (nunca funcionava para o usuário)
- ⭐ **OpenRouter como padrão**: modelo `meta-llama/llama-3.3-70b-instruct:free`,
  endpoint `https://openrouter.ai/api/v1/chat/completions`
- 🔀 **OmniRoute adicionado**: endpoint real fornecido pelo usuário
  `https://omnirouter.housecloud.tec.br/v1/chat/completions`
- ⚡ Groq (Llama 3.3 70B) e 🟢 NVIDIA NIM mantidos
- Chave de API vai **no próprio app** (aba Mecânico IA → ⚙️ Provedores), salva em `localStorage`

### 9.5. Estado final
- APK: `Multcar_Pro_v1.2.apk` (20/11, 20:31), badge `v1.6.7 • 20/11`
- Git: `main` sincronizado, último commit `20892e8`
- **App funcional e completo. Faltam só acabamentos cosméticos opcionais.**


## 8. 📚 Índice de documentos (state de cada um)

| Doc | Estado |
|---|---|
| **ESTADO_MASTER_IA.md** | ⭐ ESTE — fonte da verdade, consolidado e atualizado |
| `PROTOCOLO_AD10_REVERIFICADO.md` | Fonte da verdade do protocolo (v1.2.5, ainda válido) |
| `CAPTURA_HCI_ROTEIRO.md` | Roteiro da captura (atual) |
| `CAPTURAR_TRAFEGO_OFICIAL.md` | Captura de tráfego (versão anterior do roteiro) |
| `CONTEXTO_AGENTE_IA.md` | Guia mestre ANTIGO — **desatualizado** (parou na v1.2.6/v1.3.7) |
| `PROBLEMA_ATUAL_RX_ZERO.md` | Diagnóstico RX=0 (causa raiz antiga, já corrigida) |
| `PROXIMO_PASSO_OBD2_CAR_SCANNER.md` | Roteiro de testes de campo (parcial) |
| `RELATORIO_COMPLETO_PROJETO_MULTCAR.md` | Histórico completo do desenvolvimento |
| `ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md` | RE histórica (ver banner — use `PROTOCOLO_AD10_REVERIFICADO.md`) |
| `AMANHA_TESTE_V1_4.md` | Roteiro de teste pós-troca de bateria |
| `README.md` | Apresentação |

> **Regra de ouro final:** quando este doc e outro divergirem, **confie neste**.
> Nunca mais confie em disassembly caseado à mão — só Capstone, validado no firmware E no app oficial.
