import { h, toast } from '../ui.js';
import { supa } from '../supa.js';
import { signInGoogle, startTelegramLogin, signOut, sharkyProfile } from '../auth.js';

export default async function loginView() {
  const status = h('div.tgwait', { style: 'display:none' });

  // ── «Войти через Sharky»: оба сайта живут на одном origin (vgametikok.github.io)
  // и одном Supabase, поэтому сессия Sharky уже лежит в localStorage браузера.
  // Показываем её явно — вход в Maker одним кликом, без нового OAuth.
  let sharkyPanel = null;
  try {
    const { data: s } = await supa.auth.getSession();
    if (s?.session) {
      const p = await sharkyProfile().catch(() => null);
      const who = p ? (p.display_name || '') + ' (@' + p.username + ')'
                    : (s.session.user?.email || 'аккаунт Sharky');
      sharkyPanel = h('div.panel', { style: 'margin-bottom:18px; text-align:center' },
        h('p.hint', { style: 'margin-bottom:10px' }, 'В этом браузере уже выполнен вход Sharky:'),
        h('button.btn.big.primary', { onclick: () => { location.hash = '#/cabinet'; } },
          '🦈 Продолжить как ' + who),
        h('p', { style: 'margin-top:10px' },
          h('a.hint', { href: '#', onclick: async (e) => {
            e.preventDefault();
            await signOut();          // общий выход: разлогинит и сайт Sharky в этом браузере
            location.reload();
          } }, 'это не я — выйти и войти иначе'),
        ),
      );
    }
  } catch { /* нет сессии — просто не показываем панель */ }

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
      'Тот же аккаунт, что и в Sharky: Google, Telegram или уже открытая сессия Sharky — игры публикуются в этот же профиль.'),
    sharkyPanel || h('span'),
    h('button.btn.big' + (sharkyPanel ? '' : '.primary'), { onclick: () => signInGoogle().catch(e => toast(e.message, true)) }, '🔑 Войти через Google'),
    tgBtn,
    status,
  );
}
