const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const M = require('../dist/mathcore.js');
const C = require('../dist/core.js');

const SEEDS = 120;
const allStages = fn => { for (const g of M.GENS) for (let st = g.min; st <= g.max; st++) for (let seed = 1; seed <= SEEDS; seed++) fn(M.makeTask(g.id, st, seed), g, st, seed); };
function sketchBins(a, map = x => a.fp(x), N = 180) { const [x0, x1] = a.domain; return Array.from({ length: N }, (_, i) => map(x0 + (i + 0.5) / N * (x1 - x0))); }
function rightAnswer(t) {
  const a = t.answer;
  if (a.type === 'fields') return Object.fromEntries(a.fields.map(f => [f.key, f.type === 'sel' ? f.correct : f.value.toFixed(8).replace('.', ',')]));
  if (a.type === 'choice') return a.correct;
  if (a.type === 'multi') return a.correct;
  if (a.type === 'tf') return a.items.map(i => i.truth);
  if (a.type === 'cloze') return a.parts.filter(p => typeof p !== 'string').map(p => p.correct);
  if (a.type === 'pick') return a.targets;
  if (a.type === 'tangent') return { k: a.k, scale: 1 };
  if (a.type === 'zones') return a.truth;
  if (a.type === 'sketch') return sketchBins(a);
  if (a.type === 'selfcheck') return { ticks: a.checklist.length };
  throw new Error(a.type);
}
function strings(t) {
  const a = t.answer, out = [t.lead, t.ask, ...(t.hints || []), ...(t.solution || []), t.takeaway];
  if (a.fields) for (const f of a.fields) { out.push(f.label, f.unit); for (const trap of f.traps || []) out.push(trap.msg); (f.options || []).forEach(o => out.push(o)); }
  if (a.options) a.options.forEach(o => o.text && out.push(o.text));
  if (a.items) a.items.forEach(i => out.push(i.text, i.why));
  if (a.parts) a.parts.forEach(p => typeof p === 'string' ? out.push(p) : p.options.forEach(o => out.push(o)));
  if (a.model) out.push(a.model, ...a.checklist);
  if (t.table) t.table.rows.flat().forEach(c => out.push(c));
  return out.filter(x => x !== undefined && x !== null && x !== '');
}
function plotsOf(t) {
  const a = t.answer, out = [...(t.plots || [])];
  if (a.options) a.options.forEach(o => o.plot && out.push(o.plot));
  if (a.plotF) out.push(a.plotF, a.plotD);
  return out;
}

