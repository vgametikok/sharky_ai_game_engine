/* Демо новых механик платформера (плейсхолдеры, без спрайтов):
   граунд-паунд (вниз в полёте) + ломаемые блоки, крюк-кошка (кольца, кнопка ⚓/V),
   пружины, фазовые платформы, стелс-часовой (конус взгляда + слух на бег),
   дождь+ветер, цикл дня/ночи (30с), крафт (2 ракушки + 1 жемчуг = сердце),
   челленджи уровня, roguelite-выбор апгрейда после смерти, комбо-множитель. */
module.exports = {
  genre: 'platformer',
  meta: { title: 'Mechanics Demo' },
  theme: {
    accent: '#7ce0ff',
    bgTop: '#24365e', bgBottom: '#0c1425',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ПАЛ В БОЮ', win: 'ПОЛИГОН ПРОЙДЕН!', again: 'Тап — заново', scoreUnit: 'очков', level: 'Сектор' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 14, mode: 'levels',
    physics: { gravity: 1500, moveSpeed: 125, jumpVel: 430, poundSpeed: 640, poundRadius: 2.6, poundDmg: 2, grappleRange: 8, grappleSpeed: 400 },
    player: {
      w: 0.7, h: 0.95, hp: 4, lives: 3, color: '#7ce0ff',
      weapons: ['sword'],
      abilities: { doubleJump: true, groundPound: true, grapple: true, dash: true },
      dashIFrames: true,
    },
    weapons: { sword: { type: 'melee', dmg: 2, range: 1.1, cooldown: 0.35, knockback: 170 } },
    combo: { step: 0.5, max: 4, decay: 6 },
    weather: { wind: 26, rain: true },
    dayNight: { period: 30, nightSpeedMul: 1.6, nightRangeMul: 1.7, maxDark: 0.5 },
    craft: {
      resources: { shell: { color: '#ffb8d0' }, pearl: { color: '#e8f4ff' } },
      recipes: [
        { need: { shell: 2, pearl: 1 }, give: { hp: 2 }, label: 'Эликсир: +2 ❤' },
        { need: { pearl: 2 }, give: { score: 300 }, label: 'Ожерелье: +300' },
      ],
    },
    roguelite: {
      onDeath: true, title: 'Выбери усиление',
      choices: [
        { label: 'Клинок +50%', icon: '⚔', dmgMul: 1.5 },
        { label: 'Скорость +25%', icon: '👟', speedMul: 1.25 },
        { label: 'Сердце +1', icon: '❤', maxHp: 1 },
        { label: 'Жизнь +1', icon: '✚', life: 1 },
      ],
    },
    challenges: [
      { type: 'noDamage', score: 250, label: 'Без урона' },
      { type: 'allCoins', score: 200, label: 'Все монеты' },
      { type: 'fast', time: 75, score: 150, label: 'Быстро' },
    ],
    enemies: {
      walker: { w: 0.8, h: 0.8, hp: 2, dmg: 1, speed: 30, ai: 'patrol', stompable: true, score: 20, color: '#d97b4f' },
      sentry: { w: 0.9, h: 0.9, hp: 3, dmg: 1, speed: 55, ai: 'chase', vision: 6, hearing: 4, stompable: true, score: 50, color: '#b05f9e' },
      flyer: { w: 0.8, h: 0.7, hp: 1, dmg: 1, speed: 45, ai: 'chase', fly: true, range: 6, score: 30, color: '#8e6fd1' },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#4a7d3a' },
      '=': { tile: true, solid: true, color: '#7a5230' },
      '-': { tile: true, oneWay: true, color: '#c9a86a' },
      '^': { tile: true, hazard: 1, color: '#c94040' },
      'F': { tile: true, solid: true, phase: [1.6, 1.2], phaseStagger: 0.7, color: '#6fc2c8' },  // фазовая
      'J': { tile: true, solid: true, spring: 620, color: '#e8c14b' },                            // пружина
      'X': { tile: true, solid: true, breakable: true, color: '#9a6a4a' },                        // ломается паундом
      'O': { tile: true, grapple: true, color: '#ffe9a0' },                                       // кольцо крюка
      'P': { player: true },
      'E': { exit: true, color: '#7ce07c' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 10, color: '#ffd75e' },
      'H': { pickup: 'heart', color: '#e84a5a' },
      'r': { pickup: 'resource', res: 'shell', color: '#ffb8d0' },
      'R': { pickup: 'resource', res: 'pearl', color: '#e8f4ff' },
      'g': { enemy: 'walker' },
      't': { enemy: 'sentry' },
      'f': { enemy: 'flyer' },
    },
    levels: [
      { map: [
        "                                                                                ",
        "                O                    O               O                          ",
        "                                                                                ",
        "                         C                  C C                                 ",
        "          C                                                     R               ",
        "         ===         F F F          =====          J          =====             ",
        "                                                                                ",
        "   r            R          r                  C                       C        ",
        "  ---   J      ===        ---     t          ===        g       XX             ",
        " P         C        C          f                    r          XXXX   S   E    ",
        "################################################################################",
        "################################################################################",
        "################################################################################",
      ] },
    ],
  },
};
