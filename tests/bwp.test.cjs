const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const M = require('../dist/mathcore.js');
const B = require('../dist/bwpcore.js');

const SEEDS = 120;
const allStages = fn => { for (const g of B.GENS) for (let st = g.min; st <= g.max; st++) for (let seed = 1; seed <= SEEDS; seed++) fn(B.makeTask(g.id, st, seed), g, st, seed); };
function rightAnswer(t) {
  const a = t.answer;
  if (a.type === 'fields') return Object.fromEntries(a.fields.map(f => [f.key, f.type === 'sel' ? f.correct : f.value.toFixed(8).replace('.', ',')]));
  if (a.type === 'choice') return a.correct;
  if (a.type === 'multi') return a.correct;
  if (a.type === 'tf') return a.items.map(i => i.truth);
  if (a.type === 'cloze') return a.parts.filter(p => typeof p !== 'string').map(p => p.correct);
  throw new Error(a.type);
}
function texts(t) {
  const a = t.answer, out = [t.lead, t.ask, ...(t.hints || []), ...(t.solution || []).filter(s => typeof s === 'string'), t.takeaway];
  if (a.fields) for (const f of a.fields) { out.push(f.label, f.unit); (f.traps || []).forEach(x => out.push(x.msg)); (f.options || []).forEach(o => out.push(o)); }
  if (a.options) a.options.forEach(o => out.push(o.text));
  if (a.items) a.items.forEach(i => out.push(i.text, i.why));
  if (a.parts) a.parts.forEach(p => typeof p === 'string' ? out.push(p) : p.options.forEach(o => out.push(o)));
  if (a.grid) a.grid.rows.forEach(r => { out.push(r.label); r.cells.forEach(c => out.push(typeof c === 'string' ? c : c.note)); });
  if (t.table) t.table.rows.flat().forEach(c => out.push(c));
  for (const s of t.solution || []) if (s?.table) s.table.rows.flat().forEach(c => out.push(c));
  return out.filter(x => x !== undefined && x !== null && x !== '');
}

