# 🔬 Ferramentas de Engenharia Reversa — XTOOL AD10

Ferramentas usadas para reverificar o protocolo binário do dongle **XTOOL Advancer AD10**
(v1.2.5, 13/11/2026). Todas usam **Capstone** (disassemblador real) — o decoder manual
usado antes produzia conclusões erradas.

## Pré-requisitos

```powershell
pip install capstone
```

Binários necessários (já extraídos do APK oficial `AD10EN_V2.0.3_C203.apk`):

| Arquivo | Caminho esperado |
|---|---|
| Firmware do dongle | `unpacked_apk/assets/ble_obd.bin` (base do flash = `0x08002000`) |
| App oficial (ARM64) | `unpacked_apk/lib/arm64-v8a/libobdcore.so` |
| Dalvik do app | `unpacked_apk/classes.dex` |

## Ferramentas

| Script | O que faz |
|---|---|
| `fw_dis.py <início> <fim> [rótulo]` | Disassembla o firmware do dongle (ARM Thumb). Ex.: `python fw_dis.py 0x08005af0 0x08005c50 "ble_protocol_analy_char"` |
| `fw_dis2.py <início> <fim> [rótulo]` | Igual ao anterior, mas resolve literais → strings do firmware |
| `fw_strings.js <arquivo> [mín]` | Extrai todas as strings ASCII de um binário com offset |
| `so_dis.py <endereço> <tamanho>` | Disassembla o app oficial (ARM64) resolvendo `adrp+add` → strings |
| `so_lib.py <padrão>` | Lista seções/strings do `.so` do app oficial |
| `so_sym.py <padrão>` | Lista símbolos exportados (JNI) do `.so` |

## Teste de round-trip

`test_frame.js` valida o quadro gerado pelo app contra uma **reimplementação do parser real do
firmware** (`ble_protocol_analy_char`) e do construtor de resposta (`0x080065dc`):

```powershell
node tools\reversing\ad10\test_frame.js
```

Ele extrai `buildAd10Packet()` diretamente de `multcar-app/www/index.html`, então o teste
falha se o app voltar a enviar o comando em little-endian.

## Endereços-chave (referência rápida)

| Item | Endereço |
|---|---|
| Base do flash do dongle | `0x08002000` |
| `ble_protocol_analy_char` (parser de RX) | `0x08005af0` |
| `rev16` (byte-swap do ID de comando) | `0x0800766a` |
| Checksum XOR | `0x08007498` |
| Tabela de comandos BLE (`0x6001`–`0x6009`) | `0x0800bbf4` |
| Tabela sub `0x6001` (`0x01`–`0x16`) | `0x0800bc3c` |
| Tabela sub `0x6002` (`0x80`–`0x86`) | `0x0800bcec` |
| Construtor de quadro (app oficial) | `libobdcore.so` `0x18040` |
| `set_cmd` (app oficial) | `libobdcore.so` `0x1a4c4` |
| `InitHardware` (app oficial) | `libobdcore.so` `0x15d20` |
