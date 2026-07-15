/* «Ввысь» — вертикальный climber на сцене platformer.
   Взбирайся по бесконечной небесной башне: зигзаг-платформы (сквозь них
   прыгаешь снизу вверх), движущиеся платформы, пружины-катапульты, монеты,
   летуны-враги и чекпоинты. Двойной прыжок — с самого старта. Камера едет
   вверх вслед за подъёмом, светлое небо-градиент заполняет экран.
   Цель — добраться до вершины (выход). Башня строится программно. */
'use strict';

const GW = 13, GH = 66;
function buildTower() {
  const g = [];
  for (let y = 0; y < GH; y++) g.push(new Array(GW).fill(' '));
  const set = (x, y, ch) => { if (y >= 0 && y < GH && x >= 0 && x < GW) g[y][x] = ch; };
  const rect = (x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, ch); };

  // стены по бокам + пол-основание
  rect(0, 0, 0, GH - 1, '#');
  rect(GW - 1, 0, GW - 1, GH - 1, '#');
  rect(1, GH - 2, GW - 2, GH - 1, '#');       // земля у основания
  set(6, GH - 3, 'P');                          // старт по центру
  set(3, GH - 3, 'C'); set(9, GH - 3, 'C');

  // треугольная волна по X — платформы зигзагом (сдвиг ≤2 на шаг: всегда допрыгнуть)
  const wave = [2, 4, 6, 8, 6, 4];              // левый край 3-тайловой платформы
  let idx = 0;
  for (let r = GH - 5; r >= 5; r -= 4, idx++) {
    const x = wave[idx % wave.length];
    const isMoving = idx % 5 === 3;             // каждая 5-я — движущаяся
    const isSpring = idx % 7 === 5;             // изредка — пружина-катапульта
    const isPhase = r < 26 && idx % 3 === 1;    // выше — мигающие платформы

    if (isMoving) {
      set(x + 1, r, 'M');                        // движущаяся платформа (несёт игрока)
    } else if (isSpring) {
      rect(x, r, x + 2, r, '=');                 // твёрдая площадка…
      set(x + 1, r, 'v');                        // …с пружиной по центру
    } else if (isPhase) {
      rect(x, r, x + 2, r, 'Z');                 // фазовая (мигает)
    } else {
      rect(x, r, x + 2, r, '-');                 // обычная сквозная платформа
    }

    // монетки над платформой
    if (idx % 2 === 0) set(x + 1, r - 1, 'C');
    // чекпоинты
    if (idx % 6 === 4) set(x, r - 1, 'S');
    // летуны-враги (в средней/верхней части)
    if (r < 50 && idx % 4 === 2) set(x + (idx % 2 ? 2 : 0), r - 2, 'f');
  }

  // финальная площадка + выход на вершине
  rect(4, 3, 8, 3, '=');
  set(5, 2, 'S');
  set(6, 2, 'E');
  set(7, 2, 'C');
  return g.map(row => row.join(''));
}

module.exports = {
  genre: 'platformer',
  meta: { title: 'Ввысь' },
  theme: {
    accent: '#ffd24a',
    bgTop: '#8fd4f0', bgBottom: '#e8b7d8',   // рассветное небо: голубое сверху → розовое снизу
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'СОРВАЛСЯ', win: 'ВЕРШИНА!', again: 'Тап — заново', scoreUnit: 'монет', level: 'Ярус' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 13, mode: 'levels',
    physics: { gravity: 1450, moveSpeed: 128, jumpVel: 430, dashSpeed: 300, dashTime: 0.16 },
    player: {
      w: 0.7, h: 0.92, hp: 3, lives: 3, color: '#ff7a4d',
      abilities: { doubleJump: true },
      checkpointHeal: true,
    },
    enemies: {
      moth: { w: 0.8, h: 0.7, hp: 1, dmg: 1, speed: 42, ai: 'fly', fly: true, range: 5, score: 40, color: '#b06fd1', stompable: true },
    },
    legend: {
      '#': { tile: true, solid: true, color: '#c9a06a' },
      '=': { tile: true, solid: true, color: '#d9b382' },
      '-': { tile: true, oneWay: true, color: '#e8c79a' },
      'Z': { tile: true, solid: true, phase: [1.7, 1.0], phaseStagger: 0.3, color: '#c7b0e0' },
      'v': { tile: true, solid: true, spring: 660, color: '#6fd0a0' },
      '^': { tile: true, hazard: 1, color: '#d85a5a' },
      'P': { player: true },
      'E': { exit: true, color: '#7ce0a0' },
      'S': { checkpoint: true },
      'C': { pickup: 'coin', value: 10, color: '#ffd24a' },
      'M': { platform: true, dx: 3, dy: 0, speed: 42, wTiles: 3, color: '#d9b382' },
      'f': { enemy: 'moth' },
    },
    levels: [{ map: buildTower() }],
  },
};
