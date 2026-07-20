/* «ТАРИФ-МЭН» — сатирический раннер (сцена platformer, режим runner).
   ЛОР (пародия): золотоволосый магнат в красном галстуке несётся по сцене
   бесконечного митинга, раздаёт «тарифы» направо и налево, собирает золото и
   отбивается от бюрократов, дронов слежки и главарей «глубинного государства».
   Прыгай через урны с бюллетенями, подкатывайся под красную ленту, метай твиты.

   Пародия на публичную фигуру-политика — карикатура, а не реальное лицо.
   Спрайты героя (бег/прыжок/подкат/бросок) и врагов — PixelLab (tariff-man.px.js),
   фон/тайлы/снаряд — процедурные (tariff-man.proc.js).
   Управление: тап — прыжок (двойной), ▼/свайп-вниз — подкат, ✕ — твит. */
'use strict';
let px = {}; try { px = Object.assign({}, require('./tariff-man.proc.js')); } catch (e) { /* до генерации */ }
try { Object.assign(px, require('./tariff-man.px.js')); } catch (e) { /* до упаковки */ }
const img = (n) => (px[n] ? n : undefined);
const seq = (base, n) => { const a = []; for (let i = 0; i < n; i++) a.push(base + '_' + i); return a.filter((k) => px[k]); };
const animIf = (m) => { for (const k in m) if (!m[k].imgs || !m[k].imgs.length) delete m[k]; return Object.keys(m).length ? m : null; };

