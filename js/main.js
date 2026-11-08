import { STRANDS, UNITS, ITEMS, itemById, pathOf, TITLES } from './data/units.js';
import { LESSONS } from './data/lessons.js';
import { mountLesson } from './ui/lesson.js';
import { MINUTES, READ_LEVELS } from './data/curriculum.js';
import { EXERCISE, pieceDef, PIECES, preludeBlocks } from './data/exercises.js';
import { chartToScore, PATTERNS, PROGRESSIONS, romanChart, parseChart, transposeChart, bestSignature, flatTarget } from './gen/accomp.js';
import { vocalScore, VOICES, EXERCISES, STYLES } from './gen/vocal.js';
import { sightScore } from './gen/sight.js';
import { mountPractice } from './ui/practice.js';
import { mountReading } from './ui/reading.js';
import { mountChordDrill, miniKeys, chordNotes } from './ui/chords.js';
import { Keyboard } from './ui/keyboard.js';
import { parseChord, keyName, keyLetter, MAJOR_FIFTHS_BY_PC, MINOR_FIFTHS_BY_PC, solfegeName, parsePitch } from './notation/theory.js';
import { db, save, streak, today, exportData, importData, resetAll } from './store.js';
import { esc, toast } from './ui/dom.js';
import { ensureAudio, playNote, preloadPiano } from './audio/piano.js';
import { autoConnectMIDI, connectMIDI, Inputs } from './audio/input.js';
import { GLYPHS } from './notation/glyphs.js';

const app = document.getElementById('app'), tabs = document.getElementById('tabs');
let active = null, stash = null;
const LABEL = Object.fromEntries(STRANDS.map(s => [s.id, s.name]));
const back = (to, label) => `<a class="crumb" href="#/${to}">${esc(label)}</a>`;

const F_CLEF = (() => { const g = GLYPHS.fClef; const [x0, y0, x1, y1] = g.b; return `<svg class="big-clef" viewBox="${x0} ${-y1} ${x1 - x0} ${y1 - y0}" aria-hidden="true"><path transform="scale(1,-1)" d="${g.d}"/></svg>`; })();
const HEAD = (filled, cls = '') => `<svg class="head ${filled ? 'filled' : ''} ${cls}" viewBox="0 0 26 20" aria-hidden="true"><path fill-rule="evenodd" d="M2.2 13.6C.6 10 4.4 4.6 10.8 2.3 17.2 0 23 1.7 24 6c1 3.7-2.9 9-9.3 11.4C8.3 19.7 3.8 17.4 2.2 13.6Z${filled ? '' : 'M6 13c.8 1.8 4.3 1.9 8 .3 4-1.7 6.7-4.7 6-6.7-.7-1.9-4.5-2-8.3-.3C7.7 8 5 11.1 6 13Z'}"/></svg>`;

