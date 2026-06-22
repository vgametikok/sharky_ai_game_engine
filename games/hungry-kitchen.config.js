/* Hungry Kitchen — конфиг игры (тема/правила, русские подписи).
   Ассеты (base64-картинки) лежат отдельно и генерируются упаковщиком
   tools/pack-kitchen-config.ps1 → hungry-kitchen.assets.js. */
const assets = require('./hungry-kitchen.assets.js');
// еда = все ассеты, кроме подложки поля и фона
const foods = Object.keys(assets).filter(function (k) { return k !== 'deck' && k !== 'background'; });

module.exports = {
  genre: 'match3',
  meta: { title: 'Hungry Kitchen' },
  theme: {
    accent: '#ff8a3d',
    bgTop: '#3a2a1d',
    bgBottom: '#1a120c',
    hudText: '#fff3e0',
    font: "'Segoe UI', system-ui, sans-serif",
    bgImage: 'background',                 // фон: по ширине, верх закреплён, низ обрезается
    labels: { over: 'КУХНЯ ЗАКРЫТА', scoreUnit: 'уровней', again: 'Нажми, чтобы готовить снова' },
  },
  rules: {
    mode: 'timed', duration: 60,           // 60 секунд на раунд
    cols: 7, rows: 7,                      // поле 7×7
    minRun: 3, clearDur: 0.18,
    goal: 12,                             // собрать 12 штук тайла-задания
    typeCount: 6,                        // 6 видов еды на поле в раунде
    boardImage: 'deck',                  // деревянная разделочная доска под фишками
    pool: foods,                         // из чего каждый раунд берётся еда (одна — задание)
  },
  tileNames: foods,
  assets: assets,
};
