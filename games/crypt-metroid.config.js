/* «Забытая гробница» — горизонтальная метроидвания на сцене platformer.
   Расхититель гробниц спускается в древний склеп. Способности открывают путь:
   • двойной прыжок (A) — единственный способ подняться на площадку в 5 тайлов,
     чтобы попасть в верхний тоннель;
   • рывок (X) — в низком коридоре не подпрыгнуть (потолок), провал пересекается
     только рывком с i-frames;
   затем арена Стража склепа и запертый выход — открывается после его гибели.
   Мини-карта (▦). Карта строится программно из заливок — колонки не сдвинутся. */
'use strict';

const CRYPT_BG = require('./crypt-metroid.bg.js');
const GW = 56, GH = 24;
function buildMap() {
  const g = [];
  for (let y = 0; y < GH; y++) g.push(new Array(GW).fill(' '));
  const set = (x, y, ch) => { if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = ch; };
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };

  // рамка
  rect(0, 0, GW - 1, 0, '#');            // потолок
  rect(0, 0, 0, GH - 1, '#');            // левая стена
  rect(GW - 1, 0, GW - 1, GH - 1, '#');  // правая стена

  // сталактиты со свода (декор, вне пути игрока) — заполняют пустоту пещеры
  const stal = (x, len) => rect(x, 1, x, len, '#');
  [[3,4],[6,2],[9,5],[13,3],[18,6],[22,3],[27,5],[31,2],[34,4],[39,6],[43,3],[47,5],[50,2],[52,4]]
    .forEach(([x, l]) => stal(x, l));

  // пол: стартовая площадка и арена, между ними — бездонная пропасть
  rect(0, 22, 24, 23, '#');
  rect(46, 22, 55, 23, '#');

  // ── ГЕЙТ 1: двойной прыжок ── площадка в 5 тайлов над полом (одиночный не достаёт)
  rect(21, 17, 24, 17, '=');

  // верхний тоннель (пол row14) + дальняя площадка за провалом
  rect(23, 14, 39, 14, '=');
  rect(42, 14, 47, 14, '=');
  // ── ГЕЙТ 2: рывок ── провал cols40-41 + низкий потолок над ним (нельзя подпрыгнуть)
  rect(38, 12, 46, 12, '#');

  // стартовая зона (row21 — над полом)
  set(2, 21, 'P');
  set(4, 21, 'N');
  set(9, 21, 'A');            // двойной прыжок — берём сразу
  set(12, 21, 'C'); set(13, 21, 'C');
  set(16, 21, 'g');           // краулер

  // верхний тоннель (row13 — над полом тоннеля)
  set(24, 13, 'S');           // чекпоинт у входа в тоннель
  set(28, 13, 'C'); set(30, 13, 'C');
  set(31, 13, 'f');           // летучая мышь
  set(35, 13, 'X');           // рывок — берём перед провалом
  set(37, 13, 'C');

  // арена Стража (row21 — над полом арены)
  set(48, 21, 'S');           // чекпоинт перед боссом
  set(49, 21, 'H');           // сердце
  set(51, 21, 'B');           // босс
  set(53, 21, 'E');           // выход (needsBossDead)

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
    labels: { over: 'ПАЛ', win: 'СВОБОДА!', again: 'Тап — заново', scoreUnit: 'золота', level: 'Глубина' },
  },
  assets: { cryptBg: CRYPT_BG },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 11, mode: 'levels',
    physics: { gravity: 1500, moveSpeed: 122, jumpVel: 420, dashSpeed: 340, dashTime: 0.16 },
    map: true,
    player: {
      w: 0.7, h: 0.92, hp: 4, lives: 3, color: '#f4d38a',
      weapons: ['blade'],
      abilities: { doubleJump: false, dash: false },
      dashIFrames: true,
    },
    weapons: {
      blade: { type: 'melee', dmg: 2, range: 1.05, cooldown: 0.32, knockback: 175 },
    },
    enemies: {
      crawler: { w: 0.8, h: 0.75, hp: 2, dmg: 1, speed: 34, ai: 'patrol', stompable: true, score: 25, color: '#8f6f4a', drop: 'C', dropChance: 0.5 },
      bat:     { w: 0.75, h: 0.65, hp: 1, dmg: 1, speed: 52, ai: 'chase', fly: true, range: 6, score: 30, color: '#7a5b8f' },
      warden: {
        w: 1.8, h: 1.7, hp: 22, dmg: 1, speed: 44, ai: 'chase', range: 13,
        chargeSpeed: 235, projSpeed: 175, jumpVel: 380, score: 600, color: '#b8863b',
        boss: {
          name: 'СТРАЖ СКЛЕПА', onDeath: 'openExit',
          phases: [
            { hpPct: 1.0, attacks: ['charge', 'aimed'], cooldown: 1.8 },
            { hpPct: 0.5, attacks: ['charge', 'spread', 'slam'], cooldown: 1.15, speedMul: 1.4 },
          ],
        },
      },
    },
    npcs: {
      keeper: { w: 0.75, h: 0.9, color: '#7fb8c0', lines: ['Ты тоже ищешь выход?', 'Реликвии дают силу…', 'Сначала прыжок, потом рывок', 'Страж стережёт врата'] },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#463a4e' },
      '=': { tile: true, solid: true, color: '#6e5738' },
      '^': { tile: true, hazard: 1, color: '#c05248' },
      'P': { player: true },
      'E': { exit: true, needsBossDead: true, color: '#7ce0a0' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 15, color: '#e6c34b' },
      'H': { pickup: 'heart', color: '#e8546a' },
      'A': { pickup: 'ability', ability: 'doubleJump', label: 'Двойной прыжок!', color: '#6fd0ff' },
      'X': { pickup: 'ability', ability: 'dash', label: 'Рывок!', color: '#ff7ac0' },
      'g': { enemy: 'crawler' },
      'f': { enemy: 'bat' },
      'B': { enemy: 'warden' },
      'N': { npc: 'keeper' },
    },
    levels: [{ map: buildMap() }],
  },
};
