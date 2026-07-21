/* ============================================================
   СЦЕНА: diff (diff.js) — «найди отличия»
   ------------------------------------------------------------
   Две почти одинаковые сцены (сверху и снизу), K отличий, тап по
   отличию на ЛЮБОЙ половине. Найденное подсвечивается. Таймер
   уровня ведёт ядро (rules.mode='timed'); штраф за промах — секунды.

   CONFIG.diff = {
     imgA/imgB: имена ассетов ИЛИ процедурная сцена (по умолчанию),
     imgs: ['prop1','prop2',…],           — сцена из СПРАЙТОВ вместо фигур
     bgColor: '#1c2434',                  — фон половинок
     shapes: 26, diffs: 6,                — генерация: фигуры и отличия
     penalty: 3,                          — штраф секунды за промах
     rounds: 3                            — раундов (новая сцена каждый)
   }
   Отличия у спрайтов: 0=перекрашен (hue-rotate), 1=крупнее, 2=повёрнут, 3=исчез.
   ============================================================ */
Engine.register('diff', function (engine, cfg) {
  'use strict';
  const DC = cfg.diff || {};
  const FONT = (cfg.theme && cfg.theme.font) || 'sans-serif';
  const LB = (cfg.theme && cfg.theme.labels) || {};
  const PEN = DC.penalty == null ? 3 : DC.penalty;
  const NDIFF = DC.diffs || 6;

  let W = 360, H = 640;
  let shapes = [], diffs = [], foundN = 0, round = 0;
  let flashT = 0;                        // красная вспышка при промахе
  let seed = 7;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

  const IMGS = DC.imgs || null;          // сцена из спрайтов вместо процедурных фигур

  // генерация сцены: фигуры одинаковые в A и B, кроме diffs (изменён цвет/размер/поворот/нет)
  function genScene() {
    shapes = []; diffs = []; foundN = 0;
    const n = DC.shapes || 26;
    for (let i = 0; i < n; i++) {
      shapes.push({ x: 0.06 + rnd() * 0.88, y: 0.08 + rnd() * 0.84, r: 9 + rnd() * 18,
        hue: (rnd() * 360) | 0, rot: IMGS ? (rnd() - 0.5) * 1.1 : rnd() * 6.28, kind: (rnd() * 4) | 0,
        img: IMGS ? IMGS[(rnd() * IMGS.length) | 0] : null });
    }
    const idx = [];
    while (idx.length < Math.min(NDIFF, n)) { const k = (rnd() * n) | 0; if (idx.indexOf(k) === -1) idx.push(k); }
    for (let i = 0; i < idx.length; i++) {
      const kind = (rnd() * 4) | 0;   // 0 цвет, 1 размер, 2 поворот, 3 исчез
      diffs.push({ i: idx[i], mod: kind, found: false });
    }
  }
  function drawScene(ctx, x0, y0, w, h, isB) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    ctx.fillStyle = DC.bgColor || '#1c2434'; ctx.fillRect(x0, y0, w, h);
    for (let i = 0; i < shapes.length; i++) {
      const s = shapes[i];
      let hue = s.hue, r = s.r, rot = s.rot, skip = false, hueMod = false;
      if (isB) {
        for (let d = 0; d < diffs.length; d++) if (diffs[d].i === i) {
          if (diffs[d].mod === 0) { hue = (hue + 140) % 360; hueMod = true; }
          else if (diffs[d].mod === 1) r *= 1.6;
          else if (diffs[d].mod === 2) rot += 1.2;
          else skip = true;
        }
      }
      if (skip) continue;
      const im = s.img && engine.img(s.img);
      if (im && im.complete && im.naturalWidth) {
        ctx.save(); ctx.translate(x0 + s.x * w, y0 + s.y * h); ctx.rotate(rot);
        ctx.imageSmoothingEnabled = false;
        if (hueMod) ctx.filter = 'hue-rotate(140deg) saturate(1.6)';
        ctx.drawImage(im, -r, -r, r * 2, r * 2);
        ctx.restore();
        continue;
      }
      ctx.save(); ctx.translate(x0 + s.x * w, y0 + s.y * h); ctx.rotate(rot);
      ctx.fillStyle = 'hsl(' + hue + ',60%,55%)';
      if (s.kind === 0) ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
      else if (s.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill(); }
      else if (s.kind === 2) { ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r, r); ctx.lineTo(-r, r); ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); for (let a = 0; a < 5; a++) { const ang = a * 1.257 - 1.57; ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r); } ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    // найденные отличия — кольца на обеих половинах
    for (let d = 0; d < diffs.length; d++) {
      if (!diffs[d].found) continue;
      const s = shapes[diffs[d].i];
      ctx.strokeStyle = 'rgba(120,255,140,0.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x0 + s.x * w, y0 + s.y * h, s.r + 8, 0, 7); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
    ctx.restore();
  }
  function paneRects() {
    const ph = (H - 90) / 2 - 6;
    return [{ x: 10, y: 42, w: W - 20, h: ph }, { x: 10, y: 42 + ph + 12, w: W - 20, h: ph }];
  }

  return {
    init: function () {},
    reset: function () { seed = (Date.now() % 100000) | 1; round = 0; genScene(); flashT = 0; },
    layout: function (L) { W = L.W; H = L.H; },
    update: function (dt) {
      flashT = Math.max(0, flashT - dt);
      if (foundN >= diffs.length && engine.state === 'playing') {
        round++;
        engine.addScore(100 + Math.ceil(engine.timeLeft) * 5);
        if (round >= (DC.rounds || 3)) engine.gameOver({ label: (cfg.theme.labels && cfg.theme.labels.win) || 'ГЛАЗ-АЛМАЗ!' });
        else { genScene(); engine.resetTimer(); engine.beep(700, 0.15, 'triangle', 0.15); }
      }
    },

    render: function (ctx) {
      const pr = paneRects();
      drawScene(ctx, pr[0].x, pr[0].y, pr[0].w, pr[0].h, false);
      drawScene(ctx, pr[1].x, pr[1].y, pr[1].w, pr[1].h, true);
      if (flashT > 0) { ctx.fillStyle = 'rgba(255,60,60,' + (flashT * 0.8).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    },

    hud: function (ctx) {
      ctx.font = 'bold 15px ' + FONT; ctx.textBaseline = 'top';
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText((LB.roundWord || 'Раунд') + ' ' + (round + 1) + ' · ' + foundN + '/' + diffs.length, 12, 12);
      ctx.fillStyle = engine.timeLeft < 10 ? '#e0533d' : '#ffd75e'; ctx.textAlign = 'right';
      ctx.fillText(Math.ceil(engine.timeLeft) + ' ' + (LB.secWord || 'с') + ' · ' + engine.score, W - 12, 12);
    },

    pointerDown: function (p) {
      const pr = paneRects();
      let pane = null;
      for (let i = 0; i < 2; i++) if (p.x >= pr[i].x && p.x <= pr[i].x + pr[i].w && p.y >= pr[i].y && p.y <= pr[i].y + pr[i].h) pane = pr[i];
      if (!pane) return;
      const fx = (p.x - pane.x) / pane.w, fy = (p.y - pane.y) / pane.h;
      for (let d = 0; d < diffs.length; d++) {
        if (diffs[d].found) continue;
        const s = shapes[diffs[d].i];
        const dx = (fx - s.x) * pane.w, dy = (fy - s.y) * pane.h;
        if (Math.hypot(dx, dy) <= s.r * 1.6 + 14) {
          diffs[d].found = true; foundN++;
          engine.addScore(50);
          engine.burst(p.x, p.y, { count: 8, color: '#8f8' });
          engine.beep(760, 0.08, 'triangle', 0.12);
          return;
        }
      }
      // промах: штраф времени + вспышка
      flashT = 0.4;
      engine.addTime(-PEN);
      engine.beep(140, 0.15, 'sawtooth', 0.15);
    },

    _state: function () {
      return { round: round, found: foundN, total: diffs.length,
        diffPts: diffs.map(d => ({ x: shapes[d.i].x, y: shapes[d.i].y, found: d.found })) };
    },
  };
});
