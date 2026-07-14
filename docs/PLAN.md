# Sharky Game Maker — сайт-сервис генерации игр

Сайт живёт в этом же репозитории (папка `docs/`; GitHub Pages публикует ветку `main`
с корня, корневой `index.html` мгновенно редиректит в `docs/`) и превращает движок в сервис:
мастер выбора → LLM генерирует CONFIG → PixelLab генерирует ассеты → сборка одного `.html`
прямо в браузере → скачивание или публикация в Sharky.

URL: `https://vgametikok.github.io/sharky_ai_game_engine/` (→ `…/docs/`)

## Архитектура

- **Фронт** — SPA без сборки: `docs/index.html` + ES-модули (`docs/js/*`), hash-роутер
  (`#/cabinet`, `#/new`, `#/project/<id>`, `#/chat`). Стиль — тёмный HUD в духе атласа движка.
- **Supabase** — ТОТ ЖЕ проект, что у Sharky (`safjqsofdrxdmvnfgvjf`): один вход = один аккаунт,
  публикация «в этот же аккаунт» тривиальна.
- **Ключи API пользователя** (Claude / Grok / Gemini / PixelLab) лежат в таблице `maker_keys`
  под RLS; фронт их не использует напрямую — все вызовы идут через edge-функции-прокси.
- **Движок в браузере**: `tools/sync-site-engine.js` копирует `src/` и демо-конфиги в
  `docs/engine/`; `docs/js/builder.js` повторяет `build.js` (shell + CONFIG + core + сцена →
  один html) на клиенте. Предпросмотр — sandbox-iframe через `srcdoc`, как в ленте Sharky.

## Аутентификация (как в Sharky)

- **Google**: `supabase.auth.signInWithOAuth({provider:'google'})` с redirect на сайт.
- **Telegram**: deep-link бота без телефона — `tg-login` (`action:new` → t.me-ссылка,
  поллинг `action:check`) → `tg-auth` (`mode:'logintoken'`) → `token_hash` →
  `supabase.auth.verifyOtp({type:'email', token_hash})`.
- Аккаунт Sharky = строка `public.users` с `auth_uid = auth.uid()`; ЛК показывает,
  найден ли такой аккаунт (и какой), — публикация уходит от его имени
  (`games.author_id = users.username`).

## Таблицы (миграция `maker_service_init`)

- `maker_keys(user_id, provider, api_key, model, updated_at)` — PK (user_id, provider),
  provider ∈ claude|grok|gemini|pixellab. RLS: только свои.
- `maker_projects(id, user_id, title, target sharky|html, orientation, genre,
  mechanics jsonb, controls jsonb, brief jsonb, stage, progress, provider,
  config text, assets jsonb, proto_done, assets_done, published_game_id, …)` —
  стадии: `wizard → generating → review → final → done → published`. RLS: только свои.
- `maker_messages(id, user_id, project_id null=общий чат, channel proto|assets|final|assistant,
  role, content, created_at)` — история всех чатов. RLS: только свои.

## Edge-функции (verify_jwt = true)

- **maker-llm** `{provider, model?, system?, messages, max_tokens?}` → берёт ключ юзера из
  `maker_keys` (service role), зовёт Anthropic / x.ai / Gemini, возвращает `{text}`.
  Дефолтные модели: `claude-sonnet-5`, `grok-4`, `gemini-2.5-pro`.
- **maker-pixellab** `{path, method?, body?}` → прокси на `https://api.pixellab.ai/<path>`
  с Bearer-ключом юзера. MVP-эндпоинт: `generate-image-pixflux` (текст → пиксель-арт).
- **maker-publish** `{project_id, html, meta}` → кладёт html в Storage-бакет `games`
  (`<slug>.html`), вставляет строку в `public.games` со `status='draft'`
  (= на модерации; админ публикует в админке Sharky), `src` = публичный URL.

## Пайплайн генерации (страница `#/project/<id>`)

1. **Мастер** (`#/new`): Шарки/просто HTML + вертикаль/горизонталь → жанр (7 сцен) →
   1 основная + до 3 доп. механик (облака в `js/catalog.js` для всех жанров) →
   управление ПК и мобилка → описание (лор, персонажи, стиль) + название
   (после описания LLM предлагает 3 варианта) → «Начинаем делать игру».
2. **Генерация**: прогресс-бар (стадии: конфиг 0–40%, ассеты 40–80%, финал 80–100%).
   - **Окно 1 — игра без ассетов**: системный промпт жанра (`js/prompts.js`: контракт движка +
     схема конфига + демо-конфиг как пример) → LLM выдаёт CONFIG с цветными плейсхолдерами →
     сборка в браузере → iframe. Чат правок: сообщение → LLM возвращает обновлённый CONFIG.
   - **Окно 2 — ассеты**: список нужных ассетов из CONFIG → PixelLab генерирует спрайты/тайлы
     (без анимации) → превью. Чат правок: регенерация по замечаниям.
   - Обе зелёные кнопки «✓ Завершить» нажаты → финальная сборка: ассеты вшиваются
     base64 в CONFIG → итоговый html.
3. **Готовая игра**: играем в iframe; чат доработок (продолжение контекста) → правки CONFIG;
   затем «Скачать .html» или «Опубликовать в Sharky» (модерация).

## Структура файлов сайта

```
docs/
  index.html        SPA-каркас
  app.css           стиль (тёмный HUD)
  js/
    config.js       URL/anon key Supabase, адреса функций
    supa.js         supabase-js v2 (esm.sh) + клиент
    auth.js         Google OAuth + TG deep-link
    api.js          вызовы maker-llm / maker-pixellab / maker-publish
    ui.js           DOM-хелперы, тосты
    catalog.js      жанры, облака механик, схемы управления (данные мастера)
    prompts.js      системные промпты по жанрам
    builder.js      сборка html в браузере (порт build.js)
    main.js         роутер и загрузка вью
    views/          login, cabinet, wizard, project, chat
  engine/           синк из src/ + демо-конфиги (tools/sync-site-engine.js)
```

## Деплой

1. `node tools/sync-site-engine.js` (после правок движка).
2. Коммит и push в `main`.
3. Pages настроены: Deploy from branch → `main` / root; корневые `index.html` (редирект
   в `docs/`) и `.nojekyll` лежат в репозитории.

Секретов на фронте нет: anon key публичный, ключи LLM — только в БД + edge-функциях.
