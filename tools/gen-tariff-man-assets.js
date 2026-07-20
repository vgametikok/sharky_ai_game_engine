/* Процедурные ассеты «Тариф-Мэна» (tariff-man) → games/tariff-man.proc.js
   Раннер по сцене-подиуму на закате мегаполиса: фон (небоскрёбы, золотой закат,
   прожекторы, толпа), тайлы сцены/ящика, «красная лента» (подкат) и портфель-иск
   (прыжок), монета-доллар, снаряд-твит + параллакс-слои.
   Ключи с префиксом tm_ не пересекаются с PixelLab (hero_, bureaucrat_, drone, boss_).
   Запуск: node tools/gen-tariff-man-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
let seed = 17761787;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const lerp = (a, b, t) => a + (b - a) * t;

/* ── ФОН: закат над мегаполисом, митинг на сцене (190×410) ── */
(function () {
  const W = 190, H = 410, c = new Canvas(W, H);
  const HOR = 300;
  const stops = [[0, [28, 20, 52]], [0.34, [92, 46, 84]], [0.58, [220, 108, 74]], [0.72, [255, 196, 96]]];
  for (let y = 0; y < HOR; y++) {
    const fy = y / H; let c0 = stops[0], c1 = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) if (fy >= stops[i][0] && fy <= stops[i + 1][0]) { c0 = stops[i]; c1 = stops[i + 1]; break; }
    const t = Math.min(1, Math.max(0, (fy - c0[0]) / Math.max(1e-6, c1[0] - c0[0])));
    c.rect(0, y, W, 1, [lerp(c0[1][0], c1[1][0], t) | 0, lerp(c0[1][1], c1[1][1], t) | 0, lerp(c0[1][2], c1[1][2], t) | 0, 255]);
  }
  // прожекторные лучи из-за сцены
  for (let k = 0; k < 5; k++) {
    const bx = 30 + k * 34, ang = (k - 2) * 0.16;
    for (let y = 0; y < HOR; y++) { const w = 2 + y * 0.05; const x = bx + Math.tan(ang) * y; for (let d = -w; d <= w; d++) c.px(x + d, y, '#fff4d0', Math.max(0, (1 - y / HOR)) * 0.05); }
  }
  // солнце низко
  c.circle(150, 250, 26, '#ffdf9a', 0.9); c.circle(150, 250, 20, '#ffeec2');
  // дальние небоскрёбы (силуэты, тёплая кромка)
  function tower(x, w, top, col) { c.rect(x, top, w, HOR - top, col); c.rect(x, top, w, 1, '#ffb060', 0.4); for (let wy = top + 4; wy < HOR; wy += 6) for (let wx = x + 2; wx < x + w - 1; wx += 4) if (rnd() < 0.5) c.px(wx, wy, '#ffd98a', 0.5); }
  const T = '#241832';
  tower(4, 20, 150, T); tower(26, 14, 196, T); tower(150, 24, 168, T); tower(176, 12, 200, T);
  const T2 = '#180f26';
  tower(44, 26, 120, T2); tower(72, 18, 172, T2); tower(96, 30, 138, T2); tower(128, 20, 182, T2);
  // площадь/земля перед сценой
  for (let y = HOR; y < H; y++) { const t = (y - HOR) / (H - HOR); c.rect(0, y, W, 1, [lerp(58, 24, t) | 0, lerp(40, 18, t) | 0, lerp(58, 30, t) | 0, 255]); }
  // толпа-силуэты на площади с «плакатами»
  for (let i = 0; i < 60; i++) { const x = rnd() * W, y = HOR + 6 + rnd() * 40, h = 8 + rnd() * 10; c.rect(x, y - h, 4, h, '#120c18', 0.85); c.circle(x + 2, y - h - 2, 2, '#120c18', 0.85); if (rnd() < 0.25) { c.rect(x + 1, y - h - 12, 1, 8, '#0e0814'); c.rect(x - 2, y - h - 16, 8, 5, ['#ffd24a', '#e0533d', '#7ce0ff'][(i) % 3], 0.8); } }
  // виньетка
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.max(Math.abs(x / W - 0.5) * 2 - 0.66, 0) + Math.max(y / H - 0.82, 0); if (e > 0) c.px(x, y, [10, 6, 14, 255], Math.min(0.55, e)); }
  A.tm_bg = c.url();
})();

