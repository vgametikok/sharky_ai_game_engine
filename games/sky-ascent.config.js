/* «SKYWARD» — бесконечный вертикальный climber (сцена platformer, режим climb).
   Башня генерируется В РАНТАЙМЕ, поэтому КАЖДЫЙ забег — новый. Прыгай со сквозной
   площадки на площадку всё выше: пружины подбрасывают, монеты копят очки-высоту,
   мотыльки мешают (по ним можно прыгнуть). Сорвёшься ниже экрана — конец.
   Каждый следующий ярус гарантированно в пределах прыжка → путь всегда проходим.
   Ассеты (скалолаз, мотылёк) — существующие sky-ascent.px.js (PixelLab). */
'use strict';
let px = {}; try { px = require('./sky-ascent.px.js'); } catch (e) { /* до упаковки */ }
const has = (n) => !!px[n];
const frame = (n) => has(n) ? { imgs: [n], fps: 1, w: 1.4, h: 1.6 } : undefined;
const heroAnims = has('player') ? { idle: frame('player'), run: frame('player'), jump: frame('player'), fall: frame('player') } : null;

module.exports = {
  genre: 'platformer',
  meta: { title: 'Skyward' },
  assets: px,
  theme: {
    accent: '#ffd24a',
    bgTop: '#8fd4f0', bgBottom: '#e8b7d8',   // рассветное небо
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'YOU FELL', win: 'SKY LIMIT!', again: 'Tap to climb again', scoreUnit: 'm', level: 'Tier' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 13, mode: 'climb',
    physics: { gravity: 1450, moveSpeed: 134, jumpVel: 452, dashSpeed: 300, dashTime: 0.16 },
    player: {
      w: 0.7, h: 0.92, hp: 1, lives: 1, color: '#ff7a4d',
      abilities: { doubleJump: true },
      anims: heroAnims,
    },
    enemies: {
      moth: { w: 0.8, h: 0.7, hp: 1, dmg: 1, speed: 40, ai: 'fly', fly: true, range: 5, score: 40, color: '#b06fd1', stompable: true,
        anims: has('moth') ? { idle: { imgs: ['moth'], fps: 1, w: 1.3, h: 1.2 } } : null },
    },
    legend: {
      '=': { tile: true, solid: true, color: '#d9b382' },       // стартовая площадка
      '-': { tile: true, oneWay: true, color: '#e8c79a' },      // сквозная площадка (снизу проходишь)
      'v': { tile: true, solid: true, spring: 690, color: '#6fd0a0' },
      'C': { pickup: 'coin', value: 10, color: '#ffd24a' },
      'f': { enemy: 'moth' },
    },
    // параметры бесконечной генерации (все ярусы допрыгиваемы: gap≤прыжок, spread≤досягаемости)
    climb: { width: 13, gap: 3, spread: 3, platW: 3, springChance: 0.16, enemyChance: 0.15,
      enemy: 'f', oneWay: '-', ground: '=', spring: 'v', coin: 'C' },
  },
};
