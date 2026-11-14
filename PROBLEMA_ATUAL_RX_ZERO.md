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

## ✅ O que a v1.2.5 implementou (corrige os bugs de framing)

- **Quadro de requisição com cmd BIG-ENDIAN** (`cmdHi` antes de `cmdLo`) — o bug nº 1
- **Parser de resposta `0x55`** com escape `0x56` e re-assemblagem entre blocos BLE — o bug nº 2
- **Tabelas de sub-comandos reescritas do firmware**: `0x6002` → `0x80`=volt, `0x81`=versão,
  `0x82`=SN, `0x83`=status, `0x84`=bps, `0x85`=can_type
- **Handshake**: sondagem `0x6002` (SN/versão/tensão) + configuração CAN `0x6001`
  idêntica à do app oficial (`obd_protocol`, `bps`, `can_filter_type/cnt`, `filter_frame`)
- **Notificações `0x600A`** (frames CAN da ECU) com decoder ISO-TP robusto
- Canal RX **exclusivamente `6E400003`** (único com CCCD `0x2902`) — elimina loop GATT 133
- Canal TX **exclusivamente `6E400004`** com `write` (com resposta) + fallback
- Modo **AD10 Nativo** puro: **zero bytes ASCII** no canal
- **Diagnóstico com log TX/RX bruto** + botão de reenvio da configuração CAN

---

## 🔍 Hipóteses para Investigar (próximos passos)

> As hipóteses 1–7 abaixo já estavam covers pela v1.2.4 e **não eram a causa** — a causa era o framing.
> Elas continuam valendo **apenas se** o `0x6002` (sondagem) não responder.

| # | Hipótese | Quando investigar | Como Testar |
|---|----------|------------------|-------------|
| 1 | Ignição não está em ON (posição II) — ECU não alimentada | Se `0x6002` responder mas o carro não | Confirmar painel aceso todo, não apenas ACC |
| 2 | Dongle reiniciou o scanner CAN | Se chegar `0x600A` e depois parar | Botão **"🛰️ Reenviar configuração CAN"** no modal |
| 3 | Canal RX `0003` não registrou notificação | Se não vier NENHUMA notificação | No modal: "Canal RX: 6E400003" |
| 4 | Valores de período do scanner errados | Se `0x600A` vier sem resposta `0x41` | Ajustar `buildAd10CanConfigEntries()` |
| 5 | `obd_protocol` errado (`1` vs `6`) | Se `0x600A` vier vazio | Trocar `OBD_PROTOCOL` para `0x06` |
| 6 | Outro app segurando a conexão BLE | Se conectar e cair | Forçar parada de todos apps OBD2 |
| 7 | Bluetooth / Localização (GPS) desativados | Se nem achar o dongle | Verificar configurações do celular/central |
| 8 | Versão instalada não é a v1.2.5 | Sempre | Confirmar badge **`v1.2.5 • 13/11`** |

---

## 🎯 Ação Imediata (Próximo Passo no Veículo)

1. **Confirmar badge** `v1.2.5 • 13/11` no cabeçalho do app
2. **Fechar TODOS** apps OBD2 (XTOOL, Car Scanner, Torque) — `Configurações > Apps > Forçar parada`
3. **Ignição na posição II** (painel totalmente aceso, LED do AD10 aceso/fixo)
4. **Bluetooth + GPS/LOCALIZAÇÃO ligados** no celular/central
5. Abrir Multcar Pro → tocar **"📡 Conectar"**
6. **Toque na barra de telemetria** → abre o modal de diagnóstico com o log bruto
7. **Verificar no modal:**
   - `TX AA 00 03 60 02 01 82 E2` → cmd big-endian ✅
   - `✔ Quadro AD10 seq=… cmd=0x6002` → **o dongle respondeu** ✅
   - `AD10 Número de Série: …` → protocolo 100% ✅
   - `🛰️ Frame CAN ID 0x07E8 …` → frames da ECU chegando
8. **Se o `0x6002` responder mas o carro não:** ajustar `obd_protocol` / períodos / IDs de filtro
   (tabela em `PROXIMO_PASSO_OBD2_CAR_SCANNER.md`) e recompilar
9. **Reportar aqui:** o log bruto completo

---

## 📝 Para Próxima IA / Sessão

> **Objetivo:** validar a leitura do carro real com a v1.2.5 (framing corrigido) e fechar o layout
> do payload `0x600A` / os parâmetros do scanner CAN.
>
> **Contexto completo:** `PROTOCOLO_AD10_REVERIFICADO.md` (⭐ fonte da verdade) +
> `PROXIMO_PASSO_OBD2_CAR_SCANNER.md` + `CONTEXTO_AGENTE_IA.md`
>
> **Build atual:** `E:\Apps\Multcar\Multcar_Pro_v1.2.apk` (v1.2.5 — versionCode 8)
>
> **Não refazer:** engenharia reversa do protocolo (feita e **reverificada com Capstone**),
> compilação do APK, e a prova de que o AD10 **não é ELM327** (firmware sem interpretador AT).
>
> **Foco agora:** diagnóstico de campo → validar `0x6002` → validar `0x600A` → ajustar scanner CAN.

---

## 🔗 Arquivos-Chave para Debug

- `multcar-app/www/index.html` — lógica BLE completa (`buildAd10Packet`, `processIncomingCanBytes`,
  `handleAd10Frame`, `handleAd10CanFrame`, `initAd10Device`, `buildAd10CanConfigEntries`, `sendCanFrame`)
- `PROTOCOLO_AD10_REVERIFICADO.md` — ⭐ especificação binária correta + endereços de memória
- `tools/reversing/ad10/` — disassembladores (firmware + app oficial) e testes automatizados
- `multcar-app/src/services/ble/CanProtocol.ts` — parser de respostas (legado, não usado pelo app atual)