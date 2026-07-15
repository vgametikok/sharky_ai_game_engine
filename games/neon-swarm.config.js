/* «Неонный рой» — вертикальный космический шмап на сцене shmup.
   Одинокий истребитель против бесконечного роя. Скролл вверх, автострельба,
   апгрейды (P), бомбы (✦), поляризация Ikaruga (⇄ — поглощай пули своего цвета),
   грейз Touhou (пролетай впритык у пуль ради очков). Волны нарастают и
   зацикливаются со всё большей сложностью. Геометрический неон, партиклы. */
'use strict';
const proc = require('./neon-swarm.proc.js');

module.exports = {
  genre: 'shmup',
  meta: { title: 'Неонный рой' },
  assets: proc,
  theme: {
    accent: '#38e0ff',
    bgTop: '#0a0a24', bgBottom: '#02020a',
    font: "'Segoe UI', system-ui, sans-serif",
    labels: { over: 'СБИТ', again: 'Тап — заново', scoreUnit: 'очков',
      hint: 'Веди пальцем · ✦ бомба · ⇄ цвет' },
  },
  rules: { mode: 'untimed' },
  shmup: {
    scroll: { speed: 60, stars: true },
    player: { w: 26, h: 30, speed: 300, hp: 3, bombs: 3, hitboxR: 3.5, color: '#38e0ff', img: 'ship', imgScale: 1.5 },
    weapon: {
      cooldown: 0.14, shotSpeed: 460,
      levels: [
        { count: 1, spread: 0, dmg: 1 },
        { count: 2, spread: 0.14, dmg: 1 },
        { count: 3, spread: 0.30, dmg: 1 },
        { count: 4, spread: 0.46, dmg: 1 },
        { count: 5, spread: 0.62, dmg: 1.5 },
      ],
    },
    polarity: true,
    colors: ['#38e0ff', '#ff4d9d'],
    graze: { radius: 18, score: 20 },
    enemies: {
      // рой — мелкие, быстрые, волнами
      drone:  { w: 22, h: 20, hp: 1, speed: 78, color: '#5cf0c0', move: 'sine', img: 'e_drone', imgScale: 1.5,
                score: 40, drop: 'up', dropChance: 0.10 },
      // ныряльщик — пикирует на игрока
      dart:   { w: 24, h: 22, hp: 2, speed: 90, color: '#ff8a3d', move: 'dive', img: 'e_dart', imgScale: 1.5,
                score: 70, drop: 'up', dropChance: 0.12 },
      // страж — зависает, бьёт веером
      ward:   { w: 30, h: 28, hp: 4, speed: 34, color: '#b48cff', move: 'hover', img: 'e_ward', imgScale: 1.5,
                gun: { cooldown: 1.5, speed: 150, aim: 'spread3' }, score: 120, drop: 'bomb', dropChance: 0.2 },
      // перехватчик — целится в игрока, поляризованные пули
      lancer: { w: 28, h: 26, hp: 3, speed: 52, color: '#ff4d9d', move: 'straight', img: 'e_lancer', imgScale: 1.5,
                gun: { cooldown: 1.8, speed: 180, aim: 'player' }, score: 100, drop: 'up', dropChance: 0.18 },
      // крейсер — толстый, сыплет пули вниз
      cruiser:{ w: 40, h: 34, hp: 9, speed: 26, color: '#38e0ff', move: 'hover', img: 'e_cruiser', imgScale: 1.4,
                gun: { cooldown: 0.9, speed: 130, aim: 'down' }, score: 260, drop: 'heart', dropChance: 0.3 },
    },
    waves: [
      { t: 0.8, enemy: 'drone', n: 5, interval: 0.3 },
      { t: 3.5, enemy: 'drone', n: 6, interval: 0.25 },
      { t: 6.5, enemy: 'dart', n: 3, interval: 0.6 },
      { t: 9.0, enemy: 'lancer', n: 2, interval: 0.9 },
      { t: 12.0, enemy: 'drone', n: 7, interval: 0.22 },
      { t: 15.0, enemy: 'ward', n: 1 },
      { t: 16.5, enemy: 'dart', n: 4, interval: 0.45 },
      { t: 20.0, enemy: 'lancer', n: 3, interval: 0.7 },
      { t: 23.5, enemy: 'cruiser', n: 1 },
      { t: 25.0, enemy: 'drone', n: 8, interval: 0.2 },
      { t: 28.5, enemy: 'ward', n: 2, interval: 1.4 },
      { t: 32.0, enemy: 'dart', n: 5, interval: 0.4 },
      { t: 35.5, enemy: 'cruiser', n: 2, interval: 1.6 },
    ],
    loop: { hpMul: 1.4, rateMul: 0.9 },
  },
};
