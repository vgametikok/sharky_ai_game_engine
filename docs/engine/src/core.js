/* ============================================================
   SHARKY GAME ENGINE — universal core (core.js)
   ------------------------------------------------------------
   Общий слой для всех мини-игр ленты Sharky:
     • canvas + DPR + resize/layout
     • игровой цикл (loop/update/render)
     • ввод: pointer (tap/swipe) + клавиатура
     • звук (beep), частицы (burst)
     • загрузка base64-ассетов
     • тематический HUD (счёт + полоса таймера) и экран Game Over
     • ПРОТОКОЛ Sharky (postMessage): принимает init/start/pause,
       шлёт ready/score/gameover; автостарт ВНЕ ленты по таймеру.

   Игра = это ядро + один МОДУЛЬ-СЦЕНА (механика, регистрируется
   через Engine.register) + объект CONFIG (тема/правила/ассеты).
   Сборщик (build.js) встраивает все три части в один .html —
   игры в Sharky крутятся в sandbox-iframe через srcdoc, поэтому
   внешние <script> и относительные ассеты недопустимы.

   ── КОНТРАКТ СЦЕНЫ ──
   Engine.register('genre', function(engine, cfg){
     return {
       init(){},          // одноразовая настройка (ассеты+геометрия готовы)
       reset(){},         // (пере)собрать игровое состояние; на каждый запуск
       layout(L){},       // пересчёт геометрии из {W,H,headerH}
       update(dt){},      // продвинуть механику (таймер ведёт ЯДРО)
       render(ctx){},     // нарисовать поле (фон/HUD/оверлей рисует ЯДРО)
       pointerDown(p){},  // p = {x,y} в пикселях canvas
       pointerUp(e){},    // e = {x,y,downX,downY,dx,dy,dist,dir}
       pointerMove(p){},
       key(k){},          // k = event.key
     };
   });

   ── API ЯДРА для сцены (engine.*) ──
     ctx, W, H, headerH, cfg, theme, rules, score   (только чтение)
     img(name) -> HTMLImageElement
     beep(freq,dur,type,vol)
     burst(x,y,opts)                  // частицы (по умолчанию — как в match3)
     addScore(n) / setScore(v)        // меняет счёт + шлёт его в ленту
     gameOver()                       // завершить забег (смерть). Таймер тоже завершает.
     rr(x,y,w,h,r) / accent()         // помощники рисования
   ============================================================ */
