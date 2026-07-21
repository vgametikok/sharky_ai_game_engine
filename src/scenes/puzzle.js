/* ============================================================
   СЦЕНА: puzzle (puzzle.js) — сокобан-головоломка
   ------------------------------------------------------------
   Толкание ящиков на цели. Свайп/стрелки — шаг героя, ящик
   толкается если за ним свободно. Опциональный лимит ходов,
   кнопка undo, серия уровней. Победа уровня = все ящики на целях.

   CONFIG.puzzle = {
     moveLimit: 0,              — лимит ходов на уровень (0 = нет)
     undo: true,                — кнопка отмены хода
     imgs: {hero,box,boxOn,goal,wall},   — опциональные спрайты (имена ассетов)
     levels: [ { map:[ '#'=стена, '.'=цель, 'B'=ящик, '*'=ящик на цели,
                        'P'=герой, ' '=пол ], moveLimit:12 } ]  — свой лимит уровня
   }
   ============================================================ */
Engine.register('puzzle', function (cfgEngine, cfg) {
  'use strict';
  const engine = cfgEngine;
  const PZ = cfg.puzzle || {};
  const LEVELS = PZ.levels || [];
  const FONT = (cfg.theme && cfg.theme.font) || 'sans-serif';
  const LB = (cfg.theme && cfg.theme.labels) || {};

  const IMGS = PZ.imgs || {};

  let W = 360, H = 640, cell = 32, ox = 0, oy = 0;
  let lvl = 0, walls = {}, goals = {}, boxes = {}, hero = { x: 0, y: 0 };
  let moves = 0, history = [], won = false;
  let cols = 0, rows = 0;

  function key(x, y) { return x + ',' + y; }
  function limit() { const L = LEVELS[lvl]; return (L && L.moveLimit != null) ? L.moveLimit : (PZ.moveLimit || 0); }
  function spr(name) { const im = name && engine.img(name); return (im && im.complete && im.naturalWidth) ? im : null; }
  function loadLevel() {
    walls = {}; goals = {}; boxes = {}; moves = 0; history = []; won = false;
    const map = LEVELS[lvl].map;
    rows = map.length; cols = 0;
    for (let y = 0; y < rows; y++) {
      cols = Math.max(cols, map[y].length);
      for (let x = 0; x < map[y].length; x++) {
        const ch = map[y][x];
        if (ch === '#') walls[key(x, y)] = 1;
        if (ch === '.' || ch === '*') goals[key(x, y)] = 1;
        if (ch === 'B' || ch === '*') boxes[key(x, y)] = 1;
        if (ch === 'P') { hero.x = x; hero.y = y; }
      }
    }
    fit();
  }
  function fit() {
    cell = Math.floor(Math.min((W - 20) / Math.max(1, cols), (H - 120) / Math.max(1, rows)));
    ox = Math.round((W - cols * cell) / 2);
    oy = Math.round(56 + (H - 120 - rows * cell) / 2);
  }
  function solved() { for (const k in boxes) if (!goals[k]) return false; return Object.keys(boxes).length > 0; }
  function step(dx, dy) {
    if (won) return;
    if (limit() && moves >= limit()) return;
    const nx = hero.x + dx, ny = hero.y + dy;
    if (walls[key(nx, ny)]) return;
    const snap = { hero: { x: hero.x, y: hero.y }, boxes: Object.assign({}, boxes) };
    if (boxes[key(nx, ny)]) {
      const bx = nx + dx, by = ny + dy;
      if (walls[key(bx, by)] || boxes[key(bx, by)]) return;      // ящик упирается
      delete boxes[key(nx, ny)]; boxes[key(bx, by)] = 1;
      engine.beep(300, 0.05, 'square', 0.08);
    }
    history.push(snap);
    if (history.length > 200) history.shift();
    hero.x = nx; hero.y = ny; moves++;
    engine.beep(500, 0.03, 'sine', 0.04);
    if (solved()) {
      won = true;
      engine.addScore(200 + Math.max(0, ((limit() || 99) - moves)) * 5);
      engine.beep(700, 0.2, 'triangle', 0.16);
      setToast(LB.cleared || 'Уровень пройден!');
    } else if (limit() && moves >= limit()) {
      engine.gameOver();                                          // ходы кончились
    }
  }
  function undo() {
    const s = history.pop(); if (!s) return;
    hero = s.hero; boxes = s.boxes; moves++;                      // undo тоже ход (честно)
    engine.beep(240, 0.06, 'sine', 0.07);
  }
  let toastT = 0, toastText = '';
  function setToast(t) { toastText = t; toastT = 1.6; }

  return {
    init: function () {},
    reset: function () { lvl = 0; loadLevel(); },
    layout: function (L) { W = L.W; H = L.H; fit(); },
    update: function (dt) {
      if (toastT > 0) toastT -= dt;
      if (won && toastT <= 0) {
        lvl++;
        if (lvl >= LEVELS.length) engine.gameOver({ label: (cfg.theme.labels && cfg.theme.labels.win) || 'ВСЕ УРОВНИ!' });
        else loadLevel();
      }
    },

    render: function (ctx) {
      ctx.imageSmoothingEnabled = false;                          // пиксель-арт без мыла
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const px = ox + x * cell, py = oy + y * cell, k = key(x, y);
        if (walls[k]) {
          const wi = spr(IMGS.wall);
          if (wi) ctx.drawImage(wi, px, py, cell, cell);
          else {
            ctx.fillStyle = '#4a5568'; ctx.fillRect(px, py, cell, cell);
            ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py, cell, 3);
          }
        } else {
          ctx.fillStyle = ((x + y) & 1) ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)';
          ctx.fillRect(px, py, cell, cell);
          if (goals[k]) {
            const gi = spr(IMGS.goal);
            if (gi) ctx.drawImage(gi, px + cell * 0.12, py + cell * 0.12, cell * 0.76, cell * 0.76);
            else {
              ctx.strokeStyle = 'rgba(255,215,94,0.8)'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.arc(px + cell / 2, py + cell / 2, cell * 0.22, 0, 7); ctx.stroke();
            }
          }
          if (boxes[k]) {
            const on = goals[k];
            const bi = spr(on ? (IMGS.boxOn || IMGS.box) : IMGS.box);
            if (bi) {
              if (on && !IMGS.boxOn) { ctx.save(); ctx.shadowColor = '#7ac074'; ctx.shadowBlur = 8; ctx.drawImage(bi, px + 2, py + 2, cell - 4, cell - 4); ctx.restore(); }
              else ctx.drawImage(bi, px + 2, py + 2, cell - 4, cell - 4);
            } else {
              ctx.fillStyle = on ? '#7ac074' : '#b98a4a';
              engine.rr(px + 3, py + 3, cell - 6, cell - 6, 5); ctx.fill();
              ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1.5;
              engine.rr(px + 3, py + 3, cell - 6, cell - 6, 5); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(px + 6, py + 6); ctx.lineTo(px + cell - 6, py + cell - 6);
              ctx.moveTo(px + cell - 6, py + 6); ctx.lineTo(px + 6, py + cell - 6); ctx.stroke();
            }
          }
        }
      }
      // герой
      const hx = ox + hero.x * cell, hy = oy + hero.y * cell;
      const hi = spr(IMGS.hero);
      if (hi) ctx.drawImage(hi, hx + 1, hy + 1, cell - 2, cell - 2);
      else {
        ctx.fillStyle = engine.accent();
        ctx.beginPath(); ctx.arc(hx + cell / 2, hy + cell / 2, cell * 0.34, 0, 7); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(hx + cell / 2 + 3, hy + cell / 2 - 3, cell * 0.08, 0, 7); ctx.fill();
      }
      if (toastT > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; engine.rr(W / 2 - 100, H * 0.42, 200, 34, 17); ctx.fill();
        ctx.fillStyle = '#ffe9a0'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(toastText, W / 2, H * 0.42 + 18);
      }
    },

    hud: function (ctx) {
      ctx.font = 'bold 14px ' + FONT; ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText((LB.level || 'Уровень') + ' ' + (lvl + 1) + '/' + LEVELS.length, 12, 12);
      ctx.textAlign = 'right';
      const lim = limit();
      ctx.fillStyle = lim && (lim - moves) < 5 ? '#e0533d' : '#ffd75e';
      ctx.fillText(lim ? ((LB.movesLeft || 'Ходы') + ': ' + (lim - moves)) : ((LB.movesDone || 'Ходов') + ': ' + moves), W - 12, 12);
      // undo
      if (PZ.undo !== false) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath(); ctx.arc(W - 30, H - 34, 22, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('↶', W - 30, H - 33);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(LB.hint || 'Свайп — шаг · толкай ящики на кольца', W / 2, H - 8);
    },

    key: function (k) {
      if (k === 'ArrowLeft' || k === 'a') step(-1, 0);
      else if (k === 'ArrowRight' || k === 'd') step(1, 0);
      else if (k === 'ArrowUp' || k === 'w') step(0, -1);
      else if (k === 'ArrowDown' || k === 's') step(0, 1);
      else if (k === 'z' || k === 'Z') undo();
    },
    pointerUp: function (e) {
      if (PZ.undo !== false && Math.hypot(e.x - (W - 30), e.y - (H - 34)) < 26 && e.dist < 20) { undo(); return; }
      if (e.dist < 18) return;
      if (e.dir === 'left') step(-1, 0);
      else if (e.dir === 'right') step(1, 0);
      else if (e.dir === 'up') step(0, -1);
      else if (e.dir === 'down') step(0, 1);
    },

    _state: function () {
      return { lvl: lvl, moves: moves, won: won,
        hero: { x: hero.x, y: hero.y },
        boxes: Object.keys(boxes), goals: Object.keys(goals),
        onGoal: Object.keys(boxes).filter(k => goals[k]).length };
    },
    _step: step, _undo: undo,
  };
});
