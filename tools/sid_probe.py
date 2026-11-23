#!/usr/bin/env python3
"""Send a live ClientHello with a 200-byte session id (output-only length wrap) and scan responses."""
import json, os, re, socket, ssl, sys
HOST='15kb.org'; PORT=443
W=json.load(open('windows.json'))
def norm(b): return re.sub(r'[^0-9A-Fa-f]','',b.hex()).upper()
def one():
    ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
    inc,out=ssl.MemoryBIO(),ssl.MemoryBIO()
    t=ctx.wrap_bio(inc,out,server_hostname=HOST)
    try: t.do_handshake()
    except ssl.SSLWantReadError: pass
    rec=out.read()
    msg=bytearray(rec[5:])
    sidlen=msg[38]; sid=msg[39:39+sidlen]
    new=os.urandom(200)
    body=msg[:39]+new+msg[39+sidlen:]
    body[1:4]=(len(body)-4).to_bytes(3,'big')
    raw=rec[:3]+len(body).to_bytes(2,'big')+body
    try:
        s=socket.create_connection((HOST,PORT),timeout=8)
        s.sendall(raw); s.settimeout(3); got=b''
        try:
            while len(got)<200000:
                b=s.recv(65536)
                if not b: break
                got+=b
        except socket.timeout: pass
        s.close()
    except Exception as e:
        return {'error':type(e).__name__+': '+str(e),'sent':len(raw),'got':0}
    nt=norm(got)
    hits=[k for k,v in W.items() if v in nt]
    return {'sent':len(raw),'got':len(got),'hits':hits,'head':got[:32].hex(),'hex':got.hex()}
out=[]
for i in range(100):
    r=one(); r['i']=i; out.append(r)
print(json.dumps(out))
