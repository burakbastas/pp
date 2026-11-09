// Çalışma ekranı: porte, ekran klavyesi, MIDI takibi ve sonuç
import { parseScore } from '../notation/parse.js';
import { Engraved } from '../notation/render.js';
import { Player } from './player.js';
import { Keyboard } from './keyboard.js';
import { ensureAudio, playNote, setVolume, preloadPiano, pianoState, setPiano } from '../audio/piano.js';
import { PIANOS } from '../audio/pianos.js';
import { Inputs, connectMIDI, enableComputerKeys } from '../audio/input.js';
import { db, save, record, score as bestOf, required, PASS, setManual, isDone } from '../store.js';
import { esc, toast } from './dom.js';

const ICON = {
  back: '<svg viewBox="0 0 20 20"><path d="M12.500 4 6.500 10l6 6"/></svg>',
  gear: '<svg viewBox="0 0 22 22"><path d="M3 6h9m5 0h2M3 16h2m5 0h9"/><circle cx="14.500" cy="6" r="2.400"/><circle cx="7.500" cy="16" r="2.400"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path class="f" d="M8 5.500v13l11-6.500Z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect class="f" x="7" y="7" width="10" height="10"/></svg>',
  again: '<svg viewBox="0 0 24 24"><path d="M19 12a7 7 0 1 1-2.100-5M19 3.500V8h-4.500"/></svg>',
};
const HAND = { lh: 'Sol el', rh: 'Sağ el', both: 'İki el' };

// Bir bölümü nota verisinden kesip çıkarır; önceki anahtar değişimleri korunur
export function sectionDef(n, [a, b], title) {
  const clefAt = (arr, start) => { let c = start; for (let i = 0; i < a; i++) { if (/%b/.test(arr[i])) c = 'bass'; if (/%t/.test(arr[i])) c = 'treble'; } return c; };
  const clean = (x) => x.replace(/\|:\s*/g, '').replace(/\s*:\|/g, '');
  const rh = (n.rh || []).slice(a, b).map(clean), lh = (n.lh || []).slice(a, b).map(clean);
  return { title, key: n.key, time: n.time, tempo: n.tempo, rh, lh, clefR: clefAt(n.rh || [], n.clefR || 'treble'), clefL: clefAt(n.lh || [], n.clefL || 'bass'), pickup: a === 0 ? n.pickup : 0, firstBar: a };
}

