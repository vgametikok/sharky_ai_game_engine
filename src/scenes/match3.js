/* ============================================================
   СЦЕНА: match-3 (match3.js)
   ------------------------------------------------------------
   Чистая механика «три в ряд», без инфраструктуры — её даёт ядро
   (core.js): canvas, цикл, ввод, звук, частицы, HUD, таймер,
   экран Game Over и протокол Sharky.

   Что сцена берёт из CONFIG.rules:
     cols, rows        — размер поля (по умолчанию 7×8)
     minRun            — длина совпадения (3)
     clearDur          — длительность анимации схлопывания, с (0.18)
     scorePerTile      — очков за тайл (10)
   и CONFIG.tileNames / CONFIG.assets — список типов тайлов (картинки).

   Это первый модуль универсального движка. Новый match-3 = новый
   CONFIG (другие картинки/цвета/числа), код сцены не меняется.
   ============================================================ */
Engine.register('match3', function (engine, cfg) {
  'use strict';
  const R = cfg.rules || {};
  const COLS = R.cols || 7, ROWS = R.rows || 8;
  const NAMES = cfg.tileNames || Object.keys(cfg.assets || {});
  const N = NAMES.length;
  const MINRUN = R.minRun || 3;
  const CLEAR_DUR = R.clearDur || 0.18;
  const SCORE = R.scorePerTile || 10;

  let grid = [];
  let cell = 40, originX = 0, originY = 0;
  let phase = 'idle';                 // idle | swap | swapback | clear | fall
  let multiplier = 1;
  let selCell = null, downCell = null;
  let lastSwap = null, matchedCells = [], clearTimer = 0, clearProg = 0;

  // ── геометрия ──
  function cellX(c) { return originX + c * cell; }
  function cellY(r) { return originY + r * cell; }
  function layout(L) {
    const m = Math.round(Math.min(L.W, L.H) * 0.03);
    const availW = L.W - m * 2, availH = L.H - L.headerH - m * 2;
    cell = Math.floor(Math.min(availW / COLS, availH / ROWS));
    const bw = cell * COLS, bh = cell * ROWS;
    originX = Math.round((L.W - bw) / 2);
    originY = Math.round(L.headerH + (L.H - L.headerH - bh) / 2);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const t = grid[r] && grid[r][c];
      if (t) { t.tx = cellX(c); t.ty = cellY(r); t.px = t.tx; t.py = t.ty; }
    }
  }

  // ── утилиты поля ──
  function type(r, c) { const t = grid[r] && grid[r][c]; return t ? t.type : null; }
  function makeTile(tp, r, c, px, py) {
    return { type: tp, row: r, col: c, px: px, py: py, tx: cellX(c), ty: cellY(r), clearing: false };
  }
  function setTarget(t) { t.tx = cellX(t.col); t.ty = cellY(t.row); }

  function genTG() {
    const tg = [];
    for (let r = 0; r < ROWS; r++) { tg[r] = []; for (let c = 0; c < COLS; c++) {
      let t, guard = 0;
      do { t = (Math.random() * N) | 0; guard++; }
      while (guard < 40 && ((c >= 2 && tg[r][c - 1] === t && tg[r][c - 2] === t) ||
                            (r >= 2 && tg[r - 1][c] === t && tg[r - 2][c] === t)));
      tg[r][c] = t;
    } }
    return tg;
  }
  function runAtTG(tg, r, c) {
    const t = tg[r][c]; if (t == null) return false;
    let h = 1, k;
    for (k = c - 1; k >= 0 && tg[r][k] === t; k--) h++;
    for (k = c + 1; k < COLS && tg[r][k] === t; k++) h++;
    let v = 1;
    for (k = r - 1; k >= 0 && tg[k][c] === t; k--) v++;
    for (k = r + 1; k < ROWS && tg[k][c] === t; k++) v++;
    return h >= MINRUN || v >= MINRUN;
  }
  function hasMoveOn(tg) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) { const a = tg[r][c], b = tg[r][c + 1]; tg[r][c] = b; tg[r][c + 1] = a; const ok = runAtTG(tg, r, c) || runAtTG(tg, r, c + 1); tg[r][c] = a; tg[r][c + 1] = b; if (ok) return true; }
      if (r + 1 < ROWS) { const a = tg[r][c], b = tg[r + 1][c]; tg[r][c] = b; tg[r + 1][c] = a; const ok = runAtTG(tg, r, c) || runAtTG(tg, r + 1, c); tg[r][c] = a; tg[r + 1][c] = b; if (ok) return true; }
    }
    return false;
  }
  function buildTypeGrid() { const tg = []; for (let r = 0; r < ROWS; r++) { tg[r] = []; for (let c = 0; c < COLS; c++) tg[r][c] = type(r, c); } return tg; }
  function hasMove() { return hasMoveOn(buildTypeGrid()); }

  function buildBoard() {
    let tg;
    do { tg = genTG(); } while (!hasMoveOn(tg));
    grid = [];
    for (let r = 0; r < ROWS; r++) { grid[r] = []; for (let c = 0; c < COLS; c++) grid[r][c] = makeTile(tg[r][c], r, c, cellX(c), cellY(r)); }
  }
  function reshuffle() {
    let tg, guard = 0;
    do { tg = genTG(); guard++; } while (guard < 60 && !hasMoveOn(tg));
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { grid[r][c].type = tg[r][c]; grid[r][c].clearing = false; }
  }

  function findMatches() {
    const res = [], seen = {};
    const add = (r, c) => { const k = r * COLS + c; if (!seen[k]) { seen[k] = 1; res.push([r, c]); } };
    for (let r = 0; r < ROWS; r++) { let c = 0; while (c < COLS) { const t = type(r, c); if (t == null) { c++; continue; } let run = 1; while (c + run < COLS && type(r, c + run) === t) run++; if (run >= MINRUN) for (let k = 0; k < run; k++) add(r, c + k); c += run; } }
    for (let c = 0; c < COLS; c++) { let r = 0; while (r < ROWS) { const t = type(r, c); if (t == null) { r++; continue; } let run = 1; while (r + run < ROWS && type(r + run, c) === t) run++; if (run >= MINRUN) for (let k = 0; k < run; k++) add(r + k, c); r += run; } }
    return res;
  }
  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  function trySwap(a, b) {
    if (phase !== 'idle') return;
    const ta = grid[a.r][a.c], tb = grid[b.r][b.c];
    if (!ta || !tb) return;
    grid[a.r][a.c] = tb; grid[b.r][b.c] = ta;
    tb.row = a.r; tb.col = a.c; setTarget(tb);
    ta.row = b.r; ta.col = b.c; setTarget(ta);
    lastSwap = { a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c } };
    multiplier = 1; phase = 'swap'; engine.beep(330, 0.07, 'square', 0.12);
  }
  function swapBack() {
    const a = lastSwap.a, b = lastSwap.b;
    const ta = grid[a.r][a.c], tb = grid[b.r][b.c];
    grid[a.r][a.c] = tb; grid[b.r][b.c] = ta;
    tb.row = a.r; tb.col = a.c; setTarget(tb);
    ta.row = b.r; ta.col = b.c; setTarget(ta);
    phase = 'swapback'; engine.beep(180, 0.12, 'sine', 0.1);
  }

  function enterClear(cells) {
    matchedCells = cells;
    for (let i = 0; i < cells.length; i++) { const t = grid[cells[i][0]][cells[i][1]]; if (t) t.clearing = true; }
    engine.addScore(cells.length * SCORE * multiplier);
    clearTimer = 0; clearProg = 0; phase = 'clear';
    engine.beep(440 + Math.min(multiplier, 8) * 70, 0.12, 'square', 0.18);
    if (multiplier >= 2) engine.beep(660 + multiplier * 60, 0.10, 'triangle', 0.14);
  }
  function doRemoveAndFall() {
    for (let i = 0; i < matchedCells.length; i++) {
      const r = matchedCells[i][0], c = matchedCells[i][1], t = grid[r][c];
      if (t) engine.burst(t.px + cell / 2, t.py + cell / 2);
      grid[r][c] = null;
    }
    matchedCells = [];
    for (let c = 0; c < COLS; c++) {
      let ptr = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        const t = grid[r][c];
        if (t) { if (r !== ptr) { grid[ptr][c] = t; grid[r][c] = null; } t.row = ptr; setTarget(t); ptr--; }
      }
      for (let r = ptr; r >= 0; r--) {
        const tp = (Math.random() * N) | 0;
        const startY = originY - (ptr - r + 1) * cell;
        grid[r][c] = makeTile(tp, r, c, cellX(c), startY);
      }
    }
    phase = 'fall';
  }

  function moveTiles(dt) {
    let moving = false;
    const k = Math.min(1, dt * 16);
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const tl = grid[r][c]; if (!tl) continue;
      if (Math.abs(tl.tx - tl.px) > 0.5 || Math.abs(tl.ty - tl.py) > 0.5) { tl.px += (tl.tx - tl.px) * k; tl.py += (tl.ty - tl.py) * k; moving = true; }
      else { tl.px = tl.tx; tl.py = tl.ty; }
    }
    return moving;
  }

  // ── ввод (геометрия совпадений + свайп/тап) ──
  function cellAt(x, y) {
    const c = Math.floor((x - originX) / cell), r = Math.floor((y - originY) / cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r: r, c: c };
  }

  // ── публичный контракт сцены ──
  return {
    init: function () { /* геометрию даёт layout, поле строит reset */ },
    reset: function () { buildBoard(); phase = 'idle'; multiplier = 1; selCell = null; downCell = null; },
    layout: layout,
    update: function (dt) {
      const moving = moveTiles(dt);
      if (phase === 'swap' && !moving) {
        const m = findMatches();
        if (m.length) enterClear(m); else swapBack();
      } else if (phase === 'swapback' && !moving) {
        phase = 'idle'; selCell = null;
      } else if (phase === 'clear') {
        clearTimer += dt; clearProg = Math.min(1, clearTimer / CLEAR_DUR);
        if (clearTimer >= CLEAR_DUR) doRemoveAndFall();
      } else if (phase === 'fall' && !moving) {
        const m = findMatches();
        if (m.length) { multiplier++; enterClear(m); }
        else { multiplier = 1; phase = 'idle'; if (!hasMove()) reshuffle(); }
      }
    },
    render: function (ctx) {
      const ac = engine.accent();
      // рамка поля
      const pad = Math.round(cell * 0.18);
      ctx.fillStyle = '#3a2f20';
      engine.rr(originX - pad, originY - pad, cell * COLS + pad * 2, cell * ROWS + pad * 2, pad); ctx.fill();
      ctx.strokeStyle = ac; ctx.lineWidth = 2;
      engine.rr(originX - pad, originY - pad, cell * COLS + pad * 2, cell * ROWS + pad * 2, pad); ctx.stroke();
      // клетки
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const x = cellX(c), y = cellY(r);
        ctx.fillStyle = ((r + c) & 1) ? 'rgba(255,240,200,0.06)' : 'rgba(0,0,0,0.18)';
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
      }
      if (selCell) {
        const x = cellX(selCell.c), y = cellY(selCell.r);
        ctx.strokeStyle = ac; ctx.lineWidth = 3;
        engine.rr(x + 2, y + 2, cell - 4, cell - 4, 6); ctx.stroke();
      }
      // тайлы
      const inset = cell * 0.1;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = grid[r][c]; if (!t) continue;
        const img = engine.img(NAMES[t.type]); if (!img || !img.complete) continue;
        let s = t.clearing ? 1 - clearProg : 1;
        if (s <= 0.02) continue;
        const size = (cell - inset * 2) * s;
        const ccx = t.px + cell / 2, ccy = t.py + cell / 2;
        ctx.globalAlpha = t.clearing ? Math.max(0, 1 - clearProg) : 1;
        ctx.drawImage(img, ccx - size / 2, ccy - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
    },
    pointerDown: function (p) { downCell = cellAt(p.x, p.y); },
    pointerUp: function (e) {
      if (phase !== 'idle') { downCell = null; return; }
      if (downCell && e.dist > cell * 0.4) {
        let nr = downCell.r, nc = downCell.c;
        if (Math.abs(e.dx) > Math.abs(e.dy)) nc += e.dx > 0 ? 1 : -1; else nr += e.dy > 0 ? 1 : -1;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) { trySwap({ r: downCell.r, c: downCell.c }, { r: nr, c: nc }); selCell = null; downCell = null; return; }
      }
      const up = cellAt(e.x, e.y);
      if (up) {
        if (!selCell) selCell = { r: up.r, c: up.c };
        else if (selCell.r === up.r && selCell.c === up.c) selCell = null;
        else if (adjacent(selCell, up)) { trySwap(selCell, up); selCell = null; }
        else selCell = { r: up.r, c: up.c };
      }
      downCell = null;
    },
  };
});
