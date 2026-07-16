/* Бенч ИИ сянци: время хода по уровням + полные партии (случайный игрок
   против ИИ) — партии должны корректно завершаться. node tools/bench-xiangqi.js */
'use strict';
const path = require('path');
const fs = require('fs');
let factory = null;
global.Engine = { register: (n, f) => { factory = f; } };
global.performance = require('perf_hooks').performance;
let over = null;
const api = {
  img: () => null, beep: () => {}, burst: () => {},
  addScore: () => {}, setScore: () => {}, resetTimer: () => {}, addTime: () => {},
  gameOver: (o) => { over = (o && o.label) || 'over'; },
  saveState: () => {}, loadState: () => null,
  rr: () => {}, accent: () => '#fff', reportPlayerScreen: () => {},
};
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'scenes', 'xiangqi.js'), 'utf8'));

// время хода из начальной позиции
for (let lvl = 1; lvl <= 5; lvl++) {
  const s = factory(api, { theme: {}, rules: {} });
  s.reset(); s._menuAction('new');
  const times = [];
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    s._ai(s._bd(), lvl);
    times.push(Math.round(performance.now() - t0));
  }
  console.log('L' + lvl + ' ход из старта: ' + times.join('/') + ' ms');
}

// полные партии: красные ходят случайно, чёрные — ИИ уровня L
for (const lvl of [1, 3, 5]) {
  over = null;
  const s = factory(api, { theme: {}, rules: {} });
  s.reset();
  for (let i = 1; i < lvl; i++) s._menuAction('d+');   // сложность = lvl
  s._menuAction('new');
  let plies = 0;
  const t0 = performance.now();
  while (!over && plies < 400) {
    const st = s._state();
    if (!st.gameOn) break;
    if (st.turn === 'r') {
      const legal = s._legal(s._bd(), false);
      if (!legal.length) break;
      const m = legal[(Math.random() * legal.length) | 0];
      s._apply(((m / 90) | 0) % 9, (((m / 90) | 0) / 9) | 0, (m % 90) % 9, ((m % 90) / 9) | 0);
    } else {
      s._aiNow();
    }
    plies++;
  }
  console.log('Партия vs L' + lvl + ': ' + (over || 'не закончена (' + plies + ' полуходов)') +
    ', ' + plies + ' полуходов, ' + Math.round((performance.now() - t0) / 1000) + 's');
}
