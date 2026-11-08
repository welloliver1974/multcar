/**
 * Constantes de hardware e Bluetooth Low Energy (BLE) do dongle XTOOL Advancer AD10.
 * Decodificado via engenharia reversa do APK oficial AD10EN_V2.0.3_C203.
 */

export const AD10_BLE_CONFIG = {
  // Nome padrão anunciado pelo dongle no scan BLE
  DEVICE_NAME_PREFIX: 'AD10',

  // Nordic UART Service (NUS)
  SERVICE_UUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',

  // Característica de Envio (TX: Celular/Multimídia -> AD10)
  WRITE_CHARACTERISTIC_UUID: '6e400004-b5a3-f393-e0a9-e50e24dcca9e',

  // Característica de Recebimento de Notificações (RX: AD10 -> Celular/Multimídia)
  NOTIFY_CHARACTERISTIC_UUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',

  // Descritor CCCD para ativação de notificações no Android GATT
  CCCD_DESCRIPTOR_UUID: '00002902-0000-1000-8000-00805f9b34fb',

  // Limite máximo de bytes por chunk de escrita BLE ATT MTU padrão
  BLE_CHUNK_SIZE: 20,

  // Intervalos de reconexão automática (ms)
  RECONNECT_INTERVAL_MS: 3000,
  CONNECTION_TIMEOUT_MS: 10000,
} as const;

export const OBD_CAN_IDS = {
  // Identificador de transmissão CAN 11-bit padrão OBD2 (Broadcast para todas as ECUs)
  BROADCAST_REQUEST_11BIT: 0x07DF,

  // Resposta padrão da ECU do motor (ECM) do Prisma LTZ
  ECM_RESPONSE_11BIT: 0x07E8,

  // Resposta do módulo de transmissão automática (TCM - se aplicável)
  TCM_RESPONSE_11BIT: 0x07E9,

  // Identificador CAN 29-bit estendido (para outros veículos)
  BROADCAST_REQUEST_29BIT: 0x18DB33F1,
} as const;

export const OBD_MODES = {
  SHOW_CURRENT_DATA: 0x01,
  SHOW_FREEZE_FRAME: 0x02,
  SHOW_STORED_DTCS: 0x03,
  CLEAR_DTCS_AND_RESET: 0x04,
  O2_MONITOR_TEST: 0x05,
  ON_BOARD_MONITOR_TEST: 0x06,
  SHOW_PENDING_DTCS: 0x07,
  VEHICLE_INFORMATION: 0x09,
  SHOW_PERMANENT_DTCS: 0x0A,
} as const;

