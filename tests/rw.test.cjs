const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');
const M = require('../dist/mathcore.js');
const R = require('../dist/rwcore.js');

const SEEDS = 150;
const allStages = fn => { for (const g of R.GENS) for (let st = g.min; st <= g.max; st++) for (let seed = 1; seed <= SEEDS; seed++) fn(R.makeTask(g.id, st, seed), g, st, seed); };
const amt = x => x.toFixed(2).replace('.', ',');
function rightAnswer(t) {
  const a = t.answer;
  if (a.type === 'fields') return Object.fromEntries(a.fields.map(f => [f.key, f.type === 'sel' ? f.correct : f.value.toFixed(8).replace('.', ',')]));
  if (a.type === 'choice') return a.correct;
  if (a.type === 'tf') return a.items.map(i => i.truth);
  if (a.type === 'booking') return { soll: a.soll.map(l => ({ acc: l.acc, amt: amt(l.amt) })), haben: a.haben.map(l => ({ acc: l.acc, amt: amt(l.amt) })), effect: a.effect };
  throw new Error(a.type);
}
function texts(t) {
  const a = t.answer, out = [t.lead, t.ask, ...(t.hints || []), ...(t.solution || []).filter(s => typeof s === 'string'), t.takeaway];
  if (a.fields) for (const f of a.fields) { out.push(f.label, f.unit); (f.traps || []).forEach(x => out.push(x.msg)); (f.options || []).forEach(o => out.push(o)); }
  if (a.options) a.options.forEach(o => out.push(o.text));
  if (a.items) a.items.forEach(i => out.push(i.text, i.why));
  if (a.accounts) a.accounts.forEach(x => out.push(x.label));
  if (t.table) t.table.rows.flat().forEach(c => out.push(c));
  return out.filter(x => x !== undefined && x !== null && x !== '');
}

