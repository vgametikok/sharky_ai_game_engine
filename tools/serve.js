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
