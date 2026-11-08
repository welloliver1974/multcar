# 📘 Relatório Completo do Projeto Multcar Pro

> **Data:** 08 de Novembro de 2026  
> **Veículo Alvo:** Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015)  
> **Hardware:** Dongle OBD2 XTOOL Advancer AD10 (BLE 4.2)  
> **Dispositivo Principal:** Central Multimídia Android K2401 (Allwinner T507 / 2 GB RAM / Android 10)  
> **Status:** Concluído com Sucesso — Do Bloqueio Inicial ao APK Standalone Compilado.

---

## 📑 Índice
1. [Resumo Executivo](#1-resumo-executivo)
2. [O Bloqueio Original e o Veredito](#2-o-bloqueio-original-e-o-veredito)
3. [Engenharia Reversa do Dongle XTOOL AD10](#3-engenharia-reversa-do-dongle-xtool-ad10)
4. [Especificação Técnica do Protocolo](#4-especificação-técnica-do-protocolo)
5. [Desenvolvimento do Núcleo do Protocolo (TypeScript)](#5-desenvolvimento-do-núcleo-do-protocolo-typescript)
6. [Módulos do Aplicativo Multcar Pro](#6-módulos-do-aplicativo-multcar-pro)
7. [Mecânico IA Multi-Provedor](#7-mecânico-ia-multi-provedor)
8. [Empacotamento e Compilação do APK Android](#8-empacotamento-e-compilação-do-apk-android)
9. [Guia de Instalação no Carro](#9-guia-de-instalação-no-carro)
10. [Mapeamento Completo dos Arquivos do Projeto](#10-mapeamento-completo-dos-arquivos-do-projeto)

---

## 1. Resumo Executivo

O objetivo inicial era utilizar o dongle **XTOOL Advancer AD10** no aplicativo **Car Scanner ELM OBD2** na central multimídia K2401 do Chevrolet Prisma. Diante da incompatibilidade do dongle com aplicativos genéricos ELM327, tomou-se a decisão estratégica de **não comprar novo hardware**, mas sim realizar **engenharia reversa no APK oficial (`AD10EN_V2.0.3_C203.apk`)** para decodificar seu protocolo proprietário e criar um aplicativo completo, moderno, sob medida e com inteligência artificial integrada: o **Multcar Pro**.

---

## 2. O Bloqueio Original e o Veredito

* **O Sintoma:** O Car Scanner e o Torque encontravam o dongle no escaneamento BLE, mas ao tentar conectar emitiam erro imediato de conexão recusada.
* **O Teste Definitivo:** Foi executado o teste com o aplicativo especializado **ELM327 Identifier** conectado à porta OBD2 do Prisma com ignição ligada.
* **O Resultado:** O dongle **não respondeu a nenhum comando AT do padrão ELM327**.
* **A Conclusão:** O XTOOL AD10 opera exclusivamente com firmware proprietário baseado em frames binários sobre Bluetooth Low Energy (GATT).

---

## 3. Engenharia Reversa do Dongle XTOOL AD10

Para desvendar a comunicação, o APK oficial `AD10EN_V2.0.3_C203.apk` (60.6 MB) foi descompactado e analisado:

1. **Classes DEX (`classes.dex`):**
   * Mapeamento de 178 classes internas da XTOOL.
   * Identificação do serviço de transporte: `com.diagnosis.obdbluetooth.BleConnector`.
   * Identificação do gerenciador de comandos e empacotamento: `com.xtooltech.ad10.Utils`.
   * Identificação dos modelos de dados: `com.xtool.obd.*` e `com.diagnosis.obdcore.*`.

2. **Biblioteca Nativa C/C++ (`libobdcore.so`):**
   * Mapeamento de métodos JNI: `Java_com_diagnosis_obdcore_ObdImplment_nativeSendReceive`, `nativeInitDevice`, `nativeGetValueByPid`, `nativeGetTroubleCode`.

---

## 4. Especificação Técnica do Protocolo

### 4.1. Identificadores BLE GATT (Nordic UART Service)
O dongle utiliza a arquitetura clássica da Nordic Semiconductor (NUS):

| Função | UUID | Descrição |
| :--- | :--- | :--- |
| **Service UUID** | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` | Serviço principal de comunicação |
| **TX Characteristic** | `6E400004-B5A3-F393-E0A9-E50E24DCCA9E` | Escrita do App para o Dongle (Write) |
| **RX Characteristic** | `6E400003-B5A3-F393-E0A9-E50E24DCCA9E` | Notificações do Dongle para o App (Notify) |
| **CCCD Descriptor** | `00002902-0000-1000-8000-00805f9b34fb` | Habilitado escrevendo `[0x01, 0x00]` |
| **Tamanho do Chunk** | `20 bytes` | Fragmentação obrigatória para respeito ao BLE MTU |

### 4.2. Estrutura do Frame CAN (Prisma 1.4 - Barramento 11-bit / 500k)
Descompilação do método `com.xtooltech.ad10.Utils.comboCanCommand`:

```
+------------+------------+------------+------------+------------+------------+
| Byte 0     | Byte 1     | Byte 2     | Byte 3     | Byte 4     | Byte 5     |
| 0x08       | 0x07       | 0xDF       | Tamanho    | Modo OBD   | PID OBD    |
+------------+------------+------------+------------+------------+------------+
```

* `0x08`: Flag de cabeçalho CAN standard.
* `0x07, 0xDF`: Identificador CAN Broadcast padrão OBD2 (`0x07DF`).
* `Tamanho`: Quantidade de bytes da carga útil (`0x02` para consulta Mode 01).
* `Modo`: `0x01` para dados em tempo real.
* `PID`: Sensor solicitado (ex: `0x0C` para RPM, `0x05` para Temperatura da Água).

### 4.3. Fórmulas de Decodificação das Respostas
As respostas da ECU chegam via notificação da característica `6E400003` vindas do identificador do motor (`0x7E8`):

* **RPM:** $\text{RPM} = \frac{(A \times 256) + B}{4}$
* **Temperatura do Líquido de Arrefecimento:** $\text{Temp (°C)} = A - 40$
* **Velocidade:** $\text{Velocidade (km/h)} = A$
* **Tensão da Bateria / Módulo:** $\text{Tensão (V)} = \frac{(A \times 256) + B}{1000}$
* **Pressão Absoluta no Coletor (MAP):** $\text{MAP (kPa)} = A$
* **Carga do Motor:** $\text{Load (\%)} = \frac{A \times 100}{255}$
* **Ajustes de Combustível (STFT / LTFT Flex):** $\text{Trim (\%)} = \frac{(A - 128) \times 100}{128}$

---

## 5. Desenvolvimento do Núcleo do Protocolo (TypeScript)

Criamos uma camada de software robusta, modular e totalmente tipada dentro de `multcar-app/src`:

1. **`AD10Constants.ts`:** Centralização dos UUIDs, descritores, IDs de barramento e constantes.
2. **`CanProtocol.ts`:** Montador de pacotes CAN 11b e 29b, fragmentador de chunks de 20 bytes e decodificador das respostas com algoritmo de CRC.
3. **`PidDefinitions.ts`:** Catálogo calibrado de sensores específicos do motor GM 1.4 SPE/4 Flex.
4. **`DtcDatabase.ts` & `DtcService.ts`:** Dicionário completo de falhas em português com causas prováveis e recomendações de conserto, além dos métodos de leitura (Mode 03/07) e reset (Mode 04).
5. **`ObdPollingQueue.ts`:** Escalonador inteligente com fila de alta prioridade (100ms para RPM/Velocidade), média (1s para Temperatura/Tensão) e baixa (3s para sensores secundários).

### Bateria de Testes Unitários (`src/test_protocol.ts`)
Executados diretamente no Node.js v26 com aprovação em 100% dos testes:
* ✅ Codificação de frames CAN 11-bit idêntica à do app original da XTOOL.
* ✅ Precisão matemática dos sensores (RPM a 2000, Água a 92°C, Tensão a 14.50V).
* ✅ Decodificação de códigos de falha reais (`P0300` e `P0118`) com recomendações em português.
* ✅ Fila de polling priorizada sem conflitos.

---

## 6. Módulos do Aplicativo Multcar Pro

A interface foi desenhada no arquivo interativo `multcar-app/preview-dashboard.html` e distribuída em **7 Módulos**:

1. **📊 Painel em Tempo Real (Dashboard):**
   * Conta-giros com fundo escuro e ponteiro progressivo.
   * Velocímetro real medido pela ECU.
   * Termômetro digital com zonas dinâmicas de cor (Azul frio < 80°C, Verde ideal 80-98°C, Amarelo atenção 99-104°C, Vermelho perigo > 105°C).
   * Voltímetro com indicação do alternador.
   * Vácuo do coletor (MAP) e Carga do motor em tempo real.
   * **Shift-Light Esportivo:** Régua superior de 10 LEDs virtuais com flash piscante no limite de giro (6.150 RPM).

2. **⏱️ Teste de Arrancada (0 a 100 km/h):**
   * Detecção de largada automática quando o carro sai de 0 km/h.
   * Tempos de 0 a 60 km/h, 0 a 100 km/h, 200m e 400m (quarto de milha).

3. **🔋 Saúde da Bateria na Partida (Cranking Test):**
   * Mede a tensão de repouso e a queda de tensão no momento exato em que o motor de arranque gira (avisa se a bateria cair para menos de 9.5V).

4. **⛽ Computador de Bordo & Viagem:**
   * Consumo instantâneo (km/L em movimento e L/h parado no semáforo).
   * Consumo médio, litros gastos e custo estimado em R$ da viagem.

5. **🔬 Osciloscópio da Sonda Lambda:**
   * Gráfico contínuo desenhado via Canvas em tempo real (onda de 0.1V a 0.9V).

6. **🛠️ Scanner de Diagnóstico (DTC):**
   * Leitura de falhas ativas e pendentes.
   * Botão para apagar falhas e desligar a luz de injeção no painel (Mode 04).

7. **📋 Raio-X da ECU (Modo 09):**
   * Leitura do Chassi (VIN real) gravado na injeção, calibração GM (CALID) e prontidão dos monitores de emissão.

---

## 7. Mecânico IA Multi-Provedor

Integrado na aba **"🤖 Mecânico IA"**, o sistema avalia a telemetria ao vivo com o auxílio de Large Language Models (LLMs) em formato compatível com o padrão OpenAI:

### Provedores Suportados:
* **⚡ Groq:** `llama-3.3-70b-versatile` (Gratuito, respostas ultrarrápidas em ~0.3s).
* **🧠 Google Gemini:** `gemini-2.0-flash` (Gratuito, análise técnica profunda).
* **🌐 OpenRouter:** Acesso a modelos abertos e gratuitos (`meta-llama/llama-3.3-70b-instruct:free`, `deepseek`).
* **🟢 NVIDIA NIM:** Modelos de alta precisão da Nvidia.
* **⚙️ Personalizado / Local:** Para quem roda Ollama ou LM Studio em casa (`http://localhost:11434/v1`).

### Recursos Especiais de IA:
* **Diagnóstico em 1 Clique:** Envia o estado completo dos sensores e falhas para a IA com a persona de um Engenheiro Mecânico Chefe da GM.
* **Chat Interativo:** Permite tirar dúvidas sobre o carro em linguagem natural.
* **🔊 Leitura por Voz nos Alto-Falantes:** O botão *"Ouvir no Carro"* utiliza síntese de voz nativa (Text-to-Speech) para falar o diagnóstico pela multimídia K2401 enquanto você dirige.

---

## 8. Empacotamento e Compilação do APK Android

Para transformar a interface em um aplicativo nativo para a central multimídia e celular:

1. **Estrutura com Capacitor:**
   * Configuração de projeto nativo Android em `multcar-app/android`.
   * Instalação e sincronização do plugin `@capacitor-community/bluetooth-le@8.3.0`.
2. **Permissões no `AndroidManifest.xml`:**
   * `BLUETOOTH`, `BLUETOOTH_ADMIN`, `ACCESS_FINE_LOCATION` (Android 10 / K2401).
   * `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (Android 12+).
   * `INTERNET` (para consultas à IA).
   * Suporte nativo a telas horizontais de multimídia.
3. **Compilação com Gradle:**
   * Configuração do JDK 21 do Android Studio em `android/gradle.properties`:  
     `org.gradle.java.home=C:\\Program Files\\Android\\Android Studio\\jbr`.
   * Execução da compilação: `.\gradlew.bat assembleDebug`.
   * **Resultado:** Compilação finalizada em 3m 5s com sucesso (124 tarefas executadas).
   * **APK Gerado:** `E:\Apps\Multcar\Multcar_Pro_v1.0.apk` com tamanho ultra-leve de **4.2 MB**.

---

## 9. Guia de Instalação no Carro

### Como instalar na Central Multimídia K2401 (via Pendrive):
1. Conecte um pendrive no computador e copie o arquivo [`Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk).
2. Plugue o pendrive na porta USB da sua central K2401.
3. Abra o aplicativo **Gerenciador de Arquivos** da central, localize o `.apk` e toque para instalar.

### Como instalar via ADB Wi-Fi:
Com a central conectada na mesma rede Wi-Fi do seu computador:
```powershell
adb connect IP_DA_CENTRAL:5555
adb install -r "E:\Apps\Multcar\Multcar_Pro_v1.0.apk"
```

### Como instalar no Smartphone:
Envie o arquivo [`Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk) para o celular (via WhatsApp, Google Drive ou cabo) e instale para usar no bolso.

---

## 10. Mapeamento Completo dos Arquivos do Projeto

```
E:\Apps\Multcar\
│
├── Multcar_Pro_v1.0.apk                         # [APK FINAL] Aplicativo compilado pronto para instalação (4.25 MB)
├── index.html                                   # Dashboard PWA standalone completo (HTML5 + CSS + JS)
├── preview-dashboard.html                       # Cópia para visualização rápida no navegador
├── manifest.json                                # Manifesto PWA (Tela cheia, cores de tema, ícones)
├── sw.js                                        # Service Worker para funcionamento 100% offline
├── server.js                                    # Servidor HTTP local em Node.js (Porta 3030)
├── icon-192.png                                 # Ícone automotivo PWA 192x192
├── icon-512.png                                 # Ícone automotivo PWA 512x512
├── capacitor.js                                 # Ponte nativa Capacitor Core
├── bluetooth-le.js                              # Driver nativo Capacitor Bluetooth Low Energy
├── ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md        # Documento da engenharia reversa do Bluetooth LE e CAN
├── PROXIMO_PASSO_OBD2_CAR_SCANNER.md            # Histórico do diagnóstico e tomada de decisão
├── RELATORIO_COMPLETO_PROJETO_MULTCAR.md        # Este relatório completo atualizado
├── PLANO_OTIMIZACAO_K2401.md                    # Documentação de hardware da multimídia K2401
├── AD10EN_V2.0.3_C203.apk                       # APK original da XTOOL usado na engenharia reversa
│
└── multcar-app/                                 # Código-fonte completo do projeto Capacitor
    ├── www/                                     # Diretório de distribuição web e PWA
    │   ├── index.html                           # Interface responsiva com motor BLE dual
    │   ├── manifest.json                        # Manifesto PWA
    │   ├── sw.js                                # Cache offline
    │   ├── capacitor.js                         # Ponte nativa
    │   └── bluetooth-le.js                      # Plugin BLE Android
    ├── package.json                             # Dependências do projeto (Capacitor 8 + TypeScript)
    ├── tsconfig.json                            # Configuração TypeScript
    ├── capacitor.config.json                    # Configuração nativa do Capacitor
    ├── src/                                     # Código TypeScript modular
    │   ├── test_protocol.ts                     # Bateria de testes unitários do protocolo
    │   └── services/
    │       ├── ble/
    │       │   ├── AD10Constants.ts             # UUIDs, descritores e MTU
    │       │   ├── CanProtocol.ts               # Montador de frames CAN e parser
    │       │   └── ObdPollingQueue.ts           # Escalonador de leitura priorizado
    │       └── obd/
    │           ├── PidDefinitions.ts            # PIDs calibrados do Prisma 1.4 SPE/4 Flex
    │           ├── DtcDatabase.ts               # Dicionário de falhas em português
    │           └── DtcService.ts                # Leitor e limpador de DTCs (Mode 03/04/07)
    └── android/                                 # Projeto Android nativo do Android Studio
        ├── app/build/outputs/apk/debug/app-debug.apk # APK gerado pelo Gradle
        └── gradle.properties                    # Configuração com JDK 21 (Android Studio JBR)
```

---

## 11. Evolução para Progressive Web App (PWA)

Para oferecer uma alternativa leve, sem necessidade de instalação manual de APK ou permissões de "fontes desconhecidas" no celular, o Multcar Pro foi evoluído para suportar **PWA (Progressive Web App)**:

1. **Manifest Automotivo (`manifest.json`):**
   * Configuração de `display: "standalone"`, eliminando barras de endereço e menus do navegador.
   * Ícones automotivos próprios de alta definição (192px e 512px) gerados com o emblema estilizado do projeto.
   * Orientação adaptável (`orientation: "any"`), permitindo rotação fluida entre vertical e horizontal.

2. **Funcionamento 100% Offline (`sw.js`):**
   * Estratégia de cache Stale-While-Revalidate para o dashboard, estilos e banco de dados DTC.
   * Roteamento seletivo que preserva as consultas dinâmicas de IA externas (Groq, Gemini, OpenRouter) sem retenção indevida de cache.

3. **Botão de Instalação Integrado:**
   * Detecção do evento `beforeinstallprompt` do navegador com botão contextual "📲 Instalar" no cabeçalho.

---

## 12. Arquitetura Dual-Engine Bluetooth (Nativo + Web Bluetooth)

Para garantir que o app funcione com máxima performance tanto dentro do APK nativo quanto no navegador Chrome do celular, foi desenvolvido um controlador de transporte híbrido:

| Ambiente | Motor Utilizado | Como opera |
| :--- | :---: | :--- |
| **APK Nativo (Android 10/11/12/13/14)** | `@capacitor-community/bluetooth-le` | Utiliza o stack de rádio nativo do Android com chamadas JNI diretas (`BleClient`). |
| **PWA no Chrome Android** | `navigator.bluetooth` (Web Bluetooth) | Utiliza a API padrão Web Bluetooth do Chromium com `acceptAllDevices: true` e autorização GATT. |

Ambos os motores convergem para o mesmo codificador/decodificador de frames CAN 11-bit (`0x08, 0x07, 0xDF...`) e o mesmo sistema de leitura de PIDs GM SPE/4.

---

## 13. Diagnóstico e Resolução de Falhas de Conexão

### Causa Raiz do "Não conecta e não dá mensagem nenhuma":
1. **Supressão de Alertas pelo WebView:** Dentro de um WebView Android (Capacitor/Cordova), chamadas a `window.alert()` são ignoradas pelo sistema operacional a menos que um `WebChromeClient` personalizado seja injetado. Como o código anterior caía no fallback de alerta, a tela ficava estática.
2. **Filtro Estrito no Web Bluetooth:** O filtro anterior exigia nome prefixado exatamente com `AD10`. Se o dongle anunciasse um nome com sufixo ou caracteres nulos, a seleção era abortada com `NotFoundError`, silenciada pelo bloco catch.

### Correções Implementadas:
1. **Sistema Visual Toast / Modal (`showToast`):**
   * Criação de um popup visual estilizado no tema automotivo (escuro com bordas em ciano, amarelo e vermelho).
   * Feedback detalhado a cada etapa: *"Inicializando Bluetooth"*, *"Procurando AD10"*, *"Conectando..."*, *"Conectado!"*.
   * Mensagens de ajuda claras caso o Bluetooth ou a Localização/GPS do celular estejam desativados.
2. **Varredura Irrestrita (`acceptAllDevices: true`):**
   * No PWA, a janela de pareamento agora lista todos os dispositivos BLE disponíveis para seleção direta pelo motorista.
3. **Ponte Nativa Injetada no APK:**
   * Inclusão dos módulos `capacitor.js` e `bluetooth-le.js` no pacote local do app.

---

## 14. Hospedagem HTTPS e Cloudflare Tunnel

Como a especificação de segurança do Google Chrome exige uma origem segura (HTTPS ou `localhost`) para conceder permissão à Web Bluetooth API, a solução de conectividade foi estruturada:

* **Servidor Local Node.js (`server.js`):**
  * Servidor HTTP estático nativo rodando na porta `3030`.
* **Túnel Cloudflare (`cloudflared`):**
  * Configurado com protocolo `--protocol http2` para eliminar perdas de pacotes QUIC/UDP no Windows.
  * Compatibilidade com túneis próprios do Cloudflare Zero Trust apontando para `http://localhost:3030`.

---

## 15. Engenharia Reversa da Auto-Conexão BLE (`BluetoothHelper`)

### 15.1. Por que o AD10 não aparece na lista de Bluetooth do Celular?
O sistema operacional Android faz uma distinção rigorosa entre:
1. **Bluetooth Classic (BR/EDR):** Fones de ouvido, aparelhos de som e scanners ELM327 clássicos. Exigem pareamento manual prévio nas *Configurações do Android*, com código PIN (1234 ou 0000).
2. **Bluetooth Low Energy (BLE 4.2+):** Dispositivos periféricos GATT como o XTOOL AD10. **Eles não aparecem nas Configurações de Bluetooth do Android** e nunca devem ser pareados manualmente por lá. A comunicação só ocorre quando um aplicativo abre um scanner BLE direto via rádio.

### 15.2. A Descoberta no Bytecode do App Oficial
Ao descompilar o arquivo `classes.dex` do aplicativo original `AD10EN_V2.0.3_C203.apk`, foram analisadas as classes `com.xtooltech.ad10.BluetoothHelper` e seus callbacks internos (`BluetoothHelper$2` e `BluetoothHelper$3`):

```java
// Reconstrução a partir do bytecode Dalvik descompilado (codeOff: 3698276):
public void onScanResult(int callbackType, ScanResult result) {
    ScanRecord scanRecord = result.getScanRecord();
    BluetoothDevice device = result.getDevice();
    String name = device.getName();
    String mac = device.getAddress();
    int rssi = result.getRssi();

    if (TextUtils.equals(name, "AD10")) {
        // Encontrou o aparelho! Cancela o escaneamento na hora
        BluetoothHelper.this.stopScanBluetooth();
        
        // Conecta automaticamente sem abrir janela nem exibir listas
        BluetoothHelper.this.notifyAd10Found(new AD10Device(name, mac, rssi, scanRecord));
        
        // Grava o MAC para reconexão direta no futuro
        SharedUtils.put("key_last_mac", mac);
    }
}
```

O método `startScan()` revelou dois comportamentos cruciais:
1. **Reconexão Direta:** Se o aplicativo já possui o endereço MAC salvo em `key_last_mac`, ele executa `蓝牙直接连接:` (Conexão direta), ligando-se ao dongle em milissegundos sem necessidade de escanear.
2. **Auto-Conexão em Varredura:** Se o MAC não estiver salvo, ele inicia a busca BLE em segundo plano (`蓝牙开始扫描:`) e conecta sozinho assim que encontra o identificador `"AD10"`, **sem nunca exigir que o motorista selecione o aparelho em uma lista**.

### 15.3. Implementação da Mesma Mecânica no Multcar Pro
Essa mecânica exata foi reproduzida no `multcar-app/www/index.html`:

1. **Reconexão Expressa:** Verifica `localStorage.getItem('ad10_last_mac')`. Se existir, conecta diretamente ao dispositivo GATT e ativa as notificações na característica `6E400003`.
2. **Varredura e Conexão Automática:** Se for o primeiro uso, dispara `BleClient.requestLEScan({}, callback)`. Quando um periférico com nome `"AD10"` é detectado, interrompe o scan imediatamente com `BleClient.stopLEScan()`, conecta ao GATT, ativa os PIDs de telemetria e grava o MAC para os próximos usos.
3. **No Navegador (PWA):** Como navegadores web impõem a restrição de segurança de exigir o clique do usuário, o seletor nativo do Chrome foi configurado com `acceptAllDevices: true`, permitindo que o AD10 seja selecionado imediatamente no topo da lista.

---

## 16. Checklist de Validação no Veículo

Para garantir o teste perfeito no Chevrolet Prisma:

1. **Alimentação OBD2:** Conecte o AD10 na porta de diagnóstico (abaixo do volante à esquerda) e **vire a chave do carro na ignição (painel aceso)**. O LED do AD10 deve acender, iniciando a transmissão de rádio BLE.
2. **Permissões do Smartphone:**
   - **Bluetooth:** Ativado.
   - **Localização / GPS:** Ativado (requisito de segurança obrigatório do sistema Android para permitir que apps detectem sinais de rádio BLE).
3. **Isolamento de Conexão:** Certifique-se de fechar completamente outros apps de scanner (como o app oficial da XTOOL ou Car Scanner) para que a porta de comunicação BLE não fique ocupada.
4. **Toque Único:** Abra o Multcar Pro e toque em **"📡 Conectar"**. O app localiza o AD10, conecta automaticamente e inicia o fluxo de telemetria em tempo real.

---

## 17. Deploy Automatizado na VPS (Docker & Nginx)

Para garantir hospedagem permanente e independente com suporte a HTTPS e download direto do APK:

* **Repositório Público no GitHub:** [https://github.com/welloliver1974/multcar](https://github.com/welloliver1974/multcar)
* **Comando Único de Instalação na VPS:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/deploy.sh | bash
  ```
* **Infraestrutura Conteinerizada:**
  * `Dockerfile`: Container baseado em `nginx:alpine` (~20MB) com compressão gzip e cabeçalhos de controle de cache para PWA.
  * `docker-compose.yml`: Serviço persistente mapeado na porta `3030` (`restart: unless-stopped`).
  * `deploy.sh`: Script idempotente que atualiza o código via Git e reinicia o serviço com zero downtime.
  * Distribuição do instalador nativo diretamente em: `http://IP_DA_VPS:3030/Multcar_Pro_v1.0.apk`.

---

## 18. Expansão de Interface: Computador de Bordo & Dinâmica de Pilotagem

Com o layout em orientação vertical (retrato) no smartphone apresentando espaço livre na parte inferior, a interface do dashboard principal foi aprimorada com dois blocos de alta utilidade técnica:

### 18.1. Barra de Saúde do Veículo & Parecer IA em 1 Toque
* **Monitoramento Ativo:** Indicador pulsante em LED RGB integrado (Verde para nominal, Amarelo para falhas leves ou DTCs, Vermelho para temperaturas críticas > 104°C).
* **Voz do Mecânico de Bordo:** Botão `"🤖 Parecer IA"` que executa síntese de voz (TTS) em português brasileiro com diagnóstico audível instantâneo da injeção eletrônica, alternador e arrefecimento, sem necessidade de digitação ou de tirar os olhos da pista.

### 18.2. Grade 2x2 do Computador de Bordo (Dinâmica)
1. **Consumo Instantâneo Inteligente:**
   * Utiliza a fórmula de densidade de velocidade (*Speed-Density*) calibrada para a cilindrada do motor SPE/4 1.4 GM (1.389 cm³) cruzando MAP, RPM e LTFT.
   * **Comportamento Idêntico ao Painel Digital Chevrolet:** Quando o veículo está parado no sinal (< 2 km/h), o display comuta automaticamente para `L/h` (ex: ~0.9 a 1.1 L/h em marcha lenta com ar desligado). Em movimento, converte em tempo real para `km/L`.
2. **Posição da Borboleta (TBI):**
   * Leitura direta do PID `0x11` com percentual numérico e barra de aceleração responsiva de 0 a 100%.
3. **Tempo de Viagem:**
   * Cronômetro automático em formato `HH:MM:SS` que contabiliza a duração da viagem e o tempo de funcionamento do motor desde a inicialização.
4. **Recorde de Aceleração 0 a 100 km/h:**
   * Memorização persistente no `localStorage` do smartphone, registrando o menor tempo histórico de aceleração com badge comemorativo.

---

## 19. CLI Automático da VPS: `multcar att`

Para facilitar a manutenção contínua e eliminar comandos longos no terminal da VPS, foi criado o CLI `multcar`:

* **Instalação em 1 Toque:**
  ```bash
  curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/install-cli.sh | bash
  ```
* **Comando de Atualização Automática:**
  ```bash
  multcar att
  ```
  *(ou `multcar update`)*
* **O que ele faz por trás dos panos:**
  1. Conecta ao repositório GitHub e baixa as últimas atualizações da branch `main`.
  2. Reconstrói os containers Docker sem cache ou reinicia o serviço Node/PM2.
  3. Atualiza os arquivos estáticos do PWA e o instalador nativo do APK na porta 3030.
* **Outros comandos rápidos:**
  * `multcar status`: Exibe o estado em tempo real dos containers.
  * `multcar logs`: Acompanha a saída de logs do Nginx / servidor.
  * `multcar restart`: Reinicia rapidamente os serviços.

---
*Relatório atualizado em 08/nov/2026 com CLI multcar att, Computador de Bordo Dinâmico e sincronização Git.*

