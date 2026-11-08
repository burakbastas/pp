// Çalma motoru: Dinle / Birlikte çal / Bekle kipleri, döngü, tempo, el seçimi
import { flatten, playOrder } from '../notation/parse.js';
import { ensureAudio, playNote, click, stopAll, audioCtx } from '../audio/piano.js';
import { Inputs } from '../audio/input.js';

export class Player {
  constructor({ score, engraved, keyboard, onState }) {
    this.score = score; this.eng = engraved; this.kb = keyboard; this.onState = onState || (() => { });
    this.mode = 'listen'; this.hands = 'both'; this.tempo = score.tempo; this.metro = true; this.countIn = true; this.useRepeats = false;
    this.hint = 'always'; this.loop = null; this.state = 'idle'; this.stats = null; this.autoUp = false;
    this.mic = null;
    this.rebuild();
    this.off = Inputs.on((t, m, s) => this.input(t, m, s));
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
  setHands(h) { this.hands = h; this.buildSteps(); this.previewStart(); }
  setLoop(a, b) {
    this.stop();
    this.loop = a == null ? null : { a: Math.min(a, b), b: Math.max(a, b) };
    this.eng.setLoop(this.loop?.a, this.loop?.b);
    this.rebuild(); this.previewStart();
  }
  setRepeats(v) { this.stop(); this.useRepeats = v; this.rebuild(); this.previewStart(); }
  spq() { return 60 / this.tempo; }
  previewStart() {
    this.stepIdx = 0; this.eng.clearMarks?.();
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
    const ctx = audioCtx(), now = ctx.currentTime, horizon = now + 0.22, spq = this.spqNow;
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
      this.onState('loop');
      if (this.autoUp) this.tempo = Math.min(this.tempo + 4, this.score.tempoMax || 200);
      this.spqNow = this.spq();
      this.onState('tempo');
      this.t0 = audioCtx().currentTime + 0.05; this.nextIdx = 0; this.nextClick = 0;
      this.timer = setInterval(() => this.pump(), 30);
      return;
    }
    this.stop(); this.onState('done');
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
    if (this.state === 'waiting' && this.mic) this.mic.setExpected([]);
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
  input(type, midi) {
    if (type === 'down') this.kb?.pressed(midi, true);
    if (type === 'up') { this.kb?.pressed(midi, false); return; }
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
  micHit(list) { if (this.state === 'waiting') list.forEach(m => this.input('down', m, 'mic')); }
  showHintNow() {
    const s = this.steps[this.stepIdx]; if (!s) return;
    const marks = new Map(); s.notes.forEach(n => marks.set(n.midi, { hand: n.staff, finger: n.finger })); this.kb?.setMarks(marks);
  }
  async enableMic(on) {
    const { MicListener } = await import('../audio/input.js');
    if (on) { const m = new MicListener(); const ok = await m.start(); if (!ok) return false; m.onHit = (l) => this.micHit(l); this.mic = m; if (this.state === 'waiting') this.enterStep(); return true; }
    this.mic?.stop(); this.mic = null; return true;
  }
}
