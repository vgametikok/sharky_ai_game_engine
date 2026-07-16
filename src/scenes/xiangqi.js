/* ============================================================
   СЦЕНА: xiangqi (xiangqi.js) — китайские шахматы (сянци)
   ------------------------------------------------------------
   Полные правила сянци: дворец, река, глаз слона, нога коня,
   лафет пушки, летящий генерал, мат/пат (пат = поражение),
   ничья по повторению (3×) и по 100 полуходам без взятий.

   Игрок — красные (ходит первым), ИИ — чёрные.
   ИИ: негамакс + альфа-бета + сортировка взятий; 5 уровней
   (глубина/оценка/случайность), верхние — итеративное
   углубление с лимитом времени.

   Экраны: меню (продолжить/новая игра/настройки) → игра.
   Двойной тап по ЛЮБОЙ фигуре — карточка-подсказка (имя,
   иероглиф, как ходит + мини-схема).

   Раскладки: вертикальная (классика) и горизонтальная
   (доска повёрнута на 90°, красные справа) — авто по аспекту
   или принудительно в настройках.

   CONFIG.assets: board + rG rA rE rH rR rC rS + bG..bS
   (спрайты PixelLab; при отсутствии — диск с иероглифом).

   Сейв (engine.saveState + localStorage вне ленты):
   {v, s:{d,o,m,snd}, g:{b,t,mc,idle,capR,capB}|null, w, sc}
   ============================================================ */
