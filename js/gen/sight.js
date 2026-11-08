// Deşifre üretici: beş parmak konumunda rastgele kısa parçalar
import { makePitch, pitchStr } from '../notation/theory.js';
const R = (n) => Math.floor(Math.random() * n);
const POS = { C: { d: 0, key: 0 }, G: { d: 4, key: 1 }, F: { d: 3, key: -1 } };
const RHY = {
  1: [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1]],
  2: [[2, 2], [1, 1, 2], [2, 1, 1], [1, 1, 1, 1]],
  3: [[1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [1, 0.5, 0.5, 2]],
  4: [[1, 0.5, 0.5, 1, 1], [1.5, 0.5, 2], [0.5, 0.5, 1, 2], [1, 1, 0.5, 0.5, 1]],
};
const TK = { 4: '1', 3: '2.', 2: '2', 1.5: '4.', 1: '4', 0.5: '8' };
function walk(base, hand, rhythm, start) {
  // base: konumun en alt diatonik değeri; hand parmağa göre
  let i = start; const out = [];
  rhythm.forEach((d, n) => {
    const step = [-2, -1, 1, 2][R(4)];
    if (n > 0) { i = Math.min(4, Math.max(0, i + step)); }
    const dia = base + i; const oct = Math.floor(dia / 7), s = ((dia % 7) + 7) % 7;
    const finger = hand === 'rh' ? i + 1 : 5 - i;
    out.push(`${pitchStr(makePitch(s, keyFix(s), oct))}:${TK[d]}_${finger}`);
  });
  return { text: out.join(' '), last: i };
  function keyFix(s) { return (pos.key === 1 && s === 3) ? 1 : (pos.key === -1 && s === 6) ? -1 : 0; }
}
let pos;
export function sightScore({ level = 1, hands = 'lh', bars = 8 }) {
  const names = level >= 3 ? ['C', 'G', 'F'] : ['C', 'G'];
  pos = POS[names[R(names.length)]];
  const baseL = pos.d === 0 ? 21 : pos.d === 4 ? 18 : 17, baseR = 28 + pos.d;
  const rh = [], lh = []; let iR = 0, iL = 4;
  for (let b = 0; b < bars; b++) {
    const final = b === bars - 1;
    const r1 = final ? [4] : RHY[level][R(RHY[level].length)], r2 = final ? [4] : RHY[level][R(RHY[level].length)];
    if (hands === 'both' && level === 2) { // el el sırayla
      const on = b % 2 === 0;
      if (on) { const a = walk(baseR, 'rh', r1, iR); iR = a.last; rh.push(a.text); lh.push('r:1'); }
      else { const a = walk(baseL, 'lh', r2, iL); iL = a.last; lh.push(a.text); rh.push('r:1'); }
      continue;
    }
    if (hands !== 'lh') { const a = walk(baseR, 'rh', r1, final ? 0 : iR); iR = a.last; rh.push(a.text); }
    if (hands !== 'rh') { const a = walk(baseL, 'lh', r2, final ? 4 : iL); iL = a.last; lh.push(a.text); }
  }
  return { title: 'Deşifre', key: pos.key, time: [4, 4], tempo: level >= 3 ? 60 : 56, rh: hands === 'lh' ? undefined : rh, lh: hands === 'rh' ? undefined : lh };
}
