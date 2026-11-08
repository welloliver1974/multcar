/**
 * Codificador e Decodificador do Protocolo CAN OBD2 sobre BLE do XTOOL AD10.
 * Baseado na descompilação de `com.xtooltech.ad10.Utils` e `com.diagnosis.obdbluetooth.BleConnector`.
 */

import { AD10_BLE_CONFIG, OBD_CAN_IDS, OBD_MODES } from './AD10Constants.ts';

export interface ParsedCanResponse {
  ecuId: number;       // Ex: 0x7E8 (ECM Prisma)
  mode: number;        // Ex: 0x01 (Modo original do comando)
  pid: number | null;  // Ex: 0x0C (RPM) ou null para DTCs
  dataBytes: number[]; // Bytes de dados úteis (A, B, C, D...)
  isValid: boolean;
  rawHex: string;
}

export class CanProtocol {
  /**
   * Constrói o frame de envio proprietário CAN 11-bit (500 kbps) para o Prisma 2015.
   * Reproduz exatamente o método `comboCanCommand` do app oficial.
   * Formato: [0x08, 0x07, 0xDF, TamanhoPayload, Modo, PID...]
   */
  public static buildCan11BitFrame(
    mode: number = OBD_MODES.SHOW_CURRENT_DATA,
    pid?: number,
    extraPayload: number[] = []
  ): Uint8Array {
    const payload: number[] = [mode];
    if (pid !== undefined && pid !== null) {
      payload.push(pid);
    }
    if (extraPayload.length > 0) {
      payload.push(...extraPayload);
    }

    const payloadLength = payload.length;
    // 0x08 = flag CAN 11b, 0x07 0xDF = CAN ID 0x07DF, payloadLength, ...payload
    const frame = new Uint8Array([
      0x08,
      (OBD_CAN_IDS.BROADCAST_REQUEST_11BIT >> 8) & 0xff, // 0x07
      OBD_CAN_IDS.BROADCAST_REQUEST_11BIT & 0xff,        // 0xDF
      payloadLength & 0xff,                              // Ex: 0x02 para Mode 01 + PID
      ...payload,
    ]);

    return frame;
  }

  /**
   * Constrói o frame de envio CAN 29-bit estendido (CAN ID 0x18DB33F1).
   */
  public static buildCan29BitFrame(
    mode: number = OBD_MODES.SHOW_CURRENT_DATA,
    pid?: number,
    extraPayload: number[] = []
  ): Uint8Array {
    const payload: number[] = [mode];
    if (pid !== undefined && pid !== null) {
      payload.push(pid);
    }
    if (extraPayload.length > 0) {
      payload.push(...extraPayload);
    }

    const frame = new Uint8Array([
      0x88, 0x18, 0xdb, 0x33, 0xf1,
      payload.length & 0xff,
      ...payload,
    ]);

    return frame;
  }

  /**
   * Fragmenta um pacote em blocos de até 20 bytes (limite MTU do BLE GATT).
   * Reproduz o comportamento do `BleConnector.sendDataJNI`.
   */
  public static chunkForBle(data: Uint8Array): Uint8Array[] {
    const chunks: Uint8Array[] = [];
    const chunkSize = AD10_BLE_CONFIG.BLE_CHUNK_SIZE;

    for (let i = 0; i < data.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, data.length);
      chunks.push(data.slice(i, end));
    }

    return chunks;
  }

  /**
   * Decodifica a resposta recebida na notificação BLE (6E400003).
   * A ECU responde tipicamente com [..., 0x07, 0xE8, Tamanho, 0x41, PID, A, B...]
   */
  public static parseResponse(buffer: Uint8Array): ParsedCanResponse {
    const hex = Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join(' ');

    if (buffer.length < 3) {
      return { ecuId: 0, mode: 0, pid: null, dataBytes: [], isValid: false, rawHex: hex };
    }

    // Procura o identificador de resposta da ECU (0x07, 0xE8 = 0x7E8)
    let startIndex = -1;
    let ecuId = OBD_CAN_IDS.ECM_RESPONSE_11BIT;

    for (let i = 0; i < buffer.length - 2; i++) {
      if (buffer[i] === 0x07 && (buffer[i + 1] === 0xe8 || buffer[i + 1] === 0xe9)) {
        startIndex = i;
        ecuId = (buffer[i] << 8) | buffer[i + 1];
        break;
      }
    }

    // Se não encontrou o cabeçalho 0x07 0xE8 explícito, tenta localizar pelo byte de modo de resposta (0x41, 0x43, 0x47)
    if (startIndex === -1) {
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i] === 0x41 || buffer[i] === 0x43 || buffer[i] === 0x47) {
          startIndex = Math.max(0, i - 3);
          break;
        }
      }
    }

    // Extrai o modo e os bytes
    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];

      // Modo 01 responde como 0x41 (0x01 + 0x40)
      if (byte === 0x41 && i + 1 < buffer.length) {
        const pid = buffer[i + 1];
        const dataBytes = Array.from(buffer.slice(i + 2));
        return {
          ecuId,
          mode: 0x01,
          pid,
          dataBytes,
          isValid: true,
          rawHex: hex,
        };
      }

      // Modo 03 (DTCs armazenados) responde como 0x43
      if (byte === 0x43) {
        const dataBytes = Array.from(buffer.slice(i + 1));
        return {
          ecuId,
          mode: 0x03,
          pid: null,
          dataBytes,
          isValid: true,
          rawHex: hex,
        };
      }

      // Modo 07 (DTCs pendentes) responde como 0x47
      if (byte === 0x47) {
        const dataBytes = Array.from(buffer.slice(i + 1));
        return {
          ecuId,
          mode: 0x07,
          pid: null,
          dataBytes,
          isValid: true,
          rawHex: hex,
        };
      }

      // Modo 04 (Limpeza de DTCs) responde como 0x44
      if (byte === 0x44) {
        return {
          ecuId,
          mode: 0x04,
          pid: null,
          dataBytes: [],
          isValid: true,
          rawHex: hex,
        };
      }
    }

    return {
      ecuId,
      mode: 0,
      pid: null,
      dataBytes: Array.from(buffer),
      isValid: false,
      rawHex: hex,
    };
  }

  /**
   * Cálculo de CRC conforme implementado em `com.xtooltech.ad10.Utils.getCrc`.
   */
  public static calculateAd10Crc(data: Uint8Array): number {
    let crc = 0;
    for (let i = 0; i < data.length; i++) {
      let b = data[i];
      for (let bit = 0; bit < 8; bit++) {
        const bitFlag = ((crc ^ b) & 0x01) !== 0;
        crc >>>= 1;
        if (bitFlag) {
          crc ^= 0x8c; // Polinômio do algoritmo XTOOL
        }
        b >>>= 1;
      }
    }
    return crc & 0xff;
  }
}
