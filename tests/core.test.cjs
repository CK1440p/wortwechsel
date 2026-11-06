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
  for (let i = 0; i < 20; i++) { const r = C.createRound(set, { direction: 'random', roundSize: '10' }); assert.equal(r.queue.length, 10); assert.equal(new Set(r.queue.map(x => x.termId)).size, 10); r.queue.forEach(x => { assert.equal(x.reverse, undefined); directions.add(C.buildQuestion(set, x, {direction:'random'}).reverse); }); }
  assert.equal(directions.size, 2);
  assert.ok(C.createRound(set, { direction: 'forward', roundSize: 'all' }).queue.every(q => !q.reverse));
  assert.equal(C.createRound(set, { direction: 'reverse', roundSize: 'all' }).total, 95);
  set.terms.forEach(t => { for (const rev of [false, true]) { C.recordAnswer(t, rev, 'mc', true); C.recordAnswer(t, rev, 'written', true); C.recordAnswer(t, rev, 'written', true); } });
  delete set.terms[0].progress;
  assert.ok(C.createRound(set, { direction: 'forward', roundSize: '5' }).queue.some(x => x.termId === set.terms[0].id));
});

test('each presentation rerolls direction, ignoring queued and previous directions', () => {
  const set = {terms:C.parseImport('la ropa\tdie Kleidung\nel vestido\tdas Kleid').terms};
  const item = {termId:set.terms[0].id, reverse:false};
  const settings = {direction:'random', mode:'adaptive'};
  const first = C.buildQuestion(set, item, settings, () => .1);
  assert.equal(first.reverse, true); assert.equal(first.prompt, 'die Kleidung');
  C.recordAnswer(first.term, first.reverse, first.mode, true);
  const next = C.buildQuestion(set, first, settings, () => .9);
  assert.equal(next.reverse, false); assert.equal(next.prompt, 'la ropa');
  assert.equal(next.mode, 'mc'); // New direction keeps its own learning stage.
  const again = C.buildQuestion(set, next, settings, () => .1);
  assert.equal(again.reverse, true); assert.equal(again.mode, 'written');
  assert.equal(C.buildQuestion(set, again, {direction:'forward'}, () => .1).reverse, false);
  assert.equal(C.buildQuestion(set, item, {direction:'reverse'}, () => .9).reverse, true);
});
test('choices are unique and a single-pair set still supports writing', () => {
  const set = { terms: C.parseImport('la ropa\tdie Kleidung\nropa\tdie Kleidung\nel vestido\tdas Kleid\nla falda\tder Rock\nel jersey\tder Pullover').terms };
  const q = C.buildQuestion(set, { termId: set.terms[0].id, reverse: false }, { mode: 'mc' });
  assert.equal(new Set(q.options).size, 4); assert.ok(q.options.includes('die Kleidung'));
  const one = { terms: [set.terms[0]] };
  assert.equal(C.buildQuestion(one, { termId: one.terms[0].id, reverse: false }, { mode: 'adaptive' }).mode, 'written');
});

