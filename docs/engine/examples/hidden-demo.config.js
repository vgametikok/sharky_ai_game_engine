/* Демо поиска предметов: «Сундук боцмана» — процедурная куча хлама,
   6 целей, 3 подсказки, комбинация ключ+сундук. Таймер 90с. */
module.exports = {
  genre: 'hidden',
  meta: { title: 'Boatswain Chest' },
  theme: {
    accent: '#ffd75e',
    bgTop: '#2a2035', bgBottom: '#0f0a16',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ВРЕМЯ ВЫШЛО', win: 'ВСЁ НАЙДЕНО!', again: 'Тап — заново', scoreUnit: 'очков' },
  },
  rules: { mode: 'timed', duration: 90 },
  hidden: {
    clutter: 70,
    hints: 3,
    timeBonus: 10,
    items: [
      { id: 'key', label: 'Ключ', x: 0.18, y: 0.22, r: 0.035, color: '#ffd75e' },
      { id: 'chest', label: 'Сундук', x: 0.78, y: 0.55, r: 0.05, color: '#b98a4a' },
      { id: 'pearl', label: 'Жемчужина', x: 0.45, y: 0.38, r: 0.03, color: '#e8f4ff' },
      { id: 'anchor', label: 'Якорь', x: 0.6, y: 0.18, r: 0.04, color: '#8a9ab0' },
      { id: 'bottle', label: 'Бутылка', x: 0.3, y: 0.6, r: 0.035, color: '#70c8a8' },
      { id: 'compass', label: 'Компас', x: 0.85, y: 0.3, r: 0.033, color: '#e07050' },
    ],
    combos: [
      { need: ['key', 'chest'], give: 'treasure', label: 'Ключ подошёл к сундуку!' },
    ],
  },
};
