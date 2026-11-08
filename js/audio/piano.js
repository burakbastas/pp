// Örnek dosyası gerektirmeyen, Web Audio ile üretilen piyano sesi ve metronom
let ctx = null, master = null, dry = null, wet = null, noise = null;
const waves = new Map();
const live = new Set();

export function audioCtx() { return ctx; }
export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.14;
    master = ctx.createGain(); master.gain.value = currentVolume;
    dry = ctx.createGain(); dry.gain.value = 0.92;
    wet = ctx.createGain(); wet.gain.value = 0.16;
    const rev = ctx.createConvolver(); rev.buffer = impulse(1.5, 2.6);
    dry.connect(comp); wet.connect(rev); rev.connect(comp); comp.connect(master); master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
let currentVolume = 0.9;
export function setVolume(v) { currentVolume = v; if (master) master.gain.value = v; }
function impulse(sec, decay) {
  const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 400 ? i / 400 : 1); }
  return b;
}
function waveFor(midi) {
  const band = Math.max(0, Math.min(5, Math.floor((midi - 24) / 14)));
  if (waves.has(band)) return waves.get(band);
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  const roll = [1.05, 1.25, 1.55, 1.95, 2.45, 3.1][band];
  for (let i = 1; i < N; i++) {
    const strike = Math.abs(Math.sin(Math.PI * i / 7.5)) * 0.7 + 0.3; // çekiç konumu tınıyı biçimlendirir
    im[i] = strike / Math.pow(i, roll);
  }
  const w = ctx.createPeriodicWave(re, im, { disableNormalization: false });
  waves.set(band, w); return w;
}
const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function playNote(midi, when = 0, dur = 0.6, vel = 0.75) {
  ensureAudio();
  const t = when || ctx.currentTime;
  const f = freq(midi);
  const sus = Math.max(0.55, 7.5 - (midi - 21) * 0.085);
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.4;
  const bright = Math.min(14000, f * (4 + 10 * vel));
  lp.frequency.setValueAtTime(bright, t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.6), t + Math.min(1.8, sus * 0.5));
  const level = 0.15 * Math.pow(vel, 1.3) * (midi < 45 ? 1.2 : 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(level, t + 0.004);
  g.gain.exponentialRampToValueAtTime(level * 0.42, t + 0.09 + (108 - midi) * 0.002);
  g.gain.exponentialRampToValueAtTime(0.0007, t + sus);
  const oscs = [-1.6, 1.6].map(c => { const o = ctx.createOscillator(); o.setPeriodicWave(waveFor(midi)); o.frequency.value = f; o.detune.value = c; o.connect(lp); return o; });
  lp.connect(g); g.connect(dry); g.connect(wet);
  oscs.forEach(o => { o.start(t); });
  // çekiç tıkı
  const n = ctx.createBufferSource(); n.buffer = noise;
  const ng = ctx.createGain(), nf = ctx.createBiquadFilter();
  nf.type = 'bandpass'; nf.frequency.value = Math.min(5200, f * 5); nf.Q.value = 0.7;
  ng.gain.setValueAtTime(0.05 * vel, t); ng.gain.exponentialRampToValueAtTime(0.0003, t + 0.035);
  n.connect(nf); nf.connect(ng); ng.connect(dry); n.start(t); n.stop(t + 0.05);
  const voice = { g, oscs, end: t + sus + 0.1 };
  live.add(voice);
  const release = (at) => {
    const rt = Math.max(at, t + 0.012);
    g.gain.cancelScheduledValues(rt);
    g.gain.setTargetAtTime(0.00001, rt, midi < 50 ? 0.09 : 0.06);
    const stopAt = rt + 0.6;
    oscs.forEach(o => { try { o.stop(stopAt); } catch (e) { /* zaten durdu */ } });
    voice.end = stopAt;
    setTimeout(() => live.delete(voice), Math.max(0, (stopAt - ctx.currentTime) * 1000) + 60);
  };
  if (dur != null) release(Math.min(t + dur, t + sus));
  else voice.release = () => release(ctx.currentTime);
  voice.releaseAt = release;
  return voice;
}
export function stopAll() {
  if (!ctx) return;
  live.forEach(v => { try { v.g.gain.cancelScheduledValues(ctx.currentTime); v.g.gain.setTargetAtTime(0.00001, ctx.currentTime, 0.02); v.oscs.forEach(o => o.stop(ctx.currentTime + 0.12)); } catch (e) { /* */ } });
  live.clear();
}
export function click(when, strong) {
  ensureAudio();
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.value = strong ? 1760 : 1175;
  g.gain.setValueAtTime(strong ? 0.26 : 0.16, when);
  g.gain.exponentialRampToValueAtTime(0.0004, when + 0.05);
  o.connect(g); g.connect(master); o.start(when); o.stop(when + 0.06);
}
