/* ============================================================
   СЦЕНА: match-3 (match3.js)
   ------------------------------------------------------------
   Механика «три в ряд». Инфраструктуру даёт ядро (core.js):
   canvas, цикл, ввод, звук, частицы, таймер, экран Game Over,
   протокол Sharky.

   Два режима (выбираются через CONFIG.rules):
   ── КЛАССИКА (по умолчанию) ──
     Очки за совпадения, фиксированный набор тайлов (CONFIG.tileNames),
     счёт = накопленные очки, стандартный HUD ядра.
   ── ЦЕЛЬ/РАУНДЫ (если задан rules.goal) ──
     Нужно собрать rules.goal штук тайла-задания за раунд (таймер ядра).
     Собрал — раунд пройден: новый набор еды, новая цель, таймер
     сбрасывается (engine.resetTimer). Не успел — Game Over.
     Счёт = число пройденных раундов. Свой HUD (иконка цели + прогресс + таймер).

   CONFIG.rules:
     cols, rows        размер поля
     minRun            длина совпадения (3)
     clearDur          анимация схлопывания, с (0.18)
     scorePerTile      очков за тайл (классика, 10)
     goal              сколько собрать тайла-задания за раунд (вкл. режим цели)
     typeCount         сколько типов тайлов на поле в раунде (по умолч. = длине набора)
     pool              имена ассетов-кандидатов; каждый раунд из них берётся typeCount
     boardImage        имя ассета-подложки поля (напр. доска); иначе рисуется рамка
   ============================================================ */
