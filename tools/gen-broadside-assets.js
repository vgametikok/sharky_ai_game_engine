/* Процедурные ассеты «Бортового Залпа» (broadside) → games/broadside.proc.js
   Морской вертикальный фон (ночное пиратское небо, луна, острова у горизонта,
   океан с волнами и барашками пены) + ядро-снаряд для пушки игрока.
   Ключи с префиксом bs_ не пересекаются с PixelLab-ключами (ship, e_, b_).
   Запуск: node tools/gen-broadside-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 20260720;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ── ФОН: ночное море под пиратской луной (190×440) ── */
(function () {
  const W = 190, H = 440, c = new Canvas(W, H);
  const HOR = 178;                        // линия горизонта
  // небо: индиго-ночь сверху → тёплый оранж у горизонта
  const stops = [[0, [14, 20, 46]], [0.22, [26, 36, 78]], [0.33, [92, 66, 96]], [0.40, [214, 120, 70]]];
  for (let y = 0; y < HOR; y++) {
    const fy = y / H; let c0 = stops[0], c1 = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) if (fy >= stops[i][0] && fy <= stops[i + 1][0]) { c0 = stops[i]; c1 = stops[i + 1]; break; }
    const t = Math.min(1, Math.max(0, (fy - c0[0]) / Math.max(1e-6, c1[0] - c0[0])));
    const col = [lerp(c0[1][0], c1[1][0], t) | 0, lerp(c0[1][1], c1[1][1], t) | 0, lerp(c0[1][2], c1[1][2], t) | 0, 255];
    for (let x = 0; x < W; x++) c.px(x, y, col);
  }
  // звёзды в тёмной части
  for (let i = 0; i < 90; i++) {
    const x = (rnd() * W) | 0, y = (rnd() * 110) | 0, a = 0.2 + rnd() * 0.6;
    c.px(x, y, '#eaf0ff', a); if (rnd() < 0.2) c.px(x + 1, y, '#eaf0ff', a * 0.5);
  }
  // луна с ореолом
  const mx = 138, my = 64;
  for (let r = 26; r >= 1; r--) c.circle(mx, my, r, '#ffe6b0', 0.03 + (1 - r / 26) * 0.05);
  c.circle(mx, my, 16, '#fff4d2'); c.circle(mx, my, 15, '#ffedc0');
  c.circle(mx - 5, my - 4, 4, '#f2ddad', 0.6); c.circle(mx + 4, my + 3, 3, '#f2ddad', 0.5);
  // облачные полосы на луне
  c.ellipse(mx, my + 2, 17, 3, '#c98a5a', 0.3); c.ellipse(mx - 3, my - 5, 10, 2, '#c98a5a', 0.25);
  // острова-силуэты у горизонта
  function isle(x0, x1, top) { for (let y = top; y < HOR; y++) { const s = (y - top) * 0.55; c.rect(Math.round(x0 - s), y, Math.round((x1 - x0) + 2 * s), 1, '#1a1230'); } }
  isle(6, 40, 158); isle(70, 96, 164); isle(150, 184, 160);
  // дальний корабль-силуэт с фонарём
  c.rect(112, 168, 12, 6, '#0e0a1e'); c.rect(114, 160, 2, 8, '#0e0a1e'); c.rect(120, 158, 2, 10, '#0e0a1e');
  c.px(117, 166, '#ffcf6a', 0.9);
  // ── ОКЕАН: градиент + горизонтальные волновые полосы ──
  for (let y = HOR; y < H; y++) {
    const t = (y - HOR) / (H - HOR);
    const r = lerp(30, 8, t), g = lerp(58, 22, t), b = lerp(96, 46, t);
    for (let x = 0; x < W; x++) {
      const w = Math.sin(x * 0.09 + y * 0.5) * 0.5 + Math.sin(x * 0.021 - y * 0.2 + 1.3) * 0.5;
      const k = 1 + w * 0.10;
      c.px(x, y, [clamp(r * k), clamp(g * k), clamp(b * k), 255]);
    }
  }
  // лунная дорожка на воде
  for (let y = HOR; y < H; y++) {
    const t = (y - HOR) / (H - HOR);
    const half = 6 + t * 22;
    for (let x = mx - half; x < mx + half; x++) {
      const a = Math.exp(-((x - mx) * (x - mx)) / (half * half)) * (0.10 + 0.14 * (rnd() < 0.5 ? 1 : 0.4));
      c.px(x, y, '#ffe6b0', a * (0.7 + 0.3 * Math.sin(y * 0.6)));
    }
  }
  // барашки пены (детерминированно)
  for (let i = 0; i < 260; i++) {
    const y = HOR + Math.pow(rnd(), 0.8) * (H - HOR);
    const x = rnd() * W;
    const a = 0.12 + rnd() * 0.4;
    c.px(x, y, '#dff0ff', a); if (rnd() < 0.5) c.px(x + 1, y, '#dff0ff', a * 0.7);
  }
  // виньетка
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.max(Math.abs(x / W - 0.5) * 2 - 0.62, 0) + Math.max(y / H - 0.78, 0) * 0.8;
    if (e > 0) c.px(x, y, [6, 6, 16, 255], Math.min(0.5, e));
  }
  A.bs_sea = c.url();
})();

/* ── СНАРЯД: чугунное ядро с искрой и дымком (12×16) ── */
(function () {
  const c = new Canvas(12, 16);
  for (let k = 0; k < 7; k++) c.px(6, 10 + k, '#8a8f99', 0.4 * (1 - k / 7));   // дымный хвост
  c.circle(6, 6, 5, '#2b2f38'); c.circle(6, 6, 5, '#3a3f4a');
  c.circle(5, 5, 2, '#7c828e'); c.px(4, 4, '#c6ccd6');                          // блик
  c.px(6, 1, '#ffd36a'); c.px(6, 0, '#fff0c0', 0.7);                            // искра фитиля
  A.bs_ball = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'broadside.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('broadside proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
