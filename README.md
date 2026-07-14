# Sharky Game Engine

Минимальный игровой движок для генерации мини-игр под ленту Sharky.

## Сайт: Sharky Game Maker (docs/)

Сервис генерации игр на этом движке — SPA в `docs/`, хостится GitHub Pages
(`main` / каталог `/docs`): `https://vgametikok.github.io/sharky_ai_game_engine/`.
Мастер выбора (тип/жанр/механики/управление/описание) → LLM (Claude/Grok/Gemini)
пишет CONFIG → PixelLab рисует ассеты → сборка одного `.html` прямо в браузере →
скачивание или публикация в Sharky (на модерацию). Архитектура — `docs/PLAN.md`.

- После правок движка: `node tools/sync-site-engine.js` (копирует src/ и примеры в `docs/engine/`).
- Локальный предпросмотр сайта: launch-профиль `maker` (`node tools/serve-site.js`, порт 5070).

**Идея.** Все игровые механики живут в движке (ядро + модули-сцены по жанрам).
Конкретная игра = маленький **CONFIG** (картинки, цвета, числа, тексты). Генерация
новой игры меняет только CONFIG — это дёшево и не требует переписывать механику.

## Ключевое ограничение Sharky

Игра доставляется в ленту как **один самодостаточный `.html`**: оболочка грузит её
в sandbox-iframe (без `allow-same-origin`) через `srcdoc`. Поэтому внешние
`<script src>` и относительные ассеты не работают — **всё инлайнится в один файл**,
картинки вшиваются в base64. Сборщик (`build.js`) собирает такой файл из частей.

## Структура

```
game-engine/
  src/
    core.js            универсальное ядро (loop, ввод, звук, частицы, HUD,
                       таймер, экран Game Over, протокол Sharky). НЕ зависит от жанра.
    scenes/
      match3.js        механика «три в ряд» (первый модуль)
    shell.html         HTML-каркас с плейсхолдерами для сборки
  games/
    <name>.config.js   КОНФИГ игры: module.exports = { genre, meta, theme, rules, ... , assets }
  dist/
    <name>.html        ← СОБРАННАЯ игра (этот файл уходит в Sharky)
  tools/
    serve.js                статический сервер для предпросмотра dist/
    extract-match3-config.js бутстрап: вытащил ассеты из ready games/match3-medieval.html
  build.js             сборщик: CONFIG + core + scene -> dist/<name>.html
```

## Сборка и предпросмотр

```powershell
cd D:\Sharky\game-engine
node build.js match3-medieval     # собрать одну игру -> dist/match3-medieval.html
node build.js --all               # собрать все конфиги из games/
```

Предпросмотр: запущен `launch.json`-профиль **game-engine** (node tools/serve.js на :5050,
корень — dist/, индекс — match3-medieval.html). Открой `http://localhost:5050/` или
конкретную игру — `http://localhost:5050/<name>.html`.
Вне Sharky игра автостартует через 400 мс (флаг `gotShell`).

Текущие игры:
- `match3-medieval` — классический match-3 (первая, эталон механики).
- `hungry-kitchen` — режим цель/раунды: собери 12 шт. блюда-задания за 60 c, пройди уровень,
  получи новый набор еды и новую цель. Поле 7×7, доска-подложка, фон-кухня.
  Ассеты пакуются `tools/pack-kitchen-config.ps1` → `games/hungry-kitchen.assets.js`,
  подписи/правила — в `games/hungry-kitchen.config.js`.
- `platformer-demo` — платформер: 2 уровня, враги, NPC, меч+лук, ключ/дверь,
  способность «двойной прыжок», босс с фазами на 2-м уровне.
- `runner-demo` — бесконечный раннер из чанков (автобег, тап = прыжок, счёт-дистанция).
- `caves-demo` — спеланки-лайт: уровень генерируется из комнат с гарантированным путём;
  соулслайк-примесь (стамина, перекат с i-frames, лечащий чекпоинт).
- `shark-commando` — **витрина движка**: платформер-шутер с PixelLab-спрайтами
  (акула-коммандо против Крабьего Синдиката). Бластер одиночными; мимо пролетают
  капсулы-бонусы (`platformer.bonusSpawner`) с ВРЕМЕННЫМ супер-оружием: ТРИЗУБ
  (веер `count/spread`), ШКВАЛ (автоогонь `auto`), ГАРПУН-X (пробитие `pierce`).
  2 босса (мини-босс Клешень + Краб-Барон с 3 фазами). Спрайты сгенерированы в
  одном направлении (восток) — движок зеркалит через `facing`; упаковка кадров:
  `tools/pack-commando-assets.ps1` (единый union-bbox кроп на персонажа).

### Скриншоты в скрытой вкладке предпросмотра
`requestAnimationFrame` не тикает в скрытой панели — обычный скриншот-инструмент
может таймаутить, а канвас пустует. Обход: `Engine.renderOnce()` рисует один кадр
принудительно, а `tools/serve.js` принимает `POST /shot?name=x` с dataURL канваса
и сохраняет `dist/shots/x.png`:
```js
Engine.renderOnce();
fetch('/shot?name=x', { method:'POST', body: document.getElementById('c').toDataURL('image/png') });
```

