# 📋 Plano Mestre: Backup & Aceleração da Central Multimídia K2401

**Dispositivo:** Central Android K2401 (Plataforma NWD Ceres)
**Processador Real:** Allwinner T507 / sun50iw10p1 (Quad-Core Cortex-A53 @ ARMv8 + GPU Mali-G31 MP2)
**Versão Real do Android:** Android 10 (API 29) - Kernel Linux 4.9.170 (Compilado em 14/02/2025)
**Configuração:** 2 GB RAM Real / 32 GB eMMC Real (/data com 25 GB)
**Carro Mapeado:** Chevrolet PRISMA LTZ 1.4 (2015)  
**Comandos de Volante:** Kit multifuncional sem fio/Bluetooth (AliExpress) instalado pelo próprio usuário  
**CANbus:** Módulo Hiworld (38400 baud) integrado para sinais do veículo e câmera de ré
**Status do Projeto:** Fases 1, 2 e 3 Concluídas com Sucesso (Otimizado e Validado pelo Usuário)

---

## 🎯 Objetivo
Transformar a central multimídia em um sistema rápido, fluido e responsivo para o dia a dia, eliminando engasgos dos 2GB de RAM através de debloat cirúrgico e launcher leve, **sem perder** as funções nativas de hardware (MCU, rádio, câmera de ré e comandos de volante), garantindo backup integral antes de qualquer alteração.

---

## 🧭 Fases do Projeto

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     FASE 1      │ ──▶ │     FASE 2      │ ──▶ │     FASE 3      │ ──▶ │     FASE 4      │
│ Reconhecimento  │     │  Backup Total   │     │ Limpeza/Debloat │     │ Launcher Turbo  │
│   [CONCLUÍDO]   │     │   [CONCLUÍDO]   │     │   [CONCLUÍDO]   │     │   (Opcional)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

### FASE 1: Reconhecimento do Hardware Real [CONCLUÍDO]
*Objetivo: Identificar com precisão o que está dentro do aparelho.*
- [x] Conexão direta via ADB Wi-Fi com **Root Nativo** (`uid=0`).
- [x] Mapear o processador real: **Allwinner T507 / sun50iw10p1** (Quad-Core Cortex-A53 + Mali-G31 MP2).
- [x] Descobrir o nível real da API Android: **Android 10 real (API 29)**, Kernel Linux 4.9.170.
- [x] Senha de acesso ao modo desenvolvedor documentada: `345543`.
- [x] Mapeamento de CANbus: **Chevrolet Onix (Hiworld a 38400 baud)**.

---

### FASE 2: Backup Total e Rede de Segurança [CONCLUÍDO]
*Objetivo: Garantir que se qualquer coisa der errado, a central volte exatamente como era hoje.*
- [x] **Backup de Partições Físicas (Dump Bit-a-Bit):** `nwdprivate.img`, `nwdlcdpara.img`, `nwdconfig.img`, `env.img`.
- [x] **Backup de Configuração CANbus:** `canconfig.xml`.
- [x] **Backup do Zlink:** APK original (`Zlink.apk` v5.4.90) e pasta de licenças/ativação (`zlink_data` com 39 MB).
- [x] **Backup de Aplicativos do Sistema (.APK):** Rádio, Câmera de Ré, Equalizador/DSP, Bluetooth, CarSettings, CANbus.
- [x] Todos os backups armazenados com segurança em `E:\Apps\Multcar\backup_k2401`.

---

### FASE 3: Limpeza e Otimização de RAM (Debloat) [CONCLUÍDO]
*Objetivo: Aliviar a pressão sobre os 2 GB de memória RAM.*
- [x] Animações do sistema em 0.0x para máxima resposta no toque.
- [x] Debloat seguro via congelamento reversível (`pm disable-user`) de 10 processos pesados (Google App, Gmail, TV apps, serviços fantasmas).
- [x] Silenciamento definitivo de avisos de erro da Play Store (`security-and-errors`).
- [x] Bloqueio e silenciamento de notificações do Google Play Services na barra da central (evita atualizações automáticas que consumiriam 300-500 MB de RAM).
- [x] Otimização e limpeza de blocos de armazenamento flash via `sm fstrim`.
- [x] Desativação do app de registros de depuração Allwinner (`AwlogSettings`).
- [x] Pasta do iGO (2,7 GB) mantida intacta temporariamente por motivo de **Garantia do Aparelho** (app congelado, não consome RAM).
- [x] Salto de **Memória Disponível de ~800MB para 1,19 GB** pós-boot. Sistema validado como muito mais rápido pelo usuário.

---

### FASE 4: Nova Interface Automotiva e Ajustes Finais (Opcional)
*Objetivo: Experiência rápida, botões grandes e boot instantâneo.*
- [x] Modo de **Suspensão Inteligente (Deep Sleep / Fast Boot)** verificado e ativo (`sys.nwd.sleep.state: wakeup` em 1 segundo).
- [ ] Launcher automotivo leve (Agama Car Launcher / CarWebGuru) — a critério do usuário quando desejar.

---

## 🚀 Método de Conexão Definido: Conexão Direta via ADB (Wi-Fi)
*(Dispensando uso de pendrive para diagnóstico e backup)*

O notebook já possui o ADB oficial configurado em:
`C:\Users\welld\AppData\Local\Android\Sdk\platform-tools\adb.exe`

### 🎒 Como vamos iniciar mais tarde:
1. **Rede:** Conectar o notebook e a multimídia no mesmo Wi-Fi (Wi-Fi de casa ou ponto de acesso 4G/5G roteado do celular).
2. **IP da Multimídia:** Na central, ir em *Configurações ➔ Rede e Internet ➔ Wi-Fi* e anotar o IP (ex: `192.168.x.x`).
3. **Conexão:**
   ```bash
   adb connect <IP_DA_MULTIMIDIA>:5555
   ```
4. **Autorização:** Aceitar a janela *"Permitir depuração USB"* na tela da multimídia marcando *"Sempre permitir"*.
5. **Execução Automática pelo Assistente:**
   - Leitura de hardware real (SoC, GPU, API Android real via `getprop` e `/proc/cpuinfo`).
   - Backup/extração direta de todos os APKs originais para o notebook via `adb pull`.
   - Debloat cirúrgico e aceleração de animações via linha de comando.

---

## 🔌 Integração OBD2 & Diagnóstico em Tempo Real
- **Documento do Projeto:** Consulte [`GUIA_OBD2_XTOOL_AD10_PRISMA.md`](GUIA_OBD2_XTOOL_AD10_PRISMA.md) para o guia completo de telemetria e diagnóstico.
- **Hardware Validado:** Scanner **XTOOL Advancer AD10** (BLE 4.2).
- **Projeção:** Manômetros de temperatura, bateria e RPM projetados diretamente na tela da multimídia via **Android Auto (Zlink)** usando o **Car Scanner ELM OBD2**.

---
*Quando estiver pronto para começar qualquer novo ajuste, basta avisar!*
