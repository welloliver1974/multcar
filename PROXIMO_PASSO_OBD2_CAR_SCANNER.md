# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 13/nov/2026 (22:10) — **v1.2.5: PROTOCOLO BINÁRIO DO AD10 CORRIGIDO!**  
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

## 4. Próximo Passo do Usuário no Veículo (v1.2.5)

> **Estado:** APK instalado e testado **no celular** (instalação OK). **Falta o teste de campo.**

1. **Instalar a v1.2.5** — baixar e instalar o [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk).
2. **Conferir o carimbo:** badge verde no topo com **`v1.2.5 • 13/11`**.
3. **Preparar o ambiente:**
   - Ignição do Prisma na **posição II** (painel todo aceso, LED do AD10 aceso).
   - **Fechar todos** os outros apps OBD2 (XTOOL oficial, Car Scanner, Torque).
   - **Bluetooth + Localização (GPS) LIGADOS** no celular.
4. **Tocar em "📡 Conectar"** e observar a telemetria.
5. **Abrir o Diagnóstico** (toque na **Barra de Telemetria**) e copiar o **log bruto**.

### Como interpretar o log

| O que aparece | Significado |
|---|---|
| `TX AA 00 03 60 02 01 82 E2` | ✅ quadro saindo com **cmd big-endian** (bug 1 corrigido) |
| `✔ Quadro AD10 seq=… cmd=0x6002 payload=[…]` | 🎉 **o dongle respondeu** (bug 2 corrigido) |
| `AD10 Número de Série: …` | protocolo 100% funcionando |
| `⚠️ RX checksum inválido` | ainda é bug de framing → mandar o log |
| `🛰️ Frame CAN ID 0x07E8 …` + `📊 Resposta OBD2: …` | 🏁 **dados da ECU chegando** |

### Se o `0x6002` responder mas o carro não responder

O link e o framing estão perfeitos; o que falta é só a configuração do scanner CAN.
Ajustar, em `multcar-app/www/index.html` → `buildAd10CanConfigEntries()`:

| Parâmetro | Valor atual | Alternativa |
|---|---|---|
| `OBD_PROTOCOL` | `0x01` (ISO15765-4 STD 500K) | `0x06` (CAN standard) |
| `FRAME_2_FRAME` | `0x0000` | — |
| `OVER_2_START` | `0x0002` | — |
| `REQ_BYE_2_BYE` | `0x00C8` (200) | — |
| `KEEP_LINE` | `0x50` (80) | — |
| `FILTER_ID` | `0x07E0` + `0x07E8` | incluir `0x07DF` |

Referência de período: a string `CAN,std,0,pin:6+14,07df/07e0/07f0,period:0/2/200/80/1000`
do app ELM327 da própria XTOOL.

### Ferramentas de análise (para a próxima sessão)

```powershell
# disassemblar o firmware do dongle (base flash 0x08002000)
python tools\reversing\ad10\fw_dis.py 0x08005af0 0x08005c50 "ble_protocol_analy_char"

# disassemblar o app oficial (ARM64)
python tools\reversing\ad10\so_dis.py 0x18040 300

# testes automatizados do protocolo
node tools\reversing\ad10\test_frame.js
node tools\reversing\ad10\test_can_decode.js
```
