# 🤖 Contexto Mestre do Projeto Multcar Pro para Agentes de IA

> ## 🚨 CORREÇÃO CRÍTICA (13/11/2026, v1.2.5) — LEIA ANTES DE TUDO
>
> A engenharia reversa feita até a v1.2.4 **tinha dois erros que nunca permitiriam ler o carro**:
>
> 1. **O ID do comando era enviado em LITTLE-ENDIAN.** O firmware do dongle compara
>    `(frame[3] << 8) | frame[4]` (BIG-ENDIAN) contra a tabela `0x6001..0x6009`.
>    A v1.2.4 mandava `02 60` e o dongle calculava `0x0260` → **nenhum handler era acionado** → RX = 0.
> 2. **O parser de resposta do app esperava `0xAB`/`0xAA`.** O dongle responde com
>    cabeçalho **`0x55`** e escapa com **`0x56`**. Mesmo com o TX corrigido, nada era decodificado.
>
> Além disso, o **mapa de sub-comandos estava errado** (`0x81` não é voltagem, `0x82` não é versão,
> e `0x01/0x02/0x03` não existem no grupo `0x6002`).
>
> ✅ **Fonte da verdade:** [`PROTOCOLO_AD10_REVERIFICADO.md`](PROTOCOLO_AD10_REVERIFICADO.md)
> (verificado no firmware `ble_obd.bin` **e** no app oficial `libobdcore.so`, com disassemblador real via Capstone).
>
> **Comandos de análise que funcionam:**
> ```powershell
> # disassemblar o firmware do dongle (base flash 0x08002000)
> python scratch\fw_dis.py 0x08005af0 0x08005c50 "ble_protocol_analy_char"
> # disassemblar o app oficial (ARM64)
> python scratch\so_dis.py 0x18040 300
> ```

> **Atenção para qualquer IA que assumir esta conversa:**  
> Este documento é o resumo técnico definitivo, sem rodeios, de **tudo o que foi feito**, **as causas raízes descobertas**, **as armadilhas já superadas**, o **estado atual do código** e **onde paramos exatamente**.  
> Leia atentamente antes de sugerir ou alterar qualquer linha de código!

---

## 1. O Projeto e o Cenário Real do Usuário

- **Veículo do Usuário:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015).
  - Injeção eletrônica: ECU Delphi (padrão GM).
  - Protocolo físico da porta OBD2: **ISO 15765-4 CAN (11-bit / 500 kbps)**.
  - Pinos OBD2: Pinos físicos **6** (CAN High) e **14** (CAN Low).
  - Identificadores CAN: Broadcast universal de requisição: `0x07DF`. Resposta da ECU: `0x07E8`.
  - Requisito da ECU GM Delphi: Exige **padding de 8 bytes** (preenchimento com `0x55`). Requisições com DLC menor que 8 bytes são ignoradas pela ECU.
- **Hardware OBD2 do Usuário:** **XTOOL Advancer AD10** (Bluetooth Low Energy 4.2 - BLE).
- **Dispositivos Alvo:**
  1. Central Multimídia Android K2401 (Allwinner T507 / 2 GB RAM / Android 10 / Resolução 1024x600).
  2. Smartphone Android do usuário (onde o APK de teste é instalado e validado na prática).

---

## 2. A Verdade Fundamental sobre o XTOOL AD10 (ELM327 vs AD10)

> [!CAUTION]
> **O XTOOL AD10 NÃO É UM ELM327!**  
> Nunca tente tratar o AD10 como um clone ELM327 comum. Isso foi testado exaustivamente e comprovado tanto por engenharia reversa quanto em testes no carro.

1. **Prova Empírica:** O usuário testou o consagrado aplicativo **Car Scanner ELM OBD2** e o **ELM327 Identifier** com o AD10 plugado no Prisma. O Car Scanner **não conseguiu sequer conectar** ao dongle (tempo limite / falha de protocolo).
2. **Engenharia Reversa Forense do Firmware (`ble_obd.bin`):**
   - O microcontrolador do AD10 (ARM Cortex-M) não possui interpretador AT ASCII.
   - Todo fluxo de bytes recebido via BLE cai diretamente na função `ble_protocol_analy_char` (`0x3af0`).
   - Se o byte recebido não for o delimitador `0xAA`, ele é **descartado imediatamente**.
   - Por isso, no início o app exibia `TX > 0` mas `RX = 0`: comandos ASCII (`"ATZ\r"`, `"010C\r"`) eram jogados no lixo pelo microcontrolador do dongle.

---

## 3. Arquitetura de Comunicação BLE GATT do AD10

O dongle opera sobre o perfil **Nordic UART Service (NUS)**:

