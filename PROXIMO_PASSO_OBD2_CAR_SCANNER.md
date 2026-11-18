# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 15/nov/2026 — **v1.3.7: CAN_SCAN + envelope oficial + reconexão automática**
> **🔋 15/11/2026 — BATERIA DO CARRO DESCARREGOU** (ignição ligada ~2 h durante os testes de campo).
> **O teste de campo da v1.3.7 está PENDENTE.** Todo o trabalho está salvo e commitado — nada se perdeu.
  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle XTOOL Advancer AD10 (BLE 4.2 / Nordic UART Service)  
> **Dispositivo Principal:** Central Multimídia K2401 (Android 10) e Smartphone Android  

---

## 0. ⚠️ LEIA PRIMEIRO — O QUE MUDOU NA v1.2.5

Até a v1.2.4 o app **nunca poderia ler o carro**, por dois bugs de framing:

1. **ID do comando em little-endian.** O firmware compara `(frame[3]<<8)|frame[4]` (**big-endian**)
   contra a tabela `0x6001..0x6009`. O app mandava `02 60` → o dongle calculava `0x0260` →
   **descartava o quadro silenciosamente** → RX = 0 para sempre.
2. **Parser de resposta errado.** O app só aceitava `0xAB`/`0xAA`; o dongle responde com **`0x55`**
   (escape `0x56`).

Ambos foram corrigidos e **validados no firmware `ble_obd.bin` e no app oficial `libobdcore.so`**.

> 📘 **Fonte da verdade do protocolo:** [`PROTOCOLO_AD10_REVERIFICADO.md`](PROTOCOLO_AD10_REVERIFICADO.md)

---

## 0. ✅ RESULTADO DO TESTE DE CAMPO DA v1.2.5 (14/11/2026)

> **O PROTOCOLO FUNCIONOU.** O log do usuário provou:
>
> ```
> TX AA 15 03 60 02 01 83 F6      → cmd 0x6002, sub 0x83 (cur_status)
> RX 55 15 04 60 02 01 83 01 F0   → cmd 0x6002, payload [01 83 01]   ✅
> TX AA 16 26 60 01 0B 01 01 ...  → cmd 0x6001 (config CAN, 11 entradas)
> RX 55 16 04 60 0B 60 01 01 19   → cmd 0x600B, payload [60 01 01]
> ```
>
> - ✅ **Framing, checksum, big-endian do comando e `seq`: PERFEITOS** (23 quadros OK, 0 inválidos)
> - ✅ **`0x6002` responde** (cur_status = 1)
> - ✅ **`0x600B` = ACK do `0x6001`** com **status `0x01` = configuração ACEITA**
>   (confirmado no firmware: `0x08006246` → `cmd = 0x6001 + 0x0A = 0x600B`)
> - ❌ **Ainda não chega frame CAN da ECU (0x600A)** → faltava o *gatilho* do scanner
>
> **O que faltava (e a v1.2.6 corrige):**
> 1. **O app oficial envia `0x6009` ("enter system")** por item de ECU — nós não enviávamos.
> 2. **A ordem e os valores dos sub-comandos da config** estavam diferentes do app oficial.
> 3. **Faltava o pedido OBD2 propriamente dito**: o sub `0x0F` (`filter_frame`) define o frame CAN
>    a transmitir e o sub `0x16` (`send_can_id`) dispara o envio.

---

## 1. Status Geral do Projeto

1. **Diagnóstico da Incompatibilidade do AD10 com ELM327:**
   - Comprovado empiricamente (Car Scanner ELM OBD2 não conecta) **e** no firmware:
     o dongle **não possui interpretador AT** — todo byte cai em `ble_protocol_analy_char`,
     que só aceita quadros iniciados em `0xAA`.
   - O modo `⚡ ELM327 Universal` continua no app **para dongles ELM327 reais**, não para o AD10.
2. **Protocolo binário oficial (v1.2.5):**
   - Requisição: `0xAA | seq | L | cmdHi | cmdLo | payload… | checksum` (cmd **big-endian**).
   - Resposta: `0x55 | seq | L | cmdHi | cmdLo | payload… | checksum` (escape `0x56`).
   - Tabelas de sub-comandos `0x6001` (`0x01`–`0x16`) e `0x6002` (`0x80`–`0x86`) reescritas do firmware.
