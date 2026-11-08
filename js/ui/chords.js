// Akor tanıma: adı görünen akoru klavyede bul
import { parseChord, chordTone, solfegeName } from '../notation/theory.js';
import { Keyboard } from './keyboard.js';
import { ensureAudio, playNote } from '../audio/piano.js';
import { Inputs, enableComputerKeys } from '../audio/input.js';
import { db } from '../store.js';
import { esc } from './dom.js';

export function chordNotes(sym, oct = 4) {
  const c = parseChord(sym); if (!c) return [];
  return c.tones.map(([d, s]) => chordTone(c, d, s, oct));
}
// Küçük klavye çizimi: akorun tuşlarını gösterir
export function miniKeys(sym) {
  const notes = chordNotes(sym, 4).map(n => n.midi);
  const lo = 60, W = 17, hi = Math.max(83, ...notes);
  const whites = [], blacks = [];
  for (let m = lo; m <= hi; m++) { const pc = m % 12; if ([1, 3, 6, 8, 10].includes(pc)) blacks.push(m); else whites.push(m); }
  const xOf = (m) => whites.indexOf(m) * W;
  const on = (m) => notes.includes(m);
  const w = whites.map(m => `<rect x="${xOf(m)}" y="0" width="${W}" height="58" class="mk ${on(m) ? 'on' : ''}"/>`).join('');
  const b = blacks.map(m => `<rect x="${xOf(m - 1) + W - 5.5}" y="0" width="11" height="35" class="mb ${on(m) ? 'on' : ''}"/>`).join('');
  return `<svg class="minik" viewBox="-1 -1 ${whites.length * W + 2} 60" role="img" aria-label="${esc(sym)}">${w}${b}</svg>`;
}

const ROUNDS = 10;
export function mountChordDrill(root, { chords, title, onExit, onDone }) {
  root.innerHTML = `<section class="reader">
    <header class="p-head"><button class="icon-btn" data-a="back" aria-label="Geri"><svg viewBox="0 0 20 20"><path d="M12.5 3.5 6 10l6.5 6.5"/></svg></button>
      <div class="p-title"><h1>${esc(title || 'Akorları tanı')}</h1></div></header>
    <div class="r-stage"><div class="ch-big"></div><p class="ch-notes"></p><div class="r-count"></div><p class="r-feedback" role="status"></p>
      <button class="chip" data-a="show">Tuşları göster</button></div>
    <div class="kb-host"></div></section>`;
  const $ = (s) => root.querySelector(s);
  let idx = 0, right = 0, cur = null, got = new Set(), mist = false, last = null, locked = false;
  const voices = new Map();
  const kb = new Keyboard($('.kb-host'), {
    low: 48, high: 84, names: false,
    onDown: (m) => { ensureAudio(); voices.set(m, playNote(m, 0, null, 0.7)); Inputs.emit('down', m, 'touch'); },
    onUp: (m) => { voices.get(m)?.release?.(); voices.delete(m); Inputs.emit('up', m, 'touch'); },
  });
  enableComputerKeys(true);
  function next() {
    if (idx >= ROUNDS) return finish();
    let c; do { c = chords[Math.floor(Math.random() * chords.length)]; } while (c === last && chords.length > 1);
    last = c; cur = { sym: c, notes: chordNotes(c, 4) }; got = new Set(); mist = false; locked = false;
    $('.ch-big').textContent = solf(c);
    $('.ch-notes').textContent = '';
    $('.r-count').textContent = `${idx + 1} / ${ROUNDS}`;
    $('.r-feedback').textContent = ''; $('.r-feedback').className = 'r-feedback';
    kb.clearMarks(); kb.focusRange(60, 76, true);
  }
  function solf(c) { const p = parseChord(c); const n = solfegeName({ step: p.root.step, alter: p.root.alter }); const q = p.q === 'm' ? ' minör' : p.q === '' ? ' majör' : ' ' + p.q; return `${c}  (${n}${q})`; }
  const off = Inputs.on((t, m, src, vel) => {
    if (t === 'pedal') return;
    if (src !== 'touch') kb.pressed(m, t === 'down');
    if (src === 'midi' && db.settings.midiSound) { if (t === 'down') { ensureAudio(); voices.set(m, playNote(m, 0, null, vel || 0.7)); } else { voices.get(m)?.release?.(); voices.delete(m); } }
    if (t !== 'down' || locked || !cur) return;
    const pcs = cur.notes.map(n => ((n.midi % 12) + 12) % 12), pc = m % 12;
    if (!pcs.includes(pc)) {
      mist = true; got = new Set(); kb.flash(m, 'err');
      $('.r-feedback').textContent = 'Bu nota akorda yok. Baştan dene.'; $('.r-feedback').className = 'r-feedback no';
      return;
    }
    got.add(pc); kb.flash(m, 'okk');
    if (got.size === new Set(pcs).size) {
      locked = true; idx++; if (!mist) right++;
      $('.ch-notes').textContent = cur.notes.map(n => solfegeName(n)).join(', ');
      $('.r-feedback').textContent = 'Doğru'; $('.r-feedback').className = 'r-feedback ok';
      setTimeout(next, 700);
    }
  });
  function finish() {
    const pct = Math.round(100 * right / ROUNDS), pass = pct >= 80;
    if (pass) onDone?.(false);
    $('.r-stage').innerHTML = `<div class="r-end"><h2>${ROUNDS} akorda yüzde ${pct} ilk denemede doğru</h2>
      <p>${pass ? 'Eller akorları biliyor. Şimdi çalmaya geçelim.' : 'Hedef yüzde 80. Bir tur daha çalış, gerekirse tuşları göster.'}</p>
      <div class="r-actions">${pass ? '<button class="primary" data-a="next">Sonraki adım</button>' : ''}<button class="${pass ? 'txt-btn' : 'primary'}" data-a="again">Bir tur daha</button></div></div>`;
    kb.clearMarks();
  }
  $('.reader').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'back') { cleanup(); onExit(); }
    if (b.dataset.a === 'again') { cleanup(); mountChordDrill(root, { chords, title, onExit, onDone }); }
    if (b.dataset.a === 'next') { cleanup(); onDone?.(true); }
    if (b.dataset.a === 'show' && cur) {
      const f = cur.notes.length === 4 ? [1, 2, 3, 5] : [1, 3, 5];
      kb.setMarks(new Map(cur.notes.map((n, i) => [n.midi, { hand: 'rh', finger: f[i] }])));
      $('.ch-notes').textContent = cur.notes.map(n => solfegeName(n)).join(', ');
      mist = true;
    }
  };
  function cleanup() { off(); kb.destroy(); }
  requestAnimationFrame(next);
  return { cleanup };
}
