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
  for (const script of ['theme.js', 'core.js', 'seed.js', 'mathcore.js', 'math.js', 'rwcore.js', 'rw.js', 'trainer.js', 'app.js', 'effects.js']) {
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

// ---- Buchungstrainer ----
const T = R.trainer;
const entryFrom = b => ({ rows: Array.from({ length: Math.max(b.soll.length, b.haben.length, 1) }, (_, r) => ({ sa: b.soll[r] ? T.kontoLabel(b.soll[r].acc) : '', sb: b.soll[r] ? amt(b.soll[r].amt) : '', ha: b.haben[r] ? b.haben[r].acc : '', hb: b.haben[r] ? amt(b.haben[r].amt) : '' })), effect: b.effect, none: !!b.none });
test('trainer cases: complete texts, balanced bookings, known accounts', () => {
  for (const t of T.TEMPLATES) for (let seed = 1; seed <= 150; seed++) {
    const c = T.makeCase(t.id, seed), where = `${t.id} seed ${seed}`, bookings = T.caseBookings(c);
    assert.ok(bookings.length >= 4, where);
    const text = JSON.stringify(c);
    assert.doesNotMatch(text, /NaN|undefined|Infinity|null €|€ −/, where);
    for (const s of c.steps) for (const x of [s.text, s.info, s.date].filter(Boolean)) assert.equal(String(x).split('$').length % 2, 1, `${where}: ${x}`);
    for (const b of bookings) {
      if (b.none) { assert.equal(c.allowNone, true, where); continue; }
      const sum = side => b[side].reduce((s, l) => s + l.amt, 0);
      assert.ok(Math.abs(sum('soll') - sum('haben')) < 0.005, `${where} unbalanced ${JSON.stringify(b)}`);
      for (const l of [...b.soll, ...b.haben]) { assert.ok(l.amt > 0, where); assert.ok(T.kontoName(l.acc, c.names), `${where} unknown account ${l.acc}`); }
      assert.ok(b.effect === null || ['↑', '↓', 'Ø'].includes(b.effect), where);
      if (b.soll.some(l => l.acc === '2500')) assert.ok(b.haben.some(l => /^33\d{3}$|^2[78]00$|^3[19]\d0$|^2700$/.test(l.acc)) || b.soll.length, where);
    }
    // Dates of documents run forward in time.
    const dates = c.steps.filter(s => s.date && s.beleg).map(s => { const [dd, mm, yy] = s.date.split('.').map(Number); return yy * 400 + mm * 32 + dd; });
    dates.forEach((x, i) => { if (i) assert.ok(x >= dates[i - 1], `${where} dates out of order`); });
  }
});
test('trainer rules follow the book and Austrian law', () => {
  for (let seed = 1; seed <= 200; seed++) {
    for (const c of [T.makeCase('gwg', seed), T.makeCase('gwg2', seed)]) for (const b of T.caseBookings(c)) {
      const gwg = b.soll.find(l => l.acc === '7060' || l.acc === '0670' || l.acc === '0672');
      if (gwg && b.haben.length && !b.haben.some(l => /^06/.test(l.acc))) assert.ok(gwg.amt <= 1000, `GWG over the limit ${gwg.amt}`);
      if (b.haben.some(l => l.acc === '3190' || l.acc === '3180')) assert.ok(!b.haben.some(l => l.acc === '2800'));
    }
    const f = T.makeCase('fahrzeug', seed), pkw = T.caseBookings(f)[0];
    if (!pkw.soll.some(l => l.acc === '2500')) assert.ok(pkw.soll[0].amt <= 40000, 'Pkw stays below the €40.000 luxury threshold');
    else assert.ok(pkw.haben[0].amt <= 40000, 'E-Pkw with input VAT only up to €40.000 gross');
  }
});
test('trainer grading: solution accepted in any order, mistakes explained', () => {
  for (const t of T.TEMPLATES) for (let seed = 1; seed <= 60; seed++) {
    const c = T.makeCase(t.id, seed);
    for (const b of T.caseBookings(c)) {
      const where = `${t.id} ${seed} ${JSON.stringify(b).slice(0, 120)}`, e = entryFrom(b);
      assert.equal(T.gradeBooking(b, e, c.names).complete, true, where);
      if (b.none) { assert.equal(T.gradeBooking(b, { ...e, none: false }, c.names).complete, false); continue; }
      const rev = { ...e, rows: [...e.rows].reverse().map(r => ({ ...r })) };
      assert.equal(T.gradeBooking(b, rev, c.names).complete, true, `${where} reversed lines`);
      const swapped = { ...e, rows: e.rows.map(r => ({ sa: r.ha, sb: r.hb, ha: r.sa, hb: r.sb })) };
      const g = T.gradeBooking(b, swapped, c.names);
      assert.equal(g.complete, false, where); assert.match(g.msgs.join(), /vertauscht/, where);
      if (b.effect) assert.equal(T.gradeBooking(b, { ...e, effect: b.effect === 'Ø' ? '↓' : 'Ø' }, c.names).complete, false, where);
      if (c.allowNone) assert.equal(T.gradeBooking(b, { ...e, none: true }, c.names).complete, false, where);
    }
  }
  const b = { soll: [{ acc: '0400', amt: 33200 }, { acc: '2500', amt: 6640 }], haben: [{ acc: '33084', amt: 39840 }], effect: 'Ø' }, names = { 33084: 'Schmidinger GmbH' };
  const row = (sa, sb, ha, hb) => ({ sa, sb, ha, hb });
  let g = T.gradeBooking(b, { rows: [row('0400', '33.200', '3300', '39840'), row('2500 Vorsteuer', '6640,00', '', '')], effect: 'Ø' }, names);
  assert.equal(g.fields[0].ha, 'bad'); assert.match(g.msgs.join(), /Personenkonto/); assert.equal(g.fields[0].sa, 'ok'); assert.equal(g.fields[1].sb, 'ok');
  g = T.gradeBooking(b, { rows: [row('Maschinen', '39.840,00', 'schmidinger', '39840'), row('vorsteuer', '6.640', '', '')], effect: 'Ø' }, names);
  assert.equal(g.fields[0].sa, 'ok'); assert.equal(g.fields[0].sb, 'bad'); assert.match(g.msgs.join(), /Brutto|Netto/); assert.equal(g.fields[0].ha, 'ok');
  assert.equal(T.resolveAcc('bank'), '2800'); assert.equal(T.resolveAcc('Vorsteuer'), '2500'); assert.equal(T.resolveAcc('0400 Maschinen'), '0400'); assert.equal(T.resolveAcc('xyz'), null);
  assert.equal(T.searchKonten('04')[0].no, '0400'); assert.equal(T.searchKonten('Schmid', names)[0].no, '33084');
  const card = { soll: [{ acc: '7060', amt: 582.5 }, { acc: '2500', amt: 116.5 }], haben: [{ acc: '3190', amt: 699 }], effect: '↓' };
  assert.match(T.gradeBooking(card, { rows: [row('7060', '582,50', '2800', '699'), row('2500', '116,50', '', '')], effect: '↓' }).msgs.join(), /3190/);
});

test('trainer UI: type a booking, get green fields, finish a case', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]');
  assert.ok(a.$('.tr-promo'));
  a.click('#nav-rw-trainer'); assert.match(a.text(), /Buchungstrainer\./); assert.equal(a.document.querySelectorAll('.tr-cases .set-card').length, T.TEMPLATES.length);
  a.click('[data-action="t-open"][data-tpl="kauf"]');
  const books = [...a.document.querySelectorAll('.tr-book')];
  assert.ok(books.length >= 8);
  // Fill the first booking through the fields, the way a learner types it.
  const first = books[0], typeIn = (sel, v) => { const el = first.querySelector(sel); el.value = v; a.fire(el, 'input'); a.fire(el, 'focusout'); return el; };
  const accs = [...first.querySelectorAll('.tr-a')], vals = [...first.querySelectorAll('.tr-v')];
  // The first document is either text or a real invoice; read the amounts from whichever is shown.
  const inv0 = a.$('.tr-step[data-step="0"] .bl-inv');
  const soll = inv0 ? [null, ...[...inv0.querySelectorAll('.bl-sum div')].filter(x => /Nettobetrag|USt|Rechnungsbetrag/.test(x.textContent)).map(x => x.querySelector('b').textContent.replace('€ ', ''))] : a.$('.tr-step[data-step="0"]').textContent.match(/€ ([\d.]+,\d\d) \+ € ([\d.]+,\d\d) USt = € ([\d.]+,\d\d)/);
  const supplierNo = a.$('.tr-doc').textContent.match(/\((\d{5})\)/)?.[1] || a.$('.tr-intro').textContent.match(/\((\d{5})\)/)[1];
  const wrong = typeIn('.tr-a[data-k="ha"][data-r="0"]', '3300');
  assert.ok(wrong.classList.contains('bad')); assert.match(first.querySelector('.tr-msg').textContent, /Personenkonto/);
  typeIn('.tr-a[data-k="sa"][data-r="0"]', 'masch');
  assert.equal(accs[0].value, '0400 Maschinen'); assert.ok(accs[0].classList.contains('ok'));
  typeIn('.tr-v[data-k="sb"][data-r="0"]', soll[1]); assert.ok(vals[0].classList.contains('ok'));
  typeIn('.tr-a[data-k="sa"][data-r="1"]', '2500'); typeIn('.tr-v[data-k="sb"][data-r="1"]', soll[2].replace(/\./g, ''));
  typeIn('.tr-a[data-k="ha"][data-r="0"]', supplierNo); typeIn('.tr-v[data-k="hb"][data-r="0"]', soll[3]);
  assert.equal(first.classList.contains('done'), false, 'effect still missing');
  a.click(first.querySelector('[data-action="t-effect"][data-v="Ø"]'));
  assert.equal(first.classList.contains('done'), true);
  assert.match(a.$('#tr-status').textContent, /^1 von/);
  // Hints come one at a time, the solution fills in and counts as shown.
  a.click(books[1].querySelector('[data-action="t-hint"]')); assert.equal(books[1].querySelectorAll('.tr-more li').length, 1);
  for (const box of books.slice(1)) a.click(box.querySelector('[data-action="t-solve"]'));
  assert.ok(books[1].classList.contains('shown')); assert.match(books[1].querySelector('.tr-a').value, /^0400/);
  // The first booking had a wrong try (3300), so nothing counts as right at the first attempt.
  assert.ok(a.$('.tr-result')); assert.match(a.$('.tr-result').textContent, /0 von \d+ Aufgaben auf Anhieb richtig, \d+ mit Lösung/);
  const st = a.data().rwt.kauf; assert.equal(st.runs, 1); assert.equal(st.perfect, 0); assert.equal(st.best, 0); assert.equal(st.bookings, 1);
  a.click('.tr-result [data-action="t-new"]'); assert.equal(a.document.querySelectorAll('.tr-book.done').length, 0);
  // A started case asks before it is left.
  const box = a.$('.tr-book'); const el = box.querySelector('.tr-a'); el.value = '04'; a.fire(el, 'input');
  a.click('[data-action="t-exit"]'); assert.equal(a.$('#confirm-dialog').hasAttribute('open'), true); a.click('#confirm-action');
  assert.match(a.text(), /Fälle/);
});
test('trainer UI: "Keine Buchung" in valuation cases', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]'); a.click('#nav-rw-trainer'); a.click('[data-action="t-open"][data-tpl="bewertung"]');
  const books = [...a.document.querySelectorAll('.tr-book')];
  assert.ok(books.every(b => b.querySelector('.tr-none')));
  const kauf = books[0]; a.click(kauf.querySelector('.tr-none'));
  assert.ok(kauf.querySelector('.tr-none').classList.contains('bad'));
  assert.match(kauf.querySelector('.tr-msg').textContent, /Buchung nötig/);
});

