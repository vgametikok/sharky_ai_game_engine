// CRUD по таблицам maker_* (RLS: только свои строки).
import { supa, uid } from './supa.js';

function throwIf(error) { if (error) throw new Error(error.message); }

// ── ключи API ──
export async function listKeys() {
  const { data, error } = await supa.from('maker_keys').select('provider, model, updated_at');
  throwIf(error);
  return data || [];
}
export async function saveKey(provider, apiKey, model) {
  const user_id = await uid();
  const { error } = await supa.from('maker_keys')
    .upsert({ user_id, provider, api_key: apiKey, model: model || null, updated_at: new Date().toISOString() });
  throwIf(error);
}
export async function deleteKey(provider) {
  const { error } = await supa.from('maker_keys').delete().eq('provider', provider);
  throwIf(error);
}

// ── проекты ──
export async function listProjects() {
  const { data, error } = await supa.from('maker_projects')
    .select('id, title, target, orientation, genre, stage, progress, updated_at, published_game_id')
    .order('updated_at', { ascending: false });
  throwIf(error);
  return data || [];
}
export async function getProject(id) {
  const { data, error } = await supa.from('maker_projects').select('*').eq('id', id).maybeSingle();
  throwIf(error);
  return data;
}
export async function createProject(fields) {
  const user_id = await uid();
  const { data, error } = await supa.from('maker_projects')
    .insert({ ...fields, user_id }).select('id').single();
  throwIf(error);
  return data.id;
}
export async function updateProject(id, patch) {
  const { error } = await supa.from('maker_projects').update(patch).eq('id', id);
  throwIf(error);
}
export async function deleteProject(id) {
  const { error } = await supa.from('maker_projects').delete().eq('id', id);
  throwIf(error);
}

// ── сообщения чатов ──
export async function listMessages(projectId, channel) {
  let q = supa.from('maker_messages').select('id, role, content, created_at')
    .eq('channel', channel).order('id', { ascending: true });
  q = projectId ? q.eq('project_id', projectId) : q.is('project_id', null);
  const { data, error } = await q;
  throwIf(error);
  return data || [];
}
export async function addMessage(projectId, channel, role, content) {
  const user_id = await uid();
  const { error } = await supa.from('maker_messages')
    .insert({ user_id, project_id: projectId, channel, role, content });
  throwIf(error);
}