## Как сгенерировать новую игру того же жанра (дёшево)

1. Скопируй `games/match3-medieval.config.js` → `games/<новое-имя>.config.js`.
2. Поменяй в нём только данные:
   - `meta.title`
   - `theme` — `accent`, `bgTop`/`bgBottom`, `hudText`, `font`, `hudIcon`, `labels`
   - `rules` — `duration`, `cols`, `rows`, `minRun`, `clearDur`, `scorePerTile`
   - `tileNames` + `assets` — набор тайлов (имена и их base64-картинки)
3. `node build.js <новое-имя>` → `dist/<новое-имя>.html`.

Код движка при этом не трогается.

## Как добавить новый жанр

1. Создай `src/scenes/<genre>.js` и зарегистрируй сцену:
   ```js
   Engine.register('<genre>', function (engine, cfg) {
     return { init, reset, layout, update, render, pointerDown, pointerUp, key /* ... */ };
   });
   ```
2. Заведи конфиг с `genre: '<genre>'`.
3. `node build.js <name>`.

### Контракт сцены

Сцена реализует (все методы кроме `update`/`render` опциональны):

| метод | когда вызывается |
|---|---|
| `init()` | один раз после загрузки ассетов и первого layout |
| `reset()` | на каждый (пере)запуск забега — собрать игровое состояние |
| `layout(L)` | при ресайзе; `L = {W, H, headerH}` |
| `update(dt)` | каждый кадр (только в фазе игры; таймер ведёт ядро) |
| `render(ctx)` | каждый кадр — рисует ТОЛЬКО поле (фон/HUD/оверлей рисует ядро) |
| `pointerDown(p)` | `p = {x, y}` в пикселях canvas |
| `pointerUp(e)` | `e = {x, y, downX, downY, dx, dy, dist, dir}` |
| `pointerMove(p)` | `p = {x, y}` |
| `key(k)` | `k = event.key` |
| `hud(ctx)` | если определён — рисует СВОЙ HUD вместо стандартного (счёт+таймер) |

### API ядра (`engine.*`)

`ctx, W, H, headerH, cfg, theme, rules, score, timeLeft, duration` (чтение) ·
`img(name)` · `beep(freq,dur,type,vol)` · `burst(x,y,opts)` ·
`addScore(n)` / `setScore(v)` · `gameOver()` · `resetTimer(sec?)` (сброс таймера раунда) ·
`rr(x,y,w,h,r)` · `accent()`

Отладка/тесты (не для прода-логики): `Engine.debug()` — состояние ядра; `Engine._scene` —
текущая сцена; у match3 есть `scene._state()` — снимок поля/счётчиков, чтобы гонять
логику вручную через `update(dt)` без `requestAnimationFrame`.

### Темы и ассеты

- `theme.bgImage` — имя ассета-фона: рисуется по ширине экрана, верх закреплён, низ обрезается.
- `theme.hudIcon`, `theme.hudText`, `theme.accent`, `theme.bgTop/bgBottom`, `theme.font`, `theme.labels`.
- Ассеты в `assets` — либо «сырой» base64 (тогда считается PNG), либо готовый data-URL
  (`data:image/webp;base64,…` / jpeg / png) — для не-PNG форматов.
- Тяжёлые картинки удобно паковать скриптом (см. `tools/pack-kitchen-config.ps1`:
  ужимает иконки до 128px, фон/доску берёт как есть, кладёт в `*.assets.js`).

### Режимы сцены match3

- **Классика**: очки за совпадения; `rules.scorePerTile`, фиксированный `tileNames`.
- **Цель/раунды** (если задан `rules.goal`): собрать `goal` штук тайла-задания за раунд
  (таймер). Собрал — новый раунд: новый набор еды (`rules.pool` + `rules.typeCount`),
  новая цель, таймер сброшен; счёт = число раундов. `rules.boardImage` — картинка-подложка
  поля. HUD кастомный (иконка цели + прогресс + таймер + уровень). Пример: `hungry-kitchen`.

## Слой управления (CONFIG.controls, работает с любым жанром)

Схемы транслируются в виртуальные клавиши — сцены не меняются. ПК всегда:
клавиатура + мышь (мышь = те же указатели: в aim-схеме зажал ЛКМ — стреляешь
в сторону курсора).

```js
controls: {
  scheme: 'joystick' | 'tapmove' | 'tapaction' | 'aim' | null,
  joystick: { side:'left'|'right'|'any', radius:0.09, deadzone:0.3 },
  tapAction: 'jump',                    // tapaction: одно действие на тап экрана
  aim: { fire:'attack' },               // aim: держишь палец — огонь в его сторону (точный угол)
  buttons: [                            // программируемые кнопки (везде, поверх схемы)
    { glyph:'▲', action:'jump' },       // action-алиас…
    { glyph:'✕', key:'x' },             // …или прямая клавиша
    { glyph:'◀', key:'ArrowLeft', x:0.09, y:0.88, r:0.06 },  // свои позиция/размер
  ],
}
```

