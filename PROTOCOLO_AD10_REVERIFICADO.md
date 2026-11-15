# 🛰️ Protocolo Binário XTOOL AD10 — Especificação REVERIFICADA

> **Data:** 13/11/2026 (v1.2.5)  
> **Status:** ✅ **CONFIRMADO EM DUAS FONTES INDEPENDENTES**
> 1. **Firmware do dongle** — `unpacked_apk/assets/ble_obd.bin` (AD10_BLE_OBD V01.20, base flash `0x08002000`)
> 2. **App oficial XTOOL** — `unpacked_apk/lib/arm64-v8a/libobdcore.so`
>
> Ferramenta usada: `scratch/fw_dis.py` / `scratch/so_dis.py` (Python + **Capstone**, disassemblador real — não o decoder manual usado antes).

---

## 0. ⚠️ Por que o app lia "TX subindo / RX = 0"

A v1.2.4 enviava o **ID do comando em LITTLE-ENDIAN**. O firmware do dongle faz:

```c
// ble_obd.bin @ 0x08005c04  (dentro de ble_protocol_analy_char)
r0 = frame[4]; r1 = frame[3];
r0 = (r0 << 8) | r1;      // (frame[4] << 8) | frame[3]
r0 = rev16(r0);            // <-- BYTE SWAP  => (frame[3] << 8) | frame[4]
if (r0 != tabela[i].cmd) proximo;   // tabela: 0x6001..0x6009
```

Ou seja: **o comando é BIG-ENDIAN no quadro** (`frame[3]` = MSB, `frame[4]` = LSB).

O app enviava `AA 00 03 02 60 01 81 E1` → o dongle calculava `0x0260`, não achava nenhum handler e **ignorava o quadro inteiro**. Daí: TX subia, RX ficava em 0.

**Confirmado no app oficial** (`libobdcore.so`, função `set_cmd` @ `0x1a4c4`):

```asm
0x0001a504: lsr   w26, w20, #8      ; byte ALTO do cmd
0x0001a518: strb  w26, [x22, w23]   ; gravado PRIMEIRO no buffer
```

---

## 1. Quadro de REQUISIÇÃO (App → Dongle)

```
+------+------+------+------+------+--------------------+------+
| 0xAA | seq  |  L   | cmdHi| cmdLo| payload (N bytes)  | chk  |
+------+------+------+------+------+--------------------+------+
   0      1      2      3      4     5 .. 4+N          5+N
```

| Campo | Valor |
|---|---|
| `0xAA` | Delimitador de início |
| `seq` | Número de sequência (incrementado a cada envio) |
| `L` | **Tamanho do payload + 1** → tamanho total do quadro = `L + 5` |
| `cmdHi` / `cmdLo` | ID do comando (16 bits) **BIG-ENDIAN** |
| `payload` | Dados do comando |
| `chk` | XOR de **todos** os bytes de `1` até `N+4` |

### Checksum (firmware @ `0x08005bbe`–`0x08005bcc`)
```
chk = XOR( frame[1] … frame[total-2] )
chk deve ser igual a frame[total-1]
```

### Byte stuffing (SLIP) — escape de saída
| Byte | Substituição |
|---|---|
| `0xAA` | `[0xAB, 0x02]` |
| `0xAB` | `[0xAB, 0x01]` |

O primeiro byte (`0xAA`) **nunca** é escapado.

### Exemplo real (código novo do app)
```
buildAd10Packet(0x6002, [0x01, 0x82])
  → raw  = AA 00 02 60 02 01 82
  → chk  = 00^02^60^02^01^82 = E1
  → out  = AA 00 02 60 02 01 82 E1
```

---

## 2. Quadro de RESPOSTA (Dongle → App)

> ⚠️ **Não é `0xAB`!** O dongle responde com cabeçalho **`0x55`** e escapa com **`0x56`**.