(function (global) {
  'use strict';

  // ── canvas / контекст ──
  let cv, ctx;
  let W = 360, H = 580, headerH = 70, dpr = 1;

  // ── конфиг / сцена ──
  let cfg = null, theme = {}, rules = {}, scene = null;

  // ── состояние забега ──
  let state = 'loading';            // loading | playing | over
  let running = false, raf = 0, last = 0;
  let score = 0, best = 0, timeLeft = 0, duration = 0, timed = false;
  let assetsReady = false, pendingStart = false, gotShell = false;

  // ── ассеты ──
  const IMG = {}; let imgTotal = 0, imgLoaded = 0;

  // ── звук ──
  let audioCtx = null;

  // ── частицы ──
  const parts = [];

  // ── ввод ──
  let downX = 0, downY = 0, hasDown = false;
  const pointers = {};        // pointerId → {x,y} точки нажатия (мультитач)
  const keys = new Set();     // зажатые клавиши (для платформеров и т.п.)
  const GAME_KEYS = [' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  /* ═══════════ CONTROLS: универсальный слой управления (CONFIG.controls) ═══════════
     Все схемы транслируются в ВИРТУАЛЬНЫЕ КЛАВИШИ → работают с любой сценой.
     controls = {
       scheme: 'joystick' | 'tapmove' | 'tapaction' | 'aim' | null(=только кнопки),
       joystick: { side:'left', radius:0.09, deadzone:0.3 },
       tapAction: 'jump',                     — что делает тап (схема tapaction)
       aim: { fire:'attack' | false },        — держишь палец/мышь = огонь в ту сторону
       buttons: [ {glyph:'▲', action:'jump'} | {glyph:'✕', key:'x'} … ]  — программируемые
     }
     Действие → клавиша: */
  const ACT2KEY = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown',
    jump: ' ', attack: 'x', fire: 'x', dash: 'c', hook: 'v', slow: 'g', swap: 'q', map: 'm', bomb: 'x', undo: 'z' };
  const CTL = { axis: { x: 0, y: 0 }, aim: { x: 0, y: 0, active: false }, mouse: { x: 0, y: 0 },
    playerScreen: null, scheme: null };
  let ctlCfg = null, ctlBtns = [], joy = null, tapTarget = null, ctlHeld = {};
  function actKey(b) { return b.key || ACT2KEY[b.action] || ' '; }
  function ctlPress(key) { if (!keys.has(key)) { keys.add(key); if (scene && scene.key) scene.key(key); } }
  function ctlRelease(key) { keys.delete(key); }
  function initControls(c) {
    ctlCfg = c || null;
    if (!ctlCfg) return;
    CTL.scheme = ctlCfg.scheme || null;
    layoutCtlButtons();
  }
  function layoutCtlButtons() {
    ctlBtns = [];
    if (!ctlCfg || !ctlCfg.buttons) return;
    const r = Math.min(W, H) * 0.075, m = r * 0.7;
    for (let i = 0; i < ctlCfg.buttons.length; i++) {
      const b = ctlCfg.buttons[i];
      // свои координаты (в долях экрана) или авто-дуга справа снизу
      const x = b.x != null ? b.x * W : W - m - r - (i % 2) * (r * 2.3);
      const y = b.y != null ? b.y * H : H - m - r - Math.floor(i / 2) * (r * 2.3);
      ctlBtns.push({ x: x, y: y, r: b.r ? b.r * Math.min(W, H) : r, glyph: b.glyph || '●', key: actKey(b), id: i });
    }
  }
  function ctlDown(p) {   // true = событие съедено слоем управления
    if (!ctlCfg) return false;
    for (let i = 0; i < ctlBtns.length; i++) {
      const b = ctlBtns[i];
      if ((p.x - b.x) * (p.x - b.x) + (p.y - b.y) * (p.y - b.y) <= b.r * b.r * 1.45) {
        ctlHeld[p.id] = b.key; ctlPress(b.key); return true;
      }
    }
    const sch = CTL.scheme;
    if (sch === 'joystick') {
      const side = (ctlCfg.joystick && ctlCfg.joystick.side) || 'left';
      const inZone = side === 'any' || (side === 'left' ? p.x < W * 0.55 : p.x > W * 0.45);
      if (inZone && !joy) { joy = { id: p.id, cx: p.x, cy: p.y }; return true; }
      return false;
    }
    if (sch === 'tapmove') { tapTarget = { x: p.x, y: p.y, id: p.id }; return true; }
    if (sch === 'tapaction') {
      const key = ACT2KEY[ctlCfg.tapAction || 'jump'] || ' ';
      ctlHeld[p.id] = key; ctlPress(key); return true;
    }
    if (sch === 'aim') {
      CTL.aim.x = p.x; CTL.aim.y = p.y; CTL.aim.active = true;
      const f = ctlCfg.aim && ctlCfg.aim.fire;
      if (f !== false) { ctlHeld[p.id] = ACT2KEY[f || 'attack'] || 'x'; ctlPress(ctlHeld[p.id]); }
      return true;
    }
    return false;
  }
  function ctlMove(p) {
    CTL.mouse.x = p.x; CTL.mouse.y = p.y;
    if (!ctlCfg) return;
    if (joy && p.id === joy.id) {
      const R = ((ctlCfg.joystick && ctlCfg.joystick.radius) || 0.09) * Math.min(W, H);
      const dz = (ctlCfg.joystick && ctlCfg.joystick.deadzone) || 0.3;
      let dx = (p.x - joy.cx) / R, dy = (p.y - joy.cy) / R;
      const len = Math.hypot(dx, dy);
      if (len > 1) { dx /= len; dy /= len; }
      CTL.axis.x = dx; CTL.axis.y = dy;
      joy.dx = dx; joy.dy = dy;
      // 8-way → клавиши
      (dx < -dz ? ctlPress : ctlRelease)('ArrowLeft');
      (dx > dz ? ctlPress : ctlRelease)('ArrowRight');
      (dy < -dz ? ctlPress : ctlRelease)('ArrowUp');
      (dy > dz ? ctlPress : ctlRelease)('ArrowDown');
    }
    if (CTL.scheme === 'aim' && CTL.aim.active) { CTL.aim.x = p.x; CTL.aim.y = p.y; }
    if (CTL.scheme === 'tapmove' && tapTarget && p.id === tapTarget.id) { tapTarget.x = p.x; tapTarget.y = p.y; }
  }
  function ctlUp(p) {
    if (!ctlCfg) return false;
    let ate = false;
    if (ctlHeld[p.id]) { ctlRelease(ctlHeld[p.id]); delete ctlHeld[p.id]; ate = true; }
    if (joy && p.id === joy.id) {
      joy = null; CTL.axis.x = 0; CTL.axis.y = 0;
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach(ctlRelease);
      ate = true;
    }
    if (CTL.scheme === 'aim') { CTL.aim.active = false; ate = true; }
    if (CTL.scheme === 'tapmove' && tapTarget && p.id === tapTarget.id) { tapTarget = null; ate = true; }
    return ate;
  }
  // tap-to-move: каждый кадр сравниваем цель с экранной позицией персонажа
  // (сцена сообщает её через engine.reportPlayerScreen)
  function ctlUpdate() {
    if (!ctlCfg || CTL.scheme !== 'tapmove') return;
    if (!tapTarget || !CTL.playerScreen) {
      if (!tapTarget) { ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].forEach(ctlRelease); }
      return;
    }
    const px = CTL.playerScreen.x, py = CTL.playerScreen.y;
    const dx = tapTarget.x - px, dy = tapTarget.y - py;
    const dead = Math.min(W, H) * 0.04;
    (dx < -dead ? ctlPress : ctlRelease)('ArrowLeft');
    (dx > dead ? ctlPress : ctlRelease)('ArrowRight');
    (dy < -dead * 2.2 ? ctlPress : ctlRelease)('ArrowUp');     // вверх — с большим порогом (прыжок/лестницы)
    (dy > dead * 2.2 ? ctlPress : ctlRelease)('ArrowDown');
  }
  function drawControls() {
    if (!ctlCfg) return;
    // кнопки
    for (let i = 0; i < ctlBtns.length; i++) {
      const b = ctlBtns[i];
      ctx.fillStyle = keys.has(b.key) ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.15)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold ' + Math.round(b.r * 0.8) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.glyph, b.x, b.y + 1);
    }
    // джойстик
    if (CTL.scheme === 'joystick') {
      const R = ((ctlCfg.joystick && ctlCfg.joystick.radius) || 0.09) * Math.min(W, H);
      if (joy) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(joy.cx, joy.cy, R, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.arc(joy.cx + (joy.dx || 0) * R, joy.cy + (joy.dy || 0) * R, R * 0.42, 0, 7); ctx.fill();
      } else {
        // подсказка-призрак в зоне
        const side = (ctlCfg.joystick && ctlCfg.joystick.side) || 'left';
        const gx = side === 'right' ? W * 0.78 : W * 0.22, gy = H * 0.82;
        ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(gx, gy, R, 0, 7); ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, R * 0.42, 0, 7); ctx.stroke();
      }
    }
    // маркер tap-to-move
    if (CTL.scheme === 'tapmove' && tapTarget) {
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 + Math.sin(Date.now() / 130) * 0.3) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(tapTarget.x, tapTarget.y, 12, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(tapTarget.x, tapTarget.y, 3, 0, 7); ctx.fill();
    }
    // прицел aim
    if (CTL.scheme === 'aim' && CTL.aim.active) {
      ctx.strokeStyle = 'rgba(255,120,120,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(CTL.aim.x, CTL.aim.y, 11, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(CTL.aim.x - 16, CTL.aim.y); ctx.lineTo(CTL.aim.x + 16, CTL.aim.y);
      ctx.moveTo(CTL.aim.x, CTL.aim.y - 16); ctx.lineTo(CTL.aim.x, CTL.aim.y + 16); ctx.stroke();
    }
  }

  // ── объект, который получает сцена ──
  const api = {
    get ctx() { return ctx; },
    get W() { return W; },
    get H() { return H; },
    get headerH() { return headerH; },
    get cfg() { return cfg; },
    get theme() { return theme; },
    get rules() { return rules; },
    get score() { return score; },
    get timeLeft() { return timeLeft; },
    get duration() { return duration; },
    get state() { return state; },
    get keys() { return keys; },          // живой Set зажатых клавиш
    get ctl() { return CTL; },            // слой управления: axis/aim/mouse/scheme
    reportPlayerScreen: function (x, y) { CTL.playerScreen = { x: x, y: y }; },
    img: function (name) { return IMG[name]; },
    beep: beep,
    burst: burst,
    addScore: addScore,
    setScore: setScore,
    gameOver: gameOver,
    resetTimer: resetTimer,
    addTime: addTime,
    rr: rr,
    accent: accent,
  };

  const Engine = {
    scenes: {},
    register: function (name, factory) { this.scenes[name] = factory; },
    boot: boot,
  };
  global.Engine = Engine;

  // Диагностика (можно дёрнуть из консоли): текущее состояние движка.
  Engine.debug = function () {
    return { state: state, running: running, assetsReady: assetsReady, pendingStart: pendingStart,
             gotShell: gotShell, imgLoaded: imgLoaded, imgTotal: imgTotal, hasScene: !!scene,
             W: W, H: H };
  };
  // Принудительный одиночный кадр (для тестов в скрытой вкладке, где rAF не тикает).
  Engine.renderOnce = function () { if (scene && assetsReady) render(); };
  Engine._ctl = CTL;   // отладка слоя управления
  Engine._keys = keys;
  // Принудительный шаг цикла ядра (управление+сцена) — тоже для тестов без rAF.
  Engine.stepOnce = function (dt) { if (scene && assetsReady) update(dt || 1 / 60); };

  // ════════════════════════════════════════════ BOOT
  function boot(config) {
    cfg = config; theme = config.theme || {}; rules = config.rules || {};
    duration = rules.duration || 60;
    timed = (rules.mode || 'timed') === 'timed';
    cv = document.getElementById('c'); ctx = cv.getContext('2d');
    if (theme.accent) document.documentElement.style.setProperty('--ac', theme.accent);
    if (theme.bgBottom || theme.bgTop) document.body.style.background = theme.bgBottom || theme.bgTop;

    const factory = Engine.scenes[config.genre];
    if (!factory) { console.error('Engine: нет сцены для жанра', config.genre); return; }
    scene = factory(api, config);
    Engine._scene = scene;   // для отладки/тестов
    initControls(config.controls);

    window.addEventListener('resize', resize);
    bindInput();
    bindProtocol();
    window.addEventListener('load', function () {
      loadImages(config.assets || {});
      // Автостарт ТОЛЬКО вне Sharky. В ленте всегда приходит init -> gotShell=true.
      setTimeout(function () {
        if (!gotShell) { if (assetsReady) start(); else pendingStart = true; }
      }, 400);
    });
  }

  // ════════════════════════════════════════════ ГЕОМЕТРИЯ
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth || 360; H = cv.clientHeight || 580;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;            // чёткий пиксель-арт
    headerH = Math.max(48, Math.min(96, H * 0.13));
    layoutCtlButtons();
    if (scene && scene.layout) scene.layout({ W: W, H: H, headerH: headerH });
  }

  // ════════════════════════════════════════════ АССЕТЫ
  function loadImages(map) {
    const names = Object.keys(map);
    imgTotal = names.length; imgLoaded = 0;
    if (imgTotal === 0) { onReady(); return; }
    names.forEach(function (n) {
      const im = new Image();
      im.onload = im.onerror = function () { imgLoaded++; if (imgLoaded >= imgTotal) onReady(); };
      const v = map[n];
      // поддержка готовых data-URL (jpg/webp/png) и «сырого» base64 (по умолч. png)
      im.src = (typeof v === 'string' && v.lastIndexOf('data:', 0) === 0) ? v : ('data:image/png;base64,' + v);
      IMG[n] = im;
    });
  }
  function onReady() {
    resize();
    try {
      if (scene.init) scene.init();
      newRun();
    } catch (e) { console.error('Engine onReady scene error:', e); }
    assetsReady = true;
    try { const v = getComputedStyle(document.documentElement).getPropertyValue('--ac').trim(); if (v) theme.accent = v; } catch (e) {}
    send({ type: 'ready' });
    if (pendingStart) start();
  }

  // ════════════════════════════════════════════ ЖИЗНЕННЫЙ ЦИКЛ
  function newRun() {
    score = 0; timeLeft = duration; state = 'playing'; parts.length = 0; overLabel = null;
    if (scene.reset) scene.reset();
    send({ type: 'score', value: 0 });
  }
  function start() {
    if (!assetsReady) { pendingStart = true; return; }
    if (running) return;
    running = true; last = performance.now();
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume();
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    running = false; cancelAnimationFrame(raf);
    if (audioCtx && audioCtx.state === 'running') audioCtx.suspend();
  }
  function restart() {
    if (audioCtx && audioCtx.state !== 'running') audioCtx.resume();
    newRun();
  }
  function loop(t) {
    if (!running) return;
    const dt = Math.min((t - last) / 1000, 0.05); last = t;
    try { update(dt); render(); }
    catch (e) { running = false; console.error('Engine loop error:', e); return; }
    raf = requestAnimationFrame(loop);
  }
  function update(dt) {
    if (state === 'playing') {
      ctlUpdate();                                   // tap-to-move → клавиши
      if (timed) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; gameOver(); } }
      if (scene.update) scene.update(dt);
    }
    updateParts(dt);
  }
  let overLabel = null;   // надпись на экране конца (переопределяет labels.over, напр. «ПОБЕДА»)
  function gameOver(opts) {
    if (state === 'over') return;
    overLabel = (opts && opts.label) || null;
    state = 'over';
    send({ type: 'gameover', value: score });
  }
  // Сброс таймера раунда (для пораундовых игр). Без аргумента — на полную длительность.
  function resetTimer(sec) { if (sec) duration = sec; timeLeft = duration; }
  // Добавить/отнять время (штрафы и бонусы времени)
  function addTime(sec) { timeLeft = Math.max(0.01, Math.min(duration, timeLeft + sec)); }

  // ════════════════════════════════════════════ СЧЁТ
  function addScore(n) { setScore(score + n); }
  function setScore(v) {
    score = v; if (score > best) best = score;
    send({ type: 'score', value: score });
  }

  // ════════════════════════════════════════════ РЕНДЕР
  function render() {
    drawBg();
    if (scene.render) scene.render(ctx);
    drawParts();
    if (scene.hud) scene.hud(ctx); else drawHUD();
    drawControls();                                  // джойстик/кнопки/прицел поверх HUD
    if (state === 'over') drawOver();
  }
  function drawBg() {
    const bg = theme.bgImage && IMG[theme.bgImage];
    if (bg && bg.complete && bg.naturalWidth) {
      // по ширине экрана, верх закреплён наверху, низ обрезается
      const dh = bg.naturalHeight * (W / bg.naturalWidth);
      ctx.drawImage(bg, 0, 0, W, dh);
      if (dh < H) { ctx.fillStyle = theme.bgBottom || '#111'; ctx.fillRect(0, dh, W, H - dh); }
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, theme.bgTop || '#222'); g.addColorStop(1, theme.bgBottom || '#111');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
  }
  function drawHUD() {
    ctx.textBaseline = 'middle';
    const cy = headerH / 2;
    const font = theme.font || "Georgia, serif";
    let textX = 16;
    const ico = theme.hudIcon && IMG[theme.hudIcon];
    if (ico && ico.complete) {
      const ic = Math.min(34, headerH * 0.5);
      ctx.drawImage(ico, 12, cy - ic / 2, ic, ic);
      textX = 16 + ic;
    }
    ctx.fillStyle = theme.hudText || '#f4e3b0';
    ctx.font = 'bold ' + Math.round(headerH * 0.34) + 'px ' + font;
    ctx.textAlign = 'left'; ctx.fillText(String(score), textX, cy);
    if (timed) {
      const bx = W * 0.46, bw = W - bx - 14, by = cy - 7, bh = 14;
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; rr(bx, by, bw, bh, 7); ctx.fill();
      const frac = Math.max(0, timeLeft / duration);
      ctx.fillStyle = accent(); rr(bx, by, Math.max(2, bw * frac), bh, 7); ctx.fill();
      ctx.strokeStyle = 'rgba(244,227,176,0.6)'; ctx.lineWidth = 1.5; rr(bx, by, bw, bh, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px ' + font; ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(timeLeft) + '', bx + bw / 2, by + bh / 2);
    }
  }
  function drawOver() {
    const L = theme.labels || {};
    ctx.fillStyle = 'rgba(10,7,4,0.78)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const font = theme.font || "Georgia, serif";
    ctx.fillStyle = accent(); ctx.font = 'bold ' + Math.round(W * 0.085) + 'px ' + font;
    ctx.fillText(overLabel || L.over || 'GAME OVER', W / 2, H * 0.4);
    ctx.fillStyle = theme.hudText || '#f4e3b0'; ctx.font = 'bold ' + Math.round(W * 0.13) + 'px ' + font;
    ctx.fillText(String(score), W / 2, H * 0.52);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = Math.round(W * 0.045) + 'px ' + font;
    ctx.fillText(L.scoreUnit || 'points', W / 2, H * 0.585);
    ctx.fillStyle = '#fff'; ctx.font = Math.round(W * 0.05) + 'px ' + font;
    ctx.fillText(L.again || 'Tap to play again', W / 2, H * 0.7);
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function accent() { return theme.accent || '#e7b44c'; }

  // ════════════════════════════════════════════ ЧАСТИЦЫ
  function burst(x, y, o) {
    o = o || {};
    if (parts.length > 140) return;
    const count = o.count || 4, col = o.color || accent(), g = (o.gravity == null ? 300 : o.gravity);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 120;
      parts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
                   life: 0.5 + Math.random() * 0.3, t: 0, s: 2 + Math.random() * 3, g: g, col: col });
    }
  }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt; if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }
  function drawParts() {
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i], a = Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = a; ctx.fillStyle = p.col;
      ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  }

  // ════════════════════════════════════════════ ЗВУК (после первого тапа)
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  }
  function beep(freq, dur, wtype, vol) {
    if (!audioCtx || audioCtx.state !== 'running') return;
    const t = audioCtx.currentTime;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = wtype || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.min(vol || 0.15, 0.6), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(audioCtx.destination);
    o.start(t); o.stop(t + dur + 0.03);
  }

  // ════════════════════════════════════════════ ВВОД
  function localPt(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function bindInput() {
    cv.addEventListener('pointerdown', function (e) {
      ensureAudio(); if (audioCtx && audioCtx.state !== 'running') audioCtx.resume();
      if (state === 'over') { restart(); return; }
      const p = localPt(e); p.id = e.pointerId;
      pointers[e.pointerId] = { x: p.x, y: p.y };
      downX = p.x; downY = p.y; hasDown = true;   // совместимость со сценами без мультитача
      if (ctlDown(p)) return;                     // съедено слоем управления
      if (scene.pointerDown) scene.pointerDown(p);
    });
    cv.addEventListener('pointerup', function (e) { endPointer(e, false); });
    cv.addEventListener('pointercancel', function (e) { endPointer(e, true); });
    cv.addEventListener('pointermove', function (e) {
      const p = localPt(e); p.id = e.pointerId;
      ctlMove(p);
      if (scene.pointerMove) scene.pointerMove(p);
    });
    window.addEventListener('keydown', function (e) {
      if (GAME_KEYS.indexOf(e.key) !== -1) e.preventDefault();
      keys.add(e.key);
      if (scene.key) scene.key(e.key);
    });
    window.addEventListener('keyup', function (e) { keys.delete(e.key); });
    window.addEventListener('blur', function () { keys.clear(); });
  }
  function endPointer(e, cancelled) {
    const start = pointers[e.pointerId]; delete pointers[e.pointerId];
    if (state === 'over') { hasDown = false; return; }
    const p = localPt(e);
    if (ctlUp({ x: p.x, y: p.y, id: e.pointerId })) { hasDown = false; return; }
    const sx = start ? start.x : downX, sy = start ? start.y : downY;
    const dx = p.x - sx, dy = p.y - sy, dist = Math.sqrt(dx * dx + dy * dy);
    const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    if (scene.pointerUp) scene.pointerUp({ x: p.x, y: p.y, id: e.pointerId, downX: sx, downY: sy,
      dx: dx, dy: dy, dist: dist, dir: dir, had: hasDown, cancelled: !!cancelled });
    hasDown = false;
  }

  // ════════════════════════════════════════════ ПРОТОКОЛ SHARKY
  function send(m) { try { parent.postMessage(m, '*'); } catch (e) {} }
  function bindProtocol() {
    window.addEventListener('message', function (e) {
      const d = e.data || {};
      if (d.type === 'init') {
        gotShell = true;
        if (d.accent) { theme.accent = d.accent; document.documentElement.style.setProperty('--ac', d.accent); }
      } else if (d.type === 'start') { gotShell = true; start(); }
      else if (d.type === 'pause') { gotShell = true; pause(); }
    });
  }

})(typeof window !== 'undefined' ? window : this);
