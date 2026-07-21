/* ============================================================
   СЦЕНА: shmup (shmup.js) — вертикальный шмап
   ------------------------------------------------------------
   Скролл вверх, автострельба, волны врагов по расписанию с лупом
   и нарастающей сложностью. Всё — данными CONFIG.shmup.

   Механики:
   • АПГРЕЙДЫ ОРУЖИЯ: пикап 'P' повышает уровень (weapon.levels),
     смерть сбрасывает на 1 уровень.
   • БОМБА ('B', ограниченный запас): чистит все вражеские пули
     (в очки) и бьёт всех врагов на экране.
   • ПОЛЯРИЗАЦИЯ (Ikaruga, polarity:true): у игрока и пуль два цвета;
     пуля СВОЕГО цвета поглощается ядром (+очки), ЧУЖОГО — урон.
     Переключение кнопкой ⇄ / клавишей C.
   • ГРЕЙЗ (Touhou): хитбокс-ядро много меньше спрайта (hitboxR);
     пуля, прошедшая рядом с ядром (grazeR), даёт очки за смелость.

   CONFIG.shmup = {
     scroll:{speed,stars}, player:{w,h,speed,hp,bombs,hitboxR,color},
     weapon:{cooldown,shotSpeed,levels:[{count,spread,dmg}...]},
     polarity:true, colors:['#7ce0ff','#ff6b9e'], graze:{radius,score},
     enemies:{id:{w,h,hp,speed,color,move:'straight|sine|dive|hover',
                  gun:{cooldown,speed,aim:'down|player|spread3',pol}, score, drop}},
     waves:[{t,enemy,n,interval,x}], loop:{hpMul,rateMul}
   }
   ============================================================ */
