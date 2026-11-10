// Fa anahtarı nota kartları: notayı gör, klavyede bas; hız ve doğruluk kaydedilir
import { FA } from '../b/0.js';
import { parsePitch, SOLFEGE, ACC_TXT } from './t.js';
import { PARTS } from './n.js';
import { Keyboard } from './k.js';
import { ensureAudio, playNote, preloadPiano, setVolume } from './o.js';
import { Inputs, connectMIDI, enableComputerKeys } from './i.js';
import { db, save, isDone } from './d.js';
import { esc, toast } from './u.js';

const ROUND = 20, RETRY = 10, TARGET = 4000;
// Durak notalar: alt çizgi Sol2, ikinci aralık Do3, Fa çizgisi, orta Do
const LAND = [{ d: 18, t: 'Sol2' }, { d: 21, t: 'Do3' }, { d: 24, t: 'Fa3' }, { d: 28, t: 'Do4' }];
const CHROM = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const BACK = '<svg viewBox="0 0 20 20"><path d="M12.500 4 6.500 10l6 6"/></svg>';
export const nameOf = (p) => SOLFEGE[p.step] + ACC_TXT[p.alter] + p.oct;
const midiName = (m) => CHROM[m % 12] + (Math.floor(m / 12) - 1);
const secTxt = (ms) => (ms / 1000).toFixed(1).replace('.', ',');
const stars = (ms) => ms <= 2000 ? 3 : ms <= TARGET ? 2 : 1;

// k. aşamaya kadar öğrenilen notalar
export function setNotes(k) {
  const seen = new Map();
  FA.slice(0, k).forEach(s => s.notes.forEach(n => { const p = parsePitch(n); seen.set(p.midi + ':' + p.dia, p); }));
  return [...seen.values()].sort((a, b) => a.dia - b.dia || a.alter - b.alter);
}
export function defaultSet() {
  const cur = FA.findIndex(s => !s.etudes.every(isDone));
  return cur < 0 ? FA.length : Math.max(3, cur + 1);
}
export function lastRound() { const h = db.cards.hist; return h.length ? h[h.length - 1] : null; }

export function cardSvg(p, { hint = false, state = '', label = '' } = {}) {
  const { head, ledger, accidental, drawClef, HALF, TOP_DIA } = PARTS;
  const W = 200, H = 124, y0 = 42, x = 112, yOf = (d) => y0 + (TOP_DIA.bass - d) * HALF;
  let s = '';
  if (hint) {
    const L = LAND.filter(l => l.d !== p.dia).sort((a, b) => Math.abs(a.d - p.dia) - Math.abs(b.d - p.dia))[0];
    const yy = yOf(L.d), line = L.d % 2 === 0;
    s += `<rect class="hb" x="40" y="${yy - (line ? 2.2 : 4.4)}" width="${W - 76}" height="${line ? 4.4 : 8.8}" rx="2"/><text class="ht" x="${W - 30}" y="${yy + 3}">${L.t}</text>`;
  }
  for (let i = 0; i < 5; i++) s += `<line class="sl" x1="4" x2="${W - 36}" y1="${y0 + i * 10}" y2="${y0 + i * 10}"/>`;
  s += drawClef('bass', 9, y0);
  const y = yOf(p.dia);
  s += ledger(y0, y, x);
  if (p.alter) s += accidental(p.alter, x - 20, y);
  s += `<g class="ev ${state}">${head(x, y, '1')}</g>`;
  if (label) s += `<text class="kl ${state}" x="${x + 15}" y="${y + 4}">${esc(label)}</text>`;
  return `<svg class="score-svg kc-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Fa anahtarında bir nota">${s}</svg>`;
}

