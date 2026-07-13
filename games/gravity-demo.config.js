/* Демо гравифлипа (VVVVVV): кнопка прыжка переворачивает гравитацию,
   обычного прыжка нет. Пройди коридор по полу и потолку. */
module.exports = {
  genre: 'platformer',
  meta: { title: 'Gravity Demo' },
  theme: {
    accent: '#9ae07c',
    bgTop: '#1d1d38', bgBottom: '#0a0a18',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'РАЗМАЗАЛО', win: 'ГРАВИТАЦИЯ ПОКОРЕНА!', again: 'Тап — заново', scoreUnit: 'очков' },
  },
  rules: { mode: 'untimed' },
  platformer: {
    tileSize: 16, viewTilesX: 14, mode: 'levels',
    physics: { gravity: 1600, moveSpeed: 130 },
    player: { w: 0.7, h: 0.95, hp: 3, lives: 3, color: '#9ae07c', weapons: [], abilities: { gravityFlip: true } },
    legend: {
      '=': { tile: true, solid: true, color: '#5a5a7a' },
      '^': { tile: true, hazard: 1, color: '#c94040' },
      'P': { player: true },
      'E': { exit: true, needsBossDead: false, color: '#7ce07c' },
      'C': { pickup: 'coin', value: 10, color: '#ffd75e' },
    },
    levels: [
      { map: [
        "========================================================",
        "=          C            ====                  C        =",
        "=   C            ====          ^^^^   C    =====   C   =",
        "=========   ^^                       ===               =",
        "=                                                      =",
        "= P     C     ====      C C      ====        C      E  =",
        "=====================        ===========================",
        "=                    ==========                         =",
        "========================================================",
      ] },
    ],
  },
};
