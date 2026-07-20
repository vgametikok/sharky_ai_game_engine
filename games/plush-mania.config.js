/* «ПЛЮШ-МАНИЯ» — вертикальный match-3 (сцена match3, режим цель+прогрессия).
   ЛОР: город охватила блайндбокс-лихорадка — все гоняются за редкими плюшами из
   запечатанных коробок. Ты — коллекционер: составляй тройки одинаковых игрушек,
   вскрывай запечатанные ячейки и собери всю витрину, пока не закрылся магазин.
   40 витрин нарастающей сложности, прогресс сохраняется.

   Тренд 2025: designer-toy / блайндбоксы. Спрайты — оригинальные плюши PixelLab
   (plush-mania.px.js), фон-витрина и доска — процедурные (plush-mania.proc.js). */
'use strict';
let px = {}; try { px = Object.assign({}, require('./plush-mania.proc.js')); } catch (e) { /* до генерации */ }
try { Object.assign(px, require('./plush-mania.px.js')); } catch (e) { /* до упаковки PixelLab */ }
const img = (n) => (px[n] ? n : undefined);

// 8 плюшей: PixelLab-ключи pl_*; пока нет — процедурные заглушки не делаем, движок сам красит кружки
const PLUSH = ['pl_bunny', 'pl_cat', 'pl_goblin', 'pl_star', 'pl_axolotl', 'pl_fox', 'pl_ghost', 'pl_dragon'];
const pool = PLUSH.map((n) => img(n) || n);

module.exports = {
  genre: 'match3',
  meta: { title: 'Плюш-Мания' },
  assets: px,
  theme: {
    accent: '#ff9ec4',
    bgTop: '#3a2436', bgBottom: '#150c16',
    hudText: '#ffe4f0',
    font: "'Segoe UI', system-ui, sans-serif",
    bgImage: img('pm_shop'),
    labels: {
      over: 'МАГАЗИН ЗАКРЫЛСЯ…',
      win: 'ВСЯ ВИТРИНА СОБРАНА!',
      again: 'Тап — новая витрина',
      scoreUnit: 'витрин',
      level: 'Витрина',
      hint: 'Свапай плюшей — собирай тройки',
    },
  },
  rules: {
    mode: 'timed', duration: 70,
    cols: 7, rows: 8,
    minRun: 3, clearDur: 0.18,
    goal: 10,
    specials: true,                          // бонусы: линия/бомба/радуга + слияния
    ice: { count: 5, layers: 1 },            // запечатанные ячейки-блайндбоксы
    boardImage: img('pm_board'),
    pool: pool,
    // 40 витрин: 1-я — 10 плюшей из 4 видов за 70с; 40-я — 30 из 8 видов за 40с
    progression: { count: 40, goal: [10, 0.5], types: [4, 0.15, 8], time: [70, 0.78, 40] },
  },
  tileNames: pool,
};
