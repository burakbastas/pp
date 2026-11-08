const KEY = 'iki-el-v1';
const DEF = {
  done: {}, steps: {}, seen: {}, clean: {}, tempo: {}, reading: {}, songs: [], log: {}, settings: {
    minutes: 30, voice: 'tenor', hint: 'always', names: false, fingers: true, metro: true, countIn: true, zoom: 1, midiSound: false, volume: 0.85, theme: 'auto', book: 56,
  },
};
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) { const d = JSON.parse(raw); return { ...DEF, ...d, settings: { ...DEF.settings, ...d.settings } }; } } catch (e) { /* tarayıcı depolaması yok */ }
  return structuredClone(DEF);
}
export const db = load();
export function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* */ } }
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export function logMinutes(sec) { const k = today(); db.log[k] = (db.log[k] || 0) + sec; save(); }
export function streak() {
  let n = 0; const d = new Date();
  for (; ;) {
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if ((db.log[k] || 0) >= 60) { n++; d.setDate(d.getDate() - 1); } else if (n === 0 && k === today()) { d.setDate(d.getDate() - 1); } else break;
  }
  return n;
}
export function exportData() { return JSON.stringify(db, null, 1); }
export function importData(text) { const d = JSON.parse(text); Object.keys(db).forEach(k => delete db[k]); Object.assign(db, { ...DEF, ...d, settings: { ...DEF.settings, ...d.settings } }); save(); }
export function resetAll() { Object.keys(db).forEach(k => delete db[k]); Object.assign(db, structuredClone(DEF)); save(); }
