// Роутер SPA + шапка. Вью — функции (params) => Node.
import { supa } from './supa.js';
import { h } from './ui.js';
import { signOut } from './auth.js';
import loginView from './views/login.js';
import cabinetView from './views/cabinet.js';
import wizardView from './views/wizard.js';
import importView from './views/import.js';
import projectView from './views/project.js';
import chatView from './views/chat.js';

const app = document.getElementById('app');
const nav = document.getElementById('nav');

const ROUTES = [
  [/^#\/login$/, loginView, false],
  [/^#\/cabinet$/, cabinetView, true],
  [/^#\/new$/, wizardView, true],
  [/^#\/import$/, importView, true],
  [/^#\/project\/([0-9a-f-]{36})$/, projectView, true],
  [/^#\/chat$/, chatView, true],
];

let session = null;

function renderNav() {
  nav.innerHTML = '';
  if (!session) {
    nav.append(h('a', { href: '#/login' }, 'Войти'));
    return;
  }
  const cur = location.hash;
  const link = (href, label) => h('a' + (cur.startsWith(href) ? '.on' : ''), { href }, label);
  const who = session.user?.email?.replace('@sharky.telegram', ' · TG') || '';
  nav.append(
    link('#/cabinet', 'Кабинет'),
    link('#/new', '+ Игра'),
    link('#/import', 'Из CONFIG'),
    link('#/chat', 'Чат'),
    h('span.who', {}, who),
    h('a', { href: '#', onclick: async (e) => { e.preventDefault(); await signOut(); location.hash = '#/login'; } }, 'Выйти'),
  );
}

let routeSeq = 0;
async function route() {
  let hash = location.hash;
  // OAuth-редирект: supabase-js сам разберёт токены из URL и подожжёт SIGNED_IN
  if (hash.includes('access_token=') || hash.includes('error_description=')) return;
  if (!hash || hash === '#' || hash === '#/') {
    // Входная дверь всегда #/login: даже при живой сессии Sharky вход в Maker —
    // явный клик «Продолжить как …» на странице входа (запрос юзера).
    location.hash = '#/login';
    return;
  }
  const seq = ++routeSeq;
  for (const [re, view, needsAuth] of ROUTES) {
    const m = hash.match(re);
    if (!m) continue;
    if (needsAuth && !session) { location.hash = '#/login'; return; }
    app.innerHTML = '<div class="boot">загрузка…</div>';
    try {
      const node = await view(m.slice(1));
      if (seq !== routeSeq) return; // ушли на другой маршрут, пока грузились
      app.innerHTML = '';
      app.append(node);
    } catch (e) {
      if (seq !== routeSeq) return;
      app.innerHTML = '';
      app.append(h('div.panel', {}, '⚠ ' + (e.message || e)));
    }
    renderNav();
    return;
  }
  location.hash = session ? '#/cabinet' : '#/login';
}

(async function init() {
  const { data } = await supa.auth.getSession();
  session = data?.session || null;
  supa.auth.onAuthStateChange((event, s) => {
    session = s;
    renderNav();
    if (event === 'SIGNED_IN' && (location.hash.includes('access_token=') || location.hash === '#/login' || !location.hash)) {
      location.hash = '#/cabinet';
    }
    if (event === 'SIGNED_OUT') location.hash = '#/login';
  });
  window.addEventListener('hashchange', route);
  renderNav();
  route();
})();
