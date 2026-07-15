/* Процедурные пиксель-спрайты для «Жёлтой расчёски» (comb-shmup) → games/comb-shmup.proc.js
   Иконки кошмара и жёлтая расчёска. Запуск: node tools/gen-comb-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};

// ── ЖЁЛТАЯ РАСЧЁСКА (игрок), смотрит вверх ──
(function () {
  const c = new Canvas(34, 42);
  const Y = '#ffd21f', YD = '#c98f00', YH = '#fff0a0';
  // спинка (низ)
  c.rect(4, 30, 26, 9, YD);
  c.rect(5, 30, 24, 7, Y);
  c.rect(6, 31, 22, 2, YH);
  // зубья вверх
  for (let i = 0; i < 6; i++) {
    const x = 5 + i * 4.2;
    c.rect(x, 6, 3, 25, YD);
    c.rect(x, 6, 2, 24, Y);
    c.px(x, 7, YH); c.px(x, 12, YH);
  }
  // глазки (мило, живая расчёска)
  c.circle(13, 34, 2, '#2a1e00'); c.circle(21, 34, 2, '#2a1e00');
  c.px(13, 33, '#fff'); c.px(21, 33, '#fff');
  A.comb = c.url();
})();

// ── мини-расчёска (пуля) ──
(function () {
  const c = new Canvas(12, 16);
  const Y = '#ffe24d', YD = '#d9a800';
  c.rect(1, 11, 10, 4, YD); c.rect(2, 11, 8, 3, Y);
  for (let i = 0; i < 3; i++) { const x = 2 + i * 3; c.rect(x, 2, 2, 9, Y); }
  A.comb_bullet = c.url();
})();

// ── грозовое облако ──
(function () {
  const c = new Canvas(46, 38);
  const G = '#8b90a3', GD = '#585d70', GH = '#b6bacb';
  c.ellipse(16, 16, 12, 8, GD); c.ellipse(30, 16, 12, 8, GD);
  c.ellipse(23, 12, 10, 8, GD);
  c.ellipse(16, 15, 11, 7, G); c.ellipse(30, 15, 11, 7, G); c.ellipse(23, 11, 9, 7, G);
  c.ellipse(18, 12, 6, 3, GH); c.ellipse(28, 12, 5, 3, GH);
  // молния вниз
  c.line(24, 22, 20, 30, '#ffe14d', 2); c.line(20, 30, 26, 30, '#ffe14d', 2); c.line(26, 30, 22, 37, '#ffe14d', 2);
  // сердитые глаза
  c.circle(18, 15, 2, '#20242e'); c.circle(29, 15, 2, '#20242e');
  A.cloud = c.url();
})();

// ── недремлющий глаз ──
(function () {
  const c = new Canvas(36, 34);
  c.ellipse(18, 17, 16, 11, '#eee6d8');       // белок
  c.ellipse(18, 17, 15, 10, '#f6efe3');
  c.circle(18, 17, 8, '#b8862f');              // радужка
  c.circle(18, 17, 7, '#d8a94a');
  c.circle(18, 17, 4, '#140b04');              // зрачок
  c.px(16, 15, '#fff'); c.px(15, 14, '#fff');
  // красные вены
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.line(18, 17, 18 + Math.cos(a) * 15, 17 + Math.sin(a) * 10, '#c0402a55'); }
  // тяжёлое веко сверху
  for (let x = 2; x <= 34; x++) { const y = 6 + Math.round(2 * Math.sin((x - 2) / 32 * Math.PI)); for (let yy = 0; yy < y; yy++) c.px(x, yy, '#2a1e2e'); }
  A.eye = c.url();
})();

// ── выпавший зуб ──
(function () {
  const c = new Canvas(28, 34);
  const W = '#f3eee1', S = '#cfc6b2';
  c.ellipse(14, 13, 11, 10, S); c.ellipse(14, 12, 10, 9, W);   // коронка
  c.rect(6, 16, 6, 12, W); c.rect(16, 16, 6, 12, W);            // корни
  c.tri(6, 27, 12, 27, 9, 33, W); c.tri(16, 27, 22, 27, 19, 33, W);
  c.rect(6, 16, 6, 3, '#c65a5a'); c.rect(16, 16, 6, 3, '#c65a5a'); // кровь у корня
  c.ellipse(11, 9, 3, 2, '#fff');
  A.tooth = c.url();
})();

// ── плавящиеся часы ──
(function () {
  const c = new Canvas(36, 38);
  c.circle(18, 15, 13, '#3a2c1e'); c.circle(18, 15, 12, '#e9dcc0');
  c.ring(18, 15, 12, 2, '#8a6d3a');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.px(18 + Math.cos(a) * 9, 15 + Math.sin(a) * 9, '#5a4527'); }
  c.line(18, 15, 18, 8, '#20140a', 1); c.line(18, 15, 24, 17, '#20140a', 1);  // стрелки
  c.circle(18, 15, 1, '#20140a');
  // капли «плавления»
  c.ellipse(12, 28, 3, 5, '#e9dcc0'); c.ellipse(24, 30, 4, 6, '#e9dcc0'); c.rect(20, 26, 8, 6, '#e9dcc0');
  A.clock = c.url();
})();

// ── череп ──
(function () {
  const c = new Canvas(30, 34);
  const W = '#efe9dc', S = '#c7bfa d'.replace(' ', '');
  c.ellipse(15, 13, 11, 11, '#b9b09a'); c.ellipse(15, 12, 10, 10, W);
  c.rect(9, 20, 12, 8, W); c.rect(9, 20, 12, 7, '#dcd4c1');
  c.circle(10, 13, 3, '#161018'); c.circle(20, 13, 3, '#161018'); // глазницы
  c.px(11, 12, '#c0402a'); c.px(21, 12, '#c0402a');
  c.tri(15, 16, 13, 20, 17, 20, '#161018');                        // нос
  for (let i = 0; i < 4; i++) c.rect(10 + i * 3, 24, 1, 4, '#8a8270'); // зубы
  A.skull = c.url();
})();

// ── блуждающий огонёк ──
(function () {
  const c = new Canvas(24, 34);
  for (let r = 11; r >= 2; r--) {
    const t = 1 - r / 11;
    const col = t < 0.4 ? '#5a3aa0' : t < 0.75 ? '#8f5ad8' : '#d8c0ff';
    c.ellipse(12, 20, r, r + 3, col, 0.5 + t * 0.5);
  }
  c.ellipse(12, 20, 3, 4, '#fff');
  // хвост-язычок
  c.tri(9, 10, 15, 10, 12, 2, '#c0a0ff');
  A.wisp = c.url();
})();

// ── тень-рука (тянется снизу) ──
(function () {
  const c = new Canvas(32, 40);
  const D = '#1a1224', DL = '#2e2140';
  c.rect(10, 26, 12, 14, D);                        // ладонь
  c.ellipse(16, 27, 8, 6, DL);
  const fx = [8, 13, 18, 23];                        // пальцы
  for (let i = 0; i < 4; i++) { c.rect(fx[i], 6, 3, 22, D); c.tri(fx[i], 6, fx[i] + 3, 6, fx[i] + 1, 1, '#0e0a16'); }
  c.rect(23, 20, 5, 10, D);                          // большой палец
  A.hand = c.url();
})();

// ── фон кошмара (портрет, тянется по ширине экрана) ──
(function () {
  const W = 190, H = 410, c = new Canvas(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const r = Math.round(24 - t * 18), g = Math.round(14 - t * 10), b = Math.round(38 - t * 26);
    for (let x = 0; x < W; x++) c.px(x, y, [Math.max(2, r), Math.max(2, g), Math.max(4, b), 255]);
  }
  // больная луна
  c.circle(52, 70, 22, '#3a3450'); c.circle(52, 70, 20, '#d9d2b0'); c.circle(58, 66, 18, '#c9c29e', 0.6);
  c.circle(46, 74, 4, '#b6ae8a'); c.circle(60, 78, 3, '#b6ae8a');
  // тусклые звёзды
  for (let i = 0; i < 60; i++) { const x = (i * 53) % W, y = (i * 97) % (H * 0.6) | 0; c.px(x, y, '#cfc7e0', 0.5); }
  // зубчатый горизонт кошмара
  let gy = H - 70;
  for (let x = 0; x <= W; x += 6) { const h = 30 + ((x * 13) % 40); c.tri(x - 6, H, x, H - h, x + 6, H, '#0a0712'); }
  // красноватое свечение снизу
  for (let y = H - 60; y < H; y++) for (let x = 0; x < W; x++) c.px(x, y, '#3a0a1a', 0.02 * (y - (H - 60)));
  A.nightmare_bg = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'comb-shmup.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
const kb = Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024);
console.log('comb procedural assets:', Object.keys(A).join(', '), '(' + kb + ' КБ)');
