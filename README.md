# Sharky Game Engine

Минимальный игровой движок для генерации мини-игр под ленту Sharky.

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
корень — dist/, индекс — match3-medieval.html). Открой `http://localhost:5050/`.
Вне Sharky игра автостартует через 400 мс (флаг `gotShell`).

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

### API ядра (`engine.*`)

`ctx, W, H, headerH, cfg, theme, rules, score` (чтение) ·
`img(name)` · `beep(freq,dur,type,vol)` · `burst(x,y,opts)` ·
`addScore(n)` / `setScore(v)` · `gameOver()` · `rr(x,y,w,h,r)` · `accent()`

## Протокол Sharky (его ведёт ядро, сцена не трогает)

- **Принимает** от оболочки: `{type:'init', accent}`, `{type:'start'}`, `{type:'pause'}`.
- **Шлёт** в оболочку: `{type:'ready'}`, `{type:'score', value}`, `{type:'gameover', value}`.
- Совместимо 1:1 с `Sharky/engine.js` (движок ленты) и заменяет ручные игры
  вроде `ready games/match3-medieval.html`.

Деплой собранного `dist/*.html` — как у остальных игр Sharky (GitHub Pages / Supabase
storage), см. заметку памяти про деплой.
