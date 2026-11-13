const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

const root = fs.realpathSync(process.env.THALEOLITHIC_TEST_ROOT || path.join(__dirname, '../thaleolithic'));
const host = process.env.THALEOLITHIC_QA_HOST || '127.0.0.1';
const port = Number(process.env.THALEOLITHIC_QA_PORT || 8793);
const types = {'.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webp': 'image/webp', '.unityweb': 'application/vnd.unity',
  '.bundle': 'application/octet-stream'};
const server = http.createServer((request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
    const target = new URL(request.url, 'http://localhost');
    const name = decodeURIComponent(target.pathname).replace(/^\/thaleolithic\//, '/');
    const file = fs.realpathSync(path.resolve(root, name === '/' ? 'index.html' : '.' + name));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw new Error('missing');
    response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': name.endsWith('game-config.json') ? 'no-store' : 'public, max-age=600',
      'Content-Length': fs.statSync(file).size});
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  } catch { response.writeHead(404).end(); }
});
server.listen(port, host, () => console.log('QA THALÉOLITHIC · http://' + host + ':' + port + '/thaleolithic/?diagnostic=1'));