/* ── ТАЙЛ: сцена-подиум (доски + красная дорожка + золотая кромка) 16×16 ── */
(function () {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, '#5a2028');                    // красный ковёр
  c.rect(0, 0, 16, 3, '#e0b23a');                     // золотая кромка сверху
  c.rect(0, 0, 16, 1, '#fff0b0');
  c.rect(0, 3, 16, 1, '#7a2c34');
  for (let x = 2; x < 16; x += 5) c.rect(x, 4, 1, 12, '#4a181e');   // швы дорожки
  c.rect(0, 14, 16, 2, '#3a1218');
  for (let i = 0; i < 10; i++) c.px((rnd() * 16) | 0, 4 + (rnd() * 11) | 0, '#ffffff', 0.05);
  A.tm_stage = c.url();
})();

/* ── ТАЙЛ: ящик «БЮЛЛЕТЕНИ» (препятствие-прыжок) 16×16 ── */
(function () {
  const c = new Canvas(16, 16);
  c.rect(0, 0, 16, 16, '#3a4a6a'); c.rect(0, 0, 2, 16, '#28344e'); c.rect(14, 0, 2, 16, '#28344e');
  c.rect(0, 0, 16, 2, '#4a5c82'); c.rect(0, 14, 16, 2, '#222c44');
  c.rect(3, 5, 10, 6, '#dfe6f2'); c.rect(4, 7, 8, 1, '#8a95ad'); c.rect(4, 9, 6, 1, '#8a95ad');   // «бланк»
  c.px(11, 3, '#ffd24a');
  A.tm_crate = c.url();
})();

/* ── ТАЙЛ: красная лента-заграждение (подкат, hazardHigh) 16×16 ── */
(function () {
  const c = new Canvas(16, 16);
  c.rect(0, 5, 16, 6, '#d0322e'); c.rect(0, 5, 16, 1, '#ff6b5e'); c.rect(0, 10, 16, 1, '#8a1c1a');
  for (let x = -6; x < 16; x += 6) for (let d = 0; d < 3; d++) c.line(x + d, 11, x + 6 + d, 5, '#ffffff', 1);  // диагональная штриховка
  c.rect(0, 5, 16, 6, '#000000', 0);
  A.tm_tape = c.url();
})();

/* ── МОНЕТА: золотой доллар (18×18) ── */
(function () {
  const c = new Canvas(18, 18);
  c.circle(9, 9, 8, '#b8860b'); c.circle(9, 9, 7, '#ffd24a'); c.circle(9, 9, 5, '#ffe58a');
  c.rect(8, 3, 2, 12, '#8a5a08'); c.rect(6, 5, 6, 2, '#8a5a08'); c.rect(6, 10, 6, 2, '#8a5a08');   // символ $
  c.px(6, 6, '#fff6d0');
  A.tm_coin = c.url();
})();

/* ── СНАРЯД «ТВИТ»: золотой мегафон-облачко (16×12) ── */
(function () {
  const c = new Canvas(16, 12);
  c.rect(3, 3, 9, 6, '#2b6fe0'); c.rect(3, 3, 9, 1, '#5a92f0'); c.tri(3, 3, 3, 9, 0, 11, '#2b6fe0');   // хвост облачка
  c.px(6, 6, '#fff'); c.px(8, 6, '#fff'); c.px(10, 6, '#fff');
  c.circle(13, 6, 2, '#ffd24a');   // золотая «птичка»/акцент
  A.tm_tweet = c.url();
})();

/* ── ПАРАЛЛАКС: дальняя гряда башен (240×90, прозрачный) ── */
(function () {
  const c = new Canvas(240, 90);
  let x = 0; while (x < 240) { const w = 10 + ((rnd() * 22) | 0), h = 26 + ((rnd() * 54) | 0); c.rect(x, 90 - h, w, h, '#2a1c3e'); c.rect(x, 90 - h, w, 1, '#5a3a6e', 0.5); for (let wy = 90 - h + 4; wy < 90; wy += 6) for (let wx = x + 2; wx < x + w - 1; wx += 4) if (rnd() < 0.4) c.px(wx, wy, '#ffcf7a', 0.4); x += w + 2; }
  A.tm_para = c.url();
})();

const out = path.join(__dirname, '..', 'games', 'tariff-man.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('tariff-man proc:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' KB)');
