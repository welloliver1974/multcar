# 📋 ESTADO-MASTER DO PROJETO MULTCAR PRO — Para qualquer IA continuar daqui

> **Última atualização:** 18/nov/2026 · **Versão atual do código:** v1.4.1 (badge `v1.4.1 • 18/11`)
> **Último commit:** `9f2d4de` · **Branch:** `main` (⚠️ estava `ahead 7` do origin — FAZER PUSH)
>
> **LEIA ESTE DOCUMENTO INTEIRO ANTES DE MEXER EM QUALQUER COISA.**
> Ele é a fonte da verdade sobre o que já foi feito, o que já foi provado, o que NÃO foi,
> e exatamente onde paramos. Outros `.md` estão parciais/desatualizados — este consolida todos.

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

## 3. ❌ O QUE NÃO FUNCIONA (o problema atual — o único que falta)

### 3.1. Sintoma (confirmado em 4 testes de campo: v1.3.9, v1.4.0, v1.4.1 — logs 17–18/11)

- O dongle **aceita tudo**: toda resposta é ACK `cmd=0x600B payload=[60 01 01]`.
- **NUNCA aparece `cmd=0x600A`** (frame CAN da ECU).
- Em ~5 min de polling contínuo (250+ quadros), **100% dos RX são ACK** — nenhum dado da ECU.
- Handshake perfeito (V01.20, tensão ~14,8 V com motor ligado, status=133 valor=1).

### 3.2. Causa raiz (entendida por RE estática, 18/11)

Desassemblamos `nativeSendReceive @ 0x10cc0`, `nativeGetValueByPid @ 0xeb2c`,
`nativeEnterSystem @ 0xda24`, `set_cmd @ 0x1a4c4`, e os handlers do firmware `0x6001..0x6009`.

**Conclusão:** os bytes que o app oficial envia **não são constantes**. O `0x6009`/`0x6001`
que replicamos é só a "casca". O **conteúdo real do frame CAN** é montado dinamicamente a partir
de uma **tabela de dados de ECU de ~3,4 MB** (`unpacked_apk/assets/obddata/*.BIN`).
Chutar protocolo/filtro/layout **não resolve** — por isso v1.3.9, v1.4.0 e v1.4.1 falharam.

> ⚠️ **NÃO perca mais tempo com RE estática nem com chutes de protocolo.** Isso já foi
> esgotado. A única saída é capturar os bytes reais do app oficial em funcionamento.

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
