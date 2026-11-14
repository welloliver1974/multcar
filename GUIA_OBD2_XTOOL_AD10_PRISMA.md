# 🚗 Guia Completo: Scanner OBD2 XTOOL Advancer AD10 no Chevrolet Prisma 2015 & Central K2401

> **Nota (13/11/2026):** este guia cobre o **uso e a instalação**. A especificação do
> **protocolo binário** (enquadramento, endianness do comando, sub-comandos) está em
> **[`PROTOCOLO_AD10_REVERIFICADO.md`](PROTOCOLO_AD10_REVERIFICADO.md)**.

**Veículo:** Chevrolet Prisma LTZ 1.4 SPE/4 (2015)  
**Hardware do Scanner:** XTOOL Advancer AD10 (Preto, Bluetooth Low Energy - BLE 4.2)  
**Central Multimídia:** K2401 (Android 10 Real / Zlink Android Auto)  
**Status dos Testes:** Conexão validada com sucesso, leitura de sensores em tempo real e firmware atualizado via OTA.

---

## 1. 🔍 Hardware & Tecnologia BLE 4.2

### Por que o aparelho não aparece no Bluetooth do celular?
O **XTOOL Advancer AD10** opera sob a tecnologia **Bluetooth Low Energy (BLE 4.2)**:
* **No Bluetooth antigo (2.0/3.0):** era necessário ir nas configurações do celular, procurar o dispositivo, emparelhar e colocar senha (`1234`).
* **No BLE (Bluetooth Inteligente):** o Android **não** lista nem emparelha o dispositivo pelo menu do sistema operacional. A comunicação é feita via **GATT direto pelo próprio aplicativo**.
* **Vantagens Práticas:**
  1. Conexão instantânea assim que o aplicativo abre.
  2. Consumo de bateria do celular quase imperceptível.
  3. **Livre para áudio:** Não interfere no Bluetooth de chamadas telefônicas e músicas da central multimídia.

### Vantagens do XTOOL AD10 sobre os clones comuns (ELM327 azul)
* **Processador ARM dedicado:** Amostragem muito mais rápida dos dados (RPM e sensores respondem sem engasgos).
* **Firmware Atualizável:** Suporte oficial da XTOOL com atualizações pela internet (confirmado e realizado nos testes).
* **Gerenciamento de Energia Inteligente:** Monitora a tensão da rede CAN e entra em modo de repouso (*deep sleep*) quando o motor é desligado.

---

## 2. 📱 Análise Técnica do Aplicativo Oficial (`AD10EN_V2.0.3_C203.apk`)

* **Identificação do Pacote:** `com.xtool.ad10` (Versão 2.0.3, Build C203).
* **Driver de Rádio:** Utiliza a biblioteca `com.inuker.bluetooth.library` para comunicação direta BLE via Android.
* **Banco de Dados em Português Integrado:**
  * `assets/obddata/PT_OBDDTCH.BIN` e `PT_OBDDTCS.BIN`: Diagnóstico completo de falhas (DTC) em Português.
  * `assets/obddata/PT_OBDTEXT.BIN`: Textos e descrições dos sensores traduzidos.
* **Firmware Interno:** Carrega o arquivo `assets/ble_obd.bin`, permitindo gravar a firmware mais recente no chip do leitor.
* **Compatibilidade de Arquiteturas:**
  * `arm64-v8a`: Celulares modernos de 64 bits.
  * `armeabi-v7a`: Celulares de 32 bits e compatível com a central K2401.

---

## 3. 🖥️ Passo a Passo: Projetando os Mostradores no Android Auto (Zlink)

O aplicativo oficial da XTOOL foi projetado exclusivamente para a tela vertical do celular. Para projetar os mostradores de temperatura, bateria e RPM na tela da central multimídia, utilizamos o **Car Scanner ELM OBD2** (que possui tela horizontal nativa para Android Auto).

### Etapa 1: Ativar Modo Desenvolvedor no Android Auto do Celular
1. No smartphone, acesse **Configurações**.
2. Busque por **Android Auto** (ou vá em *Dispositivos conectados > Preferências de conexão > Android Auto*).
3. Role até o final da tela até localizar o campo **Versão**.
4. **Toque 10 vezes seguidas** na palavra *Versão*.
5. Confirme a janela: *"Permitir configurações de desenvolvimento?"* tocando em **OK**.
6. Toque nos **3 pontinhos** (canto superior direito) ➔ **Configurações do desenvolvedor**.
7. Marque a caixa de seleção: **"Fontes desconhecidas"**.

