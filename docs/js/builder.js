// Сборка игры в браузере — порт build.js: shell + CONFIG + core + сцена → один html.
const cache = new Map();
function txt(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(path).then(r => {
      if (!r.ok) throw new Error('не найден ' + path);
      return r.text();
    }));
  }
  return cache.get(path);
}

function escHtml(s) {
  return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// config — объект конфига; extraAssets — {имя: dataURL} для финальной сборки.
export async function buildHtml(config, extraAssets) {
  const genre = config?.genre;
  if (!genre) throw new Error('в конфиге нет genre');
  const [shell, core, scene] = await Promise.all([
    txt('engine/src/shell.html'),
    txt('engine/src/core.js'),
    txt(`engine/src/scenes/${genre}.js`),
  ]);
  const cfg = JSON.parse(JSON.stringify(config));
  if (extraAssets && Object.keys(extraAssets).length) {
    cfg.assets = Object.assign({}, cfg.assets || {}, extraAssets);
  }
  const title = (cfg.meta && cfg.meta.title) || 'Игра';
  // замены функциями — чтобы $-последовательности в коде не ломали String.replace
  return shell
    .replace('__TITLE__', () => escHtml(title))
    .replace('/*__CONFIG__*/', () => 'const CONFIG = ' + JSON.stringify(cfg) + ';')
    .replace('/*__CORE__*/', () => core)
    .replace('/*__SCENE__*/', () => scene);
}

export async function schemaText(genre) { return txt(`engine/schema/${genre}.txt`); }
export async function exampleText(name) { return txt(`engine/examples/${name}.config.js`); }
