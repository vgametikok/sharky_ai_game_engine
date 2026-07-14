// Мастер создания игры: тип → жанр → механики → управление → LLM → описание → старт.
import { h, toast, extractJson } from '../ui.js';
import { GENRES, MECHANICS, CONTROLS_PC, CONTROLS_MOBILE } from '../catalog.js';
import { PROVIDERS } from '../config.js';
import { listKeys, createProject } from '../db.js';
import { llm } from '../api.js';
import { titleIdeasMessage } from '../prompts.js';

const STEPS = ['Тип', 'Жанр', 'Механики', 'Управление', 'Нейросеть', 'Описание'];

export default async function wizardView() {
  const keys = await listKeys();
  const hasKey = (id) => keys.some(k => k.provider === id);

  const st = {
    step: 0,
    target: null, orientation: null,
    genre: null, main: null, extra: [],
    pc: null, mobile: null,
    provider: PROVIDERS.find(p => hasKey(p.id))?.id || null,
    title: '', brief: { lore: '', characters: '', style: '' },
  };

  const root = h('div');
  render();
  return root;

  function render() {
    root.innerHTML = '';
    root.append(
      h('div.eyebrow', {}, 'новая игра'),
      h('h1.pagetitle', {}, 'Собираем игру'),
      h('div.steps', {}, STEPS.map((s, i) =>
        h('span.step' + (i === st.step ? '.on' : i < st.step ? '.done' : ''), {}, `${i + 1}. ${s}`))),
      body(),
      h('div.row.spread', { style: 'margin-top:22px' },
        st.step > 0 ? h('button.btn', { onclick: () => { st.step--; render(); } }, '← Назад') : h('span'),
        st.step < STEPS.length - 1
          ? h('button.btn.primary', { disabled: !stepReady(), onclick: () => { st.step++; render(); } }, 'Дальше →')
          : h('button.btn.big.green', { disabled: !stepReady(), onclick: start }, '▶ Начинаем делать игру'),
      ),
    );
  }

  function stepReady() {
    switch (st.step) {
      case 0: return st.target && st.orientation;
      case 1: return !!st.genre;
      case 2: return !!st.main;
      case 3: return st.pc && st.mobile;
      case 4: return !!st.provider;
      case 5: return true; // название/описание проверяет start()
    }
    return false;
  }

  function chipGroup(options, get, set, { multi = false, max = 1 } = {}) {
    const wrap = h('div.chips');
    const redraw = () => {
      wrap.innerHTML = '';
      for (const o of options) {
        const val = o.t || o;
        const cat = o.cat ? '.cat-' + o.cat : '';
        const sel = multi ? get().includes(val) : get() === val;
        wrap.append(h('span.chip' + cat + (sel ? '.on' : ''), {
          onclick: () => {
            if (multi) {
              const cur = get();
              if (cur.includes(val)) set(cur.filter(x => x !== val));
              else if (cur.length < max) set([...cur, val]);
              else { toast(`не больше ${max}`, true); return; }
            } else set(val);
            redraw();
            render(); // обновить доступность «Дальше»
          },
        }, val));
      }
    };
    redraw();
    return wrap;
  }

  function body() {
    switch (st.step) {
      case 0: return h('div.panel', {},
        h('h3', {}, 'Какую игру делаем?'),
        h('p.sub', {}, 'куда пойдёт игра и как держим экран'),
        h('div.grid.g2', {},
          h('div', {},
            h('div.field', {}, h('label', {}, 'Назначение')),
            chipGroup(['Для Шарки', 'Просто HTML-игра'],
              () => st.target === 'sharky' ? 'Для Шарки' : st.target === 'html' ? 'Просто HTML-игра' : null,
              v => st.target = v === 'Для Шарки' ? 'sharky' : 'html'),
          ),
          h('div', {},
            h('div.field', {}, h('label', {}, 'Ориентация')),
            chipGroup(['Вертикальная', 'Горизонтальная'],
              () => st.orientation === 'portrait' ? 'Вертикальная' : st.orientation === 'landscape' ? 'Горизонтальная' : null,
              v => st.orientation = v === 'Вертикальная' ? 'portrait' : 'landscape'),
          ),
        ));

      case 1: return h('div.grid.cards', {}, GENRES.map(g =>
        h('div.card' + (st.genre === g.id ? '.sel' : ''), {
          onclick: () => { if (st.genre !== g.id) { st.main = null; st.extra = []; } st.genre = g.id; render(); },
        }, h('div.ico', {}, g.icon), h('h4', {}, g.name), h('p', {}, g.desc))));

      case 2: {
        const m = MECHANICS[st.genre];
        return h('div.panel', {},
          h('h3', {}, 'Механики'),
          h('p.sub', {}, 'одна основная и до трёх дополнительных из облака возможностей движка'),
          h('div.field', {}, h('label', {}, 'Основная механика')),
          chipGroup(m.main, () => st.main, v => st.main = v),
          h('hr.sep'),
          h('div.field', {}, h('label', {}, `Дополнительные (${st.extra.length}/3)`)),
          chipGroup(m.extra, () => st.extra, v => st.extra = v, { multi: true, max: 3 }),
        );
      }

      case 3: return h('div.grid.g2', {},
        h('div.panel', {},
          h('h3', {}, 'Управление на ПК'),
          h('p.sub', {}, ' '),
          h('div.grid', { style: 'gap:8px' }, CONTROLS_PC.map(c => ctlCard(c, () => st.pc, v => st.pc = v))),
        ),
        h('div.panel', {},
          h('h3', {}, 'Управление на мобилке'),
          h('p.sub', {}, ' '),
          h('div.grid', { style: 'gap:8px' }, CONTROLS_MOBILE.map(c => ctlCard(c, () => st.mobile, v => st.mobile = v))),
        ));

      case 4: return h('div.panel', {},
        h('h3', {}, 'Кто генерирует игру'),
        h('p.sub', {}, 'нужен сохранённый ключ — добавить можно в кабинете'),
        h('div.grid', { style: 'gap:8px' }, PROVIDERS.map(p => {
          const ok = hasKey(p.id);
          return h('div.card' + (st.provider === p.id ? '.sel' : ''), {
            style: ok ? '' : 'opacity:.45',
            onclick: () => { if (!ok) { toast('нет ключа — добавь в кабинете', true); return; } st.provider = p.id; render(); },
          }, h('h4', {}, p.name), h('p', {}, ok ? 'ключ подключён · модель по умолчанию: ' + p.model : 'ключ не задан'));
        })),
        h('p.hint', { style: 'margin-top:10px' }, 'Ассеты рисует PixelLab — его ключ тоже задаётся в кабинете.'),
      );

      case 5: {
        const t = h('input', { type: 'text', placeholder: 'Название игры…' }); t.value = st.title;
        t.addEventListener('input', () => { st.title = t.value; });
        const lore = area('Описание игры: лор, история, цель, что происходит…', st.brief, 'lore');
        const chars = area('Персонажи: кто герой, кто враги, кто встречается…', st.brief, 'characters');
        const style = area('Стиль: палитра, настроение, референсы…', st.brief, 'style');
        const names = h('div.chips', { style: 'margin-top:8px' });
        const suggest = h('button.btn', {
          onclick: async () => {
            if (!st.brief.lore.trim()) { toast('сначала опиши игру', true); return; }
            suggest.disabled = true; suggest.textContent = 'придумываю…';
            try {
              const g = GENRES.find(x => x.id === st.genre);
              const r = await llm({
                provider: st.provider,
                messages: [{ role: 'user', content: titleIdeasMessage(st.brief, g?.name || st.genre) }],
                max_tokens: 300,
              });
              const { names: list } = extractJson(r.text);
              names.innerHTML = '';
              for (const n of list || []) names.append(h('span.chip', {
                onclick: () => { st.title = n; t.value = n; render(); },
              }, n));
            } catch (e) { toast(e.message, true); }
            suggest.disabled = false; suggest.textContent = '✨ Предложи 3 названия';
          },
        }, '✨ Предложи 3 названия');

        return h('div.panel', {},
          h('h3', {}, 'Описание игры'),
          h('p.sub', {}, 'подробный промпт: чем детальнее, тем лучше игра'),
          h('div.field', {}, h('label', {}, 'Лор и история'), lore),
          h('div.field', {}, h('label', {}, 'Персонажи'), chars),
          h('div.field', {}, h('label', {}, 'Стиль'), style),
          h('div.field', {}, h('label', {}, 'Название'), t),
          h('div.row', {}, suggest, names),
        );
      }
    }
  }

  function ctlCard(c, get, set) {
    return h('div.card' + (get() === c.name ? '.sel' : ''), { onclick: () => { set(c.name); render(); } },
      h('h4', {}, c.name), h('p', {}, c.desc));
  }

  function area(ph, obj, key) {
    const a = h('textarea', { placeholder: ph });
    a.value = obj[key];
    a.addEventListener('input', () => obj[key] = a.value);
    return a;
  }

  async function start() {
    if (!st.title.trim()) { toast('нужно название игры', true); return; }
    if (!st.brief.lore.trim()) { toast('опиши игру — это главный промпт', true); return; }
    try {
      const id = await createProject({
        title: st.title.trim(),
        target: st.target,
        orientation: st.orientation,
        genre: st.genre,
        mechanics: { main: st.main, extra: st.extra },
        controls: { pc: st.pc, mobile: st.mobile },
        brief: st.brief,
        provider: st.provider,
        stage: 'generating',
        progress: 10,
      });
      location.hash = '#/project/' + id;
    } catch (e) { toast(e.message, true); }
  }
}
