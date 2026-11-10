// MIDI, bilgisayar klavyesi ve mikrofon girişleri tek olay akışında toplanır
import { ensureAudio } from './o.js';

const listeners = new Set();
export const Inputs = {
  on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  // raw: MIDI basış hızı (1-127), t: olay zamanı (performance.now ölçeğinde)
  emit(type, midi, src, vel, raw, t) { const at = t || performance.now(); listeners.forEach(f => f(type, midi, src, vel, raw, at)); },
  midi: { supported: !!navigator.requestMIDIAccess, ready: false, devices: [], busy: [] },
};

export async function connectMIDI() {
  if (!navigator.requestMIDIAccess) return { ok: false, reason: 'unsupported' };
  try {
    const access = await navigator.requestMIDIAccess();
    const bind = async () => {
      const list = [...access.inputs.values()].filter(d => !/through/i.test(d.name || ''));
      const opened = await Promise.allSettled(list.map(d => d.open()));
      const live = list.filter((_, i) => opened[i].status === 'fulfilled');
      Inputs.midi.devices = live.map(d => d.name);
      Inputs.midi.busy = list.filter((_, i) => opened[i].status !== 'fulfilled').map(d => d.name);
      live.forEach(input => {
        input.onmidimessage = (ev) => {
          const [st, n, v] = ev.data; const cmd = st & 0xf0;
          const at = ev.timeStamp || performance.now();
          if (cmd === 0x90 && v > 0) Inputs.emit('down', n, 'midi', Math.pow(v / 127, 0.8), v, at);
          else if (cmd === 0x80 || (cmd === 0x90 && v === 0)) Inputs.emit('up', n, 'midi', 0, 0, at);
          else if (cmd === 0xb0 && n === 64) Inputs.emit('pedal', v, 'midi', 0, 0, at);
        };
      });
      window.dispatchEvent(new CustomEvent('midi-devices'));
    };
    Inputs.midi.ready = true;
    access.onstatechange = bind; await bind();
    return { ok: true, devices: Inputs.midi.devices, busy: Inputs.midi.busy };
  } catch (e) { return { ok: false, reason: 'denied' }; }
}
// İzin daha önce verildiyse sormadan bağlanır
export async function autoConnectMIDI() {
  if (!navigator.requestMIDIAccess || !navigator.permissions) return;
  try {
    const st = await navigator.permissions.query({ name: 'midi', sysex: false });
    if (st.state === 'granted') await connectMIDI();
  } catch (e) { /* tarayıcı bu izni sorgulatmıyor */ }
}

// Bilgisayar klavyesi: A S D F G H J K beyaz, W E T Y U siyah
const CODES = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14 };
let octave = 4; const held = new Map();
export function enableComputerKeys(on = true) {
  if (on && !enableComputerKeys.h) {
    enableComputerKeys.h = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code === 'KeyZ') { octave = Math.max(1, octave - 1); return; }
      if (e.code === 'KeyX') { octave = Math.min(6, octave + 1); return; }
      if (e.code in CODES) { const m = 12 * (octave + 1) + CODES[e.code]; held.set(e.code, m); Inputs.emit('down', m, 'pc'); }
    };
    enableComputerKeys.u = (e) => { if (held.has(e.code)) { Inputs.emit('up', held.get(e.code), 'pc'); held.delete(e.code); } };
    addEventListener('keydown', enableComputerKeys.h); addEventListener('keyup', enableComputerKeys.u);
  }
}

// Mikrofon: "beklenen" notaların duyulup duyulmadığını arar. Akustik piyanoda
// tek ses ve iki sesli geçişlerde güvenilir; hızlı/kalabalık akorlarda MIDI daha doğrudur.
export class MicListener {
  constructor() { this.expected = []; this.running = false; this.onHit = null; this.lastHit = 0; this.floorRms = 0.002; this.armed = true; }
  async start() {
    const ctx = ensureAudio();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) { return false; }
    this.src = ctx.createMediaStreamSource(this.stream);
    this.an = ctx.createAnalyser(); this.an.fftSize = 8192; this.an.smoothingTimeConstant = 0;
    this.src.connect(this.an);
    this.buf = new Float32Array(this.an.frequencyBinCount);
    this.time = new Float32Array(2048);
    this.running = true; this.timer = setInterval(() => this.tick(), 45);
    return true;
  }
  stop() {
    this.running = false; clearInterval(this.timer);
    this.stream?.getTracks().forEach(t => t.stop());
    this.src?.disconnect();
  }
  setExpected(list) { this.expected = list; this.streak = 0; }
  level(f) { // f frekansı çevresinde en büyük genlik
    const ctx = this.an.context, hz = ctx.sampleRate / this.an.fftSize;
    const i = f / hz, w = Math.max(1, Math.round(i * 0.012));
    let best = -200;
    for (let b = Math.max(1, Math.floor(i) - w); b <= Math.ceil(i) + w && b < this.buf.length; b++) if (this.buf[b] > best) best = this.buf[b];
    return Math.pow(10, best / 20);
  }
  noteScore(m) {
    const f = 440 * Math.pow(2, (m - 69) / 12); let s = 0;
    for (let h = 1; h <= 5; h++) s += this.level(f * h) / Math.sqrt(h);
    return s;
  }
  tick() {
    if (!this.running || !this.expected.length) return;
    this.an.getFloatTimeDomainData(this.time);
    let e = 0; for (let i = 0; i < this.time.length; i++) e += this.time[i] * this.time[i];
    const rms = Math.sqrt(e / this.time.length);
    this.floorRms = Math.min(this.floorRms * 1.02 + 1e-5, rms < this.floorRms ? rms * 0.5 + this.floorRms * 0.5 : this.floorRms * 1.02);
    if (!this.armed) { // önceki nota sönene ya da yeni atak gelene kadar bekle
      if (rms < this.peakRms * 0.62 || rms > this.peakRms * 1.25) this.armed = true;
      else { this.peakRms = Math.max(this.peakRms * 0.985, rms); return; }
    }
    if (rms < Math.max(0.006, this.floorRms * 3)) { this.streak = 0; return; }
    this.an.getFloatFrequencyData(this.buf);
    let ok = true;
    for (const m of this.expected) {
      const here = this.noteScore(m);
      const near = Math.max(this.noteScore(m - 1), this.noteScore(m + 1));
      const others = this.level(440 * Math.pow(2, (m - 69) / 12) * 1.33);
      if (!(here > near * 1.5 && here > others * 1.2 && here > 0.002)) { ok = false; break; }
    }
    this.streak = ok ? (this.streak || 0) + 1 : 0;
    if (this.streak >= 2) {
      this.streak = 0; this.armed = false; this.peakRms = rms;
      const list = this.expected; this.expected = [];
      this.onHit?.(list);
    }
  }
}
