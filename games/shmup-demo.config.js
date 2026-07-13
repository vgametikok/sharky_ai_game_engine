/* Демо шмапа: «Акулёнок против Медуз» — вертикальный скролл вверх (море),
   волны врагов, апгрейды P, бомбы, поляризация Ikaruga, грейз Touhou. */
module.exports = {
  genre: 'shmup',
  meta: { title: 'Shark Shooter' },
  theme: {
    accent: '#7ce0ff',
    bgTop: '#0d2b4a', bgBottom: '#041020',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ПОТОПЛЕН', again: 'Тап — заново', scoreUnit: 'очков', hint: 'Веди пальцем · ✦ бомба · ⇄ цвет' },
  },
  rules: { mode: 'untimed' },
  shmup: {
    scroll: { speed: 55, stars: true },
    player: { w: 26, h: 30, speed: 270, hp: 3, bombs: 3, hitboxR: 3.5 },
    weapon: {
      cooldown: 0.15, shotSpeed: 430,
      levels: [
        { count: 1, spread: 0, dmg: 1 },
        { count: 2, spread: 0.16, dmg: 1 },
        { count: 3, spread: 0.35, dmg: 1 },
        { count: 4, spread: 0.5, dmg: 1 },
        { count: 5, spread: 0.7, dmg: 1.5 },
      ],
    },
    polarity: true,
    colors: ['#7ce0ff', '#ff6b9e'],
    graze: { radius: 17, score: 15 },
    enemies: {
      jelly:  { w: 24, h: 22, hp: 2, speed: 55, color: '#b48cff', move: 'sine', gun: { cooldown: 1.7, speed: 120 }, score: 50, drop: 'up', dropChance: 0.3 },
      crab:   { w: 30, h: 24, hp: 4, speed: 40, color: '#e07050', move: 'straight', gun: { cooldown: 2.1, speed: 140, aim: 'player' }, score: 80, drop: 'up', dropChance: 0.25 },
      ray:    { w: 36, h: 20, hp: 3, speed: 70, color: '#70c8a8', move: 'dive', score: 70, drop: 'bomb', dropChance: 0.15 },
      squid:  { w: 28, h: 30, hp: 6, speed: 30, color: '#e0c050', move: 'hover', gun: { cooldown: 1.5, speed: 130, aim: 'spread3' }, score: 140, drop: 'heart', dropChance: 0.2 },
    },
    waves: [
      { t: 1.0, enemy: 'jelly', n: 4, interval: 0.4 },
      { t: 4.0, enemy: 'jelly', n: 5, interval: 0.35 },
      { t: 7.5, enemy: 'crab', n: 2, interval: 0.8 },
      { t: 10.5, enemy: 'ray', n: 3, interval: 0.5 },
      { t: 13.0, enemy: 'jelly', n: 6, interval: 0.3 },
      { t: 16.0, enemy: 'squid', n: 1 },
      { t: 18.0, enemy: 'crab', n: 3, interval: 0.7 },
      { t: 21.0, enemy: 'ray', n: 4, interval: 0.45 },
      { t: 24.0, enemy: 'squid', n: 2, interval: 1.2 },
    ],
    loop: { hpMul: 1.35, rateMul: 0.92 },
  },
};
