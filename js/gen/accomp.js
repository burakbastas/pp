// Akor şemasından iki elli eşlik notası üretir
import { parseChord, chordTone, makePitch, pitchStr, addInterval, STEP_SEMI, romanToChord, tonicPitch, transposeChord, MAJOR_FIFTHS_BY_PC, MINOR_FIFTHS_BY_PC, keyLetter } from '../notation/theory.js';

const c8 = (arr) => arr.map((u, i) => [i * 0.5, 0.5, u]);
export const PATTERNS = {
  tam: { name: 'Tam nota', hint: 'Akor değişimini oturt. Sol el kök, sağ el üçlü.', time: [4, 4], lh: [[0, 4, 'r']], rh: [[0, 4, 'c']] },
  yarim: { name: 'Yarımlık', hint: 'İki vuruşta bir bas ve akor birlikte.', time: [4, 4], lh: [[0, 2, 'r'], [2, 2, 'r']], rh: [[0, 2, 'c'], [2, 2, 'c']] },
  balad: { name: 'Dörtlük balad', hint: 'Sol el tutar, sağ el her vuruşta akor.', time: [4, 4], lh: [[0, 4, 'r']], rh: [[0, 1, 'c'], [1, 1, 'c'], [2, 1, 'c'], [3, 1, 'c']] },
  kokbes: { name: 'Kök ve beşli', hint: 'Sol el 1. vuruşta kök, 3. vuruşta beşli.', time: [4, 4], lh: [[0, 2, 'r'], [2, 2, '5']], rh: [[0, 1, 'c'], [1, 1, 'c'], [2, 1, 'c'], [3, 1, 'c']] },
  pop8: { name: 'Sekizlik pop', hint: 'Sol elde oktav, sağ elde eşit sekizlikler. Bilek gevşek.', time: [4, 4], lh: [[0, 4, 'R']], rh: c8(['c', 'c', 'c', 'c', 'c', 'c', 'c', 'c']) },
  arpej: { name: 'Sol el arpej', hint: 'Sol el 1-5-8-5 dolaşır, sağ el akoru uzun tutar.', time: [4, 4], lh: c8(['r', '5', 'o', '5', 'r', '5', 'o', '5']), rh: [[0, 2, 'c'], [2, 2, 'c']] },
  senkop: { name: '3+3+2 senkop', hint: 'Say: 1-2-3, 1-2-3, 1-2. Vurgu ikinci akorun öne kaçmasında.', time: [4, 4], lh: [[0, 1.5, 'R'], [1.5, 1.5, 'r'], [3, 1, 'r']], rh: [[0, 1.5, 'c'], [1.5, 1.5, 'c'], [3, 1, 'c']] },
  kirik: { name: 'Kırık sağ el', hint: 'Sağ el akoru tek tek dağıtır; balad ve şarkı girişleri için.', time: [4, 4], lh: [[0, 2, 'r'], [2, 2, 'r']], rh: c8(['t1', 't2', 't3', 't2', 't1', 't2', 't3', 't2']) },
  alberti: { name: 'Alberti', hint: 'Klasik dönemin eşlik kalıbı: alt, üst, orta, üst.', time: [4, 4], lh: c8(['r', '5', '3', '5', 'r', '5', '3', '5']), rh: [[0, 2, 'c'], [2, 2, 'c']] },
  dumtek: { name: 'Düm-tek', hint: 'Sol el "düm", sağ el "tek". Sekizlik sayımla: düm tek, sus, tek, düm, sus, tek, sus.', time: [4, 4], lh: [[0, 1, 'r'], [2, 1, 'r']], rh: [[0.5, 0.5, 'c'], [1.5, 0.5, 'c'], [3, 0.5, 'c']] },
  vals: { name: 'Vals', hint: '1. vuruş bas, 2 ve 3 hafif akor.', time: [3, 4], lh: [[0, 1, 'r']], rh: [[1, 1, 'c'], [2, 1, 'c']] },
  balad68: { name: '6/8 balad', hint: 'İki büyük vuruş; sol el dalga gibi dolaşır.', time: [6, 8], lh: c8(['r', '5', 'o', '5', 'o', '5']), rh: [[0, 1.5, 'c'], [1.5, 1.5, 'c']] },
  aksak98: { name: '9/8 aksak', hint: 'Gruplar 2+2+2+3. Son grup uzun, say: bir-iki, bir-iki, bir-iki, bir-iki-üç.', time: [9, 8], beats: [1, 1, 1, 1.5], lh: [[0, 1, 'r'], [1, 1, '5'], [2, 1, 'r'], [3, 1.5, '5']], rh: [[0.5, 0.5, 'c'], [1.5, 0.5, 'c'], [2.5, 0.5, 'c'], [3.5, 0.5, 'c'], [4, 0.5, 'c']] },
};

