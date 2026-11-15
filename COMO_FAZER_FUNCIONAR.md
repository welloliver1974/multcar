# 🎯 Como Fazer o Multcar Ler o Carro — Diagnóstico Definitivo

> **Data:** 15/11/2026  
> **Estado:** o **protocolo BLE está 100% provado**; falta descobrir o **gatilho do scanner CAN**.

---

## 1. O que já está resolvido (não precisa mexer)

Prova vinda do log do teste de campo de 14/11 e do teste de 15/11:

```
TX AA 15 03 60 02 01 83 F6      → cmd 0x6002, sub 0x83
RX 55 15 04 60 02 01 83 01 F0   → ✅ resposta perfeita
TX AA 16 26 60 01 0B 01 01 ...  → cmd 0x6001 (config CAN)
RX 55 16 04 60 0B 60 01 01 19   → cmd 0x600B (ACK, payload [60 01 01])
```

| Item | Status |
|---|---|
| Enquadramento `0xAA`, checksum, `seq` | ✅ **provado** |
| ID do comando **big-endian** | ✅ **provado** |
| Resposta `0x55` + escape `0x56` | ✅ **provado** |
| Re-assemblagem entre blocos BLE | ✅ **provado** |
| `0x6002` (informações do dongle) | ✅ **provado** |
| `0x6001` (config CAN) | ✅ **provado** (ACK `0x600B`) |
| **`0x600A` (frame CAN da ECU)** | ❌ **nunca chega** |

> ⚠️ O ACK `0x600B` tem payload **fixo** `[cmdHi, cmdLo, 0x01]` (o firmware escreve a constante `1`).
> Portanto ele **não** confirma se a config foi aplicada — só confirma que o quadro chegou.

---

## 2. O que falta (e a v1.2.7 resolve por varredura)

O dongle **não inicia o scanner CAN** porque falta o comando que **liga os transceptores CAN**
dos pinos 6/14. No app oficial isso é o comando de nível superior **`0x6009`** ("enter system"),
enviado **uma vez por item de ECU**, com payload `[len][descritor]`.

O payload exato do descritor ainda **não foi confirmado** (vem da base OBD do app oficial).
Por isso a **v1.2.7 executa uma varredura automática** de 7 combinações logo após conectar:

```
▸▸ TENTATIVA 1/7: enter[00] + proto 1 + layout A
▸▸ TENTATIVA 2/7: enter[01] + proto 1 + layout A
▸▸ TENTATIVA 3/7: enter[len+id] + proto 1 + layout A
▸▸ TENTATIVA 4/7: enter[00] + proto 1 + layout B
▸▸ TENTATIVA 5/7: enter[00] + proto 6 + layout A
▸▸ TENTATIVA 6/7: enter[01,00] + proto 1 + layout A
▸▸ TENTATIVA 7/7: enter[01] + proto 6 + layout B
```

Cada tentativa = `0x6009` + config CAN + pedido OBD2 (RPM).
Se alguma der certo, o log mostra a linha **`🛰️ Frame CAN ID 0x07E8 …`** logo depois dela.

---

## 3. 🔬 CAMINHO DEFINITIVO: capturar o app oficial (ground truth)

Se a varredura não resolver, o jeito **100% certo** é ver o que o app oficial XTOOL envia.
Duas opções:

### Opção A — Android HCI snoop log (recomendada, precisa de PC)

1. No celular: **Configurações → Sobre o telefone** → tocar 7× em **"Número da build"** → *Modo desenvolvedor*
2. **Opções do desenvolvedor → Ativar "HCI snoop log"** (Android 11+: *Ativar registro de log HCI de Bluetooth*)
3. Instalar e **usar o app oficial XTOOL** com o dongle (fazer ele ler os dados do carro)
4. No PC (com o **adb** da pasta do Android SDK):
   ```powershell
   adb shell dumpsys bluetooth_manager > bluetooth.txt
   # ou gere o bugreport e procure o arquivo .btsnoop
   adb bugreport bugreport.zip
   ```
   O arquivo `.btsnoop` contém **todos** os bytes enviados pelo app oficial ao dongle.
5. Cole aqui (ou decodifique) e eu replico **byte a byte**.

### Opção B — sem PC: usar um segundo aparelho como sniffer

Apps que fazem sniffing BLE passivo em Android são limitados, mas vale tentar:
**nRF Connect** (não faz proxy) · **Bluetooth HCI Logger** · **nRF Sniffer** (hardware dedicado).

### Opção C — o caminho mais simples: **me mandar o log da varredura**

O log já mostra **exatamente** o que foi enviado e o que voltou. Com ele eu ajusto o app
sem precisar de mais ida ao carro.

---

## 4. Checklist do teste (10 min)

1. Instalar `Multcar_Pro_v1.2.apk` → badge **`v1.2.7 • 15/11`**
2. **Motor ligado** e ignição na posição II
3. Fechar todos os outros apps OBD2
4. Bluetooth + Localização **ligados**
5. Conectar → **esperar 30 segundos** (a varredura leva ~15 s)
6. Abrir o Diagnóstico → copiar o log bruto → mandar aqui

### O que procurar no log

| Linha | Significado |
|---|---|
| `▸▸ TENTATIVA k/7: …` | início de uma tentativa |
| `🛰️ Frame CAN ID 0x07E8 …` | 🏁 **DEU CERTO** — a ECU respondeu! |
| `📊 Resposta OBD2: modo=41 PID=0x0C …` | 🏁 **RPM chegando** |
| `✔ Quadro AD10 … cmd=0x600A …` | chegou frame CAN (o app decodifica sozinho) |
| `Quadro não tratado cmd=0x600A` | chegou frame mas o payload tem outro layout → me mande o hex |
| `⚠️ RX checksum inválido` | aí sim é bug de framing |

---

## 5. Por que ainda não funciona (honestidade)

O firmware do dongle tem um módulo `obd_scan` completo (ISO9141, KWP2000, J1850, CAN) e o
**app oficial** monta, para cada ECU, um *descritor* (32 bytes) com a lista de PIDs a詢 perguntar
e os períodos de cada um — pulled da base OBD (`assets/obddata/*.BIN` do APK oficial).

**O dongle não é um "servidor OBD2" genérico**: ele é um *scanner* que precisa ser instruído
sobre **o que perguntar**. Nosso app já configura o barramento e sabe pedir um frame, mas ainda
não entrega o *descritor de ECU* no formato que o `0x6009` espera.

Duas frentes possíveis:
- **(a)** Achar o formato do descritor por RE (trabalho deReverse Engineering mais fundo)
- **(b)** Capturar o tráfego do app oficial (Opção A) e replicar

A **(b)** é确定性 e leva 10 minutos de trabalho no PC.
