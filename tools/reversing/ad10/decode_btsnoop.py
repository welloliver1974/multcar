"""
Decodifica um arquivo btsnoop (captura HCI) e extrai os quadros ATT
escritos pelo aplicativo para o dongle XTOOL AD10.

Uso:
    python tools/reversing/ad10/decode_btsnoop.py captura.btsnoop
"""
import struct
import sys
from datetime import datetime, timezone

# Opcodes ATT
ATT_WRITE_REQ = 0x12
ATT_WRITE_CMD = 0x52
ATT_WRITE_RESP = 0x13
ATT_HANDLE_NTF = 0x1B
ATT_READ_BY_TYPE_RESP = 0x08
ATT_ERROR_RESP = 0x01
ATT_READ_REQ = 0x0A


def parse_btsnoop(path):
    d = open(path, 'rb').read()
    if d[:8] != b'btsnoop\0':
        raise SystemExit(f'Não é um btsnoop: {d[:8]!r}')
    ver, datalink = struct.unpack_from('>II', d, 8)
    print(f'# btsnoop v{ver} datalink={datalink} ({len(d)} bytes)')

    off = 16
    recs = []
    while off + 24 <= len(d):
        orig, incl, flags, drops, ts = struct.unpack_from('>IIIIQ', d, off)
        off += 24
        if off + incl > len(d):
            break
        pkt = d[off:off + incl]
        off += incl
        # timestamp: micros desde 0000-01-01
        t = datetime(1970, 1, 1, tzinfo=timezone.utc) + __import__('datetime').timedelta(microseconds=ts)
        recs.append((t, pkt, flags))
    return recs


def hci_payload(pkt, datalink):
    """Extrai o payload ATT de um pacote HCI."""
    # HCI unencapsulated (2001) ou HCI UART (1002)
    if datalink == 1002:
        # 4 bytes de header H4
        pkt = pkt[4:]
    if not pkt:
        return None
    ptype = pkt[0]
    if ptype == 0x04:  # HCI Event
        return None
    if ptype == 0x02:  # ACL
        if len(pkt) < 5:
            return None
        l2len = struct.unpack_from('<H', pkt, 3)[0]
        l2 = pkt[5:5 + l2len]
        if not l2:
            return None
        l2len2 = struct.unpack_from('<H', l2, 0)[0]
        l2cid = struct.unpack_from('<H', l2, 2)[0]
        if l2cid != 0x0004:      # ATT CID fixo
            return None
        return l2[4:]
    if ptype == 0x01:  # Command
        return None
    return None


def main():
    path = sys.argv[1]
    d = open(path, 'rb').read()
    datalink = struct.unpack_from('>I', d, 12)[0]
    recs = parse_btsnoop(path)

    handles = {}
    writes = []
    notifs = []
    t0 = None

    for t, pkt, flags in recs:
        att = hci_payload(pkt, datalink)
        if not att or len(att) < 1:
            continue
        op = att[0]
        if op == ATT_WRITE_REQ or op == ATT_WRITE_CMD:
            if len(att) < 3:
                continue
            handle = struct.unpack_from('<H', att, 1)[0]
            val = att[3:]
            writes.append((t, handle, val, op))
        elif op == ATT_HANDLE_NTF:
            if len(att) < 3:
                continue
            handle = struct.unpack_from('<H', att, 1)[0]
            val = att[3:]
            notifs.append((t, handle, val))
        elif op == ATT_READ_BY_TYPE_RESP:
            # mapeia handle -> uuid de característica (0x2803)
            if len(att) < 6:
                continue
            h = struct.unpack_from('<H', att, 1)[0]
            vlen = att[3]
            uuid = att[5:5 + 2]
            handles[h] = uuid.hex()

    def hx(b):
        return ' '.join(f'{x:02X}' for x in b)

    print(f'\n# {len(writes)} escritas ATT / {len(notifs)} notificações\n')
    if handles:
        print('# mapa handle->uuid (2 primeiros bytes):')
        for h, u in sorted(handles.items()):
            print(f'#   0x{h:04X} -> {u}')
        print()

    print('=== ESCRITAS (App -> dongle) ===')
    for t, h, v, op in writes:
        if t0 is None:
            t0 = t
        ms = (t - t0).total_seconds()
        tag = 'WR_REQ' if op == ATT_WRITE_REQ else 'WR_CMD'
        print(f'{ms:8.3f}s  {tag} h=0x{h:04X} len={len(v):3d}  {hx(v)}')

    print()
    print('=== NOTIFICAÇÕES (dongle -> App) — últimas 40 ===')
    for t, h, v in notifs[-40:]:
        ms = (t - t0).total_seconds() if t0 else 0
        print(f'{ms:8.3f}s  NTF h=0x{h:04X} len={len(v):3d}  {hx(v)}')


if __name__ == '__main__':
    main()
