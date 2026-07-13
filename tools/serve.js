/* Минимальный статический сервер для предпросмотра собранных игр.
   Корень — dist/, индекс — match3-medieval.html. Запуск: node tools/serve.js [port] */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.argv[2] || process.env.PORT || 5050);
const dist = path.join(__dirname, '..', 'dist');
const INDEX = 'match3-medieval.html';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json' };

http.createServer((req, res) => {
  // POST /shot?name=x — принять dataURL канваса и сохранить dist/shots/x.png
  // (обход: в скрытой вкладке предпросмотра скриншот-инструмент не работает,
  //  а canvas.toDataURL + этот эндпоинт дают картинку для проверки рендера)
  if (req.method === 'POST' && req.url.startsWith('/shot')) {
    const name = (new URL(req.url, 'http://x')).searchParams.get('name') || 'shot';
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const b64 = body.replace(/^data:image\/\w+;base64,/, '');
        const dir = path.join(dist, 'shots');
        fs.mkdirSync(dir, { recursive: true });
        const f = path.join(dir, name.replace(/[^\w-]/g, '') + '.png');
        fs.writeFileSync(f, Buffer.from(b64, 'base64'));
        res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('saved ' + f);
      } catch (e) { res.writeHead(500); res.end('err ' + e.message); }
    });
    return;
  }
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/' || p === '') p = '/' + INDEX;
  const file = path.join(dist, p);
  if (!file.startsWith(dist)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(port, () => console.log('preview on http://localhost:' + port + '/'));
