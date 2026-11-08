// Metin nota biçimini ölçü/olay yapısına çevirir.
// "bb5:4_3" perde:süre_parmak | "!" stakato | "~" bağ | "(" ")" legato yayı | "^t" "^m" "^p" süsleme | ">" aksan
// "<c3_5 e3_3 g3_1>:2" akor | "r:4" sus | "//" ikinci ses | "|:" ":|" tekrar | "%b" "%t" anahtar değişimi
import { parsePitch } from './theory.js';

export function durQuarters(tok) {
  const m = /^(\d+)(\.*)$/.exec(tok);
  const n = +m[1];
  let q = n === 12 ? 1 / 3 : 4 / n, add = q;
  for (let i = 0; i < m[2].length; i++) { add /= 2; q += add; }
  return q;
}

function parseVoice(text, ctx) {
  const events = []; let t = 0;
  const parts = [];
  // akorları tek jeton yap
  const re = /<[^>]*>[^\s]*|\S+/g; let m;
  while ((m = re.exec(text))) parts.push(m[0]);
  for (let tok of parts) {
    if (tok === '|:') { ctx.repeatStart = true; continue; }
    if (tok === ':|') { ctx.repeatEnd = true; continue; }
    if (tok === '%b') { ctx.clef = 'bass'; continue; }
    if (tok === '%t') { ctx.clef = 'treble'; continue; }
    const mods = {}; let inner = null, rest = tok;
    if (rest.startsWith('<')) { const c = rest.indexOf('>'); inner = rest.slice(1, c); rest = rest.slice(c + 1); }
    rest = rest.replace(/!/g, () => { mods.stac = true; return ''; })
      .replace(/>/g, () => { mods.accent = true; return ''; })
      .replace(/\(/g, () => { mods.slurStart = true; return ''; })
      .replace(/\)/g, () => { mods.slurEnd = true; return ''; })
      .replace(/~/g, () => { mods.tie = true; return ''; })
      .replace(/\^([tmp])/g, (_, o) => { mods.orn = o; return ''; })
      .replace(/:(\d+\.*)/, (_, d) => { ctx.dur = d; return ''; });
    let finger = null;
    rest = rest.replace(/_(\d)/, (_, f) => { finger = f; return ''; });
    if (inner !== null) {
      const notes = inner.trim().split(/\s+/).map(n => noteOf(n, mods.tie));
      notes.sort((a, b) => a.midi - b.midi);
      push(notes);
    } else if (rest === 'r') push([]);
    else push([noteOf(rest + (finger ? '_' + finger : ''), mods.tie)]);
    function push(notes) {
      const d = durQuarters(ctx.dur);
      events.push({ t, d, notes, rest: notes.length === 0, base: ctx.dur, triplet: ctx.dur.startsWith('12'), ...mods });
      t += d;
    }
  }
  return events;
  function noteOf(s, tie) {
    let finger = null; const f = /_(\d)$/.exec(s);
    if (f) { finger = +f[1]; s = s.slice(0, -2); }
    const p = parsePitch(s);
    return { ...p, finger, tie: !!tie };
  }
}

function splitBars(src) {
  if (Array.isArray(src)) return src;
  if (!src) return [];
  return src.split(/\s*\|\s*(?!:)/).map(x => x.trim()).filter(Boolean);
}
// "|:" jetonunu bölmemek için çubukla ayrılmış metinde ":|" ve "|:" korunur
function splitText(src) {
  if (Array.isArray(src)) return src;
  if (!src) return [];
  const safe = src.replace(/\|:/g, '§S').replace(/:\|/g, '§E');
  return safe.split('|').map(x => x.replace(/§S/g, '|:').replace(/§E/g, ':|').trim()).filter(Boolean);
}

function parseStaff(barText, defaultClef, state) {
  const ctx = { dur: state.dur || '4' };  // süre bir önceki ölçüden sürer
  const parts = barText.split('//');
  const v1 = parseVoice(parts[0], ctx);
  state.dur = ctx.dur;
  const voices = [v1];
  parts.slice(1).forEach((p, k) => { const key = 'dur' + (k + 2), c2 = { dur: state[key] || '4' }; voices.push(parseVoice(p, c2)); state[key] = c2.dur; });
  if (ctx.clef) state.clef = ctx.clef;
  return { voices, clef: state.clef, repeatStart: ctx.repeatStart, repeatEnd: ctx.repeatEnd };
}

