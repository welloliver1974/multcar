# 📡 PROTOCOLO EXATO DO APP OFICIAL XTOOL AD10 — descoberto via `blecmd.log`

> **Fonte primária:** `C:\Users\welld\AppData\Local\Temp\blecmd.log` (1,1 MB)
> gerado pelo **próprio app oficial XTOOL Advancer** em **15/11/2026**.
> Cópia versionada: `scratch/capture/blecmd_oficial.log`.
> **Descoberto em 18/11/2026.** Implementado na **v1.5.0**.
>
> ⭐ **Esta é a fonte da verdade para o pedido OBD2.** Se divergir de
> `PROTOCOLO_AD10_REVERIFICADO.md` ou de qualquer outro doc, **confie neste**.

---

## 1. O que é o `blecmd.log`

O app oficial tem a classe `com.diagnosis.obdbluetooth.BleCmdLogger` que grava:
- `sendDataJNI:N:` → bytes que o app **ENVIA** pro dongle (TX)
- `write:` → escrita na characteristic BLE
- `read:` → bytes que o dongle **DEVOLVE** (RX)

O log cobre a sessão de 15/11 onde o app oficial **leu o carro com sucesso**
(Chevrolet Prisma 1.4, ECU Delphi): há **3925 respostas `0x600A`** com dados reais
(RPM `41 0C`, VIN `49 02`, coolant `41 05`, battery, etc.).

O app tentou fazer upload desses logs e falhou por `CertPathValidatorException` —
por isso os arquivos ficaram no celular e foram resgatados de `/Temp/`.

---

## 2. ⭐ A SEQUÊNCIA EXATA (o que a gente fazia de errado)

### ❌ Errado (v1.3.x–v1.4.1)
```
0x6003 (can_scan) → 20s silêncio → 0x6001 [01][0F][frame] pra pedir PID
```
Mandávamos `0x6001` com sub `0x0F` (filter_frame) pra pedir o PID. O dongle
respondia só ACK `0x600B`. **Nunca vinha `0x600A`.**

### ✅ Correto (app oficial, v1.5.0)
```
1) 0x6001 (config, 12 sub-comandos)  → ACK 0x600B
2) 0x6009 (pedido do PID)            → 0x600A com os dados da ECU
3) repetir 0x6009 pra cada PID
```
**O pedido de PID é `0x6009`, NÃO `0x6001`.** E o app **nunca** manda `0x6003` (can_scan).

---

## 3. Anatomia dos quadros (byte a byte)

### 3.1. Configuração inicial (enviada 1x)

```
AA 02 28 60 01 0C 0E 00 13 00 02 00 07 A1 20 10 02 11 02
12 00 00 07 E0 00 00 00 0F 01 00 06 00 00 05 00 02 04 00 C8 03 00 50 07 00 BD
```
Decodificado (`AA seq len cmdHi cmdLo [count=0C][sub, dados]... chk`):

| Sub | Nome | Valor | Significado |
|---|---|---|---|
| `0E` | FILTER_LEN | `00` | — |
| `13` | AFC_CTRL | `00` | — |
| `02` | BPS | `00 07 A1 20` | 500.000 bps |
| `10` | FILTER_TYPE | `02` | — |
| `11` | FILTER_CNT | `02` | 2 filtros |
| `12` | FILTER_ID | `00 00 07 E0` + `00 00 00 0F` | IDs `0x07E0` e `0x000F` |
| `01` | OBD_PROTOCOL | **`00`** | ⚠️ protocolo **0**, não 1/6/7 |
| `06` | REQ_BYE_2_BYE | `00 00` | — |
| `05` | OVER_2_START | `00 02` | — |
| `04` | FRAME_2_FRAME | `00 C8` | 200 |
| `03` | BYE_2_BYE | `00 50` | 80 |
| `07` | KEEP_LINE | `00` | — |

### 3.2. Pedido de PID (enviado centenas de vezes)

```
AA seq 0D 60 09 0B 08 07 DF 02 01 <PID> 00 00 00 00 00 chk
```
| Byte | Valor | Significado |
|---|---|---|
| 0 | `AA` | delimitador |
| 1 | seq | sequência (muda) |
| 2 | `0D` | tamanho (13) |
| 3-4 | `60 09` | **cmd 0x6009** |
| 5 | `0B` | tamanho do payload interno (11) |
| 6 | `08` | DLC CAN |
| 7-8 | `07 DF` | CAN ID broadcast (request) |
| 9 | `02` | tamanho ISO-TP |
| 10 | `01` | modo OBD 1 (show current data) |
| 11 | `<PID>` | PID pedido (0x00, 0x0C, 0x20, 0x40, 0x60...) |
| 12-16 | `00 00 00 00 00` | padding |
| 17 | chk | XOR checksum |

**PIDs que o oficial pede:** `00` (capacidades), `0C` (RPM), `20`, `40`, `60`,
`0D` (velocidade), `05` (temperatura), `04` (carga), `0F`, `11`, `42` (tensão)...

### 3.3. Resposta da ECU (0x600A)

```
55 seq 0D 60 0A 0B 08 07 E8 <len> 41 <PID> <A> <B> <C> <D> ... chk
```
| Byte | Significado |
|---|---|
| `55` | cabeçalho de resposta |
| `60 0A` | cmd 0x600A (frame CAN recebida) |
| `0B 08` | tamanho / DLC |
| `07 E8` | CAN ID da ECU (resposta) |
| `<len>` | comprimento ISO-TP (ex: 04, 06) |
| `41` | modo 1 resposta |
| `<PID>` | PID respondido |
| `A B C D` | dados |

**Exemplos reais do log:**
```
41 0C 00 00 → RPM = ((0x00*256)+0x00)/4 = 0 (parado/ignição II)
41 00 BE 3F B8 13 → PIDs suportados
41 05 xx → coolant
49 02 01 39 42 47 F6 → VIN ("9BG...")
```

---

## 4. Implementação na v1.5.0

Em `multcar-app/www/index.html`:
- `sendAd10ObdRequestOficial(pid)` → monta `AA seq 0D 60 09 0B 08 07 DF 02 01 <PID> 00×5 chk`
- `buildAd10CanConfigEntries()` → config de 12 subs copiada byte a byte
- handshake: **sem can_scan**, sequência `0x6001 → 0x6009 → polling`
- polling rotaciona PIDs `[0x0C, 0x0D, 0x05, 0x04, 0x0F, 0x11, 0x42]`
- `handleAd10CanFrame()` (decoder `0x600A`) validado contra os bytes reais do log

### ✅ Validação feita
- Padrão `41 <PID> <A> <B>` encontrado pelo decoder ✓
- RPM `((A*256)+B)/4` correto ✓
- 774 respostas `41 0C` reais no log ✓
- 1554 pedidos `02 01 0C` reais no log ✓

---

## 5. ⏳ O que falta

**1 teste final no carro** (5 min, chave na II, motor desligado):
instalar v1.5.0 (badge `v1.5.0 • 18/11`), conectar, esperar, exportar log.
Se aparecer `🛰️ Frame CAN ID 0x07E8` e `📊 Resposta OBD2 PID=0x0C` → **FECHAR O APP**.