export function parseChart(text) {
  const bad = [];
  const rows = text.replace(/\n+/g, ' | ').split('|').map(s => s.trim()).filter(Boolean);
  let bars = [];
  const hasBars = rows.length > 1;
  for (const row of rows) {
    const toks = row.split(/\s+/).filter(Boolean);
    if (!hasBars) { toks.forEach(t => bars.push([t])); continue; }
    bars.push(toks);
  }
  const result = [];
  let last = null;
  for (const b of bars) {
    if (b.length === 1 && b[0] === '%') { if (last) result.push(last); continue; }
    const chords = []; let prev = null;
    for (const t of b) {
      if (t === '.' || t === '-') { chords.push(prev); continue; }
      const c = parseChord(t);
      if (!c) { bad.push(t); continue; }
      chords.push(c); prev = c;
    }
    if (chords.length) { result.push(chords); last = chords; }
  }
  return { bars: result, bad };
}

const TOK = [[4, '1'], [3, '2.'], [2, '2'], [1.5, '4.'], [1, '4'], [0.75, '8.'], [0.5, '8'], [0.25, '16']];
function splitDur(d) {
  const out = []; let rest = d;
  while (rest > 1e-6) { const f = TOK.find(([v]) => v <= rest + 1e-6); if (!f) break; out.push(f[1]); rest -= f[0]; }
  return out;
}
function restTokens(from, d) {
  // susları vuruş sınırlarına böler
  const out = []; let t = from, left = d;
  while (left > 1e-6) {
    const toBeat = Math.ceil(t - 1e-6) - t;
    let chunk = toBeat > 1e-6 ? Math.min(toBeat, left) : Math.min(left, 1);
    if (toBeat <= 1e-6 && left >= 2 && Math.abs(t % 2) < 1e-6) chunk = left >= 4 && t === 0 ? 4 : 2;
    splitDur(chunk).forEach(x => out.push('r:' + x)); t += chunk; left -= chunk;
  }
  return out;
}

