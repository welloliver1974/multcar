/**
 * Banco de dados completo de Códigos de Falha de Diagnóstico (DTCs - OBD2) em Português.
 * Otimizado com as falhas mais comuns da linha GM Chevrolet Onix / Prisma 1.0 e 1.4 SPE/4 Flex.
 */

export interface DtcInfo {
  code: string;
  descriptionPt: string;
  system: 'Ignição' | 'Arrefecimento' | 'Combustível / Injeção' | 'Emissões' | 'Elétrico / ECU' | 'Transmissão';
  severity: 'Aviso' | 'Atenção' | 'Crítico';
  recommendationPt: string;
}

export const DTC_DATABASE: Record<string, DtcInfo> = {
  // --- IGNIÇÃO & FALHAS DE CILINDRO ---
  P0300: {
    code: 'P0300',
    descriptionPt: 'Falha de combustão / ignição aleatória em múltiplos cilindros',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Verificar cabos de vela, velas de ignição desgastadas, bobina ou bicos injetores entupidos.',
  },
  P0301: {
    code: 'P0301',
    descriptionPt: 'Falha de ignição detectada no Cilindro 1',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Inspecionar vela e cabo de vela do cilindro 1 ou compressão do cilindro.',
  },
  P0302: {
    code: 'P0302',
    descriptionPt: 'Falha de ignição detectada no Cilindro 2',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Inspecionar vela e cabo de vela do cilindro 2.',
  },
  P0303: {
    code: 'P0303',
    descriptionPt: 'Falha de ignição detectada no Cilindro 3',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Inspecionar vela e cabo de vela do cilindro 3.',
  },
  P0304: {
    code: 'P0304',
    descriptionPt: 'Falha de ignição detectada no Cilindro 4',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Inspecionar vela e cabo de vela do cilindro 4.',
  },
  P0351: {
    code: 'P0351',
    descriptionPt: 'Falha no circuito primário/secundário da bobina de ignição A',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Testar a bobina de ignição do Prisma ou fiação do chicote.',
  },
  P0335: {
    code: 'P0335',
    descriptionPt: 'Sensor de rotação da árvore de manivelas (CKP) - Falha de sinal',
    system: 'Ignição',
    severity: 'Crítico',
    recommendationPt: 'Sensor de rotação falhando; pode causar apagamento do motor em movimento.',
  },

  // --- ARREFECIMENTO & TEMPERATURA ---
  P0115: {
    code: 'P0115',
    descriptionPt: 'Circuito do sensor de temperatura do arrefecimento (ECT) defeituoso',
    system: 'Arrefecimento',
    severity: 'Crítico',
    recommendationPt: 'Verificar plugue do sensor de temperatura do motor ou o próprio sensor ECT.',
  },
  P0117: {
    code: 'P0117',
    descriptionPt: 'Sensor de temperatura do arrefecimento - Sinal de entrada baixo (Superaquecimento)',
    system: 'Arrefecimento',
    severity: 'Crítico',
    recommendationPt: 'Possível curto-circuito à massa ou motor operando em temperatura excessivamente alta.',
  },
  P0118: {
    code: 'P0118',
    descriptionPt: 'Sensor de temperatura do arrefecimento - Circuito aberto / Entrada alta',
    system: 'Arrefecimento',
    severity: 'Crítico',
    recommendationPt: 'Sensor ECT desconectado ou rompido. Ventoinha pode ficar ligada direto em emergência.',
  },
  P0128: {
    code: 'P0128',
    descriptionPt: 'Válvula termostática - Motor não atinge a temperatura ideal de operação',
    system: 'Arrefecimento',
    severity: 'Atenção',
    recommendationPt: 'Válvula termostática travada aberta. Motor trabalha frio, aumentando o consumo em até 20%.',
  },

  // --- COMBUSTÍVEL, MISTURA & SONDA LAMBDA ---
  P0171: {
    code: 'P0171',
    descriptionPt: 'Sistema muito pobre (Banco 1) - Excesso de ar ou falta de combustível',
    system: 'Combustível / Injeção',
    severity: 'Atenção',
    recommendationPt: 'Verificar entrada falsa de ar no coletor, mangueira do hidrovácuo, pressão da bomba ou bicos sujos.',
  },
  P0172: {
    code: 'P0172',
    descriptionPt: 'Sistema muito rico (Banco 1) - Excesso de combustível ou falta de ar',
    system: 'Combustível / Injeção',
    severity: 'Atenção',
    recommendationPt: 'Verificar filtro de ar obstruído, bico gotejando ou sensor MAP descalibrado.',
  },
  P0130: {
    code: 'P0130',
    descriptionPt: 'Sonda Lambda pré-catalisador (Sensor 1) - Falha no circuito',
    system: 'Combustível / Injeção',
    severity: 'Atenção',
    recommendationPt: 'Verificar chicote da sonda pré-catalisador ou substituir o sensor de oxigênio.',
  },
  P0135: {
    code: 'P0135',
    descriptionPt: 'Aquecedor da Sonda Lambda pré-catalisador - Mau funcionamento',
    system: 'Combustível / Injeção',
    severity: 'Atenção',
    recommendationPt: 'Resistência de aquecimento da sonda rompida. Demora para entrar em malha fechada.',
  },
  P0106: {
    code: 'P0106',
    descriptionPt: 'Sensor de pressão absoluta do coletor (MAP) - Faixa/desempenho irregular',
    system: 'Combustível / Injeção',
    severity: 'Atenção',
    recommendationPt: 'Limpar ou inspecionar o sensor MAP e verificar vedação do coletor de admissão.',
  },
  P0122: {
    code: 'P0122',
    descriptionPt: 'Sensor de posição da borboleta / pedal do acelerador (TPS) - Sinal baixo',
    system: 'Combustível / Injeção',
    severity: 'Crítico',
    recommendationPt: 'Corpo de borboleta (TBI) com mau contato ou pista do potenciômetro com defeito.',
  },

  // --- EMISSÕES & EVAP ---
  P0420: {
    code: 'P0420',
    descriptionPt: 'Eficiência do catalisador abaixo do limite (Banco 1)',
    system: 'Emissões',
    severity: 'Aviso',
    recommendationPt: 'Catalisador com eficiência reduzida, combustível adulterado ou vazamento no escapamento.',
  },
  P0443: {
    code: 'P0443',
    descriptionPt: 'Válvula de purga do cânister (EVAP) - Falha no circuito de controle',
    system: 'Emissões',
    severity: 'Aviso',
    recommendationPt: 'Verificar solenoide da válvula de purga do cânister ou mangueiras de vapor de combustível.',
  },

  // --- SISTEMA ELÉTRICO & TENSÃO ---
  P0562: {
    code: 'P0562',
    descriptionPt: 'Tensão do sistema elétrico muito baixa (< 10.5V)',
    system: 'Elétrico / ECU',
    severity: 'Crítico',
    recommendationPt: 'Alternador não está carregando, correia de acessórios frouxa ou bateria em curto.',
  },
  P0563: {
    code: 'P0563',
    descriptionPt: 'Tensão do sistema elétrico excessivamente alta (> 16.0V)',
    system: 'Elétrico / ECU',
    severity: 'Crítico',
    recommendationPt: 'Regulador de voltagem do alternador queimado. Perigo de queimar módulos do carro.',
  },
};

/**
 * Converte 2 bytes brutos recebidos da ECU para a string padronizada do código DTC (ex: P0300).
 */
export function bytesToDtcCode(byteA: number, byteB: number): string | null {
  if (byteA === 0x00 && byteB === 0x00) return null;

  const typeNum = (byteA >> 6) & 0x03;
  let typeChar = 'P'; // Powertrain
  if (typeNum === 1) typeChar = 'C'; // Chassis
  if (typeNum === 2) typeChar = 'B'; // Body
  if (typeNum === 3) typeChar = 'U'; // Network

  const digit2 = ((byteA >> 4) & 0x03).toString(16);
  const digit3 = (byteA & 0x0f).toString(16);
  const digit4 = ((byteB >> 4) & 0x0f).toString(16);
  const digit5 = (byteB & 0x0f).toString(16);

  return `${typeChar}${digit2}${digit3}${digit4}${digit5}`.toUpperCase();
}

