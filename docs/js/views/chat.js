// Отдельная вкладка-чат с ассистентом (история — maker_messages, project_id = null).
import { h, toast } from '../ui.js';
import { listMessages, addMessage, listKeys } from '../db.js';
import { llm } from '../api.js';
import { assistantSystem } from '../prompts.js';
import { PROVIDERS } from '../config.js';

export default async function chatView() {
  const [msgs, keys] = await Promise.all([listMessages(null, 'assistant'), listKeys()]);
  const hasKey = (id) => keys.some(k => k.provider === id);
  let provider = localStorage.getItem('maker_provider');
  if (!provider || !hasKey(provider)) provider = PROVIDERS.find(p => hasKey(p.id))?.id || 'claude';

  const sel = h('select', {},
    PROVIDERS.map(p => {
      const o = h('option', { value: p.id }, p.name + (hasKey(p.id) ? '' : ' (нет ключа)'));
      if (p.id === provider) o.selected = true;
      return o;
    }));
  sel.addEventListener('change', () => { provider = sel.value; localStorage.setItem('maker_provider', provider); });

  const log = h('div.chat.tall');
  const paint = () => {
    log.innerHTML = '';
    if (!msgs.length) log.append(h('div.msg.sys', {}, 'обсуди идеи игр, движок или сервис — история сохраняется'));
    for (const m of msgs) log.append(h('div.msg.' + (m.role === 'user' ? 'user' : 'assistant'), {}, m.content));
    log.scrollTop = log.scrollHeight;
  };
  paint();

  const ta = h('textarea', { placeholder: 'напиши что-нибудь…' });
  const typing = h('div.typing', { style: 'display:none' }, 'думаю');
  const send = h('button.btn.primary', {
    onclick: async () => {
      const text = ta.value.trim();
      if (!text) return;
      if (!hasKey(provider)) { toast('нет ключа ' + provider + ' — добавь в кабинете', true); return; }
      ta.value = ''; send.disabled = true; typing.style.display = '';
      try {
        msgs.push({ role: 'user', content: text }); paint();
        await addMessage(null, 'assistant', 'user', text);
        const history = msgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
        const r = await llm({ provider, system: assistantSystem(), messages: history, max_tokens: 4000 });
        msgs.push({ role: 'assistant', content: r.text });
        await addMessage(null, 'assistant', 'assistant', r.text);
      } catch (e) { toast(e.message, true); }
      typing.style.display = 'none'; send.disabled = false; paint();
    },
  }, '➤');
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); }
  });

  return h('div', {},
    h('div.eyebrow', {}, 'чат'),
    h('div.row.spread', {}, h('h1.pagetitle', {}, 'Чат с ассистентом'), sel),
    h('div.panel', {}, log, typing, h('div.chatrow', { style: 'margin-top:10px' }, ta, send)),
  );
}
