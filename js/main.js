import { TRACKS, STAGES, LESSONS, MINUTES, byId, nextFor, READ_LEVELS } from './data/curriculum.js';
import { EXERCISE, pieceDef, PIECES, preludeBlocks } from './data/exercises.js';
import { chartToScore, PATTERNS, PROGRESSIONS, romanChart, parseChart, transposeChart, bestSignature, flatTarget } from './gen/accomp.js';
import { vocalScore, VOICES, EXERCISES, STYLES } from './gen/vocal.js';
import { sightScore } from './gen/sight.js';
import { mountPractice } from './ui/practice.js';
import { mountReading } from './ui/reading.js';
import { Keyboard } from './ui/keyboard.js';
import { parseChord, chordTone, keyName, keyLetter, MAJOR_FIFTHS_BY_PC, MINOR_FIFTHS_BY_PC, STEP_SEMI, solfegeName, pitchStr, parsePitch } from './notation/theory.js';
import { parseScore } from './notation/parse.js';
import { Engraved } from './notation/render.js';
import { db, save, streak, today, exportData, importData, resetAll } from './store.js';
import { esc, toast } from './ui/dom.js';
import { ensureAudio, playNote, preloadPiano } from './audio/piano.js';
import { autoConnectMIDI, connectMIDI, Inputs } from './audio/input.js';
import { GLYPHS } from './notation/glyphs.js';

const app = document.getElementById('app'), tabs = document.getElementById('tabs');
let active = null, stash = null;

const F_CLEF = (() => { const g = GLYPHS.fClef; const [x0, y0, x1, y1] = g.b; return `<svg class="big-clef" viewBox="${x0} ${-y1} ${x1 - x0} ${y1 - y0}" aria-hidden="true"><path transform="scale(1,-1)" d="${g.d}"/></svg>`; })();
const HEAD = (filled, cls = '') => `<svg class="head ${filled ? 'filled' : ''} ${cls}" viewBox="0 0 26 20" aria-hidden="true"><path fill-rule="evenodd" d="M2.2 13.6C.6 10 4.4 4.6 10.8 2.3 17.2 0 23 1.7 24 6c1 3.7-2.9 9-9.3 11.4C8.3 19.700 3.800 17.400 2.200 13.600Z${filled ? '' : 'M6 13c.8 1.800 4.300 1.900 8 .3 4-1.700 6.700-4.700 6-6.700-.7-1.900-4.500-2-8.300-.3C7.700 8 5 11.100 6 13Z'}"/></svg>`;

function route() {
  active?.cleanup?.(); active = null;
  const hash = location.hash.slice(2) || 'bugun';
  const [page, arg] = hash.split('/');
  tabs.hidden = ['ders', 'calis', 'oku'].includes(page);
  document.body.classList.toggle('immersive', tabs.hidden);
  tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.p === page));
  window.scrollTo(0, 0);
  ({ bugun, yol, okuma, eslik, san, ayar, ders: () => openLesson(arg), calis: openStash, oku: () => openRead(arg) }[page] || bugun)();
}
addEventListener('hashchange', route);

const go = (h) => { location.hash = '#/' + h; };
function launch(cfg, back) { stash = { ...cfg, back }; if (location.hash === '#/calis') route(); else go('calis'); }
function openStash() {
  if (!stash) return go('bugun');
  const back = stash.back || 'bugun';
  active = mountPractice(app, stash, { onExit: () => go(back) });
}
function openRead(id) { active = mountReading(app, id, { onExit: () => go('okuma') }); }