Engine.register('xiangqi', function (engine, cfg) {
  'use strict';
  const FONT = (cfg.theme && cfg.theme.font) || 'Georgia, serif';

  // ═══════════════ ПРАВИЛА / ПРЕДСТАВЛЕНИЕ ДОСКИ ═══════════════
  // Доска: 9 вертикалей (x 0..8) × 10 горизонталей (y 0..9).
  // y=0 — верх (чёрные), y=9 — низ (красные). idx = y*9+x.
  // Фигура: int. тип t = p&7 (1..7 = G A E H R C S), чёрные p>8.
  const TG = 1, TA = 2, TE = 3, TH = 4, TR = 5, TC = 6, TS = 7;
  const BLACK = 8;
  const VAL = [0, 10000, 200, 200, 400, 900, 450, 100];
  const TYPE_CH = '.GAEHRCS';                       // сериализация
  const MATE = 100000;

  function isBlack(p) { return p > BLACK; }
  function side(p) { return p > BLACK ? 'b' : 'r'; }
  function idx(x, y) { return y * 9 + x; }
  function inPalace(x, y, black) { return x >= 3 && x <= 5 && (black ? y <= 2 : y >= 7); }

  function initialBoard() {
    const b = new Array(90).fill(0);
    const back = [TR, TH, TE, TA, TG, TA, TE, TH, TR];
    for (let x = 0; x < 9; x++) { b[idx(x, 0)] = back[x] + BLACK; b[idx(x, 9)] = back[x]; }
    b[idx(1, 2)] = TC + BLACK; b[idx(7, 2)] = TC + BLACK;
    b[idx(1, 7)] = TC; b[idx(7, 7)] = TC;
    for (let x = 0; x < 9; x += 2) { b[idx(x, 3)] = TS + BLACK; b[idx(x, 6)] = TS; }
    return b;
  }

  // ── генерация псевдолегальных ходов (m = from*90+to) ──
  function genMoves(b, blackSide, out) {
    out.length = 0;
    for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
      const f = idx(x, y), p = b[f];
      if (!p || (p > BLACK) !== blackSide) continue;
      const t = p & 7;
      if (t === TG) {
        pushStep(b, out, f, x + 1, y, blackSide, true); pushStep(b, out, f, x - 1, y, blackSide, true);
        pushStep(b, out, f, x, y + 1, blackSide, true); pushStep(b, out, f, x, y - 1, blackSide, true);
      } else if (t === TA) {
        pushStep(b, out, f, x + 1, y + 1, blackSide, true); pushStep(b, out, f, x - 1, y + 1, blackSide, true);
        pushStep(b, out, f, x + 1, y - 1, blackSide, true); pushStep(b, out, f, x - 1, y - 1, blackSide, true);
      } else if (t === TE) {
        for (let d = 0; d < 4; d++) {
          const dx = (d & 1) ? 2 : -2, dy = (d & 2) ? 2 : -2;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) continue;
          if (blackSide ? ny > 4 : ny < 5) continue;              // не пересекает реку
          if (b[idx(x + dx / 2, y + dy / 2)]) continue;           // глаз слона
          pushTo(b, out, f, nx, ny, blackSide);
        }
      } else if (t === TH) {
        for (let d = 0; d < 8; d++) {
          const dx = [1, 2, 2, 1, -1, -2, -2, -1][d], dy = [-2, -1, 1, 2, 2, 1, -1, -2][d];
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx > 8 || ny < 0 || ny > 9) continue;
          const lx = Math.abs(dx) === 2 ? x + dx / 2 : x, ly = Math.abs(dy) === 2 ? y + dy / 2 : y;
          if (b[idx(lx, ly)]) continue;                           // нога коня
          pushTo(b, out, f, nx, ny, blackSide);
        }
      } else if (t === TR || t === TC) {
        for (let d = 0; d < 4; d++) {
          const dx = [1, -1, 0, 0][d], dy = [0, 0, 1, -1][d];
          let nx = x + dx, ny = y + dy, screen = false;
          while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
            const q = b[idx(nx, ny)];
            if (!screen) {
              if (!q) out.push(f * 90 + idx(nx, ny));
              else {
                if (t === TR) { if ((q > BLACK) !== blackSide) out.push(f * 90 + idx(nx, ny)); break; }
                screen = true;                                    // пушка: нашли лафет
              }
            } else if (q) {                                       // пушка бьёт за лафетом
              if ((q > BLACK) !== blackSide) out.push(f * 90 + idx(nx, ny));
              break;
            }
            nx += dx; ny += dy;
          }
        }
      } else if (t === TS) {
        const fw = blackSide ? 1 : -1;
        pushTo2(b, out, f, x, y + fw, blackSide);
        const crossed = blackSide ? y >= 5 : y <= 4;
        if (crossed) { pushTo2(b, out, f, x - 1, y, blackSide); pushTo2(b, out, f, x + 1, y, blackSide); }
      }
    }
    return out;
  }
  function pushStep(b, out, f, nx, ny, blackSide, palace) {  // G/A: шаг с проверкой дворца
    if (nx < 0 || nx > 8 || ny < 0 || ny > 9) return;
    if (palace && !inPalace(nx, ny, blackSide)) return;
    const q = b[idx(nx, ny)];
    if (q && (q > BLACK) === blackSide) return;
    out.push(f * 90 + idx(nx, ny));
  }
  function pushTo(b, out, f, nx, ny, blackSide) {
    const q = b[idx(nx, ny)];
    if (q && (q > BLACK) === blackSide) return;
    out.push(f * 90 + idx(nx, ny));
  }
  function pushTo2(b, out, f, nx, ny, blackSide) {
    if (nx < 0 || nx > 8 || ny < 0 || ny > 9) return;
    pushTo(b, out, f, nx, ny, blackSide);
  }

  // ── шах: атакован ли генерал стороны (включая «летящего генерала») ──
  function findGeneral(b, blackSide) {
    const y0 = blackSide ? 0 : 7;
    for (let y = y0; y < y0 + 3; y++) for (let x = 3; x <= 5; x++)
      if (b[idx(x, y)] === TG + (blackSide ? BLACK : 0)) return idx(x, y);
    return -1;
  }
  function inCheck(b, blackSide) {
    const g = findGeneral(b, blackSide);
    if (g < 0) return true;                                       // генерала съели (в поиске)
    const gx = g % 9, gy = (g / 9) | 0;
    const eR = TR + (blackSide ? 0 : BLACK), eC = TC + (blackSide ? 0 : BLACK),
          eH = TH + (blackSide ? 0 : BLACK), eS = TS + (blackSide ? 0 : BLACK),
          eG = TG + (blackSide ? 0 : BLACK);
    // лучи: колесница / летящий генерал (первая фигура), пушка (вторая)
    for (let d = 0; d < 4; d++) {
      const dx = [1, -1, 0, 0][d], dy = [0, 0, 1, -1][d];
      let nx = gx + dx, ny = gy + dy, seen = 0;
      while (nx >= 0 && nx <= 8 && ny >= 0 && ny <= 9) {
        const q = b[idx(nx, ny)];
        if (q) {
          seen++;
          if (seen === 1) { if (q === eR || (dx === 0 && q === eG)) return true; }
          else { if (q === eC) return true; break; }
        }
        nx += dx; ny += dy;
      }
    }
    // кони (с учётом ноги)
    for (let d = 0; d < 8; d++) {
      const dx = [1, 2, 2, 1, -1, -2, -2, -1][d], dy = [-2, -1, 1, 2, 2, 1, -1, -2][d];
      const hx = gx + dx, hy = gy + dy;
      if (hx < 0 || hx > 8 || hy < 0 || hy > 9) continue;
      if (b[idx(hx, hy)] !== eH) continue;
      const lx = Math.abs(dx) === 2 ? hx - dx / 2 : hx, ly = Math.abs(dy) === 2 ? hy - dy / 2 : hy;
      if (!b[idx(lx, ly)]) return true;
    }
    // солдаты: спереди (для генерала) и сбоку
    const fw = blackSide ? 1 : -1;                                // враг наступает с этой стороны
    if (gy + fw >= 0 && gy + fw <= 9 && b[idx(gx, gy + fw)] === eS) return true;
    if (gx > 0 && b[idx(gx - 1, gy)] === eS) return true;
    if (gx < 8 && b[idx(gx + 1, gy)] === eS) return true;
    return false;
  }

  function legalMoves(b, blackSide) {
    const raw = [], out = [];
    genMoves(b, blackSide, raw);
    for (let i = 0; i < raw.length; i++) {
      const m = raw[i], f = (m / 90) | 0, t = m % 90;
      const cap = b[t]; b[t] = b[f]; b[f] = 0;
      if (!inCheck(b, blackSide)) out.push(m);
      b[f] = b[t]; b[t] = cap;
    }
    return out;
  }

  // ═══════════════ ОЦЕНКА ПОЗИЦИИ (плюс = красные) ═══════════════
  function pst(t, x, y, black) {
    // от лица КРАСНЫХ (низ); для чёрных зеркалим y
    const yy = black ? 9 - y : y;
    if (t === TS) {
      const crossed = yy <= 4;
      if (!crossed) return (6 - yy) * 2;
      return 60 + (4 - yy) * 12 + (4 - Math.abs(x - 4)) * 8;      // за рекой солдат опасен
    }
    if (t === TH) return (4 - Math.abs(x - 4)) * 6 + (yy <= 4 ? 20 : 0);
    if (t === TR) return (yy <= 4 ? 20 : 0);
    if (t === TC) return (Math.abs(x - 4) <= 1 ? 14 : 0);         // пушка на центральной линии
    return 0;
  }
  function evaluate(b, usePst) {
    let e = 0;
    for (let i = 0; i < 90; i++) {
      const p = b[i]; if (!p) continue;
      const t = p & 7, black = p > BLACK;
      let v = VAL[t];
      if (usePst) v += pst(t, i % 9, (i / 9) | 0, black);
      e += black ? -v : v;
    }
    return e;
  }

  // ═══════════════ ПОИСК (негамакс + альфа-бета) ═══════════════
  let nodes = 0, deadline = 0, stopped = false, srchPst = true, useQ = true;
  const MOVEBUF = []; for (let i = 0; i < 24; i++) MOVEBUF.push([]);

  function orderMoves(b, ms) {
    // взятия вперёд (MVV-LVA), лёгкая случайность для разнообразия
    const sc = ms.map(function (m) {
      const cap = b[m % 90];
      return { m: m, s: cap ? VAL[cap & 7] * 10 - VAL[b[(m / 90) | 0] & 7] / 10 : Math.random() * 4 };
    });
    sc.sort(function (a, z) { return z.s - a.s; });
    for (let i = 0; i < ms.length; i++) ms[i] = sc[i].m;
  }
  function checkStop() {
    nodes++;
    if ((nodes & 2047) === 0 && (performance.now() > deadline || nodes > 900000)) stopped = true;
  }
  function qsearch(b, alpha, beta, blackSide, ply) {
    checkStop(); if (stopped) return 0;
    const stand = blackSide ? -evaluate(b, srchPst) : evaluate(b, srchPst);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (ply > 20) return alpha;
    const ms = [];
    genMoves(b, blackSide, ms);
    const caps = ms.filter(function (m) { return b[m % 90]; });
    orderMoves(b, caps);
    for (let i = 0; i < caps.length; i++) {
      const m = caps[i], f = (m / 90) | 0, t = m % 90;
      const cap = b[t]; b[t] = b[f]; b[f] = 0;
      let v;
      if (inCheck(b, blackSide)) v = null;
      else v = -qsearch(b, -beta, -alpha, !blackSide, ply + 1);
      b[f] = b[t]; b[t] = cap;
      if (v === null) continue;
      if (stopped) return 0;
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }
  function search(b, depth, alpha, beta, blackSide, ply) {
    checkStop(); if (stopped) return 0;
    if (depth === 0)
      return useQ ? qsearch(b, alpha, beta, blackSide, ply)
                  : (blackSide ? -evaluate(b, srchPst) : evaluate(b, srchPst));
    const ms = MOVEBUF[ply] || (MOVEBUF[ply] = []);
    genMoves(b, blackSide, ms);
    orderMoves(b, ms);
    let any = false;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i], f = (m / 90) | 0, t = m % 90;
      const cap = b[t]; b[t] = b[f]; b[f] = 0;
      let v = null;
      if (!inCheck(b, blackSide)) { any = true; v = -search(b, depth - 1, -beta, -alpha, !blackSide, ply + 1); }
      b[f] = b[t]; b[t] = cap;
      if (stopped) return 0;
      if (v === null) continue;
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    if (!any) return -(MATE - ply);                               // мат/пат = проигрыш ходящего
    return alpha;
  }

  // Уровни сложности ИИ
  const AI = [
    { d: 1, slack: 900, rnd: 0.45, time: 300, pst: false, q: false },
    { d: 2, slack: 250, rnd: 0.12, time: 500, pst: false, q: false },
    { d: 2, slack: 0,   rnd: 0,    time: 900, pst: true,  q: true },
    { d: 3, slack: 0,   rnd: 0,    time: 1100, pst: true, q: true },
    { d: 4, slack: 0,   rnd: 0,    time: 1400, pst: true, q: true },
  ];
  function aiBestMove(b, level) {
    const L = AI[Math.max(0, Math.min(4, level - 1))];
    srchPst = L.pst; useQ = L.q;
    nodes = 0; stopped = false; deadline = performance.now() + L.time;
    const legal = legalMoves(b, true);
    if (!legal.length) return -1;
    if (L.rnd && Math.random() < L.rnd) return legal[(Math.random() * legal.length) | 0];
    // счёт каждого корневого хода (для slack — полное окно на малой глубине)
    const scored = [];
    if (L.slack > 0) {
      for (let i = 0; i < legal.length; i++) {
        const m = legal[i], f = (m / 90) | 0, t = m % 90;
        const cap = b[t]; b[t] = b[f]; b[f] = 0;
        const v = -search(b, L.d - 1, -MATE, MATE, false, 1);
        b[f] = b[t]; b[t] = cap;
        scored.push({ m: m, v: v });
      }
      let best = -MATE * 2;
      for (let i = 0; i < scored.length; i++) if (scored[i].v > best) best = scored[i].v;
      const pool = scored.filter(function (s) { return s.v >= best - L.slack; });
      return pool[(Math.random() * pool.length) | 0].m;
    }
    // сильные уровни: итеративное углубление с лимитом времени
    let bestM = legal[0];
    for (let d = 2; d <= L.d; d++) {
      let alpha = -MATE * 2, curBest = -1;
      orderMoves(b, legal);
      if (bestM >= 0) {                                           // прошлый лучший — первым
        const bi = legal.indexOf(bestM);
        if (bi > 0) { legal.splice(bi, 1); legal.unshift(bestM); }
      }
      for (let i = 0; i < legal.length; i++) {
        const m = legal[i], f = (m / 90) | 0, t = m % 90;
        const cap = b[t]; b[t] = b[f]; b[f] = 0;
        const v = -search(b, d - 1, -MATE * 2, -alpha, false, 1);
        b[f] = b[t]; b[t] = cap;
        if (stopped) break;
        if (v > alpha) { alpha = v; curBest = m; }
      }
      if (stopped) break;
      if (curBest >= 0) bestM = curBest;
      if (alpha > MATE - 100) break;                              // нашли мат — хватит
    }
    return bestM;
  }

  // ═══════════════ СПРАВОЧНИК ФИГУР (подсказки) ═══════════════
  const INFO = {
    1: { name: 'Генерал', hz: ['帥', '將'], py: 'шуай / цзян',
         desc: 'Ходит на одну точку по вертикали или горизонтали и не покидает дворец (квадрат 3×3). Генералы не могут стоять друг напротив друга на открытой вертикали. Мат генералу — конец партии.' },
    2: { name: 'Советник', hz: ['仕', '士'], py: 'ши',
         desc: 'Ходит на одну точку по диагонали и только внутри дворца. Верный телохранитель генерала.' },
    3: { name: 'Слон', hz: ['相', '象'], py: 'сян',
         desc: 'Прыгает ровно на две точки по диагонали и не пересекает реку. Если промежуточная точка («глаз слона») занята — ход невозможен.' },
    4: { name: 'Конь', hz: ['傌', '馬'], py: 'ма',
         desc: 'Ходит буквой «Г»: одна точка по прямой, затем одна наискось. Если вплотную по прямой стоит любая фигура («нога коня») — ход в ту сторону невозможен.' },
    5: { name: 'Колесница', hz: ['俥', '車'], py: 'цзюй',
         desc: 'Самая сильная фигура: ходит на любое число точек по вертикали или горизонтали, как ладья в шахматах.' },
    6: { name: 'Пушка', hz: ['炮', '砲'], py: 'пао',
         desc: 'Ходит как колесница, но БЬЁТ иначе: только перепрыгнув ровно через одну любую фигуру («лафет»). Без лафета взятие невозможно.' },
    7: { name: 'Солдат', hz: ['兵', '卒'], py: 'бин / цзу',
         desc: 'Ходит на одну точку вперёд и никогда не отступает. После переправы через реку может также ходить на одну точку вбок.' },
  };
  const LVL_NAMES = ['Новичок', 'Ученик', 'Боец', 'Мастер', 'Гроссмейстер'];

  // ═══════════════ СКИНЫ (наборы фигур/досок) ═══════════════
  // pre — префикс ключей спрайтов; flat — классика (диск-спрайт + иероглиф
  // шрифтом, отдельных фигур нет); disc* = [светлый, тёмный, кольцо]
  const SKINS = {
    figures: { name: 'Фигуры', pre: '', board: 'board', ins: 0.115,
      grid: 'rgba(58,30,10,0.75)', river: 'rgba(58,30,10,0.55)',
      edge: 'rgba(66,34,12,0.9)', fb: ['#d8b070', '#b88a48'],
      discR: ['#f4d9a0', '#caa05c', '#a02818'], discB: ['#5a5f6e', '#2c303c', '#8de0c0'],
      glyphR: '#7a1408', glyphB: '#bfe8d8' },
    classic: { name: 'Классика', pre: '', board: 'board', ins: 0.115, flat: ['clR', 'clB'],
      grid: 'rgba(58,30,10,0.75)', river: 'rgba(58,30,10,0.55)',
      edge: 'rgba(66,34,12,0.9)', fb: ['#d8b070', '#b88a48'],
      discR: ['#f0d8a8', '#c8a060', '#a02818'], discB: ['#3a3630', '#181410', '#3aa070'],
      glyphR: '#8c1410', glyphB: '#c8f0d8' },
    cyber: { name: 'Киберпанк', pre: 'cy_', board: 'cyBoard', ins: 0.17,
      grid: 'rgba(80,235,255,0.45)', river: 'rgba(150,240,255,0.85)', glow: '#40e0ff',
      edge: 'rgba(30,140,160,0.9)', fb: ['#141824', '#0a0c14'],
      discR: ['#4a1638', '#200a1c', '#ff45b0'], discB: ['#103440', '#081418', '#38f0ff'],
      glyphR: '#ff8ad0', glyphB: '#a0f4ff',
      bg: ['#150b28', '#060310'], neon: true, badge: true },
    animals: { name: 'Зверята', pre: 'an_', board: 'anBoard', ins: 0.2,
      grid: 'rgba(70,105,40,0.65)', river: 'rgba(50,115,160,0.75)',
      edge: 'rgba(88,135,58,0.95)', fb: ['#cfe8a0', '#a8d078'],
      discR: ['#ffedc8', '#f0b060', '#e05030'], discB: ['#d8f0ff', '#80bce4', '#2878b8'],
      glyphR: '#a03818', glyphB: '#184a78',
      bg: ['#33481f', '#16200e'] },
  };
  const SKIN_ORDER = ['figures', 'classic', 'cyber', 'animals'];
  function skin() { return SKINS[SET.k] || SKINS.figures; }

  // ═══════════════ СОСТОЯНИЕ ИГРЫ / UI ═══════════════
  let W = 360, H = 640, headerH = 70;
  let ui = 'menu';                       // menu | settings | play
  let bd = null, turn = 'r', mc = 0, idle = 0;
  let capR = [], capB = [];              // типы съеденных: capR — потери красных
  let hist = {};                         // повторения позиций
  let gameOn = false;
  let sel = -1, selMoves = [], selEnemy = false, lastMv = null;
  let anim = null;                       // {f,t,p,tm,dur}
  let thinking = false, thinkT = 0;
  let toastT = 0, toastText = '';
  let hintCard = null;                   // {t, black, x, y}
  let lastTap = { t: 0, x: 0, y: 0 };
  let checkFlash = 0;
  let SET = { d: 1, o: 'auto', m: true, snd: true, k: 'figures' };
  let wins = 0, scoreP = 0;
  let btns = [];                         // хит-зоны текущего экрана
  // геометрия доски
  let cell = 32, ox = 40, oy = 90, horiz = false, pad = 20;

  function snd(f, d, w, v) { if (SET.snd) engine.beep(f, d, w, v); }

  // ── сериализация / сейв ──
  function serialize() {
    let s = '';
    for (let i = 0; i < 90; i++) {
      const p = bd[i];
      s += p ? (p > BLACK ? TYPE_CH[p & 7].toLowerCase() : TYPE_CH[p & 7]) : '.';
    }
    return s;
  }
  function deserialize(s) {
    const b = new Array(90).fill(0);
    for (let i = 0; i < 90 && i < s.length; i++) {
      const ch = s[i]; if (ch === '.') continue;
      const t = TYPE_CH.indexOf(ch.toUpperCase());
      if (t > 0) b[i] = t + (ch === ch.toLowerCase() ? BLACK : 0);
    }
    return b;
  }
  function saveObj() {
    return { v: 1, s: { d: SET.d, o: SET.o, m: SET.m, snd: SET.snd, k: SET.k },
      g: gameOn ? { b: serialize(), t: turn, mc: mc, idle: idle,
                    capR: capR.join(''), capB: capB.join(''), h: hist } : null,
      w: wins, sc: scoreP };
  }
  function save() {
    const o = saveObj();
    engine.saveState(o);
    try { localStorage.setItem('xiangqi_save', JSON.stringify(o)); } catch (e) {}
  }
  function loadSave() {
    let o = engine.loadState();
    if (!o) { try { o = JSON.parse(localStorage.getItem('xiangqi_save')); } catch (e) {} }
    if (!o || o.v !== 1) return;
    if (o.s) {
      SET.d = o.s.d || 1; SET.o = o.s.o || 'auto'; SET.m = o.s.m !== false; SET.snd = o.s.snd !== false;
      SET.k = SKINS[o.s.k] ? o.s.k : 'figures';
    }
    wins = o.w || 0; scoreP = o.sc || 0;
    if (o.g && o.g.b) {
      bd = deserialize(o.g.b); turn = o.g.t === 'b' ? 'b' : 'r';
      mc = o.g.mc || 0; idle = o.g.idle || 0;
      capR = (o.g.capR || '').split('').filter(Boolean);
      capB = (o.g.capB || '').split('').filter(Boolean);
      hist = o.g.h || {}; gameOn = true;
    }
  }

  // ── жизненный цикл партии ──
  function newGame() {
    bd = initialBoard(); turn = 'r'; mc = 0; idle = 0;
    capR = []; capB = []; hist = {}; gameOn = true;
    sel = -1; selMoves = []; lastMv = null; anim = null; thinking = false;
    hist[serialize() + turn] = 1;
    ui = 'play'; layoutBoard(); save();
  }
  function finishGame(winner) {
    gameOn = false; thinking = false; sel = -1;
    let label;
    if (winner === 'r') {
      wins++; scoreP += SET.d; engine.setScore(scoreP);
      label = 'ПОБЕДА!'; snd(660, 0.12, 'triangle', 0.2);
      setTimeout(function () { snd(880, 0.2, 'triangle', 0.2); }, 130);
    } else if (winner === 'b') { label = 'ПОРАЖЕНИЕ'; snd(160, 0.4, 'sawtooth', 0.15); }
    else { label = 'НИЧЬЯ'; snd(330, 0.2, 'sine', 0.12); }
    save();
    engine.gameOver({ label: label });
  }
  function applyMove(m, animate) {
    const f = (m / 90) | 0, t = m % 90;
    const p = bd[f], cap = bd[t];
    if (cap) {
      (cap > BLACK ? capB : capR).push(TYPE_CH[cap & 7]);
      idle = 0;
      const cx = sx(t % 9, (t / 9) | 0), cy = sy(t % 9, (t / 9) | 0);
      engine.burst(cx, cy, { count: 10, color: cap > BLACK ? '#4a5568' : '#e0533d' });
      snd(200, 0.09, 'square', 0.14);
    } else { idle++; snd(480, 0.04, 'sine', 0.08); }
    bd[t] = p; bd[f] = 0;
    lastMv = m; mc++;
    if (animate) anim = { f: f, t: t, p: p, tm: 0, dur: 0.16 };
    turn = (turn === 'r') ? 'b' : 'r';
    sel = -1; selMoves = [];
    // повторения / правило 100 полуходов без взятий
    const key = serialize() + turn;
    hist[key] = (hist[key] || 0) + 1;
    save();
    const blackToMove = turn === 'b';
    const moves = legalMoves(bd, blackToMove);
    if (!moves.length) { finishGame(turn === 'r' ? 'b' : 'r'); return; }      // мат или пат
    if (hist[key] >= 3 || idle >= 100) { finishGame(null); return; }
    if (inCheck(bd, blackToMove)) {
      checkFlash = 1.2; toast('ШАХ!');
      snd(760, 0.1, 'square', 0.12);
    }
  }
  function playerMove(m) { applyMove(m, true); if (gameOn && turn === 'b') { thinking = true; thinkT = 0.45; } }
  function aiMove() {
    const m = aiBestMove(bd, SET.d);
    thinking = false;
    if (m < 0) { finishGame('r'); return; }
    applyMove(m, true);
  }
  function toast(t) { toastText = t; toastT = 1.4; }

  // ═══════════════ ГЕОМЕТРИЯ / РАСКЛАДКИ ═══════════════
  function layoutBoard() {
    horiz = SET.o === 'h' || (SET.o === 'auto' && W > H * 1.02);
    const topH = headerH, botH = Math.max(30, H * 0.05);
    const availW = W - 12, availH = H - topH - botH - 8;
    // вертикально: 8 промежутков по x, 9 по y; горизонтально: 9 по x, 8 по y
    const gx = horiz ? 9 : 8, gy = horiz ? 8 : 9;
    cell = Math.min(availW / (gx + 1.3), availH / (gy + 1.3));
    pad = cell * 0.65;
    ox = (W - gx * cell) / 2;
    oy = topH + 4 + (availH - gy * cell) / 2;
  }
  function sx(x, y) { return horiz ? ox + y * cell : ox + x * cell; }
  function sy(x, y) { return horiz ? oy + (8 - x) * cell : oy + y * cell; }
  function fromScreen(px, py) {
    let bx, by;
    if (horiz) { bx = 8 - Math.round((py - oy) / cell); by = Math.round((px - ox) / cell); }
    else { bx = Math.round((px - ox) / cell); by = Math.round((py - oy) / cell); }
    if (bx < 0 || bx > 8 || by < 0 || by > 9) return -1;
    const dx = px - sx(bx, by), dy = py - sy(bx, by);
    if (dx * dx + dy * dy > cell * cell * 0.36) return -1;
    return idx(bx, by);
  }

  // ═══════════════ РЕНДЕР ═══════════════
  function spr(key) { const im = engine.img(key); return (im && im.complete && im.naturalWidth) ? im : null; }
  function pieceKey(p) { return (p > BLACK ? 'b' : 'r') + TYPE_CH[p & 7]; }

  function drawBoardBase(ctx) {
    const K = skin();
    const gx = horiz ? 9 : 8, gy = horiz ? 8 : 9;
    const bx = ox - pad, by = oy - pad, bw = gx * cell + pad * 2, bh = gy * cell + pad * 2;
    const img = spr(K.board);
    ctx.save();
    engine.rr(bx, by, bw, bh, cell * 0.25); ctx.clip();
    if (img) {
      // берём внутреннюю часть текстуры (рама картинки — только в меню)
      const ins = K.ins, iw = img.naturalWidth, ih = img.naturalHeight;
      const sx0 = iw * ins, sy0 = ih * ins, sw = iw - sx0 * 2, sh = ih - sy0 * 2;
      if (horiz) {                                   // доску-текстуру поворачиваем под раскладку
        ctx.translate(bx + bw / 2, by + bh / 2); ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, sx0, sy0, sw, sh, -bh / 2, -bw / 2, bh, bw);
      } else ctx.drawImage(img, sx0, sy0, sw, sh, bx, by, bw, bh);
    } else {
      const g = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
      g.addColorStop(0, K.fb[0]); g.addColorStop(1, K.fb[1]);
      ctx.fillStyle = g; ctx.fillRect(bx, by, bw, bh);
    }
    ctx.restore();
    ctx.strokeStyle = K.edge; ctx.lineWidth = Math.max(2, cell * 0.07);
    engine.rr(bx, by, bw, bh, cell * 0.25); ctx.stroke();

    // сетка (через трансформацию точек — работает в обеих раскладках)
    if (K.neon) { ctx.save(); ctx.shadowColor = K.glow; ctx.shadowBlur = Math.max(3, cell * 0.12); }
    ctx.strokeStyle = K.grid; ctx.lineWidth = Math.max(1, cell * 0.035);
    ctx.beginPath();
    for (let y = 0; y < 10; y++) { ctx.moveTo(sx(0, y), sy(0, y)); ctx.lineTo(sx(8, y), sy(8, y)); }
    for (let x = 0; x < 9; x++) {
      if (x === 0 || x === 8) { ctx.moveTo(sx(x, 0), sy(x, 0)); ctx.lineTo(sx(x, 9), sy(x, 9)); }
      else {
        ctx.moveTo(sx(x, 0), sy(x, 0)); ctx.lineTo(sx(x, 4), sy(x, 4));
        ctx.moveTo(sx(x, 5), sy(x, 5)); ctx.lineTo(sx(x, 9), sy(x, 9));
      }
    }
    // дворцы
    ctx.moveTo(sx(3, 0), sy(3, 0)); ctx.lineTo(sx(5, 2), sy(5, 2));
    ctx.moveTo(sx(5, 0), sy(5, 0)); ctx.lineTo(sx(3, 2), sy(3, 2));
    ctx.moveTo(sx(3, 7), sy(3, 7)); ctx.lineTo(sx(5, 9), sy(5, 9));
    ctx.moveTo(sx(5, 7), sy(5, 7)); ctx.lineTo(sx(3, 9), sy(3, 9));
    ctx.stroke();
    // маркеры пушек и солдат
    const marks = [[1, 2], [7, 2], [1, 7], [7, 7]];
    for (let x = 0; x < 9; x += 2) { marks.push([x, 3]); marks.push([x, 6]); }
    ctx.lineWidth = Math.max(1, cell * 0.03);
    for (let i = 0; i < marks.length; i++) {
      const mx = marks[i][0], my = marks[i][1], X = sx(mx, my), Y = sy(mx, my);
      const s = cell * 0.12, o = cell * 0.07;
      ctx.beginPath();
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) {
        if (mx === 0 && q[0] < 0) return; if (mx === 8 && q[0] > 0) return;
        ctx.moveTo(X + q[0] * o + q[0] * s, Y + q[1] * o); ctx.lineTo(X + q[0] * o, Y + q[1] * o);
        ctx.lineTo(X + q[0] * o, Y + q[1] * o + q[1] * s);
      });
      ctx.stroke();
    }
    if (K.neon) ctx.restore();
    // река
    if (K.neon) { ctx.save(); ctx.shadowColor = K.glow; ctx.shadowBlur = cell * 0.3; }
    ctx.fillStyle = K.river;
    ctx.font = Math.round(cell * 0.55) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const rX1 = (sx(2, 4) + sx(2, 5)) / 2, rY1 = (sy(2, 4) + sy(2, 5)) / 2;
    const rX2 = (sx(6, 4) + sx(6, 5)) / 2, rY2 = (sy(6, 4) + sy(6, 5)) / 2;
    if (horiz) {
      ctx.save(); ctx.translate(rX1, rY1); ctx.rotate(Math.PI / 2); ctx.fillText('楚 河', 0, 0); ctx.restore();
      ctx.save(); ctx.translate(rX2, rY2); ctx.rotate(Math.PI / 2); ctx.fillText('漢 界', 0, 0); ctx.restore();
    } else { ctx.fillText('楚 河', rX1, rY1); ctx.fillText('漢 界', rX2, rY2); }
    if (K.neon) ctx.restore();
  }

  function discBase(ctx, X, Y, r, K, black) {
    const c = black ? K.discB : K.discR;
    const g = ctx.createRadialGradient(X - r * 0.3, Y - r * 0.3, r * 0.2, X, Y, r);
    g.addColorStop(0, c[0]); g.addColorStop(1, c[1]);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
    if (K.neon) { ctx.save(); ctx.shadowColor = c[2]; ctx.shadowBlur = r * 0.55; }
    ctx.strokeStyle = c[2];
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.beginPath(); ctx.arc(X, Y, r * 0.88, 0, 7); ctx.stroke();
    if (K.neon) ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.stroke();
  }
  function glyphText(ctx, p, X, Y, size, color, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.45; }
    ctx.fillStyle = color;
    ctx.font = 'bold ' + Math.round(size) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(INFO[p & 7].hz[p > BLACK ? 1 : 0], X, Y);
    ctx.restore();
  }
  // универсальная отрисовка фигуры радиусом r (доска, меню, карточка)
  function drawPieceR(ctx, p, X, Y, r) {
    const K = skin(), black = p > BLACK;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(X, Y + r * 0.28, r * 1.02, r * 0.5, 0, 0, 7); ctx.fill();
    if (K.flat) {                                    // классика: диск + иероглиф шрифтом
      const di = spr(K.flat[black ? 1 : 0]);
      if (di) ctx.drawImage(di, X - r * 1.04, Y - r * 1.04, r * 2.08, r * 2.08);
      else discBase(ctx, X, Y, r, K, black);
      glyphText(ctx, p, X, Y + r * 0.02, r * 0.98, black ? K.glyphB : K.glyphR);
      return;
    }
    discBase(ctx, X, Y, r, K, black);
    const im = spr(K.pre + pieceKey(p));
    if (im) {
      const s = r * 2.52;
      ctx.drawImage(im, X - s / 2, Y - s * 0.78, s, s);
      // киберпанк: неон-иероглиф-бейдж на дворцовых фигурах и пушке
      const t = p & 7;
      if (K.badge && (t === TG || t === TA || t === TC))
        glyphText(ctx, p, X - r * 0.72, Y - r * 0.52, r * 0.62, black ? K.glyphB : K.glyphR, black ? K.discB[2] : K.discR[2]);
    } else {
      glyphText(ctx, p, X, Y + r * 0.03, r * 1.05, black ? K.glyphB : K.glyphR, K.neon ? (black ? K.discB[2] : K.discR[2]) : null);
    }
  }
  function drawPiece(ctx, p, X, Y, scale) { drawPieceR(ctx, p, X, Y, cell * 0.42 * (scale || 1)); }

  function drawPlay(ctx) {
    drawBoardBase(ctx);
    // подсветка последнего хода
    if (lastMv != null) {
      const f = (lastMv / 90) | 0, t = lastMv % 90;
      ctx.strokeStyle = 'rgba(255,214,90,0.55)'; ctx.lineWidth = 2;
      [f, t].forEach(function (i) {
        ctx.beginPath(); ctx.arc(sx(i % 9, (i / 9) | 0), sy(i % 9, (i / 9) | 0), cell * 0.46, 0, 7); ctx.stroke();
      });
    }
    // выбор + доступные ходы (свои — зелёные, противника — оранжевые)
    if (sel >= 0) {
      ctx.strokeStyle = selEnemy ? 'rgba(255,140,70,0.95)' : '#ffd75e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(sx(sel % 9, (sel / 9) | 0), sy(sel % 9, (sel / 9) | 0), cell * 0.5, 0, 7); ctx.stroke();
      if (SET.m) for (let i = 0; i < selMoves.length; i++) {
        const t = selMoves[i] % 90, X = sx(t % 9, (t / 9) | 0), Y = sy(t % 9, (t / 9) | 0);
        if (bd[t]) { ctx.strokeStyle = 'rgba(224,83,61,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, cell * 0.44, 0, 7); ctx.stroke(); }
        else {
          ctx.fillStyle = selEnemy ? 'rgba(255,150,60,0.8)' : 'rgba(120,220,130,0.8)';
          ctx.beginPath(); ctx.arc(X, Y, cell * 0.14, 0, 7); ctx.fill();
        }
      }
    }
    // шах — пульс вокруг генерала
    if (checkFlash > 0 && gameOn) {
      const g = findGeneral(bd, turn === 'b');
      if (g >= 0) {
        ctx.strokeStyle = 'rgba(255,60,40,' + (0.4 + 0.5 * Math.abs(Math.sin(checkFlash * 9))) + ')';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(sx(g % 9, (g / 9) | 0), sy(g % 9, (g / 9) | 0), cell * 0.55, 0, 7); ctx.stroke();
      }
    }
    // фигуры (порядок по экранному y, движущаяся — поверх)
    const order = [];
    for (let i = 0; i < 90; i++) if (bd[i] && !(anim && anim.t === i)) order.push(i);
    order.sort(function (a, z) { return sy(a % 9, (a / 9) | 0) - sy(z % 9, (z / 9) | 0); });
    for (let k = 0; k < order.length; k++) {
      const i = order[k];
      drawPiece(ctx, bd[i], sx(i % 9, (i / 9) | 0), sy(i % 9, (i / 9) | 0), 1);
    }
    if (anim) {
      const k = Math.min(1, anim.tm / anim.dur), e = 1 - (1 - k) * (1 - k);
      const fx = sx(anim.f % 9, (anim.f / 9) | 0), fy = sy(anim.f % 9, (anim.f / 9) | 0);
      const tx = sx(anim.t % 9, (anim.t / 9) | 0), ty = sy(anim.t % 9, (anim.t / 9) | 0);
      drawPiece(ctx, anim.p, fx + (tx - fx) * e, fy + (ty - fy) * e, 1.06);
    }
    // тост
    if (toastT > 0) {
      ctx.fillStyle = 'rgba(20,10,4,0.8)';
      engine.rr(W / 2 - 70, H * 0.42 - 20, 140, 40, 20); ctx.fill();
      ctx.fillStyle = '#ffd75e'; ctx.font = 'bold 18px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(toastText, W / 2, H * 0.42);
    }
    if (hintCard) drawHintCard(ctx);
  }

  // ── карточка-подсказка фигуры ──
  function wrap(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '', yy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = words[i]; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, x, yy);
    return yy + lh;
  }
  function drawHintCard(ctx) {
    ctx.fillStyle = 'rgba(8,5,2,0.72)'; ctx.fillRect(0, 0, W, H);
    const cw = Math.min(W * 0.9, 330), ch = Math.min(H * 0.86, 470);
    const cx = (W - cw) / 2, cy = (H - ch) / 2;
    const info = INFO[hintCard.t];
    ctx.fillStyle = '#f2ddb2';
    engine.rr(cx, cy, cw, ch, 14); ctx.fill();
    ctx.strokeStyle = '#7a4a18'; ctx.lineWidth = 3;
    engine.rr(cx, cy, cw, ch, 14); ctx.stroke();
    ctx.strokeStyle = 'rgba(122,74,24,0.4)'; ctx.lineWidth = 1;
    engine.rr(cx + 6, cy + 6, cw - 12, ch - 12, 10); ctx.stroke();
    // спрайт
    const p = hintCard.t + (hintCard.black ? BLACK : 0);
    drawPieceBig(ctx, p, cx + cw / 2, cy + 62, 34);
    // имя
    ctx.fillStyle = '#4a2408'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 21px ' + FONT;
    ctx.fillText(info.name, cx + cw / 2, cy + 128);
    ctx.font = '15px serif'; ctx.fillStyle = '#7a4a18';
    ctx.fillText(info.hz[hintCard.black ? 1 : 0] + ' · ' + info.py, cx + cw / 2, cy + 148);
    // описание
    ctx.font = '13px ' + FONT; ctx.fillStyle = '#3a2008'; ctx.textAlign = 'left';
    const yAfter = wrap(ctx, info.desc, cx + 18, cy + 174, cw - 36, 17);
    // мини-схема ходов
    drawMoveDiagram(ctx, hintCard.t, cx + cw / 2, Math.min(cy + ch - 74, yAfter + 66), Math.min(24, cw / 13));
    ctx.font = 'italic 11px ' + FONT; ctx.fillStyle = 'rgba(74,36,8,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText('коснитесь, чтобы закрыть', cx + cw / 2, cy + ch - 12);
  }
  function drawPieceBig(ctx, p, X, Y, r) { drawPieceR(ctx, p, X, Y, r); }
  function drawMoveDiagram(ctx, t, cx, cy, c) {
    // сетка 5×5, фигура в центре; зелёные точки — ходы, серые — блокираторы
    ctx.strokeStyle = 'rgba(74,36,8,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.moveTo(cx - 2 * c, cy + i * c); ctx.lineTo(cx + 2 * c, cy + i * c);
      ctx.moveTo(cx + i * c, cy - 2 * c); ctx.lineTo(cx + i * c, cy + 2 * c);
    }
    ctx.stroke();
    function dot(dx, dy, style) {
      const X = cx + dx * c, Y = cy + dy * c;
      if (style === 'move') { ctx.fillStyle = 'rgba(50,160,70,0.95)'; ctx.beginPath(); ctx.arc(X, Y, c * 0.22, 0, 7); ctx.fill(); }
      else if (style === 'block') {
        ctx.strokeStyle = 'rgba(150,40,30,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(X - c * 0.16, Y - c * 0.16); ctx.lineTo(X + c * 0.16, Y + c * 0.16);
        ctx.moveTo(X + c * 0.16, Y - c * 0.16); ctx.lineTo(X - c * 0.16, Y + c * 0.16); ctx.stroke();
      } else if (style === 'screen') { ctx.fillStyle = 'rgba(90,90,100,0.95)'; ctx.beginPath(); ctx.arc(X, Y, c * 0.2, 0, 7); ctx.fill(); }
      else if (style === 'target') {
        ctx.strokeStyle = 'rgba(200,50,30,0.95)'; ctx.lineWidth = 2.4;
        ctx.beginPath(); ctx.arc(X, Y, c * 0.26, 0, 7); ctx.stroke();
      }
    }
    // сама фигура
    ctx.fillStyle = '#a02818'; ctx.beginPath(); ctx.arc(cx, cy, c * 0.3, 0, 7); ctx.fill();
    if (t === TG) { dot(1, 0, 'move'); dot(-1, 0, 'move'); dot(0, 1, 'move'); dot(0, -1, 'move'); }
    else if (t === TA) { dot(1, 1, 'move'); dot(-1, 1, 'move'); dot(1, -1, 'move'); dot(-1, -1, 'move'); }
    else if (t === TE) {
      dot(2, 2, 'move'); dot(-2, 2, 'move'); dot(2, -2, 'move'); dot(-2, -2, 'move');
      dot(1, 1, 'block'); dot(-1, -1, 'block');
    } else if (t === TH) {
      [[1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, -1], [-1, -2]].forEach(function (d) { dot(d[0], d[1], 'move'); });
      dot(0, -1, 'block');
    } else if (t === TR) {
      for (let i = 1; i <= 2; i++) { dot(i, 0, 'move'); dot(-i, 0, 'move'); dot(0, i, 'move'); dot(0, -i, 'move'); }
    } else if (t === TC) {
      dot(1, 0, 'move'); dot(2, 0, 'move'); dot(-1, 0, 'move'); dot(-2, 0, 'move'); dot(0, 1, 'move');
      dot(0, -1, 'screen'); dot(0, -2, 'target');               // прыжок через лафет
    } else if (t === TS) { dot(0, -1, 'move'); dot(1, 0, 'move'); dot(-1, 0, 'move'); }
    if (t === TS) {
      ctx.font = 'italic 10px ' + FONT; ctx.fillStyle = 'rgba(74,36,8,0.65)';
      ctx.textAlign = 'center';
      ctx.fillText('вбок — после реки', cx, cy + 2.8 * c);
    }
    if (t === TC) {
      ctx.font = 'italic 10px ' + FONT; ctx.fillStyle = 'rgba(74,36,8,0.65)';
      ctx.textAlign = 'center';
      ctx.fillText('бьёт через «лафет»', cx, cy + 2.8 * c);
    }
  }

  // ── меню и настройки ──
  function button(ctx, x, y, w, h, label, id, accent, disabled) {
    ctx.fillStyle = disabled ? 'rgba(255,255,255,0.06)' : (accent ? '#a02818' : 'rgba(244,217,160,0.12)');
    engine.rr(x, y, w, h, h / 2); ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(244,227,176,0.15)' : (accent ? '#e8b04a' : 'rgba(244,227,176,0.5)');
    ctx.lineWidth = 2; engine.rr(x, y, w, h, h / 2); ctx.stroke();
    ctx.fillStyle = disabled ? 'rgba(244,227,176,0.3)' : '#f4e3b0';
    ctx.font = 'bold ' + Math.round(h * 0.42) + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2 + 1);
    if (!disabled) btns.push({ x: x, y: y, w: w, h: h, id: id });
  }
  function drawMenu(ctx) {
    // фон: доска в глубине
    const img = spr(skin().board);
    if (img) {
      ctx.globalAlpha = 0.25;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      ctx.drawImage(img, (W - img.naturalWidth * s) / 2, (H - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(232,176,74,0.85)';
    ctx.font = Math.round(Math.min(W, H) * 0.09) + 'px serif';
    ctx.fillText('象 棋', W / 2, H * 0.16);
    ctx.fillStyle = '#f4e3b0';
    ctx.font = 'bold ' + Math.round(Math.min(W, H) * 0.13) + 'px ' + FONT;
    ctx.fillText('СЯНЦИ', W / 2, H * 0.26);
    ctx.fillStyle = 'rgba(244,227,176,0.75)';
    ctx.font = Math.round(Math.min(W, H) * 0.042) + 'px ' + FONT;
    ctx.fillText('китайские шахматы', W / 2, H * 0.33);
    // две фигуры по бокам строки с иероглифами (выше крупного заголовка)
    drawPieceBig(ctx, TG, W * 0.15, H * 0.155, Math.min(W, H) * 0.062);
    drawPieceBig(ctx, TG + BLACK, W * 0.85, H * 0.155, Math.min(W, H) * 0.062);

    const bw = Math.min(W * 0.66, 250), bh = Math.min(52, H * 0.085), bx = (W - bw) / 2;
    let by = H * 0.42;
    if (gameOn) { button(ctx, bx, by, bw, bh, 'Продолжить', 'continue', true); by += bh * 1.35; }
    button(ctx, bx, by, bw, bh, 'Новая игра', 'new', !gameOn); by += bh * 1.35;
    button(ctx, bx, by, bw, bh, 'Настройки', 'settings'); by += bh * 1.5;
    ctx.fillStyle = 'rgba(244,227,176,0.6)';
    ctx.font = Math.round(Math.min(W, H) * 0.036) + 'px ' + FONT;
    ctx.fillText('Сложность: ' + SET.d + ' — ' + LVL_NAMES[SET.d - 1], W / 2, by + 8);
    if (wins > 0) ctx.fillText('Побед: ' + wins, W / 2, by + 8 + Math.min(W, H) * 0.055);
    ctx.fillStyle = 'rgba(244,227,176,0.45)';
    ctx.font = 'italic ' + Math.round(Math.min(W, H) * 0.032) + 'px ' + FONT;
    ctx.fillText('в игре: двойной тап по фигуре — подсказка', W / 2, H * 0.94);
  }
  function arrowBtn(ctx, x, y, r, dir, id) {
    ctx.fillStyle = 'rgba(244,217,160,0.15)';
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(244,227,176,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
    ctx.fillStyle = '#f4e3b0'; ctx.font = 'bold ' + Math.round(r * 1.1) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(dir < 0 ? '‹' : '›', x, y + 1);
    btns.push({ x: x - r * 1.4, y: y - r * 1.4, w: r * 2.8, h: r * 2.8, id: id });
  }
  function settingRow(ctx, y, label, value, id) {
    const m = Math.min(W * 0.88, 330), x = (W - m) / 2;
    ctx.fillStyle = 'rgba(244,217,160,0.08)';
    engine.rr(x, y, m, 54, 12); ctx.fill();
    ctx.fillStyle = 'rgba(244,227,176,0.7)'; ctx.font = '12px ' + FONT;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(label, x + 14, y + 20);
    ctx.fillStyle = '#f4e3b0'; ctx.font = 'bold 15px ' + FONT;
    ctx.fillText(value, x + 14, y + 42);
    arrowBtn(ctx, x + m - 66, y + 27, 13, -1, id + '-');
    arrowBtn(ctx, x + m - 28, y + 27, 13, 1, id + '+');
  }
  function drawSettings(ctx) {
    ctx.fillStyle = '#f4e3b0'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(Math.min(W, H) * 0.07) + 'px ' + FONT;
    ctx.fillText('Настройки', W / 2, H * 0.1);
    const oNames = { auto: 'Авто', v: 'Вертикально', h: 'Горизонтально' };
    let y = H * 0.17;
    const step = Math.min(64, H * 0.105);
    settingRow(ctx, y, 'СЛОЖНОСТЬ', SET.d + ' — ' + LVL_NAMES[SET.d - 1], 'd'); y += step;
    settingRow(ctx, y, 'НАБОР ФИГУР', skin().name, 'k'); y += step;
    settingRow(ctx, y, 'ДОСКА', oNames[SET.o], 'o'); y += step;
    settingRow(ctx, y, 'ПОДСВЕТКА ХОДОВ', SET.m ? 'Вкл' : 'Выкл', 'm'); y += step;
    settingRow(ctx, y, 'ЗВУК', SET.snd ? 'Вкл' : 'Выкл', 's'); y += step;
    // предпросмотр набора: генерал + солдат обеих армий
    const pr = Math.min(22, W * 0.055);
    drawPieceR(ctx, TG, W / 2 - pr * 3.6, y + pr * 1.2, pr);
    drawPieceR(ctx, TS, W / 2 - pr * 1.2, y + pr * 1.2, pr);
    drawPieceR(ctx, TS + BLACK, W / 2 + pr * 1.2, y + pr * 1.2, pr);
    drawPieceR(ctx, TG + BLACK, W / 2 + pr * 3.6, y + pr * 1.2, pr);
    y += pr * 2.6;
    if (y + Math.min(W, H) * 0.1 < H * 0.84) {
      ctx.fillStyle = 'rgba(244,227,176,0.55)';
      ctx.font = 'italic ' + Math.round(Math.min(W, H) * 0.034) + 'px ' + FONT;
      ctx.textAlign = 'left';
      wrap(ctx, 'Уровень 1 поддаётся — для знакомства с игрой. Двойной тап по фигуре — подсказка.', W * 0.1, y + 14, W * 0.8, Math.min(W, H) * 0.045);
    }
    const bw = Math.min(W * 0.5, 190), bh = Math.min(48, H * 0.08);
    button(ctx, (W - bw) / 2, H * 0.88 - bh / 2, bw, bh, 'Назад', 'back');
  }

  function drawHud(ctx) {
    if (ui !== 'play') return;
    const hh = headerH;
    // кнопка меню
    ctx.fillStyle = 'rgba(244,217,160,0.14)';
    engine.rr(10, hh * 0.14, hh * 0.62, hh * 0.62, 9); ctx.fill();
    ctx.strokeStyle = 'rgba(244,227,176,0.5)'; ctx.lineWidth = 1.5;
    engine.rr(10, hh * 0.14, hh * 0.62, hh * 0.62, 9); ctx.stroke();
    ctx.fillStyle = '#f4e3b0'; ctx.font = 'bold ' + Math.round(hh * 0.34) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☰', 10 + hh * 0.31, hh * 0.46);
    btns.push({ x: 4, y: 0, w: hh * 0.78, h: hh * 0.8, id: 'menu' });
    // статус хода
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(hh * 0.26) + 'px ' + FONT;
    if (!gameOn) { ctx.fillStyle = 'rgba(244,227,176,0.8)'; ctx.fillText('Партия окончена', W / 2, hh * 0.3); }
    else if (turn === 'r') { ctx.fillStyle = '#ffd75e'; ctx.fillText('Ваш ход', W / 2, hh * 0.3); }
    else {
      ctx.fillStyle = 'rgba(244,227,176,0.8)';
      const dots = '.'.repeat(1 + ((Date.now() / 400) | 0) % 3);
      ctx.fillText('Противник думает' + dots, W / 2, hh * 0.3);
    }
    ctx.font = Math.round(hh * 0.19) + 'px ' + FONT;
    ctx.fillStyle = 'rgba(244,227,176,0.55)';
    ctx.fillText('Уровень ' + SET.d + ' · ' + LVL_NAMES[SET.d - 1], W / 2, hh * 0.56);
    // съеденные фигуры: слева — трофеи игрока (чёрные), справа — потери
    const ir = hh * 0.14;
    function capRow(list, x0, dir, black) {
      for (let i = 0; i < list.length && i < 8; i++) {
        const t = TYPE_CH.indexOf(list[i]);
        const X = x0 + dir * i * ir * 1.5, Y = hh * 0.82;
        ctx.fillStyle = black ? '#39404e' : '#caa05c';
        ctx.beginPath(); ctx.arc(X, Y, ir, 0, 7); ctx.fill();
        ctx.fillStyle = black ? '#bfe8d8' : '#7a1408';
        ctx.font = 'bold ' + Math.round(ir * 1.3) + 'px serif';
        ctx.fillText(INFO[t].hz[black ? 1 : 0], X, Y + 1);
      }
    }
    capRow(capB, 14 + ir, 1, true);                    // взятые у чёрных (трофеи)
    capRow(capR, W - 14 - ir, -1, false);              // потери красных
    // низ: счёт побед
    ctx.font = Math.round(Math.min(W, H) * 0.03) + 'px ' + FONT;
    ctx.fillStyle = 'rgba(244,227,176,0.4)';
    ctx.textBaseline = 'bottom';
    ctx.fillText('тап по фигуре — её ходы · двойной тап — подсказка', W / 2, H - 6);
  }

  // ═══════════════ ВВОД ═══════════════
  function hitBtn(x, y) {
    for (let i = btns.length - 1; i >= 0; i--) {
      const b = btns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
    }
    return null;
  }
  function menuAction(id) {
    snd(520, 0.05, 'sine', 0.08);
    if (id === 'continue') { ui = 'play'; layoutBoard(); }
    else if (id === 'new') newGame();
    else if (id === 'settings') ui = 'settings';
    else if (id === 'back') { ui = 'menu'; save(); }
    else if (id === 'menu') { ui = 'menu'; sel = -1; }
    else if (id.length === 2) {                        // настройки: d± k± o± m± s±
      const k = id[0], dir = id[1] === '+' ? 1 : -1;
      if (k === 'd') SET.d = Math.min(5, Math.max(1, SET.d + dir));
      else if (k === 'k') {
        const i = SKIN_ORDER.indexOf(SET.k);
        SET.k = SKIN_ORDER[(i + dir + SKIN_ORDER.length) % SKIN_ORDER.length];
      }
      else if (k === 'o') {
        const opts = ['auto', 'v', 'h'], i = opts.indexOf(SET.o);
        SET.o = opts[(i + dir + 3) % 3]; layoutBoard();
      }
      else if (k === 'm') SET.m = !SET.m;
      else if (k === 's') SET.snd = !SET.snd;
      save();
    }
  }
  function tapBoard(x, y) {
    if (hintCard) { hintCard = null; return; }
    const cellI = fromScreen(x, y);
    // двойной тап по фигуре → подсказка
    const now = performance.now();
    const isDouble = now - lastTap.t < 380 && Math.hypot(x - lastTap.x, y - lastTap.y) < cell * 0.9;
    lastTap = { t: now, x: x, y: y };
    if (cellI >= 0 && bd[cellI] && isDouble) {
      hintCard = { t: bd[cellI] & 7, black: bd[cellI] > BLACK };
      // заодно подсветим ходы этой фигуры (и своей, и противника)
      if (gameOn) {
        sel = cellI; selEnemy = bd[cellI] > BLACK;
        selMoves = legalMoves(bd, selEnemy).filter(function (m) { return ((m / 90) | 0) === cellI; });
      }
      snd(600, 0.06, 'sine', 0.08);
      lastTap.t = 0;
      return;
    }
    if (!gameOn || anim) return;
    if (cellI < 0) { sel = -1; selMoves = []; return; }
    const p = bd[cellI];
    // ход выбранной СВОЕЙ фигурой (только в свой ход)
    if (sel >= 0 && !selEnemy && turn === 'r' && !thinking) {
      const m = sel * 90 + cellI;
      if (selMoves.indexOf(m) >= 0) { playerMove(m); return; }
    }
    // одиночный тап по ЛЮБОЙ фигуре — показать её возможные ходы
    if (p) {
      sel = cellI; selEnemy = side(p) === 'b';
      selMoves = legalMoves(bd, selEnemy).filter(function (m) { return ((m / 90) | 0) === cellI; });
      snd(selEnemy ? 440 : 560, 0.04, 'sine', 0.06);
    } else { sel = -1; selMoves = []; }
  }

  // ═══════════════ КОНТРАКТ СЦЕНЫ ═══════════════
  return {
    init: function () {},
    reset: function () {
      loadSave();
      if (!bd) bd = initialBoard();
      ui = 'menu'; sel = -1; selMoves = []; anim = null; thinking = false;
      hintCard = null; lastMv = null;
      engine.setScore(scoreP);
      layoutBoard();
    },
    layout: function (L) { W = L.W; H = L.H; headerH = L.headerH; layoutBoard(); },
    update: function (dt) {
      if (toastT > 0) toastT -= dt;
      if (checkFlash > 0) checkFlash -= dt;
      if (anim) { anim.tm += dt; if (anim.tm >= anim.dur) anim = null; }
      if (ui === 'play' && gameOn && turn === 'b' && thinking && !anim) {
        thinkT -= dt;
        if (thinkT <= 0) aiMove();
      }
      // если партия загружена на ходе чёрных (сейв в момент их хода)
      if (ui === 'play' && gameOn && turn === 'b' && !thinking && !anim) { thinking = true; thinkT = 0.5; }
    },
    render: function (ctx) {
      btns.length = 0;
      const K = skin();
      if (K.bg) {                                    // свой фон скина поверх темы
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, K.bg[0]); g.addColorStop(1, K.bg[1]);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
      if (ui === 'menu') drawMenu(ctx);
      else if (ui === 'settings') drawSettings(ctx);
      else drawPlay(ctx);
    },
    hud: function (ctx) { if (ui === 'play') drawHud(ctx); },
    pointerUp: function (e) {
      if (e.dist > 24) return;
      const id = hitBtn(e.x, e.y);
      if (ui === 'menu' || ui === 'settings') { if (id) menuAction(id); return; }
      if (id === 'menu') { menuAction(id); return; }
      tapBoard(e.x, e.y);
    },

    // ── тест-хуки ──
    _state: function () {
      return { ui: ui, turn: turn, gameOn: gameOn, board: serialize(), mc: mc, idle: idle,
        sel: sel, nMoves: selMoves.length, selEnemy: selEnemy, capR: capR.join(''), capB: capB.join(''),
        wins: wins, score: scoreP, set: JSON.parse(JSON.stringify(SET)), horiz: horiz,
        thinking: thinking, hint: hintCard ? INFO[hintCard.t].name : null,
        check: gameOn ? inCheck(bd, turn === 'b') : false };
    },
    _menuAction: menuAction,
    _tapCell: function (x, y) { tapBoard(sx(x, y), sy(x, y)); },
    _movesFor: function (x, y) {
      const i = idx(x, y); if (!bd[i]) return [];
      return legalMoves(bd, bd[i] > BLACK).filter(function (m) { return ((m / 90) | 0) === i; })
        .map(function (m) { return [(m % 90) % 9, ((m % 90) / 9) | 0]; });
    },
    _apply: function (fx, fy, tx, ty) { applyMove(idx(fx, fy) * 90 + idx(tx, ty), false); },
    _aiNow: function () { if (gameOn && turn === 'b') { thinking = false; aiMove(); } },
    _setBoard: function (s, t) { bd = deserialize(s); turn = t || 'r'; gameOn = true; ui = 'play'; hist = {}; },
    _ai: aiBestMove, _legal: legalMoves, _inCheck: inCheck, _bd: function () { return bd; },
    _loadSave: loadSave, _saveObj: saveObj,
  };
});
