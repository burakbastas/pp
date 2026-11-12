// Küçük nota dizgi motoru: ölçüleri SVG büyük porteye yerleştirir.
import { GLYPHS } from './g.js';
import { keyAlter, keySigPositions, SOLFEGE } from './t.js';

const SP = 10, HALF = 5, STAFF_H = 40;
const TOP_DIA = { treble: 38, bass: 26 };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const r1 = (x) => Math.round(x * 10) / 10;

function glyph(name, x, y, h, cls = '') { // y: kutu altı, h: kutu yüksekliği
  const g = GLYPHS[name]; const [x0, y0, , y1] = g.b; const s = h / (y1 - y0);
  return `<path class="g ${cls}" transform="translate(${r1(x - x0 * s)} ${r1(y + y0 * s)}) scale(${(s).toFixed(4)} ${(-s).toFixed(4)})" d="${g.d}"/>`;
}
function glyphW(name, h) { const g = GLYPHS[name]; const [x0, y0, x1, y1] = g.b; return (x1 - x0) * h / (y1 - y0); }

function ellipsePath(cx, cy, rx, ry, rot) {
  const a = rot * Math.PI / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a);
  return `M${r1(cx - dx)} ${r1(cy - dy)}A${rx} ${ry} ${rot} 1 0 ${r1(cx + dx)} ${r1(cy + dy)}A${rx} ${ry} ${rot} 1 0 ${r1(cx - dx)} ${r1(cy - dy)}Z`;
}
function head(cx, cy, base) {
  const q = base.replace('.', '');
  if (q === '1') return `<path class="n" fill-rule="evenodd" d="${ellipsePath(cx, cy, 7.4, 4.7, -6)}${ellipsePath(cx, cy, 3.9, 3, 58)}"/>`;
  if (q === '2') return `<path class="n" fill-rule="evenodd" d="${ellipsePath(cx, cy, 6.1, 4.3, -22)}${ellipsePath(cx, cy, 4.9, 2.2, -28)}"/>`;
  return `<path class="n" d="${ellipsePath(cx, cy, 6.1, 4.3, -22)}"/>`;
}
const isShort = (ev) => !ev.rest && ['8', '16', '32', '12', '8.', '16.'].includes(ev.base);
const flagCount = (b) => b.startsWith('16') ? 2 : b.startsWith('32') ? 3 : (b.startsWith('8') || b.startsWith('12')) ? 1 : 0;
const noStem = (ev) => ev.rest || ev.base === '1' || ev.base === '1.';

function beatGrid(time, sixteenth, beats) {
  const [n, d] = time;
  if (beats) return beats;
  if (d === 8) {
    if (n === 3) return [1.5];
    if (n === 6) return [1.5, 1.5];
    if (n === 9) return [1.5, 1.5, 1.5];
    if (n === 12) return [1.5, 1.5, 1.5, 1.5];
    return Array(n).fill(0.5);
  }
  if (d === 2) return sixteenth ? Array(n * 2).fill(1) : Array(n).fill(2);
  if (n === 4 && !sixteenth) return [2, 2];
  return Array(n).fill(4 / d);
}

