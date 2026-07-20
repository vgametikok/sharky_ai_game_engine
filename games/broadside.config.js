/* «БОРТОВОЙ ЗАЛП» — вертикальный шмап-кампания на воде (сцена shmup, режим levels).
   ЛОР: капитан Мару выходит в проклятые воды Семи Печатей за картой Кровавой Луны.
   Навстречу — вражеские шлюпы, брандеры, канонерки и морские твари, а каждые пять
   рубежей путь стережёт капитан-легенда. 30 рубежей, босс каждые 5, прогресс копится.

   Единственная морская игра набора. Спрайты: PixelLab (корабль игрока, 8 врагов,
   боссы) из broadside.px.js + процедурный фон/ядро из broadside.proc.js. */
'use strict';
let px = {}; try { px = Object.assign({}, require('./broadside.proc.js')); } catch (e) { /* до генерации */ }
try { Object.assign(px, require('./broadside.px.js')); } catch (e) { /* до упаковки PixelLab */ }
const assets = px;
const img = (n) => (assets[n] ? n : undefined);

module.exports = {
  genre: 'shmup',
  meta: { title: 'Бортовой Залп' },
  assets: assets,
  theme: {
    accent: '#ffcf6a',
    bgTop: '#0e1430', bgBottom: '#05070f',
    bgImage: img('bs_sea'),
    font: "'Segoe UI', system-ui, sans-serif",
    labels: {
      over: 'КОРАБЛЬ ПОШЁЛ КО ДНУ',
      win: 'КАРТА КРОВАВОЙ ЛУНЫ ТВОЯ!',
      again: 'Тап — снова в поход',
      scoreUnit: 'дублонов',
      hint: 'Веди пальцем · ✦ картечь очищает воду',
    },
  },
  rules: { mode: 'untimed' },
  shmup: {
    mode: 'levels', levelCount: 30, bossEvery: 5,
    scroll: { speed: 46, stars: true },
    player: { w: 30, h: 40, speed: 300, hp: 3, bombs: 3, hitboxR: 4, color: '#ffcf6a', img: img('ship'), imgScale: 1.5 },
    weapon: {
      cooldown: 0.15, shotSpeed: 470, bulletImg: img('bs_ball'), bulletSize: 16,
      levels: [
        { count: 1, spread: 0, dmg: 1 },
        { count: 2, spread: 0.12, dmg: 1 },
        { count: 3, spread: 0.26, dmg: 1 },
        { count: 4, spread: 0.40, dmg: 1.5 },
        { count: 5, spread: 0.56, dmg: 2 },
      ],
    },
    intro: ['БОРТОВОЙ ЗАЛП',
      'Проклятые воды Семи Печатей ведут к карте Кровавой Луны. Дай залп — и держи курс на легенду.'],
    // ── 8 врагов-рядовых ──
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
      { enemy: 'b_capt',      name: 'КАПИТАН ЧЁРНЫЙ УС',   story: 'Его фрегат не знал промаха тридцать лет. Первая печать за ним.',       win: 'Чёрный Ус отдал штурвал. Первая печать сломана.' },
      { enemy: 'b_ghostship', name: 'КОРАБЛЬ-ПРИЗРАК',      story: 'Команда мертвецов гребёт сквозь туман и не тонет.',                    win: 'Туман рассеялся, призраки обрели покой на дне.' },
      { enemy: 'b_ironclad',  name: 'БРОНЕНОСЕЦ «УТЮГ»',     story: 'Железная громада не берёт ни ядро, ни абордаж. Только упорство.',       win: 'Швы брони разошлись — «Утюг» затонул в кипящей пене.' },
      { enemy: 'b_serpking',  name: 'ЦАРЬ-ЗМЕЙ ГЛУБИН',      story: 'Морской змей длиной в милю обвивает корабли и тянет вниз.',             win: 'Кольца разжались. Змей ушёл в бездну зализывать раны.' },
      { enemy: 'b_kraken',    name: 'КРАКЕН',                story: 'Восемь щупалец подняли из пучины саму тьму. Держись, капитан.',         win: 'Кракен отступил в глубину. Шестая печать пала.' },
      { enemy: 'b_leviathan', name: 'ЛЕВИАФАН КРОВАВОЙ ЛУНЫ', story: 'Последний страж карты. Тот, кого рисуют на краю всех карт.',           win: 'Левиафан низвергнут. Карта Кровавой Луны — в твоих руках, капитан!' },
    ],
  },
};
