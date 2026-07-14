// Мини-хелперы DOM: h('div.card', {onclick}, ...children), esc, toast.
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function h(sel, attrs = {}, ...children) {
  const [tag, ...classes] = sel.split('.');
  const el = document.createElement(tag || 'div');
  if (classes.length) el.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k in el && k !== 'style' && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(9)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(c));
  }
  return el;
}

export function toast(msg, isErr = false) {
  const t = h('div.toast' + (isErr ? '.err' : ''), {}, msg);
  document.getElementById('toasts').append(t);
  setTimeout(() => t.remove(), isErr ? 6000 : 3200);
}

export function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Достаёт JSON-объект из ответа LLM: срезает ```-ограждения и болтовню вокруг.
export function extractJson(text) {
  let t = String(text || '').trim();
  const fence = t.match(/```(?:json|js)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  if (start === -1) throw new Error('в ответе нет JSON');
  // Ищем сбалансированную закрывающую скобку с учётом строк.
  let depth = 0, inStr = false, escNext = false, quote = '';
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (escNext) { escNext = false; continue; }
    if (inStr) {
      if (c === '\\') escNext = true;
      else if (c === quote) inStr = false;
      continue;
    }
    if (c === '"' || c === "'") { inStr = true; quote = c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (!depth) return JSON.parse(t.slice(start, i + 1)); }
  }
  throw new Error('JSON в ответе не закрыт');
}
