/* «ЖЁЛТАЯ РАСЧЁСКА» — вертикальный шмап-кампания (сцена shmup, режим levels).
   ЛОР: каждую ночь мир видит сны, но что-то пожирает их — Кошмар. Осталась одна
   надежда — маленькая жёлтая расчёска, что распутывает узлы страха. Она летит в
   страшный сон, стреляет крошечными расчёсками и одолевает 10 воплощённых страхов,
   чтобы вернуть миру рассвет. 50 уровней, босс каждые 5, прогресс сохраняется.

   Спрайты: процедурные (расчёска/облако/глаз/зуб/…) из comb-shmup.proc.js +
   PixelLab-монстры (призрак/клоун/безликий/паук/ворон/демон/финал) из
   comb-shmup.px.js, если упакованы; иначе движок рисует цветные силуэты. */
'use strict';
const proc = require('./comb-shmup.proc.js');
let px = {}; try { px = require('./comb-shmup.px.js'); } catch (e) { /* ещё не упакованы */ }
const assets = Object.assign({}, proc, px);
const img = (name) => (assets[name] ? name : undefined);   // ссылку даём только если ассет есть

module.exports = {
  genre: 'shmup',
  meta: { title: 'Жёлтая расчёска' },
  assets: assets,
  theme: {
    accent: '#ffd21f',
    bgTop: '#1a1030', bgBottom: '#05030c',
    bgImage: img('nightmare_bg'),
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'СОН ОБОРВАЛСЯ', win: 'РАССВЕТ!', again: 'Тап — снова в сон', scoreUnit: 'снов',
      hint: 'Веди пальцем · ✦ разгоняет кошмары' },
  },
  rules: { mode: 'untimed' },
  shmup: {
    mode: 'levels', levelCount: 50, bossEvery: 5,
    scroll: { speed: 40, stars: true },
    player: { w: 26, h: 34, speed: 300, hp: 3, bombs: 3, hitboxR: 3, color: '#ffd21f', img: img('comb'), imgScale: 1.5 },
    weapon: {
      cooldown: 0.13, shotSpeed: 470, bulletImg: img('comb_bullet'), bulletSize: 15,
      levels: [
        { count: 1, spread: 0, dmg: 1 },
        { count: 2, spread: 0.13, dmg: 1 },
        { count: 3, spread: 0.28, dmg: 1 },
        { count: 4, spread: 0.42, dmg: 1.5 },
        { count: 5, spread: 0.58, dmg: 2 },
      ],
    },
    intro: ['ЖЁЛТАЯ РАСЧЁСКА',
      'Каждую ночь мир видит сны — но их пожирает Кошмар. Распутай узлы страха и верни миру рассвет.'],
    // ── 12 страхов-рядовых (POOL) ──
    pool: ['ghost', 'cloud', 'eye', 'tooth', 'clock', 'skull', 'wisp', 'hand', 'clown', 'faceless', 'spider', 'crow'],
    enemies: {
      ghost:   { w: 26, h: 26, hp: 2, speed: 60, color: '#dfe6ff', move: 'sine',    img: img('ghost'),   imgScale: 1.7, score: 40, drop: 'up', dropChance: 0.10 },
      cloud:   { w: 34, h: 28, hp: 3, speed: 42, color: '#8b90a3', move: 'hover',   img: img('cloud'),   imgScale: 1.5, gun: { cooldown: 1.5, speed: 150, aim: 'down' }, score: 70, drop: 'up', dropChance: 0.12 },
      eye:     { w: 28, h: 26, hp: 3, speed: 50, color: '#d8a94a', move: 'straight',img: img('eye'),     imgScale: 1.5, gun: { cooldown: 1.9, speed: 170, aim: 'player' }, score: 80 },
      tooth:   { w: 22, h: 26, hp: 1, speed: 95, color: '#f3eee1', move: 'dive',    img: img('tooth'),   imgScale: 1.5, score: 55, drop: 'up', dropChance: 0.10 },
      clock:   { w: 30, h: 30, hp: 4, speed: 34, color: '#e9dcc0', move: 'hover',   img: img('clock'),   imgScale: 1.5, gun: { cooldown: 2.0, speed: 140, aim: 'spread3' }, score: 110, drop: 'bomb', dropChance: 0.18 },
      skull:   { w: 26, h: 28, hp: 3, speed: 55, color: '#efe9dc', move: 'sine',    img: img('skull'),   imgScale: 1.5, score: 75 },
      wisp:    { w: 20, h: 28, hp: 1, speed: 80, color: '#b48cff', move: 'dive',    img: img('wisp'),    imgScale: 1.5, score: 50, drop: 'heart', dropChance: 0.08 },
      hand:    { w: 28, h: 32, hp: 3, speed: 46, color: '#2e2140', move: 'straight',img: img('hand'),    imgScale: 1.5, score: 85 },
      clown:   { w: 30, h: 30, hp: 4, speed: 40, color: '#e05a7a', move: 'hover',   img: img('clown'),   imgScale: 1.7, gun: { cooldown: 1.6, speed: 160, aim: 'player' }, score: 120, drop: 'up', dropChance: 0.15 },
      faceless:{ w: 28, h: 32, hp: 4, speed: 44, color: '#20222c', move: 'straight',img: img('faceless'),imgScale: 1.7, score: 100, drop: 'up', dropChance: 0.12 },
      spider:  { w: 32, h: 28, hp: 5, speed: 38, color: '#6a4a8a', move: 'sine',    img: img('spider'),  imgScale: 1.7, gun: { cooldown: 1.7, speed: 150, aim: 'down' }, score: 130 },
      crow:    { w: 30, h: 26, hp: 3, speed: 70, color: '#3a3040', move: 'dive',    img: img('crow'),    imgScale: 1.7, score: 95, drop: 'up', dropChance: 0.10 },
      // ── боссы (по одному на каждые 5 уровней) ──
      b_demon: { w: 66, h: 66, hp: 55,  speed: 24, color: '#7a2a3a', move: 'hover', img: img('demon'),    imgScale: 1.4, gun: { cooldown: 1.0, speed: 150, aim: 'spread3' }, score: 800, drop: 'heart', dropChance: 1 },
      b_clown: { w: 60, h: 60, hp: 70,  speed: 30, color: '#e05a7a', move: 'hover', img: img('clown'),    imgScale: 2.4, gun: { cooldown: 0.8, speed: 170, aim: 'player' }, score: 900, drop: 'heart', dropChance: 1 },
      b_face:  { w: 60, h: 66, hp: 85,  speed: 26, color: '#20222c', move: 'hover', img: img('faceless'), imgScale: 2.4, gun: { cooldown: 0.9, speed: 160, aim: 'spread3' }, score: 1000, drop: 'heart', dropChance: 1 },
      b_storm: { w: 74, h: 56, hp: 100, speed: 22, color: '#8b90a3', move: 'hover', img: img('cloud'),    imgScale: 2.4, gun: { cooldown: 0.7, speed: 180, aim: 'down' }, score: 1200, drop: 'bomb', dropChance: 1 },
      b_clock: { w: 64, h: 64, hp: 120, speed: 20, color: '#e9dcc0', move: 'hover', img: img('clock'),    imgScale: 2.4, gun: { cooldown: 0.9, speed: 160, aim: 'spread3' }, score: 1400, drop: 'heart', dropChance: 1 },
      b_spider:{ w: 70, h: 60, hp: 140, speed: 24, color: '#6a4a8a', move: 'hover', img: img('spider'),   imgScale: 2.6, gun: { cooldown: 0.7, speed: 170, aim: 'player' }, score: 1600, drop: 'bomb', dropChance: 1 },
      b_mirror:{ w: 40, h: 52, hp: 160, speed: 40, color: '#c98f00', move: 'hover', img: img('comb'),     imgScale: 2.0, gun: { cooldown: 0.5, speed: 200, aim: 'player' }, score: 1800, drop: 'heart', dropChance: 1 },
      b_abyss: { w: 72, h: 66, hp: 180, speed: 18, color: '#b8862f', move: 'hover', img: img('eye'),      imgScale: 2.6, gun: { cooldown: 0.6, speed: 180, aim: 'spread3' }, score: 2000, drop: 'bomb', dropChance: 1 },
      b_shadow:{ w: 66, h: 70, hp: 210, speed: 26, color: '#1a1224', move: 'hover', img: img('hand'),     imgScale: 2.6, gun: { cooldown: 0.6, speed: 190, aim: 'player' }, score: 2400, drop: 'heart', dropChance: 1 },
      b_final: { w: 80, h: 80, hp: 280, speed: 20, color: '#3a0a2a', move: 'hover', img: img('nightmare'),imgScale: 1.5, gun: { cooldown: 0.5, speed: 200, aim: 'spread3' }, score: 5000, drop: 'heart', dropChance: 1 },
    },
    bosses: [
      { enemy: 'b_demon',  name: 'Демон сонного паралича', story: 'Он садится на грудь спящих, и они немеют от ужаса.', win: 'Ты расчесала оцепенение — и первый спящий сделал вдох.' },
      { enemy: 'b_clown',  name: 'Клоун из-под кровати',   story: 'Смех в темноте, где прячется самый детский страх.',  win: 'Свет вернулся под кровать. Дети снова спят спокойно.' },
      { enemy: 'b_face',   name: 'Безликий',               story: 'Толпа без лиц шепчет: тебя никто не вспомнит.',      win: 'Ты вернула лицам имена. Никто не забыт.' },
      { enemy: 'b_storm',  name: 'Грозовой Титан',         story: 'Буря, которой нельзя управлять, рвёт небо снов.',    win: 'Гром стих. Над облаками — тишина и покой.' },
      { enemy: 'b_clock',  name: 'Часы, что съели время',  story: 'Стрелки крутятся назад, воруя каждый твой миг.',     win: 'Время снова течёт вперёд — утро стало ближе.' },
      { enemy: 'b_spider', name: 'Королева-Паучиха',       story: 'Липкая сеть ловит всех, кто боится западни.',        win: 'Паутина порвана. Пленники свободны.' },
      { enemy: 'b_mirror', name: 'Зеркальный двойник',     story: 'Из зеркала выходит твой главный страх — ты сама.',   win: 'Ты приняла себя. Двойник растаял в свете.' },
      { enemy: 'b_abyss',  name: 'Бездна, что смотрит',    story: 'Падение без дна и глаз, что не моргает.',            win: 'Ты нашла опору. Падение прекратилось.' },
      { enemy: 'b_shadow', name: 'Король Теней',           story: 'Страх надел корону и назвал себя владыкой снов.',    win: 'Корона пала. Тени — всего лишь тени.' },
      { enemy: 'b_final',  name: 'Сам Кошмар',             story: 'Последняя тьма перед рассветом. Всё зависит от тебя.', win: 'Кошмар рассеян. Мир проснулся отдохнувшим — ты подарила ему рассвет.' },
    ],
  },
};
