/* Демо управления: ВИРТУАЛЬНЫЙ ДЖОЙСТИК (зажми слева и веди) +
   программируемые кнопки справа (прыжок/огонь/дэш). */
const level = [
  "                                        ",
  "                                        ",
  "         C C           g                ",
  "        =====       =======             ",
  "   C                            C  C    ",
  "  ===       g            s    ======    ",
  "                                        ",
  " P        C   C      g          H    E  ",
  "########################################",
  "########################################",
];
module.exports = {
  genre: 'platformer',
  meta: { title: 'CTL: Tap Action' },
  theme: {
    accent: '#7ce0ff', bgTop: '#24365e', bgBottom: '#0c1425',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ПАЛ', win: 'ПРОЙДЕНО!', again: 'Тап — заново', scoreUnit: 'очков' },
  },
  rules: { mode: 'untimed' },
  controls: {
    scheme: 'tapaction',        // одно действие на тап всего экрана
    tapAction: 'jump',
  },
  platformer: {
    tileSize: 16, viewTilesX: 14, mode: 'levels',
    player: { w: 0.7, h: 0.95, hp: 3, lives: 3, color: '#7ce0ff', weapons: ['gun'], abilities: { dash: true, doubleJump: true }, dashIFrames: true },
    weapons: { gun: { type: 'ranged', dmg: 1, speed: 300, cooldown: 0.35, color: '#ffe08a' } },
    enemies: {
      g: { w: 0.8, h: 0.8, hp: 2, dmg: 1, speed: 30, ai: 'patrol', stompable: true, score: 20, color: '#d97b4f' },
      s: { w: 0.9, h: 0.9, hp: 2, dmg: 1, ai: 'turret', range: 8, shotCooldown: 2, projSpeed: 150, score: 40, color: '#5a8f5a' },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#4a7d3a' },
      '=': { tile: true, solid: true, color: '#7a5230' },
      'P': { player: true }, 'E': { exit: true, needsBossDead: false, color: '#7ce07c' },
      'C': { pickup: 'coin', value: 10, color: '#ffd75e' }, 'H': { pickup: 'heart', color: '#e84a5a' },
      'g': { enemy: 'g' }, 's': { enemy: 's' },
    },
    levels: [{ map: level }],
  },
};
