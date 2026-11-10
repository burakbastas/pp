// Ekran klavyesi: parmak numaraları, el renkleri, çoklu dokunuş
import { STEP_SEMI, SOLFEGE } from './t.js';

const BLACK = new Set([1, 3, 6, 8, 10]);
const WHITE_NAME = { 0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6 };

export class Keyboard {
  constructor(host, { low = 36, high = 84, onDown, onUp, names = false } = {}) {
    this.host = host; this.low = low; this.high = high; this.onDown = onDown; this.onUp = onUp;
    this.names = names; this.keys = new Map(); this.active = new Map();
    host.classList.add('kb');
    host.innerHTML = `<div class="kb-scroll"><div class="kb-keys"></div></div>
      <button class="kb-shift l" type="button" aria-label="Klavyeyi sola kaydır"><svg viewBox="0 0 10 16"><path d="M8 2 2 8l6 6"/></svg></button>
      <button class="kb-shift r" type="button" aria-label="Klavyeyi sağa kaydır"><svg viewBox="0 0 10 16"><path d="m2 2 6 6-6 6"/></svg></button>`;
    this.scroll = host.querySelector('.kb-scroll'); this.wrap = host.querySelector('.kb-keys');
    host.querySelector('.l').onclick = () => this.shift(-1);
    host.querySelector('.r').onclick = () => this.shift(1);
    this.build();
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(host);
  }
  destroy() { this.ro.disconnect(); }
  build() {
    const whites = [];
    this.wrap.innerHTML = '';
    for (let m = this.low; m <= this.high; m++) {
      const pc = m % 12, el = document.createElement('div');
      el.className = 'key ' + (BLACK.has(pc) ? 'black' : 'white'); el.dataset.m = m;
      if (!BLACK.has(pc)) {
        whites.push(m);
        el.innerHTML = `<span class="kn">${this.names || pc === 0 ? SOLFEGE[WHITE_NAME[pc]] + (pc === 0 ? Math.floor(m / 12) - 1 : '') : ''}</span>`;
      }
      if (m === 60) el.classList.add('midc');
      el.insertAdjacentHTML('beforeend', '<span class="fn"></span>');
      this.wrap.appendChild(el); this.keys.set(m, el);
    }
    this.whites = whites;
    const held = new Map();
    this.wrap.onpointerdown = (e) => {
      const k = e.target.closest('.key'); if (!k) return;
      e.preventDefault();
      const m = +k.dataset.m; held.set(e.pointerId, m);
      try { k.setPointerCapture(e.pointerId); } catch (x) { /* */ }
      this.onDown?.(m, 'touch');
    };
    const up = (e) => { if (held.has(e.pointerId)) { const m = held.get(e.pointerId); held.delete(e.pointerId); this.onUp?.(m, 'touch'); } };
    this.wrap.onpointerup = up; this.wrap.onpointercancel = up;
  }
  layout() {
    const W = this.host.clientWidth; if (!W) return;
    const minKey = 30, n = this.whites.length;
    const wanted = Math.max(minKey, Math.min(54, W / Math.min(n, W < 520 ? 15 : W < 900 ? 22 : 29)));
    this.kw = wanted;
    const bw = wanted * 0.62;
    this.wrap.style.width = n * wanted + 'px';
    let wi = 0;
    for (let m = this.low; m <= this.high; m++) {
      const el = this.keys.get(m);
      if (el.classList.contains('white')) { el.style.left = wi * wanted + 'px'; el.style.width = wanted + 'px'; wi++; }
      else { el.style.left = wi * wanted - bw / 2 + 'px'; el.style.width = bw + 'px'; }
    }
    this.scroll.classList.toggle('fits', n * wanted <= W);
    if (this._focus) this.focusRange(...this._focus, true);
  }
  xOf(m) {
    const k = this.keys.get(m); return k ? parseFloat(k.style.left) + parseFloat(k.style.width) / 2 : 0;
  }
  shift(dir) { this.scroll.scrollBy({ left: dir * this.kw * 7, behavior: 'smooth' }); }
  focusRange(a, b, instant) {
    this._focus = [a, b];
    if (!this.kw) return;
    const lo = this.xOf(Math.max(this.low, a)) - this.kw, hi = this.xOf(Math.min(this.high, b)) + this.kw;
    const view = this.scroll.clientWidth, cur = this.scroll.scrollLeft;
    let target = cur;
    if (hi - lo > view) target = (lo + hi) / 2 - view / 2;
    else if (lo < cur + 6) target = lo - this.kw;
    else if (hi > cur + view - 6) target = hi - view + this.kw;
    if (Math.abs(target - cur) > 2) this.scroll.scrollTo({ left: target, behavior: instant ? 'auto' : 'smooth' });
  }
  // marks: Map midi -> {hand:'rh'|'lh', finger, soft}
  setMarks(marks) {
    this.active.forEach((_, m) => { if (!marks.has(m)) this.clearKey(m); });
    marks.forEach((v, m) => {
      const el = this.keys.get(m); if (!el) return;
      el.classList.remove('rh', 'lh', 'soft');
      el.classList.add(v.hand); if (v.soft) el.classList.add('soft');
      el.querySelector('.fn').textContent = v.finger || '';
      this.active.set(m, v);
    });
  }
  clearKey(m) {
    const el = this.keys.get(m); if (!el) return;
    el.classList.remove('rh', 'lh', 'soft'); el.querySelector('.fn').textContent = ''; this.active.delete(m);
  }
  clearMarks() { [...this.active.keys()].forEach(m => this.clearKey(m)); }
  pressed(m, on) { this.keys.get(m)?.classList.toggle('down', on); }
  flash(m, cls) {
    const el = this.keys.get(m); if (!el) return;
    el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 420);
  }
}
export const SEMI = STEP_SEMI;
