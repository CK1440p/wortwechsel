const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseHTML } = require('linkedom');
const { webcrypto } = require('node:crypto');

function app(store = new Map()) {
  const root = path.resolve(__dirname, '../dist');
  const { window } = parseHTML(fs.readFileSync(path.join(root, 'index.html'), 'utf8'));
  const { document } = window;
  class MockFormData {
    constructor(form) { this.map = new Map(); for (const field of form.querySelectorAll('[name]')) { const checked = field.checked ?? field.hasAttribute('checked'); if (['radio', 'checkbox'].includes(field.type) && !checked) continue; this.map.set(field.name, field.value || 'on'); } }
    get(name) { return this.map.get(name) ?? null; }
    has(name) { return this.map.has(name); }
  }
  const localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) };
  document.querySelectorAll('dialog').forEach(d => { d.showModal = () => d.setAttribute('open', ''); d.close = () => d.removeAttribute('open'); });
  const context = vm.createContext({ window, document, console, crypto: webcrypto, localStorage, FormData: MockFormData, requestAnimationFrame: fn => fn(), setTimeout: () => 1, clearTimeout: () => {}, Blob, URL, TextDecoder });
  for (const script of ['theme.js', 'core.js', 'seed.js', 'app.js', 'effects.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, script), 'utf8'), context, { filename: script });
    if (script === 'core.js') window.WWCore = context.WWCore;
  }
  const $ = s => document.querySelector(s);
  const click = selector => { const el = typeof selector === 'string' ? $(selector) : selector; assert.ok(el, `Missing element ${selector}`); el.dispatchEvent(new window.Event('click', { bubbles: true, cancelable: true })); };
  const submit = selector => $(selector).dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  return { $, click, submit, store, window, document, data: () => JSON.parse(store.get('wortwechsel.v1')), text: () => $('#main').textContent };
}
function answerCorrect(a) {
  const prompt = a.$('.question-prompt h1').textContent;
  const set = a.data().sets.find(s => s.id === a.data().selectedId);
  const term = set.terms.find(t => t.front === prompt || t.back === prompt);
  assert.ok(term, 'Prompt belongs to the active set');
  const expected = term.front === prompt ? term.back : term.front;
  if (a.$('#written-answer')) { a.$('#written-answer').value = expected; a.submit('#answer-form'); }
  else { const choice = [...a.document.querySelectorAll('.choice-button')].find(b => b.querySelector('span:nth-child(2)').textContent === expected); a.click(choice); }
}

