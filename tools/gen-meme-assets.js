/* Процедурные мем-тайлы для «Мем-матч» → games/meme-match.proc.js
   6 выразительных лиц разного цвета (различимы в match-3). node tools/gen-meme-assets.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { Canvas } = require('./draw');

const A = {};
const S = 60;
function face(base, dark, draw) {
  const c = new Canvas(S, S);
  const cx = S / 2, cy = S / 2, r = 26;
  c.circle(cx, cy + 1, r, dark);          // тень-обводка
  c.circle(cx, cy, r - 1, base);
  c.ellipse(cx - 8, cy - 10, 8, 5, '#ffffff44');  // блик
  draw(c, cx, cy);
  return c.url();
}
const BLK = '#20140a';

// 1) ухмылка (жёлтый)
A.m_grin = face('#ffd21f', '#c98f00', (c, x, y) => {
  c.circle(x - 9, y - 5, 4, BLK); c.circle(x + 9, y - 5, 4, BLK);
  c.px(x - 8, y - 6, '#fff'); c.px(x + 10, y - 6, '#fff');
  for (let i = -12; i <= 12; i++) { const yy = y + 9 + Math.round(6 * Math.cos(i / 12 * 1.4)); c.rect(x + i, y + 7, 1, yy - (y + 7), BLK); }
  c.rect(x - 12, y + 6, 25, 2, BLK);
});
// 2) ржач со слезами (оранжевый)
A.m_lol = face('#ff9a2e', '#c86a00', (c, x, y) => {
  c.line(x - 13, y - 8, x - 5, y - 4, BLK, 2); c.line(x + 13, y - 8, x + 5, y - 4, BLK, 2);  // зажмур ^ ^
  c.ellipse(x, y + 8, 9, 7, BLK); c.ellipse(x, y + 6, 7, 3, '#ff5a6a');                       // хохот-рот
  c.ellipse(x - 16, y + 2, 3, 5, '#6fd0ff'); c.ellipse(x + 16, y + 2, 3, 5, '#6fd0ff');       // слёзы
});
// 3) крутой в очках (голубой)
A.m_cool = face('#38c8e0', '#1f8fa8', (c, x, y) => {
  c.rect(x - 15, y - 8, 12, 8, '#101418'); c.rect(x + 3, y - 8, 12, 8, '#101418');           // очки
  c.rect(x - 3, y - 5, 6, 2, '#101418'); c.rect(x - 15, y - 9, 30, 2, '#101418');
  c.px(x - 12, y - 6, '#7fe0ff'); c.px(x + 6, y - 6, '#7fe0ff');
  for (let i = -8; i <= 10; i++) { const yy = y + 10 + (i > 4 ? -2 : 0); c.px(x + i, yy, BLK); c.px(x + i, yy + 1, BLK); }  // смайл-смещённый
});
// 4) шок (розовый)
A.m_shock = face('#ff6fae', '#d13f80', (c, x, y) => {
  c.ring(x - 9, y - 4, 6, 2, BLK); c.ring(x + 9, y - 4, 6, 2, BLK);
  c.circle(x - 9, y - 4, 2, BLK); c.circle(x + 9, y - 4, 2, BLK);
  c.ellipse(x, y + 10, 5, 7, BLK);                                                            // O-рот
});
// 5) злой (красный)
A.m_angry = face('#f0473a', '#b52a20', (c, x, y) => {
  c.line(x - 14, y - 10, x - 4, y - 6, BLK, 2); c.line(x + 14, y - 10, x + 4, y - 6, BLK, 2); // брови \ /
  c.circle(x - 8, y - 3, 3, BLK); c.circle(x + 8, y - 3, 3, BLK);
  for (let i = -9; i <= 9; i++) { const yy = y + 12 - Math.round(5 * Math.cos(i / 9 * 1.4)); c.rect(x + i, yy, 1, y + 12 - yy, BLK); } // хмурый рот
});
// 6) сонный (зелёный) с Z
A.m_sleep = face('#5ac878', '#328f4c', (c, x, y) => {
  c.rect(x - 13, y - 4, 8, 2, BLK); c.rect(x + 5, y - 4, 8, 2, BLK);                          // прикрытые глаза
  c.ellipse(x, y + 9, 3, 3, BLK);                                                             // маленький рот
  c.rect(x + 10, y - 16, 6, 2, '#eafff0'); c.rect(x + 10, y - 10, 6, 2, '#eafff0'); c.line(x + 15, y - 15, x + 11, y - 10, '#eafff0', 1); // Z
});

const out = path.join(__dirname, '..', 'games', 'meme-match.proc.js');
fs.writeFileSync(out, "'use strict';\nmodule.exports = " + JSON.stringify(A) + ";\n");
console.log('meme tiles:', Object.keys(A).join(', '), '(' + Math.round(Buffer.byteLength(JSON.stringify(A)) / 1024) + ' КБ)');
