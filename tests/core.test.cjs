const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const C = require('../dist/core.js');
const context = { window: {} }; vm.runInNewContext(fs.readFileSync(require.resolve('../dist/seed.js'), 'utf8'), context);
const seed = context.window.WWSeed;

test('all 95 original terms import and export losslessly', () => {
  const { terms } = C.parseImport(seed.pairs);
  assert.equal(terms.length, 95);
  assert.equal(terms[0].front, 'decidirse por');
  assert.equal(terms.at(-1).back, 'der Hut');
  const roundtrip = C.parseImport('\uFEFF' + terms.map(t => t.front + '\t' + t.back).join('\n'));
  assert.deepEqual(roundtrip.terms.map(t => [t.front, t.back]), terms.map(t => [t.front, t.back]));
});
test('copied Quizlet page drops recommendations and progress labels', () => {
  const all = C.parseImport(seed.pairs).terms;
  const raw = `Suchen\nUpgrade 7 Tage\nLa ropa\nFalsches empfohlenes Lernset\nBegriffe in diesem Lernset (95)\nDeine Statistik\nWird gerade gelernt (8)\nDiese Begriffe lernst du gerade. Immer weiter so!\nDiese 8 auswählen\n${all.slice(0, 8).map(t => t.front + '\n\n' + t.back).join('\n\n')}\nGemeistert (2)\nDiese Begriffe hast du richtig beantwortet!\nDiese 2 auswählen\n${all.slice(8, 10).map(t => t.front + '\n' + t.back).join('\n')}\nNoch nicht gelernt (85)\nDiese Begriffe hast du noch nicht gelernt!\nDiese 85 auswählen\n${all.slice(10).map(t => t.front + '\n' + t.back).join('\n')}`;
  const result = C.parseImport(raw);
  assert.equal(result.terms.length, 95);
  assert.deepEqual(result.terms.map(t => [t.front, t.back]), all.map(t => [t.front, t.back]));
  assert.equal(result.warnings.length, 0);
});
test('CSV quoting, BOM, headers, semicolon, arrow, alternating lines and JSON', () => {
  assert.deepEqual(C.parseImport('\uFEFFSpanisch,Deutsch\r\n"fuerte","stark, kräftig"\r\n"el bolso","die Handtasche"').terms.map(t => [t.front, t.back]), [['fuerte', 'stark, kräftig'], ['el bolso', 'die Handtasche']]);
  assert.equal(C.parseImport('el vestido;das Kleid\nla ropa;die Kleidung').terms.length, 2);
  assert.equal(C.parseImport('el vestido → das Kleid\nla ropa → die Kleidung').terms.length, 2);
  const result = C.parseImport('el vestido\ndas Kleid\nla ropa');
  assert.equal(result.terms.length, 1); assert.equal(result.warnings.length, 1);
  assert.equal(C.parseImport(JSON.stringify([{ term: 'la ropa', definition: 'Kleidung' }])).terms[0].back, 'Kleidung');
  assert.ok(C.parseImport('{"sets":[]}').backup);
});
test('duplicates, empty entries and malformed imports are handled', () => {
  assert.equal(C.parseImport('la ropa\tdie Kleidung\nla ropa\tdie Kleidung').terms.length, 1);
  assert.equal(C.parseImport('la ropa\tdie Kleidung\nla ropa\tdie Kleidung').warnings.length, 1);
  assert.throws(() => C.parseImport(''), /zuerst/);
  assert.throws(() => C.parseImport('{broken'), /JSON/);
  assert.throws(() => C.parseImport('x'.repeat(2_000_001)), /groß/);
  assert.equal(C.cleanPairs([null, 2, '', { front: 'x', back: 'y' }]).terms.length, 1);
});
test('writing accepts relevant variants and respects accent and article settings', () => {
  assert.ok(C.matches('KLEIDUNG!', 'die Kleidung'));
  assert.ok(!C.matches('Kleidung', 'die Kleidung', { articles: false }));
  assert.ok(C.matches('algodon', 'el algodón'));
  assert.ok(!C.matches('el algodon', 'el algodón', { accents: true }));
  assert.ok(C.matches('kräftig', 'stark, kräftig'));
  assert.ok(C.matches('kurzärmlig', 'kurzärmlig/langärmlig'));
  assert.ok(C.matches('de manga larga', 'de manga corta/larga'));
  assert.ok(C.matches('pasado de moda', 'pasado/pasada de moda'));
  assert.ok(!C.matches('pasado', 'pasado/pasada de moda'));
  assert.ok(C.matches('pegar', 'pegar (bien)'));
  assert.ok(C.matches('la fashionista', 'el fashionista / la fashionista'));
  assert.ok(!C.matches('', 'la ropa'));
  assert.ok(!C.matches('el vestido', 'la ropa'));
});
test('adaptive stages: MC then writing twice, independent for both directions', () => {
  const set = { terms: C.parseImport('la ropa\tdie Kleidung\nel vestido\tdas Kleid').terms };
  const t = set.terms[0], item = { termId: t.id, reverse: false }, settings = { mode: 'adaptive' };
  assert.equal(C.buildQuestion(set, item, settings).mode, 'mc');
  C.recordAnswer(t, false, 'mc', true);
  assert.equal(C.buildQuestion(set, item, settings).mode, 'written');
  C.recordAnswer(t, false, 'written', true); C.recordAnswer(t, false, 'written', true);
  assert.equal(C.mastery(t), 3);
  assert.equal(C.buildQuestion(set, { ...item, reverse: true }, settings).mode, 'mc');
  C.recordAnswer(t, true, 'mc', true); C.recordAnswer(t, true, 'written', true); C.recordAnswer(t, true, 'written', true);
  assert.equal(C.mastery(t), 6); assert.equal(C.setStats(set).mastered, 1);
  C.recordAnswer(t, false, 'written', false);
  assert.equal(C.mastery(t), 5); assert.equal(C.setStats(set).mastered, 0);
});
test('rounds select requested sizes, weak terms, and both random directions', () => {
  const set = { terms: C.parseImport(seed.pairs).terms };
  const directions = new Set();
  for (let i = 0; i < 20; i++) { const r = C.createRound(set, { direction: 'random', roundSize: '10' }); assert.equal(r.queue.length, 10); assert.equal(new Set(r.queue.map(x => x.termId)).size, 10); r.queue.forEach(x => directions.add(x.reverse)); }
  assert.equal(directions.size, 2);
  assert.ok(C.createRound(set, { direction: 'forward', roundSize: 'all' }).queue.every(q => !q.reverse));
  assert.equal(C.createRound(set, { direction: 'reverse', roundSize: 'all' }).total, 95);
  set.terms.forEach(t => { for (const rev of [false, true]) { C.recordAnswer(t, rev, 'mc', true); C.recordAnswer(t, rev, 'written', true); C.recordAnswer(t, rev, 'written', true); } });
  delete set.terms[0].progress;
  assert.ok(C.createRound(set, { direction: 'forward', roundSize: '5' }).queue.some(x => x.termId === set.terms[0].id));
});
test('choices are unique and a single-pair set still supports writing', () => {
  const set = { terms: C.parseImport('la ropa\tdie Kleidung\nropa\tdie Kleidung\nel vestido\tdas Kleid\nla falda\tder Rock\nel jersey\tder Pullover').terms };
  const q = C.buildQuestion(set, { termId: set.terms[0].id, reverse: false }, { mode: 'mc' });
  assert.equal(new Set(q.options).size, 4); assert.ok(q.options.includes('die Kleidung'));
  const one = { terms: [set.terms[0]] };
  assert.equal(C.buildQuestion(one, { termId: one.terms[0].id, reverse: false }, { mode: 'adaptive' }).mode, 'written');
});
