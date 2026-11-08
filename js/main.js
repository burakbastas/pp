// Piyano Okulu: eğitim ağacı, fa anahtarı alanı ve çalışma ekranı
import { UNITS, FA } from './data/tree.js';
import { db, save, itemState, isDone, isStarted, required, exportData, importData, resetAll } from './store.js';
import { mountPractice } from './ui/practice.js';
import { GLYPHS } from './notation/glyphs.js';
import { autoConnectMIDI, connectMIDI, Inputs } from './audio/input.js';
import { installAudioUnlock } from './audio/piano.js';
import { esc, toast } from './ui/dom.js';

const app = document.getElementById('app');
let active = null;
const stop = () => { active?.cleanup?.(); active = null; };

const GROUPS = [['parmak', 'Parmak alıştırmaları'], ['alistirma', 'Alıştırmalar'], ['etut', 'Etütler'], ['eser', 'Eserler']];
const ORDER = ['parmak', 'alistirma', 'etut', 'eser'];
const ITEMS = new Map();
UNITS.forEach(u => ORDER.forEach(g => u.groups[g].forEach((it, i) => ITEMS.set(it.id, { ...it, unit: u.n, group: g, idx: i }))));
FA.forEach(s => s.etudes.forEach((it, i) => ITEMS.set(it.id, { ...it, stage: s.n, idx: i })));

const unitItems = (u) => ORDER.flatMap(g => u.groups[g].map(x => ITEMS.get(x.id)));
const unitDone = (u) => unitItems(u).filter(isDone).length;
const currentUnit = () => UNITS.find(u => unitDone(u) < unitItems(u).length) || UNITS[UNITS.length - 1];
const nextItem = () => { const u = currentUnit(); return unitItems(u).find(x => !isDone(x)) || unitItems(u)[0]; };
const nextFa = () => [...ITEMS.values()].find(x => x.kind === 'fa' && !isDone(x));
const firstOpenSec = (it) => { const i = it.sections.findIndex((_, k) => (db.prog[it.id]?.[k]?.[required(it)] ?? 0) < 90); return i < 0 ? 0 : i; };
const href = (it) => `#/c/${it.id}/${firstOpenSec(it)}`;

const FCLEF = (cls = '') => { const g = GLYPHS.fClef, [x0, y0, x1, y1] = g.b; return `<svg class="fc ${cls}" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}" aria-hidden="true"><path d="${g.d}"/></svg>`; };

const NAV = (on) => `<header class="top">
  <a class="brand" href="#/">Piyano Okulu</a>
  <nav aria-label="Bölümler"><a href="#/" class="${on === 'tree' ? 'on' : ''}">Eğitim ağacı</a><a href="#/fa" class="${on === 'fa' ? 'on' : ''}">Fa anahtarı</a></nav>
  <a class="ic" href="#/ayar" aria-label="Ayarlar"><svg viewBox="0 0 22 22"><path d="M3 6h9m5 0h2M3 16h2m5 0h9"/><circle cx="14.500" cy="6" r="2.400"/><circle cx="7.500" cy="16" r="2.400"/></svg></a>
</header>`;

// Klavye yukarıdan aşağıya tizleşir: Do, Do diyez, Re ... Si; on iki ünite, on iki yarım ses
const CHROMA = ['w', 'b', 'w', 'b', 'w', 'w2', 'b', 'w', 'b', 'w', 'b', 'w'];
function tree() {
  const cur = currentUnit(), nx = nextItem();
  app.innerHTML = `${NAV('tree')}<main class="page">
    <section class="intro">
      <h1>On iki ünite, tek klavye</h1>
      <p>Her tuş bir ünite. Her ünitede sağ el, sol el ve iki el için parmak alıştırmaları, etütler ve eserler var.</p>
      <a class="pri" href="${href(nx)}">Devam et: ${esc(nx.title.replace(': ', ', '))}</a>
    </section>
    <ol class="vk">${UNITS.map((u, i) => {
    const d = unitDone(u), t = unitItems(u).length, here = u === cur;
    return `<li class="${CHROMA[i]} ${here ? 'here' : ''} ${d === t ? 'done' : ''}"><a href="#/u/${u.n}">
      <span class="vkey"><i>${u.n}</i></span>
      <span class="ut"><small>${esc(u.code)}, ${esc(u.stage.toLocaleLowerCase('tr'))}</small><b>${esc(u.title)}</b></span>
      <span class="up">${here ? 'Buradasın' : d ? `${d} / ${t}` : ''}</span>
    </a></li>`;
  }).join('')}</ol>
    <p class="foot"><a href="#/kaynak">Bu müfredat nereden geliyor?</a></p>
  </main>`;
  const here = app.querySelector('.vk .here');
  if (here && cur.n > 3) requestAnimationFrame(() => here.scrollIntoView({ block: 'center' }));
}

