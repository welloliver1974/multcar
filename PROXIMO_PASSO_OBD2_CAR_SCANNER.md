# 🛰️ Handoff & Estado Atual do Projeto Multcar Pro

> **Arquivo de handoff do projeto.**  
> **Última atualização:** 13/nov/2026 (14:10) — **v1.2.4: Ativação Completa dos Transceptores CAN (`systerm enter`), Conexão GATT Estável e Seletor Dual-Mode!**  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle XTOOL Advancer AD10 (BLE 4.2 / Nordic UART Service)  
> **Dispositivo Principal:** Central Multimídia K2401 (Android 10) e Smartphone Android  

---

## 1. Status Geral do Projeto

1. **Diagnóstico da Incompatibilidade do AD10 com ELM327:**
   - Comprovado empiricamente no teste com o aplicativo **Car Scanner ELM OBD2**: o app não conseguiu sequer acessar o AD10.
   - A desmontagem forense do firmware ARM `ble_obd.bin` comprovou que o dongle opera estritamente em **frames binários proprietários (`0xAA ... 0x6002`)** e não possui interpretador AT.
2. **Ativação de Hardware CAN (`systerm enter` — v1.2.4):**
   - No handshake inicial, o Multcar Pro envia o sub-comando oficial `0x01` (`systerm enter` na função `0x80063c5` do microcontrolador), comutando os relés internos e alimentando os pinos 6 (CAN-H) e 14 (CAN-L).
   - Configura simultaneamente o protocolo `1` (`ISO15765-4 STD 500K` na enum `com.xtool.common.ObdProtocol`) e o protocolo `6`.
   - Lê a voltagem interna da bateria via ADC (sub-comando `0x81`) e versão de firmware (sub-comando `0x82`).
3. **Estabilidade GATT 100% Rock-Solid:**
   - Subscrição de notificações restrita ao canal `6E400003` (o único dotado de CCCD `0x2902`), eliminando o loop de desconexão "conecta e cai" e os erros `GATT 133` / `0x13`.
   - Transmissão padronizada em `6E400004` com prioridade `BleClient.write` (com confirmação) e fallback.
4. **Modo Dual com Seletor na Interface:**
   - **`⚡ AD10 Nativo`** (Padrão): Envia exclusivamente frames binários oficiais `0xAA`.
   - **`⚡ ELM327 Universal`**: Envia comandos AT ASCII puros para outros scanners universais.
5. **Identificação Visual no Topo:**
   - Badge no cabeçalho: **`v1.2.4 • 13/11 14:10`**.

---

## 2. Arquivos Prontos para Uso

| Arquivo / Caminho | Função |
| :--- | :--- |
| [`E:\Apps\Multcar\Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk) | APK Android nativo compilado v1.2.4 (4.06 MB — Build 14:10) |
| [`E:\Apps\Multcar\Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) | Espelho do instalador Android nativo |
| [`E:\Apps\Multcar\index.html`](file:///E:/Apps/Multcar/index.html) | Dashboard PWA standalone |
| [`E:\Apps\Multcar\preview-dashboard.html`](file:///E:/Apps/Multcar/preview-dashboard.html) | Espelho idêntico para testes e pré-visualização |
| [`E:\Apps\Multcar\deploy.sh`](file:///E:/Apps/Multcar/deploy.sh) | Script de deploy automatizado na VPS |
| [`E:\Apps\Multcar\docker-compose.yml`](file:///E:/Apps/Multcar/docker-compose.yml) | Orquestração Docker na porta 3030 |
| [`E:\Apps\Multcar\server.js`](file:///E:/Apps/Multcar/server.js) | Servidor HTTP local (Porta 3030) |
| [`E:\Apps\Multcar\RELATORIO_COMPLETO_PROJETO_MULTCAR.md`](file:///E:/Apps/Multcar/RELATORIO_COMPLETO_PROJETO_MULTCAR.md) | Relatório técnico completo de todo o projeto |
| [`E:\Apps\Multcar\ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md`](file:///E:/Apps/Multcar/ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md) | Especificação técnica reversa do protocolo binário CAN |

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

## 4. Próximo Passo do Usuário no Veículo (Versão v1.2.4)

1. **Instalar a versão v1.2.4:**
   - Baixar e instalar o [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk).
2. **Conferir o Carimbo no Cabeçalho:**
   - Ao abrir o app, confirme o badge verde no topo: **`v1.2.4 • 13/11 14:10`**.
3. **Ligar a Ignição do Prisma:**
   - Colocar a chave na posição II (painel aceso com ignição ligada ou motor funcionando).
4. **Tocar em "📡 Conectar":**
   - O app localiza o AD10, conecta o GATT, ativa as notificações em `0003` e executa a sequência `systerm enter` nativa.
   - O modo padrão já é **`⚡ AD10 Nativo`**.
5. **Acompanhar a Telemetria:**
   - O contador **RX** começará a subir com as respostas da ECU Delphi (`0xAB ... 0x41 ...`).
   - Os mostradores de RPM, Velocidade, Temperatura da Água e Tensão se moverão em tempo real.
   - Se desejar inspecionar o link, basta dar um toque em cima da **Barra de Telemetria** para abrir o modal de diagnóstico em tempo real.