test('every generator: complete texts without stray formula marks', () => {
  allStages((t, g, st, seed) => { for (const s of texts(t)) { const where = `${g.id} st${st} seed ${seed}: ${s}`; assert.doesNotMatch(String(s), /NaN|undefined|Infinity|\[object/, where); assert.equal(String(s).split('$').length % 2, 1, where); } });
});
test('every generator: the correct answer is accepted, wrong ones are not', () => {
  allStages((t, g, st, seed) => {
    const where = `${g.id} st${st} seed ${seed}`, a = t.answer;
    assert.equal(M.check(t, rightAnswer(t)).ok, true, where);
    if (a.type === 'fields') for (const f of a.fields) {
      if (f.type === 'sel') { assert.ok(f.correct >= 0, `${where} ${f.label}`); assert.equal(new Set(f.options).size, f.options.length, `${where} duplicate options`); continue; }
      assert.notEqual(M.checkField(f, String(f.value + Math.max(50, Math.abs(f.value) * 2))).state, 'ok', where);
      for (const trap of f.traps) assert.equal(M.checkField(f, trap.value.toFixed(Math.max(2, f.d)).replace('.', ',')).state, 'trap', `${where} ${trap.msg}`);
    }
    if (a.type === 'choice') { assert.equal(new Set(a.options.map(o => o.text)).size, a.options.length, `${where} duplicate options`); assert.equal(M.check(t, (a.correct + 1) % a.options.length).ok, false, where); }
    if (a.type === 'tf') assert.equal(M.check(t, a.items.map(i => !i.truth)).ok, false, where);
    if (a.grid) { const keys = a.grid.rows.flatMap(r => r.cells.filter(c => c && typeof c === 'object').map(c => c.k)); assert.deepEqual([...keys].sort(), a.fields.map(f => f.key).sort(), `${where} grid covers every field once`); }
  });
});
test('every topic has a task for every stage', () => {
  for (const topic of B.TOPIC_IDS) for (const stage of [1, 2, 3]) assert.equal(B.pickGen(topic, stage).topic, topic, `${topic} ${stage}`);
});

test('formulas reproduce the book and the class quiz', () => {
  const c = B.calc;
  // Pizzaöfen (Kostenvergleich): Braintop 15.000 / 8 J. / 4 %, Austrotech 15.600 / 10 J. / 4 %.
  assert.equal(c.zins(15000, 0, 4), 300); assert.equal(c.afa(15000, 0, 8), 1875); assert.equal(B.r2((300 + 1875 + 38000) / 28000), 1.43);
  assert.equal(c.zins(15600, 0, 4), 312); assert.equal(c.afa(15600, 0, 10), 1560); assert.equal(B.r2((312 + 1560 + 36000) / 30000), 1.26);
  // Kritische Menge Druckmaschine: 1.787,50 Stunden.
  const f1 = c.afa(1700000, 0, 10) + c.zins(1700000, 0, 6), f2 = c.afa(2250000, 0, 10) + c.zins(2250000, 0, 6);
  assert.equal(f1, 221000); assert.equal(f2, 292500); assert.equal(c.crit(f1, f2, 150, 110), 1787.5);
  // Zimmerrenovierung: Gewinn 75.000 / 132.000, Rentabilität 64 % / 48 %.
  const g4 = 180000 - c.zins(250000, 0, 4) - c.afa(250000, 0, 10) - 75000, g5 = 430000 - c.zins(600000, 0, 4) - c.afa(600000, 0, 6) - 186000;
  assert.equal(g4, 75000); assert.equal(g5, 132000); assert.equal(c.rent(g4, 5000, c.kap(250000, 0)), 64); assert.equal(c.rent(g5, 12000, c.kap(600000, 0)), 48);
  // Quiz Frage 7: Maschine A € 49.600, B € 53.400. Café Bella: Gesamtkosten 16.120 / 15.900.
  assert.equal(c.afa(80000, 10000, 5) + c.zins(80000, 10000, 8) + 12000 + 20000, 49600); assert.equal(c.afa(100000, 10000, 5) + c.zins(100000, 10000, 8) + 15000 + 16000, 53400);
  assert.equal(c.afa(24000, 4000, 5) + c.zins(24000, 4000, 8) + 3000 + 8000, 16120); assert.equal(c.afa(30000, 5000, 5) + c.zins(30000, 5000, 8) + 3500 + 6000, 15900);
  assert.equal(c.amort(150000, 0, 30000), 5);
  // Entschädigung: 80.000 / 100.000 / 60.000 → 48.000; Über- und Vollversicherung zahlen den Schaden.
  assert.equal(c.entsch(80000, 100000, 60000), 48000); assert.equal(c.entsch(110000, 100000, 60000), 60000); assert.equal(c.entsch(30000, 25000, 7500), 7500);
  // Bonus-Malus: Stufe 10 = 120 % = 1.760 € → 100 % = 1.466,67; Stufe 2 (60 %) vierteljährlich 73,03 → nach Unfall Stufe 5 (70 %).
  assert.deepEqual([B.BM[0], B.BM[7], B.BM[8], B.BM[9], B.BM[10], B.BM[13], B.BM[14], B.BM[17]], [50, 80, 100, 100, 120, 140, 170, 200]);
  assert.equal(B.r2(c.bm(1760, 10, 9)), 1466.67); assert.equal(B.r2(c.bm(73.03 * 4, 2, 5)), 340.81);
});
test('generated cases follow the same formulas', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const r = M.kit.makeRng(seed), k = B.critCase(r);
    assert.ok(Math.abs(k.m1.fix + k.m1.v * k.crit - (k.m2.fix + k.m2.v * k.crit)) < 0.01, 'equal costs at the critical quantity');
    assert.ok(k.m2.v < k.m1.v && k.m2.fix > k.m1.fix);
    const cmp = B.bmCompare(M.kit.makeRng(seed));
    assert.equal(cmp.self[0], Math.max(0, cmp.s - 1)); assert.equal(cmp.ins[0], Math.min(17, cmp.s + 3)); assert.equal(cmp.ins[1], Math.min(17, cmp.s + 3) - 1);
    const u = B.underCase(M.kit.makeRng(seed), 2); assert.ok(Math.abs(u.pay - B.calc.entsch(u.vs, u.vw, u.dmg)) < 1e-9);
    const f = B.fullCase(M.kit.makeRng(seed));
    for (const X of [f.A, f.B]) { assert.ok(Math.abs(X.rent - B.calc.rent(X.g, X.zins, X.kap)) < 1e-9); assert.ok(Math.abs(X.am - B.calc.amort(X.ak, X.rw, X.g + X.afa)) < 1e-9); assert.ok(Math.abs(X.zins - B.calc.zins(X.ak, X.rw, X.i)) < 1e-9); }
  }
});
test('test simulation: every part solvable, points add up', () => {
  for (const size of ['full', 'short', 'inv']) for (const focus of [true, false]) for (let seed = 1; seed <= 60; seed++) {
    const t = B.buildTest(seed, size, { focus }), parts = t.tasks.flatMap(x => x.parts);
    assert.equal(t.points, parts.reduce((s, p) => s + p.points, 0));
    for (const p of parts) assert.equal(M.check(p, rightAnswer(p)).ok, true, `${size} ${seed} ${p.ask}`);
  }
});

