/* Процедурные ассеты «На Марс» (mars-or-bust) → games/mars-or-bust.proc.js
   Climber: фон «от неба к космосу к Марсу» (голубое небо снизу → чёрный космос
   → красное сияние Марса вверху со звёздами и планетой), тайлы-облако/станция,
   монета Ð (DOGE), падающий бустер-опасность, флаг Марса (выход) и пружина-бустер.
   Ключи с префиксом mb_ не пересекаются с PixelLab (doge_, gremlin, sat).
   Запуск: node tools/gen-mars-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 44004400;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ── ФОН: подъём от неба к Марсу (190×470). Верх = космос+Марс, низ = небо ── */
(function () {
  const W = 190, H = 470, c = new Canvas(W, H);
  // fy=0 (верх, финиш) — красный космос Марса; fy=1 (низ, старт) — дневное небо
  const stops = [[0, [60, 16, 14]], [0.16, [26, 10, 22]], [0.40, [10, 10, 30]], [0.72, [70, 120, 190]], [1, [150, 200, 240]]];
  for (let y = 0; y < H; y++) {
    const fy = y / H; let c0 = stops[0], c1 = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) if (fy >= stops[i][0] && fy <= stops[i + 1][0]) { c0 = stops[i]; c1 = stops[i + 1]; break; }
    const t = Math.min(1, Math.max(0, (fy - c0[0]) / Math.max(1e-6, c1[0] - c0[0])));
    c.rect(0, y, W, 1, [lerp(c0[1][0], c1[1][0], t) | 0, lerp(c0[1][1], c1[1][1], t) | 0, lerp(c0[1][2], c1[1][2], t) | 0, 255]);
  }
  // звёзды в космической части (верхние ~55%)
  for (let i = 0; i < 220; i++) {
    const x = (rnd() * W) | 0, y = (rnd() * H * 0.6) | 0;
    const fade = 1 - (y / (H * 0.6));
    const a = (0.2 + rnd() * 0.7) * fade;
    const col = rnd() < 0.85 ? '#eaf2ff' : '#ffd9c0';
    c.px(x, y, col, a); if (rnd() < 0.12) { c.px(x + 1, y, col, a * 0.5); c.px(x, y + 1, col, a * 0.5); }
  }
  // планета Марс вверху справа
  const px = 132, py = 60, pr = 44;
  for (let k = 8; k >= 1; k--) c.ring(px, py, pr + k, 1, '#ff8a5a', 0.05 + (1 - k / 8) * 0.10);
  for (let y = -pr; y <= pr; y++) for (let x = -pr; x <= pr; x++) {
    if (x * x + y * y <= pr * pr) {
      const n = Math.sin((x + px) * 0.5 + (y + py) * 0.3) * 0.5 + Math.sin((x) * 0.2 - (y) * 0.4) * 0.5;
      const sh = 1 - Math.max(0, (x + y) / (pr * 2.4));      // терминатор
      const r = clamp((196 + n * 26) * sh), g = clamp((92 + n * 20) * sh), b = clamp((52 + n * 10) * sh);
      c.px(px + x, py + y, [r, g, b, 255]);
    }
  }
  // полярная шапка + кратеры
  c.ellipse(px - 6, py - pr + 8, 12, 5, '#f0e0d0', 0.7);
  c.circle(px + 14, py + 8, 5, '#8a3a22', 0.5); c.circle(px - 12, py + 16, 4, '#8a3a22', 0.4); c.circle(px + 4, py - 6, 3, '#a34a2a', 0.4);
  // маленькая луна Фобос
  c.circle(70, 40, 5, '#9a8a80'); c.circle(69, 39, 2, '#c0b2a8', 0.6);
  // облака у самого низа (стартовое небо)
  for (let i = 0; i < 5; i++) { const cx = rnd() * W, cy = H - 20 - rnd() * 60, rw = 20 + rnd() * 26; c.ellipse(cx, cy, rw, rw * 0.4, '#ffffff', 0.5); c.ellipse(cx - rw * 0.4, cy + 2, rw * 0.5, rw * 0.3, '#eef4ff', 0.45); }
  A.mb_bg = c.url();
})();

