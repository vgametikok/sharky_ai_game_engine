// Личный кабинет: аккаунт Sharky, ключи API, проекты.
import { h, toast, fmtDate } from '../ui.js';
import { sharkyProfile } from '../auth.js';
import { listKeys, saveKey, deleteKey, listProjects, deleteProject } from '../db.js';
import { GENRES, STAGE_LABELS } from '../catalog.js';
import { PROVIDERS } from '../config.js';

const KEY_PROVIDERS = [
  ...PROVIDERS.map(p => ({ ...p, hasModel: true })),
  { id: 'pixellab', name: 'PixelLab (ассеты)', model: '', hasModel: false },
];

export default async function cabinetView() {
  const [profile, keys, projects] = await Promise.all([sharkyProfile(), listKeys(), listProjects()]);
  const keyMap = Object.fromEntries(keys.map(k => [k.provider, k]));

  // ── аккаунт Sharky ──
  const acc = h('div.panel', {},
    h('h3', {}, 'Аккаунт Sharky'),
    profile
      ? h('div.row', {},
          h('span', { style: 'font-size:30px' }, profile.avatar_emoji || '🎮'),
          h('div', {},
            h('div.mono', {}, profile.display_name + ' '),
            h('div.hint', {}, '@' + profile.username +
              (profile.tgLogin ? ' · вход через Telegram' : '') +
              (profile.role === 'admin' ? ' · админ' : '')),
          ),
          h('span.badge.green', { style: 'margin-left:auto' }, 'активен'),
        )
      : h('div', {},
          h('span.badge.coral', {}, 'профиль не получен'),
          h('p.hint', { style: 'margin-top:8px' },
            'Не удалось получить профиль Sharky (обычно это сбой сети). Обнови страницу — профиль создаётся автоматически для любого входа.'),
        ),
  );

  // ── ключи ──
  const keysPanel = h('div.panel', {},
    h('h3', {}, 'API для генерации'),
    h('p.sub', {}, 'ключи хранятся в базе под RLS и используются только edge-функциями'),
    ...KEY_PROVIDERS.map(p => keyRow(p, keyMap[p.id])),
  );

  // ── проекты ──
  const projList = h('div.grid', { style: 'gap:10px' });
  const renderProjects = (items) => {
    projList.innerHTML = '';
    if (!items.length) {
      projList.append(h('p.hint', {}, 'Пока нет ни одной игры — жми «Новая игра».'));
      return;
    }
    for (const pr of items) {
      const g = GENRES.find(x => x.id === pr.genre);
      const [label, color] = STAGE_LABELS[pr.stage] || [pr.stage, ''];
      projList.append(h('div.proj', { onclick: () => location.hash = '#/project/' + pr.id },
        h('span.ico', {}, g?.icon || '🎮'),
        h('div.t', {},
          h('b', {}, pr.title),
          h('small', {}, (g?.name || pr.genre || '—') + ' · ' +
            (pr.target === 'sharky' ? 'для Sharky' : 'html') + ' · ' + fmtDate(pr.updated_at)),
        ),
        h('span.badge' + (color ? '.' + color : ''), {}, label),
        h('button.btn.ghost.danger', {
          title: 'удалить проект',
          onclick: async (e) => {
            e.stopPropagation();
            if (!confirm(`Удалить проект «${pr.title}» безвозвратно?`)) return;
            await deleteProject(pr.id).catch(err => toast(err.message, true));
            renderProjects(items.filter(x => x.id !== pr.id));
          },
        }, '✕'),
      ));
    }
  };
  renderProjects(projects);

  return h('div', {},
    h('div.eyebrow', {}, 'личный кабинет'),
    h('h1.pagetitle', {}, 'Кабинет'),
    h('div.grid.g2', { style: 'margin-bottom:16px' }, acc, keysPanel),
    h('div.row.spread', { style: 'margin:22px 0 12px' },
      h('h3', { style: 'margin:0; font-family:var(--mono); text-transform:uppercase' }, 'Мои игры'),
      h('a.btn.primary', { href: '#/new' }, '+ Новая игра'),
    ),
    projList,
  );
}

function keyRow(prov, existing) {
  const input = h('input', { type: 'password', placeholder: existing ? 'ключ сохранён — ввести новый…' : 'API-ключ…' });
  const modelInput = prov.hasModel
    ? h('input', { type: 'text', placeholder: 'модель: ' + prov.model })
    : h('span');
  if (existing?.model && prov.hasModel) modelInput.value = existing.model;
  const ok = h('span.ok', {}, existing ? '✓ ' + fmtDate(existing.updated_at) : '');

  const save = h('button.btn', {
    onclick: async () => {
      const val = input.value.trim();
      if (!val) { toast('введи ключ', true); return; }
      try {
        await saveKey(prov.id, val, prov.hasModel ? modelInput.value.trim() : null);
        ok.textContent = '✓ сохранён';
        input.value = '';
        input.placeholder = 'ключ сохранён — ввести новый…';
        toast(prov.name + ': ключ сохранён');
      } catch (e) { toast(e.message, true); }
    },
  }, '💾');
  const del = h('button.btn.ghost.danger', {
    title: 'удалить ключ',
    onclick: async () => {
      if (!confirm('Удалить ключ ' + prov.name + '?')) return;
      try { await deleteKey(prov.id); ok.textContent = ''; toast('ключ удалён'); }
      catch (e) { toast(e.message, true); }
    },
  }, '✕');

  return h('div.keyrow', {},
    h('span.prov', {}, prov.name, h('div', {}, ok)),
    input, modelInput,
    h('div.row', {}, save, del),
  );
}