- **joystick** — зажми в зоне и веди: 8-way клавиши + `engine.ctl.axis` для плавности.
- **tapmove** — куда нажал, туда идёт (сцена сообщает позицию героя через
  `engine.reportPlayerScreen`).
- **tapaction** — весь экран = одна кнопка (прыжок раннера и т.п.).
- **aim** — выстрелы в сторону касания; платформер стреляет точным углом.
- Кнопки без x/y раскладываются автоматически справа снизу. Рисует всё ядро.
Демо: `ctl-joystick-demo`, `ctl-tapmove-demo`, `ctl-aim-demo`, `ctl-tapaction-demo`.

## Другие жанры-сцены

- **shmup** — вертикальный шмап: волны с лупом сложности, апгрейды оружия (P),
  бомба очистки экрана, поляризация Ikaruga, микрохитбокс + грейз Touhou. Демо: `shmup-demo`.
- **novel** — визуальная новелла: ветвящиеся диалоги, очки симпатии (`needAff`),
  флаги сюжета (`need/needNot`), несколько концовок, NG+ (флаги переносятся,
  открывают ветки `need:'ng+'`), галерея CG и журнал реплик. Демо: `novel-demo`.
- **hidden** — поиск предметов: цели на сцене (или процедурный «хлам»), таймер,
  подсказки с лимитом, комбинирование находок по рецептам. Демо: `hidden-demo`.
- **diff** — «найди отличия»: две процедурные сцены, K отличий, тап по любой
  половине, штраф времени за промах, раунды. Демо: `diff-demo`.
- **puzzle** — сокобан: свайпы/стрелки, толкание ящиков на цели, undo,
  опциональный лимит ходов, серия уровней. Демо: `puzzle-demo`.

## Сцена platformer — 2D-платформеры данными

Всё задаётся в `CONFIG.platformer` (полная схема — в шапке `src/scenes/platformer.js`);
код сцены один на все игры: марио-стиль, метроидвания, соулслайк, спеланки, раннер.

- **Уровни — ASCII-строки + легенда**: символ → тайл (`solid`, `oneWay`, `ladder`,
  `hazard`, `door`) или сущность (`player/exit/checkpoint/pickup/enemy/npc/platform`).
- **Три режима**: `mode:'levels'` (список карт, выход → следующая),
  `mode:'runner'` (бесконечная лента из чанков `runner.chunks`, автобег, счёт-дистанция),
  `mode:'caves'` (генерация из комнат `generator.rooms` {LR,LRD,LRU,LRUD,X} сеткой
  с гарантированным путём сверху вниз — спеланки-лайт).
- **Игрок**: coyote time, jump buffer, переменная высота прыжка; способности-гейты
  `abilities:{doubleJump,wallJump,dash}` (метроидвания: открываются пикапами
  `{pickup:'ability'}`), перекат с i-frames (`dashIFrames`), стамина (соулслайк:
  `stamina:{max,regen,attackCost,dashCost}`), жизни, чекпоинты (`checkpointHeal`),
  респаун врагов после смерти (`respawnEnemies`).
- **Оружие** (`weapons`): `type:'melee'` (хитбокс по направлению, откидывание) и
  `type:'ranged'` (снаряды); переключение; выдача через `{pickup:'weapon'}`.
- **Враги** (`enemies`): `ai: patrol | chase | fly | shooter | jumper | turret`,
  stomp по-мариовски (`stompable`), дропы, очки.
- **Боссы**: `boss:{name, phases:[{hpPct,attacks,cooldown,speedMul}], onDeath}`,
  атаки-паттерны `charge/aimed/spread/slam/summon`, полоса HP, выход заперт до победы
  (у exit-тайла `needsBossDead:false` отключает гейт).
- **NPC** (`npcs`): реплики в пузыре при приближении.
- **Анимации**: `anims:{idle:{imgs:[...],fps}}` или спрайт-лист `{img,fw,fh,frames}`;
  без спрайтов — цветные плейсхолдеры (`color`) — удобно для прототипов.
- **Прочее**: движущиеся платформы (переносят игрока), параллакс `bgLayers`,
  тряска камеры, тач-кнопки (мультитач) + клавиатура, звуковые пресеты.

Отладка: `scene._state()` (снимок мира), `_press/_release` (виртуальные кнопки),
`_teleport(x,y)`, `_cheat({inv,hp})` — детерминированные прогоны без rAF.

## Протокол Sharky (его ведёт ядро, сцена не трогает)

- **Принимает** от оболочки: `{type:'init', accent}`, `{type:'start'}`, `{type:'pause'}`.
- **Шлёт** в оболочку: `{type:'ready'}`, `{type:'score', value}`, `{type:'gameover', value}`.
- Совместимо 1:1 с `Sharky/engine.js` (движок ленты) и заменяет ручные игры
  вроде `ready games/match3-medieval.html`.

Деплой собранного `dist/*.html` — как у остальных игр Sharky (GitHub Pages / Supabase
storage), см. заметку памяти про деплой.