// --- Adımlar: her öğe sıralı adımlara ayrılır
const HAND_HOW = {
  lh: ['Önce nota adlarını söyle, sonra çal.', 'Gözün klavyede değil portede kalsın.'],
  rh: ['Parmak numaralarını izle.', 'Cümle sonlarında nefes alır gibi bırak.'],
  both: ['Çok yavaş başla. Takıldığın ölçüyü döngüye al.', 'Üç temiz tekrar yapınca tempo kendiliğinden artar.'],
};
const stepsCache = new Map();
export function stepsOf(it) {
  if (stepsCache.has(it.id)) return stepsCache.get(it.id);
  let out = [];
  if (it.kind === 'read') out = [{ t: 'Nota bulma turu', read: it.level }];
  else if (it.kind === 'sight') out = [{ t: 'Yeni parça deşifre et', sight: true }];
  else if (it.kind === 'studio') out = [{ t: 'Şarkını yaz ve çal', studio: true }];
  else if (it.kind === 'prelude') out = [{ t: 'Akorları blok çal', prelude: true, hands: 'both', tempo: 54 }];
  else if (it.kind === 'ex') {
    const d = EXERCISE[it.ex], tempo = it.tempo || d.tempo;
    if (d.rh && d.lh) out = [{ t: 'Sol el', hands: 'lh', tempo }, { t: 'Sağ el', hands: 'rh', tempo }, { t: 'İki el', hands: 'both', tempo: Math.round(tempo * 0.9) }];
    else { const h = d.rh ? 'rh' : 'lh'; out = [{ t: 'Söyleyerek oku', hands: h, tempo, hint: 'Nota adlarını söyleyerek çal.' }, { t: 'Klavyeye bakmadan', hands: h, tempo, noHint: true, hint: 'Tuş yardımı kapalı. Gözün portede kalsın.' }]; }
    if (it.how) out.forEach(s => { s.how = it.how; });
  } else if (it.kind === 'piece') {
    const p = PIECES[it.piece], from = it.from || 0, n = pieceDef(it.piece, {}).rh.length, to = it.to ?? n;
    const span = to - from, chunk = span >= 64 ? 16 : span <= 16 ? (span <= 8 ? span : 8) : 8;
    const slow = Math.round(p.tempo * 0.55), mid = Math.round(p.tempo * 0.65);
    for (let a = from; a < to; a += chunk) {
      const b = Math.min(a + chunk, to), sect = `Ölçü ${a + 1}–${b}`;
      out.push({ t: 'Sol el', group: sect, hands: 'lh', tempo: slow, from: a, to: b });
      out.push({ t: 'Sağ el', group: sect, hands: 'rh', tempo: slow, from: a, to: b });
      out.push({ t: 'İki el', group: sect, hands: 'both', tempo: slow, from: a, to: b });
    }
    if (span > chunk) out.push({ t: 'Baştan sona', hands: 'both', tempo: mid, from, to });
  } else if (it.kind === 'final') {
    out = [{ t: 'Nota okuma', read: it.level }];
    if (it.chords.length) out.push({ t: 'Akor tanıma', quiz: it.chords });
    if (it.perf) { const p = PIECES[it.perf.piece], from = it.perf.from || 0, to = it.perf.to ?? pieceDef(it.perf.piece, {}).rh.length; out.push({ t: `Çalma: ${it.perf.title}`, hands: 'both', tempo: Math.round(p.tempo * 0.6), from, to: Math.min(to, from + 8), hint: 'Takip kipinde iki elle çal. Yüzde 70 ve üstü geçer.', measured: true }); }
  } else if (it.kind === 'ak') out = it.steps;
  else if (it.kind === 'voc') {
    const k = Math.min(2, it.keys);
    out = [{ t: 'Sağ el: ezgi', hands: 'rh', style: 'bas', keys: k, hint: 'Ezgiyi tek başına çal. Bu notaları sen söyleyeceksin.' }, { t: 'Sol el: akor', hands: 'lh', style: 'akor', keys: k, hint: 'Sol el her ölçüde tonik akoru tutar.' }, { t: 'İki el', hands: 'both', style: 'akor', keys: k, hint: 'Sağ el ezgi, sol el akor. Stakato varsa sağ el kısa, sol el uzun.' }, { t: 'Çalarak söyle', hands: 'both', style: 'akor', keys: it.keys, hint: 'Hem çal hem söyle. Zorlanırsan önce Dinle ile söyle.' }];
  }
  stepsCache.set(it.id, out); return out;
}
const stepState = (id) => db.steps[id] || (db.steps[id] = {});
const doneCount = (it) => stepsOf(it).filter((_, i) => db.steps[it.id]?.[i]).length;
const isDone = (it) => doneCount(it) === stepsOf(it).length;
const nextIdx = (it) => { const s = stepsOf(it); for (let i = 0; i < s.length; i++) if (!db.steps[it.id]?.[i]) return i; return 0; };
const INTERVALS = [1, 2, 4, 8, 16, 30];
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function markStep(it, i, stars = 1) {
  stepState(it.id)[i] = true;
  const k = `${it.id}:${i}`; db.stars[k] = Math.max(db.stars[k] || 0, stars);
  if (isDone(it)) {
    if (it.kind !== 'final' && !['studio', 'sight'].includes(it.kind) && !db.rev[it.id]) db.rev[it.id] = { box: 0, due: addDays(1) };
    if (it.kind === 'final' && db.skipping === it.unit) {
      unitItems(it.unit).forEach(x => stepsOf(x).forEach((_, j) => { stepState(x.id)[j] = true; const kk = `${x.id}:${j}`; db.stars[kk] = db.stars[kk] || 1; }));
      db.ders[it.unit] = true; db.skipping = null;
    }
  }
  save();
}
function reviewed(it, good) { const r = db.rev[it.id] || { box: 0 }; r.box = good ? Math.min(INTERVALS.length - 1, r.box + 1) : 0; r.due = addDays(INTERVALS[r.box]); db.rev[it.id] = r; save(); }
const itemStars = (it) => { const s = stepsOf(it); if (!isDone(it)) return 0; return Math.round(s.reduce((a, _, i) => a + (db.stars[`${it.id}:${i}`] || 1), 0) / s.length); };
const totalStars = () => ITEMS.reduce((a, x) => a + itemStars(x), 0);
const unitDone = (n) => { const f = UNITS[n - 1].final; return isDone(f); };
const doneUnits = () => UNITS.filter(u => unitDone(u.n)).length;
const title = () => [...TITLES].reverse().find(t => doneUnits() >= t.at);
const nextTitle = () => TITLES.find(t => t.at > doneUnits());
const dueList = () => ITEMS.filter(x => db.rev[x.id] && db.rev[x.id].due <= today());
const starsHtml = (n, tot = 3) => `<span class="stars">${'★'.repeat(n)}<i>${'★'.repeat(tot - n)}</i></span>`;
function ribbon() {
  const t = title(), nx = nextTitle();
  return `<div class="rib"><span class="rname"><b>${t.name}</b><small>${t.mean}</small></span><span class="rnext">${nx ? `${nx.name}: ${nx.at - doneUnits()} ünite kaldı` : ''}</span><span class="rstat"><b>★ ${totalStars()}</b><b>${streak()} gün</b></span></div>`;
}
const unitItems = (n) => ITEMS.filter(x => x.unit === n);
const unitProgress = (n) => { const a = unitItems(n); const tot = a.reduce((s, x) => s + stepsOf(x).length, 0), d = a.reduce((s, x) => s + doneCount(x), 0); return { tot, d, pct: tot ? Math.round(100 * d / tot) : 0 }; };
const curUnit = () => (UNITS.find(u => u.n >= (db.place || 1) && !unitDone(u.n)) || UNITS.find(u => !unitDone(u.n)) || UNITS[UNITS.length - 1]).n;

export function stepConfig(it, i) {
  const s = stepsOf(it)[i], S = db.settings;
  const common = { hands: s.hands, title: it.title, sub: `${s.group ? s.group + ', ' : ''}${s.t}`, goal: s.hint || it.why, how: s.how || (s.hands ? HAND_HOW[s.hands] : []), lessonId: `${it.id}:${i}`, noHint: s.noHint };
  if (it.kind === 'ex') return { ...common, def: EXERCISE[it.ex], tempo: s.tempo };
  if (it.kind === 'final') {
    const pid = it.perf.piece, def = pieceDef(pid, { from: s.from, to: s.to });
    return { ...common, def, tempo: s.tempo, firstBar: s.from, startMode: 'follow' };
  }
  if (it.kind === 'piece') {
    const def = pieceDef(it.piece, { from: s.from, to: s.to, keepRepeats: false });
    return { ...common, def, tempo: s.tempo, src: `${PIECES[it.piece].composer}. ${PIECES[it.piece].src}`, firstBar: s.from, showBreak: true };
  }
  if (it.kind === 'prelude') return { ...common, def: preludeBlocks(), tempo: s.tempo };
  if (it.kind === 'ak') {
    const sig = bestSignature(it.chart);
    return { ...common, def: chartToScore({ chart: it.chart, pattern: s.pattern, tempo: s.tempo, key: sig.fifths, title: PATTERNS[s.pattern].name, repeat: 2 }), tempo: s.tempo, note: PATTERNS[s.pattern].hint };
  }
  if (it.kind === 'voc') {
    const def = vocalScore({ ex: it.ex, voice: S.voice, style: s.style, maxKeys: s.keys });
    return { ...common, def, tempo: def.tempo, how: [EXERCISES[it.ex].why], note: def.octaveUp ? 'Nota bir oktav yukarıda yazıldı; erkek sesi bir oktav aşağıdan söyler.' : '' };
  }
  if (it.kind === 'sight') {
    const def = sightScore({ level: it.level, hands: it.hands });
    return { ...common, hands: it.hands, def, startMode: 'wait', goal: it.why, how: ['Önce 10 saniye bak.', 'Durmadan çal.'] };
  }
}