export class Engraved {
  constructor(score, host, opts) {
    this.score = score; this.host = host; this.opts = opts;
    this.pos = []; this.evMap = new Map();
    this.draw();
  }
  draw() {
    const { score, host, opts } = this;
    const W = Math.max(240, opts.width || host.clientWidth || 360);
    const scale = (opts.sp || 8) / SP, avail = W / scale - 4;
    prepareAccidentals(score);
    const both = score.staves.rh && score.staves.lh;
    const single = both ? null : (score.staves.rh ? 'rh' : 'lh');
    // ölçü genişlikleri
    const items = score.measures.map((m, i) => this.measureMetrics(m, i));
    const clefW = 34, timeW = 26;
    const sysList = []; let cur = null, prevKey = score.measures[0]?.key ?? 0;
    items.forEach((it, i) => {
      const m = score.measures[i];
      const keyW = Math.abs(m.key) * 9;
      const header = clefW + keyW + (i === 0 ? timeW : 0) + 8;
      const keyChange = cur && m.key !== prevKey ? keyW + 14 : 0;
      const need = it.w + keyChange;
      if (!cur || cur.used + need > avail - cur.header) {
        cur = { list: [], used: 0, header };
        cur.list.push({ i, keyChange: 0 }); cur.used = it.w; sysList.push(cur);
      } else { cur.list.push({ i, keyChange }); cur.used += need; }
      prevKey = m.key;
    });
    let y = 6; const out = [];
    sysList.forEach((sys, si) => {
      y = this.drawSystem(sys, si, sysList.length, items, y, avail, out, both, single);
    });
    const totalH = Math.ceil(y + 4);
    host.innerHTML = `<svg class="score-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${r1(W / scale)} ${totalH}" width="${W}" height="${Math.ceil(totalH * scale)}" role="img" aria-label="${esc(score.title || 'Nota')}">${out.join('')}<rect class="cursor" x="-20" y="0" width="2.4" height="10" /></svg>`;
    this.svg = host.firstChild; this.scale = scale;
    this.cursor = this.svg.querySelector('.cursor');
    this.svg.querySelectorAll('.ev').forEach(g => {
      const k = g.dataset.k; if (!this.evMap.has(k)) this.evMap.set(k, []); this.evMap.get(k).push(g);
    });
    this.loopEls = [...this.svg.querySelectorAll('.loopbg')];
  }
  measureMetrics(m, i) {
    const on = new Map();
    for (const staff of ['rh', 'lh']) {
      const s = m[staff]; if (!s) continue;
      s.voices.forEach(v => v.forEach(ev => {
        const key = Math.round(ev.t * 1000) / 1000;
        const o = on.get(key) || { t: ev.t, min: 99, acc: 0, disp: 0 };
        o.min = Math.min(o.min, ev.d);
        ev.notes.forEach(n => { if (n.showAcc !== undefined && n.showAcc !== null) o.acc = 1; });
        on.set(key, o);
      }));
    }
    const list = [...on.values()].sort((a, b) => a.t - b.t);
    if (!list.length) list.push({ t: 0, min: m.len, acc: 0 });
    const minW = this.opts.showNames ? 30 : 0;
    list.forEach((o, idx) => {
      const nextT = idx + 1 < list.length ? list[idx + 1].t : m.len;
      const span = Math.max(nextT - o.t, 0.25);
      o.w = Math.max(minW, 15 + 16 * Math.log2(1 + span * 2)) + (o.acc ? 11 : 0) + (this.opts.showFingers ? 1 : 0);
    });
    const lyr = m.lyrics ? 8 : 0;
    const w = list.reduce((a, o) => a + o.w + lyr, 0) + 12 + (m.repeatStart ? 12 : 0) + (m.repeatEnd ? 12 : 0);
    // ölçü başında anahtar değişiyorsa küçük anahtara yer aç
    const prev = this.score.measures[i - 1], chg = !!prev && ['rh', 'lh'].some(st => m[st] && prev[st] && prev[st].clef !== m[st].clef);
    return { onsets: list, w: w + (chg ? 22 : 0), chg };
  }
  drawSystem(sys, si, nSys, items, yStart, avail, out, both, single) {
    const { score, opts } = this;
    const firstI = sys.list[0].i;
    const firstM = score.measures[firstI];
    const room = avail - sys.header;
    const last = si === nSys - 1;
    let stretch = Math.max(0.6, room / sys.used);
    if (last && stretch > 1.35) stretch = 1.2;
    if (sys.list.length === 1 && stretch > 2) stretch = 1.8;
    // dikey ölçüm
    const ext = { rhUp: 0, rhDown: 0, lhUp: 0, lhDown: 0, chords: false, lyr: false };
    sys.list.forEach(({ i }) => {
      const m = score.measures[i];
      if (m.chords.length) ext.chords = true;
      if (m.lyrics) ext.lyr = true;
      for (const staff of ['rh', 'lh']) {
        const s = m[staff]; if (!s) continue;
        const clef = s.clef, top = TOP_DIA[clef];
        s.voices.forEach(v => v.forEach(ev => {
          ev.notes.forEach(n => {
            const yy = (top - n.dia) * HALF;
            ext[staff + 'Up'] = Math.max(ext[staff + 'Up'], -yy + 6);
            ext[staff + 'Down'] = Math.max(ext[staff + 'Down'], yy - STAFF_H + 6);
          });
        }));
      }
    });
    const stemRoom = 22, fingerLane = opts.showFingers ? 14 : 0;
    const namesLane = opts.showNames ? 15 : 0;
    const aboveR = Math.max(ext.rhUp + 12, stemRoom) + fingerLane + (ext.chords ? 22 : 0);
    const belowR = Math.max(ext.rhDown, 8) + (ext.lyr ? 16 : 0) + namesLane;
    const aboveL = Math.max(ext.lhUp, 6) + 4;
    const belowL = Math.max(ext.lhDown + 12, stemRoom) + fingerLane + namesLane;
    let trebleY, bassY, sysBottom;
    if (both) {
      trebleY = yStart + aboveR;
      const gap = Math.max(34, belowR + aboveL + 6);
      bassY = trebleY + STAFF_H + gap;
      sysBottom = bassY + STAFF_H + belowL;
    } else if (single === 'rh') {
      trebleY = yStart + aboveR; bassY = null; sysBottom = trebleY + STAFF_H + belowR + 8;
    } else {
      trebleY = null; bassY = yStart + Math.max(aboveL + 16, 26) + (ext.chords ? 22 : 0) + fingerLane; sysBottom = bassY + STAFF_H + belowL;
    }
    const stavesY = { rh: trebleY, lh: bassY };
    const topY = trebleY ?? bassY, botY = (bassY ?? trebleY) + STAFF_H;
    const left = 8 + (both ? 10 : 0);
    let right = left + avail - (both ? 10 : 2);
    if (last && stretch <= 1.2) right = left + sys.header + sys.list.reduce((a, { i, keyChange }) => a + items[i].w * stretch + keyChange, 0);
    // porte çizgileri
    for (const staff of ['rh', 'lh']) {
      const y0 = stavesY[staff]; if (y0 == null) continue;
      for (let l = 0; l < 5; l++) out.push(`<line class="sl" x1="${left}" x2="${r1(right)}" y1="${y0 + l * SP}" y2="${y0 + l * SP}"/>`);
    }
    out.push(`<line class="bl" x1="${left}" x2="${left}" y1="${topY}" y2="${botY}"/>`);
    if (both) {
      const mid = (topY + botY) / 2, x = left - 3, h = (botY - topY) / 2;
      out.push(`<path class="g brace" d="M${x} ${topY}C${x - 11} ${topY + h * .35} ${x + 3} ${mid - 10} ${x - 9} ${mid}C${x + 3} ${mid + 10} ${x - 11} ${botY - h * .35} ${x} ${botY}C${x - 8} ${botY - h * .35} ${x + 6} ${mid + 12} ${x - 6} ${mid}C${x + 6} ${mid - 12} ${x - 8} ${topY + h * .35} ${x} ${topY}Z"/>`);
    }
    // başlık
    const key = firstM.key;
    for (const staff of ['rh', 'lh']) {
      const y0 = stavesY[staff]; if (y0 == null) continue;
      const clef = firstM[staff]?.clef || (staff === 'rh' ? 'treble' : 'bass');
      let x = left + 6;
      out.push(drawClef(clef, x, y0));
      x += 30;
      x = drawKey(key, clef, x, y0, out);
      if (firstI === 0) drawTime(score.time, x + 2, y0, out);
    }
    if (si > 0 || firstI > 0 || score.barOffset) out.push(`<text class="mnum" x="${left + 2}" y="${topY - 8}">${firstI + 1 + score.barOffset}</text>`);
    let x = left + sys.header;
    sys.list.forEach(({ i, keyChange }, idx) => {
      const m = score.measures[i], it = items[i];
      if (keyChange) {
        for (const staff of ['rh', 'lh']) { const y0 = stavesY[staff]; if (y0 != null) drawKey(m.key, m[staff]?.clef || (staff === 'rh' ? 'treble' : 'bass'), x + 6, y0, out); }
        x += keyChange;
      }
      const w = it.w * stretch;
      const x0 = x;
      out.push(`<rect class="loopbg" data-m="${i}" x="${r1(x0)}" y="${topY - 3}" width="${r1(w)}" height="${botY - topY + 6}"/>`);
      let cum = (m.repeatStart ? 16 : 8) + (it.chg ? 22 : 0);
      const onsets = it.onsets.map(o => { const p = { t: o.t, x: x0 + cum * (stretch > 1 ? 1 : stretch) + 3 }; cum += o.w * stretch; return p; });
      const posRec = { i, sys: si, x0, w, onsets, top: topY, bot: botY, y: yStart, sysBottom };
      this.pos[i] = posRec;
      const clefChange = {};
      for (const staff of ['rh', 'lh']) {
        const y0 = stavesY[staff]; if (y0 == null || !m[staff]) continue;
        const prev = score.measures[i - 1]?.[staff]?.clef;
        if (idx > 0 && prev && prev !== m[staff].clef) { out.push(drawClef(m[staff].clef, x0 + 1, y0, 0.72)); clefChange[staff] = 1; }
        this.drawStaffMeasure(m, staff, y0, onsets, out, posRec, stavesY);
      }
      if (m.label) out.push(`<text class="barlabel" x="${r1(x0 + 8)}" y="${topY - 12}">${esc(m.label)}</text>`);
      m.chords.forEach(c => {
        const ox = interp(onsets, c.t, x0 + w);
        out.push(`<text class="chord" x="${r1(ox - 5)}" y="${topY - (aboveR > 44 ? aboveR - 16 : 28)}">${esc(c.sym)}</text>`);
      });
      x += w;
      // ölçü çizgisi
      const bx = x;
      if (m.repeatEnd) {
        out.push(dots(bx - 11, stavesY));
        out.push(`<line class="bl" x1="${r1(bx - 6)}" x2="${r1(bx - 6)}" y1="${topY}" y2="${botY}"/><rect class="bb" x="${r1(bx - 3)}" y="${topY}" width="3.4" height="${botY - topY}"/>`);
      } else if (i === score.measures.length - 1) {
        out.push(`<line class="bl" x1="${r1(bx - 5)}" x2="${r1(bx - 5)}" y1="${topY}" y2="${botY}"/><rect class="bb" x="${r1(bx - 2.4)}" y="${topY}" width="3.4" height="${botY - topY}"/>`);
      } else {
        out.push(`<line class="bl" x1="${r1(bx)}" x2="${r1(bx)}" y1="${topY}" y2="${botY}"/>`);
      }
      if (m.repeatStart) {
        out.push(`<rect class="bb" x="${r1(x0)}" y="${topY}" width="3.4" height="${botY - topY}"/><line class="bl" x1="${r1(x0 + 6)}" x2="${r1(x0 + 6)}" y1="${topY}" y2="${botY}"/>`);
        out.push(dots(x0 + 10, stavesY));
      }
      out.push(`<rect class="mh" data-m="${i}" x="${r1(x0)}" y="${topY - 12}" width="${r1(w)}" height="${botY - topY + 24}"/>`);
    });
    this.drawTies(sys, stavesY, out);
    return sysBottom + 18;
  }
  drawStaffMeasure(m, staff, y0, onsets, out, posRec, stavesY) {
    const st = m[staff], clef = st.clef, top = TOP_DIA[clef], opts = this.opts;
    const twoV = st.voices.length > 1;
    st.voices.forEach((v, vi) => {
      const forced = twoV ? (vi === 0 ? 'up' : 'down') : null;
      const groups = beamGroups(v, m.time, this.score.beats);
      const info = v.map(ev => {
        const x = interp(onsets, ev.t, 0);
        const ys = ev.notes.map(n => y0 + (top - n.dia) * HALF);
        return { ev, x, ys };
      });
      // sap yönü
      v.forEach((ev, ei) => {
        if (ev.rest) return;
        const avg = ev.notes.reduce((a, n) => a + n.dia, 0) / ev.notes.length;
        ev._up = forced ? forced === 'up' : avg < top - 4;
      });
      groups.forEach(g => {
        if (forced) return;
        const avg = g.reduce((a, i) => a + v[i].notes.reduce((b, n) => b + n.dia, 0) / v[i].notes.length, 0) / g.length;
        g.forEach(i => v[i]._up = avg < top - 4);
      });
      const beamed = new Set(); const stemEnds = new Map();
      groups.forEach(g => {
        if (g.length < 2) return;
        g.forEach(i => beamed.add(i));
        const up = v[g[0]]._up;
        const pts = g.map(i => {
          const a = info[i]; const anchor = up ? Math.min(...a.ys) : Math.max(...a.ys);
          return { i, x: a.x + (up ? 5.6 : -5.6), y: anchor };
        });
        const f = pts[0], l = pts[pts.length - 1];
        let slope = (l.y - f.y) / Math.max(1, l.x - f.x);
        slope = Math.max(-0.22, Math.min(0.22, slope)) * 0.7;
        const base = (pt) => pt.y + (up ? -34 : 34);
        let off = 0;
        pts.forEach(p => {
          const line = f.y + (up ? -34 : 34) + slope * (p.x - f.x);
          const diff = up ? line - base(p) : base(p) - line;
          if (diff > off) off = diff;
        });
        const lineY = (x) => f.y + (up ? -34 : 34) + slope * (x - f.x) + (up ? -off : off);
        pts.forEach(p => stemEnds.set(p.i, lineY(p.x)));
        const th = 4.6, dir = up ? 1 : -1;
        out.push(`<path class="beam b-${staff}" d="M${r1(f.x)} ${r1(lineY(f.x))}L${r1(l.x)} ${r1(lineY(l.x))}L${r1(l.x)} ${r1(lineY(l.x) + th * dir)}L${r1(f.x)} ${r1(lineY(f.x) + th * dir)}Z"/>`);
        // ikinci kiriş
        for (let k = 0; k < g.length - 1; k++) {
          const a = v[g[k]], b = v[g[k + 1]];
          if (flagCount(a.base) >= 2 && flagCount(b.base) >= 2) {
            const x1 = pts[k].x, x2 = pts[k + 1].x, d = 7 * dir;
            out.push(`<path class="beam b-${staff}" d="M${r1(x1)} ${r1(lineY(x1) + d)}L${r1(x2)} ${r1(lineY(x2) + d)}L${r1(x2)} ${r1(lineY(x2) + d + th * dir)}L${r1(x1)} ${r1(lineY(x1) + d + th * dir)}Z"/>`);
          } else if (flagCount(a.base) >= 2 && (k === 0 || flagCount(v[g[k - 1]].base) < 2)) {
            const x1 = pts[k].x, x2 = x1 + 7, d = 7 * dir;
            out.push(`<path class="beam b-${staff}" d="M${r1(x1)} ${r1(lineY(x1) + d)}L${r1(x2)} ${r1(lineY(x2) + d)}L${r1(x2)} ${r1(lineY(x2) + d + th * dir)}L${r1(x1)} ${r1(lineY(x1) + d + th * dir)}Z"/>`);
          } else if (flagCount(b.base) >= 2 && k === g.length - 2) {
            const x2 = pts[k + 1].x, x1 = x2 - 7, d = 7 * dir;
            out.push(`<path class="beam b-${staff}" d="M${r1(x1)} ${r1(lineY(x1) + d)}L${r1(x2)} ${r1(lineY(x2) + d)}L${r1(x2)} ${r1(lineY(x2) + d + th * dir)}L${r1(x1)} ${r1(lineY(x1) + d + th * dir)}Z"/>`);
          }
        }
        if (g.every(i => v[i].triplet)) {
          const mx = (f.x + l.x) / 2, yy = lineY(mx) + (up ? -6 : 13);
          out.push(`<text class="tup" x="${r1(mx)}" y="${r1(yy)}">3</text>`);
        }
      });
      v.forEach((ev, ei) => {
        const a = info[ei]; const k = `${m.i}:${staff}:${vi}:${ei}`; ev.key = k;
        ev._x = a.x; ev._ys = a.ys; ev._sys = posRec.sys;
        if (ev.rest) { out.push(drawRest(ev, a.x, y0, m, twoV, vi)); return; }
        const up = ev._up, parts = [];
        // nota başları: yan yana ikilik kaydırması
        const order = ev.notes.map((n, i) => ({ n, i })).sort((p, q) => up ? p.n.dia - q.n.dia : q.n.dia - p.n.dia);
        let lastDia = null, lastShift = false;
        const shifts = new Map();
        order.forEach(({ n, i }) => {
          const sh = lastDia !== null && Math.abs(n.dia - lastDia) === 1 && !lastShift;
          shifts.set(i, sh); lastShift = sh; lastDia = n.dia;
        });
        ev.notes.forEach((n, i) => {
          const y = a.ys[i];
          const hx = a.x + (shifts.get(i) ? (up ? 11.6 : -11.6) : 0);
          parts.push(ledger(y0, y, hx));
          parts.push(head(hx, y, ev.base));
          if (n.showAcc != null) parts.push(accidental(n.showAcc, a.x - 10.5 - accOffset(ev, i), y));
          const dots = (ev.base.match(/\./g) || []).length;
          for (let d = 0; d < dots; d++) {
            const dy = (n.dia + 100) % 2 === (top + 100) % 2 ? -HALF : 0;
            parts.push(`<circle class="n" cx="${r1(hx + 10 + d * 5)}" cy="${y + dy}" r="1.7"/>`);
          }
        });
        // sap
        const hasS = !noStem(ev);
        const anchorFar = up ? Math.max(...a.ys) : Math.min(...a.ys);
        const anchorNear = up ? Math.min(...a.ys) : Math.max(...a.ys);
        let endY = stemEnds.get(ei);
        if (endY === undefined) endY = anchorNear + (up ? -34 : 34);
        if (up && endY > y0 + 20 && (Math.min(...a.ys) > y0 + 40)) endY = y0 + 20;
        if (!up && endY < y0 + 20 && (Math.max(...a.ys) < y0)) endY = y0 + 20;
        const sx = a.x + (up ? 5.6 : -5.6);
        if (hasS) parts.push(`<line class="stem" x1="${r1(sx)}" x2="${r1(sx)}" y1="${r1(anchorFar)}" y2="${r1(endY)}"/>`);
        const fc = flagCount(ev.base);
        if (hasS && fc && !beamed.has(ei)) {
          for (let f = 0; f < fc; f++) {
            const fy = endY + (up ? f * 8 : -f * 8), s = up ? 1 : -1;
            parts.push(`<path class="n" d="M${r1(sx)} ${r1(fy)}c1 ${r1(7 * s)} 11 ${r1(10 * s)} 7.5 ${r1(22 * s)}c1.4 ${r1(-9 * s)} -5.5 ${r1(-13 * s)} -7.5 ${r1(-15 * s)}Z"/>`);
          }
        }
        const noteTop = Math.min(...a.ys), noteBot = Math.max(...a.ys);
        let upper = Math.min(noteTop, hasS && up ? endY : noteTop);
        let lower = Math.max(noteBot, hasS && !up ? endY : noteBot);
        if (ev.stac) {
          const yy = up ? noteBot + 10 : noteTop - 10;
          parts.push(`<circle class="n" cx="${r1(a.x)}" cy="${r1(yy)}" r="1.9"/>`);
          if (up) lower = Math.max(lower, yy); else upper = Math.min(upper, yy);
        }
        if (ev.accent) {
          const yy = up ? noteBot + 12 : noteTop - 12;
          parts.push(`<path class="acc" d="M${r1(a.x - 5)} ${r1(yy - 3)}L${r1(a.x + 5)} ${r1(yy)}L${r1(a.x - 5)} ${r1(yy + 3)}"/>`);
        }
        if (ev.orn) {
          const yy = Math.min(upper, y0) - 7, xx = a.x;
          if (ev.orn === 't') parts.push(`<text class="orn" x="${r1(xx)}" y="${r1(yy)}">tr</text>`);
          else {
            const b = `M${r1(xx - 9)} ${r1(yy)}l3 -4 3 4 3 -4 3 4 3 -4`;
            parts.push(`<path class="zig" d="${b}"/>` + (ev.orn === 'm' ? `<line class="stem" x1="${r1(xx)}" x2="${r1(xx)}" y1="${r1(yy - 7)}" y2="${r1(yy + 3)}"/>` : ''));
          }
          upper = Math.min(upper, yy - 8);
        }
        const prevEv = v.slice(0, ei).reverse().find(x => !x.rest);
        const sameAsPrev = prevEv && ev.notes.length > 1 && prevEv.notes.map(n => n.midi + ':' + n.finger).join() === ev.notes.map(n => n.midi + ':' + n.finger).join();
        if (opts.showFingers && !sameAsPrev && ev.notes.some(n => n.finger)) {
          const list = [...ev.notes].filter(n => n.finger);
          if (staff === 'rh') {
            let yy = Math.min(upper - 8, y0 - 4);
            list.sort((p, q) => p.midi - q.midi).forEach(n => { parts.push(`<text class="fg" x="${r1(a.x)}" y="${r1(yy)}">${n.finger}</text>`); yy -= 10; });
          } else {
            let yy = Math.max(lower + 14, y0 + STAFF_H + 12);
            list.sort((p, q) => q.midi - p.midi).forEach(n => { parts.push(`<text class="fg" x="${r1(a.x)}" y="${r1(yy)}">${n.finger}</text>`); yy += 10; });
          }
        }
        if (opts.showNames) {
          const baseY = staff === 'rh' ? (y0 + STAFF_H + Math.max(0, Math.max(...a.ys) - y0 - STAFF_H) + 12) : Math.max(lower, y0 + STAFF_H) + (opts.showFingers ? 24 : 12);
          const nm = [...ev.notes].sort((p, q) => q.midi - p.midi).map(n => SOLFEGE[n.step]);
          nm.forEach((t, j) => parts.push(`<text class="nm" x="${r1(a.x)}" y="${r1(baseY + j * 9)}">${t}</text>`));
        }
        if (vi === 0 && m.lyrics && m.lyrics[ei] && (staff === 'rh' || !m.rh)) {
          const baseY = y0 + STAFF_H + Math.max(0, Math.max(...a.ys) - y0 - STAFF_H) + (opts.showNames ? 26 : 14) + (ev.stac && up ? 7 : 0);
          parts.push(`<text class="ly" x="${r1(a.x)}" y="${r1(baseY)}">${esc(m.lyrics[ei])}</text>`);
        }
        out.push(`<g class="ev ${staff}" data-k="${k}" data-m="${m.i}">${parts.join('')}</g>`);
      });
    });
  }
  drawTies(sys, stavesY, out) {
    const { score } = this;
    for (const { i } of sys.list) {
      const m = score.measures[i];
      for (const staff of ['rh', 'lh']) {
        const st = m[staff]; if (!st) continue;
        st.voices.forEach((v, vi) => v.forEach((ev, ei) => {
          if (ev.rest) return;
          ev.notes.forEach((n, ni) => {
            if (!n.tie) return;
            const nx = v[ei + 1] || score.measures[i + 1]?.[staff]?.voices[vi]?.[0];
            if (!nx || nx._x === undefined) return;
            const up = !ev._up;
            const sameSys = nx._sys === ev._sys;
            const x1 = ev._x + 8, x2 = sameSys ? nx._x - 8 : x1 + 22, y = ev._ys[ni] + (up ? -6 : 6);
            const c = (up ? -1 : 1) * Math.min(9, 4 + (x2 - x1) * 0.08);
            out.push(`<path class="tie" d="M${r1(x1)} ${r1(y)}Q${r1((x1 + x2) / 2)} ${r1(y + c * 1.7)} ${r1(x2)} ${r1(y)}Q${r1((x1 + x2) / 2)} ${r1(y + c * 1.25)} ${r1(x1)} ${r1(y)}Z"/>`);
          });
        }));
      }
    }
    // legato yayları
    for (const staff of ['rh', 'lh']) {
      let open = null;
      for (const { i } of sys.list) {
        const st = score.measures[i][staff]; if (!st) continue;
        st.voices[0].forEach(ev => {
          if (ev.slurStart) open = ev;
          if (ev.slurEnd && open && open._x !== undefined) {
            const above = !open._up;
            const ya = above ? Math.min(...open._ys) - 9 : Math.max(...open._ys) + 9;
            const yb = above ? Math.min(...ev._ys) - 9 : Math.max(...ev._ys) + 9;
            const x1 = open._x, x2 = ev._x, s = above ? -1 : 1, lift = Math.min(16, 7 + (x2 - x1) * 0.05);
            const peak = (above ? Math.min(ya, yb) : Math.max(ya, yb)) + s * lift;
            out.push(`<path class="tie" d="M${r1(x1)} ${r1(ya)}Q${r1((x1 + x2) / 2)} ${r1(peak)} ${r1(x2)} ${r1(yb)}Q${r1((x1 + x2) / 2)} ${r1(peak - s * 2.4)} ${r1(x1)} ${r1(ya)}Z"/>`);
            open = null;
          }
        });
      }
    }
  }
  setActive(keys) {
    if (this._act) this._act.forEach(g => g.classList.remove('on'));
    const now = [];
    keys.forEach(k => (this.evMap.get(k) || []).forEach(g => { g.classList.add('on'); now.push(g); }));
    this._act = now;
  }
  markResult(key, cls) { (this.evMap.get(key) || []).forEach(g => g.classList.add(cls)); }
  clearMark(key) { (this.evMap.get(key) || []).forEach(g => g.classList.remove('good', 'bad')); }
  clearMarks() { this.svg.querySelectorAll('.good,.bad').forEach(g => g.classList.remove('good', 'bad')); }
  setCursor(mi, t) {
    const p = this.pos[mi]; if (!p) { this.cursor.setAttribute('x', -20); return; }
    let x = interp(p.onsets, t, p.x0 + p.w - 2);
    this.cursor.setAttribute('x', r1(x - 6));
    this.cursor.setAttribute('width', 14);
    this.cursor.setAttribute('y', p.top - 6);
    this.cursor.setAttribute('height', p.bot - p.top + 12);
    return p;
  }
  setLoop(a, b) {
    this.loopEls.forEach(el => {
      const m = +el.dataset.m;
      el.classList.toggle('in', a != null && m >= a && m <= b);
    });
  }
}

