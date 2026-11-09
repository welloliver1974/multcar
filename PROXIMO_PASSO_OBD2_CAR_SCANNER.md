# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 09/nov/2026 — **Correção do Handshake CAN Pinos 6+14, Padding ISO 15765-4 (8 bytes) e Barra de Telemetria!**  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle XTOOL Advancer AD10 (BLE 4.2 / Nordic UART Service)  
> **Dispositivo Principal:** Central Multimídia K2401 (Android 10) e Smartphone Android  

---

## 1. Status Geral do Projeto

1. **Protocolo Proprietário & Barramento CAN Nativo:**
   - Engenharia reversa aprofundada na biblioteca nativa C++ `libobdcore.so` do APK oficial XTOOL revelou a string de configuração do transceptor de hardware:
     `CAN,std,0,pin:6+14,07df/07e0/07f0,period:0/2/200/80/1000\r\n`
   - O dongle AD10 possui multiplexador interno com chaveamento de pinos. Sem esse comando inicial de inicialização e o ping de acordar `[0x81, 0x00, 0x81]`, o rádio CAN nos pinos 6 e 14 permanecia em repouso.
   - **Correção Crítica de Padding:** O ECM GM Delphi do Prisma 2015 exige frames com DLC fixo de 8 bytes (ISO 15765-4). Comandos OBD2 curtos sem preenchimento eram descartados pela ECU como frames corrompidos. Foi adicionado padding automático com `0x55` completando os 8 bytes.
2. **Barra de Telemetria Integrada no Painel:**
   - Adicionada barra de status no topo do painel:
     - `CAN:` Indica o estado do transceptor (Aguardando / Configurando... / CAN 500k OK).
     - `TX:` Contador incremental de pacotes enviados pelo app.
     - `RX:` Contador incremental de pacotes e respostas recebidas do carro.
     - `RX Hex:` Exibição dos bytes brutos mais recentes recebidos do dongle.
3. **Aplicativo Standalone Multcar Pro:**
   - 7 módulos de telemetria automotiva (Velocímetro/RPM, Mecânico IA com áudio, 0 a 100, Bateria, Consumo, Sonda Lambda, Falhas DTC).
   - Layout 100% responsivo para smartphone (vertical e horizontal) e central K2401 (1024x600).
4. **Versão PWA (Progressive Web App):**
   - Suporte a instalação direta pelo Google Chrome sem APK.
   - Cache offline via Service Worker (`sw.js`).
   - Ícones e manifesto automotivo (`manifest.json`).
5. **Motor Dual BLE (APK + PWA):**
   - **No APK:** Usa Capacitor BLE (`@capacitor-community/bluetooth-le`, `BleClient`) com acesso direto ao rádio Android e TypedArray seguro com `byteOffset`/`byteLength`.
   - **No PWA:** Usa Web Bluetooth API (`navigator.bluetooth`) com `acceptAllDevices: true`.
   - **Notificações Visuais na Tela:** Sistema Toast embutido que evita bloqueios de `window.alert()` do Android WebView.

---

## 2. Arquivos Prontos para Uso

| Arquivo / Caminho | Função |
| :--- | :--- |
| [`E:\Apps\Multcar\Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) | APK Android nativo atualizado (4.25 MB) |
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

## 4. Próximo Passo do Usuário no Carro

1. **Atualizar a aplicação:**
   - Na VPS: rodar `multcar att` para atualizar o PWA.
   - No celular / multimídia: reinstalar com o novo [`Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) ou recarregar a página do Chrome.
2. **Conectar ao AD10:**
   - Ligar a ignição do Prisma (painel aceso).
   - Tocar no botão **"📡 Conectar"**.
3. **Observar a nova Barra de Telemetria:**
   - Verificar se `CAN:` muda para `CAN 500k OK` ou `Ativo`.
   - Verificar o contador **TX** subindo (comandos enviados para o carro).
   - Verificar o contador **RX** subindo e o campo **RX Hex** mostrando os bytes retornados pela ECU.
   - Conferir se os ponteiros de RPM, Velocidade, Temperatura e Bateria começam a se mover imediatamente.
