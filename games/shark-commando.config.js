/* SHARKY COMMANDO — демонстрационный платформер-шутер движка.
   ЛОР: Крабий Синдикат захватил Коралловый риф. Капитан Шарки — акула-коммандо —
   высаживается на пляж и пробивается к логову Краб-Барона.
   Механика: бластер стреляет одиночными; мимо ПРОЛЕТАЮТ капсулы-бонусы —
   ловишь и на время получаешь супер-оружие (ТРИЗУБ/ШКВАЛ/ГАРПУН-X).
   Боссы: Клешень (мини-босс, конец 2-го уровня) и КРАБ-БАРОН (финал).

   Спрайты: PixelLab (side view, анимации только на восток — движок зеркалит
   через facing). Ассеты подцепляются из shark-commando.assets.js, если файл
   существует (см. tools/pack-commando-assets.ps1); без него — цветные плейсхолдеры. */
let assets = {};
try { assets = require('./shark-commando.assets.js'); } catch (e) { /* плейсхолдеры */ }
const A = Object.keys(assets).length > 0;

// анимации героя/врагов подключаем только когда ассеты реально собраны
function anims(map) { return A ? map : null; }

module.exports = {
  genre: 'platformer',
  meta: { title: 'SHARKY COMMANDO' },
  assets: assets,
  theme: {
    accent: '#57c7ff',
    bgTop: '#8fd4f0', bgBottom: '#2a5f8a',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'МИССИЯ ПРОВАЛЕНА', win: 'РИФ СВОБОДЕН!', again: 'Тап — новая высадка', scoreUnit: 'очков', level: 'Зона' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 14, mode: 'levels',
    physics: { gravity: 1500, moveSpeed: 130, jumpVel: 435 },
    player: {
      w: 0.75, h: 1.05, hp: 5, lives: 3, color: '#57c7ff',
      weapons: ['blaster'],
      abilities: { doubleJump: true },
      anims: anims({
        idle:  { imgs: ['hero_idle_0','hero_idle_1','hero_idle_2','hero_idle_3'], fps: 5,  w: 1.9, h: 1.9 },
        run:   { imgs: ['hero_run_0','hero_run_1','hero_run_2','hero_run_3','hero_run_4','hero_run_5'], fps: 12, w: 1.9, h: 1.9 },
        jump:  { imgs: ['hero_jump_1','hero_jump_2'], fps: 8, w: 1.9, h: 1.9 },
        fall:  { imgs: ['hero_jump_3','hero_jump_4'], fps: 8, w: 1.9, h: 1.9 },
        shoot: { imgs: ['hero_shoot_1','hero_shoot_2'], fps: 14, w: 1.9, h: 1.9 },
      }),
    },
    weapons: {
      blaster: { name: 'БЛАСТЕР', type: 'ranged', dmg: 1, speed: 330, cooldown: 0.34, life: 1.4, size: 3, color: '#7ce0ff' },
      trident: { name: 'ТРИЗУБ', type: 'ranged', dmg: 1, speed: 300, cooldown: 0.3, life: 1.2, count: 3, spread: 0.55, size: 3, color: '#ffd75e' },
      squall:  { name: 'ШКВАЛ', type: 'ranged', dmg: 1, speed: 400, cooldown: 0.09, life: 1.1, auto: true, size: 2.5, color: '#ff9a3d' },
      harpoon: { name: 'ГАРПУН-X', type: 'ranged', dmg: 3, speed: 520, cooldown: 0.5, life: 1.6, pierce: true, size: 4.5, color: '#d99aff' },
    },
    bonusSpawner: {
      every: [8, 14], speed: 58,
      items: [
        { weapon: 'trident', temp: 10, color: '#ffd75e', label: 'T' },
        { weapon: 'squall',  temp: 8,  color: '#ff9a3d', label: 'Ш' },
        { weapon: 'harpoon', temp: 10, color: '#d99aff', label: 'X' },
      ],
    },
    enemies: {
      crab: {
        w: 0.95, h: 0.9, hp: 2, dmg: 1, speed: 32, ai: 'patrol', stompable: true, score: 25,
        color: '#e0604f', drop: 'C', dropChance: 0.35,
        anims: anims({
          idle: { imgs: ['crab_walk_0','crab_walk_1'], fps: 4, w: 1.5, h: 1.5 },
          run:  { imgs: ['crab_walk_0','crab_walk_1','crab_walk_2','crab_walk_3'], fps: 8, w: 1.5, h: 1.5 },
        }),
      },
      hunter: {
        w: 0.95, h: 0.9, hp: 3, dmg: 1, speed: 46, ai: 'chase', range: 8, stompable: true, score: 40,
        color: '#c04a3a', drop: 'C', dropChance: 0.5,
        anims: anims({
          idle: { imgs: ['crab_walk_0','crab_walk_1'], fps: 4, w: 1.5, h: 1.5 },
          run:  { imgs: ['crab_walk_0','crab_walk_1','crab_walk_2','crab_walk_3'], fps: 10, w: 1.5, h: 1.5 },
        }),
      },
      drone: {
        w: 0.85, h: 0.8, hp: 2, dmg: 1, speed: 44, ai: 'chase', fly: true, range: 7, shoots: true,
        shotCooldown: 2.2, projSpeed: 150, score: 45, color: '#4fb8ae',
        anims: anims({ idle: { imgs: ['drone_0'], fps: 1, w: 1.35, h: 1.35 } }),
      },
      pincer: {  // Клешень — мини-босс зоны 2 (увеличенный краб)
        w: 1.7, h: 1.6, hp: 18, dmg: 1, speed: 50, ai: 'chase', range: 12,
        chargeSpeed: 210, projSpeed: 160, jumpVel: 360, score: 300, color: '#d9414d',
        anims: anims({
          idle: { imgs: ['crab_walk_0','crab_walk_1'], fps: 4, w: 2.6, h: 2.6 },
          run:  { imgs: ['crab_walk_0','crab_walk_1','crab_walk_2','crab_walk_3'], fps: 8, w: 2.6, h: 2.6 },
        }),
        boss: {
          name: 'КЛЕШЕНЬ', onDeath: 'openExit',
          phases: [
            { hpPct: 1.0, attacks: ['charge', 'summon'], cooldown: 1.9 },
            { hpPct: 0.5, attacks: ['charge', 'aimed', 'summon'], cooldown: 1.3, speedMul: 1.3 },
          ],
          summon: 'crab', summonMax: 2,
        },
      },
      baron: {   // КРАБ-БАРОН — финальный босс
        w: 2.4, h: 2.2, hp: 34, dmg: 2, speed: 42, ai: 'chase', range: 14,
        chargeSpeed: 240, projSpeed: 175, jumpVel: 400, score: 800, color: '#8a2f3d',
        anims: anims({
          idle: { imgs: ['baron_walk_0','baron_walk_1'], fps: 4, w: 3.6, h: 3.6 },
          run:  { imgs: ['baron_walk_0','baron_walk_1','baron_walk_2','baron_walk_3'], fps: 7, w: 3.6, h: 3.6 },
        }),
        boss: {
          name: 'КРАБ-БАРОН', onDeath: 'win',
          phases: [
            { hpPct: 1.0, attacks: ['charge', 'aimed'], cooldown: 1.7 },
            { hpPct: 0.6, attacks: ['charge', 'spread', 'summon'], cooldown: 1.25, speedMul: 1.25 },
            { hpPct: 0.3, attacks: ['slam', 'spread', 'charge'], cooldown: 0.95, speedMul: 1.5 },
          ],
          summon: 'drone', summonMax: 2,
        },
      },
    },
    npcs: {
      turtle: {
        w: 0.9, h: 0.85, color: '#7fc86f',
        lines: ['Шарки, наконец-то!', 'Крабы всюду…', 'Лови капсулы!', 'В них супер-пушки'],
        anims: anims({ idle: { imgs: ['turtle_0'], fps: 1, w: 1.5, h: 1.5 } }),
      },
    },
    // параллакс: облака (медленно) + тропический горизонт (быстрее)
    bgLayers: A ? [
      { img: 'bg_clouds', factor: 0.12, y: -10 },
      { img: 'bg_day', factor: 0.35, y: 40 },
    ] : [],
    legend: {
      '#': { tile: true, solid: true, color: '#d8b56a', img: A ? 'tile_sand' : undefined },    // песок с травкой
      '*': { tile: true, solid: true, color: '#e0c078', img: A ? 'tile_shells' : undefined },  // песок с ракушками
      '=': { tile: true, solid: true, color: '#68584a', img: A ? 'tile_rock' : undefined },    // скала
      '%': { tile: true, solid: true, color: '#5a6a7a', img: A ? 'tile_metal' : undefined },   // металл базы
      '-': { tile: true, oneWay: true, color: '#b9855a', img: A ? 'tile_plank' : undefined },  // мостик
      '~': { tile: true, solid: true, color: '#d0ad62', img: A ? 'tile_sandf' : undefined },   // песок-заполнение
      '^': { tile: true, hazard: 1, color: '#7a5abf' },     // ядовитые ежи
      'P': { player: true },
      'E': { exit: true, color: '#7ce07c' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 10, color: '#ffd75e' },
      'H': { pickup: 'heart', color: '#e84a5a' },
      'g': { enemy: 'crab' },
      'h': { enemy: 'hunter' },
      'f': { enemy: 'drone' },
      'Q': { enemy: 'pincer' },
      'B': { enemy: 'baron' },
      'N': { npc: 'turtle' },
      'M': { platform: true, dx: 3, dy: 0, speed: 30, wTiles: 2, color: '#8a8f96' },
    },
    levels: [
      // ── Зона 1: ПЛЯЖ ВЫСАДКИ ──
      { map: [
        "                                                                                          ",
        "                                                                                          ",
        "                                                                                          ",
        "                                          C C C                                           ",
        "                                                          f                               ",
        "                          C C            =====                        C C C               ",
        "                         -----                       M                -----               ",
        "               f                                                                          ",
        "                                =                                =                        ",
        "  P    N    C C     g          ==        g      h        S      ==   g    h      C   E   ",
        "##############################################     ######################################",
        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
        "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~",
      ] },
      // ── Зона 2: ПРИБРЕЖНАЯ БАЗА (мини-босс Клешень) ──
      { map: [
        "                                                                                          ",
        "                                                                                          ",
        "                                                                                          ",
        "                  C C C                       f                                           ",
        "                 ------                                    C C                            ",
        "                                  f                       -----                           ",
        "        f                                                                                 ",
        "                       %                                            %                     ",
        "                      %%          g   h        S       h          %%                      ",
        "  P   C C    g       %%%     ^^        ^^^                 g     %%%%      Q       E      ",
        "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
        "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
        "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
        "%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%",
      ] },
      // ── Зона 3: ЛОГОВО БАРОНА (арена) ──
      { map: [
        "=                                    =",
        "=                                    =",
        "=                                    =",
        "=                                    =",
        "=                                    =",
        "=         ----          ----         =",
        "=                                    =",
        "=                                    =",
        "=   H                          H     =",
        "=  P                 B            E  =",
        "======================================",
        "======================================",
        "======================================",
      ] },
    ],
  },
};
