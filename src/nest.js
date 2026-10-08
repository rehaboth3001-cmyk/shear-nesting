(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Nest = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const EPS = 1e-6;
  const fitN = (avail, size, gap) => size <= 0 ? 0 : Math.max(0, Math.floor((avail + gap + EPS) / (size + gap)));
  const area = r => r.w * r.h;

  function evalGrid(f, pw, ph, cols, rows, gap) {
    const bw = cols * pw + (cols - 1) * gap, bh = rows * ph + (rows - 1) * gap;
    let rw = f.w - bw - gap, th = f.h - bh - gap;
    if (f.w - bw <= EPS) rw = 0; else if (rw < EPS) rw = 0;
    if (f.h - bh <= EPS) th = 0; else if (th < EPS) th = 0;
    const mk = (x, y, w, h) => (w > EPS && h > EPS) ? { x, y, w, h } : null;
    const opts = [
      { first: 'V', right: mk(f.x + bw + gap, f.y, rw, f.h), top: mk(f.x, f.y + bh + gap, bw, th) },
      { first: 'H', right: mk(f.x + bw + gap, f.y, rw, bh), top: mk(f.x, f.y + bh + gap, f.w, th) }
    ];
    const score = o => Math.max(o.right ? area(o.right) : 0, o.top ? area(o.top) : 0);
    const split = score(opts[0]) >= score(opts[1]) ? opts[0] : opts[1];
    const gridCuts = Math.min((cols - 1) + cols * (rows - 1), (rows - 1) + rows * (cols - 1));
    return { cols, rows, pw, ph, bw, bh, split, bigLeft: score(split), gridCuts, count: cols * rows };
  }

  function bestForRect(f, part, remaining, gap, allowRot) {
    let best = null;
    const orients = [[part.w, part.h, false]];
    if (allowRot && part.rotate !== false && Math.abs(part.w - part.h) > EPS) orients.push([part.h, part.w, true]);
    for (const [pw, ph, rot] of orients) {
      const mc = fitN(f.w, pw, gap), mr = fitN(f.h, ph, gap);
      if (!mc || !mr) continue;
      // full-size candidates plus those limited by remaining qty
      const tries = new Set();
      for (let c = 1; c <= mc; c++) for (let r = 1; r <= mr; r++) if (c * r <= remaining) tries.add(c + ',' + r);
      for (const k of tries) {
        const [c, r] = k.split(',').map(Number);
        const g = evalGrid(f, pw, ph, c, r, gap);
        g.rot = rot;
        const cand = g;
        if (!best || cand.count > best.count ||
          (cand.count === best.count && (cand.bigLeft > best.bigLeft + EPS ||
            (Math.abs(cand.bigLeft - best.bigLeft) <= EPS && cand.gridCuts < best.gridCuts)))) best = cand;
      }
    }
    return best;
  }

  /**
   * opts: { rms:[{name,w,h,qty}], parts:[{name,w,h,qty,rotate}], gap, allowRotate, minReuse }
   */
  function nest(opts) {
    const gap = opts.gap || 0, allowRot = opts.allowRotate !== false, minReuse = opts.minReuse == null ? 1 : opts.minReuse;
    const sheets = [];
    (opts.rms || []).forEach(r => {
      const q = Math.max(1, r.qty || 1);
      for (let i = 0; i < q; i++) sheets.push({ name: q > 1 ? r.name + '-' + (i + 1) : r.name, w: r.w, h: r.h, blocks: [], cuts: [], free: [{ x: 0, y: 0, w: r.w, h: r.h }] });
    });
    const parts = (opts.parts || []).map((p, i) => Object.assign({ id: i, remaining: p.qty, placed: 0 }, p));
    let guard = 0;
    while (parts.some(p => p.remaining > 0) && guard++ < 5000) {
      let pick = null;
      // candidates: all free rects over all sheets, smallest area first
      const rects = [];
      sheets.forEach((s, si) => s.free.forEach((f, fi) => rects.push({ s, si, f, fi })));
      rects.sort((a, b) => area(a.f) - area(b.f));
      for (const R of rects) {
        let bestHere = null;
        for (const p of parts) {
          if (p.remaining <= 0) continue;
          const g = bestForRect(R.f, p, p.remaining, gap, allowRot);
          if (!g) continue;
          g.part = p;
          if (!bestHere || g.count > bestHere.count || (g.count === bestHere.count && g.bigLeft > bestHere.bigLeft)) bestHere = g;
        }
        if (bestHere) { pick = Object.assign({ R }, bestHere); break; }
      }
      if (!pick) break;
      const { R, part, cols, rows, pw, ph, bw, bh, split } = pick;
      const s = R.s, f = R.f;
      s.free.splice(R.fi, 1);
      const cells = [];
      for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) cells.push({ x: f.x + c * (pw + gap), y: f.y + r * (ph + gap), w: pw, h: ph });
      s.blocks.push({ part: part.name, pid: part.id, rot: pick.rot, cols, rows, x: f.x, y: f.y, w: bw, h: bh, cells });
      part.remaining -= cols * rows; part.placed += cols * rows;
      // structural cuts (parent before child by construction order)
      const ctx = { rm: s.name };
      const cuts = s.cuts;
      const fullW = Math.abs(f.w - bw) <= EPS, fullH = Math.abs(f.h - bh) <= EPS;
      const V = (x, y0, y1, why) => cuts.push({ rm: s.name, dir: 'V', pos: x, from: y0, to: y1, why });
      const H = (y, x0, x1, why) => cuts.push({ rm: s.name, dir: 'H', pos: y, from: x0, to: x1, why });
      if (split.first === 'V') {
        if (!fullW) V(f.x + bw + (split.right ? 0 : 0), f.y, f.y + f.h, 'separate ' + part.name + ' block');
        if (!fullH) H(f.y + bh, f.x, f.x + bw, 'trim ' + part.name + ' block');
      } else {
        if (!fullH) H(f.y + bh, f.x, f.x + f.w, 'separate ' + part.name + ' block');
        if (!fullW) V(f.x + bw, f.y, f.y + bh, 'trim ' + part.name + ' block');
      }
      // grid cuts
      const vFirst = ((cols - 1) + cols * (rows - 1)) <= ((rows - 1) + rows * (cols - 1));
      if (vFirst) {
        for (let c = 1; c < cols; c++) V(f.x + c * pw + (c - 1) * gap, f.y, f.y + bh, 'split columns');
        for (let c = 0; c < cols; c++) for (let r = 1; r < rows; r++) H(f.y + r * ph + (r - 1) * gap, f.x + c * (pw + gap), f.x + c * (pw + gap) + pw, 'split rows');
      } else {
        for (let r = 1; r < rows; r++) H(f.y + r * ph + (r - 1) * gap, f.x, f.x + bw, 'split rows');
        for (let r = 0; r < rows; r++) for (let c = 1; c < cols; c++) V(f.x + c * pw + (c - 1) * gap, f.y + r * (ph + gap), f.y + r * (ph + gap) + ph, 'split columns');
      }
      if (split.right) s.free.push(split.right);
      if (split.top) s.free.push(split.top);
    }
    // summary
    let rmTotal = 0, partsArea = 0, reusable = 0, scrap = 0;
    sheets.forEach(s => {
      s.area = area(s);
      s.partsArea = s.blocks.reduce((a, b) => a + b.cells.length * b.cells[0].w * b.cells[0].h, 0);
      s.waste = s.area - s.partsArea;
      s.reusable = s.free.filter(r => Math.min(r.w, r.h) >= minReuse - EPS).reduce((a, r) => a + area(r), 0);
      s.scrap = s.waste - s.reusable;
      s.util = s.area ? s.partsArea / s.area * 100 : 0;
      // sequential numbering of cuts
      s.cuts.forEach((c, i) => c.n = i + 1);
      rmTotal += s.area; partsArea += s.partsArea; reusable += s.reusable; scrap += s.scrap;
    });
    const unplaced = parts.filter(p => p.remaining > 0).map(p => ({ name: p.name, qty: p.remaining }));
    return { sheets, parts: parts.map(p => ({ name: p.name, w: p.w, h: p.h, qty: p.qty, placed: p.placed })), unplaced,
      totals: { rm: rmTotal, parts: partsArea, waste: rmTotal - partsArea, reusable, scrap, util: rmTotal ? partsArea / rmTotal * 100 : 0,
        cuts: sheets.reduce((a, s) => a + s.cuts.length, 0) } };
  }
  return { nest };
});
