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
  let data, storageFailed = false, storageBlocked = false, lastStored = null;
  try {
    const stored = localStorage.getItem(KEY);
    lastStored = stored;
    if (stored) {
      const raw = JSON.parse(stored);
      data = { ...raw, sets: raw.sets.map(s => validateSet(s, true)), settings: validateSettings(raw.settings), history: raw.history && typeof raw.history === 'object' ? raw.history : {} };
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
      return true;
    }
    catch { storageFailed = true; $('#storage-warning').hidden = false; }
  }
  function toast(message) { const el = $('#toast'); el.textContent = message; el.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('visible'), 4200); }
  function renderShell(title = 'Meine Lernsets') {
    $('#breadcrumb').innerHTML = `Dein Lernraum <span>/</span> <strong>${esc(title)}</strong>`;
    $('#set-count').textContent = data.sets.length;
    document.querySelectorAll('.nav-item[data-view]').forEach(el => el.classList.toggle('active', view === el.dataset.view));
    $('#nav-practice').classList.toggle('active', view === 'learn');
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
    $('#main').innerHTML = `<section class="page-intro"><div><div class="eyebrow">KLEINE SCHRITTE. GROSSE FORTSCHRITTE.</div><h1>Mach aus Wörtern Wissen<span class="blue-dot">.</span></h1><p>Deine Vokabeln. Dein Tempo. Dein nächstes Erfolgserlebnis.</p></div><button class="button primary" data-action="import">${icon('plus')}Neues Lernset</button></section>
      <section class="dashboard-grid"><div class="focus-card"><div class="focus-copy"><div class="hero-tag"><span class="pulse-dot"></span>${stats?.progress ? 'ZEIT FÜR DEN NÄCHSTEN SCHRITT' : 'DEIN ERSTES ERFOLGSERLEBNIS WARTET'}</div><h2>${set ? 'Ein Wort nach dem anderen.' : 'Hier beginnt dein Lernflow.'}</h2><p>${set ? `Mach weiter mit <strong>${esc(set.title)}</strong>.<br>Erst erkennen, dann selbst schreiben. Du hast das.` : 'Füge deine erste Vokabelliste ein und leg los.'}</p><button class="button white" data-action="${set ? 'learn' : 'import'}">${icon(set ? 'spark' : 'plus')}${set ? stats.progress ? 'Weiterlernen' : 'Jetzt loslernen' : 'Lernset erstellen'}${icon('arrow')}</button><div class="hero-foot">${icon('clock')} Eine Runde. Ungefähr 5 Minuten.</div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-star star-one">✳</span><span class="art-star star-two">✧</span><div class="art-card card-back"><span>die Kleidung</span><div class="mini-line"></div><div class="mini-line short"></div></div><div class="art-card card-front">${icon('shirt')}<strong>la ropa</strong><span>SPANISCH → DEUTSCH</span></div><div class="art-check">${icon('check')}</div></div></div>
      <aside class="progress-card"><div class="section-kicker">DEIN FORTSCHRITT ${icon('chart')}</div><div class="progress-numbers"><strong>${mastered}<span> / ${total}</span></strong><p>Begriffe sicher gemeistert</p></div><div class="mini-progress"><span style="width:${total ? mastered / total * 100 : 0}%"></span></div><div class="stat-duo"><div><span class="stat-icon flame">${icon('flame')}</span><strong>${streak()} <small>${streak() === 1 ? 'Tag' : 'Tage'}</small></strong><p>in Folge gelernt</p></div><div><span class="stat-icon lavender">${icon('check')}</span><strong>${Number(data.history[localDate()]) || 0}</strong><p>Antworten heute</p></div></div></aside></section>
      <section class="library-section"><div class="section-heading"><div><h2>Deine Lernsets <span class="count-badge">${data.sets.length}</span></h2><p>Alles, was du können willst, an einem Ort.</p></div><label class="search-box">${icon('search')}<input id="library-search" placeholder="Lernset suchen …" aria-label="Lernsets suchen" value="${esc(librarySearch)}"></label></div><div class="set-grid" id="set-grid">${setCards()}</div></section>
      <section class="how-it-works"><div class="how-intro"><span class="section-kicker">DEIN LERNFLOW</span><h3>Bleibt im Kopf.<br>Schritt für Schritt.</h3></div><div class="how-step"><span class="step-number">01</span><strong>Wiedererkennen</strong><p>Mit Multiple Choice<br>entspannt reinkommen.</p></div><div class="how-step"><span class="step-number">02</span><strong>Selbst schreiben</strong><p>Was sitzt, tippst du<br>aus dem Gedächtnis.</p></div><div class="how-step"><span class="step-number">03</span><strong>Richtung wechseln</strong><p>Beide Sprachen üben.<br>Bis es wirklich sitzt.</p></div></section>`;
    $('#library-search').addEventListener('input', e => { librarySearch = e.target.value; $('#set-grid').innerHTML = setCards(); });
  }
  function setCards() {
    const query = C.normalize(librarySearch);
    const sets = data.sets.filter(s => C.normalize(s.title + ' ' + s.frontLang + ' ' + s.backLang).includes(query));
    return sets.map((set, index) => {
      const s = C.setStats(set);
      return `<article class="set-card"><div class="set-card-top"><div class="set-emoji tone-${index % 3}">${esc(set.emoji)}</div><span class="language-pill">${esc(set.frontLang)} ${icon('swap')} ${esc(set.backLang)}</span></div><button class="set-title" data-action="open-set" data-id="${esc(set.id)}">${esc(set.title)}</button><p class="set-description">${esc(set.description || 'Dein nächstes Stück Wissen wartet hier.')}</p><div class="set-meta">${icon('layers')} ${set.terms.length} Begriffe <span>·</span> ${s.mastered} gemeistert</div><div class="set-progress-label"><span>${s.progress ? 'Schon auf dem Weg' : 'Bereit, wenn du es bist'}</span><strong>${s.progress}%</strong></div><div class="mini-progress"><span style="width:${s.progress}%"></span></div><div class="set-card-footer"><button class="text-button" data-action="open-set" data-id="${esc(set.id)}">Lernset ansehen</button><button class="round-button" data-action="learn" data-id="${esc(set.id)}" aria-label="${esc(set.title)} lernen">${icon('arrow')}</button></div></article>`;
    }).join('') + (!query ? `<button class="new-set-card" data-action="import"><span class="new-set-icon">${icon('plus')}</span><strong>Was lernst du als Nächstes?</strong><span>Text einfügen oder Datei hochladen</span><span class="text-button">Lernset erstellen ${icon('arrow')}</span></button>` : !sets.length ? '<div class="empty-state">Kein Lernset gefunden. Versuche einen anderen Suchbegriff.</div>' : '');
  }
  function drawSet() {
    const set = currentSet(); if (!set) return drawLibrary();
    view = 'set'; session = null; flash = null; renderShell(set.title);
    const stats = C.setStats(set);
    $('#main').innerHTML = `<button class="back-link" data-action="library">${icon('back')} Alle Lernsets</button><section class="set-page-heading"><div class="set-emoji big">${esc(set.emoji)}</div><div><div class="eyebrow">${esc(set.frontLang)} ${icon('swap')} ${esc(set.backLang)} · ${set.terms.length} BEGRIFFE</div><h1>${esc(set.title)}</h1><p>${esc(set.description || 'Schritt für Schritt zu sicherem Wissen.')}</p></div><button class="icon-button" data-action="edit-set" aria-label="Lernset bearbeiten" title="Lernset bearbeiten">${icon('edit')}</button></section>
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
    $('#main').innerHTML = `<section class="learning-shell"><div class="learning-top"><button class="back-link" data-action="exit-learning">${icon('back')}Lernset</button><span class="learning-set-name">${esc(set.title)}</span><button class="icon-button" data-action="learning-settings" aria-label="Lerneinstellungen">${icon('settings')}</button></div><div class="round-progress"><div><strong>Deine Lernrunde</strong><span>${session.completed} / ${session.total} Begriffe gefestigt</span></div><div class="mini-progress"><span style="width:${percent}%"></span></div></div><div class="question-card"><div class="question-top"><span class="question-mode">${icon(q.mode === 'mc' ? 'layers' : 'keyboard')}${modeLabel(q.mode)}</span><span class="direction-label">${esc(q.reverse ? set.backLang : set.frontLang)} ${icon('arrow')} ${esc(q.reverse ? set.frontLang : set.backLang)}</span></div><div class="question-prompt"><p>${q.mode === 'mc' ? 'Wähle die richtige Übersetzung.' : 'Schreibe die passende Übersetzung.'}</p><h1 dir="auto">${esc(q.prompt)}</h1><span class="question-stage">${data.settings.mode === 'adaptive' ? q.mode === 'mc' ? '01 · Erst erkennen' : p.written ? '03 · Noch einmal festigen' : '02 · Jetzt selbst schreiben' : 'In deinem Tempo'}</span></div><div id="answer-area">${q.mode === 'mc' ? `<div class="choice-grid">${q.options.map((a, i) => `<button class="choice-button" data-action="answer-choice" data-index="${i}"><span class="choice-key">${i + 1}</span><span>${esc(a)}</span><span class="choice-result"></span></button>`).join('')}</div>` : `<form id="answer-form"><label for="written-answer" class="answer-label">Deine Antwort auf ${esc(q.reverse ? set.frontLang : set.backLang)}</label><input id="written-answer" class="written-answer" placeholder="Übersetzung eingeben …" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" required dir="auto"><div class="accent-keys">${'á é í ó ú ü ñ ¿ ¡ ä ö ß'.split(' ').map(char => `<button type="button" data-action="accent" data-char="${char}" tabindex="-1">${char}</button>`).join('')}</div><div class="write-actions"><button type="button" class="text-button" data-action="dont-know">Weiß ich noch nicht</button><button type="submit" class="button primary">Antwort prüfen ${icon('arrow')}</button></div></form>`}</div><div id="answer-feedback" class="answer-feedback" role="status" aria-live="polite"></div>${q.mode === 'mc' ? '<button class="text-button dont-know" data-action="dont-know">Weiß ich noch nicht</button>' : ''}</div><div class="learning-help">${icon('swap')} ${data.settings.direction === 'random' ? 'Die Richtung wechselt zufällig. ' : ''}Fehler kommen später noch mal dran.</div><div class="shortcut-hint">${q.mode === 'mc' ? '<kbd>1</kbd> – <kbd>4</kbd> Antwort wählen <span>·</span>' : ''} <kbd>Enter</kbd> Prüfen / weiter</div></section>`;
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
      if (needsMore) { session.queue.push(item); message = q.mode === 'mc' ? 'Richtig! Gleich probierst du es ohne Auswahl.' : 'Richtig! Noch einmal richtig schreiben, dann sitzt diese Richtung.'; }
      else { session.completed++; message = 'Richtig! Dieser Begriff ist für die Runde gefestigt.'; }
    } else {
      session.retried.add(key);
      if (!session.errors.some(e => e.termId === q.termId && e.reverse === q.reverse)) session.errors.push(item);
      session.queue.splice(Math.min(2, session.queue.length), 0, item);
      message = skip ? 'Alles gut. Schau dir die Übersetzung an – sie kommt noch mal dran.' : 'Noch nicht ganz. Du bekommst gleich noch eine Chance.';
    }
    const today = localDate(); data.history[today] = (Number(data.history[today]) || 0) + 1; save();
    const feedback = $('#answer-feedback'); feedback.className = `answer-feedback visible ${correct ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<div class="feedback-title">${icon(correct ? 'check' : 'book')}<strong>${correct ? 'Das sitzt!' : 'Die richtige Antwort'}</strong></div><div class="feedback-answer">${esc(q.expected)}</div>${!correct && !skip && q.mode === 'written' ? `<div class="your-answer">Deine Antwort: ${esc(answer)}</div>` : ''}<p>${message}</p><button class="button ${correct ? 'success' : 'primary'}" data-action="next">${session.queue.length ? 'Weiter' : 'Ergebnis ansehen'} ${icon('arrow')}</button>`;
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
    $('#main').innerHTML = `<section class="result-page"><div class="result-icon">${icon('check')}<span>✦</span></div><div class="eyebrow">RUNDE GESCHAFFT</div><h1>Ein Stück sicherer<span class="blue-dot">.</span></h1><p>${session.total} ${session.total === 1 ? 'Begriff gefestigt' : 'Begriffe gefestigt'}. Das bleibt hängen.</p><div class="result-stats"><div><strong>${session.total}</strong><span>Begriffe geübt</span></div><div><strong>${session.attempts}</strong><span>Antworten gegeben</span></div><div><strong>${errors}</strong><span>${errors === 1 ? 'Begriff wiederholt' : 'Begriffe wiederholt'}</span></div></div>${errors ? `<div class="result-review"><h3>Diese Wörter haben eine Extrarunde bekommen</h3>${lastErrors.map(e => { const t = set.terms.find(t => t.id === e.termId); return `<div><span>${esc(e.reverse ? t.back : t.front)}</span>${icon('arrow')}<strong>${esc(e.reverse ? t.front : t.back)}</strong></div>`; }).join('')}</div>` : '<div class="perfect-note">✦ Kein Fehler in dieser Runde. Stark gemacht!</div>'}<div class="result-actions"><button class="button primary" data-action="learn">Nächste Runde ${icon('arrow')}</button>${errors ? '<button class="button secondary" data-action="repeat-errors">Schwierige Wörter üben</button>' : ''}<button class="text-button" data-action="open-set">Zurück zum Lernset</button></div><p class="result-note">${storageFailed ? 'Dein Fortschritt ist nur in dieser Sitzung verfügbar. Bitte eine Sicherung exportieren.' : 'Dein Fortschritt ist auf diesem Gerät gespeichert.'}</p></section>`;
    session.current = null; session.answered = true;
  }
  function startFlashcards() {
    const set = currentSet(); if (!set) return openImport();
    view = 'flashcards'; session = null; flash = { terms: [...set.terms], index: 0, flipped: false, reverse: data.settings.direction === 'reverse' || data.settings.direction === 'random' && Math.random() < 0.5 };
    renderShell('Karteikarten · ' + set.title); drawFlashcard();
  }
  function drawFlashcard() {
    const set = currentSet(), t = flash.terms[flash.index];
    $('#main').innerHTML = `<section class="flash-page"><button class="back-link" data-action="open-set">${icon('back')}${esc(set.title)}</button><div class="section-heading"><div><div class="eyebrow">IN DEINEM TEMPO</div><h1>Einmal umdrehen, bitte.</h1></div><button class="button secondary" data-action="shuffle-cards">${icon('swap')}Mischen</button></div><button class="flashcard ${flash.flipped ? 'flipped' : ''}" data-action="flip-card" aria-label="Karte umdrehen"><span class="card-language">${esc(flash.flipped ? flash.reverse ? set.frontLang : set.backLang : flash.reverse ? set.backLang : set.frontLang)}</span><strong dir="auto">${esc(flash.flipped ? flash.reverse ? t.front : t.back : flash.reverse ? t.back : t.front)}</strong><span class="flip-hint">${icon('swap')}Klicken oder Leertaste zum Umdrehen</span></button><div class="flash-controls"><button class="round-button" data-action="prev-card" aria-label="Vorherige Karte">${icon('back')}</button><span>${flash.index + 1} <span>/ ${flash.terms.length}</span></span><button class="round-button" data-action="next-card" aria-label="Nächste Karte">${icon('arrow')}</button></div><div class="mini-progress"><span style="width:${(flash.index + 1) / flash.terms.length * 100}%"></span></div><p class="center muted">Mit Karteikarten wiederholst du frei. Fortschritt sammelst du im Lernmodus.</p><button class="button primary flash-learn" data-action="learn">${icon('spark')}Jetzt abfragen lassen</button></section>`;
  }
  function moveCard(delta) { flash.index = (flash.index + delta + flash.terms.length) % flash.terms.length; flash.flipped = false; flash.reverse = data.settings.direction === 'reverse' || data.settings.direction === 'random' && Math.random() < 0.5; drawFlashcard(); }
  function showSettings(duringRound = false) {
    const set = currentSet(), s = data.settings, dialog = $('#settings-dialog');
    dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">SO LERNST DU AM BESTEN</div><h2 id="settings-heading">Dein Lernmodus</h2></div><button class="icon-button" data-close="settings-dialog" aria-label="Schließen">${icon('close')}</button></div><form id="settings-form"><fieldset><legend>Wie möchtest du üben?</legend><div class="setting-options">${[['adaptive', 'spark', 'Adaptiv', 'Erst auswählen, dann zweimal richtig schreiben.'], ['mc', 'layers', 'Multiple Choice', 'Die richtige Übersetzung aus Antworten wählen.'], ['written', 'keyboard', 'Nur schreiben', 'Direkt aus dem Gedächtnis antworten.']].map(([v, i, name, text]) => `<label class="radio-card"><input type="radio" name="mode" value="${v}" ${s.mode === v ? 'checked' : ''}>${icon(i)}<span><strong>${name}</strong><small>${text}</small></span></label>`).join('')}</div></fieldset><div class="form-grid"><label>Abfragerichtung<select name="direction"><option value="random" ${s.direction === 'random' ? 'selected' : ''}>Zufällig in beide Richtungen</option><option value="forward" ${s.direction === 'forward' ? 'selected' : ''}>${esc(set?.frontLang || 'Vorderseite')} → ${esc(set?.backLang || 'Rückseite')}</option><option value="reverse" ${s.direction === 'reverse' ? 'selected' : ''}>${esc(set?.backLang || 'Rückseite')} → ${esc(set?.frontLang || 'Vorderseite')}</option></select></label><label>Begriffe pro Runde<select name="roundSize">${[['5', '5 · Kurz & knackig'], ['10', '10 · Der gute Mittelweg'], ['20', '20 · Noch ein bisschen mehr'], ['all', 'Alle Begriffe']].map(([v, label]) => `<option value="${v}" ${s.roundSize === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><label class="toggle-row"><span><strong>Akzente genau prüfen</strong><small>Zum Beispiel á statt a und ñ statt n verlangen.</small></span><input type="checkbox" name="accents" ${s.accents ? 'checked' : ''}></label><label class="toggle-row"><span><strong>Artikel dürfen fehlen</strong><small>„Kleidung“ gilt auch für „die Kleidung“.</small></span><input type="checkbox" name="articles" ${s.articles ? 'checked' : ''}></label><p class="form-help">Groß- und Kleinschreibung sowie Satzzeichen sind immer egal. Bei mehreren Übersetzungen reicht eine passende Variante.</p>${duringRound ? '<p class="import-warning">Beim Speichern beginnt eine neue Runde. Bereits beantwortete Fragen bleiben gespeichert.</p>' : ''}<div class="dialog-footer"><button class="button secondary" type="button" data-close="settings-dialog">Abbrechen</button><button class="button primary" type="submit">Einstellungen speichern ${icon('check')}</button></div></form>`;
    $('#settings-form').addEventListener('submit', e => { e.preventDefault(); const f = new FormData(e.target); data.settings = validateSettings({ mode: f.get('mode'), direction: f.get('direction'), roundSize: f.get('roundSize'), accents: f.has('accents'), articles: f.has('articles') }); save(); dialog.close(); toast('Dein Lernmodus ist gespeichert.'); if (duringRound) startLearning(); });
    dialog.showModal();
  }
  function openImport(edit = false) {
    fileLoadVersion++;
    importTarget = edit ? currentSet()?.id : null; importDraft = null; importRaw = ''; importWarnings = [];
    const set = edit ? currentSet() : null, dialog = $('#import-dialog');
    dialog.innerHTML = `<div class="dialog-header"><div><div class="eyebrow">${edit ? 'DEIN LERNSET' : 'NEUES WISSEN, GANZ EINFACH'}</div><h2 id="import-heading">${edit ? 'Lernset bearbeiten' : 'Was möchtest du lernen?'}</h2></div><button class="icon-button" data-close="import-dialog" aria-label="Schließen">${icon('close')}</button></div><div class="import-steps"><span class="active">1 <strong>Inhalt hinzufügen</strong></span><span>2 <strong>Prüfen & speichern</strong></span></div><form id="import-form"><div class="form-grid"><label class="full">Name des Lernsets<input id="import-title" name="title" placeholder="z. B. Spanisch · Unidad 5" value="${esc(set?.title || '')}" maxlength="100" required></label><label>Vorderseite<input name="frontLang" id="import-front" value="${esc(set?.frontLang || 'Spanisch')}" maxlength="40" required></label><label>Rückseite<input name="backLang" id="import-back" value="${esc(set?.backLang || 'Deutsch')}" maxlength="40" required></label></div><div id="import-source"><label class="textarea-label" for="import-text">Deine Begriffe</label><textarea id="import-text" placeholder="la ropa → die Kleidung&#10;el vestido → das Kleid&#10;&#10;Du kannst auch den kompletten kopierten Quizlet-Text einfügen."></textarea><p class="form-help">Ein Paar pro Zeile mit Tab, Semikolon oder →. Oder Begriff und Übersetzung in zwei aufeinanderfolgenden Zeilen. Quizlet-Menüs filtern wir automatisch heraus.</p><label class="upload-zone" id="upload-zone"><input type="file" id="import-file" accept=".txt,.csv,.tsv,.json,text/plain,text/csv,application/json"><span class="upload-icon">${icon('upload')}</span><strong>Datei hier ablegen oder <span>auswählen</span></strong><small>TXT, CSV, TSV oder JSON · maximal 2 MB</small></label><div class="file-status" id="file-status" role="status"></div></div><div id="import-preview" hidden></div><div id="import-error" class="form-error" role="alert" hidden></div><div class="dialog-footer"><button class="button secondary" type="button" id="import-back-btn" hidden>${icon('back')}Zurück</button><span class="import-privacy">${icon('lock')}Deine Inhalte bleiben in deinem Browser.</span><button class="button primary" type="submit" id="import-submit">Paare erkennen ${icon('arrow')}</button></div></form>`;
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
      selectedId = set.id; save(); $('#import-dialog').close(); termSearch = ''; drawSet(); toast(`${terms.length} Begriffe ${old ? 'gespeichert' : 'importiert'}. Bereit zum Lernen!`);
    } catch (error) { importError(error.message); }
  }
  function restoreBackup(backup) {
    try {
      if (backup.sets.length > 100) throw new Error('Eine Sicherung kann höchstens 100 Lernsets auf einmal enthalten.');
      const sets = backup.sets.map(s => validateSet(s, false));
      if (!sets.length) throw new Error('Diese Sicherung enthält keine Lernsets.');
      // Restore as copies. Existing sets and learning progress remain intact.
      for (const s of sets) if (data.sets.some(old => old.title === s.title)) s.title += ' (Import)';
      data.sets.push(...sets); selectedId = sets[0].id; save(); $('#import-dialog').close(); drawLibrary(); toast(`${sets.length} Lernsets samt Fortschritt importiert.`);
    } catch (error) { importError(error.message); }
  }
  function download(name, text, type) { const blob = new Blob([text], { type }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1000); }
  function exportSet() { const s = currentSet(); download(s.title.replace(/[<>:"/\\|?*]/g, '-') + '.txt', '\uFEFF' + C.serializeTerms(s.terms), 'text/plain;charset=utf-8'); toast('Vokabelliste exportiert.'); }
  function exportBackup() { download(`wortwechsel-sicherung-${localDate()}.json`, JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sets: data.sets, settings: data.settings }, null, 2), 'application/json'); toast('Sicherung exportiert. Über „Neues Lernset“ wieder importieren.'); }
  function confirmAction(title, text, label, fn) {
    const d = $('#confirm-dialog');
    d.innerHTML = `<div class="dialog-header"><h2 id="confirm-heading">${esc(title)}</h2><button class="icon-button" data-close="confirm-dialog" aria-label="Schließen">${icon('close')}</button></div><p>${esc(text)}</p><div class="dialog-footer"><button class="button secondary" data-close="confirm-dialog">Abbrechen</button><button class="button primary" id="confirm-action">${esc(label)}</button></div>`;
    $('#confirm-action').addEventListener('click', () => { d.close(); fn(); }, { once: true }); d.showModal();
  }
  document.addEventListener('click', e => {
    const close = e.target.closest('[data-close]'); if (close) return document.getElementById(close.dataset.close).close();
    const btn = e.target.closest('[data-action]'); if (!btn || btn.disabled) return;
    const action = btn.dataset.action;
    if (btn.dataset.id) { selectedId = btn.dataset.id; save(); }
    switch (action) {
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
  $('.brand').addEventListener('click', e => { e.preventDefault(); drawLibrary(); });
  $('[data-view="library"]').addEventListener('click', drawLibrary);
  $('#nav-practice').addEventListener('click', () => { if (view === 'learn' && session?.current) return; startLearning(); });
  $('#nav-import').addEventListener('click', () => openImport());
  $('#backup-btn').addEventListener('click', exportBackup);
  $('#top-settings').addEventListener('click', () => showSettings(view === 'learn' && !!session?.current));
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey || document.querySelector('dialog[open]')) return;
    const input = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
    if (view === 'learn' && session?.current) {
      if (e.repeat) return;
      if (session.answered && e.key === 'Enter') { e.preventDefault(); return nextQuestion(); }
      if (!input && !session.answered && session.current.mode === 'mc' && /^[1-4]$/.test(e.key)) { const value = session.current.options[Number(e.key) - 1]; if (value) { e.preventDefault(); submitAnswer(value); } }
    }
    if (view === 'flashcards' && flash && !input) {
      if (e.key === ' ') { e.preventDefault(); flash.flipped = !flash.flipped; drawFlashcard(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveCard(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveCard(-1); }
    }
  });
  $('#storage-warning').hidden = !storageFailed;
  save(); hydrateIcons(); drawLibrary();
})();
