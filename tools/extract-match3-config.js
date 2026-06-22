/* Одноразовый бутстрап: вытаскивает base64-ассеты и список тайлов из
   оригинального ready games/match3-medieval.html и собирает из них
   games/match3-medieval.config.js (тема/правила заданы вручную ниже,
   чтобы 1:1 повторить поведение оригинала).
   Запуск: node tools/extract-match3-config.js */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcHtml = path.join(root, '..', 'ready games', 'match3-medieval.html');
const html = fs.readFileSync(srcHtml, 'utf8');

// B64={...}; — base64-строки не содержат скобок, поэтому первый "};" и есть конец.
const b64m = html.match(/const\s+B64\s*=\s*(\{[\s\S]*?\});/);
if (!b64m) { console.error('не нашёл B64'); process.exit(1); }
const assets = eval('(' + b64m[1] + ')');

const namesM = html.match(/const\s+NAMES\s*=\s*(\[[^\]]*\]);/);
if (!namesM) { console.error('не нашёл NAMES'); process.exit(1); }
const tileNames = eval('(' + namesM[1] + ')');

const game = {
  genre: 'match3',
  meta: { title: 'Sharky Match-3 — Medieval' },
  theme: {
    accent: '#e7b44c',
    bgTop: '#2a2014',
    bgBottom: '#15100a',
    hudText: '#f4e3b0',
    font: "Georgia, 'Times New Roman', serif",
    hudIcon: 'goldenCoin',
    labels: { over: 'ВРЕМЯ ВЫШЛО', scoreUnit: 'очков', again: 'Нажми, чтобы сыграть ещё' },
  },
  rules: { mode: 'timed', duration: 60, cols: 7, rows: 8, minRun: 3, clearDur: 0.18, scorePerTile: 10 },
  tileNames: tileNames,
  assets: assets,
};

const outPath = path.join(root, 'games', 'match3-medieval.config.js');
const body = '/* АВТОСГЕНЕРИРОВАНО tools/extract-match3-config.js — конфиг игры (тема/правила/ассеты). */\n' +
             'module.exports = ' + JSON.stringify(game, null, 2) + ';\n';
fs.writeFileSync(outPath, body);
console.log('записан', path.relative(root, outPath), 'тайлов:', tileNames.length, 'ассетов:', Object.keys(assets).length);
