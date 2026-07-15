// Вызовы edge-функций мейкера (все требуют Supabase-сессию).
import { supa } from './supa.js';
import { FN, SUPABASE_ANON } from './config.js';

async function callFn(name, payload) {
  const { data: s } = await supa.auth.getSession();
  const token = s?.session?.access_token;
  if (!token) throw new Error('нет сессии — войди заново');
  const r = await fetch(FN(name), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `${name}: HTTP ${r.status}`);
  return data;
}

// {provider, model?, system?, messages, max_tokens?} → {text}
export const llm = (p) => callFn('maker-llm', p);

// {path, method?, body?} → ответ PixelLab как есть
export const pixellab = (p) => callFn('maker-pixellab', p);

// {project_id, html, title, ...} → {game_id, src}
export const publishGame = (p) => callFn('maker-publish', p);

// Обновление опубликованной игры и/или сброс прогресса игроков.
// {game_id, html?, note?, wipe_progress?} → {game_id, version, src, wiped, deleted?, wipe_error?}
export const updateGame = (p) => callFn('game-update', p);