Engine.register('shmup', function (engine, cfg) {
  'use strict';
  const S = cfg.shmup || {};
  const SC = Object.assign({ speed: 42, stars: true }, S.scroll || {});
  const PL = Object.assign({ w: 26, h: 30, speed: 260, hp: 3, bombs: 3, hitboxR: 3.5, color: '#7ce0ff' }, S.player || {});
  const WPN = Object.assign({ cooldown: 0.16, shotSpeed: 420 }, S.weapon || {});
  const LEVELS = WPN.levels || [{ count: 1, spread: 0, dmg: 1 }, { count: 2, spread: 0.18, dmg: 1 }, { count: 3, spread: 0.34, dmg: 1 }, { count: 5, spread: 0.6, dmg: 1 }];
  const POLAR = !!S.polarity;
  const PCOL = S.colors || ['#7ce0ff', '#ff6b9e'];
  const GRAZE = Object.assign({ radius: 16, score: 15 }, S.graze || {});
  const ENEMIES = S.enemies || {};
  const WAVES = S.waves || [];
  const LOOP = Object.assign({ hpMul: 1.3, rateMul: 0.9 }, S.loop || {});
  const SPOT = S.spotlight || null;      // {radius,dark}: тьма + круг света вокруг игрока (глубина/ночь)
  const LB = (cfg.theme && cfg.theme.labels) || {};
  const FONT = (cfg.theme && cfg.theme.font) || 'sans-serif';

  let W = 360, H = 640;
  let p = null;                      // игрок
  let foes = [], eb = [], pb = [], drops = [];   // враги, пули врагов, пули игрока, пикапы
  let time = 0, waveT = 0, waveIdx = 0, loopN = 0, shootT = 0;
  let target = null;                 // палец: целевая позиция
  let btns = [];
  let stars = [];
  let shakeT = 0, flashT = 0;

  // ── режим кампании: 50 уровней, боссы каждые N, story-интерлюдии, сейв ──
  const MODE = S.mode || 'endless';
  const LVL_COUNT = S.levelCount || 50;
  const BOSS_EVERY = S.bossEvery || 5;
  const BOSSES = S.bosses || [];         // [{enemy,name,story,win}] для боссовых уровней (по порядку)
  const POOL = S.pool || Object.keys(ENEMIES);
  const INTRO = S.intro || null;         // строки вступления (показ на 1-м уровне)
  let level = 0;                          // текущий уровень (0-based)
  let lvlWaves = [], lvlWaveIdx = 0, lvlWaveT = 0;
  let interT = 0, interLines = null;      // интерлюдия (пауза с текстом)

  function isBossLevel(L) { return ((L + 1) % BOSS_EVERY) === 0; }         // L 0-based → уровни 5,10,…
  function bossIndex(L) { return Math.floor((L + 1) / BOSS_EVERY) - 1; }
  function bossOf(L) { return BOSSES[Math.min(bossIndex(L), BOSSES.length - 1)] || {}; }

  function buildLevel(L) {
    lvlWaves = []; lvlWaveIdx = 0; lvlWaveT = 0;
    const hpMul = 1 + L * 0.09;
    if (isBossLevel(L)) {
      const minion = POOL[L % POOL.length];
      lvlWaves.push({ t: 0.5, enemy: minion, n: 3 + Math.floor(L / 6), interval: 0.35, hpMul: hpMul });
      const b = bossOf(L);
      lvlWaves.push({ t: 3.2, enemy: b.enemy, n: 1, boss: true, name: b.name, hpMul: 1 });
    } else {
      const nWaves = 3 + Math.floor(L / 5);
      let t = 0.5;
      for (let w = 0; w < nWaves; w++) {
        const e = POOL[(L * 2 + w) % POOL.length];
        lvlWaves.push({ t: t, enemy: e, n: 3 + Math.floor(L / 7), interval: Math.max(0.16, 0.42 - L * 0.005), hpMul: hpMul });
        t += 1.5 + (w % 2) * 0.5;
      }
    }
  }
  function onLevelClear() {
    level++;
    engine.saveState({ level: level });
    if (level >= LVL_COUNT) { engine.gameOver({ label: (LB.win || 'МИР СПАСЁН!') }); return; }
    const wasBoss = isBossLevel(level - 1);
    if (isBossLevel(level)) { const nb = bossOf(level); interLines = ['⚠ ' + (nb.name || 'БОСС'), nb.story || '']; interT = 3.4; }
    else if (wasBoss) { const pb2 = bossOf(level - 1); interLines = [(pb2.name || 'Босс') + ' ' + (LB.defeated || 'повержен'), pb2.win || '']; interT = 3.2; }
    else { interLines = [(LB.levelWord || 'УРОВЕНЬ') + ' ' + (level + 1)]; interT = 1.3; }
    buildLevel(level);
  }
  function sprOf(def, ent) {
    if (def.imgs && def.imgs.length) { const n = def.imgs.length; const i = Math.floor((ent ? ent.t : time) * (def.fps || 6)) % n; return engine.img(def.imgs[i]); }
    if (def.img) return engine.img(def.img);
    return null;
  }
  function drawBossBar(ctx, f) {
    const bw = Math.max(60, f.w * 1.5), x = f.x - bw / 2, y = f.y - f.h * 0.85 - 9;
    const frac = Math.max(0, f.hp / (f.maxHp || f.hp || 1));
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 1, y - 1, bw + 2, 6);
    ctx.fillStyle = '#ff5a6a'; ctx.fillRect(x, y, bw * frac, 4);
  }
  function wrapText(ctx, text, cx, y, maxW, lh) {
    if (!text) return;
    const words = String(text).split(' '); let line = '', yy = y;
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, cx, yy); line = words[i]; yy += lh; }
      else line = test;
    }
    if (line) ctx.fillText(line, cx, yy);
  }

  function reset() {
    p = { x: W / 2, y: H * 0.8, hp: PL.hp, bombs: PL.bombs, lvl: 0, pol: 0, inv: 0, dead: false };
    foes = []; eb = []; pb = []; drops = []; pending = [];
    time = 0; waveT = 0; waveIdx = 0; loopN = 0; shootT = 0; target = null;
    interT = 0; interLines = null;
    stars = [];
    for (let i = 0; i < 40; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 1.6 });
    layoutButtons();
    if (MODE === 'levels') {
      const sv = engine.loadState && engine.loadState();
      level = (sv && sv.level | 0) || 0;
      if (level >= LVL_COUNT || level < 0) level = 0;
      buildLevel(level);
      if (level === 0 && INTRO) { interLines = INTRO; interT = 4.0; }
      else if (isBossLevel(level)) { const nb = bossOf(level); interLines = ['⚠ ' + (nb.name || 'БОСС'), nb.story || '']; interT = 3.0; }
      else { interLines = [(LB.levelWord || 'УРОВЕНЬ') + ' ' + (level + 1)]; interT = 1.1; }
    }
  }
  function layoutButtons() {
    btns = [];
    const r = Math.min(W, H) * 0.07, m = r * 0.6;
    btns.push({ id: 'bomb', x: W - m - r, y: H - m - r, r: r, glyph: '✦' });
    if (POLAR) btns.push({ id: 'pol', x: m + r, y: H - m - r, r: r, glyph: '⇄' });
  }

  // ── спавн волн ──
  function spawnWave(w) {
    const def = ENEMIES[w.enemy]; if (!def) return;
    const n = w.n || 1;
    for (let i = 0; i < n; i++) {
      setTimeoutSim(i * (w.interval || 0.35), function (k) {
        const fx = (w.x != null) ? w.x * W : (n === 1 ? W / 2 : (0.15 + 0.7 * (k / Math.max(1, n - 1))) * W);
        const hpm = w.hpMul != null ? w.hpMul : Math.pow(LOOP.hpMul, loopN);
        const hp = (def.hp || 1) * hpm * (w.boss ? 1 : 1);
        foes.push({ def: def, x: fx, y: w.boss ? -60 : -30, w: def.w || 26, h: def.h || 24,
          hp: hp, maxHp: hp, t: Math.random() * 6,
          gunT: (def.gun ? def.gun.cooldown * (0.5 + Math.random()) : 0),
          baseX: fx, pol: def.gun && def.gun.pol != null ? def.gun.pol : ((Math.random() * 2) | 0),
          boss: !!w.boss, name: w.name || null });
      }, i);
    }
  }
  // простые «отложенные» спавны без setTimeout (управляем сами)
  let pending = [];
  function setTimeoutSim(delay, fn, arg) { pending.push({ t: delay, fn: fn, arg: arg }); }

  function fireWeapon() {
    const lv = LEVELS[Math.min(p.lvl, LEVELS.length - 1)];
    // вперёд (нос) — веер по spread
    for (let i = 0; i < lv.count; i++) {
      const a = -Math.PI / 2 + (lv.count > 1 ? (i - (lv.count - 1) / 2) * (lv.spread / Math.max(1, lv.count - 1)) : 0);
      pb.push({ x: p.x, y: p.y - PL.h * 0.4, vx: Math.cos(a) * WPN.shotSpeed, vy: Math.sin(a) * WPN.shotSpeed, dmg: lv.dmg });
    }
    // БОРТОВОЙ ЗАЛП: пушки с обоих бортов (weapon.sides) — по уровню оружия число стволов растёт
    if (WPN.sides) {
      const sc = Math.max(1, Math.min(lv.count, WPN.sideMax || 3));
      const sp = (WPN.sideSpeed || WPN.shotSpeed);
      for (let s = 0; s < 2; s++) {
        const baseA = s === 0 ? 0 : Math.PI;                 // правый борт / левый борт
        for (let i = 0; i < sc; i++) {
          const off = (sc > 1 ? (i - (sc - 1) / 2) : 0) * 0.16;
          const a = baseA + off;
          pb.push({ x: p.x + (s === 0 ? PL.w * 0.42 : -PL.w * 0.42), y: p.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, dmg: lv.dmg });
        }
      }
    }
    engine.beep(760, 0.04, 'square', 0.06);
  }
  function enemyFire(f) {
    const g = f.def.gun; if (!g) return;
    const pol = POLAR ? f.pol : 0;
    const mk = (vx, vy) => eb.push({ x: f.x, y: f.y + f.h / 2, vx: vx, vy: vy, pol: pol, grazed: false });
    if (g.aim === 'player') {
      const dx = p.x - f.x, dy = p.y - f.y, L = Math.max(1, Math.hypot(dx, dy));
      mk(dx / L * g.speed, dy / L * g.speed);
    } else if (g.aim === 'spread3') {
      for (let a = -1; a <= 1; a++) { const ang = Math.PI / 2 + a * 0.35; mk(Math.cos(ang) * g.speed, Math.sin(ang) * g.speed); }
    } else mk(0, g.speed);
    engine.beep(300, 0.05, 'sawtooth', 0.05);
  }
  function useBomb() {
    if (p.bombs <= 0) return;
    p.bombs--; flashT = 0.35; shakeT = 0.3;
    engine.addScore(eb.length * 5);
    eb = [];
    foes.forEach(f => { f.hp -= 6; if (f.hp <= 0) killFoe(f); });
    foes = foes.filter(f => f.hp > 0);
    engine.beep(90, 0.5, 'sawtooth', 0.3);
  }
  function killFoe(f) {
    engine.addScore(f.def.score || 50);
    engine.burst(f.x, f.y, { count: 12, color: f.def.color || '#f80' });
    if (f.def.drop && Math.random() < (f.def.dropChance || 0.35))
      drops.push({ x: f.x, y: f.y, kind: f.def.drop, t: 0 });
    engine.beep(160, 0.15, 'square', 0.12);
  }
  function hurtPlayer() {
    if (p.inv > 0) return;
    p.hp--; p.inv = 1.6; shakeT = 0.3;
    p.lvl = Math.max(0, p.lvl - 1);                     // смерть сбрасывает апгрейд
    engine.burst(p.x, p.y, { count: 16, color: '#fff' });
    engine.beep(120, 0.3, 'sawtooth', 0.2);
    if (p.hp <= 0) { p.dead = true; engine.gameOver(); }
  }

  return {
    init: function () {},
    reset: reset,
    layout: function (L) { W = L.W; H = L.H; layoutButtons(); },

    update: function (dt) {
      time += dt;
      p.inv = Math.max(0, p.inv - dt);
      flashT = Math.max(0, flashT - dt);
      shakeT = Math.max(0, shakeT - dt);

      // ── скролл-звёзды ──
      stars.forEach(s => { s.y += SC.speed * s.s * dt; if (s.y > H) { s.y = -4; s.x = Math.random() * W; } });

      // ── расписание волн ──
      if (interT > 0) {
        interT -= dt;                                    // интерлюдия: пауза спавна (текст в hud)
      } else if (MODE === 'levels') {
        lvlWaveT += dt;
        while (lvlWaveIdx < lvlWaves.length && lvlWaves[lvlWaveIdx].t <= lvlWaveT) { spawnWave(lvlWaves[lvlWaveIdx]); lvlWaveIdx++; }
        if (lvlWaveIdx >= lvlWaves.length && foes.length === 0 && pending.length === 0) onLevelClear();
      } else {
        waveT += dt;                                     // endless: луп со сложностью
        while (waveIdx < WAVES.length && WAVES[waveIdx].t * Math.pow(LOOP.rateMul, loopN) <= waveT) { spawnWave(WAVES[waveIdx]); waveIdx++; }
        if (waveIdx >= WAVES.length && foes.length === 0 && pending.length === 0) { loopN++; waveIdx = 0; waveT = 0; }
      }
      for (let i = pending.length - 1; i >= 0; i--) { pending[i].t -= dt; if (pending[i].t <= 0) { pending[i].fn(pending[i].arg); pending.splice(i, 1); } }

      // ── игрок: тач-перетаскивание или клавиши ──
      const k = engine.keys;
      let mx = (k.has('ArrowLeft') || k.has('a') ? -1 : 0) + (k.has('ArrowRight') || k.has('d') ? 1 : 0);
      let my = (k.has('ArrowUp') || k.has('w') ? -1 : 0) + (k.has('ArrowDown') || k.has('s') ? 1 : 0);
      if (target) {
        p.x += (target.x - p.x) * Math.min(1, dt * 14);
        p.y += (target.y - p.y) * Math.min(1, dt * 14);
      } else { p.x += mx * PL.speed * dt; p.y += my * PL.speed * dt; }
      p.x = Math.max(PL.w / 2, Math.min(W - PL.w / 2, p.x));
      p.y = Math.max(PL.h, Math.min(H - PL.h / 2, p.y));

      // автострельба
      shootT -= dt; if (shootT <= 0) { shootT = WPN.cooldown; fireWeapon(); }

      // ── враги ──
      for (let i = foes.length - 1; i >= 0; i--) {
        const f = foes[i], d = f.def; f.t += dt;
        const sp = d.speed || 60;
        if (d.move === 'sine') { f.y += sp * dt; f.x = f.baseX + Math.sin(f.t * 2.2) * W * 0.18; }
        else if (d.move === 'dive') { f.y += sp * dt * (f.y < H * 0.3 ? 1 : 2.2); f.x += Math.sign(p.x - f.x) * sp * 0.4 * dt; }
        else if (d.move === 'hover') { f.y += (f.y < H * 0.22 ? sp : 0) * dt; f.x = f.baseX + Math.sin(f.t * 1.4) * W * 0.24; }
        else f.y += sp * dt;
        if (f.y > H + 40) { foes.splice(i, 1); continue; }
        if (d.gun) { f.gunT -= dt; if (f.gunT <= 0 && f.y > 0 && f.y < H * 0.75) { f.gunT = d.gun.cooldown; enemyFire(f); } }
        // столкновение корпусом
        if (Math.abs(f.x - p.x) < (f.w + PL.w) / 2 - 4 && Math.abs(f.y - p.y) < (f.h + PL.h) / 2 - 4) hurtPlayer();
      }

      // ── пули игрока ──
      for (let i = pb.length - 1; i >= 0; i--) {
        const b = pb[i]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y < -10 || b.x < -10 || b.x > W + 10) { pb.splice(i, 1); continue; }
        for (let j = 0; j < foes.length; j++) {
          const f = foes[j];
          if (Math.abs(b.x - f.x) < f.w / 2 + 3 && Math.abs(b.y - f.y) < f.h / 2 + 3) {
            f.hp -= b.dmg; pb.splice(i, 1);
            engine.burst(b.x, b.y, { count: 3, color: '#fff' });
            if (f.hp <= 0) { killFoe(f); foes.splice(j, 1); }
            break;
          }
        }
      }

      // ── пули врагов: ядро-хитбокс, поляризация, грейз ──
      for (let i = eb.length - 1; i >= 0; i--) {
        const b = eb[i]; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y > H + 12 || b.y < -12 || b.x < -12 || b.x > W + 12) { eb.splice(i, 1); continue; }
        const dx = b.x - p.x, dy = b.y - p.y, dist = Math.hypot(dx, dy);
        if (dist < PL.hitboxR + 3) {
          if (POLAR && b.pol === p.pol) {               // поглощение своего цвета
            engine.addScore(10);
            engine.burst(b.x, b.y, { count: 4, color: PCOL[b.pol] });
            engine.beep(880, 0.05, 'triangle', 0.08);
          } else hurtPlayer();
          eb.splice(i, 1); continue;
        }
        if (!b.grazed && dist < GRAZE.radius) {         // грейз: прошла рядом
          b.grazed = true; engine.addScore(GRAZE.score);
          engine.burst(p.x, p.y, { count: 2, color: '#fff' });
        }
      }

      // ── пикапы ──
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.y += 70 * dt; d.t += dt;
        if (d.y > H + 16) { drops.splice(i, 1); continue; }
        if (Math.abs(d.x - p.x) < 20 && Math.abs(d.y - p.y) < 22) {
          if (d.kind === 'up') { p.lvl = Math.min(p.lvl + 1, LEVELS.length - 1); engine.addScore(30); }
          else if (d.kind === 'bomb') p.bombs++;
          else if (d.kind === 'heart') p.hp++;
          engine.beep(700, 0.1, 'triangle', 0.14);
          drops.splice(i, 1);
        }
      }
    },

    render: function (ctx) {
      const ox = shakeT > 0 ? (Math.random() * 2 - 1) * 4 : 0;
      ctx.save(); ctx.translate(ox, 0);
      // звёзды/пузырьки
      if (SC.stars) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        stars.forEach(s => ctx.fillRect(s.x, s.y, s.s < 1.2 ? 1 : 2, s.s < 1.2 ? 3 : 5));
      }
      // пикапы
      drops.forEach(d => {
        const bob = Math.sin(d.t * 5) * 2;
        ctx.fillStyle = d.kind === 'up' ? '#ffd75e' : d.kind === 'bomb' ? '#b48cff' : '#ff6b7e';
        ctx.beginPath(); ctx.arc(d.x, d.y + bob, 10, 0, 7); ctx.fill();
        ctx.fillStyle = '#222'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(d.kind === 'up' ? 'P' : d.kind === 'bomb' ? 'B' : '+', d.x, d.y + bob + 1);
      });
      // враги (спрайт, если задан def.img/imgs; иначе треугольник)
      foes.forEach(f => {
        const im = sprOf(f.def, f);
        if (im) {
          const sc = f.def.imgScale || 1.7;
          const dw = f.w * sc, dh = f.h * sc;
          if (f.flash > 0) ctx.globalAlpha = 0.6;
          ctx.drawImage(im, f.x - dw / 2, f.y - dh / 2, dw, dh);
          ctx.globalAlpha = 1;
        } else {
          ctx.fillStyle = f.def.color || '#e07070';
          ctx.beginPath();
          ctx.moveTo(f.x, f.y + f.h / 2); ctx.lineTo(f.x - f.w / 2, f.y - f.h / 2);
          ctx.lineTo(f.x + f.w / 2, f.y - f.h / 2); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke();
        }
        if (POLAR) { ctx.fillStyle = PCOL[f.pol]; ctx.beginPath(); ctx.arc(f.x, f.y, 4, 0, 7); ctx.fill(); }
        if (f.boss) drawBossBar(ctx, f);
      });
      // фонарь: тьма с кругом света вокруг игрока; враги на границе едва проглядывают
      if (SPOT) {
        const r0 = SPOT.radius || 170;
        const dk = SPOT.dark == null ? 0.86 : SPOT.dark;
        const g = ctx.createRadialGradient(p.x, p.y, r0 * 0.4, p.x, p.y, r0);
        g.addColorStop(0, 'rgba(2,4,14,0)');
        g.addColorStop(1, 'rgba(2,4,14,' + dk + ')');
        ctx.fillStyle = g; ctx.fillRect(-10, 0, W + 20, H);
        // биолюминесценция пикапов — светятся сквозь тьму
        drops.forEach(d => {
          const bob = Math.sin(d.t * 5) * 2;
          const gg = ctx.createRadialGradient(d.x, d.y + bob, 1, d.x, d.y + bob, 16);
          gg.addColorStop(0, 'rgba(140,220,255,0.85)'); gg.addColorStop(1, 'rgba(140,220,255,0)');
          ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(d.x, d.y + bob, 16, 0, 7); ctx.fill();
        });
      }
      // пули игрока (спрайт пули, если задан)
      const bim = WPN.bulletImg && engine.img(WPN.bulletImg);
      if (bim) pb.forEach(b => { const s = WPN.bulletSize || 14; ctx.drawImage(bim, b.x - s / 2, b.y - s / 2, s, s); });
      else { ctx.fillStyle = '#eaffff'; pb.forEach(b => ctx.fillRect(b.x - 2, b.y - 6, 4, 10)); }
      // пули врагов (цвет = полярность)
      eb.forEach(b => {
        ctx.fillStyle = POLAR ? PCOL[b.pol] : '#ff9e9e';
        ctx.beginPath(); ctx.arc(b.x, b.y, 4.5, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.stroke();
      });
      // игрок (мигает в i-frames)
      if (!(p.inv > 0 && Math.floor(time * 14) % 2 === 0)) {
        const col = POLAR ? PCOL[p.pol] : PL.color;
        const pim = PL.img && engine.img(PL.img);
        if (pim) {
          const sc = PL.imgScale || 1.6, dw = PL.w * sc, dh = PL.h * sc;
          ctx.drawImage(pim, p.x - dw / 2, p.y - dh / 2, dw, dh);
        } else {
          ctx.fillStyle = col;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y - PL.h / 2); ctx.lineTo(p.x - PL.w / 2, p.y + PL.h / 2);
          ctx.lineTo(p.x, p.y + PL.h * 0.28); ctx.lineTo(p.x + PL.w / 2, p.y + PL.h / 2);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        }
        // ядро-хитбокс (Touhou-style, видно всегда)
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, PL.hitboxR, 0, 7); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, PL.hitboxR + 2, 0, 7); ctx.stroke();
      }
      // вспышка бомбы
      if (flashT > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flashT * 1.8).toFixed(2) + ')'; ctx.fillRect(-10, 0, W + 20, H); }
      ctx.restore();
    },

    hud: function (ctx) {
      ctx.textBaseline = 'middle';
      // жизни
      for (let i = 0; i < p.hp; i++) { ctx.fillStyle = '#ff6b7e'; ctx.beginPath(); ctx.arc(18 + i * 20, 18, 7, 0, 7); ctx.fill(); }
      // бомбы
      for (let i = 0; i < p.bombs; i++) { ctx.fillStyle = '#b48cff'; ctx.beginPath(); ctx.arc(18 + i * 20, 40, 6, 0, 7); ctx.fill(); }
      // счёт
      ctx.fillStyle = '#fff'; ctx.font = 'bold 16px ' + FONT; ctx.textAlign = 'right';
      ctx.fillText(String(engine.score), W - 14, 20);
      // уровень оружия + прогресс кампании / круг
      ctx.font = 'bold 11px ' + FONT;
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const prog = MODE === 'levels' ? '  ' + (LB.lvlShort || 'УР') + ' ' + (level + 1) + '/' + LVL_COUNT : (loopN ? '  ' + (LB.loopWord || 'ЦИКЛ') + ' ' + (loopN + 1) : '');
      ctx.fillText('PWR ' + (p.lvl + 1) + prog, W - 14, 40);
      // кнопки
      btns.forEach(b => {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.fillStyle = b.id === 'pol' ? PCOL[p.pol] : 'rgba(255,255,255,0.85)';
        ctx.font = 'bold ' + Math.round(b.r * 0.85) + 'px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(b.glyph, b.x, b.y + 1);
      });
      if (time < 3 && interT <= 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 14px ' + FONT; ctx.textAlign = 'center';
        ctx.fillText(LB.hint || 'Веди пальцем · ✦ бомба' + (POLAR ? ' · ⇄ цвет' : ''), W / 2, H * 0.32);
      }
      // интерлюдия/история между уровнями
      if (interT > 0 && interLines) {
        ctx.fillStyle = 'rgba(6,4,12,' + (0.72 * Math.min(1, interT * 2)).toFixed(2) + ')';
        ctx.fillRect(0, H * 0.30, W, H * 0.40);
        ctx.textAlign = 'center';
        ctx.fillStyle = (cfg.theme && cfg.theme.accent) || '#ffd24a';
        ctx.font = 'bold ' + Math.round(W * 0.072) + 'px ' + FONT;
        ctx.fillText(interLines[0] || '', W / 2, H * 0.40);
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.font = Math.round(W * 0.042) + 'px ' + FONT;
        wrapText(ctx, interLines[1] || '', W / 2, H * 0.47, W * 0.82, W * 0.056);
      }
    },

    key: function (k) {
      if (k === 'x' || k === 'X') useBomb();
      if (POLAR && (k === 'c' || k === 'C' || k === 'z' || k === 'Z')) p.pol = 1 - p.pol;
    },
    pointerDown: function (pt) {
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        if ((pt.x - b.x) * (pt.x - b.x) + (pt.y - b.y) * (pt.y - b.y) < b.r * b.r * 1.4) {
          if (b.id === 'bomb') useBomb(); else if (b.id === 'pol') p.pol = 1 - p.pol;
          return;
        }
      }
      target = { x: pt.x, y: pt.y - 60 };   // корабль чуть выше пальца
    },
    pointerMove: function (pt) { if (target) target = { x: pt.x, y: pt.y - 60 }; },
    pointerUp: function () { target = null; },

    _state: function () {
      return { hp: p.hp, bombs: p.bombs, lvl: p.lvl, pol: p.pol, x: p.x, y: p.y,
        foes: foes.length, eb: eb.length, pb: pb.length, drops: drops.length,
        loopN: loopN, waveIdx: waveIdx, inv: p.inv,
        level: level, interT: +interT.toFixed(2), interLines: interLines,
        boss: (function () { const b = foes.find(f => f.boss); return b ? { hp: b.hp, maxHp: b.maxHp, name: b.name } : null; })() };
    },
    _spawnBullet: function (x, y, vx, vy, pol) { eb.push({ x: x, y: y, vx: vx, vy: vy, pol: pol || 0, grazed: false }); },
    _spawnDrop: function (x, y, kind) { drops.push({ x: x, y: y, kind: kind, t: 0 }); },
    _setPos: function (x, y) { p.x = x; p.y = y; },
  };
});
