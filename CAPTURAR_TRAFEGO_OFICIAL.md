# 🎯 Captura do Tráfego BLE do App Oficial (ground truth)

> **Data:** 15/11/2026  
> **Objetivo:** capturar os bytes exatos que o **app oficial XTOOL Advancer** envia ao dongle AD10,
> para replicar o gatilho do scanner CAN (comando `0x6009` + descritor de ECU) no Multcar Pro.

---

## Por que isso é necessário

O protocolo BLE do Multcar Pro está **100% provado** (teste de 15/11: TX/RX perfeitos,
ACK `0x600B`, 244 TX / 231 RX, zero quadros inválidos). O dongle **não inicia o scanner CAN**
porque falta o comando **`0x6009` ("enter system")** com o *descritor de ECU* — que o app oficial
monta a partir da base OBD (`assets/obddata/*.BIN`) e que **não é adivinhável** por análise estática
do jeito que fizemos até aqui.

A captura do tráfego real é o caminho **determinístico**.

---

## Como foi feito (15/11/2026)

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

# 1) Conectar por USB (uma vez) e autorizar
adb devices
adb -s RQCYA03LPPP shell settings put global bluetooth_btsnoop_log_mode always

# 2) MANDAR PARA O WIFI (permite deixar o notebook em cima!)
adb -s RQCYA03LPPP tcpip 5555
adb shell "ip -f inet addr show wlan0 | grep -o 'inet [0-9.]*' | cut -d' ' -f2"
adb connect 192.168.0.198:5555

# 3) Capturar o logcat em background
adb -s 192.168.0.198:5555 logcat -v threadtime > scratch\capture\logcat_full.log
```

> 💡 **Com o adb por WiFi, só o celular precisa descer até o carro.**
> O notebook (que faz a captura) fica em cima. Só precisa de rede no local.

### Passo no celular
1. Fechar o Multcar Pro (ele segura o BLE)
2. Abrir o app oficial **Advancer**
3. Conectar no dongle e **ler o carro ~20 s**
4. Avisar

### Captura alternativa (se o logcat não trouxer os bytes ATT)
```powershell
adb -s 192.168.0.198:5555 bugreport scratch\capture\bugreport.zip
# o .btsnoop está dentro do zip (dados brutos do HCI)
python tools\reversing\ad10\decode_btsnoop.py <arquivo.btsnoop>
```

---

## Ferramentas

| Arquivo | Função |
|---|---|
| `tools/reversing/ad10/decode_btsnoop.py` | Decodifica `.btsnoop` e extrai as **escritas ATT** (App → dongle) e notificações (dongle → App) |
| `tools/reversing/ad10/capturar_oficial.ps1` | Script completo: espera o device, ativa o snoop, coleta bugreport e decodifica |

---

## Como ler o resultado

As escritas extraídas são **quadros AD10 prontos** (o app oficial usa o mesmo protocolo `0xAA`):

```
AA | seq | L | cmdHi cmdLo | payload… | checksum
```

Basta comparar com o que o Multcar Pro envia e identificar a diferença — tipicamente
o **payload do `0x6009`** (o descritor de ECU), que é o único item que falta.
