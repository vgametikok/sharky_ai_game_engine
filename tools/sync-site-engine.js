/* ============================================================
   SYNC SITE ENGINE — копирует движок внутрь сайта (docs/engine/)
   ------------------------------------------------------------
   Сайт (GitHub Pages из docs/) собирает игры в браузере и кормит
   LLM схемами жанров, поэтому ему нужны:
     docs/engine/src/       core.js + shell.html + scenes/*.js
     docs/engine/schema/    шапка-схема каждой сцены (ведущий /*…*​/)
     docs/engine/examples/  демо-конфиги без тяжёлых base64-строк

   Запуск: node tools/sync-site-engine.js  (после правок движка,
   перед коммитом сайта).
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'docs', 'engine');

function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function copy(from, to) { ensure(path.dirname(to)); fs.copyFileSync(from, to); }

// ── 1. Исходники движка как есть ──
copy(path.join(root, 'src', 'core.js'), path.join(out, 'src', 'core.js'));
copy(path.join(root, 'src', 'shell.html'), path.join(out, 'src', 'shell.html'));
const scenes = fs.readdirSync(path.join(root, 'src', 'scenes')).filter(f => f.endsWith('.js'));
for (const f of scenes) copy(path.join(root, 'src', 'scenes', f), path.join(out, 'src', 'scenes', f));

// ── 2. Схемы: ведущий блок-комментарий каждой сцены ──
ensure(path.join(out, 'schema'));
for (const f of scenes) {
  const src = fs.readFileSync(path.join(root, 'src', 'scenes', f), 'utf8');
  const m = src.match(/^\s*\/\*([\s\S]*?)\*\//);
  const header = m ? m[1].trim() : '(схема не найдена — смотри демо-конфиг)';
  fs.writeFileSync(path.join(out, 'schema', f.replace(/\.js$/, '.txt')), header);
}

// ── 3. Примеры-конфиги без base64 (строки длиннее 300 симв. → "<BASE64>") ──
ensure(path.join(out, 'examples'));
const configs = fs.readdirSync(path.join(root, 'games')).filter(f => f.endsWith('.config.js'));
for (const f of configs) {
  let text = fs.readFileSync(path.join(root, 'games', f), 'utf8');
  text = text
    .replace(/'(?:[^'\\\n]|\\.){300,}'/g, "'<BASE64>'")
    .replace(/"(?:[^"\\\n]|\\.){300,}"/g, '"<BASE64>"');
  fs.writeFileSync(path.join(out, 'examples', f), text);
}

console.log('синк готов: docs/engine/ (' + scenes.length + ' сцен, ' + configs.length + ' примеров)');