test('article omission does not accept a wrong article or a spurious article', () => {
  assert.ok(C.matches('vestido', 'el vestido'));
  assert.ok(!C.matches('la vestido', 'el vestido'));
  assert.ok(!C.matches('die tragen', 'tragen'));
});
test('multiline quoted TSV and CSV preserve cell contents through export', () => {
  const pairs = [{ front: 'a\nb\nc', back: 'x\ty "quoted"' }];
  const imported = C.parseImport(C.serializeTerms(pairs)).terms;
  assert.deepEqual(imported.map(({front, back}) => ({front, back})), pairs);
  const csv = C.parseImport('"one\ntwo\nthree","eins\nzwei\ndrei"');
  assert.equal(csv.terms.length, 1);
  assert.equal(csv.terms[0].back, 'eins\nzwei\ndrei');
});
test('distinct punctuation and case are preserved during duplicate removal', () => {
  const input = [{front:'1.5',back:'decimal'}, {front:'15',back:'decimal'}, {front:'US',back:'country'}, {front:'us',back:'pronoun'}];
  assert.equal(C.cleanPairs(input).terms.length, 4);
});
test('multiple choice excludes answers with overlapping accepted synonyms', () => {
  const set = {terms: C.cleanPairs([{front:'a',back:'stark, kräftig'}, {front:'b',back:'kräftig, robust'}, {front:'c',back:'klein'}]).terms};
  const question = C.buildQuestion(set, {termId:set.terms[0].id, reverse:false}, {mode:'mc'});
  assert.deepEqual(new Set(question.options), new Set(['stark, kräftig', 'klein']));
});
test('cloze always blanks demonstratives and thins out with the level', () => {
  const line = 'Me gusta mucho esta chaqueta azul, pero aquella negra también es bonita.';
  const easy = C.clozeLine(line, 1), hard = C.clozeLine(line, 2);
  const blanks = tokens => tokens.filter(t => t.blank);
  for (const tokens of [easy, hard]) for (const word of ['esta', 'aquella']) assert.ok(blanks(tokens).some(t => t.text === word));
  assert.equal(blanks(easy).length, 4); assert.equal(blanks(hard).length, 8);
  assert.ok(blanks(hard).every(t => t.hint === t.text[0])); assert.ok(blanks(easy).every(t => t.hint === ''));
  assert.equal(easy.map(t => t.text).join(''), line);
  assert.ok(!C.isDemonstrative('están') && !C.isDemonstrative('está'));
});
test('compareLine marks missing words and separates accent slips from errors', () => {
  const expected = '¿Qué talla tiene?';
  const slip = C.compareLine('que talla tiene', expected, { accents: false });
  assert.equal(slip.correct, true); assert.deepEqual(slip.accentSlips, ['Qué']);
  assert.equal(C.compareLine('que talla tiene', expected, { accents: true }).correct, false);
  const missing = C.compareLine('qué tiene', expected, {});
  assert.equal(missing.correct, false);
  assert.deepEqual(missing.parts.filter(p => p.word && !p.ok).map(p => p.text), ['talla']);
  assert.equal(C.compareLine('qué talla tiene usted', expected, {}).correct, false);
  assert.equal(C.compareLine('tiene talla qué', expected, {}).correct, false);
});
test('parseDialog reads speakers and translations, skips headings and rejects too little', () => {
  const { lines, skipped } = C.parseDialog('Adam, Felix\n\nA: ¡Hola! | Hallo!\nB: Son 15 euros: gracias.');
  assert.equal(skipped, 1); assert.equal(lines.length, 2);
  assert.deepEqual(lines[0], { speaker: 'A', es: '¡Hola!', de: 'Hallo!' });
  assert.deepEqual(lines[1], { speaker: 'B', es: 'Son 15 euros: gracias.', de: '' });
  assert.throws(() => C.parseDialog('nur eine Überschrift'), /Keine Dialogzeilen/);
  assert.deepEqual(C.parseDialog(C.serializeDialog({ lines })).lines, lines);
});
test('validateDialog clamps progress and rejects broken data', () => {
  assert.equal(C.validateDialog({ lines: [{ es: 'a' }] }), null);
  assert.equal(C.validateDialog(null), null);
  const d = C.validateDialog({ id: 'x', lines: [{ es: 'a' }, { es: 'b', speaker: 'B' }], progress: { best: 99 } });
  assert.equal(d.progress.best, 4); assert.equal(d.id, 'x');
  assert.notEqual(C.validateDialog({ id: 'x', lines: d.lines }, false).id, 'x');
  assert.deepEqual(C.dialogQueue(d, 'B'), [1]); assert.deepEqual(C.dialogQueue(d, 'Niemand'), [0, 1]);
});
test('parseDialog reads AI output: markdown, numbering, translation below, text around the dialogue', () => {
  const text = 'Hier ist der neue Dialog:\n\nAdam, Felix\n\n**A:** ¡Hola! ¿Puedo ayudarle?\n(Hallo! Kann ich Ihnen helfen?)\n\n2. **B:** Sí, busco una chaqueta. → Ja, ich suche eine Jacke.\n- A: ¿Qué talla tiene? | Welche Größe?\nB: La talla L.\n\nWas anders ist als vorher:\nAnrede: Die Verkäuferin sagt jetzt usted.\n\nViel Erfolg beim Lernen!';
  const { lines, skippedLines } = C.parseDialog(text);
  assert.deepEqual(lines.map(l => l.speaker), ['A', 'B', 'A', 'B']);
  assert.equal(lines[0].es, '¡Hola! ¿Puedo ayudarle?'); assert.equal(lines[0].de, 'Hallo! Kann ich Ihnen helfen?');
  assert.equal(lines[1].de, 'Ja, ich suche eine Jacke.'); assert.equal(lines[2].de, 'Welche Größe?'); assert.equal(lines[3].de, '');
  assert.ok(skippedLines.some(s => s.startsWith('Anrede'))); assert.ok(skippedLines.includes('Viel Erfolg beim Lernen!'));
});
test('parseDialog handles dash dialogues and a labelled translation line', () => {
  const dashes = C.parseDialog('– ¡Hola!\n– ¿Qué tal?\n– Muy bien.').lines;
  assert.deepEqual(dashes.map(l => l.speaker), ['A', 'B', 'A']); assert.equal(dashes[1].es, '¿Qué tal?');
  const labelled = C.parseDialog('Ana: Hola.\nDeutsch: Hallo.\nLuis: Adiós.').lines;
  assert.equal(labelled.length, 2); assert.equal(labelled[0].de, 'Hallo.');
  assert.equal(C.parseDialog('A: pegar (bien) | zusammenpassen\nB: pegar (bien)').lines[1].es, 'pegar (bien)');
});
test('dialogParts covers every line once and folds a short rest into the last part', () => {
  const dialog = n => ({ lines: Array.from({ length: n }, () => ({})) });
  assert.deepEqual(C.dialogParts(dialog(21)).map(p => p.key), ['0-4', '5-9', '10-14', '15-20']);
  assert.deepEqual(C.dialogParts(dialog(14)).map(p => p.key), ['0-4', '5-9', '10-13']);
  assert.equal(C.dialogParts(dialog(6)).length, 1); assert.equal(C.dialogParts(dialog(2)).length, 1);
  const d = { lines: [{ speaker: 'A' }, { speaker: 'B' }, { speaker: 'A' }] };
  assert.deepEqual(C.dialogQueue(d, 'all', { start: 1, end: 2 }), [1, 2]);
  assert.deepEqual(C.dialogQueue(d, 'A', { start: 1, end: 2 }), [2]);
  assert.deepEqual(C.dialogQueue(d, 'B', { start: 2, end: 2 }), [2], 'a part without the role still has lines');
});
test('part progress survives validation and merging', () => {
  const lines = [{ es: 'a' }, { es: 'b' }];
  const a = C.validateDialog({ id: 'x', lines, progress: { best: 1, parts: { '0-4': 2, '5-9': 9, bad: 3 } } });
  assert.deepEqual(a.progress.parts, { '0-4': 2, '5-9': 4 });
  const b = C.validateDialog({ id: 'x', lines, progress: { best: 2, parts: { '0-4': 1, '10-13': 3 } } });
  const merged = C.mergeStates({ sets: [], dialogs: [a] }, { sets: [], dialogs: [b] });
  assert.deepEqual(merged.dialogs[0].progress.parts, { '0-4': 2, '5-9': 4, '10-13': 3 }); assert.equal(merged.dialogs[0].progress.best, 2);
});

