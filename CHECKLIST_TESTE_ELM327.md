# ✅ Checklist — Teste ELM327 Identifier (AD10)

**Objetivo:** descobrir se o XTOOL AD10 fala ELM327. Duração: ~10 min.
**Anote o resultado no final** — é o que define o próximo passo.

> 📄 Contexto completo: `PROXIMO_PASSO_OBD2_CAR_SCANNER.md` (mesma pasta).
> 🖥️ **Versão interativa:** `checklist-elm327.html` — abre no navegador, salva o progresso e tem o botão **"Salvar resultado (.md)"**, que baixa um `RESULTADO_TESTE_ELM327.md` para colocar nesta pasta.

---

## Antes de sair do carro

- [ ] Celular carregado (ou acima de 30%)
- [ ] App **ELM327 Identifier** instalado (Play Store)
- [ ] App oficial **XTOOL fechado** (Configurações > Apps > XTOOL > Forçar parada)
- [ ] Permissões "Dispositivos por perto" e "Localização" concedidas ao ELM327 Identifier *(Android 12+)*
- [ ] Bluetooth do celular **ligado**
- [ ] *(opcional)* **Torque Lite** instalado, para teste em dobro

## No carro

- [ ] Conectar o **AD10** na porta OBD2 (embaixo do painel, lado do motorista)
- [ ] **Ligar a ignição** (posição ON — não precisa dar partida)
- [ ] LED do dongle acendeu / piscou
- [ ] Abrir o **ELM327 Identifier**
- [ ] Tocar em **Scan** e esperar listar os dispositivos
- [ ] Selecionar o **AD10** (ou nome parecido: "XTOOL", "AD10", MAC começando com…)

## Durante o teste

- [ ] Deixar rodar **até o fim** — não fechar no meio
- [ ] **Print da tela** do resultado

## Resultado (marque UM)

- [ ] 🅰️ **"Not an ELM327"** / nenhum comando AT respondeu → **hipótese confirmada**
- [ ] 🅱️ **Listou comandos AT** respondidos → **o AD10 é ELM327**
- [ ] 🅲️ **Outra coisa** (não abriu, não viu o dongle, travou) → anotar o que aconteceu:
  ______________________________________________

- [ ] *(se testou o Torque Lite)* Resultado do Torque: ______________________

## Ao voltar

- [ ] Abrir o Claude e dizer: **"fiz o teste do ELM327, resultado foi ___"**
- [ ] A IA atualiza `PROXIMO_PASSO_OBD2_CAR_SCANNER.md` e a memória com o veredito

---

> **Lembrete:** não tentar configurar o Car Scanner antes deste teste. Já foi tentado e falhou.
