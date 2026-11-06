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
    if (base?.catalogs || other?.catalogs) out.catalogs = mergeCatalogs(base?.catalogs, other?.catalogs);
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
  // ---- Question catalogues (Fragenkataloge): open questions with a model answer, e.g. for history tests. ----
  const QA_POINTS = /\s*[([–-]?\s*(\d{1,2})\s*(?:punkte?|pkt\.?|p\.?)\s*[)\]]?\s*$/i;
  const QA_BULLET = /^\s*(?:[•●▪◦‣∙·*–-]|\d{1,2}[.)])\s+/;
  const cleanLine = line => String(line).replace(/ /g, ' ').replace(/\t+/g, ' ').replace(/ {2,}/g, ' ').trim();
  // Accepts pasted Word text ("Frage   2 Punkte" followed by the answer), "F: … / A: …" pairs or blocks separated by blank lines.
  function parseCatalog(text) {
    const raw = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
    const questions = [];
    const push = (q, points, answer) => {
      q = cleanLine(q).replace(QA_BULLET, '').trim();
      const lines = answer.map(l => cleanLine(l)).filter(Boolean).map(l => QA_BULLET.test(l) ? '• ' + l.replace(QA_BULLET, '').trim() : l);
      if (q && lines.length) questions.push({ q: q.slice(0, 500), points: Math.min(20, Math.max(0, points || 0)), answer: lines.join('\n').slice(0, 4000) });
    };
    const lines = raw.map(cleanLine);
    if (lines.some(l => QA_POINTS.test(l) && /[?!:.„“"a-zäöüß]\s*[([–-]?\s*\d{1,2}\s*(?:punkte?|pkt\.?|p\.?)\s*[)\]]?$/i.test(l))) {
      let current = null;
      for (const line of lines) {
        const m = line.match(QA_POINTS);
        if (m && line.replace(QA_POINTS, '').trim().length > 3) { if (current) push(current.q, current.points, current.answer); current = { q: line.replace(QA_POINTS, ''), points: Number(m[1]), answer: [] }; }
        else if (current) current.answer.push(line);
      }
      if (current) push(current.q, current.points, current.answer);
    } else if (lines.some(l => /^(?:f|frage|q)\s*[:.)]/i.test(l))) {
      let current = null;
      for (const line of lines) {
        if (/^(?:f|frage|q)\s*[:.)]/i.test(line)) { if (current) push(current.q, current.points, current.answer); current = { q: line.replace(/^(?:f|frage|q)\s*[:.)]\s*/i, ''), points: 0, answer: [] }; }
        else if (current) current.answer.push(line.replace(/^(?:a|antwort)\s*[:.)]\s*/i, ''));
      }
      if (current) push(current.q, current.points, current.answer);
    } else {
      for (const block of raw.join('\n').split(/\n\s*\n/)) {
        const [first = '', ...rest] = block.split('\n').map(cleanLine).filter(Boolean);
        const pipe = first.indexOf('|');
        if (!rest.length && pipe > 0) push(first.slice(0, pipe), 0, [first.slice(pipe + 1)]);
        else push(first, 0, rest);
      }
    }
    if (!questions.length) throw new Error('Keine Fragen erkannt. Schreib jede Frage in eine eigene Zeile (gern mit „2 Punkte“ am Ende) und die Antwort darunter.');
    return questions.slice(0, 300);
  }
  function serializeCatalog(catalog) { return catalog.questions.map(q => `${q.q}${q.points ? ` (${q.points} ${q.points === 1 ? 'Punkt' : 'Punkte'})` : ''}\n${q.answer}`).join('\n\n'); }
  // Bullet lines start with "• ", everything else is running text.
  function answerParts(answer) { return String(answer).split('\n').filter(l => l.trim()).map(l => l.startsWith('• ') ? { bullet: true, text: l.slice(2) } : { bullet: false, text: l }); }
  const QA_STOP = new Set('aber alle allem allen aller alles also andere anderen anfangs auch auf aus bei beim bis bzw dabei daher damit dann darum dass dem den denen der des die dies diese diesem diesen dieser dort durch eine einem einen einer eines einige einigen entweder erst etwa etwas gegen haben hatte hatten heute hier ihre ihrem ihren ihrer immer indem jede jedem jeden jeder kann keine mehr meist mehrere mit nach neben nicht noch nun nur oder ohne sehr seine seinem seinen seiner sich sind sollte sowie über unter und uns viele vom von vor wann war waren warum was weil wenn werden wie wieder wird wobei wurde wurden zum zur zwei drei zwischen zusätzlich zudem sogar dorthin erfolgte zweiten ab'.split(' '));
  const qaStem = word => { const n = normalize(word); return n.length > 6 ? n.slice(0, 6) : n; };
  // Words that carry the content: long words, names, abbreviations and years.
  function isKeyword(word) {
    const n = normalize(word);
    if (QA_STOP.has(n)) return false;
    return n.length >= 5 || /^\d{4}$/.test(n) || /[A-ZÄÖÜ].*[A-ZÄÖÜ]/.test(word) || (/^[A-ZÄÖÜ]/.test(word) && n.length >= 4);
  }
  const wordRe = () => /[\p{L}\d]+/gu;
  function answerKeywords(answer) {
    const seen = new Map();
    for (const [word] of String(answer).matchAll(wordRe())) if (isKeyword(word)) { const stem = qaStem(word); if (!seen.has(stem)) seen.set(stem, word); }
    return [...seen.entries()].map(([stem, word]) => ({ stem, word }));
  }
  // How much of the model answer shows up in what the learner wrote. Only a hint for self-assessment.
  function keywordCoverage(given, answer) {
    const keys = answerKeywords(answer), have = new Set();
    for (const [word] of String(given ?? '').matchAll(wordRe())) have.add(qaStem(word));
    const hits = new Set(keys.filter(k => have.has(k.stem)).map(k => k.stem));
    return { total: keys.length, hits, ratio: keys.length ? hits.size / keys.length : 0 };
  }
  function suggestPoints(given, answer, points) {
    if (!String(given ?? '').trim()) return 0;
    const ratio = keywordCoverage(given, answer).ratio;
    return Math.min(points, Math.round(points * Math.min(1, ratio * 1.6) * 2) / 2);
  }
  // level: 0 new, 1 needs practice, 2 almost, 3 safe. "at" decides which device wins when merging.
  function rateQuestion(state, rating, now = Date.now()) {
    const level = Number(state?.level) || 0;
    const next = rating === 'known' ? Math.min(3, Math.max(level + 1, 2)) : rating === 'partly' ? 2 : 1;
    return { level: next, seen: (Number(state?.seen) || 0) + 1, at: now };
  }
  // Short version of a model answer for answer options: bullets joined with " · ", cut at a word boundary.
  function answerPreview(answer, max = 230) {
    const text = answerParts(answer).map(p => p.text.trim()).join(' · ').replace(/\s+/g, ' ').trim();
    if (text.length <= max) return text;
    const cut = text.slice(0, max), space = cut.lastIndexOf(' ');
    return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s·,;:–-]+$/, '')} …`;
  }
  // Answer options for a question: the right one plus the most similar other answers, so guessing by topic is harder.
  function choiceOptions(catalog, id, count = 4, random = Math.random) {
    const right = catalog.questions.find(q => q.id === id);
    if (!right) return [];
    const stems = new Set(answerKeywords(`${right.q} ${right.answer}`).map(k => k.stem));
    const seen = new Set([normalize(answerPreview(right.answer))]);
    const others = [];
    for (const q of catalog.questions) {
      if (q.id === id) continue;
      const key = normalize(answerPreview(q.answer));
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const keys = answerKeywords(q.answer).map(k => k.stem), overlap = keys.filter(s => stems.has(s)).length;
      others.push({ q, score: (keys.length ? overlap / Math.sqrt(keys.length) : 0) + random() * 0.6 });
    }
    others.sort((a, b) => b.score - a.score);
    const picked = others.slice(0, Math.max(0, count - 1)).map(({ q }) => ({ id: q.id, text: answerPreview(q.answer), correct: false }));
    return shuffle([{ id: right.id, text: answerPreview(right.answer), correct: true }, ...picked], random);
  }
  function validateCatalog(raw, preserveIds = true) {
    if (!raw || !Array.isArray(raw.questions)) return null;
    const ids = new Set();
    const questions = raw.questions.filter(q => q && String(q.q ?? '').trim() && String(q.answer ?? '').trim()).slice(0, 300).map(q => {
      let id = preserveIds && typeof q.id === 'string' && q.id ? q.id.slice(0, 40) : uid();
      if (ids.has(id)) id = uid(); ids.add(id);
      return { id, q: String(q.q).trim().slice(0, 500), points: Math.min(20, Math.max(0, Math.trunc(Number(q.points)) || 0)), answer: String(q.answer).trim().slice(0, 4000) };
    });
    if (!questions.length) return null;
    const progress = {};
    for (const q of questions) {
      const p = raw.progress?.[q.id];
      if (p && typeof p === 'object') progress[q.id] = { level: Math.min(3, Math.max(0, Math.trunc(Number(p.level)) || 0)), seen: Math.max(0, Math.trunc(Number(p.seen)) || 0), at: Number(p.at) || 0 };
    }
    const t = raw.test && typeof raw.test === 'object' ? raw.test : {};
    const test = { best: Math.max(0, Number(t.best) || 0), last: Math.max(0, Number(t.last) || 0), total: Math.max(0, Number(t.total) || 0), at: Number(t.at) || 0 };
    return { id: preserveIds && typeof raw.id === 'string' ? raw.id.slice(0, 60) : uid(), ...(raw.seed ? { seed: true } : {}), subject: String(raw.subject || 'Allgemein').trim().slice(0, 40) || 'Allgemein', title: String(raw.title || 'Fragenkatalog').slice(0, 100), emoji: String(raw.emoji || '📘').slice(0, 8), description: String(raw.description || '').slice(0, 250), created: Number(raw.created) || Date.now(), questions, progress, test };
  }
  function catalogStats(catalog) {
    const out = { total: catalog.questions.length, points: 0, safe: 0, almost: 0, practice: 0, fresh: 0 };
    for (const q of catalog.questions) {
      out.points += q.points;
      const level = catalog.progress?.[q.id]?.level || 0;
      if (level >= 3) out.safe++; else if (level === 2) out.almost++; else if (level === 1) out.practice++; else out.fresh++;
    }
    out.progress = out.total ? Math.round((out.safe + out.almost * 0.5) / out.total * 100) : 0;
    return out;
  }
  // Weakest questions first, new ones in their original order, so a round follows the catalogue when nothing is known yet.
  function catalogQueue(catalog, onlyWeak = false, random = Math.random) {
    const level = q => catalog.progress?.[q.id]?.level || 0;
    const pool = catalog.questions.filter(q => !onlyWeak || level(q) < 3);
    const order = [1, 0, 2, 3];
    return order.flatMap(l => { const group = pool.filter(q => level(q) === l); return l === 0 ? group : shuffle(group, random); }).map(q => q.id);
  }
  function mergeCatalogs(base, other) {
    const out = (Array.isArray(base) ? base : []).map(c => ({ ...c, progress: { ...(c.progress || {}) }, test: { ...(c.test || {}) } }));
    for (const catalog of Array.isArray(other) ? other : []) {
      const match = out.find(c => c.id === catalog?.id);
      if (!match) { out.push(catalog); continue; }
      for (const [id, p] of Object.entries(catalog.progress || {})) if (!match.progress[id] || (Number(p?.at) || 0) > (Number(match.progress[id].at) || 0)) match.progress[id] = p;
      const a = match.test, b = catalog.test || {};
      match.test = { best: Math.max(Number(a.best) || 0, Number(b.best) || 0), total: Math.max(Number(a.total) || 0, Number(b.total) || 0), ...((Number(b.at) || 0) > (Number(a.at) || 0) ? { last: b.last, at: b.at } : { last: a.last, at: a.at }) };
    }
    return out;
  }
  return { uid, shuffle, normalize, variants, matches, parseImport, cleanPairs, csvRows, serializeTerms, directionState, mastery, setStats, recordAnswer, createRound, buildQuestion, isDemonstrative, lineTokens, lineWords, clozeLine, compareLine, parseDialog, serializeDialog, validateDialog, mergeStates, dialogParts, dialogSpeakers, dialogQueue, grammarColumns, grammarCells, grammarGaps, checkGap, validateGrammarProgress, parseCatalog, serializeCatalog, qaStem, answerParts, answerKeywords, keywordCoverage, suggestPoints, rateQuestion, answerPreview, choiceOptions, validateCatalog, catalogStats, catalogQueue, mergeCatalogs };
});
