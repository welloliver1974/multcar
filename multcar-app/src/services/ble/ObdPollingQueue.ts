/**
 * Fila de Polling Inteligente de PIDs OBD2.
 * Garante atualizações ultra-rápidas para o painel (RPM/Velocidade) sem engarrafar a rede CAN da GM.
 */

import { CanProtocol } from './CanProtocol.ts';
import { PRISMA_PIDS, type PidDefinition } from '../obd/PidDefinitions.ts';

export interface PollItem {
  pidKey: string;
  definition: PidDefinition;
  lastPolledAt: number;
}

export class ObdPollingQueue {
  private items: PollItem[] = [];
  private isPaused: boolean = false;
  private currentIndex: number = 0;

  constructor() {
    this.initDefaultPids();
  }

  private initDefaultPids(): void {
    const defaultKeys = [
      'RPM',
      'SPEED',
      'THROTTLE',
      'COOLANT_TEMP',
      'CONTROL_VOLTAGE',
      'INTAKE_PRESSURE_MAP',
      'ENGINE_LOAD',
      'TIMING_ADVANCE',
      'SHORT_TERM_FUEL_TRIM',
      'LONG_TERM_FUEL_TRIM',
    ];

    this.items = defaultKeys
      .filter(k => PRISMA_PIDS[k])
      .map(k => ({
        pidKey: k,
        definition: PRISMA_PIDS[k],
        lastPolledAt: 0,
      }));
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  /**
   * Retorna o próximo comando a ser enviado para o dongle AD10 com base no tempo decorrido.
   */
  public getNextCommand(): { frame: Uint8Array; pidKey: string; pid: number } | null {
    if (this.isPaused || this.items.length === 0) return null;

    const now = Date.now();

    // Varre a lista a partir do índice atual procurando o primeiro PID cujo tempo expirou
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this.currentIndex + i) % this.items.length;
      const item = this.items[idx];

      if (now - item.lastPolledAt >= item.definition.pollIntervalMs) {
        item.lastPolledAt = now;
        this.currentIndex = (idx + 1) % this.items.length;

        const frame = CanProtocol.buildCan11BitFrame(0x01, item.definition.pid);
        return {
          frame,
          pidKey: item.pidKey,
          pid: item.definition.pid,
        };
      }
    }

    return null;
  }
}
