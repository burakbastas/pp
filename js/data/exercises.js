// Bu dosyadaki alıştırmalar bu uygulama için yazıldı ya da kamu malı ezgilere dayanır.
import { scaleDegree, makePitch, pitchStr, parsePitch, SCALE, addInterval, keyAlter } from '../notation/theory.js';
import { NOTES } from './notes.js';

const E = {};
const add = (id, d) => { E[id] = { id, time: [4, 4], key: 0, tempo: 66, ...d }; };

// --- Sol el / fa anahtarı
add('lh01', { title: 'Üç durak', lh: 'c3:2_5 f3:2_2 | c3:4_5 d3_4 e3_3 f3_2 | f3:2_2 c3:2_5 | c3:4_5 e3_3 f3_2 e3_3 | c3:1_5', tempo: 60 });
add('lh02', { title: 'Do konumunda yürüyüş', lh: 'c3:4_5 d3_4 e3_3 f3_2 | g3:2_1 f3:2_2 | e3:4_3 d3_4 c3:2_5 | e3:4_3 g3_1 f3:2_2 | d3:4_4 f3_2 e3:2_3 | c3:1_5', tempo: 66 });
add('lh03', { title: 'Neşeye Övgü, sol elde', lh: 'e3:4_3 e3 f3_2 g3_1 | g3 f3_2 e3_3 d3_4 | c3_5 c3 d3_4 e3_3 | e3:4._3 d3:8_4 d3:2 | e3:4_3 e3 f3_2 g3_1 | g3 f3_2 e3_3 d3_4 | c3_5 c3 d3_4 e3_3 | d3:4._4 c3:8_5 c3:2', tempo: 72 });
add('lh04', { title: 'Sol konumu: alt çizgiler', lh: 'g2:4_5 a2_4 b2_3 c3_2 | d3:2_1 c3:2_2 | b2:4_3 d3_1 c3:2_2 | a2:4_4 b2_3 g2:2_5 | d3:4_1 b2_3 c3_2 a2_4 | g2:1_5', key: 1, tempo: 66 });
add('lh05', { title: 'Au clair de la lune, sol elde', lh: 'g2:4_5 g2 g2 a2_4 | b2:2_3 a2:2_4 | g2:4_5 b2_3 a2_4 a2 | g2:1_5 | g2:4_5 g2 g2 a2_4 | b2:2_3 a2:2_4 | g2:4_5 b2_3 a2_4 a2 | g2:1_5', key: 1, tempo: 80 });
add('lh06', { title: 'Üçlü atlamaları oku', lh: 'c3:4_5 e3_3 d3_4 f3_2 | e3_3 g3_1 f3_2 d3_4 | c3_5 e3_3 g3_1 e3_3 | f3_2 d3_4 e3_3 c3_5 | d3_4 f3_2 e3_3 g3_1 | c3:1_5', tempo: 66 });
add('lh07', { title: 'Fa konumu', lh: 'f2:4_5 g2_4 a2_3 bb2_2 | c3:2_1 bb2:2_2 | a2:4_3 c3_1 bb2:2_2 | g2:4_4 a2_3 f2:2_5 | c3:4_1 a2_3 bb2_2 g2_4 | f2:1_5', key: -1, tempo: 66 });
add('lh08', { title: 'Konum değiştir', lh: 'c3:4_5 d3_4 e3_3 f3_2 | g3:2_1 r:2 | g2:4_5 a2_4 b2_3 c3_2 | d3:2_1 r:2 | f2:4_5 g2_4 a2_3 bb2_2 | c3:2_1 r:2 | c3:4_5 e3_3 g3_1 e3_3 | c3:1_5', tempo: 66 });
add('lh09', { title: 'Kök, beşli, oktav', lh: 'c3:4_5 g3_2 c4_1 g3_2 | f2:4_5 c3_2 f3_1 c3_2 | g2:4_5 d3_2 g3_1 d3_2 | c3:4_5 g3_2 c3:2_5 | a2:4_5 e3_2 a3_1 e3_2 | f2:4_5 c3_2 f3_1 c3_2 | g2:4_5 d3_2 g3_1 d3_2 | c3:1_5', tempo: 72 });
add('lh10', { title: 'Sol minörde bas yürüyüşü', lh: 'g3:4_1 f3_2 eb3_3 d3_4 | g2:2_5 d3:2_2 | eb3:4_3 d3_4 c3_5 d3_4 | g2:1_5 | bb2:4_5 c3_4 d3_3 eb3_2 | f3:2_1 bb2:2_5 | c3:4_5 d3_4 eb3_3 f#3_2 | g3:1_1', key: -2, tempo: 66 });

