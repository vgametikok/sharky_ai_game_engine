/* Неон-спрайты для «Неонного роя» → games/neon-swarm.proc.js
   Светящиеся геометрические корабли (под стиль игры). node tools/gen-neon-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
// свечение: тот же силуэт бледнее и крупнее под ярким
function glow(c, cx, cy, r, col) { c.circle(cx, cy, r, col, 0.16); c.circle(cx, cy, r * 0.7, col, 0.2); }

// ── корабль игрока (нос вверх) ──
(function () {
  const c = new Canvas(30, 34), C = '#38e0ff', D = '#1f7fa0', W = '#eaffff';
  glow(c, 15, 18, 13, C);
  c.tri(15, 2, 4, 26, 26, 26, D);           // корпус
  c.tri(15, 5, 7, 24, 23, 24, C);
  c.tri(15, 9, 11, 22, 19, 22, W);          // ядро-блик
  c.rect(2, 20, 5, 8, C); c.rect(23, 20, 5, 8, C);  // крылья
  c.rect(12, 27, 6, 5, '#fff');             // сопло
  c.rect(13, 30, 4, 3, '#ffd24a');          // выхлоп
  A.ship = c.url();
})();

function enemy(name, col, dark, drawShape) {
  const c = new Canvas(34, 30);
  glow(c, 17, 15, 13, col);
  drawShape(c, col, dark, '#ffffff');
  A[name] = c.url();
}
// drone — ромб
enemy('e_drone', '#5cf0c0', '#2a9a78', (c, col, d, w) => {
  c.tri(17, 2, 4, 15, 30, 15, d); c.tri(17, 28, 4, 15, 30, 15, d);
  c.tri(17, 5, 8, 15, 26, 15, col); c.tri(17, 25, 8, 15, 26, 15, col);
  c.circle(17, 15, 3, w);
});
// dart — стрела вниз
enemy('e_dart', '#ff8a3d', '#a8531a', (c, col, d, w) => {
  c.tri(17, 28, 6, 8, 28, 8, d); c.tri(17, 25, 8, 8, 26, 8, col);
  c.rect(14, 4, 6, 16, col); c.rect(15, 4, 4, 14, w);
});
// ward — шестиугольный страж
enemy('e_ward', '#b48cff', '#6a4aa8', (c, col, d, w) => {
  c.circle(17, 15, 11, d); c.circle(17, 15, 9, col); c.ring(17, 15, 9, 2, d);
  c.circle(17, 15, 4, w); c.circle(17, 15, 2, col);
});
// lancer — двойной шеврон
enemy('e_lancer', '#ff4d9d', '#a82a60', (c, col, d, w) => {
  c.tri(17, 26, 5, 14, 29, 14, d); c.tri(17, 20, 5, 10, 29, 10, col); c.tri(17, 14, 8, 6, 26, 6, col);
  c.circle(17, 10, 2, w);
});
// cruiser — тяжёлый корпус
enemy('e_cruiser', '#38e0ff', '#1f7fa0', (c, col, d, w) => {
  c.rect(4, 8, 26, 14, d); c.rect(6, 10, 22, 10, col);
  c.rect(2, 12, 4, 6, col); c.rect(28, 12, 4, 6, col);
  c.rect(12, 20, 10, 5, d); c.circle(11, 15, 2, w); c.circle(23, 15, 2, w); c.rect(15, 12, 4, 4, w);
});

const out = path.join(__dirname, '..', 'games', 'neon-swarm.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('neon sprites:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' КБ)');
