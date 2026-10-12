from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--root',required=True);p.add_argument('--port',type=int,default=8188);a=p.parse_args();root=Path(a.root).resolve()
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(root),**kwargs)
 def do_GET(self):
  if self.path=='/talas-health':
   body=json.dumps(dict(id='talas-campagne-v2',root=str(root),ready=(root/'index.html').exists())).encode();self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body);return
  super().do_GET()
 def guess_type(self,path):
  if path.endswith('.gz'):path=path[:-3]
  if path.endswith('.wasm'):return 'application/wasm'
  if path.endswith('.js'):return 'application/javascript'
  if path.endswith('.data'):return 'application/octet-stream'
  return super().guess_type(path)
 def end_headers(self):
  if self.path.split('?')[0].endswith('.gz'):self.send_header('Content-Encoding','gzip')
  self.send_header('Cross-Origin-Opener-Policy','same-origin');self.send_header('Cross-Origin-Embedder-Policy','require-corp');super().end_headers()
print('Talas local',a.port,str(root),flush=True);ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
