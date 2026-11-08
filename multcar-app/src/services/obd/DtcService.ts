/**
 * Serviço de Diagnóstico de Falhas (DTCs - Diagnostic Trouble Codes).
 * Responsável por solicitar, decodificar e limpar falhas no motor do Prisma.
 */

import { CanProtocol } from '../ble/CanProtocol.ts';
import { OBD_MODES } from '../ble/AD10Constants.ts';
import { bytesToDtcCode, DTC_DATABASE, type DtcInfo } from './DtcDatabase.ts';

export interface DecodedDtcResult {
  code: string;
  info?: DtcInfo;
  isPending: boolean;
}

export class DtcService {
  /**
   * Constrói o frame para ler códigos de falha confirmados (Mode 03).
   */
  public static buildReadDtcFrame(): Uint8Array {
    return CanProtocol.buildCan11BitFrame(OBD_MODES.SHOW_STORED_DTCS);
  }

  /**
   * Constrói o frame para ler códigos de falha pendentes (Mode 07).
   */
  public static buildReadPendingDtcFrame(): Uint8Array {
    return CanProtocol.buildCan11BitFrame(OBD_MODES.SHOW_PENDING_DTCS);
  }

  /**
   * Constrói o frame para APAGAR todos os códigos de falha e apagar a luz da injeção (Mode 04).
   */
  public static buildClearDtcFrame(): Uint8Array {
    return CanProtocol.buildCan11BitFrame(OBD_MODES.CLEAR_DTCS_AND_RESET);
  }

  /**
   * Decodifica os bytes retornados pela ECU para uma lista de códigos DTC com descrições.
   */
  public static parseDtcResponse(dataBytes: number[], isPending: boolean = false): DecodedDtcResult[] {
    const results: DecodedDtcResult[] = [];
    if (!dataBytes || dataBytes.length < 2) return results;

    // A resposta do Mode 03/07 traz pares de 2 bytes para cada falha: [ByteA1, ByteB1, ByteA2, ByteB2...]
    // Em alguns protocolos, o primeiro byte pode ser a quantidade de falhas
    let startIndex = 0;
    if (dataBytes.length % 2 !== 0) {
      startIndex = 1; // Pula o byte contador
    }

    for (let i = startIndex; i + 1 < dataBytes.length; i += 2) {
      const byteA = dataBytes[i];
      const byteB = dataBytes[i + 1];
      const code = bytesToDtcCode(byteA, byteB);

      if (code && code !== 'P0000') {
        const info = DTC_DATABASE[code] || {
          code,
          descriptionPt: `Código genérico / específico do fabricante (${code})`,
          system: 'Combustível / Injeção',
          severity: 'Aviso',
          recommendationPt: 'Consulte o manual de reparação da GM ou realize teste nos atuadores.',
        };

        results.push({
          code,
          info,
          isPending,
        });
      }
    }

    return results;
  }
}
