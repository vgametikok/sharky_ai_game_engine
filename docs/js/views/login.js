import { h, toast } from '../ui.js';
import { signInGoogle, startTelegramLogin } from '../auth.js';

export default async function loginView() {
  const status = h('div.tgwait', { style: 'display:none' });

  const tgBtn = h('button.btn.big', {
    onclick: async () => {
      try {
        tgBtn.disabled = true;
        status.style.display = '';
        status.textContent = 'создаю ссылку входа…';
        const waitText = h('div', { style: 'margin-top:8px' }, 'открой ссылку и нажми Start — вход произойдёт сам');
        const { link, waitDone } = await startTelegramLogin((s) => {
          if (s === 'pending') waitText.textContent = 'жду подтверждения в Telegram…';
        });
        status.innerHTML = '';
        status.append(
          h('a.btn.primary', { href: link, target: '_blank', rel: 'noopener' }, 'Открыть Telegram и нажать Start'),
          waitText,
        );
        await waitDone;
        location.hash = '#/cabinet';
      } catch (e) {
        toast(e.message || String(e), true);
        tgBtn.disabled = false;
        status.style.display = 'none';
      }
    },
  }, '📨 Войти через Telegram');

  return h('div.loginbox', {},
    h('div.eyebrow', {}, 'вход'),
    h('h1.pagetitle', {}, 'Sharky Game Maker'),
    h('p.hint', { style: 'margin-bottom:22px' },
      'Тот же аккаунт, что и в Sharky: войди через Google или Telegram — игры публикуются в этот же профиль.'),
    h('button.btn.big.primary', { onclick: () => signInGoogle().catch(e => toast(e.message, true)) }, '🔑 Войти через Google'),
    tgBtn,
    status,
  );
}
