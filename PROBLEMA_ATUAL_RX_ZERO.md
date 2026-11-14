# 🐛 Problema Atual: Conecta mas RX = 0 / Mostradores Parados

> ## ✅ CAUSA RAIZ ENCONTRADA (13/11/2026, v1.2.5)
>
> A engenharia reversa com **disassemblador real** (Capstone) do firmware do dongle
> (`unpacked_apk/assets/ble_obd.bin`) e do app oficial (`libobdcore.so`) encontrou **dois bugs fatais**:
>
> | # | Bug | Impacto | Correção v1.2.5 |
> |---|---|---|---|
> | 1 | O app enviava o **ID do comando em little-endian** (`02 60`). O dongle compara `(frame[3]<<8)\|frame[4]` — **big-endian** — contra a tabela `0x6001..0x6009`. | O quadro era **descartado silenciosamente**: nenhum handler era chamado → **RX = 0 para sempre**. | `buildAd10Packet()` agora grava `cmdHi` antes de `cmdLo`. |
> | 2 | O parser de resposta do app só aceitava quadros começando em `0xAB`/`0xAA`. O dongle responde com **`0x55`** (escape `0x56`). | Mesmo com o TX corrigido, **nada seria decodificado**. | Novo parser de quadros `0x55` com re-assemblagem entre notificações BLE. |
> | 3 | Mapa de sub-comandos errado (`0x81`=voltagem, `0x82`=versão, `0x01/0x02/0x03` inexistentes no grupo `0x6002`). | Comandos devolviam dados errados ou nada. | Tabelas `AD10_CFG` / `AD10_OBD` reescritas a partir do firmware. |
>
> **Detalhe completo:** [`PROTOCOLO_AD10_REVERIFICADO.md`](PROTOCOLO_AD10_REVERIFICADO.md)
>
> **O que ainda falta confirmar no carro:** o layout exato do payload `0x600A` (frame CAN) e os
> valores de período do scanner. O app usa varredura heurística (procura `0x07E0`/`0x07E8` e o byte
> de modo `0x41`) e reenvia a configuração CAN a cada 2 s.

**Data:** 13/11/2026  
**Versão testada:** Multcar Pro v1.2.5 (Build 13/11 — Protocolo AD10 Corrigido)  
**Hardware:** XTOOL Advancer AD10 (BLE 4.2) no Chevrolet Prisma LTZ 1.4 2015  
**Dispositivo:** Central K2401 (Android 10) e/ou Smartphone Android

---

## 🔴 Sintoma

1. App abre → toque em **"📡 Conectar"**
2. Conexão BLE GATT estabelecida com sucesso (badge fica verde "AD10 OK")
3. **Contador TX sobe** (comandos sendo enviados)
4. **Contador RX permanece em 0** (nenhuma resposta do dongle/ECU)
5. **Mostradores não mexem** (RPM 0, Velocidade 0, Temperatura --, etc.)
6. Status CAN na barra: fica em "Configurando..." ou "Aguardando", nunca vai para "Ativo"

---

## ✅ O que JÁ foi implementado na v1.2.4 (teoricamente corrige isso)

- Handshake nativo completo com **`systerm enter`** (sub-comando `0x01` via `0x6002`) — ativa transceptores CAN físicos (pinos 6/14)
- Configuração protocolo **`1` (ISO15765-4 STD 500K)** + **`6`** (CAN standard)
- Baud rate **500 kbps** (sub `0x03`)
- Canal RX **exclusivamente `6E400003`** (único com CCCD `0x2902`) — elimina loop GATT 133
- Canal TX **exclusivamente `6E400004`** com `write` (com resposta) + fallback
- Modo **AD10 Nativo** puro: **zero bytes ASCII** no canal (evita corrupção do parser `ble_protocol_analy_char`)

---

## 🔍 Hipóteses para Investigar (próximos passos)

| # | Hipótese | Como Testar |
|---|----------|-------------|
| 1 | **Ignicião não está em ON (posição II)** — ECU não alimentada | Confirmar painel aceso todo, não apenas ACC |
| 2 | **Dongle não recebeu `systerm enter`** (pacote perdeu/fragmentou) | Abrir modal de diagnóstico (toque na barra telemetria) → ver logs BLE recentes |
| 3 | **Canal RX `0003` não registrou notificação** (Android GATT falhou silenciosamente) | No modal: ver "Canal RX: 6E400003 (Notificações Ativas)" |
| 4 | **Firmware do AD10 difere do analisado** (sub-comandos diferentes) | Testar modo **ELM327 Universal** (botão ⚡ na barra) — se funcionar, é firmware diferente |
| 5 | **Outro app segurando a conexão BLE** (XTOOL oficial, Car Scanner em bg) | Forçar parada de todos apps OBD2 antes de testar |
| 6 | **Bluetooth / Localização (GPS) desativados no Android 10** | Verificar nas configurações do celular/central |
| 7 | **Versão instalada não é v1.2.4** (cache, build antigo) | Confirmar badge **`v1.2.4 • 13/11 14:10`** no topo do app |

---

## 🎯 Ação Imediata (Próximo Passo no Veículo)

1. **Confirmar badge** `v1.2.4 • 13/11 14:10` no cabeçalho do app
2. **Fechar TODOS** apps OBD2 (XTOOL, Car Scanner, Torque) — `Configurações > Apps > Forçar parada`
3. **Ignição na posição II** (painel totalmente aceso, LED do AD10 aceso/fixo)
4. **Bluetooth + GPS/LOCALIZAÇÃO ligados** no celular/central
5. Abrir Multcar Pro → tocar **"📡 Conectar"**
6. **Toque na barra de telemetria** (onde mostra CAN/TX/RX) → abre modal de diagnóstico
7. **Verificar no modal:**
   - "Canal RX: 6E400003 (Notificações Ativas)" ✅
   - "Modo OBD Ativo: ⚡ AD10 Nativo"
   - Últimos logs BLE (mostram `RX [0003] ...` ou só `TX`?)
8. **Se RX continuar 0 após ~10s:** tocar botão **"🔄 Alternar para ELM327 Universal"** no modal ou na barra
9. Reportar aqui: **o que o modal mostra** + **se ELM327 funcionou**

---

## 📝 Para Próxima IA / Sessão

> **Objetivo:** Fazer o RX sair de 0 e mostradores funcionarem no carro real.
>
> **Contexto completo:** `RELATORIO_COMPLETO_PROJETO_MULTCAR.md` + `ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md` + `PROXIMO_PASSO_OBD2_CAR_SCANNER.md`
>
> **Build atual:** `E:\Apps\Multcar\Multcar_Pro_v1.2.apk` (v1.2.4)
>
> **Não refazer:** engenharia reversa do protocolo (já feita), compilação do APK (já pronta), testes de ELM327 Identifier (já provado que AD10 **não é ELM327**).
>
> **Foco agora:** diagnóstico de campo (carro real) → ajustar handshake/timing/pacotes se necessário → validar v1.2.5.

---

## 🔗 Arquivos-Chave para Debug

- `multcar-app/www/index.html` — lógica BLE completa (funções `initAd10Device`, `processIncomingCanBytes`, `sendCanFrame`, `toggleObdMode`)
- `multcar-app/src/services/ble/CanProtocol.ts` — parser de respostas
- `ESPECIFICACAO_PROTOCOLO_XTOOL_AD10.md` — seção 11 (v1.2.4) com frames exatos do handshake `systerm enter`