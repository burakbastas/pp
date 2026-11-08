// Piyano sesi: Musyng Kite örnekleri (sounds/piano). Örnek henüz yüklenmediyse sentezle çalar.
let ctx = null, master = null, dry = null, wet = null, noise = null;
const waves = new Map();
const live = new Set();

export function audioCtx() { return ctx; }
export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.16;
    master = ctx.createGain(); master.gain.value = currentVolume;
    dry = ctx.createGain(); dry.gain.value = 0.95;
    wet = ctx.createGain(); wet.gain.value = 0.1;
    const rev = ctx.createConvolver(); rev.buffer = impulse(1.3, 3);
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

// --- Örnekler
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const fileOf = (m) => `sounds/piano/${NAMES[m % 12]}${Math.floor(m / 12) - 1}.mp3`;
const samples = new Map(), loading = new Map();
let decoder = null;
const REF_PEAK = 0.06, MAKEUP = 8.5, FIRST = 21, LAST = 108;
export const pianoState = { loaded: 0, total: 0, ready: false };

function decode(bytes) {
  if (!decoder) { const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext; decoder = new OC(2, 1, 44100); }
  return new Promise((ok, no) => decoder.decodeAudioData(bytes, ok, no));
}
function measure(buf) {
  const d = buf.getChannelData(0), sr = buf.sampleRate, win = Math.max(1, Math.round(sr * 0.002));
  let peak = 0;
  for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  // Bas notalarının atağı tiz notalardan yavaştır. Her notayı tepe noktasının yarısına
  // aynı anda ulaşacak şekilde hizalıyoruz; böylece sol ve sağ el birlikte duyulur.
  let on = 0;
  for (let i = 0; i < Math.min(d.length, sr * 0.3); i += win) {
    let m = 0; for (let j = i; j < i + win && j < d.length; j++) m = Math.max(m, Math.abs(d[j]));
    if (m >= peak * 0.5) { on = i; break; }
  }
  return { buf, peak, offset: Math.max(0, on / sr - 0.004), norm: Math.pow(REF_PEAK / Math.max(peak, 0.005), 0.6) };
}
function loadSample(m) {
  if (m < FIRST || m > LAST || samples.has(m)) return Promise.resolve();
  if (loading.has(m)) return loading.get(m);
  const p = fetch(fileOf(m)).then(r => { if (!r.ok) throw new Error('yok'); return r.arrayBuffer(); })
    .then(decode).then(b => { samples.set(m, measure(b)); })
    .catch(() => { /* sentez yedeği devreye girer */ })
    .finally(() => loading.delete(m));
  loading.set(m, p); return p;
}
export async function preloadPiano(lo = 36, hi = 84) {
  const center = 60, list = [];
  for (let m = Math.max(FIRST, lo); m <= Math.min(LAST, hi); m++) list.push(m);
  list.sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
  pianoState.total = list.length;
  let i = 0;
  const step = async () => {
    while (i < list.length) {
      await loadSample(list[i++]);
      pianoState.loaded = list.filter(x => samples.has(x)).length;
      dispatchEvent(new CustomEvent('piano-progress'));
    }
  };
  await Promise.all(Array.from({ length: 6 }, step));
  pianoState.ready = pianoState.loaded === list.length;
  dispatchEvent(new CustomEvent('piano-progress'));
}
function findSample(m) {
  const s = samples.get(m);
  if (s) return { s, rate: 1 };
  loadSample(m);
  for (let d = 1; d <= 4; d++) {
    for (const k of [m - d, m + d]) { const n = samples.get(k); if (n) return { s: n, rate: Math.pow(2, (m - k) / 12) }; }
  }
  return null;
}
function sampleVoice(midi, t, vel, { s, rate }) {
  const src = ctx.createBufferSource(); src.buffer = s.buf; src.playbackRate.value = rate;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.3;
  lp.frequency.value = Math.min(18000, 1500 + 17000 * Math.pow(vel, 1.8)); // hafif basış daha yumuşak tını
  const g = ctx.createGain();
  const level = MAKEUP * s.norm * Math.pow(vel, 1.5);
  const life = (s.buf.duration - s.offset) / rate;
  g.gain.setValueAtTime(level, t);
  g.gain.setValueAtTime(level, t + life - 0.2);
  g.gain.linearRampToValueAtTime(0.0001, t + life);
  src.connect(lp); lp.connect(g); g.connect(dry); g.connect(wet);
  src.start(t, s.offset);
  return { g, oscs: [src], life };
}

// --- Sentez yedeği (örnek yüklenene kadar)
function waveFor(midi) {
  const band = Math.max(0, Math.min(5, Math.floor((midi - 24) / 14)));
  if (waves.has(band)) return waves.get(band);
  const N = 32, re = new Float32Array(N), im = new Float32Array(N);
  const roll = [1.05, 1.25, 1.55, 1.95, 2.45, 3.1][band];
  for (let i = 1; i < N; i++) im[i] = (Math.abs(Math.sin(Math.PI * i / 7.5)) * 0.7 + 0.3) / Math.pow(i, roll);
  const w = ctx.createPeriodicWave(re, im, { disableNormalization: false });
  waves.set(band, w); return w;
}
function synthVoice(midi, t, vel) {
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const sus = Math.max(0.55, 7.5 - (midi - 21) * 0.085);
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.Q.value = 0.4;
  lp.frequency.setValueAtTime(Math.min(14000, f * (4 + 10 * vel)), t);
  lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.6), t + Math.min(1.8, sus * 0.5));
  const level = 0.15 * Math.pow(vel, 1.3) * (midi < 45 ? 1.2 : 1);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(level, t + 0.004);
  g.gain.exponentialRampToValueAtTime(level * 0.42, t + 0.09 + (108 - midi) * 0.002);
  g.gain.exponentialRampToValueAtTime(0.0007, t + sus);
  const oscs = [-1.6, 1.6].map(c => { const o = ctx.createOscillator(); o.setPeriodicWave(waveFor(midi)); o.frequency.value = f; o.detune.value = c; o.connect(lp); o.start(t); return o; });
  lp.connect(g); g.connect(dry); g.connect(wet);
  return { g, oscs, life: sus };
}

export function playNote(midi, when = 0, dur = 0.6, vel = 0.75) {
  ensureAudio();
  const t = Math.max(when || 0, ctx.currentTime);
  const found = findSample(midi);
  const { g, oscs, life } = found ? sampleVoice(midi, t, vel, found) : synthVoice(midi, t, vel);
  const voice = { g, oscs, end: t + life + 0.1 };
  live.add(voice);
  const release = (at) => {
    const rt = Math.max(at, t + 0.012);
    if (rt >= t + life) return;
    g.gain.cancelScheduledValues(rt);
    g.gain.setTargetAtTime(0.00001, rt, midi < 50 ? 0.1 : 0.065);
    const stopAt = rt + 0.6;
    oscs.forEach(o => { try { o.stop(stopAt); } catch (e) { /* zaten durdu */ } });
    voice.end = stopAt;
  };
  oscs[0].onended = () => live.delete(voice);
  if (dur != null) release(t + dur);
  else voice.release = () => release(ctx.currentTime);
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