```
+------+------+------+------+------+--------------------+------+
| 0x55 | seq  |  L   | cmdHi| cmdLo| payload (N bytes)  | chk  |
+------+------+------+------+------+--------------------+------+
```

Escaping: `0x55 → [0x56, 0x02]` ; `0x56 → [0x56, 0x01]`.

Confirmado no app oficial (`libobdcore.so`, tabelas em `0x18254`, `0x18284`, `0x1835c`, `0x183c0`…).

> A v1.2.4 só reconhecia `0xAB`/`0xAA` como início de resposta — **mesmo com o TX corrigido, nada seria decodificado**.

### Comandos que o dongle envia sozinho
| Cmd | Significado |
|---|---|
| `0x6001` | resposta a comando de configuração CAN |
| `0x6002` | resposta a comando de informação OBD |
| `0x6009` | "systerm enter" (liga os transceptores CAN dos pinos 6/14) |
| `0x600A` | **notificação espontânea: frame CAN recebida da ECU** |

---

## 3. Tabela de comandos BLE (firmware @ `0x0800bbf4`)

| Cmd | Handler | Tabela de sub-comandos |
|---|---|---|
| `0x6001` | `0x080064ad`→`0x08006204` | sub-comandos `0x01`–`0x16` (tabela `0x0800bc3c`) |
| `0x6002` | `0x080064ad` | sub-comandos `0x80`–`0x86` (tabela `0x0800bcec`) |
| `0x6003` | `0x08005d55` | sub-comandos `0x01`–`0x05` (tabela `0x0800bd24`) |
| `0x6004/5/6` | — | callbacks por índice |
| `0x6007` | `0x08005fad` | atualização de firmware (início) |
| `0x6008` | `0x08005e5d` | atualização de firmware (dados) |
| `0x6009` | `0x080063c5` | "systerm enter" |

### 3.1 Payload do comando `0x6001` (configuração CAN)

```
[0]              = número de entradas (N)
[1]              = sub-comando da entrada 1
[..]             = dados da entrada 1
[1 + len1]       = sub-comando da entrada 2
...
```

| Sub | Nome (log do firmware) | Dados | Bytes |
|---|---|---|---|
| `0x01` | `obd_protocol` | valor do protocolo (1 = ISO15765-4 STD 500K; 6 = CAN standard) | 1 |
| `0x02` | `bps` | baud rate **32 bits big-endian** (500000 = `00 07 A1 20`) | 4 |
| `0x03` | `bye_2_bye` | — | 2 |
| `0x04` | `frame_2_frame` | 16 bits BE | 2 |
| `0x05` | `over_2_start` | 16 bits BE | 2 |
| `0x06` | `request_bye_2_bye` | 16 bits BE | 2 |
| `0x07` | `keep_line` | 1 byte | 1 |
| `0x08` | `keep_line_frame_len` | — | 1 |
| `0x09` | `keep_line_frame` | — | var. |
| `0x0A` | `keep_line_cnt` | — | 1 |
| `0x0B` | `keep_line_frame_len` | 16 bits BE | 2 |
| `0x0C` | `5bps_addr` | — | 1 |
| `0x0D` | `filter_offset` | — | 2 |
| `0x0E` | `filter_frame_len` | 1 byte | 1 |
| `0x0F` | `filter_frame` | tamanho + N bytes | var. |
| `0x10` | `can_filter_type` | 1 byte | 1 |
| `0x11` | `can_filter_cnt` | 1 byte | 1 |
| `0x12` | `filter_frame` (IDs) | **N × 32 bits BE** (CAN IDs) | 4×N |
| `0x13` | `afc_ctrl` | — | 1 |
| `0x14` | `afc_frame_len` | — | 2 |
| `0x15` | `afc_frame` | — | var. |
| `0x16` | `send_can_id` | 32 bits BE (CAN ID; bit `0x80` setado se ID > 0xFFFF) | 4 |

