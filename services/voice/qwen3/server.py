import json, queue, secrets, subprocess, sys, threading, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
ROOT = Path(__file__).resolve().parent
JOBS = ROOT/'jobs'
JOBS.mkdir(exist_ok=True)
TOKENFILE = ROOT/'access-token.txt'
if not TOKENFILE.exists():
    TOKENFILE.write_text(secrets.token_urlsafe(32), encoding='ascii')
TOKEN = TOKENFILE.read_text().strip()
TASKS = queue.Queue(maxsize=8)
for f in JOBS.glob('*.json'):
    j = json.loads(f.read_text(encoding='utf-8'))
    if j.get('status') in ('queued','running'):
        j.update(status='error', error='Service restarted; previous job was interrupted. Inspect before resubmitting.')
        f.write_text(json.dumps(j, ensure_ascii=False), encoding='utf-8')

def run():
    while True:
        f = TASKS.get()
        j = json.loads(f.read_text(encoding='utf-8'))
        j['status'] = 'running'
        f.write_text(json.dumps(j, ensure_ascii=False), encoding='utf-8')
        with (JOBS/(j['id']+'.log')).open('w', encoding='utf-8') as log:
            result = subprocess.run([sys.executable, str(ROOT/'worker.py'), '--job', str(f)], stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW)
        j = json.loads(f.read_text(encoding='utf-8'))
        if j['status'] == 'running':
            j.update(status='error',error='Worker exited unexpectedly. Inspect local job log.')
            f.write_text(json.dumps(j, ensure_ascii=False), encoding='utf-8')
        TASKS.task_done()

class Handler(BaseHTTPRequestHandler):
    def reply(self, code, value):
        body = json.dumps(value,ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def authorized(self):
        return secrets.compare_digest(self.headers.get('Authorization',''), 'Bearer '+TOKEN)
    def do_GET(self):
        if self.path == '/health':
            return self.reply(200, {'service':'dafeiyu-qwen3-tts','ready':(ROOT/'voices.json').exists() and (ROOT/'models-ready.json').exists()})
        if not self.authorized(): return self.reply(401,{'error':'Unauthorized'})
        if self.path == '/voices':
            if not (ROOT/'voices.json').exists(): return self.reply(503,{'error':'Voice setup is not complete'})
            return self.reply(200,json.loads((ROOT/'voices.json').read_text(encoding='utf-8')))
        try:
            key = str(uuid.UUID(self.path.removeprefix('/jobs/')))
            return self.reply(200,json.loads((JOBS/(key+'.json')).read_text(encoding='utf-8')))
        except Exception: return self.reply(404,{'error':'Unknown job'})
    def do_POST(self):
        if not self.authorized(): return self.reply(401,{'error':'Unauthorized'})
        if self.path != '/generate': return self.reply(404,{'error':'Unknown endpoint'})
        if not (ROOT/'voices.json').exists(): return self.reply(503,{'error':'Voice setup is not complete'})
        if not (ROOT/'models-ready.json').exists(): return self.reply(503,{'error':'Model download and validation are not complete'})
        try:
            size = int(self.headers.get('Content-Length','0'))
            if not 0 < size <= 8000: raise ValueError('Invalid body size')
            data = json.loads(self.rfile.read(size))
            if data.get('voice') not in ('cool','gentle','husky'): raise ValueError('Unknown voice')
            if not isinstance(data.get('text'),str) or not 1 <= len(data['text'].strip()) <= 300: raise ValueError('Text must contain 1-300 characters')
            if TASKS.full(): return self.reply(429,{'error':'Queue is full'})
            j = {'id':str(uuid.uuid4()),'voice':data['voice'],'text':data['text'].strip(),'status':'queued'}
            f = JOBS/(j['id']+'.json')
            f.write_text(json.dumps(j,ensure_ascii=False),encoding='utf-8')
            TASKS.put_nowait(f)
            self.reply(202,j)
        except Exception as e: self.reply(400,{'error':str(e)})

threading.Thread(target=run,daemon=True).start()
print('Qwen3-TTS listening on 127.0.0.1:18034',flush=True)
ThreadingHTTPServer(('127.0.0.1',18034),Handler).serve_forever()