function nearestOct(step, alter, lo, hi) {
  for (let o = 0; o < 9; o++) { const p = makePitch(step, alter, o); if (p.midi >= lo && p.midi <= hi) return o; }
  return 3;
}
function chordMidis(notes) { return notes.map(n => n.midi); }
function voicings(chord, lo, hi) {
  // Aynı akorun aralık içindeki tüm çevrimleri
  const tones = chord.tones.length > 4 ? chord.tones.slice(0, 4) : chord.tones;
  const out = [], n = tones.length;
  for (let inv = 0; inv < n; inv++) {
    for (let oct = 2; oct <= 6; oct++) {
      const notes = []; let prevM = -1, shift = 0;
      for (let i = 0; i < n; i++) {
        const [d, s] = tones[(inv + i) % n];
        let p = chordTone(chord, d, s, oct + shift);
        while (p.midi <= prevM) { shift++; p = chordTone(chord, d, s, oct + shift); }
        notes.push(p); prevM = p.midi;
      }
      if (notes[0].midi >= lo && notes[notes.length - 1].midi <= hi && notes[notes.length - 1].midi - notes[0].midi <= 14) out.push(notes);
    }
  }
  return out;
}
function bestVoicing(chord, prev, center, lo, hi) {
  const vs = voicings(chord, lo, hi);
  let best = null, bs = 1e9;
  for (const v of vs) {
    const mids = chordMidis(v), avg = mids.reduce((a, b) => a + b, 0) / mids.length;
    let score = Math.abs(avg - center) * 0.6;
    if (prev) { score += mids.reduce((a, m) => a + Math.min(...prev.map(p => Math.abs(p - m))), 0) * 1.6; }
    if (score < bs) { bs = score; best = v; }
  }
  return best || vs[0];
}
function chordFingers(notes) {
  if (notes.length === 4) return [1, 2, 3, 5];
  if (notes.length === 2) return [1, 5];
  return notes[2].midi - notes[1].midi >= 5 ? [1, 2, 5] : [1, 3, 5];
}
export function chartToScore({ chart, pattern = 'tam', tempo = 72, key = 0, title = '', repeat = 1, voiceLead = true }) {
  const parsed = typeof chart === 'string' ? parseChart(chart) : chart;
  const P = PATTERNS[pattern];
  const barLen = P.time[0] * 4 / P.time[1];
  const rhBars = [], lhBars = [], chords = [];
  let prev = null;
  const bars = [];
  for (let r = 0; r < repeat; r++) bars.push(...parsed.bars);
  const tones = (c, u, ctx) => {
    if (u === 'c') return ctx.rhV;
    if (u[0] === 't') { const i = +u[1] - 1; return [ctx.rhV[Math.min(i, ctx.rhV.length - 1)]]; }
    const rootN = c.bass || c.root;
    const oct = nearestOct(rootN.step, rootN.alter, 38, 49);
    const root = makePitch(rootN.step, rootN.alter, oct);
    if (u === 'r') return [root];
    if (u === 'R') return [root, addInterval(root, 7, 12)];
    if (u === 'o') return [addInterval(root, 7, 12)];
    const base = makePitch(c.root.step, c.root.alter, nearestOct(c.root.step, c.root.alter, 38, 49));
    if (u === '5') { const f = c.tones.find(t => t[0] === 5) || [5, 7]; return [addInterval(base, 4, f[1])]; }
    if (u === '3') { const f = c.tones.find(t => t[0] === 3) || c.tones.find(t => t[0] === 2 || t[0] === 4) || [3, 4]; return [addInterval(base, f[0] - 1, f[1])]; }
    return [root];
  };
  for (const bar of bars) {
    const each = barLen / bar.length;
    const chordAt = (t) => bar[Math.min(bar.length - 1, Math.floor((t + 1e-6) / each))];
    const row = [];
    bar.forEach((c, i) => { if (c && (i === 0 || c !== bar[i - 1])) row.push([i * each, c.sym]); });
    chords.push(row);
    // akor başına sağ el konumu
    const rhVoicing = new Map();
    for (const c of bar) {
      if (!c || rhVoicing.has(c)) continue;
      const v = bestVoicing(c, voiceLead ? prev : null, 66, 55, 81);
      rhVoicing.set(c, v); prev = chordMidis(v);
    }
    for (const [hand, target] of [['rh', rhBars], ['lh', lhBars]]) {
      const evs = P[hand].map(([t, d, u]) => ({ t, d, u })).sort((a, b) => a.t - b.t);
      const out = []; let cur = 0;
      evs.forEach((e, i) => {
        const c = chordAt(e.t);
        if (!c) return;
        if (e.t > cur + 1e-6) out.push(...restTokens(cur, e.t - cur));
        const nextT = evs[i + 1]?.t ?? barLen;
        const change = Math.ceil((e.t + 1e-6) / each) * each;
        const end = Math.min(e.t + e.d, change, nextT, barLen);
        const dur = end - e.t;
        const notes = tones(c, e.u, { rhV: rhVoicing.get(c) });
        const fingers = hand === 'rh' ? (e.u === 'c' ? chordFingers(notes) : [{ t1: 1, t2: 2, t3: e.u === 't3' && notes[0] ? 3 : 3, t4: 5 }[e.u]]) : (e.u === 'R' ? [5, 1] : [{ r: 5, 5: 2, o: 1, 3: 3 }[e.u]]);
        const parts = splitDur(dur);
        parts.forEach((p, pi) => {
          const tie = pi < parts.length - 1 ? '~' : '';
          const body = notes.length > 1
            ? `<${notes.map((n, j) => pitchStr(n) + (pi === 0 && fingers[j] ? '_' + fingers[j] : '')).join(' ')}>:${p}${tie}`
            : `${pitchStr(notes[0])}:${p}${pi === 0 && fingers[0] ? '_' + fingers[0] : ''}${tie}`;
          out.push(body);
        });
        cur = end;
      });
      if (cur < barLen - 1e-6) out.push(...restTokens(cur, barLen - cur));
      target.push(out.join(' '));
    }
  }
  return { title, key, time: P.time, tempo, rh: rhBars, lh: lhBars, chords, beats: P.beats || null };
}

