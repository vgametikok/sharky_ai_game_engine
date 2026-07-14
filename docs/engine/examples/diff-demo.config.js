/* Демо «найди отличия»: процедурные сцены из фигур, 6 отличий,
   3 раунда, штраф 3с за промах. */
module.exports = {
  genre: 'diff',
  meta: { title: 'Spot It' },
  theme: {
    accent: '#8ef0c0',
    bgTop: '#101828', bgBottom: '#060a12',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ВРЕМЯ ВЫШЛО', win: 'ГЛАЗ-АЛМАЗ!', again: 'Тап — заново', scoreUnit: 'очков' },
  },
  rules: { mode: 'timed', duration: 60 },
  diff: { shapes: 24, diffs: 6, penalty: 3, rounds: 3 },
};
