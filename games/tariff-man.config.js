/* «TARIFF MAN» — сатирический ГРАВИ-ФЛИП раннер (сцена platformer, режим runner
   + abilities.gravityFlip). Отличие от прочих раннеров: НЕ прыжок/подкат, а
   ПЕРЕВОРОТ ГРАВИТАЦИИ по тапу — бежишь то по полу, то по потолку сцены митинга,
   уворачиваясь от «красной ленты» на встречной поверхности. ✕ — метать твиты.
   Пол и потолок непрерывны → путь всегда проходим (лента только на одной стороне).
   Пародия-карикатура. Ассеты героя/врагов/боссов — PixelLab (tariff-man.px.js),
   фон/тайлы/снаряд — процедурные (tariff-man.proc.js). */
'use strict';
let px = {}; try { px = Object.assign({}, require('./tariff-man.proc.js')); } catch (e) {}
try { Object.assign(px, require('./tariff-man.px.js')); } catch (e) {}
const img = (n) => (px[n] ? n : undefined);
const seq = (base, n) => { const a = []; for (let i = 0; i < n; i++) a.push(base + '_' + i); return a.filter((k) => px[k]); };
const animIf = (m) => { for (const k in m) if (!m[k].imgs || !m[k].imgs.length) delete m[k]; return Object.keys(m).length ? m : null; };