### 3.2 Payload do comando `0x6002` (informações OBD do dongle)

```
[0] = número de sub-comandos (N)
[1] = sub-comando 1
[2] = sub-comando 2 ...
```

| Sub | Nome | Retorno |
|---|---|---|
| `0x80` | `protocol_volt` | 2 bytes BE (mV) |
| `0x81` | `protocol_version` | string |
| `0x82` | `protocol_sn` | string |
| `0x83` | `cur_status` | 1 byte |
| `0x84` | `cur_bps` | 1 byte |
| `0x85` | `can_type` | 1 byte |

> ⚠️ A v1.2.4 usava `0x81` para voltagem e `0x82` para versão — **errado** (a tabela real é `0x80`=volt, `0x81`=versão, `0x82`=SN).
> Também usava `0x01/0x02/0x03` como sub-comandos do `0x6002` — **esses não existem** nesse grupo (pertencem ao `0x6001`).

---

## 4. Sequência de inicialização usada pelo app oficial

`CAD10Prot::InitHardware` em `libobdcore.so` (`0x15d20`–`0x15ee4`) monta **um único quadro `0x6001`** com:

```
obd_protocol(1)                       // ISO15765-4 STD 500K
bps(500000)
filter_frame_len(0)
can_filter_type(2)
can_filter_cnt(2)
filter_frame([07E0][07E8])            // IDs que o dongle deve escutar
frame_2_frame(v)
over_2_start(v)
request_bye_2_bye(v)
keep_line(v)
keep_line_frame_len(0)
```

**O dongle é que faz o scanning OBD2** (o firmware tem o módulo `obd_scan`, com logs
`[obd_scan] obd scan tx :%d` e `[obd_scan] iso 15765 enter`).
Ou seja: **o app configura e o dongle transmite as requisições OBD e devolve os frames via `0x600A`.**

---

## 5. 📌 Post-mortem: por que a engenharia reversa anterior errou

> **Lição de processo — leia antes de qualquer nova RE neste projeto.**

A análise que precedeu a v1.2.5 foi feita com um **decodificador de Thumb caseado à mão**
(`scratch/thumb_decoder.js`, `scratch/disasm_*.js`), e o resultado foi interpretado por um modelo
de linguagem. Isso produziu **conclusões plausíveis e verificadamente erradas**.

### Sintoma: o decoder desalinhado produzia lixo

Rodando Capstone no **mesmo endereço** que o decoder antigo usava (`0x08003af0` no arquivo):

```
decoder antigo (desalinhado):        Capstone (correto):
0x08003af0: str  r2, [r0]            0x08003af0: push {r3, r4, r5, r6, r7, lr}
0x08003af2: ldr  r2, [r0]            0x08003af2: ldr  r5, [pc, #0x150]
0x08003af4: lsls r2, r2, #0x1e       0x08003af4: movs r6, #0xff
```

Cada linha inventada virou uma conclusão errada, mas **soava convincente**:

| Conclusão errada | Realidade |
|---|---|
| ID do comando em **little-endian** | é **big-endian** (`rev16` em `0x0800766a`) |
| Resposta começa com `0xAB` | começa com **`0x55`** (escape `0x56`) |
| `systerm enter` = sub-comando `0x01` do `0x6002` | é o comando de nível superior **`0x6009`** |
| `0x81`=volt, `0x82`=versão | `0x80`=volt, `0x81`=versão, `0x82`=SN |
| Tabela de comandos em `0x08009c38` | está em **`0x0800bbf4`** (desalinhamento de 2 KB = base errada) |

### A regra de ouro

> **Nunca confie em disassembly que não veio de um disassemblador real.**
> E **nunca aceite uma conclusão de engenharia reversa sem validação cruzada.**

Na prática, nesta projeto:

1. **Use Capstone** (`pip install capstone`) — `tools/reversing/ad10/fw_dis.py` / `so_dis.py`.
2. **Rode o self-check antes de começar** — `python tools/reversing/ad10/fw_selfcheck.py`
   (valida base do flash, alinhamento, tabela de comandos e strings em ~2 s).
