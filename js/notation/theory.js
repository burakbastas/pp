// Perde, tonalite ve akor hesapları
export const STEP_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
export const STEP_SEMI = [0, 2, 4, 5, 7, 9, 11];
const LOWER = 'cdefgab';

export function parsePitch(str) {
  const m = /^([a-g])(##|bb|#|b|n)?(\d)$/.exec(str);
  if (!m) throw new Error('Perde okunamadı: ' + str);
  const step = LOWER.indexOf(m[1]);
  const alter = { '#': 1, '##': 2, b: -1, bb: -2, n: 0, undefined: 0 }[m[2]];
  return makePitch(step, alter, +m[3]);
}
export function makePitch(step, alter, oct) {
  return { step, alter, oct, midi: 12 * (oct + 1) + STEP_SEMI[step] + alter, dia: step + 7 * oct };
}
export function pitchStr(p) {
  const a = { 0: '', 1: '#', 2: '##', '-1': 'b', '-2': 'bb' }[p.alter];
  return LOWER[p.step] + a + p.oct;
}
export function pitchFromDia(dia, alter = 0) {
  const oct = Math.floor(dia / 7);
  return makePitch(((dia % 7) + 7) % 7, alter, oct);
}
export const ACC_TXT = { 0: '', 1: '♯', 2: '𝄪', '-1': '♭', '-2': '𝄫' };
export function solfegeName(p) { return SOLFEGE[p.step] + ACC_TXT[p.alter]; }
export function letterName(p) { return STEP_LETTER[p.step] + ({ 0: '', 1: '#', '-1': 'b', 2: '##', '-2': 'bb' }[p.alter]); }

// --- Tonalite
const SHARPS = [3, 0, 4, 1, 5, 2, 6], FLATS = [6, 2, 5, 1, 4, 0, 3];
export function keyAlter(fifths, step) {
  if (fifths > 0) return SHARPS.indexOf(step) < fifths && SHARPS.indexOf(step) >= 0 ? 1 : 0;
  if (fifths < 0) return FLATS.indexOf(step) < -fifths && FLATS.indexOf(step) >= 0 ? -1 : 0;
  return 0;
}
export function keySigPositions(fifths) {
  return fifths > 0 ? SHARPS.slice(0, fifths) : FLATS.slice(0, -fifths);
}
// Do majör = 0, Sol majör = 1 ...
const MAJ_TONIC_BY_FIFTHS = { '-6': [4 + 0, -1], '-5': [1, -1], '-4': [5, -1], '-3': [2, -1], '-2': [6, -1], '-1': [3, 0], 0: [0, 0], 1: [4, 0], 2: [1, 0], 3: [5, 0], 4: [2, 0], 5: [6, 0], 6: [3, 1] };
MAJ_TONIC_BY_FIFTHS['-6'] = [4, -1];
export function majorTonic(fifths) { const [s, a] = MAJ_TONIC_BY_FIFTHS[fifths]; return { step: s, alter: a }; }
export function minorTonic(fifths) { const t = majorTonic(fifths); const step = (t.step + 5) % 7; const semi = (STEP_SEMI[t.step] + t.alter + 9) % 12; let alter = semi - STEP_SEMI[step]; if (alter > 6) alter -= 12; if (alter < -6) alter += 12; return { step, alter }; }
export function keyName(fifths, mode = 'major') {
  const t = mode === 'minor' ? minorTonic(fifths) : majorTonic(fifths);
  return `${SOLFEGE[t.step]}${ACC_TXT[t.alter]} ${mode === 'minor' ? 'minör' : 'majör'}`;
}
export function keyLetter(fifths, mode = 'major') {
  const t = mode === 'minor' ? minorTonic(fifths) : majorTonic(fifths);
  return STEP_LETTER[t.step] + ({ 0: '', 1: '#', '-1': 'b' }[t.alter]) + (mode === 'minor' ? 'm' : '');
}
// Tonik yarım ton sınıfına göre okunması en kolay imza
export const MAJOR_FIFTHS_BY_PC = { 0: 0, 1: -5, 2: 2, 3: -3, 4: 4, 5: -1, 6: 6, 7: 1, 8: -4, 9: 3, 10: -2, 11: 5 };
export const MINOR_FIFTHS_BY_PC = { 0: -3, 1: 4, 2: -1, 3: -6, 4: 1, 5: -4, 6: 3, 7: -2, 8: 5, 9: 0, 10: -5, 11: 2 };
export function tonicPitch(fifths, mode, oct) {
  const t = mode === 'minor' ? minorTonic(fifths) : majorTonic(fifths);
  return makePitch(t.step, t.alter, oct);
}
export const SCALE = {
  major: [[0, 0], [1, 2], [2, 4], [3, 5], [4, 7], [5, 9], [6, 11]],
  minor: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 10]],
  harmonic: [[0, 0], [1, 2], [2, 3], [3, 5], [4, 7], [5, 8], [6, 11]],
};
// Tonik + aralık (diyatonik adım, yarım ton)
export function addInterval(p, dia, semi) {
  const nd = p.dia + dia, oct = Math.floor(nd / 7), step = ((nd % 7) + 7) % 7;
  const target = p.midi + semi;
  const alter = target - (12 * (oct + 1) + STEP_SEMI[step]);
  return makePitch(step, alter, oct);
}
export function scaleDegree(tonic, scaleName, deg) { // deg 1'den başlar, 8/9/10 olabilir
  const s = SCALE[scaleName]; const d = deg - 1;
  const oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
  return addInterval(tonic, s[i][0] + 7 * oct, s[i][1] + 12 * oct);
}

