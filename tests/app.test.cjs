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
  assert.equal(mc, 10); assert.equal(written, 20); assert.equal(attempts, 30);
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
