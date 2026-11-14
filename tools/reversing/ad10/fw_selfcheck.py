"""
Auto-verificação do ambiente de engenharia reversa do XTOOL AD10.

Rode ANTES de confiar em qualquer disassembly:
    python tools/reversing/ad10/fw_selfcheck.py

Ele confere, em poucos segundos:
  1. A base do flash do firmware (a fonte mais comum de erro)
  2. Se o disassemblador está alinhado corretamente
  3. Se a tabela de comandos tem os valores esperados
  4. Se as strings do firmware batem com os endereços

Se qualquer item falhar, a análise está ERRADA — não avance.
"""
import os
import struct
import sys

try:
    from capstone import Cs, CS_ARCH_ARM, CS_MODE_THUMB
    HAVE_CAPSTONE = True
except ImportError:
    HAVE_CAPSTONE = False

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FW = os.path.join(ROOT, 'unpacked_apk', 'assets', 'ble_obd.bin')

fails = []


def check(name, cond, detail=''):
    if cond:
        print(f'  [OK]   {name}')
    else:
        print(f'  [FALHA] {name}  {detail}')
        fails.append(name)


def main():
    if not os.path.exists(FW):
        print(f'Arquivo do firmware nao encontrado: {FW}')
        print('Extraia o APK oficial AD10EN_V2.0.3_C203.apk antes (assets/ble_obd.bin).')
        return 2

    data = open(FW, 'rb').read()
    print(f'\n=== Self-check do firmware AD10 ({len(data)} bytes) ===\n')

    # ---- 1. Vetor de reset -> base do flash ----
    sp = struct.unpack_from('<I', data, 0)[0]
    reset = struct.unpack_from('<I', data, 4)[0]
    print(f'  SP inicial = 0x{sp:08x}')
    print(f'  Reset      = 0x{reset:08x}')

    base = reset & 0xFFFFF000
    # Heuristica: a base deve ser a seguinte pagina aligned que contenha o reset
    check('SP inicial em RAM (0x2000xxxx)', 0x20000000 <= sp < 0x20010000, f'0x{sp:08x}')
    check('Reset vector com bit Thumb setado', bool(reset & 1), f'0x{reset:08x}')

    # A base correta e a que faz o vetor cair dentro do arquivo
    # (o arquivo comeca no vetor -> base = reset - offset_do_reset)
    # Como nao sabemos o offset, testamos as duas candidatas usuais.
    print('\n  -- Candidatas de base do flash --')
    for cand in (0x08002000, 0x08000000):
        off = (reset & ~1) - cand
        ok = 0 <= off < len(data)
        print(f'     0x{cand:08x} -> reset no offset 0x{off:x} {"(valido)" if ok else "(invalido)"}')

    # ---- 2. Tabela de comandos no offset correto ----
    # A tabela real esta em 0x0800bbf4. Com base 0x08002000 -> offset 0x9bf4
    off_tab = 0x9bf4
    cmds = []
    for i in range(9):
        cmd = struct.unpack_from('<H', data, off_tab + i * 8)[0]
        fn = struct.unpack_from('<I', data, off_tab + i * 8 + 4)[0]
        cmds.append((cmd, fn))
    esperados = [0x6001, 0x6002, 0x6003, 0x6004, 0x6005, 0x6006, 0x6007, 0x6008, 0x6009]
    check('Tabela de comandos em 0x0800bbf4',
          [c for c, _ in cmds] == esperados,
          f'obtido {[hex(c) for c, _ in cmds]}')
    check('Handlers dentro do firmware',
          all(base + 0x1000 <= fn < base + len(data) for _, fn in cmds),
          'handlers fora da faixa')

    # ---- 3. Sub-tabela 0x6002 (0x80..0x86) ----
    off_obd = 0x9cec
    sub = [data[off_obd + i * 8] for i in range(7)]
    check('Sub-comandos de 0x6002 = 0x80..0x86', sub == list(range(0x80, 0x87)),
          f'obtido {[hex(s) for s in sub]}')

    # ---- 4. Strings-chave ----
    for texto, esperado in [
        (b'[ble] protocol_volt : %d', True),
        (b'[ble] send_can_id :%d', True),
        (b'[ble] ble_protocol_analy_char: packet overflow !!!', True),
    ]:
        check(f'string presente: {texto.decode()[:40]}', (texto in data) == esperado)

    # ---- 5. Alinhamento do disassemblador ----
    if HAVE_CAPSTONE:
        print('\n  -- Alinhamento do disassemblador --')
        md = Cs(CS_ARCH_ARM, CS_MODE_THUMB)
        # ble_protocol_analy_char comeca em 0x08005af0 (offset 0x3af0 com base 0x08002000)
        inicio = 0x3af0
        ins = list(md.disasm(data[inicio:inicio + 16], 0x08005af0))
        ok = ins and ins[0].mnemonic == 'push' and 'r6' in ins[0].op_str
        check('Primeira instrucao de ble_protocol_analy_char = push {...}',
              ok, ins[0].mnemonic + ' ' + ins[0].op_str if ins else 'sem instruções')

        # Um push Thumb-2 de 6 regs = 0xB5F8 (bytes f8 b5) -> push {r3,r4,r5,r6,r7,lr}
        esperado_push = data[inicio:inicio + 2]
        check('Bytes da prologoagem = F8 B5 (push {r3,r4,r5,r6,r7,lr})',
              esperado_push == b'\xf8\xb5', esperado_push.hex(' '))
    else:
        print('\n  [AVISO] Capstone não instalado — instale com: pip install capstone')
        print('  Sem um disassemblador REAL, NÃO confie em nenhum analysis de ARM.')

    print('\n' + ('=== SELF-CHECK OK ===' if not fails
                  else f'=== {len(fails)} FALHA(S) — a base/ferramentas estao erradas ==='))
    return 0 if not fails else 1


if __name__ == '__main__':
    sys.exit(main())
