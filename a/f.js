// Dinamik (basış hızı) ve nota süresi geri bildirimi. İkisi de geçme yüzdesine katılmaz.
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const stat = (a) => { const m = mean(a); return { m, sd: Math.sqrt(mean(a.map(v => (v - m) ** 2))), n: a.length }; };
const HAND = { rh: 'Sağ el', lh: 'Sol el' }, HANDL = { rh: 'Sağ elde', lh: 'Sol elde' };

// list: [{ n: nota, v: 1-127 }]  kind: 'finger' | 'fa' | 'piece'  hands: 'rh' | 'lh' | 'both'
export function dynReport(list, { kind, hands }) {
  const vals = list.filter(x => x.v > 0).sort((a, b) => a.n.at - b.n.at || (a.n.staff === 'lh') - (b.n.staff === 'lh'));
  if (vals.length < 8) return null;
  const vs = vals.map(x => x.v), lo = Math.min(...vs), hi = Math.max(...vs);
  // Dokunuş eğrisi "sabit" ise her nota aynı sayıyla gelir
  if (hi - lo <= 2) return { fixed: true, msgs: [{ t: 'Klavyen her notayı aynı güçte gönderiyor. Dokunuş eğrisi sabit (fixed) olabilir; normal eğriye alırsan dinamik ölçülür.', c: 'warn' }] };
  const by = { rh: vals.filter(x => x.n.staff === 'rh'), lh: vals.filter(x => x.n.staff === 'lh') };
  const st = {}; for (const h of ['rh', 'lh']) if (by[h].length >= 6) st[h] = stat(by[h].map(x => x.v));
  const msgs = [];
  if (kind === 'finger' || kind === 'fa') {
    for (const h of ['rh', 'lh']) {
      const s = st[h]; if (!s) continue;
      const cv = s.sd / s.m;
      const word = cv <= 0.1 ? 'çok eşit' : cv <= 0.16 ? 'eşit' : cv <= 0.24 ? 'biraz dalgalı' : 'dalgalı';
      msgs.push({ t: `${HAND[h]}: basışlar ${word} (ortalama ${Math.round(s.m)}, ±${Math.round(s.sd)}).`, c: cv <= 0.16 ? 'good' : 'warn' });
      // en zayıf parmak
      const fm = new Map();
      by[h].forEach(x => { const f = x.n.finger; if (f) { if (!fm.has(f)) fm.set(f, []); fm.get(f).push(x.v); } });
      const fs = [...fm.entries()].filter(([, a]) => a.length >= 3);
      if (fs.length >= 3) {
        const [wf, wa] = fs.map(([f, a]) => [f, mean(a)]).sort((a, b) => a[1] - b[1])[0];
        const others = fs.filter(([f]) => f !== wf).flatMap(([, a]) => a), om = mean(others);
        const pct = Math.round((1 - wa / om) * 100);
        if (pct >= 12) msgs.push({ t: `${HANDL[h]} ${wf}. parmak diğerlerinden yüzde ${pct} zayıf.`, c: 'warn' });
      }
    }
  }
  if (hands === 'both' && st.rh && st.lh) {
    const r = st.rh.m / st.lh.m, pct = Math.round(Math.abs(r - 1) * 100);
    if (r < 0.95) msgs.push({ t: `Sol el sağ elden yüzde ${pct} güçlü. Melodi sağ eldeyse eşliği hafiflet.`, c: 'warn' });
    else if (r >= 1.05) msgs.push({ t: `Sağ el yüzde ${pct} önde; melodi eşliğin üstünde duyuluyor.`, c: 'good' });
    else msgs.push({ t: 'İki el aynı güçte. Melodiyi biraz öne çıkarabilirsin.', c: '' });
  }
  for (const h of ['rh', 'lh']) {
    const acc = by[h].filter(x => x.n.accent).map(x => x.v), rest = by[h].filter(x => !x.n.accent).map(x => x.v);
    if (acc.length >= 2 && rest.length >= 4) {
      const ok = mean(acc) >= mean(rest) * 1.08;
      msgs.push({ t: ok ? `${HANDL[h]} aksanlar duyuluyor.` : `${HANDL[h]} aksanlı notalar çevresinden belirgin değil.`, c: ok ? 'good' : 'warn' });
    }
  }
  msgs.push({ t: `Basış aralığın ${lo}–${hi} (1–127 arası).`, c: '' });
  return { msgs, series: vals.slice(-180).map(x => [x.n.staff, x.v]) };
}

// durs: [{ n, t0, t1, pedal, spq }]  steps: oyuncu adımları  wall: adım index -> basış zamanı
export function durReport(durs, steps, wall) {
  const short = new Set(), legato = new Set(); let checked = 0;
  for (const { n, t0, t1, pedal, spq } of durs) {
    if (pedal) continue;
    const stac = !!n.ev.stac, wq = stac ? n.sounding : n.d;
    if (!stac && wq < 2 - 1e-6) continue;   // yalnız yarımlık ve daha uzun notalar
    const endAt = n.at + wq - 1e-6, j = steps.findIndex(s => s.at >= endAt);
    // beklenen süre: bir sonraki notaya kadar geçen zaman; ara verdiysen tempon esas alınır
    const cands = [];
    if (j >= 0 && wall.has(j) && wall.get(j) > t0) cands.push(wall.get(j) - t0);
    if (spq) cands.push(wq * spq * 1.3);
    if (!cands.length) continue;
    const exp = Math.min(...cands); if (exp < 150) continue;
    const r = (t1 - t0) / exp; checked++;
    if (stac ? r > 0.8 : r < 0.6) (stac ? legato : short).add(n.mi);
  }
  return checked ? { checked, short: [...short].sort((a, b) => a - b), legato: [...legato].sort((a, b) => a - b) } : null;
}
