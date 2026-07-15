/* Крошечный софт-канвас (RGBA) поверх pnggen — для процедурных пиксель-спрайтов.
   Без зависимостей. new Canvas(w,h) → рисуй → .url() отдаёт data:image/png. */
'use strict';
const { toDataURL } = require('./pnggen');

function hexRGBA(c) {
  if (Array.isArray(c)) return c.length === 3 ? [c[0], c[1], c[2], 255] : c;
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map(x => x + x).join('');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : 255;
  return [r, g, b, a];
}

class Canvas {
  constructor(w, h) { this.w = w; this.h = h; this.buf = new Uint8Array(w * h * 4); }
  px(x, y, col, a) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const rgba = hexRGBA(col); let al = (a == null ? rgba[3] : a * 255) / 255;
    if (al <= 0) return;
    const i = (y * this.w + x) * 4, inv = 1 - al;
    this.buf[i] = rgba[0] * al + this.buf[i] * inv;
    this.buf[i + 1] = rgba[1] * al + this.buf[i + 1] * inv;
    this.buf[i + 2] = rgba[2] * al + this.buf[i + 2] * inv;
    this.buf[i + 3] = Math.min(255, rgba[3] * al + this.buf[i + 3] * inv);
  }
  rect(x, y, w, h, col, a) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, col, a); }
  circle(cx, cy, r, col, a) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) this.px(cx + x, cy + y, col, a);
  }
  ring(cx, cy, r, th, col, a) {
    const ri = r - th;
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
      const d = x * x + y * y; if (d <= r * r && d >= ri * ri) this.px(cx + x, cy + y, col, a);
    }
  }
  ellipse(cx, cy, rx, ry, col, a) {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++)
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) this.px(cx + x, cy + y, col, a);
  }
  line(x0, y0, x1, y1, col, th) {
    th = th || 1; const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, x = x0, y = y0;
    for (let k = 0; k < 4000; k++) {
      if (th <= 1) this.px(x, y, col); else this.circle(x, y, (th / 2) | 0, col);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
    }
  }
  tri(x0, y0, x1, y1, x2, y2, col) {
    const minX = Math.min(x0, x1, x2) | 0, maxX = Math.max(x0, x1, x2) | 0;
    const minY = Math.min(y0, y1, y2) | 0, maxY = Math.max(y0, y1, y2) | 0;
    const area = (px, py, ax, ay, bx, by) => (px - bx) * (ay - by) - (ax - bx) * (py - by);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const d1 = area(x, y, x0, y0, x1, y1), d2 = area(x, y, x1, y1, x2, y2), d3 = area(x, y, x2, y2, x0, y0);
      const neg = (d1 < 0) || (d2 < 0) || (d3 < 0), pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
      if (!(neg && pos)) this.px(x, y, col);
    }
  }
  url() { return toDataURL(this.w, this.h, this.buf); }
}

module.exports = { Canvas };