export function parseScore(def) {
  const rh = splitText(def.rh), lh = splitText(def.lh);
  const n = Math.max(rh.length, lh.length);
  const time = def.time || [4, 4];
  const barLen = time[0] * 4 / time[1];
  const sR = { clef: def.clefR || 'treble' }, sL = { clef: def.clefL || 'bass' };
  const measures = [];
  for (let i = 0; i < n; i++) {
    const R = rh[i] != null ? parseStaff(rh[i], 'treble', sR) : null;
    const L = lh[i] != null ? parseStaff(lh[i], 'bass', sL) : null;
    const chordsTxt = def.chords ? def.chords[i] : null;
    const chords = chordsTxt ? chordsTxt.map(c => ({ t: c[0], sym: c[1] })) : [];
    const lyr = def.lyrics ? def.lyrics[i] : null;
    measures.push({
      i, rh: R, lh: L, chords, lyrics: lyr,
      repeatStart: R?.repeatStart || L?.repeatStart || false,
      repeatEnd: R?.repeatEnd || L?.repeatEnd || false,
      key: def.keys ? def.keys[i] : (def.key || 0),
      time, len: (def.pickup && i === 0) ? def.pickup : barLen,
      label: def.barLabels ? def.barLabels[i] : null,
    });
  }
  const score = {
    title: def.title || '', key: def.key || 0, time, tempo: def.tempo || 80,
    staves: { rh: rh.length > 0, lh: lh.length > 0 }, measures, beats: def.beats || null, barOffset: def.firstBar || 0,
  };
  return score;
}

// Tekrarları açıp çalma çizelgesi üretir
export function playOrder(score, useRepeats = true) {
  const order = []; const ms = score.measures;
  let i = 0, start = 0; const done = new Set();
  while (i < ms.length) {
    if (ms[i].repeatStart) start = i;
    order.push(i);
    if (useRepeats && ms[i].repeatEnd && !done.has(i)) { done.add(i); i = start; continue; }
    i++;
  }
  return order;
}

// Çalınacak nota listesi: her biri {m, staff, voice, ev, t(çeyrek), d, midi, finger}
export function flatten(score, order) {
  const notes = []; let at = 0; const pos = [];
  order.forEach((mi, oi) => {
    const m = score.measures[mi];
    pos.push({ mi, start: at, len: m.len });
    for (const staff of ['rh', 'lh']) {
      const st = m[staff]; if (!st) continue;
      st.voices.forEach((v, vi) => {
        v.forEach((ev, ei) => {
          ev.key = `${mi}:${staff}:${vi}:${ei}`;
          if (ev.rest) return;
          for (const n of ev.notes) {
            notes.push({ oi, mi, staff, vi, ei, ev, key: ev.key, at: at + ev.t, d: ev.stac ? Math.min(ev.d, 0.25) * 0.8 : ev.d, sounding: ev.d, midi: n.midi, finger: n.finger, tie: n.tie, tiedIn: false, accent: ev.accent });
          }
        });
      });
    }
    at += m.len;
  });
  // bağları birleştir
  notes.sort((a, b) => a.at - b.at || a.midi - b.midi);
  for (let i = 0; i < notes.length; i++) {
    const n = notes[i]; if (!n.tie) continue;
    let cur = n;
    for (let j = i + 1; j < notes.length; j++) {
      const o = notes[j];
      if (o.staff === cur.staff && o.vi === cur.vi && o.midi === cur.midi && Math.abs(o.at - (cur.at + cur.sounding)) < 1e-6 && !o.tiedIn) {
        o.tiedIn = true; n.d += o.d; n.sounding += 0; cur = o;
        if (!o.tie) break;
      } else if (o.at > cur.at + cur.sounding + 1e-6) break;
    }
  }
  return { notes, pos, total: at };
}