// Ders açma
export function lessonDef(l) {
  const S = db.settings;
  switch (l.kind) {
    case 'ex': return { def: EXERCISE[l.ex], hands: l.hands, tempo: l.tempo || EXERCISE[l.ex].tempo };
    case 'piece': {
      const def = pieceDef(l.piece, { from: l.from, to: l.to, keepRepeats: true });
      return { def, hands: l.hands, tempo: l.tempo, src: `${PIECES[l.piece].composer}. Kaynak: ${PIECES[l.piece].src}`, firstBar: l.from || 0, showBreak: true };
    }
    case 'prelude': return { def: preludeBlocks(), hands: 'both', tempo: l.tempo };
    case 'accomp': {
      const sig = bestSignature(l.chart);
      return { def: chartToScore({ chart: l.chart, pattern: l.pattern, tempo: l.tempo, key: sig.fifths, title: PATTERNS[l.pattern].name, repeat: 2 }), hands: 'both', tempo: l.tempo };
    }
    case 'vocal': {
      const v = VOICES[S.voice];
      const def = vocalScore({ ex: l.ex, voice: S.voice, style: l.style, maxKeys: l.maxKeys, tempo: l.tempo });
      return { def, hands: 'both', tempo: l.tempo || def.tempo, note: def.octaveUp ? 'Nota bir oktav yukarıda yazıldı; erkek sesi bir oktav aşağıdan söyler.' : '' };
    }
    case 'sight': return { def: sightScore({ level: l.level, hands: l.hands }), hands: l.hands === 'both' ? 'both' : l.hands, tempo: null, startMode: 'wait' };
  }
}
function openLesson(id) {
  const l = byId(id);
  if (!l) return go('yol');
  if (l.kind === 'read') { active = mountReading(app, l.level, { onExit: () => go('bugun'), lessonId: l.id }); return; }
  if (l.kind === 'studio') { db.done[l.id] = true; save(); return go('eslik'); }
  const d = lessonDef(l);
  active = mountPractice(app, { ...d, title: l.title, goal: l.goal, how: l.how, lessonId: l.id }, { onExit: () => go('bugun') });
}

// --- Bugün: beş çizgili porte
function bugun() {
  const S = db.settings;
  const mins = MINUTES[S.minutes];
  const plan = TRACKS.map(t => ({ t, l: nextFor(t.id, db.done), m: mins[t.id] }));
  const first = plan.find(p => p.l);
  const doneCount = Object.keys(db.done).length;
  const todaySec = db.log[today()] || 0, st = streak();
  const stage = STAGES.find(s => s.n === (first?.l.stage || 6));
  app.innerHTML = `<section class="home">
    <header class="home-top">
      <div><h1>Bugünkü porte</h1><p class="lede">${esc(stage.name)}. ${esc(stage.goal)}</p></div>
      <a class="icon-btn" href="#/ayar" aria-label="Ayarlar ve kaynaklar"><svg viewBox="0 0 22 22"><path d="M3 6h9m5 0h2M3 16h2m5 0h9"/><circle cx="14.500" cy="6" r="2.400"/><circle cx="7.500" cy="16" r="2.400"/></svg></a>
    </header>
    <div class="mins seg" role="group" aria-label="Süre">${[15, 30, 45].map(m => `<button data-m="${m}" class="${S.minutes === m ? 'on' : ''}">${m} dakika</button>`).join('')}</div>
    <div class="staff-board">
      ${F_CLEF}
      <ol class="staff-lines">
        ${plan.map(({ t, l, m }) => l ? `<li><a href="#/ders/${l.id}">${HEAD(false)}<span class="lt"><small>${t.name}</small><b>${esc(l.title)}</b></span><span class="lm">${m} dk</span></a></li>` : `<li><div class="empty-line">${HEAD(true)}<span class="lt"><small>${t.name}</small><b>Bu kol bitti</b></span></div></li>`).join('')}
      </ol>
    </div>
    ${first ? `<a class="primary wide" href="#/ders/${first.l.id}">${esc(first.t.name)} ile başla</a>` : '<p class="lede">Bütün dersleri bitirdin. Eşlik sekmesinde kendi şarkılarınla devam et.</p>'}
    <p class="tally">${Math.round(todaySec / 60)} dakika çalıştın, ${st} günlük seri, ${doneCount} / ${LESSONS.length} ders.</p>
    <section class="book">
      <h2>Enver Tufan metodu</h2>
      <div class="book-row"><button class="round" data-b="-1" aria-label="Sayfayı azalt">−</button><strong>Sayfa ${S.book}</strong><button class="round" data-b="1" aria-label="Sayfayı artır">+</button></div>
      <p>Kitabın her yeni sayfasında önce sol eli solfejle söyle, sonra yalnız sol eli çal, en son iki eli birleştir.</p>
    </section>
  </section>`;
  app.querySelector('.mins').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { S.minutes = +b.dataset.m; save(); bugun(); } };
  app.querySelector('.book').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) { S.book = Math.max(1, S.book + +b.dataset.b); save(); bugun(); } };
}

