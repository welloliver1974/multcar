/**
 * Teste unitário e de validação do protocolo CAN/BLE do XTOOL AD10 e dos PIDs do Chevrolet Prisma.
 */

import { CanProtocol } from './services/ble/CanProtocol.ts';
import { PRISMA_PIDS } from './services/obd/PidDefinitions.ts';
import { DtcService } from './services/obd/DtcService.ts';
import { ObdPollingQueue } from './services/ble/ObdPollingQueue.ts';

function runProtocolTests() {
  console.log('====================================================');
  console.log('🏁 INICIANDO BATERIA DE TESTES DO PROTOCOLO MULTCAR');
  console.log('====================================================\n');

  // TESTE 1: Construção de Frames CAN 11-bit
  console.log('--- TESTE 1: Codificação de Frames CAN 11-bit ---');
  const rpmFrame = CanProtocol.buildCan11BitFrame(0x01, PRISMA_PIDS.RPM.pid);
  const coolantFrame = CanProtocol.buildCan11BitFrame(0x01, PRISMA_PIDS.COOLANT_TEMP.pid);
  const voltageFrame = CanProtocol.buildCan11BitFrame(0x01, PRISMA_PIDS.CONTROL_VOLTAGE.pid);

  console.log('Frame RPM (0x0C):', Array.from(rpmFrame).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.log('Frame Temp (0x05):', Array.from(coolantFrame).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
  console.log('Frame Voltagem (0x42):', Array.from(voltageFrame).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));

  if (rpmFrame[0] === 0x08 && rpmFrame[1] === 0x07 && rpmFrame[2] === 0xdf && rpmFrame[5] === 0x0c) {
    console.log('✅ TESTE 1 APROVADO: Frames CAN correspondem perfeitamente à especificação descompilada!\n');
  } else {
    throw new Error('Falha no Teste 1: Frame incorreto');
  }

  // TESTE 2: Decodificação de Respostas da ECU
  console.log('--- TESTE 2: Decodificação de Respostas Simuladas da ECU ---');
  
  // Simulação 1: RPM a 2000 RPM (2000 * 4 = 8000 = 0x1F40 -> A=0x1F, B=0x40)
  const simulatedRpm = new Uint8Array([0x07, 0xe8, 0x04, 0x41, 0x0c, 0x1f, 0x40]);
  const parsedRpm = CanProtocol.parseResponse(simulatedRpm);
  const rpmVal = PRISMA_PIDS.RPM.calculate(parsedRpm.dataBytes);
  console.log(`RPM Recebido: ${rpmVal} RPM (Esperado: 2000 RPM) -> Formatado: ${PRISMA_PIDS.RPM.format(rpmVal)}`);

  // Simulação 2: Temperatura da Água a 92°C (92 + 40 = 132 = 0x84)
  const simulatedTemp = new Uint8Array([0x07, 0xe8, 0x03, 0x41, 0x05, 0x84]);
  const parsedTemp = CanProtocol.parseResponse(simulatedTemp);
  const tempVal = PRISMA_PIDS.COOLANT_TEMP.calculate(parsedTemp.dataBytes);
  console.log(`Temperatura da Água: ${tempVal}°C (Esperado: 92°C) -> Formatado: ${PRISMA_PIDS.COOLANT_TEMP.format(tempVal)}`);

  // Simulação 3: Tensão do Alternador a 14.50V (14.50 * 1000 = 14500 = 0x38A4 -> A=0x38, B=0xA4)
  const simulatedVolt = new Uint8Array([0x07, 0xe8, 0x04, 0x41, 0x42, 0x38, 0xa4]);
  const parsedVolt = CanProtocol.parseResponse(simulatedVolt);
  const voltVal = PRISMA_PIDS.CONTROL_VOLTAGE.calculate(parsedVolt.dataBytes);
  console.log(`Tensão Alternador: ${voltVal}V (Esperado: 14.50V) -> Formatado: ${PRISMA_PIDS.CONTROL_VOLTAGE.format(voltVal)}`);

  if (rpmVal === 2000 && tempVal === 92 && Math.abs(voltVal - 14.50) < 0.01) {
    console.log('✅ TESTE 2 APROVADO: Fórmulas de cálculo de sensores 100% calibradas!\n');
  } else {
    throw new Error('Falha no Teste 2: Cálculo divergente');
  }

  // TESTE 3: Diagnóstico de Falhas (DTCs)
  console.log('--- TESTE 3: Decodificação de Códigos de Falha (DTC) ---');
  // Simulação de resposta com 2 falhas: P0300 (0x03, 0x00) e P0118 (0x01, 0x18)
  const simulatedDtcResponse = [0x03, 0x00, 0x01, 0x18];
  const dtcResults = DtcService.parseDtcResponse(simulatedDtcResponse);
  console.log(`Falhas identificadas: ${dtcResults.length}`);
  dtcResults.forEach(d => {
    console.log(`  🚨 Código: ${d.code} [${d.info?.severity}] - ${d.info?.descriptionPt}`);
    console.log(`     Ação recomendada: ${d.info?.recommendationPt}`);
  });

  if (dtcResults.length === 2 && dtcResults[0].code === 'P0300' && dtcResults[1].code === 'P0118') {
    console.log('✅ TESTE 3 APROVADO: Leitura e tradução de DTCs em português validada!\n');
  } else {
    throw new Error('Falha no Teste 3: Erro no parser de DTC');
  }

  // TESTE 4: Fila de Polling Priorizada
  console.log('--- TESTE 4: Teste da Fila de Polling de Sensores ---');
  const queue = new ObdPollingQueue();
  const cmd1 = queue.getNextCommand();
  const cmd2 = queue.getNextCommand();
  console.log(`Comando 1 escalonado: PID ${cmd1?.pidKey} (0x${cmd1?.pid.toString(16)})`);
  console.log(`Comando 2 escalonado: PID ${cmd2?.pidKey} (0x${cmd2?.pid.toString(16)})`);

  if (cmd1 && cmd2 && cmd1.pidKey !== cmd2.pidKey) {
    console.log('✅ TESTE 4 APROVADO: Escalonador de leitura funcionando sem conflito!\n');
  } else {
    throw new Error('Falha no Teste 4: Fila de polling falhou');
  }

  console.log('====================================================');
  console.log('🎉 TODOS OS TESTES FORAM CONCLUÍDOS COM SUCESSO!');
  console.log('====================================================');
}

runProtocolTests();
