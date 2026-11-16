// Buchungstrainer: whole cases in the style of the book's exercises. Every document gets booking lines
// (account and amount on each side), and every field is checked as soon as it is left.
(() => {
  const R = window.WWRw, T = R.trainer, M = window.WWMath, { rich } = M;
  const VIEW = 'rw-trainer';
  window.WWTrainer = { create(ctx) {
    const { $, esc, icon, confirm, reduced, shell, save, ring, countAnswer } = ctx;
    const stats = () => { const d = ctx.data(); if (!d.rwt) d.rwt = {}; return d.rwt; };
    const fine = () => !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    let cur = null;
    const course = { subject: 'Rechnungswesen', key: 'rwt' };
    const eur = v => T.eur(v);

    function leave() { cur = null; }

    // ---- Overview ----
    function home() {
      leave(); shell(VIEW, 'Buchungstrainer');
      const st = stats(), runs = Object.values(st).reduce((s, x) => s + x.runs, 0), done = Object.values(st).reduce((s, x) => s + x.bookings, 0);
      $('#main').innerHTML = `<button class="back-link" data-action="m-home">${icon('back')} Rechnungswesen</button>
        <section class="page-intro"><div><h1>Buchungstrainer<span class="blue-dot">.</span></h1><p>Ganze Fälle wie im Buch: Beleg lesen, Konto und Betrag eintragen. Jedes Feld wird sofort geprüft, und jeder Fall hat neue Zahlen.</p></div><button class="button primary" data-action="t-random">${icon('spark')}Zufälliger Fall</button></section>
        <section class="tr-how">${[['1', 'Konto tippen', 'Nummer oder Name, zum Beispiel „04“ oder „Masch“. Die Liste ist der Kontenplan aus dem Buch.'], ['2', 'Betrag eintragen', '„1615,2“, „1.615,20“ oder „€ 1.615,20“, alles geht. Enter springt weiter.'], ['3', 'Beleg für Beleg', 'Manchmal steht der Fall als Text da, manchmal als echte Rechnung, Kassenbon oder Kontoauszug. Grün heißt richtig, dann kommt der nächste Beleg.']].map(([n, t, p], i) => `<article style="--i:${i}"><span>${n}</span><strong>${t}</strong><p>${p}</p></article>`).join('')}</section>
        ${runs ? `<p class="tr-total">${runs} ${runs === 1 ? 'Fall' : 'Fälle'} gelöst · ${done} Buchungen richtig</p>` : ''}
        <section class="library-section"><div class="section-heading"><div><h2>Fälle <span class="count-badge">${T.TEMPLATES.length}</span></h2></div></div><div class="set-grid tr-cases">${T.TEMPLATES.map((t, i) => { const s = st[t.id]; return `<article class="set-card" style="--i:${i}"><div class="set-card-top"><div class="set-emoji tone-${i % 3}">${window.WWRwCourse.fig(t.fig)}</div>${s?.runs ? `<span class="qa-level l3"><i></i>${s.best}%</span>` : '<span class="qa-level l0"><i></i>Neu</span>'}</div><button class="set-title" data-action="t-open" data-tpl="${t.id}">${esc(t.title)}</button><div class="set-meta">${esc(t.sub)}</div><div class="set-progress-label"><span>${s?.runs ? `${s.runs}× gelöst` : 'Noch nicht geübt'}</span><strong>${s?.runs ? `${s.perfect}× fehlerfrei` : ''}</strong></div><div class="set-card-footer"><button class="text-button" data-action="t-open" data-tpl="${t.id}">Fall starten</button><button class="round-button" data-action="t-open" data-tpl="${t.id}" aria-label="${esc(t.title)} starten">${icon('arrow')}</button></div></article>`; }).join('')}</div></section>`;
    }

    // ---- One case ----
    function open(id, seed = Math.floor(Math.random() * 2 ** 31)) {
      leave();
      const c = T.makeCase(id, seed), entries = [];
      const base = { effect: null, none: false, state: 'open', wrong: false, helped: false, hints: 0, vals: {} };
      for (const x of T.caseEntries(c)) entries.push(x.kind === 'book' ? { ...base, ...x, rows: Array.from({ length: rowsOf(x.b) }, () => ({ sa: '', sb: '', ha: '', hb: '' })) } : { ...base, ...x, vals: {} });
      cur = { c, entries, touched: false, finished: false, started: Date.now() };
      draw();
    }
    const rowsOf = b => Math.max(b.soll.length, b.haben.length, 1);
    const helpOf = e => e.kind === 'book' ? [...e.b.hint, ...e.b.calc] : [...(e.spec.hint || []), ...(e.spec.calc || [])];
    const tools = () => `<div class="tr-tools"><button type="button" class="text-button" data-action="t-hint">${icon('spark')}Tipp</button><button type="button" class="text-button" data-action="t-solve">Lösung</button></div>`;
    const badges = () => `<span class="tr-badge" aria-hidden="true">${icon('check')}</span><span class="tr-burst" aria-hidden="true"></span>`;
    const numIn = (k, cls = 'tr-v', label = '') => `<input type="text" class="tr-in ${cls}" data-k="${k}" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="${esc(label)}">`;
    // Depreciation table laid out like the book's Excel template.
    function afaHtml(e, ei) {
      const sp = e.spec, last = sp.rows.length - 1;
      return `<div class="tr-book tr-afa" data-e="${ei}">${badges()}
        <div class="ta-head"><strong>${esc(sp.label)}</strong><span>Lineare<br>Abschreibung</span></div>
        <div class="ta-grid">
          <span class="ta-y"></span><span class="ta-t">Anschaffungswert ${sp.rows[0].year}</span><span class="ta-p"></span><span class="tr-eur">€</span>${numIn('aw', 'tr-v', `Anschaffungswert ${sp.label}`)}
          ${sp.rows.map((row, i) => `<span class="ta-y">${i + 1}. Jahr</span><b class="ta-t">Abschreibung ${row.year}</b><span class="ta-p">${numIn(`p${i}`, 'tr-p', `Abschreibungssatz ${row.year} in Prozent`)}<i>%</i></span><span class="tr-eur">−&nbsp;€</span>${numIn(`a${i}`, 'tr-v', `Abschreibung ${row.year}`)}
          <span class="ta-y"></span><span class="ta-t ta-bw">Buchwert ${i === last && sp.endOfLife ? `31.12.${row.year}` : `1.1.${row.year + 1}`}</span><span class="ta-p"></span><span class="tr-eur">€</span>${numIn(`b${i}`, 'tr-v', `Buchwert nach ${row.year}`)}`).join('')}
        </div>
        <div class="tr-foot"><p class="tr-msg" role="status"></p>${tools()}</div><div class="tr-more" hidden></div></div>`;
    }
    function valHtml(e, ei) {
      return `<div class="tr-book tr-val" data-e="${ei}">${badges()}<div class="tv-in"><span>Wertansatz</span><span class="tr-eur">€</span>${numIn('v', 'tr-v', 'Wertansatz in Euro')}</div><div class="tr-foot"><p class="tr-msg" role="status"></p>${tools()}</div><div class="tr-more" hidden></div></div>`;
    }
    const entryHtml = (e, ei) => e.kind === 'afa' ? afaHtml(e, ei) : e.kind === 'val' ? valHtml(e, ei) : bookingHtml(e, ei);
    const entryOf = el => { const box = el.closest('.tr-book'); return box && cur ? cur.entries[Number(box.dataset.e)] : null; };
    const tableHtml = t => t ? `<div class="m-table-wrap"><table class="m-table rows"><tbody>${t.rows.map((r, i) => `<tr>${r.map(c => i === 0 ? `<th>${esc(c)}</th>` : `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';
    function lineHtml(side, r, first) {
      const k = side === 's' ? 's' : 'h';
      return `<div class="tr-line"><div class="tr-acc"><input type="text" class="tr-in tr-a" data-k="${k}a" data-r="${r}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="next" ${first ? `placeholder="${side === 's' ? 'Soll-Konto' : 'Haben-Konto'}"` : ''} aria-label="${side === 's' ? 'Soll' : 'Haben'}-Konto, Zeile ${r + 1}" role="combobox" aria-expanded="false" aria-autocomplete="list"><ul class="tr-dd" role="listbox" hidden></ul></div><span class="tr-eur" aria-hidden="true">€</span><input type="text" class="tr-in tr-v" data-k="${k}b" data-r="${r}" inputmode="decimal" autocomplete="off" enterkeyhint="next" aria-label="${side === 's' ? 'Soll' : 'Haben'}-Betrag, Zeile ${r + 1}"></div>`;
    }
    function bookingHtml(e, ei) {
      const b = e.b, n = rowsOf(b);
      return `<div class="tr-book" data-e="${ei}">
        ${b.label ? `<div class="tr-label">${esc(b.label)}</div>` : ''}<span class="tr-badge" aria-hidden="true">${icon('check')}</span><span class="tr-burst" aria-hidden="true"></span>
        <div class="tr-rows"><div class="tr-side">${Array.from({ length: n }, (_, r) => lineHtml('s', r, r === 0)).join('')}</div><div class="tr-slash" aria-hidden="true"><svg viewBox="0 0 20 100" preserveAspectRatio="none"><line x1="15" y1="3" x2="5" y2="97" pathLength="1"/></svg><span>an</span></div><div class="tr-side">${Array.from({ length: n }, (_, r) => lineHtml('h', r, r === 0)).join('')}</div></div>
        <div class="tr-foot">${b.effect !== null ? `<div class="tr-effect" role="group" aria-label="Auswirkung auf das Eigenkapital"><span>Eigenkapital</span>${[['↑', 'vermehrt'], ['Ø', 'erfolgsneutral'], ['↓', 'vermindert']].map(([v, t]) => `<button type="button" data-action="t-effect" data-v="${v}" aria-pressed="false" title="${t}">${v}</button>`).join('')}</div>` : ''}${cur.c.allowNone ? '<button type="button" class="tr-none" data-action="t-none" aria-pressed="false">Keine Buchung</button>' : ''}<p class="tr-msg" role="status"></p><div class="tr-tools"><button type="button" class="text-button" data-action="t-hint">${icon('spark')}Tipp</button><button type="button" class="text-button" data-action="t-solve">Lösung</button></div></div>
        <div class="tr-more" hidden></div></div>`;
    }
    // ---- Vouchers: invoice, receipt, bank statement, internal voucher ----
    const money = v => `${v < 0 ? '−' : ''}${eur(Math.abs(v))}`;
    const initials = name => name.replace(/\b(GmbH|AG|KG|OG|e\. U\.|Inc\.|Corp\.|LLC|&)\b/g, '').split(/[\s-]+/).filter(w => /^[A-ZÄÖÜ]/.test(w)).slice(0, 2).map(w => w[0]).join('') || name[0];
    const addr = p => `${esc(p.street)} · ${esc(p.zip)} ${esc(p.town)}`;
    // Decorative stand-in for the cash register QR code: a random pattern with the three corner squares, it encodes nothing.
    function fakeQr(seed) {
      let x = seed >>> 0; const rnd = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
      const n = 21, cells = []; const finder = (a, b) => a < 7 && b < 7;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (finder(i, j) || finder(n - 1 - i, j) || finder(i, n - 1 - j)) continue; if (rnd() < 0.48) cells.push(`M${j} ${i}h1v1h-1z`); }
      const sq = (cx, cy) => `M${cx} ${cy}h7v7h-7zM${cx + 1} ${cy + 1}v5h5v-5zM${cx + 2} ${cy + 2}h3v3h-3z`;
      return `<svg class="bl-qr" viewBox="-1 -1 23 23" aria-hidden="true"><path fill-rule="evenodd" d="${sq(0, 0)}${sq(14, 0)}${sq(0, 14)}${cells.join('')}"/></svg>`;
    }
    function docHtml(doc, beleg) {
      const stamp = beleg ? `<span class="bl-stamp">${esc(beleg)}</span>` : '';
      if (doc.kind === 'invoice') {
        const f = doc.from;
        return `<figure class="bl bl-inv tone-${f.tone}" aria-label="Rechnung von ${esc(f.name)}">${stamp}
          <header class="bl-head"><div class="bl-brand"><i>${esc(initials(f.name))}</i><div><strong>${esc(f.name)}</strong><small>${addr(f)}</small></div></div><div class="bl-kind">Rechnung</div></header>
          <div class="bl-meta"><div class="bl-to"><small>Rechnung an</small><strong>${esc(doc.to.name)}</strong><span>${esc(doc.to.street)}</span><span>${esc(doc.to.zip)} ${esc(doc.to.town)}</span><span>Ihre UID: ${esc(doc.to.uid)}</span></div>
          <dl><dt>Rechnungs-Nr.</dt><dd>${esc(doc.no)}</dd><dt>Datum</dt><dd>${esc(doc.date)}</dd>${doc.delivery ? `<dt>Lieferdatum</dt><dd>${esc(doc.delivery)}</dd>` : ''}<dt>Unsere UID</dt><dd>${esc(f.uid)}</dd></dl></div>
          <table class="bl-items"><thead><tr><th>Menge</th><th>Bezeichnung</th><th class="n">Einzelpreis</th><th class="n">Gesamt</th></tr></thead><tbody>${doc.lines.map(l => `<tr><td>${l.qty} ${esc(l.unit)}</td><td>${esc(l.text)}${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</td><td class="n">${eur(l.each)}</td><td class="n">${eur(l.total)}</td></tr>`).join('')}</tbody></table>
          <div class="bl-sum">${doc.grossOnly ? `<div class="bl-total"><span>Rechnungsbetrag</span><b>€ ${eur(doc.gross)}</b></div>` : `${doc.rab ? `<div><span>Summe</span><b>${eur(doc.sum)}</b></div><div><span>− ${doc.rab} % Rabatt</span><b>${eur(doc.disc)}</b></div>` : ''}<div><span>Nettobetrag</span><b>${eur(doc.net)}</b></div><div><span>+ 20 % USt</span><b>${eur(doc.vat)}</b></div><div class="bl-total"><span>Rechnungsbetrag</span><b>€ ${eur(doc.gross)}</b></div>`}</div>
          <footer class="bl-foot">${doc.foot ? `<p><b>${esc(doc.foot)}</b></p>` : ''}<p>${esc(doc.terms)}</p><p>${esc(f.bank)} · IBAN ${esc(f.iban)}</p></footer></figure>`;
      }
      if (doc.kind === 'receipt') {
        const sh = doc.shop;
        return `<figure class="bl bl-rcpt" aria-label="Kassenbon von ${esc(sh.name)}">${stamp}<div class="bl-rcpt-paper">
          <header><strong>${esc(sh.name)}</strong><span>${esc(sh.street)}</span><span>${esc(sh.zip)} ${esc(sh.town)}</span><span>UID ${esc(sh.uid)}</span></header>
          <div class="bl-rule"></div>${doc.items.map(it => `<div class="bl-row"><span>1 × ${esc(it.text)}</span><b>${eur(it.price)}</b></div>`).join('')}<div class="bl-rule"></div>
          <div class="bl-row bl-big"><span>SUMME EUR</span><b>${eur(doc.total)}</b></div>
          <div class="bl-tax"><span>Satz</span><span>Netto</span><span>Steuer</span><span>Brutto</span><span>A 20 %</span><span>${eur(doc.net)}</span><span>${eur(doc.vat)}</span><span>${eur(doc.total)}</span></div>
          <div class="bl-rule"></div>${doc.given ? `<div class="bl-row"><span>BAR</span><b>${eur(doc.given)}</b></div><div class="bl-row"><span>Rückgeld</span><b>${eur(doc.back)}</b></div>` : `<div class="bl-row"><span>Bezahlt mit ${esc(doc.pay)}</span><b>${eur(doc.total)}</b></div><div class="bl-row bl-small"><span>${esc(doc.pay === 'Kreditkarte' ? 'Firmen-Kreditkarte' : 'Firmen-Debitkarte')} ${esc(doc.card)}</span><span>genehmigt</span></div>`}
          <footer><span>Bon ${esc(doc.no)} · ${esc(doc.date)} ${esc(doc.time)}</span>${fakeQr(doc.seed)}<span>Danke für Ihren Einkauf!</span></footer></div></figure>`;
      }
      if (doc.kind === 'bank') {
        return `<figure class="bl bl-bank" aria-label="Kontoauszug">${stamp}
          <header class="bl-head"><div class="bl-brand bl-bankname"><i>${esc(initials(doc.bank))}</i><div><strong>${esc(doc.bank)}</strong><small>Kontoauszug Nr. ${doc.no}</small></div></div><div class="bl-kind">Kontoauszug</div></header>
          <div class="bl-acct"><span>Kontoinhaber: <b>${esc(doc.holder)}</b></span><span>IBAN ${esc(doc.iban)}</span></div>
          <table class="bl-items"><thead><tr><th>Datum</th><th>Buchungstext</th><th class="n">Betrag</th></tr></thead><tbody>
            <tr class="bl-bal"><td></td><td>Alter Kontostand</td><td class="n">${money(doc.old)}</td></tr>
            ${doc.rows.map(x => `<tr><td>${esc(x.date)}</td><td>${esc(x.text)}${x.ref ? `<small>${esc(x.ref)}</small>` : ''}</td><td class="n ${x.amount < 0 ? 'neg' : 'pos'}">${money(x.amount)}</td></tr>`).join('')}
            <tr class="bl-bal"><td></td><td>Neuer Kontostand</td><td class="n"><b>${money(doc.now)}</b></td></tr></tbody></table></figure>`;
      }
      if (doc.kind === 'own') {
        return `<figure class="bl bl-own" aria-label="Eigenbeleg">${stamp}
          <header class="bl-head"><div class="bl-brand"><i>EB</i><div><strong>Eigenbeleg ${esc(doc.no)}</strong><small>${esc(doc.holder)}</small></div></div><div class="bl-kind">${esc(doc.title)}</div></header>
          <dl class="bl-own-rows"><dt>Datum</dt><dd>${esc(doc.date)}</dd>${doc.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
          <footer class="bl-sign"><svg viewBox="0 0 160 40" aria-hidden="true"><path d="M6 28c10-14 18-20 22-12s-8 16-2 14 12-22 20-18-6 18 2 16 14-16 22-12 2 12 10 10 16-10 24-8 12 6 22 2"/></svg><span>${esc(doc.sign)}, Inhaberin</span></footer></figure>`;
      }
      return '';
    }
    const stepHead = s => s.date ? `<b>${esc(s.date)}${s.beleg ? `&nbsp;&nbsp;${esc(s.beleg)}` : ''}</b> ` : '';
    function stepHtml(s, si, ei) {
      const mine = () => { const out = []; while (ei.n < cur.entries.length && cur.entries[ei.n].si === si) { out.push(entryHtml(cur.entries[ei.n], ei.n)); ei.n++; } return out.join(''); };
      if (cur.c.layout === 'table') {
        const head = s.groupTitle ? `<div class="tv-group"><span>${s.group}.</span>${esc(s.groupTitle)}</div>` : '';
        const books = (s.bookings || []).length;
        return `<li class="tr-step tv-row" data-step="${si}" hidden>${head}<div class="tv-line"><p class="tv-text">${rich(s.text)}</p><span class="tv-per"><small>per</small>${esc(s.per)}</span></div>${mine().replace('<div class="tr-book tr-val"', `<div class="tr-book tr-val${books ? '' : ' tv-solo'}"`)}${books ? '' : '<p class="tv-nobook">Hier ist nur der Wertansatz gefragt.</p>'}</li>`;
      }
      const chip = s.part ? `<span class="tr-part">${s.part})</span>` : '';
      const body = s.info
        ? `<div class="tr-info">${icon('book')}<div><p>${rich(s.info)}</p>${s.calc?.length ? `<details class="tr-calc"><summary>Nebenrechnung zeigen</summary>${s.calc.map(x => `<p>${rich(x)}</p>`).join('')}</details>` : ''}</div></div>`
        : s.asDoc && s.doc ? `<p class="tr-doc">${chip}${stepHead(s)}${rich(s.lead)}</p>${docHtml(s.doc, s.beleg)}` : `<p class="tr-doc">${chip}${stepHead(s)}${s.text ? rich(s.text) : ''}</p>`;
      return `<li class="tr-step${s.info ? ' tr-step-info' : ''}${s.asDoc ? ' has-doc' : ''}${s.afa ? ' has-afa' : ''}" data-step="${si}" hidden>${body}${tableHtml(s.table)}${mine()}</li>`;
    }
    function draw() {
      const c = cur.c;
      shell(VIEW, 'Buchungstrainer');
      const counter = { n: 0 };
      $('#main').innerHTML = `<section class="tr-case">
        <div class="qa-test-bar tr-bar"><button class="back-link" data-action="t-exit">${icon('back')}Trainer</button><div class="qa-test-title"><strong>${esc(c.company)}</strong><small id="tr-status"></small></div><div class="tr-meter" aria-hidden="true"><span id="tr-meter"></span></div><button class="icon-button" data-action="t-new" aria-label="Neuer Fall" title="Neuer Fall mit neuen Zahlen">${icon('swap')}</button></div>
        <header class="tr-head"><div class="eyebrow">BUCHUNGSTRAINER · ${esc(c.sub.toUpperCase())}</div><h1>${esc(c.title)}</h1><p class="tr-intro">${rich(c.intro)}</p>${c.tasks ? `<div class="tr-tasks"><b>Aufgabe:</b><ol${c.tasks.length > 1 ? ' type="a"' : ' class="single"'}>${c.tasks.map(t => `<li>${rich(t)}</li>`).join('')}</ol></div>` : ''}</header>
        <ol class="tr-steps">${c.steps.map((s, si) => stepHtml(s, si, counter)).join('')}</ol>
        <div class="tr-next" id="tr-next" aria-live="polite"></div>
        <div class="tr-actions"><button class="button primary" data-action="t-new">Neuer Fall ${icon('arrow')}</button></div></section>`;
      cur.shown = -1;
      unlock(false);
      progress();
    }
    // One document after the other: the next one appears once every booking of the current one is done.
    const stepDone = si => cur.entries.every(e => e.si !== si || e.state !== 'open');
    function unlock(move = true) {
      if (!cur) return;
      const steps = cur.c.steps, before = cur.shown;
      let k = 0;
      const hasWork = i => cur.entries.some(e => e.si === i);
      while (k < steps.length) { if (hasWork(k) && !stepDone(k)) break; k++; }
      // Info boxes come together with the next document that needs a booking.
      const upto = Math.min(steps.length - 1, k);
      if (upto <= before) return;
      cur.shown = upto;
      const fresh = [];
      for (let i = before + 1; i <= upto; i++) { const li = document.querySelector(`.tr-step[data-step="${i}"]`); if (!li) continue; li.hidden = false; fresh.push(li); }
      const go = () => fresh.forEach((li, n) => { li.style.setProperty('--d', `${n * 90}ms`); li.classList.add('in'); });
      if (reduced()) go(); else requestAnimationFrame(() => requestAnimationFrame(go));
      const left = steps.slice(upto + 1).filter((s, i) => hasWork(upto + 1 + i)).length, next = document.querySelector('#tr-next'), table = cur.c.layout === 'table';
      if (next) next.innerHTML = left ? `<span>${icon('lock')}</span><p>Noch ${left} ${table ? (left === 1 ? 'Zeile' : 'Zeilen') : left === 1 ? 'Schritt' : 'Schritte'}. ${table ? 'Die nächste Zeile erscheint, wenn diese stimmt.' : 'Der nächste erscheint, wenn dieser stimmt.'}</p>` : '';
      if (move && fresh.length) {
        const target = fresh.find(li => li.querySelector('.tr-book')) || fresh[0];
        setTimeout(() => { target.scrollIntoView?.({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); if (fine()) target.querySelector('.tr-book:not(.done):not(.shown) .tr-in')?.focus({ preventScroll: true }); }, reduced() ? 0 : 420);
      }
    }
    function progress() {
      if (!cur) return;
      const all = cur.entries.length, ok = cur.entries.filter(e => e.state === 'ok').length, shown = cur.entries.filter(e => e.state === 'shown').length;
      const status = document.querySelector('#tr-status'), meter = document.querySelector('#tr-meter');
      if (status) status.textContent = `${ok + shown} von ${all} erledigt${shown ? ` · ${shown} mit Lösung` : ''}`;
      if (meter) meter.style.width = `${Math.round((ok + shown) / all * 100)}%`;
      if (ok + shown === all && !cur.finished) finish();
    }

    // ---- Fields ----
    const fieldEl = (box, k, r) => box.querySelector(r === undefined ? `.tr-in[data-k="${k}"]` : `.tr-in[data-k="${k}"][data-r="${r}"]`);
    const store = (e, el) => { if (e.kind === 'book') e.rows[Number(el.dataset.r)][el.dataset.k] = el.value; else e.vals[el.dataset.k] = el.value; };
    function setField(el, state) {
      const was = el.classList.contains('ok') ? 'ok' : el.classList.contains('bad') ? 'bad' : '';
      if (was === state) return;
      el.classList.remove('ok', 'bad');
      if (!state) return;
      void el.offsetWidth;
      el.classList.add(state);
    }
    function grade(box, { settle = true } = {}) {
      const e = cur.entries[Number(box.dataset.e)];
      if (!e || e.state !== 'open') return;
      if (e.kind !== 'book') {
        const g = e.kind === 'afa' ? T.gradeAfa(e.spec, e.vals) : T.gradeVal(e.spec, e.vals);
        let bad = false;
        for (const [k, st] of Object.entries(g.fields)) { const el = fieldEl(box, k); if (!el) continue; const state = st === 'bad' && !settle && document.activeElement === el ? '' : st; setField(el, state); if (state === 'bad') bad = true; }
        box.querySelector('.tr-msg').textContent = g.msgs[0] || '';
        if (bad) e.wrong = true;
        if (g.complete) solved(box, e);
        return;
      }
      const g = T.gradeBooking(e.b, e, cur.c.names);
      let bad = false;
      g.fields.forEach((f, r) => { for (const k of ['sa', 'sb', 'ha', 'hb']) { const el = fieldEl(box, k, r); if (!el) continue; const state = f[k] === 'bad' && !settle && document.activeElement === el ? '' : f[k]; setField(el, state); if (state === 'bad') bad = true; } });
      box.querySelectorAll('[data-action="t-effect"]').forEach(btn => { btn.classList.remove('ok', 'bad'); if (btn.dataset.v === e.effect && g.effect) btn.classList.add(g.effect); });
      if (g.effect === 'bad') bad = true;
      const noneBtn = box.querySelector('.tr-none');
      if (noneBtn) { noneBtn.classList.remove('ok', 'bad'); if (g.none) noneBtn.classList.add(g.none); if (g.none === 'bad') bad = true; }
      box.querySelector('.tr-msg').textContent = g.msgs[0] || '';
      if (bad) e.wrong = true;
      if (g.complete) solved(box, e);
    }
    function burst(box) {
      if (reduced()) return;
      const host = box.querySelector('.tr-burst');
      host.innerHTML = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, d = 34 + (i % 3) * 14; return `<i style="--x:${(Math.cos(a) * d).toFixed(1)}px;--y:${(Math.sin(a) * d).toFixed(1)}px;--d:${i * 12}ms"></i>`; }).join('');
      setTimeout(() => { host.innerHTML = ''; }, 900);
    }
    function lock(box) { box.querySelectorAll('input, .tr-effect button, .tr-none').forEach(el => { if (el.tagName === 'INPUT') el.readOnly = true; else el.disabled = true; }); box.querySelectorAll('.tr-tools').forEach(el => el.remove()); }
    function solved(box, e) {
      e.state = 'ok'; cur.touched = true;
      box.classList.add('done'); lock(box); burst(box);
      if (box.contains(document.activeElement) && !fine()) document.activeElement.blur?.();
      box.querySelector('.tr-msg').textContent = e.wrong || e.helped ? 'Stimmt jetzt.' : ['Richtig gebucht.', 'Genau so.', 'Sitzt.'][Math.floor(Math.random() * 3)];
      countAnswer(); save();
      progress();
      // Another booking of the same document comes first, then the next document.
      const sameStep = box.closest('.tr-step')?.querySelector('.tr-book:not(.done):not(.shown)');
      if (sameStep) { if (fine()) sameStep.querySelector('.tr-in')?.focus({ preventScroll: true }); return; }
      unlock();
    }
    const pct = v => `${String(Math.round(v * 100) / 100).replace('.', ',')}`;
    function fill(box, e) {
      if (e.kind !== 'book') {
        const put = (k, v) => { const el = fieldEl(box, k); if (el) { el.value = v; e.vals[k] = v; } };
        if (e.kind === 'val') put('v', eur(e.spec.value));
        else { put('aw', eur(e.spec.aw)); e.spec.rows.forEach((row, i) => { put(`p${i}`, pct(e.spec.rate)); put(`a${i}`, eur(row.afa)); put(`b${i}`, eur(row.bw)); }); }
        return;
      }
      const b = e.b, names = cur.c.names;
      const put = (k, r, v) => { const el = fieldEl(box, k, r); if (el) { el.value = v; e.rows[r][k] = v; } };
      if (b.none) e.none = true;
      b.soll.forEach((l, r) => { put('sa', r, T.kontoLabel(l.acc, names)); put('sb', r, eur(l.amt)); });
      b.haben.forEach((l, r) => { put('ha', r, T.kontoLabel(l.acc, names)); put('hb', r, eur(l.amt)); });
      e.effect = b.effect;
      box.querySelectorAll('[data-action="t-effect"]').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.v === b.effect)));
      box.querySelector('.tr-none')?.setAttribute('aria-pressed', String(!!b.none));
    }
    function solve(box) {
      const e = entryOf(box); if (!e || e.state !== 'open') return;
      fill(box, e); e.state = 'shown'; cur.touched = true;
      box.querySelectorAll('.tr-in').forEach(el => el.classList.remove('ok', 'bad'));
      box.classList.add('shown'); lock(box);
      box.querySelector('.tr-msg').textContent = e.kind === 'book' && e.b.none ? 'Hier ist keine Buchung nötig.' : '';
      const more = box.querySelector('.tr-more'), lines = helpOf(e);
      more.hidden = !lines.length; more.innerHTML = lines.length ? `<ul>${lines.map(x => `<li>${rich(x)}</li>`).join('')}</ul>` : '';
      progress();
      unlock();
    }
    function hint(box, btn) {
      const e = entryOf(box); if (!e || e.state !== 'open') return;
      const all = helpOf(e);
      if (!all.length) { box.querySelector('.tr-msg').textContent = e.kind === 'book' ? 'Lies den Beleg noch einmal genau: Was kommt ins Soll, was ins Haben?' : 'Lies den Sachverhalt noch einmal genau.'; return; }
      e.hints = Math.min(all.length, e.hints + 1); e.helped = true;
      const more = box.querySelector('.tr-more');
      more.hidden = false; more.innerHTML = `<ul>${all.slice(0, e.hints).map(x => `<li>${rich(x)}</li>`).join('')}</ul>`;
      if (e.hints >= all.length) btn.remove();
    }
    function finish() {
      cur.finished = true;
      const all = cur.entries.length, first = cur.entries.filter(e => e.state === 'ok' && !e.wrong && !e.helped).length, shown = cur.entries.filter(e => e.state === 'shown').length, ok = all - shown;
      const pct = Math.round(first / all * 100), id = cur.c.id, st = stats(), old = st[id] || { runs: 0, perfect: 0, bookings: 0, best: 0, at: 0 };
      st[id] = { runs: old.runs + 1, perfect: old.perfect + (first === all ? 1 : 0), bookings: old.bookings + ok, best: Math.max(old.best, pct), at: Date.now() };
      save();
      const mins = Math.max(1, Math.round((Date.now() - cur.started) / 60000));
      document.querySelector('#main').insertAdjacentHTML('beforeend', `<section class="result-page qa-test-result tr-result"><div class="qa-score-ring">${ring(pct, 'auf Anhieb')}</div><h1>${pct === 100 ? 'Alles auf Anhieb' : pct >= 70 ? 'Stark gebucht' : 'Fall gelöst'}<span class="blue-dot">.</span></h1><p>${first} von ${all} Aufgaben auf Anhieb richtig${shown ? `, ${shown} mit Lösung` : ''} · ${mins} ${mins === 1 ? 'Minute' : 'Minuten'}</p><div class="result-actions"><button class="button primary" data-action="t-new">Neuer Fall ${icon('arrow')}</button><button class="button secondary" data-action="t-home">Andere Fälle</button></div></section>`);
      setTimeout(() => document.querySelector('.tr-result')?.scrollIntoView?.({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }), 350);
    }

    // ---- Account suggestions ----
    function suggest(input) {
      const list = input.parentElement.querySelector('.tr-dd'), hits = T.searchKonten(input.value, cur.c.names, 7);
      if (!hits.length || input.readOnly) { list.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
      list.innerHTML = hits.map((h, i) => `<li role="option" data-no="${h.no}" class="${i ? '' : 'active'}" aria-selected="${!i}"><b>${h.no}</b><span>${esc(h.name)}</span></li>`).join('');
      list.hidden = false; input.setAttribute('aria-expanded', 'true');
    }
    function closeList(input) { const list = input.parentElement?.querySelector('.tr-dd'); if (list) list.hidden = true; input.setAttribute?.('aria-expanded', 'false'); }
    function choose(input, no) {
      const e = entryOf(input); if (!e) return;
      input.value = T.kontoLabel(no, cur.c.names);
      e.rows[Number(input.dataset.r)][input.dataset.k] = input.value; cur.touched = true;
      closeList(input);
      grade(input.closest('.tr-book'), { settle: false });
      input.closest('.tr-line')?.querySelector('.tr-v')?.focus();
    }
    function commit(input) {
      const e = entryOf(input); if (!e || e.state !== 'open') return;
      if (input.classList.contains('tr-a')) {
        const no = T.resolveAcc(input.value, cur.c.names);
        if (no && (T.kontoName(no, cur.c.names))) input.value = T.kontoLabel(no, cur.c.names);
      } else {
        const v = T.parseAmount(input.value);
        if (v !== null && input.value.trim()) input.value = input.classList.contains('tr-p') ? pct(v) : eur(v);
      }
      store(e, input);
      grade(input.closest('.tr-book'));
    }
    // One set of listeners for the whole app; they only act while a case is open.
    document.addEventListener('input', ev => {
      const el = ev.target; if (!cur || !el.classList?.contains('tr-in')) return;
      const e = entryOf(el); if (!e || e.state !== 'open') return;
      store(e, el); cur.touched = true;
      el.classList.remove('ok', 'bad');
      if (el.classList.contains('tr-a')) suggest(el);
    });
    document.addEventListener('focusout', ev => {
      const el = ev.target; if (!cur || !el.classList?.contains('tr-in')) return;
      if (el.classList.contains('tr-a')) setTimeout(() => closeList(el), 0);
      commit(el);
    });
    document.addEventListener('pointerdown', ev => {
      const li = ev.target.closest?.('.tr-dd li'); if (!li || !cur) return;
      ev.preventDefault();
      choose(li.closest('.tr-acc').querySelector('.tr-a'), li.dataset.no);
    });
    function moveNext(el) {
      const box = el.closest('.tr-book'), all = [...box.querySelectorAll('.tr-in:not([readonly])')], i = all.indexOf(el);
      if (i >= 0 && i < all.length - 1) return all[i + 1].focus();
      commit(el);
      const next = [...document.querySelectorAll('.tr-step:not([hidden]) .tr-book:not(.done):not(.shown)')].find(b => b !== box)?.querySelector('.tr-in');
      next?.focus();
    }
    function key(ev) {
      const el = ev.target;
      if (!cur || !el.classList?.contains('tr-in')) return;
      const list = el.parentElement?.querySelector?.('.tr-dd'), open = list && !list.hidden;
      if (el.classList.contains('tr-a') && open && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp')) {
        ev.preventDefault();
        const items = [...list.children], i = items.findIndex(x => x.classList.contains('active')), j = (i + (ev.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((x, n) => { x.classList.toggle('active', n === j); x.setAttribute('aria-selected', String(n === j)); });
        items[j].scrollIntoView?.({ block: 'nearest' });
        return;
      }
      if (ev.key === 'Escape' && open) { ev.preventDefault(); closeList(el); return; }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (el.classList.contains('tr-a') && open) { const act = list.querySelector('.active') || list.firstElementChild; if (act) return choose(el, act.dataset.no); }
        return moveNext(el);
      }
      if (ev.key === 'Tab' && el.classList.contains('tr-a') && open && !ev.shiftKey && !/^\d{4,5}\b/.test(el.value.trim())) {
        const act = list.querySelector('.active'); if (act) { el.value = T.kontoLabel(act.dataset.no, cur.c.names); entryOf(el).rows[Number(el.dataset.r)][el.dataset.k] = el.value; }
      }
    }

    // ---- Actions ----
    const leaveCase = fn => (cur && cur.touched && !cur.finished ? confirm('Fall verlassen?', 'Die richtig gebuchten Belege dieses Falls werden nicht als gelöster Fall gezählt.', 'Verlassen', fn) : fn());
    function action(name, btn) {
      const box = btn.closest('.tr-book');
      switch (name) {
        case 't-home': return leaveCase(home);
        case 't-exit': return leaveCase(home);
        case 't-open': return open(btn.dataset.tpl);
        case 't-random': return open(T.TEMPLATES[Math.floor(Math.random() * T.TEMPLATES.length)].id);
        case 't-new': { const id = cur?.c.id || T.TEMPLATES[0].id; return leaveCase(() => { open(id); window.scrollTo?.({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }); }); }
        case 't-effect': { const e = entryOf(btn); if (!e || e.state !== 'open') return; e.effect = btn.dataset.v; cur.touched = true; box.querySelectorAll('[data-action="t-effect"]').forEach(b => b.setAttribute('aria-pressed', String(b === btn))); return grade(box); }
        case 't-none': { const e = entryOf(btn); if (!e || e.state !== 'open') return; e.none = !e.none; cur.touched = true; btn.setAttribute('aria-pressed', String(e.none)); box.classList.toggle('is-none', e.none); return grade(box); }
        case 't-hint': return hint(box, btn);
        case 't-solve': return solve(box);
      }
    }
    return { home, leave, action, key, views: [VIEW], course, busy: () => !!(cur && cur.touched && !cur.finished), open };
  } };
})();
