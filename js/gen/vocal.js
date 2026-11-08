// Şan alıştırmalarını istenen ses aralığında, yarım ton yürüyerek üretir
import { scaleDegree, makePitch, pitchStr, addInterval, MAJOR_FIFTHS_BY_PC, MINOR_FIFTHS_BY_PC, tonicPitch, keyLetter, parsePitch } from '../notation/theory.js';

export const VOICES = {
  soprano: { name: 'Soprano', low: 'c4', high: 'a5' },
  mezzo: { name: 'Mezzosoprano', low: 'a3', high: 'f#5' },
  alto: { name: 'Alto', low: 'f3', high: 'e5' },
  tenor: { name: 'Tenor', low: 'c3', high: 'g4' },
  bariton: { name: 'Bariton', low: 'a2', high: 'f4' },
  bas: { name: 'Bas', low: 'f2', high: 'd4' },
};

// d: derece, q: süre (çeyrek), s: stakato, y: hece
const X = (deg, dur, opt = {}) => deg.map((d, i) => ({ d, q: Array.isArray(dur) ? dur[i] : dur, ...opt }));
export const EXERCISES = {
  mirilti: { name: 'Üçlü mırıltı', why: 'Sesi yormadan açar. Ağız kapalı, ince bir mırıltı.', syl: 'mm', tempo: 76, fingers: { 1: 1, 2: 2, 3: 3 }, notes: [...X([1, 2, 3, 2], 1), { d: 1, q: 4 }] },
  besli: { name: 'Beşli legato', why: 'Bağlı söyleyiş ve eşit hava akışı.', syl: 'mi-e-a-o-u', tempo: 84, fingers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, legato: true, notes: [...X([1, 2, 3, 4, 5, 4, 3, 2], 0.5), { d: 1, q: 4 }] },
  stakato5: { name: 'Beşli stakato', why: 'Diyafram atakları: her nota kısa ve ayrı, boğaz serbest.', syl: 'ha', tempo: 72, fingers: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }, notes: [...X([1, 2, 3, 4, 5, 4, 3, 2], 1, { s: true }), { d: 1, q: 1, s: true }, { r: 1, q: 3 }] },
  arpejStak: { name: 'Stakato arpej', why: 'Sıçramada ses yerini korur; atak hep hafif.', syl: 'hi / ha', tempo: 72, fingers: { 1: 1, 3: 2, 5: 3, 8: 5 }, notes: [...X([1, 3, 5, 8, 5, 3], 1, { s: true }), { d: 1, q: 1, s: true }, { r: 1, q: 1 }] },
  legatoStak: { name: 'Önce bağlı, sonra kısa', why: 'Aynı ezgiyi önce legato, sonra stakato söyle; ses yeri değişmesin.', syl: 'ni', tempo: 76, fingers: { 1: 1, 3: 2, 5: 3, 8: 5 }, legato: 'first', notes: [...X([1, 3, 5, 8, 5, 3, 1], [1, 1, 1, 1, 1, 1, 2]), ...X([1, 3, 5, 8, 5, 3], 1, { s: true }), { d: 1, q: 1, s: true }, { r: 1, q: 1 }] },
  oktav: { name: 'Oktav ve iniş', why: 'Üst sesi yukarıdan alma alışkanlığı; inişte destek bırakılmaz.', syl: 'ya-a', tempo: 72, fingers: { 1: 1, 8: 5 }, legato: true, notes: [{ d: 1, q: 2 }, { d: 8, q: 2 }, ...X([7, 6, 5, 4, 3, 2], 0.5), { d: 1, q: 1 }] },
  arpejLegato: { name: 'Bağlı arpej', why: 'Geniş aralıkta tek çizgi.', syl: 'la', tempo: 72, fingers: { 1: 1, 3: 2, 5: 3, 8: 5 }, legato: true, notes: [...X([1, 3, 5, 8], 1), ...X([5, 3], 1), { d: 1, q: 2 }] },
  dokuzlu: { name: 'Dokuzlu çeviklik', why: 'Çeviklik için yavaş başla; her nota duyulsun.', syl: 'a', tempo: 56, fingers: {}, legato: true, notes: [...X([1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2], 0.25), { d: 1, q: 4 }] },
  messa: { name: 'Messa di voce', why: 'Tek notada piyanodan forteye, tekrar piyanoya. Nefes kontrolü.', syl: 'a', tempo: 60, fingers: { 5: 3 }, notes: [{ d: 5, q: 4, tie: true }, { d: 5, q: 4 }] },
};
export const STYLES = {
  melodi: { name: 'Sadece ezgi' },
  bas: { name: 'Ezgi ve bas' },
  akor: { name: 'Ezgi ve sol el akor' },
  ogretmen: { name: 'Akor eşliği (ezgisiz)' },
};

