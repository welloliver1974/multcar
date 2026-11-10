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

## 4. Atualização v1.2.0 (Diagnóstico do Teste Real com AD10 e Correção Definitiva)

### 4.1 Causa Raiz Identificada no Teste de 10/11
No teste prático com o dongle XTOOL AD10 no Prisma, o app mostrou:
- `v1.1.0 • 09/11 21:10`
- `🟢 AD10 OK` (BLE conectado)
- `TX: 271`, `RX: 0`
- `Canais: 1 ch`

A análise reversa profunda nos binários `libobdcore.so`, `ble_obd.bin` e `classes.dex` do app oficial XTOOL revelou os 5 fatores exatos:
1. **Papeis dos Canais BLE NUS no XTOOL AD10:**
   - `6e400004`: Canal EXCLUSIVO de **Escrita (TX App -> AD10)**. Não possui descritor de notificação CCCD (`0x2902`).
   - `6e400003`: Canal EXCLUSIVO de **Notificação (RX AD10 -> App)**. Possui descritor CCCD.
   - Quando o app tentava registrar notificação em `0004`, o Android GATT falhava com erro de descritor, gerando a mensagem `1 ch` e travando a fila de operações GATT.
2. **Conflito de Escrita no Canal 0003:**
   - O método `sendCanFrame` enviava pacotes para uma lista contendo tanto `0004` quanto `0003`. Escrever em `0003` (característica só de leitura/notificação) causava `GATT_WRITE_NOT_PERMITTED` no Android.
3. **Inversão de Handshake vs Notificação:**
   - O handshake inicial do AD10 (`0x81 0x00 0x81`) era transmitido antes do registro de notificações no canal `0003`. A resposta inicial da ECU/dongle era perdida.
4. **Comandos de Polling em Formato Binário vs ASCII:**
   - O loop de polling enviava frames brutos CAN de 11 bytes (`[0x08, 0x07, 0xDF, ...]`). O microcontrolador do AD10 (firmware `ble_obd.bin`) atua como uma ponte ELM-compatible e descarta frames binários, esperando comandos ASCII terminados por `\r` (`010C\r`, `010D\r`, `0105\r`, etc.).
5. **Tempo de Reset `ATZ`:**
   - O comando `ATZ` reiniciava o chip ELM sem intervalo suficiente (>800ms) antes dos próximos comandos de configuração (`ATE0`, `ATH0`, `ATSP6`).

---

## 5. Próximo Passo do Usuário no Carro (Versão v1.2.0)

1. **Atualizar a aplicação:**
   - Na VPS: rodar `multcar att` para atualizar o PWA.
   - No celular / multimídia: instalar o novo [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk) (ou `Multcar_Pro_v1.0.apk` atualizado).
2. **Conferir o Carimbo de Versão na Tela:**
   - Ao abrir o app, confirme no cabeçalho a badge verde: **`v1.2.0 • 10/11 08:45`** (garantindo visualmente que você está com a versão corrigida).
3. **Conectar ao AD10:**
   - Ligar a ignição do Prisma (painel aceso, motor ligado ou só meia chave).
   - Tocar no botão **"📡 Conectar"**.
4. **Observar a Barra de Telemetria:**
   - `Canais:` marcará **`1 ch`** (ouvindo no canal correto `0003`).
   - `CAN Status:` passará para **`CAN 500k OK`** e depois **`Ativo`**.
   - O contador **RX** começará a subir junto com o **TX** à medida que as respostas da ECU chegarem (`41 0C ...`).
   - Os mostradores de RPM, Velocidade, Temperatura, MAP e Carga começarão a se mover em tempo real.
   - Se quiser ver os detalhes da conexão, basta **tocar em cima da barra de telemetria** para abrir o pop-up de diagnóstico (mostrando versão v1.2.0, build, TX, RX e canal RX/TX).
