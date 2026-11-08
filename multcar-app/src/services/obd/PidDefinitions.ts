/**
 * Catálogo e definições matemáticas dos sensores OBD2 (PIDs) para o Chevrolet Prisma LTZ 1.4 SPE/4 Flex (2015).
 */

export interface PidDefinition {
  pid: number;
  code: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  dangerLow?: number;
  dangerHigh?: number;
  pollIntervalMs: number;
  calculate: (bytes: number[]) => number;
  format: (value: number) => string;
}

export const PRISMA_PIDS: Record<string, PidDefinition> = {
  // 1. Rotação do Motor (RPM) - Alta Prioridade (100ms)
  RPM: {
    pid: 0x0c,
    code: '0C',
    name: 'Rotação do Motor',
    unit: 'RPM',
    min: 0,
    max: 7000,
    dangerHigh: 6200, // Faixa de corte de giro
    pollIntervalMs: 100,
    calculate: (bytes: number[]) => {
      if (bytes.length < 2) return 0;
      const a = bytes[0];
      const b = bytes[1];
      return ((a * 256) + b) / 4;
    },
    format: (val: number) => `${Math.round(val)} RPM`,
  },

  // 2. Velocidade do Veículo (VSS) - Alta Prioridade (100ms)
  SPEED: {
    pid: 0x0d,
    code: '0D',
    name: 'Velocidade Real (ECU)',
    unit: 'km/h',
    min: 0,
    max: 220,
    pollIntervalMs: 100,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return bytes[0];
    },
    format: (val: number) => `${Math.round(val)} km/h`,
  },

  // 3. Posição da Borboleta do Acelerador (TPS) - Alta Prioridade (100ms)
  THROTTLE: {
    pid: 0x11,
    code: '11',
    name: 'Posição do Acelerador (TPS)',
    unit: '%',
    min: 0,
    max: 100,
    pollIntervalMs: 150,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return (bytes[0] * 100) / 255;
    },
    format: (val: number) => `${val.toFixed(1)}%`,
  },

  // 4. Temperatura do Líquido de Arrefecimento (ECT) - Prioridade Média (1000ms) - CRÍTICO!
  COOLANT_TEMP: {
    pid: 0x05,
    code: '05',
    name: 'Temperatura da Água (Motor)',
    unit: '°C',
    min: -40,
    max: 140,
    dangerLow: 75,   // Motor frio (<75°C consome mais e carboniza)
    dangerHigh: 105, // Ventoinha estágio 2 entra a ~102°C; >105°C perigo iminente de junta
    pollIntervalMs: 1000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return bytes[0] - 40;
    },
    format: (val: number) => `${Math.round(val)} °C`,
  },

  // 5. Tensão do Módulo de Controle / Bateria - Prioridade Média (1000ms)
  CONTROL_VOLTAGE: {
    pid: 0x42,
    code: '42',
    name: 'Tensão da Bateria / Alternador',
    unit: 'V',
    min: 8.0,
    max: 16.0,
    dangerLow: 11.8, // Bateria descarregando
    dangerHigh: 15.0, // Sobretensão no alternador
    pollIntervalMs: 1000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 2) return 0;
      const a = bytes[0];
      const b = bytes[1];
      return ((a * 256) + b) / 1000;
    },
    format: (val: number) => `${val.toFixed(2)} V`,
  },

  // 6. Pressão Absoluta no Coletor (MAP - Vácuo) - Prioridade Média (500ms)
  INTAKE_PRESSURE_MAP: {
    pid: 0x0b,
    code: '0B',
    name: 'Pressão Coletor (MAP)',
    unit: 'kPa',
    min: 0,
    max: 255,
    pollIntervalMs: 500,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return bytes[0];
    },
    format: (val: number) => `${Math.round(val)} kPa`,
  },

  // 7. Carga Calculada do Motor (Engine Load) - Prioridade Média (500ms)
  ENGINE_LOAD: {
    pid: 0x04,
    code: '04',
    name: 'Carga do Motor',
    unit: '%',
    min: 0,
    max: 100,
    pollIntervalMs: 500,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return (bytes[0] * 100) / 255;
    },
    format: (val: number) => `${val.toFixed(1)}%`,
  },

  // 8. Temperatura do Ar de Admissão (IAT) - Prioridade Baixa (2000ms)
  INTAKE_AIR_TEMP: {
    pid: 0x0f,
    code: '0F',
    name: 'Temperatura do Ar Admitido',
    unit: '°C',
    min: -40,
    max: 100,
    pollIntervalMs: 2000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return bytes[0] - 40;
    },
    format: (val: number) => `${Math.round(val)} °C`,
  },

  // 9. Avanço de Ignição (Timing Advance) - Prioridade Média (500ms)
  TIMING_ADVANCE: {
    pid: 0x0e,
    code: '0E',
    name: 'Ponto de Ignição',
    unit: '°',
    min: -64,
    max: 63.5,
    pollIntervalMs: 500,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return (bytes[0] / 2) - 64;
    },
    format: (val: number) => `${val.toFixed(1)}°`,
  },

  // 10. Ajuste de Combustível de Curto Prazo (STFT Bank 1) - Prioridade Baixa (2000ms)
  SHORT_TERM_FUEL_TRIM: {
    pid: 0x06,
    code: '06',
    name: 'Ajuste Combustível Curto (STFT)',
    unit: '%',
    min: -100,
    max: 99.2,
    pollIntervalMs: 2000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return ((bytes[0] - 128) * 100) / 128;
    },
    format: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`,
  },

  // 11. Ajuste de Combustível de Longo Prazo (LTFT Bank 1) - Prioridade Baixa (3000ms)
  // Indicação de adaptação Flex (Etanol vs Gasolina)
  LONG_TERM_FUEL_TRIM: {
    pid: 0x07,
    code: '07',
    name: 'Ajuste Combustível Longo (LTFT - Flex)',
    unit: '%',
    min: -100,
    max: 99.2,
    pollIntervalMs: 3000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return ((bytes[0] - 128) * 100) / 128;
    },
    format: (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(1)}%`,
  },

  // 12. Nível de Combustível no Tanque (se exposto pelo ECM)
  FUEL_TANK_LEVEL: {
    pid: 0x2f,
    code: '2F',
    name: 'Nível do Tanque de Combustível',
    unit: '%',
    min: 0,
    max: 100,
    pollIntervalMs: 10000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 1) return 0;
      return (bytes[0] * 100) / 255;
    },
    format: (val: number) => `${val.toFixed(1)}%`,
  },

  // 13. Tempo de Motor em Funcionamento desde a partida
  ENGINE_RUN_TIME: {
    pid: 0x1f,
    code: '1F',
    name: 'Tempo de Motor Ligado',
    unit: 's',
    min: 0,
    max: 65535,
    pollIntervalMs: 5000,
    calculate: (bytes: number[]) => {
      if (bytes.length < 2) return 0;
      return (bytes[0] * 256) + bytes[1];
    },
    format: (val: number) => {
      const minutes = Math.floor(val / 60);
      const seconds = Math.floor(val % 60);
      return `${minutes}m ${seconds}s`;
    },
  },
};