test('dashboard loads all 95 terms, term search, flashcards and reload persistence', () => {
  const a = app();
  assert.match(a.text(), /Lernsets/); assert.equal(a.data().sets[0].terms.length, 95);
  a.click('[data-action="open-set"]');
  assert.equal(a.document.querySelectorAll('.term-row').length, 95);
  a.$('#term-search').value = 'Handtasche'; a.$('#term-search').dispatchEvent(new a.window.Event('input', { bubbles: true }));
  assert.equal(a.document.querySelectorAll('.term-row').length, 1);
  a.click('[data-action="flashcards"]'); const before = a.$('.flashcard strong').textContent;
  a.click('[data-action="flip-card"]'); assert.notEqual(a.$('.flashcard strong').textContent, before);
  a.click('[data-action="next-card"]'); assert.match(a.$('.flash-controls').textContent, /2/);
  assert.equal(app(a.store).data().sets[0].terms.length, 95);
});
test('a full adaptive round uses MC then keyboard, ends, and persists progress', () => {
  const a = app(); a.click('[data-action="learn"]');
  let mc = 0, written = 0, attempts = 0;
  while (a.$('.question-card') && attempts < 100) {
    a.$('#written-answer') ? written++ : mc++;
    answerCorrect(a); assert.ok(a.$('.answer-feedback.correct'));
    // A second submit must not count the same answer twice.
    const oldCount = Object.values(a.data().history).reduce((n, v) => n + v, 0);
    if (a.$('#answer-form')) a.submit('#answer-form');
    assert.equal(Object.values(a.data().history).reduce((n, v) => n + v, 0), oldCount);
    a.click('[data-action="next"]'); attempts++;
  }
  assert.ok(mc >= 10 && mc <= 20); assert.ok(written >= 20 && written <= 40);
  assert.equal(attempts, mc + written);
  assert.match(a.text(), /Runde geschafft|RUNDE GESCHAFFT/);
  const terms = a.data().sets[0].terms;
  assert.equal(terms.filter(t => t.progress).length, 10);
  assert.equal(app(a.store).data().sets[0].terms.filter(t => t.progress).length, 10);
});
test('wrong answer is shown, repeated later, and recovered before round completion', () => {
  const a = app(); a.click('[data-action="learn"]');
  const first = a.$('.question-prompt h1').textContent;
  a.click('[data-action="dont-know"]'); assert.ok(a.$('.answer-feedback.incorrect'));
  a.click('[data-action="next"]'); assert.notEqual(a.$('.question-prompt h1').textContent, first);
  let attempts = 0;
  while (a.$('.question-card') && attempts++ < 100) { answerCorrect(a); a.click('[data-action="next"]'); }
  assert.match(a.text(), /Wiederholte Begriffe/); assert.ok(a.$('[data-action="repeat-errors"]'));
});
test('import preview can be edited, saved, and unsafe markup is text', () => {
  const a = app(); a.click('[data-action="import"]');
  a.$('#import-title').value = '<img src=x onerror=alert(1)>';
  a.$('#import-text').value = 'hola → hallo\nadiós → tschüss'; a.submit('#import-form');
  assert.equal(a.document.querySelectorAll('.preview-row').length, 2);
  a.$('[data-row="0"] [data-side="back"]').value = 'Hallo!';
  a.submit('#import-form');
  assert.equal(a.data().sets.length, 2); assert.equal(a.data().sets[1].terms[0].back, 'Hallo!');
  assert.equal(a.$('#main img'), null); assert.match(a.$('.set-page-heading h1').textContent, /<img/);
  a.click('[data-action="edit-set"]'); a.submit('#import-form'); a.submit('#import-form');
  assert.equal(a.data().sets.length, 2);
});
test('backup restore keeps existing sets and restores directional progress', () => {
  const a = app(); a.click('[data-action="import"]');
  a.$('#import-title').value = 'Sicherung';
  a.$('#import-text').value = JSON.stringify({ sets: [{ title: 'Test', frontLang: 'Englisch', backLang: 'Deutsch', terms: [{ front: 'cat', back: 'Katze', progress: { forward: { mc: 1, written: 2 } } }] }] });
  a.submit('#import-form');
  assert.equal(a.data().sets.length, 2); assert.equal(a.data().sets[1].terms[0].progress.forward.written, 2);
});
test('single-term sets, settings, cancellation and confirmed deletion work', () => {
  const a = app(); a.click('[data-action="import"]'); a.$('#import-title').value = 'Ein Wort'; a.$('#import-text').value = 'hola → hallo'; a.submit('#import-form'); a.submit('#import-form');
  a.click('[data-action="settings"]'); a.submit('#settings-form');
  a.click('[data-action="learn"]'); assert.ok(a.$('#written-answer'));
  a.click('[data-action="exit-learning"]'); a.click('[data-close="confirm-dialog"]'); assert.ok(a.$('.question-card'));
  a.click('[data-action="exit-learning"]'); a.click('#confirm-action');
  a.click('[data-action="delete"]'); assert.equal(a.data().sets.length, 2);
  a.click('#confirm-action'); assert.equal(a.data().sets.length, 1);
});

test('corrupt saved data is never replaced by the initial seed', () => {
  const raw = '{"sets":broken-but-recoverable';
  const store = new Map([['wortwechsel.v1', raw]]);
  const a = app(store);
  assert.equal(store.get('wortwechsel.v1'), raw);
  a.click('[data-action="learn"]'); a.click('[data-action="dont-know"]');
  assert.equal(store.get('wortwechsel.v1'), raw);
  assert.equal(a.$('#storage-warning').hidden, false);
});
test('a stale tab cannot overwrite newer saved progress', () => {
  const a = app();
  const newer = a.data(); newer.sets[0].title = 'Newer tab changes';
  const serialized = JSON.stringify(newer); a.store.set('wortwechsel.v1', serialized);
  a.click('[data-action="open-set"]');
  assert.equal(a.store.get('wortwechsel.v1'), serialized);
  assert.match(a.$('#storage-warning').textContent, /anderer Tab/);
});
test('going back from import preview removes hidden required fields', () => {
  const a = app(); a.click('[data-action="import"]');
  a.$('#import-title').value = 'Test'; a.$('#import-text').value = 'a → b'; a.submit('#import-form');
  a.click('[data-action="add-pair"]'); a.click('#import-back-btn');
  assert.equal(a.$('#import-preview input[required]'), null);
  a.$('#import-text').value = 'c → d'; a.submit('#import-form'); a.submit('#import-form');
  assert.equal(a.data().sets.at(-1).terms[0].front, 'c');
});
test('JSON backup skips null entries without crashing and retains valid pairs', () => {
  const a = app(); a.click('[data-action="import"]'); a.$('#import-title').value = 'Backup';
  a.$('#import-text').value = JSON.stringify({sets:[{title:'Recovered', terms:[null,{front:'hi',back:'hallo'}]}]});
  a.submit('#import-form');
  assert.equal(a.data().sets.at(-1).title, 'Recovered');
  assert.equal(a.data().sets.at(-1).terms.length, 1);
});

