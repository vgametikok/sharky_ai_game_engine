// Системные промпты для генерации игр: контракт движка + схема жанра + демо-примеры.
import { schemaText, exampleText } from './builder.js';

const GENRE_EXAMPLES = {
  match3: ['match3-medieval', 'hungry-kitchen'],
  platformer: ['platformer-demo'],
  shmup: ['shmup-demo'],
  novel: ['novel-demo'],
  hidden: ['hidden-demo'],
  diff: ['diff-demo'],
  puzzle: ['puzzle-demo'],
};

// Дополнительные примеры платформера по выбранной основной механике.
const MAIN_EXTRA = [
  { re: /раннер/i, file: 'runner-demo' },
  { re: /спеланки|пещер/i, file: 'caves-demo' },
  { re: /полосы|subway/i, file: 'lanes-demo' },
  { re: /метроидвани/i, file: 'adventure-demo' },
];

const CONTROLS_DOC = `
СХЕМА CONFIG.controls (слой управления, работает с любым жанром; ПК всегда клавиатура+мышь):
controls: {
  scheme: 'joystick' | 'tapmove' | 'tapaction' | 'aim' | null,   // null = тапы/свайпы по полю
  joystick: { side:'left'|'right'|'any', radius:0.09, deadzone:0.3 },
  tapAction: 'jump',            // для tapaction: одно действие на тап всего экрана
  aim: { fire:'attack' },       // для aim: держишь палец — огонь в его сторону
  buttons: [ { glyph:'▲', action:'jump' }, { glyph:'✕', key:'x' } ]  // экранные кнопки поверх схемы
}
Если выбраны «экранные кнопки» — задай buttons и scheme:null. Если «тапы и свайпы» — controls можно опустить.`;

const OUTPUT_RULES = `
ФОРМАТ ОТВЕТА — СТРОГО один JSON-объект без markdown-ограждений, без комментариев, без текста вокруг:
{"config": { …конфиг игры… }, "assets": [ …список нужных ассетов… ], "note": "1-2 предложения по-русски: что сделал/изменил"}

Правила для "config":
- Это ВАЛИДНЫЙ JSON (двойные кавычки, без функций, без комментариев).
- Обязательно: "genre", "meta":{"title"}, "theme" (accent, bgTop/bgBottom, font, labels).
- НИКАКИХ картинок и base64 в конфиге: поле "assets" конфига НЕ задавай, "anims"/"img"/"bgImage" НЕ задавай.
  Всюду используй цветные плейсхолдеры ("color") — спрайты подключаются позже.
- Конфиг должен быть играбельным сразу: уровни/данные полные, не заглушки.

Правила для "assets" (что нарисует пиксель-арт генератор):
- [{"id":"snake_hero","name":"Герой-змейка","kind":"character|object|tile|background",
   "description":"<детальное ОПИСАНИЕ НА АНГЛИЙСКОМ для pixel-art генератора: вид сбоку/сверху, поза, палитра>",
   "size":{"w":64,"h":64}}]
- Размеры: character/object 32–128, tile 16–64, background 256×144 (горизонт.) или 144×256 (вертик.).
- id — латиницей, snake_case; ровно те имена, на которые потом сошлёмся в конфиге.
- Не больше 10 ассетов, только действительно нужные.

При правках по замечаниям: верни ПОЛНЫЙ обновлённый JSON в том же формате (config целиком, assets целиком).`;

export async function makerSystemPrompt(project) {
  const genre = project.genre;
  const [schema, ...examples] = await Promise.all([
    schemaText(genre),
    ...pickExamples(project).map(n => exampleText(n).catch(() => '')),
  ]);
  const exBlock = examples.filter(Boolean)
    .map((t, i) => `--- ПРИМЕР ${i + 1} (демо-конфиг движка; формат module.exports, но ТЫ отвечаешь чистым JSON) ---\n${t}`)
    .join('\n\n');

  return `Ты — генератор игр для Sharky Game Engine: минимального 2D-движка (canvas, один html).
Игра = CONFIG (данные) + готовое ядро + готовая сцена жанра «${genre}». Ты пишешь ТОЛЬКО CONFIG.
Ядро само даёт: игровой цикл, ввод (клавиатура/мультитач/мышь), звук-бипы, частицы, HUD (счёт+таймер),
экран Game Over, протокол ленты Sharky. Сцена «${genre}» реализует механику — включай её возможности данными.

=== СХЕМА СЦЕНЫ «${genre}» (из исходника движка) ===
${schema}

${CONTROLS_DOC}

=== ДЕМО-ПРИМЕРЫ ===
${exBlock}

${OUTPUT_RULES}`;
}

