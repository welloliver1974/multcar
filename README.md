# 🏎️ Multcar Pro — Automotive Telemetry & AI Diagnostic System

> **Aplicativo automotivo sob medida para Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015) e Central Multimídia K2401 (Android 10), com suporte total ao dongle XTOOL Advancer AD10 (BLE 4.2).**

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](file:///E:/Apps/Multcar/Dockerfile)
[![Capacitor](https://img.shields.io/badge/Capacitor-Android_Native-119EFF?logo=capacitor&logoColor=white)](file:///E:/Apps/Multcar/multcar-app)
[![PWA](https://img.shields.io/badge/PWA-Offline_First-5A0FC8?logo=pwa&logoColor=white)](file:///E:/Apps/Multcar/index.html)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](file:///E:/Apps/Multcar/LICENSE)

---

## 🌟 Destaques do Projeto

* **Engenharia Reversa do XTOOL AD10:** Decodificação completa do protocolo proprietário Nordic UART Service (`6E400001-B5A3-F393-E0A9-E50E24DCCA9E`) e frames CAN 11-bit a 500 kbps, superando a incompatibilidade do dongle com aplicativos genéricos ELM327.
* **Auto-Conexão Inteligente:** Idêntica ao aplicativo oficial da XTOOL — varre em segundo plano e conecta automaticamente sem abrir caixas de diálogo ou exigir seleção manual de aparelhos.
* **Computador de Bordo Dinâmico:**
  * Consumo instantâneo inteligente baseado na física *Speed-Density* para o motor SPE/4 GM (`L/h` em marcha lenta / `km/L` em estrada).
  * Leitura e barra animada da posição da borboleta TBI (PID `0x11`).
  * Cronômetro de tempo de viagem em operação.
  * Cronômetro de arrancada e recorde histórico de 0 a 100 km/h.
* **Mecânico de Bordo IA & Parecer por Voz:** Análise preditiva em 1 toque com síntese de voz (TTS) em português brasileiro (`pt-BR`).
* **Deploy Rápido com 1 Comando na VPS:** Gerenciamento via CLI `multcar att`.

---

## 🚀 Instalação e Deploy na VPS Linux

### 1. Instalação Completa Inicial
Execute no terminal da sua VPS:
```bash
curl -fsSL https://raw.githubusercontent.com/welloliver1974/multcar/main/deploy.sh | bash
```

### 2. Atualização Automática (CLI `multcar`)
Após instalado, para atualizar o sistema com a última versão do GitHub basta rodar:
```bash
multcar att
```

Outros comandos úteis:
* `multcar status` — Verifica se o container está ativo.
* `multcar logs` — Exibe os logs em tempo real.
* `multcar restart` — Reinicia os serviços.

---

## 📱 Como Utilizar no Celular ou Multimídia

1. **Via APK Android Nativo (v1.2.5 — Build 13/11):**
   * Baixe o instalador mais recente: [`Multcar_Pro_v1.2.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.2.apk) (ou [`Multcar_Pro_v1.0.apk`](file:///E:/Apps/Multcar/Multcar_Pro_v1.0.apk)).
   * Instale na central multimídia K2401 ou no celular Android.
   * Suporte nativo ao modo **`⚡ AD10 Nativo`** (protocolo binário oficial `0xAA`, comando big-endian, resposta `0x55`), além do modo **`⚡ ELM327 Universal`** selecionável com 1 toque.
2. **Via PWA (Navegador Chrome):**
   * Acesse `https://seu-dominio-multcar.com` pelo Chrome no Android.
   * Toque no botão **"📲 Instalar"** para adicionar o app à tela inicial.

---

## 📚 Documentação Técnica Detalhada

* 🤖 [Guia Mestre de Contexto para Agentes de IA](CONTEXTO_AGENTE_IA.md) — *Leitura obrigatória para qualquer IA entender todo o histórico e onde paramos*
* 🛰️ **[Protocolo AD10 Reverificado](PROTOCOLO_AD10_REVERIFICADO.md)** — ⭐ *Especificação binária corrigida, validada no firmware do dongle e no app oficial*
* 📘 [Relatório Completo do Projeto](RELATORIO_COMPLETO_PROJETO_MULTCAR.md)
* 🛰️ [Handoff e Próximos Passos](PROXIMO_PASSO_OBD2_CAR_SCANNER.md)
* 📖 [Guia de Deploy na VPS](GUIA_DEPLOY_VPS.md)
* 🔬 [Especificação do Protocolo Binário CAN AD10 (histórico)](ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md)
* 🧰 [Ferramentas de Engenharia Reversa AD10](tools/reversing/ad10/README.md)

