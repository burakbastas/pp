// Nota okuma antrenörü: durak notalardan başlayıp ağırlıklı tekrarla ilerler
import { READ_LEVELS } from '../data/curriculum.js';
import { parseScore } from '../notation/parse.js';
import { Engraved } from '../notation/render.js';
import { parsePitch, SOLFEGE } from '../notation/theory.js';
import { Keyboard } from './keyboard.js';
import { ensureAudio, playNote } from '../audio/piano.js';
import { Inputs, enableComputerKeys } from '../audio/input.js';
import { db, save, logMinutes } from '../store.js';

const ROUND = 20;
export function mountReading(root, levelId, { onExit, lessonId }) {
  const L = READ_LEVELS[levelId];
  const stats = db.reading[levelId] || (db.reading[levelId] = {});
  root.innerHTML = `<section class="reader">
    <header class="p-head"><button class="icon-btn" data-a="back" aria-label="Geri"><svg viewBox="0 0 20 20"><path d="M12.5 3.5 6 10l6.5 6.5"/></svg></button>
      <div class="p-title"><h1>${L.title}</h1></div>
      <div class="seg small"><button data-ans="key" class="on">Tuş</button><button data-ans="name">Ad</button></div></header>
    <div class="r-stage">
      <div class="r-note"></div>
      <div class="r-side"><div class="r-count"></div><p class="r-feedback" role="status"></p></div>
    </div>
    <div class="r-names" hidden>${SOLFEGE.map((s, i) => `<button data-n="${i}">${s}</button>`).join('')}</div>
    <div class="kb-host"></div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const pool = L.notes.map(parsePitch);
  let answer = 'key', i = 0, right = 0, cur = null, t0 = 0, wrongOnce = false, totalMs = 0, locked = false, pairIdx = 0, lastMidi = null;
  const roundErr = {};
  const voices = new Map();
  const kb = new Keyboard($('.kb-host'), {
    low: L.low - (L.low % 12), high: L.high + (12 - (L.high % 12)) % 12,
    onDown: (m) => { ensureAudio(); voices.set(m, playNote(m, 0, null, 0.72)); Inputs.emit('down', m, 'touch'); },
    onUp: (m) => { voices.get(m)?.release?.(); voices.delete(m); },
  });
  enableComputerKeys(true);
  const off = Inputs.on((t, m, src, vel) => {
    if (t === 'pedal') return;
    if (src === 'midi') kb.pressed(m, t === 'down');
    if (src === 'midi' && db.settings.midiSound) { if (t === 'down') { ensureAudio(); voices.set(m, playNote(m, 0, null, vel || 0.7)); } else { voices.get(m)?.release?.(); voices.delete(m); } }
    if (t === 'down') tryKey(m);
  });
  const noteHost = $('.r-note');
  function weight(p) { const s = stats[p.midi] || { n: 0, e: 0, ms: 0 }; const err = s.n ? s.e / s.n : 0.5; const slow = s.n ? Math.min(1.5, s.ms / s.n / 2500) : 1; return 0.35 + err * 3 + slow; }
  function pick() {
    const w = pool.map(p => p.midi === lastMidi ? 0.02 : weight(p)); let r = Math.random() * w.reduce((a, b) => a + b, 0);
    for (let k = 0; k < pool.length; k++) { r -= w[k]; if (r <= 0) return pool[k]; }
    return pool[0];
  }
  function show() {
    if (i >= ROUND) return finish();
    locked = false; wrongOnce = false;
    if (L.pair) {
      const a = pick(); const d = [2, 3, 4, 5, -2, -3][Math.floor(Math.random() * 6)];
      const dia = a.dia + (d > 0 ? d - 1 : d + 1); const oct = Math.floor(dia / 7), step = ((dia % 7) + 7) % 7;
      const b = parsePitch('cdefgab'[step] + oct);
      cur = [a, b]; pairIdx = 0;
    } else { cur = [pick()]; pairIdx = 0; }
    lastMidi = cur[cur.length - 1].midi;
    const str = (p) => 'cdefgab'[p.step] + (p.alter === 1 ? '#' : p.alter === -1 ? 'b' : '') + p.oct;
    const body = cur.length > 1 ? `${str(cur[0])}:2 ${str(cur[1])}:2` : `${str(cur[0])}:1`;
    const def = { key: 0, time: [4, 4] };
    if (L.clef === 'grand') { const up = cur[0].midi >= 60; def.rh = up ? body : 'r:1'; def.lh = up ? 'r:1' : body; }
    else if (L.clef === 'treble') def.rh = body; else def.lh = body;
    const w = Math.min(noteHost.clientWidth || 300, 420);
    new Engraved(parseScore(def), noteHost, { width: w, sp: w < 340 ? 11 : 13, showFingers: false });
    noteHost.querySelectorAll('.mnum, .chord').forEach(x => x.remove());
    $('.r-count').textContent = `${i + 1} / ${ROUND}`;
    $('.r-feedback').textContent = cur.length > 1 ? 'Sırayla iki tuşa bas.' : '';
    $('.r-feedback').className = 'r-feedback';
    kb.clearMarks();
    kb.focusRange(cur[0].midi - 7, cur[0].midi + 7, true);
    t0 = performance.now();
  }
  function record(p, ms, err) {
    const s = stats[p.midi] || (stats[p.midi] = { n: 0, e: 0, ms: 0 });
    s.n++; s.ms += ms; if (err) { s.e++; roundErr[p.midi] = (roundErr[p.midi] || 0) + 1; }
  }
  function good() {
    const p = cur[pairIdx];
    if (pairIdx < cur.length - 1) { pairIdx++; kb.flash(p.midi, 'okk'); return; }
    const ms = performance.now() - t0; locked = true;
    record(p, ms, wrongOnce); if (!wrongOnce) right++; totalMs += ms; i++;
    kb.flash(p.midi, 'okk');
    $('.r-feedback').textContent = wrongOnce ? '' : (ms < 1500 ? 'Hızlı ve doğru' : 'Doğru');
    $('.r-feedback').className = 'r-feedback ok';
    setTimeout(show, wrongOnce ? 700 : 260);
  }
  function bad(m) {
    const p = cur[pairIdx];
    wrongOnce = true; kb.flash(m, 'err');
    const marks = new Map([[p.midi, { hand: 'lh' }]]); kb.setMarks(marks);
    kb.focusRange(p.midi - 5, p.midi + 5);
    $('.r-feedback').textContent = `Bu nota ${SOLFEGE[p.step]}${octLabel(p)}. Tuşa bas ve yerini gör.`;
    $('.r-feedback').className = 'r-feedback no';
  }
  const octLabel = (p) => p.midi === 60 ? ' (orta Do)' : '';
  function tryKey(m) {
    if (locked || !cur || answer !== 'key') return;
    if (m === cur[pairIdx].midi) good(); else bad(m);
  }
  function tryName(step) {
    if (locked || !cur) return;
    if (step === cur[pairIdx].step) { ensureAudio(); playNote(cur[pairIdx].midi, 0, 0.5, 0.7); good(); }
    else { wrongOnce = true; const p = cur[pairIdx]; kb.setMarks(new Map([[p.midi, { hand: 'lh' }]])); $('.r-feedback').textContent = `Bu nota ${SOLFEGE[p.step]}.`; $('.r-feedback').className = 'r-feedback no'; }
  }
  function finish() {
    save(); logMinutes(Math.round(totalMs / 1000));
    const pct = Math.round(100 * right / ROUND), avgN = totalMs / ROUND / 1000, avg = avgN.toFixed(1).replace('.', ',');
    const weak = Object.entries(roundErr).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([m]) => { const p = pool.find(x => x.midi === +m); return SOLFEGE[p.step] + p.oct; });
    const pass = pct >= 90 && avgN <= 2.5;
    if (pass && lessonId) { db.done[lessonId] = true; save(); }
    $('.r-stage').innerHTML = `<div class="r-end"><h2>Yüzde ${pct} doğru, nota başına ${avg} sn</h2>
      <p>${pass ? 'Hedefi tutturdun, bu düzey kaydedildi.' : 'Hedef yüzde 90 ve 2,5 saniye. Bir tur daha çalış; zayıf notalar daha sık gelir.'}</p>
      ${weak.length ? `<p>En çok karışanlar: ${weak.join(', ')}</p>` : ''}
      <div class="r-actions"><button class="primary" data-a="again">Bir tur daha</button><button class="txt-btn" data-a="back">Bitir</button></div></div>`;
    $('.r-names').hidden = true; kb.clearMarks();
  }
  $('.reader').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'back') { cleanup(); onExit(); }
    if (b.dataset.a === 'again') { cleanup(); mountReading(root, levelId, { onExit, lessonId }); }
    if (b.dataset.ans) { answer = b.dataset.ans; root.querySelectorAll('[data-ans]').forEach(x => x.classList.toggle('on', x === b)); $('.r-names').hidden = answer !== 'name'; }
    if (b.dataset.n != null) tryName(+b.dataset.n);
  };
  function cleanup() { off(); kb.destroy(); }
  requestAnimationFrame(show);
  return { cleanup };
}
