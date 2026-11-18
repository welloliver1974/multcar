# 🎯 Captura HCI do app oficial — ROTEIRO RÁPIDO (3 fases)

> **Objetivo:** pegar os bytes EXATOS que o app oficial XTOOL manda pro AD10,
> pra replicar 1:1 no Multcar. É a última peça que falta.
>
> **Regra de ouro da bateria:** ⚠️ no carro você passa **só ~15 segundos**,
> chave na II, **motor desligado**, sem gastar gasolina e sem drenar a bateria.

---

## 📍 FASE A — Em casa, no PC (2 min)

1. Conecte o celular no **cabo USB** do PC (O comando roda no PC via Opencode).
2. No celular: **autorize a depuração USB** (pode aparecer um popup).
3. Me fale **"fase A"** — eu rodo:
   ```
   tools\reversing\ad10\preparar_snoop.ps1
   ```
   Isso ativa o log HCI (snoop) no celular.
4. **Reinicie o Bluetooth no celular** (desliga e liga) — eu te lembro.
5. Pode desconectar o USB. Snoop fica gravando.

✅ Resultado: celular pronto pra capturar, sem você ter feito nada no carro ainda.

---

## 📍 FASE B — No carro (~15 segundos, motor DESLIGADO)

1. Coloque o **AD10 no OBD2**.
2. **Chave na posição II** (painel aceso). **MOTOR DESLIGADO.**
3. Abra o **app oficial XTOOL Advancer**.
4. Conecte no dongle e **deixe ele ler o carro por ~15 segundos**
   (até aparecer RPM/telemetria na tela do app oficial).
5. **Desligue a chave** e volte pra casa.

⏱️ Tempo total no carro: **~1 minuto**. Sem risco pra bateria.

> 💡 Dica: se o app oficial demorar pra conectar, não insista — 15 s de leitura
> já bastam. O importante é ele ter mandado o handshake + o pedido de RPM.

---

## 📍 FASE C — De volta em casa, no PC (3 min)

1. Conecte o celular no **USB** de novo.
2. Me fale **"fase C"** — eu rodo:
   ```
   tools\reversing\ad10\capturar_oficial.ps1
   ```
   Ele puxa o `bugreport`, extrai o `.btsnoop` e **decodifica as escritas ATT**
   (os bytes que o app oficial mandou).
3. Eu analiso o `decoded_*.txt` e comparo com o nosso log → aplico a patch final.

✅ Resultado: bytes exatos do app oficial → replico 1:1 → teste final (5 min, chave II).

---

## 📦 Arquivos envolvidos

| Arquivo | O que faz |
|---|---|
| `tools\reversing\ad10\preparar_snoop.ps1` | Fase A — ativa o snoop |
| `tools\reversing\ad10\capturar_oficial.ps1` | Fase C — puxa e decodifica |
| `tools\reversing\ad10\decode_btsnoop.py` | Decodifica o `.btsnoop` |
| `scratch\capture\` | Onde caem os arquivos |

---

## ⚠️ Se o HCI snoop não ativar

Alguns celulares (Android 12+) não deixam ativar via `adb shell` sem root.
Nesse caso, na Fase A você ativa manualmente:

**Configurações → Opções do desenvolvedor → "Ativar registro de log HCI de Bluetooth"**

(Se as opções do desenvolvedor não estiverem visíveis: Configurações → Sobre o telefone
→ toque 7x em "Número da versão".) Me avise que eu teguio por aqui.

---

## 🚀 Resumo em 1 linha

**Fase A (PC: ativar snoop) → Fase B (carro: 15 s app oficial) → Fase C (PC: decodificar) → eu replico os bytes.**
