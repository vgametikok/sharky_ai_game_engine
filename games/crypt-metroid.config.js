/* «Забытая гробница» — ГОРИЗОНТАЛЬНЫЙ соулслайк-платформер (сцена platformer).
   Странник-рыцарь пробивается через длинный склеп СЛЕВА НАПРАВО: костры-чекпоинты
   (отдых лечит и воскрешает врагов — классический соулслайк-луп), стамина на удары
   и перекат (dash с i-frames — уворот), медленные тяжёлые враги (скелеты, гули) и
   финальный босс — Ашеновый Страж. Камера едет вбок; вертикаль заполняет фон пещеры.
   Спрайты рыцаря/врагов/босса — PixelLab (crypt-metroid.px.js), иначе плейсхолдеры. */
'use strict';
const CRYPT_BG = require('./crypt-metroid.bg.js');
let px = {}; try { px = require('./crypt-metroid.px.js'); } catch (e) { /* до упаковки */ }
const A = Object.keys(px).length > 0;
const anims = (m) => (A ? m : null);
const img = (n) => (px[n] ? n : undefined);

const GW = 132, GH = 24;
function buildMap() {
  const g = [];
  for (let y = 0; y < GH; y++) g.push(new Array(GW).fill(' '));
  const set = (x, y, ch) => { if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = ch; };
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };
  const GND = 20;                                    // верх основного пола

  rect(0, 0, GW - 1, 0, '#');                         // свод
  rect(0, 0, 0, GH - 1, '#'); rect(GW - 1, 0, GW - 1, GH - 1, '#');
  rect(0, GND, GW - 1, GH - 1, '#');                  // сплошной пол по всей длине

  // сталактиты со свода (декор поверх фона)
  const stal = (x, len) => rect(x, 1, x, len, '#');
  for (let x = 4; x < GW - 4; x += 7) stal(x, 2 + ((x * 13) % 5));

  // старт
  set(2, GND - 1, 'P'); set(4, GND - 1, 'S');         // первый костёр
  set(6, GND - 2, 'C'); set(8, GND - 2, 'C');

  // ── СЕКЦИЯ 1: скелеты + провал ──
  set(14, GND - 1, 'k'); set(20, GND - 1, 'k');
  rect(24, GND, 27, GH - 1, ' ');                     // провал (перепрыгнуть/перекатиться)
  set(30, GND - 1, 'C'); set(31, GND - 1, 'C');
  set(34, GND - 1, 'k');
  set(38, GND - 1, 'S');                              // костёр 2

  // ── СЕКЦИЯ 2: подъём на уступ + гули ──
  rect(44, GND - 4, 50, GND - 4, '=');               // уступ
  set(46, GND - 5, 'C'); set(48, GND - 5, 'H');
  set(45, GND - 5, 'u');
  set(54, GND - 1, 'u'); set(60, GND - 1, 'u');
  rect(64, GND - 6, 64, GND - 1, '#');               // низкая колонна-стена (перепрыгнуть уступом)
  rect(58, GND - 3, 62, GND - 3, '-');               // one-way площадка чтобы перебраться
  set(70, GND - 1, 'S');                             // костёр 3

  // ── СЕКЦИЯ 3: шипы + смешанные враги ──
  set(76, GND - 1, '^'); set(77, GND - 1, '^'); set(78, GND - 1, '^');  // шипы (перекат)
  set(82, GND - 1, 'k'); set(86, GND - 1, 'u');
  rect(90, GND, 93, GH - 1, ' ');                    // второй провал
  set(96, GND - 1, 'k'); set(99, GND - 1, 'u');
  set(101, GND - 2, 'C'); set(103, GND - 2, 'C');
  set(106, GND - 1, 'S');                            // костёр 4 (перед боссом)
  set(107, GND - 2, 'H');

  // ── АРЕНА БОССА ──
  rect(110, GND - 8, 110, GND - 1, '#');             // ворота арены (визуальная стена)
  set(120, GND - 1, 'B');                            // Ашеновый Страж
  set(129, GND - 1, 'E');                            // выход (на случай, если onDeath не win)

  return g.map(row => row.join(''));
}