// --- İki el
add('bi01', { title: 'Paralel beş parmak', rh: 'c4:4_1 d4_2 e4_3 f4_4 | g4:2_5 f4:2_4 | e4:4_3 d4_2 c4:2_1 | e4:4_3 g4_5 f4:2_4 | d4:4_2 f4_4 e4:2_3 | c4:1_1', lh: 'c3:4_5 d3_4 e3_3 f3_2 | g3:2_1 f3:2_2 | e3:4_3 d3_4 c3:2_5 | e3:4_3 g3_1 f3:2_2 | d3:4_4 f3_2 e3:2_3 | c3:1_5', tempo: 66 });
add('bi02', { title: 'Zıt yön', rh: 'c4:4_1 d4_2 e4_3 f4_4 | g4:2_5 f4:2_4 | e4:4_3 d4_2 c4:2_1 | e4:4_3 d4_2 e4_3 f4_4 | g4:1_5', lh: 'g3:4_1 f3_2 e3_3 d3_4 | c3:2_5 d3:2_4 | e3:4_3 f3_2 g3:2_1 | e3:4_3 f3_2 e3_3 d3_4 | c3:1_5', tempo: 66 });
add('bi03', { title: 'Soru ve cevap', rh: 'c4:4_1 e4_3 g4_5 e4_3 | r:1 | d4:4_2 f4_4 e4_3 c4_1 | r:1 | g4:4_5 f4_4 e4_3 d4_2 | r:1 | e4:4_3 d4_2 c4:2_1 | r:1', lh: 'r:1 | c3:4_5 e3_3 g3_1 e3_3 | r:1 | d3:4_4 f3_2 e3_3 c3_5 | r:1 | g3:4_1 f3_2 e3_3 d3_4 | r:1 | e3:4_3 d3_4 c3:2_5', tempo: 72 });
add('bi04', { title: 'Biri tutar, biri yürür', rh: 'c4:4_1 d4_2 e4_3 f4_4 | g4:1_5 | e4:4_3 f4_4 g4_5 e4_3 | c4:1_1 | c4:1_1 | d4:1_2 | e4:2_3 d4:2_2 | c4:1_1', lh: 'c3:1_5 | c3:4_5 d3_4 e3_3 f3_2 | c3:1_5 | g3:2_1 e3:2_3 | c3:4_5 d3_4 e3_3 f3_2 | g3:4_1 f3_2 e3_3 d3_4 | e3:4_3 f3_2 g3_1 d3_4 | c3:1_5', tempo: 66 });
add('bi05', { title: 'Sağ bağlı, sol kısa', rh: 'c4:4_1( d4_2 e4_3 f4_4 | g4:2_5) f4:2_4( | e4:4_3 d4_2 c4:2_1) | e4:4_3( f4_4 g4_5 e4_3 | d4:4_2 f4_4 e4_3 d4_2 | c4:1_1)', lh: 'c3:4_5! g3_1! e3_3! g3_1! | c3_5! g3_1! e3_3! g3_1! | g2_5! d3_2! b2_3! d3_2! | c3_5! g3_1! e3_3! g3_1! | g2_5! d3_2! g2_5! d3_2! | c3:1_5', tempo: 66 });
add('bi06', { title: 'Sol bağlı, sağ kısa', rh: 'e4:4_3! g4_5! e4_3! g4_5! | f4_4! a4_5! f4_4! a4_5! | g4_3! b4_5! g4_3! b4_5! | c5:1_5', lh: 'c3:4_5( d3_4 e3_3 f3_2 | f2:2_5 a2:2_3 | g2:4_5 a2_4 b2_3 d3_1 | c3:1_2)', tempo: 66 });
add('bi07', { title: 'Sol dörtlük, sağ sekizlik', rh: 'c4:8_1 d4_2 e4_3 f4_4 g4_5 f4_4 e4_3 d4_2 | c4_1 e4_3 d4_2 f4_4 e4_3 g4_5 f4_4 d4_2 | c4:1_1', lh: 'c3:4_5 e3_3 g3_1 e3_3 | c3_5 g3_1 e3_3 g3_1 | c3:1_5', tempo: 60 });
add('bi08', { title: 'Sağ dörtlük, sol sekizlik', rh: 'c4:4_1 e4_3 g4_5 e4_3 | c4_1 g4_5 e4_3 g4_5 | c4:1_1', lh: 'c3:8_5 d3_4 e3_3 f3_2 g3_1 f3_2 e3_3 d3_4 | c3_5 e3_3 d3_4 f3_2 e3_3 g3_1 f3_2 d3_4 | c3:1_5', tempo: 60 });
add('bi09', { title: 'Vuruş arası: senkop hazırlığı', rh: 'r:8 e4:8_3 r:8 e4 r:8 e4 r:8 e4 | r:8 f4:8_4 r:8 f4 r:8 f4 r:8 f4 | r:8 d4:8_2 r:8 d4 r:8 d4 r:8 d4 | r:8 e4:8_3 r:8 e4 c4:2_1', lh: 'c3:4_5 g3_1 c3_5 g3_1 | f2:4_5 c3_2 f2_5 c3_2 | g2:4_5 d3_2 g2_5 d3_2 | c3:4_5 g3_1 c3:2_5', tempo: 60 });
add('bi10', { title: 'Küçük Alberti', rh: 'e4:2_3 g4:2_5 | f4:2_4 a4:2_5 | g4:4_4 f4_3 e4_2 d4_1 | c4:1_1', lh: 'c3:8_5 g3_1 e3_3 g3_1 c3_5 g3_1 e3_3 g3_1 | c3_5 a3_1 f3_3 a3_1 c3_5 a3_1 f3_3 a3_1 | b2_5 g3_1 d3_3 g3_1 b2_5 g3_1 d3_3 g3_1 | c3:1_5', tempo: 66 });

