// Çalışma ekranı: nota + klavye + kontroller
import { parseScore } from '../notation/parse.js';
import { Engraved } from '../notation/render.js';
import { Keyboard } from './keyboard.js';
import { Player } from './player.js';
import { ensureAudio, playNote, setVolume } from '../audio/piano.js';
import { Inputs, connectMIDI, enableComputerKeys } from '../audio/input.js';
import { db, save, logMinutes } from '../store.js';
import { toast, esc } from './dom.js';

const I = {
  back: '<svg viewBox="0 0 20 20"><path d="M12.5 3.5 6 10l6.5 6.5"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path class="fill" d="M7 4.5v15l13-7.5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect class="fill" x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
  gear: '<svg viewBox="0 0 22 22"><path d="M3 6h9m5 0h2M3 16h2m5 0h9"/><circle cx="14.5" cy="6" r="2.4"/><circle cx="7.5" cy="16" r="2.4"/></svg>',
};
const HINTS = { always: 'Tuşlar açık', error: 'Hata olunca', off: 'Tuşlar kapalı' };
const HNEXT = { always: 'error', error: 'off', off: 'always' };

export function mountPractice(root, cfg, { onExit }) {
  const lessonId = cfg.lessonId;
  const def = cfg.def;
  const score = parseScore(def);
  if (cfg.firstBar) score.measures.forEach(m => { m.display = m.i + cfg.firstBar; });
  root.innerHTML = `
  <section class="practice">
    <header class="p-head">
      <button class="icon-btn" data-a="back" aria-label="Geri">${I.back}</button>
      <div class="p-title"><h1>${esc(cfg.title || def.title || 'Çalışma')}</h1>${cfg.sub ? `<p>${esc(cfg.sub)}</p>` : ''}</div>
      ${cfg.how?.length ? `<button class="txt-btn ${lessonId && !db.seen?.[lessonId] ? 'on' : ''}" data-a="how">Nasıl çalışılır</button>` : ''}
      <button class="icon-btn" data-a="set" aria-label="Ayarlar">${I.gear}</button>
    </header>
    ${cfg.how?.length ? `<div class="p-how" ${lessonId && !db.seen?.[lessonId] ? '' : 'hidden'}><p class="goal">${esc(cfg.goal || '')}</p><ol>${cfg.how.map(h => `<li>${esc(h)}</li>`).join('')}</ol>${cfg.src ? `<p class="src">${esc(cfg.src)}</p>` : ''}</div>` : ''}
    ${cfg.note ? `<p class="p-note">${esc(cfg.note)}</p>` : ''}
    <div class="score-view" tabindex="0" aria-label="Nota"><div class="score-host"></div></div>
    <div class="p-status" role="status"></div>
    <div class="p-dock">
      <div class="dock-main">
        <button class="play-btn" data-a="play" aria-label="Başlat">${I.play}</button>
        <div class="tempo" aria-label="Tempo">
          <button data-a="t-" aria-label="Yavaşlat">−</button>
          <label><output class="tval"></output><small>vuruş/dk</small></label>
          <button data-a="t+" aria-label="Hızlandır">+</button>
        </div>
        <button class="clean-btn" data-a="clean"><span class="pips"></span><span class="cl">Temiz çaldım</span></button>
      </div>
      <div class="dock-row">
        <div class="seg" role="group" aria-label="Kip">
          <button data-mode="listen">Dinle</button><button data-mode="with">Birlikte</button><button data-mode="wait">Bekle</button>
        </div>
        <div class="seg hands" role="group" aria-label="El" ${score.staves.rh && score.staves.lh ? '' : 'hidden'}>
          <button data-hand="lh" class="lh-tag">Sol</button><button data-hand="both">İki el</button><button data-hand="rh" class="rh-tag">Sağ</button>
        </div>
      </div>
      <div class="dock-row minor">
        <button class="chip" data-a="loop">Döngü</button>
        <button class="chip" data-a="hint"></button>
        ${cfg.showBreak ? '<button class="chip" data-a="break">Ezberi kır</button>' : ''}
        ${lessonId ? '<button class="chip done" data-a="finish">Dersi bitir</button>' : ''}
      </div>
    </div>
    <div class="kb-host"></div>
    <div class="sheet" hidden></div>
  </section>`;
  const $ = (s) => root.querySelector(s);
  const S = db.settings;
  if (lessonId) { db.seen = db.seen || {}; db.seen[lessonId] = true; save(); }
  const scoreHost = $('.score-host'), view = $('.score-view'), status = $('.p-status');
  let eng, pl;
  const engrave = () => {
    const w = view.clientWidth - 8;
    const base = w < 480 ? 6.6 : w < 900 ? 8 : w < 1200 ? 9.5 : 11;
    eng = new Engraved(score, scoreHost, { width: w, sp: base * S.zoom, showFingers: S.fingers, showNames: S.names });
    if (pl) pl.setEngraved(eng);
  };
  engrave();
  const allMidis = score.measures.flatMap(m => ['rh', 'lh'].flatMap(h => m[h] ? m[h].voices.flat().flatMap(e => e.notes.map(n => n.midi)) : []));
  const low = Math.min(36, ...allMidis), high = Math.max(84, ...allMidis);
  const voices = new Map();
  const kb = new Keyboard($('.kb-host'), {
    low: low - (low % 12), high: high + (12 - (high % 12)) % 12,
    onDown: (m) => { ensureAudio(); voices.set(m, playNote(m, 0, null, 0.72)); Inputs.emit('down', m, 'touch'); },
    onUp: (m) => { voices.get(m)?.release?.(); voices.delete(m); Inputs.emit('up', m, 'touch'); },
  });
  pl = new Player({ score, engraved: eng, keyboard: kb, onState });
  pl.hands = cfg.hands || 'both';
  const stored = lessonId && db.tempo[lessonId];
  pl.tempo = stored || cfg.tempo || def.tempo || 72;
  pl.metro = S.metro; pl.countIn = S.countIn; pl.hint = S.hint;
  pl.buildSteps();
  enableComputerKeys(true);
  const offInput = Inputs.on((t, m, src) => {
    if (src === 'pc' || (src === 'midi' && S.midiSound)) {
      if (t === 'down') { ensureAudio(); voices.set(m, playNote(m, 0, null, 0.72)); }
      else { voices.get(m)?.release?.(); voices.delete(m); }
    }
  });
  let loopPick = false, loopA = null;
  const updateUI = () => {
    root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === pl.mode));
    root.querySelectorAll('[data-hand]').forEach(b => b.classList.toggle('on', b.dataset.hand === pl.hands));
    $('.tval').textContent = Math.round(pl.tempo);
    $('[data-a=hint]').textContent = HINTS[pl.hint];
    $('[data-a=loop]').classList.toggle('on', !!pl.loop || loopPick);
    $('[data-a=loop]').textContent = loopPick ? (loopA == null ? 'İlk ölçüye dokun' : 'Son ölçüye dokun') : pl.loop ? `Döngü ${disp(pl.loop.a)}–${disp(pl.loop.b)}` : 'Döngü';
    const c = (lessonId && db.clean[lessonId]) || cleanLocal;
    $('.pips').innerHTML = [0, 1, 2].map(i => `<i class="${i < c ? 'f' : ''}"></i>`).join('');
  };
  let cleanLocal = 0;
  const disp = (i) => i + 1 + (cfg.firstBar || 0);
  const setPlayIcon = (on) => { const b = $('[data-a=play]'); b.innerHTML = on ? I.stop : I.play; b.setAttribute('aria-label', on ? 'Durdur' : 'Başlat'); };
  function onState(st) {
    if (st === 'playing' || st === 'waiting') setPlayIcon(true);
    if (st === 'stopped') { setPlayIcon(false); status.textContent = ''; }
    if (st === 'tempo') updateUI();
    if (st === 'progress' || st === 'waiting') {
      const s = pl.stats; const done = pl.stepIdx;
      status.textContent = `${done} / ${pl.steps.length} adım${s.wrong ? `, ${s.wrong} yanlış` : ''}`;
    }
    if (st === 'done') {
      setPlayIcon(false);
      if (pl.mode === 'wait' && pl.stats) {
        const pct = pl.stats.total ? Math.round(100 * pl.stats.first / pl.stats.total) : 0;
        status.textContent = `İlk denemede doğru: yüzde ${pct}`;
        if (pct >= 95) { addClean(); }
      } else status.textContent = '';
    }
  }
  function addClean() {
    if (lessonId) {
      db.clean[lessonId] = (db.clean[lessonId] || 0) + 1;
      if (db.clean[lessonId] >= 3) {
        db.clean[lessonId] = 0; pl.tempo += 4; db.tempo[lessonId] = pl.tempo;
        toast(`Üç temiz tekrar. Tempo ${Math.round(pl.tempo)} oldu.`);
      } else toast('Temiz tekrar kaydedildi.');
      save();
    } else {
      cleanLocal++;
      if (cleanLocal >= 3) { cleanLocal = 0; pl.tempo += 4; toast(`Üç temiz tekrar. Tempo ${Math.round(pl.tempo)} oldu.`); }
    }
    updateUI();
  }
  const setTempo = (d) => { pl.tempo = Math.max(24, Math.min(220, pl.tempo + d)); if (lessonId) { db.tempo[lessonId] = pl.tempo; save(); } updateUI(); if (pl.state === 'playing') { pl.stop(true); pl.play(); } };
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, .mh'); if (!t) return;
    if (t.classList.contains('mh')) {
      if (!loopPick) return;
      const m = +t.dataset.m;
      if (loopA == null) { loopA = m; eng.setLoop(m, m); updateUI(); }
      else { loopPick = false; pl.setLoop(loopA, m); loopA = null; updateUI(); }
      return;
    }
    if (t.dataset.mode) { pl.stop(); pl.mode = t.dataset.mode; updateUI(); if (pl.mode === 'wait') status.textContent = 'Ekrandaki tuşlara bas, MIDI klavye bağla ya da ayarlardan mikrofonu aç.'; else if (pl.mode === 'with') status.textContent = 'Seçili eli sen çal; öteki eli uygulama çalar.'; else status.textContent = ''; return; }
    if (t.dataset.hand) { pl.stop(); pl.setHands(t.dataset.hand); updateUI(); return; }
    switch (t.dataset.a) {
      case 'back': cleanup(); onExit(); break;
      case 'how': { const h = $('.p-how'); h.hidden = !h.hidden; t.classList.toggle('on', !h.hidden); relayout(); break; }
      case 'set': openSheet(); break;
      case 'play': if (pl.state !== 'idle') { pl.stop(); setPlayIcon(false); } else pl.play(); break;
      case 't-': setTempo(-4); break;
      case 't+': setTempo(4); break;
      case 'clean': addClean(); break;
      case 'hint': pl.hint = HNEXT[pl.hint]; S.hint = pl.hint; save(); pl.previewStart(); updateUI(); break;
      case 'loop':
        if (pl.loop || loopPick) { loopPick = false; loopA = null; pl.setLoop(null); }
        else { pl.stop(); loopPick = true; }
        updateUI(); break;
      case 'break': {
        const n = score.measures.length, a = Math.floor(Math.random() * Math.max(1, n - 1)), b = Math.min(n - 1, a + 1);
        pl.hint = 'off'; pl.setLoop(a, b); updateUI();
        status.textContent = `Başlangıç: ölçü ${disp(a)}. Önce sol elin ilk notasını söyle.`;
        break;
      }
      case 'finish':
        db.done[lessonId] = true; save(); toast('Ders tamamlandı.'); cleanup(); onExit(); break;
    }
  });
  function openSheet() {
    const sheet = $('.sheet'); sheet.hidden = false;
    const midiLine = Inputs.midi.supported ? `<button class="chip" data-s="midi">${Inputs.midi.ready ? (Inputs.midi.devices.length ? 'Bağlı: ' + esc(Inputs.midi.devices.join(', ')) : 'MIDI aygıtı bulunamadı') : 'MIDI klavyeyi bağla'}</button>` : '<p class="muted">Bu tarayıcıda MIDI yok. Chrome, Edge ya da Firefox kullan; iPhone ve iPad’de mikrofonu aç.</p>';
    sheet.innerHTML = `<div class="sheet-card" role="dialog" aria-label="Ayarlar">
      <h2>Ayarlar</h2>
      <label class="row"><span>Parmak numaraları</span><input type="checkbox" data-c="fingers" ${S.fingers ? 'checked' : ''}></label>
      <label class="row"><span>Nota adları</span><input type="checkbox" data-c="names" ${S.names ? 'checked' : ''}></label>
      <label class="row"><span>Metronom</span><input type="checkbox" data-c="metro" ${pl.metro ? 'checked' : ''}></label>
      <label class="row"><span>Baştan bir ölçü say</span><input type="checkbox" data-c="countIn" ${pl.countIn ? 'checked' : ''}></label>
      <label class="row"><span>Tekrarları çal</span><input type="checkbox" data-c="repeats" ${pl.useRepeats ? 'checked' : ''}></label>
      <label class="row"><span>Döngüde tempoyu artır</span><input type="checkbox" data-c="autoUp" ${pl.autoUp ? 'checked' : ''}></label>
      <label class="row"><span>Nota boyu</span><input type="range" min="0.7" max="1.6" step="0.05" value="${S.zoom}" data-r="zoom"></label>
      <label class="row"><span>Ses düzeyi</span><input type="range" min="0" max="1" step="0.05" value="${S.volume}" data-r="vol"></label>
      <div class="row wrap">${midiLine}<button class="chip" data-s="mic">${pl.mic ? 'Mikrofonu kapat' : 'Mikrofonu aç'}</button></div>
      <p class="muted">Mikrofon tek ses ve basit iki seste iyi çalışır. Kalabalık akorlarda MIDI kullan.</p>
      <button class="primary" data-s="close">Kapat</button>
    </div>`;
    sheet.onclick = async (e) => {
      if (e.target === sheet) { sheet.hidden = true; return; }
      const b = e.target.closest('[data-s]'); if (!b) return;
      if (b.dataset.s === 'close') sheet.hidden = true;
      if (b.dataset.s === 'midi') { const r = await connectMIDI(); toast(r.ok ? (r.devices.length ? 'MIDI bağlandı.' : 'MIDI izni verildi ama aygıt görünmüyor.') : 'MIDI bağlanamadı.'); openSheet(); }
      if (b.dataset.s === 'mic') { const on = !pl.mic; const ok = await pl.enableMic(on); if (!ok) toast('Mikrofon izni verilmedi.'); openSheet(); }
    };
    sheet.onchange = (e) => {
      const c = e.target.dataset.c;
      if (c === 'fingers' || c === 'names') { S[c] = e.target.checked; save(); engrave(); pl.previewStart(); }
      if (c === 'metro') { pl.metro = S.metro = e.target.checked; save(); }
      if (c === 'countIn') { pl.countIn = S.countIn = e.target.checked; save(); }
      if (c === 'repeats') pl.setRepeats(e.target.checked);
      if (c === 'autoUp') pl.autoUp = e.target.checked;
    };
    sheet.oninput = (e) => {
      if (e.target.dataset.r === 'zoom') { S.zoom = +e.target.value; save(); engrave(); pl.previewStart(); }
      if (e.target.dataset.r === 'vol') { S.volume = +e.target.value; setVolume(S.volume); save(); }
    };
  }
  const relayout = () => { engrave(); pl.previewStart(); };
  let lastW = view.clientWidth, rT;
  const ro = new ResizeObserver(() => {
    if (!view.isConnected || view.clientWidth < 100 || Math.abs(view.clientWidth - lastW) < 8) return; lastW = view.clientWidth;
    clearTimeout(rT); rT = setTimeout(relayout, 160);
  });
  ro.observe(view);
  let wake = null;
  (async () => { try { wake = await navigator.wakeLock?.request('screen'); } catch (e) { /* */ } })();
  const timeLog = setInterval(() => { if (document.visibilityState === 'visible') logMinutes(5); }, 5000);
  setVolume(S.volume);
  pl.previewStart();
  updateUI();
  if (cfg.startMode) { pl.mode = cfg.startMode; updateUI(); }
  function cleanup() { clearTimeout(rT); pl.destroy(); kb.destroy(); ro.disconnect(); offInput(); clearInterval(timeLog); wake?.release?.(); }
  return { cleanup, player: pl };
}