export function mountPractice(root, { item, notes, sec, backHref, nextItemHref, sub }) {
  const whole = sec === 'all', range = whole ? [0, Math.max(notes.rh?.length || 0, notes.lh?.length || 0)] : item.sections[sec];
  const allLabel = { eser: 'Tüm eser', etut: 'Tüm etüt', alistirma: 'Tüm alıştırma' }[item.group] || 'Tümü';
  const def = sectionDef(notes, range, item.title);
  const s = parseScore(def);
  const S = db.settings;
  const both = s.staves.rh && s.staves.lh;
  const need = required(item);
  const firstHand = () => {
    if (!both) return s.staves.lh ? 'lh' : 'rh';
    if (item.kind === 'finger') return item.hand;
    for (const h of ['lh', 'rh', 'both']) if ((bestOf(item.id, sec, h) ?? 0) < PASS) return h;
    return 'both';
  };
  const howList = item.how?.length ? `<ol>${item.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : '';
  const showHowFirst = item.kind === 'finger' && !db.howSeen[item.id];
  if (showHowFirst) { db.howSeen[item.id] = true; save(); }
  const hasHow = !!(howList || item.why || item.note);
  root.innerHTML = `<section class="pr">
    <header class="pr-h">
      <a class="ic" href="${backHref}" aria-label="Geri">${ICON.back}</a>
      <div class="pr-t"><h1>${esc(item.title)}</h1><p>${esc(sub)}</p></div>
      ${hasHow ? `<button class="tx" data-a="how" aria-expanded="${showHowFirst}">Nasıl çalışılır</button>` : ''}
      <button class="ic" data-a="set" aria-label="Ayarlar">${ICON.gear}</button>
    </header>
    <div class="pr-how" ${showHowFirst ? '' : 'hidden'}>
      ${item.why ? `<p>${esc(item.why)}</p>` : ''}${howList}${item.note ? `<p class="m">${esc(item.note)}</p>` : ''}
    </div>
    ${item.sections.length > 1 ? `<nav class="secs" aria-label="Bölümler"><div class="secs-r">${item.sections.map(([a, b], i) => {
    const r = (bestOf(item.id, i, need) ?? 0) >= PASS;
    return `<a href="#/c/${item.id}/${i}" class="${i === sec ? 'on' : ''} ${r ? 'd' : ''}" aria-label="Ölçü ${a + 1} ile ${b} arası">${a + 1}–${b}</a>`;
  }).join('')}</div><a href="#/c/${item.id}/tum" class="all ${whole ? 'on' : ''} ${(bestOf(item.id, 'all', need) ?? 0) >= PASS ? 'd' : ''}">${allLabel}</a></nav>` : ''}
    <div class="pr-score"><div class="score-host"></div></div>
    <p class="pr-status" role="status"></p>
    <div class="pr-dock">
      <div class="seg" role="group" aria-label="Çalışma biçimi"><button data-mode="follow">Çal</button><button data-mode="listen">Dinle</button></div>
      ${both ? '<div class="seg hands" role="group" aria-label="El"><button data-hand="lh">Sol</button><button data-hand="both">İki</button><button data-hand="rh">Sağ</button></div>' : ''}
      <button class="go" data-a="play" aria-label="Başlat">${ICON.play}</button>
      <div class="tempo" aria-label="Tempo"><button data-a="t-" aria-label="Yavaşlat">−</button><output class="tval"></output><button data-a="t+" aria-label="Hızlandır">+</button></div>
      <button class="tg" data-a="loop"></button>
      <button class="tg" data-a="hint"></button>
      ${Inputs.midi.supported ? '<button class="tg" data-a="midi"></button>' : ''}
    </div>
    <div class="kb-host"></div>
    <div class="sheet" hidden></div>
  </section>`;
  const $ = (q) => root.querySelector(q);
  const host = $('.score-host'), view = $('.pr-score'), status = $('.pr-status');
  let eng, pl;
  const engrave = () => {
    const w = view.clientWidth - 8;
    const base = w < 480 ? 6.8 : w < 900 ? 8.2 : w < 1200 ? 9.5 : 11;
    eng = new Engraved(s, host, { width: w, sp: base * S.zoom, showFingers: S.fingers, showNames: S.names });
    if (pl) pl.setEngraved(eng);
  };
  engrave();
  const all = s.measures.flatMap(m => ['rh', 'lh'].flatMap(h => m[h] ? m[h].voices.flat().flatMap(e => e.notes.map(n => n.midi)) : []));
  const low = Math.min(36, ...all), high = Math.max(84, ...all);
  const voices = new Map();
  const kb = new Keyboard($('.kb-host'), {
    low: low - (low % 12), high: high + (12 - (high % 12)) % 12,
    onDown: (m) => { ensureAudio(); voices.set(m, playNote(m, 0, null, 0.72)); Inputs.emit('down', m, 'touch'); },
    onUp: (m) => { voices.get(m)?.release?.(); voices.delete(m); Inputs.emit('up', m, 'touch'); },
  });
  pl = new Player({ score: s, engraved: eng, keyboard: kb, onState });
  pl.hands = firstHand();
  pl.tempo = db.tempo[item.id] || Math.max(40, Math.round(item.tempo * 0.6));
  pl.metro = S.metro; pl.countIn = true; pl.hint = S.hint;
  pl.buildSteps();
  enableComputerKeys(true);
  let pedal = false; const held = new Set();
  const offInput = Inputs.on((t, m, src, vel) => {
    if (src !== 'pc' && !(src === 'midi' && S.midiSound)) return;
    if (t === 'pedal') {
      pedal = m >= 64;
      if (!pedal) { held.forEach(k => { voices.get(k)?.release?.(); voices.delete(k); }); held.clear(); }
    } else if (t === 'down') { ensureAudio(); held.delete(m); voices.get(m)?.release?.(); voices.set(m, playNote(m, 0, null, vel || 0.72)); }
    else if (pedal) held.add(m);
    else { voices.get(m)?.release?.(); voices.delete(m); }
  });
  const onMidiDev = () => updateMidi();
  addEventListener('midi-devices', onMidiDev);
  const showLoad = () => {
    if (pl.state === 'playing') return;
    if (pianoState.ready) { if (status.dataset.load) { status.textContent = ''; delete status.dataset.load; } return; }
    status.textContent = `Piyano sesi yükleniyor: ${pianoState.loaded} / ${pianoState.total}`; status.dataset.load = '1';
  };
  addEventListener('piano-progress', showLoad);
  preloadPiano(Math.min(36, low), Math.max(84, high));

  let loopPick = false, loopA = null;
  const disp = (i) => i + 1 + (def.firstBar || 0);
  function updateMidi() {
    const b = $('[data-a=midi]'); if (!b) return;
    const d = Inputs.midi.devices, on = Inputs.midi.ready && d.length > 0;
    b.textContent = on ? d[0].replace(/\s+\d+$/, '') : Inputs.midi.busy.length ? 'MIDI başka programda' : 'MIDI bağla';
    b.classList.toggle('on', on);
  }
  function updateUI() {
    host.classList.toggle('dim-lh', pl.hands === 'rh');
    host.classList.toggle('dim-rh', pl.hands === 'lh');
    root.querySelectorAll('[data-mode]').forEach(b => { const on = b.dataset.mode === pl.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    root.querySelectorAll('[data-hand]').forEach(b => {
      const on = b.dataset.hand === pl.hands, r = (bestOf(item.id, sec, b.dataset.hand) ?? 0) >= PASS;
      b.classList.toggle('on', on); b.classList.toggle('d', r); b.setAttribute('aria-pressed', on);
    });
    $('.tval').textContent = Math.round(pl.tempo);
    const hb = $('[data-a=hint]'); hb.textContent = pl.hint === 'off' ? 'Tuşlar kapalı' : 'Tuşlar açık'; hb.classList.toggle('on', pl.hint !== 'off');
    const lb = $('[data-a=loop]'); lb.classList.toggle('on', !!pl.loop || loopPick);
    lb.textContent = loopPick ? (loopA == null ? 'İlk ölçüye dokun' : 'Son ölçüye dokun') : pl.loop ? `Döngü ${disp(pl.loop.a)}–${disp(pl.loop.b)}` : 'Döngü';
    setGo();
  }
  function setGo() {
    const b = $('[data-a=play]'), running = pl.state === 'playing';
    if (pl.mode === 'follow') { b.innerHTML = ICON.again; b.setAttribute('aria-label', 'Baştan başla'); }
    else { b.innerHTML = running ? ICON.stop : ICON.play; b.setAttribute('aria-label', running ? 'Durdur' : 'Dinle'); }
  }
  const setTempo = (d) => { pl.tempo = Math.max(24, Math.min(220, pl.tempo + d)); db.tempo[item.id] = pl.tempo; save(); updateUI(); if (pl.state === 'playing') { pl.stop(true); pl.play(); } };

  function nextAction(hand) {
    if (item.kind === 'piece' && both && hand !== 'both') {
      const nx = hand === 'lh' ? 'rh' : 'both';
      return { label: `${HAND[nx]} ile devam et`, run: () => { pl.stop(); pl.setHands(nx); updateUI(); } };
    }
    if (!whole && sec < item.sections.length - 1) return { label: 'Sonraki bölüm', run: () => { location.hash = `#/c/${item.id}/${sec + 1}`; } };
    if (nextItemHref) return { label: 'Sonraki çalışma', run: () => { location.hash = nextItemHref; } };
    return { label: 'Üniteye dön', run: () => { location.hash = backHref; } };
  }
  function showResult(r) {
    const hand = pl.hands, pass = r.pct >= PASS;
    record(item.id, sec, hand, r.pct);
    updateUI();
    if (pl.loop) return;
    const nx = pass ? nextAction(hand) : null;
    const parts = [`${r.wrong} yanlış`, `${r.missed} atlanan`].filter(x => !x.startsWith('0'));
    const sheet = $('.sheet'); sheet.hidden = false;
    sheet.innerHTML = `<div class="sheet-card res" role="dialog" aria-label="Sonuç">
      <p class="big">Yüzde ${r.pct}</p>
      <p>${HAND[hand]}, ${esc(whole ? allLabel : item.sections.length > 1 ? `ölçü ${range[0] + 1}–${range[1]}` : item.title)}${r.bpm ? `, tempon ${r.bpm}` : ''}${parts.length ? `. ${parts.join(', ')}` : ''}.</p>
      <p class="m">${pass ? (isDone(item) ? 'Bu çalışma tamamlandı.' : 'Bu el geçti.') : `Geçmek için yüzde ${PASS} gerekir. Tempoyu düşür ya da zor ölçüyü döngüye al.`}</p>
      ${nx ? `<button class="pri" data-r="next">${esc(nx.label)}</button>` : ''}
      <button class="sec" data-r="again">Yeniden çal</button>
      ${r.weak?.length ? `<button class="sec" data-r="weak">En zor ölçüyü döngüye al (${disp(r.weak[0])})</button>` : ''}
    </div>`;
    sheet.onclick = (e) => {
      if (e.target === sheet) { sheet.hidden = true; return; }
      const b = e.target.closest('[data-r]'); if (!b) return;
      sheet.hidden = true;
      if (b.dataset.r === 'next') nx.run();
      if (b.dataset.r === 'weak') { pl.setLoop(r.weak[0], Math.min(s.measures.length - 1, r.weak[0] + 1)); updateUI(); status.textContent = `Ölçü ${disp(r.weak[0])} döngüde.`; }
    };
  }
  function onState(st) {
    if (st === 'following') { status.textContent = Inputs.midi.ready ? 'Çalmaya başla, porte seni izliyor.' : 'MIDI klavyeni bağla ya da aşağıdaki tuşlara bas.'; setGo(); }
    if (st === 'auto-follow') updateUI();
    if (st === 'follow-step') { const f = pl.fw; if (f) status.textContent = `${pl.stepIdx} / ${pl.steps.length} adım${f.wrong ? `, ${f.wrong} yanlış` : ''}`; }
    if (st === 'follow-done') { status.textContent = ''; showResult(pl.lastFollow); }
    if (st === 'playing') setGo();
    if (st === 'done' || st === 'stopped') { setGo(); if (pl.mode === 'listen') status.textContent = ''; }
    if (st === 'tempo') updateUI();
  }
  async function doMidi() {
    const r = await connectMIDI();
    if (!r.ok) toast(r.reason === 'denied' ? 'MIDI izni verilmedi. Adres çubuğundaki izinlerden aç.' : 'Bu tarayıcıda MIDI yok. Chrome ya da Edge kullan.');
    else if (r.busy.length && !r.devices.length) toast('MIDI aygıtı başka bir programda açık. O programı kapatıp yeniden dene.');
    else if (!r.devices.length) toast('MIDI izni tamam, aygıt görünmüyor. Kabloyu kontrol et.');
    else toast('MIDI bağlandı: ' + r.devices[0]);
    updateMidi(); if (pl.mode === 'follow') onState('following');
  }
  function openSet() {
    const sheet = $('.sheet'); sheet.hidden = false;
    sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-label="Görünüm ve ses">
      <label class="row">Nota boyutu<input type="range" min="0.75" max="1.5" step="0.05" value="${S.zoom}" data-s="zoom"></label>
      <label class="row">Piyano sesi<select data-s="piano">${PIANOS.map(p => `<option value="${p.id}" ${p.id === S.piano ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
      <label class="row">Ses<input type="range" min="0" max="1" step="0.05" value="${S.volume}" data-s="volume"></label>
      <label class="row">Nota adları<input type="checkbox" data-s="names" ${S.names ? 'checked' : ''}></label>
      <label class="row">Parmak numaraları<input type="checkbox" data-s="fingers" ${S.fingers ? 'checked' : ''}></label>
      <label class="row">Metronom<input type="checkbox" data-s="metro" ${S.metro ? 'checked' : ''}></label>
      <label class="row">Klavyemden de ses çıksın<input type="checkbox" data-s="midiSound" ${S.midiSound ? 'checked' : ''}></label>
      <button class="sec" data-r="manual">${db.manual[item.id] ? 'Tamamlandı işaretini kaldır' : 'Bu çalışmayı tamamlandı say'}</button>
      <button class="pri" data-r="close">Kapat</button></div>`;
    sheet.onclick = (e) => {
      if (e.target === sheet) { sheet.hidden = true; return; }
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === 'manual') { setManual(item.id, !db.manual[item.id]); }
      sheet.hidden = true;
    };
    sheet.oninput = (e) => {
      const k = e.target.dataset.s; if (!k) return;
      if (k === 'piano') { S.piano = e.target.value; save(); setPiano(S.piano); return; }
      if (e.target.type === 'checkbox') { S[k] = e.target.checked; save(); if (k === 'metro') pl.metro = S[k]; if (k === 'names' || k === 'fingers') relayout(); return; }
      S[k] = +e.target.value; save();
      if (k === 'zoom') relayout();
      if (k === 'volume') setVolume(S.volume);
    };
  }
  const relayout = () => { engrave(); if (pl.state === 'following') pl.enterFollow(); else if (pl.state === 'idle') pl.previewStart(); };
  $('.pr').addEventListener('click', (e) => {
    const t = e.target.closest('button, .mh'); if (!t || t.closest('.sheet')) return;
    if (t.classList.contains('mh')) {
      if (!loopPick) return;
      const m = +t.dataset.m;
      if (loopA == null) { loopA = m; eng.setLoop(m, m); updateUI(); }
      else { loopPick = false; pl.setLoop(loopA, m); loopA = null; updateUI(); }
      return;
    }
    if (t.dataset.mode) { ensureAudio(); pl.stop(); pl.mode = t.dataset.mode; if (pl.mode === 'follow') pl.startFollow(); else status.textContent = ''; updateUI(); return; }
    if (t.dataset.hand) { pl.stop(); pl.setHands(t.dataset.hand); updateUI(); return; }
    switch (t.dataset.a) {
      case 'how': { const h = $('.pr-how'); h.hidden = !h.hidden; t.setAttribute('aria-expanded', !h.hidden); break; }
      case 'set': openSet(); break;
      case 'play': ensureAudio(); if (pl.mode === 'listen' && pl.state === 'playing') pl.stop(); else pl.play(); setGo(); break;
      case 't-': setTempo(-4); break;
      case 't+': setTempo(4); break;
      case 'midi': doMidi(); break;
      case 'hint': pl.hint = pl.hint === 'off' ? 'always' : 'off'; S.hint = pl.hint; save(); if (pl.state === 'following') pl.enterFollow(); else if (pl.state === 'idle') pl.previewStart(); updateUI(); break;
      case 'loop':
        if (pl.loop || loopPick) { loopPick = false; loopA = null; pl.setLoop(null); }
        else { loopPick = true; }
        updateUI(); break;
    }
  });
  let lastW = view.clientWidth, rT;
  const ro = new ResizeObserver(() => {
    if (!view.isConnected || view.clientWidth < 100 || Math.abs(view.clientWidth - lastW) < 8) return; lastW = view.clientWidth;
    clearTimeout(rT); rT = setTimeout(relayout, 160);
  });
  ro.observe(view);
  let wake = null;
  (async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* */ } })();
  setVolume(S.volume);
  pl.mode = 'follow'; pl.previewStart(); pl.startFollow();
  updateUI(); updateMidi(); showLoad();
  return { cleanup() { clearTimeout(rT); removeEventListener('midi-devices', onMidiDev); removeEventListener('piano-progress', showLoad); pl.destroy(); kb.destroy(); ro.disconnect(); offInput(); wake?.release?.(); enableComputerKeys(false); }, player: pl };
}