test('every generator: texts are complete and contain no stray formula marks', () => {
  allStages((t, g, st, seed) => { for (const s of texts(t)) { const where = `${g.id} st${st} seed ${seed}: ${s}`; assert.doesNotMatch(String(s), /NaN|undefined|Infinity|\[object/, where); assert.equal(String(s).split('$').length % 2, 1, where); } });
});
test('every generator: the correct answer is accepted', () => {
  allStages((t, g, st, seed) => assert.equal(M.check(t, rightAnswer(t)).ok, true, `${g.id} st${st} seed ${seed}`));
});
test('bookings: balanced, right accounts offered, wrong bookings rejected with a reason', () => {
  allStages((t, g, st, seed) => {
    const a = t.answer, where = `${g.id} st${st} seed ${seed}`;
    if (a.type !== 'booking') return;
    const sum = side => a[side].reduce((s, l) => s + l.amt, 0);
    assert.ok(Math.abs(sum('soll') - sum('haben')) < 0.005, `${where} unbalanced ${sum('soll')} ${sum('haben')}`);
    for (const l of [...a.soll, ...a.haben]) { assert.ok(l.amt > 0, `${where} amount ${l.amt}`); assert.ok(a.accounts.some(x => x.no === l.acc), where); }
    assert.ok(a.accounts.length >= a.soll.length + a.haben.length + 2, `${where} too few distractors`);
    const right = rightAnswer(t);
    const swapped = M.check(t, { soll: right.haben, haben: right.soll, effect: right.effect });
    assert.equal(swapped.ok, false, where); assert.match(swapped.msgs.join(), /vertauscht/, where);
    const wrongAmt = M.check(t, { ...right, soll: right.soll.map((l, i) => i ? l : { ...l, amt: amt(Number(l.amt.replace(',', '.')) + 7) }) });
    assert.equal(wrongAmt.ok, false, where);
    // The same booking split over two lines on one account still counts.
    const [first, ...rest] = right.haben, half = Number(first.amt.replace(',', '.')) / 2;
    assert.equal(M.check(t, { ...right, haben: [{ acc: first.acc, amt: amt(Math.floor(half * 100) / 100) }, { acc: first.acc, amt: amt(Math.ceil(half * 100) / 100) }, ...rest] }).ok, true, `${where} split`);
    if (a.effect) assert.equal(M.check(t, { ...right, effect: a.effect === 'Ø' ? '↓' : 'Ø' }).ok, false, where);
  });
});
test('every generator: clearly wrong numbers are rejected, traps are recognised', () => {
  allStages((t, g, st, seed) => {
    const a = t.answer, where = `${g.id} st${st} seed ${seed}`;
    if (a.type === 'fields') for (const f of a.fields) {
      if (f.type === 'sel') continue;
      assert.notEqual(M.checkField(f, String(f.value + Math.max(50, Math.abs(f.value) * 2))).state, 'ok', where);
      for (const trap of f.traps) { const r = M.checkField(f, trap.value.toFixed(2).replace('.', ',')); assert.equal(r.state, 'trap', `${where} ${trap.msg}`); }
    }
    if (a.type === 'choice') { assert.equal(new Set(a.options.map(o => o.text)).size, a.options.length, `${where} duplicate options`); assert.equal(M.check(t, (a.correct + 1) % a.options.length).ok, false, where); }
    if (a.type === 'tf') assert.equal(M.check(t, a.items.map(i => !i.truth)).ok, false, where);
  });
});
test('every topic has a task for every stage', () => {
  for (const topic of R.TOPIC_IDS) for (const stage of [1, 2, 3]) assert.equal(R.pickGen(topic, stage).topic, topic);
});
test('depreciation matches the book examples', () => {
  const kombi = R.afaPlan(18920, 8, 10);
  assert.equal(kombi.rows.length, 9); assert.equal(kombi.rows[0].afa, 1182.5); assert.equal(kombi.rows[1].afa, 2365); assert.equal(kombi.rows[1].bw, 15372.5); assert.equal(kombi.rows.at(-1).afa, 1182.5); assert.equal(kombi.rows.at(-1).bw, 0);
  const ofen = R.afaPlan(80000, 5, 8);
  assert.deepEqual(ofen.rows.map(x => x.afa), [8000, 16000, 16000, 16000, 16000, 8000]); assert.equal(ofen.rows.at(-1).bw, 0);
  const pc = R.afaPlan(1200, 3, 3, { keepEuro: true });
  assert.deepEqual(pc.rows.map(x => x.afa), [400, 400, 399]); assert.equal(pc.rows.at(-1).bw, 1);
  assert.equal(R.afaPlan(1000, 8, 1).rate, 12.5);
});
test('booking check: split Skonto booking like in the book', () => {
  const t = { answer: R.booking(M.makeRng(1), [['33120', 95400]], [['2800', 93492], ['0400', 1590], ['2500', 318]], { names: { 33120: 'Maschinenbau AG' } }) };
  assert.equal(M.check(t, { soll: [{ acc: '33120', amt: '93.492,00' }, { acc: '33120', amt: '1.908' }], haben: [{ acc: '2800', amt: '93492' }, { acc: '0400', amt: '€ 1.590,00' }, { acc: '2500', amt: '318' }] }).ok, true);
  const missing = M.check(t, { soll: [{ acc: '33120', amt: '95400' }], haben: [{ acc: '2800', amt: '93492' }, { acc: '0400', amt: '1908' }] });
  assert.equal(missing.ok, false); assert.match(missing.msgs.join(), /Vorsteuer|Betrag/);
  assert.equal(M.check(t, { soll: [], haben: [] }).empty, true);
});
test('test simulation: every part solvable, points add up', () => {
  for (const size of ['full', 'short']) for (let seed = 1; seed <= 120; seed++) {
    const t = R.buildTest(seed, size), parts = t.tasks.flatMap(x => x.parts);
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
  for (const script of ['theme.js', 'core.js', 'seed.js', 'mathcore.js', 'math.js', 'rwcore.js', 'rw.js', 'app.js', 'effects.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script });
    if (script === 'core.js') window.WWCore = context.WWCore;
    if (script === 'mathcore.js') window.WWMath = context.WWMath;
    if (script === 'rwcore.js') window.WWRw = context.WWRw;
  }
  const $ = s => document.querySelector(s);
  const click = sel => { const el = typeof sel === 'string' ? $(sel) : sel; assert.ok(el, `Missing element ${sel}`); el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })); };
  const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));
  return { $, click, fire, store, window, document, data: () => JSON.parse(store.get('wortwechsel.v1')), text: () => $('#main').textContent };
}

