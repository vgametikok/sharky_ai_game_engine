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

  // ── Telegram: как на сайте Sharky — клик сразу открывает Telegram,
  // кнопка ждёт подтверждения. Запасной путь (код для бота) показываем
  // ТОЛЬКО если подтверждение не пришло быстро: часть клиентов TG
  // (особенно Telegram Web) молча теряет start-параметр у старого чата.
  const TG_LABEL = '📨 Войти через Telegram';
  const tgBtn = h('button.btn.big', {
    onclick: async () => {
      try {
        tgBtn.disabled = true;
        tgBtn.textContent = 'Подтвердите вход в Telegram…';
        const { link, token, waitDone } = await startTelegramLogin();
        window.open(link, '_blank', 'noopener');
        const code = 'lg_' + token;
        const slow = setTimeout(() => {
          status.style.display = '';
          status.innerHTML = '';
          status.append(
            h('div.hint', {}, 'не сработало? открой ',
              h('a', { href: link, target: '_blank', rel: 'noopener' }, 'ссылку'),
              ' ещё раз или отправь боту ', h('b', {}, '@sharkyplay_bot'), ' код:'),
            h('div', { style: 'margin-top:4px' },
              h('code', { style: 'user-select:all' }, code), ' ',
              h('button.btn', {
                style: 'padding:2px 10px',
                onclick: () => { navigator.clipboard?.writeText(code); toast('код скопирован'); },
              }, '⧉'),
            ),
          );
        }, 8000);
        await waitDone;
        clearTimeout(slow);
        location.hash = '#/cabinet';
      } catch (e) {
        toast(e.message || String(e), true);
        tgBtn.disabled = false;
        tgBtn.textContent = TG_LABEL;
        status.style.display = 'none';
      }
    },
  }, TG_LABEL);

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