### Etapa 2: Habilitar o App no Inicializador do Carro
1. Volte à tela principal das configurações do **Android Auto**.
2. Toque em **"Personalizar o inicializador"** (ou "Personalizar tela inicial").
3. Localize o **Car Scanner** na lista e **marque a caixinha** para ele ficar visível.
4. *(Opcional)* Arraste o ícone para o topo para ficar entre os primeiros na central.

### Etapa 3: Configurar a Conexão BLE no Car Scanner
1. Abra o **Car Scanner** no celular;
2. Vá em **Configurações (ícone de engrenagem)** ➔ **Conexão**;
3. Em **Tipo de Conexão**, selecione: **Bluetooth LE (4.0+)** *(NÃO selecione Bluetooth comum)*;
4. Em **Nome do Dispositivo**, mande buscar e escolha o seu **AD10 / XTOOL**;
5. Volte para **Configurações** ➔ **Perfil de Conexão** e selecione: **Chevrolet Onix / Prisma 1.0 / 1.4**;
6. Clique em **Conectar** na tela principal para validar a leitura.

---

## 4. 📊 Tabela de Referência: Motor Chevrolet 1.4 SPE/4 (Prisma 2015)

O painel original do Prisma não possui ponteiro de temperatura. Utilize esta tabela como guia para acompanhar a saúde do motor:

| Parâmetro | Situação de Teste | Faixa Normal no Prisma 1.4 | Observação Técnica |
| :--- | :--- | :--- | :--- |
| **Temperatura do Motor** | Em rodovia / trânsito livre | **88 °C a 96 °C** | Fluxo de ar natural refrigerando o radiador. |
| **Válvula Termostática** | Aquecimento inicial | **~92 °C a 95 °C** | Momento em que a válvula abre para circular o líquido. |
| **Ventoinha (Estágio 1)** | Trânsito pesado / marcha lenta | **~98 °C a 102 °C** | Ventoinha arma em velocidade baixa e desliga por volta de 95 °C. |
| **Ventoinha (Estágio 2)** | Ar-condicionado ligado / esforço | **~103 °C a 106 °C** | Velocidade máxima da ventoinha. |
| **Alerta / Atenção** | Qualquer situação | **Acima de 107 °C** | Parar o carro e verificar nível do reservatório e ventoinha. |
| **Tensão da Bateria** | Motor desligado (chave ligada) | **12.2 V a 12.7 V** | Abaixo de 12.0 V indica bateria descarregada/fraca. |
| **Tensão do Alternador** | Motor ligado em marcha lenta | **13.8 V a 14.5 V** | Confirma que o alternador está carregando perfeitamente. |
| **Marcha Lenta** | Motor aquecido em ponto morto | **~750 a 850 RPM** | Estável sem oscilações bruscas. |

---

## 5. ⚠️ Avisos de Painel (Code 35) vs Diagnóstico OBD2 (DTC)

No Prisma 2015, existem duas categorias diferentes de alertas que o motorista pode encontrar:

### A. Códigos de Texto no Painel (Módulo de Carroceria - BCM)
Avisos rápidos que aparecem no display digital do painel de instrumentos do carro:
* **Code 35 (Muito comum):** **Bateria da chave canivete (controle remoto) fraca.**
  * *Solução:* Substituir a pilha tipo moeda **CR2032** da chave canivete (basta abrir a lâmina e puxar a tampa plástica traseira com o polegar).
* **Code 16:** Lâmpada da luz de freio queimada.
* **Code 18 / 20:** Farol baixo queimado (esquerdo / direito).
* **Code 23:** Lâmpada de marcha a ré queimada.
* **Code 24:** Lâmpada de iluminação da placa queimada.

### B. Códigos de Injeção Eletrônica (ECU / Scanner OBD2)
Quando a **luz amarela da injeção** acende no painel:
* São códigos técnicos padrão (ex: `P0300` falha de ignição, `P0130` sonda lambda).
* **Leitura com o XTOOL AD10:** Conecte o aparelho, abra o app (XTOOL ou Car Scanner), vá em **Diagnóstico** e veja o código com descrição em Português.
* **Apagar Falhas:** Após sanar o problema (ou em falhas temporárias, como combustível adulterado trocado), o botão **"Apagar Códigos"** limpa a memória da ECU e apaga a luz amarela do painel imediatamente.

---

## 6. 💡 Boas Práticas de Uso
* **Uso Diário:** O XTOOL AD10 pode ficar plugado na porta OBD2 para uso diário, pois entra em repouso ao desligar o carro.
* **Períodos Prolongados:** Se o veículo for ficar desligado por mais de 2 a 3 semanas seguidas sem uso, desconecte o aparelho da tomada OBD2 por precaução contra descarga lenta.
* **Central Multimídia K2401:** Sempre mantenha as notificações do Google Play Services silenciadas na central para evitar atualizações pesadas que roubem a memória RAM liberada.