test('trainer vouchers match the bookings and use made-up bank data', () => {
  const ibanValid = iban => { const s = iban.replace(/ /g, ''), re = s.slice(4) + s.slice(0, 4); let m = 0; for (const ch of re) { const v = /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch; for (const c of v) m = (m * 10 + Number(c)) % 97; } return m === 1; };
  let docs = 0;
  for (const t of T.TEMPLATES) for (let seed = 1; seed <= 150; seed++) {
    const c = T.makeCase(t.id, seed), where = `${t.id} seed ${seed}`;
    const shown = c.steps.filter(s => s.doc && s.asDoc);
    if (c.steps.some(s => s.doc)) assert.ok(shown.length >= 1, `${where} at least one voucher`);
    for (const s of c.steps.filter(x => x.doc)) {
      const dc = s.doc, b = s.bookings; docs++;
      assert.ok(s.lead && !/undefined|NaN/.test(s.lead), where);
      if (dc.kind === 'invoice') {
        assert.ok(Math.abs(b[0].haben[0].amt - dc.gross) < 0.005, `${where} invoice total`);
        if (!dc.grossOnly) { assert.ok(Math.abs(dc.net + dc.vat - dc.gross) < 0.005); assert.ok(Math.abs(dc.lines.reduce((x, l) => x + l.total, 0) - dc.disc - dc.net) < 0.005); }
        assert.equal(ibanValid(dc.from.iban), false, `${where} IBAN must not be valid`);
        assert.match(dc.from.uid, /^ATU\d{8}$/);
        assert.match(s.lead, new RegExp(b[0].haben[0].acc), `${where} the supplier account number is given`);
      }
      if (dc.kind === 'receipt') { assert.ok(Math.abs(b[0].haben[0].amt - dc.total) < 0.005); assert.ok(Math.abs(dc.net + dc.vat - dc.total) < 0.005); assert.equal(b[0].haben[0].acc, { Bar: '2700', Debitkarte: '3190', Kreditkarte: '3180' }[dc.pay]); }
      if (dc.kind === 'bank') { const out = -dc.rows.reduce((x, r) => x + r.amount, 0), bank = b.flatMap(x => [...x.soll, ...x.haben]).filter(l => l.acc === '2800').reduce((x, l) => x + l.amt, 0); assert.ok(Math.abs(out - bank) < 0.005, `${where} bank amount`); assert.ok(dc.now >= 0 && Math.abs(dc.old - out - dc.now) < 0.005); }
    }
  }
  assert.ok(docs > 3000);
  assert.equal(T.makeCase('kauf', 5, { docs: 0 }).steps.some(s => s.asDoc), false);
  assert.ok(T.makeCase('kauf', 5, { docs: 1 }).steps.filter(s => s.doc).every(s => s.asDoc));
});
test('trainer UI: one document after the other, vouchers are shown', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]'); a.click('#nav-rw-trainer'); a.click('[data-action="t-open"][data-tpl="kauf"]');
  const steps = () => [...a.document.querySelectorAll('.tr-step')];
  assert.equal(steps()[0].hidden, false); assert.equal(steps()[1].hidden, true); assert.match(a.$('#tr-next').textContent, /Noch \d+ Schritte/);
  a.click(steps()[0].querySelector('[data-action="t-solve"]'));
  assert.equal(steps()[1].hidden, false); assert.equal(steps()[2].hidden, true);
  // Over a few cases at least one real invoice shows up.
  let seen = false;
  for (let i = 0; i < 12 && !seen; i++) { a.click('.tr-actions [data-action="t-new"]'); if (a.$('#confirm-dialog').hasAttribute('open')) a.click('#confirm-action'); seen = !!a.$('.tr-step:not([hidden]) .bl-inv'); }
  assert.ok(seen, 'an invoice voucher is rendered');
  const inv = a.$('.bl-inv'); assert.match(inv.textContent, /Rechnungsbetrag/); assert.match(inv.textContent, /20 % USt/); assert.match(inv.textContent, /IBAN AT/);
});

