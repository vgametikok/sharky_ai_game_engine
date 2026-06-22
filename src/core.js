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
    img: function (name) { return IMG[name]; },
    beep: beep,
    burst: burst,
    addScore: addScore,
    setScore: setScore,
    gameOver: gameOver,
    resetTimer: resetTimer,
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
    score = 0; timeLeft = duration; state = 'playing'; parts.length = 0;
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
      if (timed) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; gameOver(); } }
      if (scene.update) scene.update(dt);
    }
    updateParts(dt);
  }
  function gameOver() {
    if (state === 'over') return;
    state = 'over';
    send({ type: 'gameover', value: score });
  }
  // Сброс таймера раунда (для пораундовых игр). Без аргумента — на полную длительность.
  function resetTimer(sec) { if (sec) duration = sec; timeLeft = duration; }

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
    ctx.fillText(L.over || 'GAME OVER', W / 2, H * 0.4);
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
      const p = localPt(e); downX = p.x; downY = p.y; hasDown = true;
      if (scene.pointerDown) scene.pointerDown(p);
    });
    cv.addEventListener('pointerup', function (e) {
      if (state === 'over') { hasDown = false; return; }
      const p = localPt(e);
      const dx = p.x - downX, dy = p.y - downY, dist = Math.sqrt(dx * dx + dy * dy);
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      if (scene.pointerUp) scene.pointerUp({ x: p.x, y: p.y, downX: downX, downY: downY, dx: dx, dy: dy, dist: dist, dir: dir, had: hasDown });
      hasDown = false;
    });
    cv.addEventListener('pointermove', function (e) {
      if (scene.pointerMove) scene.pointerMove(localPt(e));
    });
    window.addEventListener('keydown', function (e) { if (scene.key) scene.key(e.key); });
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
