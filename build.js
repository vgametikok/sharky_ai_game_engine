/* ============================================================
   SHARKY GAME ENGINE — сборщик (build.js)
   ------------------------------------------------------------
   Собирает один самодостаточный .html из трёх частей:
     CONFIG (games/<name>.config.js)  — тема/правила/ассеты игры
   + ядро   (src/core.js)             — универсальный движок
   + сцена  (src/scenes/<genre>.js)   — механика жанра
   и встраивает всё в src/shell.html.

   Игры в Sharky грузятся в sandbox-iframe через srcdoc, поэтому
   итог обязан быть ОДНИМ файлом без внешних зависимостей.

   Использование:
     node build.js <config-name>      # собрать одну игру
     node build.js --all              # собрать все из games/
   Результат: dist/<config-name>.html
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = __dirname;
const arg = process.argv[2];

if (!arg) {
  console.error('Использование: node build.js <config-name> | --all');
  process.exit(1);
}

function listConfigs() {
  return fs.readdirSync(path.join(root, 'games'))
    .filter(f => f.endsWith('.config.js'))
    .map(f => f.replace(/\.config\.js$/, ''));
}

function buildOne(name) {
  const cfgPath = path.join(root, 'games', name + '.config.js');
  if (!fs.existsSync(cfgPath)) { console.error('Нет конфига:', cfgPath); return false; }
  // require кешируется — снимаем кеш на случай повторной сборки в одном процессе
  delete require.cache[require.resolve(cfgPath)];
  const game = require(cfgPath);

  const sceneFile = path.join(root, 'src', 'scenes', game.genre + '.js');
  if (!fs.existsSync(sceneFile)) { console.error('Нет сцены для жанра:', game.genre); return false; }

  const core = fs.readFileSync(path.join(root, 'src', 'core.js'), 'utf8');
  const sceneSrc = fs.readFileSync(sceneFile, 'utf8');
  const shell = fs.readFileSync(path.join(root, 'src', 'shell.html'), 'utf8');
  const title = (game.meta && game.meta.title) || name;
  const cfgJson = JSON.stringify(game);

  // Подстановки через функции-замены, чтобы спецсимволы ($&, $1...) в коде
  // не интерпретировались String.replace как ссылки на группы.
  const out = shell
    .replace('__TITLE__', () => escapeHtml(title))
    .replace('/*__CONFIG__*/', () => 'const CONFIG = ' + cfgJson + ';')
    .replace('/*__CORE__*/', () => core)
    .replace('/*__SCENE__*/', () => sceneSrc);

  fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
  const outPath = path.join(root, 'dist', name + '.html');
  fs.writeFileSync(outPath, out);
  console.log('собрано:', path.relative(root, outPath), '(' + out.length + ' байт)');
  return true;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

let ok = true;
if (arg === '--all') { listConfigs().forEach(n => { ok = buildOne(n) && ok; }); }
else { ok = buildOne(arg); }
process.exit(ok ? 0 : 1);