function app(store = new Map()) {
  const root = path.resolve(__dirname, '../dist');
  const { window } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = window;
  const localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  document.querySelectorAll('dialog').forEach(d => { d.showModal = () => d.setAttribute('open', ''); d.close = () => d.removeAttribute('open'); });
  const context = vm.createContext({ window, document, console, crypto: webcrypto, localStorage, requestAnimationFrame: fn => fn(), setTimeout: () => 1, clearTimeout: () => {}, Blob, URL, TextDecoder });
  for (const script of ['theme.js', 'core.js', 'seed.js', 'mathcore.js', 'math.js', 'rwcore.js', 'rw.js', 'bwpcore.js', 'bwp.js', 'trainer.js', 'drill.js', 'app.js', 'effects.js', 'calc.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script });
    if (script === 'core.js') window.WWCore = context.WWCore;
    if (script === 'mathcore.js') window.WWMath = context.WWMath;
    if (script === 'rwcore.js') window.WWRw = context.WWRw;
    if (script === 'bwpcore.js') window.WWBwp = context.WWBwp;
  }
  const $ = s => document.querySelector(s);
  const click = sel => { const el = typeof sel === 'string' ? $(sel) : sel; assert.ok(el, `Missing element ${sel}`); el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })); };
  const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
  return { $, click, fire, store, window, document, data: () => JSON.parse(store.get('wortwechsel.v1')), text: () => $('#main').textContent };
}
const num = s => Number(s.replace(/[^\d,−-]/g, '').replace(/\./g, '').replace(',', '.'));

