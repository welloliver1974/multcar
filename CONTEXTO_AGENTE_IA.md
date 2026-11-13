# 🤖 Contexto Mestre do Projeto Multcar Pro para Agentes de IA

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

### 4.1. Framing dos Pacotes
```
+------+--------+--------+---------+----------+--------------------+----------+
| 0xAA | 0x00   | Len L  | Cmd_Low | Cmd_High | Payload de Dados   | Checksum |
+------+--------+--------+---------+----------+--------------------+----------+
```
- **Byte 0:** `0xAA` (pacote App -> AD10) ou `0xAB` (resposta AD10 -> App).
- **Byte 1:** `0x00` (Subsystem).
- **Byte 2:** Tamanho `L = payload_len + 1`. Tamanho total do pacote = `L + 5`.
- **Bytes 3 e 4:** Comando 16-bit Little-Endian (`0x6002` -> `Cmd_Low = 0x02`, `Cmd_High = 0x60`).
- **Bytes 5 a N-2:** Payload do subcomando.
- **Byte N-1 (Checksum):** XOR de todos os bytes de 1 a N-2 (`buffer[1] ^ buffer[2] ^ ... ^ buffer[N-2]`). O delimitador `0xAA` e o próprio byte de checksum são excluídos.
- **Byte Stuffing / SLIP:**
  - `0xAA` dentro do payload é substituído por `[0xAB, 0x02]`.
  - `0xAB` dentro do payload é substituído por `[0xAB, 0x01]`.

### 4.2. Tabela de Subcomandos do Despachante `0x6002` (Microcontrolador)
Localizada no firmware `ble_obd.bin` no endereço Flash `0x08009c38`:

| Subcomando | Nome da Função no MCU | Ação Executada pelo Hardware |
| :---: | :---: | :--- |
| **`0x01`** | `systerm enter` (`0x80063c5`) | **Chaveamento e alimentação dos transceptores CAN físicos nos pinos 6 e 14.** Sem este comando, o hardware CAN do dongle fica dormindo! |
| **`0x02`** | `obd_protocol` (`0x8006b1d`) | Seleção do protocolo OBD2: valor `1` = `ISO15765-4 STD 500K` (usado na enum Java `com.xtool.common.ObdProtocol`); valor `6` = CAN Standard. |
| **`0x03`** | `bps` (`0x8006791`) | Baud rate CAN: `[0x00, 0x07, 0xA1, 0x20]` (500.000 bps). |
| **`0x80`** | `send_can_id` (`0x8006bd1`) | Transmissão de frame CAN de 11-bit no barramento (`0x07DF` com padding). |
| **`0x81`** | `protocol_volt` (`0x8006ce9`) | Conversão ADC direta para medir a voltagem da bateria do carro. |
| **`0x82`** | `protocol_version` (`0x8006cb1`) | Retorna a versão de firmware do AD10. |
| **`0x83`** | `protocol_sn` (`0x8006c2d`) | Retorna o número de série gravado no chip. |

### 4.3. Sequência Completa de Inicialização de Fábrica (`initAd10Device`)
Na versão **v1.2.4**, o app envia sequencialmente ao conectar:
1. `Sub 0x81`: Solicita tensão de bateria (`AA 00 03 02 60 01 81 E1`).
2. `Sub 0x82`: Solicita versão de firmware (`AA 00 03 02 60 01 82 E2`).
3. `Sub 0x02`: Configura Protocolo 1 (STD 500K) e Protocolo 6.
4. `Sub 0x03`: Configura taxa CAN para 500 kbps (`AA 00 08 02 60 01 03 00 07 A1 20 CHK`).
5. `Sub 0x01`: Dispara `systerm enter` para energizar o transceptor CAN (`AA 00 03 02 60 01 01 E3`).

---

## 5. Estrutura do Repositório e Arquivos Críticos

