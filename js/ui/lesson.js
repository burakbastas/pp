// Ünite dersi: kart kart anlatım, sonunda "Anladım mı?" soruları
import { parseScore } from '../notation/parse.js';
import { Engraved } from '../notation/render.js';
import { miniKeys, chordNotes } from './chords.js';
import { solfegeName } from '../notation/theory.js';
import { esc } from './dom.js';

export function mountLesson(root, { unit, title, data, onExit, onDone }) {
  const items = [...data.cards.map(c => ({ card: c })), ...data.quiz.map(q => ({ q }))];
  let i = 0, picked = null, wrong = 0;
  root.innerHTML = `<section class="lesson">
    <header class="p-head"><button class="icon-btn" data-a="x" aria-label="Kapat"><svg viewBox="0 0 20 20"><path d="M5 5l10 10M15 5 5 15"/></svg></button>
      <div class="p-title"><h1>${esc(title)}</h1><div class="bar"><i></i></div></div></header>
    <div class="l-body"></div>
    <footer class="l-nav"><button class="chip" data-a="prev">Geri</button><button class="primary" data-a="next">İleri</button></footer></section>`;
  const $ = (s) => root.querySelector(s);
  const body = $('.l-body');
  function draw() {
    const it = items[i];
    $('.bar i').style.width = `${Math.round(100 * (i + 1) / items.length)}%`;
    $('[data-a=prev]').style.visibility = i ? 'visible' : 'hidden';
    picked = null;
    if (it.card) {
      const c = it.card;
      body.innerHTML = `<article><h2>${esc(c.h)}</h2><p>${esc(c.p)}</p>${c.staff ? '<div class="l-staff"></div>' : ''}${c.chord ? `<figure class="l-chord">${miniKeys(c.chord)}<figcaption><b>${esc(c.chord)}</b> ${chordNotes(c.chord).map(n => solfegeName(n)).join(' ')}</figcaption></figure>` : ''}</article>`;
      if (c.staff) { const h = body.querySelector('.l-staff'); new Engraved(parseScore(c.staff), h, { width: Math.min((h.clientWidth || 340) - 8, 520), sp: 12, showFingers: true, showNames: !c.staff.noNames }); }
      $('[data-a=next]').textContent = 'İleri'; $('[data-a=next]').disabled = false;
    } else {
      const q = it.q;
      body.innerHTML = `<article><p class="q-tag">Anladım mı?</p><h2>${esc(q.q)}</h2><div class="q-opts">${q.a.map((a, k) => `<button class="q-opt" data-k="${k}">${esc(a)}</button>`).join('')}</div><p class="q-why" role="status"></p></article>`;
      $('[data-a=next]').textContent = i === items.length - 1 ? 'Dersi bitir' : 'İleri'; $('[data-a=next]').disabled = true;
    }
  }
  $('.lesson').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.a === 'x') return onExit();
    if (b.dataset.a === 'prev' && i > 0) { i--; draw(); return; }
    if (b.dataset.a === 'next') { if (i < items.length - 1) { i++; draw(); } else onDone(wrong); return; }
    if (b.dataset.k != null && picked === null) {
      const q = items[i].q, k = +b.dataset.k;
      if (k === q.ok) {
        picked = k; b.classList.add('ok');
        body.querySelector('.q-why').textContent = q.why; $('[data-a=next]').disabled = false;
      } else { wrong++; b.classList.add('no'); b.disabled = true; body.querySelector('.q-why').textContent = 'Bir daha bak.'; }
    }
  };
  draw();
  return { cleanup() { } };
}