test('BWP is its own subject with grouped topics, labs and formulas', () => {
  const a = app();
  a.click('[data-subject="BWP"]');
  assert.match(a.text(), /BWP\./); assert.equal(a.$('#nav-bwp').hidden, false); assert.equal(a.$('#nav-rw').hidden, true); assert.equal(a.$('#nav-qa').hidden, true);
  assert.equal(a.document.querySelectorAll('.m-topic-grid .set-card').length, 11);
  assert.match(a.text(), /Risikopolitische Maßnahmen/); assert.match(a.text(), /Extra – kein SA-Stoff/);
  assert.match(a.text(), /Versicherungen/); assert.match(a.text(), /Investitionsrechnung/);
  for (const [topic, sel] of [['kfz', '.bwp-stairs'], ['leistung', '.bwp-ubars'], ['kosten', '.bwp-kchart'], ['renta', '.bwp-acols']]) {
    a.click('[data-action="m-home"]'); a.click(`[data-action="m-topic"][data-topic="${topic}"]`); assert.ok(a.$(sel), `${topic} lab`);
  }
  // Bonus-Malus lab: an accident moves three stages up.
  a.click('[data-action="m-home"]'); a.click('[data-action="m-topic"][data-topic="kfz"]'); a.click('[data-bm="3"]'); assert.equal(a.$('[data-r="s"]').textContent, '12'); assert.equal(a.$('[data-r="p"]').textContent, '140 %');
  a.click('[data-action="m-home"]'); a.click('[data-action="m-formulas"]'); assert.match(a.text(), /\(AK \+ RW\) : 2/); assert.match(a.text(), /Gewinn \+ kalk\. Zinsen/);
});
test('a cost comparison is filled in the Excel sheet and saved as progress', () => {
  const a = app();
  a.click('[data-subject="BWP"]'); a.click('[data-action="m-topic"][data-topic="kosten"]'); a.click('[data-action="m-gen"][data-gen="kv-voll"]');
  assert.ok(a.$('.xl'), 'worksheet'); assert.equal(a.$('.xl-title').textContent.includes('Kostenvergleichsrechnung'), true);
  // Read the data rows like a student would and compute the solution.
  const rows = Object.fromEntries([...a.document.querySelectorAll('.xl-data')].map(tr => { const td = tr.querySelectorAll('td'); return [td[0].textContent, [num(td[1].textContent), num(td[2].textContent)]]; }));
  const [ak, rw, nd, i, run] = ['Anschaffungskosten in EUR', 'Restwert in EUR', 'Nutzungsdauer in Jahren', 'Zinssatz p. a.', 'Laufende Betriebskosten in EUR'].map(k => rows[k]);
  const put = (key, v) => { const inp = a.$(`.xl [data-key="${key}"] input`); inp.value = String(v).replace('.', ','); a.fire(inp, 'input'); };
  const tot = [0, 1].map(j => { const z = B.calc.zins(ak[j], rw[j], i[j]), f = B.calc.afa(ak[j], rw[j], nd[j]); const s = 'AB'[j]; put(`z${s}`, z); put(`a${s}`, f); put(`r${s}`, run[j]); put(`t${s}`, B.r2(z + f + run[j])); return z + f + run[j]; });
  const sel = a.$('.xl [data-key="w"] select'), names = [...a.document.querySelectorAll('.xl-head')][0].querySelectorAll('td');
  const want = tot[0] < tot[1] ? names[1].textContent : names[2].textContent, idx = [...sel.querySelectorAll('option')].findIndex(o => o.textContent === want) - 1;
  sel.querySelectorAll('option').forEach(o => o.toggleAttribute('selected', o.getAttribute('value') === String(idx))); sel.value = String(idx); a.fire(sel, 'change');
  a.click('[data-action="m-check"]');
  assert.equal(a.document.querySelectorAll('.xl .m-field.ok').length, 9, a.$('#m-verdict')?.textContent);
  assert.equal(a.data().bwp.topics.kosten.right, 1);
});
test('BWP test simulation can be submitted and graded', () => {
  const a = app();
  a.click('[data-subject="BWP"]'); a.click('[data-action="m-test"]');
  assert.equal(a.document.querySelectorAll('[data-action="m-exam-start"]').length, 3); assert.match(a.text(), /Ganze SA/);
  a.click('[data-action="m-exam-start"][data-size="inv"]');
  assert.equal(a.document.querySelectorAll('.m-exam .qa-test-item').length, 3); assert.ok(a.document.querySelectorAll('.m-exam .xl').length >= 2);
  a.click('[data-action="m-exam-submit"]'); a.click('#confirm-action');
  assert.match(a.text(), /Korrektur/);
  a.click('[data-action="m-exam-finish"]'); assert.equal(a.data().bwp.test.runs, 1); assert.equal(a.data().rw.test.runs, 0);
});