function interp(onsets, t, endX) {
  if (!onsets.length) return endX;
  for (let i = 0; i < onsets.length; i++) {
    const o = onsets[i];
    if (Math.abs(o.t - t) < 1e-3) return o.x;
    if (o.t > t) {
      if (i === 0) return o.x;
      const p = onsets[i - 1]; return p.x + (o.x - p.x) * (t - p.t) / (o.t - p.t);
    }
  }
  const l = onsets[onsets.length - 1];
  if (endX) return l.x + (endX - l.x) * Math.min(1, (t - l.t) / 1);
  return l.x;
}
function prepareAccidentals(score) {
  let keyPrev = null;
  score.measures.forEach((m, mi) => {
    for (const staff of ['rh', 'lh']) {
      const st = m[staff]; if (!st) continue;
      const state = new Map();
      const evs = [];
      st.voices.forEach(v => v.forEach(e => evs.push(e)));
      evs.sort((a, b) => a.t - b.t);
      evs.forEach((e, idx) => {
        e.notes.forEach(n => {
          n.showAcc = null;
          if (n.tiedFrom) return;
          const expect = state.has(n.dia) ? state.get(n.dia) : keyAlter(m.key, n.step);
          if (n.alter !== expect) { n.showAcc = n.alter; state.set(n.dia, n.alter); }
        });
      });
    }
  });
  // bağlı notada yeni ölçüde işaret tekrar etmesin
  score.measures.forEach((m, mi) => {
    for (const staff of ['rh', 'lh']) {
      const st = m[staff]; if (!st) continue;
      st.voices.forEach((v, vi) => v.forEach((ev, ei) => ev.notes.forEach(n => {
        if (!n.tie) return;
        const nx = v[ei + 1] || score.measures[mi + 1]?.[staff]?.voices[vi]?.[0];
        const t = nx?.notes.find(x => x.midi === n.midi);
        if (t && nx !== ev) { t.tiedFrom = true; if (nx.t === 0 || nx.notes) t.showAcc = null; }
      })));
    }
  });
}
function accOffset(ev, i) {
  // akorda işaretler çakışmasın
  const withA = ev.notes.map((n, j) => ({ n, j })).filter(x => x.n.showAcc != null).sort((a, b) => b.n.dia - a.n.dia);
  const idx = withA.findIndex(x => x.j === i);
  if (idx <= 0) return 0;
  return (withA[idx - 1].n.dia - withA[idx].n.dia < 6) ? 9 * (idx % 2) : 0;
}
function accidental(a, x, y) {
  if (a === 0) return glyph('natural', x - 2, y + 12.6, 25, 'n');
  if (a === 1) return glyph('sharp', x - 3.2, y + 12.5, 25, 'n');
  if (a === -1) return glyph('flat', x - 2, y + 5.2, 22.5, 'n');
  if (a === 2) return `<text class="n ax" x="${x}" y="${y + 4}">×</text>`;
  return glyph('flat', x - 8, y + 5.2, 22.5, 'n') + glyph('flat', x - 2, y + 5.2, 22.5, 'n');
}
function ledger(y0, y, x) {
  let s = '';
  const line = (yy) => `<line class="ledger" x1="${r1(x - 9.5)}" x2="${r1(x + 9.5)}" y1="${yy}" y2="${yy}"/>`;
  for (let yy = y0 - SP; yy >= y - 0.1; yy -= SP) s += line(yy);
  for (let yy = y0 + STAFF_H + SP; yy <= y + 0.1; yy += SP) s += line(yy);
  return s;
}
function drawClef(clef, x, y0, sc = 1) {
  if (clef === 'treble') return glyph('gClef', x, y0 + 40 + 16 - (1 - sc) * 18, 74 * sc);
  return glyph('fClef', x, y0 + 32 * (sc === 1 ? 1 : .9), 33 * sc);
}
function drawKey(fifths, clef, x, y0, out) {
  const positions = keySigPositions(fifths);
  const dias = fifths > 0 ? [38, 35, 39, 36, 33, 37, 34] : [34, 37, 33, 36, 32, 35, 31];
  const shift = clef === 'bass' ? 14 : 0;
  positions.forEach((_, i) => {
    const y = y0 + (TOP_DIA[clef] - (dias[i] - shift)) * HALF;
    out.push(accidental(fifths > 0 ? 1 : -1, x + i * 9 + 3, y));
  });
  return x + positions.length * 9;
}
function drawTime(time, x, y0, out) {
  const put = (num, yBottom) => {
    const digits = String(num).split('');
    let w = digits.reduce((a, d) => a + glyphW(d, 18.5), 0) + (digits.length - 1) * 1.5;
    let cx = x + 10 - w / 2;
    digits.forEach(d => { out.push(glyph(d, cx, yBottom, 18.5)); cx += glyphW(d, 18.5) + 1.5; });
  };
  put(time[0], y0 + 19.5); put(time[1], y0 + 39.5);
}
function drawRest(ev, x, y0, m, twoV, vi) {
  const off = twoV ? (vi === 0 ? -10 : 10) : 0;
  const b = ev.base.replace(/\./g, '');
  let s = '';
  const full = Math.abs(ev.d - m.len) < 1e-6;
  if (b === '1' || (full && b === '2')) s = `<rect class="n" x="${r1(x - 6)}" y="${y0 + 10 + off}" width="13" height="5"/>`;
  else if (b === '2') s = `<rect class="n" x="${r1(x - 6)}" y="${y0 + 15 + off}" width="13" height="5"/>`;
  else if (b === '4') s = glyph('qRest', x - 5, y0 + 35 + off, 30, 'n');
  else if (b === '8' || b === '12') s = glyph('eRest', x - 4, y0 + 28 + off, 16, 'n');
  else s = glyph('sRest', x - 4, y0 + 33 + off, 26, 'n');
  const dots = (ev.base.match(/\./g) || []).length;
  for (let d = 0; d < dots; d++) s += `<circle class="n" cx="${r1(x + 12 + d * 5)}" cy="${y0 + 15 + off}" r="1.7"/>`;
  return `<g class="rest">${s}</g>`;
}
function dots(x, stavesY) {
  let s = '';
  for (const k of ['rh', 'lh']) {
    const y0 = stavesY[k]; if (y0 == null) continue;
    s += `<circle class="g" cx="${r1(x)}" cy="${y0 + 15}" r="2.1"/><circle class="g" cx="${r1(x)}" cy="${y0 + 25}" r="2.1"/>`;
  }
  return s;
}
function beamGroups(v, time, beats) {
  const sixteenth = v.some(e => e.base.startsWith('16') || e.base.startsWith('32'));
  const grid = beatGrid(time, sixteenth, beats);
  const groups = []; let cur = [], gi = 0, boundary = grid[0];
  const flush = () => { if (cur.length) groups.push(cur); cur = []; };
  v.forEach((e, i) => {
    while (e.t >= boundary - 1e-6 && gi < grid.length - 1) { flush(); gi++; boundary += grid[gi]; }
    if (isShort(e)) cur.push(i); else flush();
  });
  flush();
  return groups;
}

// Kartlar gibi tek nota çizimleri için parçalar
export const PARTS = { glyph, head, ledger, accidental, drawClef, SP, HALF, TOP_DIA };
