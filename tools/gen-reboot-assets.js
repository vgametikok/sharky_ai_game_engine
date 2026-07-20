/* Процедурные ассеты «Перезагрузки» (reboot-bots) → games/reboot-bots.proc.js
   Сокобан в замершем дата-центре ИИ: фон серверного зала (стойки, LED-полосы,
   холодное сияние, пол-решётка), тайл-стена (серверная стойка) и цель (зарядная
   площадка со свечением).
   Ключи с префиксом rb_ НЕ пересекаются с PixelLab (bot/pod).
   Запуск: node tools/gen-reboot-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 9090909;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;

/* ── ФОН: серверный зал (190×440) ── */
(function () {
  const W = 190, H = 440, c = new Canvas(W, H);
  // тёмно-синий градиент
  for (let y = 0; y < H; y++) { const t = y / H; c.rect(0, y, W, 1, [lerp(14, 8, t) | 0, lerp(20, 12, t) | 0, lerp(34, 22, t) | 0, 255]); }
  // ряды дальних серверных стоек с LED-столбцами (перспектива к центру)
  function rack(x, top, w, h, hue) {
    c.rect(x, top, w, h, '#10161f'); c.rect(x, top, w, 1, '#1c2634'); c.rect(x, top, 1, h, '#1c2634');
    for (let yy = top + 3; yy < top + h - 2; yy += 4) for (let xx = x + 2; xx < x + w - 1; xx += 3) { if (rnd() < 0.6) c.px(xx, yy, hue[(xx + yy) % hue.length], 0.7 + rnd() * 0.3); }
  }
  const hues = [['#3ad0ff', '#2a90c0', '#7ce07c'], ['#ff7ac0', '#c05a90', '#ffd24a'], ['#7c9cff', '#5a6ac0', '#3ad0ff']];
  // левый и правый ряды стоек, сходящиеся к центру
  for (let i = 0; i < 6; i++) {
    const t = i / 6; const rw = 26 - t * 10, rh = 120 + t * 60;
    rack((2 + t * 40) | 0, (30 + t * 30) | 0, rw | 0, rh | 0, hues[i % 3]);
    rack((W - 2 - t * 40 - rw) | 0, (30 + t * 30) | 0, rw | 0, rh | 0, hues[(i + 1) % 3]);
  }
  // холодное центральное сияние (коридор)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = Math.exp(-((x - 95) * (x - 95)) / 2400) * 0.14 * (1 - y / H * 0.4); c.px(x, y, '#7fe0ff', a); }
  // пол-решётка снизу (перспектива)
  for (let k = 0; k < 10; k++) { const y = 300 + k * 14; const spread = (y - 300) * 0.9; c.line(95 - spread, y, 95 - spread * 1.2, H, '#1c2a3a', 1); c.line(95 + spread, y, 95 + spread * 1.2, H, '#1c2a3a', 1); c.rect(0, y, W, 1, '#1c2a3a', 0.4); }
  // виньетка
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(Math.abs(x / W - 0.5) * 2 - 0.6, 0) + Math.max(y / H - 0.8, 0); if (e > 0) c.px(x, y, [4, 6, 12, 255], Math.min(0.55, e)); }
  A.rb_bg = c.url();
})();

/* ── ТАЙЛ-СТЕНА: серверная стойка (32×32) ── */
(function () {
  const c = new Canvas(32, 32);
  c.rect(0, 0, 32, 32, '#232c3a'); c.rect(0, 0, 32, 2, '#38465c'); c.rect(0, 30, 32, 2, '#12181f');
  c.rect(0, 0, 2, 32, '#2e3a4e'); c.rect(30, 0, 2, 32, '#161d27');
  // блейд-серверы с LED
  for (let yy = 4; yy < 30; yy += 5) {
    c.rect(3, yy, 26, 3, '#161d27'); c.rect(3, yy, 26, 1, '#2c3648');
    c.px(5, yy + 1, '#3ad0ff'); c.px(7, yy + 1, rnd() < 0.5 ? '#7ce07c' : '#334');
    c.rect(22, yy + 1, 5, 1, '#2a3446');
  }
  A.rb_rack = c.url();
})();

/* ── ЦЕЛЬ: зарядная площадка со свечением (32×32) ── */
(function () {
  const c = new Canvas(32, 32);
  c.circle(16, 16, 13, '#0e2a30', 0.6);
  c.ring(16, 16, 13, 2, '#1de0c0', 0.9); c.ring(16, 16, 10, 1, '#1de0c0', 0.5);
  // символ «молния»
  c.line(18, 7, 12, 17, '#8ffff0', 2); c.line(12, 17, 17, 16, '#8ffff0', 2); c.line(17, 16, 13, 25, '#8ffff0', 2);
  for (let a = 0; a < 6; a++) { const an = a / 6 * Math.PI * 2; c.px(16 + Math.cos(an) * 13, 16 + Math.sin(an) * 13, '#8ffff0', 0.8); }
  A.rb_pad = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'reboot-bots.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('reboot-bots proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
