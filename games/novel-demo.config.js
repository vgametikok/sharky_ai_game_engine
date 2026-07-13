/* Демо визуальной новеллы: «Тайна рифа» — ветки, симпатия Мурены,
   флаг жемчужины, 3 концовки, NG+ открывает секретную ветку. */
module.exports = {
  genre: 'novel',
  meta: { title: 'Reef Story' },
  theme: {
    accent: '#7ce0ff',
    bgTop: '#0d2b4a', bgBottom: '#041020',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { again: 'Тап — сначала (NG+)', scoreUnit: 'очков' },
  },
  rules: { mode: 'untimed' },
  novel: {
    start: 'intro',
    chars: {
      murena: { name: 'Мурена', color: '#8ef0c0' },
      krab: { name: 'Старый Краб', color: '#f0a070' },
    },
    nodes: {
      intro: { bg: '#0d2b4a', text: 'Риф затих. Говорят, из Тёмной пещеры пропала Жемчужина Прилива…', next: 'meet' },
      meet: { bg: '#0d2b4a', who: 'murena', text: 'Шарки! Ты слышал? Без Жемчужины риф зачахнет. Поможешь мне?', choices: [
        { text: 'Конечно, помогу!', goto: 'trust', aff: { murena: 2 } },
        { text: 'А что мне за это будет?', goto: 'greedy', aff: { murena: -1 } },
        { text: '[NG+] Я знаю, кто украл…', goto: 'secret', need: 'ng+' },
      ] },
      trust: { bg: '#14503a', who: 'murena', text: 'Я знала, что на тебя можно положиться. Идём к Старому Крабу!', set: ['ally'], next: 'crab' },
      greedy: { bg: '#503a14', who: 'murena', text: 'Хм. Весь риф в опасности, а ты торгуешься… Ладно, идём.', next: 'crab' },
      crab: { bg: '#503a14', who: 'krab', text: 'Жемчужину утащил осьминог Клякса. Его логово — за коралловым лесом. Но есть короткий путь через грот…', choices: [
        { text: 'Через коралловый лес', goto: 'forest' },
        { text: 'Коротким путём через грот', goto: 'grotto' },
      ] },
      forest: { bg: '#145014', text: 'Лес шумит. Вы пробираетесь долго, но безопасно. У логова вас уже ждут…', next: 'final' },
      grotto: { bg: '#282838', text: 'В гроте темно. Что-то шевелится… Это ловушка Кляксы! Мурена успевает оттолкнуть тебя.', aff: { murena: 1 }, set: ['trap'], next: 'final' },
      final: { bg: '#402048', who: 'murena', text: 'Вот и логово. Клякса силён. Что будем делать?', choices: [
        { text: 'Атаковать вместе!', goto: 'end_fight', needAff: { murena: 2 } },
        { text: 'Выкрасть жемчужину тихо', goto: 'end_sneak' },
        { text: 'Уйти. Это не наша война', goto: 'end_coward' },
      ] },
      end_fight: { bg: '#e0c050', who: 'murena', text: 'Вместе мы непобедимы! Клякса повержен, Жемчужина дома. Риф сияет!', end: 'good', endLabel: 'ЛУЧШАЯ КОНЦОВКА' },
      end_sneak: { bg: '#7090b0', text: 'Вы тихо выкрали Жемчужину. Клякса ещё вернётся… но риф спасён.', end: 'neutral', endLabel: 'КОНЦОВКА: ТИХИЙ ГЕРОЙ' },
      end_coward: { bg: '#404048', text: 'Риф медленно угасает. Иногда бездействие — тоже выбор.', end: 'bad', endLabel: 'ПЛОХАЯ КОНЦОВКА' },
      secret: { bg: '#101024', who: 'murena', text: 'Что?! Откуда ты… Ах да. Ты ведь уже проживал этот день. Тогда идём сразу к логову!', set: ['ally'], aff: { murena: 3 }, next: 'final' },
    },
  },
};
