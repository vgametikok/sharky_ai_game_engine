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

   ── СПЕЦЭЛЕМЕНТЫ (rules.specials:true) ──
     4-в-ряд → МОЛНИЯ (line, чистит строку/столбец вдоль ряда)
     L/T-пересечение → БОМБА (3×3), 5-в-ряд → РАДУГА (весь цвет; активируется свапом)
     Слияния свапом двух бустеров: line+line=крест, line+bomb=3 строки+3 столбца,
     bomb+bomb=5×5, rainbow+спец=весь цвет+крест, rainbow+rainbow=всё поле.
     Цепные активации: спец, попавший во взрыв, срабатывает тоже.
   ── ЛЁД (rules.ice:{count,layers} или маска-строки) ──
     Ледяная клетка: тайл заморожен (не свапается, не падает); матч/взрыв
     рядом или на клетке снимает слой; после снятия — обычная клетка.
   ── ЛИМИТ ХОДОВ (rules.moveLimit:N) ──
     Успешный ход тратит попытку; HUD показывает ходы (вместо/рядом с таймером);
     ходы кончились и цель не взята → проигрыш. advanceRound восстанавливает.
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

  const SPECIALS = !!R.specials;
  const MOVES = R.moveLimit || 0;
  const ICECFG = R.ice || null;

  let grid = [];
  let cell = 40, originX = 0, originY = 0;
  let phase = 'idle';                 // idle | swap | swapback | clear | fall
  let multiplier = 1;
  let selCell = null, downCell = null;
  let lastSwap = null, matchedCells = [], clearTimer = 0, clearProg = 0;
  let ice = [];                       // слои льда по клеткам (0 = нет)
  let movesLeft = 0;                  // лимит ходов (0 = не используется)
  let pendingSpawns = [];             // спец-тайлы к спавну после удаления [{r,c,type,special,axis}]
  let pendingMerge = null;            // слияние бустеров после анимации свапа
  let sTime = 0;                      // время сцены (анимация радуги)

  // режим цели
  let collected = 0, rounds = 0, targetIdx = 0, targetName = activeNames[0];

  function iceAt(r, c) { return (ice[r] && ice[r][c]) || 0; }
  function initIce() {
    ice = []; for (let r = 0; r < ROWS; r++) { ice[r] = []; for (let c = 0; c < COLS; c++) ice[r][c] = 0; }
    if (!ICECFG) return;
    if (Array.isArray(ICECFG)) {          // маска-строки: '0'/'1'/'2'
      for (let r = 0; r < Math.min(ROWS, ICECFG.length); r++)
        for (let c = 0; c < Math.min(COLS, ICECFG[r].length); c++) ice[r][c] = +ICECFG[r][c] || 0;
    } else {
      let n = ICECFG.count || 6, guard = 0;
      while (n > 0 && guard++ < 200) {
        const r = (Math.random() * ROWS) | 0, c = (Math.random() * COLS) | 0;
        if (!ice[r][c]) { ice[r][c] = ICECFG.layers || 1; n--; }
      }
    }
  }
  function breakIce(r, c) {
    if (iceAt(r, c) > 0) {
      ice[r][c]--;
      const t = grid[r][c];
      engine.burst(cellX(c) + cell / 2, cellY(r) + cell / 2, { count: 6, color: '#cfeaff' });
      engine.beep(700, 0.06, 'triangle', 0.1);
      if (t) t.clearing = false;
      return true;
    }
    return false;
  }

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
    return { type: tp, row: r, col: c, px: px, py: py, tx: cellX(c), ty: cellY(r), clearing: false, special: null, axis: null };
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

  // Ряды с метаданными: плоский набор клеток + спавны бустеров (4=line, 5=rainbow, L/T=bomb).
  function findRuns() {
    const runsH = [], runsV = [];
    for (let r = 0; r < ROWS; r++) { let c = 0; while (c < COLS) { const t = type(r, c); if (t == null || t < 0) { c++; continue; } let run = 1; while (c + run < COLS && type(r, c + run) === t) run++; if (run >= MINRUN) runsH.push({ r: r, c: c, len: run, horiz: true, t: t }); c += run; } }
    for (let c = 0; c < COLS; c++) { let r = 0; while (r < ROWS) { const t = type(r, c); if (t == null || t < 0) { r++; continue; } let run = 1; while (r + run < ROWS && type(r + run, c) === t) run++; if (run >= MINRUN) runsV.push({ r: r, c: c, len: run, horiz: false, t: t }); r += run; } }
    const seen = {}, flat = [];
    const add = (r, c) => { const k = r * COLS + c; if (!seen[k]) { seen[k] = 1; flat.push([r, c]); } };
    runsH.forEach(x => { for (let k = 0; k < x.len; k++) add(x.r, x.c + k); });
    runsV.forEach(x => { for (let k = 0; k < x.len; k++) add(x.r, x.c + k); });
    const spawns = [];
    if (SPECIALS) {
      const spawnAt = {};   // не дублировать спавн в одной клетке
      const anchor = (x) => {
        // якорь: свапнутая клетка, если она в ряду, иначе центр
        if (lastSwap) {
          const pts = [lastSwap.a, lastSwap.b];
          for (let i = 0; i < 2; i++) {
            const p = pts[i];
            if (x.horiz ? (p.r === x.r && p.c >= x.c && p.c < x.c + x.len)
                        : (p.c === x.c && p.r >= x.r && p.r < x.r + x.len)) return { r: p.r, c: p.c };
          }
        }
        return x.horiz ? { r: x.r, c: x.c + (x.len >> 1) } : { r: x.r + (x.len >> 1), c: x.c };
      };
      // бомбы на пересечениях L/T
      runsH.forEach(h => runsV.forEach(v => {
        if (h.t !== v.t) return;
        if (v.c >= h.c && v.c < h.c + h.len && h.r >= v.r && h.r < v.r + v.len) {
          const k = h.r * COLS + v.c;
          if (!spawnAt[k]) { spawnAt[k] = 1; spawns.push({ r: h.r, c: v.c, type: h.t, special: 'bomb' }); }
        }
      }));
      runsH.concat(runsV).forEach(x => {
        if (x.len < 4) return;
        const a = anchor(x), k = a.r * COLS + a.c;
        if (spawnAt[k]) return;
        spawnAt[k] = 1;
        spawns.push(x.len >= 5 ? { r: a.r, c: a.c, type: x.t, special: 'rainbow' }
                               : { r: a.r, c: a.c, type: x.t, special: 'line', axis: x.horiz ? 'h' : 'v' });
      });
    }
    return { flat: flat, spawns: spawns };
  }
  // клетки эффекта спец-тайла
  function specialCells(t) {
    const out = [];
    if (t.special === 'line') {
      if (t.axis === 'h') { for (let c = 0; c < COLS; c++) out.push([t.row, c]); }
      else { for (let r = 0; r < ROWS; r++) out.push([r, t.col]); }
    } else if (t.special === 'bomb') {
      for (let r = t.row - 1; r <= t.row + 1; r++) for (let c = t.col - 1; c <= t.col + 1; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push([r, c]);
    } else if (t.special === 'rainbow') {
      // радуга в цепной реакции: чистит самый частый цвет
      const cnt = {};
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const tp = type(r, c); if (tp != null && tp >= 0) cnt[tp] = (cnt[tp] || 0) + 1; }
      let best = 0, bn = -1; for (const k in cnt) if (cnt[k] > bn) { bn = cnt[k]; best = +k; }
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (type(r, c) === best) out.push([r, c]);
      out.push([t.row, t.col]);
    }
    return out;
  }
  function colorCells(tp) {
    const out = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (type(r, c) === tp) out.push([r, c]);
    return out;
  }
  // цепная реакция: спец-тайлы, попавшие во взрыв, срабатывают тоже
  function expandRemoval(cells) {
    const seen = {}, out = [];
    const push = (r, c) => { const k = r * COLS + c; if (!seen[k]) { seen[k] = 1; out.push([r, c]); return true; } return false; };
    cells.forEach(x => push(x[0], x[1]));
    for (let i = 0; i < out.length; i++) {
      const t = grid[out[i][0]][out[i][1]];
      if (t && t.special && iceAt(out[i][0], out[i][1]) === 0)
        specialCells(t).forEach(x => push(x[0], x[1]));
    }
    return out;
  }
  function adjacent(a, b) { return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1; }

  function trySwap(a, b) {
    if (phase !== 'idle') return;
    const ta = grid[a.r][a.c], tb = grid[b.r][b.c];
    if (!ta || !tb) return;
    if (iceAt(a.r, a.c) || iceAt(b.r, b.c)) { engine.beep(150, 0.1, 'sine', 0.1); return; }   // заморожено
    grid[a.r][a.c] = tb; grid[b.r][b.c] = ta;
    tb.row = a.r; tb.col = a.c; setTarget(tb);
    ta.row = b.r; ta.col = b.c; setTarget(ta);
    lastSwap = { a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c } };
    // радуга или слияние двух бустеров: активация после анимации свапа
    pendingMerge = null;
    if (SPECIALS && (ta.special || tb.special)) {
      const spA = ta.special, spB = tb.special;
      if (spA === 'rainbow' || spB === 'rainbow' || (spA && spB)) pendingMerge = { ta: ta, tb: tb };
    }
    multiplier = 1; phase = 'swap'; engine.beep(330, 0.07, 'square', 0.12);
  }
  // набор клеток для слияния/активации радуги (тайлы уже на новых местах)
  function mergeRemoval(m) {
    const ta = m.ta, tb = m.tb;   // ta теперь в b-позиции, tb в a-позиции
    const spA = ta.special, spB = tb.special;
    const cross = (r0, c0, thick) => {
      const out = [];
      for (let c = 0; c < COLS; c++) for (let dr = -thick; dr <= thick; dr++) if (r0 + dr >= 0 && r0 + dr < ROWS) out.push([r0 + dr, c]);
      for (let r = 0; r < ROWS; r++) for (let dc = -thick; dc <= thick; dc++) if (c0 + dc >= 0 && c0 + dc < COLS) out.push([r, c0 + dc]);
      return out;
    };
    const both = spA && spB;
    if (spA === 'rainbow' && spB === 'rainbow') {   // всё поле
      const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) out.push([r, c]); return out;
    }
    if (spA === 'rainbow' || spB === 'rainbow') {
      const rb = spA === 'rainbow' ? ta : tb, other = rb === ta ? tb : ta;
      let out;
      if (other.special) out = colorCells(other.type).concat(cross(rb.row, rb.col, 0));  // радуга+спец
      else out = colorCells(other.type);                                                 // радуга+цвет
      out.push([rb.row, rb.col]);
      return out;
    }
    if (both && spA === 'line' && spB === 'line') return cross(ta.row, ta.col, 0);        // крест
    if (both && spA === 'bomb' && spB === 'bomb') {                                       // 5×5
      const out = [];
      for (let r = ta.row - 2; r <= ta.row + 2; r++) for (let c = ta.col - 2; c <= ta.col + 2; c++)
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out.push([r, c]);
      out.push([tb.row, tb.col]);
      return out;
    }
    if (both) return cross(ta.row, ta.col, 1);                                            // line+bomb: 3+3
    return null;
  }
  function swapBack() {
    const a = lastSwap.a, b = lastSwap.b;
    const ta = grid[a.r][a.c], tb = grid[b.r][b.c];
    grid[a.r][a.c] = tb; grid[b.r][b.c] = ta;
    tb.row = a.r; tb.col = a.c; setTarget(tb);
    ta.row = b.r; ta.col = b.c; setTarget(ta);
    phase = 'swapback'; engine.beep(180, 0.12, 'sine', 0.1);
  }

  function spendMove() { if (MOVES) movesLeft = Math.max(0, movesLeft - 1); }
  function enterClear(cells, spawns) {
    matchedCells = cells;
    pendingSpawns = spawns || [];
    for (let i = 0; i < cells.length; i++) { const t = grid[cells[i][0]][cells[i][1]]; if (t) t.clearing = true; }
    if (!goalMode) engine.addScore(cells.length * SCORE * multiplier);
    clearTimer = 0; clearProg = 0; phase = 'clear';
    engine.beep(440 + Math.min(multiplier, 8) * 70, 0.12, 'square', 0.18);
    if (multiplier >= 2) engine.beep(660 + multiplier * 60, 0.10, 'triangle', 0.14);
  }
  function doRemoveAndFall() {
    for (let i = 0; i < matchedCells.length; i++) {
      const r = matchedCells[i][0], c = matchedCells[i][1], t = grid[r][c];
      if (iceAt(r, c) > 0) { breakIce(r, c); continue; }   // лёд поглощает удаление
      if (t) {
        engine.burst(t.px + cell / 2, t.py + cell / 2);
        if (goalMode && t.type === targetIdx) collected++;
      }
      grid[r][c] = null;
    }
    matchedCells = [];
    // спавн заработанных бустеров (на месте якоря, до гравитации)
    for (let i = 0; i < pendingSpawns.length; i++) {
      const s = pendingSpawns[i];
      if (!grid[s.r][s.c]) {
        const t = makeTile(s.type, s.r, s.c, cellX(s.c), cellY(s.r));
        t.special = s.special; t.axis = s.axis || null;
        grid[s.r][s.c] = t;
        engine.burst(cellX(s.c) + cell / 2, cellY(s.r) + cell / 2, { count: 10, color: '#fff' });
      }
    }
    pendingSpawns = [];
    // гравитация с ледяными «замками»: лёд держит тайл, сегменты падают отдельно
    for (let c = 0; c < COLS; c++) {
      let ptr = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (iceAt(r, c) > 0) { ptr = r - 1; continue; }    // ледяная клетка — граница сегмента
        const t = grid[r][c];
        if (t) {
          if (r !== ptr) { grid[ptr][c] = t; grid[r][c] = null; }
          t.row = ptr; setTarget(t); ptr--;
        }
      }
      let born = 0;
      for (let r = 0; r < ROWS; r++) {
        if (!grid[r][c] && iceAt(r, c) === 0) {
          const tp = (Math.random() * N) | 0;
          grid[r][c] = makeTile(tp, r, c, cellX(c), originY - (++born) * cell);
        }
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
    movesLeft = MOVES;
    buildBoard(); initIce(); phase = 'idle';
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

    // ── полоса под карточкой: время ИЛИ лимит ходов ──
    const barH = Math.max(14, Math.round(cell * 0.34));
    const barX = originX, barW = boardW;
    const barY = boardTop - gap - barH;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; engine.rr(barX, barY, barW, barH, barH / 2); ctx.fill();
    if (MOVES) {
      const frac = movesLeft / MOVES;
      ctx.fillStyle = frac < 0.25 ? '#e0533d' : ac;
      engine.rr(barX, barY, Math.max(barH, barW * frac), barH, barH / 2); ctx.fill();
    } else {
      const frac = Math.max(0, engine.timeLeft / engine.duration);
      ctx.fillStyle = frac < 0.25 ? '#e0533d' : ac;
      engine.rr(barX, barY, Math.max(barH, barW * frac), barH, barH / 2); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; engine.rr(barX, barY, barW, barH, barH / 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(barH * 0.66) + 'px ' + font;
    ctx.fillText(MOVES ? ('Ходы: ' + movesLeft) : (Math.ceil(engine.timeLeft) + ' с'), barX + barW / 2, barY + barH / 2 + 1);

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
      movesLeft = MOVES; pendingSpawns = []; pendingMerge = null;
      if (goalMode) pickRound();
      buildBoard(); initIce(); phase = 'idle';
    },
    layout: layout,
    update: function (dt) {
      sTime += dt;
      const moving = moveTiles(dt);
      if (phase === 'swap' && !moving) {
        if (pendingMerge) {   // радуга/слияние бустеров — активация без матча
          const cells = expandRemoval(mergeRemoval(pendingMerge));
          pendingMerge = null; spendMove();
          enterClear(cells, []);
        } else {
          const res = findRuns();
          if (res.flat.length) { spendMove(); enterClear(expandRemoval(res.flat), res.spawns); }
          else swapBack();
        }
      } else if (phase === 'swapback' && !moving) {
        phase = 'idle'; selCell = null;
      } else if (phase === 'clear') {
        clearTimer += dt; clearProg = Math.min(1, clearTimer / CLEAR_DUR);
        if (clearTimer >= CLEAR_DUR) doRemoveAndFall();
      } else if (phase === 'fall' && !moving) {
        const res = findRuns();
        if (res.flat.length) { multiplier++; enterClear(expandRemoval(res.flat), res.spawns); }
        else {
          multiplier = 1; phase = 'idle';
          if (goalMode && collected >= GOAL) advanceRound();
          else if (MOVES && movesLeft <= 0) engine.gameOver();     // ходы кончились
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
        let s = t.clearing ? 1 - clearProg : 1;
        if (s <= 0.02) continue;
        const size = (cell - inset * 2) * s;
        const ccx = t.px + cell / 2, ccy = t.py + cell / 2;
        ctx.globalAlpha = t.clearing ? Math.max(0, 1 - clearProg) : 1;
        if (t.special === 'rainbow') {
          // радужный диск (вращается)
          for (let i = 0; i < 6; i++) {
            ctx.fillStyle = 'hsl(' + (i * 60 + sTime * 90) + ',85%,60%)';
            ctx.beginPath(); ctx.moveTo(ccx, ccy);
            ctx.arc(ccx, ccy, size * 0.48, i * Math.PI / 3 + sTime * 1.5, (i + 1) * Math.PI / 3 + sTime * 1.5);
            ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ccx, ccy, size * 0.16, 0, 7); ctx.fill();
        } else {
          const img = engine.img(activeNames[t.type]);
          if (img && img.complete) ctx.drawImage(img, ccx - size / 2, ccy - size / 2, size, size);
          if (t.special === 'line') {
            ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(2, cell * 0.09);
            ctx.beginPath();
            if (t.axis === 'h') { ctx.moveTo(ccx - size * 0.46, ccy); ctx.lineTo(ccx + size * 0.46, ccy);
              ctx.moveTo(ccx + size * 0.28, ccy - size * 0.14); ctx.lineTo(ccx + size * 0.46, ccy); ctx.lineTo(ccx + size * 0.28, ccy + size * 0.14);
              ctx.moveTo(ccx - size * 0.28, ccy - size * 0.14); ctx.lineTo(ccx - size * 0.46, ccy); ctx.lineTo(ccx - size * 0.28, ccy + size * 0.14); }
            else { ctx.moveTo(ccx, ccy - size * 0.46); ctx.lineTo(ccx, ccy + size * 0.46);
              ctx.moveTo(ccx - size * 0.14, ccy + size * 0.28); ctx.lineTo(ccx, ccy + size * 0.46); ctx.lineTo(ccx + size * 0.14, ccy + size * 0.28);
              ctx.moveTo(ccx - size * 0.14, ccy - size * 0.28); ctx.lineTo(ccx, ccy - size * 0.46); ctx.lineTo(ccx + size * 0.14, ccy - size * 0.28); }
            ctx.stroke();
          } else if (t.special === 'bomb') {
            ctx.strokeStyle = 'rgba(20,20,20,0.85)'; ctx.lineWidth = Math.max(2, cell * 0.1);
            ctx.beginPath(); ctx.arc(ccx, ccy, size * 0.42 + Math.sin(sTime * 8) * 1.5, 0, 7); ctx.stroke();
            ctx.fillStyle = '#ffce54'; ctx.beginPath(); ctx.arc(ccx + size * 0.3, ccy - size * 0.34, size * 0.1, 0, 7); ctx.fill();
          }
        }
        ctx.globalAlpha = 1;
      }
      // лёд поверх тайлов
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const n = iceAt(r, c); if (!n) continue;
        const x = cellX(c), y = cellY(r);
        ctx.fillStyle = n >= 2 ? 'rgba(185,225,255,0.62)' : 'rgba(200,232,255,0.42)';
        engine.rr(x + 1, y + 1, cell - 2, cell - 2, 5); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4;
        engine.rr(x + 1, y + 1, cell - 2, cell - 2, 5); ctx.stroke();
        if (n === 1) {   // трещины на последнем слое
          ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + cell * 0.25, y + cell * 0.2); ctx.lineTo(x + cell * 0.5, y + cell * 0.55); ctx.lineTo(x + cell * 0.35, y + cell * 0.8);
          ctx.moveTo(x + cell * 0.5, y + cell * 0.55); ctx.lineTo(x + cell * 0.75, y + cell * 0.65);
          ctx.stroke();
        }
      }
    },
    hud: goalMode ? sceneHud : undefined,
    // отладка/тесты: снимок внутреннего состояния (без рендера)
    _state: function () {
      return { collected: collected, rounds: rounds, phase: phase, targetIdx: targetIdx, targetName: targetName,
               N: N, activeNames: activeNames.slice(), cell: cell, originX: originX, originY: originY,
               movesLeft: movesLeft,
               iceCells: ice.reduce(function (n, row) { return n + row.filter(Boolean).length; }, 0),
               specials: (function () { const out = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const t = grid[r][c]; if (t && t.special) out.push({ r: r, c: c, s: t.special, axis: t.axis }); } return out; })(),
               grid: grid.map(function (row) { return row.map(function (t) { return t ? t.type : null; }); }) };
    },
    // тест-хуки: принудительный спец-тайл и слой льда
    _setSpecial: function (r, c, s, axis) { const t = grid[r][c]; if (t) { t.special = s; t.axis = axis || 'h'; } },
    _setIce: function (r, c, n) { ice[r][c] = n; },
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