/* ── ТАЙЛ: облако-платформа (сквозная, one-way) 16×16 ── */
(function () {
  const c = new Canvas(16, 16);
  c.ellipse(8, 8, 8, 4, '#ffffff', 0.95); c.ellipse(4, 7, 4, 3, '#ffffff', 0.9); c.ellipse(12, 7, 4, 3, '#ffffff', 0.9);
  c.ellipse(8, 6, 5, 3, '#ffffff'); c.ellipse(8, 10, 7, 2, '#c9d6ea', 0.6);
  A.mb_cloud = c.url();
})();

/* ── ТАЙЛ: металлическая станция-платформа (solid) 16×16 ── */
(function () {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, '#5a6270'); c.rect(0, 0, 16, 3, '#8a94a4'); c.rect(0, 0, 16, 1, '#c0c8d4');
  c.rect(0, 13, 16, 3, '#343a46');
  for (let x = 2; x < 16; x += 5) c.rect(x, 3, 1, 10, '#3a414e');
  c.px(3, 5, '#7ce0ff'); c.px(9, 5, '#ffd24a'); c.px(13, 5, '#7ce07c');   // огоньки
  A.mb_panel = c.url();
})();

/* ── МОНЕТА DOGE: золотой кружок с Ð (18×18) ── */
(function () {
  const c = new Canvas(18, 18);
  c.circle(9, 9, 8, '#b8860b'); c.circle(9, 9, 7, '#f5c542'); c.circle(9, 9, 5, '#ffe07a');
  c.rect(7, 4, 2, 10, '#8a5a08'); c.rect(6, 4, 5, 2, '#8a5a08'); c.rect(6, 12, 5, 2, '#8a5a08'); c.rect(9, 6, 3, 6, '#8a5a08'); c.rect(4, 8, 8, 2, '#8a5a08');  // стилизованная Ð
  c.px(6, 6, '#fff6d0');
  A.mb_doge = c.url();
})();

/* ── ОПАСНОСТЬ: падающий бустер с пламенем (14×22, hazard) ── */
(function () {
  const c = new Canvas(14, 22);
  c.rect(4, 2, 6, 12, '#e8ecf2'); c.rect(4, 2, 2, 12, '#ffffff', 0.5); c.rect(8, 2, 2, 12, '#aab2c0', 0.6);
  c.tri(4, 2, 10, 2, 7, -2, '#d0d6e0');            // нос
  c.rect(2, 12, 2, 4, '#c04a3a'); c.rect(10, 12, 2, 4, '#c04a3a');   // стабилизаторы
  // пламя вниз
  for (let k = 0; k < 8; k++) { const w = 4 - k * 0.4; c.rect(7 - w, 14 + k, w * 2, 1, k < 3 ? '#fff2b0' : k < 6 ? '#ff9a3d' : '#e0533d', 0.9 - k * 0.08); }
  A.mb_booster = c.url();
})();

/* ── ВЫХОД: флаг Марса на шесте (18×22) ── */
(function () {
  const c = new Canvas(18, 22);
  c.rect(3, 0, 2, 22, '#c8ccd4');                  // шест
  c.rect(5, 1, 12, 8, '#e0533d'); c.rect(5, 1, 12, 1, '#ff8a6a');   // полотнище
  c.px(9, 4, '#fff'); c.px(11, 4, '#fff'); c.rect(8, 6, 6, 1, '#fff');   // мини-звезда/лого
  c.circle(4, 0, 2, '#ffd24a');                    // навершие
  c.ellipse(9, 21, 8, 2, '#8a3a22', 0.5);          // марсианский грунт
  A.mb_flag = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'mars-or-bust.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('mars-or-bust proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
