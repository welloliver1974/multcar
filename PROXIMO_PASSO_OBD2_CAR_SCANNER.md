# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 08/nov/2026 — **PWA, Web Bluetooth e Motor Dual BLE Implementados!**  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle XTOOL Advancer AD10 (BLE 4.2 / Nordic UART Service)  
> **Dispositivo Principal:** Central Multimídia K2401 (Android 10) e Smartphone Android  

---

## 1. Status Geral do Projeto

1. **Protocolo Proprietário:** 100% decodificado a partir do APK oficial `AD10EN_V2.0.3_C203.apk`.
   - Serviço BLE: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
   - TX (Envio): `6E400004` | RX (Notificações): `6E400003`
   - Padrão CAN: 11-bit a 500 kbps (Broadcast `0x07DF`, Resposta ECM `0x07E8`).
2. **Aplicativo Standalone Multcar Pro:**
   - 7 módulos de telemetria automotiva (Velocímetro/RPM, Mecânico IA com áudio, 0 a 100, Bateria, Consumo, Sonda Lambda, Falhas DTC).
   - Layout 100% responsivo para smartphone (vertical e horizontal) e central K2401 (1024x600).
3. **Versão PWA (Progressive Web App):**
   - Suporte a instalação direta pelo Google Chrome sem APK.
   - Cache offline via Service Worker (`sw.js`).
   - Ícones e manifesto automotivo (`manifest.json`).
4. **Motor Dual BLE (APK + PWA):**
   - **No APK:** Usa Capacitor BLE (`@capacitor-community/bluetooth-le`, `BleClient`) com acesso direto ao rádio Android.
   - **No PWA:** Usa Web Bluetooth API (`navigator.bluetooth`) com `acceptAllDevices: true`.
   - **Notificações Visuais na Tela:** Sistema Toast embutido que evita bloqueios de `window.alert()` do Android WebView.

---

## 2. Arquivos Prontos para Uso

| Arquivo / Caminho | Função |
| :--- | :--- |
| [`E:\Apps\Multcar\Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) | APK Android nativo atualizado (4.25 MB) |
| [`E:\Apps\Multcar\index.html`](file:///E:/Apps/Multcar/index.html) | Dashboard PWA standalone |
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

## 4. Próximo Passo do Usuário

1. **Testar conexão BLE no carro:**
   - Plugar o AD10 na porta OBD2 do Prisma e ligar a chave (ignição).
   - Abrir o app (seja via APK ou PWA).
   - Tocar em **"📡 Conectar"** e selecionar o **AD10** na janela que abre.
2. **Validar leitura em tempo real & Novos Recursos:**
   - Observar velocímetro, conta-giros, temperatura da água e tensão da bateria.
   - No celular em pé: conferir o **Computador de Bordo** (Consumo instantâneo em `L/h` parado ou `km/L` rodando, abertura da borboleta TBI e tempo de viagem).
   - Testar o botão **"🤖 Parecer IA"** para ouvir o diagnóstico por voz do motor em português.
   - Se desejar testar aceleração, acelerar de 0 a 100 km/h para gravar o recorde no painel.