| Característica / Serviço | UUID | Propriedades GATT | Papel no Multcar |
| :--- | :--- | :--- | :--- |
| **Service Principal** | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` | Primary Service | Mapeado na descoberta |
| **Canal 0004 (TX)** | `6E400004-B5A3-F393-E0A9-E50E24DCCA9E` | `WRITE`, `WRITE_NO_RESPONSE` | **Canal EXCLUSIVO de escrita** (App -> Dongle). NÃO possui CCCD `0x2902`. |
| **Canal 0003 (RX)** | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` | `NOTIFY`, `READ` | **Canal EXCLUSIVO de notificação** (Dongle -> App). ÚNICO com descritor CCCD `0x2902`. |

### ⚠️ As 3 Grandes Armadilhas GATT Já Resolvidas (NÃO MEXA):
1. **O Erro "Conecta e Cai" (Loop de Status "Configurando..." / GATT 133 / 0x13):**
   - *Causa:* Se o app chamar `startNotifications` em `6E400004`, o Android tenta escrever no descritor CCCD `0x2902` (que não existe em 0004). O firmware do AD10 ou a pilha Android derrubam o link BLE com status `0x13` logo após a conexão.
   - *Regra de Ouro:* **Apenas subscrever notificações em `6E400003`!**
2. **Erro de Escrita Ilegal em Canal Read-Only:**
   - *Causa:* Chamar `BleClient.write` em `6E400003` dispara `GATT_WRITE_NOT_PERMITTED`.
   - *Regra de Ouro:* **Apenas escrever em `6E400004`!**
3. **Tipo de Escrita (`WRITE_TYPE_DEFAULT` vs `NO_RESPONSE`):**
   - O app oficial XTOOL (`BleConnector.java`) usa `WRITE_TYPE_DEFAULT` (write com confirmação / ATT opcode `0x12`).
   - O plugin Capacitor BLE trava por 10s se esperar callback de `writeWithoutResponse`.
   - *Regra de Ouro:* Sempre priorizar `BleClient.write` (com confirmação) e usar fallback se necessário.

---

## 4. Estrutura do Protocolo Binário Oficial XTOOL AD10

### 4.1. Framing dos Pacotes (REVERIFICADO em 13/11/2026 — v1.2.5)

> ⚠️ **O framing da v1.2.4 estava ERRADO** (little-endian no comando e `0xAB` na resposta).
> Abaixo está o framing **correto**, validado no firmware `ble_obd.bin` e no app oficial `libobdcore.so`.

**Requisição (App → Dongle):**
```
+------+--------+--------+---------+----------+--------------------+----------+
| 0xAA | seq    | Len L  | Cmd_Hi | Cmd_Lo  | Payload de Dados   | Checksum |
+------+--------+--------+---------+----------+--------------------+----------+
```
- **Byte 0:** `0xAA` (delimitador de início).
- **Byte 1:** número de sequência (incrementado a cada envio).
- **Byte 2:** `L = payload_len + 1`. Tamanho total do quadro = `L + 5`.
- **Bytes 3 e 4:** Comando 16-bit **BIG-ENDIAN** (`0x6002` → `0x60`, `0x02`).
  O firmware compara `(frame[3] << 8) | frame[4]` contra a tabela `0x6001..0x6009`.
- **Bytes 5 a N-2:** Payload do comando.
- **Byte N-1 (Checksum):** XOR de todos os bytes de 1 a N-2 (`buffer[1] ^ … ^ buffer[N-2]`).
  Equivalente a `seq ^ L ^ XOR(cmd_hi, cmd_lo, payload…)`.
- **Byte Stuffing / SLIP:** `0xAA` → `[0xAB, 0x02]`; `0xAB` → `[0xAB, 0x01]`.

**Resposta (Dongle → App):**
```
+------+--------+--------+---------+----------+--------------------+----------+
| 0x55 | seq    | Len L  | Cmd_Hi | Cmd_Lo  | Payload de Dados   | Checksum |
+------+--------+--------+---------+----------+--------------------+----------+
```
- **Byte 0:** `0x55` (⚠️ **não** é `0xAB`).
- **Byte Stuffing / SLIP:** `0x55` → `[0x56, 0x02]`; `0x56` → `[0x56, 0x01]`.

Detalhe completo: [`PROTOCOLO_AD10_REVERIFICADO.md`](PROTOCOLO_AD10_REVERIFICADO.md).

### 4.2. Tabela de Subcomandos (REVERIFICADA em 13/11/2026 — v1.2.5)

