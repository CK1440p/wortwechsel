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
    const key = value => { const n = normalize(value, options.accents); return options.articles === false ? n : stripArticle(n); };
    return variants(expected).some(v => key(v) === key(answer));
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
    row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
    return rows;
  }
  function cleanPairs(pairs, initialWarnings = []) {
    const terms = [], seen = new Set(), warnings = [...initialWarnings]; let duplicates = 0, invalid = 0;
    for (const p of pairs) {
      if (!p || typeof p !== 'object') { invalid++; continue; }
      const front = String(p.front ?? p.term ?? p[0] ?? '').trim();
      const back = String(p.back ?? p.definition ?? p[1] ?? '').trim();
      if (!front || !back || front.length > 2000 || back.length > 2000) { invalid++; continue; }
      const key = normalize(front, true) + '\t' + normalize(back, true);
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
    const candidates = ['\t', ';', ','].map(d => ({ d, rows: csvRows(lines.join('\n'), d) }));
    const delimited = candidates.find(x => x.rows.filter(r => r.length >= 2).length >= Math.ceil(lines.length * 0.6));
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
      let reverse = direction === 'reverse' || (direction === 'random' && random() < 0.5);
      if (direction === 'random') {
        const f = directionState(term, false), r = directionState(term, true);
        // Both directions occur; weaker directions get a higher probability.
        const forwardWeight = 4 - f.mc - f.written, reverseWeight = 4 - r.mc - r.written;
        reverse = random() < reverseWeight / (forwardWeight + reverseWeight);
      }
      const p = directionState(term, reverse);
      return { termId: term.id, reverse, priority: p.mc + p.written - Math.min(p.wrong, 3) * 0.15, jitter: random() };
    }).sort((a, b) => a.priority - b.priority || a.jitter - b.jitter).slice(0, count);
    return { queue: shuffle(candidates, random), total: count, completed: 0, attempts: 0, firstCorrect: 0, errors: [], retried: new Set(), answered: false, current: null };
  }
  function buildQuestion(set, item, settings, random = Math.random) {
    const term = set.terms.find(t => t.id === item.termId);
    const p = directionState(term, item.reverse);
    let mode = settings.mode === 'written' ? 'written' : settings.mode === 'mc' ? 'mc' : p.mc >= 1 ? 'written' : 'mc';
    const expected = item.reverse ? term.front : term.back, prompt = item.reverse ? term.back : term.front;
    const seen = new Set([normalize(expected)]);
    const distractors = shuffle(set.terms.filter(t => t.id !== term.id), random).map(t => item.reverse ? t.front : t.back).filter(value => {
      const n = normalize(value); if (seen.has(n) || matches(value, expected) || matches(expected, value)) return false; seen.add(n); return true;
    }).slice(0, 3);
    if (!distractors.length) mode = 'written';
    return { ...item, term, expected, prompt, mode, options: shuffle([expected, ...distractors], random) };
  }
  return { uid, shuffle, normalize, variants, matches, parseImport, cleanPairs, csvRows, directionState, mastery, setStats, recordAnswer, createRound, buildQuestion };
});