3. **Valide nos DOIS lados:** o mesmo protocolo tem que aparecer no firmware do dongle
   **e** no app oficial (`libobdcore.so`). Só o que bate nos dois é verdade.
4. **Escreva um teste de round-trip** (`test_frame.js`): o quadro gerado pelo app precisa passar
   pelo parser reimplementado a partir do firmware real.
5. **Se uma conclusão é subtly errada, o app não funciona de jeito nenhum** — e o sintoma
   (TX subindo, RX zerado) é idêntico em 10 causas diferentes. Por isso o log bruto no app.

### Como isso foi detectado

O `fw_selfcheck.py` acima existe porque **o self-check falha de forma óbvia** quando a base ou o
decoder estão errados — em vez de gerar conclusões silenciosamente erradas. Foi ele que
expôs o desalinhamento de 2 KB na primeira rodada da v1.2.5.

---

## 6. 🧪 O que o teste de campo provou (14–15/11/2026)

### 6.1. O protocolo funciona (14/11, v1.2.5)

```
TX AA 15 03 60 02 01 83 F6      → cmd 0x6002, sub 0x83 (cur_status)
RX 55 15 04 60 02 01 83 01 F0   → cmd 0x6002, payload [01 83 01]   ✅
TX AA 16 26 60 01 0B 01 01 ...  → cmd 0x6001, 11 entradas de config
RX 55 16 04 60 0B 60 01 01 19   → cmd 0x600B, payload [60 01 01]
```

| # | Fato | Prova |
|---|---|---|
| 1 | Framing, checksum, big-endian e `seq` | ✅ quadros aceitos, 23 OK / 0 inválidos |
| 2 | `0x6002` funciona | ✅ `RX ... cmd=0x6002 payload=[01 83 01]` |
| 3 | **`0x600B` = ACK** | firmware `0x08006246`: `r0 = 0x6001 + 0x0A = 0x600B`; payload = **`[cmdHi, cmdLo, status]`** |
| 4 | **status `0x01` = ACEITO** | a config CAN é aceita |

> ⚠️ **ATENÇÃO:** o ACK `0x600B` tem payload **fixo** `[cmdHi, cmdLo, 0x01]` (o firmware escreve
> a constante `1`). Ele **NÃO** confirma que a config foi aplicada — só confirma que o quadro chegou.

### 6.2. Diagnóstico ao vivo (15/11) — a descoberta do gatilho

Testando via **adb + logcat** (o próprio celular gravava os logs do app), com a v1.3.2:

```
TX AA 04 03 60 02 01 82 E2
RX 55 00 17 60 02 01 82 FF FF FF FF FF FF FF FF FF FF FF FF FF
RX [0003] FF FF 00 00 00 00 00 09
  → cmd=0x6002 payload=[01 82 FF…FF 00 00 00 00 00]
  → "AD10 Número de Série: ÿÿÿ…"

TX AA 01 03 60 02 01 81 E0
RX 55 01 0D 60 02 01 81 56 30 31 2E 32 30 00 00 00 00 95
  → "AD10 Versão: V01.20"        ✅ (bate com o firmware analisado!)

TX AA 02 03 60 02 01 80 E2
RX 55 02 05 60 02 01 80 2E 7C
  → "Tensão do dongle: 11.90 V"  ✅ (bateria do carro!)
```

**Conclusão definitiva:** o protocolo BLE está **100% correto**, o dongle é o **AD10_BLE_OBD V01.20**
(exatamente o firmware que foi disassemblado), e o **NFC/ADC está funcionando**.

### 6.3. 🎯 A CAUSA do "conecta/desconecta" (descoberta 15/11)