> ⚠️ **A tabela abaixo da v1.2.4 estava ERRADA.** A tabela real está em
> `PROTOCOLO_AD10_REVERIFICADO.md`. Resumo corrigido:
>
> - **Comando `0x6002`** (payload `[n, sub…]`): `0x80`=protocol_volt, `0x81`=protocol_version,
>   `0x82`=protocol_sn, `0x83`=cur_status, `0x84`=cur_bps, `0x85`=can_type.
>   **Não existem** `0x01/0x02/0x03` neste grupo.
> - **Comando `0x6001`** (payload `[n, (sub, dados)…]`): `0x01`=obd_protocol(1 byte),
>   `0x02`=bps(4 bytes BE), `0x0E`=filter_frame_len(1), `0x10`=can_filter_type(1),
>   `0x11`=can_filter_cnt(1), `0x12`=filter IDs (N×4 bytes BE), `0x04`/`0x05`/`0x06`=períodos(2 bytes BE),
>   `0x07`=keep_line(1), `0x16`=send_can_id(4 bytes BE).
> - **Comando `0x6009`**: "systerm enter" (liga os transceptores CAN dos pinos 6/14) — é um
>   comando de **nível superior**, não um sub-comando do `0x6002`.
> - **Comando `0x600A`**: notificação espontânea do dongle com o frame CAN da ECU.

Localizada no firmware `ble_obd.bin` na **tabela plana em `0x0800bbf4`** (base do flash = `0x08002000`):

| Cmd | Handler | Sub-tabela |
|---|---|---|
| `0x6001` | `0x080064ad` | `0x0800bc3c` → sub `0x01`–`0x16` |
| `0x6002` | `0x080064ad` | `0x0800bcec` → sub `0x80`–`0x86` |
| `0x6003` | `0x08005d55` | `0x0800bd24` → sub `0x01`–`0x05` |
| `0x6007` / `0x6008` | `0x08005fad` / `0x08005e5d` | atualização de firmware |
| `0x6009` | `0x080063c5` | "systerm enter" |

### 4.3. Sequência de Inicialização (`initAd10Device`) — v1.2.5

Na versão **v1.2.5**, ao conectar, o app envia:

1. **Sondagem `0x6002`** (payload `[n, sub…]`) — funciona **sem o carro**, valida o framing de ponta a ponta:
   - `0x82` → número de série
   - `0x81` → versão do firmware
   - `0x80` → tensão do dongle
   - `0x85` → tipo de CAN
2. **Configuração CAN `0x6001`** (payload `[n, (sub, dados)…]`) — sequência idêntica à do app oficial
   (`CAD10Prot::InitHardware`, `libobdcore.so` @ `0x15d20`):
   `obd_protocol(1)` · `bps(500000)` · `filter_frame_len(0)` · `can_filter_type(2)` ·
   `can_filter_cnt(2)` · `filter_frame([07E0][07E8])` · `frame_2_frame(0)` ·
   `over_2_start(2)` · `request_bye_2_bye(200)` · `keep_line(80)` · `keep_line_frame_len(0)`

> **O próprio dongle faz o scanning OBD2** (o firmware tem o módulo `obd_scan`), então o app
> **não** envia requisições OBD2: apenas configura e consome o fluxo de frames `0x600A`.
>
> A cada ~2 s o app reenvia a configuração CAN (o dongle pode reiniciar o scanner sozinho).

---

## 5. Estrutura do Repositório e Arquivos Críticos

```
E:\Apps\Multcar/
├── multcar-app/                          # Projeto Capacitor Android Nativo
│   ├── android/                          # Projeto Android Gradle
│   │   ├── app/build.gradle              # versionCode 8, versionName "1.2.5"
│   │   └── gradlew.bat                   # Script de build Gradle
│   └── www/                              # Código-fonte Web encapsulado no APK
│       └── index.html                    # CÓDIGO-FONTE PRINCIPAL (Interface + Lógica BLE)
├── index.html                            # Espelho idêntico para PWA standalone
├── preview-dashboard.html                # Espelho idêntico para preview local
├── Multcar_Pro_v1.2.apk                  # APK compilado v1.2.5 para distribuição
├── Multcar_Pro_v1.0.apk                  # Espelho v1.2.5 para compatibilidade de links
├── PROTOCOLO_AD10_REVERIFICADO.md        # ⭐ FONTE DA VERDADE do protocolo binário (v1.2.5)
├── tools/reversing/ad10/                 # ⭐ Disassembladores + testes automatizados do protocolo
├── RELATORIO_COMPLETO_PROJETO_MULTCAR.md # Histórico completo de todo o desenvolvimento
├── ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md # Engenharia reversa (HISTÓRICO — ver banner no topo)
├── PROBLEMA_ATUAL_RX_ZERO.md             # Diagnóstico do RX=0 (causa raiz encontrada)
├── PROXIMO_PASSO_OBD2_CAR_SCANNER.md     # Roteiro de testes de campo no veículo
├── CONTEXTO_AGENTE_IA.md                 # ESTE DOCUMENTO (Guia Mestre de Handoff)
└── README.md                             # Apresentação do repositório
```

---

