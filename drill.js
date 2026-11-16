// "Buchungen merken": the bookings of the Rechnungswesen test (book chapters 1 and 2) as flash cards.
// Each card: read the business case, pick the pattern (Muster), recall the accounts, reveal, rate yourself.
// Progress per card lives in data.rwk = { [cardId]: { box: 0..3, seen, at } } and syncs like the rest.
(() => {
  // The 7 patterns almost every booking follows. Learning these beats learning 33 lines by heart.
  const PATTERNS = [
    { id: 'kauf', name: 'Etwas kaufen', rule: 'Vermögen + 2500 Vorsteuer an Lieferant oder Bank', eff: 'Ø' },
    { id: 'zahlen', name: 'Bezahlen', rule: 'Lieferant an Bank · Skonto: Lieferant an Anlage + 2500', eff: 'Ø' },
    { id: 'sinkt', name: 'Wert sinkt', rule: 'Aufwandskonto an Vermögenskonto', eff: '↓' },
    { id: 'steigt', name: 'Wert steigt wieder', rule: 'Vermögenskonto an Ertragskonto (höchstens bis zu den AK)', eff: '↑' },
    { id: 'fw', name: 'Fremdwährungsschuld', rule: 'Schuld steigt: 7815 an Lieferant · Schuld sinkt: Lieferant an 4840', eff: '↓ ↑' },
    { id: 'privat', name: 'Privat', rule: 'Entnahme: 9600 an 4900 + 3500 · Einlage: Anlage an 9600', eff: '' },
    { id: 'keine', name: 'Keine Buchung', rule: 'Anlagevermögen nur vorübergehend gesunken · Wert über den Anschaffungskosten', eff: '' },
  ];
  const TRAPS = [
    ['Pkw mit Verbrennermotor', 'keine Vorsteuer: brutto inkl. USt und NoVA aufs Anlagenkonto.'],
    ['Skonto bei Anlagen', 'Haben Anlagenkonto (mindert den Anschaffungswert), nicht auf ein Ertragskonto.'],
    ['Anlagevermögen vorübergehend gesunken', 'keine Buchung.'],
    ['Zuschreibung', 'höchstens bis zu den Anschaffungskosten.'],
    ['Bewertung', 'nur die Änderung zum letzten Wertansatz buchen.'],
    ['Halbjahresregel', 'Inbetriebnahme ab 1. Juli: im ersten Jahr nur die halbe AfA.'],
    ['GWG-Grenze', '€ 1.000,– netto (€ 1.150,– brutto = € 958,33 netto).'],
    ['Privatentnahme', 'immer Wiederbeschaffungspreis, + 20 % USt.'],
  ];
  const PAIRS = [['Grundstück', '7040', '4660'], ['Beteiligung', '8200', '8170'], ['Aktien UV', '8271', '8180'], ['Waren', '7800', '–']];
  const BLOCKS = [
    { id: 'kauf', title: 'Anlagenkauf' }, { id: 'gwg', title: 'GWG' }, { id: 'afa', title: 'Abschreibung' },
    { id: 'av', title: 'Anlagevermögen bewerten' }, { id: 'uv', title: 'Umlaufvermögen bewerten' }, { id: 'fk', title: 'Fremdwährung und Privat' },
  ];
  // [id, block, pattern, business case, soll[], haben[], effect on equity ('' = not asked), tip]
  // '0…' = the asset account of the case (0400, 0600, 0620 …), '33xxx' = the supplier's own account.
  const RAW = [
    ['kauf-ziel', 'kauf', 'kauf', 'Kauf einer Maschine auf Ziel (Eingangsrechnung)', ['0…', '2500'], ['33xxx'], 'Ø', 'Nettobetrag aufs Anlagenkonto, die USt als Vorsteuer.'],
    ['kauf-neben', 'kauf', 'kauf', 'Rechnung für Transport, Montage oder Fundament einer neuen Anlage', ['0…', '2500'], ['33xxx'], 'Ø', 'Nebenkosten gehören zum Anschaffungswert: dasselbe Anlagenkonto, kein Aufwand.'],
    ['kauf-bank', 'kauf', 'kauf', 'Kauf eines Servers, sofort per Banküberweisung bezahlt', ['0…', '2500'], ['2800'], 'Ø', 'Wie auf Ziel, nur Bank statt Lieferant. EDV = 0620.'],
    ['zahl', 'kauf', 'zahlen', 'Überweisung an den Lieferanten ohne Abzug', ['33xxx'], ['2800'], 'Ø', 'Die Schuld ist weg: Lieferant im Soll.'],
    ['zahl-skonto1', 'kauf', 'zahlen', 'Zahlung mit Skonto, Schritt 1: die Überweisung', ['33xxx'], ['2800'], 'Ø', 'Gebucht wird der überwiesene Betrag (Rechnung minus Skonto).'],
    ['zahl-skonto2', 'kauf', 'zahlen', 'Zahlung mit Skonto, Schritt 2: der Skonto', ['33xxx'], ['0…', '2500'], 'Ø', 'Skonto brutto aufteilen: netto mindert die Anlage, dazu Vorsteuerkorrektur. In einem Satz: 33xxx an 2800, 0…, 2500.'],
    ['pkw', 'kauf', 'kauf', 'Kauf eines Firmen-Pkw mit Verbrennermotor (Preis inkl. USt und NoVA)', ['0630'], ['33xxx'], 'Ø', 'Kein Vorsteuerabzug: der Bruttobetrag ist der Anschaffungswert.'],
    ['epkw', 'kauf', 'kauf', 'Kauf eines Elektro-Pkw (0 g CO₂) um € 38.040,– brutto', ['0630', '2500'], ['33xxx'], 'Ø', 'Elektro bis € 40.000,– brutto: mit Vorsteuer, ohne NoVA.'],
    ['lkw', 'kauf', 'kauf', 'Kauf eines Lieferwagens (Lkw)', ['0640', '2500'], ['33xxx'], 'Ø', 'Beim Lkw voller Vorsteuerabzug.'],
    ['halle', 'kauf', 'kauf', 'Schlussrechnung über die Errichtung einer Lagerhalle', ['0300', '2500'], ['33xxx'], 'Ø', 'Gebäude: Nutzungsdauer meist 40 Jahre = 2,5 %.'],
    ['kauf-kk', 'kauf', 'kauf', 'Kauf einer Kühlvitrine mit der Firmenkreditkarte', ['0…', '2500'], ['3180'], 'Ø', 'Kreditkarte 3180, Debitkarte 3190, bar 2700.'],
    ['gwg-sofort', 'gwg', 'kauf', 'Kauf eines Bürostuhls um € 600,– brutto bar, sofort als GWG abgeschrieben', ['7060', '2500'], ['2700'], '↓', 'GWG bis € 1.000,– netto darf sofort in den Aufwand. Debitkarte statt bar: 3190.'],
    ['gwg-aktiv', 'gwg', 'kauf', 'Kauf eines Tablets um € 840,– brutto mit Debitkarte, zuerst aktiviert', ['0…', '2500'], ['3190'], 'Ø', 'GWG-Konten: 0672 für EDV, 0670 für sonstige Ausstattung.'],
    ['gwg-3112', 'gwg', 'sinkt', 'Am 31.12. werden die aktivierten GWG zur Gänze abgeschrieben', ['7060'], ['0…'], '↓', '7060 an 0670 bzw. 0672. Über € 1.000,– netto ist es kein GWG.'],
    ['afa', 'afa', 'sinkt', 'Planmäßige Abschreibung einer Maschine am 31.12.', ['7010'], ['0…'], '↓', 'Anschaffungswert : Nutzungsdauer. Ab 1. Juli in Betrieb: im 1. Jahr die Hälfte.'],
    ['afa-euro', 'afa', 'sinkt', 'Eine Anlage mit Erinnerungseuro (€ 1,–) scheidet aus dem Betrieb aus', ['7010'], ['0…'], '↓', 'Betrag € 1,00. Bleibt sie im Betrieb, im letzten Jahr € 1,– weniger abschreiben.'],
    ['afa-ausser', 'afa', 'sinkt', 'Eine Maschine ist durch neue Technik dauerhaft weniger wert', ['7040'], ['0…'], '↓', 'Außerplanmäßig = 7040, nicht 7010. Zuerst die planmäßige AfA buchen.'],
    ['grund-kauf', 'av', 'kauf', 'Kauf eines Grundstücks für eine spätere Lagerhalle per Bank', ['0200'], ['2800'], 'Ø', 'Fläche × Preis pro m². Grundstücke nutzen sich nicht ab: keine AfA.'],
    ['grund-down', 'av', 'sinkt', 'Grundstückspreis sinkt wegen einer fix geplanten Kläranlage (dauerhaft)', ['7040'], ['0200'], '↓', 'Dauernde Wertminderung beim AV: muss abgewertet werden.'],
    ['grund-temp', 'av', 'keine', 'Grundstückspreis sinkt am 31.12. wegen Spekulationen vorübergehend', [], [], '', 'Gemildertes Niederstwertprinzip: vorübergehend = nicht abwerten.'],
    ['grund-up', 'av', 'steigt', 'Die Kläranlage wird abgesagt, der Grundstückspreis steigt wieder', ['0200'], ['4660'], '↑', 'Gründe fallen weg: zuschreiben, höchstens bis zu den Anschaffungskosten.'],
    ['bet-kauf', 'av', 'kauf', 'Kauf von 1.000 Aktien als Finanzanlage (langfristige Beteiligung)', ['0800'], ['2800'], 'Ø', 'Stückzahl × Kurs.'],
    ['bet-down', 'av', 'sinkt', 'Kurs der Beteiligung fällt, eine Erholung ist nicht absehbar', ['8200'], ['0800'], '↓', 'Finanzanlage, dauernde Wertminderung: abwerten.'],
    ['bet-up', 'av', 'steigt', 'Der Grund für die Abwertung der Beteiligung fällt weg, Kurs steigt', ['0800'], ['8170'], '↑', 'Höchstens bis zu den Anschaffungskosten.'],
    ['uv-kauf', 'uv', 'kauf', 'Kauf von Aktien zu Spekulationszwecken (Umlaufvermögen) per Bank', ['2620'], ['2800'], 'Ø', 'Umlaufvermögen = 2620, Finanzanlage = 0800.'],
    ['uv-down', 'uv', 'sinkt', 'Kurs der Aktien des UV am 31.12. unter dem letzten Bilanzansatz', ['8271'], ['2620'], '↓', 'Strenges Niederstwertprinzip: jede Wertminderung buchen.'],
    ['uv-up', 'uv', 'steigt', 'Kurs der Aktien des UV steigt wieder', ['2620'], ['8180'], '↑', 'Zuschreibung höchstens bis zu den Anschaffungskosten.'],
    ['uv-over', 'uv', 'keine', 'Kurs der Aktien des UV am 31.12. über dem Anschaffungskurs (noch nie abgewertet)', [], [], '', 'Anschaffungswert ist die Obergrenze: keine Buchung.'],
    ['waren', 'uv', 'sinkt', 'Wiederbeschaffungspreis der Waren am 31.12. unter dem Einstandspreis', ['7800'], ['1600'], '↓', 'Lagerbestand × (Einstandspreis − Wiederbeschaffungspreis).'],
    ['fw-verlust', 'fk', 'fw', 'USD-Lieferverbindlichkeit: am 31.12. ist die Schuld in Euro höher', ['7815'], ['33xxx'], '↓', 'Strenges Höchstwertprinzip: Schuld aufwerten. € = USD : Kurs.'],
    ['fw-gewinn', 'fk', 'fw', 'USD-Lieferverbindlichkeit: im Folgejahr ist die Schuld in Euro niedriger', ['33xxx'], ['4840'], '↑', 'Abwerten, aber nie unter den Entstehungswert.'],
    ['privat-ent', 'fk', 'privat', 'Die Inhaberin entnimmt Waren für private Zwecke', ['9600'], ['4900', '3500'], '', 'Bewertet mit dem Wiederbeschaffungspreis, + 20 % USt.'],
    ['privat-ein', 'fk', 'privat', 'Der Inhaber bringt seinen privaten Laptop in den Betrieb ein', ['0…'], ['9600'], '', 'Teilwert am Tag der Einlage, ohne USt.'],
  ];
  const CARDS = RAW.map(([id, block, pattern, fall, soll, haben, eff, tip]) => ({ id, block, pattern, fall, soll, haben, eff, tip }));
  const BOX = ['Neu', 'Üben', 'Fast', 'Sicher'];
  const validate = raw => {
    const out = {};
    for (const c of CARDS) { const x = raw?.[c.id]; if (x && typeof x === 'object') out[c.id] = { box: Math.min(3, Math.max(0, Math.trunc(Number(x.box)) || 0)), seen: Math.max(0, Math.trunc(Number(x.seen)) || 0), at: Number(x.at) || 0 }; }
    return out;
  };
  const api = { PATTERNS, TRAPS, PAIRS, BLOCKS, CARDS, validate };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

  const VIEW = 'rw-drill', ROUND = 10;
  window.WWDrill = { ...api, create(ctx) {
    const { $, esc, icon, shell, save, countAnswer, reduced } = ctx;
    const T = window.WWRw.trainer;
    const prog = () => { const d = ctx.data(); if (!d.rwk) d.rwk = {}; return d.rwk; };
    const course = { subject: 'Rechnungswesen', key: 'rwk' };
    let run = null, block = 'all';

    const name = no => no === '0…' ? 'Anlagenkonto (z. B. 0400, 0600, 0620)' : no === '33xxx' ? 'Lieferant (eigenes Personenkonto)' : T.kontoName(no);
    const acc = no => `<span class="bk-acc"><b>${esc(no)}</b> ${esc(name(no))}</span>`;
    const satz = c => c.soll.length ? `<div class="bk-satz"><div>${c.soll.map(acc).join('')}</div><span class="bk-an">an</span><div>${c.haben.map(acc).join('')}</div></div>` : '<div class="bk-satz bk-none">Keine Buchung</div>';
    const effHtml = e => e ? `<span class="bk-eff bk-eff-${{ '↑': 'up', '↓': 'down', 'Ø': 'zero' }[e]}" title="Eigenkapital">${e} <small>${{ '↑': 'vermehrt', '↓': 'vermindert', 'Ø': 'erfolgsneutral' }[e]}</small></span>` : '';
    const levelOf = id => { const p = prog()[id]; return !p || !p.seen ? 0 : p.box === 0 ? 1 : p.box; };
    const counts = list => { const n = [0, 0, 0, 0]; list.forEach(c => n[levelOf(c.id)]++); return n; };
    const bar = n => { const total = n.reduce((a, b) => a + b, 0) || 1; return `<div class="bk-bar" aria-hidden="true">${[3, 2, 1].map(l => `<span class="l${l}" style="width:${n[l] / total * 100}%"></span>`).join('')}</div>`; };
    const inBlock = b => CARDS.filter(c => b === 'all' || c.block === b);

    function leave() { run = null; }
    // ---- Overview ----
    function home() {
      leave(); shell(VIEW, 'Buchungen merken');
      const n = counts(CARDS);
      $('#main').innerHTML = `<button class="back-link" data-action="m-home">${icon('back')} Rechnungswesen</button>
        <section class="page-intro"><div><h1>Buchungen merken<span class="blue-dot">.</span></h1><p>${CARDS.length} Buchungen der Schularbeit als Karten. Erst das Muster erkennen, dann die Konten selbst sagen, dann aufdecken. Was du nicht weißt, kommt gleich wieder.</p></div><button class="button primary" data-action="k-start" data-block="${esc(block)}">${icon('spark')}Lernen ${icon('arrow')}</button></section>
        <section class="bk-stand">${bar(n)}<p>${BOX.map((b, i) => `<span class="bk-dot l${i}"></span>${b} <b>${n[i]}</b>`).join(' · ')}</p></section>
        <section class="bk-blocks" aria-label="Was lernen?">${[{ id: 'all', title: 'Alle' }, ...BLOCKS].map(b => { const list = inBlock(b.id), c = counts(list); return `<button type="button" class="bk-chip${block === b.id ? ' on' : ''}" data-action="k-block" data-block="${b.id}" aria-pressed="${block === b.id}"><span>${esc(b.title)}</span><small>${c[3]}/${list.length} sicher</small></button>`; }).join('')}</section>
        <section class="library-section"><div class="section-heading"><div><h2>Die 7 Muster</h2><p>Fast jede Buchung ist eines davon. In jeder Karte tippst du zuerst das Muster an.</p></div></div>
          <ol class="bk-patterns">${PATTERNS.map((p, i) => `<li><span class="bk-key">${i + 1}</span><div><strong>${esc(p.name)}</strong><p>${esc(p.rule)}</p></div>${p.eff ? `<em>${p.eff}</em>` : ''}</li>`).join('')}</ol></section>
        <section class="library-section bk-two"><div><div class="section-heading"><div><h2>Abwerten / Zuschreiben</h2><p>Die Paare, die du sicher können musst.</p></div></div>
          <table class="bk-pairs"><thead><tr><th></th><th>Wert sinkt</th><th>Wert steigt</th></tr></thead><tbody>${PAIRS.map(([w, d, u]) => `<tr><th>${esc(w)}</th><td><b>${d}</b></td><td><b>${u}</b></td></tr>`).join('')}</tbody></table></div>
          <div><div class="section-heading"><div><h2>Die 8 Fallen</h2><p>Hier gehen die meisten Punkte verloren.</p></div></div>
          <ul class="bk-traps">${TRAPS.map(([t, d]) => `<li><strong>${esc(t)}:</strong> ${esc(d)}</li>`).join('')}</ul></div></section>`;
    }
    // ---- A round ----
    function start(b = block) {
      block = b;
      const now = Date.now(), list = inBlock(b).map(c => ({ c, p: prog()[c.id] || { box: 0, seen: 0, at: 0 }, r: Math.random() }));
      // weakest first (new and wrong), then the ones not seen for longest; random within the same level
      list.sort((x, y) => (x.p.seen ? x.p.box + 1 : 0) - (y.p.seen ? y.p.box + 1 : 0) || (x.p.at - y.p.at) || (x.r - y.r));
      run = { queue: list.slice(0, ROUND).map(x => x.c), done: 0, right: 0, again: 0, step: 'pick', picked: null, repeats: {}, total: Math.min(ROUND, list.length), started: now };
      draw();
    }
    const cur = () => run.queue[0];
    function draw() {
      shell(VIEW, 'Buchungen merken');
      if (!run.queue.length) return result();
      const c = cur(), pat = PATTERNS.find(p => p.id === c.pattern), ok = run.picked === c.pattern, blockName = BLOCKS.find(b => b.id === c.block).title;
      const pct = Math.round(run.done / run.total * 100);
      $('#main').innerHTML = `<section class="learning-shell bk-shell"><div class="learning-top"><button class="back-link" data-action="k-home">${icon('back')}Beenden</button><span class="learning-set-name">Buchungen merken</span><span class="qa-round-count">${Math.min(run.done + 1, run.total)} / ${run.total}</span></div>
        <div class="round-progress" style="--steps:${run.total}"><div><strong>${esc(blockName)}</strong><span>${run.right} gewusst</span></div><div class="mini-progress"><span style="width:${pct}%"></span></div></div>
        <article class="question-card bk-card" id="bk-card">
          <div class="bk-meta"><span class="bk-level l${levelOf(c.id)}">${BOX[levelOf(c.id)]}</span>${run.repeats[c.id] ? '<span class="bk-again">Nochmal</span>' : ''}</div>
          <h2 class="bk-fall">${esc(c.fall)}</h2>
          ${run.step === 'pick' ? `<p class="bk-ask">Welches Muster ist das?</p><div class="bk-picks">${PATTERNS.map((p, i) => `<button type="button" class="bk-pick" data-action="k-pick" data-p="${p.id}"><span class="bk-key">${i + 1}</span>${esc(p.name)}</button>`).join('')}</div>`
            : `<div class="bk-verdict ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'close')}<span>${ok ? `Richtig: <b>${esc(pat.name)}</b>` : `Das ist <b>${esc(pat.name)}</b>`}</span>${ok ? '' : `<small>${esc(pat.rule)}</small>`}</div>
              ${run.step === 'think' ? `<p class="bk-ask">Sag jetzt den Buchungssatz mit Kontonummern, dann aufdecken.</p><div class="bk-actions"><button type="button" class="button primary" data-action="k-reveal" id="bk-reveal">Aufdecken <kbd>Leertaste</kbd></button></div>`
              : `<div class="bk-answer">${satz(c)}<div class="bk-row">${effHtml(c.eff)}<p class="bk-tip">${esc(c.tip)}</p></div></div>
                <div class="bk-actions">${ok ? `<button type="button" class="button secondary" data-action="k-rate" data-v="again">Nochmal <kbd>1</kbd></button><button type="button" class="button primary" data-action="k-rate" data-v="known">Gewusst <kbd>2</kbd></button>` : `<button type="button" class="button primary" data-action="k-rate" data-v="again">Weiter, kommt nochmal <kbd>Enter</kbd></button>`}</div>`}`}
        </article></section>`;
      if (run.step !== 'pick') ($('#bk-reveal') || $('[data-action="k-rate"][data-v="known"]') || $('[data-action="k-rate"]'))?.focus({ preventScroll: true });
    }
    function pick(id) {
      if (!run || run.step !== 'pick') return;
      run.picked = id; run.step = id === cur().pattern ? 'think' : 'shown';
      draw();
    }
    function reveal() { if (run?.step === 'think') { run.step = 'shown'; draw(); } }
    function rate(v) {
      if (!run || run.step !== 'shown') return;
      const c = cur(), p = prog(), old = p[c.id] || { box: 0, seen: 0, at: 0 }, known = v === 'known' && run.picked === c.pattern;
      p[c.id] = { box: known ? Math.min(3, old.box + (old.seen ? 1 : 2)) : 0, seen: old.seen + 1, at: Date.now() };
      countAnswer(); save();
      run.queue.shift();
      if (known) { run.done++; run.right++; }
      else if ((run.repeats[c.id] || 0) < 2) { run.repeats[c.id] = (run.repeats[c.id] || 0) + 1; run.again++; run.queue.splice(Math.min(3, run.queue.length), 0, c); }
      else run.done++;
      run.step = 'pick'; run.picked = null;
      draw();
      window.scrollTo?.({ top: 0, behavior: reduced() ? 'auto' : 'smooth' });
    }
    function result() {
      const n = counts(inBlock(block));
      $('#main').innerHTML = `<section class="result-page bk-result"><div class="qa-score-ring">${ctx.ring(Math.round(run.right / Math.max(1, run.total) * 100), 'gewusst')}</div><h1>${run.again ? 'Runde geschafft' : 'Alles gewusst'}<span class="blue-dot">.</span></h1>
        <p>${run.right} von ${run.total} Karten gewusst${run.again ? `, ${run.again}× nochmal geübt` : ''}. Sicher: ${n[3]} von ${inBlock(block).length}.</p>
        <div class="result-actions"><button class="button primary" data-action="k-start" data-block="${esc(block)}">Nächste Runde ${icon('arrow')}</button><button class="button secondary" data-action="k-home">Übersicht</button></div></section>`;
      run = null;
    }
    function action(a, btn) {
      switch (a) {
        case 'k-home': return home();
        case 'k-block': block = btn.dataset.block; return home();
        case 'k-start': return start(btn.dataset.block || block);
        case 'k-pick': return pick(btn.dataset.p);
        case 'k-reveal': return reveal();
        case 'k-rate': return rate(btn.dataset.v);
      }
    }
    function key(e, input) {
      if (!run || input || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('button')) return; // a focused button clicks itself
      if (run.step === 'pick' && /^[1-7]$/.test(e.key)) { e.preventDefault(); return pick(PATTERNS[Number(e.key) - 1].id); }
      if (run.step === 'think' && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); return reveal(); }
      if (run.step === 'shown') {
        const ok = run.picked === cur().pattern;
        if (e.key === '1' || (!ok && (e.key === 'Enter' || e.key === ' '))) { e.preventDefault(); return rate('again'); }
        if (ok && e.key === '2') { e.preventDefault(); return rate('known'); }
      }
    }
    return { home, leave, action, key, views: [VIEW], course, busy: () => !!(run && run.done > 0) };
  } };
})();
