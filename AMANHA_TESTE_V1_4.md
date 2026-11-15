# 🔋 AMANHÃ — Trocar bateria + 1 teste (5 min, sem gastar gasolina)

> **Estado em 15/11/2026:** v1.4.0 (build 16/11) instalada no celular. APP já tá com a sequência
> correta: `0x6002` → `0x6001` (config) → `0x6003` can_scan → reboota → 20 s silêncio → reconexão
> automática → `0x6001`/`0x6002` de novo (config reaplicada) → polling 18 B.
>
> **Falta só:** testar com bateria nova no carro (Prisma 1.4 2015).

---

## 🅿️ PASSO 1 — Trocar a bateria (10–15 min)

1. Comprar **Moura / Heliar / Tudor / AC Delco** do mesmo tamanho. Prisma 1.4 2015 = **bateria 60 Ah**.
2. Chave **10 mm** ou **12 mm**.
3. **Desligar tudo** (chave fora da ignição, faróis apagados, multimídia off).
4. **Desconectar primeiro o polo NEGATIVO (−)**, depois o **POSITIVO (+)**.
5. Tirar a bateria velha, limpar os bornes do carro com escova de aço / água quente + bicarbonato.
6. Colocar a nova, **conectar primeiro o POSITIVO (+), depois o NEGATIVO (−)**.
7. Apertar bem os bornes (não pode mexer).
8. **Resetar o relógio** do painel (descontou) e, se tiver alarme, **digitar o código**.

> ⚠️ Segurança: **nunca** encostar a chave nos dois bornes ao mesmo tempo, e **nunca**
> ligar o cabo positivo no chassi. Cuidado com anéis/metais nos dedos.

> 💡 Se o rádio pedir código ANTIFURTO e você não souber, **antes** de desconectar a bateria
> olha no manual/Google pelo código — Prisma costuma ser na etiqueta do porta-malas.

---

## 🔌 PASSO 2 — Validar o app (sem sair do carro, sem gastar gasolina)

> **Ignição na posição II** (painel todo aceso, LED do AD10 aceso/piscando).
> **MOTOR DESLIGADO** — não gasta combustível. O app foi desenhado pra funcionar assim.

1. Celular: **Bluetooth LIGADO** + **Localização (GPS) LIGADO**.
2. **Fechar** todos os outros apps OBD2 (XTOOL oficial, Car Scanner, Torque, EOBD).
3. **Abrir o "Multcar"** — o ícone.
4. Conferir o badge verde no topo: deve aparecer **`v1.4.0 • 16/11`**. ✅
5. Tocar em **"📡 Conectar"**.
6. **Esperar até 1 minuto e pouco** (não mexer no celular). Vai acontecer em ordem:
   - `0x6002` (sondagem) → descobre dongle/SN/versão/tensão
   - `0x6001` (config CAN: protocolo + baud + filtros)
   - `0x6003` can_scan → **dongle reinicia** (esperado!)
   - **~20 segundos de silêncio** (o dongle volta)
   - **Reconexão automática + reaplica config**
   - Inicia o **polling a 90 ms** com o envelope oficial de 18 bytes
7. O **RPM e a velocidade devem começar a subir/oscilar** mesmo com motor desligado
   (a ECU responde com os valores "atuais" mesmo sem giro).
8. **Tocar na barra de telemetria** (a barra azul no topo da tela) → abre Diagnóstico.
9. Tocar em **"📋 Copiar log"** → me mandar aqui.

---

## 🔎 Como ler o que tem que aparecer

Se aparecer estas linhas no log, **deu certo**:

```
✔ Quadro AD10 … cmd=0x600B payload=[60 03 01]      ← can_scan ACEITO
✔ Quadro AD10 … cmd=0x6002 …                        ← versão/SN/tensão
🛰️ Frame CAN ID 0x07E8 …                             ← 🏁 ECU RESPONDEU
📊 Resposta OBD2: modo=41 PID=0x0C …                ← 🏁 RPM CHEGOU
```

Se aparecer só `0x600B` sem `0x600A` → o scanner ainda não ligou.
**Me avisa** que eu mando ajuste de 1 linha (alternar `OBD_PROTOCOL=6`,
mexer nos períodos, etc.) — **sem você precisar mexer no código**.

---

## 🛟 Se der ruim (cinto + colete)

| Sintoma | O que fazer |
|---|---|
| Celular não acha o AD10 | Verificar LED do dongle piscando. Se apagado → **tirar/colar** do OBD2 (ele trava às vezes). |
| Conecta mas só `"não tratado cmd=0x600A"` | Frame CAN chegou! só o layout tá diferente — **manda o log**, eu ajusto. |
| Conecta mas nada | Tirar o AD10 por 5 s, recolocar (reset físico). |
| Bateria do celular acabar | Carrega antes — o teste usa Bluetooth o tempo todo. |
| Celular ficar lento | Reiniciar antes de testar. |

---

## 📡 Atalho "modo terminal" (se você quiser ver os bytes ao vivo)

Tem também o `tools/reversing/ad10/capturar_oficial.ps1` que captura o BLE
do **app oficial da XTOOL** rodando ao mesmo tempo — útil se o nosso app
falhar e quisermos comparar byte a byte. Mas isso é o **plano B**, não precisa
rodar amanhã.

---

## ✉️ Me manda depois

Depois do teste:
- **SUCESSO** → fecho a versão v1.4.1 estável, gero changelog final, mostro o
  resumo pro seu chefe / pro grupo do carro.
- **PARCIAL** (chega frame mas layout diferente) → ajusto o decoder e mando
  um APK novo na hora (15 min, sem você mexer no código).
- **FALHA** → capturo o tráfego do app oficial (plano B) e repliquei byte a
  byte. Pode demorar umas horas, mas **sem você precisar ir ao carro** de novo.

**Respira — o trabalho tá salvo, falta 1 teste de 5 min.**