const demoTable = { groups: [{ label: 'm', columns: ['sg', 'pl'] }, { label: 'f', columns: ['sg', 'pl'] }], rows: [0, 1, 2].map(r => ({ label: `r${r}`, cells: [0, 1, 2, 3].map(c => `w${r}${c}`) })), sentences: [{ answer: 'Esta' }, { answer: 'Ese' }] };
test('grammarGaps hides 4, 8, all cells, then the sentences', () => {
  for (const [level, n] of [[1, 4], [2, 8], [3, 12]]) {
    const gaps = C.grammarGaps(demoTable, level);
    assert.equal(gaps.length, n); assert.equal(new Set(gaps.map(g => g.key)).size, n);
  }
  assert.deepEqual(C.grammarGaps(demoTable, 4, () => 0.999).map(g => g.answer).sort(), ['Ese', 'Esta']);
  assert.equal(C.grammarCells(demoTable)[6].answer, 'w12'); assert.equal(C.grammarCells(demoTable)[6].label, 'f sg, r1');
});
test('checkGap ignores case, reports accent slips and rejects other forms', () => {
  assert.equal(C.checkGap(' ESTA ', 'Esta'), 'right');
  assert.equal(C.checkGap('ésta', 'esta'), 'slip');
  assert.equal(C.checkGap('ésta', 'esta', true), 'wrong');
  assert.equal(C.checkGap('este', 'esta'), 'wrong'); assert.equal(C.checkGap('', 'esta'), 'wrong');
});
test('grammar progress merges to the higher stage and survives junk', () => {
  const merged = C.mergeStates({ sets: [], grammar: { a: { best: 1, practiced: '2026-11-04' }, b: { best: 3 } } }, { sets: [], grammar: { a: { best: 2, practiced: '2026-11-01' }, c: { best: 4 } } });
  assert.deepEqual(merged.grammar, { c: { best: 4, practiced: '' }, a: { best: 2, practiced: '2026-11-04' }, b: { best: 3, practiced: '' } });
  assert.deepEqual(C.mergeStates({ sets: [] }, { sets: [] }).grammar, {});
  assert.deepEqual(C.validateGrammarProgress('x'), {}); assert.deepEqual(C.validateGrammarProgress({ a: { best: 99 } }), { a: { best: 4, practiced: '' } });
});