// --- Yol: her aşama bir ölçü
function yol() {
  const firstOpen = LESSONS.find(l => !db.done[l.id]);
  app.innerHTML = `<section class="path"><h1>Yol haritası</h1>
    <p class="lede">Beş çizgi beş koldur: okuma, iki el, klasik, eşlik, şan. Dolu notalar bitti, halkalı nota sıradaki ders. Bir aşamanın notalarına dokun.</p>
    ${STAGES.map(st => {
    const inS = LESSONS.filter(l => l.stage === st.n);
    const done = inS.filter(l => db.done[l.id]).length;
    return `<article class="stage"><header><h2><span class="snum">${st.n}</span>${esc(st.name)}</h2><span class="sdone">${done}/${inS.length}</span></header>
      <p>${esc(st.goal)}</p>
      <div class="mstaff">${TRACKS.map(t => {
      const ls = inS.filter(l => l.track === t.id);
      return `<div class="mline"><span class="mt">${t.name}</span><div class="mnotes">${ls.map(l => `<a href="#/ders/${l.id}" title="${esc(l.title)}" aria-label="${esc(t.name + ': ' + l.title)}" class="${firstOpen?.id === l.id ? 'cur' : ''}">${HEAD(!!db.done[l.id])}</a>`).join('')}</div></div>`;
    }).join('')}</div>
      <details><summary>Dersleri listele</summary><ul class="llist">${inS.map(l => `<li class="${db.done[l.id] ? 'd' : ''}"><a href="#/ders/${l.id}"><small>${TRACKS.find(t => t.id === l.track).name}</small> ${esc(l.title)}</a></li>`).join('')}</ul></details>
    </article>`;
  }).join('')}
  </section>`;
}

// --- Okuma
function okuma() {
  const lv = Object.entries(READ_LEVELS);
  const score = (id) => { const s = db.reading[id]; if (!s) return ''; const a = Object.values(s); const n = a.reduce((x, y) => x + y.n, 0), e = a.reduce((x, y) => x + y.e, 0); return n ? `yüzde ${Math.round(100 * (1 - e / n))}` : ''; };
  app.innerHTML = `<section class="plain"><h1>Okuma</h1>
    <p class="lede">Kafiye ezberleme yok. Duraklar öğrenilir, gerisi durağa olan uzaklıktan okunur. Yanlış yaptığın notalar daha sık gelir.</p>
    <h2>Nota bulma</h2><ul class="levels">${lv.map(([id, l]) => `<li><a href="#/oku/${id}"><span>${esc(l.title)}</span><small>${score(id)}</small></a></li>`).join('')}</ul>
    <h2>Deşifre</h2><p>Her açılışta yeni, kısa bir parça üretilir.</p>
    <form class="form" id="sf"><label>Düzey<select name="level"><option value="1">1: tam ve yarımlık</option><option value="2">2: eller sırayla</option><option value="3">3: iki el birlikte</option><option value="4">4: sekizlik ve noktalı</option></select></label>
    <label>El<select name="hands"><option value="lh">Sol el</option><option value="rh">Sağ el</option><option value="both">İki el</option></select></label>
    <button class="primary">Yeni parça üret</button></form></section>`;
  app.querySelector('#sf').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); launch({ def: sightScore({ level: +f.get('level'), hands: f.get('hands') }), hands: f.get('hands'), startMode: 'wait', title: 'Deşifre', sub: 'Önce 10 saniye bak, sonra durmadan çal.' }, 'okuma'); };
}