module.exports = {
  genre: 'platformer',
  meta: { title: 'Забытая гробница' },
  theme: {
    accent: '#e6a94b',
    bgTop: '#2a2038', bgBottom: '#0a0710',
    bgImage: 'cryptBg',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ТЫ ПАЛ', win: 'СКЛЕП ПОКОРЁН', again: 'Тап — восстать', scoreUnit: 'душ', level: 'Склеп' },
  },
  assets: Object.assign({ cryptBg: CRYPT_BG }, px),
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 13, mode: 'levels',
    physics: { gravity: 1500, moveSpeed: 108, jumpVel: 430, dashSpeed: 360, dashTime: 0.18 },
    respawnEnemies: true,                              // отдых у костра воскрешает врагов
    saveCheckpoint: true,                              // возобновление с последнего костра
    player: {
      w: 0.7, h: 0.95, hp: 5, lives: 5, color: '#f4d38a',
      weapons: ['sword'],
      abilities: { dash: true },                       // перекат-уворот
      dashIFrames: true,
      checkpointHeal: true,
      stamina: { max: 100, regen: 42, attackCost: 26, dashCost: 30 },
      anims: anims({ idle: { imgs: [img('hero')], fps: 1, w: 1.7, h: 2.2 } }),
    },
    weapons: {
      sword: { name: 'КЛИНОК', type: 'melee', dmg: 2, range: 1.15, cooldown: 0.42, knockback: 190 },
    },
    enemies: {
      skeleton: {
        w: 0.85, h: 1.0, hp: 4, dmg: 2, speed: 26, ai: 'patrol', stompable: false, score: 40,
        color: '#cfc7b0', drop: 'C', dropChance: 0.5,
        anims: anims({ idle: { imgs: [img('skeleton')], fps: 1, w: 1.5, h: 1.9 } }),
      },
      ghoul: {
        w: 0.85, h: 0.95, hp: 5, dmg: 2, speed: 40, ai: 'chase', range: 9, stompable: false, score: 60,
        color: '#7a8f6a', drop: 'C', dropChance: 0.6,
        anims: anims({ idle: { imgs: [img('ghoul')], fps: 1, w: 1.5, h: 1.85 } }),
      },
      guardian: {
        w: 1.9, h: 2.4, hp: 40, dmg: 3, speed: 40, ai: 'chase', range: 15,
        chargeSpeed: 230, projSpeed: 180, jumpVel: 380, score: 1000, color: '#b8863b',
        anims: anims({ idle: { imgs: [img('guardian')], fps: 1, w: 3.2, h: 3.6 } }),
        boss: {
          name: 'АШЕНОВЫЙ СТРАЖ', onDeath: 'win',
          phases: [
            { hpPct: 1.0, attacks: ['charge', 'aimed'], cooldown: 1.7 },
            { hpPct: 0.55, attacks: ['charge', 'slam', 'spread'], cooldown: 1.2, speedMul: 1.35 },
            { hpPct: 0.25, attacks: ['slam', 'spread', 'charge'], cooldown: 0.9, speedMul: 1.6 },
          ],
        },
      },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#463a4e' },
      '=': { tile: true, solid: true, color: '#6e5738' },
      '-': { tile: true, oneWay: true, color: '#7a5230' },
      '^': { tile: true, hazard: 2, color: '#c05248' },
      'P': { player: true },
      'E': { exit: true, needsBossDead: true, color: '#7ce0a0' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 20, color: '#e6c34b' },
      'H': { pickup: 'heart', color: '#e8546a' },
      'k': { enemy: 'skeleton' },
      'u': { enemy: 'ghoul' },
      'B': { enemy: 'guardian' },
    },
    levels: [{ map: buildMap() }],
  },
};