test('every generator: text is complete and formulas are well formed', () => {
  allStages((t, g, st, seed) => {
    for (const s of strings(t)) {
      const where = `${g.id} st${st} seed ${seed}: ${s}`;
      assert.doesNotMatch(String(s), /NaN|undefined|Infinity|\[object/, where);
      assert.equal(String(s).split('$').length % 2, 1, `unbalanced $ in ${where}`);
      assert.doesNotMatch(String(s), /[\f\t\v\b\r]/, `control character (single backslash?) in ${where}`);
      assert.doesNotMatch(M.rich(s), /undefined|NaN/, where);
    }
  });
});
test('every generator: the correct answer is accepted', () => {
  allStages((t, g, st, seed) => assert.equal(M.check(t, rightAnswer(t)).ok, true, `${g.id} st${st} seed ${seed}`));
});
test('every generator: a clearly wrong answer is rejected, traps explain themselves', () => {
  allStages((t, g, st, seed) => {
    const a = t.answer, where = `${g.id} st${st} seed ${seed}`;
    if (a.type === 'fields') {
      const wrong = Object.fromEntries(a.fields.map(f => [f.key, f.type === 'sel' ? (f.correct + 1) % f.options.length : String(f.value + Math.max(50, Math.abs(f.value) * 3.7))]));
      assert.equal(M.check(t, wrong).ok, false, where);
      for (const f of a.fields) for (const trap of f.traps || []) {
        const r = M.checkField(f, trap.value.toFixed(8));
        assert.notEqual(r.state, 'ok', `${where} trap ${trap.msg} equals the answer`);
        assert.equal(r.state, 'trap', `${where} trap not recognised: ${trap.msg}`);
      }
    }
    if (a.type === 'choice') assert.equal(M.check(t, (a.correct + 1) % a.options.length).ok, false, where);
    if (a.type === 'tf') assert.equal(M.check(t, a.items.map(i => !i.truth)).ok, false, where);
    if (a.type === 'pick') assert.equal(M.check(t, a.targets.map(x => x + a.tol * 2.2)).ok, false, where);
    if (a.type === 'tangent') assert.equal(M.check(t, { k: -a.k - 2 * Math.sign(a.k), scale: 1 }).ok, false, where);
    if (a.type === 'zones') assert.equal(M.check(t, a.truth.map(s => s === '+' ? '-' : '+')).ok, false, where);
    if (a.type === 'sketch') { const fp0 = sketchBins(a), flipped = fp0.map(v => -v); if (Math.max(...fp0.map(Math.abs)) > 0.01) assert.equal(M.check(t, flipped).ok, false, where); }
  });
});
test('every generator: options are unique and graphs can be drawn', () => {
  allStages((t, g, st, seed) => {
    const a = t.answer, where = `${g.id} st${st} seed ${seed}`;
    if (a.options) {
      assert.ok(a.options.length >= 2, where);
      const texts = a.options.map(o => o.text).filter(Boolean);
      assert.equal(new Set(texts).size, texts.length, `${where} duplicate options ${texts.join(' | ')}`);
    }
    if (a.type === 'choice') assert.ok(a.options[a.correct]?.ok, where);
    if (a.type === 'multi') assert.ok(a.correct.length >= 1, where);
    for (const s of plotsOf(t)) {
      assert.ok(s.x[0] < s.x[1] && s.x[2] > 0 && s.y[0] < s.y[1] && s.y[2] > 0, `${where} axes ${s.x} ${s.y}`);
      assert.ok((s.x[1] - s.x[0]) / s.x[2] <= 40 && (s.y[1] - s.y[0]) / s.y[2] <= 40, `${where} too many ticks ${s.x} ${s.y}`);
      for (const c of s.curves) for (let i = 0; i <= 24; i++) {
        const x = s.x[0] + (s.x[1] - s.x[0]) * i / 24, y = c.fn(x);
        assert.ok(Number.isFinite(y), `${where} curve at ${x}`);
        assert.equal(c.fn(x), y, `${where} curve is random`);
      }
    }
    if (a.type === 'pick') { assert.ok(a.targets.length >= 1, where); const s = t.plots[a.plot]; for (const x of a.targets) assert.ok(x >= s.x[0] && x <= s.x[1], `${where} target ${x}`); }
    if (a.type === 'zones') assert.equal(a.truth.length, a.edges.length - 1, where);
  });
});
test('every topic has a task for every stage', () => {
  for (const topic of M.TOPIC_IDS) for (const stage of [1, 2, 3]) { const g = M.pickGen(topic, stage); assert.equal(g.topic, topic); assert.ok(g.min <= stage && g.max >= stage); }
});
test('numbers are read in Austrian notation', () => {
  assert.deepEqual(M.parseNumber('1,5'), [1.5]);
  assert.deepEqual(M.parseNumber('1.5'), [1.5]);
  assert.deepEqual(M.parseNumber('−2,5'), [-2.5]);
  assert.deepEqual(M.parseNumber('3/4'), [0.75]);
  assert.deepEqual(M.parseNumber('13,75 m/s'), [13.75]);
  assert.deepEqual(M.parseNumber('1 200'), [1200]);
  assert.deepEqual(M.parseNumber('1.234,5'), [1234.5]);
  assert.ok(M.parseNumber('27.000').includes(27000));
  assert.deepEqual(M.parseNumber('abc'), []);
  assert.equal(M.fmt(-0.5), '−0,5');
  assert.equal(M.fmt(1.5000001), '1,5');
  assert.equal(M.fmt(0), '0');
});
test('formulas render fractions, limits and powers without leaking markup', () => {
  const html = M.rich("$f'(x)=\\lim_{z\\to x}\\frac{f(z)-f(x)}{z-x}$ und **fett** <b>");
  assert.match(html, /class="mf"/); assert.match(html, /class="ml"/); assert.match(html, /<strong>fett<\/strong>/); assert.match(html, /&lt;b&gt;/);
  assert.match(M.rich('$x^2$'), /<sup>2<\/sup>/);
});
test('derivatives of the curves match a numeric slope', () => {
  for (const kind of ['line', 'parabola', 'cubic', 'quartic', 'saddle', 'sine', 'sigmoid', 'bump']) for (let seed = 1; seed <= 30; seed++) {
    const s = M.shape(M.makeRng(seed), kind), [a, b] = s.domain;
    for (let i = 1; i < 12; i++) { const x = a + (b - a) * i / 12, h = 1e-5; assert.ok(Math.abs((s.f(x + h) - s.f(x - h)) / (2 * h) - s.d(x)) < 1e-4, `${kind} ${seed} at ${x}`); }
    for (const r of s.roots) assert.ok(Math.abs(s.d(r)) < 1e-6, `${kind} root`);
  }
  for (let seed = 1; seed <= 30; seed++) {
    const s = M.knotShape(M.makeRng(seed));
    for (const k of s.knots) assert.ok(Math.abs(s.f(k.x) - k.y) < 1e-9);
    for (const e of s.ext) assert.ok(Math.abs(s.d(e.x)) < 1e-9);
    for (let x = 0.13; x < 8; x += 0.37) { const h = 1e-5; assert.ok(Math.abs((s.f(x + h) - s.f(x - h)) / (2 * h) - s.d(x)) < 1e-3); }
  }
  const w = M.waveCurve(1, 2, 5, 4, 0.8);
  assert.ok(Math.abs(w.f(1) - 2) < 1e-9 && Math.abs(w.f(5) - 4) < 1e-9);
});
test('the sketch grader accepts good sketches and names the typical mistakes', () => {
  for (const kind of ['parabola', 'cubic', 'quartic', 'saddle', 'sine', 'sigmoid', 'bump']) for (let seed = 1; seed <= 40; seed++) {
    const r = M.makeRng(seed), s = M.shape(r, kind), a = { type: 'sketch', f: s.f, fp: s.d, domain: s.domain, roots: s.roots, touch: s.touch, peaks: s.peaks, yRange: s.dRange };
    const where = `${kind} seed ${seed}`, A = s.dRange[1], rough = x => s.d(x) * 0.85 + A * 0.012 * Math.sin(x * 9);
    assert.equal(M.gradeSketch(a, sketchBins(a)).ok, true, `exact ${where}`);
    assert.equal(M.gradeSketch(a, sketchBins(a, rough)).ok, true, `rough ${where}`);
    assert.equal(M.gradeSketch(a, sketchBins(a, x => -s.d(x))).ok, false, `flipped ${where}`);
  }
  const s = M.shape(M.makeRng(5), 'cubic'), a = { type: 'sketch', f: s.f, fp: s.d, domain: s.domain, roots: s.roots, touch: s.touch, peaks: s.peaks, yRange: s.dRange };
  const [lo, hi] = M.minMax(s.f, ...s.domain), copy = M.gradeSketch(a, sketchBins(a, x => (s.f(x) - (lo + hi) / 2) / (hi - lo) * s.dRange[1] * 1.6));
  assert.equal(copy.ok, false); assert.match(copy.msgs.join(), /abgezeichnet/);
  const flip = M.gradeSketch(a, sketchBins(a, x => -s.d(x))); assert.match(flip.msgs.join(), /vertauscht/);
  const half = sketchBins(a); half.fill(null, 90); assert.equal(M.gradeSketch(a, half).ok, false);
  assert.equal(M.gradeSketch(a, Array(180).fill(null)).empty, true);
  const shifted = M.gradeSketch(a, sketchBins(a, x => s.d(x - 1.5))); assert.equal(shifted.ok, false, 'zeros in the wrong place'); assert.equal(shifted.criteria.find(c => c.key === 'zeros').ok, false);
});
test('progress: levels rise with correct answers and sync keeps the newer topic', () => {
  const p = M.emptyProgress();
  assert.equal(M.levelOf(p.topics.weg), 0);
  M.applyResult(p, 'weg', 0, 1, 10); assert.equal(p.topics.weg.score, 0); assert.equal(M.levelOf(p.topics.weg), 1);
  for (let i = 0; i < 6; i++) M.applyResult(p, 'weg', 1, M.stageFor(p.topics.weg.score), 20 + i);
  assert.equal(M.levelOf(p.topics.weg), 3); assert.ok(p.topics.weg.score <= 100);
  assert.equal(M.stageFor(0), 1); assert.equal(M.stageFor(50), 2); assert.equal(M.stageFor(90), 3);
  const merged = C.mergeMath({ topics: { weg: { score: 10, at: 5 }, sach: { score: 70, at: 9 } }, test: { best: 40, last: 40, at: 2, runs: 1 } }, { topics: { weg: { score: 60, at: 8 }, sach: { score: 20, at: 3 } }, test: { best: 55, last: 30, at: 7, runs: 2 } });
  assert.equal(merged.topics.weg.score, 60); assert.equal(merged.topics.sach.score, 70); assert.deepEqual(merged.test, { best: 55, last: 30, at: 7, runs: 2 });
  assert.equal(C.mergeStates({ sets: [], math: { topics: { weg: { score: 1, at: 1 } } } }, { sets: [] }).math.topics.weg.score, 1);
  const clean = M.validateProgress({ topics: { weg: { score: 900, seen: -1, right: 'x', at: 3 }, unknown: { score: 3 } }, test: { best: 150 } });
  assert.equal(clean.topics.weg.score, 100); assert.equal(clean.topics.weg.seen, 0); assert.equal(clean.topics.unknown, undefined); assert.equal(clean.test.best, 100);
});
test('mixed rounds change topic every time and favour weak topics', () => {
  const r = M.makeRng(3), strong = { topics: Object.fromEntries(M.TOPIC_IDS.map(id => [id, { score: id === 'winkel' ? 0 : 100, seen: 9, right: 9, at: Date.now() }])) };
  let weak = 0, total = 0;
  for (let i = 0; i < 200; i++) { const plan = M.planMix(strong, 8, r.next); plan.forEach((t, n) => { assert.ok(M.TOPIC_IDS.includes(t)); assert.notEqual(t, plan[n - 1]); total++; if (t === 'winkel') weak++; }); }
  assert.ok(weak / total > 1 / 7 * 1.5, `weak share ${weak / total}`);
});
test('test simulation: every part can be solved and points add up', () => {
  for (const size of ['full', 'short']) for (let seed = 1; seed <= 150; seed++) {
    const t = M.buildTest(seed, size), parts = t.tasks.flatMap(x => x.parts);
    assert.equal(t.points, parts.reduce((s, p) => s + p.points, 0));
    assert.equal(t.tasks.length, size === 'full' ? 7 : 3);
    assert.equal(new Set(parts.map(p => p.id)).size, parts.length);
    for (const task of t.tasks) for (const s of [task.lead, task.title]) { assert.doesNotMatch(s, /NaN|undefined/); assert.equal(s.split('$').length % 2, 1, s); }
    for (const p of parts) {
      assert.equal(M.check(p, rightAnswer(p)).ok, true, `${size} ${seed} ${p.ask}`);
      for (const s of [p.ask, ...(p.solution || [])]) { assert.doesNotMatch(s, /NaN|undefined/, s); assert.equal(s.split('$').length % 2, 1, s); }
      if (p.answer.type === 'pick') assert.ok(p.plots?.[p.answer.plot], `pick part needs its own graph: ${p.ask}`);
    }
  }
});

function app(store = new Map()) {
  const root = path.resolve(__dirname, '../dist');
  const { window } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = window;
  const localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  document.querySelectorAll('dialog').forEach(d => { d.showModal = () => d.setAttribute('open', ''); d.close = () => d.removeAttribute('open'); });
  const context = vm.createContext({ window, document, console, crypto: webcrypto, localStorage, requestAnimationFrame: fn => fn(), setTimeout: () => 1, clearTimeout: () => {}, Blob, URL, TextDecoder });
  for (const script of ['theme.js', 'core.js', 'seed.js', 'mathcore.js', 'math.js', 'rwcore.js', 'rw.js', 'app.js', 'effects.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script });
    if (script === 'core.js') window.WWCore = context.WWCore;
    if (script === 'mathcore.js') window.WWMath = context.WWMath;
    if (script === 'rwcore.js') window.WWRw = context.WWRw;
  }
  const $ = s => document.querySelector(s);
  const click = sel => { const el = typeof sel === 'string' ? $(sel) : sel; assert.ok(el, `Missing element ${sel}`); el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })); };
  return { $, click, store, window, document, data: () => JSON.parse(store.get('wortwechsel.v1')), text: () => $('#main').textContent };
}
const openMath = a => { a.click('[data-subject="Mathe"]'); assert.match(a.text(), /Mathe\./); };
function solveConvert(a) {
  const m = a.$('.m-ask').textContent.match(/([\d,]+)\s*(m\/s|km\/h)/), v = Number(m[1].replace(',', '.'));
  return String(m[2] === 'm/s' ? v * 3.6 : v / 3.6).replace('.', ',');
}
const type = (a, value) => { const input = a.$('input.m-num'); input.value = value; input.dispatchEvent(new a.window.Event('input', { bubbles: true })); };