module.exports = {
  genre: 'platformer',
  meta: { title: 'Тариф-Мэн' },
  assets: px,
  theme: {
    accent: '#ffd24a',
    bgTop: '#2a1c44', bgBottom: '#140c1e',
    bgImage: img('tm_bg'),
    hudText: '#ffe9b8',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: {
      over: 'МИТИНГ ОКОНЧЕН…',
      again: 'Тап — новый срок',
      scoreUnit: 'очков',
      hint: 'Тап — прыжок · ▼ подкат · ✕ твит',
      diffTitle: 'ВЫБЕРИ КАМПАНИЮ',
    },
  },
  rules: { mode: 'untimed' },
  controls: {
    scheme: null,
    buttons: [
      { glyph: '▼', action: 'down', x: 0.86, y: 0.88, r: 0.062 },
      { glyph: '✕', action: 'attack', x: 0.68, y: 0.88, r: 0.062 },
    ],
  },
  platformer: {
    tileSize: 16, viewTilesX: 15, mode: 'runner',
    physics: { gravity: 1600, jumpVel: 452, moveSpeed: 132 },
    bgLayers: [
      { img: img('tm_para'), factor: 0.18, y: 96 },
      { img: img('tm_para'), factor: 0.42, y: 132 },
    ],
    player: {
      w: 0.72, h: 0.96, hp: 3, lives: 1, color: '#e8b04a',
      weapons: ['tweet'],
      abilities: { doubleJump: true },
      anims: animIf({
        idle:  { imgs: seq('hero_idle', 1), fps: 1, w: 1.4, h: 1.6 },
        run:   { imgs: seq('hero_run', 6), fps: 12, w: 1.4, h: 1.6 },
        jump:  { imgs: seq('hero_jump', 4), fps: 14, w: 1.4, h: 1.6 },
        fall:  { imgs: seq('hero_fall', 2), fps: 8, w: 1.4, h: 1.6 },
        slide: { imgs: seq('hero_slide', 2), fps: 8, w: 1.6, h: 1.05 },
        shoot: { imgs: seq('hero_shoot', 2), fps: 12, w: 1.4, h: 1.6 },
      }),
    },
    weapons: {
      tweet: { name: 'Твит', type: 'ranged', dmg: 1, speed: 440, cooldown: 0.40, life: 0.95, color: '#7ce0ff', img: img('tm_tweet'), size: 7 },
    },
    enemies: {
      bureaucrat: { w: 0.8, h: 0.95, hp: 1, dmg: 1, speed: 26, ai: 'patrol', stompable: true, score: 40, color: '#7a8090',
        drop: 'C', dropChance: 0.6,
        anims: animIf({ idle: { imgs: ['bureaucrat'].filter((k) => px[k]), fps: 1, w: 1.35, h: 1.55 }, run: { imgs: ['bureaucrat'].filter((k) => px[k]), fps: 1, w: 1.35, h: 1.55 } }) },
      drone: { w: 0.8, h: 0.6, hp: 1, dmg: 1, speed: 48, ai: 'fly', fly: true, range: 6, score: 55, color: '#3a3a44', stompable: true,
        anims: animIf({ idle: { imgs: ['drone'].filter((k) => px[k]), fps: 1, w: 1.3, h: 1.0 } }) },
    },
    legend: {
      '#': { tile: true, solid: true, img: img('tm_stage'), color: '#5a2028' },   // поверхность сцены (бежим)
      'p': { tile: true, solid: true, color: '#3a1820' },                          // тело сцены (стена)
      'X': { tile: true, solid: true, img: img('tm_crate'), color: '#3a4a6a' },    // урна с бюллетенями (прыжок)
      'b': { tile: true, hazardHigh: 1, img: img('tm_tape'), color: '#d0322e' },   // красная лента (подкат)
      'C': { pickup: 'coin', value: 10, img: img('tm_coin'), color: '#ffd24a' },
      'B': { pickup: 'boost', dur: 3, color: '#7ce07c' },
      'H': { pickup: 'heart', color: '#ff6b7e' },
      'g': { enemy: 'bureaucrat' },
      'f': { enemy: 'drone' },
    },
    runner: {
      speed: 130, ramp: 4, maxSpeed: 300,
      difficulties: [
        { label: 'ПРАЙМЕРИЗ', desc: 'Разминка · очки ×1', color: '#8ee06a',
          mul: { speed: 0.85, ramp: 0.75, max: 0.82, score: 1, bossEvery: 1.25, bossHp: 0.75 } },
        { label: 'ГОНКА', desc: 'Как задумано · очки ×1.5', color: '#ffd75e',
          mul: { speed: 1, ramp: 1, max: 1, score: 1.5, bossEvery: 1, bossHp: 1 } },
        { label: 'ЛАНДСЛАЙД', desc: 'Без тормозов · очки ×2', color: '#ff6b5e',
          mul: { speed: 1.15, ramp: 1.35, max: 1.12, score: 2, bossEvery: 0.8, bossHp: 1.3 } },
      ],
      bosses: {
        every: 330, hpMul: 1.45,
        list: [
          { img: img('boss_truck'), name: 'ФЕЙК-НЬЮС ФУРГОН', hp: 8, w: 4.8, h: 4.2, y: 0.30, amp: 0.18, period: 2.6,
            score: 500, dropImg: img('tm_coin'),
            throw: { cd: [1.5, 2.3], flight: 0.9, grav: 800, boomR: 1.1, dmg: 1, img: img('tm_tweet'), color: '#7ce0ff' } },
          { img: img('boss_mech'), name: 'МЕХ-БЮРОКРАТ', hp: 11, w: 4.6, h: 4.8, y: 0.26, amp: 0.2, period: 3.0,
            score: 700, dropImg: img('tm_coin'),
            throw: { cd: [1.2, 1.9], flight: 0.8, grav: 860, boomR: 1.15, dmg: 1, img: img('tm_crate'), color: '#c0c0d0' } },
          { img: img('boss_blimp'), name: 'ДИРИЖАБЛЬ ДЕФИЦИТА', hp: 14, w: 5.2, h: 4.6, y: 0.16, amp: 1.4, period: 1.9,
            score: 900, dropImg: img('tm_coin'),
            throw: { cd: [0.95, 1.6], flight: 0.75, grav: 900, boomR: 1.0, dmg: 1, color: '#e8e0d0' } },
          { img: img('boss_heli'), name: 'ВЕРТОЛЁТ «ГЛУБИНА»', hp: 18, w: 5.0, h: 4.4, y: 0.22, amp: 0.25, period: 3.2,
            score: 1300, dropImg: img('tm_coin'),
            throw: { cd: [0.8, 1.3], flight: 0.85, grav: 840, boomR: 1.3, dmg: 1, img: img('tm_tweet'), color: '#ff5a3a' } },
        ],
      },
      chunks: [
        // 1. СТАРТ: ровная сцена с монетами
        { map: [
          "                ", "                ", "                ", "                ",
          "                ", "     C  C  C    ", "                ", "                ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ] },
        // 2. урна-препятствие (прыжок)
        { map: [
          "                ", "                ", "                ", "         C      ",
          "        C C     ", "                ", "         X      ", "         X      ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ] },
        // 3. разрыв сцены (перепрыгни пропасть)
        { map: [
          "                ", "                ", "                ", "                ",
          "       C C      ", "                ", "                ", "                ",
          "#####      #####", "ppppp      ppppp", "ppppp      ppppp", "ppppp      ppppp",
        ] },
        // 4. КРАСНАЯ ЛЕНТА — только подкат!
        { map: [
          "                ", "                ", "                ", "                ",
          "          C     ", "                ", "   C   b        ", "                ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ], minM: 16 },
        // 5. бюрократ на дороге + монеты
        { map: [
          "                ", "                ", "                ", "                ",
          "     C      C   ", "                ", "        g       ", "                ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ], minM: 26 },
        // 6. дрон над разрывом
        { map: [
          "                ", "                ", "       f        ", "                ",
          "    C           ", "                ", "                ", "                ",
          "#####     ######", "ppppp     ppppp ", "ppppp     ppppp ", "ppppp     ppppp ",
        ], minM: 34 },
        // 7. ступень вверх на трибуну + урна
        { map: [
          "                ", "                ", "                ", "            C   ",
          "                ", "          X     ", "     C    ######", "          pppppp",
          "######    pppppp", "pppppp    pppppp", "pppppp    pppppp", "pppppp    pppppp",
        ], minM: 44 },
        // 8. лента + сразу урна (подкат, затем прыжок)
        { map: [
          "                ", "                ", "                ", "                ",
          "   C            ", "     b          ", "          X     ", "          X     ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ], minM: 56 },
        // 9. двойной разрыв с монетой-приманкой
        { map: [
          "                ", "                ", "                ", "        C       ",
          "                ", "                ", "                ", "                ",
          "####     #######", "pppp     ppppppp", "pppp     ppppppp", "pppp     ppppppp",
        ], minM: 70 },
        // 10. бюрократ за урной + буст
        { map: [
          "                ", "                ", "                ", "   B            ",
          "                ", "      XX        ", "  C   XX  g   C ", "                ",
          "################", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ], minM: 84 },
        // 11. лента над ступенью + дрон
        { map: [
          "                ", "                ", "        f       ", "                ",
          "        H       ", "     b          ", "     ###########", "     ppppppppppp",
          "#####ppppppppppp", "pppppppppppppppp", "pppppppppppppppp", "pppppppppppppppp",
        ], minM: 100 },
        // 12. финальная полоса препятствий
        { map: [
          "                ", "                ", "                ", "     C     C    ",
          "                ", "   b     X      ", "         X   g  ", "                ",
          "####    ########", "pppp    pppppppp", "pppp    pppppppp", "pppp    pppppppp",
        ], minM: 120 },
      ],
    },
  },
};
