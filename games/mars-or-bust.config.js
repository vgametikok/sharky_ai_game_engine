/* «НА МАРС» — вертикальный climber (сцена platformer, режим levels), пародия.
   ЛОР (пародия на тех-магната): Доге-астронавт рвётся к Марсу по бесконечной
   башне из облаков и орбитальных платформ. Пружины-бустеры катапультируют вверх,
   монеты Ð (DOGE) сыплются в карман, а навстречу летят гремлины-шортселлеры и
   старые спутники. Взорванные бустеры лучше обходить. Наверху ждёт флаг Марса.

   Двойной прыжок с самого старта. Спрайты Доге (idle/run/jump) — PixelLab
   (mars-or-bust.px.js), фон/облака/монета/бустер/флаг — процедурные (mars-or-bust.proc.js). */
'use strict';
let px = {}; try { px = Object.assign({}, require('./mars-or-bust.proc.js')); } catch (e) { /* до генерации */ }
try { Object.assign(px, require('./mars-or-bust.px.js')); } catch (e) { /* до упаковки */ }
const img = (n) => (px[n] ? n : undefined);
const seq = (base, n) => { const a = []; for (let i = 0; i < n; i++) a.push(base + '_' + i); return a.filter((k) => px[k]); };
const animIf = (m) => { for (const k in m) if (!m[k].imgs || !m[k].imgs.length) delete m[k]; return Object.keys(m).length ? m : null; };

const GW = 13, GH = 74;
function buildTower() {
  const g = [];
  for (let y = 0; y < GH; y++) g.push(new Array(GW).fill(' '));
  const set = (x, y, ch) => { if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = ch; };
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };

  rect(0, 0, 0, GH - 1, '#');
  rect(GW - 1, 0, GW - 1, GH - 1, '#');
  rect(1, GH - 2, GW - 2, GH - 1, '#');     // стартовая площадка (Земля)
  set(6, GH - 3, 'P');
  set(3, GH - 3, 'C'); set(9, GH - 3, 'C');

  const wave = [2, 4, 6, 8, 6, 4];
  let idx = 0;
  for (let r = GH - 5; r >= 5; r -= 4, idx++) {
    const x = wave[idx % wave.length];
    const isMoving = idx % 5 === 3;
    const isSpring = idx % 7 === 5;
    const isPhase = r < 30 && idx % 3 === 1;
    const isStation = r < 44 && idx % 4 === 0;   // выше — металлические станции

    if (isMoving) {
      set(x + 1, r, 'M');
    } else if (isSpring) {
      rect(x, r, x + 2, r, '=');
      set(x + 1, r, 'v');
    } else if (isPhase) {
      rect(x, r, x + 2, r, 'Z');
    } else if (isStation) {
      rect(x, r, x + 2, r, 'T');            // металлическая станция (сквозная)
    } else {
      rect(x, r, x + 2, r, '-');
    }

    if (idx % 2 === 0) set(x + 1, r - 1, 'C');
    if (idx % 6 === 4) set(x, r - 1, 'S');
    // враги: гремлин-шортселлер пониже, спутник повыше
    if (r < 56 && r > 30 && idx % 4 === 2) set(x + (idx % 2 ? 2 : 0), r - 2, 'f');
    if (r <= 30 && idx % 5 === 2) set(x + (idx % 2 ? 2 : 0), r - 2, 'q');
    // взорванный бустер-опасность в воздухе сбоку от площадки (обходи)
    if (r < 50 && idx % 9 === 7) { const hx = (idx % 2) ? Math.max(1, x - 1) : Math.min(GW - 2, x + 3); set(hx, r, 'x'); }
  }

  // вершина: марсианская площадка + флаг-выход
  rect(4, 3, 8, 3, '=');
  set(5, 2, 'S');
  set(6, 2, 'E');
  set(7, 2, 'C');
  return g.map(row => row.join(''));
}

module.exports = {
  genre: 'platformer',
  meta: { title: 'На Марс' },
  assets: px,
  theme: {
    accent: '#ffb04a',
    bgTop: '#120a2a', bgBottom: '#6fb0e0',
    bgImage: img('mb_bg'),
    hudText: '#ffe3c0',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ПОТЕРЯН В КОСМОСЕ', win: 'МЫ НА МАРСЕ!', again: 'Тап — новый запуск', scoreUnit: 'DOGE', level: 'Ярус' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 13, mode: 'levels',
    physics: { gravity: 1450, moveSpeed: 128, jumpVel: 430, dashSpeed: 300, dashTime: 0.16 },
    saveCheckpoint: true,
    player: {
      w: 0.72, h: 0.92, hp: 3, lives: 3, color: '#e8a94a',
      abilities: { doubleJump: true },
      checkpointHeal: true,
      anims: animIf({
        idle: { imgs: seq('doge_idle', 1), fps: 1, w: 1.4, h: 1.55 },
        run:  { imgs: seq('doge_run', 6), fps: 11, w: 1.4, h: 1.55 },
        jump: { imgs: seq('doge_jump', 4), fps: 12, w: 1.4, h: 1.55 },
        fall: { imgs: seq('doge_fall', 2), fps: 8, w: 1.4, h: 1.55 },
      }),
    },
    enemies: {
      gremlin: { w: 0.82, h: 0.8, hp: 1, dmg: 1, speed: 44, ai: 'fly', fly: true, range: 5, score: 45, color: '#6ab04a', stompable: true,
        anims: animIf({ idle: { imgs: ['gremlin'].filter((k) => px[k]), fps: 1, w: 1.35, h: 1.3 } }) },
      sat: { w: 0.85, h: 0.7, hp: 1, dmg: 1, speed: 38, ai: 'fly', fly: true, range: 6, score: 55, color: '#c0c8d4', stompable: true,
        anims: animIf({ idle: { imgs: ['sat'].filter((k) => px[k]), fps: 1, w: 1.4, h: 1.15 } }) },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#4a5470' },
      '=': { tile: true, solid: true, img: img('mb_panel'), color: '#5a6270' },
      '-': { tile: true, oneWay: true, img: img('mb_cloud'), color: '#e8f0ff' },
      'T': { tile: true, oneWay: true, img: img('mb_panel'), color: '#5a6270' },
      'Z': { tile: true, solid: true, phase: [1.7, 1.0], phaseStagger: 0.3, color: '#a0b0e0' },
      'v': { tile: true, solid: true, spring: 680, color: '#ff9a3d' },
      'x': { tile: true, hazard: 1, img: img('mb_booster'), color: '#e0533d' },
      'P': { player: true },
      'E': { exit: true, img: img('mb_flag'), color: '#e0533d' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 10, img: img('mb_doge'), color: '#ffd24a' },
      'M': { platform: true, dx: 3, dy: 0, speed: 42, wTiles: 3, img: img('mb_panel'), color: '#5a6270' },
      'f': { enemy: 'gremlin' },
      'q': { enemy: 'sat' },
    },
    levels: [{ map: buildTower() }],
  },
};
