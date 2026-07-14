// Вход как в Sharky: Google OAuth, Telegram Login Widget (основной путь),
// Telegram deep-link (страховка для мобильного приложения).
import { supa } from './supa.js';
import { FN, SUPABASE_ANON } from './config.js';

// Числовой id бота @sharkyplay_bot (часть токена до двоеточия) — нужен виджету.
const TG_BOT_ID = 8642379598;

export async function signInGoogle() {
  // redirect на текущую страницу сайта (Pages или localhost)
  const redirectTo = location.origin + location.pathname;
  const { error } = await supa.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

// ── Telegram Login Widget: официальный OAuth, как на большинстве сайтов ──
// Не запускает бота (поэтому «неважно, сколько раз стартовал бота») и надёжно
// работает в вебе, где deep-link Telegram сломан. Телефон Telegram спрашивает
// ОДИН раз на браузер (не на сайт) и сайту его НЕ отдаёт.
// ВАЖНО: домен страницы должен совпадать с заданным боту через @BotFather
// /setdomain (у нас vgametikok.github.io) — на localhost попап выдаст
// «Bot domain invalid», это ожидаемо, проверять только на проде.
let widgetScript = null;
function loadWidget() {
  if (window.Telegram?.Login?.auth) return Promise.resolve();
  if (widgetScript) return widgetScript;
  widgetScript = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://telegram.org/js/telegram-widget.js?22';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { widgetScript = null; reject(new Error('не удалось загрузить Telegram-виджет')); };
    document.head.appendChild(s);
  });
  return widgetScript;
}

export async function signInTelegramWidget() {
  await loadWidget();
  if (!window.Telegram?.Login?.auth) throw new Error('Telegram-виджет недоступен');
  const user = await new Promise((resolve, reject) => {
    window.Telegram.Login.auth({ bot_id: TG_BOT_ID, request_access: 'write' }, (data) => {
      if (!data) reject(new Error('вход через Telegram отменён'));
      else resolve(data);            // {id,first_name,last_name,username,photo_url,auth_date,hash}
    });
  });
  const r = await fetch(FN('tg-auth'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
    body: JSON.stringify({ mode: 'widget', widget: user }),
  });
  const d = await r.json();
  if (!r.ok || !d.token_hash) throw new Error(d.error || 'обмен токена не удался');
  const v = await supa.auth.verifyOtp({ type: 'email', token_hash: d.token_hash });
  if (v.error) throw v.error;
  return true;
}

async function tgCall(payload) {
  const r = await fetch(FN('tg-login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
    body: JSON.stringify(payload),
  });
  return r.json();
}

// Возвращает {link, token, waitDone}: link открыть в Telegram (deep-link),
// token — запасной путь «отправь боту код lg_<token>» (некоторые клиенты TG
// теряют start-параметр у уже начатого чата), waitDone — промис входа.
export async function startTelegramLogin(onStatus) {
  const { token, link, error } = await tgCall({ action: 'new' });
  if (!token) throw new Error(error || 'не удалось создать токен входа');

  const waitDone = (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 10 * 60 * 1000) {
      await new Promise(res => setTimeout(res, 2500));
      const { status } = await tgCall({ action: 'check', token });
      onStatus?.(status);
      if (status === 'confirmed') {
        // обмен подтверждённого токена на сессию
        const r = await fetch(FN('tg-auth'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
          body: JSON.stringify({ mode: 'logintoken', token }),
        });
        const data = await r.json();
        if (!r.ok || !data.token_hash) throw new Error(data.error || 'обмен токена не удался');
        const v = await supa.auth.verifyOtp({ type: 'email', token_hash: data.token_hash });
        if (v.error) throw v.error;
        return true;
      }
      if (status === 'used' || status === 'unknown') throw new Error('ссылка входа устарела — попробуй ещё раз');
    }
    throw new Error('время ожидания вышло');
  })();

  return { link, token, waitDone };
}

export async function signOut() { await supa.auth.signOut(); }

// Профиль Sharky текущей сессии — через DEFINER-RPC web_ensure_user (тот же,
// что на сайте Sharky): находит ИЛИ создаёт строку users по auth.uid().
// ВАЖНО: прямой select из users здесь невозможен — у роли authenticated
// НЕТ SELECT-гранта на auth_uid/telegram_id (модель безопасности Sharky),
// такой запрос падает 401 и профиль выглядит «не найденным».
export async function sharkyProfile() {
  const { data: s } = await supa.auth.getSession();
  const user = s?.session?.user;
  if (!user) return null;
  const { data, error } = await supa.rpc('web_ensure_user');
  if (error) throw new Error('профиль Sharky недоступен: ' + error.message);
  if (!data) return null;
  // вход выполнен через Telegram (email-маркер tg_<id>@sharky.telegram)
  return { ...data, tgLogin: (user.email || '').endsWith('@sharky.telegram') };
}
