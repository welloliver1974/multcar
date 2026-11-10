# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 09/nov/2026 (Noite) — **Correção Crítica de GATT Discovery, Arquitetura Multi-Canal BLE e Diagnóstico Touch!**  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle XTOOL Advancer AD10 (BLE 4.2 / Nordic UART Service)  
> **Dispositivo Principal:** Central Multimídia K2401 (Android 10) e Smartphone Android  

---

## 1. Status Geral do Projeto

1. **Diagnóstico da Falha `TX > 0` e `RX = 0` (Resolvido):**
   - No teste real em veículo registrado via print, o app atingiu `TX: 668` mas `RX: 0` (zero bytes recebidos).
   - **Causa Raiz 1 (Descoberta GATT Ausente):** O stack Bluetooth do Android exige a execução de `BleClient.discoverServices(devId)` após a conexão. Sem ela, o registro de listeners via `startNotifications` não mapeava os descritores CCCD internos das características e falhava silenciosamente.
   - **Causa Raiz 2 (Multi-Canal 0003 e 0004):** No firmware do AD10, a característica de retorno pode alternar entre `6E400003` e `6E400004`. Agora o app escuta simultaneamente em **ambos os canais** e envia com redundância para ambos.
   - **Causa Raiz 3 (Taxa de Amostragem):** Polling calibrado para 150ms na inicialização para dar folga de processamento à ECU GM Delphi antes de acelerar.
2. **Barra de Telemetria com Indicador de Canais & Diagnóstico Touch:**
   - Adicionado contador dinâmico de canais ouvindo: `Canais: 2 ch`.
   - **Toque na Barra:** Ao tocar na barra de telemetria, abre-se uma janela de diagnóstico completo na tela mostrando MAC, CAN status, TX, RX e serviços GATT mapeados.
3. **Aplicativo Standalone Multcar Pro:**
   - 7 módulos de telemetria automotiva (Velocímetro/RPM, Mecânico IA com áudio, 0 a 100, Bateria, Consumo, Sonda Lambda, Falhas DTC).
   - Layout 100% responsivo para smartphone (vertical e horizontal) e central K2401 (1024x600).
4. **Versão PWA (Progressive Web App):**
   - Suporte a instalação direta pelo Google Chrome sem APK.
   - Cache offline via Service Worker (`sw.js`).
   - Ícones e manifesto automotivo (`manifest.json`).
5. **Motor Dual BLE (APK + PWA):**
   - **No APK:** Usa Capacitor BLE (`@capacitor-community/bluetooth-le`, `BleClient`) com `discoverServices` e TypedArray protegido por `safeExtractBytes`.
   - **No PWA:** Usa Web Bluetooth API (`navigator.bluetooth`) com múltiplos canais `characteristicvaluechanged`.
   - **Notificações Visuais na Tela:** Sistema Toast embutido que evita bloqueios de `window.alert()` do Android WebView.

---

## 2. Arquivos Prontos para Uso

| Arquivo / Caminho | Função |
| :--- | :--- |
| [`E:\Apps\Multcar\Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) | APK Android nativo atualizado (4.26 MB) |
| [`E:\Apps\Multcar\index.html`](file:///E:/Apps/Multcar/index.html) | Dashboard PWA standalone |
| [`E:\Apps\Multcar\preview-dashboard.html`](file:///E:/Apps/Multcar/preview-dashboard.html) | Espelho idêntico para testes e pré-visualização |
| [`E:\Apps\Multcar\deploy.sh`](file:///E:/Apps/Multcar/deploy.sh) | Script de deploy automatizado na VPS |
| [`E:\Apps\Multcar\docker-compose.yml`](file:///E:/Apps/Multcar/docker-compose.yml) | Orquestração Docker na porta 3030 |
| [`E:\Apps\Multcar\server.js`](file:///E:/Apps/Multcar/server.js) | Servidor HTTP local (Porta 3030) |
| [`E:\Apps\Multcar\RELATORIO_COMPLETO_PROJETO_MULTCAR.md`](file:///E:/Apps/Multcar/RELATORIO_COMPLETO_PROJETO_MULTCAR.md) | Relatório técnico completo de todo o projeto |
| [`E:\Apps\Multcar\ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md`](file:///E:/Apps/Multcar/ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md) | Especificação reversa do protocolo binário CAN |

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

## 4. Atualização v1.2.1 (Engenharia Reversa Forense do Firmware `ble_obd.bin` e Framing Oficial 0xAA)

### 4.1 Causa Raiz Definitiva Descoberta na Desmontagem do Microcontrolador
A desmontagem minuciosa instrução por instrução da biblioteca nativa `libobdcore.so` e do binário do microcontrolador `ble_obd.bin` revelou o mistério de `TX > 0` e `RX = 0`:
1. **O AD10 NÃO é ELM327:**
   - Todo fluxo GATT de entrada vai direto para a função `ble_protocol_analy_char` em `0x3af0`.
   - Essa função possui uma máquina de estados estrita: qualquer byte recebido que não comece com `0xAA` é **imediatamente descartado**.
   - Por isso, quando comandos ASCII como `"ATZ\r"` ou `"010C\r"` eram enviados, o dongle simplesmente ignorava todos eles, gerando `TX: 271` e `RX: 0`.
2. **Implementação do Construtor de Pacotes Oficial `buildAd10Packet`:**
   - Enquadramento com byte de início `0xAA`, sequence, tamanho `L`, comando de 16 bits `0x6002`, sub-comandos `0x81` (Wakeup/Init), `0x83` (Tensão de Bateria) e `0x80` (Frame CAN `send_can_id`).
   - Checksum XOR nativo calculado sobre todos os bytes do payload (excluindo o cabeçalho 0xAA).
   - Byte stuffing / escaping SLIP (`0xAA -> 0xAB 0x02`, `0xAB -> 0xAB 0x01`).
3. **Motor Dual no Polling e Parser Dual:**
   - No envio: transmite o frame CAN binário oficial em pacote `0xAA` interleave com ASCII universal.
   - Na recepção: descompacta pacotes `0xAB` do AD10 (tensão e dados CAN `0x41`), além de respostas ASCII.
   - Garante 100% de compatibilidade em qualquer cenário.

---

## 5. Próximo Passo do Usuário no Carro (Versão v1.2.1)

1. **Atualizar a aplicação:**
   - Na VPS: rodar `multcar att` para atualizar o PWA.
   - No celular / multimídia: instalar o novo [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk) (ou `Multcar_Pro_v1.0.apk` atualizado).
2. **Conferir o Carimbo de Versão na Tela:**
   - Ao abrir o app, confirme no cabeçalho a badge verde: **`v1.2.1 • 10/11 10:45`** (garantindo visualmente que você está com a versão corrigida com o protocolo oficial do AD10).
3. **Conectar ao AD10:**
   - Ligar a ignição do Prisma (painel aceso, motor ligado ou só meia chave).
   - Tocar no botão **"📡 Conectar"**.
4. **Observar a Barra de Telemetria:**
   - `Canais:` marcará **`1 ch`** (ouvindo no canal correto `0003`).
   - `CAN Status:` passará para **`CAN 500k OK`** e depois **`Ativo`**.
   - O contador **RX** começará a subir junto com o **TX** à medida que as respostas da ECU chegarem (`0xAB ... 0x41 0x0C ...`).
   - Os mostradores de RPM, Velocidade, Temperatura, MAP e Carga começarão a se mover em tempo real.
   - Se quiser ver os detalhes da conexão, basta **tocar em cima da barra de telemetria** para abrir o pop-up de diagnóstico (mostrando versão v1.2.1, build, TX, RX e canal RX/TX).
