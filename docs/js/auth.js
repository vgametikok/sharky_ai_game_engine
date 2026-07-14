// Вход как в Sharky: Google OAuth (Supabase) и Telegram deep-link (tg-login/tg-auth).
import { supa } from './supa.js';
import { FN, SUPABASE_ANON } from './config.js';

export async function signInGoogle() {
  // redirect на текущую страницу сайта (Pages или localhost)
  const redirectTo = location.origin + location.pathname;
  const { error } = await supa.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

async function tgCall(payload) {
  const r = await fetch(FN('tg-login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON },
    body: JSON.stringify(payload),
  });
  return r.json();
}

// Возвращает {link, waitDone}: link открыть в Telegram, waitDone — промис входа.
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

  return { link, waitDone };
}

export async function signOut() { await supa.auth.signOut(); }

// Аккаунт Sharky этого же логина (по auth_uid). null — аккаунта нет.
export async function sharkyProfile() {
  const { data: s } = await supa.auth.getSession();
  const authUid = s?.session?.user?.id;
  if (!authUid) return null;
  const { data } = await supa.from('users')
    .select('id, username, display_name, avatar_emoji, telegram_id, role')
    .eq('auth_uid', authUid).maybeSingle();
  return data || null;
}