test('Mathe is a subject with its own navigation and overview', () => {
  const a = app(); openMath(a);
  assert.equal(a.$('#nav-math').hidden, false); assert.equal(a.$('#nav-vocab').hidden, true); assert.equal(a.$('#nav-qa').hidden, true);
  assert.equal(a.document.querySelectorAll('.m-topic-grid .set-card').length, 7);
  a.click('[data-action="m-topic"][data-topic="grafisch"]');
  assert.match(a.text(), /Grafisches Ableiten/); assert.match(a.text(), /Typische Fehler/); assert.ok(a.$('#m-lab svg'));
  a.click('[data-action="m-home"]');
  a.click('[data-action="m-formulas"]'); assert.match(a.text(), /Formeln\./);
  const b = app(a.store); assert.match(b.text(), /Mathe\./);
  b.click('[data-subject="Spanisch"]'); assert.match(b.text(), /Lernsets/); assert.equal(b.$('#nav-math').hidden, true);
});
test('a practice round: right answers count, wrong ones return with new numbers, progress is saved', () => {
  const a = app(); openMath(a);
  a.click('[data-action="m-topic"][data-topic="weg"]');
  a.click('[data-action="m-gen"][data-gen="v-convert"]');
  type(a, solveConvert(a)); a.click('[data-action="m-check"]');
  assert.match(a.$('#m-verdict').textContent, /Richtig|Genau|Stimmt/);
  assert.equal(a.data().math.topics.weg.right, 1);
  a.click('[data-action="m-next"]');
  type(a, '999999'); a.click('[data-action="m-check"]'); assert.match(a.text(), /Noch nicht ganz/);
  type(a, '999998'); a.click('[data-action="m-check"]'); assert.match(a.text(), /Richtig:/);
  a.click('[data-action="m-next"]');
  a.click('[data-action="m-solve"]'); assert.match(a.text(), /Lösungsweg/); a.click('[data-action="m-next"]');
  let retries = 0, guard = 0;
  while (a.$('[data-action="m-check"]') && guard++ < 12) { if (a.text().includes('Nochmal mit neuen Zahlen')) retries++; type(a, solveConvert(a)); a.click('[data-action="m-check"]'); a.click('[data-action="m-next"]'); }
  assert.ok(retries >= 2, `retries ${retries}`);
  assert.match(a.text(), /Runde geschafft/); assert.ok(a.data().math.topics.weg.seen >= 7);
  assert.ok(Object.values(a.data().history).reduce((s, v) => s + v, 0) >= 7);
  const b = app(a.store); assert.ok(b.data().math.topics.weg.seen >= 7);
});
test('hints appear one by one, multiple choice answers at once', () => {
  const a = app(); openMath(a);
  a.click('[data-action="m-topic"][data-topic="ableitung"]'); a.click('[data-action="m-gen"][data-gen="a-extrema"]');
  a.click('[data-action="m-hint"]'); assert.equal(a.document.querySelectorAll('.m-hint').length, 1);
  a.click('[data-action="m-hint"]'); assert.equal(a.document.querySelectorAll('.m-hint').length, 2); assert.equal(a.$('[data-action="m-hint"]'), null);
  a.click('[data-action="m-exit"]'); a.click('#confirm-action');
  a.click('[data-action="m-gen"][data-gen="a-rules"]');
  a.click('[data-action="m-opt"]'); assert.ok(a.$('[data-action="m-next"]')); assert.ok(a.$('.choice-button.is-correct'));
});
test('leaving a running round asks first and blocks incoming sync', () => {
  const a = app(); openMath(a);
  a.click('[data-action="m-mix"]');
  assert.equal(a.window.WWApp.canApply(), false);
  a.click('[data-subject="Spanisch"]'); assert.equal(a.$('#confirm-dialog').hasAttribute('open'), true);
  a.click('#confirm-action');
  assert.equal(a.window.WWApp.canApply(), true);
});
test('test simulation: submit, correct and keep the result', () => {
  const a = app(); openMath(a);
  a.click('[data-action="m-test"]'); a.click('[data-action="m-exam-start"][data-size="short"]');
  assert.equal(a.document.querySelectorAll('.m-exam .qa-test-item').length, 3);
  a.click('[data-action="m-exam-submit"]'); a.click('#confirm-action');
  assert.match(a.text(), /Korrektur/);
  const plus = [...a.document.querySelectorAll('[data-action="m-points"][data-delta="0.5"]')];
  for (const b of plus) for (let i = 0; i < 12; i++) a.click(b);
  a.click('[data-action="m-exam-finish"]');
  assert.match(a.text(), /100/); assert.equal(a.data().math.test.best, 100); assert.equal(a.data().math.test.runs, 1);
});
test('old saves gain Mathe without losing anything', () => {
  const store = new Map(), first = app(store);
  const saved = first.data(); delete saved.math; store.set('wortwechsel.v1', JSON.stringify(saved));
  const a = app(store); assert.deepEqual(a.data().sets.length, saved.sets.length); assert.deepEqual(a.data().math.topics, {});
});
