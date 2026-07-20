/* Процедурные ассеты «Плюш-Мании» (plush-mania) → games/plush-mania.proc.js
   Фон витрины магазина игрушек (тёплая стена, деревянные полки с блайндбоксами,
   гирлянда) + мягкая доска-подложка под поле match3.
   Ключи с префиксом pm_ НЕ пересекаются с PixelLab-ключами (pl_*).
   Запуск: node tools/gen-plush-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 424242;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;
const boxCols = ['#ff8fb0', '#8fd0ff', '#ffd873', '#a9e6a0', '#c9a3ff', '#ff9e6b'];

/* ── ФОН: витрина магазина игрушек (190×440) ── */
(function () {
  const W = 190, H = 440, c = new Canvas(W, H);
  // стена: тёплый персиковый градиент
  for (let y = 0; y < H; y++) { const t = y / H; const col = [lerp(60, 42, t) | 0, lerp(44, 30, t) | 0, lerp(66, 48, t) | 0, 255]; for (let x = 0; x < W; x++) c.px(x, y, col); }
  // мягкое верхнее свечение (витринный свет)
  for (let y = 0; y < 120; y++) for (let x = 0; x < W; x++) { const a = Math.exp(-y / 70) * Math.exp(-((x - 95) * (x - 95)) / 9000) * 0.4; c.px(x, y, '#ffe9c0', a); }
  // гирлянда огоньков вверху
  for (let x = 8; x < W; x += 16) { c.line(x, 8, x + 8, 14, '#5a4a55'); const col = ['#ff6b6b', '#ffd166', '#7ce0ff', '#9be870'][(((x - 8) / 16) | 0) % 4]; c.circle(x + 8, 15, 2, col); c.circle(x + 8, 15, 3, col, 0.3); }
  // полки с блайндбоксами
  const shelfY = [70, 150, 230, 310];
  for (let s = 0; s < shelfY.length; s++) {
    const sy = shelfY[s];
    c.rect(6, sy + 34, W - 12, 5, '#6a4a34'); c.rect(6, sy + 34, W - 12, 1, '#8a6248');    // полка
    c.rect(6, sy + 39, W - 12, 2, '#3a2820', 0.6);                                          // тень под полкой
    for (let i = 0; i < 5; i++) {                                                            // коробки
      const bx = 14 + i * 34 + (rnd() * 4 - 2), bw = 22, bh = 30;
      const col = boxCols[(s * 5 + i) % boxCols.length];
      c.rect(bx, sy + 4, bw, bh, col); c.rect(bx, sy + 4, bw, 3, '#ffffff', 0.35);
      c.rect(bx, sy + 4, 2, bh, '#ffffff', 0.2); c.rect(bx + bw - 2, sy + 4, 2, bh, '#000000', 0.15);
      c.rect(bx + 4, sy + 12, bw - 8, 10, '#ffffff', 0.75);                                 // окошко-этикетка
      c.rect(bx + 6, sy + 14, bw - 12, 6, col);                                             // силуэт игрушки
      c.px(bx + 9, sy + 16, '#222'); c.px(bx + bw - 10, sy + 16, '#222');                   // глазки
      c.rect(bx + 8, sy + 26, bw - 16, 2, '#00000033');
    }
  }
  // виньетка
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(Math.abs(x / W - 0.5) * 2 - 0.66, 0) + Math.max(y / H - 0.8, 0) * 0.8; if (e > 0) c.px(x, y, [20, 12, 24, 255], Math.min(0.5, e)); }
  A.pm_shop = c.url();
})();

/* ── ДОСКА-ПОДЛОЖКА под поле: мягкая пастель-плита с сеткой (224×256) ── */
(function () {
  const W = 224, H = 256, c = new Canvas(W, H);
  const R = 18;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const inX = x >= R || y >= R ? true : (x - R) * (x - R) + (y - R) * (y - R) <= R * R;   // скруглим только для мягкости
    const t = y / H;
    const col = [lerp(78, 58, t) | 0, lerp(64, 46, t) | 0, lerp(96, 74, t) | 0, 235];
    c.px(x, y, col);
  }
  // мягкая клетка 7×8
  for (let i = 0; i <= 7; i++) c.rect(Math.round(i * W / 7), 0, 1, H, '#ffffff', 0.06);
  for (let j = 0; j <= 8; j++) c.rect(0, Math.round(j * H / 8), W, 1, '#ffffff', 0.06);
  // рамка
  c.rect(0, 0, W, 3, '#ffd0e0', 0.5); c.rect(0, H - 3, W, 3, '#00000030');
  A.pm_board = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'plush-mania.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('plush-mania proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