const ST_MARK = (s) => `<span class="st ${s}" aria-label="${s === 'done' ? 'Tamamlandı' : s === 'some' ? 'Başlandı' : 'Başlanmadı'}"></span>`;
const HANDS = [['rh', 'Sağ el'], ['lh', 'Sol el'], ['both', 'İki el']];
const SKILLS = [['bes', 'Bağımsızlık'], ['gecis', 'Geçiş'], ['atlama', 'Atlama']];
function unit(n) {
  const u = UNITS[n - 1]; if (!u) return go('#/');
  const fingers = u.groups.parmak.map(x => ITEMS.get(x.id));
  const cell = (h, sk) => { const it = fingers.find(x => x.hand === h && x.skill === sk); if (!it) return '<span></span>'; return `<a class="${itemState(it)}" href="${href(it)}">${esc(it.title)}</a>`; };
  const list = (g) => u.groups[g].map(x => ITEMS.get(x.id)).map(it => `<li><a href="${href(it)}">${ST_MARK(itemState(it))}
    <span class="lt"><b>${esc(it.title)}</b><small>${esc(it.by)}, ${esc(it.work)}${it.rcm ? `. RCM ${esc(it.rcm)}` : ''}</small><em>${esc(it.why)}</em></span>
    ${it.sections.length > 1 ? `<span class="n">${it.sections.length} bölüm</span>` : ''}</a></li>`).join('');
  app.innerHTML = `${NAV('tree')}<main class="page unit">
    <a class="crumb" href="#/">Eğitim ağacı</a>
    <h1><span>${n}</span>${esc(u.title)}</h1>
    <p class="meta">${esc(u.code)}, ${esc(u.stage.toLocaleLowerCase('tr'))}. ${unitDone(u)} / ${unitItems(u).length} tamamlandı.</p>
    <p class="aim">${esc(u.aim)}</p>
    <section><h2>Parmak alıştırmaları</h2>
      <div class="matrix" role="table" aria-label="El ve beceri">
        <span></span>${SKILLS.map(([, t]) => `<span class="ch">${t}</span>`).join('')}
        ${HANDS.map(([h, t]) => `<span class="rh-l">${t}</span>${SKILLS.map(([sk]) => cell(h, sk)).join('')}`).join('')}
      </div>
    </section>
    ${GROUPS.slice(1).map(([g, t]) => `<section><h2>${t}</h2><ul class="ls">${list(g)}</ul></section>`).join('')}
    <nav class="pn">${n > 1 ? `<a href="#/u/${n - 1}">Önceki ünite</a>` : '<span></span>'}${n < UNITS.length ? `<a href="#/u/${n + 1}">Sonraki ünite</a>` : ''}</nav>
  </main>`;
  scrollTo(0, 0);
}