test('parseCatalog reads pasted Word text with points, bullets and the other formats', () => {
  const word = '\t•\tWas versteht man unter Bipolarität?\t\t\t2 Punkte\nZwei Staaten dominieren.\n\n\t•\tNenne drei Faktoren!\t3 Punkte\n\t•\tAbrüstungsverträge\n\t•\tRolle der UNO\n';
  const qs = C.parseCatalog(word);
  assert.deepEqual(qs.map(q => [q.q, q.points]), [['Was versteht man unter Bipolarität?', 2], ['Nenne drei Faktoren!', 3]]);
  assert.equal(qs[1].answer, '• Abrüstungsverträge\n• Rolle der UNO');
  assert.deepEqual(C.answerParts(qs[1].answer).map(p => p.bullet), [true, true]);
  assert.equal(C.parseCatalog(C.serializeCatalog({ questions: qs })).length, 2);
  assert.equal(C.parseCatalog('F: Was ist X?\nA: Y\nF: Was ist Z?\nA: W')[1].answer, 'W');
  assert.equal(C.parseCatalog('Was ist X? | Y\n\nWas ist Z?\nW').length, 2);
  assert.throws(() => C.parseCatalog('   '), /Keine Fragen/);
});

test('history seed has all 14 test questions with 35 points', () => {
  const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(require.resolve('../dist/seed.js'), 'utf8'), ctx);
  const c = C.validateCatalog(ctx.window.WWCatalogSeed[0]);
  assert.equal(c.subject, 'Geschichte'); assert.equal(c.questions.length, 14);
  assert.equal(C.catalogStats(c).points, 35);
});

test('keyword coverage and point suggestions follow the model answer', () => {
  const answer = 'Westberlin wurde blockiert, die Versorgung erfolgte 1948/1949 mit US-Flugzeugen (Rosinenbomber)';
  const cov = C.keywordCoverage('westberlin blockiert, rosinenbomber', answer);
  assert.ok(cov.hits.has(C.qaStem('Rosinenbomber')) && cov.hits.has(C.qaStem('Westberlin')));
  assert.ok(!cov.hits.has(C.qaStem('Versorgung')));
  assert.equal(C.suggestPoints('', answer, 3), 0);
  assert.equal(C.suggestPoints(answer, answer, 3), 3);
});

test('question levels, queue order and merging by latest change', () => {
  assert.equal(C.rateQuestion(undefined, 'known').level, 2);
  assert.equal(C.rateQuestion({ level: 2 }, 'known').level, 3);
  assert.equal(C.rateQuestion({ level: 3 }, 'again').level, 1);
  const c = C.validateCatalog({ subject: 'Bio', questions: [{ id: 'a', q: 'A?', answer: 'x' }, { id: 'b', q: 'B?', answer: 'y' }, { id: 'c', q: 'C?', answer: 'z' }], progress: { a: { level: 3, at: 1 }, c: { level: 1, at: 1 } } });
  assert.deepEqual(C.catalogQueue(c), ['c', 'b', 'a']);
  assert.deepEqual(C.catalogQueue(c, true), ['c', 'b']);
  const other = { ...c, progress: { a: { level: 1, seen: 1, at: 5 } }, test: { best: 80, last: 80, at: 5 } };
  const merged = C.mergeStates({ catalogs: [c] }, { catalogs: [other] }).catalogs[0];
  assert.equal(merged.progress.a.level, 1); assert.equal(merged.progress.c.level, 1); assert.equal(merged.test.best, 80);
});
