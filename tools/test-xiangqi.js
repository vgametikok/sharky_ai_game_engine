/* Детерминированные тесты правил сянци и ИИ (node, без браузера).
   Запуск: node tools/test-xiangqi.js */
'use strict';
const path = require('path');
const fs = require('fs');

// ── стаб движка ──
let factory = null;
global.Engine = { register: (n, f) => { factory = f; } };
global.performance = require('perf_hooks').performance;
let overCalls = [];
const engineApi = {
  img: () => null, beep: () => {}, burst: () => {},
  addScore: () => {}, setScore: () => {}, resetTimer: () => {}, addTime: () => {},
  gameOver: (o) => { overCalls.push(o || {}); },
  saveState: () => {}, loadState: () => null,
  rr: () => {}, accent: () => '#fff', reportPlayerScreen: () => {},
};
eval(fs.readFileSync(path.join(__dirname, '..', 'src', 'scenes', 'xiangqi.js'), 'utf8'));

let pass = 0, fail = 0;
function T(name, cond, extra) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}
function fresh() {
  overCalls = [];
  const s = factory(engineApi, { theme: {}, rules: {} });
  s.reset();
  return s;
}
function movesOf(s, x, y) { return s._movesFor(x, y).map(m => m.join(',')).sort(); }

// пустая доска с генералами на РАЗНЫХ вертикалях (иначе «летящий генерал»
// делает нелегальными почти все ходы) — база для сценариев
function pos(sets, gb, gr) { // sets: [[x,y,'X'],...], генералы переопределяемы
  const a = new Array(90).fill('.');
  const B = gb || [3, 0], R = gr || [5, 9];
  a[B[1] * 9 + B[0]] = 'g';
  a[R[1] * 9 + R[0]] = 'G';
  for (const [x, y, c] of sets) a[y * 9 + x] = c;
  return a.join('');
}

console.log('1. Начальная позиция');
{
  const s = fresh();
  s._menuAction('new');
  const st = s._state();
  T('ui=play', st.ui === 'play');
  T('ход красных', st.turn === 'r');
  T('доска 90', st.board.length === 90);
  T('фигур 32', (st.board.match(/[^.]/g) || []).length === 32);
  // известное число легальных ходов красных в начальной позиции сянци = 44
  let total = 0;
  for (let y = 0; y < 10; y++) for (let x = 0; x < 9; x++) {
    const ch = st.board[y * 9 + x];
    if (ch !== '.' && ch === ch.toUpperCase()) total += s._movesFor(x, y).length;
  }
  T('44 легальных хода красных', total === 44, total);
}

console.log('2. Конь: нога коня');
{
  const s = fresh();
  s._setBoard(pos([[4, 5, 'H'], [4, 4, 's']]), 'r');   // солдат вплотную сверху
  const mv = movesOf(s, 4, 5);
  T('вверх заблокирован (нет 3,3 и 5,3)', !mv.includes('3,3') && !mv.includes('5,3'), mv);
  T('вбок свободен (есть 6,4)', mv.includes('6,4'), mv);
  T('всего 6 ходов', mv.length === 6, mv);
}

console.log('3. Слон: глаз и река');
{
  const s = fresh();
  s._setBoard(pos([[4, 7, 'E'], [3, 6, 's']]), 'r');    // глаз (3,6) занят
  const mv = movesOf(s, 4, 7);
  T('через занятый глаз нельзя (нет 2,5)', !mv.includes('2,5'), mv);
  T('свободные диагонали есть (6,5)', mv.includes('6,5'), mv);
  const s2 = fresh();
  s2._setBoard(pos([[4, 5, 'E']]), 'r');                 // слон у реки
  const mv2 = movesOf(s2, 4, 5);
  T('за реку нельзя (нет y=3)', mv2.every(m => +m.split(',')[1] >= 5), mv2);
}

console.log('4. Пушка: лафет');
{
  const s = fresh();
  // пушка (4,7); экран-солдат (4,4); вражеская колесница (4,2)
  const s3 = fresh();
  s3._setBoard(pos([[4, 7, 'C'], [4, 4, 'S'], [4, 2, 'r']]), 'r');
  const mv = movesOf(s3, 4, 7);
  T('ход до экрана есть (4,5)', mv.includes('4,5'), mv);
  T('на экран нельзя (нет 4,4)', !mv.includes('4,4'), mv);
  T('взятие за экраном есть (4,2)', mv.includes('4,2'), mv);
  T('дальше взятия нельзя (нет 4,1)', !mv.includes('4,1'), mv);
}

