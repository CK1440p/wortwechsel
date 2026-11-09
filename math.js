// Mathe: screens, graphs and interactive tools. Task logic and checking live in mathcore.js.
(() => {
  const M = window.WWMath;
  const { rich, fmt } = M;
  const TOPICS = [
    { id: 'mittlere', title: 'Differenzenquotient', sub: 'Mittlere Änderungsrate und Sekante', lab: 'secant', intro: 'Wie stark ändert sich eine Größe im Schnitt über ein ganzes Intervall?',
      rules: [['Absolute Änderung', '$f(z)-f(x)$', 'Um wie viel sich der Funktionswert im Intervall $[x;z]$ insgesamt ändert.'], ['Mittlere Änderungsrate', '$\\frac{f(z)-f(x)}{z-x}=\\frac{\\Delta f}{\\Delta x}$', 'Die Änderung pro Einheit von $x$. Anderer Name: Differenzenquotient.'], ['Als Bild', 'Steigung der Sekante', 'Die Sekante ist die Gerade durch die beiden Randpunkte des Intervalls.'], ['Relative Änderung', '$\\frac{f(z)-f(x)}{f(x)}$', 'Die Änderung im Verhältnis zum Startwert, meist in Prozent.']],
      pitfalls: ['Der Differenzenquotient gehört immer zu einem **Intervall**, nie zu einer einzelnen Stelle.', 'Positiv heißt nur: Am Ende liegt der Wert höher als am Anfang. Zwischendurch darf die Funktion fallen.', 'Oben und unten in derselben Reihenfolge rechnen: rechter Rand minus linker Rand.'] },
    { id: 'momentan', title: 'Differentialquotient', sub: 'Momentane Änderungsrate und Tangente', lab: 'secant', intro: 'Wie stark ändert sich eine Größe genau an einer Stelle?',
      rules: [['Differentialquotient', '$f\'(x)=\\lim_{z\\to x}\\frac{f(z)-f(x)}{z-x}$', 'Der Grenzwert der mittleren Änderungsraten, wenn das Intervall immer kleiner wird.'], ['Als Bild', 'Steigung der Tangente', 'Die Tangente berührt den Graphen an der Stelle $x$ und hat dort dieselbe Richtung.'], ['Andere Schreibweise', '$f\'(x)=\\frac{df}{dx}=\\lim_{\\Delta x\\to 0}\\frac{\\Delta f}{\\Delta x}$', 'Gelesen: df nach dx.'], ['Mit Technologie', '$f\'(2)$', 'In GeoGebra die Funktion eingeben und dann f\'(2) schreiben. Am TI gibt es nDeriv im MATH-Menü.']],
      pitfalls: ['**Höhe ist nicht Steigung:** $f(2)$ ist die Höhe des Graphen, $f\'(2)$ die Steigung der Tangente dort.', 'Fällt der Graph von links nach rechts, ist die Steigung negativ.', 'Ein Punkt kann hoch liegen und trotzdem eine kleine Steigung haben.'] },
    { id: 'winkel', title: 'Steigungswinkel', sub: 'Von der Steigung zum Winkel und zurück', lab: 'angle', intro: 'Jede Steigung gehört zu genau einem Winkel mit der $x$-Achse.',
      rules: [['Winkel zu Steigung', '$k=f\'(x)=\\tan(\\alpha)$', 'Die Tangentensteigung ist der Tangens des Steigungswinkels.'], ['Steigung zu Winkel', '$\\alpha=\\arctan(k)$', 'Am Taschenrechner meist SHIFT oder 2ND und dann TAN.'], ['Steigung in Prozent', '$p\\,\\%$ bedeutet $k=\\frac{p}{100}$', '$100\\,\\%$ Steigung sind $k=1$, also $45°$.'], ['Vorzeichen', '$k<0$ und $\\alpha<0$', 'Fällt die Tangente, sind Steigung und Winkel negativ.']],
      pitfalls: ['Taschenrechner auf **Grad** (DEG) stellen.', '12 % Steigung heißt $k=0{,}12$, nicht $k=12$.', 'Höhe und waagrechte Entfernung müssen in derselben Einheit stehen.'] },
    { id: 'sach', title: 'Im Sachzusammenhang', sub: 'Bedeutung und Einheit angeben', lab: null, intro: 'Eine Zahl allein ist keine Interpretation: Es braucht Stelle oder Intervall, Richtung, Wert und Einheit.',
      rules: [['Einheit der Änderungsrate', '$\\frac{\\text{Einheit von }f}{\\text{Einheit von }x}$', 'Zum Beispiel °C pro Minute. Das gilt für $f\'$ und für den Differenzenquotienten.'], ['Satz für ein Intervall', 'Von … bis … steigt … **im Mittel** um … pro …', 'Für den Differenzenquotienten.'], ['Satz für eine Stelle', 'Nach … steigt … **momentan** um … pro …', 'Für den Differentialquotienten.'], ['Vorzeichen', '$T\'(10)<0$', '$T$ nimmt an dieser Stelle ab. Nicht $T$ ist negativ, sondern die Änderung.']],
      pitfalls: ['Immer dazusagen: wann oder wo, was, wie viel und in welcher Einheit.', 'Eine Differenz ohne Division ist die Gesamtänderung, keine Rate.', 'Bei Kosten oder Verbrauch sagt man statt „momentan“ besser „lokal“.'] },
    { id: 'weg', title: 'Weg und Geschwindigkeit', sub: 'Mittlere und momentane Geschwindigkeit', lab: 'motion', intro: 'Geschwindigkeit ist die Änderungsrate des Weges, Beschleunigung die Änderungsrate der Geschwindigkeit.',
      rules: [['Mittlere Geschwindigkeit', '$\\bar v=\\frac{s(t_2)-s(t_1)}{t_2-t_1}$', 'Gesamtweg durch Gesamtzeit im Intervall.'], ['Momentangeschwindigkeit', '$v(t)=s\'(t)$', 'Die Steigung des Weg-Zeit-Graphen zum Zeitpunkt $t$.'], ['Beschleunigung', '$a(t)=v\'(t)$', 'Einheit m/s². Die Bremsverzögerung ist der Betrag einer negativen Beschleunigung.'], ['Umrechnen', 'm/s $\\cdot 3{,}6$ = km/h', 'Von km/h nach m/s durch 3,6 dividieren.']],
      pitfalls: ['Im Weg-Zeit-Diagramm ist die Geschwindigkeit die **Steigung**, nicht die Höhe.', 'Waagrechtes Stück: Stillstand. Fallendes Stück: Es geht zurück.', 'Die mittlere Geschwindigkeit ist nicht der Durchschnitt mehrerer Geschwindigkeiten. Stehzeiten zählen mit.'] },
    { id: 'ableitung', title: 'Ableitungsfunktion', sub: 'Von f zu f′', lab: 'derive', intro: '$f\'$ ordnet jeder Stelle die Steigung von $f$ an dieser Stelle zu.',
      rules: [['Extremstellen', 'Extremstelle von $f$: Nullstelle von $f\'$', 'Dazu muss $f\'$ dort das Vorzeichen wechseln.'], ['Monotonie', '$f$ steigt: $f\'>0$, $f$ fällt: $f\'<0$', 'Du schaust auf die Lage von $f\'$ zur $x$-Achse.'], ['Der Grad sinkt um 1', 'linear → konstant, quadratisch → linear', 'Kubische Funktionen haben quadratische Ableitungen.'], ['Merken', '$(f+c)\'=f\'$, $\\sin\'=\\cos$, $\\cos\'=-\\sin$', 'Verschieben nach oben ändert keine Steigung.']],
      pitfalls: ['Eine Nullstelle von $f\'$ sagt nichts über die **Höhe** von $f$.', 'Ohne Vorzeichenwechsel gibt es keine Extremstelle, nur einen Sattelpunkt.', 'Der höchste Punkt von $f\'$ ist die steilste Stelle von $f$, nicht ihr höchster Punkt.'] },
    { id: 'grafisch', title: 'Grafisches Ableiten', sub: 'f′ ohne Rechnen skizzieren', lab: 'derive', intro: 'Du brauchst keine Werte: Extremstellen, Monotonie und steilste Stellen reichen für die Skizze.',
      rules: [['Schritt 1', 'Waagrechte Tangenten suchen', 'Wo $f$ die Steigung 0 hat, hat $f\'$ eine Nullstelle.'], ['Schritt 2', 'Steigt oder fällt $f$?', 'Wo $f$ steigt, liegt $f\'$ über der $x$-Achse, wo $f$ fällt, darunter.'], ['Schritt 3', 'Steilste Stellen suchen', 'Dort hat $f\'$ ihre Hoch- und Tiefpunkte.'], ['Schritt 4', 'Glatt verbinden', 'Eine Skizze zeigt den ungefähren Verlauf. Die genaue Höhe ist nicht wichtig.']],
      pitfalls: ['Nicht den Graphen von $f$ abzeichnen: Die Höhe von $f$ spielt keine Rolle.', 'Die Nullstellen von $f\'$ liegen senkrecht unter den Extrempunkten von $f$.', 'An einem Sattelpunkt berührt $f\'$ die Achse nur.'] },
  ];
  const topicById = id => TOPICS.find(t => t.id === id);
  const LEVELS = ['Neu', 'Üben', 'Fast', 'Sicher'], STAGES = ['', 'Geführt', 'Selbstständig', 'Testniveau'];
  const FIG = {
    mittlere: '<path d="M6 48C22 46 28 12 58 8"/><path class="a" d="M3 46 62 12"/><circle class="d" cx="13" cy="41" r="3.6"/><circle class="d" cx="50" cy="19.5" r="3.6"/>',
    momentan: '<path d="M6 48C22 46 28 12 58 8"/><path class="a" d="M8 46 56 11"/><circle class="d" cx="30" cy="30" r="3.6"/>',
    winkel: '<path d="M8 46H58"/><path class="a" d="M8 46 52 12"/><path d="M26 46A18 18 0 0 0 22.3 35"/>',
    sach: '<path d="M8 6V48H58"/><path class="a" d="M14 40C26 38 34 20 54 14"/><path d="M40 40h12M46 34v12" opacity=".0"/>',
    weg: '<path d="M8 6V48H58"/><path class="a" d="M10 46C24 46 26 14 42 12H58"/>',
    ableitung: '<path d="M6 20C16 2 24 2 32 14S48 30 58 10"/><path class="a" d="M6 34C14 48 22 54 32 44S50 34 58 48"/>',
    grafisch: '<path d="M6 20C16 2 24 2 32 14S48 30 58 10"/><path class="a" stroke-dasharray="2 6" d="M6 40C18 28 22 50 34 44S50 34 58 46"/>',
  };
  const fig = id => `<svg class="m-fig" viewBox="0 0 64 56" aria-hidden="true">${FIG[id]}</svg>`;

  // ---- Graphs ----
  let plotCounter = 0;
  const phone = () => (window.innerWidth || 1200) < 540;
  const margins = mini => mini ? { l: 8, r: 8, t: 10, b: 22 } : { l: 44, r: 18, t: 24, b: 32 };
  function plotSize(s) {
    if (s?.equal) { const W = phone() ? 440 : 460, m = margins(false), iw = W - m.l - m.r; return { W, H: Math.round(iw * (s.y[1] - s.y[0]) / (s.x[1] - s.x[0]) + m.t + m.b) }; }
    return phone() ? { W: 440, H: 320 } : { W: 720, H: 360 };
  }
  function frame(s, W, H, mini = false) {
    const m = margins(mini), [x0, x1] = s.x, [y0, y1] = s.y, iw = W - m.l - m.r, ih = H - m.t - m.b;
    return { W, H, m, iw, ih, px: x => m.l + (x - x0) / (x1 - x0) * iw, py: y => m.t + ih - (y - y0) / (y1 - y0) * ih, ix: X => x0 + (X - m.l) / iw * (x1 - x0), iy: Y => y0 + (m.t + ih - Y) / ih * (y1 - y0) };
  }
  const ticks = ([a, b, step]) => { const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(M.round(v, 6)); return out; };
  const n1 = v => v.toFixed(1);
  function curvePath(fr, s, fn, from = s.x[0], to = s.x[1], count = 260) {
    const span = s.y[1] - s.y[0], lo = s.y[0] - span, hi = s.y[1] + span; let d = '';
    for (let i = 0; i <= count; i++) { const x = from + (to - from) * i / count, y = fn(x); if (!Number.isFinite(y)) continue; d += `${d ? 'L' : 'M'}${n1(fr.px(x))} ${n1(fr.py(Math.min(hi, Math.max(lo, y))))}`; }
    return d;
  }
  function lineThrough(fr, s, x, y, k) { const a = s.x[0], b = s.x[1]; return `M${n1(fr.px(a))} ${n1(fr.py(y + k * (a - x)))}L${n1(fr.px(b))} ${n1(fr.py(y + k * (b - x)))}`; }
  const vline = (fr, x, cls = 'p-vline') => `<line class="${cls}" x1="${n1(fr.px(x))}" x2="${n1(fr.px(x))}" y1="${fr.m.t}" y2="${fr.m.t + fr.ih}"/>`;
  function extrasSvg(fr, s, o, clip) {
    let out = '';
    for (const x of o.vlines || []) out += vline(fr, x);
    for (const seg of o.segs || []) { const [ax, ay] = seg.a, [bx, by] = seg.b, k = (by - ay) / (bx - ax), ext = seg.ext || 0, x1 = ax - ext, x2 = bx + ext; out += `<line clip-path="url(#${clip})" class="p-seg p-${seg.tone || 'sec'}" x1="${n1(fr.px(x1))}" y1="${n1(fr.py(ay + k * (x1 - ax)))}" x2="${n1(fr.px(x2))}" y2="${n1(fr.py(ay + k * (x2 - ax)))}"/>`; }
    for (const t of o.tris || []) {
      const A = [fr.px(t.x), fr.py(t.y)], B = [fr.px(t.x + t.dx), fr.py(t.y)], C = [fr.px(t.x + t.dx), fr.py(t.y + t.dy)];
      out += `<path class="p-tri p-${t.tone || 'sec'}" d="M${n1(A[0])} ${n1(A[1])}L${n1(B[0])} ${n1(B[1])}L${n1(C[0])} ${n1(C[1])}Z"/><text class="p-t p-tl" text-anchor="middle" x="${n1((A[0] + B[0]) / 2)}" y="${n1(A[1] + (t.dy >= 0 ? 17 : -8))}">${fmt(t.dx)}</text><text class="p-t p-tl" x="${n1(B[0] + 7)}" y="${n1((B[1] + C[1]) / 2 + 5)}">${fmt(Math.abs(t.dy))}</text>`;
    }
    for (const d of o.dots || []) {
      // The label goes to the side where the curve is not: upper left on a rising graph, upper right on a falling one.
      const fn = s.curves[0]?.fn, rising = fn ? fn(d.x + 0.05) >= fn(d.x - 0.05) : false;
      out += `<circle class="p-dot p-${d.tone || 'sec'}" cx="${n1(fr.px(d.x))}" cy="${n1(fr.py(d.y))}" r="${d.small ? 3.4 : 5.4}"/>${d.label ? `<text class="p-t p-dl" text-anchor="${rising ? 'end' : 'start'}" x="${n1(fr.px(d.x) + (rising ? -9 : 9))}" y="${n1(fr.py(d.y) - 9)}">${M.escHtml(d.label)}</text>` : ''}`;
    }
    return out;
  }
  function plotSvg(s, { W, H, mini = false } = plotSize(s)) {
    const fr = frame(s, W, H, mini), id = `m-clip-${++plotCounter}`, xs = ticks(s.x), ys = ticks(s.y), [x0, x1] = s.x, [y0, y1] = s.y;
    const axisY = y0 <= 0 && y1 >= 0 ? 0 : y0, axisX = x0 <= 0 && x1 >= 0 ? 0 : x0;
    const stepPx = fr.iw / ((x1 - x0) / s.x[2]), every = Math.max(1, Math.ceil((mini ? 26 : 34) / stepPx)), stepPy = fr.ih / ((y1 - y0) / s.y[2]), everyY = Math.max(1, Math.ceil(20 / stepPy));
    let out = `<defs><clipPath id="${id}"><rect x="${fr.m.l}" y="${fr.m.t}" width="${fr.iw}" height="${fr.ih}"/></clipPath></defs>`;
    for (const b of s.bands) out += `<rect class="p-band" x="${n1(fr.px(b.a))}" y="${fr.m.t}" width="${n1(fr.px(b.b) - fr.px(b.a))}" height="${fr.ih}"/>`;
    for (const x of xs) out += `<line class="p-grid" x1="${n1(fr.px(x))}" x2="${n1(fr.px(x))}" y1="${fr.m.t}" y2="${fr.m.t + fr.ih}"/>`;
    for (const y of ys) out += `<line class="p-grid" y1="${n1(fr.py(y))}" y2="${n1(fr.py(y))}" x1="${fr.m.l}" x2="${fr.m.l + fr.iw}"/>`;
    const ax = fr.px(axisX), ay = fr.py(axisY);
    out += `<path class="p-axis" d="M${fr.m.l} ${n1(ay)}H${fr.m.l + fr.iw + 8}"/><path class="p-arrow" d="M${fr.m.l + fr.iw + 13} ${n1(ay)}l-8 -4v8z"/><path class="p-axis" d="M${n1(ax)} ${fr.m.t + fr.ih}V${fr.m.t - 8}"/><path class="p-arrow" d="M${n1(ax)} ${fr.m.t - 13}l-4 8h8z"/>`;
    xs.forEach((x, i) => { if ((axisX === 0 && x === 0 && axisY === 0 && !mini) || (i % every && xs.length > 2)) return; out += `<text class="p-t" text-anchor="middle" x="${n1(fr.px(x))}" y="${n1(Math.min(H - 4, ay + (mini ? 15 : 19)))}">${fmt(x)}</text>`; });
    if (!mini) ys.forEach((y, i) => { if ((axisX === 0 && Math.abs(fr.py(y) - ay) < 16) || i % everyY) return; out += `<text class="p-t" text-anchor="end" x="${n1(ax - 7)}" y="${n1(fr.py(y) + 5)}">${fmt(y)}</text>`; });
    if (!mini && axisX === 0 && axisY === 0) out += `<text class="p-t" text-anchor="end" x="${n1(ax - 7)}" y="${n1(ay + 17)}">0</text>`;
    if (s.xLabel) out += `<text class="p-t p-al" text-anchor="end" x="${fr.m.l + fr.iw + 4}" y="${n1(ay - 8)}">${M.escHtml(s.xLabel)}</text>`;
    if (s.yLabel) out += `<text class="p-t p-al" x="${n1(ax + 8)}" y="${fr.m.t - 6}">${M.escHtml(s.yLabel)}</text>`;
    let curves = '';
    s.curves.forEach(c => {
      curves += `<path class="p-curve p-${c.tone || 'f'}" pathLength="1" d="${curvePath(fr, s, c.fn, c.from ?? x0, c.to ?? x1)}"/>`;
      if (c.name && !mini) for (let t = 0.92; t > 0.1; t -= 0.05) { const x = x0 + (x1 - x0) * t, y = c.fn(x); if (y > y0 + (y1 - y0) * 0.06 && y < y1 - (y1 - y0) * 0.1) { curves += `<text class="p-t p-name p-${c.tone || 'f'}" text-anchor="middle" x="${n1(fr.px(x))}" y="${n1(fr.py(y) - 11)}">${M.escHtml(c.name)}</text>`; break; } }
    });
    out += `<g clip-path="url(#${id})">${curves}</g>${extrasSvg(fr, s, s, id)}<g class="m-guide"></g><g class="m-dyn" data-clip="${id}"></g>`;
    return `<svg class="m-plot${mini ? ' mini' : ''}${s.equal ? ' equal' : ''}" data-w="${W}" data-h="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Funktionsgraph">${out}</svg>`;
  }
  function tableHtml(t) {
    if (!t) return '';
    const row = t.head === 'row';
    return `<div class="m-table-wrap"><table class="m-table${row ? ' rows' : ''}"><tbody>${t.rows.map((r, i) => `<tr>${r.map((c, j) => (row ? i === 0 : j === 0) ? `<th scope="${row ? 'col' : 'row'}">${rich(c)}</th>` : `<td${c === '?' ? ' class="m-q"' : ''}>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const svgPos = (svg, e) => { const r = svg.getBoundingClientRect(), W = Number(svg.dataset.w), H = Number(svg.dataset.h); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  function onDrag(svg, handle, end) {
    let active = false;
    svg.addEventListener('pointerdown', e => { active = true; try { svg.setPointerCapture(e.pointerId); } catch {} handle(svgPos(svg, e), true); e.preventDefault(); });
    svg.addEventListener('pointermove', e => { if (active) handle(svgPos(svg, e), false); });
    const stop = () => { if (active) { active = false; end?.(); } };
    svg.addEventListener('pointerup', stop); svg.addEventListener('pointercancel', stop);
    // iOS can still start a scroll from inside the graph unless the first touch is cancelled.
    svg.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  }
  const frameOf = (svg, s) => frame(s, Number(svg.dataset.w), Number(svg.dataset.h));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const deg = r => r * 180 / Math.PI;

  window.WWMathApp = { create(ctx) {
    const { $, esc, icon, toast, confirm, transition, reduced, shell, save, ring, levelLegend, levelBar, streak, countAnswer } = ctx;
    const progress = () => ctx.data().math;
    let round = null, exam = null, live = null, labStop = null, examTimer = null;
    const widgets = {};
    const fine = () => !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    const stopLab = () => { labStop?.(); labStop = null; };
    const stopTimer = () => { if (examTimer) { clearInterval(examTimer); examTimer = null; } };
    function leave() { round = null; exam = null; live = null; stopLab(); stopTimer(); }
    const levelChip = id => { const t = progress().topics[id], l = M.levelOf(t); return `<span class="qa-level l${l}"><i></i>${LEVELS[l]}</span>`; };
    const score = id => progress().topics[id]?.score || 0;

    function heroArt() {
      const f = x => 0.55 * Math.sin(x * 1.25) * 34 + 62 - x * 5, d = x => 0.55 * 1.25 * Math.cos(x * 1.25) * 34 - 5, X = x => 8 + x * 38;
      let path = ''; for (let i = 0; i <= 60; i++) { const x = i / 60 * 5.4; path += `${i ? 'L' : 'M'}${n1(X(x))} ${n1(f(x))}`; }
      let anim = '';
      if (!reduced()) {
        const trans = [], rot = [];
        for (let i = 0; i <= 80; i++) { const x = 0.5 + 4.4 * (0.5 - 0.5 * Math.cos(i / 80 * 2 * Math.PI)); trans.push(`${n1(X(x))} ${n1(f(x))}`); rot.push(n1(deg(Math.atan(d(x) / 38)))); }
        anim = [`<animateTransform attributeName="transform" type="translate" dur="9s" repeatCount="indefinite" values="${trans.join(';')}"/>`, `<animateTransform attributeName="transform" type="rotate" dur="9s" repeatCount="indefinite" values="${rot.join(';')}"/>`];
      }
      return `<div class="hero-art m-art" aria-hidden="true"><svg viewBox="0 0 224 130"><path class="m-art-grid" d="M0 22H224M0 58H224M0 94H224M46 0V130M84 0V130M122 0V130M160 0V130M198 0V130"/><path class="m-art-curve" d="${path}"/><g transform="translate(${n1(X(2.7))} ${n1(f(2.7))})">${anim[0] || ''}<g>${anim[1] || ''}<line class="m-art-tan" x1="-62" x2="62" y1="0" y2="0"/><circle class="m-art-dot" r="5.5"/></g></g></svg></div>`;
    }
    function home() {
      leave(); shell('math', 'Übersicht');
      const p = progress(), s = M.stats(p), own = ctx.catalogs();
      const order = [...TOPICS].sort((a, b) => score(a.id) - score(b.id)), weakest = order[0], started = s.solved > 0 || Object.keys(p.topics).length > 0;
      $('#main').innerHTML = `<section class="page-intro"><div><h1>Mathe<span class="blue-dot">.</span></h1><p>Differentialrechnung · ${TOPICS.length} Themen · immer neue Aufgaben</p></div><button class="button primary" data-action="m-formulas">${icon('book')}Formeln</button></section>
        <section class="dashboard-grid"><div class="focus-card m-focus"><div class="focus-copy"><div class="hero-tag"><span class="pulse-dot"></span>${started ? 'EMPFOHLEN' : 'LOS GEHT’S'}</div><h2>Gemischt üben</h2><p>8 Aufgaben aus allen Themen, ${started ? `mehr von „${esc(weakest.title)}“` : 'die Schwächen zuerst'}. Fühlt sich schwerer an, bleibt aber länger.</p><div class="hero-actions"><button class="button white" data-action="m-mix">${icon('spark')}Üben${icon('arrow')}</button><button class="button glass" data-action="m-test">${icon('clock')}Test simulieren</button></div></div>${heroArt()}</div>
        <aside class="progress-card qa-progress-card"><div class="section-kicker">DEIN STAND ${icon('chart')}</div><div class="qa-progress-body">${ring(s.progress, 'gelernt')}${levelLegend(s)}</div><div class="stat-duo"><div><span class="stat-icon flame">${icon('flame')}</span><strong>${streak()} <small>${streak() === 1 ? 'Tag' : 'Tage'}</small></strong><p>in Folge gelernt</p></div><div><span class="stat-icon lavender">${icon('clock')}</span><strong>${p.test.at ? `${p.test.last}<small>%</small>` : '–'}</strong><p>${p.test.at ? 'letzter Test' : 'noch kein Test'}</p></div></div></aside></section>
        <section class="library-section"><div class="section-heading"><div><h2>Themen <span class="count-badge">${TOPICS.length}</span></h2></div></div><div class="set-grid m-topic-grid">${TOPICS.map((t, i) => { const sc = score(t.id); return `<article class="set-card" style="--i:${i}"><div class="set-card-top"><div class="set-emoji tone-${i % 3}">${fig(t.id)}</div>${levelChip(t.id)}</div><button class="set-title" data-action="m-topic" data-topic="${t.id}">${esc(t.title)}</button><div class="set-meta">${esc(t.sub)}</div><div class="set-progress-label"><span>Fortschritt</span><strong>${sc}%</strong></div><div class="mini-progress"><span style="width:${sc}%"></span></div><div class="set-card-footer"><button class="text-button" data-action="m-topic" data-topic="${t.id}">Verstehen und üben</button><button class="round-button" data-action="m-start" data-topic="${t.id}" aria-label="${esc(t.title)} üben">${icon('arrow')}</button></div></article>`; }).join('')}</div></section>
        ${own.length ? `<section class="library-section"><div class="section-heading"><div><h2>Eigene Fragenkataloge <span class="count-badge">${own.length}</span></h2></div></div><div class="set-grid">${own.map(c => `<article class="set-card"><div class="set-card-top"><div class="set-emoji tone-0">${esc(c.emoji)}</div></div><button class="set-title" data-action="qa-open" data-catalog="${esc(c.id)}">${esc(c.title)}</button><div class="set-card-footer"><button class="text-button" data-action="qa-open" data-catalog="${esc(c.id)}">Fragen ansehen</button></div></article>`).join('')}</div></section>` : ''}`;
    }
    function topicPage(id) {
      stopLab(); round = null;
      const t = topicById(id), sc = score(id), gens = M.GENS.filter(g => g.topic === id).sort((a, b) => a.rank - b.rank || a.min - b.min);
      shell('math-topic', t.title);
      $('#main').innerHTML = `<button class="back-link" data-action="m-home">${icon('back')} Mathe</button><section class="set-page-heading"><div class="set-emoji big">${fig(id)}</div><div><div class="eyebrow">THEMA ${TOPICS.indexOf(t) + 1} VON ${TOPICS.length}</div><h1>${esc(t.title)}</h1><p>${rich(t.intro)}</p></div></section>
        <div class="set-actions"><button class="button primary" data-action="m-start" data-topic="${id}">${icon('spark')}${sc ? 'Weiterüben' : 'Üben starten'}</button><button class="button secondary" data-action="m-mix">Gemischt üben</button></div>
        <section class="mastery-panel m-mastery"><div class="m-mastery-main">${levelChip(id)}<div class="mini-progress"><span style="width:${sc}%"></span></div></div><div class="m-mastery-side"><strong>${sc}%</strong><span>${progress().topics[id]?.right || 0} gelöst</span></div></section>
        <section class="m-section"><h2>Das Wichtigste</h2><div class="m-rules">${t.rules.map(([title, formula, text], i) => `<article class="m-rule" style="--i:${i}"><span>${esc(title)}</span><div class="m-formula">${rich(formula)}</div><p>${rich(text)}</p></article>`).join('')}</div></section>
        ${t.lab ? `<section class="m-section"><h2>Ausprobieren</h2><div class="m-lab" id="m-lab"></div></section>` : ''}
        <section class="m-section"><h2>Typische Fehler</h2><ul class="m-pitfalls">${t.pitfalls.map(x => `<li>${rich(x)}</li>`).join('')}</ul></section>
        <section class="m-section"><h2>Gezielt üben</h2><div class="m-gens">${gens.map(g => `<button class="qa-filter-chip" data-action="m-gen" data-gen="${g.id}">${esc(g.label)}</button>`).join('')}</div></section>
        <div class="set-danger-zone"><button class="text-button" data-action="m-reset" data-topic="${id}">Fortschritt zurücksetzen</button></div>`;
      if (t.lab) mountLab(t.lab, $('#m-lab'));
    }
    function formulas() {
      leave(); shell('math-formulas', 'Formeln');
      $('#main').innerHTML = `<section class="page-intro"><div><h1>Formeln<span class="blue-dot">.</span></h1><p>Alles Wichtige für den Test auf einer Seite.</p></div></section>
        <section class="m-section"><h2>${rich("Von $f$ zu $f'$")}</h2></section><div class="m-table-wrap"><table class="m-table rows m-dict"><tbody><tr><th>Graph von ${rich('$f$')}</th><th>Graph von ${rich("$f'$")}</th></tr>${[['steigt', 'liegt über der $x$-Achse'], ['fällt', 'liegt unter der $x$-Achse'], ['Hoch- oder Tiefpunkt', 'Nullstelle mit Vorzeichenwechsel'], ['Sattelpunkt', 'berührt die $x$-Achse'], ['steilste Stelle', 'Hoch- oder Tiefpunkt'], ['Gerade', 'waagrechte Gerade'], ['nach oben verschoben', 'bleibt gleich']].map(([a, b]) => `<tr><td>${rich(a)}</td><td>${rich(b)}</td></tr>`).join('')}</tbody></table></div>
        ${TOPICS.map(t => `<section class="m-section"><h2>${esc(t.title)}</h2><div class="m-rules">${t.rules.map(([title, formula, text], i) => `<article class="m-rule" style="--i:${i}"><span>${esc(title)}</span><div class="m-formula">${rich(formula)}</div><p>${rich(text)}</p></article>`).join('')}</div></section>`).join('')}`;
    }

    // ---- Interactive answers ----
    function answerHtml(t, pid) {
      const a = t.answer;
      if (a.type === 'fields') return `<div class="m-fields">${a.fields.map(f => {
        const id = `m-${pid}-${f.key}`;
        if (f.type === 'sel') return `<div class="m-field" data-key="${f.key}"><label class="m-field-label" for="${id}">${rich(f.label)}</label><div class="m-input m-select"><select id="${id}"><option value="">Wählen …</option>${f.options.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join('')}</select></div><p class="m-field-msg"></p></div>`;
        return `<div class="m-field" data-key="${f.key}"><label class="m-field-label" for="${id}">${rich(f.label)}</label><div class="m-input"><button type="button" class="m-plusminus" data-action="m-sign" tabindex="-1" aria-label="Vorzeichen wechseln">±</button><input id="${id}" class="m-num" type="text" inputmode="decimal" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done">${f.unit ? `<span class="m-unit">${rich(f.unit)}</span>` : ''}</div><p class="m-field-msg"></p></div>`;
      }).join('')}</div>`;
      if (a.type === 'choice' || a.type === 'multi') {
        const graphs = a.options.some(o => o.plot), size = phone() ? { W: 280, H: 190, mini: true } : { W: 340, H: 200, mini: true };
        return `<div class="qa-choices m-choices${graphs ? ' m-choices-graph' : ''}">${a.options.map((o, i) => `<button class="choice-button qa-choice${o.plot ? ' m-graph-opt' : ''}" data-action="m-opt" data-part="${pid}" data-i="${i}" aria-pressed="false"><span class="choice-key">${a.type === 'multi' ? '' : i + 1}</span><span>${o.plot ? plotSvg(o.plot, size) : rich(o.text)}</span><span class="choice-result"></span></button>`).join('')}</div>`;
      }
      if (a.type === 'tf') return `<div class="m-tf">${a.items.map((it, i) => `<div class="m-tf-row" data-row="${i}"><div class="m-tf-text">${rich(it.text)}<p class="m-tf-why"></p></div><div class="m-tf-btns"><button data-action="m-tf" data-part="${pid}" data-i="${i}" data-v="1" aria-pressed="false">Richtig</button><button data-action="m-tf" data-part="${pid}" data-i="${i}" data-v="0" aria-pressed="false">Falsch</button></div></div>`).join('')}</div>`;
      if (a.type === 'cloze') { let n = -1; return `<p class="m-cloze">${a.parts.map(p => { if (typeof p === 'string') return `<span>${rich(p)}</span>`; n++; return `<select data-blank="${n}" aria-label="Lücke ${n + 1}"><option value="">…</option>${p.options.map((o, i) => `<option value="${i}">${esc(o)}</option>`).join('')}</select>`; }).join(' ')}</p>`; }
      if (a.type === 'pick') return `<p class="m-tool-hint">${icon('spark')}<span>${a.single ? 'Tippe auf den Graphen.' : 'Tippe auf den Graphen, nochmal tippen entfernt die Markierung.'}</span></p>`;
      if (a.type === 'tangent') return `<p class="m-tool-hint">${icon('spark')}<span>${rich('Zieh am Graphen, die Gerade dreht sich um $P$.')}</span></p>`;
      if (a.type === 'zones') return '';
      if (a.type === 'sketch') { const size = phone() ? { W: 440, H: 230 } : { W: 720, H: 240 }; return `<div class="m-sketch"><div class="m-plot-wrap" data-role="top">${plotSvg(a.plotF, size)}</div><div class="m-plot-wrap m-draw" data-role="bottom">${plotSvg(a.plotD, size)}<span class="m-draw-hint">${icon('edit')}Hier zeichnen</span></div><div class="m-draw-tools"><span class="m-tool-note">Einfach drüberzeichnen, um etwas auszubessern.</span><button type="button" class="qa-filter-chip" data-action="m-clear" data-part="${pid}">Löschen</button></div><ul class="m-criteria" hidden></ul></div>`; }
      if (a.type === 'selfcheck') return `<textarea class="qa-typed m-text" rows="3" placeholder="Dein Satz …" aria-label="Deine Antwort"></textarea><div class="m-compare" hidden><div class="qa-solution"><div class="qa-solution-label">${icon('book')}So könnte es lauten</div><div class="qa-answer"><p>${rich(a.model)}</p></div></div><div class="m-ticks">${a.checklist.map((c, i) => `<label class="m-tick"><input type="checkbox" data-tick="${i}"><span class="m-tick-ui" aria-hidden="true">${icon('check')}</span><span>${rich(c)}</span></label>`).join('')}</div></div>`;
      return '';
    }
    function mount(root, t, pid, onChange = () => {}) {
      const a = t.answer, host = root.querySelector(`[data-answer="${pid}"]`), plotWrap = i => root.querySelector(`[data-plots="${pid}"] [data-plot="${i}"]`);
      const base = { read: () => null, show() {}, lock() {}, final() {}, hint() {} };
      const mark = (el, cls) => { el?.classList.remove('ok', 'bad'); if (cls) el?.classList.add(cls); };
      if (a.type === 'fields') {
        const input = f => host.querySelector(`[data-key="${f.key}"] ${f.type === 'sel' ? 'select' : 'input'}`);
        a.fields.forEach(f => input(f).addEventListener(f.type === 'sel' ? 'change' : 'input', () => { mark(input(f).closest('.m-field')); input(f).closest('.m-field').querySelector('.m-field-msg').innerHTML = ''; onChange(); }));
        return { ...base, read: () => Object.fromEntries(a.fields.map(f => [f.key, input(f).value])),
          show(res) { res.fields.forEach((r, i) => { const box = input(a.fields[i]).closest('.m-field'); mark(box, r.state === 'ok' ? 'ok' : r.state === 'empty' ? '' : 'bad'); box.querySelector('.m-field-msg').innerHTML = r.msg ? rich(r.msg) : ''; }); },
          lock() { a.fields.forEach(f => { input(f).disabled = true; }); host.querySelectorAll('.m-plusminus').forEach(b => { b.disabled = true; }); },
          final(res) { res.fields.forEach((r, i) => { const f = a.fields[i], box = input(f).closest('.m-field'); if (r.state !== 'ok') box.querySelector('.m-field-msg').innerHTML = `${r.msg ? `${rich(r.msg)} ` : ''}<strong>Richtig: ${f.type === 'sel' ? esc(f.options[f.correct]) : `${rich(`$${fmt(f.value, Math.max(f.d, 2))}$`)}${f.unit ? ` ${rich(f.unit)}` : ''}`}</strong>`; }); } };
      }
      if (a.type === 'choice' || a.type === 'multi') {
        const btns = [...host.querySelectorAll('[data-action="m-opt"]')], picked = new Set();
        return { ...base, choose(i) { if (a.type === 'choice') picked.clear(); if (picked.has(i)) picked.delete(i); else picked.add(i); btns.forEach((b, n) => b.setAttribute('aria-pressed', String(picked.has(n)))); onChange(); },
          read: () => a.type === 'choice' ? (picked.size ? [...picked][0] : null) : [...picked], lock() { btns.forEach(b => { b.disabled = true; }); },
          final() { const right = a.type === 'choice' ? [a.correct] : a.correct; btns.forEach((b, n) => { b.setAttribute('aria-pressed', 'false'); b.classList.remove('is-correct', 'is-wrong', 'is-dim'); if (right.includes(n)) { b.classList.add('is-correct'); b.querySelector('.choice-result').innerHTML = icon('check'); } else if (picked.has(n)) b.classList.add('is-wrong'); else b.classList.add('is-dim'); }); } };
      }
      if (a.type === 'tf') {
        const state = a.items.map(() => null), rows = [...host.querySelectorAll('.m-tf-row')];
        return { ...base, set(i, v) { state[i] = v; mark(rows[i]); rows[i].querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.v === '1') === v))); onChange(); }, read: () => [...state],
          show(res) { res.marks?.forEach((ok, i) => mark(rows[i], ok ? 'ok' : 'bad')); }, lock() { rows.forEach(r => r.querySelectorAll('button').forEach(b => { b.disabled = true; })); },
          final(res) { res.marks?.forEach((ok, i) => { mark(rows[i], ok ? 'ok' : 'bad'); rows[i].querySelector('.m-tf-why').innerHTML = `${a.items[i].truth ? 'Richtig.' : 'Falsch.'}${a.items[i].why ? ` ${rich(a.items[i].why)}` : ''}`; }); } };
      }
      if (a.type === 'cloze') {
        const sels = [...host.querySelectorAll('select')], blanks = a.parts.filter(p => typeof p !== 'string');
        sels.forEach(s => s.addEventListener('change', () => { mark(s); onChange(); }));
        return { ...base, read: () => sels.map(s => s.value), show(res) { res.marks?.forEach((ok, i) => mark(sels[i], ok ? 'ok' : 'bad')); }, lock() { sels.forEach(s => { s.disabled = true; }); }, final(res) { res.marks?.forEach((ok, i) => { mark(sels[i], ok ? 'ok' : 'bad'); sels[i].value = String(blanks[i].correct); }); } };
      }
      if (a.type === 'pick') {
        const wrap = plotWrap(a.plot), svg = wrap.querySelector('svg'), s = t.plots[a.plot], fr = frameOf(svg, s), dyn = svg.querySelector('.m-dyn'), picks = [];
        let locked = false, states = null;
        wrap.classList.add('m-pickable');
        const fn = s.curves[0]?.fn, yAt = x => a.axis ? 0 : fn(x);
        const paint = hover => { dyn.innerHTML = `${hover != null ? vline(fr, hover, 'p-hover') : ''}${picks.map((x, i) => `${vline(fr, x, `p-pick ${states ? (states[i] ? 'ok' : 'bad') : ''}`)}<circle class="p-mark ${states ? (states[i] ? 'ok' : 'bad') : ''}" cx="${n1(fr.px(x))}" cy="${n1(fr.py(clamp(yAt(x), s.y[0], s.y[1])))}" r="7"/>`).join('')}`; };
        svg.addEventListener('click', e => { if (locked) return; const x = clamp(fr.ix(svgPos(svg, e).x), s.x[0], s.x[1]), near = picks.findIndex(p => Math.abs(fr.px(p) - fr.px(x)) < (phone() ? 22 : 14)); if (a.single) picks[0] = x; else if (near >= 0) picks.splice(near, 1); else picks.push(x); states = null; paint(); onChange(); });
        svg.addEventListener('pointermove', e => { if (!locked && e.pointerType === 'mouse') paint(clamp(fr.ix(svgPos(svg, e).x), s.x[0], s.x[1])); });
        svg.addEventListener('pointerleave', () => { if (!locked) paint(); });
        const sorted = () => [...picks].sort((x, y) => x - y);
        return { ...base, read: () => sorted(), show(res) { picks.splice(0, picks.length, ...sorted()); states = picks.map((_, i) => res.used?.includes(i)); paint(); }, lock() { locked = true; wrap.classList.remove('m-pickable'); },
          final() { dyn.insertAdjacentHTML?.('afterbegin', a.targets.map(x => vline(fr, x, 'p-truth')).join('')); } };
      }
      if (a.type === 'tangent') {
        const wrap = plotWrap(a.plot), svg = wrap.querySelector('svg'), s = t.plots[a.plot], fr = frameOf(svg, s), dyn = svg.querySelector('.m-dyn'), P = [fr.px(a.x0), fr.py(a.y0)];
        const unit = (fr.iw / (s.x[1] - s.x[0])) / (fr.ih / (s.y[1] - s.y[0]));
        const trueAngle = Math.atan(a.k / unit);
        let angle = Math.abs(trueAngle) < 0.26 ? 0.6 : 0, moved = false, locked = false, truth = '';
        wrap.classList.add('m-grab');
        wrap.insertAdjacentHTML?.('beforeend', a.live ? '<span class="m-live"></span>' : '');
        const chip = wrap.querySelector('.m-live'), slope = () => Math.tan(angle) * unit;
        const paint = () => {
          const L = fr.W * 1.4, c = Math.cos(angle), sn = Math.sin(angle), box = { l: fr.m.l + 12, r: fr.m.l + fr.iw - 12, t: fr.m.t + 12, b: fr.m.t + fr.ih - 12 };
          const reach = dir => Math.min(fr.ih * 0.55, (dir * c > 0 ? box.r - P[0] : P[0] - box.l) / (Math.abs(c) || 1e-6), (dir * sn > 0 ? P[1] - box.t : box.b - P[1]) / (Math.abs(sn) || 1e-6));
          const r1 = reach(1), r2 = reach(-1);
          dyn.innerHTML = `${truth}<line clip-path="url(#${dyn.dataset.clip})" class="p-seg p-user" x1="${n1(P[0] - L * c)}" y1="${n1(P[1] + L * sn)}" x2="${n1(P[0] + L * c)}" y2="${n1(P[1] - L * sn)}"/>${locked ? '' : `<circle class="p-handle" cx="${n1(P[0] + r1 * c)}" cy="${n1(P[1] - r1 * sn)}" r="10"/><circle class="p-handle" cx="${n1(P[0] - r2 * c)}" cy="${n1(P[1] + r2 * sn)}" r="10"/>`}<circle class="p-dot p-tan" cx="${n1(P[0])}" cy="${n1(P[1])}" r="5.4"/>`;
          if (chip) chip.innerHTML = `Steigung ≈ ${fmt(slope(), 2)}`;
        };
        onDrag(svg, p => { if (locked) return; const dx = p.x - P[0], dy = P[1] - p.y; if (Math.hypot(dx, dy) < 14) return; let th = Math.atan2(dy, dx); if (dx < 0) th = th > 0 ? th - Math.PI : th + Math.PI; angle = clamp(th, -1.52, 1.52); moved = true; paint(); onChange(); });
        paint();
        return { ...base, read: () => moved ? { k: slope(), scale: 1 / unit } : null, lock() { locked = true; wrap.classList.remove('m-grab'); paint(); },
          final() { const c = Math.cos(trueAngle), sn = Math.sin(trueAngle), L = fr.W * 1.4; truth = `<line clip-path="url(#${dyn.dataset.clip})" class="p-seg p-truth-line" x1="${n1(P[0] - L * c)}" y1="${n1(P[1] + L * sn)}" x2="${n1(P[0] + L * c)}" y2="${n1(P[1] - L * sn)}"/>`; paint(); if (chip) chip.innerHTML = `Richtig: ${fmt(a.k, 2)}`; } };
      }
      if (a.type === 'zones') {
        const wrap = plotWrap(a.plot), svg = wrap.querySelector('svg'), s = t.plots[a.plot], fr = frameOf(svg, s), state = a.truth.map(() => null);
        wrap.insertAdjacentHTML?.('afterend', `<div class="m-zones">${a.truth.map((_, i) => { const L = fr.px(a.edges[i]) / fr.W * 100, R = fr.px(a.edges[i + 1]) / fr.W * 100; return `<button type="button" class="m-zone" data-action="m-zone" data-part="${pid}" data-i="${i}" style="left:${L.toFixed(2)}%;width:${(R - L).toFixed(2)}%" aria-label="Abschnitt ${i + 1}">?</button>`; }).join('')}</div>`);
        const zones = () => [...root.querySelectorAll(`[data-part="${pid}"].m-zone`)];
        return { ...base, cycle(i) { state[i] = state[i] === '+' ? '-' : '+'; zones()[i].textContent = state[i] === '+' ? '+' : '−'; zones()[i].classList.remove('ok', 'bad'); zones()[i].dataset.sign = state[i]; onChange(); }, read: () => [...state],
          show(res) { res.marks?.forEach((ok, i) => mark(zones()[i], ok ? 'ok' : 'bad')); }, lock() { zones().forEach(z => { z.disabled = true; }); },
          final(res) { res.marks?.forEach((ok, i) => { mark(zones()[i], ok ? 'ok' : 'bad'); zones()[i].textContent = a.truth[i] === '+' ? '+' : '−'; }); } };
      }
      if (a.type === 'sketch') return mountSketch(host, a, pid, onChange, base);
      if (a.type === 'selfcheck') {
        const text = host.querySelector('.m-text'), box = host.querySelector('.m-compare'), ticks = [...host.querySelectorAll('[data-tick]')];
        let open = false;
        text.addEventListener('input', onChange); ticks.forEach(c => c.addEventListener('change', onChange));
        return { ...base, text: () => text.value.trim(), compare() { open = true; box.hidden = false; text.readOnly = true; }, opened: () => open, read: () => open ? { ticks: ticks.filter(c => c.checked).length } : null, lock() { text.readOnly = true; } };
      }
      return base;
    }
    function mountSketch(host, a, pid, onChange, base) {
      const N = 180, bins = Array(N).fill(null), top = host.querySelector('[data-role="top"] svg'), bottom = host.querySelector('[data-role="bottom"] svg'), hint = host.querySelector('.m-draw-hint');
      const fTop = frameOf(top, a.plotF), fBot = frameOf(bottom, a.plotD), dynT = top.querySelector('.m-dyn'), dynB = bottom.querySelector('.m-dyn'), guideT = top.querySelector('.m-guide'), guideB = bottom.querySelector('.m-guide'), [x0, x1] = a.domain, [y0, y1] = a.yRange;
      let locked = false, level = a.guide === 'full' ? 3 : 0, pointer = null, last = null, reveal = '';
      const binOf = x => clamp(Math.floor((x - x0) / (x1 - x0) * N), 0, N - 1), xOf = i => x0 + (i + 0.5) / N * (x1 - x0);
      const zeros = [...a.roots, ...a.touch.filter(t => !a.roots.some(r => Math.abs(r - t) < 0.02))];
      function guides() {
        let g1 = '', g2 = '';
        if (level >= 1) for (const x of zeros) { g1 += vline(fTop, x, 'p-vline'); g2 += `${vline(fBot, x, 'p-vline')}<circle class="p-zero" cx="${n1(fBot.px(x))}" cy="${n1(fBot.py(0))}" r="5"/>`; }
        if (level >= 2) { const e = [x0, ...a.roots, x1]; e.slice(0, -1).forEach((L, i) => { const R = e[i + 1], up = a.fp((L + R) / 2) > 0, Y = up ? fBot.m.t : fBot.py(0), H = up ? fBot.py(0) - fBot.m.t : fBot.m.t + fBot.ih - fBot.py(0); const signX = [0.5, 0.3, 0.7].map(t => fBot.px(L) + (fBot.px(R) - fBot.px(L)) * t).find(X => Math.abs(X - fBot.px(0)) > 30) ?? (fBot.px(L) + fBot.px(R)) / 2;
          g2 += `<rect class="p-zone" x="${n1(fBot.px(L))}" y="${n1(Y)}" width="${n1(fBot.px(R) - fBot.px(L))}" height="${n1(H)}"/><text class="p-t p-sign" text-anchor="middle" x="${n1(signX)}" y="${n1(Y + H / 2 + 7)}">${up ? '+' : '−'}</text>`; }); }
        guideT.innerHTML = g1; guideB.innerHTML = g2;
      }
      function pathD() { let d = '', pen = false; for (let i = 0; i < N; i++) { if (bins[i] === null) { pen = false; continue; } let s = 0, c = 0; for (let j = Math.max(0, i - 1); j <= Math.min(N - 1, i + 1); j++) if (bins[j] !== null) { s += bins[j]; c++; } d += `${pen ? 'L' : 'M'}${n1(fBot.px(xOf(i)))} ${n1(fBot.py(s / c))}`; pen = true; } return d; }
      function paint() {
        let t = '', b = reveal + `<path class="p-user-curve${reveal ? ' dim' : ''}" d="${pathD()}"/>`;
        if (pointer !== null && !locked) {
          t += vline(fTop, pointer, 'p-hover'); b += vline(fBot, pointer, 'p-hover');
          const y = a.f(pointer), k = a.fp(pointer);
          t += `<circle class="p-dot p-tan" cx="${n1(fTop.px(pointer))}" cy="${n1(fTop.py(y))}" r="5"/>`;
          if (level >= 3) { const span = (x1 - x0) * 0.16; t += `<line class="p-seg p-tan" x1="${n1(fTop.px(pointer - span))}" y1="${n1(fTop.py(y - k * span))}" x2="${n1(fTop.px(pointer + span))}" y2="${n1(fTop.py(y + k * span))}"/>`; }
        }
        dynT.innerHTML = t; dynB.innerHTML = b;
      }
      onDrag(bottom, (p, first) => {
        if (locked) return;
        const x = clamp(fBot.ix(p.x), x0, x1), y = clamp(fBot.iy(p.y), y0, y1), i = binOf(x);
        if (first || !last) bins[i] = y; else { const from = Math.min(last.i, i), to = Math.max(last.i, i); for (let j = from; j <= to; j++) bins[j] = to === from ? y : last.y + (y - last.y) * (j - last.i) / (i - last.i); }
        last = { i, y }; pointer = x; if (hint) hint.hidden = true; paint(); onChange();
      }, () => { last = null; pointer = null; paint(); });
      bottom.addEventListener('pointermove', e => { if (!last && !locked && e.pointerType === 'mouse') { pointer = clamp(fBot.ix(svgPos(bottom, e).x), x0, x1); paint(); } });
      bottom.addEventListener('pointerleave', () => { if (!last) { pointer = null; paint(); } });
      guides();
      const list = host.querySelector('.m-criteria');
      return { ...base, read: () => [...bins], clear() { if (locked) return; bins.fill(null); if (hint) hint.hidden = false; list.hidden = true; paint(); onChange(); },
        hint(n) { level = Math.max(level, n); guides(); },
        show(res) { list.hidden = !res.criteria?.length; list.innerHTML = (res.criteria || []).map(c => `<li class="${c.ok ? 'ok' : c.soft ? 'soft' : 'bad'}">${icon(c.ok ? 'check' : 'close')}<span>${rich(c.label)}</span></li>`).join(''); },
        lock() { locked = true; if (hint) hint.hidden = true; host.querySelector('[data-action="m-clear"]')?.setAttribute('hidden', ''); },
        final() { reveal = `<path class="p-curve p-fp p-reveal" pathLength="1" d="${curvePath(fBot, a.plotD, a.fp)}"/>${zeros.map(x => `<circle class="p-zero solid" cx="${n1(fBot.px(x))}" cy="${n1(fBot.py(0))}" r="5"/>`).join('')}`; pointer = null; level = Math.max(level, 1); guides(); paint(); } };
    }

    // ---- Practice round ----
    function startRound(o) {
      leave();
      const list = o.gen ? Array.from({ length: 5 }, () => ({ topic: M.genById(o.gen).topic, gen: o.gen })) : o.topic ? Array.from({ length: 8 }, () => ({ topic: o.topic })) : M.planMix(progress(), 8).map(topic => ({ topic }));
      round = { plan: list, i: 0, used: [], results: [], right: 0, helped: 0, wrong: 0, extra: 0, title: o.gen ? M.genById(o.gen).label : o.topic ? topicById(o.topic).title : 'Gemischt üben', topic: o.topic || (o.gen ? M.genById(o.gen).topic : null), opts: o, start: Object.fromEntries(M.TOPIC_IDS.map(id => [id, score(id)])) };
      nextTask();
    }
    function nextTask() {
      if (round.i >= round.plan.length) return roundResult();
      const item = round.plan[round.i], stage = item.stage || M.stageFor(score(item.topic));
      const id = item.gen || M.pickGen(item.topic, stage, round.used).id, gen = M.genById(id);
      round.task = M.makeTask(id, Math.min(gen.max, Math.max(gen.min, stage)), Math.floor(Math.random() * 2 ** 31));
      round.item = item; round.tries = 0; round.hints = 0; round.done = false; round.compare = false;
      round.used = [...round.used.slice(-5), id];
      drawTask();
    }
    const interactive = t => ['pick', 'tangent', 'zones', 'sketch'].includes(t.answer.type);
    const plotsHtml = (t, pid) => `<div data-plots="${pid}">${(t.plots || []).map((s, i) => `<div class="m-plot-wrap" data-plot="${i}">${plotSvg(s)}</div>`).join('')}</div>`;
    function taskBody(t, pid) {
      const ask = `<h1 class="m-ask">${rich(t.ask)}</h1>`, lead = t.lead ? `<p class="m-lead">${rich(t.lead)}</p>` : '';
      return interactive(t) ? `${lead}${tableHtml(t.table)}${ask}${plotsHtml(t, pid)}<div data-answer="${pid}">${answerHtml(t, pid)}</div>` : `${lead}${tableHtml(t.table)}${plotsHtml(t, pid)}${ask}<div data-answer="${pid}">${answerHtml(t, pid)}</div>`;
    }
    function drawTask() {
      const t = round.task, total = round.plan.length, percent = Math.round(round.i / total * 100), topic = topicById(t.topic);
      shell('math-practice', round.title);
      $('#main').innerHTML = `<section class="learning-shell qa-shell m-shell"><div class="learning-top"><button class="back-link" data-action="m-exit">${icon('back')}Beenden</button><span class="learning-set-name">${esc(round.title)}</span><span class="qa-round-count">${round.i + 1} / ${total}</span></div><div class="round-progress"><div><strong>${esc(topic.title)}</strong><span>${round.right} richtig</span></div><div class="mini-progress"><span style="width:${percent}%"></span></div></div>
        <article class="qa-card m-card" id="m-card"><div class="qa-card-meta"><span class="qa-chip">${esc(t.kicker || t.label)}</span><span class="qa-chip">${STAGES[t.stage]}</span>${round.item.retry ? '<span class="qa-chip again">Nochmal mit neuen Zahlen</span>' : ''}</div>${taskBody(t, 'main')}
        <div class="m-hints" id="m-hints"></div><div id="m-verdict"></div><div class="qa-reveal" id="m-reveal"><div class="qa-reveal-inner" id="m-reveal-inner"></div></div><div class="qa-card-actions m-actions" id="m-actions">${taskActions()}</div></article></section>`;
      live = mount($('#m-card'), t, 'main'); widgets.main = live;
      if (fine()) $('#m-card input.m-num')?.focus({ preventScroll: true });
    }
    function taskActions(label) {
      const t = round.task, type = t.answer.type, more = round.hints < t.hints.length;
      const check = type === 'choice' ? '' : `<button class="button primary" data-action="m-check">${label || (type === 'selfcheck' ? 'Vergleichen' : 'Prüfen')} ${icon('arrow')}</button>`;
      return `<div class="m-side">${more ? `<button class="text-button" data-action="m-hint">${icon('spark')}Tipp${t.hints.length > 1 ? ` (${round.hints + 1}/${t.hints.length})` : ''}</button>` : ''}${type === 'selfcheck' ? '' : '<button class="text-button" data-action="m-solve">Lösung zeigen</button>'}</div>${check}`;
    }
    function verdict(kind, title, msgs = []) { $('#m-verdict').innerHTML = `<div class="m-verdict ${kind}" role="status">${icon(kind === 'ok' ? 'check' : kind === 'info' ? 'spark' : 'close')}<div><strong>${esc(title)}</strong>${msgs.map(m => `<p>${rich(m)}</p>`).join('')}</div></div>`; }
    function checkTask() {
      if (!round || round.done) return;
      const t = round.task, type = t.answer.type;
      if (type === 'selfcheck') {
        if (!round.compare) { if (!live.text()) return toast('Schreib zuerst deinen Satz.'); round.compare = true; live.compare(); verdict('info', 'Vergleiche und hak ab, was bei dir vorkommt.'); $('#m-actions').innerHTML = taskActions('Fertig'); return; }
        const res = M.check(t, live.read());
        return finish(res, res.score >= 0.99 ? 1 : res.score >= 0.5 ? 0.5 : 0);
      }
      const res = M.check(t, live.read());
      if (res.empty) return toast(res.msgs?.[0] || 'Gib zuerst deine Antwort ein.');
      live.show(res);
      if (res.ok) return finish(res, round.tries === 0 && round.hints === 0 ? 1 : 0.5);
      round.tries++;
      if (type === 'choice' || round.tries >= 2) return finish(res, 0);
      verdict('bad', 'Noch nicht ganz.', [...(res.msgs || []), 'Ein Versuch noch, oder hol dir einen Tipp.']);
      $('#m-actions').innerHTML = taskActions('Nochmal prüfen');
    }
    // A task left empty still has to show the right answer, so every field and row counts as missed.
    const blank = (a, res) => ({ ...res, fields: res.fields?.map(f => ({ ...f, state: 'wrong', msg: '' })), marks: (a.items || a.parts?.filter(p => typeof p !== 'string') || a.truth || []).map(() => false) });
    function solveTask() { if (!round || round.done) return; const a = round.task.answer, res = M.check(round.task, live.read()); if (!res.empty) live.show(res); finish(res.empty ? blank(a, res) : res, 0, true); }
    function finish(res, got, gaveUp = false) {
      const t = round.task; round.done = true;
      live.lock(); live.final(res);
      M.applyResult(progress(), t.topic, got, t.stage); countAnswer(); save();
      round.results.push({ topic: t.topic, label: t.label, got });
      if (got >= 1) round.right++; else if (got > 0) round.helped++; else round.wrong++;
      if (got < 1 && round.extra < 3 && !round.item.retry && round.task.answer.type !== 'selfcheck') { round.extra++; round.plan.splice(Math.min(round.i + 3, round.plan.length), 0, { topic: t.topic, gen: t.gen, retry: true, stage: Math.max(1, t.stage - (got > 0 ? 0 : 1)) }); }
      const steps = t.solution || [], take = t.takeaway;
      if (got >= 1) verdict('ok', ['Richtig.', 'Genau so.', 'Stimmt.'][Math.floor(Math.random() * 3)], res.msgs?.filter(() => false));
      else if (got > 0) verdict('ok', t.answer.type === 'selfcheck' ? 'Fast vollständig.' : 'Richtig, mit Hilfe.');
      else if (gaveUp) verdict('info', 'Hier ist die Lösung. Die Aufgabe kommt gleich mit neuen Zahlen wieder.');
      else verdict('bad', 'Diesmal nicht.', res.msgs || []);
      $('#m-reveal-inner').innerHTML = steps.length || take ? `<div class="qa-solution"><div class="qa-solution-label">${icon('book')}Lösungsweg</div><ol class="m-steps">${steps.map((s, i) => `<li style="--i:${i}">${rich(s)}</li>`).join('')}</ol>${take ? `<p class="m-take">${rich(take)}</p>` : ''}</div>` : '';
      if (t.showPlot && t.plots?.[0]) { const svg = $('#m-card [data-plot="0"] svg'), dyn = svg?.querySelector('.m-dyn'); if (dyn && t.answer.type !== 'pick') dyn.innerHTML = extrasSvg(frameOf(svg, t.plots[0]), t.plots[0], t.showPlot, dyn.dataset.clip); }
      $('#m-actions').innerHTML = `<div class="m-side"></div><button class="button primary" data-action="m-next">${round.i + 1 >= round.plan.length ? 'Ergebnis ansehen' : 'Weiter'} ${icon('arrow')}</button>`;
      requestAnimationFrame(() => $('#m-reveal')?.classList.add('open'));
      if (fine()) $('#m-actions .button')?.focus({ preventScroll: true });
      setTimeout(() => $('#m-actions')?.scrollIntoView?.({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }), 420);
    }
    function advance() {
      if (!round?.done) return;
      const go = () => { round.i++; nextTask(); }, card = $('#m-card');
      if (reduced() || typeof card?.animate !== 'function') return go();
      card.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: 'translateX(-36px) scale(.975)', filter: 'blur(4px)' }], { duration: 210, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(go, go);
    }
    function roundResult() {
      const r = round, weak = [...new Map(r.results.filter(x => x.got < 1).map(x => [x.label, x])).values()], touched = [...new Set(r.results.map(x => x.topic))];
      const repeat = r.opts.gen ? `data-action="m-gen" data-gen="${r.opts.gen}"` : r.opts.topic ? `data-action="m-start" data-topic="${r.opts.topic}"` : 'data-action="m-mix"';
      leave(); shell('math-practice', 'Ergebnis');
      $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>Runde geschafft<span class="blue-dot">.</span></h1><p>${r.wrong ? 'Die Fehler kamen mit neuen Zahlen nochmal. Genau das bringt am meisten.' : 'Sauber gelöst. Mach als Nächstes eine gemischte Runde oder den Test.'}</p><div class="result-stats"><div><strong>${r.right}</strong><span>richtig</span></div><div><strong>${r.helped}</strong><span>mit Hilfe</span></div><div><strong>${r.wrong}</strong><span>falsch</span></div></div>
        <div class="result-review qa-review"><h3>Dein Stand</h3>${touched.map(id => `<div><span>${esc(topicById(id).title)}</span>${levelChip(id)}<strong class="m-delta">${r.start[id]}% → ${score(id)}%</strong></div>`).join('')}</div>${weak.length ? `<div class="result-review qa-review"><h3>Noch einmal anschauen</h3>${weak.map(x => `<div><span>${esc(x.label)}</span><span class="m-muted">${esc(topicById(x.topic).title)}</span></div>`).join('')}</div>` : '<div class="perfect-note">Alles auf Anhieb richtig.</div>'}
        <div class="result-actions"><button class="button primary" ${repeat}>Nochmal ${icon('arrow')}</button><button class="button secondary" data-action="m-test">Test simulieren</button><button class="text-button" data-action="m-home">Zur Übersicht</button></div></section>`;
    }

    // ---- Test simulation ----
    function testSetup() {
      leave(); shell('math-test', 'Test simulieren');
      const p = progress().test, option = (size, big, title, text) => `<button class="qa-test-option" data-action="m-exam-start" data-size="${size}"><span class="qa-test-big">${big}</span><strong>${title}</strong><small>${text}</small><span class="qa-test-go">${icon('arrow')}</span></button>`;
      $('#main').innerHTML = `<button class="back-link" data-action="m-home">${icon('back')} Mathe</button><section class="qa-test-intro"><div class="eyebrow">${icon('clock')} TEST SIMULIEREN</div><h1>Wie im echten Test<span class="blue-dot">.</span></h1><p>Mehrteilige Aufgaben im Stil deiner Übungsschularbeit, ohne Tipps und ohne Sofort-Feedback. Taschenrechner oder GeoGebra sind erlaubt. Am Ende bekommst du Punkte und alle Lösungswege.</p><div class="qa-test-options">${option('full', 7, 'Ganzer Test', '7 Aufgaben · etwa 45 Minuten')}${option('short', 3, 'Kurztest', '3 Aufgaben · etwa 15 Minuten')}</div>${p.at ? `<p class="qa-test-best">Bester Test: <strong>${p.best}%</strong> · Letzter: <strong>${p.last}%</strong></p>` : ''}</section>`;
    }
    const allParts = () => exam.data.tasks.flatMap(t => t.parts);
    const clockText = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const partHtml = p => `<section class="m-part" data-part-box="${p.id}"><div class="m-part-head"><span class="m-part-label">${p.label})</span><div class="m-part-ask">${rich(p.ask)}</div><span class="qa-points">${p.points} P.</span></div>${plotsHtml(p, p.id)}<div data-answer="${p.id}">${answerHtml(p, p.id)}</div><div class="m-part-result" data-result="${p.id}"></div></section>`;
    function startExam(size) {
      leave();
      exam = { data: M.buildTest(Math.floor(Math.random() * 2 ** 31), size), phase: 'write', started: Date.now(), seconds: 0, awarded: {}, results: {} };
      drawExam();
    }
    function drawExam() {
      const d = exam.data;
      shell('math-test', 'Test');
      $('#main').innerHTML = `<section class="qa-test m-exam"><div class="qa-test-bar"><button class="back-link" data-action="m-exam-exit">${icon('back')}Abbrechen</button><div class="qa-test-title"><strong>Differentialrechnung</strong><small id="m-exam-status"></small></div><span class="qa-timer" id="m-exam-timer">${icon('clock')}<span>00:00</span></span></div>
        <ol class="qa-test-list">${d.tasks.map((t, i) => `<li class="qa-test-item" style="--i:${Math.min(i, 10)}"><div class="qa-test-q"><span class="qa-num">${i + 1}</span><h2>${esc(t.title)}</h2><span class="qa-points">${t.parts.reduce((s, p) => s + p.points, 0)} P.</span></div>${t.lead ? `<p class="m-lead">${rich(t.lead)}</p>` : ''}${tableHtml(t.table)}${(t.plots || []).map(s => `<div class="m-plot-wrap">${plotSvg(s)}</div>`).join('')}${t.parts.map(partHtml).join('')}</li>`).join('')}</ol>
        <div class="qa-dock"><span id="m-exam-dock"></span><button class="button primary" data-action="m-exam-submit">Abgeben ${icon('check')}</button></div></section>`;
      for (const p of allParts()) widgets[p.id] = mount(document.querySelector(`[data-part-box="${p.id}"]`), p, p.id, examStatus);
      examStatus();
      if (typeof setInterval === 'function') examTimer = setInterval(() => { if (!exam || exam.phase !== 'write') return; exam.seconds = Math.round((Date.now() - exam.started) / 1000); const el = document.querySelector('#m-exam-timer span'); if (el) el.textContent = clockText(exam.seconds); }, 1000);
    }
    function answered(p) { const w = widgets[p.id]; return p.answer.type === 'selfcheck' ? !!w.text() : !M.check(p, w.read()).empty; }
    function examStatus() {
      if (!exam || exam.phase !== 'write') return;
      const parts = allParts(), done = parts.filter(answered).length;
      $('#m-exam-status').textContent = `${done} von ${parts.length} Teilen · ${exam.data.points} Punkte`;
      $('#m-exam-dock').textContent = `${done} / ${parts.length}`;
    }
    function submitExam() {
      const parts = allParts(), empty = parts.filter(p => !answered(p)).length;
      const go = () => {
        exam.phase = 'grade'; exam.seconds = Math.round((Date.now() - exam.started) / 1000); stopTimer();
        for (const p of parts) {
          const w = widgets[p.id];
          w.lock();
          if (p.answer.type === 'selfcheck') { w.compare(); exam.results[p.id] = { selfcheck: true }; exam.awarded[p.id] = 0; }
          else { const res = M.check(p, w.read()); if (!res.empty) w.show(res); w.final(res.empty ? blank(p.answer, res) : res); exam.results[p.id] = res; exam.awarded[p.id] = Math.round(p.points * (res.score || 0) * 2) / 2; }
          document.querySelector(`[data-result="${p.id}"]`).innerHTML = `${(p.solution || []).length ? `<div class="qa-solution"><div class="qa-solution-label">${icon('book')}Lösung</div><ol class="m-steps">${p.solution.map((s, i) => `<li style="--i:${i}">${rich(s)}</li>`).join('')}</ol></div>` : ''}<div class="qa-grade-row"><span>Punkte</span><div class="qa-stepper"><button type="button" data-action="m-points" data-part="${p.id}" data-delta="-0.5" aria-label="Halben Punkt abziehen">−</button><output data-out="${p.id}">${fmt(exam.awarded[p.id], 1)}</output><span>/ ${p.points}</span><button type="button" data-action="m-points" data-part="${p.id}" data-delta="0.5" aria-label="Halben Punkt dazugeben">+</button></div></div>`;
          if (p.answer.type === 'selfcheck') document.querySelectorAll(`[data-part-box="${p.id}"] [data-tick]`).forEach(c => c.addEventListener('change', () => { const box = document.querySelector(`[data-part-box="${p.id}"]`), ticked = box.querySelectorAll('[data-tick]:checked').length, all = p.answer.checklist.length; setPoints(p, Math.round(p.points * ticked / all * 2) / 2); }));
        }
        $('.m-exam .qa-test-bar').innerHTML = `<div class="qa-test-title"><strong>Korrektur</strong><small>Prüf die Punkte und pass sie an, wo nötig.</small></div><div class="qa-score-live"><strong id="m-exam-score">${fmt(examScore(), 1)}</strong><span>/ ${exam.data.points}</span></div>`;
        $('.m-exam .qa-dock').innerHTML = `<span>Bei Texten hakst du selbst ab.</span><button class="button primary" data-action="m-exam-finish">Ergebnis ansehen ${icon('arrow')}</button>`;
        window.scrollTo?.({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
      };
      if (empty) return confirm('Test abgeben?', `${empty === 1 ? '1 Teil ist' : `${empty} Teile sind`} noch leer und ${empty === 1 ? 'zählt' : 'zählen'} mit 0 Punkten.`, 'Abgeben', go);
      go();
    }
    const examScore = () => allParts().reduce((s, p) => s + (exam.awarded[p.id] || 0), 0);
    function setPoints(p, v) { exam.awarded[p.id] = Math.min(p.points, Math.max(0, v)); document.querySelector(`[data-out="${p.id}"]`).textContent = fmt(exam.awarded[p.id], 1); $('#m-exam-score').textContent = fmt(examScore(), 1); }
    function finishExam() {
      const got = examScore(), max = exam.data.points, percent = max ? Math.round(got / max * 100) : 0, t = progress().test, tasks = exam.data.tasks, awarded = exam.awarded, mins = Math.max(1, Math.round(exam.seconds / 60));
      progress().test = { best: Math.max(t.best, percent), last: percent, at: Date.now(), runs: t.runs + 1 }; countAnswer(); save();
      leave(); shell('math-test', 'Testergebnis');
      $('#main').innerHTML = `<section class="result-page qa-test-result"><div class="qa-score-ring">${ring(percent, 'erreicht')}</div><h1>${percent >= 90 ? 'Sehr stark' : percent >= 65 ? 'Gut gemacht' : percent >= 50 ? 'Das wird' : 'Dranbleiben'}<span class="blue-dot">.</span></h1><p>${fmt(got, 1)} von ${max} Punkten in ${mins} ${mins === 1 ? 'Minute' : 'Minuten'}.</p><div class="result-review qa-review"><h3>Nach Aufgaben</h3>${tasks.map(x => { const sum = x.parts.reduce((s, p) => s + p.points, 0), have = x.parts.reduce((s, p) => s + (awarded[p.id] || 0), 0); return `<div><span>${esc(x.title)}</span><strong class="m-delta">${fmt(have, 1)} / ${sum}</strong></div>`; }).join('')}</div><div class="result-actions"><button class="button primary" data-action="m-mix">Schwächen üben ${icon('arrow')}</button><button class="button secondary" data-action="m-test">Noch ein Test</button><button class="text-button" data-action="m-home">Zur Übersicht</button></div></section>`;
    }

    // ---- Labs: playing with a graph before practising ----
    function mountLab(kind, host) {
      if (kind === 'secant') return labSecant(host);
      if (kind === 'angle') return labAngle(host);
      return labDerive(host, kind === 'motion');
    }
    const playButton = (id, text) => `<button type="button" class="button secondary" id="${id}">${icon('spark')}${text}</button>`;
    function animate(duration, step, done) {
      if (reduced() || typeof requestAnimationFrame !== 'function') { step(1); done?.(); return () => {}; }
      let raf = 0, begin = null, stopped = false;
      const tick = now => { if (stopped) return; begin ??= now; const u = Math.min(1, (now - begin) / duration); step(u); if (u < 1) raf = requestAnimationFrame(tick); else done?.(); };
      raf = requestAnimationFrame(tick);
      return () => { stopped = true; cancelAnimationFrame?.(raf); };
    }
    function labSecant(host) {
      const f = x => 0.1 * x ** 3 - x * x + 2.6 * x + 1.5, d = x => 0.3 * x * x - 2 * x + 2.6, s = M.spec([0, 8, 1], [0, 10, 1], { curves: [{ fn: f, tone: 'f', name: 'f' }] });
      host.innerHTML = `<p class="m-lab-note">${rich('Zieh die Punkte. Die Steigung der Sekante ist die mittlere Änderungsrate. Lass $Q$ zu $P$ laufen, dann wird aus der Sekante die Tangente.')}</p><div class="m-plot-wrap m-grab">${plotSvg(s)}</div><dl class="m-read"><div><dt>${rich('$\\Delta f$')}</dt><dd id="m-l1"></dd></div><div><dt>${rich('$\\Delta x$')}</dt><dd id="m-l2"></dd></div><div><dt id="m-l3t">Sekante</dt><dd id="m-l3"></dd></div><div><dt>Tangente in ${rich('$P$')}</dt><dd id="m-l4"></dd></div></dl><div class="m-lab-tools">${playButton('m-lab-go', 'Q zu P laufen lassen')}</div>`;
      const svg = host.querySelector('svg'), fr = frameOf(svg, s), dyn = svg.querySelector('.m-dyn'), clip = dyn.dataset.clip;
      let x = 1.5, z = 6.2, active = null, ghosts = [], stop = null;
      const set = (id, v) => { host.querySelector(id).innerHTML = v; };
      function paint() {
        const fx = f(x), fz = f(z), h = z - x, k = Math.abs(h) < 1e-3 ? d(x) : (fz - fx) / h, near = Math.abs(h) < 0.06;
        dyn.innerHTML = `${ghosts.map(g => `<path clip-path="url(#${clip})" class="p-seg p-ghost" d="${lineThrough(fr, s, x, fx, g)}"/>`).join('')}${near ? '' : `<path class="p-tri p-sec" d="M${n1(fr.px(x))} ${n1(fr.py(fx))}L${n1(fr.px(z))} ${n1(fr.py(fx))}L${n1(fr.px(z))} ${n1(fr.py(fz))}Z"/>`}<path clip-path="url(#${clip})" class="p-seg ${near ? 'p-tan' : 'p-sec'}" d="${lineThrough(fr, s, x, fx, k)}"/><circle class="p-dot p-tan p-big" cx="${n1(fr.px(x))}" cy="${n1(fr.py(fx))}" r="7"/><text class="p-t p-dl" x="${n1(fr.px(x) + 10)}" y="${n1(fr.py(fx) + 22)}">P</text>${near ? '' : `<circle class="p-dot p-sec p-big" cx="${n1(fr.px(z))}" cy="${n1(fr.py(fz))}" r="7"/><text class="p-t p-dl" x="${n1(fr.px(z) + 10)}" y="${n1(fr.py(fz) - 10)}">Q</text>`}`;
        set('#m-l1', fmt(fz - fx, 2)); set('#m-l2', fmt(h, 2)); set('#m-l3', fmt(k, 2)); set('#m-l4', fmt(d(x), 2)); host.querySelector('#m-l3t').textContent = near ? 'Fast Tangente' : 'Sekante';
      }
      onDrag(svg, (p, first) => { stop?.(); const px = clamp(fr.ix(p.x), 0.2, 7.8); if (first) { ghosts = []; active = Math.abs(fr.px(px) - fr.px(x)) < Math.abs(fr.px(px) - fr.px(z)) ? 'x' : 'z'; } if (active === 'x') x = px; else z = px; paint(); });
      host.querySelector('#m-lab-go').addEventListener('click', () => { stop?.(); ghosts = []; const from = Math.abs(z - x) < 0.5 ? clamp(x + 4, 0.2, 7.8) : z, marks = [0.3, 0.55, 0.75, 0.88]; let next = 0; stop = animate(2600, u => { const e = 1 - (1 - u) ** 3; z = from + (x + 0.001 - from) * e; if (next < marks.length && u > marks[next]) { ghosts.push((f(z) - f(x)) / (z - x)); next++; } paint(); }); });
      paint(); labStop = () => stop?.();
    }
    function labAngle(host) {
      const s = M.spec([-4, 4, 1], [-3, 3, 1], { xLabel: 'x', yLabel: 'y' }), size = phone() ? { W: 440, H: 340 } : { W: 520, H: 400 };
      host.innerHTML = `<p class="m-lab-note">${rich('Dreh die Gerade und beobachte Steigung und Winkel. Das Dreieck zeigt: 1 nach rechts, $k$ nach oben.')}</p><div class="m-plot-wrap m-grab m-narrow">${plotSvg(s, size)}</div><dl class="m-read"><div><dt>Steigung ${rich('$k$')}</dt><dd id="m-a1"></dd></div><div><dt>Winkel ${rich('$\\alpha$')}</dt><dd id="m-a2"></dd></div><div><dt>In Prozent</dt><dd id="m-a3"></dd></div></dl>`;
      const svg = host.querySelector('svg'), fr = frameOf(svg, s), dyn = svg.querySelector('.m-dyn'), clip = dyn.dataset.clip, O = [fr.px(0), fr.py(0)], unit = fr.iw / 8;
      let angle = 0.6;
      function paint() {
        const k = Math.tan(angle), c = Math.cos(angle), sn = Math.sin(angle), R = 46, large = 0, sweep = angle > 0 ? 0 : 1, showTri = Math.abs(k) <= 3;
        dyn.innerHTML = `<path class="p-arc" d="M${n1(O[0] + R)} ${n1(O[1])}A${R} ${R} 0 ${large} ${sweep} ${n1(O[0] + R * c)} ${n1(O[1] - R * sn)}"/>${showTri ? `<path class="p-tri p-tan" d="M${n1(O[0])} ${n1(O[1])}L${n1(fr.px(1))} ${n1(O[1])}L${n1(fr.px(1))} ${n1(fr.py(k))}Z"/>` : ''}<line clip-path="url(#${clip})" class="p-seg p-tan" x1="${n1(O[0] - 900 * c)}" y1="${n1(O[1] + 900 * sn)}" x2="${n1(O[0] + 900 * c)}" y2="${n1(O[1] - 900 * sn)}"/><circle class="p-handle" cx="${n1(O[0] + unit * 3.2 * c)}" cy="${n1(O[1] - unit * 3.2 * sn)}" r="11"/>`;
        host.querySelector('#m-a1').textContent = fmt(k, 2); host.querySelector('#m-a2').textContent = `${fmt(deg(angle), 1)}°`; host.querySelector('#m-a3').textContent = `${fmt(k * 100, 0)} %`;
      }
      onDrag(svg, p => { const dx = p.x - O[0], dy = O[1] - p.y; if (Math.hypot(dx, dy) < 16) return; let th = Math.atan2(dy, dx); if (dx < 0) th = th > 0 ? th - Math.PI : th + Math.PI; angle = clamp(th, -1.5, 1.5); paint(); });
      paint();
    }
    function labDerive(host, motion) {
      const FN = motion ? [
        { name: 'Anfahren und Bremsen', f: t => -(t ** 3) / 90 + t * t / 6, d: t => -(t * t) / 30 + t / 3, dom: [0, 10], y: [0, 6, 1], dy: [0, 1, 0.25], xl: 't in s', yl: 's in m', dl: 'v in m/s', n: 's', dn: 'v' },
        { name: 'Konstant, dann schneller', f: t => t < 4 ? t * 0.8 : 3.2 + 0.8 * (t - 4) + 0.12 * (t - 4) ** 2, d: t => t < 4 ? 0.8 : 0.8 + 0.24 * (t - 4), dom: [0, 10], y: [0, 14, 2], dy: [0, 3, 1], xl: 't in s', yl: 's in m', dl: 'v in m/s', n: 's', dn: 'v' },
      ] : [
        { name: 'Parabel', f: x => 0.5 * x * x - 1, d: x => x, dom: [-3.5, 3.5], y: [-2, 6, 2], dy: [-4, 4, 2] },
        { name: 'Kubisch', f: x => 0.25 * x ** 3 - 1.5 * x + 2, d: x => 0.75 * x * x - 1.5, dom: [-3, 3], y: [-2, 6, 2], dy: [-2, 6, 2] },
        { name: 'Sinus', f: Math.sin, d: Math.cos, dom: [-6.3, 6.3], y: [-2, 2, 1], dy: [-2, 2, 1] },
        { name: 'S-Kurve', f: x => 4 / (1 + Math.exp(-1.5 * x)), d: x => 6 * Math.exp(-1.5 * x) / (1 + Math.exp(-1.5 * x)) ** 2, dom: [-4, 4], y: [0, 5, 1], dy: [0, 2, 0.5] },
      ];
      let cur = 0, stop = null;
      function build() {
        stop?.();
        const c = FN[cur], step = c.dom[1] - c.dom[0] > 9 ? 2 : 1, name = c.n || 'f', dname = c.dn || 'f′', top = M.spec([c.dom[0], c.dom[1], step], c.y, { xLabel: c.xl || 'x', yLabel: c.yl || 'f(x)', curves: [{ fn: c.f, tone: 'f', name }] }), bot = M.spec([c.dom[0], c.dom[1], step], c.dy, { xLabel: c.xl || 'x', yLabel: c.dl || 'f′(x)' }), size = phone() ? { W: 440, H: 210 } : { W: 720, H: 220 };
        host.innerHTML = `<p class="m-lab-note">Zieh die Stelle hin und her oder spiel es ab. Unten entsteht aus der Steigung von oben der neue Graph.</p><div class="m-gens m-lab-fn">${FN.map((x, i) => `<button type="button" class="qa-filter-chip" data-fn="${i}" aria-pressed="${i === cur}">${esc(x.name)}</button>`).join('')}</div><div class="m-plot-wrap m-grab">${plotSvg(top, size)}</div><div class="m-plot-wrap m-grab">${plotSvg(bot, size)}</div><dl class="m-read"><div><dt>Stelle</dt><dd id="m-d1"></dd></div><div><dt>Höhe ${rich(`$${name}$`)}</dt><dd id="m-d2"></dd></div><div><dt>Steigung ${esc(dname)}</dt><dd id="m-d3"></dd></div><div><dt>Verhalten</dt><dd id="m-d4"></dd></div></dl><div class="m-lab-tools">${playButton('m-lab-go', 'Abspielen')}</div>`;
        const [svgT, svgB] = host.querySelectorAll('svg'), fT = frameOf(svgT, top), fB = frameOf(svgB, bot), dT = svgT.querySelector('.m-dyn'), dB = svgB.querySelector('.m-dyn'), [a, b] = c.dom, span = (b - a) * 0.17;
        let x = a + (b - a) * 0.3, reach = x;
        function paint() {
          const y = c.f(x), k = c.d(x);
          dT.innerHTML = `${vline(fT, x, 'p-hover')}<line clip-path="url(#${dT.dataset.clip})" class="p-seg p-tan" x1="${n1(fT.px(x - span))}" y1="${n1(fT.py(y - k * span))}" x2="${n1(fT.px(x + span))}" y2="${n1(fT.py(y + k * span))}"/><circle class="p-dot p-tan p-big" cx="${n1(fT.px(x))}" cy="${n1(fT.py(y))}" r="7"/>`;
          dB.innerHTML = `${vline(fB, x, 'p-hover')}<path clip-path="url(#${dB.dataset.clip})" class="p-curve p-fp p-still" d="${curvePath(fB, bot, c.d, a, Math.max(reach, x + 1e-3), 200)}"/><circle class="p-dot p-fp p-big" cx="${n1(fB.px(x))}" cy="${n1(fB.py(clamp(k, c.dy[0], c.dy[1])))}" r="7"/>`;
          host.querySelector('#m-d1').textContent = fmt(x, 2); host.querySelector('#m-d2').textContent = fmt(y, 2); host.querySelector('#m-d3').textContent = fmt(k, 2); host.querySelector('#m-d4').textContent = Math.abs(k) < 0.03 ? 'waagrecht' : k > 0 ? 'steigt' : 'fällt';
        }
        const drag = p => { stop?.(); x = clamp(p.x === undefined ? x : fT.ix(p.x), a, b); reach = Math.max(reach, x); paint(); };
        onDrag(svgT, drag); onDrag(svgB, drag);
        host.querySelector('#m-lab-go').addEventListener('click', () => { stop?.(); reach = a; stop = animate(5200, u => { x = a + (b - a) * u; reach = x; paint(); }); });
        host.querySelectorAll('[data-fn]').forEach(btn => btn.addEventListener('click', () => { cur = Number(btn.dataset.fn); build(); }));
        paint();
      }
      build(); labStop = () => stop?.();
    }

    // ---- Actions ----
    const guarded = (fn, text = 'Die laufende Übung wird beendet. Gelöste Aufgaben bleiben gespeichert.') => { if (round || exam?.phase === 'write') return confirm('Übung verlassen?', text, 'Verlassen', fn); fn(); };
    function action(name, btn) {
      const part = btn.dataset.part;
      switch (name) {
        case 'm-home': return guarded(() => transition(home));
        case 'm-topic': return transition(() => topicPage(btn.dataset.topic));
        case 'm-start': return startRound({ topic: btn.dataset.topic });
        case 'm-gen': return startRound({ gen: btn.dataset.gen });
        case 'm-mix': return guarded(() => startRound({}));
        case 'm-formulas': return guarded(() => transition(formulas));
        case 'm-test': return guarded(() => transition(testSetup));
        case 'm-exam-start': return startExam(btn.dataset.size);
        case 'm-exam-exit': return confirm('Test abbrechen?', 'Deine Antworten in diesem Test werden nicht gespeichert.', 'Test abbrechen', testSetup);
        case 'm-exam-submit': return submitExam();
        case 'm-exam-finish': return finishExam();
        case 'm-exit': return confirm('Runde beenden?', 'Gelöste Aufgaben sind schon gespeichert.', 'Beenden', () => { const id = round?.topic; id ? topicPage(id) : home(); });
        case 'm-check': return checkTask();
        case 'm-next': return advance();
        case 'm-solve': return solveTask();
        case 'm-hint': { if (!round || round.done) return; const t = round.task, text = t.hints[round.hints]; if (!text) return; round.hints++; live.hint(round.hints); $('#m-hints').insertAdjacentHTML('beforeend', `<p class="m-hint">${icon('spark')}<span>${rich(text)}</span></p>`); if (!round.compare) $('#m-actions').innerHTML = taskActions(round.tries ? 'Nochmal prüfen' : ''); return; }
        case 'm-opt': { const w = widgets[part]; w.choose(Number(btn.dataset.i)); if (part === 'main' && round?.task.answer.type === 'choice') checkTask(); return; }
        case 'm-tf': return widgets[part].set(Number(btn.dataset.i), btn.dataset.v === '1');
        case 'm-zone': return widgets[part].cycle(Number(btn.dataset.i));
        case 'm-clear': return widgets[part].clear();
        case 'm-sign': { const input = btn.parentElement.querySelector('input'); if (!input || input.disabled) return; input.value = /^[-−]/.test(input.value) ? input.value.slice(1) : `-${input.value}`; input.dispatchEvent(new window.Event('input', { bubbles: true })); return; }
        case 'm-points': { const p = allParts().find(x => x.id === part); return setPoints(p, (exam.awarded[part] || 0) + Number(btn.dataset.delta)); }
        case 'm-reset': return confirm('Von vorne anfangen?', 'Der Lernstand dieses Themas wird zurückgesetzt.', 'Zurücksetzen', () => { delete progress().topics[btn.dataset.topic]; save(); topicPage(btn.dataset.topic); toast('Fortschritt zurückgesetzt.'); });
      }
    }
    function key(e, input) {
      if (!round || e.repeat) return;
      const a = round.task.answer;
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.closest?.('button')) { e.preventDefault(); return round.done ? advance() : checkTask(); }
      if (!input && !round.done && a.type === 'choice' && /^[1-9]$/.test(e.key) && Number(e.key) <= a.options.length) { e.preventDefault(); widgets.main.choose(Number(e.key) - 1); checkTask(); }
    }
    return { home, leave, action, key, busy: () => !!round || exam?.phase === 'write' };
  } };
})();