function scaleEx(id, title, tonicR, scale, fifths, fR, fL, tempo = 66) {
  const tR = parsePitch(tonicR), tL = addInterval(tR, -7, -12);
  const up = [1, 2, 3, 4, 5, 6, 7, 8], seq = [...up, ...[...up].reverse()];
  const mk = (ton, fs, hand) => {
    const toks = seq.map((d, i) => {
      const p = scaleDegree(ton, scale, d);
      const f = fs[d - 1]; return pitchStr(p) + ':4_' + f;
    });
    const bars = []; for (let i = 0; i < 16; i += 4) bars.push(toks.slice(i, i + 4).join(' '));
    return bars;
  };
  add(id, { title, key: fifths, rh: mk(tR, fR), lh: mk(tL, fL), tempo });
}
const R_C = [1, 2, 3, 1, 2, 3, 4, 5], L_C = [5, 4, 3, 2, 1, 3, 2, 1], R_F = [1, 2, 3, 4, 1, 2, 3, 4];
scaleEx('sc_c', 'Do majör dizi', 'c4', 'major', 0, R_C, L_C);
scaleEx('sc_g', 'Sol majör dizi', 'g4', 'major', 1, R_C, L_C);
scaleEx('sc_f', 'Fa majör dizi', 'f4', 'major', -1, R_F, L_C);
scaleEx('sc_am', 'La armonik minör dizi', 'a4', 'harmonic', 0, R_C, L_C);
scaleEx('sc_gm', 'Sol armonik minör dizi', 'g4', 'harmonic', -2, R_C, L_C);
scaleEx('sc_dm', 'Re armonik minör dizi', 'd4', 'harmonic', -1, R_C, L_C);

