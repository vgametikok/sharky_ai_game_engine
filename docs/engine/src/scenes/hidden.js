/* ============================================================
   СЦЕНА: hidden (hidden.js) — поиск предметов
   ------------------------------------------------------------
   Статичная сцена (фон-картинка или процедурная «куча хлама»),
   список целей, тап по зоне предмета. Таймер, подсказки с лимитом,
   комбинирование найденных предметов по рецептам (даёт бонус-цель).

   CONFIG.hidden = {
     bg: имя-ассета | null (процедурный хлам),
     clutter: 60,                        — сколько мусорных фигур
     items:[{id,label,x,y,r,color}],     — цели (x,y,r в долях экрана)
     hints: 3,                           — запас подсказок
     combos:[{need:['a','b'], give:'ab', label}],  — крафт из находок
     timeBonus: 10                       — очки за сек остатка
   }
   rules.mode='timed' + duration — таймер уровня ведёт ядро.
   ============================================================ */
Engine.register('hidden', function (engine, cfg) {
  'use strict';
  const HC = cfg.hidden || {};
  const ITEMS = HC.items || [];
  const COMBOS = HC.combos || [];
  const FONT = (cfg.theme && cfg.theme.font) || 'sans-serif';

  let W = 360, H = 640;
  let found = {}, hintsLeft = 0, hintFx = null, clutter = [], inv = [];
  let seed = 1;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

  function remaining() { return ITEMS.filter(i => !found[i.id]); }
  function tryCombos() {
    for (let i = 0; i < COMBOS.length; i++) {
      const c = COMBOS[i];
      if (found['c:' + i]) continue;
      if (c.need.every(id => inv.indexOf(id) !== -1)) {
        found['c:' + i] = true;
        engine.addScore(150);
        (function (lbl) { toastT = 2; toastText = '🔧 ' + (lbl || 'Комбинация!'); })(c.label);
        engine.beep(700, 0.15, 'triangle', 0.15);
      }
    }
  }
  let toastT = 0, toastText = '';

  return {
    init: function () {},
    reset: function () {
      found = {}; inv = []; hintsLeft = HC.hints || 3; hintFx = null;
      seed = 12345; clutter = [];
      for (let i = 0; i < (HC.clutter || 50); i++)
        clutter.push({ x: rnd(), y: 0.12 + rnd() * 0.6, r: 8 + rnd() * 22, hue: (rnd() * 360) | 0, rot: rnd() * 6.28, kind: (rnd() * 3) | 0 });
    },
    layout: function (L) { W = L.W; H = L.H; },
    update: function (dt) {
      if (hintFx) { hintFx.t -= dt; if (hintFx.t <= 0) hintFx = null; }
      if (toastT > 0) toastT -= dt;
      if (remaining().length === 0 && engine.state === 'playing') {
        engine.addScore(Math.ceil(engine.timeLeft) * (HC.timeBonus || 10));
        engine.gameOver({ label: (cfg.theme.labels && cfg.theme.labels.win) || 'ВСЁ НАЙДЕНО!' });
      }
    },

    render: function (ctx) {
      const bg = HC.bg && engine.img(HC.bg);
      if (bg && bg.complete && bg.naturalWidth) {
        const sc = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
        ctx.drawImage(bg, 0, 0, bg.naturalWidth * sc, bg.naturalHeight * sc);
      } else {
        // процедурная куча хлама
        for (let i = 0; i < clutter.length; i++) {
          const c = clutter[i];
          ctx.save(); ctx.translate(c.x * W, c.y * H); ctx.rotate(c.rot);
          ctx.fillStyle = 'hsl(' + c.hue + ',35%,' + (30 + (i % 4) * 8) + '%)';
          if (c.kind === 0) ctx.fillRect(-c.r, -c.r * 0.6, c.r * 2, c.r * 1.2);
          else if (c.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, c.r, 0, 7); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(0, -c.r); ctx.lineTo(c.r, c.r); ctx.lineTo(-c.r, c.r); ctx.closePath(); ctx.fill(); }
          ctx.restore();
        }
      }
      // цели (ненайденные — едва заметны на хламе, найденные — галочка)
      for (let i = 0; i < ITEMS.length; i++) {
        const it = ITEMS[i], x = it.x * W, y = it.y * H, r = (it.r || 0.045) * Math.min(W, H);
        if (found[it.id]) {
          ctx.strokeStyle = 'rgba(120,255,140,0.9)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.stroke();
          ctx.fillStyle = 'rgba(120,255,140,0.9)'; ctx.font = 'bold ' + Math.round(r) + 'px sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✓', x, y);
        } else {
          ctx.fillStyle = it.color || 'hsl(' + ((i * 77) % 360) + ',70%,60%)';
          ctx.save(); ctx.translate(x, y); ctx.rotate(i);
          ctx.fillRect(-r * 0.5, -r * 0.5, r, r);
          ctx.restore();
        }
      }
      // подсказка: пульсирующее кольцо
      if (hintFx) {
        const it = hintFx.it, x = it.x * W, y = it.y * H;
        ctx.strokeStyle = 'rgba(255,215,94,' + (0.4 + Math.sin(Date.now() / 120) * 0.3) + ')';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x, y, (it.r || 0.045) * Math.min(W, H) + 10, 0, 7); ctx.stroke();
      }
      if (toastT > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; engine.rr(W / 2 - 90, H * 0.4, 180, 30, 15); ctx.fill();
        ctx.fillStyle = '#ffe9a0'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(toastText, W / 2, H * 0.4 + 16);
      }
    },

    hud: function (ctx) {
      // список целей внизу + таймер + кнопка подсказки
      const rem = remaining();
      ctx.fillStyle = 'rgba(8,8,20,0.85)'; ctx.fillRect(0, H - 74, W, 74);
      ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      let lx = 12;
      for (let i = 0; i < ITEMS.length; i++) {
        const it = ITEMS[i];
        ctx.fillStyle = found[it.id] ? 'rgba(120,255,140,0.85)' : 'rgba(255,255,255,0.85)';
        const t2 = (found[it.id] ? '✓ ' : '· ') + it.label;
        ctx.fillText(t2, lx, H - 50 + (i % 2) * 22);
        if (i % 2 === 1) lx += ctx.measureText(t2).width + 22;
      }
      // таймер
      ctx.fillStyle = engine.timeLeft < 10 ? '#e0533d' : '#fff';
      ctx.font = 'bold 17px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
      ctx.fillText(Math.ceil(engine.timeLeft) + ' с', W - 12, 10);
      // счёт
      ctx.fillStyle = '#ffd75e'; ctx.textAlign = 'left'; ctx.fillText(String(engine.score), 12, 10);
      // подсказка
      ctx.fillStyle = hintsLeft > 0 ? 'rgba(255,215,94,0.9)' : 'rgba(120,120,120,0.6)';
      ctx.beginPath(); ctx.arc(W - 32, H - 104, 22, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💡' , W - 32, H - 103);
      ctx.font = 'bold 11px ' + FONT; ctx.fillStyle = '#fff';
      ctx.fillText(String(hintsLeft), W - 32, H - 82);
    },

    pointerDown: function (p) {
      // подсказка
      if (Math.hypot(p.x - (W - 32), p.y - (H - 104)) < 26) {
        const rem = remaining();
        if (hintsLeft > 0 && rem.length) {
          hintsLeft--;
          hintFx = { it: rem[(Math.random() * rem.length) | 0], t: 2.5 };
          engine.beep(600, 0.1, 'triangle', 0.1);
        }
        return;
      }
      // тап по цели
      const rem = remaining();
      for (let i = 0; i < rem.length; i++) {
        const it = rem[i], x = it.x * W, y = it.y * H, r = (it.r || 0.045) * Math.min(W, H) + 12;
        if (Math.hypot(p.x - x, p.y - y) <= r) {
          found[it.id] = true; inv.push(it.id);
          engine.addScore(50);
          engine.burst(x, y, { count: 10, color: '#ffe08a' });
          engine.beep(760, 0.08, 'triangle', 0.12);
          tryCombos();
          return;
        }
      }
      engine.beep(160, 0.08, 'sine', 0.08);   // промах
    },

    _state: function () {
      return { total: ITEMS.length, found: Object.keys(found).filter(k => k.slice(0, 2) !== 'c:').length,
        hintsLeft: hintsLeft, inv: inv.slice(), combosDone: Object.keys(found).filter(k => k.slice(0, 2) === 'c:').length };
    },
  };
});
