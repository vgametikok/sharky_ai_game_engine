/* Match-3 Deluxe — демо новых механик: спецэлементы (молния/бомба/радуга),
   слияния бустеров, ледяные клетки, лимит ходов + цель.
   Ассеты переиспользуются из match3-medieval. */
const base = require('./match3-medieval.config.js');

module.exports = {
  genre: 'match3',
  meta: { title: 'Match-3 Deluxe' },
  theme: Object.assign({}, base.theme, {
    accent: '#7ce0ff',
    labels: { over: 'ХОДЫ КОНЧИЛИСЬ', win: 'ПОБЕДА!', again: 'Тап — заново', scoreUnit: 'уровней' },
  }),
  rules: {
    mode: 'untimed',
    cols: 7, rows: 8, minRun: 3, clearDur: 0.18,
    goal: 15, typeCount: 5, pool: base.tileNames,
    moveLimit: 20,
    specials: true,
    ice: { count: 6, layers: 2 },
  },
  tileNames: base.tileNames,
  assets: base.assets,
};