function pickExamples(project) {
  const list = [...(GENRE_EXAMPLES[project.genre] || [])];
  if (project.genre === 'platformer') {
    const main = project.mechanics?.main || '';
    for (const { re, file } of MAIN_EXTRA) if (re.test(main)) list.push(file);
  }
  return list.slice(0, 3);
}

// Первое сообщение пользователя — бриф из мастера.
export function briefMessage(project) {
  const b = project.brief || {};
  const m = project.mechanics || {};
  const c = project.controls || {};
  return `Сделай игру по этому брифу.

Название: ${project.title}
Тип: ${project.target === 'sharky' ? 'игра для ленты Sharky (мобильная, важен счёт/score)' : 'обычная html-игра'}
Ориентация: ${project.orientation === 'portrait' ? 'вертикальная (портрет)' : 'горизонтальная (ландшафт)'}
Жанр: ${project.genre}
Основная механика: ${m.main || '—'}
Дополнительные механики: ${(m.extra || []).join(', ') || '—'}
Управление на ПК: ${c.pc || '—'}
Управление на мобилке: ${c.mobile || '—'}

Описание игры (лор, история): ${b.lore || '—'}
Персонажи: ${b.characters || '—'}
Стиль и настроение: ${b.style || '—'}`;
}

// Финальная интеграция: вписать готовые ассеты в конфиг (по именам, без base64).
export function finalIntegrationMessage(config, assets) {
  const list = assets.map(a => `- "${a.id}" (${a.kind}, ${a.size?.w}×${a.size?.h}): ${a.name}`).join('\n');
  return `Ассеты нарисованы и будут доступны движку через engine.img(имя) — base64 подставится автоматически.
Обнови конфиг, чтобы игра ИСПОЛЬЗОВАЛА эти ассеты вместо цветных плейсхолдеров:
- фон → "theme":{"bgImage":"<id фона>"} (если есть background);
- тайлы → в legend у тайла "img":"<id>";
- персонажи/объекты → "anims":{"idle":{"imgs":["<id>"],"fps":1}} (или соответствующее поле жанра: иконки тайлов match3 в "assets"-имена через "tileNames", картинки новеллы и т.п. — по схеме сцены);
- ссылайся ТОЛЬКО на эти имена, сами картинки в конфиг НЕ вписывай.

Готовые ассеты:
${list}

Текущий конфиг:
${JSON.stringify(config)}

Ответ — в том же строгом формате {"config":…, "assets":[…], "note":"…"} (assets верни без изменений).`;
}

// Просьба предложить 3 названия по описанию.
export function titleIdeasMessage(brief, genreName) {
  return `Жанр: ${genreName}. Описание игры: ${brief.lore || ''}\nПерсонажи: ${brief.characters || ''}\nСтиль: ${brief.style || ''}

Предложи 3 коротких цепляющих названия для этой игры (можно по-русски или по-английски, до 24 символов).
Ответ строго JSON: {"names":["…","…","…"]}`;
}

// Правка ассет-листа по замечанию из чата ассетов.
export function assetsChatSystem() {
  return `Ты — арт-директор пиксель-арт ассетов для мини-игры. У тебя есть текущий список ассетов
(id, kind, size, description — английский промпт для pixel-art генератора).
Пользователь пишет замечания по-русски. Обнови СПИСОК ассетов: поменяй description/size у затронутых,
добавь/убери ассеты если просят. id менять нельзя (кроме новых).
Ответ строго JSON: {"assets":[ …ПОЛНЫЙ обновлённый список… ], "regenerate":["id1","id2"], "note":"кратко что поменял"}
regenerate — id ассетов, которые надо перерисовать.`;
}

export function assistantSystem() {
  return `Ты — ассистент сервиса Sharky Game Maker (сайт генерации 2D-мини-игр на движке Sharky Game Engine:
ядро + сцены жанров match3/platformer/shmup/novel/hidden/diff/puzzle, игра = конфиг-данные, собирается в один html,
публикуется в ленту Sharky). Помогаешь придумывать игры, лор, механики, отвечаешь на вопросы о движке и сервисе.
Отвечай по-русски, кратко и по делу.`;
}
