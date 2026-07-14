/* Демо сокобана: 3 уровня, undo, без жёсткого лимита ходов
   (очки выше за меньшее число ходов). */
module.exports = {
  genre: 'puzzle',
  meta: { title: 'Box Reef' },
  theme: {
    accent: '#7ce0ff',
    bgTop: '#1a2438', bgBottom: '#0a0e18',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'ХОДЫ КОНЧИЛИСЬ', win: 'ВСЕ УРОВНИ!', again: 'Тап — заново', scoreUnit: 'очков' },
  },
  rules: { mode: 'untimed' },
  puzzle: {
    moveLimit: 0,
    undo: true,
    levels: [
      { map: [
        "#######",
        "#  .  #",
        "#  B  #",
        "# BP B#",
        "#.   .#",
        "#######",
      ] },
      { map: [
        "########",
        "#   #  #",
        "# B  B #",
        "# #..# #",
        "# B..B #",
        "#  P   #",
        "########",
      ] },
      { map: [
        "#########",
        "##  #   #",
        "#  B  B #",
        "# #.#.# #",
        "#  ...  #",
        "#  BPB  #",
        "##     ##",
        "#########",
      ] },
    ],
  },
};
