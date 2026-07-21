/* «REAL OR FAKE?» — «найди отличия» (сцена diff), вертикальная.
   Отличие от прочих игр набора: НЕ три-в-ряд, а поиск отличий. Тренд 2025 —
   контрафакт дизайнерских плюшей (Labubu → «Lafufu»): сверяй две витрины
   блайндбоксов и находи 6 подделок за раунд, пока не вышло время. 6 раундов.
   Спрайты — те же плюши PixelLab (plush-mania.px.js), фон-витрина — процедурный. */
'use strict';
let px = {}; try { px = Object.assign({}, require('./plush-mania.proc.js')); } catch (e) {}
try { Object.assign(px, require('./plush-mania.px.js')); } catch (e) {}
const img = (n) => (px[n] ? n : undefined);

const PLUSH = ['pl_bunny', 'pl_cat', 'pl_goblin', 'pl_star', 'pl_axolotl', 'pl_fox', 'pl_ghost', 'pl_dragon'].filter((n) => px[n]);

module.exports = {
  genre: 'diff',
  meta: { title: 'Real or Fake?' },
  assets: px,
  theme: {
    accent: '#ff9ec4',
    bgTop: '#3a2436', bgBottom: '#150c16',
    hudText: '#ffe4f0',
    bgImage: img('pm_shop'),
    font: "'Segoe UI', system-ui, sans-serif",
    labels: {
      over: "TIME'S UP!",
      win: 'SHARP EYE!',
      again: 'Tap for a new haul',
      scoreUnit: 'spotted',
      hint: 'Spot 6 differences between the two shelves',
      roundWord: 'Round', secWord: 's',
    },
  },
  rules: { mode: 'timed', duration: 75 },
  diff: {
    imgs: PLUSH.length ? PLUSH : null,   // витрина собирается из спрайтов-плюшей
    bgColor: '#2a1c2c',                  // тёплая полка-подложка
    shapes: 18,                          // плюшей на витрине
    diffs: 6,                            // подделок за раунд
    penalty: 4,                          // штраф за ложное обвинение, сек
    rounds: 6,                           // шесть партий-хаулов
  },
};
