/* Генерирует атмосферный фон пещеры для «Забытой гробницы» и пишет его как
   data-URL в games/crypt-metroid.bg.js (модуль экспортирует строку).
   Запуск: node tools/gen-crypt-bg.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { toDataURL } = require('./pnggen');

const W = 190, H = 410;
const buf = new Uint8Array(W * H * 4);

// палитра (в тон theme): верх тёмно-фиолетовый → низ почти чёрный
const top = [46, 36, 62], bot = [10, 7, 16];
const clamp = (v) => v < 0 ? 0 : v > 255 ? 255 : v | 0;
const lerp = (a, b, t) => a + (b - a) * t;

// «факелы» — тёплые радиальные свечения (аура пещеры)
const torches = [
  { x: 0.16, y: 0.30, r: 0.22, i: 0.55 },
  { x: 0.82, y: 0.52, r: 0.24, i: 0.5 },
  { x: 0.38, y: 0.78, r: 0.20, i: 0.42 },
  { x: 0.70, y: 0.14, r: 0.16, i: 0.34 },
];
// далёкие столбы породы (чуть темнее фона)
const pillars = [0.10, 0.30, 0.52, 0.74, 0.92];

for (let y = 0; y < H; y++) {
  const fy = y / H;
  for (let x = 0; x < W; x++) {
    const fx = x / W;
    // базовый вертикальный градиент
    let r = lerp(top[0], bot[0], fy), g = lerp(top[1], bot[1], fy), b = lerp(top[2], bot[2], fy);
    // мягкая текстура породы (низкочастотные волны)
    const tex = Math.sin(fx * 7 + fy * 3) * 0.5 + Math.sin(fx * 13 - fy * 5) * 0.3;
    r += tex * 5; g += tex * 4; b += tex * 6;
    // далёкие столбы — затемнение
    let dk = 0;
    for (const px of pillars) { const d = Math.abs(fx - px); dk += Math.exp(-(d * d) / 0.004) * 8; }
    r -= dk; g -= dk; b -= dk * 0.7;
    // факелы — тёплое свечение
    for (const t of torches) {
      const dx = (fx - t.x), dy = (fy - t.y);
      const d2 = (dx * dx + dy * dy) / (t.r * t.r);
      const glow = Math.exp(-d2) * t.i;
      r += glow * 150; g += glow * 90; b += glow * 35;
    }
    // виньетка по краям и особенно снизу
    const edge = Math.max(Math.abs(fx - 0.5) * 1.6, 0) + Math.max(fy - 0.4, 0) * 0.5;
    const vig = 1 - Math.min(0.5, edge * 0.35);
    r *= vig; g *= vig; b *= vig;

    const i = (y * W + x) * 4;
    buf[i] = clamp(r); buf[i + 1] = clamp(g); buf[i + 2] = clamp(b); buf[i + 3] = 255;
  }
}

const dataUrl = toDataURL(W, H, buf);
const out = path.join(__dirname, '..', 'games', 'crypt-metroid.bg.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(dataUrl) + ";\n");
console.log('фон пещеры:', path.relative(path.join(__dirname, '..'), out), '(' + Math.round(dataUrl.length / 1024) + ' КБ base64)');