// --- Eşlik
const SEMI = [...Array(12).keys()];
const KEY_LIST = (mode) => SEMI.map(pc => { const f = mode === 'minor' ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc]; return { f, pc, label: keyName(f, mode) + ' (' + keyLetter(f, mode) + ')' }; });
function eslik() {
  const st = eslik.state || (eslik.state = { chart: 'C | G | Am | F', pattern: 'balad', tempo: 72, semi: 0, title: '' });
  app.innerHTML = `<section class="plain"><h1>Eşlik</h1>
    <p class="lede">Akorları yaz, kalıbı seç; iki elli eşlik notası oluşsun. Ton sesine uymuyorsa kaydır.</p>
    <form class="form" id="af">
      <label class="full">Akorlar <small>Ölçüleri | ile ayır. Do, Rem gibi solfej de yazabilirsin.</small>
        <textarea name="chart" rows="2" spellcheck="false" autocapitalize="off">${esc(st.chart)}</textarea><span class="err" id="cerr"></span></label>
      <label>Kalıp<select name="pattern">${Object.entries(PATTERNS).map(([k, p]) => `<option value="${k}" ${k === st.pattern ? 'selected' : ''}>${p.name}</option>`).join('')}</select></label>
      <label>Tempo<input type="number" name="tempo" value="${st.tempo}" min="30" max="200"></label>
      <div class="full transp"><span>Ton kaydır</span><button type="button" class="round" data-t="-1" aria-label="Yarım ton aşağı">−</button><output id="semi">${st.semi > 0 ? '+' : ''}${st.semi}</output><button type="button" class="round" data-t="1" aria-label="Yarım ton yukarı">+</button><small id="kname"></small></div>
      <p class="full hint" id="phint"></p>
      <button class="primary full">Eşliği aç</button>
    </form>
    <h2>Hazır diziler</h2>
    <div class="prog-grid">${PROGRESSIONS.map(p => `<button class="prog" data-p="${p.id}"><b>${esc(p.name)}</b><small>${esc(p.note)}</small></button>`).join('')}</div>
    <h2>Şarkılarım</h2>
    <ul class="songs" id="songs"></ul>
    <form class="form" id="sv"><label class="full">Bu akorları kaydet<input name="title" placeholder="Şarkı adı" autocomplete="off"></label><button class="txt-btn">Kaydet</button></form>
    <h2>Akor bul</h2>
    <form class="form" id="cf"><label class="full">Akor adı<input name="c" value="Am7" autocapitalize="off" spellcheck="false"></label></form>
    <p id="cnotes" class="cnotes"></p><div class="kb-host small" id="ckb"></div>
  </section>`;
  const af = app.querySelector('#af');
  const hint = () => { app.querySelector('#phint').textContent = PATTERNS[af.pattern.value].hint; };
  hint(); af.pattern.onchange = hint;
  const final = () => {
    const { bad, bars } = parseChart(af.chart.value);
    app.querySelector('#cerr').textContent = bad.length ? `Okunamayan akor: ${bad.join(', ')}` : '';
    if (bad.length || !bars.length) { app.querySelector('#kname').textContent = ''; return null; }
    const text = st.semi ? transposeChart(af.chart.value, st.semi, flatTarget(af.chart.value, st.semi)) : af.chart.value;
    const sig = bestSignature(text);
    app.querySelector('#kname').textContent = st.semi ? `${keyName(sig.fifths, sig.mode)}: ${text}` : keyName(sig.fifths, sig.mode);
    return { text, sig };
  };
  final();
  af.chart.oninput = final;
  af.onclick = (e) => { const b = e.target.closest('[data-t]'); if (b) { st.semi = Math.max(-11, Math.min(11, st.semi + +b.dataset.t)); app.querySelector('#semi').textContent = (st.semi > 0 ? '+' : '') + st.semi; final(); } };
  af.onsubmit = (e) => {
    e.preventDefault(); const r = final(); if (!r) return;
    st.chart = af.chart.value; st.pattern = af.pattern.value; st.tempo = +af.tempo.value || 72;
    const def = chartToScore({ chart: r.text, pattern: st.pattern, tempo: st.tempo, key: r.sig.fifths, title: PATTERNS[st.pattern].name, repeat: 2 });
    launch({ def, hands: 'both', tempo: st.tempo, title: PATTERNS[st.pattern].name, sub: r.text }, 'eslik');
  };
  app.querySelector('.prog-grid').onclick = (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const p = PROGRESSIONS.find(x => x.id === b.dataset.p);
    af.chart.value = romanChart(p.rn, p.mode === 'minor' ? 0 : 0, p.mode); st.semi = 0; app.querySelector('#semi').textContent = '0'; final();
    af.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const renderSongs = () => {
    const ul = app.querySelector('#songs');
    ul.innerHTML = db.songs.length ? db.songs.map((s, i) => `<li><button class="link" data-o="${i}">${esc(s.title)}</button><small>${esc(s.chart)}</small><button class="x" data-del="${i}" aria-label="${esc(s.title)} şarkısını sil">Sil</button></li>`).join('') : '<li class="muted">Henüz kayıt yok. Sevdiğin bir şarkının akorlarını yukarıya yaz ve kaydet.</li>';
  };
  renderSongs();
  app.querySelector('#songs').onclick = (e) => {
    const o = e.target.closest('[data-o]'), d = e.target.closest('[data-del]');
    if (o) { af.chart.value = db.songs[+o.dataset.o].chart; final(); af.scrollIntoView({ behavior: 'smooth' }); }
    if (d) { db.songs.splice(+d.dataset.del, 1); save(); renderSongs(); }
  };
  app.querySelector('#sv').onsubmit = (e) => { e.preventDefault(); const t = e.target.title.value.trim(); if (!t) return toast('Şarkıya bir ad ver.'); db.songs.push({ title: t, chart: af.chart.value }); save(); e.target.reset(); renderSongs(); toast('Şarkı kaydedildi.'); };
  // Akor bulucu
  const kb = new Keyboard(app.querySelector('#ckb'), { low: 48, high: 84, onDown: (m) => { ensureAudio(); playNote(m, 0, 0.8, 0.7); } });
  active = { cleanup: () => kb.destroy() };
  const cf = app.querySelector('#cf');
  const showChord = () => {
    const c = parseChord(cf.c.value), box = app.querySelector('#cnotes');
    if (!c) { box.textContent = 'Bu akoru okuyamadım. Örnek: Am, F#m7, Bb, Csus4, Lam, Sol7'; kb.clearMarks(); return; }
    const notes = c.tones.map(([d, s]) => chordTone(c, d, s, 4));
    box.textContent = notes.map(n => solfegeName(n)).join(', ');
    const f = notes.length === 4 ? [1, 2, 3, 5] : [1, 3, 5];
    kb.setMarks(new Map(notes.map((n, i) => [n.midi, { hand: 'rh', finger: f[i] }])));
    kb.focusRange(Math.min(...notes.map(n => n.midi)), Math.max(...notes.map(n => n.midi)), true);
  };
  cf.c.oninput = showChord; cf.onsubmit = (e) => e.preventDefault();
  requestAnimationFrame(showChord);
}

// --- Şan
function san() {
  const S = db.settings;
  const st = san.state || (san.state = { ex: 'besli', style: 'akor', dir: 'up', low: '', high: '', use: 'sing' });
  const v = VOICES[S.voice];
  app.innerHTML = `<section class="plain"><h1>Şan</h1>
    <p class="lede">Alıştırmayı kendi aralığında yarım ton yürüt. Piyano çalarken stakato, legato ve sol el akorunu aynı anda çalışırsın.</p>
    <form class="form" id="vf">
      <label>Ses türü<select name="voice">${Object.entries(VOICES).map(([k, x]) => `<option value="${k}" ${k === S.voice ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      <label>Kullanım<select name="use"><option value="sing" ${st.use === 'sing' ? 'selected' : ''}>Söyle, uygulama çalsın</option><option value="play" ${st.use === 'play' ? 'selected' : ''}>Piyanoda ben çalayım</option></select></label>
      <label class="full">Alıştırma<select name="ex">${Object.entries(EXERCISES).map(([k, x]) => `<option value="${k}" ${k === st.ex ? 'selected' : ''}>${x.name}</option>`).join('')}</select><small id="why"></small></label>
      <label>Eşlik<select name="style">${Object.entries(STYLES).map(([k, x]) => `<option value="${k}" ${k === st.style ? 'selected' : ''}>${x.name}</option>`).join('')}</select></label>
      <label>Yön<select name="dir"><option value="up">Yukarı</option><option value="updown">Yukarı ve geri</option><option value="down">Aşağı</option></select></label>
      <label>En alt tonik<input name="low" value="${esc(st.low || v.low)}" spellcheck="false" autocapitalize="off"></label>
      <label>En üst nota<input name="high" value="${esc(st.high || v.high)}" spellcheck="false" autocapitalize="off"></label>
      <p class="full hint">Perdeleri c4 (orta Do), f#3, bb4 biçiminde yaz. Aralığı öğretmeninle belirle; zorlandığın notanın üstüne çıkma.</p>
      <button class="primary full">Başlat</button>
    </form>
    <h2>Stakatoyu piyanoda çalmak</h2>
    <p>Stakato parmağı yukarı çekmekle değil, bileğin hafifçe sekmesiyle gelir. Tuşa dokun ve hemen bırak; kol ağırlığı yok. Şanda “ha” atağı nasıl diyaframdan geliyorsa piyanoda da hareket kola değil bileğe aittir. Önce tek notada dört dörtlük stakato çal, sonra beşliye geç.</p>
  </section>`;
  const f = app.querySelector('#vf');
  f.dir.value = st.dir;
  const why = () => { app.querySelector('#why').textContent = EXERCISES[f.ex.value].why; };
  why(); f.ex.onchange = why;
  f.voice.onchange = () => { S.voice = f.voice.value; save(); f.low.value = VOICES[S.voice].low; f.high.value = VOICES[S.voice].high; };
  f.onsubmit = (e) => {
    e.preventDefault();
    let lo, hi; try { lo = parsePitch(f.low.value.trim()); hi = parsePitch(f.high.value.trim()); } catch (x) { return toast('Perdeyi c4, f#3 gibi yaz.'); }
    Object.assign(st, { ex: f.ex.value, style: f.style.value, dir: f.dir.value, low: f.low.value.trim(), high: f.high.value.trim(), use: f.use.value });
    const play = st.use === 'play';
    const def = vocalScore({ ex: st.ex, voice: S.voice, low: st.low, high: st.high, dir: st.dir, style: st.style, maxKeys: play ? 4 : 0 });
    launch({ def, hands: 'both', tempo: def.tempo, title: EXERCISES[st.ex].name, sub: VOICES[S.voice].name, startMode: play ? 'with' : 'listen', note: (def.octaveUp ? 'Nota bir oktav yukarıda yazıldı; erkek sesi bir oktav aşağıdan söyler. ' : '') + EXERCISES[st.ex].why }, 'san');
  };
}

// --- Ayarlar ve kaynaklar
function ayar() {
  const S = db.settings;
  app.innerHTML = `<section class="plain"><h1>Ayarlar ve kaynaklar</h1>
    <h2>MIDI klavye</h2><p>Chrome veya Edge'de klavyeni bağla. Bir nota çalışırken klavyende çalmaya başladığında Takip kipi kendiliğinden açılır.</p>
    <div class="row-btn"><button class="chip" id="mi">${Inputs.midi.devices.length ? 'Bağlı: ' + esc(Inputs.midi.devices.join(', ')) : 'MIDI klavyeyi bağla'}</button></div>
    <h2>Görünüm</h2><div class="seg" id="th">${[['auto', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, t]) => `<button data-th="${k}" class="${S.theme === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <h2>İlerleme yedeği</h2><p>İlerlemen bu tarayıcıda durur. Telefonla bilgisayar arasında taşımak için yedek al.</p>
    <div class="row-btn"><button class="chip" id="ex">Yedeği indir</button><label class="chip file">Yedeği yükle<input type="file" id="im" accept="application/json" hidden></label><button class="chip warn" id="rs">Her şeyi sıfırla</button></div>
    <h2>Nasıl kuruldu</h2>
    <ul class="srcs">
      <li><b>Nota okuma:</b> Frances Clark’ın aralık ve durak nota yaklaşımı (<a href="https://www.wikipedia.org/wiki/Piano_lesson" rel="noopener">Piano pedagogy</a>), <a href="https://composecreate.com/an-integrated-approach-to-reading-music/" rel="noopener">Piano Safari</a> durak notaları.</li>
      <li><b>Çalışma kipleri:</b> Bekle, döngü ve tek el seçimi <a href="https://pianoers.com/flowkey-review/" rel="noopener">flowkey</a> ve <a href="https://www.slashgear.com/1622346/best-apps-learn-piano/" rel="noopener">Skoove</a> örneğinden.</li>
      <li><b>Temiz tekrar ve tempo merdiveni:</b> <a href="https://www.structural-learning.com/research-briefings/practise-the-hard-bit" rel="noopener">Duke, Simmons ve Cash (2009)</a>: 17 ileri düzey piyanoda süre değil, hatayı yerinde düzeltmek ertesi günkü sonucu öngördü.</li>
      <li><b>Eşlik kalıpları:</b> <a href="https://pianowithjonny.com/courses/pop-contemporary-piano-accompaniment-patterns-1/" rel="noopener">Piano With Jonny</a> sol el ve sağ el kalıp mantığı; <a href="https://en.wikipedia.org/wiki/Aksak" rel="noopener">2+2+2+3 aksak</a> ve düm-tek (maksum) deseni. Şarkı notası ve sözü yok; yalnız akor kalıpları var.</li>
      <li><b>Şan:</b> <a href="https://instruct.uwo.ca/music/999/lesson1.html" rel="noopener">Western Üniversitesi</a> üçlü ısınma ve yarım ton yürüyüş; <a href="https://artsunit.nsw.edu.au/video/warm-ups-for-your-choir-primary-eclass-3-flexibility-and-blend-1-focus-on-flexibility" rel="noopener">NSW Arts Unit</a> önce bağlı sonra stakato. Öğretmeninin yönlendirmesi her zaman önce gelir.</li>
      <li><b>Piyano sesi:</b> Musyng Kite Acoustic Grand, <a href="https://github.com/gleitz/midi-js-soundfonts" rel="noopener">midi-js-soundfonts</a> MP3 çıktısı, CC BY-SA 3.0.</li>
      <li><b>Notalar:</b> <a href="https://www.mutopiaproject.org" rel="noopener">Mutopia Project</a> LilyPond kaynaklarından dönüştürüldü. Menuetler ve prelüd kamu malı dizgi; Schumann Melodie CC BY-SA 2.5 (Philippe Hézaine).</li>
      <li><b>Yazı tipi ve işaretler:</b> Alegreya (OFL), FreeSerif müzik işaretleri (GPL + font exception).</li>
    </ul>
    <p class="muted">Enver Tufan’ın kitabının içeriği uygulamaya kopyalanmadı; sayfa numaranı kendin takip edersin.</p>
  </section>`;
  app.querySelector('#mi').onclick = async () => { const r = await connectMIDI(); toast(r.ok ? (r.devices.length ? 'MIDI bağlandı: ' + r.devices[0] : (r.busy.length ? 'MIDI aygıtı başka bir programda açık.' : 'Aygıt görünmüyor. Kabloyu kontrol et.')) : 'MIDI bağlanamadı.'); ayar(); };
  app.querySelector('#th').onclick = (e) => { const b = e.target.closest('[data-th]'); if (b) { S.theme = b.dataset.th; save(); applyTheme(); ayar(); } };
  app.querySelector('#ex').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })); a.download = 'iki-el-yedek.json'; a.click(); };
  app.querySelector('#im').onchange = async (e) => { try { importData(await e.target.files[0].text()); toast('Yedek yüklendi.'); applyTheme(); route(); } catch (x) { toast('Bu dosya okunamadı.'); } };
  app.querySelector('#rs').onclick = () => { if (confirm('Bütün ilerleme silinsin mi?')) { resetAll(); applyTheme(); route(); } };
}
function applyTheme() { const t = db.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; }
applyTheme();
route();
autoConnectMIDI();
(window.requestIdleCallback || setTimeout)(() => preloadPiano());
if ('serviceWorker' in navigator && isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => { });
