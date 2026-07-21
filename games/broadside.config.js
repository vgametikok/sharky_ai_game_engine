/* «BROADSIDE» — вертикальный морской шмап-кампания (сцена shmup, режим levels).
   Отличие от прочих шмапов: корабль идёт по ОТКРЫТОМУ МОРЮ (полностью водный фон)
   и палит ПУШКАМИ С ОБОИХ БОРТОВ (weapon.sides) — плюс нос вперёд. На него идут
   вражеские корабли и морские твари. 30 рубежей, босс каждые 5, прогресс копится.
   Единственная морская игра набора. Спрайты — PixelLab (broadside.px.js) + фон/ядро
   процедурные (broadside.proc.js). */
'use strict';
let px = {}; try { px = Object.assign({}, require('./broadside.proc.js')); } catch (e) {}
try { Object.assign(px, require('./broadside.px.js')); } catch (e) {}
const assets = px;
const img = (n) => (assets[n] ? n : undefined);

module.exports = {
  genre: 'shmup',
  meta: { title: 'Broadside' },
  assets: assets,
  theme: {
    accent: '#ffcf6a',
    bgTop: '#0e3a52', bgBottom: '#06283c',
    bgImage: img('bs_sea'),
    font: "'Segoe UI', system-ui, sans-serif",
    labels: {
      over: 'SUNK!',
      win: 'THE BLOOD MOON MAP IS YOURS!',
      again: 'Tap to set sail again',
      scoreUnit: 'doubloons',
      hint: 'Drag to steer · cannons fire BOTH sides · ✦ grapeshot',
      defeated: 'sunk', levelWord: 'WAVE', lvlShort: 'W',
    },
  },
  rules: { mode: 'untimed' },
  shmup: {
    mode: 'levels', levelCount: 30, bossEvery: 5,
    scroll: { speed: 60, stars: true },
    player: { w: 30, h: 40, speed: 300, hp: 3, bombs: 3, hitboxR: 4, color: '#ffcf6a', img: img('ship'), imgScale: 1.5 },
    weapon: {
      cooldown: 0.16, shotSpeed: 470, bulletImg: img('bs_ball'), bulletSize: 16,
      sides: true, sideMax: 3, sideSpeed: 420,     // БОРТОВОЙ ЗАЛП: пушки с обоих бортов
      levels: [
        { count: 1, spread: 0, dmg: 1 },
        { count: 2, spread: 0.12, dmg: 1 },
        { count: 3, spread: 0.26, dmg: 1 },
        { count: 4, spread: 0.40, dmg: 1.5 },
        { count: 5, spread: 0.56, dmg: 2 },
      ],
    },
    intro: ['BROADSIDE',
      'Cursed waters guard the Blood Moon map. Fire a broadside from both rails — and hold your course.'],
    pool: ['sloop', 'gunboat', 'canoe', 'fire', 'ghost', 'mine', 'serpent', 'crab'],
    enemies: {
      sloop:   { w: 30, h: 32, hp: 2, speed: 72, color: '#c9b48a', move: 'straight', img: img('e_sloop'),   imgScale: 1.55, score: 40, drop: 'up',   dropChance: 0.10 },
      gunboat: { w: 34, h: 32, hp: 3, speed: 46, color: '#8a6a4a', move: 'hover',    img: img('e_gunboat'), imgScale: 1.55, gun: { cooldown: 1.6, speed: 155, aim: 'down' },   score: 80,  drop: 'bomb',  dropChance: 0.14 },
      canoe:   { w: 24, h: 30, hp: 1, speed: 96, color: '#7a5a3a', move: 'dive',     img: img('e_canoe'),   imgScale: 1.5,  score: 55,  drop: 'up',   dropChance: 0.10 },
      fire:    { w: 28, h: 32, hp: 2, speed: 82, color: '#e0662e', move: 'dive',     img: img('e_fire'),    imgScale: 1.55, score: 70 },
      ghost:   { w: 28, h: 32, hp: 3, speed: 52, color: '#9fe6d0', move: 'sine',     img: img('e_ghost'),   imgScale: 1.55, gun: { cooldown: 1.9, speed: 165, aim: 'player' }, score: 90,  drop: 'heart', dropChance: 0.08 },
      mine:    { w: 24, h: 24, hp: 1, speed: 40, color: '#2c2f38', move: 'straight', img: img('e_mine'),    imgScale: 1.5,  score: 35 },
      serpent: { w: 30, h: 32, hp: 4, speed: 46, color: '#4aa06a', move: 'sine',     img: img('e_serpent'), imgScale: 1.6,  gun: { cooldown: 1.8, speed: 155, aim: 'spread3' }, score: 110 },
      crab:    { w: 34, h: 30, hp: 5, speed: 36, color: '#e07a3a', move: 'hover',    img: img('e_crab'),    imgScale: 1.6,  score: 130, drop: 'up', dropChance: 0.12 },
      // ── боссы ──
      b_capt:      { w: 66, h: 66, hp: 60,  speed: 24, color: '#8a6a4a', move: 'hover', img: img('b_frigate'),   imgScale: 1.5, gun: { cooldown: 1.0, speed: 155, aim: 'spread3' }, score: 900,  drop: 'heart', dropChance: 1 },
      b_ghostship: { w: 66, h: 64, hp: 85,  speed: 28, color: '#8fd6c0', move: 'hover', img: img('b_wreck'),     imgScale: 1.5, gun: { cooldown: 0.8, speed: 165, aim: 'player' },  score: 1100, drop: 'heart', dropChance: 1 },
      b_ironclad:  { w: 72, h: 66, hp: 120, speed: 20, color: '#6a707c', move: 'hover', img: img('b_ironclad'),  imgScale: 1.5, gun: { cooldown: 0.7, speed: 175, aim: 'down' },    score: 1400, drop: 'bomb',  dropChance: 1 },
      b_serpking:  { w: 64, h: 66, hp: 150, speed: 30, color: '#4aa06a', move: 'hover', img: img('e_serpent'),   imgScale: 2.4, gun: { cooldown: 0.7, speed: 170, aim: 'spread3' }, score: 1700, drop: 'heart', dropChance: 1 },
      b_kraken:    { w: 78, h: 74, hp: 200, speed: 18, color: '#7a4a8a', move: 'hover', img: img('b_kraken'),    imgScale: 1.6, gun: { cooldown: 0.6, speed: 175, aim: 'spread3' }, score: 2200, drop: 'bomb',  dropChance: 1 },
      b_leviathan: { w: 84, h: 80, hp: 280, speed: 16, color: '#3a6a8a', move: 'hover', img: img('b_leviathan'), imgScale: 1.6, gun: { cooldown: 0.55, speed: 185, aim: 'player' }, score: 5000, drop: 'heart', dropChance: 1 },
    },
    bosses: [
      { enemy: 'b_capt',      name: 'CAPTAIN BLACKBEARD', story: 'His frigate has not missed a shot in thirty years. The first seal is his.', win: 'Blackbeard yields the helm. The first seal is broken.' },
      { enemy: 'b_ghostship', name: 'THE GHOST GALLEON',   story: 'A crew of the dead rows through the fog and will not sink.',            win: 'The fog lifts. The ghosts find rest on the seabed.' },
      { enemy: 'b_ironclad',  name: 'IRONSIDES',           story: 'An iron behemoth — neither cannonball nor boarding will crack it.',      win: 'Her seams split — Ironsides went down in the boiling foam.' },
      { enemy: 'b_serpking',  name: 'THE SERPENT KING',    story: 'A sea serpent a mile long coils around ships and drags them under.',     win: 'The coils loosen. The serpent slinks back to the deep.' },
      { enemy: 'b_kraken',    name: 'THE KRAKEN',          story: 'Eight tentacles raise the darkness itself from the abyss.',              win: 'The Kraken retreats into the depths. Six seals fallen.' },
      { enemy: 'b_leviathan', name: 'LEVIATHAN OF THE BLOOD MOON', story: 'The last guardian — the one drawn at the edge of every map.',   win: 'Leviathan is cast down. The Blood Moon map is yours, Captain!' },
    ],
  },
};
