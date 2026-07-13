/* ============================================================
   СЦЕНА: novel (novel.js) — визуальная новелла
   ------------------------------------------------------------
   Ветвящиеся диалоги с выборами, очки симпатии, флаги сюжета,
   несколько концовок, NG+ (флаги переносятся в новый круг и
   открывают новые ветки), галерея фонов (CG) и журнал реплик.

   CONFIG.novel = {
     start:'id',
     chars:{ alice:{name,color} },
     ends:{ good:{...} },                     — справочно
     nodes:{
       id: { bg:'#цвет'|имя-ассета, who:'alice'|null, text:'…',
             set:['flag'], aff:{alice:+1},    — эффекты при входе
             next:'id'                        — либо линейный переход,
             choices:[{text, goto,            — либо выбор
                       need:'flag', needNot:'flag',   — условия видимости
                       needAff:{alice:2},     — порог симпатии
                       set:['flag'], aff:{alice:1}}],
             end:'good'                       — терминальный узел (концовка)
           }
     }
   }
   Счёт = число увиденных узлов + бонус за концовку. Тап = дальше.
   Кнопки: 📖 журнал, 🖼 галерея (после первой концовки NG+ сохраняет
   ngFlags и открывает ветки с need:'ng+'.
   ============================================================ */
Engine.register('novel', function (engine, cfg) {
  'use strict';
  const N = cfg.novel || {};
  const NODES = N.nodes || {};
  const CHARS = N.chars || {};
  const FONT = (cfg.theme && cfg.theme.font) || 'sans-serif';

  let cur = null, W = 360, H = 640;
  let aff = {}, flags = {}, seen = {}, log = [], gallery = {};
  let ngPlus = 0, ngFlags = {};            // NG+: круг и переносимые флаги
  let typing = 0;                          // печатающийся текст
  let overlay = null;                      // 'log' | 'gallery' | null
  let choiceRects = [];

  function enter(id) {
    const nd = NODES[id]; if (!nd) return;
    cur = id; typing = 0;
    if (!seen[id]) { seen[id] = 1; engine.addScore(5); }
    if (nd.set) nd.set.forEach(f => flags[f] = true);
    if (nd.aff) for (const k in nd.aff) aff[k] = (aff[k] || 0) + nd.aff[k];
    if (nd.bg) gallery[nd.bg] = true;
    log.push({ who: nd.who, text: nd.text });
    if (log.length > 60) log.shift();
    engine.beep(500, 0.03, 'sine', 0.05);
  }
  function choiceOk(c) {
    if (c.need && !flags[c.need] && !(c.need === 'ng+' && ngPlus > 0)) return false;
    if (c.needNot && flags[c.needNot]) return false;
    if (c.needAff) for (const k in c.needAff) if ((aff[k] || 0) < c.needAff[k]) return false;
    return true;
  }
  function pickChoice(c) {
    if (c.set) c.set.forEach(f => flags[f] = true);
    if (c.aff) for (const k in c.aff) aff[k] = (aff[k] || 0) + c.aff[k];
    enter(c.goto);
  }
  function finishEnd(nd) {
    engine.addScore(100);
    ngPlus++; ngFlags = Object.assign({}, ngFlags, flags);   // NG+: флаги в наследство
    engine.gameOver({ label: (nd.endLabel || 'КОНЕЦ: ' + nd.end) });
  }

  return {
    init: function () {},
    reset: function () {
      aff = {}; flags = Object.assign({}, ngFlags); seen = {}; log = []; overlay = null;
      if (ngPlus > 0) flags['ng+'] = true;
      enter(N.start || Object.keys(NODES)[0]);
    },
    layout: function (L) { W = L.W; H = L.H; },

    update: function (dt) { typing += dt * 40; },

    render: function (ctx) {
      const nd = NODES[cur]; if (!nd) return;
      // фон: ассет или цвет
      const bgImg = nd.bg && engine.img(nd.bg);
      if (bgImg && bgImg.complete && bgImg.naturalWidth) {
        const sc = Math.max(W / bgImg.naturalWidth, H / bgImg.naturalHeight);
        ctx.drawImage(bgImg, 0, 0, bgImg.naturalWidth * sc, bgImg.naturalHeight * sc);
      } else if (nd.bg && nd.bg[0] === '#') { ctx.fillStyle = nd.bg; ctx.fillRect(0, 0, W, H); }

      // NG+ бейдж
      if (ngPlus > 0) {
        ctx.fillStyle = 'rgba(255,215,94,0.9)'; ctx.font = 'bold 12px ' + FONT;
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('NG+' + ngPlus, 12, 10);
      }

      // текстовое окно
      const boxH = H * 0.3, boxY = H - boxH - 14;
      ctx.fillStyle = 'rgba(10,10,24,0.85)';
      engine.rr(10, boxY, W - 20, boxH, 12); ctx.fill();
      ctx.strokeStyle = engine.accent(); ctx.lineWidth = 1.5;
      engine.rr(10, boxY, W - 20, boxH, 12); ctx.stroke();
      // имя говорящего
      const ch = nd.who && CHARS[nd.who];
      if (ch) {
        ctx.fillStyle = ch.color || engine.accent();
        ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(ch.name || nd.who, 24, boxY + 10);
      }
      // текст с печатанием и переносами
      ctx.fillStyle = '#fff'; ctx.font = '14px ' + FONT; ctx.textAlign = 'left';
      const shown = nd.text.slice(0, Math.floor(typing));
      const words = shown.split(' ');
      let line = '', ty = boxY + (ch ? 34 : 14);
      for (let i = 0; i < words.length; i++) {
        const t2 = line + (line ? ' ' : '') + words[i];
        if (ctx.measureText(t2).width > W - 48) { ctx.fillText(line, 24, ty); ty += 19; line = words[i]; }
        else line = t2;
      }
      ctx.fillText(line, 24, ty);
      // индикатор «дальше»
      if (typing >= nd.text.length && !nd.choices && !nd.end) {
        ctx.fillStyle = engine.accent();
        ctx.beginPath();
        const bx2 = W - 34, by2 = H - 34 + Math.sin(Date.now() / 250) * 2;
        ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + 10, by2); ctx.lineTo(bx2 + 5, by2 + 8); ctx.closePath(); ctx.fill();
      }

      // выборы
      choiceRects = [];
      if (typing >= nd.text.length && nd.choices) {
        const list = nd.choices.filter(choiceOk);
        const chH = 40, gap = 10;
        let cy = boxY - list.length * (chH + gap) - 8;
        for (let i = 0; i < list.length; i++) {
          const c = list[i];
          ctx.fillStyle = 'rgba(30,34,66,0.94)'; engine.rr(20, cy, W - 40, chH, 10); ctx.fill();
          ctx.strokeStyle = engine.accent(); ctx.lineWidth = 1.5; engine.rr(20, cy, W - 40, chH, 10); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(c.text, W / 2, cy + chH / 2 + 1);
          choiceRects.push({ x: 20, y: cy, w: W - 40, h: chH, c: c });
          cy += chH + gap;
        }
      }

      // мини-кнопки: журнал и галерея
      ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fillText('📖', W - 26, 22); ctx.fillText('🖼', W - 58, 22);

      // оверлеи: журнал / галерея
      if (overlay === 'log') {
        ctx.fillStyle = 'rgba(5,5,14,0.94)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ЖУРНАЛ (тап — закрыть)', W / 2, 14);
        ctx.font = '12px ' + FONT; ctx.textAlign = 'left';
        let ly = 44;
        for (let i = Math.max(0, log.length - 16); i < log.length; i++) {
          const e2 = log[i], nm = e2.who && CHARS[e2.who] ? CHARS[e2.who].name + ': ' : '';
          ctx.fillStyle = e2.who && CHARS[e2.who] ? (CHARS[e2.who].color || '#ffd75e') : 'rgba(255,255,255,0.7)';
          const txt = nm + e2.text;
          ctx.fillText(txt.length > 52 ? txt.slice(0, 52) + '…' : txt, 16, ly);
          ly += 18;
        }
      } else if (overlay === 'gallery') {
        ctx.fillStyle = 'rgba(5,5,14,0.94)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 15px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText('ГАЛЕРЕЯ CG (тап — закрыть)', W / 2, 14);
        const keys = Object.keys(gallery);
        const cw2 = (W - 60) / 3;
        for (let i = 0; i < keys.length; i++) {
          const gx = 20 + (i % 3) * (cw2 + 10), gy = 50 + Math.floor(i / 3) * (cw2 * 0.7 + 10);
          const im = engine.img(keys[i]);
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, gx, gy, cw2, cw2 * 0.7);
          else { ctx.fillStyle = keys[i][0] === '#' ? keys[i] : '#334'; ctx.fillRect(gx, gy, cw2, cw2 * 0.7); }
          ctx.strokeStyle = '#889'; ctx.strokeRect(gx, gy, cw2, cw2 * 0.7);
        }
      }
    },

    hud: function () {},   // всё в render

    pointerDown: function (p) {
      if (overlay) { overlay = null; return; }
      // мини-кнопки
      if (p.y < 38 && p.x > W - 42) { overlay = 'log'; return; }
      if (p.y < 38 && p.x > W - 74 && p.x <= W - 42) { overlay = 'gallery'; return; }
      const nd = NODES[cur]; if (!nd) return;
      if (typing < nd.text.length) { typing = nd.text.length; return; }   // раскрыть текст
      // выбор
      for (let i = 0; i < choiceRects.length; i++) {
        const r = choiceRects[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { pickChoice(r.c); return; }
      }
      if (nd.choices) return;              // ждём выбора
      if (nd.end) { finishEnd(nd); return; }
      if (nd.next) enter(nd.next);
    },

    _state: function () {
      return { cur: cur, aff: Object.assign({}, aff), flags: Object.assign({}, flags),
        seenN: Object.keys(seen).length, logN: log.length, galleryN: Object.keys(gallery).length,
        ngPlus: ngPlus, overlay: overlay,
        choices: (NODES[cur] && NODES[cur].choices) ? NODES[cur].choices.filter(choiceOk).map(c => c.text) : [] };
    },
    _tap: function (x, y) { this.pointerDown({ x: x, y: y, id: 1 }); },
    _typeDone: function () { const nd = NODES[cur]; if (nd) typing = nd.text.length; },
  };
});