export function romanChart(numerals, fifths, mode = 'major') {
  const tonic = tonicPitch(fifths, mode, 4);
  return numerals.trim().split(/\s*\|\s*|\s+/).filter(Boolean).map(rn => romanToChord(rn, tonic, mode)).join(' | ');
}
export function transposeChart(text, semi, preferFlat) {
  const { bars, bad } = parseChart(text);
  if (bad.length) return text;
  return bars.map(b => b.map(c => c ? transposeChord(c, semi, preferFlat) : '.').join(' ')).join(' | ');
}
export const PROGRESSIONS = [
  { id: 'p1', name: 'I – V – vi – IV', mode: 'major', rn: 'I V vi IV', note: 'Popun en çok kullanılan dörtlüsü.' },
  { id: 'p2', name: 'I – vi – IV – V', mode: 'major', rn: 'I vi IV V', note: '50’ler dizisi; ballad ve doo-wop.' },
  { id: 'p3', name: 'vi – IV – I – V', mode: 'major', rn: 'vi IV I V', note: 'Aynı dörtlünün hüzünlü başlayan hali.' },
  { id: 'p4', name: 'I – IV – V – I', mode: 'major', rn: 'I IV V I', note: 'Temel kadans; her tonda ilk oturtulacak dizi.' },
  { id: 'p5', name: 'I – V/3 – vi – I/5 – IV', mode: 'major', rn: 'I V/3 vi I/5 IV V', note: 'Bas adım adım iner; çevrim kullanmayı öğretir.' },
  { id: 'p6', name: 'ii – V – I', mode: 'major', rn: 'ii7 V7 Imaj7 Imaj7', note: 'Caz ve şehir popunun iskeleti.' },
  { id: 'm1', name: 'i – iv – V – i', mode: 'minor', rn: 'i iv V i', note: 'Minör şarkıların temel kadansı.' },
  { id: 'm2', name: 'i – VI – VII – i', mode: 'minor', rn: 'i VI VII i', note: 'Rock ve pop minör döngüsü.' },
  { id: 'm3', name: 'i – VII – VI – V', mode: 'minor', rn: 'i VII VI V', note: 'İnen minör dizi (Endülüs kalıbı).' },
  { id: 'm4', name: 'i – iv – VII – III – VI – ii° – V – i', mode: 'minor', rn: 'i iv VII III VI ii° V i', note: 'Beşliler döngüsü; uzun nakaratlar için.' },
];
export function bestSignature(chartText) {
  const { bars } = parseChart(chartText);
  const c = bars[0]?.[0]; if (!c) return { fifths: 0, mode: 'major' };
  const pc = (STEP_SEMI[c.root.step] + c.root.alter + 12) % 12;
  const minor = /^m(?!aj)|dim/.test(c.q);
  return { fifths: minor ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc], mode: minor ? 'minor' : 'major', name: keyLetter(minor ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc], minor ? 'minor' : 'major') };
}

export function flatTarget(chartText, semi) {
  const { bars } = parseChart(chartText);
  const c = bars[0]?.[0]; if (!c) return false;
  const pc = (((STEP_SEMI[c.root.step] + c.root.alter + semi) % 12) + 12) % 12;
  const minor = /^m(?!aj)|dim/.test(c.q);
  return (minor ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc]) < 0;
}