// Hanon No. 1 (1873, kamu malı) tek oktavlık sadeleştirme, sekizlik yazım
function hanon(id) {
  const asc = [0, 2, 3, 4, 5, 4, 3, 2], desc = [0, -2, -3, -4, -5, -4, -3, -2];
  const fRa = [1, 2, 3, 4, 5, 4, 3, 2], fRd = [5, 4, 3, 2, 1, 2, 3, 4], fLa = [5, 4, 3, 2, 1, 2, 3, 4], fLd = [1, 2, 3, 4, 5, 4, 3, 2];
  const build = (base, fA, fD) => {
    const bars = [], b = parsePitch(base);
    for (let g = 0; g < 7; g++) bars.push(asc.map((a, i) => { const p = dia(b.dia + g + a); return pitchStr(p) + ':8_' + fA[i]; }).join(' '));
    for (let g = 0; g < 7; g++) { const top = b.dia + 12 - g; bars.push(desc.map((a, i) => { const p = dia(top + a); return pitchStr(p) + ':8_' + fD[i]; }).join(' ')); }
    bars.push(pitchStr(dia(b.dia)) + ':1_' + fA[0]);
    return bars;
  };
  add(id, { title: 'Hanon 1 (tek oktav)', rh: build('c4', fRa, fRd), lh: build('c3', fLa, fLd), tempo: 60 });
}
function dia(d) { const o = Math.floor(d / 7), s = ((d % 7) + 7) % 7; return makePitch(s, 0, o); }
hanon('hanon1');

// --- Repertuvar
export const PIECES = {
  gm: { title: 'Menuet sol minör', composer: 'Christian Petzold (uzun süre Bach’a atfedildi), BWV Anh. 115', key: -2, time: [3, 4], tempo: 112, src: 'Mutopia 2015/08/21-76, kamu malı dizgi. Parmak numaraları bu uygulama için önerildi.' },
  gM: { title: 'Menuet Sol majör', composer: 'Christian Petzold, BWV Anh. 114', key: 1, time: [3, 4], tempo: 116, src: 'Mutopia 2017/01/19-75, kamu malı dizgi. Parmak numaraları bu uygulama için önerildi.' },
  a116: { title: 'Menuet Sol majör', composer: 'Anonim, Anna Magdalena Defteri, BWV Anh. 116', key: 1, time: [3, 4], tempo: 112, src: 'Mutopia, kamu malı dizgi.' },
  mel: { title: 'Melodie', composer: 'Robert Schumann, Album für die Jugend Op. 68/1', key: 0, time: [4, 4], tempo: 76, clefL: 'treble', src: 'Mutopia 2007/02/11-647, Philippe Hézaine, CC BY-SA 2.5. Parmak numaraları kaynaktan.' },
  prel: { title: 'Prelüd Do majör', composer: 'J. S. Bach, Das Wohltemperierte Clavier I, BWV 846', key: 0, time: [4, 4], tempo: 72, src: 'Mutopia 2011/09/12-5, kamu malı dizgi.' },
};
export function pieceDef(id, { from = 0, to = null, keepRepeats = false } = {}) {
  const p = PIECES[id], n = NOTES[id], end = to ?? n.rh.length;
  const whole = from === 0 && to === null;
  const clean = (b) => (keepRepeats && whole) ? b : b.replace(/\|:\s*/g, '').replace(/\s*:\|/g, '');
  return { title: p.title, key: p.key, time: p.time, tempo: p.tempo, clefL: p.clefL, rh: n.rh.slice(from, end).map(clean), lh: n.lh.slice(from, end).map(clean), firstBar: from };
}
// Prelüdün akor hali: her ölçüdeki sesleri tek blokta toplar
export function preludeBlocks() {
  const n = NOTES.prel, rh = [], lh = [];
  const p = /([a-g][#b]*\d)/g;
  n.rh.forEach((b, i) => {
    const notes = [...new Set(b.match(p) || [])];
    const voices = n.lh[i].split('//');
    const up = [...new Set(voices[0].match(p) || [])];
    const low = [...new Set((voices[1] || '').match(p) || [])];
    if (i >= 32) return;
    rh.push(`<${notes.join(' ')}>:2 <${notes.join(' ')}>:2`);
    lh.push(`<${[...low, ...up].join(' ')}>:2 <${[...low, ...up].join(' ')}>:2`);
  });
  return { title: 'Prelüd Do majör: akor hali', key: 0, time: [4, 4], tempo: 60, rh, lh };
}
export const EXERCISE = E;
