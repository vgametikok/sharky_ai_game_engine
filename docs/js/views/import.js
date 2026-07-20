// Импорт игры из готового CONFIG (сгенерирован Claude в Claude Code).
// Полностью БЕЗ обращения к платному LLM-API: движок собирает игру в браузере,
// публикация в Sharky тоже не трогает провайдера. Ассеты/правки в чате — по желанию (ключ).
import { h, toast, extractJson } from '../ui.js';
import { GENRES } from '../catalog.js';
import { createProject } from '../db.js';

const VALID_GENRES = GENRES.map(g => g.id);

export default async function importView() {
  const st = { target: 'sharky', orientation: 'portrait' };
  const root = h('div');

  const titleInp = h('input', { type: 'text', placeholder: 'если пусто — возьму из config.meta.title' });
  const ta = h('textarea', {
    placeholder: 'Вставь сюда CONFIG (JSON), который сгенерировал Claude…',
    style: 'min-height:320px; font-family:var(--mono); font-size:13px; white-space:pre; tab-size:2',
  });

  const createBtn = h('button.btn.big.green', { onclick: create }, '▶ Создать проект');

  root.append(
    h('div.eyebrow', {}, 'импорт'),
    h('h1.pagetitle', {}, 'Создать из CONFIG'),
    h('div.panel', {},
      h('p.sub', {},
        'Опиши игру Claude прямо в Claude Code — он выдаст CONFIG (строгий JSON). Вставь его сюда: ' +
        'игра соберётся твоим движком БЕЗ обращения к платному ИИ-API, и её можно сразу опубликовать в Sharky. ' +
        'Пиксель-ассеты и правки в чате по-прежнему требуют ключ, но играбельная версия — бесплатно.'),
      h('div.grid.g2', { style: 'margin-top:6px' },
        h('div.field', {}, h('label', {}, 'Назначение'),
          chips([['sharky', 'Для Sharky (лента)'], ['html', 'Просто HTML-игра']], st.target, v => st.target = v)),
        h('div.field', {}, h('label', {}, 'Ориентация'),
          chips([['portrait', 'Вертикальная'], ['landscape', 'Горизонтальная']], st.orientation, v => st.orientation = v)),
      ),
      h('div.field', {}, h('label', {}, 'Название'), titleInp),
      h('div.field', {}, h('label', {}, 'CONFIG (JSON)'), ta),
      h('div.row', {}, createBtn, h('a.btn.ghost', { href: '#/cabinet' }, '← В кабинет')),
      h('p.hint', { style: 'margin-top:8px' },
        'Принимаю и чистый config {…}, и полный ответ {"config":…,"assets":…}. Ограждения ``` срезаются автоматически. ' +
        'Жанр должен быть один из: ' + VALID_GENRES.join(', ') + '.'),
    ),
  );
  return root;

  function chips(options, initial, onPick) {
    let cur = initial;
    const wrap = h('div.chips');
    const draw = () => {
      wrap.innerHTML = '';
      for (const [val, label] of options) {
        wrap.append(h('span.chip' + (cur === val ? '.on' : ''), {
          onclick: () => { cur = val; onPick(val); draw(); },
        }, label));
      }
    };
    draw();
    return wrap;
  }

  async function create() {
    let parsed;
    try { parsed = extractJson(ta.value); }
    catch (e) { toast('не удалось прочитать JSON: ' + e.message, true); return; }

    // Принимаем и {config, assets, note}, и голый config.
    const config = (parsed && typeof parsed.config === 'object') ? parsed.config : parsed;
    const assets = Array.isArray(parsed?.assets) ? parsed.assets : [];

    if (!config || typeof config !== 'object' || !config.genre) {
      toast('в конфиге нет поля genre', true); return;
    }
    if (!VALID_GENRES.includes(config.genre)) {
      toast(`жанр «${config.genre}» движку неизвестен (нужен один из: ${VALID_GENRES.join(', ')})`, true); return;
    }

    const title = (titleInp.value.trim() || config.meta?.title || 'Без названия').slice(0, 80);
    createBtn.disabled = true; createBtn.textContent = 'создаю…';
    try {
      const id = await createProject({
        title,
        target: st.target,
        orientation: st.orientation,
        genre: config.genre,
        brief: { lore: '', characters: '', style: '' },
        config: JSON.stringify(config),
        assets,
        stage: 'done',
        progress: 100,
      });
      toast('Проект создан из CONFIG ✓');
      location.hash = '#/project/' + id;
    } catch (e) {
      toast(e.message, true);
      createBtn.disabled = false; createBtn.textContent = '▶ Создать проект';
    }
  }
}
