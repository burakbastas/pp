// İlerleme ve ayarlar tarayıcıda saklanır
const KEY = 'piyano-okulu-v1';
const DEF = {
  prog: {}, manual: {}, tempo: {}, howSeen: {}, last: null,
  settings: { zoom: 1, volume: 0.85, names: false, fingers: true, metro: true, midiSound: false, hint: 'always', piano: 'musyng' },
};
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const d = JSON.parse(raw); return { ...structuredClone(DEF), ...d, settings: { ...DEF.settings, ...d.settings } }; }
  } catch (e) { /* tarayıcı depolaması yok */ }
  return structuredClone(DEF);
}
export const db = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* */ } }

export const PASS = 90;
// Bir bölümde hangi el geçilmeli
export const required = (item) => item.kind === 'fa' ? 'lh' : item.kind === 'finger' ? item.hand : 'both';
export const score = (id, sec, hand) => db.prog[id]?.[sec]?.[hand] ?? null;
export const secDone = (item, sec) => (score(item.id, 'all', required(item)) ?? 0) >= PASS || (score(item.id, sec, required(item)) ?? 0) >= PASS;
export function isDone(item) { return !!db.manual[item.id] || item.sections.every((_, i) => secDone(item, i)); }
export const isStarted = (item) => !!db.prog[item.id] && Object.keys(db.prog[item.id]).length > 0;
export const itemState = (item) => isDone(item) ? 'done' : isStarted(item) ? 'some' : 'none';
export function record(id, sec, hand, pct) {
  const p = db.prog[id] = db.prog[id] || {}, s = p[sec] = p[sec] || {};
  s[hand] = Math.max(s[hand] ?? 0, pct);
  db.last = id; save();
}
export function setManual(id, v) { if (v) db.manual[id] = true; else delete db.manual[id]; save(); }

export function exportData() { return JSON.stringify(db, null, 1); }
export function importData(text) { const d = JSON.parse(text); Object.keys(db).forEach(k => delete db[k]); Object.assign(db, structuredClone(DEF), d, { settings: { ...DEF.settings, ...d.settings } }); save(); }
export function resetAll() { Object.keys(db).forEach(k => delete db[k]); Object.assign(db, structuredClone(DEF)); save(); }
