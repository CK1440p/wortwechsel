(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WWCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
  function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  }
  function normalize(value, accents = false) {
    let s = String(value).normalize('NFC').toLocaleLowerCase().trim().replace(/[¡!¿?.,:;"„“”‘’]/g, '').replace(/\s+/g, ' ');
    if (!accents) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss');
    return s;
  }
  function stripArticle(value) { return value.replace(/^(?:el|la|los|las|un|una|unos|unas|der|die|das|ein|eine|einen|einem|einer)\s+/i, ''); }
  function variants(value) {
    const base = String(value).trim();
    const out = [base, base.replace(/\s*\([^)]*\)/g, '').trim(), base.replace(/[()]/g, '')];
    for (const v of [...out]) {
      for (const chunk of v.split(/\s*[;,]\s*/)) {
        out.push(chunk);
        const slash = chunk.split(/\s*\/\s*/);
        if (slash.length > 1) {
          const prefix = slash[0].slice(0, slash[0].lastIndexOf(' ') + 1);
          const tail = slash.at(-1).indexOf(' ');
          if (prefix && slash.slice(1).every(alt => !alt.includes(' '))) {
            // de manga corta/larga -> de manga corta, de manga larga
            out.push(slash[0], ...slash.slice(1).map(alt => prefix + alt));
          } else if (!slash[0].includes(' ') && tail > 0) {
            // pasado/pasada de moda -> pasado de moda, pasada de moda
            out.push(...slash.slice(0, -1).map(alt => alt + slash.at(-1).slice(tail)), slash.at(-1));
          } else out.push(...slash);
        }
      }
    }
    return [...new Set(out.map(s => s.trim()).filter(Boolean))];
  }
  function matches(answer, expected, options = {}) {
    if (!String(answer).trim()) return false;
    const actual = normalize(answer, options.accents);
    return variants(expected).some(v => {
      const full = normalize(v, options.accents);
      return actual === full || (options.articles !== false && actual === stripArticle(full));
    });
  }
  function csvRows(text, delimiter) {
    const rows = []; let row = [], cell = '', quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
        else if (quoted || !cell) quoted = !quoted;
        else cell += c;
      } else if (c === delimiter && !quoted) { row.push(cell.trim()); cell = ''; }
      else if ((c === '\n' || c === '\r') && !quoted) {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (quoted) throw new Error('In der Datei fehlt ein schließendes Anführungszeichen.');
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
    return rows;
  }
  function serializeTerms(terms) {
    const cell = s => /["\t\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    return terms.map(t => cell(t.front) + '\t' + cell(t.back)).join('\n');
  }
  function cleanPairs(pairs, initialWarnings = []) {
    const terms = [], seen = new Set(), warnings = [...initialWarnings]; let duplicates = 0, invalid = 0;
    for (const p of pairs) {
      if (!p || typeof p !== 'object') { invalid++; continue; }
      const front = String(p.front ?? p.term ?? p[0] ?? '').trim();
      const back = String(p.back ?? p.definition ?? p[1] ?? '').trim();
      if (!front || !back || front.length > 2000 || back.length > 2000) { invalid++; continue; }
      const key = JSON.stringify([front.normalize('NFC'), back.normalize('NFC')]);
      if (seen.has(key)) { duplicates++; continue; }
      seen.add(key); terms.push({ id: uid(), front, back });
    }
    if (duplicates) warnings.push(`${duplicates} doppelte Paare entfernt.`);
    if (invalid) warnings.push(`${invalid} unvollständige oder zu lange Paare übersprungen.`);
    if (terms.length > 5000) throw new Error('Bitte höchstens 5.000 Begriffspaare pro Lernset importieren.');
    return { terms, warnings };
  }
  function parseImport(raw) {
    if (typeof raw !== 'string' || !raw.trim()) throw new Error('Füge zuerst deine Begriffe ein oder wähle eine Datei.');
    if (raw.length > 2_000_000) throw new Error('Die Datei ist zu groß. Bitte verwende höchstens 2 MB.');
    let text = raw.replace(/^\uFEFF/, '').trim();
    if (/^[\[{]/.test(text)) {
      let data; try { data = JSON.parse(text); } catch { throw new Error('Diese JSON-Datei ist nicht gültig.'); }
      if (Array.isArray(data)) return cleanPairs(data);
      if (Array.isArray(data.terms)) return { ...cleanPairs(data.terms), title: data.title, frontLang: data.frontLang, backLang: data.backLang };
      if (Array.isArray(data.sets)) return { backup: data };
      throw new Error('In der JSON-Datei fehlen „terms“ oder „sets“.');
    }
    const quizlet = /Begriffe in diesem Lernset\s*\(\d+\)|Terms in this set\s*\(\d+\)/i.exec(text);
    if (quizlet) text = text.slice(quizlet.index + quizlet[0].length);
    const noise = /^(?:Deine Statistik|Wird gerade gelernt\s*\(\d+\)|Gemeistert\s*\(\d+\)|Noch nicht gelernt\s*\(\d+\)|Diese \d+ auswählen|Diese Begriffe lernst du gerade\..*|Diese Begriffe hast du richtig beantwortet!?|Diese Begriffe hast du noch nicht gelernt!?|Your stats|Learning\s*\(\d+\)|Mastered\s*\(\d+\)|Not studied\s*\(\d+\)|Select these \d+|Diese \d+ auswählen)$/i;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !noise.test(l));
    if (!lines.length) throw new Error('Es wurden keine Begriffe gefunden.');
    const candidates = ['\t', ';', ','].map(d => {
      try { return { d, rows: csvRows(quizlet ? lines.join('\n') : text, d) }; }
      catch { return { d, rows: [] }; }
    });
    const delimited = candidates.find(x => x.rows.length && x.rows.filter(r => r.length >= 2).length >= Math.ceil(x.rows.length * 0.6));
    let pairs, warnings = [];
    if (delimited) {
      pairs = delimited.rows.map(row => ({ front: row[0], back: row.slice(1).join(delimited.d === ',' ? ', ' : ' / ') }));
      if (/^(spanisch|vorderseite|begriff|term|front|spanish)$/i.test(pairs[0]?.front) && /deutsch|rückseite|definition|back|german/i.test(pairs[0]?.back)) pairs.shift();
    } else {
      const inline = lines.map(l => l.split(/\s+(?:→|->|=>|—|–|=|\|)\s+|\s+:\s+/));
      if (inline.filter(p => p.length === 2).length >= Math.ceil(lines.length * 0.6)) {
        pairs = inline.filter(p => p.length >= 2).map(p => ({ front: p[0], back: p.slice(1).join(' / ') }));
        if (pairs.length < lines.length) warnings.push(`${lines.length - pairs.length} Zeilen ohne Trennzeichen übersprungen.`);
      } else {
        pairs = []; for (let i = 0; i + 1 < lines.length; i += 2) pairs.push({ front: lines[i], back: lines[i + 1] });
        if (lines.length % 2) warnings.push(`Die letzte Zeile „${lines.at(-1).slice(0, 50)}“ hat keine Übersetzung. Bitte in der Vorschau ergänzen.`);
      }
    }
    const result = cleanPairs(pairs, warnings);
    if (!result.terms.length) throw new Error('Keine Begriffspaare erkannt. Nutze z. B. „la ropa → die Kleidung“ oder zwei Zeilen pro Paar.');
    return result;
  }
  function directionState(term, reverse) {
    const data = term.progress?.[reverse ? 'reverse' : 'forward'] || {};
    return { mc: Math.min(1, Math.max(0, Number(data.mc) || 0)), written: Math.min(2, Math.max(0, Number(data.written) || 0)), wrong: Number(data.wrong) || 0 };
  }
  function mastery(term) { return [false, true].reduce((n, rev) => { const p = directionState(term, rev); return n + p.mc + p.written; }, 0); }
  function setStats(set) {
    const mastered = set.terms.filter(t => mastery(t) >= 6).length;
    const learning = set.terms.filter(t => mastery(t) > 0 && mastery(t) < 6).length;
    const progress = set.terms.length ? Math.round(set.terms.reduce((n, t) => n + mastery(t), 0) / (set.terms.length * 6) * 100) : 0;
    return { mastered, learning, fresh: set.terms.length - mastered - learning, progress };
  }
  function recordAnswer(term, reverse, mode, correct) {
    const p = directionState(term, reverse);
    if (correct) { if (mode === 'mc') p.mc = 1; else { p.mc = 1; p.written = Math.min(2, p.written + 1); } }
    else { p.wrong++; p.written = Math.max(0, p.written - 1); }
    term.progress ||= {}; term.progress[reverse ? 'reverse' : 'forward'] = p;
    return p;
  }
  function createRound(set, settings, random = Math.random) {
    const direction = settings.direction || 'random';
    const count = settings.roundSize === 'all' ? set.terms.length : Math.min(Number(settings.roundSize) || 10, set.terms.length);
    const candidates = shuffle(set.terms, random).map(term => {
      const reverse = direction === 'reverse';
      const p = directionState(term, reverse);
      const priority = direction === 'random' ? mastery(term) / 2 : p.mc + p.written;
      return { termId: term.id, ...(direction === 'random' ? {} : { reverse }), priority: priority - Math.min(p.wrong, 3) * 0.15, jitter: random() };
    }).sort((a, b) => a.priority - b.priority || a.jitter - b.jitter).slice(0, count);
    return { queue: shuffle(candidates, random), total: count, completed: 0, attempts: 0, firstCorrect: 0, errors: [], retried: new Set(), answered: false, current: null };
  }
  function buildQuestion(set, item, settings, random = Math.random) {
    // A new coin flip on EVERY presentation, including retries of the same term.
    // The queued item and previous answers must not determine this direction.
    const reverse = settings.direction === 'random' ? random() < 0.5
      : settings.direction === 'reverse' ? true
      : settings.direction === 'forward' ? false : !!item.reverse;
    item = { ...item, reverse };
    const term = set.terms.find(t => t.id === item.termId);
    const p = directionState(term, item.reverse);
    let mode = settings.mode === 'written' ? 'written' : settings.mode === 'mc' ? 'mc' : p.mc >= 1 ? 'written' : 'mc';
    const expected = item.reverse ? term.front : term.back, prompt = item.reverse ? term.back : term.front;
    const seen = new Set([normalize(expected)]);
    const distractors = shuffle(set.terms.filter(t => t.id !== term.id), random).map(t => item.reverse ? t.front : t.back).filter(value => {
      const n = normalize(value);
      if (seen.has(n) || variants(value).some(v => matches(v, expected)) || variants(expected).some(v => matches(v, value))) return false;
      seen.add(n); return true;
    }).slice(0, 3);
    if (!distractors.length) mode = 'written';
    return { ...item, term, expected, prompt, mode, options: shuffle([expected, ...distractors], random) };
  }
  const DEMONSTRATIVE = /^(?:este|esta|esto|estos|estas|ese|esa|eso|esos|esas|aquel|aquella|aquello|aquellos|aquellas)$/i;
  const CLOZE_LEVELS = { 1: { ratio: 0.35, hint: false }, 2: { ratio: 0.7, hint: true } };
  function isDemonstrative(word) { return DEMONSTRATIVE.test(String(word)); }
  // Odd entries of the split are words; even entries are spaces and punctuation.
  function lineTokens(text) {
    return String(text).split(/([\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*)/u).map((value, i) => ({ text: value, word: i % 2 === 1 })).filter(t => t.text);
  }
  function lineWords(text) { return lineTokens(text).filter(t => t.word).map(t => t.text); }
  // Demonstratives are test material, so they are blanked first at every level.
  function clozeLine(text, level, random = Math.random) {
    const tokens = lineTokens(text), config = CLOZE_LEVELS[level] || CLOZE_LEVELS[1];
    const words = tokens.filter(t => t.word);
    const target = Math.max(1, Math.round(words.length * config.ratio));
    const demonstratives = words.filter(t => isDemonstrative(t.text));
    const others = shuffle(words.filter(t => !isDemonstrative(t.text)), random);
    const blanks = new Set([...demonstratives, ...others.slice(0, Math.max(0, target - demonstratives.length))]);
    return tokens.map(t => ({ ...t, blank: blanks.has(t), hint: blanks.has(t) && config.hint ? t.text[0] : '' }));
  }
  // Word-level LCS: tells the learner which words are missing and which only lack an accent.
  function compareLine(answer, expected, options = {}) {
    const given = lineWords(answer), wanted = lineWords(expected);
    const key = word => normalize(word, options.accents);
    const table = Array.from({ length: wanted.length + 1 }, () => new Array(given.length + 1).fill(0));
    for (let i = wanted.length - 1; i >= 0; i--) for (let j = given.length - 1; j >= 0; j--) {
      table[i][j] = key(wanted[i]) === key(given[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
    const matched = new Map();
    for (let i = 0, j = 0; i < wanted.length && j < given.length;) {
      if (key(wanted[i]) === key(given[j])) matched.set(i++, given[j++]);
      else if (table[i + 1][j] >= table[i][j + 1]) i++;
      else j++;
    }
    let index = -1;
    const parts = lineTokens(expected).map(t => t.word ? { ...t, ok: matched.has(++index) } : t);
    const accentSlips = [...matched].filter(([i, word]) => normalize(word, true) !== normalize(wanted[i], true)).map(([i]) => wanted[i]);
    return { correct: wanted.length > 0 && matched.size === wanted.length && given.length === wanted.length, parts, accentSlips };
  }
  const cleanDialogLine = raw => String(raw).trim().replace(/^>\s*/, '').replace(/^(?:[-*•–—]\s+|\d+[.)]\s+)/, '').replace(/\*\*|__|`/g, '').replace(/^[*_]([^*_]+)[*_]$/, '$1').trim();
  const isDashLine = raw => /^\s*[-–—]\s*\S/.test(raw);
  const translationLabel = /^(?:de|deutsch|übersetzung|translation)$/i;
  const isSpeakerName = name => name.split(/\s+/).length <= 3 && !/[.?!¿¡,;"„“”()]/.test(name);
  // Splits "spanish | german", "spanish → german" and "spanish (two or more german words)".
  function splitTranslation(text) {
    const [es, ...rest] = text.split('|');
    if (rest.length) return { es: es.trim(), de: rest.join('|').trim() };
    const arrow = text.split(/\s+(?:→|->|=>)\s+/);
    if (arrow.length > 1) return { es: arrow[0].trim(), de: arrow.slice(1).join(' ').trim() };
    const bracket = text.match(/^(.*\S)\s+\(([^()]*\s[^()]*)\)$/);
    if (bracket) return { es: bracket[1].trim(), de: bracket[2].trim() };
    return { es: text.trim(), de: '' };
  }
  // Reads dialogues as AI chats return them: markdown, numbering, a translation below the line, text around the dialogue.
  function parseDialog(text) {
    const rows = String(text).split(/\r?\n/), lines = [], skippedLines = [];
    const hasSpeakers = rows.some(raw => { const m = cleanDialogLine(raw).match(/^([^:|]{1,30}?)\s*:\s*(.+)$/); return m && isSpeakerName(m[1]) && !translationLabel.test(m[1]); });
    let previousBlank = true, turn = 0;
    for (const raw of rows) {
      const clean = cleanDialogLine(raw);
      if (!clean) { previousBlank = true; continue; }
      const match = clean.match(/^([^:|]{1,30}?)\s*:\s*(.+)$/), last = lines.at(-1);
      if (match && translationLabel.test(match[1].trim()) && last && !last.de) { last.de = match[2].trim().slice(0, 500); previousBlank = false; continue; }
      if (match && isSpeakerName(match[1].trim()) && !translationLabel.test(match[1].trim())) {
        const parts = splitTranslation(match[2]);
        if (parts.es) lines.push({ speaker: match[1].trim().slice(0, 30), es: parts.es.slice(0, 500), de: parts.de.slice(0, 500) });
        else skippedLines.push(clean);
      } else if (!hasSpeakers && isDashLine(raw)) {
        const parts = splitTranslation(clean);
        lines.push({ speaker: turn++ % 2 ? 'B' : 'A', es: parts.es.slice(0, 500), de: parts.de.slice(0, 500) });
      } else if (last && !last.de && !previousBlank && !clean.endsWith(':')) {
        last.de = clean.replace(/^\((.*)\)$/, '$1').trim().slice(0, 500);
      } else skippedLines.push(clean);
      previousBlank = false;
    }
    // Comment lines such as "Anrede: ..." look like a speaker but occur once, next to the real roles.
    const counts = new Map(); for (const line of lines) counts.set(line.speaker, (counts.get(line.speaker) || 0) + 1);
    const regular = [...counts.values()].filter(n => n >= 2).length;
    const kept = lines.filter(line => {
      if (lines.length < 4 || regular < 2 || counts.get(line.speaker) >= 2) return true;
      skippedLines.push(`${line.speaker}: ${line.es}`);
      return false;
    });
    if (kept.length < 2) throw new Error('Keine Dialogzeilen gefunden. Eine Zeile sollte so aussehen: A: ¡Hola! | Hallo!');
    if (kept.length > 100) throw new Error('Ein Dialog kann höchstens 100 Zeilen enthalten.');
    return { lines: kept, skipped: skippedLines.length, skippedLines };
  }
  // Practice sections of about `size` lines. A short remainder joins the part before it.
  function dialogParts(dialog, size = 5) {
    const total = dialog.lines.length, parts = [];
    for (let start = 0; start < total; start += size) {
      const end = total - (start + size) < 3 ? total - 1 : start + size - 1;
      parts.push({ number: parts.length + 1, start, end, key: `${start}-${end}` });
      if (end === total - 1) break;
    }
    return parts;
  }
  function serializeDialog(dialog) { return dialog.lines.map(l => `${l.speaker}: ${l.es}${l.de ? ` | ${l.de}` : ''}`).join('\n'); }
  function validateDialog(raw, preserveId = true) {
    if (!raw || !Array.isArray(raw.lines)) return null;
    const lines = raw.lines.filter(l => l && String(l.es ?? '').trim()).slice(0, 100).map(l => ({ speaker: String(l.speaker || 'A').slice(0, 30), es: String(l.es).trim().slice(0, 500), de: String(l.de ?? '').trim().slice(0, 500), task: String(l.task ?? '').trim().slice(0, 300) }));
    if (lines.length < 2) return null;
    const stage = value => Math.min(4, Math.max(0, Math.trunc(Number(value)) || 0));
    const parts = {};
    for (const [key, value] of Object.entries(raw.progress?.parts && typeof raw.progress.parts === 'object' ? raw.progress.parts : {}).slice(0, 200)) if (/^\d+-\d+$/.test(key) && stage(value)) parts[key] = stage(value);
    return { id: preserveId && typeof raw.id === 'string' ? raw.id : uid(), title: String(raw.title || 'Mein Dialog').slice(0, 100), description: String(raw.description || '').slice(0, 250), seed: !!raw.seed && preserveId, lines, progress: { best: stage(raw.progress?.best), practiced: typeof raw.progress?.practiced === 'string' ? raw.progress.practiced.slice(0, 10) : '', parts } };
  }
  // Joins two states from different devices. Nothing learned is lost: every counter keeps its higher value.
  function mergeStates(base, other) {
    const out = { ...other, ...base, selectedId: other?.selectedId ?? base?.selectedId };
    const bestDirection = (a, b) => ({ mc: Math.max(a.mc, b.mc), written: Math.max(a.written, b.written), wrong: Math.max(a.wrong, b.wrong) });
    const termKey = t => `${t.front}\n${t.back}`;
    const mergeTerm = (a, b) => {
      if (!a.progress && !b.progress) return a;
      return { ...a, progress: { forward: bestDirection(directionState(a, false), directionState(b, false)), reverse: bestDirection(directionState(a, true), directionState(b, true)) } };
    };
    const sets = (base?.sets || []).map(s => ({ ...s, terms: [...s.terms] }));
    for (const set of other?.sets || []) {
      const match = sets.find(s => s.id === set.id) || sets.find(s => s.title === set.title);
      if (!match) { sets.push(set); continue; }
      for (const term of set.terms) {
        const index = match.terms.findIndex(t => termKey(t) === termKey(term));
        if (index < 0) match.terms.push(term);
        else match.terms[index] = mergeTerm(match.terms[index], term);
      }
    }
    out.sets = sets;
    out.history = { ...(other?.history || {}) };
    for (const [day, count] of Object.entries(base?.history || {})) out.history[day] = Math.max(Number(out.history[day]) || 0, Number(count) || 0);
    const dialogs = (base?.dialogs || []).map(d => ({ ...d, progress: { ...d.progress } }));
    for (const dialog of other?.dialogs || []) {
      const match = dialogs.find(d => d.id === dialog.id);
      if (!match) { dialogs.push(dialog); continue; }
      const parts = { ...(dialog.progress?.parts || {}) };
      for (const [key, value] of Object.entries(match.progress?.parts || {})) parts[key] = Math.max(Number(parts[key]) || 0, Number(value) || 0);
      match.progress = { best: Math.max(Number(match.progress?.best) || 0, Number(dialog.progress?.best) || 0), practiced: [match.progress?.practiced || '', dialog.progress?.practiced || ''].sort().at(-1), parts };
    }
    out.dialogs = dialogs;
    const grammar = validateGrammarProgress(other?.grammar);
    for (const [id, p] of Object.entries(validateGrammarProgress(base?.grammar))) grammar[id] = { best: Math.max(grammar[id]?.best || 0, p.best), practiced: [grammar[id]?.practiced || '', p.practiced].sort().at(-1) };
    out.grammar = grammar;
    return out;
  }
  // Grammar tables. A gap is one field to fill: a table cell or the missing word of a sentence.
  const GRAMMAR_GAPS = { 1: 4, 2: 8 };
  function grammarColumns(table) { return table.groups.flatMap(group => group.columns.map(column => ({ group: group.label, column }))); }
  function grammarCells(table) {
    const columns = grammarColumns(table);
    return table.rows.flatMap((row, r) => row.cells.map((answer, c) => ({ key: `r${r}c${c}`, answer, label: `${columns[c].group} ${columns[c].column}, ${row.label}` })));
  }
  function grammarGaps(table, level, random = Math.random) {
    if (level >= 4) {
      // Each round draws one sentence per form, so every form comes up and the sentences change between rounds.
      const byForm = new Map();
      table.sentences.forEach((s, i) => { const form = normalize(s.answer, true); byForm.set(form, [...(byForm.get(form) || []), { key: `s${i}`, answer: s.answer, label: 'Fehlendes Wort' }]); });
      return shuffle([...byForm.values()].map(options => options[Math.floor(random() * options.length)]), random);
    }
    const cells = grammarCells(table);
    return level === 3 ? cells : shuffle(cells, random).slice(0, GRAMMAR_GAPS[level]);
  }
  // Same rule as dialogues: a wrong accent only counts as wrong when accent checking is on.
  function checkGap(given, answer, accents = false) {
    if (normalize(given, true) === normalize(answer, true)) return 'right';
    return !accents && normalize(given) === normalize(answer) ? 'slip' : 'wrong';
  }
  function validateGrammarProgress(raw) {
    const stage = value => Math.min(4, Math.max(0, Math.trunc(Number(value)) || 0));
    const entries = Object.entries(raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}).slice(0, 100);
    return Object.fromEntries(entries.map(([id, p]) => [String(id).slice(0, 60), { best: stage(p?.best), practiced: typeof p?.practiced === 'string' ? p.practiced.slice(0, 10) : '' }]));
  }
  function dialogSpeakers(dialog) { return [...new Set(dialog.lines.map(l => l.speaker))]; }
  // Lines stay in dialogue order: the order itself is part of what has to be learned.
  function dialogQueue(dialog, role = 'all', part = null) {
    const inPart = i => !part || (i >= part.start && i <= part.end);
    const all = dialog.lines.map((_, i) => i).filter(inPart);
    const out = all.filter(i => role === 'all' || dialog.lines[i].speaker === role);
    return out.length ? out : all;
  }
  return { uid, shuffle, normalize, variants, matches, parseImport, cleanPairs, csvRows, serializeTerms, directionState, mastery, setStats, recordAnswer, createRound, buildQuestion, isDemonstrative, lineTokens, lineWords, clozeLine, compareLine, parseDialog, serializeDialog, validateDialog, mergeStates, dialogParts, dialogSpeakers, dialogQueue, grammarColumns, grammarCells, grammarGaps, checkGap, validateGrammarProgress };
});
