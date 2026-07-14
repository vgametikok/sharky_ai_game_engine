// Страница генерации: прогресс → окно игры + окно ассетов (чаты) → финал → играть/скачать/опубликовать.
import { h, toast, extractJson } from '../ui.js';
import { getProject, updateProject, listMessages, addMessage } from '../db.js';
import { llm, pixellab, publishGame } from '../api.js';
import { buildHtml } from '../builder.js';
import { makerSystemPrompt, briefMessage, finalIntegrationMessage, assetsChatSystem } from '../prompts.js';
import { GENRES, STAGE_LABELS } from '../catalog.js';

export default async function projectView([id]) {
  const p = await getProject(id);
  if (!p) return h('div.panel', {}, 'Проект не найден');

  const st = {
    p,
    config: safeParse(p.config),
    assets: Array.isArray(p.assets) ? p.assets : [],
    msgs: { proto: await listMessages(id, 'proto'), assets: await listMessages(id, 'assets') },
    genBusy: false, assetBusy: false, finalBusy: false,
    ui: {},
  };
  const root = h('div');
  render();
  kick();
  return root;

  // ────────────────────────────── helpers ──────────────────────────────
  function safeParse(s) { try { return s ? JSON.parse(s) : null; } catch { return null; } }

  async function save(patch) {
    Object.assign(st.p, patch);
    await updateProject(id, patch);
  }
  async function saveState(extra = {}) {
    await save({ config: JSON.stringify(st.config), assets: st.assets, ...extra });
  }

  function assetMap() {
    return Object.fromEntries(st.assets.filter(a => a.dataUrl).map(a => [a.id, a.dataUrl]));
  }
  function assetProgress() {
    const total = Math.max(st.assets.length, 1);
    const done = st.assets.filter(a => a.dataUrl || a.status === 'error').length;
    return 40 + Math.round(35 * done / total);
  }

  // История канала для LLM: первый месседж (бриф) + последние 7.
  function chatToLlm(channel) {
    const raw = st.msgs[channel].map(m => ({ role: m.role, content: m.content }));
    if (raw.length <= 8) return raw;
    return [raw[0], ...raw.slice(-7)];
  }

  async function pushMsg(channel, role, content) {
    await addMessage(id, channel, role, content);
    st.msgs[channel].push({ role, content });
  }

  // Принять ответ генератора: {config, assets, note}.
  async function acceptGenerated(text, channel) {
    const parsed = extractJson(text);
    if (!parsed.config || !parsed.config.genre) throw new Error('модель не вернула config');
    st.config = parsed.config;
    if (Array.isArray(parsed.assets)) mergeAssets(parsed.assets);
    await pushMsg(channel, 'assistant', text);
    return parsed;
  }

  function mergeAssets(list, forceRegen = []) {
    const old = Object.fromEntries(st.assets.map(a => [a.id, a]));
    st.assets = list.map(x => {
      const a = {
        id: String(x.id || '').replace(/[^\w]/g, '_') || 'asset',
        name: x.name || x.id, kind: x.kind || 'object',
        description: x.description || '',
        size: { w: clamp(x.size?.w, 16, 400, 64), h: clamp(x.size?.h, 16, 400, 64) },
      };
      const prev = old[a.id];
      const unchanged = prev && prev.description === a.description &&
        prev.size?.w === a.size.w && prev.size?.h === a.size.h && !forceRegen.includes(a.id);
      if (unchanged) { a.dataUrl = prev.dataUrl; a.status = prev.status; a.error = prev.error; }
      else a.status = 'pending';
      return a;
    });
  }
  function clamp(v, lo, hi, def) { v = Math.round(Number(v)); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def; }

  // ────────────────────────────── процессы ──────────────────────────────
  function kick() {
    if (st.p.stage === 'generating' && !st.config) runInitialGeneration();
    else if (st.p.stage === 'generating' && st.config) save({ stage: 'review' }).then(render);
    if (st.p.stage === 'review') runAssetLoop();
    if (st.p.stage === 'final') runFinal();
  }

  async function runInitialGeneration() {
    if (st.genBusy) return; st.genBusy = true;
    try {
      const sys = await makerSystemPrompt(st.p);
      if (!st.msgs.proto.length) await pushMsg('proto', 'user', briefMessage(st.p));
      const r = await llm({ provider: st.p.provider, system: sys, messages: chatToLlm('proto'), max_tokens: 32000 });
      await acceptGenerated(r.text, 'proto');
      await saveState({ stage: 'review', progress: 40 });
      st.genBusy = false;
      render(); kick();
    } catch (e) {
      st.genBusy = false;
      st.genError = e.message || String(e);
      render();
    }
  }

  async function runAssetLoop() {
    if (st.assetBusy) return; st.assetBusy = true;
    while (true) {
      const a = st.assets.find(x => !x.dataUrl && x.status !== 'error');
      if (!a) break;
      a.status = 'generating'; renderAssets();
      try {
        const r = await pixellab({
          path: 'generate-image-pixflux',
          body: {
            description: a.description,
            image_size: { width: a.size.w, height: a.size.h },
            no_background: a.kind !== 'background',
          },
        });
        const b64 = r?.image?.base64 || r?.images?.[0]?.base64 || r?.data?.image?.base64;
        if (!b64) throw new Error(r?.error || r?.detail?.[0]?.msg || r?.detail || 'нет картинки в ответе');
        a.dataUrl = 'data:image/png;base64,' + b64;
        a.status = 'done'; delete a.error;
      } catch (e) {
        a.status = 'error'; a.error = (e.message || String(e)).slice(0, 200);
      }
      await save({ assets: st.assets, progress: st.p.stage === 'review' ? assetProgress() : st.p.progress });
      renderAssets(); renderProgress();
    }
    st.assetBusy = false;
  }

  async function startFinal() {
    await save({ stage: 'final', progress: 80 });
    render();
    runFinal();
  }

  async function runFinal() {
    if (st.finalBusy) return; st.finalBusy = true;
    try {
      const sys = await makerSystemPrompt(st.p);
      await pushMsg('proto', 'user', finalIntegrationMessage(st.config, st.assets));
      const r = await llm({ provider: st.p.provider, system: sys, messages: chatToLlm('proto'), max_tokens: 32000 });
      await acceptGenerated(r.text, 'proto');
      await saveState({ stage: 'done', progress: 100 });
    } catch (e) {
      toast('финальная сборка: ' + e.message, true);
      await save({ stage: 'review' });
    }
    st.finalBusy = false;
    render();
  }

  // Чат окна игры (канал proto) — и на этапе review, и на готовой игре (продолжение контекста).
  async function sendGameMsg(text, withAssets) {
    await pushMsg('proto', 'user', text);
    const sys = await makerSystemPrompt(st.p);
    const r = await llm({ provider: st.p.provider, system: sys, messages: chatToLlm('proto'), max_tokens: 32000 });
    const parsed = await acceptGenerated(r.text, 'proto');
    await saveState();
    rebuildFrame(withAssets);
    runAssetLoop();
    return parsed.note || 'Конфиг обновлён ✓';
  }

  // Чат окна ассетов.
  async function sendAssetsMsg(text) {
    await pushMsg('assets', 'user', text);
    const meta = st.assets.map(({ id, name, kind, description, size }) => ({ id, name, kind, description, size }));
    const content = `Текущие ассеты:\n${JSON.stringify(meta)}\n\nЗамечание пользователя: ${text}`;
    const history = chatToLlm('assets').slice(0, -1);
    const r = await llm({
      provider: st.p.provider, system: assetsChatSystem(),
      messages: [...history, { role: 'user', content }], max_tokens: 8000,
    });
    const parsed = extractJson(r.text);
    await pushMsg('assets', 'assistant', r.text);
    if (Array.isArray(parsed.assets)) mergeAssets(parsed.assets, parsed.regenerate || []);
    await save({ assets: st.assets });
    renderAssets();
    runAssetLoop();
    return parsed.note || 'Ассеты обновлены ✓';
  }

  // ────────────────────────────── рендер ──────────────────────────────
  function render() {
    root.innerHTML = '';
    const g = GENRES.find(x => x.id === st.p.genre);
    const [label, color] = STAGE_LABELS[st.p.stage] || [st.p.stage, ''];
    st.ui = {};

    st.ui.progress = h('div', {},
      h('div.progress', {}, h('i', { style: `width:${st.p.progress}%` })),
      h('div.progress-lab', {}, progressLabel()),
    );

    root.append(
      h('div.eyebrow', {}, 'проект'),
      h('div.row.spread', {},
        h('h1.pagetitle', { style: 'margin-bottom:8px' }, (g?.icon || '🎮') + ' ' + st.p.title),
        h('span.badge' + (color ? '.' + color : ''), {}, label),
      ),
      st.ui.progress,
    );

    if (st.p.stage === 'generating') {
      root.append(h('div.panel', { style: 'margin-top:18px' },
        st.genError
          ? h('div', {},
              h('p', {}, '⚠ ' + st.genError),
              h('button.btn.primary', { onclick: () => { st.genError = null; render(); runInitialGeneration(); } }, '↻ Попробовать ещё раз'))
          : h('div.typing', {}, `${st.p.provider} придумывает игру — это может занять пару минут`),
      ));
      return;
    }

    if (st.p.stage === 'final') {
      root.append(h('div.panel', { style: 'margin-top:18px' },
        h('div.typing', {}, 'собираю финальную версию: вшиваю ассеты в игру')));
      return;
    }

    if (st.p.stage === 'done' || st.p.stage === 'published') { renderDone(); return; }

    // ── review: два окна ──
    const bothDone = st.p.proto_done && st.p.assets_done;
    const grid = h('div.workgrid');
    grid.append(renderGameWin(false), renderAssetsWin());
    root.append(grid);
    if (bothDone) {
      root.append(h('div.row', { style: 'justify-content:center; margin-top:18px' },
        h('button.btn.big.green', { onclick: startFinal }, '⚙ Собрать финальную версию')));
    }
  }

  function progressLabel() {
    const s = st.p.stage;
    if (s === 'generating') return 'этап 1/3: генерация игры';
    if (s === 'review') return `этап 2/3: доработка — прототип ${st.p.proto_done ? '✓' : '…'} · ассеты ${st.p.assets_done ? '✓' : '…'}`;
    if (s === 'final') return 'этап 3/3: финальная сборка';
    if (s === 'published') return 'игра отправлена на модерацию в Sharky';
    return 'игра готова';
  }
  function renderProgress() {
    if (!st.ui.progress) return;
    st.ui.progress.querySelector('i').style.width = st.p.progress + '%';
    st.ui.progress.querySelector('.progress-lab').textContent = progressLabel();
  }

  // ── окно игры ──
  function renderGameWin(withAssets) {
    const frame = h('div.frame.' + st.p.orientation, {}, h('div.empty', {}, 'собираю превью…'));
    st.ui.frame = frame; st.ui.frameAssets = withAssets;
    rebuildFrame(withAssets);

    const doneBtn = h('button.btn.green' + (st.p.proto_done ? '' : '.off'), {
      onclick: async () => {
        await save({ proto_done: !st.p.proto_done });
        render();
        if (st.p.proto_done && st.p.assets_done) startFinal();
      },
    }, st.p.proto_done ? '✓ Завершено' : '✓ Завершить');

    const win = h('div.win' + (st.p.proto_done ? '.done' : ''), {},
      h('h3', {}, h('span', {}, '🎮 Игра (прототип без ассетов)'), doneBtn),
      frame,
      h('div.row', {}, h('button.btn.ghost', { onclick: () => rebuildFrame(withAssets) }, '↻ перезапустить')),
      chatBlock('proto', (t) => sendGameMsg(t, withAssets), 'что поправить в игре, механиках, уровнях…'),
    );
    return win;
  }

  async function rebuildFrame(withAssets) {
    if (!st.ui.frame || !st.config) return;
    try {
      const html = await buildHtml(st.config, withAssets ? assetMap() : null);
      st.ui.frame.innerHTML = '';
      const ifr = document.createElement('iframe');
      ifr.setAttribute('sandbox', 'allow-scripts');
      st.ui.frame.append(ifr);
      ifr.srcdoc = html;
    } catch (e) {
      st.ui.frame.innerHTML = '';
      st.ui.frame.append(h('div.empty', {}, '⚠ ' + e.message));
    }
  }

  // ── окно ассетов ──
  function renderAssetsWin() {
    const grid = h('div.assets');
    st.ui.assetsGrid = grid;
    renderAssets();

    const doneBtn = h('button.btn.green' + (st.p.assets_done ? '' : '.off'), {
      onclick: async () => {
        await save({ assets_done: !st.p.assets_done });
        render();
        if (st.p.proto_done && st.p.assets_done) startFinal();
      },
    }, st.p.assets_done ? '✓ Завершено' : '✓ Завершить');

    return h('div.win' + (st.p.assets_done ? '.done' : ''), {},
      h('h3', {}, h('span', {}, '🎨 Ассеты (PixelLab)'), doneBtn),
      grid,
      chatBlock('assets', sendAssetsMsg, 'что поменять в ассетах: стиль, палитра, детали…'),
    );
  }

  function renderAssets() {
    const grid = st.ui.assetsGrid;
    if (!grid) return;
    grid.innerHTML = '';
    if (!st.assets.length) { grid.append(h('p.hint', {}, 'модель не запросила ассетов')); return; }
    for (const a of st.assets) {
      grid.append(h('div.asset', {},
        a.dataUrl ? h('img', { src: a.dataUrl, alt: a.name }) :
          h('div', { style: 'width:96px;height:96px;display:grid;place-items:center;color:var(--muted)' },
            a.status === 'generating' ? h('span.typing', {}, '') : '⏳'),
        h('span.nm', {}, a.name),
        h('span.st' + (a.status === 'error' ? '.err' : ''), {},
          a.status === 'error' ? (a.error || 'ошибка') : `${a.kind} · ${a.size.w}×${a.size.h}`),
        (a.status === 'done' || a.status === 'error') && h('button.btn.ghost', {
          onclick: () => { delete a.dataUrl; a.status = 'pending'; renderAssets(); runAssetLoop(); },
        }, '↻'),
      ));
    }
  }

  // ── готовая игра ──
  function renderDone() {
    const published = st.p.stage === 'published';
    const frame = h('div.frame.' + st.p.orientation, {}, h('div.empty', {}, 'собираю игру…'));
    st.ui.frame = frame;
    rebuildFrame(true);

    const dl = h('button.btn', { onclick: download }, '⬇ Скачать .html');
    const pub = st.p.target === 'sharky' && !published && h('button.btn.big.primary', {
      onclick: async (e) => {
        const btn = e.currentTarget;
        if (!confirm(`Отправить «${st.p.title}» на модерацию в Sharky?`)) return;
        btn.disabled = true; btn.textContent = 'публикую…';
        try {
          const html = await buildHtml(st.config, assetMap());
          const res = await publishGame({
            project_id: id, html,
            title: st.config.meta?.title || st.p.title,
            description: (st.p.brief?.lore || '').slice(0, 300),
            orientation: st.p.orientation,
            genre: st.p.genre,
            accent: st.config.theme?.accent,
            emoji: GENRES.find(x => x.id === st.p.genre)?.icon,
            score_label: st.config.theme?.labels?.scoreUnit,
          });
          Object.assign(st.p, { stage: 'published', published_game_id: res.game_id });
          toast('Игра ушла на модерацию: ' + res.game_id);
          render();
        } catch (err) {
          toast(err.message, true);
          btn.disabled = false; btn.textContent = '🦈 Опубликовать в Sharky';
        }
      },
    }, '🦈 Опубликовать в Sharky');

    root.append(
      h('div.workgrid', { style: 'grid-template-columns: 1.2fr 1fr' },
        h('div.win', {},
          h('h3', {}, h('span', {}, published ? '🦈 На модерации' : '🏁 Готовая игра')),
          frame,
          h('div.row', {},
            h('button.btn.ghost', { onclick: () => rebuildFrame(true) }, '↻ перезапустить'),
            dl, pub,
            published && h('span.badge.violet', {}, 'id: ' + st.p.published_game_id),
          ),
          published && h('p.hint', {}, 'Игра появится в ленте, когда админ опубликует её в админке Sharky.'),
        ),
        h('div.win', {},
          h('h3', {}, h('span', {}, '💬 Доработка')),
          h('p.hint', { style: 'margin:0' }, 'тот же чат по игре — контекст сохраняется'),
          chatBlock('proto', (t) => sendGameMsg(t, true), 'что исправить или доделать…', true),
        ),
      ),
    );
  }

  async function download() {
    try {
      const html = await buildHtml(st.config, assetMap());
      const name = (st.config.meta?.title || st.p.title).toLowerCase()
        .replace(/[^\wа-яё]+/gi, '-').replace(/^-+|-+$/g, '') || 'game';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      a.download = name + '.html';
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast(e.message, true); }
  }

  // ── чат-блок ──
  function chatBlock(channel, onSend, placeholder, tall = false) {
    const log = h('div.chat' + (tall ? '.tall' : ''));
    const paint = () => {
      log.innerHTML = '';
      for (const m of st.msgs[channel]) log.append(bubble(m));
      log.scrollTop = log.scrollHeight;
    };
    paint();

    const ta = h('textarea', { placeholder });
    const typing = h('div.typing', { style: 'display:none' }, 'думаю');
    const send = h('button.btn.primary', {
      onclick: async () => {
        const text = ta.value.trim();
        if (!text) return;
        ta.value = ''; send.disabled = true; typing.style.display = '';
        try {
          paint(); // покажет user-сообщение после pushMsg внутри onSend? нет — рисуем вручную:
          log.append(bubble({ role: 'user', content: text }));
          log.scrollTop = log.scrollHeight;
          await onSend(text);
        } catch (e) { toast(e.message, true); }
        typing.style.display = 'none'; send.disabled = false;
        paint();
      },
    }, '➤');
    ta.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); }
    });

    return h('div', {}, log, typing, h('div.chatrow', {}, ta, send));
  }

  function bubble(m) {
    if (m.role === 'assistant') {
      let note = null;
      try { note = extractJson(m.content)?.note; } catch { /* обычный текст */ }
      return h('div.msg.assistant', {}, note || (m.content.trim().startsWith('{') ? 'Конфиг обновлён ✓' : m.content));
    }
    const c = m.content;
    if (c.startsWith('Сделай игру по этому брифу')) return h('div.msg.sys', {}, '📋 бриф игры отправлен');
    if (c.startsWith('Ассеты нарисованы')) return h('div.msg.sys', {}, '⚙ запрошена финальная сборка');
    if (c.startsWith('Текущие ассеты:')) return h('div.msg.user', {}, c.split('Замечание пользователя:').pop().trim());
    return h('div.msg.user', {}, c);
  }
}