test('trainer: depreciation tables and valuation amounts are graded like the book', () => {
  // Book example Ü 2.3: Pkw € 34.000 from 11.10.2025, 8 years; Lagerhalle € 200.000 from 25.10.2025, 40 years.
  const pkw = { aw: 34000, nd: 8, rate: 12.5, half: true, annual: 4250, endOfLife: false, awTraps: [], rows: R.afaPlan(34000, 8, 10).rows.slice(0, 2) };
  assert.deepEqual(pkw.rows.map(x => [x.afa, x.bw]), [[2125, 31875], [4250, 27625]]);
  const halle = R.afaPlan(200000, 40, 10).rows.slice(0, 3);
  assert.deepEqual(halle.map(x => [x.afa, x.bw]), [[2500, 197500], [5000, 192500], [5000, 187500]]);
  const ok = T.gradeAfa(pkw, { aw: '34.000', p0: '12,5', a0: '2125', b0: '31 875', p1: '12,5 %', a1: '4.250,00', b1: '27625' });
  assert.equal(ok.complete, true);
  const half = T.gradeAfa(pkw, { aw: '34000', p0: '8', a0: '4250', b0: '29750' });
  assert.equal(half.fields.p0, 'bad'); assert.equal(half.fields.a0, 'bad'); assert.match(half.msgs.join(), /100 : Nutzungsdauer/); assert.match(half.msgs.join(), /Halbjahresregel/);
  for (const t of T.TEMPLATES) for (let seed = 1; seed <= 120; seed++) {
    const c = T.makeCase(t.id, seed), where = `${t.id} ${seed}`;
    for (const e of T.caseEntries(c)) {
      if (e.kind === 'afa') {
        const sp = e.spec, vals = { aw: amt(sp.aw) };
        sp.rows.forEach((row, i) => { vals[`p${i}`] = String(sp.rate).replace('.', ','); vals[`a${i}`] = amt(row.afa); vals[`b${i}`] = amt(row.bw); });
        assert.equal(T.gradeAfa(sp, vals).complete, true, where);
        assert.ok(Math.abs(sp.rows.reduce((x, r) => x + r.afa, 0) + sp.rows.at(-1).bw - sp.aw) < 0.01, `${where} table adds up`);
        for (const trap of sp.awTraps) assert.ok(Math.abs(trap.value - sp.aw) > 0.005, `${where} trap equals answer`);
      }
      if (e.kind === 'val') {
        assert.equal(T.gradeVal(e.spec, { v: amt(e.spec.value) }).complete, true, where);
        for (const trap of e.spec.traps) { const g = T.gradeVal(e.spec, { v: amt(trap.value) }); assert.equal(g.complete, false, where); assert.equal(g.msgs[0], trap.msg, where); }
      }
    }
  }
});
test('valuation table: values follow the valuation rules', () => {
  const sum = b => b.soll.reduce((x, l) => x + l.amt, 0);
  for (let seed = 1; seed <= 300; seed++) {
    const c = T.makeCase('tabelle', seed), where = `seed ${seed}`;
    assert.equal(c.layout, 'table'); assert.ok(c.steps.every(s => s.val && s.per));
    const groups = new Map();
    c.steps.forEach(s => { if (!groups.has(s.group)) groups.set(s.group, []); groups.get(s.group).push(s); });
    for (const rows of groups.values()) {
      const title = rows[0].groupTitle;
      if (title === 'Handelsware') {
        const variants = rows.slice(1), top = Math.max(...variants.map(s => s.val.value));
        assert.equal(variants.length, 3);
        for (const s of variants) { const b = s.bookings[0]; if (b.none) assert.ok(Math.abs(s.val.value - top) < 0.005, where); else { assert.ok(Math.abs(sum(b) - (top - s.val.value)) < 0.005, where); assert.deepEqual([b.soll[0].acc, b.haben[0].acc], ['7800', '1600']); } }
        continue;
      }
      if (title === 'Privatentnahme') { const b = rows[0].bookings[0]; assert.equal(b.soll[0].acc, '9600'); assert.ok(Math.abs(b.haben[0].amt - rows[0].val.value) < 0.005); continue; }
      assert.equal(rows[0].bookings.length, 0, `${where} purchase rows only ask for the value`);
      let prev = rows[0].val.value;
      const cost = prev;
      for (const s of rows.slice(1)) {
        const b = s.bookings[0], diff = Math.round((s.val.value - prev) * 100) / 100;
        assert.ok(s.val.value <= cost + 0.005, `${where} never above cost: ${s.text}`);
        if (Math.abs(diff) < 0.005) assert.ok(b.none, `${where} no change, no booking: ${s.text}`);
        else { assert.ok(Math.abs(sum(b) - Math.abs(diff)) < 0.005, `${where} booking equals the change: ${s.text}`); assert.equal(b.effect, diff > 0 ? '↑' : '↓', where); }
        if (/vorübergehend/.test(s.text)) assert.ok(b.none, `${where} temporary drop of fixed assets is not booked`);
        if (/nicht absehbar/.test(s.text) && /Kurs/.test(s.text)) assert.deepEqual([b.soll[0].acc, b.haben[0].acc], ['8200', '0800']);
        prev = s.val.value;
      }
    }
  }
});
test('trainer UI: valuation table and depreciation table', () => {
  const a = app();
  a.click('[data-subject="Rechnungswesen"]'); a.click('#nav-rw-trainer'); a.click('[data-action="t-open"][data-tpl="tabelle"]');
  assert.ok(a.$('.tv-group')); assert.match(a.$('.tr-tasks').textContent, /Wertansätze/);
  const first = a.$('.tr-step[data-step="0"]'), v = first.querySelector('.tr-val .tr-in');
  assert.equal(a.$('.tr-step[data-step="1"]').hidden, true);
  const m = first.querySelector('.tv-text').textContent.match(/([\d.]+) m² zu € ([\d.]+,\d\d)/), A = Number(m[1].replace(/\./g, '')), p0 = Number(m[2].replace(/\./g, '').replace(',', '.'));
  v.value = String(p0); a.fire(v, 'input'); a.fire(v, 'focusout'); assert.ok(v.classList.contains('bad')); assert.match(first.querySelector('.tr-msg').textContent, /Fläche mal Preis/);
  v.value = String(A * p0); a.fire(v, 'input'); a.fire(v, 'focusout');
  assert.ok(first.querySelector('.tr-val').classList.contains('done')); assert.equal(a.$('.tr-step[data-step="1"]').hidden, false);
  for (let i = 0; i < 60 && a.$('.tr-step:not([hidden]) .tr-book:not(.done):not(.shown) [data-action="t-solve"]'); i++) a.click('.tr-step:not([hidden]) .tr-book:not(.done):not(.shown) [data-action="t-solve"]');
  assert.ok(a.$('.tr-result')); assert.equal(a.data().rwt.tabelle.runs, 1);
  // Purchase case with the Excel-style depreciation table.
  a.click('[data-action="t-home"]'); a.click('[data-action="t-open"][data-tpl="fahrzeug"]');
  for (let i = 0; i < 40 && !a.$('.tr-step:not([hidden]) .tr-afa'); i++) a.click('.tr-step:not([hidden]) .tr-book:not(.done):not(.shown) [data-action="t-solve"]');
  const afa = a.$('.tr-step:not([hidden]) .tr-afa'); assert.ok(afa); assert.match(afa.textContent, /Abschreibung 2025/); assert.match(afa.textContent, /Buchwert 1\.1\.2026/);
  assert.match(a.$('.tr-tasks').textContent, /Berechne die Abschreibungsbeträge/);
});