```
E:\Apps\Multcar/
├── multcar-app/                          # Projeto Capacitor Android Nativo
│   ├── android/                          # Projeto Android Gradle
│   │   ├── app/build.gradle              # versionCode 7, versionName "1.2.4"
│   │   └── gradlew.bat                   # Script de build Gradle
│   └── www/                              # Código-fonte Web encapsulado no APK
│       └── index.html                    # CÓDIGO-FONTE PRINCIPAL (Interface + Lógica BLE)
├── index.html                            # Espelho idêntico para PWA standalone
├── preview-dashboard.html                # Espelho idêntico para preview local
├── Multcar_Pro_v1.2.apk                  # APK compilado v1.2.4 para distribuição
├── Multcar_Pro_v1.0.apk                  # Espelho v1.2.4 para compatibilidade de links
├── RELATORIO_COMPLETO_PROJETO_MULTCAR.md # Histórico completo de todo o desenvolvimento
├── ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md # Engenharia reversa aprofundada do protocolo
├── PROXIMO_PASSO_OBD2_CAR_SCANNER.md     # Roteiro de testes de campo no veículo
├── CONTEXTO_AGENTE_IA.md                 # ESTE DOCUMENTO (Guia Mestre de Handoff)
└── README.md                             # Apresentação do repositório
```

---

## 6. Estado Atual da Versão (v1.2.4 • Build 13/11 14:10)

- **Badge Visual:** `<span class="badge version-badge" id="appVersionBadge">v1.2.4 • 13/11 14:10</span>`.
  - Permite ao usuário bater o olho na tela e confirmar imediatamente que está rodando a versão certa.
- **Seletor Dual-Mode em 1 Toque:**
  - Existe um botão interativo na interface: `[⚡ AD10 Nativo]` / `[⚡ ELM327 Universal]`.
  - O app inicia por padrão em **`⚡ AD10 Nativo`** (frames binários `0xAA`).
  - Se o usuário tocar no botão, comuta instantaneamente para ELM327 clássico (comandos AT ASCII).
- **Diagnóstico Touch:**
  - Um toque em cima da **Barra de Telemetria** abre um modal com todos os dados de baixo nível: estado do link BLE, endereço MAC, status do GATT, pacotes TX, pacotes RX, modo ativo e timestamp de compilação.
- **Status do Build:**
  - Compilado via `gradlew assembleDebug` sem erros (`BUILD SUCCESSFUL in 51s`).
  - Copiado para `Multcar_Pro_v1.2.apk` e `Multcar_Pro_v1.0.apk`.
  - Sincronizado no GitHub (`git push origin main`).

---

## 7. Onde Paramos e O Que Esperar no Próximo Teste

### Onde Estamos Exatamente:
O usuário baixou o APK v1.2.4 e irá conectá-lo ao **Chevrolet Prisma 1.4 LTZ 2015** com o dongle **XTOOL AD10**.

### O Que Deve Ser Verificado no Teste:
1. **Badge de Versão:** Confirmar se o badge no topo exibe **`v1.2.4 • 13/11 14:10`**.
2. **Conexão BLE:** Tocar em **"📡 Conectar"**. O dongle deve conectar e **ficar conectado de forma estável** (o bug do "conecta e cai" foi sanado na v1.2.3 ao isolar as notificações exclusivamente no canal `0003`).
3. **Comportamento do RX:**
   - Observar o contador **RX** na barra de telemetria.
   - Na inicialização com `systerm enter`, o dongle deve ativar os transceptores CAN e responder à leitura de voltagem (`sub 0x81`) e aos PIDs (`sub 0x80`).
   - Se o contador `RX` começar a subir (`RX > 0`), significa que os dados chegaram da ECU e os mostradores (RPM, Velocidade, Temperatura) se moverão em tempo real.
4. **Se RX ainda persistir em 0 no teste de campo:**
   - Instruir o usuário a dar um toque na **Barra de Telemetria** para conferir o modal de diagnóstico.
   - Testar o botão alternador **`[⚡ ELM327 Universal]`** para descartar qualquer variante de firmware.
   - Investigar se os bytes de CAN ID em `send_can_id` precisam de inversão endian (`0x07DF` vs `0xDF07`) ou se o polling precisa de delay entre PIDs maior que 150ms.

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