```
TX AA 19 03 60 03 01 05 7D        ← can_scan
RX 55 15 04 60 0B 60 03 01 1A     ← 0x600B payload=[60 03 01] = can_scan ACEITO (0x01)
⟪⟪⟪ BLE DESCONECTOU ⟫⟫⟫          ← o dongle REINICIA ao executar o can_scan
```

**O comando `0x6003 / sub 0x05` (`ble_protocol_can_scan`) liga o scanner CAN e REINICIA o dongle.**
Antes, o app mandava isso **em loop**, então o dongle nunca terminava de subir e enviar frames.

**Outras descobertas correlatas:**

| Descoberta | Prova |
|---|---|
| `0x6001` com **frame CAN cru** no payload = **OVERFLOW** → dongle reinicia | byte `0x08` (DLC) na posição 0 é lido como **contagem de sub-comandos** → ele lê 8 entradas além do buffer |
| `0x6104` **não existe** nesse firmware | sem resposta |
| Envelope oficial de 18 bytes | `0x6001 [01][0F][CAN 10 bytes]` = `AA seq 0C 60 01 01 0F …` |
| O app oficial faz polling com **18 bytes** | medido no logcat (`onWriteCharacteristic length=18`) |

### 6.4. Como o dongle transmite um frame CAN

O sub-comando **`0x0F` (`filter_frame`)** **não** é um filtro de escuta — é o **frame a transmitir**:

```c
// ble_obd.bin @ 0x080068ed  (handler do sub 0x0F)
0x080068f0: bl 0x80089dc        ; r0 = bytes restantes no buffer RX
0x080068f4: mov r1, r0
0x080068f6: mov r0, r4
0x080068f8: bl 0x8008b38        ; memcpy(0x20000f55, dados, len)  <= BUFFER TX
```

E o sub-comando **`0x16` (`send_can_id`)** **dispara** o envio:

```c
// ble_obd.bin @ 0x08006bd0  (handler do sub 0x16)
0x08006bd6: bl 0x8007652        ; r0 = read32BE(dados[0..3])
...
0x08006bfc: bl 0x8008b14        ; can_tx(...) -> flags em 0x20000f86
```

> **Conclusão:** para pedir um PID ao ECU é preciso
> **1)** `0x6001` sub `0x0F` com o frame CAN cru
> **2)** `0x6001` sub `0x16` com o CAN ID (4 bytes BE).

### 7.2. Ordem oficial dos sub-comandos (`0x6001`)

Extraída de `CAD10Prot::InitHardware` (`libobdcore.so` @ `0x15d20`):

```
0x02 bps → 0x0E filter_frame_len → 0x10 can_filter_type → 0x11 can_filter_cnt
→ 0x12 filter IDs → 0x01 obd_protocol → 0x06 → 0x05 → 0x04 → 0x03 → 0x07 keep_line(=0)
```

> A v1.2.5 usava outra ordem, não tinha o `0x03` e mandava `keep_line = 80`
> (o app oficial manda **0**). **Corrigido na v1.2.6.**

### 7.3. Comando `0x6009` ("enter system")

O app oficial envia `0x6009` **uma vez por item de ECU**, com payload `[len][dados]`
(família `0x6004 + índice`, índice 5 → `0x6009`; `libobdcore.so` @ `0x16e68`).
No firmware, `0x6009` é um trampolim que repassa `(payload[0], payload+1)` para o
callback do módulo `obd_scan` — que é quem **liga os transceptores CAN** dos pinos 6/14.

> ⚠️ O **conteúdo do descritor** por item de ECU ainda não foi totalmente mapeado
> (vem da base de dados OBD do app oficial). A v1.2.6 envia uma variante simples
> (`payload = [0x00]`) e o painel de experimentos permite testar outras.

---

## 7. Referências de código (para auditoria futura)

