(() => {
  'use strict';
  const C = window.WWCore, $ = s => document.querySelector(s), KEY = 'wortwechsel.v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    spark: '<path d="m12 3 2.8 6.2L21 12l-6.2 2.8L12 21l-2.8-6.2L3 12l6.2-2.8Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    settings: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    swap: '<path d="M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4"/>',
    layers: '<path d="m12 3 10 5-10 5L2 8Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    edit: '<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z"/>',
    trash: '<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7"/>',
    keyboard: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h1m3 0h1m3 0h1m3 0h.1M6 12h1m3 0h1m3 0h1m3 0h.1M7 15h10"/>',
    cards: '<rect x="4" y="6" width="15" height="15" rx="3"/><path d="M8 3h11a3 3 0 0 1 3 3v11M8 12h7m-7 4h4"/>',
    flame: '<path d="M13 2c2 5-3 6-2 10 1-2 3-3 4-4 5 5 5 13-3 14C2 22 2 12 7 8c-1 5 1 5 2 6C6 8 12 7 13 2Z"/>',
    chart: '<path d="M4 20V4m0 16h17M8 15l4-5 4 2 5-7"/>',
    shirt: '<path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4c0 4-8 4-8 0Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    book: '<path d="M12 6C8 3 4 4 2 5v15c4-2 7-1 10 1 3-2 6-3 10-1V5c-2-1-6-2-10 1Zm0 0v15"/>',
    chat: '<path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8m-8 3h5"/>',
    sound: '<path d="M4 9v6h4l5 4V5L8 9Z"/><path d="M16.5 9a4 4 0 0 1 0 6"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  };
  const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.book}</svg>`;
  function hydrateIcons() { document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); el.removeAttribute('data-icon'); }); }
  const defaults = { mode: 'adaptive', direction: 'random', roundSize: '10', accents: false, articles: true };
  function validateSet(raw, preserveIds = false) {
    if (!raw || !Array.isArray(raw.terms)) throw new Error('Das Lernset enthält keine Begriffspaare.');
    const clean = C.cleanPairs(raw.terms);
    if (!clean.terms.length) throw new Error('Das Lernset enthält keine gültigen Begriffspaare.');
    const terms = clean.terms.map((term, i) => {
      const original = raw.terms.find(t => t && typeof t === 'object' && String(t.front ?? t.term ?? t[0] ?? '').trim() === term.front && String(t.back ?? t.definition ?? t[1] ?? '').trim() === term.back);
      if (preserveIds && original?.id && typeof original.id === 'string') term.id = original.id;
      if (original?.progress) term.progress = { forward: C.directionState(original, false), reverse: C.directionState(original, true) };
      return term;
    });
    return { id: preserveIds && typeof raw.id === 'string' ? raw.id : C.uid(), title: String(raw.title || 'Mein Lernset').slice(0, 100), frontLang: String(raw.frontLang || 'Spanisch').slice(0, 40), backLang: String(raw.backLang || 'Deutsch').slice(0, 40), description: String(raw.description || '').slice(0, 250), emoji: String(raw.emoji || '📚').slice(0, 8), created: Number(raw.created) || Date.now(), terms };
  }
  function validateSettings(raw) {
    return { mode: ['adaptive', 'mc', 'written'].includes(raw?.mode) ? raw.mode : 'adaptive', direction: ['random', 'forward', 'reverse'].includes(raw?.direction) ? raw.direction : 'random', roundSize: ['5', '10', '20', 'all'].includes(String(raw?.roundSize)) ? String(raw.roundSize) : '10', accents: !!raw?.accents, articles: raw?.articles !== false };
  }
  function hydrate(raw) { return { ...raw, sets: raw.sets.map(s => validateSet(s, true)), settings: validateSettings(raw.settings), history: raw.history && typeof raw.history === 'object' ? raw.history : {} }; }
  let data, storageFailed = false, storageBlocked = false, lastStored = null, applyingRemote = false;
  try {
    const stored = localStorage.getItem(KEY);
    lastStored = stored;
    if (stored) {
      data = hydrate(JSON.parse(stored));
    }
  } catch {
    storageFailed = true; storageBlocked = true;
    $('#storage-warning').textContent = 'Gespeicherte Daten konnten nicht geladen werden. Die Originaldaten bleiben erhalten. Änderungen in dieser Sitzung bitte als Sicherung exportieren.';
  }
  if (!data) {
    const seed = window.WWSeed;
    data = { sets: [{ ...seed, terms: C.parseImport(seed.pairs).terms, created: Date.now() }], settings: { ...defaults }, history: {}, selectedId: seed.id };
    delete data.sets[0].pairs;
  }
  // Built-in dialogues always come from seed.js, so text fixes reach existing users. Only their progress is stored.
  function mergeDialogs(stored) {
    const valid = (Array.isArray(stored) ? stored : []).map(d => C.validateDialog(d)).filter(Boolean);
    const seeds = (window.WWDialogSeed || []).map(seed => C.validateDialog({ ...seed, progress: valid.find(d => d.id === seed.id)?.progress }));
    return [...seeds, ...valid.filter(d => !seeds.some(s => s.id === d.id))];
  }
  data.dialogs = mergeDialogs(data.dialogs);
  data.grammar = C.validateGrammarProgress(data.grammar);
  data.catalogs = withCatalogSeeds(data.catalogs);
  let selectedId = data.selectedId || data.sets[0]?.id, view = 'library', session = null, flash = null, termSearch = '', librarySearch = '';
  let importDraft = null, importTarget = null, importRaw = '', importWarnings = [], toastTimer, fileLoadVersion = 0;
  const currentSet = () => data.sets.find(s => s.id === selectedId) || data.sets[0];
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function save() {
    data.selectedId = selectedId;
    if (storageBlocked) return false;
    try {
      if (localStorage.getItem(KEY) !== lastStored) {
        storageFailed = true; storageBlocked = true;
        $('#storage-warning').textContent = 'Ein anderer Tab hat deine Daten geändert. Dieser Tab speichert nicht mehr automatisch. Sichere bei Bedarf deine Änderungen und lade die Seite neu.';
        $('#storage-warning').hidden = false;
        return false;
      }
      const serialized = JSON.stringify(data);
      localStorage.setItem(KEY, serialized); lastStored = serialized;
      storageFailed = false; $('#storage-warning').hidden = true;
      if (!applyingRemote) window.WWSync?.changed();
      return true;
    }
    catch { storageFailed = true; $('#storage-warning').hidden = false; }
  }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4200); }
  function renderShell(title = 'Meine Lernsets') {
    if (VOCAB_VIEWS.includes(view)) subject = VOCAB;
    else if (['catalog', 'qa-learn', 'qa-test'].includes(view) && currentCatalog()) subject = currentCatalog().subject;
    if (view !== 'qa-learn') qa = null;
    if (view !== 'qa-test') qaTest = null;
    if (testTimer) { clearInterval(testTimer); testTimer = null; }
    syncSubjectUi();
    $('#breadcrumb').innerHTML = `${esc(subject)} <span>/</span> <strong>${esc(title)}</strong>`;
    $('#set-count').textContent = data.sets.length;
    document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', view === el.dataset.view || (el.dataset.view === 'catalogs' && view === 'catalog')));
    $('#nav-practice').classList.toggle('active', view === 'learn');
    $('#nav-qa-learn').classList.toggle('active', view === 'qa-learn');
    $('#nav-qa-test').classList.toggle('active', view === 'qa-test');
    if (view !== 'grammar') gram = null;
    stopSpeech();
    hydrateIcons();
  }
  function streak() {
    let n = 0; const day = new Date();
    if (!data.history[localDate(day)]) day.setDate(day.getDate() - 1);
    while (data.history[localDate(day)] && n < 10000) { n++; day.setDate(day.getDate() - 1); }
    return n;
  }
  function drawLibrary() {
    view = 'library'; session = null; flash = null; renderShell();
    const set = currentSet(), stats = set && C.setStats(set);
    const total = data.sets.reduce((n, s) => n + s.terms.length, 0), mastered = data.sets.reduce((n, s) => n + C.setStats(s).mastered, 0);
    $('#main').innerHTML = `<section class="page-intro"><div><h1>Lernsets<span class="blue-dot">.</span></h1><p>${data.sets.length} Sets · ${total} Begriffe</p></div><button class="button primary" data-action="import">${icon('plus')}Neues Lernset</button></section>
      <section class="dashboard-grid"><div class="focus-card"><div class="focus-copy"><div class="hero-tag"><span class="pulse-dot"></span>${stats?.progress ? 'WEITERLERNEN' : 'LERNEN'}</div><h2>${set ? esc(set.title) : 'Neues Lernset'}</h2><p>${set ? `${esc(set.frontLang)} ↔ ${esc(set.backLang)} · ${set.terms.length} Begriffe` : 'Text einfügen oder Datei importieren.'}</p><button class="button white" data-action="${set ? 'learn' : 'import'}">${icon(set ? 'spark' : 'plus')}${set ? stats.progress ? 'Weiterlernen' : 'Lernen' : 'Lernset erstellen'}${icon('arrow')}</button><div class="hero-foot">${icon('layers')} ${data.settings.roundSize === 'all' ? 'Alle' : data.settings.roundSize} Begriffe pro Runde</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-star star-one">✳</span><span class="art-star star-two">✧</span><div class="art-card card-back"><span>${esc(set?.terms[0]?.back || 'Übersetzung')}</span><div class="mini-line"></div><div class="mini-line short"></div></div><div class="art-card card-front">${icon('cards')}<strong>${esc(set?.terms[0]?.front || 'Begriff')}</strong><span>${esc(set?.frontLang || 'Vorderseite')}</span></div><div class="art-check">${icon('check')}</div></div></div>
      <aside class="progress-card"><div class="section-kicker">DEIN FORTSCHRITT ${icon('chart')}</div><div class="progress-numbers"><strong>${mastered}<span> / ${total}</span></strong><p>Begriffe sicher gemeistert</p></div><div class="mini-progress"><span style="width:${total ? mastered / total * 100 : 0}%"></span></div><div class="stat-duo"><div><span class="stat-icon flame">${icon('flame')}</span><strong>${streak()} <small>${streak() === 1 ? 'Tag' : 'Tage'}</small></strong><p>in Folge gelernt</p></div><div><span class="stat-icon lavender">${icon('check')}</span><strong>${Number(data.history[localDate()]) || 0}</strong><p>Antworten heute</p></div></div></aside></section>
      <section class="library-section"><div class="section-heading"><div><h2>Deine Lernsets <span class="count-badge">${data.sets.length}</span></h2></div><label class="search-box">${icon('search')}<input id="library-search" placeholder="Lernset suchen …" aria-label="Lernsets suchen" value="${esc(librarySearch)}"></label></div><div class="set-grid" id="set-grid">${setCards()}</div></section>`;
    $('#library-search').addEventListener('input', e => { librarySearch = e.target.value; $('#set-grid').innerHTML = setCards(); });
  }
  function setCards() {
    const query = C.normalize(librarySearch);
    const sets = data.sets.filter(s => C.normalize(s.title + ' ' + s.frontLang + ' ' + s.backLang).includes(query));
    return sets.map((set, index) => {
      const s = C.setStats(set);
      return `<article class="set-card"><div class="set-card-top"><div class="set-emoji tone-${index % 3}">${esc(set.emoji)}</div><span class="language-pill">${esc(set.frontLang)} ${icon('swap')} ${esc(set.backLang)}</span></div><button class="set-title" data-action="open-set" data-id="${esc(set.id)}">${esc(set.title)}</button><div class="set-meta">${icon('layers')} ${set.terms.length} Begriffe <span>·</span> ${s.mastered} gemeistert</div><div class="set-progress-label"><span>Fortschritt</span><strong>${s.progress}%</strong></div><div class="mini-progress"><span style="width:${s.progress}%"></span></div><div class="set-card-footer"><button class="text-button" data-action="open-set" data-id="${esc(set.id)}">Lernset ansehen</button><button class="round-button" data-action="learn" data-id="${esc(set.id)}" aria-label="${esc(set.title)} lernen">${icon('arrow')}</button></div></article>`;
    }).join('') + (!query ? `<button class="new-set-card" data-action="import"><span class="new-set-icon">${icon('plus')}</span><strong>Neues Lernset</strong><span>Text einfügen oder Datei hochladen</span><span class="text-button">Lernset erstellen ${icon('arrow')}</span></button>` : !sets.length ? '<div class="empty-state">Kein Lernset gefunden. Versuche einen anderen Suchbegriff.</div>' : '');
  }
  function drawSet() {
    const set = currentSet(); if (!set) return drawLibrary();
    view = 'set'; session = null; flash = null; renderShell(set.title);
    const stats = C.setStats(set);
    $('#main').innerHTML = `<button class="back-link" data-action="library">${icon('back')} Alle Lernsets</button><section class="set-page-heading"><div class="set-emoji big">${esc(set.emoji)}</div><div><div class="eyebrow">${esc(set.frontLang)} ${icon('swap')} ${esc(set.backLang)} · ${set.terms.length} BEGRIFFE</div><h1>${esc(set.title)}</h1></div><button class="icon-button" data-action="edit-set" aria-label="Lernset bearbeiten" title="Lernset bearbeiten">${icon('edit')}</button></section>
      <div class="set-actions"><button class="button primary" data-action="learn">${icon('spark')}Jetzt lernen</button><button class="button secondary" data-action="flashcards">${icon('cards')}Karteikarten</button><button class="button secondary" data-action="settings">${icon('settings')}Einstellungen</button><button class="button ghost" data-action="export">${icon('download')}Exportieren</button></div>
      <section class="mastery-panel"><div><span class="mastery-dot mastered"></span><strong>${stats.mastered}</strong> Gemeistert</div><div><span class="mastery-dot learning"></span><strong>${stats.learning}</strong> Im Lernprozess</div><div><span class="mastery-dot fresh"></span><strong>${stats.fresh}</strong> Noch offen</div><div class="overall-progress"><strong>${stats.progress}%</strong><div class="mini-progress"><span style="width:${stats.progress}%"></span></div></div></section>
      <section class="terms-section"><div class="section-heading"><div><h2>Alle Begriffe <span class="count-badge">${set.terms.length}</span></h2><p>Ein Begriff gilt als gemeistert, wenn du ihn in beiden Richtungen zweimal geschrieben hast.</p></div><label class="search-box">${icon('search')}<input id="term-search" placeholder="Begriff suchen …" value="${esc(termSearch)}" aria-label="Begriffe suchen"></label></div><div class="term-table"><div class="term-table-head"><span>${esc(set.frontLang)}</span><span>${esc(set.backLang)}</span><span>Status</span></div><div id="term-rows">${termRows(set)}</div></div><div class="set-danger-zone"><button class="text-button" data-action="reset">Fortschritt zurücksetzen</button><button class="text-button danger" data-action="delete">${icon('trash')}Lernset löschen</button></div></section>`;
    $('#term-search').addEventListener('input', e => { termSearch = e.target.value; $('#term-rows').innerHTML = termRows(set); });
  }
  function termRows(set) {
    const terms = set.terms.filter(t => C.normalize(t.front + ' ' + t.back).includes(C.normalize(termSearch)));
    return terms.map(t => { const m = C.mastery(t); return `<div class="term-row"><span>${esc(t.front)}</span><span>${esc(t.back)}</span><span class="term-status ${m >= 6 ? 'done' : m ? 'in-progress' : ''}" title="${m} von 6 Lernschritten">${m >= 6 ? icon('check') + 'Sitzt' : m ? `${m}/6 Schritte` : 'Neu'}</span></div>`; }).join('') || '<div class="empty-state">Kein passender Begriff gefunden.</div>';
  }
  function startLearning(keepErrors = false) {
    const set = currentSet(); if (!set) return openImport();
    session = C.createRound(set, data.settings); view = 'learn'; flash = null;
    if (keepErrors && lastErrors.length) { session.queue = lastErrors.map(x => ({ ...x })); session.total = session.queue.length; }
    renderShell('Lernen · ' + set.title); nextQuestion();
  }
  let lastErrors = [];
  function nextQuestion() {
    if (!session.queue.length) return drawResults();
    const item = session.queue.shift(); session.current = C.buildQuestion(currentSet(), item, data.settings); session.answered = false;
    drawQuestion();
  }
  function modeLabel(mode) { return mode === 'mc' ? 'Multiple Choice' : 'Schreibfrage'; }
  function drawQuestion() {
    const set = currentSet(), q = session.current, p = C.directionState(q.term, q.reverse), percent = Math.round(session.completed / session.total * 100);
    $('#main').innerHTML = `<section class="learning-shell"><div class="learning-top"><button class="back-link" data-action="exit-learning">${icon('back')}Lernset</button><span class="learning-set-name">${esc(set.title)}</span><button class="icon-button" data-action="learning-settings" aria-label="Lerneinstellungen">${icon('settings')}</button></div><div class="round-progress"><div><strong>Deine Lernrunde</strong><span>${session.completed} / ${session.total} Begriffe gefestigt</span></div><div class="mini-progress"><span style="width:${percent}%"></span></div></div><div class="question-card"><div class="question-top"><span class="question-mode">${icon(q.mode === 'mc' ? 'layers' : 'keyboard')}${modeLabel(q.mode)}</span><span class="direction-label">${esc(q.reverse ? set.backLang : set.frontLang)} ${icon('arrow')} ${esc(q.reverse ? set.frontLang : set.backLang)}</span></div><div class="question-prompt"><p>${q.mode === 'mc' ? 'Wähle die richtige Übersetzung.' : 'Schreibe die passende Übersetzung.'}</p><h1 dir="auto">${esc(q.prompt)}</h1><span class="question-stage">${data.settings.mode === 'adaptive' ? q.mode === 'mc' ? '1/3 · Auswählen' : p.written ? '3/3 · Schreiben' : '2/3 · Schreiben' : ''}</span></div><div id="answer-area">${q.mode === 'mc' ? `<div class="choice-grid">${q.options.map((a, i) => `<button class="choice-button" data-action="answer-choice" data-index="${i}"><span class="choice-key">${i + 1}</span><span>${esc(a)}</span><span class="choice-result"></span></button>`).join('')}</div>` : `<form id="answer-form"><label for="written-answer" class="answer-label">Deine Antwort auf ${esc(q.reverse ? set.frontLang : set.backLang)}</label><input id="written-answer" class="written-answer" placeholder="Übersetzung eingeben …" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required dir="auto"><div class="accent-keys">${'á é í ó ú ü ñ ¿ ¡ ä ö ß'.split(' ').map(char => `<button type="button" data-action="accent" data-char="${char}" tabindex="-1">${char}</button>`).join('')}</div><div class="write-actions"><button type="button" class="text-button" data-action="dont-know">Weiß ich noch nicht</button><button type="submit" class="button primary">Antwort prüfen ${icon('arrow')}</button></div></form>`}</div><div id="answer-feedback" class="answer-feedback" role="status" aria-live="polite"></div>${q.mode === 'mc' ? '<button class="text-button dont-know" data-action="dont-know">Weiß ich noch nicht</button>' : ''}</div><div class="learning-help">${icon('swap')} ${data.settings.direction === 'random' ? 'Die Richtung wechselt zufällig. ' : ''}Fehler kommen später noch mal dran.</div><div class="shortcut-hint">${q.mode === 'mc' ? '<kbd>1</kbd> – <kbd>4</kbd> Antwort wählen <span>·</span>' : ''} <kbd>Enter</kbd> Prüfen / weiter</div></section>`;
    $('#answer-form')?.addEventListener('submit', e => { e.preventDefault(); if (!session.answered) submitAnswer($('#written-answer').value); });
    if (q.mode === 'written') requestAnimationFrame(() => $('#written-answer')?.focus({ preventScroll: true }));
  }
  function submitAnswer(answer, skip = false) {
    if (!session || session.answered) return;
    const q = session.current;
    if (!skip && !String(answer).trim()) { $('#written-answer')?.focus(); return; }
    session.answered = true; session.attempts++;
    const correct = !skip && (q.mode === 'mc' ? answer === q.expected : C.matches(answer, q.expected, data.settings));
    const key = q.termId + ':' + q.reverse;
    const previouslyRetried = session.retried.has(key);
    if (correct && !previouslyRetried) session.firstCorrect++;
    const p = C.recordAnswer(q.term, q.reverse, q.mode, correct);
    const item = { termId: q.termId, reverse: q.reverse };
    let message;
    if (correct) {
      const needsMore = data.settings.mode === 'adaptive' && p.written < 2;
      if (needsMore) { session.queue.push(item); message = q.mode === 'mc' ? 'Als Nächstes: schreiben.' : 'Noch eine Schreibfrage.'; }
      else { session.completed++; message = 'Für diese Runde abgeschlossen.'; }
    } else {
      session.retried.add(key);
      if (!session.errors.some(e => e.termId === q.termId && e.reverse === q.reverse)) session.errors.push(item);
      session.queue.splice(Math.min(2, session.queue.length), 0, item);
      message = 'Wird wiederholt.';
    }
    const today = localDate(); data.history[today] = (Number(data.history[today]) || 0) + 1; save();
    const feedback = $('#answer-feedback'); feedback.className = `answer-feedback visible ${correct ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<div class="feedback-title">${icon(correct ? 'check' : 'book')}<strong>${correct ? 'Richtig' : 'Richtige Antwort'}</strong></div><div class="feedback-answer">${esc(q.expected)}</div>${!correct && !skip && q.mode === 'written' ? `<div class="your-answer">Deine Antwort: ${esc(answer)}</div>` : ''}<p>${message}</p><button class="button ${correct ? 'success' : 'primary'}" data-action="next">${session.queue.length ? 'Weiter' : 'Ergebnis ansehen'} ${icon('arrow')}</button>`;
    document.querySelectorAll('.choice-button').forEach((btn, i) => {
      btn.disabled = true;
      if (q.options[i] === q.expected) { btn.classList.add('is-correct'); btn.querySelector('.choice-result').innerHTML = icon('check'); }
      else if (q.options[i] === answer) { btn.classList.add('is-wrong'); btn.querySelector('.choice-result').innerHTML = icon('close'); }
    });
    $('#written-answer')?.setAttribute('disabled', '');
    $('#answer-form')?.querySelectorAll('button').forEach(b => { b.disabled = true; });
    document.querySelector('.dont-know')?.remove();
    feedback.querySelector('button').focus({ preventScroll: true });
  }
  function drawResults() {
    lastErrors = session.errors.map(x => ({ ...x }));
    const errors = session.errors.length, set = currentSet();
    $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>Runde geschafft<span class="blue-dot">.</span></h1><p>${session.total} ${session.total === 1 ? 'Begriff gefestigt' : 'Begriffe gefestigt'}</p><div class="result-stats"><div><strong>${session.total}</strong><span>Begriffe geübt</span></div><div><strong>${session.attempts}</strong><span>Antworten gegeben</span></div><div><strong>${errors}</strong><span>${errors === 1 ? 'Begriff wiederholt' : 'Begriffe wiederholt'}</span></div></div>${errors ? `<div class="result-review"><h3>Wiederholte Begriffe</h3>${lastErrors.map(e => { const t = set.terms.find(t => t.id === e.termId); return `<div><span>${esc(e.reverse ? t.back : t.front)}</span>${icon('arrow')}<strong>${esc(e.reverse ? t.front : t.back)}</strong></div>`; }).join('')}</div>` : '<div class="perfect-note">Keine Fehler.</div>'}<div class="result-actions"><button class="button primary" data-action="learn">Nächste Runde ${icon('arrow')}</button>${errors ? '<button class="button secondary" data-action="repeat-errors">Schwierige Wörter üben</button>' : ''}<button class="text-button" data-action="open-set">Zurück zum Lernset</button></div><p class="result-note">${storageFailed ? 'Dein Fortschritt ist nur in dieser Sitzung verfügbar. Bitte eine Sicherung exportieren.' : 'Dein Fortschritt ist auf diesem Gerät gespeichert.'}</p></section>`;
    session.current = null; session.answered = true;
  }
  function startFlashcards() {
    const set = currentSet(); if (!set) return openImport();
    view = 'flashcards'; session = null; flash = { terms: [...set.terms], index: 0, flipped: false, reverse: data.settings.direction === 'reverse' || data.settings.direction === 'random' && Math.random() < 0.5 };
    renderShell('Karteikarten · ' + set.title); drawFlashcard();
  }
  function drawFlashcard() {
    const set = currentSet(), t = flash.terms[flash.index];
    $('#main').innerHTML = `<section class="flash-page"><button class="back-link" data-action="open-set">${icon('back')}${esc(set.title)}</button><div class="section-heading"><div><h1>Karteikarten</h1></div><button class="button secondary" data-action="shuffle-cards">${icon('swap')}Mischen</button></div><button class="flashcard ${flash.flipped ? 'flipped' : ''}" data-action="flip-card" aria-label="Karte umdrehen"><span class="card-language">${esc(flash.flipped ? flash.reverse ? set.frontLang : set.backLang : flash.reverse ? set.backLang : set.frontLang)}</span><strong dir="auto">${esc(flash.flipped ? flash.reverse ? t.front : t.back : flash.reverse ? t.back : t.front)}</strong><span class="flip-hint">${icon('swap')}Klicken oder Leertaste zum Umdrehen</span></button><div class="flash-controls"><button class="round-button" data-action="prev-card" aria-label="Vorherige Karte">${icon('back')}</button><span>${flash.index + 1} <span>/ ${flash.terms.length}</span></span><button class="round-button" data-action="next-card" aria-label="Nächste Karte">${icon('arrow')}</button></div><div class="mini-progress"><span style="width:${(flash.index + 1) / flash.terms.length * 100}%"></span></div><p class="center muted">Mit Karteikarten wiederholst du frei. Fortschritt sammelst du im Lernmodus.</p><button class="button primary flash-learn" data-action="learn">${icon('spark')}Jetzt abfragen lassen</button></section>`;
  }
  function moveCard(delta) { flash.index = (flash.index + delta + flash.terms.length) % flash.terms.length; flash.flipped = false; flash.reverse = data.settings.direction === 'reverse' || data.settings.direction === 'random' && Math.random() < 0.5; drawFlashcard(); }
  // ---- Dialog mode: read, then fewer and fewer cues, then free writing from a German brief. ----
  const DLG_STAGES = [
    { level: 1, name: 'Lücken', text: 'Einzelne Wörter fehlen. Demonstrativpronomen immer.' },
    { level: 2, name: 'Viele Lücken', text: 'Die meisten Wörter fehlen, nur der erste Buchstabe bleibt.' },
    { level: 3, name: 'Aus dem Kopf', text: 'Du siehst nur Deutsch und schreibst den ganzen Satz.' },
    { level: 4, name: 'Testangabe', text: 'Wie im Test: nur Anweisungen, du schreibst alles am Stück.' },
  ];
  const PASS_RATIO = 0.8, ACCENT_CHARS = 'á é í ó ú ü ñ ¿ ¡'.split(' ');
  let dialogId = null, dlg = null, dlgRole = 'all', dlgPart = 'all', dlgLastInput = null, speechRun = 0;
  const currentDialog = () => data.dialogs.find(d => d.id === dialogId);
  const canSpeak = () => typeof window.speechSynthesis?.speak === 'function';
  function stopSpeech() { speechRun++; if (canSpeak()) window.speechSynthesis.cancel(); }
  function speak(texts) {
    if (!canSpeak()) return;
    stopSpeech();
    const run = speechRun, voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => /^es/i.test(v.lang));
    // A non-Spanish voice would teach the wrong pronunciation, so stay silent instead.
    if (voices.length && !voice) return toast('Auf diesem Gerät fehlt eine spanische Stimme. Du kannst sie in den Spracheinstellungen des Systems installieren.');
    const next = i => {
      if (run !== speechRun || i >= texts.length) return;
      const utterance = new window.SpeechSynthesisUtterance(texts[i]);
      utterance.lang = 'es-ES'; utterance.rate = 0.9; if (voice) utterance.voice = voice;
      utterance.onend = () => next(i + 1);
      window.speechSynthesis.speak(utterance);
    };
    next(0);
  }
  const accentKeys = () => `<div class="accent-keys">${ACCENT_CHARS.map(char => `<button type="button" data-action="dlg-accent" data-char="${char}" tabindex="-1">${char}</button>`).join('')}</div>`;
  const markedLine = text => C.lineTokens(text).map(t => t.word && C.isDemonstrative(t.text) ? `<mark>${esc(t.text)}</mark>` : esc(t.text)).join('');
  function speakerSide(dialog, speaker) { return C.dialogSpeakers(dialog).indexOf(speaker) % 2 === 1; }
  const stageLabel = best => best >= 4 ? 'Alle Stufen geschafft' : best ? `Stufe ${best} von 4 geschafft` : 'Noch nicht begonnen';
  function drawDialogs() {
    view = 'dialogs'; session = null; flash = null; dlg = null; renderShell('Dialoge');
    $('#main').innerHTML = `<section class="page-intro"><div><h1>Dialoge<span class="blue-dot">.</span></h1><p>Erst lesen, dann mit immer weniger Hilfe selbst schreiben.</p></div><button class="button primary" data-action="dlg-new">${icon('plus')}Dialog einfügen</button></section><div class="dialog-grid">${data.dialogs.map(d => `<button class="dialog-card" data-action="dlg-open" data-dialog="${esc(d.id)}"><strong>${esc(d.title)}</strong><small>${esc(d.description || 'Eigener Dialog')}</small><small>${d.lines.length} Zeilen · ${stageLabel(d.progress.best)}</small><span class="mini-progress"><span style="width:${d.progress.best / 4 * 100}%"></span></span></button>`).join('')}</div>`;
  }
  const selectedPart = d => C.dialogParts(d).find(p => p.key === dlgPart) || null;
  const partStage = (d, part) => part ? Math.max(d.progress.best, Number(d.progress.parts?.[part.key]) || 0) : d.progress.best;
  const partRange = part => `Zeilen ${part.start + 1} bis ${part.end + 1}`;
  function drawDialog() {
    const d = currentDialog(); if (!d) return drawDialogs();
    view = 'dialogs'; session = null; flash = null; dlg = null; renderShell(d.title);
    const speakers = C.dialogSpeakers(d), parts = C.dialogParts(d);
    if (dlgRole !== 'all' && !speakers.includes(dlgRole)) dlgRole = 'all';
    if (!parts.some(p => p.key === dlgPart)) dlgPart = 'all';
    const part = selectedPart(d), stage = partStage(d, part), nextLevel = Math.min(4, stage + 1);
    const today = d.progress.practiced === localDate();
    const advice = part ? `Du übst nur ${partRange(part)}. Wiederhole den Teil, bis er sitzt, dann kommt der nächste.` : d.progress.best >= 4 ? today ? 'Für heute reicht das. Morgen nochmal Stufe 3 oder 4, dann bleibt es hängen.' : 'Kurz wiederholen: Stufe 3 oder 4.' : 'Mach am besten weiter bei der markierten Stufe.';
    const inPart = i => !part || (i >= part.start && i <= part.end);
    $('#main').innerHTML = `<button class="back-link" data-action="dlg-list">${icon('back')} Alle Dialoge</button><section class="set-page-heading"><div class="set-emoji big">${icon('chat')}</div><div><div class="eyebrow">${d.lines.length} ZEILEN · ${esc(stageLabel(d.progress.best).toUpperCase())}</div><h1>${esc(d.title)}</h1></div><button class="icon-button" data-action="dlg-edit" aria-label="Dialog bearbeiten" title="${d.seed ? 'Als eigene Kopie bearbeiten' : 'Dialog bearbeiten'}">${icon('edit')}</button></section>
      <section class="dlg-section"><h2>Üben</h2><p>${advice}</p>${parts.length > 1 ? `<div class="dlg-roles" role="group" aria-label="Abschnitt wählen"><span>Abschnitt:</span><button class="dlg-role" data-action="dlg-part" data-part="all" aria-pressed="${!part}">Ganzer Dialog</button>${parts.map(p => { const done = partStage(d, p); return `<button class="dlg-role" data-action="dlg-part" data-part="${p.key}" aria-pressed="${part?.key === p.key}" title="${partRange(p)}">Teil ${p.number}${done ? ` (${done}/4)` : ''}</button>`; }).join('')}</div>` : ''}<div class="dlg-roles" role="group" aria-label="Rolle wählen"><span>Du übst:</span>${['all', ...speakers].map(r => `<button class="dlg-role" data-action="dlg-role" data-role="${esc(r)}" aria-pressed="${dlgRole === r}">${r === 'all' ? 'Beide Rollen' : esc(r)}</button>`).join('')}</div><div class="dlg-stages">${DLG_STAGES.map(s => `<button class="dlg-stage ${s.level === nextLevel && stage < 4 ? 'next' : ''}" data-action="dlg-start" data-level="${s.level}"><span class="dlg-stage-top">STUFE ${s.level}${stage >= s.level ? icon('check') : ''}</span><strong>${s.name}</strong><small>${s.text}</small></button>`).join('')}</div></section>
      <section class="dlg-section"><div class="section-heading"><div><h2>Lesen</h2><p>Markiert sind die Demonstrativpronomen.</p></div>${canSpeak() ? `<button class="button secondary" data-action="dlg-say-all">${icon('sound')}${part ? 'Teil anhören' : 'Alles anhören'}</button>` : ''}</div><div class="dlg-transcript">${d.lines.map((l, i) => `<div class="dlg-bubble ${speakerSide(d, l.speaker) ? 'right' : ''} ${inPart(i) ? '' : 'is-out'}"><div class="dlg-speaker">${esc(l.speaker)}${canSpeak() ? `<button class="dlg-say" data-action="dlg-say" data-line="${i}" aria-label="Zeile ${i + 1} anhören">${icon('sound')}</button>` : ''}</div><div class="dlg-es" lang="es">${markedLine(l.es)}</div>${l.de ? `<div class="dlg-de">${esc(l.de)}</div>` : ''}</div>`).join('')}</div><div class="set-danger-zone"><button class="text-button" data-action="dlg-reset">Fortschritt zurücksetzen</button>${d.seed ? '' : `<button class="text-button danger" data-action="dlg-delete">${icon('trash')}Dialog löschen</button>`}</div></section>`;
  }
  function startDialog(level) {
    const d = currentDialog(); if (!d) return drawDialogs();
    const part = selectedPart(d);
    if (level === 4) { dlg = { level, answered: false, part }; return drawDialogBrief(); }
    const queue = C.dialogQueue(d, dlgRole, part);
    dlg = { level, part, queue, total: queue.length, done: 0, firstTry: 0, missed: new Set(), current: null, answered: false, cloze: null, attempts: 0 };
    nextDialogLine();
  }
  function nextDialogLine() {
    if (!dlg.queue.length) return drawDialogResult();
    dlg.current = dlg.queue.shift(); dlg.answered = false;
    dlg.cloze = dlg.level < 3 ? C.clozeLine(currentDialog().lines[dlg.current].es, dlg.level) : null;
    drawDialogLine();
  }
  function drawDialogLine() {
    const d = currentDialog(), line = d.lines[dlg.current], prev = d.lines[dlg.current - 1], stage = DLG_STAGES[dlg.level - 1];
    const cue = line.de || C.lineWords(line.es).map(w => w[0] + '…').join(' ');
    const field = dlg.level < 3
      ? `<div class="dlg-cloze" lang="es">${dlg.cloze.map((t, i) => t.blank ? `<input class="dlg-blank" name="word-${i}" data-token="${i}" style="width:${Math.max(3, t.text.length) + 2}ch" placeholder="${esc(t.hint ? t.hint + '…' : '')}" aria-label="Fehlendes Wort" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">` : esc(t.text)).join('')}</div>`
      : `<label class="answer-label" for="dlg-line">Dein Satz auf Spanisch</label><input id="dlg-line" class="dlg-line-input" lang="es" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">`;
    $('#main').innerHTML = `<section class="learning-shell"><div class="learning-top"><button class="back-link" data-action="dlg-exit">${icon('back')}Dialog</button><span class="learning-set-name">Stufe ${dlg.level} · ${stage.name}${dlg.part ? ` · Teil ${dlg.part.number}` : ''}</span><span></span></div><div class="round-progress"><div><strong>${esc(d.title)}</strong><span>${dlg.done} / ${dlg.total} Zeilen geschafft</span></div><div class="mini-progress"><span style="width:${Math.round(dlg.done / dlg.total * 100)}%"></span></div></div><div class="dlg-card">${prev ? `<div class="dlg-bubble dlg-context"><div class="dlg-speaker">${esc(prev.speaker)}</div><div class="dlg-es" lang="es">${esc(prev.es)}</div></div>` : ''}<div class="dlg-prompt"><small>${esc(line.speaker)} sagt</small>${esc(cue)}</div><form id="dlg-form">${field}${accentKeys()}<div class="write-actions"><button type="button" class="text-button" data-action="dlg-skip">Weiß ich noch nicht</button><button type="submit" class="button primary">Prüfen ${icon('arrow')}</button></div></form><div id="dlg-feedback" class="answer-feedback" role="status" aria-live="polite"></div></div><div class="shortcut-hint"><kbd>Tab</kbd> Nächste Lücke <span>·</span> <kbd>Enter</kbd> Prüfen / weiter</div></section>`;
    $('#dlg-form').addEventListener('submit', e => { e.preventDefault(); if (!dlg.answered) gradeDialogLine(); });
    document.querySelector('.dlg-card').addEventListener('focusin', e => { if (e.target.matches('input,textarea')) dlgLastInput = e.target; });
    requestAnimationFrame(() => document.querySelector('.dlg-blank, #dlg-line')?.focus({ preventScroll: true }));
  }
  function gradeDialogLine(skip = false) {
    if (!dlg || dlg.answered) return;
    const d = currentDialog(), line = d.lines[dlg.current], accents = data.settings.accents;
    const fields = [...document.querySelectorAll('.dlg-blank, #dlg-line')];
    if (!skip && !fields.some(f => String(f.value).trim())) return fields[0]?.focus();
    let correct = false, parts, slips = [];
    if (skip) parts = C.lineTokens(line.es).map(t => t.word ? { ...t, ok: false } : t);
    else if (dlg.level < 3) {
      correct = true;
      const given = new Map(fields.map(f => [Number(f.dataset.token), f]));
      parts = dlg.cloze.map((t, i) => {
        if (!t.blank) return t;
        const result = C.compareLine(given.get(i).value, t.text, { accents });
        given.get(i).classList.add(result.correct ? 'is-right' : 'is-wrong');
        if (!result.correct) correct = false;
        slips.push(...result.accentSlips);
        return { ...t, ok: result.correct };
      });
    } else ({ correct, parts, accentSlips: slips } = C.compareLine(fields[0].value, line.es, { accents }));
    dlg.answered = true; dlg.attempts++;
    const today = localDate(); data.history[today] = (Number(data.history[today]) || 0) + 1;
    applyDialogResult(correct); save();
    fields.forEach(f => { f.disabled = true; });
    document.querySelectorAll('#dlg-form button').forEach(b => { b.disabled = true; });
    const canAccept = !correct && !skip && dlg.level === 3;
    const box = $('#dlg-feedback'); box.className = `answer-feedback visible ${correct ? 'correct' : 'incorrect'}`;
    box.innerHTML = `<div class="feedback-title">${icon(correct ? 'check' : 'book')}<strong>${correct ? 'Richtig' : 'So heißt der Satz'}</strong></div><div class="feedback-answer" lang="es">${parts.map(p => p.word && p.ok === false ? `<span class="dlg-missed">${esc(p.text)}</span>` : esc(p.text)).join('')}</div>${slips.length ? `<p class="dlg-accent-note">Zählt als richtig, im Test aber auf den Akzent achten: ${esc([...new Set(slips)].join(', '))}</p>` : ''}${correct ? '' : '<p>Kommt am Ende der Runde noch einmal dran.</p>'}<div class="dlg-feedback-actions"><button class="button ${correct ? 'success' : 'primary'}" data-action="dlg-next">${dlg.queue.length ? 'Weiter' : 'Ergebnis ansehen'} ${icon('arrow')}</button>${canAccept ? '<button class="text-button" data-action="dlg-accept">War doch richtig</button>' : ''}</div>`;
    box.querySelector('[data-action="dlg-next"]').focus({ preventScroll: true });
  }
  function applyDialogResult(correct) {
    if (correct) { dlg.done++; if (!dlg.missed.has(dlg.current)) dlg.firstTry++; }
    else { dlg.missed.add(dlg.current); dlg.queue.push(dlg.current); }
  }
  function finishDialogStage(passed) {
    const d = currentDialog();
    d.progress.practiced = localDate();
    if (passed && dlg.part) {
      d.progress.parts = { ...d.progress.parts, [dlg.part.key]: Math.max(Number(d.progress.parts?.[dlg.part.key]) || 0, dlg.level) };
      // Passing every part at a stage counts as passing the stage for the whole dialogue.
      if (C.dialogParts(d).every(p => (Number(d.progress.parts[p.key]) || 0) >= dlg.level)) d.progress.best = Math.max(d.progress.best, dlg.level);
    } else if (passed) d.progress.best = Math.max(d.progress.best, dlg.level);
    save();
  }
  function dialogResultActions(d, level, passed, part) {
    const start = (label, targetLevel, cls, targetPart = '') => `<button class="button ${cls}" data-action="dlg-start" data-level="${targetLevel}"${targetPart ? ` data-part="${targetPart}"` : ''}>${label}</button>`;
    const repeat = part ? 'Teil wiederholen' : level === 4 ? 'Nochmal schreiben' : `Stufe ${level} wiederholen`;
    const buttons = [];
    if (passed && level < 4) buttons.push(start(`Weiter zu Stufe ${level + 1} ${icon('arrow')}`, level + 1, 'primary'), start(repeat, level, 'secondary'));
    else if (!passed && level === 4) buttons.push(start(`Zu Stufe 3 ${icon('arrow')}`, 3, 'primary'), start(repeat, level, 'secondary'));
    else buttons.push(start(`${repeat} ${icon('arrow')}`, level, 'primary'));
    if (part) {
      const following = C.dialogParts(d)[part.number];
      buttons.push(following ? start('Nächster Teil', level, 'secondary', following.key) : start('Ganzer Dialog', level, 'secondary', 'all'));
    }
    return `${buttons.join('')}<button class="text-button" data-action="dlg-open" data-dialog="${esc(d.id)}">Zurück zum Dialog</button>`;
  }
  function drawDialogResult() {
    const d = currentDialog(), ratio = dlg.firstTry / dlg.total, passed = ratio >= PASS_RATIO, level = dlg.level, part = dlg.part;
    finishDialogStage(passed);
    const missed = [...dlg.missed].sort((a, b) => a - b);
    const note = passed ? part ? `Teil ${part.number} sitzt in dieser Stufe.` : 'Bereit für weniger Hilfe.' : 'Noch unter 80 % beim ersten Versuch: Wiederhole diese Stufe, bevor du weitergehst.';
    $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>Stufe ${level} ${passed ? 'geschafft' : 'durchgespielt'}<span class="blue-dot">.</span></h1><p>${note}</p><div class="result-stats"><div><strong>${dlg.firstTry} / ${dlg.total}</strong><span>beim ersten Versuch</span></div><div><strong>${dlg.attempts}</strong><span>Antworten gegeben</span></div><div><strong>${missed.length}</strong><span>${missed.length === 1 ? 'Zeile wiederholt' : 'Zeilen wiederholt'}</span></div></div>${missed.length ? `<div class="result-review"><h3>Wiederholte Zeilen</h3>${missed.map(i => `<div><span lang="es">${esc(d.lines[i].es)}</span></div>`).join('')}</div>` : '<div class="perfect-note">Keine Fehler.</div>'}<div class="result-actions">${dialogResultActions(d, level, passed, part)}</div></section>`;
    dlg = null;
  }
  function drawDialogBrief() {
    const d = currentDialog(), lines = C.dialogQueue(d, 'all', dlg.part).map(i => d.lines[i]);
    $('#main').innerHTML = `<section class="learning-shell"><div class="learning-top"><button class="back-link" data-action="dlg-exit">${icon('back')}Dialog</button><span class="learning-set-name">Stufe 4 · Testangabe${dlg.part ? ` · Teil ${dlg.part.number}` : ''}</span><span></span></div><div class="dlg-card"><h2>Schreib ${dlg.part ? 'diesen Teil' : 'den Dialog'} auf Spanisch</h2><p class="dlg-accent-note">Jede Anweisung braucht mindestens einen Satz. Ohne Nachschauen, danach vergleichst du selbst.</p><ol class="dlg-tasks">${lines.map(l => `<li><b>${esc(l.speaker)}:</b> ${esc(l.task || l.de || C.lineWords(l.es).map(w => w[0] + '…').join(' '))}</li>`).join('')}</ol><form id="dlg-essay-form"><textarea id="dlg-essay" class="dlg-essay" lang="es" aria-label="Dein Dialog" placeholder="¡Hola! …" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"></textarea>${accentKeys()}<div class="write-actions"><span></span><button type="submit" class="button primary">Vergleichen ${icon('arrow')}</button></div></form></div></section>`;
    $('#dlg-essay-form').addEventListener('submit', e => { e.preventDefault(); const text = $('#dlg-essay').value; if (text.trim()) drawDialogCheck(text); else $('#dlg-essay').focus(); });
    const essay = $('#dlg-essay'); essay.addEventListener('focus', () => { dlgLastInput = essay; }); dlgLastInput = essay;
    requestAnimationFrame(() => essay.focus({ preventScroll: true }));
  }
  function drawDialogCheck(text) {
    const d = currentDialog(), have = ` ${C.lineWords(text).map(w => C.normalize(w)).join(' ')} `, lines = C.dialogQueue(d, 'all', dlg.part).map(i => d.lines[i]);
    const today = localDate(); data.history[today] = (Number(data.history[today]) || 0) + 1; save();
    // Exact matches are ticked as a starting point. Free writing can only be judged by the learner.
    const found = l => have.includes(` ${C.lineWords(l.es).map(w => C.normalize(w)).join(' ')} `);
    $('#main').innerHTML = `<section class="learning-shell"><div class="learning-top"><button class="back-link" data-action="dlg-exit">${icon('back')}Dialog</button><span class="learning-set-name">Stufe 4 · Vergleichen</span><span></span></div><div class="dlg-card"><h2>Hast du jeden Schritt drin?</h2><p class="dlg-accent-note">Wörtlich gleiche Sätze sind schon angehakt. Hak auch an, was anders formuliert, aber richtig ist.</p><div class="dlg-mine" lang="es">${esc(text)}</div><form id="dlg-check-form">${lines.map((l, i) => `<label class="dlg-check"><input type="checkbox" name="line-${i}" ${found(l) ? 'checked' : ''}><span><span class="dlg-es" lang="es">${esc(l.es)}</span><span class="dlg-de" style="display:block">${esc(l.speaker)}${l.task || l.de ? ` · ${esc(l.task || l.de)}` : ''}</span></span></label>`).join('')}<div class="dlg-actions"><button type="submit" class="button primary">Ergebnis speichern ${icon('check')}</button></div></form></div></section>`;
    $('#dlg-check-form').addEventListener('submit', e => {
      e.preventDefault();
      const boxes = [...document.querySelectorAll('.dlg-check input')], ticked = boxes.filter(b => b.checked).length, passed = ticked / boxes.length >= PASS_RATIO, part = dlg.part;
      finishDialogStage(passed);
      $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>${ticked} von ${boxes.length} Schritten<span class="blue-dot">.</span></h1><p>${passed ? part ? `Teil ${part.number} kannst du frei schreiben.` : 'Das reicht für den Test. Bau zur Übung etwas um: andere Kleidung, anderes Problem.' : 'Unter 80 %: Übe die fehlenden Zeilen in Stufe 3 und schreib ihn dann nochmal.'}</p><div class="result-actions">${dialogResultActions(d, 4, passed, part)}</div></section>`;
      dlg = null;
    });
  }
  // ---- Grammar tables: fill in the table with fewer and fewer cells given, then use the forms in sentences. ----
  const GRAM_STAGES = [
    { level: 1, name: 'Ein paar Lücken', text: '4 Felder fehlen, der Rest der Tabelle hilft dir.' },
    { level: 2, name: 'Viele Lücken', text: '8 Felder fehlen, nur 4 bleiben stehen.' },
    { level: 3, name: 'Aus dem Kopf', text: 'Die ganze Tabelle ist leer, du füllst alle 12 Felder.' },
    { level: 4, name: 'In Sätzen', text: 'Jede Runde 12 andere Sätze, jede Form kommt einmal dran.' },
  ];
  let grammarId = null, gram = null;
  const grammarTables = () => window.WWGrammarSeed || [];
  const currentTable = () => grammarTables().find(t => t.id === grammarId);
  const grammarProgress = id => data.grammar[id] || { best: 0, practiced: '' };
  function grammarTableHtml(table, cell) {
    const columns = C.grammarColumns(table);
    return `<div class="gram-table-wrap"><table class="gram-table"><caption>${esc(table.title)}</caption><thead><tr><td class="gram-corner"></td>${table.groups.map(g => `<th scope="colgroup" colspan="${g.columns.length}" lang="es">${esc(g.label)}</th>`).join('')}</tr><tr><td class="gram-corner"></td>${columns.map(c => `<th scope="col" class="gram-col" lang="es">${esc(c.column)}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row, r) => `<tr><th scope="row"><span lang="es">${esc(row.label)} <small>(${esc(row.sub)})</small></span><small class="gram-de">${esc(row.de)}</small></th>${row.cells.map((answer, c) => `<td lang="es">${cell(answer, `r${r}c${c}`)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function drawGrammarList() {
    view = 'grammar'; session = null; flash = null; gram = null; renderShell('Grammatik');
    $('#main').innerHTML = `<section class="page-intro"><div><h1>Grammatik<span class="blue-dot">.</span></h1><p>Tabellen erst ansehen, dann mit immer weniger Hilfe selbst ausfüllen.</p></div></section><div class="dialog-grid">${grammarTables().map(t => { const best = grammarProgress(t.id).best; return `<button class="dialog-card" data-action="gram-open" data-table="${esc(t.id)}"><strong lang="es">${esc(t.title)}</strong><small>${esc(t.description)}</small><small>${C.grammarCells(t).length} Felder · ${stageLabel(best)}</small><span class="mini-progress"><span style="width:${best / 4 * 100}%"></span></span></button>`; }).join('')}</div>`;
  }
  function drawGrammar() {
    const t = currentTable(); if (!t) return drawGrammarList();
    view = 'grammar'; session = null; flash = null; gram = null; renderShell(t.title);
    const { best, practiced } = grammarProgress(t.id), nextLevel = Math.min(4, best + 1);
    const advice = best >= 4 ? practiced === localDate() ? 'Für heute reicht das. Morgen nochmal Stufe 3 oder 4, dann bleibt es hängen.' : 'Kurz wiederholen: Stufe 3 oder 4.' : 'Mach am besten weiter bei der markierten Stufe.';
    $('#main').innerHTML = `<button class="back-link" data-action="gram-list">${icon('back')} Alle Tabellen</button><section class="set-page-heading"><div class="set-emoji big">${icon('table')}</div><div><div class="eyebrow">${C.grammarCells(t).length} FELDER · ${esc(stageLabel(best).toUpperCase())}</div><h1 lang="es">${esc(t.title)}</h1></div>${best ? `<button class="icon-button" data-action="gram-reset" aria-label="Fortschritt zurücksetzen" title="Fortschritt zurücksetzen">${icon('trash')}</button>` : ''}</section>
      <section class="dlg-section"><h2>Üben</h2><p>${advice}</p><div class="dlg-stages">${GRAM_STAGES.map(s => `<button class="dlg-stage ${s.level === nextLevel && best < 4 ? 'next' : ''}" data-action="gram-start" data-level="${s.level}"><span class="dlg-stage-top">STUFE ${s.level}${best >= s.level ? icon('check') : ''}</span><strong>${s.name}</strong><small>${s.text}</small></button>`).join('')}</div></section>
      <section class="dlg-section"><h2>Ansehen</h2><p>${esc(t.tip)}</p>${grammarTableHtml(t, answer => esc(answer))}</section>`;
  }
  function startGrammar(level) {
    const t = currentTable(); if (!t) return drawGrammarList();
    const gaps = C.grammarGaps(t, level);
    gram = { level, gaps, open: gaps.map(g => g.key), wrong: [], missed: new Set(), slips: new Set(), firstTry: 0, attempts: 0, checked: 0 };
    drawGrammarRound();
  }
  const gapInput = gap => `<input class="dlg-blank gram-input" data-gap="${gap.key}" aria-label="${esc(gap.label)}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="next">`;
  function drawGrammarRound() {
    const t = currentTable(), stage = GRAM_STAGES[gram.level - 1], byKey = new Map(gram.gaps.map(g => [g.key, g]));
    const body = gram.level === 4
      ? `<ol class="gram-sentences">${gram.gaps.map(gap => { const s = t.sentences[Number(gap.key.slice(1))]; return `<li><div class="gram-sentence" lang="es">${esc(s.before || '')}${gapInput(gap)}${esc(s.after)}<span class="gram-solution" data-solution="${gap.key}" hidden></span></div><small lang="de">${esc(s.de)}</small></li>`; }).join('')}</ol>`
      : grammarTableHtml(t, (answer, key) => byKey.has(key) ? `${gapInput(byKey.get(key))}<span class="gram-solution" data-solution="${key}" hidden></span>` : `<span class="gram-given">${esc(answer)}</span>`);
    $('#main').innerHTML = `<section class="learning-shell gram-shell"><div class="learning-top"><button class="back-link" data-action="gram-exit">${icon('back')}Tabelle</button><span class="learning-set-name">Stufe ${gram.level} · ${stage.name}</span><span></span></div><div class="round-progress"><div><strong lang="es">${esc(t.title)}</strong><span id="gram-count"></span></div><div class="mini-progress"><span id="gram-bar"></span></div></div><div class="dlg-card"><form id="gram-form" novalidate>${body}<div class="write-actions"><span></span><button type="submit" class="button primary" id="gram-submit">Prüfen ${icon('arrow')}</button></div></form><div id="gram-feedback" class="answer-feedback" role="status" aria-live="polite"></div></div><div class="shortcut-hint"><kbd>Enter</kbd> Nächstes leeres Feld, am Ende Prüfen</div></section>`;
    $('#gram-form').addEventListener('submit', e => { e.preventDefault(); if (!gram.wrong.length) gradeGrammar(); });
    $('#gram-form').addEventListener('keydown', e => {
      if (e.key !== 'Enter' || !e.target.matches('.gram-input')) return;
      const inputs = [...document.querySelectorAll('.gram-input:not([readonly])')], at = inputs.indexOf(e.target);
      const empty = [...inputs.slice(at + 1), ...inputs.slice(0, at)].find(i => !i.value.trim());
      if (empty) { e.preventDefault(); empty.focus({ preventScroll: true }); }
    });
    updateGrammarCount();
    requestAnimationFrame(() => document.querySelector('.gram-input')?.focus({ preventScroll: true }));
  }
  function updateGrammarCount() {
    const total = gram.gaps.length, done = total - gram.open.length;
    $('#gram-count').textContent = `${done} / ${total} Felder richtig`;
    $('#gram-bar').style.width = `${Math.round(done / total * 100)}%`;
  }
  const gapField = key => document.querySelector(`.gram-input[data-gap="${key}"]`);
  function gradeGrammar() {
    const first = !gram.checked, wrong = [];
    gram.checked++;
    for (const key of gram.open) {
      const gap = gram.gaps.find(g => g.key === key), field = gapField(key), result = C.checkGap(field.value, gap.answer, data.settings.accents);
      if (field.value.trim()) gram.attempts++;
      if (result === 'slip') gram.slips.add(gap.answer);
      field.setAttribute('readonly', '');
      if (result === 'wrong') { wrong.push(key); gram.missed.add(key); field.classList.add('is-wrong'); }
      else {
        field.classList.add('is-right');
        if (first) gram.firstTry++;
        data.history[localDate()] = (data.history[localDate()] || 0) + 1;
      }
    }
    gram.open = wrong; gram.wrong = wrong;
    save(); updateGrammarCount();
    if (!wrong.length) return drawGrammarResult();
    wrong.forEach(key => { const s = document.querySelector(`[data-solution="${key}"]`); s.textContent = gram.gaps.find(g => g.key === key).answer; s.hidden = false; });
    $('#gram-submit').hidden = true;
    const box = $('#gram-feedback'); box.className = 'answer-feedback visible incorrect';
    box.innerHTML = `<div class="feedback-title">${icon('book')}<strong>${wrong.length === 1 ? '1 Feld stimmt noch nicht' : `${wrong.length} Felder stimmen noch nicht`}</strong></div><p>Die richtige Form steht jetzt beim Feld. Schau sie dir an, dann schreibst du sie selbst.</p><div class="dlg-feedback-actions"><button type="button" class="button primary" data-action="gram-retry">Nochmal schreiben ${icon('arrow')}</button></div>`;
    box.querySelector('button').focus({ preventScroll: true });
  }
  function retryGrammar() {
    gram.wrong.forEach(key => {
      const field = gapField(key), s = document.querySelector(`[data-solution="${key}"]`);
      field.value = ''; field.removeAttribute('readonly'); field.classList.remove('is-wrong');
      s.hidden = true; s.textContent = '';
    });
    gram.wrong = [];
    $('#gram-submit').hidden = false;
    const box = $('#gram-feedback'); box.className = 'answer-feedback'; box.innerHTML = '';
    gapField(gram.open[0]).focus({ preventScroll: true });
  }
  function drawGrammarResult() {
    const t = currentTable(), total = gram.gaps.length, passed = gram.firstTry / total >= PASS_RATIO, level = gram.level, progress = grammarProgress(t.id);
    data.grammar[t.id] = { best: passed ? Math.max(progress.best, level) : progress.best, practiced: localDate() };
    save();
    const missed = gram.gaps.filter(g => gram.missed.has(g.key)), slips = [...gram.slips];
    const start = (label, target, cls) => `<button class="button ${cls}" data-action="gram-start" data-level="${target}">${label}</button>`;
    const buttons = passed && level < 4 ? [start(`Weiter zu Stufe ${level + 1} ${icon('arrow')}`, level + 1, 'primary'), start(`Stufe ${level} wiederholen`, level, 'secondary')] : [start(`${level === 4 ? 'Nochmal üben' : `Stufe ${level} wiederholen`} ${icon('arrow')}`, level, 'primary')];
    const note = passed ? level === 4 ? 'Du kannst die Formen auch in Sätzen benutzen.' : 'Bereit für weniger Hilfe.' : 'Noch unter 80 % beim ersten Versuch: Wiederhole diese Stufe, bevor du weitergehst.';
    $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>Stufe ${level} ${passed ? 'geschafft' : 'durchgespielt'}<span class="blue-dot">.</span></h1><p>${note}</p><div class="result-stats"><div><strong>${gram.firstTry} / ${total}</strong><span>beim ersten Versuch</span></div><div><strong>${gram.checked}</strong><span>${gram.checked === 1 ? 'Durchgang' : 'Durchgänge'}</span></div><div><strong>${missed.length}</strong><span>${missed.length === 1 ? 'Feld wiederholt' : 'Felder wiederholt'}</span></div></div>${slips.length ? `<p class="dlg-accent-note">Zählt als richtig, im Test aber auf den Akzent achten: ${esc(slips.join(', '))}</p>` : ''}${missed.length ? `<div class="result-review"><h3>Wiederholte Felder</h3>${missed.map(g => `<div><span lang="es">${esc(g.answer)}</span>${g.key.startsWith('r') ? `<span>${esc(g.label)}</span>` : ''}</div>`).join('')}</div>` : '<div class="perfect-note">Keine Fehler.</div>'}<div class="result-actions">${buttons.join('')}<button class="text-button" data-action="gram-open">Zurück zur Tabelle</button></div></section>`;
    gram = null;
  }
  // ---- Subjects (Fächer). Spanisch keeps the vocabulary tools, every other subject is made of question catalogues. ----
  const VOCAB = 'Spanisch', VOCAB_VIEWS = ['library', 'set', 'learn', 'flashcards', 'dialogs', 'grammar'], SUBJECT_KEY = 'wortwechsel.subject';
  const QA_LEVELS = ['Neu', 'Üben', 'Fast', 'Sicher'];
  const SUBJECT_EMOJI = { geschichte: '🏛️', gpb: '🏛️', biologie: '🧬', bio: '🧬', chemie: '⚗️', physik: '🔭', mathe: '📐', mathematik: '📐', geografie: '🌍', geographie: '🌍', gwk: '🌍', deutsch: '📖', englisch: '💂', wirtschaft: '📈', bwl: '📈', recht: '⚖️', informatik: '💻', religion: '🕊️', ethik: '🕊️', musik: '🎵', kunst: '🎨', psychologie: '🧠', philosophie: '💭', politik: '🗳️' };
  let subject = VOCAB, catalogId = null, qa = null, qaTest = null, qaFilter = 'all', qaDraft = null, qaEditing = null, testTimer = null;
  try { subject = localStorage.getItem(SUBJECT_KEY) || VOCAB; } catch {}
  const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const sameSubject = (a, b) => C.normalize(a) === C.normalize(b);
  const subjectList = () => { const out = [VOCAB]; for (const c of data.catalogs) if (!out.some(s => sameSubject(s, c.subject))) out.push(c.subject); return out; };
  const subjectCatalogs = (name = subject) => data.catalogs.filter(c => sameSubject(c.subject, name));
  const subjectEmoji = name => sameSubject(name, VOCAB) ? '🇪🇸' : SUBJECT_EMOJI[C.normalize(name)] || subjectCatalogs(name)[0]?.emoji || '📘';
  const currentCatalog = () => data.catalogs.find(c => c.id === catalogId);
  const lastPracticed = c => Math.max(Number(c.test?.at) || 0, ...Object.values(c.progress || {}).map(p => Number(p.at) || 0));
  const formatPoints = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const qaLevel = (c, id) => c.progress?.[id]?.level || 0;
  function syncSubjectUi() {
    const list = subjectList(), el = $('#subject-switch');
    if (!list.some(s => sameSubject(s, subject))) subject = VOCAB;
    const key = list.join('\n');
    if (el.dataset.key !== key) {
      el.dataset.key = key; el.classList.toggle('many', list.length > 2);
      el.innerHTML = `<span class="subject-thumb" aria-hidden="true"></span>${list.map(s => `<button type="button" class="subject-tab" role="tab" data-subject="${esc(s)}" title="${esc(s)}"><span class="subject-emoji" aria-hidden="true">${esc(subjectEmoji(s))}</span><span class="subject-name">${esc(s)}</span></button>`).join('')}`;
      el.querySelectorAll('.subject-tab').forEach(tab => tab.setAttribute('aria-selected', String(sameSubject(tab.dataset.subject, subject))));
      moveSubjectThumb(true);
    } else {
      el.querySelectorAll('.subject-tab').forEach(tab => tab.setAttribute('aria-selected', String(sameSubject(tab.dataset.subject, subject))));
      moveSubjectThumb();
    }
    const vocab = sameSubject(subject, VOCAB);
    if ($('#nav-vocab').hidden !== !vocab) { $('#nav-vocab').hidden = !vocab; $('#nav-qa').hidden = vocab; }
    $('#nav-vocab-catalogs').hidden = !subjectCatalogs(VOCAB).length;
    try { localStorage.setItem(SUBJECT_KEY, subject); } catch {}
  }
  function moveSubjectThumb(instant = false) {
    const el = $('#subject-switch'), active = el?.querySelector('[aria-selected="true"]'), thumb = el?.querySelector('.subject-thumb');
    if (!active || !thumb?.style) return;
    if (instant) thumb.style.transition = 'none';
    thumb.style.transform = `translate(${active.offsetLeft || 0}px, ${active.offsetTop || 0}px)`;
    thumb.style.width = `${active.offsetWidth || 0}px`; thumb.style.height = `${active.offsetHeight || 0}px`;
    if (instant) { void thumb.offsetWidth; thumb.style.transition = ''; }
  }
  // Fades the page out, swaps it, and lets the new page settle in. Without animation support it just swaps.
  function transition(fn) {
    const main = $('#main');
    if (reduced() || typeof main.animate !== 'function') return fn();
    main.getAnimations?.().forEach(a => a.cancel());
    main.animate([{ opacity: 1, filter: 'blur(0)', transform: 'none' }, { opacity: 0, filter: 'blur(6px)', transform: 'scale(.985)' }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(() => {
      fn(); main.getAnimations().forEach(a => a.cancel()); window.scrollTo?.(0, 0);
      main.animate([{ opacity: 0, filter: 'blur(8px)', transform: 'translateY(14px) scale(.99)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
    }, () => {});
  }
  const busy = () => !!(session?.current || dlg || gram || qa || qaTest?.phase === 'write');
  function switchSubject(name) {
    const go = () => {
      subject = name; syncSubjectUi();
      transition(() => sameSubject(subject, VOCAB) ? drawLibrary() : drawCatalogs());
    };
    if (busy()) return confirmAction('Übung verlassen?', 'Die laufende Übung wird beendet. Bereits bewertete Antworten bleiben gespeichert.', 'Fach wechseln', go);
    go();
  }
  // Built-in catalogues always come from seed.js, so text fixes reach existing users. Only their progress is stored.
  function withCatalogSeeds(stored) {
    const valid = (Array.isArray(stored) ? stored : []).map(c => C.validateCatalog(c)).filter(Boolean);
    const seeds = (window.WWCatalogSeed || []).map(seed => { const old = valid.find(c => c.id === seed.id); return C.validateCatalog({ ...seed, progress: old?.progress, test: old?.test, created: old?.created }); }).filter(Boolean);
    return [...seeds, ...valid.filter(c => !seeds.some(s => s.id === c.id))];
  }
  function answerHtml(answer, given = null) {
    const coverage = given === null ? null : C.keywordCoverage(given, answer);
    const keys = new Set(C.answerKeywords(answer).map(k => k.stem));
    const words = text => coverage ? String(text).split(/([\p{L}\d]+)/u).map((part, i) => {
      if (i % 2 === 0) return esc(part);
      const stem = C.qaStem(part);
      if (!keys.has(stem)) return esc(part);
      return coverage.hits.has(stem) ? `<mark class="qa-hit">${esc(part)}</mark>` : `<span class="qa-miss">${esc(part)}</span>`;
    }).join('') : esc(text);
    let out = '', list = [];
    const flush = () => { if (list.length) out += `<ul>${list.map((t, i) => `<li style="--i:${i}">${words(t)}</li>`).join('')}</ul>`; list = []; };
    for (const part of C.answerParts(answer)) { if (part.bullet) list.push(part.text); else { flush(); out += `<p>${words(part.text)}</p>`; } }
    flush();
    return out;
  }
  function totals(list) {
    const out = { total: 0, points: 0, safe: 0, almost: 0, practice: 0, fresh: 0 };
    for (const c of list) { const s = C.catalogStats(c); for (const k of Object.keys(out)) out[k] += s[k]; }
    out.progress = out.total ? Math.round((out.safe + out.almost * 0.5) / out.total * 100) : 0;
    return out;
  }
  const ring = (percent, label) => `<div class="qa-ring" style="--p:${percent}"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-fill" cx="60" cy="60" r="52" pathLength="100"/></svg><div><strong>${percent}<small>%</small></strong><span>${esc(label)}</span></div></div>`;
  const levelLegend = s => `<div class="qa-legend"><span><i class="l3"></i>Sicher <strong>${s.safe}</strong></span><span><i class="l2"></i>Fast <strong>${s.almost}</strong></span><span><i class="l1"></i>Üben <strong>${s.practice}</strong></span><span><i class="l0"></i>Neu <strong>${s.fresh}</strong></span></div>`;
  const levelBar = s => `<div class="qa-stack" aria-hidden="true">${[['l3', s.safe], ['l2', s.almost], ['l1', s.practice], ['l0', s.fresh]].filter(([, n]) => n).map(([cls, n], i) => `<span class="${cls}" style="flex:${n};--i:${i}"></span>`).join('')}</div>`;
  function drawCatalogs() {
    view = 'catalogs'; session = null; flash = null; renderShell('Übersicht');
    const list = subjectCatalogs();
    if (!list.length && !sameSubject(subject, VOCAB)) { subject = VOCAB; return drawLibrary(); }
    const focus = [...list].sort((a, b) => lastPracticed(b) - lastPracticed(a))[0], all = totals(list), fs = focus && C.catalogStats(focus);
    const tests = list.filter(c => c.test?.at).sort((a, b) => b.test.at - a.test.at);
    const first = focus?.questions[0];
    $('#main').innerHTML = `<section class="page-intro"><div><h1>${esc(subject)}<span class="blue-dot">.</span></h1><p>${list.length} ${list.length === 1 ? 'Fragenkatalog' : 'Fragenkataloge'} · ${all.total} Fragen · ${formatPoints(all.points)} Punkte</p></div><button class="button primary" data-action="qa-new">${icon('plus')}Neuer Fragenkatalog</button></section>
      ${focus ? `<section class="dashboard-grid"><div class="focus-card qa-focus"><div class="focus-copy"><div class="hero-tag"><span class="pulse-dot"></span>${lastPracticed(focus) ? 'WEITERLERNEN' : 'LOS GEHT’S'}</div><h2>${esc(focus.title)}</h2><p>${fs.total} Fragen · ${formatPoints(fs.points)} Punkte · ${fs.safe} sicher</p><div class="hero-actions"><button class="button white" data-action="qa-learn" data-catalog="${esc(focus.id)}">${icon('spark')}${fs.safe + fs.almost ? 'Weiterlernen' : 'Lernen'}${icon('arrow')}</button><button class="button glass" data-action="qa-test" data-catalog="${esc(focus.id)}">${icon('clock')}Test simulieren</button></div></div><div class="hero-art qa-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-star star-one">✳</span><span class="art-star star-two">✧</span><div class="art-card card-back"><span>Musterlösung</span><div class="mini-line"></div><div class="mini-line"></div><div class="mini-line short"></div></div><div class="art-card card-front"><span class="qa-art-mark">?</span><strong>${esc(first?.q || 'Frage')}</strong><span>${first?.points ? `${first.points} Punkte` : 'Frage 1'}</span></div><div class="art-check">${icon('check')}</div></div></div>
      <aside class="progress-card qa-progress-card"><div class="section-kicker">DEIN STAND ${icon('chart')}</div><div class="qa-progress-body">${ring(all.progress, 'gelernt')}${levelLegend(all)}</div><div class="stat-duo"><div><span class="stat-icon flame">${icon('flame')}</span><strong>${streak()} <small>${streak() === 1 ? 'Tag' : 'Tage'}</small></strong><p>in Folge gelernt</p></div><div><span class="stat-icon lavender">${icon('clock')}</span><strong>${tests[0] ? `${tests[0].test.last}<small>%</small>` : '–'}</strong><p>${tests[0] ? 'letzter Test' : 'noch kein Test'}</p></div></div></aside></section>` : ''}
      <section class="library-section"><div class="section-heading"><div><h2>Fragenkataloge <span class="count-badge">${list.length}</span></h2></div></div><div class="set-grid">${list.map((c, index) => { const s = C.catalogStats(c); return `<article class="set-card"><div class="set-card-top"><div class="set-emoji tone-${index % 3}">${esc(c.emoji)}</div><span class="language-pill">${s.total} Fragen · ${formatPoints(s.points)} P.</span></div><button class="set-title" data-action="qa-open" data-catalog="${esc(c.id)}">${esc(c.title)}</button><div class="set-meta">${icon('check')} ${s.safe} sicher <span>·</span> ${s.almost} fast${c.test?.best ? ` <span>·</span> Test ${c.test.best}%` : ''}</div><div class="set-progress-label"><span>Fortschritt</span><strong>${s.progress}%</strong></div>${levelBar(s)}<div class="set-card-footer"><button class="text-button" data-action="qa-open" data-catalog="${esc(c.id)}">Fragen ansehen</button><button class="round-button" data-action="qa-learn" data-catalog="${esc(c.id)}" aria-label="${esc(c.title)} lernen">${icon('arrow')}</button></div></article>`; }).join('')}<button class="new-set-card" data-action="qa-new"><span class="new-set-icon">${icon('plus')}</span><strong>Neuer Fragenkatalog</strong><span>Fragen und Antworten einfügen oder Word-Datei hochladen</span><span class="text-button">Katalog erstellen ${icon('arrow')}</span></button></div></section>`;
  }
  function qaListHtml(c) {
    const shown = c.questions.map((q, i) => ({ q, i, level: qaLevel(c, q.id) })).filter(x => qaFilter === 'all' || (qaFilter === 'weak' ? x.level < 3 : x.level >= 3));
    if (!shown.length) return `<div class="empty-state">${qaFilter === 'weak' ? 'Alles sicher. Stark!' : 'Noch keine Frage sicher. Starte eine Lernrunde.'}</div>`;
    return shown.map(({ q, i, level }, n) => `<article class="qa-item" style="--i:${Math.min(n, 12)}"><button class="qa-item-head" data-action="qa-toggle" aria-expanded="false"><span class="qa-num">${i + 1}</span><span class="qa-item-q">${esc(q.q)}</span>${q.points ? `<span class="qa-points">${formatPoints(q.points)} P.</span>` : ''}<span class="qa-level l${level}" title="${QA_LEVELS[level]}"><i></i>${QA_LEVELS[level]}</span><span class="qa-chevron">${icon('chevron')}</span></button><div class="qa-item-body"><div><div class="qa-answer">${answerHtml(q.answer)}</div></div></div></article>`).join('');
  }
  function drawCatalog() {
    const c = currentCatalog(); if (!c) return drawCatalogs();
    view = 'catalog'; session = null; flash = null; renderShell(c.title);
    const s = C.catalogStats(c);
    $('#main').innerHTML = `<button class="back-link" data-action="qa-home">${icon('back')} ${esc(c.subject)}</button><section class="set-page-heading"><div class="set-emoji big">${esc(c.emoji)}</div><div><div class="eyebrow">${esc(c.subject.toUpperCase())} · ${s.total} FRAGEN · ${formatPoints(s.points)} PUNKTE</div><h1>${esc(c.title)}</h1>${c.description ? `<p>${esc(c.description)}</p>` : ''}</div>${c.seed ? '' : `<button class="icon-button" data-action="qa-edit" aria-label="Katalog bearbeiten" title="Katalog bearbeiten">${icon('edit')}</button>`}</section>
      <div class="set-actions"><button class="button primary" data-action="qa-learn">${icon('spark')}${s.safe + s.almost + s.practice ? 'Weiterlernen' : 'Jetzt lernen'}</button>${s.safe && s.safe < s.total ? `<button class="button secondary" data-action="qa-learn-weak">${icon('flame')}Nur Unsichere</button>` : ''}<button class="button secondary" data-action="qa-test">${icon('clock')}Test simulieren</button></div>
      <section class="mastery-panel qa-mastery"><div class="qa-mastery-main">${levelBar(s)}${levelLegend(s)}</div><div class="qa-mastery-side"><div><strong>${s.progress}%</strong><span>gelernt</span></div><div><strong>${c.test?.best ? `${c.test.best}%` : '–'}</strong><span>bester Test</span></div></div></section>
      <section class="terms-section"><div class="section-heading"><div><h2>Alle Fragen <span class="count-badge">${s.total}</span></h2><p>Tippe eine Frage an, um die Musterlösung zu sehen. Überleg dir die Antwort vorher.</p></div><div class="qa-filter" role="group" aria-label="Fragen filtern">${[['all', 'Alle'], ['weak', 'Zu üben'], ['safe', 'Sicher']].map(([k, label]) => `<button class="qa-filter-chip" data-action="qa-filter" data-filter="${k}" aria-pressed="${qaFilter === k}">${label}</button>`).join('')}<button class="qa-filter-chip" data-action="qa-expand-all">Alle aufklappen</button></div></div><div class="qa-list" id="qa-list">${qaListHtml(c)}</div><div class="set-danger-zone"><button class="text-button" data-action="qa-reset">Fortschritt zurücksetzen</button>${c.seed ? '' : `<button class="text-button danger" data-action="qa-delete">${icon('trash')}Katalog löschen</button>`}</div></section>`;
  }
  function toggleQaItem(item, open = !item.classList.contains('open')) {
    item.classList.toggle('open', open);
    item.querySelector('.qa-item-head').setAttribute('aria-expanded', String(open));
  }
  // ---- Learning round: recall, compare with the model answer, rate yourself. "Nochmal" comes back after a few cards. ----
  function startQa(onlyWeak = false) {
    const c = currentCatalog(); if (!c) return drawCatalogs();
    let queue = C.catalogQueue(c, onlyWeak);
    if (!queue.length) queue = C.catalogQueue(c, false);
    qa = { queue, total: queue.length, done: new Set(), first: new Map(), repeated: new Set(), write: new Set(), revealed: false, typed: '' };
    drawQaCard();
  }
  // New and shaky questions start as multiple choice; once recognised they have to be written to become "Sicher".
  const qaChoiceMode = (c, id) => c.questions.length >= 3 && qaLevel(c, id) < 2 && !qa.write.has(id);
  function drawQaCard() {
    const c = currentCatalog(), id = qa.queue[0], q = c.questions.find(x => x.id === id), number = c.questions.indexOf(q) + 1, level = qaLevel(c, id);
    view = 'qa-learn'; renderShell(c.title);
    qa.revealed = false; qa.typed = ''; qa.choice = null; qa.options = null;
    if (qaChoiceMode(c, id)) return drawQaChoice(c, q, number, level);
    $('#main').innerHTML = `<section class="learning-shell qa-shell">${qaHead(c, q, number, level)}
      <div class="qa-stage">${icon('keyboard')}Selbst schreiben</div>
      <label class="qa-answer-label" for="qa-typed">Deine Antwort <small>in Stichworten · optional, hilft beim Merken</small></label><textarea id="qa-typed" class="qa-typed" rows="4" placeholder="Schreib auf, was du noch weißt …" spellcheck="true"></textarea>
      <div class="qa-reveal" id="qa-reveal"><div class="qa-reveal-inner" id="qa-reveal-inner"></div></div>
      <div class="qa-card-actions" id="qa-actions"><span class="shortcut-hint"><kbd>⌘</kbd> <kbd>↩</kbd> oder <kbd>Leertaste</kbd></span><button class="button primary" data-action="qa-reveal">Antwort zeigen ${icon('arrow')}</button></div></article></section>`;
    const input = $('#qa-typed');
    input.addEventListener('input', () => { qa.typed = input.value; });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); revealQa(); } });
  }
  function qaHead(c, q, number, level) {
    const percent = Math.round(qa.done.size / qa.total * 100), id = q.id;
    return `<div class="learning-top"><button class="back-link" data-action="qa-exit">${icon('back')}Katalog</button><span class="learning-set-name">${esc(c.title)}</span><span class="qa-round-count">${qa.done.size} / ${qa.total}</span></div><div class="round-progress"><div><strong>Deine Lernrunde</strong><span>${qa.done.size} / ${qa.total} Fragen sitzen</span></div><div class="mini-progress"><span style="width:${percent}%"></span></div></div>
      <article class="qa-card" id="qa-card"><div class="qa-card-meta"><span class="qa-chip">Frage ${number}</span>${q.points ? `<span class="qa-chip">${formatPoints(q.points)} ${q.points === 1 ? 'Punkt' : 'Punkte'}</span>` : ''}<span class="qa-level l${level}"><i></i>${QA_LEVELS[level]}</span>${qa.repeated.has(id) ? '<span class="qa-chip again">Nochmal</span>' : ''}</div><h1 class="qa-question">${esc(q.q)}</h1>`;
  }
  function drawQaChoice(c, q, number, level) {
    qa.options = C.choiceOptions(c, q.id);
    $('#main').innerHTML = `<section class="learning-shell qa-shell">${qaHead(c, q, number, level)}
      <div class="qa-stage choice">${icon('layers')}Auswählen <span>Welche Antwort passt?</span></div>
      <div class="qa-choices" id="qa-choices">${qa.options.map((o, i) => `<button class="choice-button qa-choice" data-action="qa-choice" data-index="${i}"><span class="choice-key">${i + 1}</span><span>${esc(o.text)}</span><span class="choice-result"></span></button>`).join('')}</div>
      <div class="qa-reveal" id="qa-reveal"><div class="qa-reveal-inner" id="qa-reveal-inner"></div></div>
      <div class="qa-card-actions" id="qa-actions"><button class="text-button" data-action="qa-write">${icon('keyboard')}Lieber selbst schreiben</button><button class="text-button" data-action="qa-choice-skip">Weiß ich nicht</button></div></article><div class="shortcut-hint"><kbd>1</kbd> – <kbd>${qa.options.length}</kbd> Antwort wählen <span>·</span> <kbd>Enter</kbd> weiter</div></section>`;
  }
  function chooseQa(index) {
    if (!qa?.options || qa.revealed) return;
    const c = currentCatalog(), q = c.questions.find(x => x.id === qa.queue[0]);
    const right = qa.options.findIndex(o => o.correct), ok = index === right;
    qa.revealed = true; qa.choice = ok ? 'known' : 'again';
    document.querySelectorAll('.qa-choice').forEach((btn, i) => {
      btn.disabled = true;
      if (i === right) { btn.classList.add('is-correct'); btn.querySelector('.choice-result').innerHTML = icon('check'); }
      else if (i === index) btn.classList.add('is-wrong');
      else btn.classList.add('is-dim');
    });
    $('#qa-card').classList.add(ok ? 'chose-right' : 'chose-wrong');
    $('#qa-reveal-inner').innerHTML = `<div class="qa-solution"><div class="qa-solution-label">${icon('book')}Ganze Musterlösung</div><div class="qa-answer">${answerHtml(q.answer, null)}</div></div>`;
    const note = ok ? (qaLevel(c, q.id) < 1 && !qa.repeated.has(q.id) ? 'Richtig! Nächste Runde schreibst du sie selbst.' : 'Richtig! Jetzt bist du bereit, sie selbst zu schreiben.') : index < 0 ? 'Kein Problem. Lies dir die Lösung durch, die Frage kommt gleich nochmal.' : 'Nicht ganz. Die Frage kommt gleich nochmal.';
    $('#qa-actions').innerHTML = `<p class="qa-choice-note ${ok ? 'ok' : 'bad'}" role="status">${note}</p><button class="button primary" data-action="qa-rate" data-rating="${qa.choice}">Weiter ${icon('arrow')}</button>`;
    requestAnimationFrame(() => $('#qa-reveal')?.classList.add('open'));
    $('#qa-actions .button')?.focus({ preventScroll: true });
    setTimeout(() => $('#qa-actions')?.scrollIntoView?.({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }), 380);
  }
  function revealQa() {
    if (!qa || qa.revealed) return;
    const c = currentCatalog(), q = c.questions.find(x => x.id === qa.queue[0]), typed = $('#qa-typed').value.trim();
    qa.revealed = true; qa.typed = typed;
    const input = $('#qa-typed'); input.readOnly = true; input.classList.add('done'); if (!typed) input.closest('.qa-card').classList.add('no-typed');
    const cov = typed ? C.keywordCoverage(typed, q.answer) : null;
    const suggest = !cov ? '' : cov.ratio >= 0.6 ? 'known' : cov.ratio >= 0.3 ? 'partly' : 'again';
    $('#qa-reveal-inner').innerHTML = `${cov ? `<div class="qa-coverage"><div class="qa-coverage-top"><span>Schlüsselbegriffe getroffen</span><strong>${cov.hits.size} / ${cov.total}</strong></div><div class="mini-progress"><span style="width:${Math.round(cov.ratio * 100)}%"></span></div><small><mark class="qa-hit">markiert</mark> hast du erwähnt, <span class="qa-miss">unterstrichen</span> fehlt noch.</small></div>` : ''}<div class="qa-solution"><div class="qa-solution-label">${icon('book')}Musterlösung</div><div class="qa-answer">${answerHtml(q.answer, typed ? typed : null)}</div></div>`;
    $('#qa-actions').innerHTML = `<p class="qa-rate-q">Wie gut wusstest du es?</p><div class="qa-rate">${[['again', 'Nochmal', 'kommt gleich wieder', 1], ['partly', 'Fast', 'kommt am Ende nochmal', 2], ['known', 'Gewusst', 'sitzt', 3]].map(([r, label, hint, key]) => `<button class="qa-rate-btn ${r}${suggest === r ? ' suggested' : ''}" data-action="qa-rate" data-rating="${r}"><kbd>${key}</kbd><strong>${label}</strong><small>${hint}</small></button>`).join('')}</div>`;
    requestAnimationFrame(() => { $('#qa-reveal')?.classList.add('open'); $('#qa-actions')?.classList.add('rating'); });
    (document.querySelector('.qa-rate-btn.suggested') || document.querySelector('.qa-rate-btn.known'))?.focus({ preventScroll: true });
  }
  function rateQa(rating) {
    if (!qa?.revealed) return;
    const c = currentCatalog(), id = qa.queue.shift();
    c.progress[id] = C.rateQuestion(c.progress[id], rating);
    if (!qa.first.has(id)) qa.first.set(id, rating);
    if (rating === 'again') { qa.queue.splice(Math.min(3, qa.queue.length), 0, id); qa.repeated.add(id); }
    else if (rating === 'partly' && !qa.repeated.has(id) && qa.queue.length) { qa.queue.push(id); qa.repeated.add(id); }
    else qa.done.add(id);
    data.history[localDate()] = (Number(data.history[localDate()]) || 0) + 1;
    save();
    const next = () => qa.queue.length ? drawQaCard() : drawQaResult();
    const card = $('#qa-card');
    if (reduced() || typeof card?.animate !== 'function') return next();
    qa.revealed = false;
    card.animate([{ opacity: 1, transform: 'none', filter: 'blur(0)' }, { opacity: 0, transform: `translateX(${rating === 'again' ? 40 : -40}px) scale(.97)`, filter: 'blur(4px)' }], { duration: 220, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).finished.then(next, next);
  }
  function drawQaResult() {
    const c = currentCatalog(), counts = { known: 0, partly: 0, again: 0 };
    for (const r of qa.first.values()) counts[r]++;
    const weak = c.questions.filter(q => qa.first.has(q.id) && qa.first.get(q.id) !== 'known'), s = C.catalogStats(c);
    view = 'qa-learn'; qa = null; renderShell(c.title);
    $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><h1>Runde geschafft<span class="blue-dot">.</span></h1><p>${s.safe === s.total ? 'Alle Fragen sitzen. Mach zur Kontrolle einen Test.' : `${s.safe} von ${s.total} Fragen sind jetzt sicher. Wiederhole die unsicheren, bis alle sitzen.`}</p><div class="result-stats"><div><strong>${counts.known}</strong><span>gewusst</span></div><div><strong>${counts.partly}</strong><span>fast</span></div><div><strong>${counts.again}</strong><span>nochmal</span></div></div>${weak.length ? `<div class="result-review qa-review"><h3>Beim ersten Mal unsicher</h3>${weak.map(q => `<div><span>${esc(q.q)}</span><span class="qa-level l${qaLevel(c, q.id)}"><i></i>${QA_LEVELS[qaLevel(c, q.id)]}</span></div>`).join('')}</div>` : '<div class="perfect-note">Alles beim ersten Mal gewusst.</div>'}<div class="result-actions">${s.safe < s.total ? `<button class="button primary" data-action="qa-learn-weak">Unsichere wiederholen ${icon('arrow')}</button><button class="button secondary" data-action="qa-test">Test simulieren</button>` : `<button class="button primary" data-action="qa-test">Test simulieren ${icon('arrow')}</button><button class="button secondary" data-action="qa-learn">Nochmal alle</button>`}<button class="text-button" data-action="qa-open">Zum Katalog</button></div></section>`;
  }
  // ---- Test simulation: write everything first, then correct yourself with the model answer and a points suggestion. ----
  function drawTestSetup() {
    const c = currentCatalog(); if (!c) return drawCatalogs();
    view = 'qa-test'; qaTest = null; renderShell('Test simulieren');
    const s = C.catalogStats(c), weak = c.questions.filter(q => qaLevel(c, q.id) < 3).length, short = Math.min(5, s.total);
    const option = (size, big, title, text) => `<button class="qa-test-option" data-action="qa-test-start" data-size="${size}"><span class="qa-test-big">${big}</span><strong>${title}</strong><small>${text}</small><span class="qa-test-go">${icon('arrow')}</span></button>`;
    $('#main').innerHTML = `<button class="back-link" data-action="qa-open">${icon('back')} ${esc(c.title)}</button><section class="qa-test-intro"><div class="eyebrow">${icon('clock')} TEST SIMULIEREN</div><h1>Wie im echten Test<span class="blue-dot">.</span></h1><p>Du beantwortest die Fragen schriftlich, ohne Hilfe. Danach siehst du die Musterlösung neben deiner Antwort, bekommst einen Punktevorschlag und korrigierst dich selbst.</p>
      <div class="qa-test-options">${option('all', s.total, 'Ganzer Test', `alle Fragen · ${formatPoints(s.points)} Punkte`)}${s.total > short ? option('5', short, 'Kurztest', `${short} zufällige Fragen`) : ''}${weak && weak < s.total ? option('weak', weak, 'Schwächen', 'nur Fragen, die noch nicht sicher sind') : ''}</div>
      <label class="qa-switch"><input type="checkbox" id="qa-shuffle" checked><span class="qa-switch-ui" aria-hidden="true"></span><span>Reihenfolge mischen</span></label>${c.test?.at ? `<p class="qa-test-best">Bester Test: <strong>${c.test.best}%</strong> · Letzter: <strong>${c.test.last}%</strong></p>` : ''}</section>`;
  }
  function startTest(size) {
    const c = currentCatalog(); if (!c) return drawCatalogs();
    const mix = $('#qa-shuffle')?.checked !== false;
    let ids = c.questions.map(q => q.id);
    if (size === 'weak') ids = ids.filter(id => qaLevel(c, id) < 3);
    if (size === '5') { const pick = new Set(C.shuffle(ids).slice(0, 5)); ids = ids.filter(id => pick.has(id)); }
    if (mix) ids = C.shuffle(ids);
    if (!ids.length) ids = c.questions.map(q => q.id);
    qaTest = { ids, answers: {}, awarded: {}, phase: 'write', started: Date.now(), seconds: 0 };
    drawTest();
  }
  const clock = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  function drawTest() {
    const c = currentCatalog(), qs = qaTest.ids.map(id => c.questions.find(q => q.id === id)), points = qs.reduce((n, q) => n + q.points, 0);
    view = 'qa-test'; renderShell('Test');
    $('#main').innerHTML = `<section class="qa-test"><div class="qa-test-bar"><button class="back-link" data-action="qa-test-exit">${icon('back')}Abbrechen</button><div class="qa-test-title"><strong>${esc(c.title)}</strong><small id="qa-test-status"></small></div><span class="qa-timer" id="qa-timer">${icon('clock')}<span>00:00</span></span></div>
      <ol class="qa-test-list">${qs.map((q, i) => `<li class="qa-test-item" style="--i:${Math.min(i, 10)}"><div class="qa-test-q"><span class="qa-num">${i + 1}</span><h2>${esc(q.q)}</h2>${q.points ? `<span class="qa-points">${formatPoints(q.points)} P.</span>` : ''}</div><textarea class="qa-typed" data-q="${esc(q.id)}" rows="3" placeholder="Deine Antwort …" aria-label="Antwort auf Frage ${i + 1}"></textarea></li>`).join('')}</ol>
      <div class="qa-dock"><span id="qa-dock-status"></span><button class="button primary" data-action="qa-test-submit">Abgeben ${icon('check')}</button></div></section>`;
    const status = () => {
      const done = qaTest.ids.filter(id => (qaTest.answers[id] || '').trim()).length;
      $('#qa-test-status').textContent = `${done} von ${qs.length} beantwortet · ${formatPoints(points)} Punkte`;
      $('#qa-dock-status').textContent = `${done} / ${qs.length}`;
    };
    document.querySelectorAll('.qa-test-list .qa-typed').forEach(t => t.addEventListener('input', () => { qaTest.answers[t.dataset.q] = t.value; status(); }));
    status();
    if (typeof setInterval === 'function') testTimer = setInterval(() => { if (!qaTest || qaTest.phase !== 'write') return; qaTest.seconds = Math.round((Date.now() - qaTest.started) / 1000); const el = document.querySelector('#qa-timer span'); if (el) el.textContent = clock(qaTest.seconds); }, 1000);
    requestAnimationFrame(() => document.querySelector('.qa-test-list .qa-typed')?.focus({ preventScroll: true }));
  }
  function submitTest() {
    const empty = qaTest.ids.filter(id => !(qaTest.answers[id] || '').trim()).length;
    const go = () => {
      const c = currentCatalog();
      qaTest.phase = 'grade'; qaTest.seconds = Math.round((Date.now() - qaTest.started) / 1000);
      for (const id of qaTest.ids) { const q = c.questions.find(x => x.id === id); qaTest.awarded[id] = C.suggestPoints(qaTest.answers[id], q.answer, q.points); }
      transition(drawGrading);
    };
    if (empty) return confirmAction('Test abgeben?', `${empty === 1 ? '1 Frage ist' : `${empty} Fragen sind`} noch leer und ${empty === 1 ? 'zählt' : 'zählen'} mit 0 Punkten.`, 'Abgeben', go);
    go();
  }
  const testScore = () => { const c = currentCatalog(); let got = 0, max = 0; for (const id of qaTest.ids) { got += qaTest.awarded[id] || 0; max += c.questions.find(q => q.id === id).points; } return { got, max }; };
  function drawGrading() {
    const c = currentCatalog();
    view = 'qa-test'; renderShell('Korrektur');
    const { got, max } = testScore();
    $('#main').innerHTML = `<section class="qa-test grading"><div class="qa-test-bar"><div class="qa-test-title"><strong>Korrektur</strong><small>Vergleiche mit der Musterlösung und passe die Punkte an.</small></div><div class="qa-score-live"><strong id="qa-score">${formatPoints(got)}</strong><span>/ ${formatPoints(max)}</span></div></div>
      <ol class="qa-test-list">${qaTest.ids.map((id, i) => { const q = c.questions.find(x => x.id === id), given = (qaTest.answers[id] || '').trim(), cov = given ? C.keywordCoverage(given, q.answer) : null; return `<li class="qa-test-item" style="--i:${Math.min(i, 10)}"><div class="qa-test-q"><span class="qa-num">${i + 1}</span><h2>${esc(q.q)}</h2></div><div class="qa-compare"><div class="qa-given${given ? '' : ' empty'}"><div class="qa-solution-label">${icon('edit')}Deine Antwort</div>${given ? `<p>${esc(given).replace(/\n/g, '<br>')}</p>` : '<p>Keine Antwort</p>'}</div><div class="qa-solution"><div class="qa-solution-label">${icon('book')}Musterlösung${cov ? `<span class="qa-cov-pill">${cov.hits.size}/${cov.total} Begriffe</span>` : ''}</div><div class="qa-answer">${answerHtml(q.answer, given || null)}</div></div></div><div class="qa-grade-row"><span>Punkte</span><div class="qa-stepper"><button type="button" data-action="qa-points" data-q="${esc(id)}" data-delta="-0.5" aria-label="Halben Punkt abziehen">−</button><output data-out="${esc(id)}">${formatPoints(qaTest.awarded[id])}</output><span>/ ${formatPoints(q.points)}</span><button type="button" data-action="qa-points" data-q="${esc(id)}" data-delta="0.5" aria-label="Halben Punkt dazugeben">+</button></div></div></li>`; }).join('')}</ol>
      <div class="qa-dock"><span>Vorschläge sind nur eine Hilfe, entscheide selbst.</span><button class="button primary" data-action="qa-test-finish">Ergebnis ansehen ${icon('arrow')}</button></div></section>`;
  }
  function changePoints(id, delta) {
    const q = currentCatalog().questions.find(x => x.id === id);
    qaTest.awarded[id] = Math.min(q.points, Math.max(0, (qaTest.awarded[id] || 0) + delta));
    const out = document.querySelector(`[data-out="${window.CSS?.escape ? window.CSS.escape(id) : id}"]`);
    if (out) { out.textContent = formatPoints(qaTest.awarded[id]); if (!reduced()) out.animate?.([{ transform: `translateY(${delta > 0 ? 6 : -6}px)`, opacity: 0.3 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.16,1,.3,1)' }); }
    $('#qa-score').textContent = formatPoints(testScore().got);
  }
  function finishTest() {
    const c = currentCatalog(), { got, max } = testScore(), percent = max ? Math.round(got / max * 100) : 0, now = Date.now();
    for (const id of qaTest.ids) {
      const q = c.questions.find(x => x.id === id); if (!q.points) continue;
      const ratio = (qaTest.awarded[id] || 0) / q.points, old = c.progress[id];
      c.progress[id] = { level: ratio >= 0.99 ? 3 : ratio >= 0.5 ? 2 : 1, seen: (Number(old?.seen) || 0) + 1, at: now };
    }
    c.test = { best: Math.max(Number(c.test?.best) || 0, percent), last: percent, total: max, at: now };
    data.history[localDate()] = (Number(data.history[localDate()]) || 0) + qaTest.ids.length;
    save();
    const lost = qaTest.ids.map(id => c.questions.find(q => q.id === id)).filter(q => (qaTest.awarded[q.id] || 0) < q.points), seconds = qaTest.seconds, awarded = qaTest.awarded;
    qaTest = null; view = 'qa-test'; renderShell('Ergebnis');
    $('#main').innerHTML = `<section class="result-page qa-test-result"><div class="qa-score-ring">${ring(percent, `${formatPoints(got)} / ${formatPoints(max)} Punkte`)}</div><h1>${percent >= 90 ? 'Sehr stark' : percent >= 75 ? 'Gut gemacht' : percent >= 50 ? 'Auf gutem Weg' : 'Da geht noch was'}<span class="blue-dot">.</span></h1><p>${lost.length ? `Bei ${lost.length} ${lost.length === 1 ? 'Frage' : 'Fragen'} fehlen noch Punkte. Sie kommen beim Lernen jetzt zuerst dran.` : 'Volle Punktzahl. Alle Fragen sind jetzt sicher.'}</p><div class="result-stats"><div><strong>${formatPoints(got)}</strong><span>von ${formatPoints(max)} Punkten</span></div><div><strong>${percent}%</strong><span>${percent >= c.test.best && percent ? 'Bestwert' : `Bestwert ${c.test.best}%`}</span></div><div><strong>${clock(seconds)}</strong><span>Minuten</span></div></div>${lost.length ? `<div class="result-review qa-review"><h3>Hier fehlen Punkte</h3>${lost.map(q => `<div><span>${esc(q.q)}</span><span class="qa-lost">${formatPoints(awarded[q.id] || 0)} / ${formatPoints(q.points)}</span></div>`).join('')}</div>` : '<div class="perfect-note">Keine Fehler.</div>'}<div class="result-actions">${lost.length ? `<button class="button primary" data-action="qa-learn-weak">Schwächen lernen ${icon('arrow')}</button>` : ''}<button class="button ${lost.length ? 'secondary' : 'primary'}" data-action="qa-test">Neuer Test</button><button class="text-button" data-action="qa-open">Zum Katalog</button></div></section>`;
  }
  // ---- Creating and editing catalogues, also straight from a Word file. ----
  async function docxText(file) {
    const buf = new Uint8Array(await file.arrayBuffer()), dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let end = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { end = i; break; }
    if (end < 0) throw new Error('Die Datei ist kein gültiges Word-Dokument (.docx).');
    let p = dv.getUint32(end + 16, true);
    for (let n = dv.getUint16(end + 10, true); n > 0; n--) {
      const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true), nameLength = dv.getUint16(p + 28, true), local = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nameLength));
      p += 46 + nameLength + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
      if (name !== 'word/document.xml') continue;
      const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true), raw = buf.slice(start, start + size);
      if (method !== 0 && typeof DecompressionStream !== 'function') throw new Error('Dieser Browser kann Word-Dateien nicht lesen. Kopiere den Text stattdessen hinein.');
      const bytes = method === 0 ? raw : new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      const xml = new DOMParser().parseFromString(new TextDecoder().decode(bytes), 'application/xml');
      return [...xml.getElementsByTagName('w:p')].map(par => {
        let text = '';
        for (const node of par.getElementsByTagName('*')) { if (node.tagName === 'w:t') text += node.textContent; else if (node.tagName === 'w:tab') text += '\t'; else if (node.tagName === 'w:br') text += '\n'; }
        return (par.getElementsByTagName('w:numPr').length && text.trim() ? '• ' : '') + text;
      }).join('\n');
    }
    throw new Error('In dieser Datei wurde kein Text gefunden.');
  }
  function openCatalogEditor(source = null) {
    qaEditing = source; qaDraft = null;
    const d = $('#import-dialog'), subjects = subjectList().filter(s => !sameSubject(s, VOCAB));
    const preset = source?.subject || (sameSubject(subject, VOCAB) ? '' : subject);
    d.innerHTML = `<div class="dialog-header"><div><h2 id="import-heading">${source ? 'Fragenkatalog bearbeiten' : 'Neuer Fragenkatalog'}</h2><p class="dialog-sub">Für jedes Fach: Fragen mit Antworten einfügen oder eine Word-Datei hochladen.</p></div><button class="icon-button" data-close="import-dialog" aria-label="Schließen">${icon('close')}</button></div><form id="qa-editor"><div id="qa-editor-source"><div class="form-grid"><label>Fach<input id="qa-subject" list="qa-subjects" maxlength="40" value="${esc(preset)}" placeholder="z. B. Geschichte" autocomplete="off"><datalist id="qa-subjects">${subjects.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist></label><label>Titel<input id="qa-title" maxlength="100" value="${esc(source?.title || '')}" placeholder="z. B. Test Kapitel 3"></label></div>
      <div class="qa-editor-label"><label class="textarea-label" for="import-text">Fragen & Antworten</label><label class="text-button qa-upload">${icon('upload')}Word- oder Textdatei<input type="file" id="qa-file" accept=".docx,.txt,.md,text/plain" hidden></label></div><textarea id="import-text" placeholder="Was versteht man unter Bipolarität?   2 Punkte&#10;Zwei Staaten dominieren das Verhältnis mehrerer Staaten zueinander …&#10;&#10;Wie endete die Kubakrise?   2 Punkte&#10;Die UdSSR zog ihre Raketen aus Kuba ab …"></textarea><p class="dlg-format">Jede Frage in eine eigene Zeile, gern mit „2 Punkte“ am Ende, die Antwort darunter. Aufzählungen bleiben erhalten. Geht auch: „F: … / A: …“ oder Frage und Antwort als Block, getrennt durch eine Leerzeile.</p></div><div id="qa-editor-preview" hidden></div><div id="import-error" class="form-error" role="alert" hidden></div><div class="dialog-footer"><button class="button secondary" type="button" id="qa-editor-back" data-action="qa-editor-back" hidden>${icon('back')}Zurück</button><span class="import-privacy">${icon('lock')}Deine Inhalte bleiben privat.</span><button class="button primary" type="submit" id="qa-editor-submit">Fragen erkennen ${icon('arrow')}</button></div></form>`;
    if (source) $('#import-text').value = C.serializeCatalog(source);
    $('#qa-file').addEventListener('change', async e => {
      const file = e.target.files?.[0]; if (!file) return;
      $('#import-error').hidden = true;
      try {
        $('#import-text').value = /\.docx$/i.test(file.name) ? await docxText(file) : await file.text();
        if (!$('#qa-title').value.trim()) $('#qa-title').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 100);
        toast('Datei eingelesen. Prüfe den Text und tippe auf „Fragen erkennen“.');
      } catch (error) { importError(error.message || 'Die Datei konnte nicht gelesen werden.'); }
      e.target.value = '';
    });
    $('#qa-editor').addEventListener('submit', e => {
      e.preventDefault(); $('#import-error').hidden = true;
      try {
        if (qaDraft) return saveCatalogDraft();
        if (!$('#qa-subject').value.trim()) throw new Error('Gib ein Fach ein, z. B. Geschichte.');
        qaDraft = C.parseCatalog($('#import-text').value);
        drawCatalogPreview();
      } catch (error) { importError(error.message); }
    });
    d.showModal();
  }
  function drawCatalogPreview() {
    $('#qa-editor-source').hidden = true; $('#qa-editor-preview').hidden = false; $('#qa-editor-back').hidden = false;
    $('#qa-editor-submit').innerHTML = `Katalog speichern ${icon('check')}`;
    const points = qaDraft.reduce((n, q) => n + q.points, 0);
    $('#qa-editor-preview').innerHTML = `<div class="preview-heading"><strong>${qaDraft.length} ${qaDraft.length === 1 ? 'Frage' : 'Fragen'} erkannt${points ? ` · ${formatPoints(points)} Punkte` : ''}</strong><span>Stimmt etwas nicht, geh zurück und korrigiere den Text.</span></div><ol class="qa-preview">${qaDraft.map(q => `<li><div><strong>${esc(q.q)}</strong>${q.points ? `<span class="qa-points">${formatPoints(q.points)} P.</span>` : ''}</div><div class="qa-answer">${answerHtml(q.answer)}</div></li>`).join('')}</ol>`;
  }
  function saveCatalogDraft() {
    const name = $('#qa-subject').value.trim().slice(0, 40), existing = subjectList().find(s => sameSubject(s, name)) || name;
    const old = qaEditing, questions = qaDraft.map(q => ({ ...q, id: old?.questions.find(o => o.q === q.q)?.id }));
    const catalog = C.validateCatalog({ id: old?.id, subject: existing, title: $('#qa-title').value.trim() || `${existing} · Fragen`, emoji: SUBJECT_EMOJI[C.normalize(existing)] || subjectCatalogs(existing)[0]?.emoji || old?.emoji || '📘', description: old?.description || '', created: old?.created, questions, progress: old?.progress, test: old?.test }, !!old);
    if (!catalog) throw new Error('Keine gültigen Fragen gefunden.');
    if (old) data.catalogs[data.catalogs.findIndex(c => c.id === old.id)] = catalog; else data.catalogs.push(catalog);
    catalogId = catalog.id; subject = catalog.subject; qaDraft = null;
    save(); $('#import-dialog').close(); syncSubjectUi(); transition(drawCatalog);
    toast(old ? 'Fragenkatalog gespeichert.' : `${catalog.questions.length} Fragen in „${catalog.subject}“ gespeichert.`);
  }
  function learnInSubject() {
    if (view === 'qa-learn' && qa) return;
    const list = subjectCatalogs(); if (!list.length) return openCatalogEditor();
    if (!currentCatalog() || !sameSubject(currentCatalog().subject, subject)) catalogId = [...list].sort((a, b) => lastPracticed(b) - lastPracticed(a))[0].id;
    startQa(C.catalogStats(currentCatalog()).safe < currentCatalog().questions.length && C.catalogStats(currentCatalog()).safe > 0);
  }
  function testInSubject() {
    const list = subjectCatalogs(); if (!list.length) return openCatalogEditor();
    if (!currentCatalog() || !sameSubject(currentCatalog().subject, subject)) catalogId = [...list].sort((a, b) => lastPracticed(b) - lastPracticed(a))[0].id;
    drawTestSetup();
  }
  const DIALOG_PROMPT = 'Schreib einen Dialog auf Spanisch zum Thema [Thema hier eintragen]. Gib nur den Dialog aus, ohne Überschrift und ohne Erklärung. Schreib jede Zeile genau so:\nSprecher: spanischer Satz | deutsche Übersetzung\n\nBeispiel:\nA: ¡Hola! ¿Qué tal? | Hallo! Wie geht es dir?\nB: Muy bien, gracias. | Sehr gut, danke.';
  let dlgEditorSource = null, dlgDraft = null, dlgSkipped = [];
  function openDialogEditor(source = null) {
    dlgEditorSource = source; dlgDraft = null; dlgSkipped = [];
    const dialog = $('#import-dialog'), asCopy = !!source?.seed;
    dialog.innerHTML = `<div class="dialog-header"><div><h2 id="import-heading">${source && !asCopy ? 'Dialog bearbeiten' : asCopy ? 'Eigene Kopie bearbeiten' : 'Dialog einfügen'}</h2></div><button class="icon-button" data-close="import-dialog" aria-label="Schließen">${icon('close')}</button></div><form id="dlg-editor"><div class="form-grid"><label class="full">Titel<input id="dlg-title" value="${esc(source ? source.title + (asCopy ? ' (Kopie)' : '') : '')}" maxlength="100" placeholder="z. B. En la zapatería"></label></div><div id="dlg-editor-source"><label class="textarea-label" for="import-text">Dein Dialog</label><textarea id="import-text" placeholder="Füg hier den ganzen Text ein, auch direkt aus einem KI-Chat.&#10;&#10;A: ¡Hola! ¿Necesitas ayuda? | Hallo! Brauchst du Hilfe?&#10;B: Sí, busco unos zapatos. | Ja, ich suche Schuhe."></textarea><p class="dlg-format">Überschriften und Erklärungen darum herum werden herausgefiltert. Ohne deutsche Übersetzung zeigt „Aus dem Kopf“ nur Anfangsbuchstaben.</p><details class="dlg-prompt-help"><summary>Dialog von einer KI schreiben lassen</summary><p class="dlg-format">Kopiere diesen Text in Claude oder ChatGPT, trag dein Thema ein und füg die Antwort oben ein.</p><pre class="dlg-prompt-text">${esc(DIALOG_PROMPT)}</pre><button type="button" class="button secondary" data-action="dlg-copy-prompt">Text kopieren</button></details></div><div id="dlg-editor-preview" hidden></div><div id="import-error" class="form-error" role="alert" hidden></div><div class="dialog-footer"><button class="button secondary" type="button" id="dlg-editor-back" data-action="dlg-editor-back" hidden>${icon('back')}Zurück</button><span class="import-privacy">${icon('lock')}Deine Inhalte bleiben privat.</span><button class="button primary" type="submit" id="dlg-editor-submit">Zeilen erkennen ${icon('arrow')}</button></div></form>`;
    if (source) $('#import-text').value = C.serializeDialog(source);
    $('#dlg-editor').addEventListener('submit', e => {
      e.preventDefault(); $('#import-error').hidden = true;
      try {
        if (dlgDraft) return saveDialogDraft();
        const { lines, skippedLines } = C.parseDialog($('#import-text').value);
        dlgDraft = lines; dlgSkipped = skippedLines;
        drawDialogPreview();
      } catch (error) { importError(error.message); }
    });
    dialog.showModal();
  }
  function drawDialogPreview() {
    $('#dlg-editor-source').hidden = true; $('#dlg-editor-preview').hidden = false; $('#dlg-editor-back').hidden = false;
    $('#dlg-editor-submit').innerHTML = `Dialog speichern ${icon('check')}`;
    const roles = [...new Set(dlgDraft.map(l => l.speaker).filter(Boolean))];
    $('#dlg-editor-preview').innerHTML = `<div class="preview-heading"><strong>${dlgDraft.length} Zeilen erkannt</strong><span>Rollen: ${esc(roles.join(', '))}. Prüfe die Zeilen und korrigiere sie bei Bedarf.</span></div>${dlgSkipped.length ? `<details class="dlg-skipped"><summary>${dlgSkipped.length} ${dlgSkipped.length === 1 ? 'Zeile' : 'Zeilen'} nicht übernommen</summary><ul>${dlgSkipped.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>` : ''}<div class="dlg-edit-rows">${dlgDraft.map((l, i) => `<div class="dlg-edit-row" data-row="${i}"><input aria-label="Sprecher ${i + 1}" data-side="speaker" value="${esc(l.speaker)}" maxlength="30"><input aria-label="Spanisch ${i + 1}" data-side="es" lang="es" value="${esc(l.es)}" maxlength="500"><input aria-label="Deutsch ${i + 1}" data-side="de" value="${esc(l.de)}" maxlength="500" placeholder="Deutsch (optional)"><button type="button" class="icon-button" data-action="dlg-remove-row" data-index="${i}" aria-label="Zeile ${i + 1} entfernen">${icon('close')}</button></div>`).join('')}</div><button type="button" class="text-button" data-action="dlg-add-row">${icon('plus')}Zeile ergänzen</button>`;
  }
  function collectDialogDraft() {
    document.querySelectorAll('.dlg-edit-row').forEach(row => {
      const line = dlgDraft[Number(row.dataset.row)];
      for (const side of ['speaker', 'es', 'de']) line[side] = row.querySelector(`[data-side="${side}"]`).value.trim();
    });
  }
  function saveDialogDraft() {
    collectDialogDraft();
    const lines = dlgDraft.filter(l => l.es).map(l => ({ speaker: l.speaker || 'A', es: l.es, de: l.de }));
    if (lines.length < 2) return importError('Ein Dialog braucht mindestens 2 Zeilen.');
    const source = dlgEditorSource, old = source && !source.seed ? source : null;
    const title = $('#dlg-title').value.trim() || old?.title || `Dialog ${data.dialogs.filter(d => !d.seed).length + 1}`;
    const saved = C.validateDialog({ id: old?.id || C.uid(), title, description: old?.description || '', lines, progress: old?.progress });
    if (old) data.dialogs[data.dialogs.indexOf(old)] = saved; else data.dialogs.push(saved);
    dialogId = saved.id; dlgPart = 'all'; save(); $('#import-dialog').close(); drawDialog();
    toast(`Dialog mit ${lines.length} Zeilen gespeichert.`);
  }
  function showSettings(duringRound = false) {
    const set = currentSet(), s = data.settings, dialog = $('#settings-dialog');
    dialog.innerHTML = `<div class="dialog-header"><div><h2 id="settings-heading">Dein Lernmodus</h2></div><button class="icon-button" data-close="settings-dialog" aria-label="Schließen">${icon('close')}</button></div><form id="settings-form"><fieldset><legend>Wie möchtest du üben?</legend><div class="setting-options">${[['adaptive', 'spark', 'Adaptiv', 'Erst auswählen, dann zweimal richtig schreiben.'], ['mc', 'layers', 'Multiple Choice', 'Die richtige Übersetzung aus Antworten wählen.'], ['written', 'keyboard', 'Nur schreiben', 'Direkt aus dem Gedächtnis antworten.']].map(([v, i, name, text]) => `<label class="radio-card"><input type="radio" name="mode" value="${v}" ${s.mode === v ? 'checked' : ''}>${icon(i)}<span><strong>${name}</strong><small>${text}</small></span></label>`).join('')}</div></fieldset><div class="form-grid"><label>Abfragerichtung<select name="direction"><option value="random" ${s.direction === 'random' ? 'selected' : ''}>Zufällig in beide Richtungen</option><option value="forward" ${s.direction === 'forward' ? 'selected' : ''}>${esc(set?.frontLang || 'Vorderseite')} → ${esc(set?.backLang || 'Rückseite')}</option><option value="reverse" ${s.direction === 'reverse' ? 'selected' : ''}>${esc(set?.backLang || 'Rückseite')} → ${esc(set?.frontLang || 'Vorderseite')}</option></select></label><label>Begriffe pro Runde<select name="roundSize">${[['5', '5 Begriffe'], ['10', '10 Begriffe'], ['20', '20 Begriffe'], ['all', 'Alle Begriffe']].map(([v, label]) => `<option value="${v}" ${s.roundSize === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label class="toggle-row"><span><strong>Akzente genau prüfen</strong><small>Zum Beispiel á statt a und ñ statt n verlangen.</small></span><input type="checkbox" name="accents" ${s.accents ? 'checked' : ''}></label><label class="toggle-row"><span><strong>Artikel dürfen fehlen</strong><small>„Kleidung“ gilt auch für „die Kleidung“.</small></span><input type="checkbox" name="articles" ${s.articles ? 'checked' : ''}></label><p class="form-help">Groß- und Kleinschreibung sowie Satzzeichen sind immer egal. Bei mehreren Übersetzungen reicht eine passende Variante.</p>${duringRound ? '<p class="import-warning">Beim Speichern beginnt eine neue Runde. Bereits beantwortete Fragen bleiben gespeichert.</p>' : ''}<div class="dialog-footer"><button class="button secondary" type="button" data-close="settings-dialog">Abbrechen</button><button class="button primary" type="submit">Einstellungen speichern ${icon('check')}</button></div></form>`;
    $('#settings-form').addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); data.settings = validateSettings({ mode: f.get('mode'), direction: f.get('direction'), roundSize: f.get('roundSize'), accents: f.has('accents'), articles: f.has('articles') }); save(); dialog.close(); toast('Dein Lernmodus ist gespeichert.'); if (duringRound) startLearning(); });
    dialog.showModal();
  }
  function openImport(edit = false) {
    fileLoadVersion++;
    importTarget = edit ? currentSet()?.id : null; importDraft = null; importRaw = ''; importWarnings = [];
    const set = edit ? currentSet() : null, dialog = $('#import-dialog');
    dialog.innerHTML = `<div class="dialog-header"><div><h2 id="import-heading">${edit ? 'Lernset bearbeiten' : 'Lernset importieren'}</h2></div><button class="icon-button" data-close="import-dialog" aria-label="Schließen">${icon('close')}</button></div><div class="import-steps"><span class="active">1 <strong>Inhalt hinzufügen</strong></span><span>2 <strong>Prüfen & speichern</strong></span></div><form id="import-form"><div class="form-grid"><label class="full">Name des Lernsets<input id="import-title" name="title" placeholder="z. B. Spanisch · Unidad 5" value="${esc(set?.title || '')}" maxlength="100" required></label><label>Vorderseite<input name="frontLang" id="import-front" value="${esc(set?.frontLang || 'Spanisch')}" maxlength="40" required></label><label>Rückseite<input name="backLang" id="import-back" value="${esc(set?.backLang || 'Deutsch')}" maxlength="40" required></label></div><div id="import-source"><label class="textarea-label" for="import-text">Deine Begriffe</label><textarea id="import-text" placeholder="la ropa → die Kleidung&#10;el vestido → das Kleid&#10;&#10;Du kannst auch den kompletten kopierten Quizlet-Text einfügen."></textarea><p class="form-help">Ein Paar pro Zeile mit Tab, Semikolon oder →. Oder Begriff und Übersetzung in zwei aufeinanderfolgenden Zeilen. Quizlet-Menüs filtern wir automatisch heraus.</p><label class="upload-zone" id="upload-zone"><input type="file" id="import-file" accept=".txt,.csv,.tsv,.json,text/plain,text/csv,application/json"><span class="upload-icon">${icon('upload')}</span><strong>Datei hier ablegen oder <span>auswählen</span></strong><small>TXT, CSV, TSV oder JSON · maximal 2 MB</small></label><div class="file-status" id="file-status" role="status"></div></div><div id="import-preview" hidden></div><div id="import-error" class="form-error" role="alert" hidden></div><div class="dialog-footer"><button class="button secondary" type="button" id="import-back-btn" hidden>${icon('back')}Zurück</button><span class="import-privacy">${icon('lock')}Deine Inhalte bleiben in deinem Browser.</span><button class="button primary" type="submit" id="import-submit">Paare erkennen ${icon('arrow')}</button></div></form>`;
    if (set) $('#import-text').value = C.serializeTerms(set.terms);
    $('#import-form').addEventListener('submit', handleImportSubmit);
    $('#import-back-btn').addEventListener('click', () => { collectDraft(); $('#import-text').value = C.serializeTerms(importDraft); $('#import-source').hidden = false; $('#import-preview').hidden = true; $('#import-preview').innerHTML = ''; $('#import-back-btn').hidden = true; $('#import-submit').innerHTML = `Paare erkennen ${icon('arrow')}`; importDraft = null; dialog.querySelectorAll('.import-steps span').forEach((el, i) => el.classList.toggle('active', i === 0)); });
    $('#import-file').addEventListener('change', e => loadFile(e.target.files[0]));
    const zone = $('#upload-zone');
    ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, e => { e.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(name => zone.addEventListener(name, e => { e.preventDefault(); zone.classList.remove('drag-over'); }));
    zone.addEventListener('drop', e => loadFile(e.dataTransfer.files[0]));
    dialog.showModal();
  }
  async function loadFile(file) {
    if (!file) return;
    const request = ++fileLoadVersion;
    if (file.size > 2_000_000) return importError('Die Datei ist zu groß. Bitte wähle eine Datei mit höchstens 2 MB.');
    if (!/\.(txt|csv|tsv|json)$/i.test(file.name)) return importError('Bitte eine TXT-, CSV-, TSV- oder JSON-Datei auswählen.');
    try {
      const buffer = await file.arrayBuffer();
      if (request !== fileLoadVersion || !$('#import-dialog').open) return;
      const bytes = new Uint8Array(buffer);
      let text = new TextDecoder(bytes[0] === 255 && bytes[1] === 254 ? 'utf-16le' : bytes[0] === 254 && bytes[1] === 255 ? 'utf-16be' : 'utf-8').decode(bytes);
      if (text.includes('\uFFFD')) text = new TextDecoder('windows-1252').decode(bytes);
      $('#import-text').value = text; $('#file-status').textContent = `${file.name} · bereit zum Erkennen`;
      if (!$('#import-title').value) $('#import-title').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ');
      $('#import-error').hidden = true;
    } catch { importError('Die Datei konnte nicht gelesen werden. Versuche es erneut oder füge den Text ein.'); }
  }
  function importError(text) { const el = $('#import-error'); el.textContent = text; el.hidden = false; }
  function handleImportSubmit(e) {
    e.preventDefault(); $('#import-error').hidden = true;
    if (importDraft) return saveImport();
    try {
      importRaw = $('#import-text').value;
      const result = C.parseImport(importRaw);
      if (result.backup) return restoreBackup(result.backup);
      importDraft = result.terms; importWarnings = result.warnings;
      if (result.title && !importTarget) $('#import-title').value = String(result.title).slice(0, 100);
      if (result.frontLang && !importTarget) $('#import-front').value = String(result.frontLang).slice(0, 40);
      if (result.backLang && !importTarget) $('#import-back').value = String(result.backLang).slice(0, 40);
      drawImportPreview();
    } catch (error) { importError(error.message); }
  }
  function drawImportPreview() {
    $('#import-source').hidden = true; $('#import-preview').hidden = false; $('#import-back-btn').hidden = false;
    $('#import-submit').innerHTML = `Lernset speichern ${icon('check')}`;
    $('#import-dialog').querySelectorAll('.import-steps span').forEach((el, i) => el.classList.toggle('active', i === 1));
    $('#import-preview').innerHTML = `<div class="preview-heading"><strong>${importDraft.length} Begriffspaare erkannt</strong><span>Prüfe die Paare und korrigiere sie bei Bedarf.</span></div>${importWarnings.map(w => `<p class="import-warning">${esc(w)}</p>`).join('')}<div class="preview-table"><div class="preview-table-head"><span>Vorderseite</span><span>Rückseite</span><span></span></div><div id="preview-rows">${importDraft.map((t, i) => previewRow(t, i)).join('')}</div></div><button type="button" class="text-button" data-action="add-pair">${icon('plus')}Begriffspaar ergänzen</button>`;
  }
  function previewRow(t, i) { return `<div class="preview-row" data-row="${i}"><input aria-label="Vorderseite ${i + 1}" data-side="front" value="${esc(t.front)}" maxlength="2000" required><input aria-label="Rückseite ${i + 1}" data-side="back" value="${esc(t.back)}" maxlength="2000" required><button type="button" class="icon-button" data-action="remove-pair" data-index="${i}" aria-label="Paar ${i + 1} entfernen">${icon('close')}</button></div>`; }
  function collectDraft() { if (importDraft) $('#preview-rows').querySelectorAll('.preview-row').forEach(row => { const t = importDraft[Number(row.dataset.row)]; t.front = row.querySelector('[data-side="front"]').value; t.back = row.querySelector('[data-side="back"]').value; }); }
  function saveImport() {
    try {
      collectDraft(); const cleaned = C.cleanPairs(importDraft);
      if (!cleaned.terms.length) return importError('Ergänze mindestens ein vollständiges Begriffspaar.');
      const old = data.sets.find(s => s.id === importTarget);
      const terms = cleaned.terms.map(t => { const existing = old?.terms.find(o => o.front === t.front && o.back === t.back); return existing || t; });
      const set = { id: old?.id || C.uid(), title: $('#import-title').value.trim(), frontLang: $('#import-front').value.trim(), backLang: $('#import-back').value.trim(), terms, created: old?.created || Date.now(), emoji: old?.emoji || '📚', description: old?.description || '' };
      if (!set.title || !set.frontLang || !set.backLang) return importError('Bitte Name und beide Sprachen ausfüllen.');
      if (old) data.sets[data.sets.indexOf(old)] = set; else data.sets.push(set);
      selectedId = set.id; save(); $('#import-dialog').close(); termSearch = ''; drawSet(); toast(`${terms.length} Begriffe ${old ? 'gespeichert' : 'importiert'}.`);
    } catch (error) { importError(error.message); }
  }
  function restoreBackup(backup) {
    try {
      if (backup.sets.length > 100) throw new Error('Eine Sicherung kann höchstens 100 Lernsets auf einmal enthalten.');
      const sets = backup.sets.map(s => validateSet(s, false));
      if (!sets.length) throw new Error('Diese Sicherung enthält keine Lernsets.');
      // Restore as copies. Existing sets and learning progress remain intact.
      for (const s of sets) if (data.sets.some(old => old.title === s.title)) s.title += ' (Import)';
      data.sets.push(...sets); selectedId = sets[0].id;
      for (const raw of Array.isArray(backup.dialogs) ? backup.dialogs : []) {
        const builtIn = data.dialogs.find(d => d.seed && d.id === raw?.id);
        if (builtIn) { builtIn.progress.best = Math.max(builtIn.progress.best, C.validateDialog(raw)?.progress.best || 0); continue; }
        const copy = C.validateDialog(raw, false);
        if (copy) { if (data.dialogs.some(d => d.title === copy.title)) copy.title += ' (Import)'; data.dialogs.push(copy); }
      }
      data.grammar = C.mergeStates({ grammar: data.grammar }, { grammar: backup.grammar }).grammar;
      for (const raw of Array.isArray(backup.catalogs) ? backup.catalogs : []) {
        const builtIn = data.catalogs.find(c => c.seed && c.id === raw?.id);
        if (builtIn) { Object.assign(builtIn, C.mergeCatalogs([builtIn], [C.validateCatalog({ ...raw, questions: builtIn.questions })].filter(Boolean))[0]); continue; }
        const copy = C.validateCatalog({ ...raw, id: undefined, seed: false });
        if (copy) { if (data.catalogs.some(c => c.title === copy.title)) copy.title += ' (Import)'; data.catalogs.push(copy); }
      }
      save(); $('#import-dialog').close(); drawLibrary(); toast(`${sets.length} Lernsets samt Fortschritt importiert.`);
    } catch (error) { importError(error.message); }
  }
  function download(name, text, type) { const blob = new Blob([text], { type }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  function exportSet() { const s = currentSet(); download(s.title.replace(/[<>:"/\\|?*]/g, '-') + '.txt', '\uFEFF' + C.serializeTerms(s.terms), 'text/plain;charset=utf-8'); toast('Vokabelliste exportiert.'); }
  function exportBackup() { download(`wortwechsel-sicherung-${localDate()}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sets: data.sets, dialogs: data.dialogs, grammar: data.grammar, catalogs: data.catalogs, settings: data.settings }, null, 2), 'application/json'); toast('Sicherung exportiert. Über „Neues Lernset“ wieder importieren.'); }
  function confirmAction(title, text, label, fn) {
    const d = $('#confirm-dialog');
    d.innerHTML = `<div class="dialog-header"><h2 id="confirm-heading">${esc(title)}</h2><button class="icon-button" data-close="confirm-dialog" aria-label="Schließen">${icon('close')}</button></div><p>${esc(text)}</p><div class="dialog-footer"><button class="button secondary" data-close="confirm-dialog">Abbrechen</button><button class="button primary" id="confirm-action">${esc(label)}</button></div>`;
    $('#confirm-action').addEventListener('click', () => { d.close(); fn(); }, { once: true }); d.showModal();
  }
  document.addEventListener('click', e => {
    const close = e.target.closest('[data-close]'); if (close) return document.getElementById(close.dataset.close).close();
    const tab = e.target.closest('[data-subject]'); if (tab) return switchSubject(tab.dataset.subject);
    const btn = e.target.closest('[data-action]'); if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (btn.dataset.id) { selectedId = btn.dataset.id; save(); }
    if (btn.dataset.table) grammarId = btn.dataset.table;
    if (btn.dataset.catalog) catalogId = btn.dataset.catalog;
    if (btn.dataset.dialog) { if (dialogId !== btn.dataset.dialog) dlgPart = 'all'; dialogId = btn.dataset.dialog; }
    switch (action) {
      case 'qa-home': return transition(drawCatalogs);
      case 'qa-open': return btn.dataset.catalog ? transition(drawCatalog) : drawCatalog();
      case 'qa-new': return openCatalogEditor();
      case 'qa-edit': return openCatalogEditor(currentCatalog());
      case 'qa-learn': return startQa(false);
      case 'qa-learn-weak': return startQa(true);
      case 'qa-reveal': return revealQa();
      case 'qa-choice': return chooseQa(Number(btn.dataset.index));
      case 'qa-choice-skip': return chooseQa(-1);
      case 'qa-write': if (qa && !qa.revealed) { qa.write.add(qa.queue[0]); drawQaCard(); $('#qa-typed')?.focus({ preventScroll: true }); } return;
      case 'qa-rate': return rateQa(btn.dataset.rating);
      case 'qa-exit': return confirmAction('Lernrunde beenden?', 'Bewertete Fragen sind schon gespeichert.', 'Zum Katalog', drawCatalog);
      case 'qa-test': return drawTestSetup();
      case 'qa-test-start': return startTest(btn.dataset.size);
      case 'qa-test-submit': return submitTest();
      case 'qa-test-exit': return confirmAction('Test abbrechen?', 'Deine Antworten in diesem Test werden nicht gespeichert.', 'Test abbrechen', drawCatalog);
      case 'qa-points': return changePoints(btn.dataset.q, Number(btn.dataset.delta));
      case 'qa-test-finish': return finishTest();
      case 'qa-toggle': return toggleQaItem(btn.closest('.qa-item'));
      case 'qa-expand-all': { const items = [...document.querySelectorAll('.qa-item')], open = !items.every(i => i.classList.contains('open')); items.forEach((item, i) => setTimeout(() => toggleQaItem(item, open), reduced() ? 0 : i * 28)); btn.textContent = open ? 'Alle zuklappen' : 'Alle aufklappen'; return; }
      case 'qa-filter': qaFilter = btn.dataset.filter; document.querySelectorAll('[data-action="qa-filter"]').forEach(b => b.setAttribute('aria-pressed', String(b === btn))); $('#qa-list').innerHTML = qaListHtml(currentCatalog()); return;
      case 'qa-editor-back': $('#import-text').value = C.serializeCatalog({ questions: qaDraft }); qaDraft = null; $('#qa-editor-source').hidden = false; $('#qa-editor-preview').hidden = true; $('#qa-editor-preview').innerHTML = ''; $('#qa-editor-back').hidden = true; $('#qa-editor-submit').innerHTML = `Fragen erkennen ${icon('arrow')}`; return;
      case 'qa-reset': return confirmAction('Von vorne anfangen?', 'Der Lernstand und die Testergebnisse dieses Katalogs werden zurückgesetzt. Die Fragen bleiben erhalten.', 'Fortschritt zurücksetzen', () => { const c = currentCatalog(); c.progress = {}; c.test = { best: 0, last: 0, total: 0, at: 0 }; save(); drawCatalog(); toast('Fortschritt zurückgesetzt.'); });
      case 'qa-delete': return confirmAction('Katalog löschen?', `„${currentCatalog().title}“ wird entfernt. Exportiere bei Bedarf vorher eine Sicherung.`, 'Katalog löschen', () => { data.catalogs = data.catalogs.filter(c => c.id !== catalogId); save(); drawCatalogs(); toast('Fragenkatalog gelöscht.'); });
      case 'gram-list': return drawGrammarList();
      case 'gram-open': return drawGrammar();
      case 'gram-start': return startGrammar(Number(btn.dataset.level));
      case 'gram-retry': return retryGrammar();
      case 'gram-exit': return confirmAction('Übung verlassen?', 'Diese Stufe zählt erst, wenn du sie zu Ende machst.', 'Zur Tabelle', drawGrammar);
      case 'gram-reset': return confirmAction('Von vorne anfangen?', 'Der Stufen-Fortschritt dieser Tabelle wird zurückgesetzt.', 'Fortschritt zurücksetzen', () => { delete data.grammar[grammarId]; save(); drawGrammar(); toast('Fortschritt zurückgesetzt.'); });
      case 'dlg-list': return drawDialogs();
      case 'dlg-open': return drawDialog();
      case 'dlg-new': return openDialogEditor();
      case 'dlg-edit': return openDialogEditor(currentDialog());
      case 'dlg-role': dlgRole = btn.dataset.role; return drawDialog();
      case 'dlg-part': dlgPart = btn.dataset.part; return drawDialog();
      case 'dlg-editor-back': collectDialogDraft(); $('#import-text').value = C.serializeDialog({ lines: dlgDraft }); dlgDraft = null; $('#dlg-editor-source').hidden = false; $('#dlg-editor-preview').hidden = true; $('#dlg-editor-preview').innerHTML = ''; $('#dlg-editor-back').hidden = true; $('#dlg-editor-submit').innerHTML = `Zeilen erkennen ${icon('arrow')}`; return;
      case 'dlg-remove-row': collectDialogDraft(); dlgDraft.splice(Number(btn.dataset.index), 1); return drawDialogPreview();
      case 'dlg-add-row': collectDialogDraft(); dlgDraft.push({ speaker: dlgDraft.at(-2)?.speaker || 'A', es: '', de: '' }); drawDialogPreview(); return document.querySelector('.dlg-edit-row:last-child [data-side="es"]')?.focus();
      case 'dlg-copy-prompt': {
        const done = () => toast('Text kopiert.'), failed = () => toast('Kopieren ging nicht. Markiere den Text und kopiere ihn von Hand.');
        return navigator.clipboard?.writeText ? navigator.clipboard.writeText(DIALOG_PROMPT).then(done, failed) : failed();
      }
      case 'dlg-start': if (btn.dataset.part) dlgPart = btn.dataset.part; return startDialog(Number(btn.dataset.level));
      case 'dlg-skip': return gradeDialogLine(true);
      case 'dlg-next': if (dlg?.answered) return nextDialogLine(); return;
      case 'dlg-accept': {
        // Whole sentences can be right in another wording, so the learner may overrule the comparison.
        if (!dlg?.answered) return;
        dlg.queue.pop(); dlg.missed.delete(dlg.current); applyDialogResult(true); save();
        return nextDialogLine();
      }
      case 'dlg-accent': {
        const input = dlgLastInput; if (!input?.isConnected || input.disabled) return;
        input.setRangeText(btn.dataset.char, input.selectionStart, input.selectionEnd, 'end'); input.focus(); return;
      }
      case 'dlg-say': return speak([currentDialog().lines[Number(btn.dataset.line)].es]);
      case 'dlg-say-all': { const d = currentDialog(); return speak(C.dialogQueue(d, 'all', selectedPart(d)).map(i => d.lines[i].es)); }
      case 'dlg-exit': return confirmAction('Übung verlassen?', 'Diese Stufe zählt erst, wenn du sie zu Ende machst.', 'Zum Dialog', drawDialog);
      case 'dlg-reset': return confirmAction('Von vorne anfangen?', 'Der Stufen-Fortschritt dieses Dialogs wird zurückgesetzt. Der Text bleibt erhalten.', 'Fortschritt zurücksetzen', () => { currentDialog().progress = { best: 0, practiced: '', parts: {} }; save(); drawDialog(); toast('Fortschritt zurückgesetzt.'); });
      case 'dlg-delete': return confirmAction('Dialog löschen?', `„${currentDialog().title}“ wird auf diesem Gerät entfernt. Exportiere bei Bedarf vorher eine Sicherung.`, 'Dialog löschen', () => { data.dialogs = data.dialogs.filter(d => d.id !== dialogId); save(); drawDialogs(); toast('Dialog gelöscht.'); });
      case 'library': termSearch = ''; return drawLibrary();
      case 'import': return openImport();
      case 'open-set': return drawSet();
      case 'learn': return startLearning();
      case 'repeat-errors': return startLearning(true);
      case 'flashcards': return startFlashcards();
      case 'settings': return showSettings();
      case 'learning-settings': return showSettings(!!session?.current);
      case 'edit-set': return openImport(true);
      case 'export': return exportSet();
      case 'answer-choice': if (session && !session.answered) submitAnswer(session.current.options[Number(btn.dataset.index)]); return;
      case 'dont-know': return submitAnswer('', true);
      case 'next': if (session?.answered) return nextQuestion(); return;
      case 'accent': {
        const input = $('#written-answer'); if (!input || input.disabled) return;
        const start = input.selectionStart, end = input.selectionEnd; input.setRangeText(btn.dataset.char, start, end, 'end'); input.focus(); return;
      }
      case 'exit-learning': return confirmAction('Runde verlassen?', 'Deine bisherigen Antworten sind gespeichert. Die aktuelle Runde wird beendet.', 'Zum Lernset', drawSet);
      case 'flip-card': flash.flipped = !flash.flipped; return drawFlashcard();
      case 'next-card': return moveCard(1);
      case 'prev-card': return moveCard(-1);
      case 'shuffle-cards': flash.terms = C.shuffle(flash.terms); flash.index = 0; flash.flipped = false; drawFlashcard(); toast('Karten neu gemischt.'); return;
      case 'add-pair': collectDraft(); importDraft.push({ id: C.uid(), front: '', back: '' }); drawImportPreview(); $('#preview-rows').lastElementChild.querySelector('input').focus(); return;
      case 'remove-pair': collectDraft(); importDraft.splice(Number(btn.dataset.index), 1); return drawImportPreview();
      case 'delete': return confirmAction('Lernset löschen?', `„${currentSet().title}“ und sein Fortschritt werden auf diesem Gerät entfernt. Exportiere bei Bedarf vorher eine Sicherung.`, 'Lernset löschen', () => { data.sets = data.sets.filter(s => s.id !== currentSet().id); selectedId = data.sets[0]?.id; save(); drawLibrary(); toast('Lernset gelöscht.'); });
      case 'reset': return confirmAction('Von vorne anfangen?', 'Alle Lernschritte in diesem Set werden zurückgesetzt. Die Begriffe bleiben erhalten.', 'Fortschritt zurücksetzen', () => { currentSet().terms.forEach(t => delete t.progress); save(); drawSet(); toast('Fortschritt zurückgesetzt.'); });
    }
  });
  $('.brand').addEventListener('click', e => { e.preventDefault(); sameSubject(subject, VOCAB) ? drawLibrary() : drawCatalogs(); });
  $('[data-view="library"]').addEventListener('click', drawLibrary);
  $('[data-view="dialogs"]').addEventListener('click', drawDialogs);
  $('[data-view="grammar"]').addEventListener('click', drawGrammarList);
  document.querySelectorAll('[data-view="catalogs"]').forEach(el => el.addEventListener('click', () => { if (el.id === 'nav-vocab-catalogs') subject = VOCAB; transition(drawCatalogs); }));
  $('#nav-qa-learn').addEventListener('click', learnInSubject);
  $('#nav-qa-test').addEventListener('click', testInSubject);
  $('#nav-qa-new').addEventListener('click', () => openCatalogEditor());
  window.addEventListener('resize', () => moveSubjectThumb(true));
  document.fonts?.ready?.then(() => moveSubjectThumb(true));
  $('#nav-practice').addEventListener('click', () => { if (view === 'learn' && session?.current) return; startLearning(); });
  $('#nav-import').addEventListener('click', () => openImport());
  $('#backup-btn').addEventListener('click', exportBackup);
  $('#top-settings').addEventListener('click', () => showSettings(view === 'learn' && !!session?.current));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || document.querySelector('dialog[open]')) return;
    const input = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (view === 'dialogs' && dlg?.answered && e.key === 'Enter' && !e.repeat && e.target.dataset?.action !== 'dlg-accept') { e.preventDefault(); return nextDialogLine(); }
    if (view === 'learn' && session?.current) {
      if (e.repeat) return;
      if (session.answered && e.key === 'Enter') { e.preventDefault(); return nextQuestion(); }
      if (!input && !session.answered && session.current.mode === 'mc' && /^[1-4]$/.test(e.key)) { const value = session.current.options[Number(e.key) - 1]; if (value) { e.preventDefault(); submitAnswer(value); } }
    }
    if (view === 'qa-learn' && qa && !e.repeat) {
      if (qa.options) {
        if (!qa.revealed && !input && /^[1-9]$/.test(e.key) && Number(e.key) <= qa.options.length) { e.preventDefault(); return chooseQa(Number(e.key) - 1); }
        if (qa.revealed && (e.key === 'Enter' || e.key === ' ') && !e.target.closest?.('button')) { e.preventDefault(); return rateQa(qa.choice); }
        return;
      }
      if (!qa.revealed && !input && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return revealQa(); }
      const rating = { 1: 'again', 2: 'partly', 3: 'known' }[e.key];
      if (qa.revealed && rating) { e.preventDefault(); return rateQa(rating); }
    }
    if (view === 'flashcards' && flash && !input) {
      if (e.key === ' ') { e.preventDefault(); flash.flipped = !flash.flipped; drawFlashcard(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveCard(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveCard(-1); }
    }
  });
  // Interface for sync.js. Remote data only replaces the local state while no practice round is running.
  window.WWApp = {
    toast,
    snapshot: () => data,
    canApply: () => !storageBlocked && !session?.current && !dlg && !gram && !qa && !qaTest && !document.querySelector('dialog[open]'),
    apply(raw) {
      const next = hydrate(raw); next.dialogs = mergeDialogs(next.dialogs); next.grammar = C.validateGrammarProgress(next.grammar); next.catalogs = withCatalogSeeds(next.catalogs);
      data = next;
      if (!data.sets.some(s => s.id === selectedId)) selectedId = data.selectedId && data.sets.some(s => s.id === data.selectedId) ? data.selectedId : data.sets[0]?.id;
      applyingRemote = true; save(); applyingRemote = false;
      if (view === 'library') drawLibrary();
      else if (view === 'set') drawSet();
      else if (view === 'dialogs' && document.querySelector('.dlg-transcript')) drawDialog();
      else if (view === 'dialogs' && document.querySelector('.dialog-grid')) drawDialogs();
      else if (view === 'grammar' && document.querySelector('.dialog-grid')) drawGrammarList();
      else if (view === 'grammar' && document.querySelector('.gram-table')) drawGrammar();
      else if (view === 'catalogs') drawCatalogs();
      else if (view === 'catalog') drawCatalog();
      else renderShell();
    },
  };
  $('#storage-warning').hidden = !storageFailed;
  save(); hydrateIcons();
  if (!sameSubject(subject, VOCAB) && subjectCatalogs().length) drawCatalogs(); else drawLibrary();
})();
