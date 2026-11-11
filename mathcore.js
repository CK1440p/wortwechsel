// Mathe: task generators, answer checking and progress. No DOM in here, so everything can run in the tests.
// Every task comes from (generator, stage, seed). Stage 1 is guided, stage 2 independent, stage 3 at test level.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WWMath = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // ---- Numbers ----
  function makeRng(seed) {
    let s = seed >>> 0;
    const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const int = (a, b) => a + Math.floor(next() * (b - a + 1));
    const pick = list => list[Math.floor(next() * list.length)];
    const shuffle = list => { const out = [...list]; for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; } return out; };
    return { next, int, pick, shuffle, chance: p => next() < p, sample: (list, n) => shuffle(list).slice(0, n), range: ([a, b], d = 0) => round(a + next() * (b - a), d) };
  }
  const round = (x, d = 3) => { const f = 10 ** d; return Math.round((x + Math.sign(x) * 1e-9) * f) / f; };
  const close = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
  function fmt(x, d = 3) {
    const v = round(x, d), neg = v < 0;
    let s = Math.abs(v).toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    let [a, b] = s.split('.');
    if (a.length > 4) a = a.replace(/\B(?=(\d{3})+$)/g, ' ');
    return (neg ? '−' : '') + a + (b ? `,${b}` : '');
  }
  const par = (x, d) => x < 0 ? `(${fmt(x, d)})` : fmt(x, d);
  const eq = (x, d) => close(round(x, d), x, 1e-7) ? '=' : '\\approx ';
  // Accepts 1,5 · 1.5 · -3 · −3 · 3/4 · "13,75 m/s". A dot before three digits can be a thousands separator, so both readings count.
  function parseNumber(raw) {
    const text = String(raw ?? '').trim().replace(/^(€|eur\b)\s*/i, '').replace(/[−–]/g, '-').replace(/(\d)[\s ]+(?=\d)/g, '$1');
    const m = text.match(/^([+-]?)(\d+(?:[.,]\d+)*|[.,]\d+)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?/);
    if (!m) return [];
    const sign = m[1] === '-' ? -1 : 1, den = m[3] ? Number(m[3].replace(',', '.')) : 1;
    if (!den) return [];
    const body = m[2], out = new Set();
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(body)) out.add(Number(body.replace(/\./g, '').replace(',', '.')));
    if (/^\d+\.\d{3}$/.test(body) || !/\./.test(body) || !body.includes(',')) out.add(Number(body.replace(',', '.')));
    if (/^\d+,\d+$/.test(body)) out.add(Number(body.replace(',', '.')));
    return [...out].filter(Number.isFinite).map(v => sign * v / den);
  }

  // ---- Typesetting: a small TeX subset is enough for fractions, limits and exponents, and needs no extra download ----
  const escHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const TEX_SYM = { Delta: 'Δ', alpha: 'α', pi: 'π', infty: '∞', pm: '±' };
  const TEX_REL = { to: '→', approx: '≈', le: '≤', ge: '≥', ne: '≠', in: '∈', Rightarrow: '⇒' };
  const TEX_FUNC = new Set(['sin', 'cos', 'tan', 'arctan', 'ln']);
  function texHtml(src) {
    let i = 0;
    const arg = () => { while (src[i] === ' ') i++; if (src[i] === '{') { i++; const out = seq('}'); i++; return out; } return atom(); };
    function seq(end) { let out = ''; while (i < src.length && src[i] !== end) out += atom(); return out; }
    function atom() {
      const c = src[i];
      if (c === ' ') { i++; return ''; }
      if (c === '\\') {
        let j = i + 1; while (j < src.length && /[a-zA-Z]/.test(src[j])) j++;
        if (j === i + 1) j = i + 2;
        const name = src.slice(i + 1, j); i = j;
        if (name === 'frac') { const a = arg(), b = arg(); return `<span class="mf"><span>${a}</span><span>${b}</span></span>`; }
        if (name === 'lim') { let sub = ''; if (src[i] === '_') { i++; sub = arg(); } return `<span class="ml"><span>lim</span><span class="ml-sub">${sub}</span></span>`; }
        if (name === 'sqrt') return `<span class="ms">√<span>${arg()}</span></span>`;
        if (name === 'bar') return `<span class="mb">${arg()}</span>`;
        if (name === 'text') { const end = src.indexOf('}', i), raw = src.slice(i + 1, end); i = end + 1; return `<span class="mt">${escHtml(raw)}</span>`; }
        if (name === 'cdot') return '\u2060<span class="mdot">·</span>\u2060'; // word joiners: a line may break at + or =, not inside a product
        if (name === ',') return '\u2009';
        if (TEX_FUNC.has(name)) return `<span class="mt">${name}</span>`;
        if (TEX_REL[name]) return `<span class="mo">${TEX_REL[name]}</span>`;
        return TEX_SYM[name] || escHtml(name);
      }
      if (c === '^') { i++; return `<sup>${arg()}</sup>`; }
      if (c === '_') { i++; return `<sub>${arg()}</sub>`; }
      if (c === '{') return arg();
      if (/[a-zA-Z]/.test(c)) { i++; return `<i>${c}</i>`; }
      if (/[0-9]/.test(c)) { let j = i + 1; while (/[0-9\u202F]/.test(src[j] || '') || (src[j] === ',' && /[0-9]/.test(src[j + 1] || ''))) j++; const out = src.slice(i, j); i = j; return out; }
      if (c === '-') { const prev = src.slice(0, i).trimEnd().at(-1); i++; return !prev || '=(,;{'.includes(prev) ? '−' : '<span class="mo">−</span>'; }
      if ('+=<>'.includes(c)) { i++; return `<span class="mo">${escHtml(c)}</span>`; }
      if (c === "'") { i++; return '′'; }
      i++; return escHtml(c);
    }
    return `<span class="m">${seq()}</span>`;
  }
  // Text with $formulas$ and **bold**.
  const rich = text => String(text ?? '').split('$').map((part, i) => i % 2 ? texHtml(part) : escHtml(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')).join('');

  // ---- Polynomials (coefficients ascending) ----
  const polyVal = (c, x) => c.reduceRight((sum, a) => sum * x + a, 0);
  const polyDer = c => c.slice(1).map((a, i) => a * (i + 1));
  const polyInt = (c, k = 0) => [k, ...c.map((a, i) => a / (i + 1))];
  const polyMul = (a, b) => { const out = Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { out[i + j] += x * y; })); return out; };
  const polyFromRoots = (roots, lead = 1) => roots.reduce((c, x) => polyMul(c, [-x, 1]), [lead]);
  function polyTerms(c, power, d) {
    let out = '';
    for (let i = c.length - 1; i >= 0; i--) {
      const a = c[i]; if (!a) continue;
      const abs = Math.abs(a), coef = abs === 1 && i > 0 ? '' : fmt(abs, d) + (i > 0 ? '\\cdot ' : '');
      out += (out ? (a < 0 ? ' - ' : ' + ') : (a < 0 ? '−' : '')) + coef + (i === 0 ? '' : power(i));
    }
    return out || '0';
  }
  const polyTex = (c, v = 'x', d = 7) => polyTerms(c, i => i === 1 ? v : `${v}^${i}`, d);
  const polySub = (c, x, d = 7) => { const X = par(x); return polyTerms(c, i => i === 1 ? X : `${X}^${i}`, d); };

  // ---- Curve analysis ----
  function signRoots(g, a, b, n = 720) {
    const out = []; let xp = a + (b - a) * 1e-5, yp = g(xp);
    for (let i = 1; i <= n; i++) {
      const x = a + (b - a) * (i - 0.37) / n, y = g(x);
      if (yp * y < 0) { let lo = xp, hi = x, ylo = yp; for (let j = 0; j < 48; j++) { const m = (lo + hi) / 2, ym = g(m); if (ylo * ym <= 0) hi = m; else { lo = m; ylo = ym; } } out.push((lo + hi) / 2); }
      xp = x; yp = y;
    }
    return out;
  }
  function localExtrema(g, a, b) {
    const h = (b - a) / 2000;
    return signRoots(x => g(x + h) - g(x - h), a + 3 * h, b - 3 * h).map(x => ({ x, type: g(x) > g(x + 40 * h) ? 'max' : 'min' }));
  }
  function minMax(g, a, b, n = 400) { let lo = Infinity, hi = -Infinity; for (let i = 0; i <= n; i++) { const y = g(a + (b - a) * i / n); if (y < lo) lo = y; if (y > hi) hi = y; } return [lo, hi]; }
  function niceStep(range, ticks = 5) { const raw = range / ticks, mag = 10 ** Math.floor(Math.log10(raw)), n = raw / mag; return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag; }
  function niceRange(lo, hi, ticks = 5) { const step = niceStep((hi - lo) || 1, ticks); return [round(Math.floor(lo / step) * step, 6), round(Math.ceil(hi / step) * step, 6), step]; }
  function hermite(knots) {
    const seg = x => { let i = 0; while (i < knots.length - 2 && x > knots[i + 1].x) i++; return i; };
    const parts = x => { const i = seg(x), p = knots[i], q = knots[i + 1], h = q.x - p.x, t = (x - p.x) / h; return { p, q, h, t, t2: t * t, t3: t * t * t }; };
    return {
      f: x => { const { p, q, h, t, t2, t3 } = parts(x); return (2 * t3 - 3 * t2 + 1) * p.y + (t3 - 2 * t2 + t) * h * p.m + (-2 * t3 + 3 * t2) * q.y + (t3 - t2) * h * q.m; },
      d: x => { const { p, q, h, t, t2 } = parts(x); return ((6 * t2 - 6 * t) * p.y + (3 * t2 - 4 * t + 1) * h * p.m + (-6 * t2 + 6 * t) * q.y + (3 * t2 - 2 * t) * h * q.m) / h; },
      knots,
    };
  }
  // Runs exactly through (x1|y1) and (x2|y2), so both points can be read off the grid.
  function waveCurve(x1, y1, x2, y2, A) {
    const k = (y2 - y1) / (x2 - x1), w = Math.PI / (x2 - x1);
    return { f: x => y1 + k * (x - x1) + A * Math.sin(w * (x - x1)), d: x => k + A * w * Math.cos(w * (x - x1)) };
  }
  const fitsIn = (fn, a, b, lo, hi) => { const [l, h] = minMax(fn, a, b); return l >= lo && h <= hi; };
  function repeat(make, limit = 400) { for (let i = 0; i < limit; i++) { const v = make(); if (v) return v; } throw new Error('Keine passenden Werte gefunden'); }

  // Curves for the derivative tasks. Extrema sit at chosen places and never on the x-axis, so height and slope cannot be mixed up by accident.
  function shape(r, kind) {
    let c, dc, domain, touch = [], f, d;
    if (['line', 'parabola', 'cubic', 'quartic', 'saddle'].includes(kind)) {
      if (kind === 'line') { const k = r.pick([-2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2]); dc = [k]; domain = [-3, 3]; }
      if (kind === 'parabola') { const h = r.int(-2, 2); dc = polyFromRoots([h], r.pick([1, -1])); domain = [h - 3, h + 3]; }
      if (kind === 'cubic') { const a = r.int(-3, -1), b = a + r.pick([2, 3, 4]); dc = polyFromRoots([a, b], r.pick([1, -1])); domain = [a - 1.5, b + 1.5]; }
      if (kind === 'quartic') { const a = r.int(-4, -3), b = a + r.pick([2, 3]), e = b + r.pick([2, 3]); dc = polyFromRoots([a, b, e], r.pick([1, -1])); domain = [a - 1, e + 1]; }
      if (kind === 'saddle') { const a = r.int(-2, 0), b = a + r.pick([3, -3]); dc = polyFromRoots([a, a, b], r.pick([1, -1])); touch = [a]; domain = [Math.min(a, b) - 1.5, Math.max(a, b) + 1.5]; }
      c = polyInt(dc, 0);
      const [lo0, hi0] = minMax(x => polyVal(c, x), domain[0], domain[1]);
      const scale = kind === 'line' ? 1 : 5 / (hi0 - lo0);
      c = c.map(a => a * scale); dc = polyDer(c);
      const [lo] = minMax(x => polyVal(c, x), domain[0], domain[1]);
      c[0] = kind === 'line' ? r.int(-1, 2) : r.pick([0.5, 1, 1.5, -1, -2]) - lo;
      const cc = c, dd = dc;
      f = x => polyVal(cc, x); d = x => polyVal(dd, x);
    }
    if (kind === 'sine') { const A = r.pick([1.5, 2, 2.5]), w = r.pick([1, 1.5]), s = r.int(-1, 2); f = x => A * Math.sin(w * x) + s; d = x => A * w * Math.cos(w * x); domain = [-4, 4]; }
    if (kind === 'sigmoid') { const L = r.pick([4, 5, 6]), m = r.int(-1, 1), s = r.pick([1.2, 1.6, 2]), b = r.int(0, 1); f = x => b + L / (1 + Math.exp(-s * (x - m))); d = x => L * s * Math.exp(-s * (x - m)) / (1 + Math.exp(-s * (x - m))) ** 2; domain = [-4, 4]; }
    if (kind === 'bump') { const A = r.pick([3, 4, 5]), m = r.int(-1, 1), s = r.pick([1, 1.3]), b = r.int(0, 1); f = x => b + A * Math.exp(-((x - m) ** 2) / (2 * s * s)); d = x => -A * (x - m) / (s * s) * Math.exp(-((x - m) ** 2) / (2 * s * s)); domain = [-4, 4]; }
    const [a, b] = domain, [yLo, yHi] = minMax(f, a, b), M = Math.max(...minMax(d, a, b).map(Math.abs)) || 1;
    const margin = (b - a) * 0.07, peaks = localExtrema(d, a, b).filter(p => p.x > a + margin && p.x < b - margin);
    const yRange = niceRange(yLo - (yHi - yLo) * 0.08 || yLo - 1, yHi + (yHi - yLo) * 0.08 || yHi + 1);
    return { kind, f, d, c, dc, domain, roots: signRoots(d, a, b), touch, peaks, yRange, dRange: niceRange(-M * 1.12, M * 1.12) };
  }
  function knotShape(r) {
    return repeat(() => {
      const xs = [r.int(1, 2)]; while (xs.at(-1) < 6) xs.push(xs.at(-1) + r.int(2, 3));
      if (xs.at(-1) > 7) xs.pop();
      if (xs.length < 2) return null;
      const high = r.chance(0.5);
      const ext = xs.map((x, i) => ({ x, y: (i % 2 === 0) === high ? r.int(4, 6) : r.int(1, 2), m: 0 }));
      const first = ext[0], last = ext.at(-1);
      const startY = first.y > 3 ? first.y - r.int(1, 3) : first.y + r.int(2, 3), endY = last.y > 3 ? last.y - r.int(1, 2) : last.y + r.int(2, 3);
      const knots = [{ x: 0, y: startY, m: 1.3 * (first.y - startY) / first.x }, ...ext, { x: 8, y: endY, m: 1.3 * (endY - last.y) / (8 - last.x) }];
      const curve = hermite(knots);
      return fitsIn(curve.f, 0, 8, 0, 7) ? { ...curve, ext, domain: [0, 8] } : null;
    });
  }
  const spec = (x, y, o = {}) => ({ x, y, xLabel: 'x', yLabel: 'f(x)', curves: [], segs: [], dots: [], tris: [], vlines: [], bands: [], ...o });
  const plotF = (s, o = {}) => spec([s.domain[0], s.domain[1], 1], s.yRange, { curves: [{ fn: s.f, tone: 'f', name: 'f' }], ...o });
  const plotD = (s, o = {}) => spec([s.domain[0], s.domain[1], 1], s.dRange, { yLabel: 'f′(x)', curves: [{ fn: s.d, tone: 'fp', name: 'f′' }], ...o });

  // ---- Answer building blocks ----
  function field(key, label, value, o = {}) {
    const d = o.d ?? 2, tol = o.tol ?? Math.max(0.505 * 10 ** -d, Math.abs(value) * 0.003);
    const traps = (o.traps || []).filter(t => Number.isFinite(t.value) && Math.abs(t.value - value) > tol * 1.5 + 1e-9);
    return { type: 'num', key, label, value, d, tol, unit: o.unit || '', traps };
  }
  const select = (r, key, label, right, wrong) => { const options = r.shuffle([right, ...wrong]); return { type: 'sel', key, label, options, correct: options.indexOf(right) }; };
  const fields = (...list) => ({ type: 'fields', fields: list.flat().filter(Boolean) });
  const norm = o => typeof o === 'string' ? { text: o } : o;
  function mc(r, right, wrong) { const options = r.shuffle([{ ...norm(right), ok: true }, ...wrong.map(w => ({ ...norm(w), ok: false }))]); return { type: 'choice', options, correct: options.findIndex(o => o.ok) }; }
  const unique = list => [...new Map(list.map(x => [typeof x === 'string' ? x : x.text, x])).values()];
  const TRAP = {
    abs: 'Das ist die **absolute Änderung**. Für die mittlere Änderungsrate fehlt noch die Division durch die Intervallbreite.',
    sign: 'Das Vorzeichen stimmt nicht. Rechne oben und unten in derselben Reihenfolge: rechter Rand minus linker Rand.',
    flip: 'Der Bruch steht auf dem Kopf. Oben steht die Änderung der Funktionswerte, unten die Änderung der $x$-Werte.',
    sum: 'Im Zähler steht eine **Differenz**, keine Summe.',
    height: 'Das ist die **Höhe** des Graphen an dieser Stelle. Gefragt ist die **Steigung**.',
    rad: 'Das ist das Ergebnis im **Bogenmaß**. Stell den Taschenrechner auf Grad (DEG).',
    tan: 'Verwechselt: Von der Steigung zum Winkel kommst du mit $\\arctan$, vom Winkel zur Steigung mit $\\tan$.',
    lost: 'Der Betrag passt, aber das Vorzeichen fehlt. Eine fallende Gerade hat ein negatives $k$ und ein negatives $\\alpha$.',
    percent: 'Prozent zuerst umrechnen: $p\\,\\%$ Steigung bedeutet $k=\\frac{p}{100}$.',
    kmh: 'Das ist noch in **m/s**. Für km/h multiplizierst du mit 3,6.',
    div36: 'Falsche Richtung beim Umrechnen. Von m/s nach km/h wird mit 3,6 **multipliziert**, von km/h nach m/s dividiert.',
    perMin: 'Das ist die Geschwindigkeit in **km pro Minute**. Eine Stunde hat 60 Minuten, also noch mit 60 multiplizieren.',
    units: 'Achtung auf die Einheiten: Höhe und waagrechte Strecke müssen in derselben Einheit stehen.',
    base: 'Die relative Änderung bezieht sich auf den **Startwert**, also durch den Wert am Anfang dividieren.',
  };
  const dqTraps = (ya, yb, dx) => [{ value: yb - ya, msg: TRAP.abs }, { value: -(yb - ya) / dx, msg: TRAP.sign }, { value: dx / (yb - ya), msg: TRAP.flip }, { value: (yb + ya) / dx, msg: TRAP.sum }];
  function dqTex(F, a, b, ya, yb, d = 3, D = d) {
    const dy = yb - ya, dx = b - a, v = dy / dx;
    return `\\frac{${F}(${fmt(b)})-${F}(${fmt(a)})}{${fmt(b)}-${par(a)}}=\\frac{${fmt(yb, d)}-${par(ya, d)}}{${fmt(dx)}}=\\frac{${fmt(dy, d)}}{${fmt(dx)}}${eq(v, D)}${fmt(v, D)}`;
  }
  const FORMULA = '$\\frac{f(z)-f(x)}{z-x}$';

  // ---- Generators ----
  const GENS = [];
  const gen = (id, topic, label, min, max, rank, make) => GENS.push({ id, topic, label, min, max, rank, make });

  // Differenzenquotient
  gen('mr-quad', 'mittlere', 'Aus dem Term', 1, 3, 1, (r, st) => {
    const c = [r.int(-5, 8), r.int(-5, 5), r.pick([1, 2, -1, 0.5, -0.5, -2, 3])];
    const a = r.int(-3, 3), dx = r.pick([2, 3, 4, 5]), b = a + dx, ya = polyVal(c, a), yb = polyVal(c, b), v = (yb - ya) / dx;
    return {
      kicker: 'Term', lead: `Gegeben ist $f(x)=${polyTex(c)}$.`, ask: `Berechne die mittlere Änderungsrate von $f$ im Intervall $[${fmt(a)};${fmt(b)}]$.`,
      answer: fields(st === 1 && field('ya', `$f(${fmt(a)})=$`, ya), st === 1 && field('yb', `$f(${fmt(b)})=$`, yb), field('v', 'Mittlere Änderungsrate', v, { traps: dqTraps(ya, yb, dx) })),
      hints: [`Formel: ${FORMULA} mit $x=${fmt(a)}$ und $z=${fmt(b)}$.`, `Rechne zuerst die beiden Funktionswerte aus. Der erste ist $f(${fmt(a)})=${fmt(ya)}$.`, `$f(${fmt(b)})=${fmt(yb)}$. Jetzt nur noch in den Bruch einsetzen.`],
      solution: [`$f(${fmt(a)})=${polySub(c, a)}=${fmt(ya)}$`, `$f(${fmt(b)})=${polySub(c, b)}=${fmt(yb)}$`, `$${dqTex('f', a, b, ya, yb)}$`],
      takeaway: 'Zuerst die zwei Funktionswerte, dann Differenz durch Intervallbreite.',
    };
  });
  gen('mr-other', 'mittlere', 'Bruch, Wurzel, Potenz', 2, 3, 3, (r) => {
    const kind = r.pick(['recip', 'power', 'sqrt', 'cubic']);
    let f, tex, a, b, sub;
    if (kind === 'recip') { const n = r.pick([1, 2, 3, 4, 6, 12]); [a, b] = r.pick([[1, 2], [1, 3], [2, 4], [1, 4], [-3, -1], [-4, -2], [2, 6], [3, 6]]); f = x => n / x; tex = `\\frac{${n}}{x}`; sub = x => `\\frac{${n}}{${par(x)}}`; }
    if (kind === 'power') { const n = r.pick([1, 2, 3, 5]), base = r.pick([2, 3, 1.5, 0.5]); a = r.int(0, 2); b = a + r.pick([1, 2, 3]); f = x => n * base ** x; tex = `${n === 1 ? '' : `${n}\\cdot `}${fmt(base)}^x`; sub = x => `${n === 1 ? '' : `${n}\\cdot `}${fmt(base)}^${x}`; }
    if (kind === 'sqrt') { const n = r.pick([1, 2, 3]); [a, b] = r.pick([[1, 4], [4, 9], [1, 9], [9, 16], [4, 16], [16, 25], [1, 16]]); f = x => n * Math.sqrt(x); tex = `${n === 1 ? '' : `${n}\\cdot `}\\sqrt{x}`; sub = x => `${n === 1 ? '' : `${n}\\cdot `}\\sqrt{${x}}`; }
    if (kind === 'cubic') { const c = [r.int(-3, 3), r.int(-2, 2), 0, r.pick([1, -1, 0.5])]; a = r.int(-2, 1); b = a + r.pick([1, 2, 3]); f = x => polyVal(c, x); tex = polyTex(c); sub = x => polySub(c, x); }
    const ya = f(a), yb = f(b), v = (yb - ya) / (b - a);
    return {
      kicker: 'Term', lead: `Gegeben ist $f(x)=${tex}$.`, ask: `Berechne die mittlere Änderungsrate von $f$ im Intervall $[${fmt(a)};${fmt(b)}]$. Runde auf zwei Dezimalstellen.`,
      answer: fields(field('v', 'Mittlere Änderungsrate', v, { traps: dqTraps(ya, yb, b - a) })),
      hints: [`Formel: ${FORMULA} mit $x=${fmt(a)}$ und $z=${fmt(b)}$.`, `$f(${fmt(a)})${eq(ya, 3)}${fmt(ya)}$ und $f(${fmt(b)})${eq(yb, 3)}${fmt(yb)}$.`],
      solution: [`$f(${fmt(a)})=${sub(a)}${eq(ya, 3)}${fmt(ya)}$`, `$f(${fmt(b)})=${sub(b)}${eq(yb, 3)}${fmt(yb)}$`, `$${dqTex('f', a, b, ya, yb, 3, 2)}$`],
    };
  });
  const TABLES = [
    { xh: 'Jahr', yh: 'Einwohner in Tausend', xs: [2012, 2015, 2018, 2021, 2024], y0: [36, 90], step: [0.2, 0.9], rd: 1, dir: 1, yu: 'Tausend Einwohner', xu: 'Jahr', xw: 'Jahr', noun: 'Einwohnerzahl' },
    { xh: 'Zeit in min', yh: 'Temperatur in °C', xs: [0, 4, 8, 12, 16], y0: [78, 96], step: [1, 4], rd: 0, dir: -1, yu: '°C', xu: 'min', xw: 'Minute', noun: 'Temperatur des Tees' },
    { xh: 'Alter in Tagen', yh: 'Höhe in cm', xs: [10, 20, 30, 40, 50], y0: [3, 12], step: [0.2, 0.7], rd: 1, dir: 1, yu: 'cm', xu: 'Tag', xw: 'Tag', noun: 'Höhe der Pflanze' },
    { xh: 'Strecke in km', yh: 'Tankinhalt in L', xs: [0, 50, 100, 150, 200], y0: [38, 52], step: [0.04, 0.09], rd: 1, dir: -1, yu: 'L', xu: 'km', xw: 'Kilometer', noun: 'Tankinhalt' },
    { xh: 'Monat', yh: 'Follower', xs: [1, 3, 6, 9, 12], y0: [400, 900], step: [20, 90], rd: 0, dir: 1, yu: 'Follower', xu: 'Monat', xw: 'Monat', noun: 'Zahl der Follower' },
    { xh: 'Seehöhe in m', yh: 'Luftdruck in hPa', xs: [0, 500, 1000, 1500, 2000], y0: [1010, 1016], step: [0.09, 0.12], rd: 0, dir: -1, yu: 'hPa', xu: 'm', xw: 'Meter', noun: 'Luftdruck' },
  ];
  gen('mr-table', 'mittlere', 'Aus der Tabelle', 1, 3, 2, (r, st) => {
    const t = r.pick(TABLES), y = [r.range(t.y0, t.rd)];
    for (let i = 1; i < t.xs.length; i++) y.push(round(y[i - 1] + t.dir * r.range(t.step, 3) * (t.xs[i] - t.xs[i - 1]), t.rd));
    const i = st === 1 ? r.int(0, 3) : r.int(0, 2), j = st === 1 ? i + 1 : r.int(i + 2, 4), dx = t.xs[j] - t.xs[i], dy = y[j] - y[i], v = dy / dx;
    const unit = `${t.yu} pro ${t.xw}`;
    return {
      kicker: 'Tabelle', table: { rows: [[t.xh, ...t.xs.map(x => fmt(x))], [t.yh, ...y.map(v2 => fmt(v2))]] },
      ask: `Berechne die mittlere Änderung der Größe „${t.noun}“ pro ${t.xw} zwischen ${fmt(t.xs[i])} und ${fmt(t.xs[j])}. Runde auf drei Dezimalstellen.`,
      answer: fields(st === 1 && field('dy', 'Änderung der Größe', dy, { d: 3, traps: [{ value: -dy, msg: TRAP.sign }] }), st === 1 && field('dx', `Änderung von „${t.xh}“`, dx, { d: 3 }), field('v', 'Mittlere Änderung', v, { d: 3, traps: dqTraps(y[i], y[j], dx) }), st > 1 && select(r, 'unit', 'Einheit', unit, [`${t.xw} pro ${t.yu}`, t.yu, `${t.yu} mal ${t.xw}`])),
      hints: [`Rechne „Änderung der Größe durch Änderung von ${t.xh}“.`, `Oben: $${fmt(y[j])}-${par(y[i])}=${fmt(dy)}$.`, `Unten: $${fmt(t.xs[j])}-${fmt(t.xs[i])}=${fmt(dx)}$.`],
      solution: [`$\\frac{${fmt(y[j])}-${par(y[i])}}{${fmt(t.xs[j])}-${fmt(t.xs[i])}}=\\frac{${fmt(dy)}}{${fmt(dx)}}${eq(v, 3)}${fmt(v)}$`, `Im Mittel ändert sich die Größe also um ${fmt(v)} ${unit}.`],
    };
  });
  gen('mr-compare', 'mittlere', 'Zeiträume vergleichen', 2, 3, 4, (r) => {
    const ctx = r.pick([{ what: 'Ein Sportverein zählt seine Mitglieder.', y: 'Mitglieder', base: [120, 300], k: 1 }, { what: 'Ein Café notiert seinen Jahresumsatz in Tausend Euro.', y: 'Umsatz in Tausend €', base: [80, 200], k: 1 }, { what: 'Ein Bergdorf zählt die Übernachtungen in Tausend.', y: 'Übernachtungen in Tausend', base: [30, 70], k: 0.5 }]);
    const mode = r.pick(['trap', 'trap', 'trap', 'equal', 'plain']), year = r.int(2008, 2014), base = r.int(...ctx.base);
    const d1 = r.pick([2, 3, 4, 6]), d2 = r.pick([2, 3, 4, 6].filter(x => x !== d1));
    let r1, r2;
    if (mode === 'equal') { r1 = r.int(3, 9); r2 = r1; }
    if (mode === 'trap') repeat(() => { r1 = r.int(2, 12); r2 = r.int(2, 12); return r1 !== r2 && (r1 > r2) !== (r1 * d1 > r2 * d2); });
    if (mode === 'plain') repeat(() => { r1 = r.int(2, 12); r2 = r.int(2, 12); return r1 !== r2 && (r1 > r2) === (r1 * d1 > r2 * d2); });
    const k = ctx.k, y = [base, base + r1 * d1 * k, base + r1 * d1 * k + r2 * d2 * k], yrs = [year, year + d1, year + d1 + d2];
    const A = `${yrs[0]} bis ${yrs[1]}`, B = `${yrs[1]} bis ${yrs[2]}`, equalText = 'In beiden Zeiträumen gleich schnell', right = r1 === r2 ? equalText : r1 > r2 ? `Von ${A}` : `Von ${B}`;
    return {
      kicker: 'Tabelle', lead: ctx.what, table: { rows: [['Jahr', ...yrs.map(String)], [ctx.y, ...y.map(v => fmt(v))]] }, ask: 'In welchem Zeitraum ist der Wert **im Mittel pro Jahr** schneller gewachsen?',
      answer: mc(r, right, [`Von ${A}`, `Von ${B}`, equalText].filter(x => x !== right)),
      hints: ['Vergleiche nicht die Zuwächse, sondern die Zuwächse **pro Jahr**.', `Von ${A} sind es ${d1} Jahre, von ${B} sind es ${d2} Jahre.`],
      solution: [`Von ${A}: $\\frac{${fmt(y[1])}-${fmt(y[0])}}{${d1}}=${fmt(r1 * k)}$ pro Jahr`, `Von ${B}: $\\frac{${fmt(y[2])}-${fmt(y[1])}}{${d2}}=${fmt(r2 * k)}$ pro Jahr`],
      takeaway: 'Ein größerer Zuwachs bedeutet nicht schnelleres Wachstum, wenn der Zeitraum länger ist.',
    };
  });
  gen('mr-graph', 'mittlere', 'Am Graphen ablesen', 1, 3, 2, (r, st) => {
    const g = repeat(() => {
      const a = r.int(1, 4), dx = r.pick([2, 3, 4]), b = a + dx, ya = r.int(1, 6), yb = r.int(1, 7), A = r.pick([-1.2, -0.8, 0.8, 1.2]);
      if (ya === yb || !close(((yb - ya) / dx * 100) % 1, 0, 1e-6)) return null;
      const c = waveCurve(a, ya, b, yb, A);
      return fitsIn(c.f, 0, 8, -0.4, 8) ? { a, b, ya, yb, dx, c } : null;
    });
    const { a, b, ya, yb, dx, c } = g, dy = yb - ya, v = dy / dx;
    const plot = spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn: c.f, tone: 'f', name: 'f' }] });
    if (st < 3) plot.dots.push({ x: a, y: ya, tone: 'sec', label: 'A' }, { x: b, y: yb, tone: 'sec', label: 'B' });
    if (st === 1) { plot.segs.push({ a: [a, ya], b: [b, yb], tone: 'sec', ext: 1 }); plot.tris.push({ x: a, y: ya, dx, dy, tone: 'sec' }); }
    return {
      kicker: 'Graph', plots: [plot], ask: `Bestimme aus dem Graphen die mittlere Änderungsrate von $f$ im Intervall $[${a};${b}]$.`,
      answer: fields(st === 1 && field('dy', '$\\Delta f=$', dy, { traps: [{ value: dx, msg: 'Das ist die waagrechte Seite. $\\Delta f$ ist die **senkrechte** Seite.' }] }), st === 1 && field('dx', '$\\Delta x=$', dx), field('v', 'Mittlere Änderungsrate', v, { tol: st === 3 ? 0.13 : undefined, traps: [{ value: dy, msg: TRAP.abs }, { value: -v, msg: TRAP.sign }, { value: dx / dy, msg: TRAP.flip }] })),
      hints: [`Lies die beiden Funktionswerte ab: $f(${a})$ und $f(${b})$.`, `$f(${a})=${ya}$ und $f(${b})=${yb}$.`],
      solution: [`Abgelesen: $f(${a})=${ya}$ und $f(${b})=${yb}$`, `$${dqTex('f', a, b, ya, yb)}$`, 'Das ist die Steigung der Sekante durch die beiden Punkte.'],
      showPlot: { segs: [{ a: [a, ya], b: [b, yb], tone: 'sec', ext: 1 }], dots: [{ x: a, y: ya, tone: 'sec' }, { x: b, y: yb, tone: 'sec' }] },
    };
  });
  const MEASURES = {
    abs: ['Die Zahl der Übernachtungen in einem Ort stieg von 2019 bis 2024 um 12 400.', 'Ein Gletscher ist in den letzten 10 Jahren um 230 m kürzer geworden.', 'Der Preis einer Monatskarte wurde innerhalb von zwei Jahren um € 6 erhöht.', 'Der Pegelstand ist seit gestern um 34 cm gefallen.'],
    mean: ['Das Wasser im Pool wurde von 8 bis 12 Uhr im Mittel um 0,5 °C pro Stunde wärmer.', 'Von Jänner bis Juni wuchs der Kanal durchschnittlich um 300 Abonnenten pro Monat.', 'Auf der 45 km langen Strecke verbrauchte das Auto durchschnittlich 0,06 L pro Kilometer.', 'Der Luftdruck fiel zwischen 14 und 18 Uhr im Schnitt um 1,5 hPa pro Stunde.'],
    moment: ['Beim Überqueren der Ziellinie hatte die Läuferin eine Geschwindigkeit von 9,4 m/s.', 'Um genau 15:00 Uhr floss das Wasser mit 420 L/s durch die Schleuse.', 'Im Moment des Abhebens stieg die Höhe des Flugzeugs um 12 m pro Sekunde.', 'Exakt um 12 Uhr nahm die Zahl der Gäste mit 25 Personen pro Minute zu.'],
    rel: ['Die Mieten sind innerhalb von drei Jahren um 15 % gestiegen.', 'Die Zahl der Bienenvölker ging in einem Jahr um 8 % zurück.', 'Der Stromverbrauch der Schule sank gegenüber dem Vorjahr um 6 %.', 'Der Umsatz ist in zwei Jahren um ein Viertel gewachsen.'],
  };
  gen('mr-measure', 'mittlere', 'Welches Änderungsmaß?', 1, 2, 1, (r, st) => {
    const key = r.pick(['abs', 'mean', 'moment', 'rel']);
    const names = { abs: 'absolute Änderung', mean: 'mittlere Änderungsrate', moment: 'momentane Änderungsrate', rel: 'relative Änderung' };
    const forms = { abs: '$f(z)-f(x)$', mean: '$\\frac{f(z)-f(x)}{z-x}$', moment: '$\\lim_{z\\to x}\\frac{f(z)-f(x)}{z-x}$', rel: '$\\frac{f(z)-f(x)}{f(x)}$' };
    const text = st === 1 ? names : forms, others = Object.keys(names).filter(k => k !== key);
    return {
      kicker: 'Begriff', lead: `„${r.pick(MEASURES[key])}“`, ask: st === 1 ? 'Welches Änderungsmaß steckt in dieser Aussage?' : 'Welche Formel passt zu dieser Aussage?',
      answer: mc(r, text[key], others.map(k => text[k])),
      hints: ['Geht es um eine Stelle oder um ein Intervall?', 'Wird etwas „pro Einheit“ angegeben oder nur der Gesamtunterschied? Bei % ist es der Vergleich mit dem Startwert.'],
      solution: [`Das ist die **${names[key]}**: ${forms[key]}`],
    };
  });
  gen('mr-absrel', 'mittlere', 'Absolut, mittlere, relativ', 1, 2, 2, (r, st) => {
    const ctx = r.pick([{ what: 'E-Bike', it: 'es', y: [1800, 3600] }, { what: 'Moped', it: 'es', y: [2200, 4200] }, { what: 'Gebrauchtwagen', it: 'er', y: [14000, 26000] }, { what: 'Laptop', it: 'er', y: [900, 1600] }]);
    const V0 = Math.round(r.int(...ctx.y) / 100) * 100, n = r.pick([2, 3, 4, 5]), d = Math.round(V0 * r.range([0.06, 0.16], 3) / 50) * 50, V1 = V0 - n * d, rel = (V1 - V0) / V0 * 100;
    return {
      kicker: 'Sachaufgabe', lead: `Ein ${ctx.what} kostet neu € ${fmt(V0)}. Nach ${n} Jahren ist ${ctx.it} nur noch € ${fmt(V1)} wert.`, ask: st === 1 ? 'Berechne die absolute Wertänderung und die mittlere jährliche Wertänderung.' : 'Berechne die absolute Wertänderung, die mittlere jährliche Wertänderung und die relative Wertänderung in Prozent.',
      answer: fields(field('abs', 'Absolute Änderung', V1 - V0, { unit: '€', traps: [{ value: V0 - V1, msg: TRAP.lost }] }), field('mean', 'Mittlere Änderung', (V1 - V0) / n, { unit: '€ pro Jahr', traps: [{ value: V1 - V0, msg: TRAP.abs }, { value: (V0 - V1) / n, msg: TRAP.lost }] }), st > 1 && field('rel', 'Relative Änderung', rel, { d: 1, unit: '%', traps: [{ value: (V1 - V0) / V1 * 100, msg: TRAP.base }, { value: -rel, msg: TRAP.lost }, { value: rel / 100, msg: 'Das ist die Dezimalzahl. In Prozent noch mit 100 multiplizieren.' }] })),
      hints: ['Absolut heißt: Endwert minus Startwert. Der Wert sinkt, also wird es negativ.', 'Mittlere Änderung: die absolute Änderung durch die Zahl der Jahre.', 'Relative Änderung: die absolute Änderung durch den Startwert.'],
      solution: [`Absolut: $${fmt(V1)}-${fmt(V0)}=${fmt(V1 - V0)}$ €`, `Mittlere Änderung: $\\frac{${fmt(V1 - V0)}}{${n}}=${fmt((V1 - V0) / n)}$ € pro Jahr`, ...(st > 1 ? [`Relativ: $\\frac{${fmt(V1 - V0)}}{${fmt(V0)}}${eq(rel / 100, 3)}${fmt(rel / 100, 3)}$, also $${fmt(rel, 1)}\\,\\%$`] : [])],
    };
  });
  gen('mr-formula', 'mittlere', 'Formel aufstellen', 2, 3, 3, (r) => {
    const [F, v, name] = r.pick([['W', 't', 'Wert eines Autos nach $t$ Jahren'], ['N', 't', 'Einwohnerzahl nach $t$ Jahren'], ['H', 't', 'Höhe eines Baumes nach $t$ Jahren'], ['K', 'x', 'Gesamtkosten bei $x$ Stück']]);
    const a = `${v}_1`, b = `${v}_2`, Fa = `${F}(${a})`, Fb = `${F}(${b})`, kind = r.pick(['mean', 'rel', 'abs']);
    const forms = { mean: `$\\frac{${Fb}-${Fa}}{${b}-${a}}$`, rel: `$\\frac{${Fb}-${Fa}}{${Fa}}$`, abs: `$${Fb}-${Fa}$` };
    const extra = [`$\\frac{${b}-${a}}{${Fb}-${Fa}}$`, `$\\frac{${Fb}+${Fa}}{${b}-${a}}$`];
    const words = { mean: 'die mittlere Änderung pro Einheit', rel: 'die relative Änderung', abs: 'die absolute Änderung' };
    return {
      kicker: 'Formel', lead: `$${F}(${v})$ ist der ${name}.`, ask: `Welche Formel beschreibt ${words[kind]} im Intervall $[${a};${b}]$?`,
      answer: mc(r, forms[kind], [...Object.keys(forms).filter(k => k !== kind).map(k => forms[k]), r.pick(extra)]),
      hints: ['Absolut: nur die Differenz. Mittlere: Differenz durch Intervallbreite. Relativ: Differenz durch Startwert.'],
      solution: [`${words[kind][0].toUpperCase()}${words[kind].slice(1)}: ${forms[kind]}`],
    };
  });
  const DQ_TRUE = [
    ['Dann ist $f(b)>f(a)$.', true, 'Der Zähler $f(b)-f(a)$ muss positiv sein.'],
    ['Dann steigt $f$ an jeder Stelle des Intervalls.', false, 'Zwischendurch darf $f$ fallen. Nur das Ende muss höher liegen als der Anfang.'],
    ['Dann kann $f$ im Intervall teilweise fallen.', true, 'Der Differenzenquotient schaut nur auf die beiden Randpunkte.'],
    ['Dann ist $f$ sicher eine lineare Funktion.', false, 'Das sagt nichts über den Funktionstyp aus.'],
    ['Dann steigt die Sekante durch die beiden Randpunkte.', true, 'Der Differenzenquotient ist die Steigung dieser Sekante.'],
    ['Dann ist $f(a)$ positiv.', false, 'Es geht nur um die Änderung. Beide Funktionswerte können negativ sein.'],
  ];
  gen('mr-true', 'mittlere', 'Richtig oder falsch', 1, 3, 3, (r) => ({
    kicker: 'Verständnis', lead: 'Der Differenzenquotient von $f$ im Intervall $[a;b]$ ist positiv.', ask: 'Welche Aussagen stimmen?',
    answer: { type: 'tf', items: r.sample(DQ_TRUE, 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['Überlege dir eine Skizze: einen Graphen, der zwischendurch fällt, am Ende aber höher ist als am Anfang.'],
    solution: ['Der Differenzenquotient vergleicht nur die beiden **Randpunkte**. Was dazwischen passiert, sieht er nicht.'],
  }));

  // Differentialquotient
  gen('dq-table', 'momentan', 'Immer kleinere Intervalle', 1, 2, 1, (r, st) => {
    const cubic = st === 2, a = r.pick([1, 2, -1, 0.5, 3]), b = cubic ? 0 : r.int(-4, 4), x0 = r.int(-2, 3);
    const c = cubic ? [0, 0, 0, a] : [0, b, a], f = x => polyVal(c, x), exact = polyVal(polyDer(c), x0);
    const secant = h => (f(x0 + h) - f(x0)) / h, hs = [1, 0.1, 0.01], last = 0.001;
    return {
      kicker: 'Annäherung', lead: `Gegeben ist $f(x)=${polyTex(c)}$. Die Tabelle zeigt mittlere Änderungsraten in immer kleineren Intervallen rund um $${fmt(x0)}$.`,
      table: { head: 'row', rows: [['Intervall', 'Mittlere Änderungsrate'], ...hs.map(h => [`[${fmt(x0)}; ${fmt(x0 + h)}]`, fmt(secant(h), 4)]), [`[${fmt(x0)}; ${fmt(x0 + last)}]`, '?']] },
      ask: `Berechne den fehlenden Wert und gib eine Vermutung für $f'(${fmt(x0)})$ an.`,
      answer: fields(field('s', `Intervall $[${fmt(x0)};${fmt(x0 + last)}]$`, secant(last), { d: 3, tol: 0.006 }), field('v', `$f'(${fmt(x0)})\\approx$`, exact, { d: 2, tol: 0.03, traps: [{ value: f(x0), msg: 'Das ist der Funktionswert. Gesucht ist, welchem Wert sich die Sekantensteigungen nähern.' }] })),
      hints: [`Rechne ${FORMULA} mit $x=${fmt(x0)}$ und $z=${fmt(x0 + last)}$.`, 'Die Werte in der Tabelle laufen immer näher an eine bestimmte Zahl. Welche ist das?'],
      solution: [`$f(${fmt(x0)})=${fmt(f(x0))}$ und $f(${fmt(x0 + last)})${eq(f(x0 + last), 6)}${fmt(f(x0 + last), 6)}$`, `Mittlere Änderungsrate: $${fmt(secant(last), 3)}$`, `Die Werte nähern sich der Zahl $${fmt(exact)}$. Also: $f'(${fmt(x0)})=${fmt(exact)}$`],
      takeaway: 'Der Differentialquotient ist der Grenzwert der Differenzenquotienten.',
    };
  });
  gen('dq-limit', 'momentan', 'Grenzwert berechnen', 2, 3, 4, (r, st) => {
    const a = r.pick([1, 2, 3, -1, 0.5, -2]), b = st === 3 ? r.int(-4, 4) || 1 : 0, c0 = r.int(-3, 6), x0 = r.int(-3, 4) || 2, c = [c0, b, a], v = 2 * a * x0 + b;
    const A = a === 1 ? '' : a === -1 ? '−' : `${fmt(a)}\\cdot `, tail = b ? (b > 0 ? ` + ${fmt(b)}` : ` - ${fmt(-b)}`) : '';
    const inner = x0 >= 0 ? `z + ${fmt(x0)}` : `z - ${fmt(-x0)}`;
    return {
      kicker: 'Grenzwert', lead: `Gegeben ist $f(x)=${polyTex(c)}$.`, ask: `Berechne $f'(${fmt(x0)})$ mit dem Grenzwert $\\lim_{z\\to ${fmt(x0)}}\\frac{f(z)-f(${fmt(x0)})}{z-${par(x0)}}$.`,
      answer: fields(field('v', `$f'(${fmt(x0)})=$`, v, { traps: [{ value: polyVal(c, x0), msg: TRAP.height }, { value: -v, msg: TRAP.lost }] })),
      hints: [`Setze ein. Im Zähler kannst du $z^2-${par(x0)}^2=(z-${par(x0)})\\cdot(${inner})$ verwenden.`, `Nach dem Kürzen bleibt $${A}(${inner})${tail}$.`, `Jetzt $z=${fmt(x0)}$ einsetzen.`],
      solution: [`Der Bruch kürzt sich zu $${A}(${inner})${tail}$`, `$z\\to ${fmt(x0)}$ liefert $${A}(${fmt(x0)} ${x0 >= 0 ? '+' : '-'} ${fmt(Math.abs(x0))})${tail}=${fmt(v)}$`],
      takeaway: 'Kürzen zuerst. Erst wenn der Bruch weg ist, darf $z$ eingesetzt werden.',
    };
  });
  gen('dq-read', 'momentan', 'Tangente ablesen', 1, 3, 2, (r, st) => {
    const g = repeat(() => {
      const x0 = r.int(2, 6), y0 = r.int(2, 6), k = r.pick(st === 1 ? [1, 2, -1, -2, 0.5, -0.5] : [0.5, 1, 1.5, 2, -0.5, -1, -1.5, -2, 0.25, -0.25]);
      const b = r.pick([-0.3, -0.2, 0.2, 0.3]), e = r.pick([-0.03, 0.03, 0.05, -0.05]);
      const fn = x => y0 + k * (x - x0) + b * (x - x0) ** 2 + e * (x - x0) ** 3, dx = (Number.isInteger(k) ? 1 : Number.isInteger(k * 2) ? 2 : 4) * (Number.isInteger(k) ? r.pick([1, 2]) : 1);
      const end = y0 + k * dx;
      if (end < 0 || end > 8 || x0 + dx > 8 || y0 === Math.round(k)) return null;
      return { x0, y0, k, fn, dx };
    });
    const { x0, y0, k, fn, dx } = g, plot = spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn, tone: 'f', name: 'f' }], dots: [{ x: x0, y: y0, tone: 'tan', label: 'P' }], segs: [{ a: [x0, y0], b: [x0 + dx, y0 + k * dx], tone: 'tan', ext: 1 }] });
    if (st === 1) plot.tris.push({ x: x0, y: y0, dx, dy: k * dx, tone: 'tan' });
    return {
      kicker: 'Graph', plots: [plot], ask: `Die Gerade ist die Tangente an $f$ im Punkt $P$. Bestimme $f'(${x0})$.`,
      answer: fields(field('v', `$f'(${x0})=$`, k, { tol: st === 3 ? 0.13 : undefined, traps: [{ value: y0, msg: TRAP.height }, { value: -k, msg: TRAP.lost }, { value: 1 / k, msg: TRAP.flip }] })),
      hints: ['Such auf der Tangente zwei Punkte, die genau auf Gitterpunkten liegen.', `Gehe von $P$ aus ${dx} nach rechts. Um wie viel ändert sich die Höhe der Tangente?`],
      solution: [`Von $P$ aus ${dx} nach rechts ändert sich die Höhe der Tangente um $${fmt(k * dx)}$.`, `$f'(${x0})=\\frac{${fmt(k * dx)}}{${dx}}=${fmt(k)}$`],
      showPlot: { tris: [{ x: x0, y: y0, dx, dy: k * dx, tone: 'tan' }] },
    };
  });
  gen('dq-drag', 'momentan', 'Tangente einzeichnen', 1, 3, 3, (r, st) => {
    const s = shape(r, st === 1 ? 'parabola' : st === 2 ? 'cubic' : r.pick(['quartic', 'sine', 'sigmoid']));
    const [a, b] = s.domain, x0 = repeat(() => { const x = r.int(Math.ceil(a + 1), Math.floor(b - 1)); return Math.abs(s.d(x)) > 0.25 ? { x } : null; }).x;
    const y0 = s.f(x0), k = s.d(x0);
    return {
      kicker: 'Graph', plots: [plotF(s, { dots: [{ x: x0, y: y0, tone: 'tan', label: 'P' }] })], ask: 'Dreh die Gerade so, dass sie die **Tangente** an $f$ im Punkt $P$ ist.',
      answer: { type: 'tangent', x0, y0, k, tolDeg: 8, live: st < 3, plot: 0 },
      hints: ['Die Tangente berührt den Graphen in $P$ und hat dort genau dieselbe Richtung wie der Graph.', `Der Graph ${k > 0 ? 'steigt' : 'fällt'} an dieser Stelle.`],
      solution: [`An der Stelle $${x0}$ ist $f'(${x0})${eq(k, 2)}${fmt(k, 2)}$. Das ist die Steigung der Tangente.`],
    };
  });
  gen('dq-compare', 'momentan', 'Steigungen vergleichen', 1, 3, 2, (r) => {
    const s = knotShape(r);
    const pair = repeat(() => {
      const u = r.int(0, 7) + r.pick([0, 0.5]), v = r.int(0, 7) + r.pick([0, 0.5]);
      if (u >= v - 0.9 || u < 0.5 || v > 7.5) return null;
      const ku = s.d(u), kv = s.d(v);
      if (Math.abs(ku - kv) < 0.8) return null;
      return (s.f(u) - s.f(v)) * (ku - kv) < 0 || r.chance(0.12) ? { u, v, ku, kv } : null;
    });
    const { u, v, ku, kv } = pair, gt = `$f'(${fmt(u)})>f'(${fmt(v)})$`, lt = `$f'(${fmt(u)})<f'(${fmt(v)})$`;
    return {
      kicker: 'Graph', plots: [spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn: s.f, tone: 'f', name: 'f' }], dots: [{ x: u, y: s.f(u), tone: 'tan', label: 'A' }, { x: v, y: s.f(v), tone: 'tan', label: 'B' }] })],
      ask: `Welche Aussage über die Steigungen an den Stellen $${fmt(u)}$ (Punkt A) und $${fmt(v)}$ (Punkt B) stimmt?`,
      answer: mc(r, ku > kv ? gt : lt, [ku > kv ? lt : gt, `$f'(${fmt(u)})=f'(${fmt(v)})$`]),
      hints: ['Es zählt nicht, welcher Punkt höher liegt, sondern wo der Graph steiler nach oben geht.', 'Stell dir in beiden Punkten eine Tangente vor. Fallende Tangenten haben negative Steigungen.'],
      solution: [`Steigung in A: etwa $${fmt(ku, 1)}$`, `Steigung in B: etwa $${fmt(kv, 1)}$`],
      showPlot: { segs: [{ a: [u, s.f(u)], b: [u + 1, s.f(u) + ku], tone: 'tan', ext: 0.6 }, { a: [v, s.f(v)], b: [v + 1, s.f(v) + kv], tone: 'tan', ext: 0.6 }] },
      takeaway: 'Höhe und Steigung sind zwei verschiedene Dinge: Ein hoher Punkt kann eine kleine Steigung haben.',
    };
  });
  gen('dq-statements', 'momentan', 'Aussagen zum Graphen', 2, 3, 3, (r) => {
    const s = knotShape(r), knots = s.knots, items = [];
    const a = knots[r.int(0, knots.length - 3)], b = r.pick(knots.filter(q => q.x > a.x + 1)), K = (b.y - a.y) / (b.x - a.x);
    if (close((K * 100) % 1, 0, 1e-6)) { const truth = r.chance(0.5), shown = truth ? K : K + r.pick([1, -1, 0.5]); items.push({ text: `Der Differenzenquotient von $f$ im Intervall $[${a.x};${b.x}]$ ist gleich $${fmt(shown)}$.`, truth, why: `$\\frac{${fmt(b.y)}-${par(a.y)}}{${b.x}-${a.x}}=${fmt(K)}$` }); }
    const p = r.pick(knots.filter(q => q.x < 7)), q = r.pick(knots.filter(q2 => q2.x > p.x + 1 && q2.y !== p.y).concat(knots.at(-1)).filter(q2 => q2.x > p.x + 1 && q2.y !== p.y));
    if (q) { const up = r.chance(0.5); items.push({ text: `Die mittlere Änderungsrate von $f$ im Intervall $[${p.x};${q.x}]$ ist ${up ? 'positiv' : 'negativ'}.`, truth: up === (q.y > p.y), why: `Am Ende liegt der Graph ${q.y > p.y ? 'höher' : 'tiefer'} als am Anfang.` }); }
    const i = r.int(0, s.ext.length - 2), L = s.ext[i], R = s.ext[i + 1], c = L.x + 1, cUp = R.y > L.y, claimPos = r.chance(0.5);
    items.push({ text: `$f'(${c})${claimPos ? '>' : '<'}0$`, truth: claimPos === cUp, why: `Der Graph ${cUp ? 'steigt' : 'fällt'} an der Stelle $${c}$.` });
    const n = s.ext.length, truthN = r.chance(0.5), shownN = truthN ? n : n + r.pick([1, -1]);
    items.push({ text: `Der Differentialquotient ist im dargestellten Bereich genau ${shownN}-mal gleich 0.`, truth: truthN, why: `Es gibt ${n} Stellen mit waagrechter Tangente.` });
    const across = r.chance(0.5);
    items.push(across ? { text: `$f'(x)>0$ für alle $x\\in[${L.x - 1 >= 0 ? L.x - 1 : 0};${R.x}]$`, truth: false, why: `Bei $x=${L.x}$ ist die Steigung 0.` } : { text: `$f'(x)\\ne 0$ für alle $x\\in[${L.x + 0.5};${R.x - 0.5}]$`.replace(/\./g, ','), truth: true, why: `Zwischen den Extremstellen $${L.x}$ und $${R.x}$ gibt es keine waagrechte Tangente.` });
    const chosen = r.sample(items, Math.min(4, items.length));
    if (chosen.every(x => x.truth === chosen[0].truth)) { const flip = items.find(x => x.truth !== chosen[0].truth) || { text: `$f'(${c})${claimPos ? '<' : '>'}0$`, truth: claimPos !== cUp, why: `Der Graph ${cUp ? 'steigt' : 'fällt'} an der Stelle $${c}$.` }; chosen[0] = flip; if (chosen.filter(x => x.text === flip.text).length > 1) chosen.splice(chosen.lastIndexOf(flip), 1); }
    return {
      kicker: 'Graph', plots: [spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn: s.f, tone: 'f', name: 'f' }] })], ask: 'Welche Aussagen über $f$ stimmen?',
      answer: { type: 'tf', items: chosen }, hints: ['Differenzenquotient: zwei Punkte vergleichen. Differentialquotient: Steigung an einer Stelle.', 'Waagrechte Tangenten sind die Stellen mit $f\'(x)=0$.'],
      solution: ['Wichtig ist die Unterscheidung zwischen **Intervall** (mittlere Änderungsrate) und **Stelle** (Steigung der Tangente).'],
    };
  });
  gen('dq-notation', 'momentan', 'Schreibweisen', 1, 3, 2, (r) => {
    const [F, v] = r.pick([['s', 't'], ['N', 't'], ['T', 't'], ['h', 'x'], ['V', 't']]);
    const right = [`\\frac{d${F}}{d${v}}`, `\\lim_{z\\to ${v}}\\frac{${F}(z)-${F}(${v})}{z-${v}}`, `\\lim_{\\Delta ${v}\\to 0}\\frac{\\Delta ${F}}{\\Delta ${v}}`];
    const wrong = [`\\frac{d${v}}{d${F}}`, `\\lim_{z\\to 0}\\frac{${F}(z)-${F}(${v})}{z-${v}}`, `\\frac{${F}(z)-${F}(${v})}{z-${v}}`, `\\frac{\\Delta ${v}}{\\Delta ${F}}`];
    const options = r.shuffle([...right.map(t => ({ text: `$${t}$`, ok: true })), ...r.sample(wrong, 3).map(t => ({ text: `$${t}$`, ok: false }))]);
    return {
      kicker: 'Schreibweise', ask: `Welche Ausdrücke bedeuten dasselbe wie $${F}'(${v})$? Wähle alle aus.`,
      answer: { type: 'multi', options, correct: options.map((o, i) => o.ok ? i : -1).filter(i => i >= 0) },
      hints: ['$\\frac{d' + F + '}{d' + v + '}$ liest man „d' + F + ' nach d' + v + '“: abhängige Größe oben, unabhängige unten.', 'Beim Grenzwert läuft $z$ gegen die Stelle, also gegen $' + v + '$. Ohne $\\lim$ ist es nur ein Differenzenquotient.'],
      solution: [`Richtig sind $${right.join('$, $')}$.`],
    };
  });
  const DQ_CONCEPT = [
    ['Der Differenzenquotient ist die Steigung einer Sekante.', true, 'Sekante durch die zwei Randpunkte.'],
    ['Der Differentialquotient ist die Steigung einer Sekante.', false, 'Er ist die Steigung der **Tangente**.'],
    ['Den Differenzenquotienten kann man an einer einzelnen Stelle berechnen.', false, 'Er braucht ein **Intervall** mit zwei verschiedenen Stellen.'],
    ['Der Differentialquotient ist ein Grenzwert von Differenzenquotienten.', true, 'Das Intervall wird immer kleiner.'],
    ['Die momentane Änderungsrate gehört zu einer Stelle, die mittlere zu einem Intervall.', true, 'Genau das ist der Unterschied.'],
    ['Bei einer linearen Funktion ist der Differentialquotient überall gleich groß.', true, 'Eine Gerade hat überall dieselbe Steigung.'],
    ['Ist $f\'(3)=0$, dann ist auch $f(3)=0$.', false, 'Steigung 0 heißt waagrechte Tangente. Die Höhe kann beliebig sein.'],
    ['Ist $f\'(2)=-3$, dann fällt der Graph an der Stelle 2.', true, 'Negative Steigung heißt fallend.'],
    ['Ist $f(4)$ negativ, dann ist auch $f\'(4)$ negativ.', false, 'Der Funktionswert sagt nichts über die Steigung.'],
    ['Eine Tangente kann den Graphen an einer anderen Stelle schneiden.', true, 'Sie berührt ihn nur an der betrachteten Stelle.'],
  ];
  gen('dq-concept', 'momentan', 'Begriffe sicher', 1, 3, 1, (r) => ({
    kicker: 'Verständnis', ask: 'Richtig oder falsch?', answer: { type: 'tf', items: r.sample(DQ_CONCEPT, 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['Differenzenquotient: Intervall, Sekante, mittlere Änderungsrate. Differentialquotient: Stelle, Tangente, momentane Änderungsrate.'],
    solution: ['Intervall gehört zu Sekante und mittlerer Änderungsrate. Stelle gehört zu Tangente und momentaner Änderungsrate.'],
  }));

  // Steigungswinkel
  const deg = rad => rad * 180 / Math.PI;
  const rad = d => d * Math.PI / 180;
  const angleTraps = k => [{ value: Math.atan(k), msg: TRAP.rad }, { value: Math.tan(rad(k)), msg: TRAP.tan }, { value: -deg(Math.atan(k)), msg: TRAP.lost }];
  gen('w-k2a', 'winkel', 'Von k zum Winkel', 1, 3, 1, (r, st) => {
    let k, lead, how = [];
    if (st === 1) { k = r.pick([0.5, 1, 2, 3, -0.5, -1, -2, 1.5, -1.5, 0.75]); lead = `Eine Tangente hat die Steigung $k=${fmt(k)}$.`; }
    if (st === 2) { const x0 = r.int(-3, 5); k = r.pick([0.4, 0.8, 1.2, 2.5, -0.6, -1.4, -2.2, 3.2]); lead = `Für eine Funktion $f$ gilt $f'(${fmt(x0)})=${fmt(k)}$.`; }
    if (st === 3) { const a = r.pick([0.5, 1, -0.5, 0.25, -1]), b = r.int(-2, 2), x0 = r.int(-2, 4), c = [r.int(0, 4), b, a]; k = 2 * a * x0 + b; if (k === 0) { k = 1.5; lead = `Die Tangente an einen Graphen hat die Steigung $k=1,5$.`; } else { lead = `Gegeben ist $f(x)=${polyTex(c)}$ mit $f'(x)=${polyTex(polyDer(c))}$. Betrachte die Stelle $${fmt(x0)}$.`; how = [`$f'(${fmt(x0)})=${polySub(polyDer(c), x0)}=${fmt(k)}$`]; } }
    const a = deg(Math.atan(k));
    return {
      kicker: 'Winkel', lead, ask: 'Berechne den Steigungswinkel der Tangente in Grad. Runde auf eine Dezimalstelle.',
      answer: fields(field('a', '$\\alpha=$', a, { d: 1, tol: 0.1, unit: '°', traps: angleTraps(k) })),
      hints: ['$k=\\tan(\\alpha)$, also $\\alpha=\\arctan(k)$.', 'Taschenrechner auf Grad stellen. Bei negativem $k$ wird auch $\\alpha$ negativ.'],
      solution: [...how, `$\\alpha=\\arctan(${fmt(k)})${eq(a, 1)}${fmt(a, 1)}°$`],
    };
  });
  gen('w-a2k', 'winkel', 'Vom Winkel zu k', 1, 2, 2, (r) => {
    const a = r.pick([10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, -10, -20, -30, -45, -60]), k = Math.tan(rad(a));
    return {
      kicker: 'Winkel', lead: `Eine Gerade schließt mit der $x$-Achse den Winkel $\\alpha=${fmt(a)}°$ ein.`, ask: 'Berechne ihre Steigung $k$. Runde auf zwei Dezimalstellen.',
      answer: fields(field('k', '$k=$', k, { d: 2, traps: [{ value: Math.tan(a), msg: TRAP.rad }, { value: deg(Math.atan(a)), msg: TRAP.tan }, { value: -k, msg: TRAP.lost }] })),
      hints: ['Vom Winkel zur Steigung geht es mit $\\tan$.', 'Taschenrechner auf Grad stellen.'],
      solution: [`$k=\\tan(${fmt(a)}°)\\approx ${fmt(k, 2)}$`],
    };
  });
  gen('w-percent', 'winkel', 'Steigung in Prozent', 2, 3, 3, (r) => {
    const ctx = r.pick(['Eine Passstraße', 'Eine Rollstuhlrampe', 'Ein Radweg', 'Eine Skipiste', 'Eine Zahnradbahn']), toAngle = r.chance(0.65);
    if (toAngle) {
      const p = r.pick([4, 6, 8, 10, 12, 15, 18, 22, 25]), a = deg(Math.atan(p / 100));
      return {
        kicker: 'Steigung in %', lead: `${ctx} hat eine Steigung von $${p}\\,\\%$.`, ask: 'Wie groß ist der Steigungswinkel? Runde auf eine Dezimalstelle.',
        answer: fields(field('a', '$\\alpha=$', a, { d: 1, tol: 0.1, unit: '°', traps: [{ value: deg(Math.atan(p)), msg: TRAP.percent }, { value: Math.atan(p / 100), msg: TRAP.rad }, { value: p, msg: 'Prozent und Grad sind nicht dasselbe.' }] })),
        hints: [`$${p}\\,\\%$ bedeutet: $k=${fmt(p / 100)}$.`, 'Dann $\\alpha=\\arctan(k)$.'], solution: [`$k=${fmt(p / 100)}$`, `$\\alpha=\\arctan(${fmt(p / 100)})${eq(a, 1)}${fmt(a, 1)}°$`], takeaway: '45° sind 100 %. Prozent und Grad sind nicht dasselbe.',
      };
    }
    const a = r.pick([2, 3, 5, 6, 8, 10, 12, 15, 20]), p = Math.tan(rad(a)) * 100;
    return {
      kicker: 'Steigung in %', lead: `${ctx} hat einen Steigungswinkel von $${a}°$.`, ask: 'Wie viel Prozent Steigung sind das? Runde auf eine Dezimalstelle.',
      answer: fields(field('p', 'Steigung', p, { d: 1, tol: 0.1, unit: '%', traps: [{ value: Math.tan(rad(a)), msg: 'Das ist $k$ als Dezimalzahl. In Prozent noch mit 100 multiplizieren.' }, { value: a, msg: 'Prozent und Grad sind nicht dasselbe.' }, { value: Math.tan(a) * 100, msg: TRAP.rad }] })),
      hints: ['$k=\\tan(\\alpha)$, dann mit 100 multiplizieren.'], solution: [`$k=\\tan(${a}°)\\approx ${fmt(p / 100, 4)}$`, `Das sind etwa $${fmt(p, 1)}\\,\\%$.`],
    };
  });
  gen('w-road', 'winkel', 'Höhe und Entfernung', 2, 3, 4, (r) => {
    const where = r.pick(['Ein Wanderweg führt zu einer Almhütte', 'Eine Mautstraße führt auf einen Pass', 'Eine Gondelbahn führt zur Bergstation', 'Eine Forststraße führt zu einem Aussichtspunkt']);
    const d = r.pick([1.2, 1.5, 2, 2.4, 3, 3.5, 4.8]), h = r.pick([120, 180, 240, 300, 360, 420, 500, 640]), k = h / (d * 1000), a = deg(Math.atan(k));
    return {
      kicker: 'Sachaufgabe', lead: `${where}. Auf einer waagrechten Entfernung von $${fmt(d)}$ km werden $${h}$ Höhenmeter überwunden.`, ask: 'Berechne unter der Annahme einer konstanten Steigung den Steigungswinkel. Runde auf eine Dezimalstelle.',
      answer: fields(field('a', '$\\alpha=$', a, { d: 1, tol: 0.1, unit: '°', traps: [{ value: deg(Math.atan(h / d)), msg: TRAP.units }, { value: k, msg: 'Das ist erst die Steigung $k$. Gesucht ist der Winkel, also noch $\\arctan$.' }, { value: Math.atan(k), msg: TRAP.rad }] })),
      hints: [`$${fmt(d)}$ km sind $${fmt(d * 1000)}$ m.`, `$k=\\frac{${h}}{${fmt(d * 1000)}}=${fmt(k, 4)}$`],
      solution: [`$k=\\frac{${h}}{${fmt(d * 1000)}}=${fmt(k, 4)}$`, `$\\alpha=\\arctan(${fmt(k, 4)})${eq(a, 1)}${fmt(a, 1)}°$`],
    };
  });
  gen('w-graph', 'winkel', 'Winkel am Graphen', 1, 3, 3, (r, st) => {
    const g = repeat(() => {
      const x0 = r.int(2, 5), y0 = r.int(2, 6), k = r.pick([1, 2, -1, -2, 0.5, -0.5, 1.5, -1.5]), b = r.pick([-0.25, 0.25]), dx = Number.isInteger(k) ? 1 : 2, end = y0 + k * dx;
      return end >= 0 && end <= 8 ? { x0, y0, k, b, dx } : null;
    });
    const { x0, y0, k, b, dx } = g, fn = x => y0 + k * (x - x0) + b * (x - x0) ** 2, a = deg(Math.atan(k));
    const plot = spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn, tone: 'f', name: 'f' }], dots: [{ x: x0, y: y0, tone: 'tan', label: 'P' }], segs: [{ a: [x0, y0], b: [x0 + dx, y0 + k * dx], tone: 'tan', ext: 1 }] });
    if (st === 1) plot.tris.push({ x: x0, y: y0, dx, dy: k * dx, tone: 'tan' });
    return {
      kicker: 'Graph', plots: [plot], ask: 'Bestimme den Steigungswinkel der Tangente in $P$. Runde auf eine Dezimalstelle.',
      answer: fields(field('a', '$\\alpha=$', a, { d: 1, tol: 0.1, unit: '°', traps: angleTraps(k).concat([{ value: k, msg: 'Das ist die Steigung $k$. Gesucht ist der Winkel.' }]) })),
      hints: ['Lies zuerst die Steigung $k$ der Tangente ab.', `$k=${fmt(k)}$, jetzt $\\alpha=\\arctan(k)$.`],
      solution: [`Aus dem Steigungsdreieck: $k=\\frac{${fmt(k * dx)}}{${dx}}=${fmt(k)}$`, `$\\alpha=\\arctan(${fmt(k)})${eq(a, 1)}${fmt(a, 1)}°$`],
    };
  });
  const ANGLE_FACTS = [
    ['Eine fallende Tangente hat einen negativen Steigungswinkel.', true, 'Fallend: $k<0$ und damit $\\alpha<0$.'],
    ['Für $k=1$ ist $\\alpha=45°$.', true, '$\\arctan(1)=45°$.'],
    ['Für $k=2$ ist der Winkel doppelt so groß wie für $k=1$.', false, '$\\arctan(2)\\approx 63{,}4°$, nicht $90°$.'],
    ['Eine waagrechte Tangente hat den Steigungswinkel $0°$.', true, '$k=0$ und $\\arctan(0)=0°$.'],
    ['$100\\,\\%$ Steigung sind $90°$.', false, '$100\\,\\%$ heißt $k=1$, also $45°$.'],
    ['Es gilt $f\'(x)=\\tan(\\alpha)$.', true, 'Die Ableitung ist die Tangentensteigung.'],
    ['Es gilt $\\alpha=\\tan(k)$.', false, 'Richtig ist $\\alpha=\\arctan(k)$.'],
  ];
  gen('w-facts', 'winkel', 'Richtig oder falsch', 1, 2, 1, (r) => ({
    kicker: 'Verständnis', ask: 'Richtig oder falsch?', answer: { type: 'tf', items: r.sample(ANGLE_FACTS, 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['$k=\\tan(\\alpha)$ und $\\alpha=\\arctan(k)$. Der Zusammenhang ist nicht proportional.'], solution: ['Merke: $k=1$ gehört zu $45°$. Steile Geraden haben große $k$, der Winkel bleibt aber unter $90°$.'],
  }));

  // Sachzusammenhang
  const CTX = [
    { f: 'T', v: 't', fu: '°C', xu: 'min', pro: 'Minute', what: 'die Temperatur des Tees', up: 'steigt', down: 'sinkt', be: 'beträgt', at: x => `Nach ${x} Minuten`, iv: (a, b) => `Von Minute ${a} bis Minute ${b}`, now: 'momentan', dir: -1, val: [40, 85] },
    { f: 'W', v: 't', fu: 'cm', xu: 'h', pro: 'Stunde', what: 'der Wasserstand des Flusses', up: 'steigt', down: 'fällt', be: 'beträgt', at: x => `${x} Stunden nach Messbeginn`, iv: (a, b) => `Von Stunde ${a} bis Stunde ${b}`, now: 'momentan', dir: 1, val: [120, 310] },
    { f: 'D', v: 't', fu: 'MB', xu: 's', pro: 'Sekunde', what: 'die heruntergeladene Datenmenge', up: 'wächst', down: 'schrumpft', be: 'beträgt', at: x => `Nach ${x} Sekunden`, iv: (a, b) => `Von Sekunde ${a} bis Sekunde ${b}`, now: 'momentan', dir: 1, val: [60, 400] },
    { f: 'K', v: 'x', fu: '€', xu: 'Stück', pro: 'Stück', what: 'die Gesamtkosten', up: 'steigen', down: 'sinken', be: 'betragen', at: x => `Bei ${x} produzierten Stück`, iv: (a, b) => `Bei einer Steigerung der Produktion von ${a} auf ${b} Stück`, now: 'lokal', dir: 1, val: [200, 900] },
    { f: 'B', v: 't', fu: 'Personen', xu: 'h', pro: 'Stunde', what: 'die Zahl der Gäste im Schwimmbad', up: 'steigt', down: 'sinkt', be: 'beträgt', at: x => `${x} Stunden nach Öffnung`, iv: (a, b) => `Von Stunde ${a} bis Stunde ${b}`, now: 'momentan', dir: 1, val: [80, 420] },
    { f: 'V', v: 's', fu: 'L', xu: 'km', pro: 'Kilometer', what: 'die Benzinmenge im Tank', up: 'nimmt zu', down: 'nimmt ab', be: 'beträgt', at: x => `Nach ${x} gefahrenen Kilometern`, iv: (a, b) => `Zwischen Kilometer ${a} und Kilometer ${b}`, now: 'lokal', dir: -1, val: [18, 45], small: true },
    { f: 'h', v: 't', fu: 'm', xu: 's', pro: 'Sekunde', what: 'die Flughöhe der Drohne', up: 'steigt', down: 'sinkt', be: 'beträgt', at: x => `Nach ${x} Sekunden`, iv: (a, b) => `Von Sekunde ${a} bis Sekunde ${b}`, now: 'momentan', dir: 1, val: [12, 80] },
    { f: 'S', v: 't', fu: 'm³', xu: 'Tag', pro: 'Tag', what: 'die Wassermenge im Speichersee', up: 'steigt', down: 'sinkt', be: 'beträgt', at: x => `Nach ${x} Tagen`, iv: (a, b) => `Von Tag ${a} bis Tag ${b}`, now: 'momentan', dir: -1, val: [900, 4000] },
  ];
  function ctxNumbers(r) {
    const c = r.pick(CTX), a = r.int(1, 5) * 2, dx = r.pick([2, 3, 4, 5, 6]), b = a + dx, dir = r.chance(0.8) ? c.dir : -c.dir;
    const rate = dir * (c.small ? r.pick([0.05, 0.06, 0.08, 0.1]) : r.pick([1.5, 2, 3, 4, 6, 8])), abs = rate * dx, val = r.int(...c.val), momentRate = dir * (c.small ? r.pick([0.04, 0.07, 0.09, 0.12]) : r.pick([1, 2.5, 3, 5, 7]));
    return { c, a, b, dx, dir, rate, abs, val, momentRate };
  }
  const verb = (c, n) => n < 0 ? c.down : c.up;
  const senValue = (c, x, v) => `${c.at(x)} ${c.be} ${c.what} ${fmt(v)} ${c.fu}.`;
  const senAbs = (c, a, b, d) => `${c.iv(a, b)} ${verb(c, d)} ${c.what} insgesamt um ${fmt(Math.abs(d))} ${c.fu}.`;
  const senMean = (c, a, b, d) => `${c.iv(a, b)} ${verb(c, d)} ${c.what} im Mittel um ${fmt(Math.abs(d))} ${c.fu} pro ${c.pro}.`;
  const senNow = (c, x, d) => `${c.at(x)} ${verb(c, d)} ${c.what} ${c.now} um ${fmt(Math.abs(d))} ${c.fu} pro ${c.pro}.`;
  function ctxExpr(n, kind) {
    const { c, a, b, dx, abs, rate, val, momentRate } = n;
    return {
      value: { tex: `${c.f}(${b})=${fmt(val)}`, right: senValue(c, b, val), wrong: [senNow(c, b, val), senAbs(c, 0, b, val), senMean(c, 0, b, val)] },
      abs: { tex: `${c.f}(${b})-${c.f}(${a})=${fmt(abs)}`, right: senAbs(c, a, b, abs), wrong: [senMean(c, a, b, abs), senNow(c, b, abs), senValue(c, b, abs)] },
      mean: { tex: `\\frac{${c.f}(${b})-${c.f}(${a})}{${dx}}=${fmt(rate)}`, right: senMean(c, a, b, rate), wrong: [senAbs(c, a, b, rate), senNow(c, b, rate), senMean(c, a, b, -rate)] },
      moment: { tex: `${c.f}'(${b})=${fmt(momentRate)}`, right: senNow(c, b, momentRate), wrong: [senValue(c, b, momentRate), senMean(c, 0, b, momentRate), senAbs(c, 0, b, momentRate)] },
    }[kind];
  }
  const ctxIntro = c => `$${c.f}(${c.v})$ ist ${c.what}${c.fu === 'Personen' ? '' : ` in ${c.fu}`}, $${c.v}$ wird in ${c.xu} gemessen.`;
  gen('i-meaning', 'sach', 'Was bedeutet das?', 1, 3, 1, (r, st) => {
    const n = ctxNumbers(r), kind = r.pick(st === 1 ? ['value', 'mean', 'moment', 'abs'] : ['mean', 'moment', 'moment', 'abs']), e = ctxExpr(n, kind);
    return {
      kicker: 'Interpretieren', lead: ctxIntro(n.c), ask: `Was bedeutet $${e.tex}$ im Sachzusammenhang?`, answer: mc(r, e.right, unique(e.wrong).filter(w => w !== e.right).slice(0, 3)),
      hints: ['Ein Strich wie bei $f\'$ heißt: Änderungsrate an **einer Stelle**. Ein Bruch mit Differenz heißt: Mittelwert über ein **Intervall**.', 'Ohne Division ist es die Gesamtänderung. Ohne Differenz einfach ein Funktionswert.'],
      solution: [e.right], takeaway: 'Check: Stelle oder Intervall? Steigt oder sinkt? Zahl mit Einheit?',
    };
  });
  gen('i-unit', 'sach', 'Welche Einheit?', 1, 3, 2, (r) => {
    const n = ctxNumbers(r), c = n.c, kind = r.pick(['moment', 'moment', 'mean', 'abs', 'value']), pro = `${c.fu} pro ${c.pro}`;
    const tex = { moment: `${c.f}'(${c.v})`, mean: `\\frac{${c.f}(${n.b})-${c.f}(${n.a})}{${n.dx}}`, abs: `${c.f}(${n.b})-${c.f}(${n.a})`, value: `${c.f}(${n.b})` }[kind], right = kind === 'moment' || kind === 'mean' ? pro : c.fu;
    const options = unique([right, pro, c.fu, `${c.pro} pro ${c.fu}`, `${c.fu} mal ${c.pro}`]).filter(x => x !== right);
    return {
      kicker: 'Einheit', lead: ctxIntro(c), ask: `Welche Einheit hat $${tex}$?`, answer: mc(r, right, options.slice(0, 3)),
      hints: ['Differenzen behalten die Einheit der Größe.', 'Teilt man durch die $x$-Größe, entsteht „Einheit von $f$ pro Einheit von $x$“. Das gilt auch für die Ableitung.'],
      solution: [`$${tex}$ hat die Einheit **${right}**.`],
    };
  });
  gen('i-cloze', 'sach', 'Satz bauen', 2, 3, 3, (r) => {
    const n = ctxNumbers(r), c = n.c, kind = r.pick(['mean', 'moment', 'abs']);
    const e = ctxExpr(n, kind), d = { mean: n.rate, moment: n.momentRate, abs: n.abs }[kind], size = fmt(Math.abs(d));
    const place = kind === 'moment' ? c.at(n.b) : c.iv(n.a, n.b), placeWrong = kind === 'moment' ? c.iv(n.a, n.b) : c.at(n.b);
    const howRight = { mean: 'im Mittel', moment: c.now, abs: 'insgesamt' }[kind], unitRight = kind === 'abs' ? c.fu : `${c.fu} pro ${c.pro}`, unitWrong = kind === 'abs' ? `${c.fu} pro ${c.pro}` : c.fu;
    const sel = (right, wrong) => { const options = r.shuffle([right, ...wrong]); return { options, correct: options.indexOf(right) }; };
    return {
      kicker: 'Interpretieren', lead: ctxIntro(c), ask: `Vervollständige die Interpretation von $${e.tex}$.`,
      answer: { type: 'cloze', parts: [sel(place, [placeWrong]), sel(verb(c, d), [verb(c, -d)]), `${c.what}`, sel(howRight, ['insgesamt', 'im Mittel', c.now].filter(x => x !== howRight).slice(0, 2)), `um ${size}`, sel(unitRight, [unitWrong]), '.'] },
      hints: ['Stelle oder Intervall? Das entscheidet über den Satzanfang.', 'Das Vorzeichen entscheidet über steigt oder sinkt. Die Zahl im Satz steht dann ohne Minus.'],
      solution: [e.right],
    };
  });
  gen('i-sign', 'sach', 'Was sagt das Vorzeichen?', 1, 2, 2, (r) => {
    const n = ctxNumbers(r), c = n.c, neg = r.chance(0.6), x = n.b, word = neg ? c.down : c.up;
    return {
      kicker: 'Vorzeichen', lead: ctxIntro(c), ask: `Es gilt $${c.f}'(${x})${neg ? '<' : '>'}0$. Was bedeutet das?`,
      answer: mc(r, `${c.at(x)} ${word} ${c.what} gerade.`, [`${c.at(x)} ${c.be} ${c.what} ${neg ? 'weniger als' : 'mehr als'} 0 ${c.fu}.`, `${c.at(x)} ist ${c.what} am ${neg ? 'kleinsten' : 'größten'}.`, `${c.iv(0, x)} ${neg ? c.up : c.down} ${c.what} durchgehend.`]),
      hints: ['Das Vorzeichen der Ableitung sagt, ob die Größe gerade zu- oder abnimmt. Es sagt nichts über ihre Höhe.'],
      solution: [`Das Vorzeichen von $${c.f}'$ zeigt die **Richtung** der Änderung: ${c.what} ${word} an dieser Stelle.`],
      takeaway: 'Nicht die Größe ist negativ, sondern ihre Änderung.',
    };
  });
  gen('i-write', 'sach', 'Selbst formulieren', 3, 3, 5, (r) => {
    const n = ctxNumbers(r), kind = r.pick(['mean', 'moment']), e = ctxExpr(n, kind), c = n.c;
    return {
      kicker: 'Schreiben', lead: ctxIntro(c), ask: `Interpretiere $${e.tex}$ im Sachzusammenhang. Schreib einen ganzen Satz.`,
      answer: { type: 'selfcheck', model: e.right, checklist: [kind === 'mean' ? 'Das Intervall ist genannt' : 'Die Stelle oder der Zeitpunkt ist genannt', 'Die Richtung stimmt (steigt oder sinkt)', kind === 'mean' ? '„im Mittel“ oder „durchschnittlich“ kommt vor' : '„momentan“ oder „lokal“ kommt vor', `Zahl und Einheit stimmen (${c.fu} pro ${c.pro})`] },
      hints: [], solution: [],
    };
  });

  // Weg und Geschwindigkeit
  gen('v-term', 'weg', 'Mittlere Geschwindigkeit', 1, 3, 1, (r, st) => {
    const [who, it] = r.pick([['Ein Stein fällt von einer Brücke', 'er'], ['Ein Auto beschleunigt aus dem Stand', 'es'], ['Ein Skater rollt eine Rampe hinunter', 'er'], ['Ein Motorrad fährt an der Ampel los', 'es']]);
    const a = r.pick([5, 1.5, 2, 2.5, 3, 4]), b = st === 3 ? r.pick([1, 2, 3]) : 0, c = [0, b, a], t1 = r.int(0, 4), dt = r.pick([1, 2, 3, 4]), t2 = t1 + dt, s1 = polyVal(c, t1), s2 = polyVal(c, t2), v = (s2 - s1) / dt;
    return {
      kicker: 'Term', lead: `${who}. Nach $t$ Sekunden hat ${it} den Weg $s(t)=${polyTex(c, 't')}$ in Metern zurückgelegt.`, ask: `Berechne die mittlere Geschwindigkeit im Zeitintervall $[${t1};${t2}]$.`,
      answer: fields(st === 1 && field('s1', `$s(${t1})=$`, s1, { unit: 'm' }), st === 1 && field('s2', `$s(${t2})=$`, s2, { unit: 'm' }), field('v', '$\\bar v=$', v, { unit: 'm/s', traps: dqTraps(s1, s2, dt) })),
      hints: ['Mittlere Geschwindigkeit: Weg durch Zeit, also $\\frac{s(t_2)-s(t_1)}{t_2-t_1}$.', `$s(${t1})=${fmt(s1)}$ und $s(${t2})=${fmt(s2)}$.`],
      solution: [`$s(${t1})=${polySub(c, t1)}=${fmt(s1)}$`, `$s(${t2})=${polySub(c, t2)}=${fmt(s2)}$`, `$\\bar v=${dqTex('s', t1, t2, s1, s2)}$ m/s`],
    };
  });
  const BAHNEN = [[40, 400], [50, 500], [80, 800], [90, 900], [100, 1000], [120, 1200], [60, 900], [30, 300]];
  const BAHN_WHO = ['einer Standseilbahn', 'einer Zahnradbahn', 'einer Straßenbahn', 'eines Schnellbahnzugs', 'einer Gondel'];
  function ratio(x) { for (let d = 1; d <= 2000; d++) { const n = x * d; if (close(n, Math.round(n), 1e-7)) return [Math.round(n), d]; } return [x, 1]; }
  const fracCoef = x => { const [n, d] = ratio(x); return d === 1 ? (n === 1 ? '' : `${n}\\cdot `) : `\\frac{${n}}{${d}}\\cdot `; };
  // s(t) starts and ends with speed 0 and is steepest exactly halfway: T is the duration, S the whole distance.
  function bahn(r) {
    const [T, S] = r.pick(BAHNEN), a = 2 * S / T ** 3, b = 3 * S / T ** 2, c = [0, 0, b, -a], dc = polyDer(c), step = T <= 50 ? 5 : 10;
    return { T, S, a, b, c, dc, step, n: T / step, who: r.pick(BAHN_WHO), tex: `−${fracCoef(a)}t^3 + ${fracCoef(b)}t^2`, dtex: `−${fracCoef(3 * a)}t^2 + ${fracCoef(2 * b)}t`, s: t => polyVal(c, t), v: t => polyVal(dc, t) };
  }
  function bahnInterval(r, g, maxSteps = 3) { const i = r.int(1, g.n - 2), j = i + r.int(1, Math.min(maxSteps, g.n - 1 - i)); return [i * g.step, j * g.step]; }
  const bahnPlot = (g, o = {}) => spec([0, g.T, g.step], niceRange(0, g.S, 6), { xLabel: 't in s', yLabel: 's in m', curves: [{ fn: g.s, tone: 'f', name: 's' }], ...o });
  gen('v-bahn', 'weg', 'Fahrt einer Bahn', 2, 3, 3, (r) => {
    const g = bahn(r), [t1, t2] = bahnInterval(r, g), s1 = g.s(t1), s2 = g.s(t2), v = (s2 - s1) / (t2 - t1);
    return {
      kicker: 'Term', lead: `Der Weg ${g.who} kann mit $s(t)=${g.tex}$ beschrieben werden ($t$ in Sekunden, $s(t)$ in Metern, $0\\le t\\le ${g.T}$).`, ask: `Berechne die mittlere Geschwindigkeit im Zeitintervall $[${t1};${t2}]$. Runde auf zwei Dezimalstellen.`,
      answer: fields(field('v', '$\\bar v=$', v, { unit: 'm/s', traps: [...dqTraps(s1, s2, t2 - t1), { value: g.v(t2), msg: 'Das ist die Momentangeschwindigkeit am Intervallende. Gesucht ist die mittlere Geschwindigkeit im Intervall.' }] })),
      hints: [`$s(${t1})${eq(s1, 2)}${fmt(s1, 2)}$`, `$s(${t2})${eq(s2, 2)}${fmt(s2, 2)}$`],
      solution: [`$s(${t1})${eq(s1, 2)}${fmt(s1, 2)}$ und $s(${t2})${eq(s2, 2)}${fmt(s2, 2)}$`, `$\\bar v=${dqTex('s', t1, t2, s1, s2, 2)}$ m/s`],
    };
  });
  gen('v-moment', 'weg', 'Momentangeschwindigkeit', 2, 3, 4, (r, st) => {
    const g = bahn(r), t0 = g.step * r.int(1, g.n - 1), v = g.v(t0);
    return {
      kicker: 'Term', lead: `Der Weg ${g.who} kann mit $s(t)=${g.tex}$ beschrieben werden ($t$ in Sekunden, $s(t)$ in Metern).${st === 2 ? ` Die Ableitung ist $s'(t)=${g.dtex}$.` : ''}`, ask: `Berechne die Momentangeschwindigkeit nach $${t0}$ Sekunden. Runde auf zwei Dezimalstellen.`,
      answer: fields(field('v', `$v(${t0})=$`, v, { unit: 'm/s', traps: [{ value: g.s(t0), msg: 'Das ist der zurückgelegte Weg $s(t)$. Die Geschwindigkeit ist $s\'(t)$.' }, { value: g.s(t0) / t0, msg: 'Das ist die **mittlere** Geschwindigkeit seit dem Start. Gesucht ist die Geschwindigkeit genau in diesem Moment.' }] })),
      hints: ['Momentangeschwindigkeit: $v(t)=s\'(t)$.', ...(st === 3 ? [`$s'(t)=${g.dtex}$. Mit Technologie: in GeoGebra $s'(${t0})$ eingeben.`] : []), `Setze $t=${t0}$ in $s'(t)$ ein.`],
      solution: [`$v(t)=s'(t)=${g.dtex}$`, `$v(${t0})${eq(v, 2)}${fmt(v, 2)}$ m/s`],
    };
  });
  gen('v-graph', 'weg', 'Weg-Zeit-Diagramm', 1, 3, 2, (r, st) => {
    const g = repeat(() => {
      const T = r.pick([20, 25, 30, 40]), v = r.pick([4, 5, 6, 8, 10, 12, 15]), t1 = r.pick([0, 0, 5, 10]), dt = r.pick([10, 15, 20].filter(x => t1 + x <= T)), t2 = t1 + dt, s1 = t1 === 0 ? 0 : v * t1 * r.pick([0.4, 0.6]), s2 = s1 + v * dt;
      if (!(dt > 0)) return null;
      const yStep = [100, 50, 20, 10].find(st2 => close((s1 / st2) % 1, 0, 1e-6) && close((s2 / st2) % 1, 0, 1e-6) && Math.ceil(s2 * 1.5 / st2) <= 14);
      if (!yStep) return null;
      const A = v * dt / Math.PI * r.pick([-0.55, -0.4, 0.4, 0.55]), c = waveCurve(t1, s1, t2, s2, A), [lo, hi] = minMax(c.f, 0, T);
      if (minMax(c.d, 0, T)[0] <= 0.05 || lo < -1) return null;
      const yMax = Math.ceil(hi / yStep) * yStep;
      return (yMax / yStep <= 14) ? { T, v, t1, t2, s1, s2, c, yStep, yMax, fn: x => Math.max(0, c.f(x)) } : null;
    });
    const who = r.pick(['eines Mopeds', 'einer Radfahrerin', 'eines Busses', 'eines E-Scooters']), { T, v, t1, t2, s1, s2, yStep, yMax, fn } = g, kmh = v * 3.6;
    const plot = spec([0, T, 5], [0, yMax, yStep], { xLabel: 't in s', yLabel: 's in m', curves: [{ fn, tone: 'f', name: 's' }] });
    if (st === 1) { plot.dots.push({ x: t1, y: s1, tone: 'sec', label: 'A' }, { x: t2, y: s2, tone: 'sec', label: 'B' }); plot.segs.push({ a: [t1, s1], b: [t2, s2], tone: 'sec' }); }
    return {
      kicker: 'Graph', lead: `Das Diagramm zeigt den Weg ${who} in den ersten ${T} Sekunden.`, plots: [plot], ask: `Ermittle die mittlere Geschwindigkeit im Zeitintervall $[${t1};${t2}]$ in **km/h**.`,
      answer: fields(st === 1 && field('ms', 'In m/s', v, { traps: dqTraps(s1, s2, t2 - t1) }), field('kmh', '$\\bar v=$', kmh, { d: 1, tol: st === 3 ? 1.5 : 0.1, unit: 'km/h', traps: [{ value: v, msg: TRAP.kmh }, { value: v / 3.6, msg: TRAP.div36 }, { value: s2 - s1, msg: TRAP.abs }] })),
      hints: [`Lies ab: $s(${t1})=${fmt(s1)}$ und $s(${t2})=${fmt(s2)}$.`, `$\\bar v=\\frac{${fmt(s2)}-${fmt(s1)}}{${t2 - t1}}$ m/s. Dann mit 3,6 multiplizieren.`],
      solution: [`Abgelesen: $s(${t1})=${fmt(s1)}$ m und $s(${t2})=${fmt(s2)}$ m`, `$\\bar v=${dqTex('s', t1, t2, s1, s2)}$ m/s`, `$${fmt(v)}\\cdot 3{,}6=${fmt(kmh, 1)}$ km/h`],
    };
  });
  function trip(r) {
    return repeat(() => {
      const legs = [{ name: 'Bus durch den Ort', v: r.pick([24, 30, 36]), t: r.pick([5, 10]) }, { name: 'Stau', v: 0, t: r.pick([2, 3, 4]) }, { name: 'Autobahn', v: r.pick([90, 96, 120]), t: r.pick([5, 10]) }, { name: 'Bergstraße', v: r.pick([30, 36, 48]), t: r.pick([5, 10]) }];
      let t = 0, s = 0; const pts = [[0, 0]];
      for (const l of legs) { t += l.t; s += l.v * l.t / 60; pts.push([t, s]); }
      return pts.every(([, y]) => close((y * 2) % 1, 0, 1e-6)) ? { legs, pts, T: t, S: s } : null;
    });
  }
  const tripFn = g => x => { for (let i = 1; i < g.pts.length; i++) if (x <= g.pts[i][0]) { const [a, sa] = g.pts[i - 1], [b, sb] = g.pts[i]; return sa + (sb - sa) * (x - a) / (b - a); } return g.S; };
  gen('v-trip', 'weg', 'Fahrt in Abschnitten', 1, 3, 3, (r, st) => {
    const g = trip(r), yStep = g.S > 20 ? 5 : 2.5, plot = spec([0, g.T + 2, 2], [0, Math.ceil(g.S / yStep + 0.5) * yStep, yStep], { xLabel: 't in min', yLabel: 's in km', curves: [{ fn: tripFn(g), tone: 'f', name: 's', to: g.T }], dots: g.pts.map(([x, y]) => ({ x, y, tone: 'sec', small: 1 })) });
    const lead = `Eine Busfahrt zum Skikurs: zuerst durch den Ort, dann im Stau, auf der Autobahn und zuletzt auf der Bergstraße.`, kind = st === 1 ? r.pick(['leg', 'stand']) : r.pick(['leg', 'mean', 'fastest']);
    if (kind === 'stand') return { kicker: 'Graph', lead, plots: [plot], ask: 'Wie lange steht der Bus insgesamt?', answer: fields(field('t', 'Dauer', g.legs[1].t, { d: 1, unit: 'min', traps: [{ value: g.pts[1][0], msg: 'Das ist der Zeitpunkt, an dem der Stau beginnt. Gesucht ist die Dauer.' }] })), hints: ['Stillstand heißt: Der Weg ändert sich nicht. Such das waagrechte Stück.'], solution: [`Waagrechtes Stück von Minute ${g.pts[1][0]} bis ${g.pts[2][0]}: das sind ${g.legs[1].t} Minuten.`], takeaway: 'Waagrecht im Weg-Zeit-Diagramm heißt: Geschwindigkeit 0.' };
    if (kind === 'fastest') return { kicker: 'Graph', lead, plots: [plot], ask: 'In welchem Abschnitt ist der Bus am schnellsten?', answer: mc(r, 'Autobahn', ['Bus durch den Ort', 'Stau', 'Bergstraße']), hints: ['Es zählt, wo der Graph am steilsten ist, nicht wo er am höchsten liegt.'], solution: ['Der Graph ist auf der Autobahn am steilsten. Dort ist die Geschwindigkeit am größten.'] };
    if (kind === 'mean') { const v = g.S / g.T * 60; return { kicker: 'Graph', lead, plots: [plot], ask: 'Berechne die mittlere Geschwindigkeit für die gesamte Fahrt in km/h. Runde auf eine Dezimalstelle.', answer: fields(field('v', '$\\bar v=$', v, { d: 1, tol: 0.6, unit: 'km/h', traps: [{ value: g.S / g.T, msg: TRAP.perMin }, { value: g.legs.reduce((sum, l) => sum + l.v, 0) / g.legs.length, msg: 'Geschwindigkeiten einfach zu mitteln funktioniert nicht. Rechne **Gesamtweg durch Gesamtzeit**.' }] })), hints: ['Gesamtweg durch Gesamtzeit.', `Weg: $${fmt(g.S)}$ km, Zeit: $${g.T}$ min $=${fmt(g.T / 60, 3)}$ h.`], solution: [`$\\bar v=\\frac{${fmt(g.S)}\\text{ km}}{${g.T}\\text{ min}}=${fmt(g.S / g.T, 3)}$ km/min`, `$${fmt(g.S / g.T, 3)}\\cdot 60${eq(v, 1)}${fmt(v, 1)}$ km/h`], takeaway: 'Stehzeiten zählen bei der mittleren Geschwindigkeit mit.' }; }
    const i = r.pick([0, 2, 3]), l = g.legs[i], [ta, sa] = g.pts[i], [tb, sb] = g.pts[i + 1];
    return { kicker: 'Graph', lead, plots: [plot], ask: `Wie schnell fährt der Bus im Abschnitt „${l.name}“? Gib das Ergebnis in km/h an.`, answer: fields(field('v', '$v=$', l.v, { d: 1, tol: 1.5, unit: 'km/h', traps: [{ value: l.v / 60, msg: TRAP.perMin }, { value: sb - sa, msg: 'Das ist nur der Weg in diesem Abschnitt. Noch durch die Zeit dividieren.' }, { value: sb, msg: 'Das ist die Höhe des Graphen am Ende des Abschnitts. Gefragt ist die Steigung.' }] })), hints: [`Dieser Abschnitt geht von Minute ${ta} bis ${tb}.`, `Weg: $${fmt(sb)}-${fmt(sa)}=${fmt(sb - sa)}$ km in ${l.t} Minuten.`], solution: [`$\\frac{${fmt(sb - sa)}\\text{ km}}{${l.t}\\text{ min}}=${fmt(l.v / 60, 3)}$ km/min`, `$${fmt(l.v / 60, 3)}\\cdot 60=${fmt(l.v)}$ km/h`] };
  });
  gen('v-convert', 'weg', 'm/s und km/h', 1, 2, 1, (r) => {
    const toKmh = r.chance(0.5), a = toKmh ? r.pick([5, 8, 12.5, 15, 20, 25, 30, 35]) : r.pick([18, 36, 45, 54, 72, 90, 108, 130]), v = toKmh ? a * 3.6 : a / 3.6;
    return {
      kicker: 'Einheiten', ask: toKmh ? `Rechne $${fmt(a)}$ m/s in km/h um.` : `Rechne $${fmt(a)}$ km/h in m/s um. Runde auf eine Dezimalstelle.`,
      answer: fields(field('v', 'Ergebnis', v, { d: 1, unit: toKmh ? 'km/h' : 'm/s', traps: [{ value: toKmh ? a / 3.6 : a * 3.6, msg: TRAP.div36 }] })),
      hints: ['1 m/s sind 3,6 km/h.'], solution: [toKmh ? `$${fmt(a)}\\cdot 3{,}6=${fmt(v, 1)}$ km/h` : `$${fmt(a)}:3{,}6${eq(v, 1)}${fmt(v, 1)}$ m/s`], takeaway: 'km/h ist die größere Zahl: von m/s mal 3,6, zurück durch 3,6.',
    };
  });
  gen('v-fastest', 'weg', 'Wann am schnellsten?', 1, 3, 2, (r) => {
    const T = r.pick([40, 50, 60]), m = T * r.pick([0.35, 0.45, 0.55, 0.65]), S = r.pick([300, 400, 600]), s = r.pick([0.16, 0.22, 0.28]) * 60 / T, fn = t => S / (1 + Math.exp(-s * (t - m))) - S / (1 + Math.exp(s * m));
    const top = fn(T) * 1.08;
    return {
      kicker: 'Graph', lead: 'Das Weg-Zeit-Diagramm zeigt eine Fahrt zwischen zwei Haltestellen.', plots: [spec([0, T, 10], niceRange(0, top, 6), { xLabel: 't in s', yLabel: 's in m', curves: [{ fn, tone: 'f', name: 's' }] })], ask: 'Tippe auf die Stelle, an der die Momentangeschwindigkeit **am größten** ist.',
      answer: { type: 'pick', targets: [m], tol: T * 0.08, plot: 0, axis: false, single: true },
      hints: ['Geschwindigkeit ist die Steigung des Graphen.', 'Such die Stelle, an der der Graph am steilsten ist.'], solution: [`Am steilsten ist der Graph bei etwa $t=${fmt(m, 0)}$ s. Dort hat die Tangente die größte Steigung.`], showPlot: { vlines: [m] }, takeaway: 'Am steilsten, nicht am höchsten.',
    };
  });
  gen('v-walk', 'weg', 'Steht, vor oder zurück?', 1, 3, 2, (r) => {
    const legs = r.shuffle([2, 3, 4]).concat(r.shuffle([2, 3])), up1 = r.pick([300, 400, 500]), back = r.pick([200, 300]), up2 = r.pick([100, 200, 300]);
    const t = [0]; legs.slice(0, 4).forEach(d => t.push(t.at(-1) + d));
    const s = [0, up1, up1, up1 - back, up1 - back + up2], pts = t.map((x, i) => [x, s[i]]), g = { pts, S: s[4] }, fn = tripFn(g), iv = i => `$[${t[i]};${t[i + 1]}]$`;
    const kind = r.pick(['stand', 'back']), right = kind === 'stand' ? iv(1) : iv(2);
    return {
      kicker: 'Graph', lead: 'Das Diagramm zeigt die Entfernung einer Läuferin von ihrer Haustür ($t$ in Minuten, $s$ in Metern).', plots: [spec([0, t[4] + 1, 1], [0, Math.ceil(Math.max(...s) / 100 + 1) * 100, 100], { xLabel: 't in min', yLabel: 's in m', curves: [{ fn, tone: 'f', name: 's', to: t[4] }] })],
      ask: kind === 'stand' ? 'In welchem Zeitintervall steht sie still?' : 'In welchem Zeitintervall läuft sie **zurück** in Richtung Haustür?',
      answer: mc(r, right, [iv(0), iv(1), iv(2), iv(3)].filter(x => x !== right)),
      hints: ['Waagrecht heißt: Die Entfernung ändert sich nicht.', 'Fällt der Graph, wird die Entfernung kleiner.'], solution: [kind === 'stand' ? `In ${iv(1)} ist der Graph waagrecht, die Geschwindigkeit ist 0.` : `In ${iv(2)} fällt der Graph, die Entfernung von der Haustür nimmt also ab.`],
    };
  });
  gen('v-brake', 'weg', 'Beschleunigung und Bremsen', 2, 3, 4, (r, st) => {
    const who = r.pick(['einer Radfahrerin', 'eines Busses', 'einer Straßenbahn']), T = r.pick([20, 30, 40, 50]), a = r.pick([0.004, 0.005, 0.006, 0.008]), vEnd = r.int(1, 4), c = [a * T * T + vEnd, -2 * a * T, a], t1 = r.pick([0, 5, 10]), t2 = t1 + r.pick([5, 10]), v1 = polyVal(c, t1), v2 = polyVal(c, t2), m = (v2 - v1) / (t2 - t1);
    const lead = `Die Geschwindigkeit ${who} wird beim Bremsen durch $v(t)=${polyTex(c, 't')}$ beschrieben ($t$ in Sekunden, $v(t)$ in m/s, $0\\le t\\le ${T}$).`;
    if (st === 3 && r.chance(0.5)) {
      const ta = r.pick([2, 5]), tb = T - r.pick([2, 5]), da = Math.abs(polyVal(polyDer(c), ta)), db = Math.abs(polyVal(polyDer(c), tb));
      return { kicker: 'Term', lead, plots: [spec([0, T, 5], niceRange(0, polyVal(c, 0), 6), { xLabel: 't in s', yLabel: 'v in m/s', curves: [{ fn: x => polyVal(c, x), tone: 'f', name: 'v' }] })], ask: `Wann ist die momentane Bremsverzögerung größer?`, answer: mc(r, da > db ? `Nach ${ta} Sekunden` : `Nach ${tb} Sekunden`, [da > db ? `Nach ${tb} Sekunden` : `Nach ${ta} Sekunden`, 'Zu beiden Zeitpunkten gleich groß']), hints: ['Die Bremsverzögerung ist der Betrag der Steigung von $v$.', 'Wo fällt der Graph steiler?'], solution: [`$v'(t)=${polyTex(polyDer(c), 't')}$`, `$|v'(${ta})|=${fmt(da, 3)}$ und $|v'(${tb})|=${fmt(db, 3)}$ (in m/s²)`] };
    }
    return {
      kicker: 'Term', lead, ask: `Berechne die mittlere Beschleunigung im Zeitintervall $[${t1};${t2}]$. Runde auf drei Dezimalstellen.`,
      answer: fields(field('a', '$\\bar a=$', m, { d: 3, traps: [{ value: -m, msg: TRAP.lost }, { value: v2 - v1, msg: TRAP.abs }] }), select(r, 'u', 'Einheit', 'm/s²', ['m/s', 'm', 's/m'])),
      hints: ['Mittlere Beschleunigung: Änderung der Geschwindigkeit durch Änderung der Zeit.', `$v(${t1})=${fmt(v1, 3)}$ und $v(${t2})=${fmt(v2, 3)}$.`],
      solution: [`$v(${t1})=${fmt(v1, 3)}$ und $v(${t2})=${fmt(v2, 3)}$`, `$\\bar a=${dqTex('v', t1, t2, v1, v2, 3)}$ m/s²`, `Die mittlere Bremsverzögerung ist der Betrag davon: $${fmt(Math.abs(m), 3)}$ m/s².`],
    };
  });
  gen('v-match', 'weg', 'Passendes v-t-Diagramm', 2, 3, 5, (r) => {
    const g = bahn(r), M = g.v(g.T / 2), y = niceRange(0, M * 1.12, 4), x = [0, g.T, g.T / 4], base = { xLabel: 't', yLabel: 'v' };
    const opt = fn => ({ plot: spec(x, y, { ...base, curves: [{ fn, tone: 'fp' }] }) });
    const copy = t => g.s(t) / g.S * M, flat = () => M * 0.6, down = t => M * (1 - t / g.T);
    return {
      kicker: 'Graphen', lead: 'Oben siehst du das Weg-Zeit-Diagramm einer Fahrt: Anfahren, Fahren, Bremsen.', plots: [spec([0, g.T, g.T / 4], niceRange(0, g.S, 4), { xLabel: 't', yLabel: 's', curves: [{ fn: g.s, tone: 'f', name: 's' }] })], ask: 'Welches Diagramm zeigt die zugehörige Geschwindigkeit?',
      answer: mc(r, opt(g.v), [opt(copy), opt(flat), opt(down)]),
      hints: ['Die Geschwindigkeit ist die Steigung von $s$. Am Anfang und am Ende ist der Graph waagrecht.'], solution: ['$s$ startet und endet waagrecht, also ist $v$ dort 0. In der Mitte ist $s$ am steilsten, dort hat $v$ den Höchstwert.'],
      takeaway: 'Der $v$-Graph ist keine Kopie des $s$-Graphen: Er zeigt dessen Steigung.',
    };
  });
  gen('v-meaning', 'weg', 'Ausdrücke deuten', 1, 3, 2, (r) => {
    const who = r.pick(['Eine Skifahrerin', 'Ein Rennwagen', 'Eine Sprinterin']), a = r.int(1, 4), b = a + r.pick([2, 3]), n = r.pick([12, 18, 24, 30]), acc = r.pick([1.5, 2.5, 3.5, 7.5]);
    const all = [
      [`s(${b})-s(${a})`, `der in den Sekunden ${a} bis ${b} zurückgelegte Weg in Metern`],
      [`\\frac{s(${b})-s(${a})}{${b - a}}`, `die mittlere Geschwindigkeit im Zeitintervall [${a}; ${b}] in m/s`],
      [`s(${b})`, `der nach ${b} Sekunden zurückgelegte Weg in Metern`],
      [`s'(${b})=${n}`, `die Geschwindigkeit nach ${b} Sekunden, nämlich ${n} m/s`],
      [`v'(${b})=${fmt(acc)}`, `die Beschleunigung nach ${b} Sekunden, nämlich ${fmt(acc)} m/s²`],
      [`v(${b})`, `die Geschwindigkeit nach ${b} Sekunden in m/s`],
    ];
    const [q, right] = r.pick(all), cap = t => t[0].toUpperCase() + t.slice(1);
    return { kicker: 'Interpretieren', lead: `${who} fährt los. Nach $t$ Sekunden sind $s(t)$ Meter zurückgelegt, die Geschwindigkeit beträgt $v(t)$ m/s.`, ask: `Was gibt $${q}$ an?`, answer: mc(r, cap(right), r.sample(all.filter(x => x[0] !== q).map(x => cap(x[1])), 3)), hints: ['$s$: Weg. $s\'=v$: Geschwindigkeit. $v\'$: Beschleunigung.', 'Der Bruch mit Differenz ist immer ein Mittelwert im Intervall.'], solution: [`$${q}$: ${right}.`] };
  });

  // Ableitungsfunktion
  gen('a-values', 'ableitung', 'Steigungen in die Tabelle', 1, 2, 1, (r) => {
    const a = r.pick([0.5, 1, -0.5, -1]), h = r.int(3, 5), v = a > 0 ? r.int(0, 2) : r.int(5, 7), f = x => a * (x - h) ** 2 + v, d = x => 2 * a * (x - h);
    const xs = [h - 2, h, h + 2], plot = spec([0, 8, 1], [0, 8, 1], { equal: true, curves: [{ fn: f, tone: 'f', name: 'f' }], dots: xs.map(x => ({ x, y: f(x), tone: 'tan' })), segs: xs.map(x => ({ a: [x, f(x)], b: [x + 1, f(x) + d(x)], tone: 'tan', ext: 0.7 })) });
    return {
      kicker: 'Graph', plots: [plot], lead: 'An drei Stellen ist die Tangente an $f$ eingezeichnet.', ask: 'Bestimme die Steigungen. Welche Art von Funktion ist dann $f\'$?',
      answer: fields(...xs.map((x, i) => field(`k${i}`, `$f'(${x})=$`, d(x), { traps: [{ value: f(x), msg: TRAP.height }, { value: -d(x), msg: TRAP.lost }] })), select(r, 'type', '$f\'$ ist', 'eine lineare Funktion', ['eine konstante Funktion', 'eine quadratische Funktion'])),
      hints: ['Geh auf der Tangente um 1 nach rechts und schau, wie sich die Höhe ändert.', `Die Steigung an der Stelle $${h}$ ist 0: Die Tangente ist waagrecht.`, 'Die Ableitung einer quadratischen Funktion hat einen Grad weniger.'],
      solution: [...xs.map(x => `$f'(${x})=${fmt(d(x))}$`), 'Die Punkte liegen auf einer Geraden: $f\'$ ist linear.'],
    };
  });
  function rootsShape(r, st) { return shape(r, st === 1 ? 'cubic' : st === 2 ? r.pick(['cubic', 'quartic']) : r.pick(['quartic', 'saddle'])); }
  gen('a-extrema', 'ableitung', 'Extremstellen aus f′', 1, 3, 2, (r, st) => {
    const s = rootsShape(r, st), roots = s.roots.filter(x => !s.touch.some(t => close(t, x, 0.02)));
    return {
      kicker: 'Graph', plots: [plotD(s)], lead: 'Zu sehen ist der Graph der **Ableitungsfunktion** $f\'$.', ask: 'Tippe alle Stellen an, an denen $f$ eine **Extremstelle** hat.',
      answer: { type: 'pick', targets: roots, tol: 0.35, plot: 0, axis: true },
      hints: ['An Extremstellen ist die Steigung 0, also muss $f\'$ dort die $x$-Achse treffen.', 'Das reicht aber nicht: $f\'$ muss dort auch das Vorzeichen **wechseln**.'],
      solution: [`Nullstellen von $f'$ mit Vorzeichenwechsel: $x\\approx ${roots.map(x => fmt(x, 1)).join('$ und $x\\approx ')}$.`, ...(s.touch.length ? [`Bei $x=${fmt(s.touch[0])}$ berührt $f'$ die Achse nur, ohne Vorzeichenwechsel. Dort ist keine Extremstelle.`] : [])],
      showPlot: { vlines: roots },
    };
  });
  gen('a-type', 'ableitung', 'Hoch- oder Tiefpunkt?', 1, 3, 3, (r, st) => {
    const s = rootsShape(r, st), all = [...s.roots.map(x => ({ x })), ...s.touch.map(x => ({ x, touch: true }))].filter(p => !s.touch.some(t => close(t, p.x, 0.02)) || p.touch), p = r.pick(all), left = s.d(p.x - 0.3), right = s.d(p.x + 0.3);
    const answer = p.touch ? 'Kein Extremum, $f\'$ wechselt das Vorzeichen nicht' : left > 0 ? 'Hochpunkt' : 'Tiefpunkt';
    return {
      kicker: 'Graph', plots: [plotD(s, { dots: [{ x: p.x, y: 0, tone: 'tan', label: 'N' }] })], lead: 'Zu sehen ist der Graph von $f\'$.', ask: `Was hat $f$ an der markierten Stelle $N$?`,
      answer: mc(r, answer, ['Hochpunkt', 'Tiefpunkt', 'Kein Extremum, $f\'$ wechselt das Vorzeichen nicht'].filter(x => x !== answer)),
      hints: ['Links von $N$: Ist $f\'$ positiv, steigt $f$ dort.', 'Steigt $f$ zuerst und fällt danach, ist das ein Hochpunkt.'],
      solution: [`Links von $N$ ist $f'$ ${left > 0 ? 'positiv' : 'negativ'}, also ${left > 0 ? 'steigt' : 'fällt'} $f$. Rechts ist $f'$ ${right > 0 ? 'positiv' : 'negativ'}, also ${right > 0 ? 'steigt' : 'fällt'} $f$.`],
    };
  });
  gen('a-mono', 'ableitung', 'Monotonie aus f′', 1, 3, 3, (r, st) => {
    const s = shape(r, st === 1 ? 'cubic' : 'quartic'), [a, b] = s.domain, cuts = [a, ...s.roots, b], zones = cuts.slice(0, -1).map((x, i) => ({ a: x, b: cuts[i + 1], up: s.d((x + cuts[i + 1]) / 2) > 0 }));
    const up = r.chance(0.6), good = r.pick(zones.filter(z => z.up === up)), bad = zones.filter(z => z !== good);
    const iv = z => `$[${fmt(z.a, 1)};${fmt(z.b, 1)}]$`, across = { a: good.a, b: Math.min(b, good.b + 1.2), up: null };
    return {
      kicker: 'Graph', plots: [plotD(s)], lead: 'Zu sehen ist der Graph von $f\'$.', ask: `In welchem Intervall ist $f$ streng monoton ${up ? 'steigend' : 'fallend'}?`,
      answer: mc(r, iv(good), unique([...bad.map(iv), iv(across)]).filter(x => x !== iv(good)).slice(0, 3)),
      hints: [`$f$ ist ${up ? 'steigend' : 'fallend'}, wo $f'$ ${up ? 'über' : 'unter'} der $x$-Achse liegt.`], solution: [`Im Intervall ${iv(good)} liegt $f'$ ${up ? 'über' : 'unter'} der $x$-Achse.`], takeaway: 'Bei $f\'$ schaust du auf die Lage zur $x$-Achse, nicht darauf, ob $f\'$ selbst steigt.',
    };
  });
  gen('a-tf', 'ableitung', 'Aussagen zu f′', 2, 3, 4, (r) => {
    const s = shape(r, 'cubic'), [r1, r2] = s.roots, first = s.d((r1 + r2) / 2) < 0, mid = (r1 + r2) / 2;
    const items = [
      { text: `$f$ hat an der Stelle $${fmt(r1, 0)}$ eine Extremstelle.`, truth: true, why: '$f\'$ wechselt dort das Vorzeichen.' },
      { text: `$f$ hat an der Stelle $${fmt(r1, 0)}$ einen ${first ? 'Tiefpunkt' : 'Hochpunkt'}.`, truth: false, why: `Es ist ein ${first ? 'Hochpunkt' : 'Tiefpunkt'}.` },
      { text: `Aus dem Graphen folgt $f(${fmt(r2, 0)})=0$.`, truth: false, why: 'Eine Nullstelle von $f\'$ heißt nur: waagrechte Tangente. Die Höhe von $f$ kennst du nicht.' },
      { text: `$f$ ${first ? 'fällt' : 'steigt'} im Intervall $[${fmt(r1, 0)};${fmt(r2, 0)}]$.`, truth: true, why: `$f'$ ist dort ${first ? 'negativ' : 'positiv'}.` },
      { text: `$f$ ${first ? 'steigt' : 'fällt'} im Intervall $[${fmt(r1, 0)};${fmt(r2, 0)}]$.`, truth: false, why: `$f'$ ist dort ${first ? 'negativ' : 'positiv'}.` },
      { text: `An der Stelle $${fmt(mid, 1)}$ ist $f$ am ${first ? 'stärksten fallend' : 'stärksten steigend'} (innerhalb von $[${fmt(r1, 0)};${fmt(r2, 0)}]$).`, truth: true, why: `$f'$ hat dort ihren ${first ? 'Tiefpunkt' : 'Hochpunkt'}.` },
    ];
    return { kicker: 'Graph', plots: [plotD(s)], lead: 'Zu sehen ist der Graph von $f\'$.', ask: 'Welche Aussagen über $f$ stimmen?', answer: { type: 'tf', items: r.sample(items, 4) }, hints: ['Lage von $f\'$ zur Achse: steigt oder fällt $f$?', 'Nullstelle von $f\'$ mit Vorzeichenwechsel: Extremstelle von $f$.'], solution: ['Vom Graphen von $f\'$ liest du das **Änderungsverhalten** von $f$ ab, nicht die Funktionswerte.'] };
  });
  const RULES = [
    { q: 'Ist $f$ eine lineare Funktion, dann ist $f\'$ …', right: 'eine konstante Funktion', wrong: ['eine lineare Funktion', 'eine quadratische Funktion', 'immer null'], why: 'Eine Gerade hat überall dieselbe Steigung.' },
    { q: 'Ist $f$ eine quadratische Funktion, dann ist $f\'$ …', right: 'eine lineare Funktion', wrong: ['eine konstante Funktion', 'eine quadratische Funktion', 'eine kubische Funktion'], why: 'Der Grad sinkt beim Ableiten um 1.' },
    { q: 'Für $g(x)=f(x)+4$ gilt:', right: '$g\'(x)=f\'(x)$', wrong: ['$g\'(x)=f\'(x)+4$', '$g\'(x)=4\\cdot f\'(x)$', '$g\'(x)=f(x)$'], why: 'Verschieben nach oben ändert die Steigung nicht.' },
    { q: 'Für $f(x)=\\sin(x)$ gilt:', right: '$f\'(x)=\\cos(x)$', wrong: ['$f\'(x)=-\\cos(x)$', '$f\'(x)=\\sin(x)$', '$f\'(x)=-\\sin(x)$'], why: 'Grafisch: Der Sinus startet bei 0 am steilsten, sein Ableitungsgraph startet also bei 1.' },
    { q: 'Für $f(x)=\\cos(x)$ gilt:', right: '$f\'(x)=-\\sin(x)$', wrong: ['$f\'(x)=\\sin(x)$', '$f\'(x)=\\cos(x)$', '$f\'(x)=-\\cos(x)$'], why: 'Der Cosinus fällt zunächst, sein Ableitungsgraph ist der an der $x$-Achse gespiegelte Sinus.' },
    { q: 'Die Ableitungsfunktion $f\'$ ordnet jeder Stelle $x$ …', right: 'die Steigung von $f$ an der Stelle $x$ zu', wrong: ['den Funktionswert von $f$ zu', 'die mittlere Änderungsrate in $[0;x]$ zu', 'die Fläche unter $f$ zu'], why: 'Das ist die Definition.' },
    { q: 'Wenn $f$ eine Konstante ist, dann ist $f\'$ …', right: 'die Nullfunktion', wrong: ['dieselbe Konstante', 'eine lineare Funktion', 'nicht definiert'], why: 'Ein waagrechter Graph hat überall Steigung 0.' },
  ];
  gen('a-rules', 'ableitung', 'Regeln und Begriffe', 1, 3, 1, (r) => {
    const q = r.pick(RULES);
    return { kicker: 'Verständnis', ask: q.q, answer: mc(r, q.right, q.wrong), hints: ['Denk an die Steigung des Graphen.'], solution: [q.why] };
  });
  gen('a-context', 'ableitung', 'f′ im Sachzusammenhang', 2, 3, 5, (r) => {
    const A = r.pick([1, -1]), r1 = 4 * r.int(1, 2), r2 = r1 + 4 * r.int(2, 3), dc = polyFromRoots([r1, r2], A * 0.2), d = t => polyVal(dc, t), M = Math.max(...minMax(d, 0, 24).map(Math.abs));
    const scale = 2.5 / M, g = t => d(t) * scale, y = niceRange(-3, 3, 6), hochAt = A > 0 ? r1 : r2, tiefAt = A > 0 ? r2 : r1, vertex = (r1 + r2) / 2, asks = r.pick(['high', 'neg']);
    const plot = spec([0, 24, 4], y, { xLabel: 't in h', yLabel: 'S′(t) in m³/h', curves: [{ fn: g, tone: 'fp', name: 'S′' }] });
    const lead = '$S(t)$ ist die Wassermenge in einem Speicher in m³ nach $t$ Stunden. Die Abbildung zeigt die Ableitungsfunktion $S\'$.';
    if (asks === 'high') return { kicker: 'Graph', lead, plots: [plot], ask: 'Zu welchem Zeitpunkt hat die Wassermenge einen **Hochpunkt**?', answer: mc(r, `$t=${hochAt}$`, [`$t=${tiefAt}$`, `$t=${fmt(vertex)}$`, `$t=${hochAt === 4 ? 12 : 4}$`].filter((x, i, l) => x !== `$t=${hochAt}$` && l.indexOf(x) === i)), hints: ['Eine Extremstelle von $S$ ist eine Nullstelle von $S\'$.', 'Beim Hochpunkt wechselt $S\'$ von plus nach minus.'], solution: [`Bei $t=${hochAt}$ wechselt $S'$ von positiv zu negativ: Zuerst nimmt die Wassermenge zu, danach ab.`], takeaway: 'Der höchste Punkt von $S\'$ ist nicht der höchste Punkt von $S$.' };
    const neg = A > 0 ? [r1, r2] : null, pos = A < 0 ? [r1, r2] : null, iv = neg || [r2, 24], meaning = `Die Wassermenge nimmt in diesem Zeitraum ab.`;
    void pos;
    return { kicker: 'Graph', lead, plots: [plot], ask: `Was bedeuten die negativen Werte von $S'$ im Intervall $[${iv[0]};${iv[1]}]$?`, answer: mc(r, meaning, ['Die Wassermenge ist in diesem Zeitraum negativ.', 'Der Speicher ist in diesem Zeitraum leer.', 'Die Wassermenge nimmt in diesem Zeitraum zu.']), hints: ['$S\'$ gibt an, wie schnell sich $S$ ändert.'], solution: ['Negative Änderungsrate heißt: Es fließt mehr Wasser ab als zu.'] };
  });

  // Grafisches Ableiten
  const fpOptions = (s, y, opts) => opts.map(fn => ({ plot: spec([s.domain[0], s.domain[1], 1], y, { yLabel: '', xLabel: '', curves: [{ fn, tone: 'fp' }] }) }));
  function shapeFor(r, st) { return shape(r, st === 1 ? r.pick(['parabola', 'cubic']) : st === 2 ? r.pick(['cubic', 'quartic']) : r.pick(['quartic', 'saddle', 'sine', 'sigmoid', 'bump'])); }
  gen('g-choose', 'grafisch', 'Welcher Graph ist f′?', 1, 3, 3, (r, st) => {
    const s = shapeFor(r, st), M = s.dRange[1], [lo, hi] = minMax(s.f, ...s.domain), mid = (lo + hi) / 2, half = (hi - lo) / 2 || 1;
    const shift = r.pick([1, 1.2]), fn = s.d, wrong = [x => -s.d(x), x => (s.f(x) - mid) / half * M * 0.8, x => s.d(x - shift) * 0.95];
    const [right, ...bad] = fpOptions(s, s.dRange, [fn, ...wrong]), guides = st === 1 ? s.roots : [];
    const plot = plotF(s, { vlines: guides });
    if (guides.length) [right, ...bad].forEach(o => { o.plot.vlines = guides; });
    return {
      kicker: 'Graphen', plots: [plot], ask: 'Welcher der Graphen gehört zur Ableitungsfunktion $f\'$?', answer: mc(r, right, bad),
      hints: ['Wo hat $f$ waagrechte Tangenten? Dort muss $f\'$ die $x$-Achse treffen.', 'Wo $f$ steigt, liegt $f\'$ über der $x$-Achse.'],
      solution: ['Der richtige Graph trifft die $x$-Achse genau dort, wo $f$ eine waagrechte Tangente hat, und liegt dort über der Achse, wo $f$ steigt.'], takeaway: 'Nie die Form von $f$ abzeichnen: Es zählt die Steigung, nicht die Höhe.',
    };
  });
  gen('g-reverse', 'grafisch', 'Von f′ zurück zu f', 2, 3, 5, (r, st) => {
    const s = shapeFor(r, st), y = s.yRange, [lo, hi] = minMax(s.f, ...s.domain), M = Math.max(...minMax(s.d, ...s.domain).map(Math.abs)) || 1;
    const mk = fn => ({ plot: spec([s.domain[0], s.domain[1], 1], y, { xLabel: '', yLabel: '', curves: [{ fn, tone: 'f' }] }) });
    const shift = r.pick([1, 1.2]), mirror = x => lo + hi - s.f(x), copy = x => (lo + hi) / 2 + s.d(x) / M * (hi - lo) * 0.45, shifted = x => s.f(x - shift);
    return { kicker: 'Graphen', plots: [plotD(s)], ask: 'Oben ist $f\'$ gegeben. Welcher Graph kann $f$ sein?', answer: mc(r, mk(s.f), [mk(mirror), mk(copy), mk(shifted)]), hints: ['Nullstellen von $f\'$ mit Vorzeichenwechsel sind Extremstellen von $f$.', 'Liegt $f\'$ über der Achse, muss $f$ dort steigen.'], solution: ['Der richtige Graph steigt genau dort, wo $f\'$ positiv ist, und fällt dort, wo $f\'$ negativ ist.'] };
  });
  gen('g-which', 'grafisch', 'Welche ist die Ableitung?', 2, 3, 4, (r) => {
    const s = shape(r, 'cubic'), [a, b] = s.domain, shift = r.pick([1.4, -1.4, 1.8, -1.8]), amp = r.pick([0.7, 1, 1.2]), lift = r.pick([0.8, -0.8]), other = x => amp * s.d(x - shift) + lift;
    const curves = r.shuffle([{ fn: s.f, role: 'f' }, { fn: s.d, role: 'd' }, { fn: other, role: 'x' }]).map((c, i) => ({ ...c, tone: ['f', 'fp', 'g'][i], name: `(${i + 1})`, id: i + 1 }));
    const all = curves.map(c => minMax(c.fn, a, b)), y = niceRange(Math.min(...all.map(v => v[0])), Math.max(...all.map(v => v[1])), 6);
    const idD = curves.find(c => c.role === 'd').id, idF = curves.find(c => c.role === 'f').id;
    const opts = ['1', '2', '3'], sel = n => ({ options: opts, correct: opts.indexOf(String(n)) });
    return {
      kicker: 'Graphen', plots: [spec([a, b, 1], y, { yLabel: 'y', curves })], ask: 'Ergänze den Satz richtig.',
      answer: { type: 'cloze', parts: ['Funktion', sel(idD), 'ist die Ableitung von Funktion', sel(idF), '.'] },
      hints: ['Such eine Funktion mit waagrechten Tangenten und prüfe: Hat eine andere genau dort eine Nullstelle?', 'Wo die Ausgangsfunktion steigt, muss ihre Ableitung über der $x$-Achse liegen.'],
      solution: [`Funktion (${idD}) hat genau dort Nullstellen, wo Funktion (${idF}) waagrechte Tangenten hat. Also ist (${idD}) die Ableitung von (${idF}).`],
    };
  });
  gen('g-zeros', 'grafisch', 'Schritt 1: Nullstellen von f′', 1, 3, 1, (r, st) => {
    const s = shape(r, st === 1 ? r.pick(['parabola', 'cubic']) : st === 2 ? 'quartic' : r.pick(['saddle', 'sine', 'bump'])), targets = [...s.roots, ...s.touch.filter(t => !s.roots.some(x => close(x, t, 0.02)))].sort((a, b) => a - b);
    return {
      kicker: 'Schritt 1', plots: [plotF(s)], ask: 'Tippe alle Stellen an, an denen $f\'$ eine **Nullstelle** hat.',
      answer: { type: 'pick', targets, tol: 0.35, plot: 0, axis: false },
      hints: ['$f\'(x)=0$ heißt: Die Tangente an $f$ ist waagrecht.', 'Such die Hoch- und Tiefpunkte. Auch ein Sattelpunkt hat eine waagrechte Tangente.'],
      solution: [`Waagrechte Tangenten bei $x\\approx ${targets.map(x => fmt(x, 1)).join('$, $x\\approx ')}$.`], showPlot: { vlines: targets },
    };
  });
  gen('g-signs', 'grafisch', 'Schritt 2: Vorzeichen von f′', 1, 3, 2, (r, st) => {
    const s = shape(r, st === 1 ? r.pick(['parabola', 'cubic']) : st === 2 ? 'quartic' : r.pick(['saddle', 'sine'])), [a, b] = s.domain, cuts = [...s.roots].sort((x, y) => x - y), edges = [a, ...cuts, b];
    const truth = edges.slice(0, -1).map((x, i) => s.d((x + edges[i + 1]) / 2) > 0 ? '+' : '-');
    return {
      kicker: 'Schritt 2', plots: [plotF(s, { vlines: cuts })], ask: 'Tippe die Abschnitte an: Ist $f\'$ dort **positiv** oder **negativ**?',
      answer: { type: 'zones', edges, truth, plot: 0 }, hints: ['Steigt $f$ von links nach rechts, ist $f\'$ positiv.', 'Fällt $f$, ist $f\'$ negativ. Die Höhe von $f$ ist egal.'], solution: ['Das Vorzeichen von $f\'$ hängt nur davon ab, ob $f$ steigt oder fällt.'],
    };
  });
  gen('g-steep', 'grafisch', 'Schritt 3: Steilste Stelle', 1, 3, 2, (r) => {
    const s = shape(r, 'cubic'), [r1, r2] = s.roots, peak = s.peaks.find(p => p.x > r1 && p.x < r2) || { x: (r1 + r2) / 2 }, falling = s.d(peak.x) < 0;
    return {
      kicker: 'Schritt 3', plots: [plotF(s, { bands: [{ a: r1, b: r2 }], vlines: [r1, r2] })], ask: `Tippe im markierten Bereich die Stelle an, an der $f$ am stärksten ${falling ? 'fällt' : 'steigt'}.`,
      answer: { type: 'pick', targets: [peak.x], tol: Math.max(0.35, (r2 - r1) * 0.14), plot: 0, axis: false, single: true },
      hints: ['Such die Stelle, an der der Graph zwischen den beiden Extrempunkten am steilsten aussieht.', 'Dort hat $f\'$ ihren Extremwert.'], solution: [`Bei $x\\approx ${fmt(peak.x, 1)}$ ist die Steigung am größten im Betrag. Dort hat $f'$ einen ${falling ? 'Tiefpunkt' : 'Hochpunkt'}.`], showPlot: { vlines: [peak.x] },
    };
  });
  function sketchAnswer(s, guide) {
    return { type: 'sketch', f: s.f, fp: s.d, domain: s.domain, roots: s.roots, touch: s.touch, peaks: s.peaks, yRange: s.dRange, guide, plotF: plotF(s), plotD: spec([s.domain[0], s.domain[1], 1], s.dRange, { yLabel: 'f′(x)' }) };
  }
  // Names the concrete zeros, sign changes and steepest points instead of a generic remark.
  function sketchSolution(s) {
    const [a, b] = s.domain, one = x => fmt(x, 1), edges = [a, ...s.roots, b], zones = edges.slice(0, -1).map((x, i) => ({ iv: `$[${one(x)};${one(edges[i + 1])}]$`, up: s.d((x + edges[i + 1]) / 2) > 0 }));
    const list = up => zones.filter(z => z.up === up).map(z => z.iv).join(' und '), zeros = [...s.roots, ...s.touch.filter(t => !s.roots.some(x => close(x, t, 0.02)))].sort((x, y) => x - y), out = [];
    out.push(zeros.length ? `Waagrechte Tangenten bei $x\\approx ${zeros.map(one).join('$, $x\\approx ')}$: Dort hat $f'$ Nullstellen.` : 'Keine waagrechte Tangente: $f\'$ hat keine Nullstelle.');
    if (list(true)) out.push(`$f$ steigt auf ${list(true)}: Dort liegt $f'$ über der $x$-Achse.`);
    if (list(false)) out.push(`$f$ fällt auf ${list(false)}: Dort liegt $f'$ unter der $x$-Achse.`);
    if (s.peaks.length) out.push(`Steilste Stellen bei $x\\approx ${s.peaks.map(p => one(p.x)).join('$, $x\\approx ')}$: Dort hat $f'$ ihre Hoch- und Tiefpunkte.`);
    if (s.kind === 'line') out.push('$f$ ist eine Gerade, also ist $f\'$ überall gleich groß.');
    return [...out, 'Die orange Kurve zeigt die richtige Ableitung.'];
  }
  gen('g-sketch', 'grafisch', 'f′ selbst zeichnen', 1, 3, 4, (r, st) => {
    const s = shape(r, st === 1 ? r.pick(['line', 'parabola', 'parabola']) : st === 2 ? 'cubic' : r.pick(['quartic', 'saddle', 'sine', 'sigmoid', 'bump']));
    return {
      kicker: 'Zeichnen', ask: 'Zeichne den Graphen von $f\'$ ins untere Koordinatensystem.',
      answer: sketchAnswer(s, st === 1 ? 'full' : 'none'),
      hints: ['Schritt 1: Wo hat $f$ waagrechte Tangenten? Dort trifft $f\'$ die $x$-Achse.', 'Schritt 2: Wo $f$ steigt, liegt $f\'$ oben, wo $f$ fällt, unten.', 'Schritt 3: Wo $f$ am steilsten ist, hat $f\'$ ihre Hoch- und Tiefpunkte. Die Tangente läuft jetzt mit.'],
      solution: sketchSolution(s),
    };
  });

  // ---- Checking ----
  function checkField(f, raw) {
    if (f.type === 'sel') { if (raw === undefined || raw === null || raw === '') return { state: 'empty' }; const ok = Number(raw) === f.correct; return { state: ok ? 'ok' : 'wrong', msg: ok ? '' : 'Die Auswahl passt noch nicht.' }; }
    if (String(raw ?? '').trim() === '') return { state: 'empty' };
    const candidates = parseNumber(raw);
    if (!candidates.length) return { state: 'wrong', msg: 'Das konnte ich nicht als Zahl lesen.' };
    if (candidates.some(x => Math.abs(x - f.value) <= f.tol + 1e-9)) return { state: 'ok' };
    for (const t of f.traps) if (candidates.some(x => Math.abs(x - t.value) <= Math.max(f.tol, Math.abs(t.value) * 0.004) + 1e-9)) return { state: 'trap', msg: t.msg };
    if (candidates.some(x => Math.abs(x - f.value) <= f.tol * 6 + Math.abs(f.value) * 0.01)) return { state: 'near', msg: 'Knapp daneben. Prüf die Rundung oder rechne etwas genauer.' };
    return { state: 'wrong', msg: '' };
  }
  function crossings(ys, xs, band) { const out = []; let last = 0, lastI = -1; ys.forEach((y, i) => { const s = y > band ? 1 : y < -band ? -1 : 0; if (!s) return; if (last && s !== last) out.push((xs[lastI] + xs[i]) / 2); last = s; lastI = i; }); return out; }
  function corr(a, b) { const n = a.length, ma = a.reduce((s, x) => s + x, 0) / n, mb = b.reduce((s, x) => s + x, 0) / n; let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return aa < 1e-9 || bb < 1e-9 ? 0 : ab / Math.sqrt(aa * bb); }
  // Grades the sketch by the properties the book asks for (zeros, sign, turning points), because a hand sketch is never exact in height.
  function gradeSketch(a, bins) {
    const N = bins.length, [x0, x1] = a.domain, W = x1 - x0, xs = bins.map((_, i) => x0 + (i + 0.5) / N * W);
    const drawn = bins.filter(v => v !== null && v !== undefined).length;
    if (!drawn) return { ok: false, empty: true, score: 0, criteria: [], msgs: ['Zeichne zuerst deinen Graphen.'] };
    if (drawn < N * 0.82) return { ok: false, score: 0, criteria: [{ ok: false, label: 'Zeichne über den ganzen Bereich von links nach rechts.' }], msgs: ['Dein Graph deckt noch nicht den ganzen Bereich ab.'] };
    const filled = [...bins]; let last = null;
    for (let i = 0; i < N; i++) { if (filled[i] === null || filled[i] === undefined) { let j = i; while (j < N && (filled[j] === null || filled[j] === undefined)) j++; const L = last ?? filled[j], R = j < N ? filled[j] : L; for (let m = i; m < j; m++) filled[m] = L + (R - L) * (m - i + 1) / (j - i + 1); i = j - 1; } else last = filled[i]; }
    const ys = filled.map((_, i) => { let s = 0, c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(N - 1, i + 3); j++) { s += filled[j]; c++; } return s / c; });
    const fp = xs.map(a.fp), f = xs.map(a.f), yHi = a.yRange[1], band = yHi * 0.035, tolX = Math.max(0.4, W * 0.07), maxTrue = Math.max(...fp.map(Math.abs)) || 1;
    const criteria = [], c1 = corr(ys, fp), cf = corr(ys, f);
    const realRoots = a.roots.filter(x => !a.touch.some(t => close(t, x, 0.02))), cross = crossings(ys, xs, band), missed = realRoots.filter(x => !cross.some(s => Math.abs(s - x) <= tolX));
    const extra = cross.filter(s => !realRoots.some(x => Math.abs(s - x) <= tolX));
    const zeroScore = realRoots.length || cross.length ? Math.max(0, (realRoots.length - missed.length) / Math.max(realRoots.length, cross.length, 1)) : 1;
    criteria.push({ key: 'zeros', ok: !missed.length && !extra.length, label: realRoots.length ? `Nullstellen von $f'$: ${realRoots.length - missed.length} von ${realRoots.length} passen${extra.length ? `, dazu ${extra.length} zu viel` : ''}` : extra.length ? 'Dein Graph schneidet die $x$-Achse, $f\'$ hat hier aber keine Nullstelle mit Vorzeichenwechsel' : 'Keine Nullstelle mit Vorzeichenwechsel: passt', missed, extra });
    let good = 0, count = 0;
    ys.forEach((y, i) => { if (a.roots.some(x => Math.abs(x - xs[i]) < tolX) || a.touch.some(x => Math.abs(x - xs[i]) < tolX) || Math.abs(fp[i]) < maxTrue * 0.04) return; count++; if ((y > 0) === (fp[i] > 0)) good++; });
    const signRatio = count ? good / count : 1;
    criteria.push({ key: 'sign', ok: signRatio >= 0.88, label: signRatio >= 0.88 ? 'Vorzeichen: passt zu steigend und fallend' : 'Vorzeichen: Wo $f$ steigt, muss $f\'$ über der Achse liegen' });
    let peakScore = 1;
    if (a.peaks.length) {
      const hits = a.peaks.filter(p => { const lo = p.x - W * 0.12, hi = p.x + W * 0.12, idx = xs.map((x, i) => x >= lo && x <= hi ? i : -1).filter(i => i >= 0), vals = idx.map(i => ys[i]), sgn = p.type === 'max' ? 1 : -1, best = Math.max(...vals.map(v => v * sgn)), at = vals.findIndex(v => v * sgn === best), span = Math.max(...ys) - Math.min(...ys) || 1; return at > 0 && at < vals.length - 1 && best - Math.max(vals[0] * sgn, vals.at(-1) * sgn) >= span * 0.04; }).length;
      peakScore = hits / a.peaks.length;
      criteria.push({ key: 'peaks', ok: hits === a.peaks.length, label: `Hoch- und Tiefpunkte von $f'$ an den steilsten Stellen: ${hits} von ${a.peaks.length}` });
    } else { peakScore = c1 > 0.85 || maxTrue < 1e-6 || Math.abs(Math.max(...fp) - Math.min(...fp)) < 1e-6 ? 1 : 0.4; if (Math.max(...fp) - Math.min(...fp) < 1e-6) { const mean = ys.reduce((s, y) => s + y, 0) / N, spread = Math.max(...ys) - Math.min(...ys); peakScore = spread <= maxTrue * 0.6 ? 1 : 0.4; void mean; criteria.push({ key: 'shape', ok: peakScore === 1, label: 'Verlauf: $f\'$ ist konstant, also eine waagrechte Gerade' }); } else criteria.push({ key: 'shape', ok: peakScore === 1, label: 'Verlauf passt zur Form von $f\'$' }); }
    const sumXY = ys.reduce((s, y, i) => s + y * fp[i], 0), sumXX = fp.reduce((s, y) => s + y * y, 0), m = sumXX > 1e-9 ? sumXY / sumXX : 1, heightOk = m >= 0.55 && m <= 1.7;
    criteria.push({ key: 'height', ok: heightOk, soft: true, label: heightOk ? 'Höhe: ungefähr richtig' : m < 0.55 ? 'Höhe: deine Kurve ist etwas zu flach' : 'Höhe: deine Kurve ist etwas zu hoch' });
    const signScore = Math.max(0, (signRatio - 0.5) * 2), score = zeroScore * 0.3 + signScore * 0.3 + peakScore * 0.25 + (heightOk ? 0.15 : 0.05);
    const ok = !missed.length && !extra.length && signRatio >= 0.88 && score >= 0.72;
    const msgs = [];
    if (!ok && cf > 0.86 && c1 < 0.6) msgs.push('Du hast eher $f$ selbst abgezeichnet. Für $f\'$ zählt die **Steigung** von $f$, nicht die Höhe.');
    else if (!ok && c1 < -0.6) msgs.push('Das Vorzeichen ist vertauscht: Wo $f$ steigt, muss $f\'$ über der $x$-Achse liegen.');
    return { ok, score: Math.max(0, Math.min(1, ok ? Math.max(score, 0.85) : score)), criteria, msgs, cross };
  }
  // A booking is right when every side holds the same accounts with the same sums. Split lines on one account are added up.
  const moneyClose = (x, y) => Math.abs(x - y) <= 0.011;
  function bookingSums(lines) {
    const out = new Map();
    for (const l of lines || []) { if (!l?.acc) continue; const v = parseNumber(l.amt)[0]; out.set(l.acc, (out.get(l.acc) || 0) + (Number.isFinite(v) ? v : NaN)); }
    return out;
  }
  function checkBooking(a, res) {
    const soll = bookingSums(res.soll), haben = bookingSums(res.haben);
    if (!soll.size && !haben.size && !res.effect) return { empty: true, ok: false, score: 0, msgs: ['Wähle zuerst die Konten aus.'] };
    const want = side => new Map(a[side].map(l => [l.acc, l.amt])), ws = want('soll'), wh = want('haben');
    const lines = { soll: [], haben: [] }, msgs = [];
    let right = 0, total = ws.size + wh.size;
    for (const [side, got, w, other] of [['soll', soll, ws, wh], ['haben', haben, wh, ws]]) {
      for (const [acc, amt] of got) {
        const exp = w.get(acc), accOk = exp !== undefined, amtOk = accOk && (a.noAmounts || moneyClose(amt, exp));
        lines[side].push({ acc, accOk, amtOk });
        if (accOk && amtOk) right++;
        if (!accOk && other.has(acc)) msgs.push(`${a.accounts.find(x => x.no === acc)?.name || acc} steht auf der falschen Seite: Soll und Haben vertauscht?`);
        else if (accOk && !amtOk) msgs.push(`Der Betrag bei ${acc} stimmt noch nicht.`);
      }
      for (const acc of w.keys()) if (!got.has(acc) && !(other === wh ? haben : soll).has(acc) && acc === '2500') msgs.push('Die Vorsteuer fehlt: Die Umsatzsteuer auf der Rechnung holt sich das Unternehmen vom Finanzamt zurück.');
    }
    const extra = [...soll.keys()].filter(k => !ws.has(k)).length + [...haben.keys()].filter(k => !wh.has(k)).length;
    let effectOk = true;
    if (a.effect) { total++; effectOk = res.effect === a.effect; if (effectOk) right++; else if (res.effect) msgs.push('Die Auswirkung auf das Eigenkapital stimmt nicht.'); else msgs.push('Gib noch die Auswirkung auf das Eigenkapital an.'); }
    const ok = right === total && !extra;
    return { ok, score: Math.max(0, (right - extra) / total), lines, effectOk, msgs: ok ? [] : [...new Set(msgs)] };
  }
  function check(task, response) {
    const a = task.answer;
    if (a.type === 'fields') {
      const results = a.fields.map(f => ({ key: f.key, ...checkField(f, response?.[f.key]) }));
      const right = results.filter(x => x.state === 'ok').length, empty = results.every(x => x.state === 'empty');
      const msgs = results.filter(x => x.msg).map(x => x.msg);
      return { empty, ok: right === results.length, score: right / results.length, fields: results, msgs: [...new Set(msgs)] };
    }
    if (a.type === 'choice') { if (response === null || response === undefined) return { empty: true, ok: false, score: 0, msgs: [] }; const ok = response === a.correct; return { ok, score: ok ? 1 : 0, chosen: response, msgs: [] }; }
    if (a.type === 'multi') { const sel = [...(response || [])].sort((x, y) => x - y); if (!sel.length) return { empty: true, ok: false, score: 0, msgs: [] }; const ok = sel.length === a.correct.length && sel.every((v, i) => v === a.correct[i]), hit = sel.filter(i => a.correct.includes(i)).length, extra = sel.length - hit; return { ok, score: Math.max(0, (hit - extra) / a.correct.length), chosen: sel, msgs: ok ? [] : [`${hit} von ${a.correct.length} richtigen Ausdrücken gewählt${extra ? `, dazu ${extra} falsche` : ''}.`] }; }
    if (a.type === 'tf') { const list = response || []; if (a.items.some((_, i) => list[i] === undefined || list[i] === null)) return { empty: true, ok: false, score: 0, msgs: ['Beantworte zuerst alle Aussagen.'] }; const marks = a.items.map((it, i) => list[i] === it.truth), right = marks.filter(Boolean).length; return { ok: right === marks.length, score: right / marks.length, marks, msgs: [] }; }
    if (a.type === 'cloze') { const blanks = a.parts.filter(p => typeof p !== 'string'), list = response || []; if (blanks.some((_, i) => list[i] === undefined || list[i] === null || list[i] === '')) return { empty: true, ok: false, score: 0, msgs: ['Wähle in jeder Lücke etwas aus.'] }; const marks = blanks.map((p, i) => Number(list[i]) === p.correct), right = marks.filter(Boolean).length; return { ok: right === marks.length, score: right / marks.length, marks, msgs: [] }; }
    if (a.type === 'pick') {
      const picks = [...(response || [])].sort((x, y) => x - y);
      if (!picks.length) return { empty: true, ok: false, score: 0, msgs: ['Tippe zuerst auf den Graphen.'] };
      const used = new Set(); let hit = 0;
      for (const t of a.targets) { const i = picks.findIndex((p, n) => !used.has(n) && Math.abs(p - t) <= a.tol); if (i >= 0) { used.add(i); hit++; } }
      const extra = picks.length - used.size, ok = hit === a.targets.length && !extra;
      return { ok, score: Math.max(0, (hit - extra) / a.targets.length), picks, used: [...used], msgs: ok ? [] : [hit === a.targets.length ? `Das sind ${extra} zu viel.` : a.single ? 'Das ist noch nicht die gesuchte Stelle.' : `${hit} von ${a.targets.length} Stellen gefunden${extra ? `, dazu ${extra} falsche` : ''}.`] };
    }
    if (a.type === 'tangent') {
      const k = response?.k; if (!Number.isFinite(k)) return { empty: true, ok: false, score: 0, msgs: ['Dreh zuerst die Gerade.'] };
      const ratio2 = response.scale ?? 1, diff = Math.abs(deg(Math.atan(k * ratio2)) - deg(Math.atan(a.k * ratio2))), ok = diff <= a.tolDeg;
      return { ok, score: ok ? 1 : diff <= a.tolDeg * 2 ? 0.5 : 0, diff, k, msgs: ok ? [] : [diff <= a.tolDeg * 2 ? 'Fast. Dreh die Gerade noch etwas genauer.' : k * a.k < 0 ? 'Die Richtung stimmt nicht: Steigt der Graph hier oder fällt er?' : 'Die Gerade ist noch zu steil oder zu flach.'] };
    }
    if (a.type === 'zones') { const list = response || []; if (a.truth.some((_, i) => !list[i])) return { empty: true, ok: false, score: 0, msgs: ['Markiere zuerst alle Abschnitte.'] }; const marks = a.truth.map((t, i) => list[i] === t), right = marks.filter(Boolean).length; return { ok: right === marks.length, score: right / marks.length, marks, msgs: [] }; }
    if (a.type === 'sketch') return gradeSketch(a, response || []);
    if (a.type === 'booking') return checkBooking(a, response || {});
    if (a.type === 'selfcheck') { const n = response?.ticks ?? null; if (n === null) return { empty: true, ok: false, score: 0, msgs: [] }; return { ok: n === a.checklist.length, score: n / a.checklist.length, msgs: [] }; }
    throw new Error(`Unbekannter Aufgabentyp ${a.type}`);
  }

  // ---- Task creation and progress for one course (a list of generators and its topics) ----
  const emptyProgress = () => ({ topics: {}, test: { best: 0, last: 0, at: 0, runs: 0 } });
  function engine(GENS, TOPIC_IDS) {
    const genById = id => GENS.find(g => g.id === id);
    function makeTask(id, stage, seed) {
      const g = genById(id), st = Math.min(g.max, Math.max(g.min, stage)), r = makeRng(seed);
      return { lead: '', hints: [], solution: [], plots: [], ...g.make(r, st), gen: id, topic: g.topic, label: g.label, stage: st, seed };
    }
    function validateProgress(raw) {
      const out = emptyProgress();
      for (const id of TOPIC_IDS) { const t = raw?.topics?.[id]; if (t && typeof t === 'object') out.topics[id] = { score: Math.min(100, Math.max(0, Math.round(Number(t.score)) || 0)), seen: Math.max(0, Math.trunc(Number(t.seen)) || 0), right: Math.max(0, Math.trunc(Number(t.right)) || 0), at: Number(t.at) || 0 }; }
      const t = raw?.test;
      if (t && typeof t === 'object') out.test = { best: Math.max(0, Math.min(100, Number(t.best) || 0)), last: Math.max(0, Math.min(100, Number(t.last) || 0)), at: Number(t.at) || 0, runs: Math.max(0, Math.trunc(Number(t.runs)) || 0) };
      return out;
    }
    function stats(progress) {
      const out = { total: TOPIC_IDS.length, safe: 0, almost: 0, practice: 0, fresh: 0, solved: 0 };
      let sum = 0;
      for (const id of TOPIC_IDS) { const t = progress.topics[id], l = levelOf(t); sum += t?.score || 0; out.solved += t?.right || 0; if (l === 3) out.safe++; else if (l === 2) out.almost++; else if (l === 1) out.practice++; else out.fresh++; }
      out.progress = Math.round(sum / TOPIC_IDS.length);
      return out;
    }
    // Mixed rounds alternate topics and lean towards weak or long-unseen ones: mixing similar problem types is what the research rewards.
    function planMix(progress, size, random = Math.random, now = Date.now()) {
      const out = [];
      const weight = id => { const t = progress.topics[id]; return 8 + (100 - (t?.score || 0)) + Math.min(30, (now - (t?.at || 0)) / 864e5 * 4); };
      for (let i = 0; i < size; i++) {
        const pool = TOPIC_IDS.filter(id => id !== out.at(-1) && out.filter(x => x === id).length < Math.ceil(size / 3));
        let roll = random() * pool.reduce((s, id) => s + weight(id), 0), chosen = pool[0];
        for (const id of pool) { roll -= weight(id); if (roll <= 0) { chosen = id; break; } }
        out.push(chosen);
      }
      return out;
    }
    // Foundation tasks come first while a topic is new; later the generators are drawn at random.
    function pickGen(topic, stage, used = [], random = Math.random) {
      const all = GENS.filter(g => g.topic === topic && g.min <= stage && g.max >= stage);
      const fresh = all.filter(g => !used.includes(g.id)), pool = fresh.length ? fresh : all;
      if (stage === 1) return [...pool].sort((a, b) => a.rank - b.rank)[0];
      return pool[Math.floor(random() * pool.length)];
    }
    return { GENS, TOPIC_IDS, genById, makeTask, validateProgress, stats, planMix, pickGen };
  }
  const TOPIC_IDS = ['mittlere', 'momentan', 'winkel', 'sach', 'weg', 'ableitung', 'grafisch'];
  const E = engine(GENS, TOPIC_IDS), { genById, makeTask, validateProgress, stats, planMix, pickGen } = E;
  const stageFor = score => score < 35 ? 1 : score < 70 ? 2 : 3;
  const levelOf = t => !t?.seen ? 0 : t.score < 40 ? 1 : t.score < 80 ? 2 : 3;
  function applyResult(progress, topic, score, stage, now = Date.now()) {
    const t = progress.topics[topic] || { score: 0, seen: 0, right: 0, at: 0 };
    const delta = score >= 1 ? 12 + stage * 4 : score > 0 ? 5 : -10;
    progress.topics[topic] = { score: Math.min(100, Math.max(0, t.score + delta)), seen: t.seen + 1, right: t.right + (score >= 1 ? 1 : 0), at: now };
    return progress.topics[topic];
  }
  // ---- Test simulation: tasks with one shared context and several parts, in the style of the practice test ----
  function testBahn(r) {
    const g = bahn(r), [t1, t2] = bahnInterval(r, g, 2), s1 = g.s(t1), s2 = g.s(t2), v = (s2 - s1) / (t2 - t1), t0 = g.step * r.int(1, g.n - 1);
    return {
      title: `Fahrt ${g.who}`, lead: `Der zurückgelegte Weg ${g.who} kann durch die Funktion $s$ beschrieben werden: $s(t)=${g.tex}$ mit $0\\le t\\le ${g.T}$ ($t$ in Sekunden, $s(t)$ in Metern).`,
      parts: [
        { points: 2, ask: `Berechne die mittlere Geschwindigkeit im Zeitintervall $[${t1};${t2}]$.`, answer: fields(field('v', '$\\bar v=$', v, { unit: 'm/s', traps: dqTraps(s1, s2, t2 - t1) })), solution: [`$\\bar v=${dqTex('s', t1, t2, s1, s2, 2)}$ m/s`] },
        { points: 2, ask: `Berechne die Momentangeschwindigkeit zum Zeitpunkt $t=${t0}$ s.`, answer: fields(field('v', `$v(${t0})=$`, g.v(t0), { unit: 'm/s' })), solution: [`$s'(t)=${g.dtex}$`, `$v(${t0})${eq(g.v(t0), 2)}${fmt(g.v(t0), 2)}$ m/s`] },
        { points: 1, plots: [bahnPlot(g)], ask: 'Das Diagramm zeigt die Fahrt. Tippe auf den Zeitpunkt, zu dem die Momentangeschwindigkeit maximal ist.', answer: { type: 'pick', targets: [g.T / 2], tol: g.T * 0.08, plot: 0, axis: false, single: true }, solution: [`Am steilsten ist der Graph bei $t=${fmt(g.T / 2)}$ s.`] },
        { points: 2, ask: 'Erkläre, wie du die Momentangeschwindigkeit in diesem Weg-Zeit-Diagramm ablesen kannst.', answer: { type: 'selfcheck', model: 'Die Momentangeschwindigkeit ist die Steigung der Tangente an den Graphen zum betreffenden Zeitpunkt.', checklist: ['Das Wort Tangente oder Steigung kommt vor', 'Es geht um einen bestimmten Zeitpunkt'] }, solution: [] },
      ],
    };
  }
  const TEST_TABLES = [
    { title: 'Bremsweg', lead: 'Der Bremsweg eines Autos hängt von der Geschwindigkeit ab.', xh: 'Geschwindigkeit in km/h', yh: 'Bremsweg in m', xs: [30, 50, 70, 90, 110, 130], y: [9, 25, 49, 81, 121, 169], yu: 'm', xu: 'km/h', meaning: (a, b, v) => `Erhöht man die Geschwindigkeit von ${a} auf ${b} km/h, wird der Bremsweg im Mittel um ${v} m pro km/h länger.` },
    { title: 'Wasserhahn', lead: 'Ein Becken wird über einen immer weiter geöffneten Hahn gefüllt.', xh: 'Zeit in s', yh: 'Wassermenge in L', xs: [0, 10, 20, 30, 40, 50], y: [0, 6, 16, 30, 48, 70], yu: 'L', xu: 's', meaning: (a, b, v) => `Von Sekunde ${a} bis ${b} fließen im Mittel ${v} L pro Sekunde zu.` },
    { title: 'Radfahren', lead: 'Der Kalorienverbrauch beim Radfahren hängt von der Leistung ab.', xh: 'Leistung in Watt', yh: 'Verbrauch in kcal/h', xs: [50, 100, 150, 200, 250, 300], y: [240, 400, 570, 730, 900, 1060], yu: 'kcal/h', xu: 'Watt', meaning: (a, b, v) => `Erhöht man die Leistung von ${a} auf ${b} Watt, steigt der Verbrauch im Mittel um ${v} kcal/h pro Watt.` },
  ];
  function testTabelle(r) {
    const t = r.pick(TEST_TABLES), n = t.xs.length, i = r.int(0, 1), j = r.int(n - 2, n - 1), dx = t.xs[j] - t.xs[i], dy = t.y[j] - t.y[i], v = dy / dx, shown = fmt(v, 2), a = t.xs[i], b = t.xs[j];
    return {
      title: t.title, lead: t.lead, table: { rows: [[t.xh, ...t.xs.map(x => fmt(x))], [t.yh, ...t.y.map(x => fmt(x))]] },
      parts: [
        { points: 2, ask: `Berechne die mittlere Änderungsrate zwischen ${fmt(a)} und ${fmt(b)}.`, answer: fields(field('v', 'Änderungsrate', v, { traps: dqTraps(t.y[i], t.y[j], dx) })), solution: [`$\\frac{${fmt(t.y[j])}-${fmt(t.y[i])}}{${fmt(b)}-${fmt(a)}}=\\frac{${fmt(dy)}}{${fmt(dx)}}${eq(v, 2)}${shown}$`] },
        { points: 1, ask: 'Wähle die passende Einheit.', answer: mc(r, `${t.yu} pro ${t.xu}`, [`${t.xu} pro ${t.yu}`, t.yu, t.xu]), solution: [`Einheit: ${t.yu} pro ${t.xu}`] },
        { points: 2, ask: 'Interpretiere das Ergebnis im gegebenen Sachzusammenhang.', answer: { type: 'selfcheck', model: t.meaning(fmt(a), fmt(b), shown), checklist: ['Das Intervall ist genannt', '„im Mittel“ oder „durchschnittlich“ kommt vor'] }, solution: [] },
      ],
    };
  }
  function testDiagramm(r) {
    const T = 30, v = r.pick([6, 8, 10, 12]), t2 = r.pick([20, 25]), s2 = v * t2, A = v * t2 / Math.PI * 0.45, c = waveCurve(0, 0, t2, s2, -A), yMax = Math.ceil(c.f(T) / 40 + 1) * 40, kmh = v * 3.6, who = r.pick(['eines Mopeds', 'eines Autos', 'einer Motorradfahrerin']);
    return {
      title: 'Weg-Zeit-Diagramm', lead: `Das Diagramm zeigt den Weg ${who} kurz nach der Abfahrt.`, plots: [spec([0, T, 5], [0, yMax, 40], { xLabel: 't in s', yLabel: 's in m', curves: [{ fn: x => Math.max(0, c.f(x)), tone: 'f', name: 's' }] })],
      parts: [
        { points: 2, ask: `Ermittle die mittlere Geschwindigkeit in den ersten ${t2} Sekunden in km/h.`, answer: fields(field('v', '$\\bar v=$', kmh, { d: 1, tol: 3.6, unit: 'km/h', traps: [{ value: v, msg: TRAP.kmh }, { value: v / 3.6, msg: TRAP.div36 }] })), solution: [`$\\frac{${fmt(s2)}-0}{${t2}-0}=${fmt(v)}$ m/s`, `$${fmt(v)}\\cdot 3{,}6=${fmt(kmh, 1)}$ km/h`] },
        { points: 1, ask: `Lies den zurückgelegten Weg nach ${t2} Sekunden ab.`, answer: fields(field('s', `$s(${t2})=$`, s2, { d: 0, tol: 10, unit: 'm' })), solution: [`$s(${t2})=${fmt(s2)}$ m`] },
      ],
    };
  }
  function testJahr(r) {
    const c = r.pick([
      { title: 'Tageslänge', lead: 'Die Abbildung zeigt die Tageslänge in einer Stadt im Lauf eines Jahres.', y: [6, 18, 2], yl: 'L(t) in h', F: 'L', A: 4.2, B: 12.2, thr: 14, u: 'h', w: 'Tageslänge', unit: 'Stunden pro Tag' },
      { title: 'Seetemperatur', lead: 'Die Abbildung zeigt die Wassertemperatur eines Sees im Lauf eines Jahres.', y: [0, 28, 4], yl: 'S(t) in °C', F: 'S', A: 11, B: 13, thr: 16, u: '°C', w: 'Wassertemperatur', unit: '°C pro Tag' },
    ]);
    const peak = c.F === 'L' ? 172 : 205, fn = t => c.B + c.A * Math.cos(2 * Math.PI * (t - peak) / 365), [lo, hi] = signRoots(t => fn(t) - c.thr, 0, 365), a = r.pick([0, 30, 60]), b = a + r.pick([60, 90, 120]), q = (fn(b) - fn(a)) / (b - a);
    return {
      title: c.title, lead: c.lead, plots: [spec([0, 360, 30], c.y, { xLabel: 't in Tagen', yLabel: c.yl, curves: [{ fn, tone: 'f', name: c.F }] })],
      parts: [
        { points: 2, ask: `Lies das Zeitintervall ab, in dem die ${c.w} mindestens ${c.thr} ${c.u} beträgt (Grenzen in Tagen).`, answer: fields(field('a', 'von Tag', lo, { d: 0, tol: 10 }), field('b', 'bis Tag', hi, { d: 0, tol: 10 })), solution: [`Etwa $[${fmt(lo, 0)};${fmt(hi, 0)}]$`] },
        { points: 2, ask: `Es gilt $\\frac{${c.F}(${b})-${c.F}(${a})}{${b - a}}\\approx ${fmt(q, 2)}$. Interpretiere das Ergebnis mit Einheit.`, answer: { type: 'selfcheck', model: `Von Tag ${a} bis Tag ${b} ${q > 0 ? 'steigt' : 'sinkt'} die ${c.w} im Mittel um etwa ${fmt(Math.abs(q), 2)} ${c.unit}.`, checklist: ['Das Intervall ist genannt', '„im Mittel“ oder „durchschnittlich“ kommt vor', `Die Einheit ${c.unit} kommt vor`] }, solution: [] },
      ],
    };
  }
  function testPolynom(r) {
    const c = r.pick([
      { title: 'Produktionskosten', F: 'K', x: 'x', xn: 'produzierte Stück', yu: '€', pro: 'Stück', co: [200, 8, -0.04, 0.0004], a: 50, b: 100, x0: 60 },
      { title: 'Benzinverbrauch', F: 'B', x: 'x', xn: 'gefahrene Kilometer', yu: 'L', pro: 'Kilometer', co: [0, 0.07, 0.0001, 0.0000004], a: 40, b: 90, x0: 70 },
      { title: 'Stromkosten', F: 'K', x: 'x', xn: 'verbrauchte kWh', yu: '€', pro: 'kWh', co: [15, 0.32, -0.0002, 0], a: 100, b: 300, x0: 200 },
    ]);
    const ya = polyVal(c.co, c.a), yb = polyVal(c.co, c.b), v = (yb - ya) / (c.b - c.a), dc = polyDer(c.co), m = polyVal(dc, c.x0), dec = Math.abs(v) < 1 ? 4 : 2;
    return {
      title: c.title, lead: `Gegeben ist $${c.F}(${c.x})=${polyTex(c.co, c.x)}$ ($${c.x}$ ... ${c.xn}, $${c.F}(${c.x})$ in ${c.yu}).`,
      parts: [
        { points: 2, ask: `Berechne die mittlere Änderung pro ${c.pro} im Intervall $[${c.a};${c.b}]$.`, answer: fields(field('v', 'Mittlere Änderung', v, { d: dec, unit: `${c.yu} pro ${c.pro}`, traps: dqTraps(ya, yb, c.b - c.a) })), solution: [`$${c.F}(${c.a})${eq(ya, 4)}${fmt(ya, 4)}$ und $${c.F}(${c.b})${eq(yb, 4)}${fmt(yb, 4)}$`, `$\\frac{${fmt(yb, 4)}-${fmt(ya, 4)}}{${c.b - c.a}}${eq(v, dec)}${fmt(v, dec)}$`] },
        { points: 2, ask: `Berechne $${c.F}'(${c.x0})$ (Technologie ist erlaubt).`, answer: fields(field('m', `$${c.F}'(${c.x0})=$`, m, { d: dec, unit: `${c.yu} pro ${c.pro}` })), solution: [`$${c.F}'(${c.x})=${polyTex(dc, c.x)}$`, `$${c.F}'(${c.x0})${eq(m, dec)}${fmt(m, dec)}$`] },
      ],
    };
  }
  function testSkizze(r) {
    const s = shape(r, r.pick(['cubic', 'quartic']));
    return { title: 'Grafisch ableiten', lead: 'Oben ist der Graph einer Funktion $f$ gegeben.', parts: [{ points: 4, ask: 'Skizziere den Verlauf von $f\'$ im unteren Koordinatensystem.', answer: sketchAnswer(s, 'none'), solution: sketchSolution(s) }] };
  }
  function testKreuz(r) {
    const t = makeTask('dq-statements', 3, r.int(1, 1e9));
    return { title: 'Aussagen zum Graphen', lead: '', plots: t.plots, parts: [{ points: 2, ask: 'Kreuze an, ob die Aussagen richtig oder falsch sind.', answer: t.answer, solution: t.solution }] };
  }
  function buildTest(seed, size = 'full') {
    const r = makeRng(seed);
    const list = size === 'short' ? [r.pick([testBahn, testPolynom]), r.pick([testJahr, testDiagramm, testTabelle]), testSkizze] : [testBahn, testTabelle, testDiagramm, testJahr, testPolynom, testSkizze, testKreuz];
    const out = list.map((make, n) => { const t = make(makeRng(r.int(1, 2 ** 31))); return { lead: '', plots: [], ...t, parts: t.parts.map((p, i) => ({ ...p, id: `${n}-${i}`, label: String.fromCharCode(97 + i) })) }; });
    return { seed, size, tasks: out, points: out.flatMap(t => t.parts).reduce((sum, p) => sum + p.points, 0) };
  }

  const kit = { field, select, fields, mc, unique, makeRng, round, fmt, close, repeat };
  return { engine, kit, emptyProgress, checkBooking, TOPIC_IDS, GENS, rich, texHtml, escHtml, makeRng, round, fmt, par, parseNumber, polyVal, polyDer, polyFromRoots, polyTex, signRoots, localExtrema, minMax, niceRange, hermite, waveCurve, shape, knotShape, spec, genById, makeTask, check, checkField, gradeSketch, emptyProgress, validateProgress, stageFor, levelOf, applyResult, stats, planMix, pickGen, buildTest };
});