| Item | Endereço |
|---|---|
| Base do flash do dongle | `0x08002000` (41.292 bytes) |
| `ble_protocol_analy_char` (parser de RX) | `0x08005af0` |
| `rev16` (byte swap do cmd) | `0x0800766a` |
| XOR/checksum | `0x08007498` |
| Tabela de comandos BLE | `0x0800bbf4` |
| Tabela sub `0x6001` (0x01–0x16) | `0x0800bc3c` |
| Tabela sub `0x6002` (0x80–0x86) | `0x0800bcec` |
| Construtor de quadro (app oficial) | `libobdcore.so` `0x18040` |
| `set_cmd` (app oficial) | `libobdcore.so` `0x1a4c4` |
| `InitHardware` (app oficial) | `libobdcore.so` `0x15d20` |
| Parser de resposta 0x55/0x56 (app oficial) | `libobdcore.so` `0x18200`–`0x18600` |

---

## 8. O que ainda precisa ser confirmado no carro

> **🔋 TESTE DE CAMPO DA v1.3.7 PENDENTE** — em 15/11 a **bateria do carro descarregou**
> (ignição ligada por ~2 h durante os testes de campo). Sem bateria não dá para continuar.

### 8.1. O que já sabemos (confirmado em 15/11)

| # | Fato | Fonte |
|---|---|---|
| 1 | Framing, checksum, big-endian, `seq` | logs de campo + logcat ao vivo |
| 2 | `0x6002` funciona (SN, versão **V01.20**, tensão, status) | logcat ao vivo |
| 3 | `0x600B` = ACK com payload `[cmdHi, cmdLo, status]` | firmware `0x08006246` |
| 4 | **`0x6003 / sub 0x05` = `ble_protocol_can_scan` — aceito e REINICIA o dongle** | logcat ao vivo |
| 5 | Envelope oficial = `0x6001 [01][0F][CAN 10 bytes]` (18 bytes) | app oficial + firmware |
| 6 | Frame CAN cru no payload = overflow → dongle reinicia | logcat ao vivo |

### 8.2. Sequência correta (implementada na v1.3.7)

```
1. 0x6002  → sondagem (SN / versão / tensão / status)
2. 0x6001  → configuração CAN (protocolo, baud, filtros)
3. 0x6003  → [01][05] can_scan  → dongle REINICIA  ⚠️
4. silêncio 20 s (o dongle sobe sozinho)
5. RECONEXÃO automática
6. 0x6002 + 0x6001  → reaplica config (ela foi perdida no restart)
7. polling com 0x6001[01][0F][CAN 10 bytes]
```

### 8.3. O que falta confirmar

1. **Layout exato do payload `0x600A`** (frame CAN). O decoder já tolera 6 layouts.
2. **Valores de período** (`frame_2_frame`, `over_2_start`, `request_bye_2_bye`, `keep_line`) —
   hoje `0x00 / 0x02 / 0x00 / 0x00`. Alternativas: `0x00C8` (200) e `0x0050` (80).
3. **`obd_protocol`** — hoje `0x01` (ISO15765-4 STD 500K). Alternativa: `0x06` (CAN standard).
4. **Descritor de ECU para o `0x6009`** — só necessário se o `can_scan` não iniciar o scanner
   sozinho. Pode ser obtido capturando o tráfego do app oficial (`CAPTURAR_TRAFEGO_OFICIAL.md`).

### 8.4. Como validar (quando a bateria estiver resolvida)

1. Instalar `Multcar_Pro_v1.2.apk` (v1.3.7) → badge **`v1.3.7 • 15/11`**
2. **Ignição II** (motor desligado — sem consumo de combustível)
3. Conectar → esperar **~40 s** (20 s de silêncio + reconexão + reaplicar config + polling)
4. Procurar no log:
   - `✔ Reconectado ao AD10 — reenviando configuração CAN…` → reconexão OK
   - `🛰️ Frame CAN ID 0x07E8 …` → **DEU CERTO** 🏁
   - `📊 Resposta OBD2: PID=0x0C` → **RPM chegando** 🏁