test('Rechnungswesen is its own subject next to Mathe', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]');
  assert.match(a.text(), /Rechnungswesen\./); assert.equal(a.$('#nav-rw').hidden, false); assert.equal(a.$('#nav-math').hidden, true);
  assert.equal(a.document.querySelectorAll('.m-topic-grid .set-card').length, 7);
  a.click('[data-action="m-topic"][data-topic="afa"]'); assert.ok(a.$('.m-afa-ctl')); assert.match(a.text(), /Halbjahresregel/);
  a.click('[data-action="m-home"]'); a.click('[data-action="m-formulas"]'); assert.match(a.text(), /Strenges Höchstwertprinzip/);
  a.click('[data-subject="Mathe"]'); assert.match(a.text(), /Mathe\./); assert.equal(a.$('#nav-rw').hidden, true);
});
test('a booking task is answered through the Soll/Haben widget and saved as progress', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]'); a.click('[data-action="m-topic"][data-topic="abuch"]'); a.click('[data-action="m-gen"][data-gen="ab-euro"]');
  const fill = (side, acc, value) => { const line = [...a.document.querySelectorAll(`[data-side="${side}"] .m-book-line`)].pop(); const sel = line.querySelector('select'); sel.querySelectorAll('option').forEach(o => o.toggleAttribute('selected', o.getAttribute('value') === acc)); a.fire(sel, 'change'); const inp = line.querySelector('input'); inp.value = value; a.fire(inp, 'input'); };
  const assetAcc = [...a.document.querySelectorAll('[data-side="haben"] select option')].map(o => o.value).find(v => /^0/.test(v));
  a.click('[data-action="m-check"]'); assert.equal(a.$('[data-action="m-next"]'), null, 'empty booking is not checked');
  fill('soll', assetAcc, '1'); fill('haben', '7010', '1'); a.click('[data-action="m-check"]');
  assert.match(a.text(), /Noch nicht ganz/); assert.match(a.text(), /vertauscht/);
  a.click('[data-action="m-solve"]'); assert.ok(a.$('.m-book-right .m-bk')); assert.match(a.$('.m-book-right').textContent, /7010/);
  assert.equal(a.data().rw.topics.abuch.seen, 1);
  a.click('[data-action="m-next"]');
  const acc2 = [...a.document.querySelectorAll('[data-side="haben"] select option')].map(o => o.value).find(v => /^0/.test(v));
  fill('soll', '7010', '1,00'); fill('haben', acc2, '1');
  if (a.$('[data-action="m-check"]') && a.text().includes('Erinnerungseuro')) { a.click('[data-action="m-check"]'); assert.match(a.$('#m-verdict').textContent, /Richtig|Genau|Stimmt/); }
});
test('Rechnungswesen test simulation can be submitted and graded', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]'); a.click('[data-action="m-test"]'); a.click('[data-action="m-exam-start"][data-size="short"]');
  assert.equal(a.document.querySelectorAll('.m-exam .qa-test-item').length, 2); assert.ok(a.document.querySelectorAll('.m-book').length >= 4);
  a.click('[data-action="m-exam-submit"]'); a.click('#confirm-action');
  assert.match(a.text(), /Korrektur/); assert.ok(a.document.querySelectorAll('.m-book-right .m-bk').length >= 4);
  a.click('[data-action="m-exam-finish"]'); assert.equal(a.data().rw.test.runs, 1); assert.equal(a.data().math.test.runs, 0);
});
