// Çalma motoru: Dinle / Birlikte çal / Bekle kipleri, döngü, tempo, el seçimi
import { flatten, playOrder } from './r.js';
import { ensureAudio, playNote, click, stopAll, audioCtx } from './o.js';
import { Inputs } from './i.js';
import { dynReport, durReport } from './f.js';

export class Player {
  constructor({ score, engraved, keyboard, onState }) {
    this.score = score; this.eng = engraved; this.kb = keyboard; this.onState = onState || (() => { });
    this.mode = 'listen'; this.hands = 'both'; this.tempo = score.tempo; this.metro = true; this.countIn = true; this.useRepeats = false;
    this.hint = 'always'; this.loop = null; this.state = 'idle'; this.stats = null; this.autoUp = false;
    this.mic = null; this.pedalDown = false; this.kind = 'piece';
    this.rebuild();
    this.off = Inputs.on((t, m, s, v, raw, at) => this.input(t, m, s, raw, at));
  }
  destroy() { this.stop(); this.off(); }
  setEngraved(e) { this.eng = e; if (this.loop) e.setLoop(this.loop.a, this.loop.b); }
  rebuild() {
    let order;
    if (this.loop) { order = []; for (let i = this.loop.a; i <= this.loop.b; i++) order.push(i); }
    else order = playOrder(this.score, this.useRepeats);
    this.timeline = flatten(this.score, order);
    const n = this.timeline.notes;
    this.notes = n;
    this.range = n.length ? [Math.min(...n.map(x => x.midi)), Math.max(...n.map(x => x.midi))] : [48, 72];
    // bekleme adımları: seçili ellerin aynı anda başlayan notaları
    this.buildSteps();
  }
  active(n) { return this.hands === 'both' || this.hands === n.staff; }
  buildSteps() {
    const map = new Map();
    this.notes.forEach(n => {
      if (!this.active(n) || n.tiedIn) return;
      const k = Math.round(n.at * 1000);
      if (!map.has(k)) map.set(k, { at: n.at, notes: [] });
      map.get(k).notes.push(n);
    });
    this.steps = [...map.values()].sort((a, b) => a.at - b.at);
  }
  setHands(h) { this.hands = h; this.buildSteps(); this.previewStart(); this.rearm(); }
  rearm() { if (this.mode === 'follow' && this.state === 'idle') this.startFollow(); }
  setLoop(a, b) {
    this.stop();
    this.loop = a == null ? null : { a: Math.min(a, b), b: Math.max(a, b) };
    this.eng.setLoop(this.loop?.a, this.loop?.b);
    this.rebuild(); this.previewStart(); this.rearm();
  }
  setRepeats(v) { this.stop(); this.useRepeats = v; this.rebuild(); this.previewStart(); this.rearm(); }
  spq() { return 60 / this.tempo; }
  previewStart() {
    this.stepIdx = 0; if (!this.keepMarks) this.eng.clearMarks?.();
    if (!this.notes.length) return;
    const p = this.timeline.pos[0];
    this.eng.setCursor(p.mi, 0);
    this.scrollTo(p.mi, true);
    this.showStep(this.steps[0]);
    this.kb?.focusRange(this.range[0], Math.min(this.range[1], this.range[0] + 24), true);
  }
  showStep(step) {
    const marks = new Map(), keys = new Set();
    if (step && this.hint !== 'off' && this.hint !== 'error') step.notes.forEach(n => marks.set(n.midi, { hand: n.staff, finger: n.finger }));
    if (step) step.notes.forEach(n => keys.add(n.key));
    this.kb?.setMarks(marks); this.eng.setActive(keys);
  }
  async play() {
    ensureAudio(); await audioCtx().resume();
    this.stop(true);
    this.stats = { hits: 0, wrong: 0, first: 0, total: this.steps.length, t0: performance.now() };
    if (this.mode === 'wait') { this.startWait(); return; }
    if (this.mode === 'follow') { this.startFollow(); return; }
    this.timing = this.mode === 'with' ? { used: new Set(), errs: [], wrong: 0 } : null;
    this.eng.clearMarks();
    const ctx = audioCtx(), spq = this.spq(), [n, d] = this.score.time;
    const beat = 4 / d;
    const lead = 0.12;
    let countBeats = 0;
    if (this.countIn) {
      const grp = d === 8 && n % 3 === 0 ? 1.5 : beat;
      const barQ = n * 4 / d;
      for (let q = 0; q < barQ - 1e-6; q += grp) { click(ctx.currentTime + lead + q * spq, q === 0); }
      countBeats = barQ;
    }
    this.t0 = ctx.currentTime + lead + countBeats * spq;
    this.spqNow = spq; this.nextIdx = 0; this.nextClick = 0; this.state = 'playing';
    this.scheduled = [];
    this.onState('playing');
    this.timer = setInterval(() => this.pump(), 30);
    this.pump();
    this.raf = requestAnimationFrame(() => this.frame());
  }
  pump() {
    const ctx = audioCtx(), now = ctx.currentTime, horizon = now + 0.4, spq = this.spqNow;
    while (this.nextIdx < this.notes.length) {
      const n = this.notes[this.nextIdx];
      const when = this.t0 + n.at * spq;
      if (when > horizon) break;
      this.nextIdx++;
      if (n.tiedIn) continue;
      const mute = this.mode === 'with' && this.active(n);
      if (!mute) {
        const handVel = (this.hands !== 'both' && !this.active(n)) ? 0.42 : (n.staff === 'rh' ? 0.76 : 0.64);
        playNote(n.midi, Math.max(when, now + 0.005), n.d * spq * 0.98, n.accent ? 0.95 : handVel);
      }
    }
    if (this.metro) this.pumpMetro(horizon, spq);
    if (this.nextIdx >= this.notes.length && now > this.t0 + this.timeline.total * spq + 0.05) {
      this.finishPass();
    }
  }
  pumpMetro(horizon, spq) {
    const [n, d] = this.score.time; const groups = this.score.beats;
    const beat = groups ? null : (d === 8 && n % 3 === 0 ? 1.5 : 4 / d);
    while (this.nextClick < this.timeline.total) {
      const when = this.t0 + this.nextClick * spq; if (when > horizon) break;
      const m = this.timeline.pos.find(p => this.nextClick >= p.start - 1e-6 && this.nextClick < p.start + p.len - 1e-6);
      const inBar = m ? this.nextClick - m.start : 0;
      click(when, Math.abs(inBar) < 1e-6);
      if (groups) {
        let acc = 0, step = groups[0]; for (const g of groups) { if (inBar >= acc - 1e-6) step = g; acc += g; }
        this.nextClick += step;
      } else this.nextClick += beat;
    }
  }
  finishPass() {
    clearInterval(this.timer); this.timer = null;
    if (this.loop) {
      this.reportTiming();
      this.onState('loop');
      if (this.autoUp) this.tempo = Math.min(this.tempo + 4, this.score.tempoMax || 200);
      this.spqNow = this.spq();
      this.onState('tempo');
      this.t0 = audioCtx().currentTime + 0.05; this.nextIdx = 0; this.nextClick = 0;
      if (this.timing) { this.timing = { used: new Set(), errs: [], wrong: 0 }; this.eng.clearMarks(); }
      this.timer = setInterval(() => this.pump(), 30);
      return;
    }
    this.keepMarks = !!this.timing;
    this.stop(); this.keepMarks = false;
    this.onState('done'); this.reportTiming();
  }
  frame() {
    if (this.state !== 'playing') return;
    const ctx = audioCtx(); const q = (ctx.currentTime - this.t0) / this.spqNow;
    if (q >= 0) {
      const pos = this.timeline.pos.find(p => q >= p.start && q < p.start + p.len) || this.timeline.pos[this.timeline.pos.length - 1];
      const p = this.eng.setCursor(pos.mi, Math.min(q - pos.start, pos.len));
      this.scrollTo(pos.mi);
    }
    const marks = new Map(), keys = new Set();
    let lo = 200, hi = 0;
    for (const n of this.notes) {
      if (n.at > q + 0.6) break;
      const soundingNow = n.at <= q && q < n.at + n.sounding - 0.03;
      if (soundingNow) keys.add(n.key);
      if (this.hint === 'always' && soundingNow) { marks.set(n.midi, { hand: n.staff, finger: n.finger }); }
      if (this.hint === 'always' && n.at > q && n.at <= q + 0.32 && !marks.has(n.midi)) marks.set(n.midi, { hand: n.staff, finger: n.finger, soft: true });
      if (n.at + n.sounding > q) { lo = Math.min(lo, n.midi); hi = Math.max(hi, n.midi); }
    }
    this.eng.setActive(keys); this.kb?.setMarks(marks);
    if (hi) this.kb?.focusRange(lo, hi);
    this.raf = requestAnimationFrame(() => this.frame());
  }
  scrollTo(mi, instant) {
    const p = this.eng.pos[mi]; if (!p || p.sys === this._sys && !instant) return;
    this._sys = p.sys;
    const host = this.eng.host, sc = host.closest('.score-view'); if (!sc) return;
    const top = p.y * this.eng.scale - 6;
    sc.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' });
  }
  stop(silent) {
    clearInterval(this.timer); this.timer = null; cancelAnimationFrame(this.raf); clearTimeout(this.loopTimer);
    if ((this.state === 'waiting' || this.state === 'following') && this.mic) this.mic.setExpected([]);
    const was = this.state; this.state = 'idle'; stopAll();
    if (!silent) { this.eng.setCursor(-1, 0); this.eng.setActive(new Set()); this.kb?.clearMarks(); this._sys = null; if (was !== 'idle') this.onState('stopped'); this.previewStart(); }
  }
  // --- Bekle kipi
  startWait() {
    this.state = 'waiting'; this.stepIdx = 0; this.held = new Set(); this.eng.clearMarks();
    this.onState('waiting');
    this.enterStep();
  }
  enterStep() {
    const s = this.steps[this.stepIdx];
    if (!s) { this.finishWait(); return; }
    this.pending = new Set(s.notes.map(n => n.midi)); this.stepErr = false; this.errShown = false;
    const pos = this.timeline.pos[s.notes[0].oi];
    this.eng.setCursor(pos.mi, s.at - pos.start);
    this.scrollTo(pos.mi);
    this.showStep(s);
    const midis = s.notes.map(n => n.midi);
    this.kb?.focusRange(Math.min(...midis), Math.max(...midis));
    if (this.mic) this.mic.setExpected([...midis]);
  }
  completeStep() {
    const s = this.steps[this.stepIdx];
    if (!this.stepErr) this.stats.first++;
    s.notes.forEach(n => this.eng.markResult(n.key, this.stepErr ? 'bad' : 'good'));
    // diğer elin notaları bir sonraki adıma kadar kendiliğinden çalar
    const ctx = audioCtx(), spq = this.spq();
    const nx = this.steps[this.stepIdx + 1], end = nx ? nx.at : this.timeline.total;
    const t = ctx.currentTime + 0.01;
    this.notes.forEach(n => {
      if (this.active(n) || n.tiedIn) return;
      if (n.at >= s.at - 1e-6 && n.at < end - 1e-6) playNote(n.midi, t + (n.at - s.at) * spq, n.d * spq, 0.5);
    });
    this.stepIdx++;
    this.onState('progress');
    this.enterStep();
  }
  finishWait() {
    this.state = 'idle'; this.kb?.clearMarks(); this.eng.setActive(new Set());
    this.onState('done');
    if (this.loop) this.loopTimer = setTimeout(() => { this.stats = { hits: 0, wrong: 0, first: 0, total: this.steps.length }; this.startWait(); }, 900);
  }
  input(type, midi, src, raw, at) {
    if (type === 'pedal') { this.pedalDown = midi >= 64; if (this.pedalDown) this.fw?.holds.forEach(h => { h.pedal = true; }); return; }
    if (type === 'down') this.kb?.pressed(midi, true);
    if (type === 'up') { this.kb?.pressed(midi, false); this.release(midi, at); return; }
    // Dinle kipindeyken MIDI'den çalmaya başlanırsa takip kendiliğinden açılır
    if (src === 'midi' && this.state === 'idle' && this.mode === 'listen') { this.mode = 'follow'; this.startFollow(); this.onState('auto-follow'); }
    if (this.state === 'following') { this.followNote(midi, src === 'midi' ? raw : 0, at); return; }
    if (this.state === 'playing' && this.timing) { this.timedHit(midi); return; }
    if (this.state !== 'waiting') return;
    if (this.pending.has(midi)) {
      this.pending.delete(midi); this.kb?.flash(midi, 'okk');
      if (this.pending.size === 0) { this.stats.hits++; this.completeStep(); }
    } else {
      this.stats.wrong++; this.stepErr = true; this.kb?.flash(midi, 'err');
      if (this.hint === 'error') this.showHintNow();
      this.onState('progress');
    }
  }
  // --- Birlikte kipi: metronoma göre zamanlama ölçümü
  timedHit(m) {
    const ctx = audioCtx(), spq = this.spqNow, T = this.timing;
    const nowQ = (ctx.currentTime - (ctx.outputLatency || 0) - this.t0) / spq;
    let best = null, gap = 1e9;
    for (const n of this.notes) {
      if (n.at > nowQ + 1.5) break;
      if (n.tiedIn || !this.active(n) || n.midi !== m || T.used.has(n)) continue;
      const d = Math.abs(n.at - nowQ); if (d < gap) { gap = d; best = n; }
    }
    const err = best ? (nowQ - best.at) * spq * 1000 : null;
    if (!best || Math.abs(err) > Math.min(320, spq * 550)) { T.wrong++; this.kb?.flash(m, 'err'); return; }
    T.used.add(best); T.errs.push(err);
    this.eng.markResult(best.key, Math.abs(err) <= 120 ? 'good' : 'bad');
    this.kb?.flash(m, 'okk');
  }
  reportTiming() {
    const T = this.timing;
    if (!T || !T.errs.length) return;
    const total = this.notes.filter(n => !n.tiedIn && this.active(n)).length;
    const onTime = T.errs.filter(e => Math.abs(e) <= 120).length;
    this.lastTiming = { pct: Math.round(100 * onTime / Math.max(1, total)), avg: Math.round(T.errs.reduce((a, b) => a + b, 0) / T.errs.length), wrong: T.wrong, missed: total - T.errs.length };
    this.onState('timing');
  }
  // --- Takip kipi: çalınan notaları porte üzerinde izler
  startFollow() {
    this.stop(true);
    this.eng.clearMarks();
    this.state = 'following';
    this.resetFollow(false);
    this.onState('following');
    this.enterFollow();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.frameFollow());
  }
  resetFollow(keepMarks) {
    this.stepIdx = 0;
    this.pend = this.steps.map(s => new Set(s.notes.map(n => n.midi)));
    this.fw = { hits: 0, missed: 0, wrong: 0, bars: new Map(), wrongBars: [], hist: [], streak: 0, started: false, log: [], bpm: null, spq: null, lastAt: null, lastWall: null, fresh: keepMarks, acc: new Set(), dyn: new Map(), holds: new Map(), durs: new Map(), wall: new Map(), hitAt: new Map() };
  }
  barOf(i) { const s = this.steps[i]; return s ? s.notes[0].mi : 0; }
  addBar(i, by = 1) { const b = this.barOf(i), f = this.fw; f.bars.set(b, (f.bars.get(b) || 0) + by); }
  posOf(at) { const P = this.timeline.pos; return P.find(p => at >= p.start - 1e-6 && at < p.start + p.len - 1e-6) || P[P.length - 1]; }
  enterFollow() {
    const s = this.steps[this.stepIdx]; if (!s) return;
    this.showStep(s);
    const midis = s.notes.map(n => n.midi);
    this.kb?.focusRange(Math.min(...midis), Math.max(...midis));
    if (this.mic) this.mic.setExpected([...this.pend[this.stepIdx]]);
    this.onState('follow-step');
  }
  frameFollow() {
    if (this.state !== 'following') return;
    const s = this.steps[Math.min(this.stepIdx, this.steps.length - 1)], f = this.fw;
    if (s) {
      // imleç senin temponla ilerler ama beklenen notayı geçmez
      let a = s.at;
      if (f.lastAt != null && f.spq) a = Math.min(s.at, Math.max(f.lastAt, f.lastAt + (performance.now() - f.lastWall) / f.spq));
      const p = this.posOf(a);
      this.eng.setCursor(p.mi, a - p.start); this.scrollTo(p.mi);
    }
    this.raf = requestAnimationFrame(() => this.frameFollow());
  }
  noteTime(i) {
    const f = this.fw, now = performance.now(), s = this.steps[i];
    if (f.lastWall != null && now - f.lastWall > 5000) f.log = [];
    f.log.push({ at: s.at, wall: now }); if (f.log.length > 8) f.log.shift();
    f.lastAt = s.at; f.lastWall = now;
    const a = f.log[0], b = f.log[f.log.length - 1];
    if (b.at - a.at >= 1 && b.wall > a.wall) { f.spq = Math.max(250, Math.min(3000, (b.wall - a.wall) / (b.at - a.at))); f.bpm = Math.round(60000 / f.spq); }
  }
  accompany(i) {
    if (this.hands === 'both') return;
    ensureAudio();
    const s = this.steps[i], nx = this.steps[i + 1], end = nx ? nx.at : this.timeline.total;
    const spq = (this.fw.spq || this.spq() * 1000) / 1000, t = audioCtx().currentTime + 0.005;
    for (const n of this.notes) {
      if (n.at >= end - 1e-6) break;
      if (this.active(n) || n.tiedIn || n.at < s.at - 1e-6) continue;
      playNote(n.midi, t + (n.at - s.at) * spq, n.d * spq, 0.5);
    }
  }
  followHit(i, m, raw, at) {
    const f = this.fw, s = this.steps[i], now = at || performance.now();
    this.pend[i].delete(m); f.hits++; f.streak = 0; f.started = true;
    // dinamik ve süre için: basış hızı ve basış anı
    if (!f.wall.has(i)) f.wall.set(i, now);
    f.hitAt.set(m, now);
    s.notes.forEach(n => { if (n.midi !== m) return; const k = n.key + ':' + m; if (raw) f.dyn.set(k, { n, v: raw }); f.holds.set(m, { n, k, t0: now, pedal: this.pedalDown, spq: f.spq }); });
    this.kb?.flash(m, 'okk');
    s.notes.filter(n => n.midi === m).forEach(n => this.eng.markResult(n.key, 'good'));
    if (!f.acc.has(i)) { f.acc.add(i); this.noteTime(i); this.accompany(i); }
    if (this.pend[i].size === 0) { this.stepIdx = i + 1; if (this.stepIdx >= this.steps.length) this.finishFollow(); else this.enterFollow(); }
    else if (this.stepIdx !== i) { this.stepIdx = i; this.enterFollow(); }
    else if (this.mic) this.mic.setExpected([...this.pend[i]]);
  }
  markMissed(i) {
    const f = this.fw, s = this.steps[i];
    this.pend[i].forEach(m => { f.missed++; this.addBar(i); s.notes.filter(n => n.midi === m).forEach(n => this.eng.markResult(n.key, 'bad')); });
    this.pend[i].clear();
  }
  // Tuş bırakıldı: tutulan notanın süresi kaydedilir
  release(m, at) {
    const f = this.fw; if (this.state !== 'following' || !f) return;
    const h = f.holds.get(m); if (!h) return;
    f.holds.delete(m);
    f.durs.set(h.k, { n: h.n, t0: h.t0, t1: at || performance.now(), pedal: h.pedal, spq: h.spq });
  }
  followNote(m, raw, at) {
    const f = this.fw, n = this.steps.length; if (!n) return;
    if (f.fresh) { f.fresh = false; this.eng.clearMarks(); this.onState('follow-step'); }
    f.hist.push(m); if (f.hist.length > 8) f.hist.shift();
    const i = this.stepIdx;
    if (i < n && this.pend[i].has(m)) { this.followHit(i, m, raw, at); return; }
    // Az önce çalınan nota hemen yeniden geldiyse (tuş sekmesi, çift sinyal) bir adım atlanmış sayılmaz
    if (i + 1 < n && this.pend[i + 1].has(m) && (at || performance.now()) - (f.hitAt.get(m) ?? -1e9) < 150) return;
    if (i + 1 < n && this.pend[i + 1].has(m)) {
      if (f.started) this.markMissed(i); else this.pend[i].clear();
      this.followHit(i + 1, m, raw, at); return;
    }
    // tekrar ya da düzeltme: son iki adımdaki nota ceza almaz
    if ([i - 1, i - 2].some(x => x >= 0 && this.steps[x].notes.some(o => o.midi === m))) return;
    // süsleme: işaretli notanın çevresindeki sesler serbest
    if ([i, i - 1].some(x => x >= 0 && x < n && this.steps[x].notes.some(o => o.ev.orn && Math.abs(o.midi - m) <= 2))) return;
    if (f.started) {
      f.wrong++; f.streak++; this.addBar(Math.min(i, n - 1)); f.wrongBars.push(this.barOf(Math.min(i, n - 1)));
      this.kb?.flash(m, 'err');
      if (this.hint === 'error') this.showHintNow();
      this.onState('follow-step');
    }
    this.relocate(raw, at);
  }
  // Son çalınan üç nota notanın başka yerine uyuyorsa imleci oraya taşır
  relocate(raw, at) {
    const f = this.fw, K = 3, n = this.steps.length;
    if (f.hist.length < K) return;
    const last = f.hist.slice(-K);
    const has = (j, m) => this.steps[j].notes.some(o => o.midi === m);
    const cand = [];
    for (let j = 0; j < n; j++) {
      if (!has(j, last[K - 1])) continue;
      let p = j, ok = true, used = new Set([last[K - 1]]);
      for (let h = K - 2; h >= 0; h--) {
        const m = last[h];
        if (has(p, m) && !used.has(m)) { used.add(m); continue; }
        if (p > 0 && has(p - 1, m)) { p--; used = new Set([m]); continue; }
        ok = false; break;
      }
      if (ok) cand.push(j);
    }
    if (!cand.length) return;
    if (cand.length > 1 && f.started && f.streak < 4) return;
    const i = this.stepIdx;
    cand.sort((a, b) => (a >= i ? a - i : (i - a) * 2) - (b >= i ? b - i : (i - b) * 2));
    this.jumpTo(cand[0], last, raw, at);
  }
  jumpTo(j, last, raw, at) {
    const f = this.fw, i = this.stepIdx;
    if (f.started) { for (let w = 0; w < f.streak && f.wrongBars.length; w++) { f.wrong--; const b = f.wrongBars.pop(); f.bars.set(b, Math.max(0, (f.bars.get(b) || 1) - 1)); } }
    f.streak = 0; f.log = []; f.lastAt = null; f.lastWall = null;
    if (j > i) {
      for (let k = i; k < j; k++) { if (f.started && j - i <= 8) this.markMissed(k); else this.pend[k].clear(); }
    } else {
      for (let k = j; k <= Math.min(i, this.steps.length - 1); k++) {
        this.pend[k] = new Set(this.steps[k].notes.map(o => o.midi));
        this.steps[k].notes.forEach(o => this.eng.clearMark(o.key));
        f.acc.delete(k); f.wall.delete(k);
      }
    }
    this.stepIdx = j;
    const hit = last[last.length - 1];
    this.followHit(j, hit, raw, at);
  }
  finishFollow() {
    const f = this.fw;
    const weak = [...f.bars.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([b]) => b);
    this.lastFollow = { pct: Math.round(100 * f.hits / Math.max(1, f.hits + f.missed + f.wrong)), wrong: f.wrong, missed: f.missed, bpm: f.bpm, weak,
      dyn: dynReport([...f.dyn.values()], { kind: this.kind, hands: this.hands }), dur: durReport([...f.durs.values()], this.steps, f.wall) };
    this.resetFollow(true);
    this.showStep(this.steps[0]);
    this.onState('follow-done');
  }
  micHit(list) { if (this.state === 'waiting' || this.state === 'following') list.forEach(m => this.input('down', m, 'mic')); }
  showHintNow() {
    const s = this.steps[this.stepIdx]; if (!s) return;
    const marks = new Map(); s.notes.forEach(n => marks.set(n.midi, { hand: n.staff, finger: n.finger })); this.kb?.setMarks(marks);
  }
  async enableMic(on) {
    const { MicListener } = await import('./i.js');
    if (on) { const m = new MicListener(); const ok = await m.start(); if (!ok) return false; m.onHit = (l) => this.micHit(l); this.mic = m; if (this.state === 'waiting') this.enterStep(); if (this.state === 'following') this.enterFollow(); return true; }
    this.mic?.stop(); this.mic = null; return true;
  }
}