function route() {
  active?.cleanup?.(); active = null;
  const hash = location.hash.slice(2) || 'bugun';
  const [page, arg, arg2, arg3] = hash.split('/');
  tabs.hidden = ['adim', 'calis', 'oku', 'ders'].includes(page);
  document.body.classList.toggle('immersive', tabs.hidden);
  const tabOf = { unite: 'uniteler', is: 'uniteler', kol: 'uniteler', eslik: 'uniteler', san: 'uniteler', sarki: 'araclar', ayar: 'araclar' }[page] || page;
  tabs.querySelectorAll('a').forEach(a => a.classList.toggle('on', a.dataset.p === tabOf));
  window.scrollTo(0, 0);
  ({ bugun, uniteler, unite: () => unite(+arg), is: () => isPage(arg), adim: () => adim(arg, +arg2, arg3 === 'rev'), ders: () => ders(+arg), kol: () => kol(arg), tekrar, repertuvar, eslik, sarki, san, araclar, ayar, calis: openStash, oku: () => openRead(arg) }[page] || bugun)();
}
addEventListener('hashchange', route);
const go = (h) => { location.hash = '#/' + h; };
function launch(cfg, back2) { stash = { ...cfg, back: back2 }; if (location.hash === '#/calis') route(); else go('calis'); }
function openStash() { if (!stash) return go('bugun'); const b = stash.back || 'bugun'; active = mountPractice(app, stash, { onExit: () => go(b) }); }
function openRead(id) { active = mountReading(app, id, { onExit: () => go('araclar') }); }

function ders(n) {
  const u = UNITS[n - 1], data = LESSONS[n]; if (!u || !data) return go('uniteler');
  active = mountLesson(app, { unit: n, title: `Ünite ${n} dersi`, data, onExit: () => go('unite/' + n), onDone: () => { db.ders[n] = true; save(); toast('Ders tamamlandı.'); go('unite/' + n); } });
}
// Bir adımı çalıştır
function adim(id, i, rev) {
  const it = itemById(id); if (!it) return go('uniteler');
  const steps = stepsOf(it), s = steps[i]; if (!s) return go('is/' + id);
  const exit = () => go(rev ? 'tekrar' : steps.length > 1 ? 'is/' + id : 'unite/' + it.unit);
  const award = (n) => { if (n > 0 && !rev) markStep(it, i, n); };
  const gonext = () => {
    if (rev) return go('tekrar');
    const nx = steps.findIndex((_, k) => !db.steps[it.id]?.[k]);
    if (nx >= 0) go(`adim/${id}/${nx}`);
    else { toast('Tamamlandı.'); go('unite/' + it.unit); }
  };
  if (s.read) { active = mountReading(app, s.read, { onExit: exit, onPass: (st) => { if (rev) reviewed(it, st >= 2); else markStep(it, i, st); } }); return; }
  if (s.quiz) { active = mountChordDrill(app, { chords: s.quiz, title: it.title, onExit: exit, onDone: (nav, st) => { if (nav) gonext(); else if (rev) reviewed(it, st >= 2); else markStep(it, i, st); } }); return; }
  if (s.studio) { markStep(it, i); return go('sarki'); }
  let reviewedOnce = false;
  const rv = (good) => { if (!reviewedOnce) { reviewedOnce = true; reviewed(it, good); } };
  const cfg = { ...stepConfig(it, i), onResult: award, onNext: gonext, nextLabel: i < steps.length - 1 ? 'Sonraki adım' : 'Bitir' };
  if (rev) Object.assign(cfg, { onDone: () => { rv(true); go('tekrar'); }, doneLabel: 'İyiydi', onHard: () => { rv(false); go('tekrar'); }, onResult: (n) => rv(n >= 2), onNext: () => go('tekrar'), nextLabel: 'Tekrar listesine dön' });
  else if (!s.measured) Object.assign(cfg, { onDone: () => { award(1); gonext(); }, doneLabel: i < steps.length - 1 ? 'Bitti, sonraki adım' : 'Bitti' });
  active = mountPractice(app, cfg, { onExit: exit });
}
function strandList(strand) {
  const cur = ITEMS.find(x => x.strand === strand && !isDone(x));
  return `<ul class="ilist">${ITEMS.filter(x => x.strand === strand).map(it => row(it, cur === it, true)).join('')}</ul>`;
}
function row(it, here, showUnit) {
  const n = stepsOf(it).length, d = doneCount(it), direct = n === 1;
  return `<li class="${d === n ? 'd' : ''} ${here ? 'here' : ''}"><a href="#/${direct ? `adim/${it.id}/0` : 'is/' + it.id}">${HEAD(d === n)}<span class="lt"><b>${esc(it.title)}</b><small>${esc(it.composer || it.why || '')}</small></span><span class="lm">${d === n ? starsHtml(itemStars(it)) : showUnit ? `Ünite ${it.unit}` : d ? `${d}/${n}` : ''}</span></a></li>`;
}