console.log('5. Летящий генерал');
{
  const s = fresh();
  // генералы на одной вертикали (4), между ними только красная колесница (4,5):
  // увести колесницу вбок нельзя
  s._setBoard(pos([[4, 5, 'R']], [4, 0], [4, 9]), 'r');
  const mv = movesOf(s, 4, 5);
  T('колесница прикована к вертикали', mv.length > 0 && mv.every(m => +m.split(',')[0] === 4), mv);
  T('по вертикали ходит', mv.includes('4,4') && mv.includes('4,1'), mv);
  // сам генерал: вбок с общей вертикали можно, навстречу по открытой — нельзя
  const s2 = fresh();
  s2._setBoard(pos([], [4, 0], [4, 9]), 'r');            // только генералы, оба на 4
  const gm = movesOf(s2, 4, 9);
  T('вбок с общей вертикали можно (3,9)', gm.includes('3,9'), gm);
  T('навстречу по открытой вертикали нельзя (нет 4,8)', !gm.includes('4,8'), gm);
}

console.log('6. Солдат: до и после реки');
{
  const s = fresh();
  s._setBoard(pos([[4, 6, 'S']]), 'r');
  T('до реки только вперёд', movesOf(s, 4, 6).join(';') === '4,5', movesOf(s, 4, 6));
  const s2 = fresh();
  s2._setBoard(pos([[4, 4, 'S']]), 'r');
  const mv2 = movesOf(s2, 4, 4);
  T('после реки вперёд и вбок', mv2.includes('4,3') && mv2.includes('3,4') && mv2.includes('5,4') && mv2.length === 3, mv2);
}

console.log('7. Шах и мат');
{
  const s = fresh();
  // чёрный генерал (3,0); красные колесницы режут вертикали 2 и 4,
  // третья с (3,3) даёт шах по вертикали 3 → мат
  s._setBoard(pos([[2, 2, 'R'], [4, 2, 'R'], [3, 3, 'R']]), 'b');
  const st = s._state();
  T('чёрные в шахе', st.check === true, st);
  const bm = s._movesFor(3, 0);
  T('у генерала нет ходов', bm.length === 0, bm);
}

console.log('8. ИИ: легальность и мат-в-1');
{
  for (let lvl = 1; lvl <= 5; lvl++) {
    const s = fresh();
    s._menuAction('new');
    const bd = s._bd();
    const m = s._ai(bd, lvl);
    const legal = s._legal(bd, true);
    T('L' + lvl + ' ход легален', legal.indexOf(m) >= 0, m);
  }
  // мат в 1 для чёрных: красный ген (5,9); bR1 (8,8) режет 8-ю горизонталь;
  // bR2 (0,7) → (0,9): шах по 9-й горизонтали, отходы (4,9)/(5,8) под боем = мат.
  const s = fresh();
  s._setBoard(pos([[8, 8, 'r'], [0, 7, 'r']]), 'b');
  const m5 = s._ai(s._bd(), 5);
  const f = (m5 / 90) | 0, t = m5 % 90;
  // в позиции есть ≥2 выигрыша в 1 ход (мат колесницей ИЛИ пат генералом
  // через «летящего») — принимаем любой ход, немедленно выигрывающий партию
  s._apply(f % 9, (f / 9) | 0, t % 9, (t / 9) | 0);
  T('L5 выигрывает в 1 ход', overCalls.length === 1 && overCalls[0].label === 'ПОРАЖЕНИЕ',
    { move: [[f % 9, (f / 9) | 0], [t % 9, (t / 9) | 0]], over: overCalls });
}

console.log('9. Пат = поражение ходящего');
{
  const s = fresh();
  // красный ген (5,9) заперт без шаха: bR (4,0) режет вертикаль 4,
  // bR (8,8) режет 8-ю горизонталь; шаха нет, у красных только генерал.
  s._setBoard(pos([[4, 0, 'r'], [8, 8, 'r']]), 'r');
  const st = s._state();
  T('шаха нет', st.check === false, st);
  const gm = s._movesFor(5, 9);
  T('ходов нет', gm.length === 0, gm);
  // применим ход чёрных, создающий пат → красные проиграли
  const s2 = fresh();
  s2._setBoard(pos([[4, 0, 'r'], [8, 7, 'r']]), 'b');
  s2._apply(8, 7, 8, 8);   // колесница вниз: теперь пат красным
  T('пат объявлен поражением', overCalls.length >= 1 && overCalls[overCalls.length - 1].label === 'ПОРАЖЕНИЕ', overCalls);
}

console.log('10. Сейв/восстановление');
{
  const s = fresh();
  s._menuAction('new');
  s._apply(4, 6, 4, 5);    // солдат вперёд
  const o = s._saveObj();
  T('сейв содержит партию', !!o.g && o.g.t === 'b', o.g && o.g.t);
  T('сейв: доска сохранена', o.g.b.indexOf('S') >= 0 && o.g.b.length === 90);
}

console.log('\nИтог: ' + pass + ' ok, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