## 6. Estado Atual da Versão (v1.2.5 • Build 13/11 — Protocolo AD10 Corrigido)

- **Badge Visual:** `<span class="badge version-badge" id="appVersionBadge">v1.2.5 • 13/11</span>`
  (texto curto para não estourar a tela da K2401 1024×600; descrição completa no `title`).
- **Protocolo:** quadro de requisição `0xAA` com **cmd big-endian**; resposta `0x55` com escape `0x56`.
- **Sub-comandos:** `AD10_CFG` (grupo `0x6001`) e `AD10_OBD` (grupo `0x6002`) — tabelas reescritas a partir do firmware.
- **Parser de resposta:** re-assembla quadros entre notificações BLE e valida o checksum.
- **Notificações `0x600A`:** frames CAN da ECU → decoder ISO-TP robusto (6 layouts testados).
- **Seletor Dual-Mode em 1 Toque:**
  - Botão `[⚡ AD10 Nativo]` / `[⚡ ELM327 Universal]`.
  - Padrão: **`⚡ AD10 Nativo`** (frames binários `0xAA`).
  - O modo ELM327 serve para dongles ELM327 reais — **o AD10 não tem interpretador AT** (confirmado no firmware).
- **Diagnóstico Touch:** um toque na **Barra de Telemetria** abre o modal com log **TX/RX bruto**,
  contador de quadros OK/inválidos e o botão **"🛰️ Reenviar configuração CAN"**.
- **Testes automatizados:**
  - `node tools/reversing/ad10/test_frame.js` — round-trip do quadro contra o parser real do firmware.
  - `node tools/reversing/ad10/test_can_decode.js` — decoder de frames CAN em 6 layouts de payload.
- **Status do Build:** `gradlew assembleDebug` → `BUILD SUCCESSFUL`; copiado para `Multcar_Pro_v1.2.apk`
  e `Multcar_Pro_v1.0.apk`; sincronizado no GitHub.

---

## 7. Onde Paramos e O Que Esperar no Próximo Teste

### Onde Estamos Exatamente:
A v1.2.5 foi **compilada, instalada e testada no celular** (instalação OK, badge ajustado).
**Falta o teste de campo no veículo** — ainda não foi feito.

### O Que Deve Ser Verificado no Teste (no carro):
1. **Badge de Versão:** confirmar **`v1.2.5 • 13/11`**.
2. **Conexão BLE:** tocar em **"📡 Conectar"**. O link deve ficar estável (notificações só no canal `0003`).
3. **Sondagem `0x6002` (não precisa do carro):** o log deve mostrar
   `✔ Quadro AD10 seq=… cmd=0x6002 …` e `AD10 Número de Série: …`.
   → Se isso aparecer, **o framing está 100% correto** e o resto é só a parte CAN.
4. **Resposta do carro:** o dongle deve emitir notificações `0x600A` com os frames da ECU
   (`🛰️ Frame CAN ID 0x07E8 …` e `📊 Resposta OBD2: modo=41 PID=0x0C …`).
5. **Se o RX continuar em 0 no veículo:**
   - Abrir o **Diagnóstico BLE** e copiar o **log bruto**.
   - Ajustar os **valores de período** do scanner (`frame_2_frame`, `over_2_start`,
     `request_bye_2_bye`, `keep_line` — hoje `0/2/200/80`) e/ou o `obd_protocol`
     (hoje `1`; alternativa `6` = CAN standard).
   - Confirmar o **layout do payload `0x600A`** (o decoder já é tolerante a 6 layouts).

---

## 8. Guia Rápido de Comandos para a IA

Se você precisar fazer novos ajustes e compilar um novo APK:

```powershell
# 1. Editar multcar-app/www/index.html (e atualizar o badge de versão)
# 2. Replicar para os espelhos:
Copy-Item 'multcar-app\www\index.html' 'index.html' -Force
Copy-Item 'multcar-app\www\index.html' 'preview-dashboard.html' -Force

# 3. Sincronizar com o projeto Android Capacitor:
cd multcar-app
npx cap copy android

# 4. Compilar o APK via Gradle (executar com BypassSandbox: true se necessário para o daemon):
cd android
.\gradlew.bat assembleDebug --no-daemon

# 5. Copiar o APK final para a raiz do projeto:
cd ..\..
Copy-Item 'multcar-app\android\app\build\outputs\apk\debug\app-debug.apk' 'Multcar_Pro_v1.2.apk' -Force
Copy-Item 'multcar-app\android\app\build\outputs\apk\debug\app-debug.apk' 'Multcar_Pro_v1.0.apk' -Force

# 6. Commitar e subir pro Git (BypassSandbox: true para network):
git add -A
git commit -m "build(release): ..."
git push origin main
```

---
*Documento compilado e validado em 13/nov/2026 às 15:15.*

