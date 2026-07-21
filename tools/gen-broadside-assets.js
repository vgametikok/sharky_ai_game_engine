/* Процедурные ассеты «Broadside» (broadside) → games/broadside.proc.js
   ПОЛНОСТЬЮ ВОДНАЯ ГЛАДЬ (top-down): открытое море — глубокий сине-бирюзовый
   градиент, волновые полосы-зыбь, каустика-блики, барашки пены, редкие тёмные
   омуты и пара крошечных островков-рифов по краям. Небо/луны нет — только вода,
   по которой идёт корабль. Плюс ядро-снаряд для пушек.
   Ключи bs_ не пересекаются с PixelLab (ship, e_, b_).
   Запуск: node tools/gen-broadside-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 20260721;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

/* ── ФОН: открытое море сверху вниз (190×440) ── */
(function () {
  const W = 190, H = 440, c = new Canvas(W, H);
  // базовая вода: бирюза сверху → глубокая синь снизу, с крупной зыбью
  for (let y = 0; y < H; y++) {
    const fy = y / H;
    for (let x = 0; x < W; x++) {
      const fx = x / W;
      // многочастотные волны (зыбь): длинные валы + рябь
      const swell = Math.sin(y * 0.05 + Math.sin(x * 0.017) * 1.3) * 0.5
                  + Math.sin(y * 0.13 - x * 0.03 + 1.7) * 0.3
                  + Math.sin(x * 0.09 + y * 0.02) * 0.2;
      let r = lerp(28, 10, fy), g = lerp(120, 46, fy), b = lerp(150, 96, fy);
      const k = 1 + swell * 0.14;
      r *= k; g *= k; b *= k;
      // каустика: яркие бирюзовые гребни там, где зыбь высокая
      if (swell > 0.75) { const t = (swell - 0.75) * 3; r += 40 * t; g += 70 * t; b += 60 * t; }
      c.px(x, y, [clamp(r), clamp(g), clamp(b), 255]);
    }
  }
  // тёмные омуты (глубина) — мягкие пятна
  for (let i = 0; i < 7; i++) {
    const cx = rnd() * W, cy = rnd() * H, rr = 24 + rnd() * 40;
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
      const d2 = (x * x + y * y) / (rr * rr); if (d2 > 1) continue;
      const a = Math.exp(-d2 * 2.2) * 0.22;
      c.px(cx + x, cy + y, [6, 26, 52, 255], a);
    }
  }
  // барашки пены / whitecaps — на гребнях зыби
  for (let i = 0; i < 520; i++) {
    const x = rnd() * W, y = rnd() * H;
    const swell = Math.sin(y * 0.05 + Math.sin(x * 0.017) * 1.3) * 0.5 + Math.sin(y * 0.13 - x * 0.03 + 1.7) * 0.3;
    if (swell < 0.4) continue;
    const a = 0.12 + rnd() * 0.5 * (swell - 0.4);
    c.px(x, y, '#eaf7ff', a);
    if (rnd() < 0.4) c.px(x + 1, y, '#dff2ff', a * 0.7);
    if (rnd() < 0.25) c.px(x, y + 1, '#cfeaff', a * 0.5);
  }
  // мелкая искристая рябь
  for (let i = 0; i < 700; i++) { const x = (rnd() * W) | 0, y = (rnd() * H) | 0; c.px(x, y, '#bfeef0', 0.05 + rnd() * 0.12); }
  // крошечные островки-рифы по краям (декор, не мешают геймплею в центре)
  function reef(cx, cy, rr) {
    for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) {
      const d2 = (x * x + y * y) / (rr * rr); if (d2 > 1) continue;
      const sand = d2 > 0.55;
      c.px(cx + x, cy + y, sand ? [210, 190, 130, 255] : [90, 140, 90, 255], d2 > 0.9 ? 0.5 : 1);
    }
    c.ring(cx, cy, rr + 2, 2, '#dff2ff', 0.4);   // пена вокруг рифа
  }
  reef(16, 60, 10); reef(176, 250, 12); reef(24, 400, 9);
  // лёгкая виньетка
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const e = Math.max(Math.abs(x / W - 0.5) * 2 - 0.72, 0) + Math.max(y / H - 0.84, 0) * 0.7;
    if (e > 0) c.px(x, y, [4, 16, 34, 255], Math.min(0.4, e));
  }
  A.bs_sea = c.url();
})();

/* ── СНАРЯД: чугунное ядро с искрой и дымком (12×16) ── */
(function () {
  const c = new Canvas(12, 16);
  for (let k = 0; k < 7; k++) c.px(6, 10 + k, '#8a8f99', 0.4 * (1 - k / 7));
  c.circle(6, 6, 5, '#2b2f38'); c.circle(6, 6, 5, '#3a3f4a');
  c.circle(5, 5, 2, '#7c828e'); c.px(4, 4, '#c6ccd6');
  c.px(6, 1, '#ffd36a'); c.px(6, 0, '#fff0c0', 0.7);
  A.bs_ball = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'broadside.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('broadside proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