// --- Bugün
function bugun() {
  const S = db.settings, mins = MINUTES[S.minutes], un = curUnit(), U = UNITS[un - 1], P = unitProgress(un);
  const plan = STRANDS.map(s => {
    const it = ITEMS.find(x => x.strand === s.id && x.unit >= un && !isDone(x)) || ITEMS.find(x => x.strand === s.id && !isDone(x));
    return { s, it, m: mins[{ okuma: 'okuma', etut: 'teknik', eser: 'klasik', eslik: 'eslik', san: 'san' }[s.id]] };
  });
  const first = plan.find(p => p.it);
  const todaySec = db.log[today()] || 0, st = streak();
  app.innerHTML = `<section class="home">
    <header class="home-top">
      <div><h1>Bugünkü porte</h1><p class="lede"><a href="#/unite/${un}">Ünite ${un}: ${esc(U.name)}</a>. ${esc(U.aim)}</p>
      <div class="bar"><i style="width:${P.pct}%"></i></div></div>
      <a class="icon-btn" href="#/ayar" aria-label="Ayarlar ve kaynaklar"><svg viewBox="0 0 22 22"><path d="M3 6h9m5 0h2M3 16h2m5 0h9"/><circle cx="14.5" cy="6" r="2.4"/><circle cx="7.5" cy="16" r="2.4"/></svg></a>
    </header>
    ${!db.ders[un] ? `<a class="callout" href="#/ders/${un}"><b>Önce ünite dersini gör</b><span>Birkaç kart ve kısa bir soru turu</span></a>` : ''}
    ${unitItems(un).filter(x => x.strand !== 'final').every(isDone) && !unitDone(un) ? `<a class="callout" href="#/is/${U.final.id}"><b>Ünite ${un} finali hazır</b><span>Okuma, akor ve çalma. Geçince ünite tamamlanır.</span></a>` : ''}
    ${dueList().length ? `<a class="callout rev" href="#/tekrar"><b>Bugün ${dueList().length} tekrar var</b><span>Öğrendiklerini unutmadan önce bir kez çal</span></a>` : ''}
    <div class="mins seg" role="group" aria-label="Süre">${[15, 30, 45].map(m => `<button data-m="${m}" class="${S.minutes === m ? 'on' : ''}">${m} dakika</button>`).join('')}</div>
    <div class="staff-board">${F_CLEF}
      <ol class="staff-lines">${plan.map(({ s, it, m }) => {
    if (!it) return `<li><div class="empty-line">${HEAD(true)}<span class="lt"><small>${s.name}</small><b>Bu kol bitti</b></span></div></li>`;
    const k = nextIdx(it), step = stepsOf(it)[k];
    return `<li><a href="#/adim/${it.id}/${k}">${HEAD(false)}<span class="lt"><small>${s.name}${stepsOf(it).length > 1 ? ': ' + esc(step.group ? step.group + ', ' + step.t : step.t) : ''}</small><b>${esc(it.title)}</b></span><span class="lm">${m} dk</span></a></li>`;
  }).join('')}</ol>
    </div>
    ${first ? `<a class="primary wide" href="#/adim/${first.it.id}/${nextIdx(first.it)}">${esc(first.s.name)} ile başla</a>` : '<p class="lede">Bütün üniteleri bitirdin.</p>'}
    <p class="tally">${Math.round(todaySec / 60)} dakika çalıştın, ${st} günlük seri, ★ ${totalStars()}.</p>
    <section class="book"><h2>Enver Tufan metodu</h2>
      <div class="book-row"><button class="round" data-b="-1" aria-label="Sayfayı azalt">−</button><strong>Sayfa ${S.book}</strong><button class="round" data-b="1" aria-label="Sayfayı artır">+</button></div>
      <p>Her yeni sayfada önce sol eli solfejle söyle, sonra yalnız sol eli çal, en son iki eli birleştir.</p></section>
  </section>`;
  app.querySelector('.mins').onclick = (e) => { const b = e.target.closest('[data-m]'); if (b) { S.minutes = +b.dataset.m; save(); bugun(); } };
  app.querySelector('.book').onclick = (e) => { const b = e.target.closest('[data-b]'); if (b) { S.book = Math.max(1, S.book + +b.dataset.b); save(); bugun(); } };
}