const TOK = [[4, '1'], [3, '2.'], [2, '2'], [1.5, '4.'], [1, '4'], [0.75, '8.'], [0.5, '8'], [0.25, '16']];
function splitDur(d) { const o = []; let r = d; while (r > 1e-6) { const f = TOK.find(([v]) => v <= r + 1e-6); o.push(f[1]); r -= f[0]; } return o; }

function tonicList(lowStr, highStr, ex, dir) {
  const low = parsePitch(lowStr).midi, high = parsePitch(highStr).midi;
  const span = Math.max(...ex.notes.filter(n => n.d).map(n => scaleSemi(n.d)));
  const list = [];
  for (let m = low; m + span <= high; m++) list.push(m);
  if (!list.length) list.push(low);
  if (dir === 'updown') return [...list, ...list.slice(0, -1).reverse()];
  if (dir === 'down') return [...list].reverse();
  return list;
}
function scaleSemi(d) { const S = [0, 2, 4, 5, 7, 9, 11]; const i = d - 1; return S[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7); }

export function vocalScore({ ex: exId, voice = 'tenor', low, high, dir = 'up', style = 'akor', tempo, mode = 'major', maxKeys = 0, transition = true, singleKey = null }) {
  const ex = EXERCISES[exId];
  const v = VOICES[voice];
  const lo = low || v.low, hi = high || v.high;
  let tonics = singleKey != null ? [singleKey] : tonicList(lo, hi, ex, dir);
  if (maxKeys) tonics = tonics.slice(0, maxKeys);
  const totalQ = ex.notes.reduce((a, n) => a + n.q, 0), barCount = Math.ceil(totalQ / 4 - 1e-6);
  const rh = [], lh = [], keys = [], lyrics = [], chords = [], labels = [];
  const octaveUp = parsePitch(lo).midi < 53; // erkek sesleri nota üzerinde bir oktav yukarı
  tonics.forEach((tm, ti) => {
    const pc = ((tm % 12) + 12) % 12;
    const fifths = mode === 'minor' ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc];
    const scaleName = mode === 'minor' ? 'minor' : 'major';
    const shown = tm + (octaveUp ? 12 : 0);
    const oct = Math.floor(shown / 12) - 1;
    let tonic = tonicPitch(fifths, mode, oct);
    while (tonic.midi < shown) tonic = addInterval(tonic, 7, 12);
    while (tonic.midi > shown) tonic = addInterval(tonic, -7, -12);
    // gerekirse geçiş ölçüsü: yeni tonun dominantı
    const lhRoot = makeBass(tonic);
    const triad = [1, 3, 5].map(d => scaleDegree(tonic, scaleName, d));
    const symbol = keyLetter(fifths, mode);
    if (ti > 0 && transition) {
      const dom = scaleDegree(lhRoot, mode === 'minor' ? 'harmonic' : 'major', 5);
      const domBass = dom.midi > 50 ? addInterval(dom, -7, -12) : dom;
      const domTones = [scaleDegree(tonic, scaleName, 2), scaleDegree(tonic, mode === 'minor' ? 'harmonic' : 'major', 7), scaleDegree(tonic, scaleName, 5)].map(p => {
        let q = p; while (q.midi < tonic.midi - 7) q = addInterval(q, 7, 12); while (q.midi > tonic.midi + 9) q = addInterval(q, -7, -12); return q;
      }).sort((a, b) => a.midi - b.midi);
      rh.push(`<${domTones.map(pitchStr).join(' ')}>:2 r:2`);
      lh.push(`${pitchStr(domBass)}:2 r:2`);
      keys.push(fifths); lyrics.push(null); chords.push([[0, keyLetter(fifths, mode).replace('m', '') && domSym(dom, mode)]]); labels.push('hazırlık');
    }
    // ezgiyi ölçülere böl
    let t = 0; let bar = [], barIdx = 0; const barsR = [], lyr = []; let curLyr = [];
    ex.notes.forEach((n, ni) => {
      let remain = n.q; let first = true;
      while (remain > 1e-6) {
        const room = 4 - t, part = Math.min(room, remain), toks = splitDur(part);
        toks.forEach((tk, ti2) => {
          if (n.r) { bar.push('r:' + tk); curLyr.push(''); }
          else {
            const p = scaleDegree(tonic, scaleName, n.d);
            const f = first && ex.fingers?.[n.d] ? '_' + ex.fingers[n.d] : '';
            const legatoNow = ex.legato === true || (ex.legato === 'first' && ni < 7);
            const sl = legatoNow && ni === 0 && first ? '(' : (legatoNow && ni === lastLegato(ex) && remain - part < 1e-6 && ti2 === toks.length - 1 ? ')' : '');
            const tieOn = (ti2 < toks.length - 1 || remain - part > 1e-6 || n.tie) ? '~' : '';
            bar.push(`${pitchStr(p)}:${tk}${f}${n.s ? '!' : ''}${sl}${tieOn}`);
            curLyr.push(first ? syl(ex, ni) : '');
          }
          first = false;
        });
        remain -= part; t += part;
        if (t >= 4 - 1e-6) { barsR.push(bar.join(' ')); lyr.push(curLyr); bar = []; curLyr = []; t = 0; barIdx++; }
      }
    });
    if (t > 1e-6) { let left = 4 - t; splitDur(left).forEach(k => bar.push('r:' + k)); barsR.push(bar.join(' ')); lyr.push(curLyr); }
    const lhBars = accompLH(style, lhRoot, triad, scaleName, barsR.length);
    barsR.forEach((b, bi) => {
      let rhBar = b;
      if (style === 'ogretmen') rhBar = bi === 0 ? chordOn(triad, tonic, '2') + ' r:2' : (bi === barsR.length - 1 ? chordOn(triad, tonic, '2') + ' r:2' : 'r:1');
      rh.push(rhBar); lh.push(lhBars[bi]);
      keys.push(fifths); lyrics.push(style === 'ogretmen' ? null : lyr[bi]);
      chords.push(bi === 0 ? [[0, symbol]] : []);
      labels.push(null);
    });
  });
  return {
    title: ex.name, key: keys[0], keys, time: [4, 4], tempo: tempo || ex.tempo, rh, lh: style === 'melodi' ? undefined : lh, lyrics, chords,
    octaveUp, barLabels: labels.some(Boolean) ? labels : null, tonics,
  };
}
function lastLegato(ex) { if (ex.legato === 'first') return 6; let i = ex.notes.length - 1; while (i > 0 && ex.notes[i].r) i--; return i; }
function syl(ex, ni) {
  const list = ex.syl.split(/[-/ ]+/).filter(Boolean);
  if (list.length === 1) return ni === 0 || ex.notes[ni].s ? list[0] : '';
  return list[Math.min(ni, list.length - 1)];
}
function makeBass(tonic) { let b = tonic; while (b.midi > 50) b = addInterval(b, -7, -12); while (b.midi < 38) b = addInterval(b, 7, 12); return b; }
function chordOn(triad, tonic, dur) { return `<${triad.map(pitchStr).join(' ')}>:${dur}`; }
function domSym(dom, mode) { const L = 'CDEFGAB'; return L[dom.step] + ({ 0: '', 1: '#', '-1': 'b' }[dom.alter] || '') + '7'; }
function accompLH(style, bass, triad, scale, bars) {
  const fifth = scaleDegree(bass, scale, 5), third = scaleDegree(bass, scale, 3);
  const out = [];
  for (let i = 0; i < bars; i++) {
    if (style === 'bas') out.push(`${pitchStr(bass)}:1_5`);
    else out.push(`<${pitchStr(bass)}_5 ${pitchStr(third)}_3 ${pitchStr(fifth)}_1>:1`);
  }
  return out;
}
export function describeVoiceRange(voice) { return VOICES[voice]; }
