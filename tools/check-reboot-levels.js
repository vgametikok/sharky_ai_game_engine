/* Проверка уровней «Перезагрузки» тем же BFS-солвером, что и «Шестерёнка».
   Запуск: node tools/check-reboot-levels.js */
'use strict';
const path = require('path');
const { analyzeLevel } = require('./check-cog-tower-levels.js');
const cfg = require(path.join(__dirname, '..', 'games', 'reboot-bots.config.js'));
const levels = (cfg.puzzle && cfg.puzzle.levels) || [];
let fail = 0;
console.log('Зал | размер | мод | толчки | ходы | лимит(рек) | лимит(конфиг) | статус');
levels.forEach((L, i) => {
  const a = analyzeLevel(L.map);
  if (!a.ok) { fail++; console.log((i + 1) + ' | FAIL: ' + a.reason + ' | конфиг=' + L.moveLimit); return; }
  let status = 'OK';
  if (i >= 3 && a.pushes < 4) { status = 'FAIL: тривиален (' + a.pushes + ' толчков)'; fail++; }
  else if (L.moveLimit !== a.limit) { status = 'FIX: moveLimit -> ' + a.limit; }
  console.log((i + 1) + ' | ' + a.cols + 'x' + a.rows + ' | ' + a.boxes + ' | ' + a.pushes + ' | ' + a.moves + ' | ' + a.limit + ' | ' + L.moveLimit + ' | ' + status);
});
console.log(fail ? ('ПРОВАЛ: ' + fail) : 'все решаемы (лимиты поправить по колонке рек)');