// Porte üzerinde bir aşamanın notaları
const DIA = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
function miniStaff(notes) {
  const H = 8, top = 20, sorted = [...notes].sort((a, b) => dia(a) - dia(b));
  function dia(n) { return DIA[n[0]] + 7 * +n.slice(-1); }
  const A3 = dia('a3'), W = 58 + sorted.length * 25;
  const y = (n) => top + (A3 - dia(n)) * (H / 2);
  const g = GLYPHS.fClef, s = 0.82;
  const lines = [0, 1, 2, 3, 4].map(i => `<line x1="0" x2="${W}" y1="${top + i * H}" y2="${top + i * H}"/>`).join('');
  const heads = sorted.map((n, i) => {
    const x = 54 + i * 25, yy = y(n); let led = '';
    for (let d = A3 + 2; d <= dia(n); d += 2) led += `<line x1="${x - 8}" x2="${x + 8}" y1="${top + (A3 - d) * (H / 2)}" y2="${top + (A3 - d) * (H / 2)}"/>`;
    for (let d = A3 - 10; d >= dia(n); d -= 2) led += `<line x1="${x - 8}" x2="${x + 8}" y1="${top + (A3 - d) * (H / 2)}" y2="${top + (A3 - d) * (H / 2)}"/>`;
    const acc = n.includes('#') ? '♯' : /[a-g]b\d/.test(n) ? '♭' : '';
    return `${led}${acc ? `<text x="${x - 11}" y="${yy + 4}">${acc}</text>` : ''}<ellipse cx="${x}" cy="${yy}" rx="5.200" ry="3.800" transform="rotate(-20 ${x} ${yy})"/>`;
  }).join('');
  const [x0, y0, x1, y1] = g.b, gs = (H * 3.2) / (y1 - y0);
  return `<svg class="mini" viewBox="0 0 ${W} 86" role="img" aria-label="Notalar: ${notes.join(', ')}">${lines}<g transform="translate(6 ${top - 1}) scale(${gs}) translate(${-x0} ${-y0})"><path d="${g.d}"/></g>${heads}</svg>`;
}
function fa() {
  const nx = nextFa();
  app.innerHTML = `${NAV('fa')}<main class="page fa">
    <section class="fa-hero">${FCLEF()}
      <div><h1>Fa anahtarı</h1><p>Sol eli porteden okumak için sıfırdan on iki aşama. Önce üç durak nota, sonra komşuları, en sonda akorlar.</p>
      ${nx ? `<a class="pri" href="${href(nx)}">Devam et: ${esc(nx.title)}</a>` : ''}</div>
    </section>
    <ol class="stages">${FA.map(s => {
    const d = s.etudes.filter(e => isDone(ITEMS.get(e.id))).length;
    return `<li><a href="#/fa/${s.n}"><span class="sn">${s.n}</span><span class="stt"><b>${esc(s.title)}</b><small>${d ? `${d} / ${s.etudes.length} etüt` : `${s.etudes.length} etüt`}</small></span>${miniStaff(s.notes)}</a></li>`;
  }).join('')}</ol>
  </main>`;
  scrollTo(0, 0);
}
function faStage(n) {
  const s = FA[n - 1]; if (!s) return go('#/fa');
  app.innerHTML = `${NAV('fa')}<main class="page unit">
    <a class="crumb" href="#/fa">Fa anahtarı</a>
    <h1><span>${n}</span>${esc(s.title)}</h1>
    <div class="stage-staff">${miniStaff(s.notes)}</div>
    <p class="aim">${esc(s.text)}</p>
    <section><h2>Etütler</h2><ul class="ls">${s.etudes.map(e => { const it = ITEMS.get(e.id); return `<li><a href="${href(it)}">${ST_MARK(itemState(it))}<span class="lt"><b>${esc(it.title)}</b><small>${it.bars} ölçü, sol el</small></span></a></li>`; }).join('')}</ul></section>
    <nav class="pn">${n > 1 ? `<a href="#/fa/${n - 1}">Önceki aşama</a>` : '<span></span>'}${n < FA.length ? `<a href="#/fa/${n + 1}">Sonraki aşama</a>` : ''}</nav>
  </main>`;
  scrollTo(0, 0);
}
const noteCache = new Map();
async function loadNotes(key) { if (!noteCache.has(key)) noteCache.set(key, (await import(`./data/n/${key}.js`)).default); return noteCache.get(key); }
async function practice(id, sec) {
  const it = ITEMS.get(id); if (!it) return go('#/');
  const token = ++practice.t;
  const all = await loadNotes(it.kind === 'fa' ? 'fa' : `u${String(it.unit).padStart(2, '0')}`);
  if (token !== practice.t) return;
  const secI = Math.min(+sec || 0, it.sections.length - 1);
  let backHref, nextItemHref, sub;
  if (it.kind === 'fa') {
    backHref = `#/fa/${it.stage}`; sub = `${FA[it.stage - 1].title}, sol el`;
    const nx = FA[it.stage - 1].etudes[it.idx + 1] || FA[it.stage]?.etudes[0];
    nextItemHref = nx ? `#/c/${nx.id}/0` : null;
  } else {
    const u = UNITS[it.unit - 1], list = unitItems(u), k = list.findIndex(x => x.id === id);
    backHref = `#/u/${it.unit}`; const nx = list[k + 1]; nextItemHref = nx ? `#/c/${nx.id}/0` : null;
    sub = it.kind === 'finger' ? `${{ rh: 'Sağ el', lh: 'Sol el', both: 'İki el' }[it.hand]}, ${{ bes: 'bağımsızlık', gecis: 'parmak geçişi', atlama: 'atlama' }[it.skill]}` : `${it.by}, ${it.work}`;
  }
  active = mountPractice(app, { item: it, notes: all[id], sec: secI, backHref, nextItemHref, sub });
}
practice.t = 0;
function settings() {
  const S = db.settings, m = Inputs.midi;
  app.innerHTML = `${NAV('')}<main class="page unit">
    <a class="crumb" href="#/">Eğitim ağacı</a><h1>Ayarlar</h1>
    <section><h2>Klavye bağlantısı</h2>
      <p>${m.supported ? (m.devices.length ? `Bağlı: ${esc(m.devices[0])}` : 'MIDI klavyeni bilgisayara tak, sonra bağlan.') : 'Bu tarayıcı MIDI desteklemiyor. Chrome ya da Edge kullan.'}</p>
      ${m.supported ? '<button class="sec" id="midi">MIDI klavyeye bağlan</button>' : ''}</section>
    <section><h2>İlerleme</h2><p>İlerlemen bu cihazda saklanır. Başka cihaza taşımak için dosya olarak al.</p>
      <div class="btns"><button class="sec" id="exp">Yedeği indir</button><label class="sec file">Yedek yükle<input id="imp" type="file" accept=".json" hidden></label><button class="sec" id="rst">İlerlemeyi sil</button></div></section>
  </main>`;
  app.querySelector('#midi')?.addEventListener('click', async () => { const r = await connectMIDI(); toast(r.ok && r.devices.length ? `MIDI bağlandı: ${r.devices[0]}` : 'MIDI aygıtı bulunamadı.'); settings(); });
  app.querySelector('#exp').onclick = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([exportData()], { type: 'application/json' })); a.download = 'piyano-okulu-yedek.json'; a.click(); };
  app.querySelector('#imp').onchange = async (e) => { try { importData(await e.target.files[0].text()); toast('Yedek yüklendi.'); } catch (x) { toast('Dosya okunamadı.'); } };
  app.querySelector('#rst').onclick = () => { const b = app.querySelector('#rst'); if (b.dataset.ok) { resetAll(); toast('İlerleme silindi.'); go('#/'); } else { b.dataset.ok = 1; b.textContent = 'Silmek için yeniden dokun'; } };
  scrollTo(0, 0);
}
function sources() {
  const L = (t, u) => `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
  app.innerHTML = `${NAV('')}<main class="page unit prose">
    <a class="crumb" href="#/">Eğitim ağacı</a><h1>Bu müfredat nereden geliyor?</h1>
    <section><h2>Seviyeler</h2><p>On iki ünite, ${L('Royal Conservatory of Music piyano müfredatının', 'https://teacherportal.rcmusic.com/getattachment/57f3734d-97e5-4777-b67e-4b1111ee31a3/piano-syllabus-2022-edition.pdf')} Hazırlık A’dan Seviye 10’a uzanan basamaklarına denk gelir. Dizi, arpej ve tempo hedefleri ${L('RCM teknik çizelgesinden', 'https://colorinmypiano.com/wp-content/files/RCM_2022_Technical_Requirements_Charts_Prep-10.pdf')}, eser ve etüt yerleşimleri ${L('RCM repertuvar', 'https://www.dacapomusic.ca/blog/rcm-piano-repertoire-all-pieces')} ve ${L('etüt', 'https://www.dacapomusic.ca/blog/rcm-piano-etudes-all-pieces')} listelerinden alındı. Listede adı geçen parçalarda “RCM” notu vardır.</p>
    <p>RCM listesinde olmayan etüt kitaplarının sırası ${L('Jean-Michel Serres’in düzenlediği sıralamaya', 'https://jeanmichelserres.com/?p=1266')} dayanır.</p></section>
    <section><h2>Parmak geçişi ve atlama</h2><p>Bu alıştırmalar bu uygulama için yazıldı. Geçiş ve atlama tarifi ${L('Chuan C. Chang, Fundamentals of Piano Practice', 'https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_topics/III.5.html')} kitabının ${L('atlama bölümüyle', 'https://fundamentals-of-piano-practice.readthedocs.io/chapter1/ch1_topics/III.7.html')} birlikte izlenerek yazıldı. Dizi parmaklamaları standart tablolardandır.</p></section>
    <section><h2>Fa anahtarı</h2><p>Etütler bu uygulama için yazıldı. Sıralama durak nota yöntemini izler: önce Fa çizgisi ve orta Do, sonra komşular.</p></section>
    <section><h2>Notalar</h2><p>Eser ve etütlerin hepsi kamu malıdır. Nota kaynakları: ${L('Mutopia Project', 'https://www.mutopiaproject.org')}, Nathanael Meister’in ${L('LilyPond piyano okulu', 'https://github.com/nathanaelmeister/Piano_-_First_two_hand_exercises')} (Beyer, Czerny, Köhler, Berens, Gurlitt) ve ${L('da-x/czerny', 'https://github.com/da-x/czerny')}. Piyano sesi: Musyng Kite (Benjamin Gleitzman’ın midi-js-soundfonts paketi).</p></section>
  </main>`;
  scrollTo(0, 0);
}
const go = (h) => { location.hash = h; };
function route() {
  stop(); practice.t++;
  const h = location.hash.replace(/^#\/?/, ''), [p, a, b] = h.split('/');
  document.body.classList.toggle('playing', p === 'c');
  if (p === 'u') return unit(+a);
  if (p === 'fa') return a ? faStage(+a) : fa();
  if (p === 'c') return practice(a, b);
  if (p === 'ayar') return settings();
  if (p === 'kaynak') return sources();
  tree();
}
addEventListener('hashchange', route);
installAudioUnlock();
route();
autoConnectMIDI();
if ('serviceWorker' in navigator && isSecureContext) {
  navigator.serviceWorker.register('sw.js');
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded && navigator.serviceWorker.controller) { reloaded = true; if (!document.body.classList.contains('playing')) location.reload(); } });
}
