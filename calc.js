// Taschenrechner für Rechnungswesen: Knopf in der Kopfleiste (oder Alt/⌥ + R), schwebendes Fenster,
// Ergebnis mit „In Feld übernehmen“ direkt ins zuletzt benutzte Betragsfeld.
(() => {
  // ---- Rechnen ----
  // Zahlen wie im Buch: „10.300“ und „1.234,56“ (Punkt = Tausender, Komma = Dezimal); „12.5“ geht auch.
  function toNumber(s) {
    if (s.includes(',')) {
      if ((s.match(/,/g) || []).length > 1 || /,.*\./.test(s)) throw new Error('Zahl falsch geschrieben');
      return Number(s.replace(/\./g, '').replace(',', '.'));
    }
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ''));
    if ((s.match(/\./g) || []).length > 1) throw new Error('Zahl falsch geschrieben');
    return Number(s);
  }
  function tokenize(src) {
    const text = String(src).replace(/€/g, '').replace(/[×xX*·]/g, '*').replace(/[÷:/]/g, '/').replace(/[−–]/g, '-'), out = [];
    for (let i = 0; i < text.length;) {
      const ch = text[i];
      if (/\s/.test(ch)) { i++; continue; }
      const m = text.slice(i).match(/^(\d[\d.,]*|[.,]\d+)/);
      if (m) { const raw = m[1].replace(/[.,]$/, ''); out.push({ t: 'n', v: toNumber(raw.startsWith(',') || raw.startsWith('.') ? `0${raw}` : raw) }); i += m[1].length; continue; }
      if ('+-*/()%'.includes(ch)) { out.push({ t: ch }); i++; continue; }
      throw new Error(`„${ch}“ kann ich nicht rechnen`);
    }
    return out;
  }
  // Prozent wie am Taschenrechner: 10.300 − 3 % = 9.991; 200 × 3 % = 6; 20 % allein = 0,2.
  function evaluate(src) {
    const tk = tokenize(src);
    if (!tk.length) throw new Error('leer');
    let i = 0;
    const peek = () => tk[i]?.t, eat = t => (peek() === t ? (i++, true) : false);
    function primary() {
      if (peek() === 'n') return tk[i++].v;
      if (eat('(')) { const v = expr(); eat(')'); return v; }
      throw new Error('unvollständig');
    }
    function unary() {
      if (eat('-')) { const x = unary(); return { v: -x.v, pct: x.pct }; }
      if (eat('+')) return unary();
      const v = primary();
      return eat('%') ? { v, pct: true } : { v, pct: false };
    }
    function term() {
      let x = unary();
      if (peek() !== '*' && peek() !== '/') return x;
      let v = x.pct ? x.v / 100 : x.v;
      while (peek() === '*' || peek() === '/') {
        const op = tk[i++].t, y = unary(), w = y.pct ? y.v / 100 : y.v;
        if (op === '*') v *= w; else { if (w === 0) throw new Error('Division durch 0'); v /= w; }
      }
      return { v, pct: false };
    }
    function expr() {
      const first = term();
      let v = first.pct ? first.v / 100 : first.v;
      while (peek() === '+' || peek() === '-') {
        const op = tk[i++].t, y = term(), w = y.pct ? v * y.v / 100 : y.v;
        v = op === '+' ? v + w : v - w;
      }
      return v;
    }
    const v = expr();
    if (i < tk.length) throw new Error(peek() === ')' ? 'Klammer zu viel' : 'unvollständig');
    if (!Number.isFinite(v)) throw new Error('Ergebnis zu groß');
    return Math.round(v * 1e10) / 1e10;
  }
  const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 10 }), nf2 = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const format = v => nf.format(Object.is(v, -0) ? 0 : v);
  const formatMoney = v => nf2.format(Math.round(v * 100) / 100 || 0);
  const api = { evaluate, format, formatMoney };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.WWCalc = api;
  if (typeof document === 'undefined') return;

  // ---- Fenster ----
  const KEY = 'wortwechsel.calc';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ open: !panel.hidden, pos, tape: tape.slice(0, 8) })); } catch {} };
  const saved = load();
  let pos = saved.pos && Number.isFinite(saved.pos.x) && Number.isFinite(saved.pos.y) ? saved.pos : null;
  let tape = Array.isArray(saved.tape) ? saved.tape.filter(x => x && typeof x.e === 'string' && Number.isFinite(x.v)).slice(0, 8) : [];
  let fresh = false, field = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svg = d => `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const CALC_ICON = '<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 6.5h8v3H8zM8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01"/>';
  const KEYS = [['C', 'clear', 'fn'], ['(', '(', 'fn'], [')', ')', 'fn'], ['⌫', 'back', 'fn'], ['7'], ['8'], ['9'], [':', ':', 'op'], ['4'], ['5'], ['6'], ['×', '×', 'op'], ['1'], ['2'], ['3'], ['−', '−', 'op'], ['0'], [',', ','], ['%', '%', 'op'], ['+', '+', 'op']];
  const CHIPS = [['+ USt', 1.2, '× 1,2: netto zu brutto'], ['− USt', 1 / 1.2, ': 1,2: brutto zu netto'], ['USt', 0.2, '× 0,2: 20 % Umsatzsteuer vom Nettobetrag']];

  const toggle = document.createElement('button');
  toggle.className = 'icon-button calc-toggle'; toggle.type = 'button'; toggle.id = 'calc-toggle';
  toggle.setAttribute('aria-label', 'Taschenrechner'); toggle.title = 'Taschenrechner (Alt + R)'; toggle.setAttribute('aria-pressed', 'false'); toggle.setAttribute('aria-controls', 'calc');
  toggle.innerHTML = svg(CALC_ICON);
  document.querySelector('.topbar-right')?.prepend(toggle);
  // Am Handy ist die Kopfleiste voll (Fach-Umschalter): dort ein runder Knopf über der Tab-Leiste.
  const fab = document.createElement('button');
  fab.className = 'calc-fab'; fab.type = 'button'; fab.setAttribute('aria-label', 'Taschenrechner öffnen'); fab.setAttribute('aria-controls', 'calc');
  fab.innerHTML = svg(CALC_ICON);
  document.body.append(fab);

  const panel = document.createElement('section');
  panel.id = 'calc'; panel.className = 'calc'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Taschenrechner');
  panel.innerHTML = `<header class="calc-head"><span class="calc-grip" aria-hidden="true"></span><strong>Rechner</strong><button type="button" class="calc-x" data-c="close" aria-label="Rechner schließen" title="Schließen (Esc)">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></header>
    <ol class="calc-tape" aria-label="Letzte Rechnungen"></ol>
    <div class="calc-screen"><input id="calc-expr" class="calc-expr" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" aria-label="Rechnung" placeholder="0"><output class="calc-out" id="calc-out" for="calc-expr" aria-live="polite"></output></div>
    <div class="calc-chips">${CHIPS.map(([t, , title], k) => `<button type="button" data-c="chip" data-k="${k}" title="${esc(title)}">${esc(t)}</button>`).join('')}</div>
    <div class="calc-keys">${KEYS.map(([t, v = t, cls = '']) => `<button type="button" class="${cls}" data-c="${v === 'clear' || v === 'back' ? v : 'key'}" data-v="${esc(v)}"${v === 'back' ? ' aria-label="Löschen"' : v === 'clear' ? ' aria-label="Alles löschen"' : ''}>${esc(t)}</button>`).join('')}<button type="button" class="eq" data-c="eq" aria-label="Ergebnis">=</button></div>
    <button type="button" class="calc-take" data-c="take" disabled>${svg('<path d="M5 12h12m-5-5 5 5-5 5"/>')}<span>In Feld übernehmen</span></button>`;
  document.body.append(panel);
  const input = panel.querySelector('#calc-expr'), out = panel.querySelector('#calc-out'), tapeEl = panel.querySelector('.calc-tape'), take = panel.querySelector('.calc-take');
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  if (coarse) input.setAttribute('inputmode', 'none');

  const isRw = () => document.body.classList.contains('subject-rw');
  const isField = el => el && el.tagName === 'INPUT' && el.getAttribute('inputmode') === 'decimal' && !panel.contains(el);
  const result = () => { try { return evaluate(input.value); } catch { return null; } };
  function preview() {
    const v = input.value.trim();
    if (!v) { out.textContent = ''; out.className = 'calc-out'; }
    else {
      try { const r = evaluate(v); out.textContent = `= ${format(r)}`; out.className = 'calc-out'; }
      catch (e) { const soft = /unvollständig|leer/.test(e.message); out.textContent = soft ? '' : e.message; out.className = soft ? 'calc-out' : 'calc-out bad'; }
    }
    const ok = field?.isConnected && result() !== null;
    take.disabled = !ok;
    take.title = field?.isConnected ? 'Ergebnis mit 2 Kommastellen in das zuletzt benutzte Betragsfeld schreiben' : 'Tippe zuerst in ein Betragsfeld';
  }
  function drawTape() {
    tapeEl.innerHTML = tape.slice(0, 4).map((x, i) => ({ x, i })).reverse().map(({ x, i }) => `<li><button type="button" data-c="tape" data-i="${i}" title="Ergebnis einsetzen"><span>${esc(x.e)}</span><b>= ${esc(format(x.v))}</b></button></li>`).join('');
    tapeEl.hidden = !tape.length;
  }
  function insert(text) {
    if (fresh && /^[\d,(]/.test(text)) input.value = '';
    fresh = false;
    const a = input.selectionStart ?? input.value.length, b = input.selectionEnd ?? a, at = document.activeElement === input ? [a, b] : [input.value.length, input.value.length];
    input.value = input.value.slice(0, at[0]) + text + input.value.slice(at[1]);
    const c = at[0] + text.length;
    try { input.setSelectionRange(c, c); } catch {}
    preview();
  }
  function remember(e, v) { tape.unshift({ e, v }); tape = tape.slice(0, 8); drawTape(); save(); }
  function equals() {
    const e = input.value.trim(); if (!e) return;
    let v; try { v = evaluate(e); } catch (err) { out.textContent = /unvollständig|leer/.test(err.message) ? 'Rechnung unvollständig' : err.message; out.className = 'calc-out bad'; return; }
    if (e !== format(v)) remember(e, v);
    input.value = format(v); fresh = true; preview();
  }
  function chip(k) {
    const [label, factor] = CHIPS[k], v0 = result(); if (v0 === null) return equals();
    const v = Math.round(v0 * factor * 1e10) / 1e10;
    remember(`${format(v0)} ${label === 'USt' ? '× 0,2' : label === '+ USt' ? '× 1,2' : ': 1,2'}`, v);
    input.value = format(v); fresh = true; preview();
  }
  function takeOver() {
    const v = result(); if (v === null || !field?.isConnected) return;
    if (input.value.trim() !== format(v)) remember(input.value.trim(), v);
    field.value = formatMoney(v);
    // „focusout“ lässt den Trainer das Feld sofort prüfen, wie nach dem Tippen und Weitergehen.
    for (const type of ['input', 'focusout']) field.dispatchEvent(new window.Event(type, { bubbles: true }));
    field.classList.add('calc-filled'); setTimeout(() => field?.classList.remove('calc-filled'), 900);
    input.value = format(v); fresh = true; preview();
  }
  function place() {
    if (!pos || window.innerWidth <= 540) { panel.style.left = panel.style.top = ''; panel.classList.remove('moved'); return; }
    const w = panel.offsetWidth || 300, h = panel.offsetHeight || 460;
    pos = { x: Math.min(Math.max(8, pos.x), window.innerWidth - w - 8), y: Math.min(Math.max(8, pos.y), window.innerHeight - h - 8) };
    panel.style.left = `${pos.x}px`; panel.style.top = `${pos.y}px`; panel.classList.add('moved');
  }
  function setOpen(open, focus = true) {
    panel.hidden = !open; toggle.setAttribute('aria-pressed', String(open)); toggle.classList.toggle('on', open); fab.hidden = open;
    if (open) { place(); preview(); if (focus && !coarse) input.focus(); }
    else if (panel.contains(document.activeElement)) toggle.focus();
    save();
  }

  // Tasten nehmen den Fokus nicht weg: So bleibt das Betragsfeld im Trainer unangetastet, bis du übernimmst.
  panel.addEventListener('pointerdown', e => { if (e.target.closest('button')) e.preventDefault(); });
  panel.addEventListener('click', e => {
    const b = e.target.closest('[data-c]'); if (!b) return;
    const c = b.dataset.c;
    if (c === 'close') return setOpen(false);
    if (c === 'key') return insert(b.dataset.v);
    if (c === 'clear') { input.value = ''; fresh = false; return preview(); }
    if (c === 'back') { fresh = false; const a = input.selectionStart ?? input.value.length, z = input.selectionEnd ?? a; if (document.activeElement === input && a !== z) input.value = input.value.slice(0, a) + input.value.slice(z); else input.value = input.value.slice(0, -1); return preview(); }
    if (c === 'eq') return equals();
    if (c === 'chip') return chip(Number(b.dataset.k));
    if (c === 'take') return takeOver();
    if (c === 'tape') { const x = tape[Number(b.dataset.i)]; if (x) insert(format(x.v)); }
  });
  input.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') { e.preventDefault(); return equals(); }
    if (e.key === 'Escape') { e.preventDefault(); return setOpen(false); }
    const map = { '*': '×', '/': ':', '-': '−' };
    if (map[e.key] && !e.ctrlKey && !e.metaKey) { e.preventDefault(); fresh = false; return insert(map[e.key]); }
    if (fresh && /^[\d,]$/.test(e.key)) { input.value = ''; fresh = false; }
    else if (e.key.length === 1) fresh = false;
  });
  input.addEventListener('input', e => { e.stopPropagation(); preview(); });
  input.addEventListener('focusout', e => e.stopPropagation());
  toggle.addEventListener('click', () => setOpen(panel.hidden));
  fab.addEventListener('click', () => setOpen(true));
  document.addEventListener('focusin', e => { if (isField(e.target)) { field = e.target; if (!panel.hidden) preview(); } });
  document.addEventListener('keydown', e => {
    if (e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyR' && isRw() && !document.querySelector('dialog[open]')) { e.preventDefault(); setOpen(panel.hidden); }
  }, true);

  // Ziehen am Kopf (nur auf großen Bildschirmen; am Handy ist der Rechner ein Blatt über der Tab-Leiste).
  const head = panel.querySelector('.calc-head');
  head.addEventListener('pointerdown', e => {
    if (e.target.closest('button') || window.innerWidth <= 540) return;
    const r = panel.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    try { head.setPointerCapture(e.pointerId); } catch {} panel.classList.add('dragging');
    const move = ev => { pos = { x: ev.clientX - dx, y: ev.clientY - dy }; place(); };
    const up = () => { panel.classList.remove('dragging'); head.removeEventListener('pointermove', move); head.removeEventListener('pointerup', up); head.removeEventListener('pointercancel', up); save(); };
    head.addEventListener('pointermove', move); head.addEventListener('pointerup', up); head.addEventListener('pointercancel', up);
  });
  head.addEventListener('dblclick', () => { pos = null; place(); save(); });
  window.addEventListener('resize', () => { if (!panel.hidden) place(); });

  drawTape(); preview();
  if (saved.open) setOpen(true, false);
})();
