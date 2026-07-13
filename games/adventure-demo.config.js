/* Демо волны A: Spelunky (копаемые тайлы, ловушка-стреломёт, маятник, горшки
   для броска, верёвки), Nintendo (кот-костюм, блоки «?» снизу, конвейер,
   ускоритель, звезда за прохождение без урона), метроидвания (карта M,
   fast travel по чекпоинтам, слоу-мо, дверь по флагу босса-нет тут: флаг от способности). */
module.exports = {
  genre: 'platformer',
  meta: { title: 'Adventure Demo' },
  theme: {
    accent: '#ffd75e',
    bgTop: '#2a2440', bgBottom: '#0d0a18',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ПАЛ', win: 'ПРОЙДЕНО!', again: 'Тап — заново', scoreUnit: 'очков', level: 'Зона' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 14, mode: 'levels',
    physics: { gravity: 1500, moveSpeed: 125, jumpVel: 430, slowScale: 0.45, ropeLen: 8 },
    map: true,
    player: {
      w: 0.7, h: 0.95, hp: 4, lives: 3, color: '#ffd75e',
      weapons: ['pick'], ropes: 3,
      abilities: { doubleJump: true, slowmo: true },
    },
    weapons: { pick: { type: 'melee', dmg: 2, range: 1.0, cooldown: 0.35, knockback: 160 } },
    suits: {
      cat: { color: '#ff9a3d', speedMul: 1.3, jumpMul: 1.15, abilities: { wallJump: true } },
    },
    challenges: [
      { type: 'noDamage', score: 300, label: 'Без урона', star: true },
      { type: 'allCoins', score: 200, label: 'Все монеты', star: true },
    ],
    enemies: {
      walker: { w: 0.8, h: 0.8, hp: 2, dmg: 1, speed: 30, ai: 'patrol', stompable: true, score: 20, color: '#d97b4f' },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#5a4a6a' },
      '=': { tile: true, solid: true, color: '#7a5230' },
      'D': { tile: true, solid: true, diggable: true, color: '#8a6a4a' },          // копается киркой
      '?': { tile: true, solid: true, bumpable: true, gives: 'C', once: true, color: '#c8a03a' },  // блок Марио
      '>': { tile: true, solid: true, conveyor: 55, color: '#4a6a8a' },            // конвейер вправо
      '<': { tile: true, solid: true, conveyor: -55, color: '#4a6a8a' },           // конвейер влево
      'Z': { tile: true, solid: true, boost: 1.9, color: '#3aa06a' },              // ускоритель
      'T': { tile: true, solid: true, trap: 'arrow', dir: -1, range: 8, cooldown: 1.6, projSpeed: 210, color: '#6a3a3a' },
      'W': { tile: true, pendulum: true, len: 4, speed: 1.7, r: 0.55, color: '#999' },
      'G': { tile: true, solid: true, ifFlag: 'has_doubleJump', color: '#3a8a5a' },  // мост появляется после способности
      'P': { player: true },
      'E': { exit: true, needsBossDead: false, color: '#7ce07c' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 10, color: '#ffd75e' },
      'H': { pickup: 'heart', color: '#e84a5a' },
      'U': { pickup: 'suit', suit: 'cat', label: 'Кот-костюм!', color: '#ff9a3d' },
      'A': { pickup: 'ability', ability: 'doubleJump', color: '#5cc8ff' },
      'R': { pickup: 'rope', value: 3, color: '#d8b56a' },
      'o': { throwable: true, fragile: true, dmg: 2, color: '#c88a5a' },           // горшок
      'g': { enemy: 'walker' },
    },
    levels: [
      { map: [
        "                                                                        ",
        "            W                        ?  ?                              ",
        "                                                                        ",
        "                 C C                              A                     ",
        "        ==============       ==========        =====                   ",
        "                                                         G G           ",
        "   U                                    C  C                  C        ",
        "  ===        o     g          >>>>    =======    Z Z          ===      ",
        "                                                                        ",
        " P    o   DDDD   T      S        g          C   R    g            S  E ",
        "########################################################################",
        "########################################################################",
      ] },
    ],
  },
};