test('SA focus: only school-test topics in mixing, progress and test, switchable', () => {
  assert.deepEqual(B.SA_TOPICS, ['prinzip', 'risiko', 'sv', 'privat', 'invest', 'kosten', 'gewinn', 'renta']);
  const progress = B.validateProgress({});
  for (let i = 0; i < 50; i++) for (const id of B.planMix(progress, 8, Math.random, Date.now(), B.SA_TOPICS)) assert.ok(B.SA_TOPICS.includes(id), id);
  const extraGens = ['vertrag', 'leistung', 'kfz'].flatMap(t => B.GENS.filter(g => g.topic === t).map(g => g.id));
  for (let seed = 1; seed <= 40; seed++) for (const size of ['full', 'short', 'inv']) {
    const titles = B.buildTest(seed, size).tasks.map(t => t.title).join(' ');
    assert.doesNotMatch(titles, /Bonus-Malus|Versicherungsleistung/, `${size} ${seed}`);
  }
  assert.match(B.buildTest(1, 'full', { focus: false }).tasks.map(t => t.title).join(' '), /Bonus-Malus/);
  assert.ok(extraGens.length > 10);
  const store = new Map(), a = app(store);
  a.click('[data-subject="BWP"]');
  const sw = a.$('[data-action="m-focus"]'); assert.ok(sw); assert.equal(sw.getAttribute('aria-checked'), 'true'); assert.match(a.text(), /aus dem SA-Stoff/);
  assert.ok(a.$('.m-off'), 'extra topics are dimmed');
  a.click('[data-action="m-focus"]'); assert.equal(a.$('[data-action="m-focus"]').getAttribute('aria-checked'), 'false'); assert.equal(store.get('wortwechsel.focus.bwp'), '0'); assert.equal(a.$('.m-off'), null);
  a.click('[data-action="m-focus"]'); assert.equal(store.get('wortwechsel.focus.bwp'), '1');
  // A mixed round in SA mode never shows an extra topic.
  a.click('[data-action="m-mix"]'); assert.ok(a.$('#m-card')); assert.doesNotMatch(a.$('.round-progress').textContent, /Vertrag und Schadensfall|Versicherungsleistung|Kfz und Bonus-Malus/);
  // The calculator is available in BWP and can take its result into a worksheet field.
  assert.equal(a.document.body.classList.contains('calc-on'), true); assert.ok(a.$('#calc-toggle'));
  // Other courses have no switch.
  a.click('[data-subject="Mathe"]'); assert.equal(a.$('[data-action="m-focus"]'), null);
});
test('risk policy: the four measures are taught and checked', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 200; seed++) { const t = B.makeTask('r-massnahme', 1, seed); seen.add(t.answer.options[t.answer.correct].text); }
  assert.deepEqual([...seen].sort(), ['Risiko selbst tragen', 'Risiko vermeiden', 'Risiko vermindern', 'Risiko überwälzen']);
  const insurance = [...Array(300).keys()].map(s => B.makeTask('r-massnahme', 1, s + 1)).find(t => /Feuerversicherung/.test(t.lead));
  assert.ok(insurance); assert.equal(insurance.answer.options[insurance.answer.correct].text, 'Risiko überwälzen');
});
test('calculator docks on the right and can be detached again', () => {
  const store = new Map(), a = app(store);
  a.window.innerWidth = 1400;
  a.click('[data-subject="BWP"]'); a.click('#calc-toggle');
  const panel = a.$('#calc');
  assert.equal(panel.hidden, false); assert.ok(panel.classList.contains('docked')); assert.ok(a.document.body.classList.contains('calc-docked'));
  a.click('#calc [data-c="dock"]');
  assert.equal(panel.classList.contains('docked'), false); assert.equal(a.document.body.classList.contains('calc-docked'), false);
  assert.equal(JSON.parse(store.get('wortwechsel.calc')).dock, false);
  a.click('#calc [data-c="dock"]'); assert.ok(panel.classList.contains('docked'));
  a.click('#calc [data-c="close"]'); assert.equal(a.document.body.classList.contains('calc-docked'), false, 'closing gives the room back');
});