test('theme defaults to dark and toggles persist without changing learning data', () => {
  const a = app();
  assert.equal(a.document.documentElement.dataset.theme, 'dark');
  assert.equal(a.$('#theme-toggle').getAttribute('aria-pressed'), 'true');
  const before = a.store.get('wortwechsel.v1');
  a.click('#theme-toggle');
  assert.equal(a.document.documentElement.dataset.theme, 'light');
  assert.equal(a.$('#theme-toggle').getAttribute('aria-pressed'), 'false');
  assert.equal(a.store.get('wortwechsel.v1'), before);
  const reloaded = app(a.store);
  assert.equal(reloaded.document.documentElement.dataset.theme, 'light');
  reloaded.click('#theme-toggle');
  assert.equal(app(a.store).document.documentElement.dataset.theme, 'dark');
});

test('theme switch respects reduced motion while remaining functional', () => {
  const a = app(); let animations = 0;
  a.window.matchMedia = () => ({ matches: true });
  a.$('#theme-toggle').animate = () => { animations++; };
  a.click('#theme-toggle');
  assert.equal(animations, 0);
  assert.equal(a.document.documentElement.dataset.theme, 'light');
});
const WORD = /[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu;
// The active line is identified by its German cue; blanks are then filled from the stored sentence.
function fillDialogLine(a, right = true) {
  const line = a.data().dialogs[0].lines.find(l => a.$('.dlg-prompt').textContent.endsWith(l.de));
  assert.ok(line, 'Prompt belongs to the dialogue');
  const cloze = a.$('.dlg-cloze');
  if (cloze) {
    const words = line.es.match(WORD); let index = 0;
    for (const node of [...cloze.childNodes]) {
      if (node.nodeType === 1) { node.value = right ? words[index] : 'xxx'; index++; }
      else index += (node.textContent.match(WORD) || []).length;
    }
  } else a.$('#dlg-line').value = right ? line.es : 'nada';
  a.submit('#dlg-form');
}
test('old saves keep their data and gain the built-in dialogues', () => {
  const store = new Map([['wortwechsel.v1', JSON.stringify({ sets: [{ id: 's', title: 'Alt', terms: [{ id: 't', front: 'a', back: 'b' }] }], settings: { mode: 'mc' }, history: { '2026-01-01': 3 } })]]);
  const a = app(store), saved = a.data();
  assert.equal(saved.sets[0].title, 'Alt'); assert.equal(saved.settings.mode, 'mc'); assert.equal(saved.history['2026-01-01'], 3);
  assert.equal(saved.dialogs.length, 2); assert.equal(saved.dialogs[0].lines.length, 21); assert.equal(saved.dialogs[1].lines.length, 14);
  assert.ok(saved.dialogs.every(d => d.lines.every(l => l.de && l.task)));
});
test('dialog stage: wrong lines return, passing unlocks the next stage and survives reload', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); assert.equal(a.document.querySelectorAll('.dialog-card').length, 2);
  a.click('.dialog-card');
  assert.equal(a.document.querySelectorAll('.dlg-bubble').length, 21);
  assert.match(a.$('.dlg-transcript mark').textContent, /estas/);
  a.click('[data-action="dlg-start"][data-level="1"]');
  fillDialogLine(a, false);
  assert.ok(a.$('#dlg-feedback.incorrect'));
  assert.match(a.$('.feedback-answer').textContent, /buenos días/);
  a.submit('#dlg-form');
  assert.equal(Object.values(a.data().history).reduce((n, v) => n + v, 0), 1, 'a second submit does not count twice');
  a.click('[data-action="dlg-next"]');
  let guard = 0;
  while (a.$('#dlg-form') && guard++ < 60) { fillDialogLine(a); assert.ok(a.$('#dlg-feedback.correct')); a.click('[data-action="dlg-next"]'); }
  assert.equal(guard, 21, 'the missed line came back once');
  assert.match(a.text(), /Stufe 1 geschafft/); assert.match(a.text(), /20 \/ 21/);
  assert.equal(a.data().dialogs[0].progress.best, 1);
  assert.equal(app(a.store).data().dialogs[0].progress.best, 1);
  assert.ok(a.$('[data-action="dlg-start"][data-level="2"]'));
});
test('too many first-try errors do not unlock the next stage', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('.dialog-card'); a.click('[data-action="dlg-start"][data-level="3"]');
  for (let i = 0; i < 21; i++) { fillDialogLine(a, false); a.click('[data-action="dlg-next"]'); }
  let guard = 0;
  while (a.$('#dlg-form') && guard++ < 30) { fillDialogLine(a); a.click('[data-action="dlg-next"]'); }
  assert.equal(a.data().dialogs[0].progress.best, 0);
  assert.ok(a.$('[data-action="dlg-start"][data-level="3"]')); assert.equal(a.$('[data-action="dlg-start"][data-level="4"]'), null);
});
test('whole-sentence stage: role filter and "War doch richtig" overrule', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('.dialog-card');
  a.click('[data-action="dlg-role"][data-role="Kunde"]');
  a.click('[data-action="dlg-start"][data-level="3"]');
  assert.match(a.$('.round-progress').textContent, /0 \/ 10/);
  assert.match(a.$('.dlg-prompt small').textContent, /Kunde/);
  a.$('#dlg-line').value = 'Hola, quiero una chaqueta.'; a.submit('#dlg-form');
  assert.ok(a.$('#dlg-feedback.incorrect'));
  a.click('[data-action="dlg-accept"]');
  assert.match(a.$('.round-progress').textContent, /1 \/ 10/);
  assert.match(a.$('.dlg-prompt small').textContent, /Kunde/);
});
test('test brief ticks exact sentences, lets the learner add others and scores them', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('.dialog-card:last-child');
  a.click('[data-action="dlg-start"][data-level="4"]');
  assert.equal(a.document.querySelectorAll('.dlg-tasks li').length, 14);
  a.submit('#dlg-essay-form'); assert.ok(a.$('#dlg-essay'), 'empty text stays on the page');
  a.$('#dlg-essay').value = 'hola necesitas ayuda\nCuesta 120 euros.';
  a.submit('#dlg-essay-form');
  const boxes = [...a.document.querySelectorAll('.dlg-check input')];
  assert.equal(boxes.length, 14);
  assert.equal(boxes.filter(b => b.hasAttribute('checked')).length, 2);
  boxes.forEach(b => { b.checked = true; });
  a.submit('#dlg-check-form');
  assert.match(a.text(), /14 von 14/); assert.equal(a.data().dialogs[1].progress.best, 4);
});
test('own dialogues: save, edit a copy of a built-in one, delete, backup restores them', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('[data-action="dlg-new"]');
  a.$('#dlg-title').value = 'Zapatos'; a.$('#import-text').value = 'Nur Titel';
  a.submit('#dlg-editor'); assert.ok(a.$('#import-error').textContent.includes('Keine Dialogzeilen'));
  a.$('#import-text').value = 'Adam, Felix\nA: ¡Hola! | Hallo!\nB: Busco zapatos.'; a.submit('#dlg-editor');
  assert.equal(a.document.querySelectorAll('.dlg-edit-row').length, 2); assert.match(a.$('.dlg-skipped').textContent, /1 Zeile nicht/); assert.equal(a.data().dialogs.length, 2, 'nothing is saved before the preview is confirmed');
  a.submit('#dlg-editor');
  assert.equal(a.data().dialogs.length, 3); assert.equal(a.data().dialogs[2].lines[0].de, 'Hallo!');
  assert.match(a.$('#toast').textContent, /2 Zeilen gespeichert/);
  a.click('[data-action="dlg-start"][data-level="3"]');
  assert.match(a.$('.dlg-prompt').textContent, /Hallo!/);
  a.click('[data-view="dialogs"]'); a.click('.dialog-card');
  a.click('[data-action="dlg-edit"]'); a.submit('#dlg-editor'); a.submit('#dlg-editor');
  assert.equal(a.data().dialogs.length, 4); assert.equal(a.data().dialogs[0].seed, true);
  a.click('[data-action="dlg-delete"]'); a.click('#confirm-action');
  assert.equal(a.data().dialogs.length, 3);
  const backup = JSON.stringify({ version: 1, sets: [{ title: 'B', terms: [{ front: 'a', back: 'b' }] }], dialogs: a.data().dialogs });
  const b = app(); b.click('[data-action="import"]'); b.$('#import-text').value = backup; b.submit('#import-form');
  assert.equal(b.data().dialogs.length, 3); assert.equal(b.data().dialogs[2].title, 'Zapatos');
});
test('practising one part asks only its lines, repeats it, moves on and counts all parts as the stage', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('.dialog-card:last-child');
  assert.equal(a.document.querySelectorAll('[data-action="dlg-part"]').length, 4);
  a.click('[data-action="dlg-part"][data-part="5-9"]');
  assert.equal(a.document.querySelectorAll('.dlg-bubble.is-out').length, 9);
  a.click('[data-action="dlg-start"][data-level="3"]');
  assert.match(a.$('.round-progress').textContent, /0 \/ 5/); assert.match(a.$('.learning-set-name').textContent, /Teil 2/);
  const finish = () => { for (let i = 0; a.$('#dlg-form') && i < 30; i++) { const d = a.data().dialogs[1], line = d.lines.find(l => a.$('.dlg-prompt').textContent.endsWith(l.de)); a.$('#dlg-line').value = line.es; a.submit('#dlg-form'); a.click('[data-action="dlg-next"]'); } };
  finish();
  assert.equal(a.data().dialogs[1].progress.parts['5-9'], 3); assert.equal(a.data().dialogs[1].progress.best, 0);
  assert.match(a.text(), /Teil 2 sitzt/);
  a.click('[data-action="dlg-start"][data-level="3"]:not([data-part])'); a.click('[data-action="dlg-exit"]'); a.click('#confirm-action');
  a.click('[data-action="dlg-part"][data-part="0-4"]'); a.click('[data-action="dlg-start"][data-level="3"]'); finish();
  a.click('[data-action="dlg-start"][data-part="5-9"]'); assert.match(a.$('.learning-set-name').textContent, /Teil 2/); finish();
  a.click('[data-action="dlg-start"][data-part="10-13"]'); finish();
  assert.equal(a.data().dialogs[1].progress.best, 3, 'all parts passed');
  assert.ok(a.$('[data-action="dlg-start"][data-part="all"]'), 'the last part leads to the whole dialogue');
});
test('the test brief can cover one part', () => {
  const a = app();
  a.click('[data-view="dialogs"]'); a.click('.dialog-card:last-child');
  a.click('[data-action="dlg-part"][data-part="10-13"]'); a.click('[data-action="dlg-start"][data-level="4"]');
  assert.equal(a.document.querySelectorAll('.dlg-tasks li').length, 4);
  a.$('#dlg-essay').value = 'Cuesta 120 euros.'; a.submit('#dlg-essay-form');
  const boxes = [...a.document.querySelectorAll('.dlg-check input')]; assert.equal(boxes.length, 4);
  boxes.forEach(b => { b.checked = true; }); a.submit('#dlg-check-form');
  assert.equal(a.data().dialogs[1].progress.parts['10-13'], 4); assert.equal(a.data().dialogs[1].progress.best, 0);
});