module.exports = {
  genre: 'platformer',
  meta: { title: 'Tariff Man' },
  assets: px,
  theme: {
    accent: '#ffd24a',
    bgTop: '#2a1c44', bgBottom: '#140c1e',
    bgImage: img('tm_bg'),
    hudText: '#ffe9b8',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: {
      over: 'RALLY OVER…',
      again: 'Tap for another term',
      scoreUnit: 'points',
      hint: 'Tap = FLIP gravity · ✕ tweet',
      diffTitle: 'PICK YOUR CAMPAIGN',
      defeated: 'down', scoreWord: 'score', distUnit: 'm',
    },
  },
  rules: { mode: 'untimed' },
  controls: {
    scheme: null,   // тап (не по кнопке) → gravityFlip; ✕ — твит
    buttons: [
      { glyph: '✕', action: 'attack', x: 0.86, y: 0.88, r: 0.066 },
    ],
  },
  platformer: {
    tileSize: 16, viewTilesX: 15, mode: 'runner',
    physics: { gravity: 1500, moveSpeed: 118, jumpVel: 452 },
    bgLayers: [
      { img: img('tm_para'), factor: 0.18, y: 96 },
      { img: img('tm_para'), factor: 0.42, y: 132 },
    ],
    player: {
      w: 0.72, h: 0.9, hp: 3, lives: 1, color: '#e8b04a',
      weapons: ['tweet'],
      abilities: { gravityFlip: true },   // тап = переворот гравитации (VVVVVV)
      anims: animIf({
        idle:  { imgs: seq('hero_idle', 1), fps: 1, w: 1.4, h: 1.6 },
        run:   { imgs: seq('hero_run', 6), fps: 12, w: 1.4, h: 1.6 },
        jump:  { imgs: seq('hero_jump', 4), fps: 14, w: 1.4, h: 1.6 },
        fall:  { imgs: seq('hero_fall', 2), fps: 8, w: 1.4, h: 1.6 },
        shoot: { imgs: seq('hero_shoot', 2), fps: 12, w: 1.4, h: 1.6 },
      }),
    },
    weapons: {
      tweet: { name: 'Tweet', type: 'ranged', dmg: 1, speed: 440, cooldown: 0.40, life: 0.95, color: '#7ce0ff', img: img('tm_tweet'), size: 7 },
    },
    enemies: {
      drone: { w: 0.8, h: 0.6, hp: 1, dmg: 1, speed: 44, ai: 'fly', fly: true, range: 6, score: 55, color: '#3a3a44', stompable: true,
        anims: animIf({ idle: { imgs: ['drone'].filter((k) => px[k]), fps: 1, w: 1.3, h: 1.0 } }) },
    },
    legend: {
      '#': { tile: true, solid: true, img: img('tm_stage'), color: '#5a2028' },   // пол/потолок сцены
      '^': { tile: true, hazard: 1, img: img('tm_tape'), color: '#d0322e' },       // красная лента (урон на своей поверхности)
      'C': { pickup: 'coin', value: 10, img: img('tm_coin'), color: '#ffd24a' },
      'B': { pickup: 'boost', dur: 3, color: '#7ce07c', label: '⚡ Boost!' },
      'H': { pickup: 'heart', color: '#ff6b7e' },
      'f': { enemy: 'drone' },
    },
    runner: {
      speed: 108, ramp: 2.4, maxSpeed: 196,
      difficulties: [
        { label: 'PRIMARIES', desc: 'Warm-up · score ×1', color: '#8ee06a',
          mul: { speed: 0.85, ramp: 0.75, max: 0.82, score: 1, bossEvery: 1.25, bossHp: 0.75 } },
        { label: 'RACE', desc: 'As intended · score ×1.5', color: '#ffd75e',
          mul: { speed: 1, ramp: 1, max: 1, score: 1.5, bossEvery: 1, bossHp: 1 } },
        { label: 'LANDSLIDE', desc: 'No brakes · score ×2', color: '#ff6b5e',
          mul: { speed: 1.15, ramp: 1.3, max: 1.12, score: 2, bossEvery: 0.8, bossHp: 1.3 } },
      ],
      bosses: {
        every: 340, hpMul: 1.45,
        list: [
          { img: img('boss_truck'), name: 'FAKE-NEWS VAN', hp: 8, w: 4.8, h: 4.2, y: 0.30, amp: 0.18, period: 2.6,
            score: 500, dropImg: img('tm_coin'),
            throw: { cd: [1.5, 2.3], flight: 0.9, grav: 800, boomR: 1.1, dmg: 1, img: img('tm_tweet'), color: '#7ce0ff' } },
          { img: img('boss_mech'), name: 'RED-TAPE MECH', hp: 11, w: 4.6, h: 4.8, y: 0.26, amp: 0.2, period: 3.0,
            score: 700, dropImg: img('tm_coin'),
            throw: { cd: [1.2, 1.9], flight: 0.8, grav: 860, boomR: 1.15, dmg: 1, img: img('tm_crate'), color: '#c0c0d0' } },
          { img: img('boss_blimp'), name: 'DEFICIT BLIMP', hp: 14, w: 5.2, h: 4.6, y: 0.16, amp: 1.4, period: 1.9,
            score: 900, dropImg: img('tm_coin'),
            throw: { cd: [0.95, 1.6], flight: 0.75, grav: 900, boomR: 1.0, dmg: 1, color: '#e8e0d0' } },
          { img: img('boss_heli'), name: 'DEEP-STATE CHOPPER', hp: 18, w: 5.0, h: 4.4, y: 0.22, amp: 0.25, period: 3.2,
            score: 1300, dropImg: img('tm_coin'),
            throw: { cd: [0.8, 1.3], flight: 0.85, grav: 840, boomR: 1.3, dmg: 1, img: img('tm_tweet'), color: '#ff5a3a' } },
        ],
      },
      // ПРАВИЛО ПРОХОДИМОСТИ: пол (row11) и потолок (row0) непрерывны; лента '^' в
      // каждом чанке только у ОДНОЙ поверхности и только в СЕРЕДИНЕ (кол. 5–11),
      // края (кол. 0–4 и 12–15) чисты на обеих сторонах → всегда есть время флипнуть
      // на свободную поверхность. Дроны — в вертикальной середине (обходятся/сбиваются).
      chunks: [
        { map: [   // старт — чисто, монеты
          "################", "                ", "                ", "                ",
          "     C  C  C    ", "                ", "                ", "                ",
          "                ", "                ", "                ", "################",
        ] },
        { map: [   // лента на ПОЛУ (центр) → флип на потолок
          "################", "                ", "                ", "         C      ",
          "                ", "                ", "                ", "                ",
          "                ", "                ", "     ^^^^       ", "################",
        ], minM: 14 },
        { map: [   // лента на ПОТОЛКЕ (центр) → будь на полу
          "################", "     ^^^^       ", "                ", "                ",
          "                ", "        C       ", "                ", "                ",
          "                ", "                ", "                ", "################",
        ], minM: 28 },
        { map: [   // пол (центр) + монеты
          "################", "                ", "                ", "     C     C    ",
          "                ", "                ", "                ", "                ",
          "                ", "                ", "      ^^^^      ", "################",
        ], minM: 44 },
        { map: [   // потолок (центр) + дрон посередине
          "################", "      ^^^^      ", "                ", "                ",
          "                ", "       f        ", "                ", "                ",
          "                ", "                ", "                ", "################",
        ], minM: 60 },
        { map: [   // пол — широкая лента (держись потолка весь чанк)
          "################", "                ", "        C       ", "                ",
          "                ", "                ", "                ", "                ",
          "                ", "                ", "    ^^^^^^      ", "################",
        ], minM: 78 },
        { map: [   // потолок — широкая лента (держись пола)
          "################", "    ^^^^^^      ", "                ", "                ",
          "                ", "                ", "        C       ", "                ",
          "                ", "                ", "                ", "################",
        ], minM: 96 },
        { map: [   // пол (центр) + буст в середине
          "################", "                ", "                ", "                ",
          "        B       ", "                ", "                ", "                ",
          "                ", "                ", "     ^^^^       ", "################",
        ], minM: 114 },
        { map: [   // потолок (центр) + дрон + монета
          "################", "       ^^^^     ", "                ", "                ",
          "     C          ", "        f       ", "                ", "                ",
          "                ", "                ", "                ", "################",
        ], minM: 132 },
        { map: [   // пол (центр), финал-ритм + монеты
          "################", "                ", "                ", "     C     C    ",
          "                ", "                ", "                ", "                ",
          "                ", "                ", "      ^^^^^     ", "################",
        ], minM: 152 },
      ],
    },
  },
};