// Hata oranı yüksek notalar daha sık gelir; her nota turda en az bir kez çıkar
function buildDeck(pool, n) {
  const w = (p) => { const s = db.cards.notes[p.midi]; const err = s && s.n ? 1 - s.ok / s.n : 0.5; const slow = s && s.ok ? Math.min(1, s.ms / s.ok / TARGET) : 0.5; return 1 + 3 * err + slow; };
  const deck = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  while (deck.length < n) {
    const ws = pool.map(w), tot = ws.reduce((a, b) => a + b, 0); let r = Math.random() * tot, k = 0;
    while (r > ws[k]) { r -= ws[k]; k++; }
    deck.push(pool[Math.min(k, pool.length - 1)]);
  }
  for (let i = 1; i < deck.length; i++) {
    if (deck[i].midi !== deck[i - 1].midi || pool.length < 2) continue;
    const j = deck.findIndex((d, x) => x > i + 1 && d.midi !== deck[i].midi && d.midi !== deck[x - 1]?.midi);
    if (j > 0) [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function mountCards(root, { stage } = {}) {
  const S = db.settings;
  if (stage) { S.cardSet = Math.min(FA.length, Math.max(1, stage)); save(); }
  let k = S.cardSet || defaultSet();
  root.innerHTML = `<section class="pr kc">
    <header class="pr-h"><a class="ic" href="#/fa" aria-label="Geri">${BACK}</a>
      <div class="pr-t"><h1>Nota kartları</h1><p class="kc-sub"></p></div></header>
    <div class="kc-main"><div class="kc-card"></div></div>
    <div class="kc-names" hidden>${SOLFEGE.map((t, i) => `<button type="button" data-step="${i}">${t}</button>`).join('')}</div>
    <div class="kb-host"></div>
  </section>`;
  const $ = (q) => root.querySelector(q), card = $('.kc-card'), sub = $('.kc-sub');
  let kb = null, run = null, raf = 0;
  const voices = new Map(); let pedal = false; const held = new Set();
  const sound = (m, on, vel) => {
    if (on) { ensureAudio(); held.delete(m); voices.get(m)?.release?.(); voices.set(m, playNote(m, 0, null, vel || 0.72)); }
    else if (pedal) held.add(m); else { voices.get(m)?.release?.(); voices.delete(m); }
  };
  function makeKeyboard() {
    const ps = setNotes(k), lo = ps[0].midi, hi = ps[ps.length - 1].midi;
    kb?.destroy();
    kb = new Keyboard($('.kb-host'), {
      low: lo - (lo % 12), high: hi + (11 - (hi % 12)),
      onDown: (m) => { sound(m, true); Inputs.emit('down', m, 'touch'); },
      onUp: (m) => { sound(m, false); Inputs.emit('up', m, 'touch'); },
    });
    requestAnimationFrame(() => kb.focusRange(lo, hi, true));
    preloadPiano(lo - 2, hi + 2);
  }
  const offInput = Inputs.on((t, m, src, vel) => {
    if (t === 'pedal') { pedal = m >= 64; if (!pedal) { held.forEach(x => { voices.get(x)?.release?.(); voices.delete(x); }); held.clear(); } return; }
    if (src === 'pc' || (src === 'midi' && S.midiSound)) sound(m, t === 'down', vel);
    if (t === 'down') { kb?.pressed(m, true); answer({ midi: m }); }
    if (t === 'up') kb?.pressed(m, false);
  });
  const midiOn = () => Inputs.midi.ready && Inputs.midi.devices.length > 0;
  const onDev = () => { if (!run) startView(); };
  addEventListener('midi-devices', onDev);
  enableComputerKeys(true);
  setVolume(S.volume);

  function startView() {
    run = null; cancelAnimationFrame(raf);
    $('.kc-names').hidden = true;
    sub.textContent = 'Fa anahtarı';
    const last = lastRound(), best = db.cards.hist.reduce((a, h) => h.ok / h.n > (a ? a.ok / a.n : -1) ? h : a, null);
    const hasAcc = setNotes(k).some(p => p.alter);
    card.innerHTML = `<div class="kc-start">
      <h2>Notayı gör, klavyede bas</h2>
      <p>Her kartta tek nota çıkar. Doğru tuşa bastığında süren kaydedilir; karıştırdığın notalar sonraki turlarda daha sık gelir.</p>
      <label class="row">Notalar<select data-k="set">${FA.map((s, i) => `<option value="${i + 1}" ${i + 1 === k ? 'selected' : ''}>Aşama 1–${i + 1}: ${esc(s.title)}</option>`).join('')}</select></label>
      <div class="kc-prev">${cardSvg(setNotes(k)[Math.floor(setNotes(k).length / 2)], { hint: S.cardHint })}</div>
      <p class="m">${setNotes(k).map(nameOf).join(', ')}</p>
      <div class="row">Cevap<div class="seg" role="group" aria-label="Cevap"><button data-mode="tus" class="${S.cardMode === 'tus' ? 'on' : ''}">Tuşla</button><button data-mode="ad" class="${S.cardMode === 'ad' ? 'on' : ''}">Nota adıyla</button></div></div>
      ${S.cardMode === 'ad' && hasAcc ? '<p class="m">Nota adıyla cevapta diyez ve bemollü notalar çıkmaz.</p>' : ''}
      <label class="row">İpucu notaları (Sol2, Do3, Fa3, Do4)<input type="checkbox" data-k="hint" ${S.cardHint ? 'checked' : ''}></label>
      ${Inputs.midi.supported && !midiOn() ? '<button class="sec" data-a="midi">MIDI klavyeye bağlan</button>' : ''}
      ${last ? `<p class="m">Son tur: ${last.ok} / ${last.n}, ortalama ${secTxt(last.avg)} sn${best && best !== last ? `. En iyisi ${best.ok} / ${best.n}` : ''}.</p>` : ''}
      <button class="pri" data-a="go">${ROUND} kartla başla</button>
    </div>`;
  }
  function begin(pool, n, retry) {
    if (S.cardMode === 'ad') pool = pool.filter(p => !p.alter);
    if (!pool.length) { toast('Bu sette nota yok.'); return; }
    ensureAudio();
    run = { deck: buildDeck(pool, n), i: -1, res: [], streak: 0, best: 0, retry, pool };
    $('.kc-names').hidden = S.cardMode !== 'ad';
    next();
  }
  function next() {
    const r = run; r.i++;
    kb?.clearMarks(); root.querySelectorAll('.key.show').forEach(e => e.classList.remove('show'));
    if (r.i >= r.deck.length) { finish(); return; }
    const p = r.deck[r.i];
    r.cur = { p, t0: performance.now(), wrong: null, phase: 'q' };
    sub.textContent = `Fa anahtarı, aşama 1–${k}${r.retry ? ', karıştırılanlar' : ''}`;
    card.innerHTML = `<div class="kc-top"><span>${r.i + 1} / ${r.deck.length}</span><span>Seri ${r.streak}</span></div>
      <div class="kc-bar"><i></i></div>
      <div class="kc-staff" data-m="${p.midi}" data-s="${p.step}">${cardSvg(p, { hint: S.cardHint })}</div>
      <p class="kc-msg" role="status">${S.cardMode === 'ad' ? 'Bu nota hangisi?' : 'Bu notayı klavyende çal'}</p>`;
    const bar = card.querySelector('.kc-bar i');
    cancelAnimationFrame(raf);
    const tick = () => { if (!run || run.cur.phase !== 'q') return; const f = Math.max(0, 1 - (performance.now() - run.cur.t0) / TARGET); bar.style.width = (f * 100).toFixed(1) + '%'; if (f > 0) raf = requestAnimationFrame(tick); };
    tick();
  }
  const matches = (p, a) => a.step != null ? a.step === p.step && !p.alter : S.cardMode === 'ad' ? a.midi % 12 === p.midi % 12 : a.midi === p.midi;
  function answer(a) {
    const r = run; if (!r || !r.cur) return;
    const c = r.cur, p = c.p;
    if (c.phase === 'done') return;
    if (c.phase === 'fix') { if (matches(p, a)) { c.phase = 'done'; setTimeout(next, 250); } else if (a.midi != null) kb?.flash(a.midi, 'err'); return; }
    const ms = performance.now() - c.t0, ok = matches(p, a);
    const st = db.cards.notes[p.midi] || (db.cards.notes[p.midi] = { n: 0, ok: 0, ms: 0 });
    st.n++;
    const msg = card.querySelector('.kc-msg'), staff = card.querySelector('.kc-staff');
    if (ok) {
      st.ok++; st.ms += ms; r.res.push({ p, ok: true, ms }); r.streak++; r.best = Math.max(r.best, r.streak);
      c.phase = 'done';
      staff.innerHTML = cardSvg(p, { hint: S.cardHint, state: 'good', label: nameOf(p) });
      msg.className = 'kc-msg good'; msg.textContent = `Doğru · ${secTxt(ms)} sn · ${'★'.repeat(stars(ms))}`;
      if (a.midi != null) kb?.flash(a.midi, 'okk');
      card.querySelector('.kc-top span:last-child').textContent = `Seri ${r.streak}`;
      setTimeout(() => { if (run === r && r.cur === c) next(); }, 700);
    } else {
      c.wrong = a.midi != null ? a.midi : a.step; r.res.push({ p, ok: false, ms, wrong: a.midi != null ? midiName(a.midi) : SOLFEGE[a.step] }); r.streak = 0;
      c.phase = 'fix';
      staff.innerHTML = cardSvg(p, { hint: S.cardHint, state: 'bad', label: nameOf(p) });
      msg.className = 'kc-msg bad';
      msg.textContent = `Bu ${nameOf(p)}. Sen ${a.midi != null ? midiName(a.midi) : SOLFEGE[a.step]} ${a.midi != null ? 'çaldın' : 'seçtin'}. ${S.cardMode === 'ad' ? 'Doğrusunu seç.' : 'Yeşil tuşa bas.'}`;
      if (a.midi != null) kb?.flash(a.midi, 'err');
      kb?.keys.get(p.midi)?.classList.add('show'); kb?.focusRange(p.midi - 4, p.midi + 4);
      setTimeout(() => { if (run === r && r.cur === c) playNote(p.midi, 0, 0.9, 0.6); }, 260);
    }
    save();
  }
  function finish() {
    const r = run; cancelAnimationFrame(raf);
    $('.kc-names').hidden = true;
    const okN = r.res.filter(x => x.ok).length, okMs = r.res.filter(x => x.ok).map(x => x.ms);
    const avg = okMs.length ? okMs.reduce((a, b) => a + b, 0) / okMs.length : 0;
    db.cards.hist.push({ at: Date.now(), k, ok: okN, n: r.res.length, avg: Math.round(avg), retry: !!r.retry });
    if (db.cards.hist.length > 60) db.cards.hist.splice(0, db.cards.hist.length - 60);
    save();
    const mix = new Map();
    r.res.filter(x => !x.ok).forEach(x => { const key = `${nameOf(x.p)} ↔ ${x.wrong}`; mix.set(key, (mix.get(key) || 0) + 1); });
    const mixList = [...mix.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const slow = new Map();
    r.res.filter(x => x.ok && x.ms > TARGET).forEach(x => slow.set(x.p.midi, x.p));
    const weak = new Map(); r.res.filter(x => !x.ok).forEach(x => weak.set(x.p.midi, x.p)); slow.forEach((p, m) => weak.set(m, p));
    r.weak = [...weak.values()];
    card.innerHTML = `<div class="kc-end">
      <p class="kc-big">${okN} / ${r.res.length}</p><p class="m kc-c">doğru</p>
      <p>Ortalama ${secTxt(avg)} sn · En uzun seri ${r.best}</p>
      ${mixList.length ? `<h3>En çok karıştırdıkların</h3><ul class="kc-mix">${mixList.map(([t, n]) => `<li><span>${esc(t)}</span><span class="m">${n} kez</span></li>`).join('')}</ul>` : '<p class="good">Hiç karıştırmadın.</p>'}
      ${slow.size ? `<p class="m">Yavaş kalanlar (4 sn üstü): ${[...slow.values()].map(nameOf).join(', ')}</p>` : ''}
      ${r.weak.length ? `<button class="pri" data-a="retry">Bunları tekrarla</button>` : ''}
      <button class="${r.weak.length ? 'sec' : 'pri'}" data-a="again">Yeni tur</button>
      <button class="sec" data-a="menu">Ayarlar</button>
    </div>`;
  }
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.step != null) { answer({ step: +b.dataset.step }); return; }
    if (b.dataset.mode) { S.cardMode = b.dataset.mode; save(); startView(); return; }
    switch (b.dataset.a) {
      case 'go': case 'again': begin(setNotes(k), ROUND, false); break;
      case 'retry': {
        const pool = run.weak.slice(), all = setNotes(k);
        // tek notaysa komşularını da kat ki seçim gerçek olsun
        if (pool.length < 3) pool.forEach(p => all.filter(q => Math.abs(q.dia - p.dia) === 1).forEach(q => { if (!pool.some(x => x.midi === q.midi)) pool.push(q); }));
        begin(pool, RETRY, true); break;
      }
      case 'menu': startView(); break;
      case 'midi': {
        const r = await connectMIDI();
        toast(r.ok && r.devices.length ? `MIDI bağlandı: ${r.devices[0]}` : r.busy?.length ? 'MIDI aygıtı başka bir programda açık.' : 'MIDI aygıtı bulunamadı.');
        startView(); break;
      }
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.k === 'set') { k = +t.value; S.cardSet = k; save(); makeKeyboard(); startView(); }
    if (t.dataset.k === 'hint') { S.cardHint = t.checked; save(); startView(); }
  });
  makeKeyboard();
  startView();
  return { cleanup() { cancelAnimationFrame(raf); offInput(); removeEventListener('midi-devices', onDev); kb?.destroy(); enableComputerKeys(false); voices.forEach(v => v?.release?.()); } };
}