function solutionFor(a, key) {
  const table = a.window.WWGrammarSeed[0];
  const m = key.match(/^r(\d)c(\d)$/);
  return m ? table.rows[m[1]].cells[m[2]] : table.sentences[key.slice(1)].answer;
}
function fillGrammar(a, wrongKeys = []) {
  for (const field of a.document.querySelectorAll('.gram-input:not([readonly])')) field.value = wrongKeys.includes(field.dataset.gap) ? 'nada' : solutionFor(a, field.dataset.gap);
  a.submit('#gram-form');
}
test('the worksheet table matches the book and every cell has a sentence', () => {
  const a = app(), table = a.window.WWGrammarSeed[0];
  assert.deepEqual(JSON.parse(JSON.stringify(table.rows.map(r => r.cells))), [['este', 'estos', 'esta', 'estas'], ['ese', 'esos', 'esa', 'esas'], ['aquel', 'aquellos', 'aquella', 'aquellas']]);
  assert.deepEqual([...table.sentences.map(s => s.answer.toLowerCase())].sort(), [...table.rows.flatMap(r => [...r.cells])].sort());
  const place = { aquí: 0, ahí: 1, allí: 2 };
  for (const s of table.sentences) {
    const row = place[s.after.match(/de (aquí|ahí|allí)/)[1]];
    assert.ok(table.rows[row].cells.includes(s.answer.toLowerCase()), `${s.answer}${s.after}`);
  }
});
test('grammar: all stages pass, progress unlocks and survives reload', () => {
  const a = app();
  a.click('[data-view="grammar"]'); a.click('.dialog-card');
  assert.match(a.$('.gram-table').textContent, /aquellos/);
  assert.equal(a.document.querySelectorAll('.dlg-stage').length, 4); assert.ok(a.$('.dlg-stage.next[data-level="1"]'));
  a.click('[data-action="gram-start"][data-level="1"]');
  for (const [level, n] of [[1, 4], [2, 8], [3, 12], [4, 12]]) {
    assert.equal(a.document.querySelectorAll('.gram-input').length, n, `stage ${level}`);
    if (level < 4) assert.equal(a.document.querySelectorAll('.gram-given').length, 12 - n);
    fillGrammar(a);
    assert.match(a.text(), new RegExp(`Stufe ${level} geschafft`)); assert.equal(a.data().grammar['pronombres-demostrativos'].best, level);
    if (level < 4) a.click(`[data-action="gram-start"][data-level="${level + 1}"]`);
  }
  assert.ok(Object.values(a.data().history).reduce((n, v) => n + v, 0) >= 36);
  const b = app(a.store);
  b.click('[data-view="grammar"]'); assert.match(b.text(), /Alle Stufen geschafft/);
});
test('grammar: wrong cells show the answer, stay open until written, and block the stage below 80 %', () => {
  const a = app();
  a.click('[data-view="grammar"]'); a.click('.dialog-card'); a.click('[data-action="gram-start"][data-level="3"]');
  const wrong = ['r0c0', 'r1c1', 'r2c2'];
  fillGrammar(a, wrong);
  assert.equal(a.$('.gram-input[data-gap="r2c2"]').className.includes('is-wrong'), true);
  assert.equal(a.$('[data-solution="r2c2"]').textContent, 'aquella'); assert.equal(a.$('#gram-count').textContent, '9 / 12 Felder richtig');
  a.submit('#gram-form'); assert.equal(a.$('#gram-count').textContent, '9 / 12 Felder richtig', 'a second submit while reviewing changes nothing');
  a.click('[data-action="gram-retry"]');
  assert.equal(a.$('.gram-input[data-gap="r2c2"]').value, ''); assert.equal(a.$('[data-solution="r2c2"]').textContent, '');
  assert.equal(a.document.querySelectorAll('.gram-input:not([readonly])').length, 3);
  fillGrammar(a);
  assert.match(a.text(), /Stufe 3 durchgespielt/); assert.match(a.text(), /9 \/ 12/); assert.match(a.$('.result-review').textContent, /aquella/);
  assert.equal(a.data().grammar['pronombres-demostrativos'].best, 0);
});
test('grammar: leaving a round frees sync and old saves gain the section', () => {
  const store = new Map([['wortwechsel.v1', JSON.stringify({ sets: [], settings: {}, history: {} })]]);
  const a = app(store);
  a.click('[data-view="grammar"]'); a.click('.dialog-card'); a.click('[data-action="gram-start"][data-level="1"]');
  assert.equal(a.window.WWApp.canApply(), false);
  a.click('[data-view="library"]');
  assert.equal(a.window.WWApp.canApply(), true);
  assert.deepEqual(a.data().grammar, {});
});
test('backup restore keeps the higher grammar stage and remote data can bring progress', () => {
  const id = 'pronombres-demostrativos', a = app();
  a.window.WWApp.apply({ ...a.data(), grammar: { [id]: { best: 2, practiced: '2026-11-04' } } });
  assert.equal(a.data().grammar[id].best, 2);
  const restore = best => { a.click('[data-view="library"]'); a.click('[data-action="import"]'); a.$('#import-text').value = JSON.stringify({ version: 1, sets: [{ title: 'B', terms: [{ front: 'a', back: 'b' }] }], grammar: { [id]: { best } } }); a.submit('#import-form'); };
  restore(1); assert.equal(a.data().grammar[id].best, 2);
  restore(3); assert.equal(a.data().grammar[id].best, 3);
});