3. **Handshake correto:**
   - Sondagem `0x6002` (SN / versão / tensão / can_type) — **funciona sem o carro**, valida o framing.
   - Configuração CAN `0x6001` **idêntica à do app oficial** (`CAD10Prot::InitHardware`).
   - O **dongle é quem faz o scanning OBD2** (módulo `obd_scan` no firmware) e devolve os frames
     via notificação `0x600A`.
4. **Estabilidade GATT:** notificações só no canal `6E400003` (único com CCCD `0x2902`);
   escrita só no `6E400004` com `BleClient.write` (com confirmação).
5. **Diagnóstico Touch:** um toque na **Barra de Telemetria** mostra log **TX/RX bruto**,
   contador de quadros OK/inválidos e botão **"🛰️ Reenviar configuração CAN"**.
6. **Identificação Visual no Topo:** badge **`v1.2.5 • 13/11`** (curto, não estourar a tela da K2401).

---

## 2. Arquivos Prontos para Uso

| Arquivo / Caminho | Função |
| :--- | :--- |
| [`E:\Apps\Multcar\Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk) | **APK Android nativo v1.2.5** (4.30 MB — Build 13/11 22:06) |
| [`E:\Apps\Multcar\Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) | Espelho do instalador Android nativo |
| [`E:\Apps\Multcar\index.html`](file:///E:/Apps/Multcar/index.html) | Dashboard PWA standalone |
| [`E:\Apps\Multcar\preview-dashboard.html`](file:///E:/Apps/Multcar/preview-dashboard.html) | Espelho idêntico para testes e pré-visualização |
| [`E:\Apps\Multcar\PROTOCOLO_AD10_REVERIFICADO.md`](file:///E:/Apps/Multcar/PROTOCOLO_AD10_REVERIFICADO.md) | ⭐ **Especificação binária CORRETA** do AD10 |
| [`E:\Apps\Multcar\tools\reversing\ad10\`](file:///E:/Apps/Multcar/tools/reversing/ad10/) | Disassembladores + testes automatizados do protocolo |
| [`E:\Apps\Multcar\deploy.sh`](file:///E:/Apps/Multcar/deploy.sh) | Script de deploy automatizado na VPS |
| [`E:\Apps\Multcar\docker-compose.yml`](file:///E:/Apps/Multcar/docker-compose.yml) | Orquestração Docker na porta 3030 |
| [`E:\Apps\Multcar\server.js`](file:///E:/Apps/Multcar/server.js) | Servidor HTTP local (Porta 3030) |
| [`E:\Apps\Multcar\RELATORIO_COMPLETO_PROJETO_MULTCAR.md`](file:///E:/Apps/Multcar/RELATORIO_COMPLETO_PROJETO_MULTCAR.md) | Relatório técnico completo de todo o projeto |
| [`E:\Apps\Multcar\ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md`](file:///E:/Apps/Multcar/ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md) | Engenharia reversa (**histórico** — ver banner no topo) |

---

## 3. Comandos Rápidos na VPS Linux

- **Atualização Direta com 1 Comando:**
  ```bash
  multcar att
  ```
- **Se for o primeiro acesso à VPS:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/deploy.sh | bash
  ```
- **Outros comandos úteis:** `multcar status`, `multcar logs`, `multcar restart`.

---

## 4. Próximo Passo do Usuário no Veículo (v1.3.7)

> **📸 RESULTADO DOS TESTES DE 17-18/11 (v1.3.8):** o fix do loop funcionou — o app avança até a requisição de RPM (prints 07:19), mas a ECU ainda não devolve frame CAN (`0x600A`). O próximo passo é testar os botões do painel de experimentos. ⚠️ **Não repetir o erro da bateria: máximo 5 min de ignição II.**

> **🔋 PRÉ-REQUISITO: BATERIA DO CARRO CARREGADA.**
> Em 15/11 a bateria descarregou (ignição ligada ~2 h durante os testes). Para resolver sem gastar
> gasolina: **2ª marcha + empurrar para pegar no embalo** (solte a embreagem rápido) **ou** chupeta
> de outro carro. Não tente empurrar sozinho.

> **Estado:** o protocolo está **provado** (v1.2.5), o **can_scan** foi descoberto (15/11) e a
> v1.3.7 implementa a sequência correta. Falta só o teste de campo.

1. **Instalar a v1.3.7** — [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk)
   (badge **`v1.3.7 • 15/11`**). Se preferir, peça para instalar por **adb** (sem mexer no celular).
2. **Ignição na posição II** (painel aceso, LED do AD10 aceso) — **motor DESLIGADO** (não gasta combustível).
3. **Fechar todos os outros apps OBD2** (XTOOL oficial, Car Scanner, Torque).
4. **Bluetooth + Localização (GPS) LIGADOS.**
5. **Tocar em "📡 Conectar" e ESPERAR ~40 s:**
   - `0x6002` (sondagem) → `0x6001` (config CAN) → `0x6003` can_scan → **dongle reinicia**
   - **20 s de silêncio** (o dongle sobe)
   - **reconexão automática** → `0x6002` + `0x6001` de novo (reaplica config)
   - polling com `0x6001 [01][0F][CAN 10 bytes]`
6. **Abrir o Diagnóstico** (toque na Barra de Telemetria) e copiar o **log bruto**.

### 🧪 Como ler o log

| O que aparece | Significado |
|---|---|
| `✔ Reconectado ao AD10 — reenviando configuração CAN…` | reconexão após o restart OK ✅ |
| `✔ Quadro AD10 … cmd=0x600B payload=[60 03 01]` | **can_scan aceito** (status 0x01) ✅ |
| `✔ Quadro AD10 … cmd=0x6002 payload=[01 81 56 30 31 2E 32 30]` | **versão V01.20** ✅ |
| `🛰️ Frame CAN ID 0x07E8 …` | 🏁 **DEU CERTO** — a ECU respondeu |
| `📊 Resposta OBD2: modo=41 PID=0x0C …` | 🏁 **RPM chegando** |
| `⟪⟪⟪ BLE DESCONECTOU ⟫⟫⟫` | o dongle reiniciou (esperado no can_scan) |
| `Quadro não tratado cmd=0x600A` | chegou frame CAN, mas o layout do payload difere → **manda o log** |
| só `0x600B` sem `0x600A` | scanner ainda não iniciou → ver ajustes abaixo |

### Se ainda não chegar frame CAN

Ajustar em `multcar-app/www/index.html` → `buildAd10CanConfigEntries()`:

| Parâmetro | Valor atual | Alternativa |
|---|---|---|
| `OBD_PROTOCOL` | `0x01` (ISO15765-4 STD 500K) | `0x06` (CAN standard) |
| `REQ_BYE_2_BYE` | `0x0000` | `0x00C8` (200) |
| `OVER_2_START` | `0x0002` | `0x0000` |
| `FRAME_2_FRAME` | `0x0000` | `0x0002` |
| `BYE_2_BYE` | `0x0000` | `0x00C8` |
| `KEEP_LINE` | `0x00` | `0x0050` (80) |
| `FILTER_ID` | `0x07E0` + `0x07E8` | incluir `0x07DF` |

E, se o payload `0x600A` tiver outro layout, ajustar o `dataStart` em `handleAd10CanFrame()`
(o decoder já tolera 6 layouts).

### Plano B — capturar o app oficial (se o can_scan não bastar)

Ver [`CAPTURAR_TRAFEGO_OFICIAL.md`](file:///E:/Apps/Multcar/CAPTURAR_TRAFEGO_OFICIAL.md).
Com `adb` (USB ou WiFi) dá para extrair os bytes que o app oficial manda e replicar byte a byte.

### Ferramentas de análise (para a próxima sessão)

```powershell
# self-check do ambiente (base, alinhamento, tabelas)
python tools\reversing\ad10\fw_selfcheck.py

# disassemblar o firmware do dongle (base flash 0x08002000)
python tools\reversing\ad10\fw_dis.py 0x08005af0 0x08005c50 "ble_protocol_analy_char"

# disassemblar o app oficial (ARM64)
python tools\reversing\ad10\so_dis.py 0x18040 300

# testes automatizados do protocolo
node tools\reversing\ad10\test_frame.js
node tools\reversing\ad10\test_can_decode.js
```
