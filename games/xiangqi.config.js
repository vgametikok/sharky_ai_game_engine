/* Сянци — китайские шахматы против ИИ (5 уровней).
   Спрайты PixelLab пакуются в xiangqi.px.js (tools/pack-xiangqi.ps1). */
let px = {};
try { px = require('./xiangqi.px.js'); } catch (e) {}

module.exports = {
  genre: 'xiangqi',
  meta: {
    title: 'Сянци — китайские шахматы',
    author: 'sharky',
  },
  theme: {
    accent: '#e8b04a',
    bgTop: '#2a180c',
    bgBottom: '#140b06',
    font: 'Georgia, serif',
    hudText: '#f4e3b0',
    labels: {
      over: 'ПАРТИЯ ОКОНЧЕНА',
      scoreUnit: 'очков',
      again: 'Коснитесь — в меню',
    },
  },
  rules: { mode: 'free' },
  assets: px,
};