Engine.register('match3', function (engine, cfg) {
  'use strict';
  const R = cfg.rules || {};
  const COLS = R.cols || 7, ROWS = R.rows || 8;
  const MINRUN = R.minRun || 3;
  const CLEAR_DUR = R.clearDur || 0.18;
  const SCORE = R.scorePerTile || 10;

  const GOAL = R.goal || 0;
  const goalMode = GOAL > 0;
  const POOL = (R.pool && R.pool.length) ? R.pool.slice() : null;
  const FIXED = (cfg.tileNames || Object.keys(cfg.assets || {})).filter(function (n) { return n !== R.boardImage && n !== (cfg.theme && cfg.theme.bgImage); });
  const TYPE_COUNT = R.typeCount || FIXED.length;
  const BOARD_IMG = R.boardImage || null;

  // активный набор тайлов раунда (в классике — фиксированный)
  let activeNames = FIXED.slice();
  let N = activeNames.length;

  let grid = [];
  let cell = 40, originX = 0, originY = 0;
  let phase = 'idle';                 // idle | swap | swapback | clear | fall
  let multiplier = 1;
  let selCell = null, downCell = null;
  let lastSwap = null, matchedCells = [], clearTimer = 0, clearProg = 0;

  // режим цели
  let collected = 0, rounds = 0, targetIdx = 0, targetName = activeNames[0];

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

  // ── набор тайлов раунда ──
  function pickRound() {
    if (POOL) {
      const pool = POOL.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
      activeNames = pool.slice(0, Math.min(TYPE_COUNT, pool.length));
    } else {
      activeNames = FIXED.slice();
    }
    N = activeNames.length;
    targetIdx = (Math.random() * N) | 0;
    targetName = activeNames[targetIdx];
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
    if (!goalMode) engine.addScore(cells.length * SCORE * multiplier);
    clearTimer = 0; clearProg = 0; phase = 'clear';
    engine.beep(440 + Math.min(multiplier, 8) * 70, 0.12, 'square', 0.18);
    if (multiplier >= 2) engine.beep(660 + multiplier * 60, 0.10, 'triangle', 0.14);
  }
  function doRemoveAndFall() {
    for (let i = 0; i < matchedCells.length; i++) {
      const r = matchedCells[i][0], c = matchedCells[i][1], t = grid[r][c];
      if (t) {
        engine.burst(t.px + cell / 2, t.py + cell / 2);
        if (goalMode && t.type === targetIdx) collected++;
      }
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

  // Раунд пройден → новый набор еды, новая цель, сброс таймера.
  function advanceRound() {
    rounds++;
    engine.setScore(rounds);
    pickRound();
    collected = 0; multiplier = 1; selCell = null; downCell = null;
    buildBoard(); phase = 'idle';
    engine.resetTimer();
    engine.beep(523, 0.10, 'square', 0.18);
    engine.beep(784, 0.12, 'triangle', 0.16);
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

  function cellAt(x, y) {
    const c = Math.floor((x - originX) / cell), r = Math.floor((y - originY) / cell);
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return null;
    return { r: r, c: c };
  }

  // ── рисование подложки поля ──
  function drawCover(ctx, img, x, y, w, h) {
    const ir = img.naturalWidth / img.naturalHeight, rr = w / h;
    let sw, sh, sx, sy;
    if (ir > rr) { sh = img.naturalHeight; sw = sh * rr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
    else { sw = img.naturalWidth; sh = sw / rr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  // ── кастомный HUD режима цели (иконка задания + прогресс + таймер + уровень) ──
  // HUD режима цели: задание (КРУПНАЯ иконка цели + прогресс) и полоса времени —
  // прямо над верхней кромкой доски (а не в верхней полосе экрана).
  function sceneHud(ctx) {
    const font = (cfg.theme && cfg.theme.font) || 'sans-serif';
    const hudText = (cfg.theme && cfg.theme.hudText) || '#fff';
    const ac = engine.accent();
    const pad = Math.round(cell * 0.18);
    const boardTop = originY - pad;
    const boardW = cell * COLS;
    const gap = Math.max(6, Math.round(cell * 0.14));
    const radius = Math.round(cell * 0.25);

    // ── полоса времени: во всю ширину доски, вплотную над ней ──
    const barH = Math.max(14, Math.round(cell * 0.34));
    const barX = originX, barW = boardW;
    const barY = boardTop - gap - barH;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; engine.rr(barX, barY, barW, barH, barH / 2); ctx.fill();
    const frac = Math.max(0, engine.timeLeft / engine.duration);
    ctx.fillStyle = frac < 0.25 ? '#e0533d' : ac;
    engine.rr(barX, barY, Math.max(barH, barW * frac), barH, barH / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; engine.rr(barX, barY, barW, barH, barH / 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(barH * 0.66) + 'px ' + font;
    ctx.fillText(Math.ceil(engine.timeLeft) + ' с', barX + barW / 2, barY + barH / 2 + 1);

    // ── карточка задания над полосой: КРУПНАЯ иконка цели + N/GOAL ──
    const isz = Math.round(cell * 1.35);                       // крупная иконка
    const countFont = Math.round(cell * 0.72);
    ctx.font = 'bold ' + countFont + 'px ' + font;
    const countTxt = Math.min(collected, GOAL) + '/' + GOAL;
    const txtW = ctx.measureText(countTxt).width;
    const innerGap = Math.round(cell * 0.22);
    const cardPadX = Math.round(cell * 0.3), cardPadY = Math.round(cell * 0.16);
    const cardW = isz + innerGap + txtW + cardPadX * 2;
    const cardH = isz + cardPadY * 2;
    const cardX = originX + (boardW - cardW) / 2;
    const cardY = barY - gap - cardH;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; engine.rr(cardX, cardY, cardW, cardH, radius); ctx.fill();
    ctx.strokeStyle = ac; ctx.lineWidth = 2; engine.rr(cardX, cardY, cardW, cardH, radius); ctx.stroke();
    const icon = engine.img(targetName);
    if (icon && icon.complete) ctx.drawImage(icon, cardX + cardPadX, cardY + cardPadY, isz, isz);
    ctx.fillStyle = hudText; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + countFont + 'px ' + font;
    ctx.fillText(countTxt, cardX + cardPadX + isz + innerGap, cardY + cardH / 2 + 1);

    // ── уровень: мелко, по центру над карточкой (не залезая за край экрана) ──
    const lvlY = cardY - Math.round(cell * 0.18);
    if (lvlY > Math.round(cell * 0.5)) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.font = 'bold ' + Math.round(cell * 0.38) + 'px ' + font;
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
      ctx.fillStyle = '#fff';
      ctx.fillText('Уровень ' + (rounds + 1), originX + boardW / 2, lvlY);
      ctx.restore();
    }
  }

  // ── публичный контракт сцены ──
  return {
    init: function () { /* геометрию даёт layout, поле строит reset */ },
    reset: function () {
      rounds = 0; collected = 0; multiplier = 1; selCell = null; downCell = null;
      if (goalMode) pickRound();
      buildBoard(); phase = 'idle';
    },
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
        else {
          multiplier = 1; phase = 'idle';
          if (goalMode && collected >= GOAL) advanceRound();
          else if (!hasMove()) reshuffle();
        }
      }
    },
    render: function (ctx) {
      const ac = engine.accent();
      const pad = Math.round(cell * 0.18);
      const bx = originX - pad, by = originY - pad, bw = cell * COLS + pad * 2, bh = cell * ROWS + pad * 2;
      const board = BOARD_IMG && engine.img(BOARD_IMG);
      if (board && board.complete && board.naturalWidth) {
        drawCover(ctx, board, bx, by, bw, bh);
      } else {
        ctx.fillStyle = '#3a2f20'; engine.rr(bx, by, bw, bh, pad); ctx.fill();
        ctx.strokeStyle = ac; ctx.lineWidth = 2; engine.rr(bx, by, bw, bh, pad); ctx.stroke();
        for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
          const x = cellX(c), y = cellY(r);
          ctx.fillStyle = ((r + c) & 1) ? 'rgba(255,240,200,0.06)' : 'rgba(0,0,0,0.18)';
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        }
      }
      if (selCell) {
        const x = cellX(selCell.c), y = cellY(selCell.r);
        ctx.strokeStyle = ac; ctx.lineWidth = 3;
        engine.rr(x + 2, y + 2, cell - 4, cell - 4, 6); ctx.stroke();
      }
      const inset = cell * 0.1;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const t = grid[r][c]; if (!t) continue;
        const img = engine.img(activeNames[t.type]); if (!img || !img.complete) continue;
        let s = t.clearing ? 1 - clearProg : 1;
        if (s <= 0.02) continue;
        const size = (cell - inset * 2) * s;
        const ccx = t.px + cell / 2, ccy = t.py + cell / 2;
        ctx.globalAlpha = t.clearing ? Math.max(0, 1 - clearProg) : 1;
        ctx.drawImage(img, ccx - size / 2, ccy - size / 2, size, size);
        ctx.globalAlpha = 1;
      }
    },
    hud: goalMode ? sceneHud : undefined,
    // отладка/тесты: снимок внутреннего состояния (без рендера)
    _state: function () {
      return { collected: collected, rounds: rounds, phase: phase, targetIdx: targetIdx, targetName: targetName,
               N: N, activeNames: activeNames.slice(), cell: cell, originX: originX, originY: originY,
               grid: grid.map(function (row) { return row.map(function (t) { return t ? t.type : null; }); }) };
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