// --- Akorlar
const QUALITY = {
  '': [[1, 0], [3, 4], [5, 7]], maj: [[1, 0], [3, 4], [5, 7]],
  m: [[1, 0], [3, 3], [5, 7]], min: [[1, 0], [3, 3], [5, 7]], '-': [[1, 0], [3, 3], [5, 7]],
  '5': [[1, 0], [5, 7]],
  '7': [[1, 0], [3, 4], [5, 7], [7, 10]],
  m7: [[1, 0], [3, 3], [5, 7], [7, 10]], '-7': [[1, 0], [3, 3], [5, 7], [7, 10]],
  maj7: [[1, 0], [3, 4], [5, 7], [7, 11]], M7: [[1, 0], [3, 4], [5, 7], [7, 11]],
  m6: [[1, 0], [3, 3], [5, 7], [6, 9]], '6': [[1, 0], [3, 4], [5, 7], [6, 9]],
  sus: [[1, 0], [4, 5], [5, 7]], sus4: [[1, 0], [4, 5], [5, 7]], sus2: [[1, 0], [2, 2], [5, 7]],
  '7sus4': [[1, 0], [4, 5], [5, 7], [7, 10]],
  add9: [[1, 0], [3, 4], [5, 7], [9, 14]], madd9: [[1, 0], [3, 3], [5, 7], [9, 14]],
  '9': [[1, 0], [3, 4], [7, 10], [9, 14]],
  m9: [[1, 0], [3, 3], [7, 10], [9, 14]], maj9: [[1, 0], [3, 4], [7, 11], [9, 14]],
  dim: [[1, 0], [3, 3], [5, 6]], '°': [[1, 0], [3, 3], [5, 6]],
  dim7: [[1, 0], [3, 3], [5, 6], [7, 9]], '°7': [[1, 0], [3, 3], [5, 6], [7, 9]],
  m7b5: [[1, 0], [3, 3], [5, 6], [7, 10]], 'ø': [[1, 0], [3, 3], [5, 6], [7, 10]],
  aug: [[1, 0], [3, 4], [5, 8]], '+': [[1, 0], [3, 4], [5, 8]],
};
const SOLF_TO_LETTER = { do: 'C', re: 'D', mi: 'E', fa: 'F', sol: 'G', la: 'A', si: 'B' };
function solfToLetter(s) {
  // "Lam", "Sol7", "Fa#m" gibi solfej yazımını harf yazımına çevirir
  const m = /^(Do|Re|Mi|Fa|Sol|La|Si|do|re|mi|fa|sol|la|si)(#|b)?(.*)$/.exec(s);
  return m ? SOLF_TO_LETTER[m[1].toLowerCase()] + (m[2] || '') + m[3] : s;
}
function readNote(s) {
  const m = /^([A-G])(#|b)?$/.exec(s);
  return m ? { step: STEP_LETTER.indexOf(m[1]), alter: m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0 } : null;
}
function readChord(s) {
  const [main, bass, extra] = s.split('/');
  if (extra !== undefined) return null;
  const m = /^([A-G])(#|b)?(.*)$/.exec(main);
  if (!m || !(m[3] in QUALITY)) return null;
  const root = readNote(m[1] + (m[2] || ''));
  let bassN = null;
  if (bass !== undefined) { bassN = readNote(bass) || readNote(solfToLetter(bass)); if (!bassN) return null; }
  return { sym: main + (bass ? '/' + bass : ''), root, q: m[3], tones: QUALITY[m[3]], bass: bassN };
}
export function parseChord(raw) {
  const clean = raw.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  if (!clean) return null;
  return readChord(clean) || readChord(solfToLetter(clean));
}
// Akordun bir perdesini kök pozisyonundan üret
export function chordTone(chord, deg, semi, oct) {
  const r = makePitch(chord.root.step, chord.root.alter, oct);
  return addInterval(r, deg - 1, semi);
}
export function chordPitchClasses(chord) {
  return chord.tones.map(([d, s]) => ({ d, s }));
}
export function transposeChord(chord, semi, preferFlat) {
  // Sembolü yarım ton kaydırır
  const pc = (STEP_SEMI[chord.root.step] + chord.root.alter + semi + 120) % 12;
  const root = pcName(pc, preferFlat);
  let out = root + chord.q;
  if (chord.bass) {
    const bpc = (STEP_SEMI[chord.bass.step] + chord.bass.alter + semi + 120) % 12;
    out += '/' + pcName(bpc, preferFlat);
  }
  return out;
}
export function pcName(pc, preferFlat) {
  return (preferFlat ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])[((pc % 12) + 12) % 12];
}
// Roma rakamından akor: "vi", "bVII", "V7", "ii°", "I/3"
export function romanToChord(rn, tonic, mode) {
  const scale = mode === 'minor' ? SCALE.minor : SCALE.major;
  const m = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|ø|dim|maj7|m7|7|sus4|sus2|add9|\+)?(?:\/(\d))?$/.exec(rn);
  if (!m) throw new Error('roma: ' + rn);
  const numeral = m[2], lower = numeral === numeral.toLowerCase();
  const deg = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii'].indexOf(numeral.toLowerCase());
  let semi = scale[deg][1];
  if (m[1] === 'b') semi -= 1; if (m[1] === '#') semi += 1;
  const rootP = addInterval(tonic, deg, semi);
  const rootName = STEP_LETTER[rootP.step] + ({ 0: '', 1: '#', '-1': 'b' }[rootP.alter] ?? '');
  let suffix = m[3] || '';
  if (lower && suffix === '') suffix = 'm';
  else if (lower && suffix === '7') suffix = 'm7';
  let out = rootName + suffix.replace('ø', 'm7b5').replace('°', 'dim');
  if (m[4]) { // /3 → üçlüsü bas
    const c = parseChord(rootName + (suffix === 'm' ? 'm' : ''));
    const d = +m[4]; const t = c.tones.find(x => x[0] === d);
    const b = addInterval(makePitch(c.root.step, c.root.alter, 3), d - 1, t[1]);
    out += '/' + STEP_LETTER[b.step] + ({ 0: '', 1: '#', '-1': 'b' }[b.alter] ?? '');
  }
  return out;
}
export const fmtDur = (m) => Math.round(m);