// --- Üniteler: yol ve kollar
const BOOK_I = '<svg viewBox="0 0 24 24"><path d="M4 5c3-1.500 6-1.500 8 0v14c-2-1.500-5-1.500-8 0V5ZM20 5c-3-1.500-6-1.500-8 0v14c2-1.500 5-1.500 8 0V5Z"/></svg>';
const CROWN_I = '<svg viewBox="0 0 24 24"><path d="M3 18 2 7l5.500 4L12 4l4.500 7L22 7l-1 11H3Z"/></svg>';
function pathHtml(n) {
  const U = UNITS[n - 1], list = pathOf(n);
  const nodes = [{ ders: true }, ...list.map(it => ({ it })), { it: U.final, final: true }];
  let num = 0;
  const hereIdx = !db.ders[n] ? 0 : nodes.findIndex(x => x.it && !isDone(x.it));
  const pts = nodes.map((_, i) => 10 + Math.round(26 * (1 + Math.sin(i * 0.95 + n))));
  const H = 78, svgPath = pts.map((x, i) => { const y = i * H + 29, cx = x + 29; if (!i) return `M${cx} ${y}`; const px = pts[i - 1] + 29, py = (i - 1) * H + 29, m = (py + y) / 2; return `C${px} ${m} ${cx} ${m} ${cx} ${y}`; }).join('');
  return `<div class="path" style="height:${nodes.length * H}px"><svg class="pline" width="130" height="${nodes.length * H}" aria-hidden="true"><path d="${svgPath}"/></svg>
  ${nodes.map((x, i) => {
    const top = i * H, here = i === hereIdx, left = pts[i];
    if (x.ders) return `<a class="node-row ${here ? 'here' : ''}" href="#/ders/${n}" style="top:${top}px"><span class="node ${db.ders[n] ? 'd' : ''} ${here ? 'cur' : ''}" style="left:${left}px">${BOOK_I}</span><span class="nl"><small>Ders</small><b>Ünite ${n} dersi</b>${here ? '<em>Buradasın</em>' : ''}</span></a>`;
    const it = x.it, d = isDone(it), S2 = stepsOf(it), direct = S2.length === 1, cnt = doneCount(it);
    if (!x.final) num++;
    const lab = x.final ? 'Final' : LABEL[it.strand];
    return `<a class="node-row ${here ? 'here' : ''}" href="#/${direct ? `adim/${it.id}/0` : 'is/' + it.id}" style="top:${top}px"><span class="node ${x.final ? 'fin' : ''} ${d ? 'd' : ''} ${here ? 'cur' : ''}" style="left:${left}px">${x.final ? CROWN_I : num}</span><span class="nl"><small>${lab}${!d && cnt ? `, ${cnt}/${S2.length}` : ''}</small><b>${esc(it.title)}</b>${d ? starsHtml(itemStars(it)) : here ? '<em>Buradasın</em>' : ''}</span></a>`;
  }).join('')}</div>`;
}
function unitHead(u, big) {
  const p = unitProgress(u.n), done = unitDone(u.n);
  return `<span class="un">${u.n}</span><span class="ub"><b>${esc(u.name)}</b><small>${u.level}${done ? ', tamamlandı' : ''}</small>${big ? '' : `<span class="tops">${u.topics.slice(0, 3).map(esc).join(', ')}</span>`}<span class="bar"><i style="width:${p.pct}%"></i></span></span>`;
}
function uniteler() {
  const cur = curUnit(), view = uniteler.view || 'yol';
  const strandStat = (s) => { const a = ITEMS.filter(x => x.strand === s.id); return { d: a.filter(isDone).length, t: a.length, nx: a.find(x => !isDone(x)) }; };
  const cell = (u, s) => { const a = unitItems(u.n).filter(x => x.strand === s.id); const tot = a.reduce((t, x) => t + stepsOf(x).length, 0), d = a.reduce((t, x) => t + doneCount(x), 0); return `<td><span class="dot" style="--p:${tot ? Math.round(100 * d / tot) : 0}%" title="${s.name}: ${d}/${tot}"></span></td>`; };
  const yol = `<p class="lede">Sıra önerilen yoldur: ders, sonra karışık çalışmalar, en sonda final. Bir finali geçince ünite tamamlanır.</p>
    <div class="units">${UNITS.map(u => u.n === cur ? `<div class="unit here open"><a class="uh" href="#/unite/${u.n}">${unitHead(u, true)}</a><div class="uact"><a class="chip" href="#/ders/${u.n}">${db.ders[u.n] ? 'Dersi yeniden gör' : 'Ders'}</a><a class="chip" href="#/unite/${u.n}">Üniteyi aç</a></div>${pathHtml(u.n)}</div>` : `<a class="unit" href="#/unite/${u.n}">${unitHead(u)}</a>`).join('')}</div>`;
  const kollar = `<p class="lede">Bir kolu seçip o konuda ilerleyebilirsin.</p>
    <div class="kollar">${STRANDS.map(s => { const st = strandStat(s); return `<a class="kolc" href="#/${s.id === 'eslik' ? 'eslik' : s.id === 'san' ? 'san' : 'kol/' + s.id}"><b>${s.name}</b><small>${s.note}</small><span class="bar"><i style="width:${Math.round(100 * st.d / st.t)}%"></i></span><span class="kn2">${st.nx ? 'Sıradaki: ' + esc(st.nx.title) : 'Bitti'}</span></a>`; }).join('')}</div>
    <h2>İlerleme haritası</h2>
    <table class="map"><thead><tr><th></th>${STRANDS.map(s => `<th>${s.name}</th>`).join('')}</tr></thead><tbody>
      ${UNITS.map(u => `<tr class="${u.n === cur ? 'here' : ''}"><th><a href="#/unite/${u.n}"><b>${u.n}</b> ${esc(u.name)}</a></th>${STRANDS.map(s => cell(u, s)).join('')}</tr>`).join('')}
    </tbody></table>`;
  app.innerHTML = `<section class="plain"><h1>Üniteler</h1>${ribbon()}
    <div class="seg wideseg"><button data-v="yol" class="${view === 'yol' ? 'on' : ''}">Yol</button><button data-v="kol" class="${view === 'kol' ? 'on' : ''}">Kollar</button></div>
    ${view === 'yol' ? yol : kollar}</section>`;
  app.querySelector('.wideseg').onclick = (e) => { const b = e.target.closest('[data-v]'); if (b) { uniteler.view = b.dataset.v; uniteler(); } };
  if (view === 'yol' && cur > 1) requestAnimationFrame(() => app.querySelector('.unit.here')?.scrollIntoView({ block: 'start' }));
}
function unite(n) {
  const u = UNITS[n - 1]; if (!u) return go('uniteler');
  if (db.skipping) { db.skipping = null; save(); }
  app.innerHTML = `<section class="plain">${back('uniteler', 'Üniteler')}
    <h1>Ünite ${n}: ${esc(u.name)}</h1><p class="lede">${esc(u.aim)}</p>
    <div class="chips">${u.topics.map(t => `<span class="tchip">${esc(t)}</span>`).join('')}</div>
    <div class="uact"><a class="chip" href="#/ders/${n}">${db.ders[n] ? 'Dersi yeniden gör' : 'Ders'}</a>${!unitDone(n) ? `<button class="chip" id="skip">Bu üniteyi biliyorum</button>` : ''}</div>
    ${pathHtml(n)}
    ${u.pdf ? `<h2>Ek nota</h2><p>${u.pdf.map(([t, url]) => `<a href="${url}" target="_blank" rel="noopener">${esc(t)}</a>`).join(', ')} (IMSLP, ücretsiz PDF).</p>` : ''}
    <div class="navs">${n > 1 ? `<a class="txt-btn" href="#/unite/${n - 1}">Önceki ünite</a>` : '<span></span>'}${n < 8 ? `<a class="txt-btn" href="#/unite/${n + 1}">Sonraki ünite</a>` : ''}</div>
  </section>`;
  const sk = app.querySelector('#skip'); if (sk) sk.onclick = () => { db.skipping = n; save(); toast('Finali geçersen ünite tamamlanmış sayılır.'); go('is/' + u.final.id); };
}
function kol(id) {
  const s = STRANDS.find(x => x.id === id); if (!s) return go('uniteler');
  app.innerHTML = `<section class="plain">${back('uniteler', 'Üniteler')}<h1>${s.name}</h1><p class="lede">${s.note}</p>${strandList(id)}</section>`;
}
function tekrar() {
  const due = dueList(), upcoming = ITEMS.filter(x => db.rev[x.id] && db.rev[x.id].due > today()).sort((a, b) => db.rev[a.id].due.localeCompare(db.rev[b.id].due));
  const open = (it) => Math.max(0, stepsOf(it).length - 1);
  app.innerHTML = `<section class="plain"><h1>Tekrar</h1>
    <p class="lede">Bitirdiğin çalışmalar aralıklarla geri gelir: 1, 2, 4, 8, 16, 30 gün sonra. İyi geçerse süre uzar, zorlanırsan yarın yine gelir.</p>
    ${due.length ? `<ul class="ilist">${due.map(it => `<li class="here"><a href="#/adim/${it.id}/${open(it)}/rev">${HEAD(false)}<span class="lt"><b>${esc(it.title)}</b><small>${LABEL[it.strand] || 'Final'}</small></span><span class="lm">Bugün</span></a></li>`).join('')}</ul>` : '<p>Bugün tekrar edilecek bir şey yok. Yeni çalışma bitirdikçe burası dolar.</p>'}
    ${upcoming.length ? `<h2>Sıradakiler</h2><ul class="ilist">${upcoming.slice(0, 12).map(it => `<li><a href="#/adim/${it.id}/${open(it)}/rev">${HEAD(true)}<span class="lt"><b>${esc(it.title)}</b><small>${LABEL[it.strand] || ''}</small></span><span class="lm">${db.rev[it.id].due.slice(8)}.${db.rev[it.id].due.slice(5, 7)}</span></a></li>`).join('')}</ul>` : ''}
  </section>`;
}
function repertuvar() {
  const groups = UNITS.map(u => ({ u, a: ITEMS.filter(x => x.unit === u.n && x.strand === 'eser') })).filter(g => g.a.length);
  const all = ITEMS.filter(x => x.strand === 'eser');
  app.innerHTML = `<section class="plain"><h1>Repertuvar</h1>
    <p class="lede">${all.filter(isDone).length} / ${all.length} eser öğrenildi. Bir esere dokun, bölüm bölüm çalış.</p>
    ${groups.map(g => `<h2>${g.u.n}. ${esc(g.u.name)}</h2><ul class="ilist">${g.a.map(it => row(it, false, false)).join('')}</ul>`).join('')}
  </section>`;
}
// Bir öğenin çalışma planı
function isPage(id) {
  const it = itemById(id); if (!it) return go('uniteler');
  const steps = stepsOf(it), nx = nextIdx(it), allDone = isDone(it);
  if (it.kind === 'studio') return go('sarki');
  let body = '';
  if (it.kind === 'piece') {
    const groups = [...new Set(steps.filter(s => s.group).map(s => s.group))];
    body = `<table class="sect"><thead><tr><th></th><th>Sol el</th><th>Sağ el</th><th>İki el</th></tr></thead><tbody>${groups.map(g => `<tr><th>${g}</th>${steps.map((s, i) => [s, i]).filter(([s]) => s.group === g).map(([s, i]) => `<td><a class="stepb ${db.steps[id]?.[i] ? 'd' : ''} ${i === nx && !allDone ? 'nx' : ''}" href="#/adim/${id}/${i}" aria-label="${g}, ${s.t}">${db.steps[id]?.[i] ? '✓' : ''}</a></td>`).join('')}</tr>`).join('')}</tbody></table>
    ${steps.some(s => !s.group) ? steps.map((s, i) => [s, i]).filter(([s]) => !s.group).map(([s, i]) => `<a class="wholeb ${db.steps[id]?.[i] ? 'd' : ''}" href="#/adim/${id}/${i}">${HEAD(!!db.steps[id]?.[i])}<span>${s.t}</span></a>`).join('') : ''}`;
  } else {
    body = `<ol class="steps">${steps.map((s, i) => `<li class="${db.steps[id]?.[i] ? 'd' : ''} ${i === nx && !allDone ? 'nx' : ''}"><a href="#/adim/${id}/${i}"><span class="sn">${db.steps[id]?.[i] ? '✓' : i + 1}</span><span class="st"><b>${esc(s.t)}</b>${s.hint ? `<small>${esc(s.hint)}</small>` : ''}</span></a></li>`).join('')}</ol>`;
  }
  const chords = it.kind === 'ak' ? `<div class="chcards">${it.chords.map(c => `<figure>${miniKeys(c)}<figcaption><b>${esc(c)}</b> ${chordNotes(c).map(n => solfegeName(n)).join(' ')}</figcaption></figure>`).join('')}</div>
    <p class="snote">Her eşlik dersi aynı sırayla ilerler: akoru tanı, sol el, sağ el, iki el yavaş, sonra tempoda.</p>` : '';
  const how = it.kind === 'piece' ? '<p class="snote">Her satır bir bölüm. Kutuya dokunup o bölümü o elle çalış. Bitirdiğin kutu işaretlenir.</p>' : '';
  app.innerHTML = `<section class="plain">${back('unite/' + it.unit, 'Ünite ' + it.unit)}
    <h1>${esc(it.title)}</h1>${it.composer ? `<p class="comp">${esc(it.composer)}</p>` : ''}
    ${it.why ? `<p class="lede">${esc(it.why)}</p>` : ''}${chords}
    ${it.kind === 'final' && db.skipping === it.unit ? '<p class="snote">Finali geçersen ünitenin bütün çalışmaları bir yıldızla tamamlanır.</p>' : ''}
    <a class="primary wide" href="#/adim/${id}/${nx}">${allDone ? 'Yeniden çalış' : doneCount(it) ? 'Devam et' : 'Başla'}</a>
    ${how}${body}
  </section>`;
}
// --- Eşlik sekmesi: ders listesi
function eslik() {
  app.innerHTML = `<section class="plain">${back('uniteler', 'Üniteler')}<h1>Eşlik</h1>
    <p class="lede">Akorla şarkı çalmayı adım adım öğreniyoruz. Her ders aynı sırada ilerler: akoru klavyede tanı, sol elle kökleri çal, sağ elle akorları çal, iki eli yavaş birleştir, sonra tempoda ve kalıpla çal.</p>
    <a class="primary wide" href="#/sarki">Kendi şarkımı çal</a>
    <h2>Dersler</h2>${strandList('eslik')}
  </section>`;
}
// --- Eşlik
const SEMI = [...Array(12).keys()];
const KEY_LIST = (mode) => SEMI.map(pc => { const f = mode === 'minor' ? MINOR_FIFTHS_BY_PC[pc] : MAJOR_FIFTHS_BY_PC[pc]; return { f, pc, label: keyName(f, mode) + ' (' + keyLetter(f, mode) + ')' }; });
function sarki() {
  const st = sarki.state || (sarki.state = { chart: 'C | G | Am | F', pattern: 'balad', tempo: 72, semi: 0, title: '' });
  app.innerHTML = `<section class="plain">${back('araclar', 'Araçlar')}<h1>Kendi şarkın</h1>
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
    launch({ def, hands: 'both', tempo: st.tempo, title: PATTERNS[st.pattern].name, sub: r.text }, 'sarki');
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
}

// --- Şan
function san() {
  const S = db.settings;
  const st = san.state || (san.state = { ex: 'besli', style: 'akor', dir: 'up', low: '', high: '', use: 'sing' });
  const v = VOICES[S.voice];
  app.innerHTML = `<section class="plain">${back('uniteler', 'Üniteler')}<h1>Şan</h1>
    <p class="lede">Şan alıştırmalarını piyanoda çalmayı ünite sırasıyla öğren. Serbest çalışmak istersen alttan kendi aralığını seç.</p>
    <h2>Dersler</h2>${strandList('san')}
    <h2>Serbest çalışma</h2>
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
  app.innerHTML = `<section class="plain">${back('araclar', 'Araçlar')}<h1>Ayarlar ve kaynaklar</h1>
    <h2>MIDI klavye</h2><p>Chrome veya Edge'de klavyeni bağla. Bir nota çalışırken klavyende çalmaya başladığında Takip kipi kendiliğinden açılır.</p>
    <div class="row-btn"><button class="chip" id="mi">${Inputs.midi.devices.length ? 'Bağlı: ' + esc(Inputs.midi.devices.join(', ')) : 'MIDI klavyeyi bağla'}</button></div>
    <h2>Görünüm</h2><div class="seg" id="th">${[['auto', 'Sistem'], ['light', 'Açık'], ['dark', 'Koyu']].map(([k, t]) => `<button data-th="${k}" class="${S.theme === k ? 'on' : ''}">${t}</button>`).join('')}</div>
    <h2>İlerleme yedeği</h2><p>İlerlemen bu tarayıcıda durur. Telefonla bilgisayar arasında taşımak için yedek al.</p>
    <div class="row-btn"><button class="chip" id="ex">Yedeği indir</button><label class="chip file">Yedeği yükle<input type="file" id="im" accept="application/json" hidden></label><button class="chip warn" id="rs">Her şeyi sıfırla</button></div>
    <h2>Nasıl kuruldu</h2>
    <ul class="srcs">
      <li><b>Ünite yapısı:</b> Gitar Gelişim’deki klasik bölümün seviye düzeni örnek alındı; eser sırası RCM ve yaygın pedagojik listelerle karşılaştırıldı.</li>
      <li><b>Nota okuma:</b> Frances Clark’ın aralık ve durak nota yaklaşımı (<a href="https://www.wikipedia.org/wiki/Piano_lesson" rel="noopener">Piano pedagogy</a>), <a href="https://composecreate.com/an-integrated-approach-to-reading-music/" rel="noopener">Piano Safari</a> durak notaları.</li>
      <li><b>Çalışma kipleri:</b> Bekle, döngü ve tek el seçimi <a href="https://pianoers.com/flowkey-review/" rel="noopener">flowkey</a> ve <a href="https://www.slashgear.com/1622346/best-apps-learn-piano/" rel="noopener">Skoove</a> örneğinden.</li>
      <li><b>Temiz tekrar ve tempo merdiveni:</b> <a href="https://www.structural-learning.com/research-briefings/practise-the-hard-bit" rel="noopener">Duke, Simmons ve Cash (2009)</a>: 17 ileri düzey piyanoda süre değil, hatayı yerinde düzeltmek ertesi günkü sonucu öngördü.</li>
      <li><b>Eşlik kalıpları:</b> <a href="https://pianowithjonny.com/courses/pop-contemporary-piano-accompaniment-patterns-1/" rel="noopener">Piano With Jonny</a> sol el ve sağ el kalıp mantığı; <a href="https://en.wikipedia.org/wiki/Aksak" rel="noopener">2+2+2+3 aksak</a> ve düm-tek (maksum) deseni. Şarkı notası ve sözü yok; yalnız akor kalıpları var.</li>
      <li><b>Şan:</b> <a href="https://instruct.uwo.ca/music/999/lesson1.html" rel="noopener">Western Üniversitesi</a> üçlü ısınma ve yarım ton yürüyüş; <a href="https://artsunit.nsw.edu.au/video/warm-ups-for-your-choir-primary-eclass-3-flexibility-and-blend-1-focus-on-flexibility" rel="noopener">NSW Arts Unit</a> önce bağlı sonra stakato. Öğretmeninin yönlendirmesi her zaman önce gelir.</li>
      <li><b>Piyano sesi:</b> Musyng Kite Acoustic Grand, <a href="https://github.com/gleitz/midi-js-soundfonts" rel="noopener">midi-js-soundfonts</a> MP3 çıktısı, CC BY-SA 3.0.</li>
      <li><b>Notalar:</b> <a href="https://www.mutopiaproject.org" rel="noopener">Mutopia Project</a> LilyPond kaynaklarından dönüştürüldü. Her eserin kaynağı ders sayfasında yazar; kamu malı ya da CC BY-SA dizgilerdir.</li>
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

// --- Araçlar
function araclar() {
  const score = (id) => { const s = db.reading[id]; if (!s) return ''; const a = Object.values(s); const n = a.reduce((x, y) => x + y.n, 0), e = a.reduce((x, y) => x + y.e, 0); return n ? `yüzde ${Math.round(100 * (1 - e / n))}` : ''; };
  const groups = [['Fa anahtarı', ['b1', 'b2', 'b3', 'b4', 'b5']], ['Sol anahtarı', ['t1', 't2']], ['İki porte ve aralık', ['g1', 'i1']]];
  app.innerHTML = `<section class="plain"><h1>Araçlar</h1>
    ${ribbon()}
    <p class="lede">Ünitelerin dışında serbest çalışmak için.</p>
    <div class="row-btn"><a class="chip" href="#/sarki">Kendi şarkımı çal</a><a class="chip" href="#/san">Serbest şan</a></div>
    <h2>Nota okuma</h2><p>Notayı gör, tuşa bas. Yanlış yaptığın notalar daha sık gelir.</p>
    ${groups.map(([t, ids]) => `<h3>${t}</h3><ul class="levels">${ids.map(id => `<li><a href="#/oku/${id}"><span>${esc(READ_LEVELS[id].title)}</span><small>${score(id)}</small></a></li>`).join('')}</ul>`).join('')}
    <h2>Deşifre</h2><p>Her seferinde yeni, kısa bir parça üretilir.</p>
    <form class="form" id="sf"><label>Düzey<select name="level"><option value="1">1: tam ve yarımlık</option><option value="2">2: eller sırayla</option><option value="3">3: iki el birlikte</option><option value="4">4: sekizlik ve noktalı</option></select></label>
    <label>El<select name="hands"><option value="lh">Sol el</option><option value="rh">Sağ el</option><option value="both">İki el</option></select></label>
    <button class="primary">Yeni parça üret</button></form>
    <h2>Akor bul</h2><form class="form" id="cf"><label class="full">Akor adı<input name="c" value="Am7" autocapitalize="off" spellcheck="false"></label></form>
    <p id="cnotes" class="cnotes"></p><div class="kb-host small" id="ckb"></div>
    <h2>Ayarlar</h2><p><a href="#/ayar">MIDI, görünüm, yedek ve kaynaklar</a></p>
  </section>`;
  app.querySelector('#sf').onsubmit = (e) => { e.preventDefault(); const f = new FormData(e.target); launch({ def: sightScore({ level: +f.get('level'), hands: f.get('hands') }), hands: f.get('hands'), startMode: 'wait', title: 'Deşifre', sub: 'Önce 10 saniye bak, sonra durmadan çal.' }, 'araclar'); };
  const kb = new Keyboard(app.querySelector('#ckb'), { low: 48, high: 84, onDown: (m) => { ensureAudio(); playNote(m, 0, 0.8, 0.7); } });
  active = { cleanup: () => kb.destroy() };
  const cf = app.querySelector('#cf');
  const showChord = () => {
    const box = app.querySelector('#cnotes'), notes = chordNotes(cf.c.value);
    if (!notes.length) { box.textContent = 'Bu akoru okuyamadım. Örnek: Am, F#m7, Bb, Csus4, Lam, Sol7'; kb.clearMarks(); return; }
    box.textContent = notes.map(n => solfegeName(n)).join(', ');
    const f = notes.length === 4 ? [1, 2, 3, 5] : [1, 3, 5];
    kb.setMarks(new Map(notes.map((n, i) => [n.midi, { hand: 'rh', finger: f[i] }])));
    kb.focusRange(Math.min(...notes.map(n => n.midi)), Math.max(...notes.map(n => n.midi)), true);
  };
  cf.c.oninput = showChord; cf.onsubmit = (e) => e.preventDefault();
  requestAnimationFrame(showChord);
}
function applyTheme() { const t = db.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t; }
applyTheme();
function placement() {
  if (db.place || Object.keys(db.steps).length) return;
  const el = document.createElement('div'); el.className = 'sheet place';
  const opts = [[1, 'Fa anahtarı henüz oturmadı', 'Sol eli notadan okumakta zorlanıyorum. Önerilen başlangıç.'], [3, 'Fa anahtarını yavaş okuyorum', 'İki elle kısa parçalar çalıyorum, elleri ayırmak zor geliyor.'], [5, 'İki anahtarı birlikte okuyorum', 'Küçük parçaları ezbere dayanmadan çalabiliyorum.']];
  el.innerHTML = `<div class="sheet-card" role="dialog" aria-label="Başlangıç"><h2>Hoş geldin. Nereden başlayalım?</h2>
    ${opts.map(([n, b, t]) => `<button class="q-opt" data-p="${n}"><b>${b}</b><br><small>${t}</small></button>`).join('')}
    <p class="muted">Hiçbir ünite kilitli değil. Daha sonra istediğin üniteye geçebilirsin.</p></div>`;
  document.body.append(el);
  el.onclick = (e) => { const b = e.target.closest('[data-p]'); if (!b) return; db.place = +b.dataset.p; save(); el.remove(); route(); };
}
route();
placement();
autoConnectMIDI();
(window.requestIdleCallback || setTimeout)(() => preloadPiano());
if ('serviceWorker' in navigator && isSecureContext) {
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').catch(() => { });
  // Yeni sürüm gelince sayfayı bir kez yenile
  let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !done) { done = true; location.reload(); } });
}
