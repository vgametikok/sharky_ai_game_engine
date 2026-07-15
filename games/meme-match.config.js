/* «МЕМ-МАТЧ» — три-в-ряд на 50 уровней с нарастающей сложностью (сцена match3).
   Собирай мем-лица: с уровнем растёт цель и число типов, а времени даётся меньше.
   Спецэлементы (4/5-в-ряд, бомбы, радуга). Прогресс сохраняется между запусками. */
'use strict';
const tiles = require('./meme-match.proc.js');

module.exports = {
  genre: 'match3',
  meta: { title: 'Мем-матч' },
  assets: tiles,
  tileNames: ['m_grin', 'm_lol', 'm_cool', 'm_shock', 'm_angry', 'm_sleep'],
  theme: {
    accent: '#ffd21f',
    bgTop: '#2a2140', bgBottom: '#120a20',
    hudText: '#ffe9a0',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ВРЕМЯ ВЫШЛО', win: 'ВСЕ МЕМЫ СОБРАНЫ!', again: 'Тап — заново', scoreUnit: 'уровень', level: 'Уровень' },
  },
  rules: {
    cols: 7, rows: 8, minRun: 3, specials: true, mode: 'timed', duration: 48,
    pool: ['m_grin', 'm_lol', 'm_cool', 'm_shock', 'm_angry', 'm_sleep'],
    // 50 уровней: цель растёт 8→~32, типов 4→6, времени 48с→20с
    progression: { count: 50, goal: [8, 0.5], types: [4, 0.045, 6], time: [48, 0.58, 20] },
  },
};
