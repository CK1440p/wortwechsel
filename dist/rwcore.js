// Rechnungswesen: Bewertung von Vermögen und Schulden, Anlagenkauf, Abschreibung. Generators only, no DOM.
// Uses the task engine and answer checking from mathcore.js; bookings are checked by account and amount.
(function (root, factory) {
  const M = root.WWMath || (typeof require === 'function' ? require('./mathcore.js') : null);
  const api = factory(M);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WWRw = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  const { field, select, fields, mc, unique, makeRng } = M.kit;
  const r2 = x => Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;
  function eur(x) {
    const v = r2(x), neg = v < 0;
    let [a, b] = Math.abs(v).toFixed(2).split('.');
    a = a.replace(/\B(?=(\d{3})+$)/g, '.');
    return `${neg ? '−' : ''}${a},${b}`;
  }
  const E = x => `€ ${eur(x)}`;
  const pct = x => `${String(r2(x)).replace('.', ',')} %`;
  const money = (key, label, value, traps = [], o = {}) => field(key, label, r2(value), { d: 2, tol: 0.011, unit: '€', traps: traps.filter(t => Number.isFinite(t.value)).map(t => ({ ...t, value: r2(t.value) })), ...o });
  const round10 = x => Math.round(x / 10) * 10, round100 = x => Math.round(x / 100) * 100;
  const date = (d, m, y = 2025) => `${d}.${m}.${y}`;
  const int = n => String(n).replace(/\B(?=(\d{3})+$)/g, '.');

  // ---- Accounts (Einheitskontenrahmen as used in the book) ----
  const ACC = {
    '0200': 'Unbebaute Grundstücke', '0300': 'Betriebs- und Geschäftsgebäude', '0400': 'Maschinen', '0600': 'Betriebs- und Geschäftsausstattung', '0620': 'Büromaschinen, EDV-Anlagen', '0630': 'Pkw und Kombis', '0640': 'Lkw', '0800': 'Beteiligungen',
    '1600': 'Handelswaren', '2500': 'Vorsteuer', '2620': 'Aktien des Umlaufvermögens', '2700': 'Kassa', '2800': 'Bank', '3500': 'Umsatzsteuer',
    '4660': 'Erträge aus der Zuschreibung zum Anlagevermögen', '4900': 'Eigenverbrauch 20 %',
    '7010': 'Abschreibungen von Sachanlagen', '7040': 'Außerplanmäßige Abschreibungen von Anlagevermögen', '7060': 'Abschreibungen geringwertiger Wirtschaftsgüter', '7800': 'Abschreibungen von Vorräten',
    '8170': 'Erträge aus der Zuschreibung zu Finanzanlagen', '8180': 'Erträge aus der Zuschreibung zu Wertpapieren des UV', '8200': 'Abschreibungen auf Beteiligungen', '8271': 'Abschreibungen auf Wertpapiere des UV',
    '9600': 'Privat', '7815': 'Fremdwährungskursverluste', '4840': 'Fremdwährungskursgewinne', '3180': 'Verbindlichkeiten Kreditkartenunternehmen', '3190': 'Verbindlichkeiten Debitkarten',
  };
  const SUPPLIERS = ['Maschinenbau Steiner GmbH', 'Technik Huber KG', 'Bürowelt Lechner GmbH', 'Montagebau Kern OG', 'Elektro Pichler GmbH', 'Anlagenbau Gruber AG', 'Ladenbau Wimmer GmbH', 'Autohaus Mayrhofer GmbH', 'Nutzfahrzeuge Brandl GmbH', 'IT-Service Moser e. U.'];
  function supplier(r, names, pick) {
    const name = pick || r.pick(SUPPLIERS);
    let no; do no = String(r.int(33010, 33899)); while (names[no]);
    names[no] = name;
    return { no, name };
  }
  const label = (no, names = {}) => `${/^\d/.test(no) ? `${no} ` : ''}${names[no] || KONTO_NAME(no) || ACC[no]}`;
  const KONTO_NAME = no => typeof KONTO !== 'undefined' ? KONTO.get(no) : undefined;
  // A booking answer: the accounts to choose from are the right ones plus typical mix-ups.
  function booking(r, soll, haben, { names = {}, pool = [], effect, noAmounts } = {}) {
    const used = [...soll, ...haben].map(([a]) => a), all = [...new Set([...used, ...pool])];
    const accounts = all.sort((a, b) => (/^\d/.test(a) ? a : `9${a}`).localeCompare(/^\d/.test(b) ? b : `9${b}`)).map(no => ({ no, label: label(no, names) }));
    const line = ([acc, amt]) => ({ acc, amt: r2(amt), label: label(acc, names) });
    return { type: 'booking', accounts, soll: soll.map(line), haben: haben.map(line), ...(effect ? { effect } : {}), ...(noAmounts ? { noAmounts: true } : {}) };
  }
  const step = answer => ({ booking: answer });
  const EFFECT_TEXT = { '↑': 'Das Eigenkapital steigt (Ertrag).', '↓': 'Das Eigenkapital sinkt (Aufwand).', 'Ø': 'Erfolgsneutral: Es wird nur Vermögen umgeschichtet.' };

  // ---- Assets ----
  const ASSETS = [
    { name: 'einen Backofen', short: 'Backofen', acc: '0400', p: [30000, 90000], nd: [5, 10] },
    { name: 'eine Verpackungsmaschine', short: 'Verpackungsmaschine', acc: '0400', p: [8000, 40000], nd: [8, 12] },
    { name: 'eine CNC-Fräsmaschine', short: 'CNC-Fräsmaschine', acc: '0400', p: [40000, 120000], nd: [8, 10] },
    { name: 'eine Abfüllanlage', short: 'Abfüllanlage', acc: '0400', p: [20000, 60000], nd: [5, 10] },
    { name: 'einen Server', short: 'Server', acc: '0620', p: [2400, 9000], nd: [3, 5] },
    { name: 'ein Kassensystem', short: 'Kassensystem', acc: '0620', p: [2500, 8000], nd: [4, 6] },
    { name: 'eine Kühlvitrine', short: 'Kühlvitrine', acc: '0600', p: [3000, 12000], nd: [8, 10] },
    { name: 'ein Regalsystem für das Lager', short: 'Regalsystem', acc: '0600', p: [4000, 15000], nd: [10, 12] },
    { name: 'einen Lieferwagen', short: 'Lieferwagen', acc: '0640', p: [25000, 45000], nd: [5, 8] },
  ];
  function asset(r, filter = () => true) {
    const a = r.pick(ASSETS.filter(filter)), price = a.p[1] > 20000 ? round100(r.int(a.p[0], a.p[1])) : round10(r.int(a.p[0], a.p[1]));
    return { ...a, price, nd: r.int(a.nd[0], a.nd[1]) };
  }
  const ASSET_POOL = ['0400', '0600', '0620', '7010', '7060'];

  // ---- Depreciation ----
  // Half-year rule: put into service after 30 June, the first and the last year get half the annual amount.
  function afaPlan(aw, nd, month, { year = 2025, keepEuro = false } = {}) {
    const annual = r2(aw / nd), half = month >= 7, years = half ? nd + 1 : nd, rows = [];
    let bw = aw;
    for (let i = 0; i < years; i++) {
      let a = half && (i === 0 || i === years - 1) ? r2(annual / 2) : annual;
      if (i === years - 1) a = r2(bw - (keepEuro ? 1 : 0));
      bw = r2(bw - a);
      rows.push({ year: year + i, afa: a, bw });
    }
    return { annual, half, rows, rate: 100 / nd };
  }
  const afaTable = (aw, plan, upto = plan.rows.length) => ({ head: 'row', rows: [['Jahr', 'Abschreibung', 'Buchwert 31.12.'], ['Anschaffung', '', E(aw)], ...plan.rows.slice(0, upto).map(x => [String(x.year), E(x.afa), E(x.bw)])] });

  const GENS = [];
  const gen = (id, topic, label, min, max, rank, make) => GENS.push({ id, topic, label, min, max, rank, make });

  // ======== Grundlagen ========
  const PRINCIPLES = [
    ['Einzelbewertung', 'Vermögensgegenstände und Schulden werden jeweils für sich bewertet.', 'Ein Händler bewertet jeden seiner 40 Laptops für sich, statt einen Pauschalwert für alle anzusetzen.'],
    ['Vorsicht', 'Das Unternehmen darf sich durch die Bewertung nicht reicher darstellen, als es ist.', 'Ein drohender Verlust wird schon erfasst, ein erhoffter Gewinn erst, wenn er wirklich entstanden ist.'],
    ['Periodenrichtigkeit', 'Aufwände und Erträge zählen in dem Geschäftsjahr, zu dem sie wirtschaftlich gehören, egal wann gezahlt wird.', 'Die Dezembermiete wird im alten Jahr erfasst, obwohl sie erst im Jänner überwiesen wird.'],
    ['Unternehmensfortführung', 'Bewertet wird so, als würde das Unternehmen weitergeführt (Going-concern-Prinzip).', 'Die Maschinen werden nicht mit ihrem Schrottwert angesetzt, weil der Betrieb weiterläuft.'],
    ['Bilanzidentität', 'Die Eröffnungsbilanz eines Jahres stimmt mit der Schlussbilanz des Vorjahres überein.', 'Die Werte der Bilanz vom 31.12.2025 sind die Anfangswerte am 1.1.2026.'],
    ['Bewertungsstetigkeit', 'Einmal angewendete Bilanzierungs- und Bewertungsmethoden werden beibehalten.', 'Die Abschreibungsmethode wird nicht jedes Jahr gewechselt, nur weil das Ergebnis dann besser aussieht.'],
    ['verlässlichen Schätzung', 'Muss ein Wert geschätzt werden, dann auf einer objektiven Grundlage wie Erfahrungswerten oder Gutachten.', 'Für einen laufenden Rechtsstreit wird der Betrag mithilfe eines Gutachtens festgelegt.'],
  ];
  gen('g-grundsatz', 'grundlagen', 'Bewertungsgrundsätze', 1, 3, 1, (r, st) => {
    const [name, def, ex] = r.pick(PRINCIPLES), wrong = r.sample(PRINCIPLES.filter(p => p[0] !== name), 3);
    if (st === 1) return { kicker: 'Grundsatz', lead: `„${def}“`, ask: 'Welcher Bewertungsgrundsatz ist das?', answer: mc(r, `Grundsatz der ${name}`, wrong.map(p => `Grundsatz der ${p[0]}`)), hints: ['Lies auf das Schlüsselwort: einzeln, Vorsicht, Periode, Fortführung, Identität, Stetigkeit, Schätzung.'], solution: [`Grundsatz der **${name}**: ${def}`] };
    return { kicker: 'Grundsatz', lead: ex, ask: 'Welcher Bewertungsgrundsatz wird hier angewendet?', answer: mc(r, `Grundsatz der ${name}`, wrong.map(p => `Grundsatz der ${p[0]}`)), hints: ['Was genau wird hier verhindert oder sichergestellt?'], solution: [`Grundsatz der **${name}**: ${def}`] };
  });
  function pflichtCase(r) {
    const y = 2025, k = r.int(0, 5);
    if (k === 0) { const n = r.pick(['Die Pixelwerk GmbH', 'Die Alpenmilch AG', 'Die Rotor Software GmbH']), rev = r.pick([180000, 420000, 2300000]); return { text: `${n} erzielt einen Jahresumsatz von ${E(rev)}.`, right: 'UGB (und EStG), unabhängig vom Umsatz', why: 'Kapitalgesellschaften (GmbH, AG) sind immer rechnungslegungspflichtig.' }; }
    if (k === 1) { const rev = round100(r.int(1010000, 1600000)); return { text: `Die Lena Berger e. U. (Modehandel) erzielt ${y} einen Umsatz von ${E(rev)}, in den Jahren davor lag er unter € 700.000,–.`, right: `UGB ab ${y + 1}`, why: 'Über € 1.000.000,– Umsatz: Pflicht schon ab dem Folgejahr, ohne Pufferjahr.' }; }
    if (k === 2) { const a = round100(r.int(720000, 980000)), b = round100(r.int(720000, 980000)); return { text: `Die Huber & Partner OG erzielt ${y} einen Umsatz von ${E(a)} und ${y + 1} einen Umsatz von ${E(b)}.`, right: `UGB ab ${y + 3}`, why: 'Zweimal hintereinander über € 700.000,–: Pflicht nach einem Pufferjahr, also ab dem zweitfolgenden Jahr.' }; }
    if (k === 3) { const a = round100(r.int(720000, 980000)), b = round100(r.int(450000, 690000)); return { text: `Die Moser e. U. erzielt ${y} einen Umsatz von ${E(a)}, ${y + 1} nur noch ${E(b)}.`, right: 'Nur EStG', why: 'Über € 700.000,– nur einmal: Dafür müsste die Grenze zweimal hintereinander überschritten werden.' }; }
    if (k === 4) { const rev = round100(r.int(120000, 650000)); return { text: `Die Cultstyle e. U. erzielt seit Jahren einen Umsatz von rund ${E(rev)}.`, right: 'Nur EStG', why: 'Unter € 700.000,– Umsatz besteht keine Rechnungslegungspflicht nach UGB.' }; }
    const who = r.pick(['Eine Rechtsanwältin', 'Ein Schriftsteller', 'Eine Landwirtin']), rev = round100(r.int(800000, 1500000));
    return { text: `${who} erzielt einen Jahresumsatz von ${E(rev)}.`, right: 'Nur EStG', why: 'Freie Berufe sowie Land- und Forstwirte wenden nur die steuerlichen Bestimmungen des EStG an.' };
  }
  gen('g-pflicht', 'grundlagen', 'UGB oder EStG?', 1, 3, 2, (r) => {
    const c = pflichtCase(r), all = ['UGB (und EStG), unabhängig vom Umsatz', 'UGB ab 2026', 'UGB ab 2027', 'UGB ab 2028', 'Nur EStG'];
    return { kicker: 'Vorschriften', lead: c.text, ask: 'Welche Bewertungsvorschriften sind maßgebend?', answer: mc(r, c.right, r.sample(all.filter(x => x !== c.right), 3)), hints: ['Zuerst: Kapitalgesellschaft oder nicht? Dann die Umsatzgrenzen: einmal über € 1.000.000,– oder zweimal hintereinander über € 700.000,–.'], solution: [c.why] };
  });
  const RULE_ITEMS = [
    ['ein Grundstück', 'Gemildertes Niederstwertprinzip'], ['eine Beteiligung an einem anderen Unternehmen', 'Gemildertes Niederstwertprinzip'], ['eine Maschine', 'Gemildertes Niederstwertprinzip'], ['ein Firmengebäude', 'Gemildertes Niederstwertprinzip'],
    ['den Warenvorrat', 'Strenges Niederstwertprinzip'], ['Aktien, die zur Spekulation gekauft wurden', 'Strenges Niederstwertprinzip'], ['Forderungen an Kundinnen und Kunden', 'Strenges Niederstwertprinzip'],
    ['eine Lieferverbindlichkeit in US-Dollar', 'Strenges Höchstwertprinzip'], ['ein Bankkredit', 'Strenges Höchstwertprinzip'],
  ];
  gen('g-regel', 'grundlagen', 'Welche Bewertungsregel?', 1, 3, 2, (r) => {
    const [item, rule] = r.pick(RULE_ITEMS);
    return { kicker: 'Bewertungsregel', ask: `Welche Bewertungsregel gilt für ${item}?`, answer: mc(r, rule, ['Gemildertes Niederstwertprinzip', 'Strenges Niederstwertprinzip', 'Strenges Höchstwertprinzip'].filter(x => x !== rule)), hints: ['Anlagevermögen: gemildert. Umlaufvermögen: streng nieder. Verbindlichkeiten: streng höchst.'], solution: [`Für ${item} gilt das **${rule}**.`] };
  });
  const MEASURES = [
    ['Welcher Wertmaßstab gilt nach Unternehmensrecht für Verbindlichkeiten?', 'Erfüllungsbetrag', ['Teilwert', 'Wiederbeschaffungspreis', 'Verkaufspreis']],
    ['Mit welchem Wert werden Privatentnahmen angesetzt?', 'Teilwert zum Zeitpunkt der Entnahme', ['Einstandspreis beim Einkauf', 'Verkaufspreis ohne USt', 'Erfüllungsbetrag']],
    ['Welcher Hilfswert zeigt bei Waren den Wert am Abschlussstichtag?', 'Wiederbeschaffungspreis am Stichtag', ['Verkaufspreis am Stichtag', 'Einstandspreis beim Einkauf', 'Erfüllungsbetrag']],
    ['Wie heißen die Kosten bei Anlagen, die der Betrieb selbst erzeugt?', 'Herstellungskosten', ['Anschaffungskosten', 'Teilwert', 'Erfüllungsbetrag']],
    ['Welcher Wertmaßstab gilt im Steuerrecht?', 'Teilwert', ['Erfüllungsbetrag', 'beizulegender Wert', 'Wiederbeschaffungspreis']],
    ['Was ist der Ausgangswert beim abnutzbaren Anlagevermögen?', 'Anschaffungs- oder Herstellungskosten minus planmäßige Abschreibung', ['Anschaffungs- oder Herstellungskosten', 'Wiederbeschaffungspreis', 'Teilwert']],
    ['Wie heißt der Wert am Abschlussstichtag nach Unternehmensrecht?', 'Beizulegender Wert bzw. beizulegender Zeitwert', ['Teilwert', 'Erfüllungsbetrag', 'Einstandspreis']],
  ];
  gen('g-mass', 'grundlagen', 'Wertmaßstäbe', 1, 3, 3, (r) => {
    const [q, right, wrong] = r.pick(MEASURES);
    return { kicker: 'Wertmaßstab', ask: q, answer: mc(r, right, wrong), hints: ['Unternehmensrecht: beizulegender Wert und Erfüllungsbetrag. Steuerrecht: Teilwert.'], solution: [`**${right}**.`] };
  });
  const FACTS = [
    ['Am Abschlussstichtag wird das Vermögen im Allgemeinen abgewertet, das Fremdkapital aufgewertet.', true, 'Das folgt aus dem Vorsichtsprinzip.'],
    ['Waren dürfen über ihren Einstandspreis aufgewertet werden, wenn der Wiederbeschaffungspreis steigt.', false, 'Höchstens bis zu den Anschaffungskosten.'],
    ['Beim Umlaufvermögen muss jede Wertminderung berücksichtigt werden.', true, 'Strenges Niederstwertprinzip.'],
    ['Ein Grundstück muss auch bei einer nur vorübergehenden Wertminderung abgewertet werden.', false, 'Nur bei dauernder Wertminderung. Ein Wahlrecht gibt es nur bei Finanzanlagen.'],
    ['Steigt eine Verbindlichkeit in Fremdwährung am Stichtag, muss der höhere Betrag angesetzt werden.', true, 'Strenges Höchstwertprinzip.'],
    ['Eine Verbindlichkeit darf unter ihren Entstehungswert abgewertet werden.', false, 'Höchstens bis zum Entstehungswert.'],
    ['Fallen die Gründe für eine Abwertung weg, muss wieder aufgewertet werden.', true, 'Zuschreibung, höchstens bis zu den Anschaffungs- oder Herstellungskosten.'],
    ['Eine GmbH muss immer nach UGB bewerten.', true, 'Kapitalgesellschaften sind immer rechnungslegungspflichtig.'],
    ['Eine Privatentnahme von Waren wird mit dem Verkaufspreis bewertet.', false, 'Mit dem Teilwert, bei Waren normalerweise der Wiederbeschaffungspreis.'],
    ['Finanzanlagen dürfen auch bei vorübergehender Wertminderung abgewertet werden.', true, 'Gemildertes Niederstwertprinzip mit Wahlrecht.'],
  ];
  gen('g-tf', 'grundlagen', 'Richtig oder falsch', 1, 3, 2, (r) => ({
    kicker: 'Verständnis', ask: 'Richtig oder falsch?', answer: { type: 'tf', items: r.sample(FACTS, 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['Vorsicht: Vermögen eher niedrig, Schulden eher hoch. Aufwerten nie über den Ausgangswert hinaus.'], solution: ['Vermögen wird nach dem Niederstwertprinzip bewertet, Schulden nach dem Höchstwertprinzip.'],
  }));

  // ======== Umlaufvermögen ========
  const GOODS = [['Fernseher', 'Stück', [300, 700]], ['Paar Schi', 'Paar', [180, 320]], ['Kopfhörer', 'Stück', [20, 70]], ['Fahrräder', 'Stück', [400, 900]], ['Kaffeemaschinen', 'Stück', [80, 220]], ['Paar Damenschuhe', 'Paar', [25, 90]]];
  function goods(r, variant) {
    const [name, unit, range] = r.pick(GOODS), ep = r.int(range[0], range[1]), n = r.int(3, 40), d = Math.max(1, Math.round(ep * r.pick([0.06, 0.1, 0.15, 0.2])));
    const wbp = variant === 'lower' ? ep - d : variant === 'higher' ? ep + d : ep;
    return { name, unit, ep, n, wbp, bil: n * Math.min(ep, wbp) };
  }
  gen('uv-waren', 'uv', 'Warenvorrat bewerten', 1, 3, 1, (r) => {
    const g = goods(r, r.pick(['lower', 'lower', 'higher', 'equal']));
    return {
      kicker: 'Umlaufvermögen', lead: `Ein Geschäft hat ${g.name} um je ${E(g.ep)} eingekauft. Am 31. Dezember sind noch ${g.n} davon auf Lager. Der Wiederbeschaffungspreis beträgt dann ${E(g.wbp)} pro ${g.unit}.`,
      ask: 'Ermittle den Bilanzansatz des Warenvorrats am 31. Dezember.',
      answer: fields(money('v', 'Bilanzansatz', g.bil, [{ value: g.n * g.wbp, msg: 'Über die Anschaffungskosten (Einstandspreis) darf nicht bewertet werden.' }, { value: g.n * g.ep, msg: 'Strenges Niederstwertprinzip: Ist der Wert am Stichtag niedriger, **muss** er angesetzt werden.' }, { value: g.n * Math.abs(g.ep - g.wbp), msg: 'Das ist nur die Wertänderung. Gefragt ist der Wert des ganzen Lagerbestands.' }])),
      hints: ['Strenges Niederstwertprinzip: der niedrigere Wert aus Einstandspreis und Wiederbeschaffungspreis.', `Hier ist das ${E(Math.min(g.ep, g.wbp))} pro ${g.unit}.`],
      solution: [`Niedrigerer Wert: ${E(Math.min(g.ep, g.wbp))}`, `${g.n} · ${E(Math.min(g.ep, g.wbp))} = **${E(g.bil)}**`],
      takeaway: 'Umlaufvermögen: strenges Niederstwertprinzip, höchstens Anschaffungskosten.',
    };
  });
  gen('uv-waren-book', 'uv', 'Waren abwerten', 2, 3, 3, (r, st) => {
    const g = goods(r, 'lower'), diff = g.n * (g.ep - g.wbp);
    const ans = booking(r, [['7800', diff]], [['1600', diff]], { pool: ['7010', '7040', '2620', '8271'], effect: st === 3 ? '↓' : undefined });
    return {
      kicker: 'Buchung', lead: `Ein Geschäft hat ${g.name} um je ${E(g.ep)} eingekauft. Am 31.12. sind noch ${g.n} davon auf Lager, der Wiederbeschaffungspreis ist auf ${E(g.wbp)} gesunken.`,
      ask: `Buche die notwendige Abwertung${st === 3 ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: [`Abwertung pro ${g.unit === 'Paar' ? 'Paar' : 'Stück'}: ${E(g.ep - g.wbp)}.`, 'Aufwandskonto an Umlaufvermögen: 7800 Abschreibungen von Vorräten an 1600 Handelswaren.'],
      solution: [`${g.n} · (${E(g.ep)} − ${E(g.wbp)}) = ${E(diff)}`, step(ans)],
    };
  });
  function shares(r) {
    return M.kit.repeat(() => {
      const n = r.pick([100, 200, 300, 500, 1000, 2000]), k0 = r.int(15, 60), ks = [], name = r.pick(['Chemie AG', 'Energie AG', 'Telekom AG', 'Bau AG', 'Computer AG']);
      let k = k0; for (let i = 0; i < 3; i++) { k = Math.max(5, k + r.pick([-1, -1, 1]) * r.int(2, 12)); ks.push(k); }
      const bil = ks.map(x => n * Math.min(k0, x)), prev = [n * k0, ...bil];
      return bil.some((b, i) => b !== prev[i]) ? { n, k0, ks, bil, prev, name } : null;
    });
  }
  const wpTable = s => ({ head: 'row', rows: [['Stichtag', 'Kurs pro Aktie'], ...s.ks.map((k, i) => [`31.12.${2025 + i}`, E(k)])] });
  gen('uv-wp', 'uv', 'Aktien des UV bewerten', 1, 3, 2, (r, st) => {
    const s = shares(r), j = Math.min(st, 3) - 1;
    return {
      kicker: 'Wertpapiere', lead: `Ein Unternehmen kauft 2025 aus spekulativen Gründen ${s.n} Aktien der ${s.name} zum Kurs von ${E(s.k0)}.`, table: wpTable(s),
      ask: `Ermittle den Bilanzansatz am 31.12.${2025 + j}.`,
      answer: fields(money('v', 'Bilanzansatz', s.bil[j], [{ value: s.n * s.ks[j], msg: 'Höchstens bis zu den Anschaffungskosten aufwerten.' }, { value: s.n * s.k0, msg: 'Strenges Niederstwertprinzip: Ein niedrigerer Kurs muss angesetzt werden.' }])),
      hints: ['Bilanzansatz = Stückzahl · niedrigerer Wert aus Anschaffungskurs und Stichtagskurs.'],
      solution: [`${s.n} · ${E(Math.min(s.k0, s.ks[j]))} = **${E(s.bil[j])}**${s.ks[j] > s.k0 ? ' (höchstens Anschaffungskosten)' : ''}`],
    };
  });
  gen('uv-wp-book', 'uv', 'Aktien des UV buchen', 2, 3, 4, (r, st) => {
    const s = shares(r), j = [0, 1, 2].filter(i => s.bil[i] !== s.prev[i]).pop(), d = s.bil[j] - s.prev[j];
    const ans = d < 0 ? booking(r, [['8271', -d]], [['2620', -d]], { pool: ['8180', '7800', '8200', '0800'], effect: st === 3 ? '↓' : undefined }) : booking(r, [['2620', d]], [['8180', d]], { pool: ['8271', '4660', '8170', '0800'], effect: st === 3 ? '↑' : undefined });
    return {
      kicker: 'Buchung', lead: `${s.n} Aktien der ${s.name} (Umlaufvermögen) wurden 2025 zum Kurs von ${E(s.k0)} gekauft.`, table: wpTable(s),
      ask: `Buche die Bewertung zum 31.12.${2025 + j}.`, answer: ans,
      hints: [`Bilanzansatz Vorjahr: ${E(s.prev[j])}. Bilanzansatz neu: ${E(s.bil[j])}.`, d < 0 ? 'Abwertung: 8271 Abschreibungen auf Wertpapiere des UV an 2620.' : 'Zuschreibung, höchstens bis zu den Anschaffungskosten: 2620 an 8180.'],
      solution: [`Neuer Bilanzansatz: ${s.n} · ${E(Math.min(s.k0, s.ks[j]))} = ${E(s.bil[j])}`, `Änderung zum Vorjahr: ${E(d)}`, step(ans)],
    };
  });

  // ======== Anlagevermögen bewerten ========
  function landStory(r) {
    const A = r.pick([2000, 5000, 8000, 10000, 25000]), p0 = r.int(60, 160), p1 = p0 - r.int(4, 12), p2 = p0 - r.int(13, 30), p3 = p0 + r.int(-8, 25);
    const years = [
      { y: 2025, text: `Wegen Spekulationen sinkt der Preis Ende 2025 vorübergehend auf ${E(p1)} pro m².`, bil: A * p0, kind: 'temp' },
      { y: 2026, text: `2026 wird bekannt, dass in der Nähe eine Deponie gebaut wird. Der Preis sinkt dauerhaft auf ${E(p2)} pro m².`, bil: A * p2, kind: 'perm' },
      { y: 2027, text: `2027 wird die Deponie endgültig abgesagt. Der Preis steigt auf ${E(p3)} pro m².`, bil: A * Math.min(p0, p3), kind: 'up' },
    ];
    return { A, p0, p1, p2, p3, years };
  }
  const landLead = s => `Ein Betrieb kauft 2025 ein Grundstück mit ${int(s.A)} m² zu ${E(s.p0)} pro m² für eine spätere Lagerhalle.`;
  gen('av-grund', 'av', 'Grundstück bewerten', 1, 3, 1, (r, st) => {
    const s = landStory(r), j = st - 1, ev = s.years[j];
    return {
      kicker: 'Nicht abnutzbar', lead: `${landLead(s)} ${s.years.slice(0, j + 1).map(x => x.text).join(' ')}`, ask: `Mit welchem Betrag ist das Grundstück am 31.12.${ev.y} anzusetzen?`,
      answer: fields(money('v', `Bilanzansatz ${ev.y}`, ev.bil, [{ value: s.A * s.p1, msg: 'Die Wertminderung ist nur vorübergehend. Beim Anlagevermögen (außer Finanzanlagen) darf dann nicht abgewertet werden.' }, { value: s.A * s.p3, msg: 'Aufwerten nur bis zu den Anschaffungskosten.' }, { value: s.A * s.p0, msg: 'Die Wertminderung ist dauerhaft: Dann **muss** abgewertet werden.' }].filter((t, i) => (j === 0 && i === 0) || (j === 2 && i === 1) || (j === 1 && i === 2)))),
      hints: ['Gemildertes Niederstwertprinzip: nur bei dauernder Wertminderung abwerten.', 'Fallen die Gründe weg, wird aufgewertet, höchstens bis zu den Anschaffungskosten.'],
      solution: [ev.kind === 'temp' ? `Nur vorübergehend: keine Abwertung, Bilanzansatz bleibt ${E(ev.bil)}.` : ev.kind === 'perm' ? `Dauernde Wertminderung: ${int(s.A)} · ${E(s.p2)} = **${E(ev.bil)}**` : `Aufwertung auf ${int(s.A)} · ${E(Math.min(s.p0, s.p3))} = **${E(ev.bil)}**${s.p3 > s.p0 ? ' (höchstens Anschaffungskosten)' : ''}`],
    };
  });
  gen('av-grund-book', 'av', 'Grundstück buchen', 2, 3, 3, (r, st) => {
    const s = landStory(r), j = st === 2 ? 1 : 2, ev = s.years[j], prev = s.years[j - 1].bil, d = ev.bil - prev;
    const ans = d < 0 ? booking(r, [['7040', -d]], [['0200', -d]], { pool: ['7010', '4660', '8200', '0300'], effect: st === 3 ? '↓' : undefined }) : booking(r, [['0200', d]], [['4660', d]], { pool: ['7040', '8170', '8180', '0300'], effect: '↑' });
    return {
      kicker: 'Buchung', lead: `${landLead(s)} ${s.years.slice(0, j + 1).map(x => x.text).join(' ')}`, ask: `Buche die Bewertung zum 31.12.${ev.y}${ans.effect ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: [`Bilanzansatz bisher: ${E(prev)}, neu: ${E(ev.bil)}.`, d < 0 ? '7040 Außerplanmäßige Abschreibungen an 0200 Unbebaute Grundstücke.' : '0200 Unbebaute Grundstücke an 4660 Erträge aus der Zuschreibung zum Anlagevermögen.'],
      solution: [`Änderung: ${E(ev.bil)} − ${E(prev)} = ${E(d)}`, step(ans)],
    };
  });
  const DUTY = [
    ['Ein Grundstück verliert wegen einer geplanten Mülldeponie dauerhaft an Wert.', 'Muss abgewertet werden'],
    ['Der Grundstückspreis sinkt nur vorübergehend wegen Spekulationen.', 'Darf nicht abgewertet werden'],
    ['Der Kurs einer Beteiligung (Finanzanlage) sinkt am Stichtag vorübergehend.', 'Darf abgewertet werden (Wahlrecht)'],
    ['Der Kurs einer Beteiligung sinkt wegen einer Branchenkrise dauerhaft.', 'Muss abgewertet werden'],
    ['Der Wiederbeschaffungspreis der Handelswaren liegt am 31.12. unter dem Einstandspreis.', 'Muss abgewertet werden'],
    ['Aktien des Umlaufvermögens liegen am Stichtag unter dem Anschaffungskurs, eine Erholung ist möglich.', 'Muss abgewertet werden'],
    ['Eine Maschine ist durch neue Technik dauerhaft weniger wert als ihr Buchwert.', 'Muss abgewertet werden'],
    ['Eine Maschine ist am Stichtag kurzfristig schwer verkäuflich, langfristig aber unverändert nutzbar.', 'Darf nicht abgewertet werden'],
    ['Der Grund für eine frühere Abwertung eines Grundstücks fällt weg.', 'Muss aufgewertet werden'],
  ];
  gen('av-pflicht', 'av', 'Muss, darf oder darf nicht?', 1, 3, 2, (r) => {
    const [text, right] = r.pick(DUTY);
    return { kicker: 'Bewertungsregel', lead: text, ask: 'Was gilt für die Bewertung am Abschlussstichtag?', answer: mc(r, right, ['Muss abgewertet werden', 'Darf abgewertet werden (Wahlrecht)', 'Darf nicht abgewertet werden', 'Muss aufgewertet werden'].filter(x => x !== right)), hints: ['Umlaufvermögen: jede Wertminderung. Anlagevermögen: nur dauernde. Finanzanlagen: bei vorübergehender ein Wahlrecht.'], solution: [`**${right}**.`] };
  });
  gen('av-fin-book', 'av', 'Beteiligung buchen', 2, 3, 4, (r, st) => {
    const n = r.pick([500, 1000, 2000]), k0 = r.int(30, 80), k1 = k0 - r.int(5, 15), k2 = k1 + r.int(3, 25), up = st === 3, kNew = Math.min(k0, k2);
    const ans = !up ? booking(r, [['8200', n * (k0 - k1)]], [['0800', n * (k0 - k1)]], { pool: ['8271', '7040', '2620', '8170'], effect: st === 3 ? '↓' : undefined }) : booking(r, [['0800', n * (kNew - k1)]], [['8170', n * (kNew - k1)]], { pool: ['8180', '4660', '2620', '8200'], effect: '↑' });
    return {
      kicker: 'Finanzanlage', lead: `Als langfristige Beteiligung (Finanzanlage) wurden ${n} Aktien zum Kurs von ${E(k0)} gekauft. Ende 2025 fällt der Kurs wegen einer Branchenkrise dauerhaft auf ${E(k1)}.${up ? ` 2026 erholt sich die Branche, der Kurs steigt Ende 2026 auf ${E(k2)}.` : ''}`,
      ask: `Buche die Bewertung zum 31.12.${up ? 2026 : 2025}.`, answer: ans,
      hints: [up ? 'Aufwerten bis höchstens zu den Anschaffungskosten: 0800 an 8170.' : 'Dauernde Wertminderung bei Finanzanlagen: 8200 Abschreibungen auf Beteiligungen an 0800.'],
      solution: [up ? `${n} · (${E(kNew)} − ${E(k1)}) = ${E(n * (kNew - k1))}` : `${n} · (${E(k0)} − ${E(k1)}) = ${E(n * (k0 - k1))}`, step(ans)],
    };
  });
  gen('av-ausser', 'av', 'Außerplanmäßige Abschreibung', 1, 3, 3, (r, st) => {
    const a = asset(r, x => x.acc === '0400'), j = r.int(1, Math.max(1, a.nd - 2)), annual = r2(a.price / a.nd), bw = r2(a.price - j * annual), v = round100(bw * r.pick([0.4, 0.5, 0.6, 0.7])), d = r2(bw - v);
    const lead = `Die Anlage „${a.short}“ (Anschaffung Anfang ${2025 - j}, Anschaffungswert ${E(a.price)}, Nutzungsdauer ${a.nd} Jahre, lineare Abschreibung) ist durch eine neue Technik am 31.12.2025 dauerhaft nur noch ${E(v)} wert.`;
    if (st < 3) return {
      kicker: 'Abnutzbar', lead: st === 1 ? `${lead} Nach der planmäßigen Abschreibung 2025 beträgt ihr Buchwert ${E(bw)}.` : lead, ask: st === 1 ? 'Wie hoch ist die außerplanmäßige Abschreibung?' : 'Berechne den Buchwert nach der planmäßigen Abschreibung 2025 und die außerplanmäßige Abschreibung.',
      answer: fields(st === 2 && money('bw', 'Buchwert 31.12.2025', bw, [{ value: a.price - (j - 1) * annual, msg: 'Die Abschreibung 2025 fehlt noch.' }]), money('d', 'Außerplanmäßige Abschreibung', d, [{ value: a.price - v, msg: 'Ausgangswert ist der Buchwert, nicht der Anschaffungswert.' }])),
      hints: [`Jährliche Abschreibung: ${E(a.price)} : ${a.nd} = ${E(annual)}.`, `Bis Ende 2025 wurden ${j} Jahre abgeschrieben.`],
      solution: [`Buchwert: ${E(a.price)} − ${j} · ${E(annual)} = ${E(bw)}`, `Außerplanmäßig: ${E(bw)} − ${E(v)} = **${E(d)}**`],
    };
    const ans = booking(r, [['7040', d]], [['0400', d]], { pool: ['7010', '7060', '0200', '4660'], effect: '↓' });
    return { kicker: 'Buchung', lead: `${lead} Der Buchwert nach der planmäßigen Abschreibung 2025 beträgt ${E(bw)}.`, ask: 'Buche die außerplanmäßige Abschreibung und gib die Auswirkung auf das Eigenkapital an.', answer: ans, hints: ['Außerplanmäßig wird auf 7040 gebucht, nicht auf 7010.'], solution: [`${E(bw)} − ${E(v)} = ${E(d)}`, step(ans)] };
  });
  const KINDS = [
    ['Ein Lkw wird jedes Jahr 40.000 km gefahren.', 'Ordentliche Wertminderung'], ['Ein Computer nutzt sich durch die tägliche Arbeit ab.', 'Ordentliche Wertminderung'], ['Eine Maschine verschleißt durch den Dreischichtbetrieb.', 'Ordentliche Wertminderung'],
    ['Eine manuell betriebene Anlage ist durch eine digitale Technik überholt.', 'Außerordentliche Wertminderung'], ['Der Grundstückspreis sinkt wegen geringer Nachfrage dauerhaft.', 'Außerordentliche Wertminderung'], ['Ein Hochwasser beschädigt eine Lagerhalle.', 'Außerordentliche Wertminderung'],
  ];
  gen('av-kind', 'av', 'Ordentlich oder außerordentlich?', 1, 2, 1, (r, st) => {
    if (st === 2) {
      const items = [['Gebäude', 'abnutzbar'], ['Maschinen', 'abnutzbar'], ['Betriebs- und Geschäftsausstattung', 'abnutzbar'], ['Grundstücke', 'nicht abnutzbar'], ['Wertpapiere des Anlagevermögens', 'nicht abnutzbar'], ['Beteiligungen', 'nicht abnutzbar']], [name, right] = r.pick(items);
      return { kicker: 'Anlagevermögen', ask: `Sind ${name} abnutzbar oder nicht abnutzbar?`, answer: mc(r, right === 'abnutzbar' ? 'Abnutzbar: planmäßige und außerplanmäßige Abschreibung' : 'Nicht abnutzbar: nur außerplanmäßige Abschreibung', [right === 'abnutzbar' ? 'Nicht abnutzbar: nur außerplanmäßige Abschreibung' : 'Abnutzbar: planmäßige und außerplanmäßige Abschreibung', 'Gar keine Abschreibung möglich']), hints: ['Nutzt es sich durch den Gebrauch ab?'], solution: [`${name}: **${right}**.`] };
    }
    const [text, right] = r.pick(KINDS);
    return { kicker: 'Wertminderung', lead: text, ask: 'Welche Art von Wertminderung liegt vor?', answer: mc(r, right, [right === 'Ordentliche Wertminderung' ? 'Außerordentliche Wertminderung' : 'Ordentliche Wertminderung', 'Keine Wertminderung']), hints: ['Ordentlich: durch die übliche Nutzung. Außerordentlich: durch ein besonderes Ereignis oder technischen Fortschritt.'], solution: [`**${right}**. ${right.startsWith('Ordentliche') ? 'Sie wird durch die planmäßige Abschreibung erfasst.' : 'Sie führt zu einer außerplanmäßigen Abschreibung.'}`] };
  });

  // ======== Verbindlichkeiten und Privat ========
  function fx(r) {
    const usd = r.pick([8000, 12000, 15000, 24000, 30000, 45000]), k0 = r.pick([1.08, 1.1, 1.12, 1.15, 1.18]), up = r.chance(0.65), k1 = up ? r2(k0 - r.pick([0.04, 0.05, 0.06, 0.08])) : r2(k0 + r.pick([0.03, 0.05, 0.07]));
    const e0 = r2(usd / k0), e1 = r2(usd / k1), bil = Math.max(e0, e1);
    return { usd, k0, k1, e0, e1, bil, up: e1 > e0 };
  }
  const kurs = k => String(k).replace('.', ',');
  const fxLead = f => `Ein Händler kauft im November Waren bei einem Lieferanten in den USA um USD ${int(f.usd)} auf Ziel. Kurs bei der Lieferung: 1 € = ${kurs(f.k0)} USD. Am 31.12. gilt: 1 € = ${kurs(f.k1)} USD.`;
  gen('fk-fx', 'fk', 'Fremdwährung bewerten', 1, 3, 2, (r) => {
    const f = fx(r);
    return {
      kicker: 'Verbindlichkeit', lead: fxLead(f), ask: 'Mit welchem Betrag ist die Verbindlichkeit am 31.12. anzusetzen?',
      answer: fields(money('v', 'Bilanzansatz', f.bil, [{ value: f.e1, msg: 'Strenges Höchstwertprinzip: Unter den Entstehungswert darf nicht abgewertet werden.' }, { value: f.usd * f.k1, msg: 'Umrechnung andersherum: USD-Betrag durch den Kurs dividieren.' }, { value: f.e0, msg: 'Der Erfüllungsbetrag ist gestiegen. Der höhere Wert **muss** angesetzt werden.' }].filter((t, i) => i === 1 || (i === 0 && !f.up) || (i === 2 && f.up)))),
      hints: [`Entstehungswert: USD ${int(f.usd)} : ${kurs(f.k0)} = ${E(f.e0)}.`, 'Strenges Höchstwertprinzip: der höhere Wert aus Entstehungswert und Wert am Stichtag.'],
      solution: [`Entstehungswert: ${E(f.e0)}`, `Wert am 31.12.: USD ${int(f.usd)} : ${kurs(f.k1)} = ${E(f.e1)}`, `Bilanzansatz: **${E(f.bil)}**`],
    };
  });
  gen('fk-fx-book', 'fk', 'Fremdwährung buchen', 2, 3, 4, (r, st) => {
    const f = M.kit.repeat(() => { const x = fx(r); return x.up ? x : null; }), names = {}, s = supplier(r, names, 'US Outdoor Supply Inc.'), d = r2(f.e1 - f.e0);
    if (st === 3) {
      const k2 = r2(f.k1 + r.pick([0.02, 0.03, 0.05, 0.09])), e2 = r2(f.usd / k2), bil2 = Math.max(f.e0, e2), back = r2(f.e1 - bil2);
      const ans = booking(r, [[s.no, back]], [['4840', back]], { names, pool: ['7815', '2800', '4660'], effect: '↑' });
      return { kicker: 'Buchung', lead: `${fxLead(f)} Die Verbindlichkeit wurde daher mit ${E(f.e1)} bilanziert. Sie ist am 31.12. des Folgejahres noch offen, Kurs dann: 1 € = ${kurs(k2)} USD. Lieferantenkonto ${s.no} (${s.name}).`, ask: 'Buche die Bewertung zum 31.12. des Folgejahres.', answer: ans, hints: [`Wert neu: ${E(e2)}. Unter den Entstehungswert von ${E(f.e0)} darf aber nicht abgewertet werden.`, 'Verbindlichkeit an Ertragskonto.'], solution: [`Neuer Bilanzansatz: ${E(bil2)}`, `Abwertung: ${E(f.e1)} − ${E(bil2)} = ${E(back)}`, step(ans)] };
    }
    const ans = booking(r, [['7815', d]], [[s.no, d]], { names, pool: ['4840', '2500', '1600'], effect: '↓' });
    return { kicker: 'Buchung', lead: `${fxLead(f)} Lieferantenkonto ${s.no} (${s.name}).`, ask: 'Buche die notwendige Aufwertung der Verbindlichkeit und gib die Auswirkung auf das Eigenkapital an.', answer: ans, hints: [`Entstehungswert ${E(f.e0)}, Wert am Stichtag ${E(f.e1)}.`, 'Aufwandskonto an Verbindlichkeit.'], solution: [`${E(f.e1)} − ${E(f.e0)} = ${E(d)}`, step(ans)] };
  });
  const PRIVATE_GOODS = [['einen Laptop', [900, 1500]], ['eine Armbanduhr', [80, 400]], ['einen Fernseher', [400, 900]], ['ein Fahrrad', [500, 1200]], ['eine Kaffeemaschine', [120, 300]]];
  function withdrawal(r) {
    const [what, range] = r.pick(PRIVATE_GOODS), ep = round10(r.int(range[0], range[1])), v = r.pick(['same', 'lower', 'higher']), d = round10(ep * r.pick([0.08, 0.1, 0.15]));
    const tw = v === 'same' ? ep : v === 'lower' ? ep - d : ep + d, vk = round10(Math.max(ep, tw) * 1.25);
    return { what, ep, tw, vk };
  }
  gen('pv-entnahme', 'fk', 'Privatentnahme bewerten', 1, 3, 1, (r, st) => {
    const w = withdrawal(r), lead = `Die Inhaberin entnimmt am 12. Dezember ${w.what} aus dem Warenlager für private Zwecke. Einstandspreis: ${E(w.ep)}, Wiederbeschaffungspreis am 12. Dezember: ${E(w.tw)}, Verkaufspreis ohne USt: ${E(w.vk)}.`;
    if (st === 1) return { kicker: 'Privat', lead, ask: 'Mit welchem Wert (ohne USt) ist die Entnahme anzusetzen?', answer: fields(money('v', 'Teilwert', w.tw, [{ value: w.ep, msg: 'Nicht der Einstandspreis: Entnahmen werden mit dem Teilwert zum Zeitpunkt der Entnahme bewertet.' }, { value: w.vk, msg: 'Nicht der Verkaufspreis: Teilwert ist bei Waren der Wiederbeschaffungspreis.' }])), hints: ['Privatentnahmen: Teilwert zum Zeitpunkt der Entnahme, bei Waren der Wiederbeschaffungspreis.'], solution: [`Teilwert = Wiederbeschaffungspreis = **${E(w.tw)}**`] };
    const ust = r2(w.tw * 0.2), ans = booking(r, [['9600', w.tw + ust]], [['4900', w.tw], ['3500', ust]], { pool: ['2500', '1600', '7800'] });
    return { kicker: 'Buchung', lead, ask: 'Verbuche die Privatentnahme.', answer: ans, hints: [`Teilwert ${E(w.tw)} plus 20 % Umsatzsteuer.`, '9600 Privat an 4900 Eigenverbrauch und 3500 Umsatzsteuer.'], solution: [`Teilwert ${E(w.tw)} + USt ${E(ust)} = ${E(w.tw + ust)}`, step(ans)] };
  });
  gen('pv-einlage', 'fk', 'Privateinlage', 1, 3, 3, (r, st) => {
    const [what, acc] = r.pick([['ihren privaten Laptop', '0620'], ['ihr privates Kombi-Fahrzeug', '0630'], ['einen privaten Büroschrank', '0600']]), ak = round100(r.int(1500, 24000)), tw = round10(ak * r.pick([0.35, 0.5, 0.6]));
    const lead = `Eine Unternehmerin bringt ${what} in ihren Betrieb ein. Sie hat dafür vor einigen Jahren ${E(ak)} bezahlt, am Tag der Einlage beträgt der Teilwert ${E(tw)}.`;
    if (st === 1) return { kicker: 'Privat', lead, ask: 'Mit welchem Wert wird die Einlage angesetzt?', answer: mc(r, 'Teilwert zum Zeitpunkt der Einlage', ['Ursprünglicher Kaufpreis', 'Wiederbeschaffungspreis eines neuen Geräts', 'Erfüllungsbetrag']), hints: ['Einlagen werden wie Entnahmen mit dem Teilwert bewertet.'], solution: [`Teilwert zum Zeitpunkt der Einlage: **${E(tw)}**`] };
    const ans = booking(r, [[acc, tw]], [['9600', tw]], { pool: ['2500', '2800', '4900'] });
    return { kicker: 'Buchung', lead, ask: 'Verbuche die Privateinlage (ohne Umsatzsteuer).', answer: ans, hints: ['Anlagenkonto an 9600 Privat, mit dem Teilwert.'], solution: [step(ans)] };
  });
  gen('fk-tf', 'fk', 'Verbindlichkeiten verstehen', 1, 2, 2, (r) => ({
    kicker: 'Verständnis', ask: 'Richtig oder falsch?', answer: { type: 'tf', items: r.sample([
      ['Verbindlichkeiten werden mit dem Erfüllungsbetrag bewertet.', true, 'Ausgangswert ist der Erfüllungsbetrag zum Entstehungszeitpunkt.'],
      ['Steigt der Erfüllungsbetrag am Stichtag, muss der höhere Betrag angesetzt werden.', true, 'Strenges Höchstwertprinzip.'],
      ['Sinkt der Erfüllungsbetrag unter den Entstehungswert, wird auf den niedrigeren Wert abgewertet.', false, 'Höchstens bis zum Entstehungswert.'],
      ['Eine Aufwertung einer Verbindlichkeit vermindert den Gewinn.', true, 'Sie wird über ein Aufwandskonto gebucht.'],
      ['Die Bewertung von Verbindlichkeiten spielt vor allem bei Fremdwährungen eine Rolle.', true, 'Der Eurobetrag ändert sich mit dem Wechselkurs.'],
      ['Eine Privatentnahme wird mit dem Einstandspreis bewertet.', false, 'Mit dem Teilwert zum Zeitpunkt der Entnahme.'],
    ], 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['Schulden: lieber zu hoch als zu niedrig.'], solution: ['Verbindlichkeiten: strenges Höchstwertprinzip, nie unter den Entstehungswert.'],
  }));

  // ======== Anlagenkauf ========
  function purchase(r, st) {
    const a = asset(r, x => x.acc !== '0640'), names = {}, s = supplier(r, names), rab = st >= 2 && r.chance(0.6) ? r.pick([5, 10]) : 0, list = a.price;
    const after = r2(list * (1 - rab / 100)), transport = round10(r.int(80, 900)), montage = round10(r.int(300, 3500)), fund = st === 3 && r.chance(0.5) ? round10(r.int(400, 2000)) : 0, sk = st >= 2 ? r.pick([2, 3]) : 0, skonto = r2(after * sk / 100), zins = st === 3 ? round10(r.int(200, 1500)) : 0;
    const aw = r2(after + transport + montage + fund - skonto);
    return { a, names, s, rab, list, after, transport, montage, fund, sk, skonto, zins, aw };
  }
  gen('ak-calc', 'akauf', 'Anschaffungswert berechnen', 1, 3, 1, (r, st) => {
    const p = purchase(r, st), items = [`Listenpreis ${E(p.list)}${p.rab ? `, abzüglich ${p.rab} % Rabatt` : ''}`, `Transportkosten ${E(p.transport)}`, `Montage und Inbetriebnahme ${E(p.montage)}`];
    if (p.fund) items.push(`Fundament für die Aufstellung ${E(p.fund)}`);
    if (p.sk) items.push(`Bei Zahlung werden ${p.sk} % Skonto vom Kaufpreis abgezogen`);
    if (p.zins) items.push(`Kreditzinsen für die Finanzierung ${E(p.zins)}`);
    return {
      kicker: 'Anschaffungswert', lead: `Ein Unternehmen kauft ${p.a.name}. Alle Beträge ohne Umsatzsteuer: ${items.join('; ')}.`, ask: 'Berechne den Anschaffungswert.',
      answer: fields(money('aw', 'Anschaffungswert', p.aw, [{ value: p.aw * 1.2, msg: 'Die Vorsteuer gehört nicht zum Anschaffungswert.' }, { value: p.aw + p.zins, msg: 'Finanzierungskosten wie Kreditzinsen gehören **nicht** zu den Anschaffungskosten.' }, { value: p.aw + p.skonto, msg: 'Skonto ist eine Preisminderung und wird abgezogen.' }, { value: p.aw + p.list - p.after, msg: 'Der Rabatt wird vom Listenpreis abgezogen.' }, { value: p.after, msg: 'Die Nebenkosten (Transport, Montage) gehören dazu.' }])),
      hints: ['Kaufpreis + Nebenkosten − Preisminderungen, alles ohne Vorsteuer.', p.zins ? 'Achtung: Finanzierungskosten zählen nicht dazu.' : 'Transport und Montage sind Nebenkosten.'],
      solution: [`Kaufpreis${p.rab ? ` nach Rabatt` : ''}: ${E(p.after)}`, `+ Nebenkosten: ${E(p.transport + p.montage + p.fund)}`, ...(p.sk ? [`− Skonto ${p.sk} %: ${E(p.skonto)}`] : []), ...(p.zins ? ['Kreditzinsen bleiben weg.'] : []), `Anschaffungswert: **${E(p.aw)}**`],
      takeaway: 'Anschaffungswert = Kaufpreis + Nebenkosten − Preisminderungen, ohne Vorsteuer und ohne Finanzierungskosten.',
    };
  });
  gen('ak-buy', 'akauf', 'Anlagenkauf buchen', 1, 3, 2, (r, st) => {
    const a = asset(r, x => x.acc !== '0640'), names = {}, s = supplier(r, names), ust = r2(a.price * 0.2), cash = st === 3 && r.chance(0.4);
    const ans = booking(r, [[a.acc, a.price], ['2500', ust]], [[cash ? '2800' : s.no, a.price + ust]], { names, pool: [...ASSET_POOL, '3500', cash ? s.no : '2800'], effect: st >= 2 ? 'Ø' : undefined });
    return {
      kicker: 'Buchung', lead: `Eingangsrechnung von ${s.name} (${s.no}): ${a.short} um ${E(a.price)} + ${E(ust)} USt = ${E(a.price + ust)}${cash ? ', sofort per Banküberweisung bezahlt' : ''}.`,
      ask: `Verbuche den Kauf${st >= 2 ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: [`Das Anlagegut kommt auf ${label(a.acc)}.`, 'Die Umsatzsteuer auf der Rechnung ist für das Unternehmen Vorsteuer (2500).'],
      solution: [step(ans), 'Der Kauf ist erfolgsneutral: Erst die Abschreibung wirkt sich auf den Gewinn aus.'],
    };
  });
  gen('ak-neben', 'akauf', 'Nebenkosten buchen', 1, 3, 3, (r, st) => {
    const a = asset(r, x => x.acc === '0400' || x.acc === '0600'), names = {}, s = supplier(r, names, r.pick(['Montagebau Kern OG', 'Elektro Pichler GmbH', 'Transporte Weiss GmbH'])), n = round10(r.int(300, 3500)), ust = r2(n * 0.2);
    const ans = booking(r, [[a.acc, n], ['2500', ust]], [[s.no, n + ust]], { names, pool: ['7010', '7060', '3500', '2800'], effect: st >= 2 ? 'Ø' : undefined });
    return {
      kicker: 'Buchung', lead: `Für ${a.name} stellt ${s.name} (${s.no}) die Aufstellung und den Anschluss in Rechnung: ${E(n)} + ${E(ust)} USt = ${E(n + ust)}.`, ask: 'Verbuche die Rechnung.', answer: ans,
      hints: ['Kosten der Aufstellung und Inbetriebnahme sind Nebenkosten: Sie werden auf dem Anlagenkonto aktiviert, nicht als Aufwand gebucht.'], solution: [step(ans), 'Nebenkosten erhöhen den Anschaffungswert.'],
    };
  });
  gen('ak-skonto', 'akauf', 'Zahlung mit Skonto', 2, 3, 4, (r, st) => {
    const a = asset(r, x => x.acc !== '0640'), names = {}, s = supplier(r, names), ust = r2(a.price * 0.2), gross = r2(a.price + ust), sk = r.pick([2, 3]), skB = r2(gross * sk / 100), skN = r2(skB / 1.2), skV = r2(skB - skN), pay = r2(gross - skB);
    const ans = booking(r, [[s.no, gross]], [['2800', pay], [a.acc, skN], ['2500', skV]], { names, pool: ['3500', '7010', '2700'], effect: st === 3 ? 'Ø' : undefined });
    return {
      kicker: 'Buchung', lead: `Die Rechnung von ${s.name} (${s.no}) für „${a.short}“ lautet auf ${E(a.price)} + ${E(ust)} USt = ${E(gross)}. Sie wird mit ${sk} % Skonto per Bank bezahlt: Überweisung ${E(pay)}.`,
      ask: 'Verbuche die Zahlung samt Skonto.', answer: ans,
      hints: [`Skonto brutto: ${E(skB)}, davon netto ${E(skN)} und Vorsteuer ${E(skV)}.`, 'Der Skonto mindert den Anschaffungswert (Haben am Anlagenkonto) und die Vorsteuer.'],
      solution: [`Skonto: ${sk} % von ${E(gross)} = ${E(skB)}`, `Netto ${E(skN)}, Vorsteuerkorrektur ${E(skV)}`, step(ans)],
      takeaway: 'Skonto bei Anlagen: Haben am Anlagenkonto, nicht auf einem Ertragskonto.',
    };
  });
  gen('ak-pkw', 'akauf', 'Pkw-Kauf buchen', 1, 3, 3, (r, st) => {
    const names = {}, s = supplier(r, names, 'Autohaus Mayrhofer GmbH'), elektro = st > 1 && r.chance(0.5);
    if (elektro) {
      const gross = round100(r.int(30000, 39900)), net = r2(gross / 1.2), v = r2(gross - net), ans = booking(r, [['0630', net], ['2500', v]], [[s.no, gross]], { names, pool: ['0640', '3500', '7010'] });
      return { kicker: 'Buchung', lead: `Kauf eines Elektro-Pkw (0 g CO₂) bei ${s.name} (${s.no}) um ${E(gross)} inklusive 20 % USt.`, ask: 'Verbuche den Kauf.', answer: ans, hints: ['Elektro-Pkw bis € 40.000,– brutto sind vorsteuerabzugsberechtigt und NoVA-frei.'], solution: [`Netto: ${E(gross)} : 1,2 = ${E(net)}`, step(ans)] };
    }
    const gross = round100(r.int(25000, 39900)), ans = booking(r, [['0630', gross]], [[s.no, gross]], { names, pool: ['2500', '0640', '3500'] });
    return { kicker: 'Buchung', lead: `Kauf eines Firmen-Pkw mit Verbrennermotor bei ${s.name} (${s.no}) um ${E(gross)} inklusive USt und NoVA.`, ask: 'Verbuche den Kauf.', answer: ans, hints: ['Beim Pkw gibt es keinen Vorsteuerabzug. Der Anschaffungswert ist der Bruttobetrag samt NoVA.'], solution: [step(ans), 'Kein Vorsteuerabzug: Die USt gehört zum Anschaffungswert.'], takeaway: 'Pkw (Verbrenner): Kaufpreis + NoVA + USt, kein Vorsteuerabzug.' };
  });
  const GWG_ITEMS = [['einen Ventilator für die Verwaltung', '0600', [300, 900]], ['ein Tablet', '0620', [700, 1400]], ['einen Bürostuhl', '0600', [400, 1300]], ['einen Drucker', '0620', [250, 1300]], ['eine Kaffeemaschine für den Pausenraum', '0600', [500, 1250]], ['einen Monitor', '0620', [300, 1250]]];
  gen('ak-gwg', 'akauf', 'GWG oder Anlage?', 1, 3, 2, (r, st) => {
    const [what, acc, range] = r.pick(GWG_ITEMS), gross = M.kit.repeat(() => { const g = r.int(range[0], range[1]) - 0.01 * r.pick([0, 0, 1]); const n = g / 1.2; return Math.abs(n - 1000) > 15 ? { g } : null; }).g, net = r2(gross / 1.2), v = r2(gross - net), gwg = net <= 1000, pay = r.pick(['3190', '2700', '3180']);
    const ans = booking(r, [[gwg ? '7060' : acc, net], ['2500', v]], [[pay, gross]], { pool: [gwg ? acc : '7060', '7010', '3500', '2800', ...['3190', '2700', '3180'].filter(x => x !== pay).slice(0, 1)], effect: st >= 2 ? (gwg ? '↓' : 'Ø') : undefined });
    return {
      kicker: 'GWG', lead: `Ein Betrieb kauft ${what} um ${E(gross)} inklusive 20 % USt und bezahlt ${{ '3190': 'mit der Firmendebitkarte', '2700': 'bar', '3180': 'mit der Firmenkreditkarte' }[pay]}. Die Nutzungsdauer beträgt mehrere Jahre. Geringwertige Wirtschaftsgüter werden sofort abgeschrieben.`,
      ask: `Verbuche den Kauf${st >= 2 ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: ['GWG-Grenze: Anschaffungswert bis € 1.000,– **ohne USt**.', `Netto: ${E(gross)} : 1,2 = ${E(net)}.`, 'Kartenzahlung: zuerst gegen 3190 (Debitkarte) bzw. 3180 (Kreditkarte), noch nicht gegen die Bank.'],
      solution: [`Netto ${E(net)}: ${gwg ? 'unter' : 'über'} € 1.000,–, also ${gwg ? 'geringwertiges Wirtschaftsgut, sofort als Aufwand (7060)' : 'normales Anlagegut, wird aktiviert'}.`, step(ans)],
      takeaway: 'GWG-Grenze immer am Nettobetrag prüfen.',
    };
  });
  const CLASSES = [['eine Software-Lizenz', 'Immaterielle Vermögensgegenstände'], ['ein Patent', 'Immaterielle Vermögensgegenstände'], ['ein Markenrecht', 'Immaterielle Vermögensgegenstände'], ['ein Lieferwagen eines Bäckers', 'Sachanlagen'], ['ein Betriebsgrundstück', 'Sachanlagen'], ['eine Maschine', 'Sachanlagen'], ['eine Beteiligung an einem Zulieferer', 'Finanzanlagen'], ['Wertpapiere, die langfristig gehalten werden', 'Finanzanlagen'], ['ein Pkw, den ein Autohändler verkaufen will', 'Umlaufvermögen'], ['Aktien, die zur Spekulation gekauft wurden', 'Umlaufvermögen']];
  gen('ak-class', 'akauf', 'Wohin gehört es?', 1, 2, 1, (r) => {
    const [item, right] = r.pick(CLASSES);
    return { kicker: 'Anlagevermögen', ask: `Wohin gehört ${item}?`, answer: mc(r, right, ['Immaterielle Vermögensgegenstände', 'Sachanlagen', 'Finanzanlagen', 'Umlaufvermögen'].filter(x => x !== right)), hints: ['Anlagevermögen dient dem Betrieb dauerhaft (länger als ein Jahr). Was verkauft werden soll, ist Umlaufvermögen.'], solution: [`${item[0].toUpperCase()}${item.slice(1)}: **${right}**.`], takeaway: 'Entscheidend ist der Verwendungszweck, nicht die Sache selbst.' };
  });
  gen('ak-tf', 'akauf', 'Richtig oder falsch', 1, 3, 2, (r) => ({
    kicker: 'Verständnis', ask: 'Richtig oder falsch?', answer: { type: 'tf', items: r.sample([
      ['Die GWG-Grenze von € 1.000,– gilt für den Betrag ohne Umsatzsteuer.', true, 'Maßgeblich ist der Nettobetrag.'],
      ['Kreditzinsen für die Finanzierung einer Maschine gehören zum Anschaffungswert.', false, 'Finanzierungskosten gehören nicht dazu.'],
      ['Transport- und Montagekosten gehören zum Anschaffungswert.', true, 'Sie sind Nebenkosten.'],
      ['Beim Kauf eines Pkw mit Verbrennermotor kann die Vorsteuer abgezogen werden.', false, 'Kein Vorsteuerabzug, die USt gehört zum Anschaffungswert.'],
      ['Ein Skonto mindert den Anschaffungswert einer Anlage.', true, 'Er ist eine Preisminderung.'],
      ['Der Kauf einer Anlage vermindert den Gewinn sofort um den Kaufpreis.', false, 'Der Kauf ist erfolgsneutral, nur die Abschreibung ist Aufwand.'],
      ['Selbst hergestellte Anlagen werden mit den Herstellungskosten erfasst.', true, 'Herstellungskosten statt Anschaffungskosten.'],
    ], 4).map(([text, truth, why]) => ({ text, truth, why })) },
    hints: ['Was braucht es, um die Anlage zu erwerben und betriebsbereit zu machen? Nur das zählt.'], solution: ['Anschaffungswert = Kaufpreis + Nebenkosten − Preisminderungen.'],
  }));

  // ======== Abschreibung berechnen ========
  const MONTHS = ['Jänner', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  function afaCase(r, o = {}) {
    const a = asset(r, o.filter), month = o.month ?? r.int(1, 12), day = r.int(1, 28), nd = o.nd ?? a.nd, aw = o.aw ?? a.price, keepEuro = !!o.keepEuro;
    return { a, month, day, nd, aw, plan: afaPlan(aw, nd, month, { keepEuro }), when: date(day, month) };
  }
  gen('afa-basic', 'afa', 'Satz und Jahresbetrag', 1, 2, 1, (r, st) => {
    const c = afaCase(r, { month: 2 }), annual = c.plan.annual;
    return {
      kicker: 'Linear', lead: `${c.a.short}: Anschaffungswert ${E(c.aw)}, Nutzungsdauer ${c.nd} Jahre, lineare Abschreibung.`, ask: 'Berechne den Abschreibungssatz und den jährlichen Abschreibungsbetrag.',
      answer: fields(field('p', 'Abschreibungssatz', 100 / c.nd, { d: 2, tol: 0.011, unit: '%', traps: [{ value: c.nd, msg: 'Abschreibungssatz = 100 : Nutzungsdauer.' }] }), money('a', 'Abschreibungsbetrag pro Jahr', annual, [{ value: c.aw / c.nd / 2, msg: 'Das wäre nur die halbe Jahresabschreibung.' }, { value: c.aw * c.nd / 100, msg: 'Anschaffungswert durch Nutzungsdauer dividieren.' }])),
      hints: ['Abschreibungssatz = 100 : Nutzungsdauer.', 'Abschreibungsbetrag = Anschaffungswert : Nutzungsdauer.'],
      solution: [`100 : ${c.nd} = ${pct(100 / c.nd)}`, `${E(c.aw)} : ${c.nd} = **${E(annual)}**`],
    };
  });
  gen('afa-half', 'afa', 'Halbjahresregel', 1, 3, 2, (r, st) => {
    const c = afaCase(r), first = c.plan.rows[0].afa;
    if (st === 1) return { kicker: 'Halbjahresregel', lead: `Die Anlage „${c.a.short}“ wird am ${c.when} in Betrieb genommen.`, ask: 'Welche Abschreibung wird im ersten Jahr angesetzt?', answer: mc(r, c.plan.half ? 'Die halbe Jahresabschreibung' : 'Die ganze Jahresabschreibung', [c.plan.half ? 'Die ganze Jahresabschreibung' : 'Die halbe Jahresabschreibung', 'Nur die Monate ab der Inbetriebnahme']), hints: ['Entscheidend ist die Inbetriebnahme: bis 30. Juni ganzes Jahr, ab 1. Juli halbes Jahr.'], solution: [`Inbetriebnahme im ${MONTHS[c.month - 1]}: **${c.plan.half ? 'zweite' : 'erste'} Jahreshälfte**, daher ${c.plan.half ? 'halbe' : 'ganze'} Jahresabschreibung.`] };
    return {
      kicker: 'Halbjahresregel', lead: `${c.a.short}: Anschaffungswert ${E(c.aw)}, Inbetriebnahme am ${c.when}, Nutzungsdauer ${c.nd} Jahre, lineare Abschreibung.`, ask: 'Wie hoch ist die Abschreibung im ersten Jahr (2025)?',
      answer: fields(money('a', 'Abschreibung 2025', first, [{ value: c.plan.half ? c.plan.annual : c.plan.annual / 2, msg: c.plan.half ? 'Inbetriebnahme in der zweiten Jahreshälfte: nur die halbe Jahresabschreibung.' : 'Inbetriebnahme bis 30. Juni: die ganze Jahresabschreibung.' }, { value: c.plan.annual * (13 - c.month) / 12, msg: 'Es wird nicht monatsgenau gerechnet, sondern mit der Halbjahresregel.' }])),
      hints: [`Jahresabschreibung: ${E(c.aw)} : ${c.nd} = ${E(c.plan.annual)}.`, 'Kauf oder Lieferung zählen nicht, nur der Tag der Inbetriebnahme.'],
      solution: [`Jahresabschreibung ${E(c.plan.annual)}`, `Inbetriebnahme ${c.when}: ${c.plan.half ? 'halbe' : 'ganze'} Jahresabschreibung = **${E(first)}**`],
    };
  });
  gen('afa-table', 'afa', 'Abschreibungstabelle', 1, 3, 3, (r, st) => {
    const keepEuro = st === 3 && r.chance(0.5), c = afaCase(r, { keepEuro, nd: st === 3 ? r.int(3, 5) : undefined }), rows = c.plan.rows, n = st === 3 ? rows.length : 2;
    const f = []; rows.slice(0, n).forEach((x, i) => { f.push(money(`a${i}`, `Abschreibung ${x.year}`, x.afa, i === 0 ? [{ value: c.plan.half ? c.plan.annual : c.plan.annual / 2, msg: 'Halbjahresregel prüfen: Wann wurde die Anlage in Betrieb genommen?' }] : [])); f.push(money(`b${i}`, `Buchwert 31.12.${x.year}`, x.bw)); });
    return {
      kicker: 'Tabelle', lead: `${c.a.short}: Anschaffungswert ${E(c.aw)}, Inbetriebnahme am ${c.when}, Nutzungsdauer ${c.nd} Jahre, lineare Abschreibung.${keepEuro ? ' Die Anlage bleibt nach Ende der Nutzungsdauer weiter im Betrieb (Erinnerungseuro).' : ' Die Anlage scheidet nach Ablauf der Nutzungsdauer aus.'}`,
      ask: `Berechne die Abschreibungsbeträge und Buchwerte ${st === 3 ? 'für die gesamte Nutzungsdauer' : 'für 2025 und 2026'}.`,
      answer: { type: 'fields', fields: f },
      hints: [`Jahresabschreibung: ${E(c.plan.annual)}.`, c.plan.half ? 'Inbetriebnahme in der zweiten Jahreshälfte: im ersten und im letzten Jahr nur die Hälfte.' : 'Inbetriebnahme bis 30. Juni: schon im ersten Jahr die ganze Abschreibung.', ...(keepEuro ? ['Im letzten Jahr wird um € 1,– weniger abgeschrieben (Erinnerungseuro).'] : [])],
      solution: [{ table: afaTable(c.aw, c.plan, n) }],
    };
  });
  gen('afa-bw', 'afa', 'Buchwert berechnen', 2, 3, 4, (r) => {
    const c = afaCase(r, { nd: r.int(5, 10) }), k = r.int(2, Math.min(c.plan.rows.length - 1, 4)), row = c.plan.rows[k - 1], sum = r2(c.aw - row.bw);
    return {
      kicker: 'Buchwert', lead: `${c.a.short}: Anschaffungswert ${E(c.aw)}, Inbetriebnahme am ${c.when}, Nutzungsdauer ${c.nd} Jahre, lineare Abschreibung.`, ask: `Wie hoch ist der Buchwert am 31.12.${row.year}?`,
      answer: fields(money('bw', `Buchwert 31.12.${row.year}`, row.bw, [{ value: c.aw - k * c.plan.annual, msg: 'Halbjahresregel im ersten Jahr beachten.' }, { value: sum, msg: 'Das sind die bisherigen Abschreibungen. Buchwert = Anschaffungswert minus diese Summe.' }])),
      hints: ['Buchwert = Anschaffungswert − bisherige Abschreibungen.', `Bisher abgeschrieben: ${c.plan.rows.slice(0, k).map(x => E(x.afa)).join(' + ')}.`],
      solution: [`Bisherige Abschreibungen: ${E(sum)}`, `${E(c.aw)} − ${E(sum)} = **${E(row.bw)}**`],
    };
  });
  gen('afa-rnd', 'afa', 'Restnutzungsdauer', 1, 2, 2, (r) => {
    const nd = r.int(4, 12), used = r.int(1, nd - 1), a = asset(r);
    return { kicker: 'Restnutzungsdauer', lead: `Die Anlage „${a.short}“ hat eine Nutzungsdauer von ${nd} Jahren und wurde bereits ${used} Jahre genutzt.`, ask: 'Wie groß ist die Restnutzungsdauer?', answer: fields(field('rnd', 'Restnutzungsdauer', nd - used, { d: 0, tol: 0.01, unit: 'Jahre' })), hints: ['Gesamte Nutzungsdauer − bisherige Nutzungsdauer.'], solution: [`${nd} − ${used} = **${nd - used} Jahre**`] };
  });
  gen('afa-last', 'afa', 'Letztes Jahr und Erinnerungseuro', 2, 3, 5, (r) => {
    const keepEuro = r.chance(0.6), c = afaCase(r, { keepEuro, nd: r.int(3, 8) }), last = c.plan.rows.at(-1), prev = c.plan.rows.at(-2);
    return {
      kicker: 'Letztes Jahr', lead: `${c.a.short}: Anschaffungswert ${E(c.aw)}, Inbetriebnahme am ${c.when}, Nutzungsdauer ${c.nd} Jahre. Buchwert am 31.12.${prev.year}: ${E(prev.bw)}. ${keepEuro ? 'Die Anlage bleibt danach weiter im Betrieb.' : 'Sie scheidet am Ende der Nutzungsdauer aus.'}`,
      ask: `Wie hoch ist die Abschreibung im letzten Jahr ${last.year}?`,
      answer: fields(money('a', `Abschreibung ${last.year}`, last.afa, [{ value: prev.bw, msg: 'Die Anlage bleibt im Betrieb: Erinnerungseuro, also € 1,– weniger abschreiben.' }, { value: prev.bw - 1, msg: 'Die Anlage scheidet aus: Es bleibt kein Erinnerungseuro stehen.' }, { value: c.plan.annual, msg: 'Halbjahresregel: Im letzten Jahr kommt nur noch der Rest.' }])),
      hints: ['Im letzten Jahr wird der restliche Buchwert abgeschrieben.', 'Bleibt die Anlage weiter im Betrieb, bleibt € 1,– stehen.'],
      solution: [`Rest-Buchwert ${E(prev.bw)}${keepEuro ? ' − € 1,– Erinnerungseuro' : ''} = **${E(last.afa)}**`],
    };
  });
  gen('afa-aw', 'afa', 'Vom Beleg zur Abschreibung', 3, 3, 6, (r) => {
    const p = purchase(r, 2), month = r.int(1, 12), plan = afaPlan(p.aw, p.a.nd, month);
    return {
      kicker: 'Komplett', lead: `Ein Betrieb kauft ${p.a.name}: Listenpreis ${E(p.list)}${p.rab ? ` abzüglich ${p.rab} % Rabatt` : ''}, Transport ${E(p.transport)}, Montage ${E(p.montage)}, ${p.sk} % Skonto vom Kaufpreis (alle Beträge ohne USt). Inbetriebnahme am ${date(r.int(1, 28), month)}, Nutzungsdauer ${p.a.nd} Jahre.`,
      ask: 'Berechne den Anschaffungswert und die Abschreibung 2025.',
      answer: fields(money('aw', 'Anschaffungswert', p.aw, [{ value: p.aw + p.skonto, msg: 'Skonto abziehen.' }, { value: p.aw * 1.2, msg: 'Ohne Vorsteuer.' }]), money('a', 'Abschreibung 2025', plan.rows[0].afa, [{ value: plan.half ? plan.annual : plan.annual / 2, msg: 'Halbjahresregel prüfen.' }])),
      hints: ['Zuerst der Anschaffungswert, dann Anschaffungswert : Nutzungsdauer.', `Inbetriebnahme im ${MONTHS[month - 1]}.`],
      solution: [`Anschaffungswert: ${E(p.after)} + ${E(p.transport + p.montage)} − ${E(p.skonto)} = ${E(p.aw)}`, `Jahresabschreibung ${E(plan.annual)}, 2025: **${E(plan.rows[0].afa)}**`],
    };
  });

  // ======== Abschreibung buchen und Erfolg ========
  gen('ab-book', 'abuch', 'Abschreibung buchen', 1, 3, 1, (r, st) => {
    const c = afaCase(r), k = st === 1 ? 0 : r.int(0, Math.min(2, c.plan.rows.length - 1)), row = c.plan.rows[k];
    const ans = booking(r, [['7010', row.afa]], [[c.a.acc, row.afa]], { pool: ['7040', '7060', '0400', '0600', '0620'].filter(x => x !== c.a.acc).slice(0, 3), effect: st >= 2 ? '↓' : undefined });
    return {
      kicker: 'Buchung', lead: `${c.a.short} (${label(c.a.acc)}): Anschaffungswert ${E(c.aw)}, Inbetriebnahme am ${c.when}, Nutzungsdauer ${c.nd} Jahre, lineare Abschreibung.`, ask: `Verbuche die Abschreibung zum 31.12.${row.year}${st >= 2 ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: [`Abschreibung ${row.year}: ${E(row.afa)}${k === 0 && c.plan.half ? ' (halbe Jahresabschreibung)' : ''}.`, '7010 Abschreibungen von Sachanlagen an das Anlagenkonto.'],
      solution: [`Abschreibung ${row.year}: ${E(row.afa)}`, step(ans)], takeaway: 'Abschreibung ist Aufwand: Das Eigenkapital sinkt.',
    };
  });
  gen('ab-euro', 'abuch', 'Erinnerungseuro ausbuchen', 2, 3, 4, (r) => {
    const a = asset(r), ans = booking(r, [['7010', 1]], [[a.acc, 1]], { pool: ['7040', '7060', '2800'] });
    return { kicker: 'Buchung', lead: `Die Anlage „${a.short}“ (${label(a.acc)}) steht seit Jahren mit dem Erinnerungseuro (€ 1,–) in der Buchhaltung. Jetzt scheidet sie aus dem Betrieb aus.`, ask: 'Verbuche das Ausscheiden.', answer: ans, hints: ['Der Erinnerungseuro wird im Jahr des Ausscheidens abgeschrieben.'], solution: [step(ans)] };
  });
  const CASES = [
    ['Kauf einer Maschine auf Ziel', 'Ø'], ['Zahlung einer Anlagenrechnung mit Skontoabzug', 'Ø'], ['Montagerechnung für eine neue Anlage', 'Ø'], ['Jährliche Abschreibung einer Maschine', '↓'], ['Kauf eines geringwertigen Wirtschaftsguts mit Sofortabschreibung', '↓'],
    ['Zuschreibung eines Grundstücks nach Wegfall der Abwertungsgründe', '↑'], ['Abwertung des Warenvorrats auf den Wiederbeschaffungspreis', '↓'], ['Aufwertung einer Fremdwährungsverbindlichkeit', '↓'], ['Überweisung an einen Lieferanten', 'Ø'], ['Außerplanmäßige Abschreibung einer Beteiligung', '↓'],
  ];
  const EFF = ['↑ vermehrt', '↓ vermindert', 'Ø erfolgsneutral'], effIndex = { '↑': 0, '↓': 1, 'Ø': 2 };
  gen('ab-effect', 'abuch', 'Auswirkung auf das Eigenkapital', 1, 3, 2, (r) => {
    const items = r.sample(CASES, 4);
    return {
      kicker: 'Erfolg', ask: 'Vermehrt (↑) oder vermindert (↓) der Geschäftsfall das Eigenkapital, oder ist er erfolgsneutral (Ø)?',
      answer: { type: 'fields', fields: items.map(([text, e], i) => ({ type: 'sel', key: `e${i}`, label: text, options: EFF, correct: effIndex[e] })) },
      hints: ['Aufwand: ↓. Ertrag: ↑. Nur Vermögen tauschen (Kauf, Zahlung): Ø.'], solution: items.map(([text, e]) => `${text}: **${e}**`),
    };
  });
  gen('ab-gwg-plan', 'abuch', 'GWG richtig behandeln', 1, 2, 3, (r) => {
    const [what, , range] = r.pick(GWG_ITEMS), gross = r.int(range[0], Math.min(range[1], 1180)), net = r2(gross / 1.2);
    return { kicker: 'GWG', lead: `Ein Betrieb kauft ${what} um ${E(gross)} inkl. 20 % USt (netto ${E(net)}), Nutzungsdauer 4 Jahre.`, ask: 'Wie wird der Anschaffungswert behandelt?', answer: mc(r, net <= 1000 ? 'Sofort (oder am Jahresende) zur Gänze als GWG abschreiben' : 'Aktivieren und über 4 Jahre abschreiben', [net <= 1000 ? 'Aktivieren und über 4 Jahre abschreiben' : 'Sofort (oder am Jahresende) zur Gänze als GWG abschreiben', 'Gar nicht abschreiben']), hints: ['GWG-Grenze: € 1.000,– netto.'], solution: [`Netto ${E(net)}: ${net <= 1000 ? 'geringwertiges Wirtschaftsgut' : 'kein GWG'}.`] };
  });

  // ---- Test simulation in the style of the book's exercises ----
  const part = (t, points, ask) => ({ points, ask: ask || `${t.lead ? `${t.lead} ` : ''}${t.ask}`, answer: t.answer, solution: t.solution, table: t.table });
  function testKauf(r) {
    const a = asset(r, x => x.acc === '0400' || x.acc === '0600'), names = {}, s = supplier(r, names), m = supplier(r, names, 'Montagebau Kern OG'), n = a.price, ust = r2(n * 0.2), gross = r2(n + ust), mn = round10(r.int(400, 2500)), mu = r2(mn * 0.2);
    const sk = r.pick([2, 3]), skB = r2(gross * sk / 100), skN = r2(skB / 1.2), skV = r2(skB - skN), pay = r2(gross - skB), aw = r2(n + mn - skN), month = r.int(1, 12), day = r.int(1, 28), plan = afaPlan(aw, a.nd, month);
    const pool = [...ASSET_POOL, '3500', '2800'];
    const b1 = booking(r, [[a.acc, n], ['2500', ust]], [[s.no, gross]], { names, pool }), b2 = booking(r, [[a.acc, mn], ['2500', mu]], [[m.no, mn + mu]], { names, pool }), b3 = booking(r, [[s.no, gross]], [['2800', pay], [a.acc, skN], ['2500', skV]], { names, pool }), b4 = booking(r, [['7010', plan.rows[0].afa]], [[a.acc, plan.rows[0].afa]], { names, pool: ['7040', '7060', ...ASSET_POOL], effect: '↓' });
    return {
      title: `Anlagenkauf: ${a.short}`, lead: `Ein Betrieb kauft ${a.name} bei ${s.name} (${s.no}): ${E(n)} + ${E(ust)} USt = ${E(gross)}. Die Aufstellung übernimmt ${m.name} (${m.no}): ${E(mn)} + ${E(mu)} USt. Die Rechnung für ${a.short} wird mit ${sk} % Skonto per Bank bezahlt (${E(pay)}). Inbetriebnahme am ${date(day, month)}, Nutzungsdauer ${a.nd} Jahre, lineare Abschreibung.`,
      parts: [
        { points: 2, ask: 'Verbuche die Rechnung über den Kauf.', answer: b1, solution: [step(b1)] },
        { points: 2, ask: 'Verbuche die Rechnung über die Aufstellung.', answer: b2, solution: [step(b2)] },
        { points: 3, ask: 'Verbuche die Zahlung mit Skonto.', answer: b3, solution: [`Skonto ${E(skB)}: netto ${E(skN)}, Vorsteuer ${E(skV)}`, step(b3)] },
        { points: 2, ask: 'Berechne den Anschaffungswert.', answer: fields(money('aw', 'Anschaffungswert', aw, [{ value: n + mn, msg: 'Der Skonto mindert den Anschaffungswert.' }, { value: aw * 1.2, msg: 'Ohne Vorsteuer.' }])), solution: [`${E(n)} + ${E(mn)} − ${E(skN)} = ${E(aw)}`] },
        { points: 3, ask: 'Berechne die Abschreibung und den Buchwert für 2025 und 2026.', answer: fields(...plan.rows.slice(0, 2).flatMap((x, i) => [money(`a${i}`, `Abschreibung ${x.year}`, x.afa), money(`b${i}`, `Buchwert 31.12.${x.year}`, x.bw)])), solution: [{ table: afaTable(aw, plan, 2) }] },
        { points: 2, ask: 'Verbuche die Abschreibung 2025 und gib die Auswirkung auf das Eigenkapital an.', answer: b4, solution: [step(b4)] },
      ],
    };
  }
  function testBewertung(r) {
    const g = goods(r, 'lower'), mk = id => M.kit.repeat(() => { const t = E_.makeTask(id, 3, r.int(1, 1e9)); return t; });
    const wp = mk('uv-wp-book'), land = mk('av-grund-book'), f = fx(r);
    return {
      title: 'Vermögen und Verbindlichkeiten bewerten', lead: 'Bewerte die folgenden Sachverhalte zum Abschlussstichtag.',
      parts: [
        { points: 2, ask: `${g.n} ${g.name} (Einstandspreis ${E(g.ep)}) sind am 31.12. auf Lager, Wiederbeschaffungspreis ${E(g.wbp)}. Ermittle den Bilanzansatz.`, answer: fields(money('v', 'Bilanzansatz', g.bil, [{ value: g.n * g.ep, msg: 'Strenges Niederstwertprinzip.' }])), solution: [`${g.n} · ${E(g.wbp)} = ${E(g.bil)}`] },
        part(wp, 2), part(land, 2),
        { points: 2, ask: `${fxLead(f)} Ermittle den Bilanzansatz der Verbindlichkeit.`, answer: fields(money('v', 'Bilanzansatz', f.bil, [])), solution: [`Entstehungswert ${E(f.e0)}, Stichtag ${E(f.e1)}: Bilanzansatz ${E(f.bil)}`] },
      ],
    };
  }
  function testGwg(r) {
    const t1 = E_.makeTask('ak-gwg', 3, r.int(1, 1e9)), t2 = M.kit.repeat(() => { const t = E_.makeTask('ak-gwg', 3, r.int(1, 1e9)); return t.answer.effect !== t1.answer.effect ? t : null; });
    return { title: 'Kleine Anschaffungen', lead: 'Geringwertige Wirtschaftsgüter werden sofort abgeschrieben.', parts: [part(t1, 2, `${t1.lead} ${t1.ask}`), part(t2, 2, `${t2.lead} ${t2.ask}`)] };
  }
  function testGrundlagen(r) {
    const tf = E_.makeTask('g-tf', 3, r.int(1, 1e9)), pf = E_.makeTask('g-pflicht', 3, r.int(1, 1e9)), rg = E_.makeTask('g-regel', 3, r.int(1, 1e9)), gs = E_.makeTask('g-grundsatz', 3, r.int(1, 1e9));
    return { title: 'Bewertungsgrundlagen', lead: '', parts: [part(tf, 2), part(pf, 1), part(rg, 1), part(gs, 1)] };
  }
  function testPrivat(r) {
    const t = E_.makeTask('pv-entnahme', 3, r.int(1, 1e9)), a = E_.makeTask('afa-last', 3, r.int(1, 1e9));
    return { title: 'Entnahme und Abschreibung', lead: '', parts: [part(t, 2), part(a, 2)] };
  }
  const E_ = M.engine(GENS, ['grundlagen', 'uv', 'av', 'fk', 'akauf', 'afa', 'abuch']);
  function buildTest(seed, size = 'full') {
    const r = makeRng(seed), list = size === 'short' ? [testKauf, testBewertung] : [testKauf, testBewertung, testGwg, testGrundlagen, testPrivat];
    const tasks = list.map((make, n) => { const t = make(makeRng(r.int(1, 2 ** 31))); return { plots: [], ...t, parts: t.parts.map((p, i) => ({ ...p, id: `${n}-${i}`, label: String.fromCharCode(97 + i) })) }; });
    return { seed, size, tasks, points: tasks.flatMap(t => t.parts).reduce((s, p) => s + p.points, 0) };
  }


  // ======== Buchungstrainer: whole cases with several documents, in the style of the book's exercises ========
  // The account plan is the Einheitskontenrahmen with the names the book's own booking trainer uses.
  const KONTEN = [["0110", "Patentrechte, Lizenzen"], ["0120", "Datenverarbeitungsprogramme"], ["0121", "Geringwertige Datenverarbeitungsprogramme"], ["0180", "Geleistete Anzahlungen für immaterielle Vermögensgegenstände aus Anlagevermögen"], ["0200", "Unbebaute Grundstücke"], ["0210", "Bebaute Grundstücke (Grundwert)"], ["0300", "Gebäude"], ["0400", "Maschinen"], ["0450", "Sonstige Betriebsanlagen"], ["0480", "Geringwertige Maschinen"], ["0500", "Werkzeuge"], ["0550", "Geringwertige Werkzeuge"], ["0600", "Betriebs- und Geschäftsausstattung"], ["0620", "Büromaschinen, EDV-Anlagen"], ["0630", "Pkw und Kombis"], ["0640", "Lkw"], ["0670", "Geringwertige Betriebs- und Geschäftsausstattung"], ["0672", "Geringwertige Büromaschinen, EDV-Anlagen"], ["0700", "Geleistete Anzahlungen auf Sachanlagen 20 %"], ["0710", "Anlagen in Bau"], ["0800", "Beteiligungen"], ["0930", "Festverzinsliche Wertpapiere des Anlagevermögens"], ["1000", "Bezugsverrechnung"], ["1100", "Rohstoffvorrat"], ["1200", "Vorrat bezogene Teile"], ["1210", "Weinvorrat"], ["1220", "Sektvorrat"], ["1230", "Spirituosenvorrat"], ["1240", "Sonstiger alkoholischer Getränkevorrat"], ["1250", "Vorrat Ersatzteile"], ["1251", "Milch-, Milchmischgetränkevorrat"], ["1260", "Kaffee-, Tee-Vorrat"], ["1270", "Alkoholfreier (AF) Getränkevorrat"], ["1300", "Hilfsstoffvorrat"], ["1340", "Vorrat Verpackungsmaterial"], ["1350", "Vorrat Betriebsstoffe"], ["1360", "Vorrat Heizöl"], ["1364", "Vorrat feste Brennstoffe"], ["1365", "Vorrat Schmiermittel"], ["1370", "Vorrat Reinigungsmaterial"], ["1390", "Vorrat Büromaterial"], ["1400", "Unfertige Erzeugnisse"], ["1500", "Fertige Erzeugnisse"], ["1600", "Handelswarenvorrat"], ["1610", "Tabakwarenvorrat"], ["1680", "Emballagen-Vorrat"], ["1800", "Geleistete Anzahlungen auf Vorräte 20 %"], ["1801", "Geleistete Anzahlungen auf Vorräte 10 %"], ["1802", "Geleistete Anzahlungen auf Vorräte 13 %"], ["2000", "Lieferforderungen (Forderungen aus Lieferungen und Leistungen Inland, Kundensammelkonto)"], ["2050", "Losungsverrechnung"], ["2070", "Verrechnungskonto erhaltene Anzahlungen"], ["2080", "Einzelwertberichtigungen zu Lieferford. Inland"], ["2100", "Lieferforderungen Währungsunion"], ["2130", "Einzelwertberichtigungen zu Lieferforderungen Währungsunion"], ["2150", "Lieferforderungen sonstiges Ausland"], ["2180", "Einzelwertberichtigungen zu Lieferforderungen sonstiges Ausland"], ["2250", "Forderungen aus Beteiligungserträgen"], ["2300", "Sonstige Forderungen"], ["2320", "Gegebene Darlehen"], ["2330", "Forderungen aus Darlehenszinsen"], ["2350", "Forderungen aus Wertpapierzinsen"], ["2360", "Forderungen aus Leasinggeschäften"], ["2380", "Guthaben bei Lieferanten (nicht aus Anzahlungen)"], ["2400", "Lohn- und Gehaltsvorschüsse"], ["2500", "Vorsteuer"], ["2510", "Vorsteuer aus ig. Erwerb"], ["2511", "Vorsteuer (aus geschuldeter USt)"], ["2520", "Einfuhrumsatzsteuer"], ["2620", "Aktien des Umlaufvermögens"], ["2650", "Festverzinsliche Wertpapiere des Umlaufvermögens"], ["2700", "Kassa"], ["2750", "Fremdwährungskassa"], ["2800", "Bank (Guthaben bei Kreditinstituten)"], ["2870", "Barverkehr mit Banken"], ["2880", "Forderungen Kreditkartenunternehmen"], ["2885", "Forderungen Debitkarten"], ["2890", "Schwebende Geldbewegungen"], ["2900", "Aktive Rechnungsabgrenzungsposten (ARA)"], ["3000", "Rückstellungen für Abfertigungen"], ["3010", "Rückstellungen für Pensionen"], ["3020", "Rückstellungen für Körperschaftsteuer"], ["3025", "Sonstige Steuerrückstellungen"], ["3040", "Rückstellungen für Rechts- und Beratungsaufwand"], ["3045", "Rückstellungen für Prozesskosten"], ["3050", "Rückstellungen für nicht konsumierte Urlaube"], ["3060", "Garantierückstellungen"], ["3065", "Rückstellungen für Produkthaftung"], ["3070", "Rückstellungen für Vergütungen an Mitarbeiter"], ["3075", "Rückstellungen für Jubiläumsgelder"], ["3080", "Rückstellungen für bei Kunden lagernde Emballagen"], ["3090", "Sonstige Rückstellungen"], ["3120", "Bank (Bankschuld, Verbindlichkeiten gegenüber Kreditinstituten)"], ["3130", "Barverkehr mit Banken"], ["3150", "Darlehen (von einer Bank)"], ["3160", "Verbindlichkeiten aus Darlehenszinsen (zu 3150)"], ["3180", "Verbindlichkeiten Kreditkartenunternehmen"], ["3190", "Verbindlichkeiten Debitkarten"], ["3200", "Erhaltene Anzahlungen 20 %"], ["3201", "Erhaltene Anzahlungen 10 %"], ["3202", "Erhaltene Anzahlungen 13 %"], ["3203", "Erhaltene Anzahlungen 0 %"], ["3300", "Lieferverbindlichkeiten"], ["3350", "Verrechnungskonto geleistete Anzahlungen"], ["3360", "Lieferverbindlichkeiten Währungsunion"], ["3370", "Lieferverbindlichkeiten sonstiges Ausland"], ["3500", "Umsatzsteuer"], ["3510", "Erwerbsteuer (USt aus ig. Erwerben)"], ["3520", "USt-Zahllast"], ["3540", "Verbindlichkeiten Finanzamt"], ["3570", "Verbindlichkeiten Zollamt"], ["3580", "Einbehaltene KESt"], ["3600", "Verbindlichkeiten Gesundheitskasse"], ["3610", "Verbindlichkeiten Gemeinde (Stadt)"], ["3700", "Darlehen (nicht von einer Bank)"], ["3710", "Verbindlichkeiten aus Darlehenszinsen (zu 3700)"], ["3730", "Gewinnverrechnung Kommanditist"], ["3750", "Verbindlichkeiten gegenüber Kunden (nicht aus Anzahlungen)"], ["3800", "Sonstige Verbindlichkeiten"], ["3850", "Verbindlichkeiten gegen Mitarbeiter aus der Bezugsverrechnung"], ["3900", "Passive Rechnungsabgrenzung (PRA)"], ["4000", "HW-Erlöse"], ["4001", "Handelswarenerlöse 10 %"], ["4002", "Handelswarenerlöse 13 %"], ["4010", "Erlöse aus ig. Lieferungen"], ["4015", "Exporterlöse"], ["4050", "Frühstücksspeisenerlöse"], ["4060", "Frühstücksgetränkeerlöse"], ["4100", "Fertigerzeugniserlöse 20 %"], ["4110", "Weinerlöse"], ["4120", "Sekterlöse"], ["4130", "Spirituosenerlöse"], ["4140", "Sonstige alkoholische Getränkeerlöse"], ["4150", "Speiseeiserlöse"], ["4151", "Milch-, Milchmischgetränke-, Kakaoerlöse"], ["4160", "Kaffee-, Tee-Erlöse"], ["4170", "Alkoholfreie (AF) Getränkeerlöse"], ["4200", "Logiserlöse"], ["4300", "Gästetelefonerlöse"], ["4310", "Gästewäscheerlöse (Reinigung)"], ["4320", "Garagenerlöse"], ["4340", "Tabakwarenerlöse"], ["4370", "Veranstaltungserlöse"], ["4380", "Sonstige Nebenerlöse"], ["4400", "Erlösberichtigungen 20 %"], ["4401", "Erlösberichtigungen 10 %"], ["4402", "Erlösberichtigungen 13 %"], ["4403", "Erlösberichtigungen 0 %"], ["4405", "Erlösberichtigungen ig. Lieferungen"], ["4406", "Erlösberichtigungen Export"], ["4410", "Kundenskonti 20 %"], ["4411", "Kundenskonti 10 %"], ["4412", "Kundenskonti 13 %"], ["4415", "Kundenskonti aus ig. Lieferungen"], ["4416", "Kundenskonti Export"], ["4500", "Bestandsveränderungen"], ["4580", "Aktivierte Eigenleistungen"], ["4600", "Erlöse aus dem Abgang von Anlagen 20 %"], ["4601", "Erlöse aus dem Abgang von Anlagen 0 %"], ["4610", "Versicherungsentschädigungen für Anlagenabgänge"], ["4630", "Erträge aus dem Abgang von Anlagen"], ["4660", "Erträge aus der Zuschreibung zum Anlagevermögen"], ["4700", "Erträge aus der Auflösung von Rückstellungen"], ["4800", "Personalbeherbergungserlöse"], ["4801", "Personalverpflegungserlöse Speisen"], ["4802", "Personalverpflegungserlöse Getränke"], ["4810", "Mieterträge (Pachterträge)"], ["4820", "Provisionserträge"], ["4840", "Fremdwährungskursgewinne"], ["4850", "Erträge aus Konventionalstrafen"], ["4860", "Versicherungsentschädigungen (sonstige)"], ["4870", "Erträge a. d. Auflösung von WB zu Forderungen"], ["4880", "Übrige betriebliche Erträge 20 %"], ["4881", "Übrige betriebliche Erträge 10 %"], ["4882", "Übrige betriebliche Erträge 13 %"], ["4883", "Übrige betriebliche Erträge 0 %"], ["4890", "Mahnspesenvergütung"], ["4900", "Eigenverbrauch 20 %"], ["4901", "Eigenverbrauch 10 %"], ["4902", "Eigenverbrauch 13 %"], ["4903", "Eigenverbrauch 0 %"], ["5000", "HW-Einsatz"], ["5001", "Handelswareneinsatz 10 %"], ["5002", "Handelswareneinsatz 13 %"], ["5080", "Emballagen-Einsatz"], ["5100", "Rohstoffverbrauch (-einsatz)"], ["5200", "Verbrauch von bezogenen Teilen"], ["5210", "Weineinsatz (-verbrauch)"], ["5220", "Sekteinsatz (-verbrauch)"], ["5230", "Spirituoseneinsatz (-verbrauch)"], ["5240", "Sonstiger alkoholischer Getränkeeinsatz (-verbrauch)"], ["5251", "Milch-, Milchmischgetränkeeinsatz (-verbrauch)"], ["5260", "Kaffee-, Tee-Einsatz (-verbrauch)"], ["5270", "Alkoholfreier (AF) Getränkeeinsatz (-verbrauch)"], ["5290", "Tabakwareneinsatz (-verbrauch)"], ["5300", "Hilfsstoffverbrauch"], ["5310", "Hotel- und Gaststättenbedarf"], ["5340", "Verpackungsmaterialverbrauch"], ["5400", "Betriebsstoffverbrauch"], ["5410", "Schmiermittelverbrauch"], ["5420", "Reparaturmaterialverbrauch"], ["5450", "Reinigungsmaterialverbrauch"], ["5500", "Verbrauch von Werkzeugen, Erzeugungshilfsmitteln"], ["5510", "Ersatzteileverbrauch"], ["5600", "Bezugskosten"], ["5880", "Lieferantenskonti auf Wareneinkauf 20 %"], ["5881", "Lieferantenskonti auf Wareneinkauf 10 %"], ["5882", "Lieferantenskonti auf Wareneinkauf 13 %"], ["5884", "Lieferantenskonti Anlagenkäufe"], ["5885", "Lieferantenskonti aus ig. Erwerben"], ["5886", "Lieferantenskonti Import"], ["5890", "Umsatzbonus auf Wareneinkauf 20 %"], ["5891", "Umsatzbonus auf Wareneinkauf 10 %"], ["5892", "Umsatzbonus auf Wareneinkauf 13 %"], ["5910", "Wareneinsatz Personalverpflegung"], ["6000", "Löhne"], ["6001", "Überstunden Arbeiter"], ["6020", "Sonderzahlungen Arbeiter"], ["6050", "Zuweisungen an die Urlaubsrückstellung Arbeiter"], ["6100", "Lehrlingseinkommen Arbeiter"], ["6120", "Sonderzahlungen Arbeiterlehrlinge"], ["6200", "Gehälter"], ["6201", "Überstunden Angestellte"], ["6220", "Sonderzahlungen Angestellte"], ["6250", "Zuweisungen an die Urlaubsrückstellung Angestellte"], ["6300", "Lehrlingsentschädigungen Angestellte"], ["6320", "Sonderzahlungen Angestelltenlehrlinge"], ["6390", "Bezüge freie Dienstnehmer"], ["6400", "Abfertigungsaufwand Arbeiter"], ["6420", "Abfertigungsaufwand Angestellte"], ["6430", "Zuweisungen an die Abfertigungsrückstellung"], ["6440", "Aufwand für Betriebliche Vorsorgekassen Arbeiter"], ["6441", "Aufwand für Betriebliche Vorsorgekassen Angestellte"], ["6460", "Zuweisungen an die Pensionsrückstellung"], ["6500", "Gesetzlicher Sozialaufwand Arbeiter"], ["6560", "Gesetzlicher Sozialaufwand Angestellte"], ["6600", "Dienstgeberbeitrag Arbeiter"], ["6610", "Zuschlag zum DB Arbeiter"], ["6620", "Kommunalsteuer Arbeiter"], ["6630", "Wiener Dienstgeberabgabe Arbeiter"], ["6660", "Dienstgeberbeitrag Angestellte"], ["6670", "Zuschlag zum DB Angestellte"], ["6680", "Kommunalsteuer Angestellte"], ["6690", "Wiener Dienstgeberabgabe Angestellte"], ["6700", "Freiwilliger Sozialaufwand"], ["6710", "Sachbezüge Personal"], ["6720", "Aufwand für Dienstwohnungen"], ["7010", "Abschreibungen von Sachanlagen"], ["7040", "Außerplanmäßige Abschreibungen von Anlagevermögen"], ["7060", "Abschreibungen geringwertiger Wirtschaftsgüter"], ["7070", "Außerplanmäßige Abschreibungen von Umlaufvermögen"], ["7100", "Grundsteuer"], ["7130", "Vergnügungssteuer"], ["7150", "Tourismusabgabe"], ["7151", "AKM-Beitrag"], ["7180", "Gebühren"], ["7190", "Sonstige Abgaben"], ["7200", "Instandhaltung durch Dritte"], ["7210", "Reinigung durch Dritte"], ["7220", "Entsorgungsaufwand"], ["7240", "Heizölverbrauch"], ["7250", "Treibstoffverbrauch"], ["7260", "Gasverbrauch"], ["7270", "Stromverbrauch"], ["7280", "Heizmaterialverbrauch (feste Brennstoffe)"], ["7300", "Ausgangsfrachten 20 %"], ["7301", "Ausgangsfrachten 0%"], ["7310", "Paketgebühren 20%"], ["7311", "Paketgebühren 0%"], ["7320", "Pkw- und Kombi-Betriebsaufwand"], ["7321", "Motorbezogene Versicherungssteuer Pkw und Kombis"], ["7325", "Versicherungsaufwand Pkw und Kombis"], ["7326", "Parkgebühren, Straßenmaut Pkw und Kombis"], ["7330", "Lkw-Betriebsaufwand"], ["7331", "Motorbezogene Versicherungssteuer Lkw"], ["7332", "Kraftfahrzeugsteuer Lkw"], ["7335", "Versicherungsaufwand Lkw"], ["7336", "Parkgebühren, Straßenmaut Lkw"], ["7340", "Bahn- und Autobuskosten Inlandsreisen"], ["7341", "Flugkosten Inlandsreisen"], ["7342", "Taxikosten Inlandsreisen"], ["7343", "Sonstige Fahrtkosten Inlandsreisen"], ["7344", "Reise-Nebenkosten Inland"], ["7345", "Kilometergeld Inland"], ["7360", "Tagesgelder Inland"], ["7361", "Verpflegungsgelder Inlandsreisen 20 %"], ["7362", "Verpflegungsgelder Inlandsreisen 10 %"], ["7364", "Nächtigungsgelder Inland"], ["7365", "Tagesgelder Ausland"], ["7366", "Nächtigungsgelder Ausland"], ["7380", "Telefon- und Internetgebühren"], ["7385", "Portogebühren"], ["7400", "Mietaufwand (Pachtaufwand)"], ["7440", "Leasingaufwand"], ["7450", "Leasingaufwand Pkw und Kombis"], ["7460", "Leasingaufwand Lkw"], ["7480", "Lizenzaufwand"], ["7540", "Provisionen an Dritte (Nicht-Arbeitnehmer; Vertriebsaufwand für Handelsvertreter)"], ["7600", "Büromaterial (Büroaufwand, Bürobedarf)"], ["7610", "Kopien und sonstige Druckkosten"], ["7630", "Fachliteratur und Zeitungen"], ["7650", "Werbeaufwand"], ["7660", "Aufwand für Geschäftsanbahnung 20 %"], ["7661", "Aufwand für Geschäftsanbahnung 10 %"], ["7662", "Aufwand für Geschäftsanbahnungen 0 %"], ["7663", "Nicht absetzbarer Aufwand für Geschäftsanbahnung 20 %"], ["7664", "Nicht absetzbarer Aufwand für Geschäftsanbahnung 10 %"], ["7665", "Nicht absetzbarer Aufwand für Geschäftsanbahnung 0 %"], ["7680", "Spenden und Trinkgelder"], ["7700", "Versicherungsaufwand"], ["7710", "Haftpflichtversicherungen (ohne Kraftfahrzeuge)"], ["7740", "Versicherungsbeiträge an die Sozialversicherungsanstalt der Selbständigen"], ["7750", "Rechts- und Beratungsaufwand"], ["7770", "Aufwand für Aus- und Fortbildung"], ["7780", "Kammerumlage"], ["7790", "Spesen des Geldverkehrs"], ["7791", "Sonstige Bankspesen"], ["7792", "Provisionen, Gebühren Kredit- und Debitkarten"], ["7800", "Abschreibungen von Vorräten"], ["7802", "Abschreibungen von Forderungen 20 %"], ["7803", "Abschreibungen von Forderungen 10 %"], ["7804", "Abschreibungen von Forderungen 13 %"], ["7805", "Abschreibungen von Forderungen 0 %"], ["7806", "Zuweisungen an WB zu Forderungen"], ["7810", "Zuweisungen an die Garantierückstellung"], ["7811", "Konventionalstrafen"], ["7815", "Fremdwährungskursverluste"], ["7818", "Rundungsdifferenzen"], ["7819", "Sonstige Schadensfälle"], ["7820", "Buchwert abgegangener Anlagen"], ["7830", "Verluste aus dem Abgang von Anlagen"], ["7840", "Aufwand für Vorperioden"], ["7850", "Übrige betriebliche Aufwendungen 20 %"], ["7851", "Übrige betriebliche Aufwendungen 10 %"], ["7852", "Übrige betriebliche Aufwendungen 0 %"], ["7880", "Lieferantenskonti auf sonstige betriebliche Aufwendungen"], ["8010", "Erträge aus Beteiligungen"], ["8030", "Steuerpflichtige Zinsenerträge für Wertpapiere des Anlagevermögens"], ["8031", "Endbesteuerte Zinsenerträge für Wertpapiere des Anlagevermögens"], ["8035", "Steuerpflichtige Dividendenerträge"], ["8036", "Endbesteuerte Dividendenerträge"], ["8050", "Zinsenerträge aus Bankguthaben"], ["8051", "Zinsenerträge aus gewährten Darlehen"], ["8052", "Steuerpflichtige Zinsenerträge für Wertpapiere des Umlaufvermögens"], ["8053", "Endbesteuerte Zinsenerträge für Wertpapiere des Umlaufvermögens"], ["8055", "Verzugszinsenerträge"], ["8056", "Sonstige Zinsenerträge 20 %"], ["8057", "Sonstige Zinsenerträge 10 %"], ["8170", "Erträge aus der Zuschreibung zu Finanzanlagen"], ["8180", "Erträge aus der Zuschreibung zu Wertpapieren des Umlaufvermögens"], ["8200", "Abschreibungen auf Beteiligungen"], ["8270", "Abschreibungen auf sonstige Finanzanlagen"], ["8271", "Abschreibungen auf Wertpapiere des Umlaufvermögens"], ["8310", "Zinsenaufwand für Bankkredite"], ["8311", "Sonstiger Aufwand für Bankkredite"], ["8315", "Zinsenaufwand für Darlehen"], ["8320", "Verzugszinsenaufwand"], ["8321", "Mahnspesen"], ["8325", "Zinsenaufwand für Lieferantenkredite 20 %"], ["8326", "Zinsenaufwand für Lieferantenkredite 10 %"], ["8500", "Körperschaftsteuer"], ["8510", "Körperschaftsteuer Vorjahre"], ["8520", "Erträge aus der Auflösung von Körperschaftsteuerrückstellungen"], ["9000", "Kapital"], ["9050", "Variables Kapital … (Vollhafter)"], ["9090", "Ausstehende Einlage … (Vollhafter)"], ["9100", "Einlage Kommanditist"], ["9150", "Ausstehende Einlage Kommanditist"], ["9160", "Verlustanteil Kommanditist"], ["9600", "Privat"], ["9610", "Privatsteuern"], ["9800", "Eröffnungsbilanzkonto (EBK)"], ["9850", "Schlussbilanzkonto (SBK)"], ["9890", "Gewinn- und Verlustkonto (GuV)"], ["9900", "Zwischenkonto (für EDV-Sammelbuchungen)"]];
  const KONTO = new Map(KONTEN);
  const kontoName = (no, names = {}) => names[no] || KONTO.get(no) || ACC[no] || '';
  const kontoLabel = (no, names = {}) => `${no} ${kontoName(no, names)}`.trim();
  const fold = s => String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, ' ').trim();
  // Account search for the input field: number prefix first, then words of the name.
  function searchKonten(query, names = {}, limit = 8) {
    const q = fold(query), all = [...Object.entries(names), ...KONTEN.filter(([no]) => !names[no])];
    if (!q) return [];
    const digits = /^\d+$/.test(q.replace(/ /g, '')) ? q.replace(/ /g, '') : '';
    const words = q.split(' ').filter(Boolean);
    const scored = [];
    for (const [no, name] of all) {
      const n = fold(name);
      let score = -1;
      if (digits) { if (no.startsWith(digits)) score = 100 - no.length - (names[no] ? -5 : 0); }
      else if (words.every(w => n.includes(w) || no.startsWith(w))) score = (n.startsWith(words[0]) ? 50 : 20) + (names[no] ? 10 : 0) - n.length / 100;
      if (score >= 0) scored.push({ no, name, score });
    }
    return scored.sort((a, b) => b.score - a.score || a.no.localeCompare(b.no)).slice(0, limit);
  }
  // Turns what was typed into an account number: "0400", "0400 Maschinen", "maschinen" or a supplier name.
  function resolveAcc(text, names = {}) {
    const t = String(text ?? '').trim();
    if (!t) return null;
    const m = t.match(/^(\d{4,5})\b/);
    if (m) return m[1];
    const q = fold(t), all = [...Object.entries(names), ...KONTEN];
    const exact = all.find(([, name]) => fold(name) === q);
    if (exact) return exact[0];
    // A name that starts like an account counts as that account (shortest match first), like picking the top suggestion.
    const hits = searchKonten(t, names, 2);
    return hits[0] && (hits.length === 1 || hits[0].score >= 40) ? hits[0].no : null;
  }
  const parseAmount = text => { const v = M.parseNumber(text); return v.length ? v[0] : null; };
  const same = (a, b) => a !== null && Math.abs(a - b) < 0.005;
  // Grades one booking field by field. Lines may be entered in any order on each side; split amounts are not needed here.
  function gradeBooking(sol, entry, names = {}) {
    const rows = entry.rows || [], out = rows.map(() => ({ sa: '', sb: '', ha: '', hb: '' })), msgs = [];
    if (sol.none || entry.none) {
      const typed = rows.some(r => [r.sa, r.sb, r.ha, r.hb].some(v => String(v ?? '').trim()));
      const ok = !!sol.none && !!entry.none && !typed;
      if (entry.none && !sol.none) msgs.push('Hier ist sehr wohl eine Buchung nötig.');
      if (sol.none && !entry.none && typed) msgs.push('Prüf noch einmal, ob hier überhaupt gebucht werden muss.');
      return { fields: out, effect: '', none: entry.none ? (ok ? 'ok' : 'bad') : '', complete: ok, msgs };
    }
    let complete = true;
    for (const [side, ka, kb, other] of [['soll', 'sa', 'sb', 'haben'], ['haben', 'ha', 'hb', 'soll']]) {
      const lines = sol[side], usedAcc = new Set(), usedAmt = new Set();
      const parsed = rows.map(r => ({ acc: resolveAcc(r[ka], names), accText: String(r[ka] ?? '').trim(), amt: parseAmount(r[kb]), amtText: String(r[kb] ?? '').trim() }));
      // First pass: account and amount both right, so a correct line is never stolen by a half-right one.
      parsed.forEach((p, i) => { const j = lines.findIndex((l, k) => !usedAcc.has(k) && l.acc === p.acc && same(p.amt, l.amt)); if (j >= 0) { usedAcc.add(j); usedAmt.add(j); out[i][ka] = 'ok'; out[i][kb] = 'ok'; p.done = true; } });
      parsed.forEach((p, i) => { if (p.done || !p.acc) return; const j = lines.findIndex((l, k) => !usedAcc.has(k) && l.acc === p.acc); if (j >= 0) { usedAcc.add(j); out[i][ka] = 'ok'; p.line = j; } });
      parsed.forEach((p, i) => {
        if (p.done) return;
        if (p.accText && out[i][ka] !== 'ok') {
          out[i][ka] = 'bad';
          if (p.acc && sol[other].some(l => l.acc === p.acc)) msgs.push(`${kontoLabel(p.acc, names)} gehört auf die andere Seite: Soll und Haben vertauscht?`);
          else if (p.acc === '3300' && lines.some(l => /^33\d{3}$/.test(l.acc))) msgs.push('Nimm das Personenkonto des Lieferanten (die fünfstellige Nummer im Beleg), nicht das Sammelkonto 3300.');
          else if (p.acc === '2800' && lines.some(l => l.acc === '3190' || l.acc === '3180')) msgs.push('Bei Zahlung mit Karte wird zuerst die Verbindlichkeit gegenüber dem Kartenunternehmen gebucht: 3190 (Debitkarte) oder 3180 (Kreditkarte).');
          else if (['7010', '7040', '7060'].includes(p.acc) && lines.some(l => ['7010', '7040', '7060'].includes(l.acc))) msgs.push('Falsches Abschreibungskonto: 7010 planmäßig, 7040 außerplanmäßig, 7060 GWG.');
          else if (p.acc && /^7/.test(p.acc) && lines.some(l => /^0/.test(l.acc)) && !lines.some(l => /^7/.test(l.acc))) msgs.push('Anschaffungskosten und Nebenkosten werden aktiviert (Kontenklasse 0), nicht als Aufwand gebucht.');
          else if (p.acc && /^0/.test(p.acc) && lines.some(l => l.acc === '7060')) msgs.push('Unter € 1.000,– netto ist es ein geringwertiges Wirtschaftsgut.');
          else if (p.acc && lines.some(l => l.acc === '7060') === false && lines.some(l => /^0/.test(l.acc)) && p.acc === '7060') msgs.push('Über € 1.000,– netto: kein GWG, das Anlagegut wird aktiviert.');
          else if (!p.acc) msgs.push(`„${p.accText}“ ist kein Konto aus dem Kontenplan.`);
        }
        if (p.amtText) {
          const target = p.line !== undefined ? [lines[p.line]] : lines.filter((l, k) => !usedAmt.has(k));
          const hit = p.amt !== null && target.find(l => same(p.amt, l.amt));
          if (hit && p.line !== undefined) { out[i][kb] = 'ok'; usedAmt.add(p.line); }
          else if (hit && !p.accText) out[i][kb] = 'ok';
          else {
            out[i][kb] = 'bad';
            const want = p.line !== undefined ? lines[p.line].amt : null;
            if (want !== null && p.amt !== null && same(p.amt, want * 1.2)) msgs.push('Das ist der Bruttobetrag. Hier gehört der Nettobetrag hin.');
            else if (want !== null && p.amt !== null && same(p.amt * 1.2, want)) msgs.push('Hier gehört der Bruttobetrag (mit USt) hin.');
            else if (p.amt === null) msgs.push(`„${p.amtText}“ ist kein Betrag.`);
          }
        }
      });
      lines.forEach((l, k) => { if (!(usedAcc.has(k) && usedAmt.has(k))) complete = false; });
      if (parsed.some((p, i) => (p.accText || p.amtText) && !(out[i][ka] === 'ok' && out[i][kb] === 'ok'))) complete = false;
    }
    let effect = '';
    if (sol.effect) { effect = !entry.effect ? '' : entry.effect === sol.effect ? 'ok' : 'bad'; if (effect !== 'ok') complete = false; if (effect === 'bad') msgs.push('Die Auswirkung auf das Eigenkapital stimmt nicht.'); }
    return { fields: out, effect, none: '', complete, msgs: [...new Set(msgs)] };
  }
  // ---- Depreciation table (like the book's Excel template) and valuation amounts ----
  // Field keys: aw, p0/a0/b0, p1/a1/b1 ... (rate, depreciation, book value after that year).
  function afaSpec(label, aw, nd, month, years, o = {}) {
    const plan = afaPlan(aw, nd, month, { keepEuro: !!o.keepEuro });
    const n = Math.min(years, plan.rows.length);
    return { label, aw: r2(aw), nd, rate: r2(100 / nd), half: plan.half, annual: plan.annual, rows: plan.rows.slice(0, n), endOfLife: n === plan.rows.length, start: o.start || '', awTraps: o.awTraps || [], hint: o.hint || [], calc: o.calc || [] };
  }
  function gradeAfa(spec, vals) {
    const out = {}, msgs = [];
    let complete = true;
    const check = (key, want, traps = []) => {
      const raw = String(vals[key] ?? '').trim();
      if (!raw) { out[key] = ''; complete = false; return; }
      const v = parseAmount(raw);
      if (v !== null && Math.abs(v - want) < 0.005) { out[key] = 'ok'; return; }
      out[key] = 'bad'; complete = false;
      const t = v === null ? null : traps.find(x => Math.abs(x.value - v) < 0.005 && Math.abs(x.value - want) >= 0.005);
      if (t) msgs.push(t.msg); else if (v === null) msgs.push(`„${raw}“ ist keine Zahl.`);
    };
    check('aw', spec.aw, spec.awTraps);
    spec.rows.forEach((row, i) => {
      check(`p${i}`, spec.rate, [{ value: spec.nd, msg: 'Abschreibungssatz = 100 : Nutzungsdauer.' }]);
      const halfRow = spec.half && (i === 0 || (spec.endOfLife && i === spec.rows.length - 1));
      check(`a${i}`, row.afa, halfRow ? [{ value: spec.annual, msg: 'Halbjahresregel: Inbetriebnahme in der zweiten Jahreshälfte, also nur die halbe Jahresabschreibung.' }] : i === 0 ? [{ value: r2(spec.annual / 2), msg: 'Inbetriebnahme in der ersten Jahreshälfte: die ganze Jahresabschreibung.' }] : [{ value: r2(spec.annual / 2), msg: 'Nur im ersten (und letzten) Jahr gibt es die halbe Abschreibung.' }]);
      check(`b${i}`, row.bw, [{ value: r2(spec.aw - row.afa), msg: 'Buchwert = Buchwert davor minus Abschreibung dieses Jahres.' }]);
    });
    return { fields: out, complete, msgs: [...new Set(msgs)] };
  }
  function gradeVal(spec, vals) {
    const raw = String(vals.v ?? '').trim();
    if (!raw) return { fields: { v: '' }, complete: false, msgs: [] };
    const v = parseAmount(raw);
    if (v !== null && Math.abs(v - spec.value) < 0.005) return { fields: { v: 'ok' }, complete: true, msgs: [] };
    const t = v === null ? null : spec.traps.find(x => Math.abs(x.value - v) < 0.005);
    return { fields: { v: 'bad' }, complete: false, msgs: t ? [t.msg] : v === null ? [`„${raw}“ ist kein Betrag.`] : [] };
  }

  // ---- Case building blocks ----
  const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const d = (day, month, year = 2025) => `${day}.${month}.${year}`;
  function dateAfter(r, [day, month], minDays, maxDays) {
    let dd = day + r.int(minDays, maxDays), mm = month;
    while (dd > MONTH_DAYS[mm - 1]) { dd -= MONTH_DAYS[mm - 1]; mm++; }
    return [dd, Math.min(12, mm)];
  }
  const bk = (soll, haben, o = {}) => ({ label: o.label || '', soll: soll.map(([acc, amt]) => ({ acc, amt: r2(amt) })), haben: haben.map(([acc, amt]) => ({ acc, amt: r2(amt) })), effect: o.effect === undefined ? null : o.effect, hint: o.hint || [], calc: o.calc || [] });
  const none = (o = {}) => ({ label: o.label || '', none: true, soll: [], haben: [], effect: null, hint: o.hint || [], calc: o.calc || [] });
  const ROLE = {
    machine: ['Maschinenfabrik Hainzl GmbH', 'Kaltenbrunner Industrietechnik GmbH', 'Anlagenbau Gruber AG', 'Steiner Maschinenbau GmbH', 'Technik Huber KG'],
    montage: ['Montagebau Kern OG', 'Elektro Pichler GmbH', 'Installationen Wallner GmbH', 'Haustechnik Brunner e. U.'],
    bau: ['Baumeister Lechner GmbH', 'Hochbau Wiesinger GmbH', 'Bauunternehmen Pölzl KG'],
    transport: ['Spedition Weiss GmbH', 'Transporte Haider KG', 'Logistik Fink GmbH'],
    office: ['Bürowelt Rauch GmbH', 'EDV-Systeme Koller GmbH', 'IT-Service Moser e. U.'],
    cars: ['Autohaus Mayrhofer GmbH', 'Autohaus Grabner KG', 'Nutzfahrzeuge Brandl GmbH'],
    abroad: ['Pacific Outdoor Supply Inc.', 'Northline Trading Corp.', 'Lakeside Gear LLC'],
    safe: ['Sicherheitstechnik Reiter GmbH', 'Tresorbau Wallisch KG'],
    shop: ['Ladenbau Wimmer GmbH', 'Objekteinrichtung Lackner GmbH', 'Büromöbel Hofbauer KG'],
    store: ['Elektromarkt Bauer GmbH', 'Büro & Mehr Lindner KG', 'Technikwelt Gruber GmbH', 'Office Point Steiner e. U.'],
  };
  // Addresses, UIDs and IBANs are made up. IBANs get a deliberately wrong check number, so they can never be a real account.
  const STREETS = ['Hauptstraße', 'Industriestraße', 'Bahnhofstraße', 'Gewerbestraße', 'Linzer Straße', 'Wiener Straße', 'Grazer Straße', 'Mühlgasse', 'Gartengasse', 'Am Wirtschaftspark', 'Lagerhausstraße', 'Werkstättenweg'];
  const TOWNS = [['3500', 'Krems an der Donau'], ['4020', 'Linz'], ['8010', 'Graz'], ['5020', 'Salzburg'], ['6020', 'Innsbruck'], ['2700', 'Wiener Neustadt'], ['3100', 'St. Pölten'], ['9020', 'Klagenfurt'], ['4600', 'Wels'], ['1100', 'Wien'], ['1230', 'Wien'], ['8700', 'Leoben'], ['6850', 'Dornbirn'], ['7000', 'Eisenstadt']];
  const BANKNAMES = ['Alpenland Bank AG', 'Donauland Bank AG', 'Tauern Kreditbank AG', 'Wienerwald Bank AG'];
  function fakeIban(r) {
    let bban = String(r.int(1, 9));
    for (let i = 0; i < 15; i++) bban += r.int(0, 9);
    let m = 0; for (const ch of `${bban}102900`) m = (m * 10 + Number(ch)) % 97;
    const valid = 98 - m; let cd = r.int(10, 96); if (cd === valid) cd = cd === 96 ? 10 : cd + 1;
    return `AT${cd} ${bban.match(/.{4}/g).join(' ')}`;
  }
  function party(r, name) { const [zip, town] = r.pick(TOWNS); return { name, street: `${r.pick(STREETS)} ${r.int(1, 140)}`, zip, town, uid: `ATU${r.int(10000000, 99999999)}`, iban: fakeIban(r), bank: r.pick(BANKNAMES), tone: r.int(0, 5) }; }
  function caseKit(r, company) {
    const names = {}, usedNames = new Set(), me = party(r, company || 'Musterfirma');
    const pickName = role => { const name = r.pick(ROLE[role].filter(n => !usedNames.has(n))); usedNames.add(name); return name; };
    const sup = role => { const name = pickName(role), s = supplier(r, names, name); return { ...s, p: party(r, name) }; };
    const store = () => party(r, pickName('store'));
    let e = r.int(120, 600), b = r.int(20, 180), s = r.int(300, 900), k = r.int(40, 300), stmt = r.int(4, 30);
    const nr = { E: () => `E ${e += r.int(3, 40)}`, B: () => `B ${b += r.int(2, 14)}`, S: () => `S ${s += r.int(5, 60)}`, K: () => `K ${k += r.int(2, 20)}`, stmt: () => stmt += r.int(1, 4) };
    return { names, sup, nr, me, store };
  }
  // ---- Documents ----
  const invNo = r => r.chance(0.5) ? `${r.int(120, 2990)}/2025` : `RE-2025-${r.int(1000, 9899)}`;
  function invDoc(r, from, to, { date, delivery, items, rab = 0, terms, grossOnly = false, foot = '' }) {
    const lines = items.map(it => { const qty = it.qty ?? 1; return { qty, unit: it.unit || 'Stk.', text: it.text, sub: it.sub || '', each: r2(it.each ?? it.total / qty), total: r2(it.total) }; });
    const sum = r2(lines.reduce((s, l) => s + l.total, 0)), disc = rab ? r2(sum * rab / 100) : 0, net = r2(sum - disc), vat = grossOnly ? 0 : r2(net * 0.2), gross = grossOnly ? sum : r2(net + vat);
    return { kind: 'invoice', from, to, no: invNo(r), date: d(...date), delivery: delivery ? d(...delivery) : '', lines, sum, rab, disc, net, vat, gross, grossOnly, terms: terms || 'Zahlbar innerhalb von 14 Tagen ohne Abzug.', foot };
  }
  function bankDoc(r, me, date, rows, nr) {
    const sum = r2(rows.reduce((s, x) => s + x.amount, 0)), old = r2(Math.max(-sum * 1.25, r.int(18000, 140000)) + r.int(0, 99) / 100);
    return { kind: 'bank', bank: me.bank, holder: me.name, iban: me.iban, no: nr.stmt(), date: d(...date), rows: rows.map(x => ({ date: d(...date), text: x.text, ref: x.ref || '', amount: r2(x.amount) })), old, now: r2(old + sum) };
  }
  const PAYNAME = { '3190': 'Debitkarte', '3180': 'Kreditkarte', '2700': 'Bar' };
  function rcptDoc(r, shop, date, items, payAcc) {
    const total = r2(items.reduce((s, x) => s + x.price, 0)), net = r2(total / 1.2), vat = r2(total - net), given = payAcc === '2700' ? Math.ceil((total + 0.01) / 50) * 50 : 0;
    return { kind: 'receipt', shop, date: d(...date), time: `${r.int(8, 18)}:${String(r.int(0, 59)).padStart(2, '0')}`, no: `${r.int(1, 9)}-${r.int(10000, 99999)}`, items: items.map(x => ({ text: x.text, price: r2(x.price) })), total, net, vat, pay: PAYNAME[payAcc], card: payAcc === '2700' ? '' : `**** ${r.int(1000, 9999)}`, given, back: given ? r2(given - total) : 0, seed: r.int(1, 2 ** 30) };
  }
  const ownDoc = (me, { no, date, title, rows, sign }) => ({ kind: 'own', holder: me.name, no, date: d(...date), title, rows, sign });

  const afaCalc = (aw, nd, plan, inb) => [`Jahresabschreibung: ${E(aw)} : ${nd} = ${E(plan.annual)}`, `Inbetriebnahme ${inb}: ${plan.half ? 'zweite Jahreshälfte, im ersten und letzten Jahr nur die halbe Abschreibung' : 'erste Jahreshälfte, schon im ersten Jahr die ganze Abschreibung'}`];
  const afaBooking = (acc, row, o = {}) => bk([['7010', row.afa]], [[acc, row.afa]], { effect: '↓', ...o });
  const skontoBookings = (supNo, gross, pct, assetAcc) => {
    const skB = r2(gross * pct / 100), pay = r2(gross - skB), skN = r2(skB / 1.2), skV = r2(skB - skN);
    return { pay, skB, skN, skV, list: [
      bk([[supNo, pay]], [['2800', pay]], { label: 'Zahlung', effect: 'Ø', hint: ['Zuerst die Überweisung: Lieferant an Bank, mit dem überwiesenen Betrag.'] }),
      bk([[supNo, skB]], [[assetAcc, skN], ['2500', skV]], { label: 'Skonto', effect: 'Ø', hint: ['Der Skonto mindert den Anschaffungswert und die Vorsteuer.', `Skonto brutto ${E(skB)} = netto ${E(skN)} + Vorsteuer ${E(skV)}.`], calc: [`Skonto: ${pct} % von ${E(gross)} = ${E(skB)}`, `davon netto ${E(skB)} : 1,2 = ${E(skN)}, Vorsteuer ${E(skV)}`] }),
    ] };
  };
  const vatOf = net => r2(net * 0.2), grossOf = net => r2(net + vatOf(net));
  const invoice = (acc, net, supNo, o = {}) => bk([[acc, net], ['2500', vatOf(net)]], [[supNo, grossOf(net)]], { effect: 'Ø', hint: ['Anlagenkonto und Vorsteuer an das Personenkonto des Lieferanten.'], ...o });
  const COMPANY = ['Weingut Hollerer KG', 'Bäckerei Hörmann GmbH', 'Brauerei Zwettler OG', 'Druckerei Ferstl GmbH', 'Tischlerei Aigner e. U.', 'Molkerei Hochreiter GmbH', 'Konditorei Lindner OG', 'Kaffeerösterei Bauer e. U.'];
  const MACHINES = [['eine Abfüllanlage', 'Abfüllanlage'], ['einen Etagenbackofen', 'Etagenbackofen'], ['eine Druckmaschine', 'Druckmaschine'], ['eine CNC-Fräse', 'CNC-Fräse'], ['eine Kaffeeröstmaschine', 'Kaffeeröstmaschine'], ['eine Verpackungsanlage', 'Verpackungsanlage'], ['eine Etikettiermaschine', 'Etikettiermaschine']];
  const BGA = [['einer Empfangstheke', 'Empfangstheke', 'shop'], ['eines Regalsystems', 'Regalsystem', 'shop'], ['einer Kühlvitrine', 'Kühlvitrine', 'shop'], ['eines Besprechungstisches mit Stühlen', 'Besprechungstisch mit 6 Stühlen', 'shop'], ['eines Wandtresors', 'Wandtresor', 'safe']];
  // [accusative, short name, GWG account, gross price range, genitive]
  const SMALL = [['einen Ventilator für das Büro', 'Ventilator', '0670', [380, 900], 'eines Ventilators für das Büro'], ['ein Tablet', 'Tablet', '0672', [520, 1450], 'eines Tablets'], ['einen Bürostuhl', 'Bürostuhl', '0670', [420, 1380], 'eines Bürostuhls'], ['einen Monitor', 'Monitor', '0672', [260, 1300], 'eines Monitors'], ['einen Laserdrucker', 'Laserdrucker', '0672', [300, 1350], 'eines Laserdruckers'], ['eine Kaffeemaschine für den Pausenraum', 'Kaffeemaschine', '0670', [500, 1320], 'einer Kaffeemaschine für den Pausenraum']];
  const SMALL_SPEC = { Ventilator: 'Standventilator 3 Stufen', Tablet: 'Tablet 11", 256 GB, LTE', Bürostuhl: 'Bürodrehstuhl ergonomisch', Monitor: 'Monitor 32", 4K', Laserdrucker: 'Farblaserdrucker A4', Kaffeemaschine: 'Kaffeevollautomat' };
  const net100 = (r, a, b) => round100(r.int(a, b)), net10 = (r, a, b) => round10(r.int(a, b));
  const skTerms = pct => `Zahlbar innerhalb von 10 Tagen mit ${pct} % Skonto, innerhalb von 30 Tagen netto.`;
  const supLead = (kind, s) => `${kind} der ${s.name} (Lieferantenkonto ${s.no}).`;

  const TEMPLATES = [];
  const tpl = (id, title, sub, fig, make) => TEMPLATES.push({ id, title, sub, fig, make });

  tpl('kauf', 'Anlagenkauf verbuchen, Abschreibung berechnen und verbuchen', 'Kauf, Montage, Skonto und Abschreibung bis zum Erinnerungseuro', 'akauf', r => {
    const company = r.pick(COMPANY), { names, sup, nr, me } = caseKit(r, company), [mName, mShort] = r.pick(MACHINES), acc = '0400';
    const A = sup('machine'), B = sup('montage'), C = sup('bau');
    const rab = r.pick([0, 0, 5, 10]), LP = net100(r, 18000, 90000), N = r2(LP * (1 - rab / 100));
    const hours = r.int(6, 22), rate = r.pick([68, 72, 78, 85, 92]), mat = net10(r, 120, 900), M2 = hours * rate + mat;
    const K = r.int(600, 2400), G = grossOf(K), nd = r.pick([4, 5, 6]), keep = r.chance(0.7);
    const inv = [r.int(3, 26), r.int(1, 4)], inb = dateAfter(r, inv, 5, 20), mont = inb, maur = dateAfter(r, inb, 1, 6), payA = dateAfter(r, maur, 3, 12), payB = dateAfter(r, payA, 2, 9);
    const eA = nr.E(), eB = nr.E(), eC = nr.E(), pct = r.pick([2, 3]), sk = skontoBookings(A.no, grossOf(N), pct, acc), aw = r2(N + M2 + K - sk.skN), plan = afaPlan(aw, nd, inb[1], { keepEuro: keep }), last = plan.rows.at(-1);
    const years = [plan.rows[0], plan.rows[2], last].filter((x, i, a) => x && a.indexOf(x) === i);
    const dA = invDoc(r, A.p, me, { date: inv, delivery: inv, items: [{ text: mShort, sub: 'Lieferung frei Haus, inkl. Einschulung', total: LP }], rab, terms: skTerms(pct) });
    const dB = invDoc(r, B.p, me, { date: mont, delivery: mont, items: [{ text: 'Montage und Inbetriebnahme', sub: mShort, qty: hours, unit: 'Std.', each: rate, total: hours * rate }, { text: 'Kleinmaterial, Anschlüsse', total: mat }] });
    const dC = invDoc(r, C.p, me, { date: maur, delivery: maur, items: [{ text: 'Maurerarbeiten', sub: `Fundament für ${mShort}`, total: K }] });
    const steps = [
      { date: d(...inv), beleg: eA, text: `${A.name} schickt die Rechnung über ${mName}: ${E(N)} + ${E(vatOf(N))} USt = ${E(grossOf(N))}. Die Anlage wird frei Haus geliefert und am ${d(...inb)} in Betrieb genommen.`, lead: `${supLead('Eingangsrechnung', A)} Die Anlage wird frei Haus geliefert und am ${d(...inb)} in Betrieb genommen.`, doc: dA, bookings: [invoice(acc, N, A.no, rab ? { hint: [`Gebucht wird der Nettobetrag nach Abzug des Rabatts: ${E(N)}.`, 'Anlagenkonto und Vorsteuer an das Personenkonto des Lieferanten.'] } : {})] },
      { date: d(...mont), beleg: eB, text: `Rechnung der ${B.name} (${B.no}) über die Installation: ${E(M2)} + ${E(vatOf(M2))} USt = ${E(grossOf(M2))}.`, lead: supLead('Eingangsrechnung', B), doc: dB, bookings: [invoice(acc, M2, B.no, { hint: ['Installation und Aufstellung sind Nebenkosten: Sie gehören zum Anschaffungswert.'] })] },
      { date: d(...maur), beleg: eC, text: `Rechnung der ${C.name} (${C.no}) über Maurerarbeiten von ${E(G)} (inkl. 20 % USt), die für die Aufstellung nötig waren.`, lead: `${supLead('Eingangsrechnung', C)} Die Arbeiten waren für die Aufstellung der Anlage nötig.`, doc: dC, bookings: [invoice(acc, K, C.no, { hint: [`Netto = ${E(G)} : 1,2 = ${E(K)}.`, 'Auch diese Kosten sind nötig, um die Anlage betriebsbereit zu machen.'], calc: [`${E(G)} : 1,2 = ${E(K)}, Vorsteuer ${E(G - K)}`] })] },
      { date: d(...payA), beleg: nr.B(), text: `Überweisung von ${E(sk.pay)} an ${A.name} zum Ausgleich der ${eA} abzüglich ${pct} % Skonto.`, lead: `Kontoauszug: Ausgleich der ${eA}.`, doc: bankDoc(r, me, payA, [{ text: `Überweisung ${A.name}`, ref: `Re-Nr. ${dA.no} abzgl. ${pct} % Skonto`, amount: -sk.pay }], nr), bookings: sk.list },
      { date: d(...payB), beleg: nr.B(), text: `Ausgleich der ${eB} der ${B.name} durch Banküberweisung.`, lead: `Kontoauszug: Ausgleich der ${eB}.`, doc: bankDoc(r, me, payB, [{ text: `Überweisung ${B.name}`, ref: `Re-Nr. ${dB.no}`, amount: -grossOf(M2) }], nr), bookings: [bk([[B.no, grossOf(M2)]], [['2800', grossOf(M2)]], { effect: 'Ø' })] },
      { info: `Die Nutzungsdauer der Anlage beträgt ${nd} Jahre, lineare Abschreibung. ${keep ? `Am Ende der Nutzungsdauer ist die Anlage weiterhin gebrauchsfähig: Abschreibung auf den Erinnerungseuro. Sie scheidet Ende ${last.year + 1} aus.` : 'Sie scheidet am Ende der Nutzungsdauer aus dem Betrieb aus.'}` },
      { part: 'b', text: 'Berechne den Anschaffungswert, die Abschreibungsbeträge (lineare Abschreibung) und die Buchwerte. Erfasse die Werte in der Tabelle.', afa: afaSpec(mShort, aw, nd, inb[1], plan.rows.length, { keepEuro: keep, awTraps: [{ value: N + M2 + K, msg: 'Der Skonto mindert den Anschaffungswert.' }, { value: grossOf(aw), msg: 'Ohne Vorsteuer.' }, { value: N, msg: 'Installation und Maurerarbeiten gehören auch zum Anschaffungswert.' }], hint: ['Anschaffungswert = Kaufpreis + Installation + Maurerarbeiten − Skonto, alles netto.', `Abschreibungssatz = 100 : ${nd}.`], calc: [`Anschaffungswert: ${E(N)} + ${E(M2)} + ${E(K)} − ${E(sk.skN)} = ${E(aw)}`, ...afaCalc(aw, nd, plan, d(...inb))] }) },
      ...years.map((row, i) => ({ date: `31.12.${row.year}`, bookings: [afaBooking(acc, row, { hint: i === 0 ? [`Anschaffungswert = Kaufpreis + Installation + Maurerarbeiten − Skonto (alles netto) = ${E(aw)}.`, `Jahresabschreibung ${E(plan.annual)}.`] : row === last ? [keep ? 'Im letzten Jahr bleibt € 1,– als Erinnerungswert stehen.' : 'Im letzten Jahr wird der Rest-Buchwert abgeschrieben.'] : [`Jahresabschreibung ${E(plan.annual)}.`], calc: i === 0 ? afaCalc(aw, nd, plan, d(...inb)) : [`Buchwert davor ${E(row.bw + row.afa)}, Abschreibung ${E(row.afa)}`] })] })),
      ...(keep ? [{ date: `31.12.${last.year + 1}`, text: 'Die Anlage scheidet aus dem Betrieb aus.', bookings: [bk([['7010', 1]], [[acc, 1]], { effect: '↓', hint: ['Jetzt wird der Erinnerungseuro abgeschrieben.'] })] }] : []),
    ];
    steps.forEach(x => { if (!x.part && x.bookings) x.part = x.date?.startsWith('31.12') ? 'c' : 'a'; });
    return { title: 'Anlagenkauf verbuchen, Abschreibung berechnen und verbuchen, Erfolgsauswirkung', company, intro: `${company} bestellt ${mName} bei ${A.name} (${A.no}).`, names, steps, tasks: ['Verbuche die laufenden Geschäftsfälle.', 'Berechne den Anschaffungswert sowie die Abschreibungsbeträge (lineare Abschreibung) und Buchwerte. Erfasse die Werte in der Tabelle.', `Verbuche die Abschreibungen für ${years.map(x => x.year).join(', ')}${keep ? ` und ${last.year + 1}` : ''}.`, 'Gib an, ob sich durch den jeweiligen Geschäftsfall das Eigenkapital vermehrt (↑), vermindert (↓) oder ob es sich um eine erfolgsneutrale Buchung (Ø) handelt.'] };
  });

  tpl('zwei', 'Zwei Anlagenkäufe in einem Geschäftsjahr', 'Ausstattung und Maschine mit Transport, Skonto und drei Jahren Abschreibung', 'av', r => {
    const company = r.pick(['Haus & Heim-Baumarkt OG', 'Gartencenter Wagner KG', 'Sportfachhandel Leitner GmbH', 'Elektrohandel Fuchs e. U.']), { names, sup, nr, me } = caseKit(r, company);
    const [bName, bShort, bRole] = r.pick(BGA), [mName, mShort] = r.pick([['eines Kompressors', 'Kompressor'], ['einer Hebebühne', 'Hebebühne'], ['einer Folienschweißmaschine', 'Folienschweißmaschine'], ['einer Teigknetmaschine', 'Teigknetmaschine']]);
    const S1 = sup(bRole), S2 = sup('machine'), T = sup('transport');
    const n1 = net10(r, 1100, 6800), nd1 = r.pick([8, 10]), d1 = [r.int(2, 26), r.int(3, 5)];
    const n2 = net100(r, 6000, 24000), nd2 = r.pick([5, 6, 8]), d2 = [r.int(2, 26), r.int(7, 9)], inb2 = dateAfter(r, d2, 1, 6), tr = net10(r, 90, 380), dT = dateAfter(r, inb2, 1, 8), pay2 = dateAfter(r, dT, 2, 8), pay1 = dateAfter(r, d1, 3, 10);
    const e1 = nr.E(), pct = 3, sk = skontoBookings(S2.no, grossOf(n2), pct, '0400');
    const aw1 = n1, aw2 = r2(n2 + tr - sk.skN), p1 = afaPlan(aw1, nd1, d1[1]), p2 = afaPlan(aw2, nd2, inb2[1]);
    const e2 = nr.E(), eT = nr.E();
    const doc1 = invDoc(r, S1.p, me, { date: d1, delivery: d1, items: [{ text: bShort, sub: 'geliefert und montiert', total: n1 }], terms: 'Zahlbar innerhalb von 10 Tagen ohne Abzug.' });
    const doc2 = invDoc(r, S2.p, me, { date: d2, delivery: d2, items: [{ text: mShort, sub: 'Lieferung ab Werk', total: n2 }], terms: skTerms(pct) });
    const docT = invDoc(r, T.p, me, { date: dT, delivery: inb2, items: [{ text: 'Transport', sub: `${mShort}, Zustellung frei Haus`, total: tr }], terms: 'Zahlbar innerhalb von 10 Tagen ohne Abzug.' });
    return {
      title: 'Anlagenkauf verbuchen, Abschreibung berechnen und verbuchen, Erfolgsauswirkung', company, intro: `${company} kauft im Jahr 2025 unter anderem folgende Anlagegegenstände:`, names,
      tasks: ['Verbuche die laufenden Geschäftsfälle.', 'Berechne die Anschaffungswerte, die Abschreibungsbeträge (lineare Abschreibung) und die Buchwerte für die ersten drei Jahre der Nutzung.', 'Verbuche die Abschreibungen der ersten drei Jahre.', 'Gib an, ob sich durch den jeweiligen Geschäftsfall das Eigenkapital vermehrt (↑), vermindert (↓) oder ob es sich um eine erfolgsneutrale Buchung (Ø) handelt.'],
      steps: [
        { date: d(...d1), beleg: e1, text: `Kauf ${bName} bei ${S1.name} (${S1.no}) um ${E(n1)} + ${E(vatOf(n1))} USt = ${E(grossOf(n1))}, sofortige Inbetriebnahme, Nutzungsdauer ${nd1} Jahre, Abschreibung auf den Erinnerungseuro. Zahlung zehn Tage ohne Abzug.`, lead: `${supLead('Eingangsrechnung', S1)} Sofortige Inbetriebnahme, Nutzungsdauer ${nd1} Jahre.`, doc: doc1, bookings: [invoice('0600', n1, S1.no)] },
        { date: d(...pay1), beleg: nr.B(), text: `Überweisung von ${E(grossOf(n1))} an ${S1.name} zum Ausgleich der ${e1}.`, lead: `Kontoauszug: Ausgleich der ${e1}.`, doc: bankDoc(r, me, pay1, [{ text: `Überweisung ${S1.name}`, ref: `Re-Nr. ${doc1.no}`, amount: -grossOf(n1) }], nr), bookings: [bk([[S1.no, grossOf(n1)]], [['2800', grossOf(n1)]], { effect: 'Ø' })] },
        { date: d(...d2), beleg: e2, text: `Kauf ${mName} bei ${S2.name} (${S2.no}) um ${E(n2)} + ${E(vatOf(n2))} USt = ${E(grossOf(n2))}; Inbetriebnahme am ${d(...inb2)}, Nutzungsdauer ${nd2} Jahre.`, lead: `${supLead('Eingangsrechnung', S2)} Inbetriebnahme am ${d(...inb2)}, Nutzungsdauer ${nd2} Jahre.`, doc: doc2, bookings: [invoice('0400', n2, S2.no)] },
        { date: d(...dT), beleg: eT, text: `${T.name} (${T.no}) stellt den Transport ${E(tr)} + ${E(vatOf(tr))} USt = ${E(grossOf(tr))} in Rechnung, zahlbar in zehn Tagen ohne Abzug.`, lead: supLead('Eingangsrechnung', T), doc: docT, bookings: [invoice('0400', tr, T.no, { hint: ['Transportkosten sind Nebenkosten der Anschaffung: Anlagenkonto, nicht Aufwand.'] })] },
        { date: d(...pay2), beleg: nr.B(), text: `Überweisung von ${E(sk.pay)} (${E(grossOf(n2))} − ${pct} % Skonto) an ${S2.name}.`, lead: `Kontoauszug: Ausgleich der ${e2}.`, doc: bankDoc(r, me, pay2, [{ text: `Überweisung ${S2.name}`, ref: `Re-Nr. ${doc2.no} abzgl. ${pct} % Skonto`, amount: -sk.pay }], nr), bookings: sk.list },
        { part: 'b', text: `Berechne die Abschreibungsbeträge (lineare Abschreibung) und die Buchwerte für ${bShort === 'Besprechungstisch mit 6 Stühlen' ? 'den Besprechungstisch' : `„${bShort}“`} für die ersten drei Jahre der Nutzung.`, afa: afaSpec(bShort, aw1, nd1, d1[1], 3, { awTraps: [{ value: grossOf(aw1), msg: 'Ohne Vorsteuer.' }], hint: [`Abschreibungssatz = 100 : ${nd1}.`], calc: afaCalc(aw1, nd1, p1, d(...d1)) }) },
        { part: 'b', text: `Berechne den Anschaffungswert, die Abschreibungsbeträge und die Buchwerte für „${mShort}“ für die ersten drei Jahre.`, afa: afaSpec(mShort, aw2, nd2, inb2[1], 3, { awTraps: [{ value: n2 + tr, msg: 'Der Skonto mindert den Anschaffungswert.' }, { value: n2 - sk.skN, msg: 'Der Transport gehört zum Anschaffungswert.' }, { value: grossOf(aw2), msg: 'Ohne Vorsteuer.' }], hint: ['Anschaffungswert = Kaufpreis + Transport − Skonto (netto).'], calc: [`${mShort}: ${E(n2)} + ${E(tr)} − ${E(sk.skN)} = ${E(aw2)}`, ...afaCalc(aw2, nd2, p2, d(...inb2))] }) },
        ...[0, 1, 2].map(i => ({ part: 'c', date: `31.12.${2025 + i}`, bookings: [afaBooking('0600', p1.rows[i], { label: bShort, calc: i === 0 ? afaCalc(aw1, nd1, p1, d(...d1)) : [] }), afaBooking('0400', p2.rows[i], { label: mShort, calc: i === 0 ? afaCalc(aw2, nd2, p2, d(...inb2)) : [] })] })),
      ],
    };
  });

  tpl('fahrzeug', 'Fahrzeuge und Gebäude', 'Pkw ohne Vorsteuer, Elektroauto, Lkw und Lagerhalle', 'akauf', r => {
    const company = r.pick(['Markus Kremser GmbH', 'Design Möbel Huber GmbH', 'Getränkehandel Reisinger KG', 'Fliesen Doppler GmbH']), { names, sup, nr, me } = caseKit(r, company);
    const elektro = r.chance(0.4), C1 = sup('cars'), steps = [];
    // Below the € 40.000 luxury limit (incl. USt and NoVA), so the whole price counts.
    const dP = [r.int(2, 26), r.int(2, 9)], net = elektro ? round100(r.int(20000, 33300)) : 0, gross = elektro ? grossOf(net) : round100(r.int(24000, 39900));
    const pkwAw = elektro ? net : gross, pP = afaPlan(pkwAw, 8, dP[1]), eP = nr.E();
    const docP = elektro
      ? invDoc(r, C1.p, me, { date: dP, delivery: dP, items: [{ text: 'Elektro-Pkw, Neuwagen', sub: `${r.int(60, 82)} kWh Akku, 0 g CO₂/km, NoVA-befreit`, total: net }] })
      : invDoc(r, C1.p, me, { date: dP, delivery: dP, items: [{ text: 'Pkw Kombi, Neuwagen', sub: `Benzinmotor, ${r.int(110, 190)} PS, ${r.pick(['Metallic-Grau', 'Schwarz', 'Weiß', 'Dunkelblau'])}`, total: gross }], grossOnly: true, foot: 'Preis inkl. 20 % USt und NoVA.' });
    steps.push({ date: d(...dP), beleg: eP, text: elektro ? `Kauf eines Elektro-Pkw (0 g CO₂) bei ${C1.name} (${C1.no}) um ${E(gross)} inkl. 20 % USt, sofortige Inbetriebnahme, Nutzungsdauer 8 Jahre.` : `Kauf eines Firmen-Pkw (Verbrennermotor) bei ${C1.name} (${C1.no}) um ${E(gross)} (inkl. 20 % USt und NoVA), sofortige Inbetriebnahme, Nutzungsdauer 8 Jahre.`, lead: `${supLead('Eingangsrechnung', C1)} Sofortige Inbetriebnahme, Nutzungsdauer 8 Jahre.`, doc: docP,
      bookings: [elektro ? bk([['0630', net], ['2500', gross - net]], [[C1.no, gross]], { effect: 'Ø', hint: ['Elektro-Pkw bis € 40.000,– brutto: voller Vorsteuerabzug.'], calc: [`Netto: ${E(gross)} : 1,2 = ${E(net)}`] }) : bk([['0630', gross]], [[C1.no, gross]], { effect: 'Ø', hint: ['Pkw mit Verbrennermotor: kein Vorsteuerabzug, der Bruttobetrag samt NoVA ist der Anschaffungswert.'] })] });
    const payP = dateAfter(r, dP, 3, 12);
    steps.push({ date: d(...payP), beleg: nr.B(), text: `Überweisung von ${E(gross)} an ${C1.name}.`, lead: `Kontoauszug: Ausgleich der ${eP}.`, doc: bankDoc(r, me, payP, [{ text: `Überweisung ${C1.name}`, ref: `Re-Nr. ${docP.no}`, amount: -gross }], nr), bookings: [bk([[C1.no, gross]], [['2800', gross]], { effect: 'Ø' })] });
    const building = r.chance(0.6), rows = [];
    if (building) {
      const B = sup('bau'), n = round100(r.int(120000, 420000)), dB = dateAfter(r, payP, 4, 60), pB = afaPlan(n, 40, dB[1]);
      const docB = invDoc(r, B.p, me, { date: dB, delivery: dB, items: [{ text: 'Errichtung Lagerhalle', sub: 'Schlussrechnung lt. Auftrag, schlüsselfertig', total: n }], terms: 'Zahlbar innerhalb von 30 Tagen ohne Abzug.' });
      steps.push({ date: d(...dB), beleg: nr.E(), text: `Rechnung der ${B.name} (${B.no}) über die Fertigstellung einer Lagerhalle: ${E(n)} + ${E(vatOf(n))} USt = ${E(grossOf(n))}, sofortige Inbetriebnahme, Nutzungsdauer 40 Jahre.`, lead: `${supLead('Eingangsrechnung', B)} Die Lagerhalle wird sofort genutzt, Nutzungsdauer 40 Jahre.`, doc: docB, bookings: [invoice('0300', n, B.no)] });
      rows.push(['0300', 'Lagerhalle', pB, n, d(...dB), 40]);
      steps.push({ info: 'Gut zu wissen: Im Steuerrecht dürfen neue Gebäude im ersten Jahr beschleunigt abgeschrieben werden (§ 8 Abs. 1a EStG). In diesem Fall rechnest du wie im Buch linear mit 2,5 % und der Halbjahresregel.' });
    } else {
      const L = sup('cars'), n = net100(r, 28000, 60000), dL = dateAfter(r, payP, 4, 60), nd = r.pick([5, 6, 8]), pL = afaPlan(n, nd, dL[1]);
      const docL = invDoc(r, L.p, me, { date: dL, delivery: dL, items: [{ text: 'Lieferwagen (Lkw), Neufahrzeug', sub: 'Kastenwagen, 3,5 t', total: n }] });
      steps.push({ date: d(...dL), beleg: nr.E(), text: `Kauf eines Lieferwagens (Lkw) bei ${L.name} (${L.no}) um ${E(n)} + ${E(vatOf(n))} USt = ${E(grossOf(n))}, sofortige Inbetriebnahme, Nutzungsdauer ${nd} Jahre.`, lead: `${supLead('Eingangsrechnung', L)} Sofortige Inbetriebnahme, Nutzungsdauer ${nd} Jahre.`, doc: docL, bookings: [invoice('0640', n, L.no, { hint: ['Beim Lkw gibt es den vollen Vorsteuerabzug.'] })] });
      rows.push(['0640', 'Lkw', pL, n, d(...dL), nd]);
    }
    rows.unshift(['0630', 'Pkw', pP, pkwAw, d(...dP), 8]);
    for (const [acc, label, plan, aw, when, nd] of rows) {
      const isPkw = acc === '0630', month = Number(when.split('.')[1]);
      const awTraps = isPkw ? (elektro ? [{ value: gross, msg: 'Beim Elektro-Pkw bis € 40.000,– gibt es den Vorsteuerabzug: Anschaffungswert ist der Nettobetrag.' }] : [{ value: r2(gross / 1.2), msg: 'Beim Pkw mit Verbrennermotor gibt es keinen Vorsteuerabzug: Die Umsatzsteuer gehört zum Anschaffungswert.' }]) : [{ value: grossOf(aw), msg: 'Ohne Vorsteuer.' }];
      steps.push({ part: 'b', text: `Berechne die Abschreibungsbeträge (lineare Abschreibung) und Buchwerte für ${label === 'Lagerhalle' ? 'die Lagerhalle' : label === 'Lkw' ? 'den Lkw' : 'den Pkw'} in den ersten ${isPkw ? 'zwei' : 'drei'} Jahren der Nutzung.`, afa: afaSpec(label, aw, nd, month, isPkw ? 2 : 3, { awTraps, hint: [isPkw && !elektro ? 'Pkw: Anschaffungswert ist der Bruttobetrag samt NoVA.' : 'Anschaffungswert = Nettobetrag der Rechnung.', `Abschreibungssatz = 100 : ${nd}.`], calc: afaCalc(aw, nd, plan, when) }) });
    }
    for (const y of [0, 1, 2]) steps.push({ part: 'c', date: `31.12.${2025 + y}`, bookings: rows.filter(([acc]) => y < 2 || acc !== '0630').map(([acc, label, plan, aw, when, nd]) => afaBooking(acc, plan.rows[y], { label, calc: y === 0 ? afaCalc(aw, nd, plan, when) : [] })) });
    steps.forEach(x => { if (!x.part && x.bookings) x.part = 'a'; });
    return { title: 'Anlagenkauf verbuchen, Abschreibung berechnen und verbuchen, Erfolgsauswirkung', company, intro: `${company} kauft im Jahr 2025 unter anderem folgende Anlagen:`, names, steps, tasks: ['Verbuche die laufenden Geschäftsfälle.', `Berechne die Abschreibungsbeträge (lineare Abschreibung) sowie die Buchwerte für den Pkw im ersten und zweiten Jahr der Nutzung und für ${building ? 'die Lagerhalle' : 'den Lkw'} in den ersten drei Jahren der Nutzung. Erfasse die Werte in den Tabellen.`, `Verbuche die Abschreibungen für den Pkw im ersten und zweiten Jahr und für ${building ? 'die Lagerhalle' : 'den Lkw'} in den ersten drei Jahren der Nutzung.`, 'Gib an, ob sich durch den jeweiligen Geschäftsfall das Eigenkapital vermehrt (↑), vermindert (↓) oder ob es sich um eine erfolgsneutrale Buchung (Ø) handelt.'] };
  });

  // Payment for small purchases: debit card and credit card are booked like the book's trainer does.
  const PAY = { debit: ['3190', 'mit der Firmendebitkarte'], credit: ['3180', 'mit der Firmenkreditkarte'], cash: ['2700', 'bar'], bank: ['2800', 'per Banküberweisung'] };
  function smallBuy(r, kind, payKey, forceGwg, avoid = []) {
    const item = r.pick(SMALL.filter(x => !avoid.includes(x[1]) && (forceGwg === undefined || (forceGwg ? x[3][0] < 1000 : x[3][1] > 1250))));
    const gross = forceGwg === false ? r.int(1260, Math.max(1270, item[3][1])) + r.pick([0, 0.9]) : r.int(item[3][0], Math.min(item[3][1], 1180)) + r.pick([0, 0.9]);
    const net = r2(gross / 1.2), v = r2(gross - net), gwg = net <= 1000, [payAcc, payText] = PAY[payKey], assetAcc = item[2] === '0672' ? '0620' : '0600';
    return { item, gross, net, v, gwg, payAcc, payText, assetAcc };
  }
  const payHint = acc => ({ '3190': 'Debitkarte: 3190 Verbindlichkeiten Debitkarten.', '3180': 'Kreditkarte: 3180 Verbindlichkeiten Kreditkartenunternehmen.', '2700': 'Barzahlung: 2700 Kassa.' }[acc]);
  const rcptLead = (x, extra = '') => `${x.payAcc === '2700' ? 'Kassenbon' : 'Kartenbeleg'} über den Kauf ${x.item[4]}.${extra ? ` ${extra}` : ''}`;
  tpl('gwg', 'Anlagenzugänge verbuchen', 'Maschine, Server, Karte, Kassa und die € 1.000-Grenze für GWG', 'akauf', r => {
    const company = r.pick(['Skateshop Skates24 e. U.', 'Radsport Kogler e. U.', 'Fotostudio Lichtblick OG', 'Copyshop Gruber KG']), { names, sup, nr, me, store } = caseKit(r, company);
    const M1 = sup('machine'), O1 = sup('office'), O2 = sup('safe'), steps = [], afa = [];
    const nM = net100(r, 4000, 16000), ndM = 10, dM = [r.int(2, 20), r.int(1, 3)], inbM = dateAfter(r, dM, 2, 8), eM = nr.E();
    const docM = invDoc(r, M1.p, me, { date: dM, delivery: dM, items: [{ text: 'Verpackungsmaschine', sub: 'Schlauchbeutelmaschine, halbautomatisch', total: nM }] });
    steps.push({ date: d(...dM), beleg: eM, text: `Kauf einer Verpackungsmaschine bei ${M1.name} (${M1.no}): ${E(nM)} + ${E(vatOf(nM))} USt = ${E(grossOf(nM))}, Inbetriebnahme am ${d(...inbM)}, Nutzungsdauer ${ndM} Jahre, lineare Abschreibung.`, lead: `${supLead('Eingangsrechnung', M1)} Inbetriebnahme am ${d(...inbM)}, Nutzungsdauer ${ndM} Jahre.`, doc: docM, bookings: [invoice('0400', nM, M1.no)] });
    const payM = dateAfter(r, dM, 5, 9);
    steps.push({ date: d(...payM), beleg: nr.B(), text: `Überweisung an ${M1.name} zum Ausgleich der ${eM}.`, lead: `Kontoauszug: Ausgleich der ${eM}.`, doc: bankDoc(r, me, payM, [{ text: `Überweisung ${M1.name}`, ref: `Re-Nr. ${docM.no}`, amount: -grossOf(nM) }], nr), bookings: [bk([[M1.no, grossOf(nM)]], [['2800', grossOf(nM)]], { effect: 'Ø' })] });
    afa.push(['0400', 'Verpackungsmaschine', afaPlan(nM, ndM, inbM[1]), nM, d(...inbM), ndM]);
    const nS = net10(r, 1600, 4800), dS = [r.int(2, 20), r.int(4, 5)], inbS = dateAfter(r, dS, 2, 7), eS = nr.E(), instH = r.int(2, 5), hw = r2(nS - instH * 90);
    const docS = invDoc(r, O1.p, me, { date: dS, delivery: dS, items: [{ text: 'Server', sub: '2 × 16 Kerne, 128 GB RAM, 4 × 2 TB SSD', total: hw }, { text: 'Einrichtung und Installation', qty: instH, unit: 'Std.', each: 90, total: instH * 90 }], terms: 'Zahlbar innerhalb von 10 Tagen netto.' });
    steps.push({ date: d(...dS), beleg: eS, text: `Rechnung von ${O1.name} (${O1.no}) über einen Server: ${E(nS)} + ${E(vatOf(nS))} USt = ${E(grossOf(nS))}, zahlbar in 10 Tagen netto. Inbetriebnahme am ${d(...inbS)}, Nutzungsdauer 4 Jahre.`, lead: `${supLead('Eingangsrechnung', O1)} Inbetriebnahme am ${d(...inbS)}, Nutzungsdauer 4 Jahre.`, doc: docS, bookings: [invoice('0620', nS, O1.no, { hint: ['Auch die Einrichtung gehört zum Anschaffungswert des Servers.'] })] });
    const payS = dateAfter(r, dS, 4, 9);
    steps.push({ date: d(...payS), beleg: nr.B(), text: `Überweisung an ${O1.name} zum Ausgleich der ${eS} laut Zahlungsbedingung.`, lead: `Kontoauszug: Ausgleich der ${eS}.`, doc: bankDoc(r, me, payS, [{ text: `Überweisung ${O1.name}`, ref: `Re-Nr. ${docS.no}`, amount: -grossOf(nS) }], nr), bookings: [bk([[O1.no, grossOf(nS)]], [['2800', grossOf(nS)]], { effect: 'Ø' })] });
    afa.push(['0620', 'Server', afaPlan(nS, 4, inbS[1]), nS, d(...inbS), 4]);
    const g1 = smallBuy(r, 'gwg', r.pick(['debit', 'cash']), true), dG = [r.int(2, 26), r.int(7, 9)];
    steps.push({ date: d(...dG), beleg: g1.payAcc === '2700' ? nr.K() : nr.S(), text: `Kauf ${g1.item[4]} um ${E(g1.gross)} (inkl. 20 % USt), Zahlung ${g1.payText}.`, lead: rcptLead(g1), doc: rcptDoc(r, store(), dG, [{ text: SMALL_SPEC[g1.item[1]], price: g1.gross }], g1.payAcc), bookings: [bk([['7060', g1.net], ['2500', g1.v]], [[g1.payAcc, g1.gross]], { effect: '↓', hint: [`Netto ${E(g1.net)}: unter € 1.000,–, also GWG, sofort abschreiben.`, payHint(g1.payAcc)], calc: [`${E(g1.gross)} : 1,2 = ${E(g1.net)}`] })] });
    const nT = net10(r, 1100, 2900), dT = [r.int(2, 22), 10], inbT = dateAfter(r, dT, 3, 10), eT = nr.E(), pctT = 2, skT = skontoBookings(O2.no, grossOf(nT), pctT, '0600');
    const docT = invDoc(r, O2.p, me, { date: dT, delivery: dT, items: [{ text: 'Wandtresor', sub: 'Sicherheitsstufe 1, inkl. Verankerung', total: nT }], terms: skTerms(pctT) });
    steps.push({ date: d(...dT), beleg: eT, text: `Kauf eines Wandtresors bei ${O2.name} (${O2.no}): ${E(nT)} + ${E(vatOf(nT))} USt = ${E(grossOf(nT))}. Inbetriebnahme am ${d(...inbT)}, Nutzungsdauer 10 Jahre.`, lead: `${supLead('Eingangsrechnung', O2)} Inbetriebnahme am ${d(...inbT)}, Nutzungsdauer 10 Jahre.`, doc: docT, bookings: [invoice('0600', nT, O2.no)] });
    const payT = dateAfter(r, dT, 5, 8);
    steps.push({ date: d(...payT), beleg: nr.B(), text: `Überweisung von ${E(skT.pay)} an ${O2.name} zum Ausgleich der ${eT}, abzüglich ${pctT} % Skonto.`, lead: `Kontoauszug: Ausgleich der ${eT}.`, doc: bankDoc(r, me, payT, [{ text: `Überweisung ${O2.name}`, ref: `Re-Nr. ${docT.no} abzgl. ${pctT} % Skonto`, amount: -skT.pay }], nr), bookings: skT.list });
    afa.push(['0600', 'Wandtresor', afaPlan(r2(nT - skT.skN), 10, inbT[1]), r2(nT - skT.skN), d(...inbT), 10]);
    const g2 = smallBuy(r, 'gwg', 'credit', r.chance(0.5), [g1.item[1]]), dG2 = [r.int(2, 26), 11];
    steps.push({ date: d(...dG2), beleg: nr.S(), text: `Kauf ${g2.item[4]} um ${E(g2.gross)} (inkl. 20 % USt), Zahlung ${g2.payText}. Inbetriebnahme sofort, Nutzungsdauer 4 Jahre.`, lead: rcptLead(g2, 'Inbetriebnahme sofort, Nutzungsdauer 4 Jahre.'), doc: rcptDoc(r, store(), dG2, [{ text: SMALL_SPEC[g2.item[1]], price: g2.gross }], '3180'),
      bookings: [g2.gwg ? bk([['7060', g2.net], ['2500', g2.v]], [['3180', g2.gross]], { effect: '↓', hint: [`Netto ${E(g2.net)}: GWG.`, payHint('3180')], calc: [`${E(g2.gross)} : 1,2 = ${E(g2.net)}`] }) : bk([[g2.assetAcc, g2.net], ['2500', g2.v]], [['3180', g2.gross]], { effect: 'Ø', hint: [`Netto ${E(g2.net)}: über € 1.000,–, also kein GWG, sondern ein normales Anlagegut.`, payHint('3180')], calc: [`${E(g2.gross)} : 1,2 = ${E(g2.net)}`] })] });
    if (!g2.gwg) afa.push([g2.assetAcc, g2.item[1], afaPlan(g2.net, 4, 11), g2.net, d(...dG2), 4]);
    steps.push({ date: '31.12.2025', text: 'Verbuche die Abschreibungen der aktivierten Anlagen.', bookings: afa.map(([acc, label, plan, aw, when, nd]) => afaBooking(acc, plan.rows[0], { label, calc: afaCalc(aw, nd, plan, when) })) });
    return { title: 'Anlagenzugänge verbuchen', company, intro: `Bei ${company} ergeben sich im Geschäftsjahr 2025 unter anderem folgende Geschäftsfälle:`, names, steps };
  });

  tpl('gwg2', 'Geringwertige Wirtschaftsgüter am Jahresende abschreiben', 'Erst auf das GWG-Konto, am 31.12. als Aufwand', 'abuch', r => {
    const company = r.pick(['Steuerberatung Holzer OG', 'Architekturbüro Wendl GmbH', 'Werbeagentur Pixel KG']), { names, sup, nr, me, store } = caseKit(r, company);
    const a = smallBuy(r, 'gwg', 'cash', true), b = M.kit.repeat(() => { const x = smallBuy(r, 'gwg', 'debit', true, [a.item[1]]); return x.item[2] !== a.item[2] ? x : null; });
    const cItem = r.pick(SMALL.filter(x => x[1] !== a.item[1] && x[1] !== b.item[1] && x[3][1] > 1250)), cAcc = cItem[2] === '0672' ? '0620' : '0600', cNet = round10(r.int(1050, 1900)), O = sup(cAcc === '0620' ? 'office' : 'shop');
    const dates = [[r.int(2, 26), r.int(2, 4)], [r.int(2, 26), r.int(5, 7)], [r.int(2, 26), r.int(8, 10)]], slots = r.shuffle([0, 1, 2]);
    const steps = [], yearEnd = [];
    for (const [x, slot] of [[a, slots[0]], [b, slots[1]]]) {
      steps.push({ at: slot, date: d(...dates[slot]), beleg: x.payAcc === '2700' ? nr.K() : nr.S(), text: `Kauf ${x.item[4]} um ${E(x.gross)} (inkl. 20 % USt), Zahlung ${x.payText}.`, lead: rcptLead(x), doc: rcptDoc(r, store(), dates[slot], [{ text: SMALL_SPEC[x.item[1]], price: x.gross }], x.payAcc), bookings: [bk([[x.item[2], x.net], ['2500', x.v]], [[x.payAcc, x.gross]], { effect: 'Ø', hint: [`Netto ${E(x.net)}: GWG. In diesem Betrieb wird es zuerst auf ${kontoLabel(x.item[2])} erfasst.`, payHint(x.payAcc)], calc: [`${E(x.gross)} : 1,2 = ${E(x.net)}`] })] });
      yearEnd.push(bk([['7060', x.net]], [[x.item[2], x.net]], { label: x.item[1], effect: '↓', hint: ['Am Jahresende wird das GWG zur Gänze abgeschrieben: 7060 an das GWG-Konto.'] }));
    }
    const dC = dates[slots[2]], pc = afaPlan(cNet, 5, dC[1]);
    const docC = invDoc(r, O.p, me, { date: dC, delivery: dC, items: [{ text: SMALL_SPEC[cItem[1]], sub: 'Profi-Ausführung', total: cNet }] });
    steps.push({ at: slots[2], date: d(...dC), beleg: nr.E(), text: `Rechnung von ${O.name} (${O.no}) über ${cItem[0].replace(/ für das Büro| für den Pausenraum/, '')}: ${E(cNet)} + ${E(vatOf(cNet))} USt = ${E(grossOf(cNet))}, sofortige Inbetriebnahme, Nutzungsdauer 5 Jahre.`, lead: `${supLead('Eingangsrechnung', O)} Sofortige Inbetriebnahme, Nutzungsdauer 5 Jahre.`, doc: docC, bookings: [invoice(cAcc, cNet, O.no, { hint: [`Netto ${E(cNet)}: über € 1.000,–, also kein GWG, sondern ein normales Anlagegut.`] })] });
    steps.sort((x, y) => x.at - y.at);
    steps.push({ date: '31.12.2025', text: `Die geringwertigen Wirtschaftsgüter werden am Jahresende zur Gänze abgeschrieben, ${cItem[1] === 'Kaffeemaschine' ? 'die' : 'der'} ${cItem[1]} planmäßig über 5 Jahre.`.replace('der Tablet', 'das Tablet'), bookings: [...yearEnd, afaBooking(cAcc, pc.rows[0], { label: cItem[1], calc: afaCalc(cNet, 5, pc, d(...dC)) })] });
    return { title: 'Geringwertige Wirtschaftsgüter verbuchen', company, intro: `${company} erfasst geringwertige Wirtschaftsgüter zuerst auf einem eigenen Anlagenkonto und schreibt sie am Jahresende zur Gänze ab.`, names, steps };
  });

  tpl('afa', 'Abschreibungen zum Jahresende', 'Anlagenverzeichnis: Halbjahr, Pkw, Gebäude und Erinnerungseuro', 'afa', r => {
    const company = r.pick(['Tischlerei Aigner e. U.', 'Gärtnerei Moser KG', 'Autowerkstatt Binder GmbH']), list = [];
    const add = (acc, label, aw, start, nd, keep) => { const plan = afaPlan(aw, nd, start[1], { year: start[2], keepEuro: keep }); list.push({ acc, label, aw, start, nd, keep, plan }); };
    add('0400', r.pick(['Hobelmaschine', 'Lackieranlage', 'Hebebühne']), net100(r, 9000, 40000), [r.int(1, 28), r.int(1, 12), 2025], r.pick([5, 8, 10]), false);
    add('0630', 'Firmen-Pkw', round100(r.int(24000, 39900)), [r.int(1, 28), r.int(1, 12), r.int(2019, 2023)], 8, false);
    const itMonth = r.int(1, 12);
    add('0620', r.pick(['Laptops', 'Server', 'Kassensystem']), net10(r, 2000, 6000), [r.int(1, 28), itMonth, itMonth >= 7 ? 2021 : 2022], 4, true);
    add('0300', 'Werkstattgebäude', round100(r.int(180000, 480000)), [r.int(1, 28), r.int(1, 12), r.int(2012, 2020)], 40, false);
    const steps = [], rowsFor = x => x.plan.rows.find(y => y.year === 2025);
    const table = { head: 'row', rows: [['Anlage (Konto)', 'Inbetriebnahme', 'Anschaffungswert', 'ND', 'Buchwert 1.1.2025'], ...list.map(x => { const row = rowsFor(x), bw = row ? r2(row.bw + row.afa) : 1; return [`${x.label} (${x.acc})`, d(...x.start.slice(0, 2), x.start[2]), E(x.aw), `${x.nd} J.`, x.start[2] === 2025 ? '–' : E(bw)]; })] };
    const bookings = [];
    for (const x of list) {
      const row = rowsFor(x);
      if (row) bookings.push(afaBooking(x.acc, row, { label: x.label, hint: [row === x.plan.rows.at(-1) ? (x.keep ? 'Letztes Jahr der Nutzungsdauer: Rest-Buchwert minus € 1,– Erinnerungseuro.' : 'Letztes Jahr: der Rest-Buchwert.') : x.plan.half && row === x.plan.rows[0] ? 'Inbetriebnahme in der zweiten Jahreshälfte: halbe Jahresabschreibung.' : `Jahresabschreibung: ${E(x.aw)} : ${x.nd}.`], calc: [`Jahresabschreibung ${E(x.plan.annual)}${x.plan.half && row === x.plan.rows[0] ? ', davon die Hälfte' : ''}`] }));
    }
    const old = r.pick([['Kühlschrank', '0600', 'ein alter Kühlschrank, der'], ['Drucker', '0620', 'ein alter Drucker, der'], ['Werkbank', '0600', 'eine alte Werkbank, die']]);
    bookings.push(bk([['7010', 1]], [[old[1], 1]], { label: old[0], effect: '↓', hint: ['Die Anlage steht nur mehr mit € 1,– in den Büchern und scheidet aus: Erinnerungseuro abschreiben.'] }));
    steps.push({ date: '31.12.2025', text: `Verbuche die Abschreibungen für 2025. Alle Anlagen werden linear abgeschrieben; die EDV bleibt nach Ende der Nutzungsdauer weiter im Betrieb. Außerdem scheidet ${old[2]} nur mehr mit dem Erinnerungseuro erfasst ist, aus dem Betrieb aus.`, table, bookings });
    return { title: 'Abschreibungen berechnen und verbuchen', company, intro: `Auszug aus dem Anlagenverzeichnis von ${company}:`, names: {}, steps };
  });

  tpl('bewertung', 'Vermögen über mehrere Jahre bewerten', 'Grundstück, Aktien und Beteiligung: Abwertung, Zuschreibung oder keine Buchung', 'av', r => {
    const company = r.pick(['Hotel-Planungs- und Bau-GmbH', 'Bauunternehmen Damir Krizman e. U.', 'Computer Projects Unlimited KG']), { nr, me } = caseKit(r, company);
    const kinds = r.shuffle(['grund', 'aktien', 'beteiligung']).slice(0, r.chance(0.5) ? 3 : 2), buys = [], years = { 2025: [], 2026: [], 2027: [] }, texts = { 2025: [], 2026: [], 2027: [] };
    const buyDate = (a, b) => [r.int(2, 28), r.int(a, b)];
    if (kinds.includes('grund')) {
      const A = r.pick([2000, 5000, 8000, 10000, 25000]), p0 = r.int(60, 160), p1 = p0 - r.int(3, 10), p2 = p0 - r.int(12, 28), p3 = p0 + r.int(-6, 25), up = Math.min(p0, p3) - p2, dd = buyDate(2, 5);
      buys.push({ at: dd, text: `Kauf eines Grundstücks (${int(A)} m² zu ${E(p0)} pro m²) für eine spätere Lagerhalle, Bezahlung per Banküberweisung (Nebenkosten bleiben unberücksichtigt).`, lead: 'Kontoauszug: Kauf eines Grundstücks für eine spätere Lagerhalle (Nebenkosten bleiben unberücksichtigt).', bank: { text: 'Überweisung Notariat Treuhandkonto', ref: `Kaufpreis Grundstück ${int(A)} m² à ${eur(p0)}`, amount: -A * p0 }, bookings: [bk([['0200', A * p0]], [['2800', A * p0]], { effect: 'Ø', label: 'Grundstück' })] });
      texts[2025].push(`Grundstück: Wegen Spekulationen sinkt der Preis vorübergehend auf ${E(p1)} pro m².`); years[2025].push(none({ label: 'Grundstück', hint: ['Anlagevermögen, nur vorübergehende Wertminderung: Abwertung nicht erlaubt.'] }));
      texts[2026].push(`Grundstück: Eine Deponie in der Nähe wird fix geplant, der Preis sinkt dauerhaft auf ${E(p2)} pro m².`); years[2026].push(bk([['7040', A * (p0 - p2)]], [['0200', A * (p0 - p2)]], { label: 'Grundstück', effect: '↓', hint: ['Dauernde Wertminderung: muss abgewertet werden.'], calc: [`${int(A)} · (${E(p0)} − ${E(p2)}) = ${E(A * (p0 - p2))}`] }));
      texts[2027].push(`Grundstück: Die Deponie wird abgesagt, der Preis steigt auf ${E(p3)} pro m².`); years[2027].push(bk([['0200', A * up]], [['4660', A * up]], { label: 'Grundstück', effect: '↑', hint: ['Die Gründe fallen weg: Zuschreibung, höchstens bis zu den Anschaffungskosten.'], calc: [`Neuer Wert ${int(A)} · ${E(Math.min(p0, p3))}, Zuschreibung ${E(A * up)}`] }));
    }
    if (kinds.includes('aktien')) {
      const n = r.pick([200, 300, 500, 1000, 2000]), k0 = r.int(20, 60), k1 = k0 - r.int(4, 12), k2 = k0 + r.int(-2, 12), b1 = n * Math.min(k0, k1), b2 = n * Math.min(k0, k2), k3 = r.chance(0.5) ? Math.max(k0, k2) + r.int(1, 8) : Math.min(k0, k2) - r.int(3, 9), b3 = n * Math.min(k0, k3), name = r.pick(['Chemie AG', 'Energie AG', 'Telekom AG']), dd = buyDate(3, 8);
      buys.push({ at: dd, text: `Kauf von ${n} Aktien der ${name} zu Spekulationszwecken (Umlaufvermögen) zum Kurs von ${E(k0)}, Zahlung über das Bankkonto (Spesen bleiben unberücksichtigt).`, lead: `Kontoauszug: Die Aktien der ${name} werden zu Spekulationszwecken gekauft, sie gehören zum Umlaufvermögen (Spesen bleiben unberücksichtigt).`, bank: { text: 'Wertpapierkauf', ref: `${int(n)} Stk. ${name} à ${eur(k0)}`, amount: -n * k0 }, bookings: [bk([['2620', n * k0]], [['2800', n * k0]], { effect: 'Ø', label: 'Aktien' })] });
      const stepFor = (y, from, to, k) => { texts[y].push(`Aktien der ${name}: Kurs ${E(k)}.`); const diff = to - from; years[y].push(diff < 0 ? bk([['8271', -diff]], [['2620', -diff]], { label: 'Aktien', effect: '↓', hint: ['Umlaufvermögen: strenges Niederstwertprinzip.'], calc: [`${n} · ${E(Math.min(k0, k))} = ${E(to)}, bisher ${E(from)}`] }) : diff > 0 ? bk([['2620', diff]], [['8180', diff]], { label: 'Aktien', effect: '↑', hint: ['Zuschreibung, höchstens bis zu den Anschaffungskosten.'], calc: [`${n} · ${E(Math.min(k0, k))} = ${E(to)}, bisher ${E(from)}`] }) : none({ label: 'Aktien', hint: ['Der Bilanzansatz bleibt gleich: höchstens Anschaffungskosten.'] })); };
      stepFor(2025, n * k0, b1, k1); stepFor(2026, b1, b2, k2); stepFor(2027, b2, b3, k3);
    }
    if (kinds.includes('beteiligung')) {
      const n = r.pick([500, 1000, 1500]), k0 = r.int(30, 80), k1 = k0 - r.int(6, 15), k2 = k1 + r.int(3, 22), b2 = n * Math.min(k0, k2), name = r.pick(['Zulieferer Holzbau AG', 'Bau AG', 'Logistik AG']), dd = buyDate(1, 6);
      buys.push({ at: dd, text: `Erwerb von ${n} Aktien der ${name} als langfristige Beteiligung zum Kurs von ${E(k0)}, Zahlung per Bank.`, lead: `Kontoauszug: Die Aktien der ${name} werden als langfristige Beteiligung erworben.`, bank: { text: 'Wertpapierkauf', ref: `${int(n)} Stk. ${name} à ${eur(k0)}`, amount: -n * k0 }, bookings: [bk([['0800', n * k0]], [['2800', n * k0]], { effect: 'Ø', label: 'Beteiligung' })] });
      texts[2026].push(`Beteiligung: Wegen einer Branchenkrise fällt der Kurs dauerhaft auf ${E(k1)}.`); years[2026].push(bk([['8200', n * (k0 - k1)]], [['0800', n * (k0 - k1)]], { label: 'Beteiligung', effect: '↓', hint: ['Finanzanlage, dauernde Wertminderung: muss abgewertet werden.'], calc: [`${n} · (${E(k0)} − ${E(k1)}) = ${E(n * (k0 - k1))}`] }));
      texts[2027].push(`Beteiligung: Die Branche erholt sich, Kurs ${E(k2)}.`); years[2027].push(bk([['0800', b2 - n * k1]], [['8170', b2 - n * k1]], { label: 'Beteiligung', effect: '↑', hint: ['Zuschreibung bis höchstens zu den Anschaffungskosten.'], calc: [`${n} · ${E(Math.min(k0, k2))} − ${n} · ${E(k1)} = ${E(b2 - n * k1)}`] }));
      texts[2025].push(`Beteiligung: Kurs unverändert ${E(k0)}.`); years[2025].push(none({ label: 'Beteiligung', hint: ['Keine Wertänderung, keine Buchung.'] }));
    }
    const steps = buys.sort((a, b) => a.at[1] - b.at[1] || a.at[0] - b.at[0]).map(x => ({ date: d(...x.at), beleg: nr.B(), text: x.text, lead: x.lead, doc: bankDoc(r, me, x.at, [x.bank], nr), bookings: x.bookings }));
    for (const y of [2025, 2026, 2027]) steps.push({ date: `31.12.${y}`, text: texts[y].join(' '), bookings: years[y] });
    return { title: 'Vermögen bewerten', company, intro: `Bei ${company} ergeben sich folgende Sachverhalte. Verbuche die Käufe und die Bewertung zu jedem Abschlussstichtag. Muss nichts gebucht werden, tippe auf „Keine Buchung“.`, names: {}, steps, allowNone: true };
  });

  tpl('privat', 'Waren, Privat und Fremdwährung', 'Vorräte abwerten, Entnahme, Einlage, Kursverlust und Kursgewinn', 'fk', r => {
    const [company, owner] = r.pick([['Juwelier Trimmel e. U.', 'Klara Trimmel'], ['Sportgeschäft Leitner e. U.', 'Sabine Leitner'], ['Elektrohandel Fuchs e. U.', 'Martina Fuchs']]), { names, sup, me } = caseKit(r, company), steps = [];
    const g = goods(r, r.pick(['lower', 'lower', 'higher'])), down = g.wbp < g.ep;
    const w = withdrawal(r), ust = r2(w.tw * 0.2);
    const [what, acc, thing] = /Laptop/.test(w.what) ? ['einen privaten Büroschrank', '0600', 'Büroschrank'] : r.pick([['ihren privaten Laptop', '0620', 'Laptop'], ['einen privaten Büroschrank', '0600', 'Büroschrank']]), tw = round10(r.int(300, 1400));
    const dE = [r.int(2, 28), r.int(3, 10)], noE = `EB ${r.int(10, 40)}`, dW = [r.int(2, 20), 12], noW = `EB ${r.int(41, 99)}`;
    steps.push({ date: d(...dE), beleg: noE, text: `Die Inhaberin bringt ${what} in den Betrieb ein. Teilwert am Tag der Einlage: ${E(tw)}.`, lead: 'Eigenbeleg über eine Privateinlage.', doc: ownDoc(me, { no: noE, date: dE, title: 'Privateinlage', rows: [['Gegenstand', `${thing} (gebraucht)`], ['Verwendung', 'ab sofort im Betrieb'], ['Teilwert am Tag der Einlage', E(tw)]], sign: owner }), bookings: [bk([[acc, tw]], [['9600', tw]], { hint: ['Einlagen werden mit dem Teilwert angesetzt: Anlagenkonto an Privat, ohne Umsatzsteuer.'] })] });
    steps.push({ date: d(...dW), beleg: noW, text: `Die Inhaberin entnimmt ${w.what} aus dem Warenlager für private Zwecke. Einstandspreis ${E(w.ep)}, Wiederbeschaffungspreis am Tag der Entnahme ${E(w.tw)}, Verkaufspreis ohne USt ${E(w.vk)}.`, lead: 'Eigenbeleg über eine Warenentnahme für private Zwecke.', doc: ownDoc(me, { no: noW, date: dW, title: 'Privatentnahme von Waren', rows: [['Ware', w.what.replace(/^(einen|eine|ein) /, '')], ['Einstandspreis', E(w.ep)], ['Wiederbeschaffungspreis am Tag der Entnahme', E(w.tw)], ['Verkaufspreis ohne USt', E(w.vk)]], sign: owner }), bookings: [bk([['9600', w.tw + ust]], [['4900', w.tw], ['3500', ust]], { hint: ['Bewertung mit dem Teilwert, bei Waren der Wiederbeschaffungspreis.', 'Auf die Entnahme fallen 20 % Umsatzsteuer an.'], calc: [`Teilwert ${E(w.tw)} + USt ${E(ust)} = ${E(w.tw + ust)}`] })] });
    const f = M.kit.repeat(() => { const x = fx(r); return x.up ? x : null; }), S = sup('abroad'), k2 = r2(f.k1 + r.pick([0.02, 0.04, 0.06, 0.1])), e2 = r2(f.usd / k2), bil2 = Math.max(f.e0, e2), back = r2(f.e1 - bil2);
    steps.push({ date: '31.12.2025', text: `Bewertung zum Abschlussstichtag: ${g.n} ${g.name} (Einstandspreis ${E(g.ep)}) sind auf Lager, Wiederbeschaffungspreis ${E(g.wbp)}. Außerdem ist eine Lieferverbindlichkeit gegenüber ${S.name} (${S.no}) über USD ${int(f.usd)} offen, erfasst zum Kurs 1 € = ${kurs(f.k0)} USD (${E(f.e0)}). Kurs am 31.12.: 1 € = ${kurs(f.k1)} USD.`, bookings: [
      down ? bk([['7800', g.n * (g.ep - g.wbp)]], [['1600', g.n * (g.ep - g.wbp)]], { label: 'Warenvorrat', effect: '↓', hint: ['Umlaufvermögen: strenges Niederstwertprinzip.'], calc: [`${g.n} · (${E(g.ep)} − ${E(g.wbp)}) = ${E(g.n * (g.ep - g.wbp))}`] }) : none({ label: 'Warenvorrat', hint: ['Der Wiederbeschaffungspreis ist höher: Über die Anschaffungskosten wird nicht aufgewertet.'] }),
      bk([['7815', f.e1 - f.e0]], [[S.no, f.e1 - f.e0]], { label: 'Verbindlichkeit', effect: '↓', hint: ['Der Eurobetrag der Schuld ist gestiegen: strenges Höchstwertprinzip, aufwerten.'], calc: [`USD ${int(f.usd)} : ${kurs(f.k1)} = ${E(f.e1)}, bisher ${E(f.e0)}`] }),
    ] });
    steps.push({ date: '31.12.2026', text: `Die Verbindlichkeit ist noch offen. Kurs am 31.12.2026: 1 € = ${kurs(k2)} USD.`, bookings: [back > 0 ? bk([[S.no, back]], [['4840', back]], { label: 'Verbindlichkeit', effect: '↑', hint: ['Abwerten, aber nie unter den Entstehungswert.'], calc: [`USD ${int(f.usd)} : ${kurs(k2)} = ${E(e2)}, höchstens bis ${E(f.e0)} abwerten`] }) : none({ label: 'Verbindlichkeit' })] });
    return { title: 'Bewertung von Vorräten, Privatentnahmen und Verbindlichkeiten', company, intro: `${company} hat folgende Geschäftsfälle zu verbuchen. Muss nichts gebucht werden, tippe auf „Keine Buchung“.`, names, steps, allowNone: true };
  });

  // ---- Valuation table like Ü 1.4 / Ü 1.5: for every date the value in the balance sheet and the booking instruction ----
  tpl('tabelle', 'Bewertungstabelle wie Ü 1.4', 'Wertansatz und Buchungsanweisung zu jedem Stichtag: Grundstück, Beteiligung, Aktien, Waren, Entnahme', 'grundlagen', r => {
    const bau = r.chance(0.5);
    const [company, owner, she] = bau ? r.pick([['Bauunternehmen Petra Wallner e. U.', 'Petra Wallner', true], ['Baumeister Stefan Leitgeb e. U.', 'Stefan Leitgeb', false], ['Hochbau Miriam Koller e. U.', 'Miriam Koller', true]]) : r.pick([['Computer Projects Lena Schober KG', 'Lena Schober', true], ['IT-Handel Jonas Brandner e. U.', 'Jonas Brandner', false], ['Technikshop Sara Huber e. U.', 'Sara Huber', true]]);
    const er = she ? 'sie' : 'er', Er = she ? 'Sie' : 'Er';
    const steps = [];
    let g = 0;
    const per = (dd, mm, yy = 2025) => d(dd, mm, yy);
    const val = (value, traps = [], hint = []) => ({ value: r2(value), traps: traps.filter(t => Math.abs(t.value - value) >= 0.005).map(t => ({ ...t, value: r2(t.value) })), hint });
    const row = (o) => steps.push({ group: g, groupTitle: o.title || '', per: o.per, text: o.text, val: o.val, bookings: o.bookings || [] });
    const fmtM2 = n => `${int(n)} m²`;

    // 1. Unbebautes Grundstück: gemildertes Niederstwertprinzip
    {
      g++;
      const A = r.pick([2000, 5000, 8000, 10000, 12000]), p0 = r.int(60, 160), bd = [r.int(2, 28), r.int(3, 6)], yearPlan = r.int(2027, 2029), pattern = r.pick(['temp', 'perm', 'rise']);
      row({ title: 'Grundstück', per: per(...bd), text: `${owner} plant den Bau einer zusätzlichen Lagerhalle im Jahr ${yearPlan}. Am ${per(...bd)} kauft ${er} deshalb ein Grundstück mit ${fmtM2(A)} zu ${E(p0)} pro m².`, val: val(A * p0, [{ value: p0, msg: 'Der Wertansatz ist der Wert des ganzen Grundstücks: Fläche mal Preis pro m².' }], ['Wertansatz beim Kauf: die Anschaffungskosten.']) });
      const KAUSE = ['einer geplanten Abwasserkläranlage in direkter Nachbarschaft', 'einer fix geplanten Mülldeponie in der Nähe', 'des Baus einer Schnellstraße direkt am Grundstück'];
      const cause = r.pick(KAUSE);
      let cur = A * p0;
      const down = (price, y, text) => { const v = A * price; row({ per: per(31, 12, y), text, val: val(v, [{ value: cur, msg: 'Die Wertminderung ist dauerhaft: Es muss abgewertet werden (gemildertes Niederstwertprinzip).' }], ['Dauernde Wertminderung beim Anlagevermögen: abwerten.']), bookings: [bk([['7040', cur - v]], [['0200', cur - v]], { effect: '↓', hint: ['Außerplanmäßige Abschreibung: 7040 an 0200 Unbebaute Grundstücke.'], calc: [`${E(cur)} − ${E(v)} = ${E(cur - v)}`] })] }); cur = v; };
      const temp = (price, y, text) => { row({ per: per(31, 12, y), text, val: val(cur, [{ value: A * price, msg: 'Nur vorübergehende Wertminderung: Beim Anlagevermögen darf dann nicht abgewertet werden.' }], ['Vorübergehende Wertminderung beim Anlagevermögen (keine Finanzanlage): Wert bleibt gleich.']), bookings: [none({ hint: ['Nicht dauerhaft: keine Abwertung, also keine Buchung.'] })] }); };
      const up = (price, y, text) => { const v = A * Math.min(p0, price), traps = price > p0 ? [{ value: A * price, msg: 'Aufwerten höchstens bis zu den Anschaffungskosten.' }] : []; traps.push({ value: cur, msg: 'Die Gründe für die Abwertung sind weggefallen: Es muss aufgewertet werden.' }); row({ per: per(31, 12, y), text, val: val(v, traps, ['Zuschreibung, höchstens bis zu den Anschaffungskosten.']), bookings: [v > cur ? bk([['0200', v - cur]], [['4660', v - cur]], { effect: '↑', hint: ['Zuschreibung: 0200 an 4660 Erträge aus der Zuschreibung zum Anlagevermögen.'], calc: [`${E(v)} − ${E(cur)} = ${E(v - cur)}`] }) : none()] }); cur = v; };
      const capRise = (price, y, text) => row({ per: per(31, 12, y), text, val: val(cur, [{ value: A * price, msg: 'Über die Anschaffungskosten wird nicht aufgewertet.' }], ['Höchstens Anschaffungskosten.']), bookings: [none({ hint: ['Kein Wert über den Anschaffungskosten, also keine Buchung.'] })] });
      if (pattern === 'temp') {
        const p1 = p0 - r.int(4, 10), p2 = p0 - r.int(8, 25), p3 = p2 + r.int(4, 30);
        temp(p1, 2025, `Aufgrund von Spekulationen sinkt der Grundstückspreis am 31. Dezember 2025 vorübergehend auf ${E(p1)} pro m².`);
        down(p2, 2026, `Ende 2026 beträgt der Grundstückspreis infolge ${cause} ${E(p2)} pro m².`);
        up(p3, 2027, `2027 wird entschieden, das Vorhaben nicht umzusetzen. Der Grundstückspreis steigt infolgedessen Ende 2027 auf ${E(p3)} pro m².`);
      } else if (pattern === 'perm') {
        const p1 = p0 - r.int(25, 60), p2 = p1 + r.int(10, p0 - p1 - 2), p3 = p0 + r.int(2, 20);
        down(p1, 2025, `Der Grundstückspreis sinkt Ende 2025 auf ${E(p1)} pro m², weil die geplante Umwidmung in Bauland nicht erfolgt. Diese Umwidmung ist kurzfristig nicht absehbar.`);
        up(p2, 2026, `Im Herbst 2026 erfolgt nun doch die Umwidmung in Bauland, und es kommt zu einem Preisanstieg auf ${E(p2)} pro m².`);
        up(p3, 2027, `Da die Nachfrage nach Betriebsgrundstücken in der Region weiter ansteigt, liegt der Preis Ende 2027 bei ${E(p3)} pro m².`);
      } else {
        const p1 = p0 + r.int(4, 15), p2 = p0 - r.int(10, 25), p3 = p2 - r.int(2, 6);
        capRise(p1, 2025, `Wegen der großen Nachfrage steigt der Grundstückspreis Ende 2025 auf ${E(p1)} pro m².`);
        down(p2, 2026, `Ende 2026 beträgt der Grundstückspreis infolge ${cause} nur mehr ${E(p2)} pro m².`);
        temp(p3, 2027, `Aufgrund von Spekulationen sinkt der Preis am 31. Dezember 2027 vorübergehend auf ${E(p3)} pro m². Am Vorhaben aus 2026 ändert sich nichts.`);
      }
    }

    // 2. Finanzanlage (Beteiligung): only clear cases, so no Wahlrecht is needed
    {
      g++;
      const n = r.pick([500, 1000, 1500, 2000]), k0 = r.int(30, 80), bd = [r.int(2, 28), r.int(1, 4)], issuer = r.pick(['Bau AG', 'Holzwerk AG', 'Logistik AG', 'Computer AG']);
      row({ title: 'Finanzanlage', per: per(...bd), text: `Am ${per(...bd)} werden als Finanzanlage ${int(n)} Stück Aktien zum Kurs von ${E(k0)} von der ${issuer} erworben (Konto 0800 Beteiligungen).`, val: val(n * k0, [], ['Anschaffungskosten: Stückzahl mal Kurs.']) });
      let cur = n * k0;
      const k1 = k0 - r.int(6, 15);
      if (r.chance(0.6)) {
        row({ per: per(31, 12, 2025), text: `Am 31. Dezember 2025 beträgt infolge eines allgemeinen Kursverfalls der Kurs ${E(k1)}. Eine Erholung des Kurses ist nicht absehbar.`, val: val(n * k1, [{ value: cur, msg: 'Eine Erholung ist nicht absehbar: dauernde Wertminderung, es muss abgewertet werden.' }], ['Dauernde Wertminderung einer Finanzanlage: abwerten.']), bookings: [bk([['8200', cur - n * k1]], [['0800', cur - n * k1]], { effect: '↓', hint: ['8200 Abschreibungen auf Beteiligungen an 0800 Beteiligungen.'], calc: [`${int(n)} · (${E(k0)} − ${E(k1)}) = ${E(cur - n * k1)}`] })] });
        cur = n * k1;
        const k2 = k1 + r.int(4, 22), v = n * Math.min(k0, k2);
        row({ per: per(31, 12, 2026), text: `Nach einer doch eingetretenen Erholung beträgt der Kurs am 31. Dezember 2026 ${E(k2)}.`, val: val(v, [...(k2 > k0 ? [{ value: n * k2, msg: 'Aufwerten höchstens bis zu den Anschaffungskosten.' }] : []), { value: cur, msg: 'Der Grund für die Abwertung ist weggefallen: Es muss aufgewertet werden.' }], ['Zuschreibung, höchstens bis zu den Anschaffungskosten.']), bookings: [bk([['0800', v - cur]], [['8170', v - cur]], { effect: '↑', hint: ['0800 Beteiligungen an 8170 Erträge aus der Zuschreibung zu Finanzanlagen.'], calc: [`${E(v)} − ${E(cur)} = ${E(v - cur)}`] })] });
      } else {
        const kUp = k0 + r.int(3, 12);
        row({ per: per(31, 12, 2025), text: `Am 31. Dezember 2025 beträgt der Kurs ${E(kUp)}.`, val: val(cur, [{ value: n * kUp, msg: 'Über die Anschaffungskosten wird nicht aufgewertet.' }], ['Höchstens Anschaffungskosten.']), bookings: [none({ hint: ['Kurs über den Anschaffungskosten: keine Buchung.'] })] });
        row({ per: per(31, 12, 2026), text: `Am 31. Dezember 2026 beträgt der Kurs infolge ${r.pick(['einer Branchenkrise', 'eines allgemeinen Kursverfalls'])} ${E(k1)}. Eine Erholung des Kurses ist nicht absehbar.`, val: val(n * k1, [{ value: cur, msg: 'Eine Erholung ist nicht absehbar: Es muss abgewertet werden.' }], ['Dauernde Wertminderung einer Finanzanlage: abwerten.']), bookings: [bk([['8200', cur - n * k1]], [['0800', cur - n * k1]], { effect: '↓', calc: [`${int(n)} · (${E(k0)} − ${E(k1)}) = ${E(cur - n * k1)}`] })] });
        cur = n * k1;
        // Like Ü 1.5: the reason for the write-down falls away, so a write-up back to at most the cost is required.
        const k3 = k1 + r.int(2, k0 - k1 + 6), v3 = n * Math.min(k0, k3);
        row({ per: per(31, 12, 2027), text: `Am 31. Dezember 2027 beträgt der Kurs ${E(k3)}. Der Grund für die Abwertung im Jahr 2026 fällt weg.`, val: val(v3, [...(k3 > k0 ? [{ value: n * k3, msg: 'Aufwerten höchstens bis zu den Anschaffungskosten.' }] : []), { value: cur, msg: 'Der Grund für die Abwertung ist weggefallen: Es muss aufgewertet werden.' }], ['Zuschreibung, höchstens bis zu den Anschaffungskosten.']), bookings: [bk([['0800', v3 - cur]], [['8170', v3 - cur]], { effect: '↑', hint: ['0800 Beteiligungen an 8170 Erträge aus der Zuschreibung zu Finanzanlagen.'], calc: [`${int(n)} · ${E(Math.min(k0, k3))} = ${E(v3)}, bisher ${E(cur)}`, `Zuschreibung ${E(v3 - cur)}`] })] });
      }
    }

    // 3. Handelsware (strenges Niederstwertprinzip), three variants like in Ü 1.5
    const handelsware = () => {
      g++;
      const [thing, unit, range] = bau ? r.pick([['Paletten Fliesenkleber', 'Palette', [180, 320]], ['Dachfenster', 'Stück', [240, 480]]]) : r.pick([['Bluetooth-Kopfhörer', 'Stück', [20, 60]], ['Grafikkarten', 'Stück', [280, 640]], ['Monitore', 'Stück', [160, 340]]]);
      const ep = r.int(range[0], range[1]), q = r.int(8, 30), left = r.int(3, q - 2), bd = [r.int(2, 28), 11];
      row({ title: 'Handelsware', per: per(...bd), text: `Am ${per(...bd)} wurden ${q} ${thing} (Handelsware) um € ${eur(ep)} pro ${unit} angeschafft.`, val: val(q * ep, [{ value: ep, msg: 'Wertansatz für die ganze Lieferung: Menge mal Einstandspreis.' }], ['Anschaffungskosten der ganzen Lieferung.']) });
      const variants = r.shuffle([ep, ep - Math.max(1, Math.round(ep * r.pick([0.08, 0.12, 0.15]))), ep + Math.max(1, Math.round(ep * r.pick([0.06, 0.1, 0.12])))]);
      variants.forEach((w, i) => {
        const v = left * Math.min(ep, w), letter = 'abc'[i];
        row({ per: per(31, 12, 2025), text: `${i === 0 ? `Am 31. Dezember 2025 sind noch ${left} ${thing} auf Lager. Der Wiederbeschaffungspreis pro ${unit} beträgt zu diesem Zeitpunkt: ` : ''}Variante ${letter}) € ${eur(w)}`, val: val(v, [{ value: q * Math.min(ep, w), msg: `Bewertet wird nur der Lagerbestand am 31. Dezember: ${left} ${unit === 'Stück' ? 'Stück' : 'Paletten'}.` }, ...(w > ep ? [{ value: left * w, msg: 'Höchstens bis zu den Anschaffungskosten (Einstandspreis).' }] : []), ...(w < ep ? [{ value: left * ep, msg: 'Umlaufvermögen: strenges Niederstwertprinzip, der niedrigere Wiederbeschaffungspreis muss angesetzt werden.' }] : [])], ['Lagerbestand mal dem niedrigeren Wert aus Einstandspreis und Wiederbeschaffungspreis.']), bookings: [w < ep ? bk([['7800', left * (ep - w)]], [['1600', left * (ep - w)]], { effect: '↓', hint: ['7800 Abschreibungen von Vorräten an 1600 Handelswarenvorrat.'], calc: [`${left} · (${eur(ep)} − ${eur(w)}) = ${E(left * (ep - w))}`] }) : none({ hint: [w === ep ? 'Kein Unterschied zum Einstandspreis: keine Buchung.' : 'Nicht über den Einstandspreis aufwerten: keine Buchung.'] })] });
      });
    };
    // 4. Aktien des Umlaufvermögens (strenges Niederstwertprinzip, Zuschreibung bis zu den Anschaffungskosten)
    const aktien = () => {
      g++;
      const n = r.pick([200, 300, 500, 700, 1000]), k0 = r.int(14, 45), bd = [r.int(2, 28), r.int(5, 9)], ks = [];
      row({ title: 'Aktien des Umlaufvermögens', per: per(...bd), text: `${owner} kauft ${int(n)} Stück Aktien des Umlaufvermögens, Anschaffungskurs € ${eur(k0)} pro Aktie.`, val: val(n * k0, [], ['Anschaffungskosten: Stückzahl mal Kurs.']) });
      ks.push(k0 + r.int(1, 5)); ks.push(k0 - r.int(3, 9)); ks.push(ks[1] + r.int(1, k0 - ks[1] + 4));
      if (r.chance(0.4)) ks.reverse(), ks.splice(0, 3, k0 - r.int(2, 6), k0 + r.int(1, 6), k0 - r.int(4, 10));
      let cur = n * k0;
      ks.forEach((k, i) => {
        const v = n * Math.min(k0, k), y = 2025 + i;
        const traps = k > k0 ? [{ value: n * k, msg: 'Höchstens bis zu den Anschaffungskosten.' }] : [];
        if (v < cur) traps.push({ value: cur, msg: 'Umlaufvermögen: strenges Niederstwertprinzip, jede Wertminderung muss berücksichtigt werden.' });
        if (v > cur) traps.push({ value: cur, msg: 'Der Kurs ist gestiegen: Zuschreibung bis höchstens zu den Anschaffungskosten.' });
        row({ per: per(31, 12, y), text: `Kurs 31. Dezember ${y} € ${eur(k)} pro Aktie`, val: val(v, traps, ['Stückzahl mal dem niedrigeren Wert aus Anschaffungskurs und Kurs am Stichtag.']), bookings: [v < cur ? bk([['8271', cur - v]], [['2620', cur - v]], { effect: '↓', hint: ['8271 Abschreibungen auf Wertpapiere des Umlaufvermögens an 2620 Aktien des Umlaufvermögens.'], calc: [`${E(cur)} − ${E(v)} = ${E(cur - v)}`] }) : v > cur ? bk([['2620', v - cur]], [['8180', v - cur]], { effect: '↑', hint: ['2620 an 8180 Erträge aus der Zuschreibung zu Wertpapieren des Umlaufvermögens.'], calc: [`${E(v)} − ${E(cur)} = ${E(v - cur)}`] }) : none({ hint: ['Der Wertansatz ändert sich nicht: keine Buchung.'] })] });
        cur = v;
      });
    };
    if (bau) aktien(); else { handelsware(); aktien(); }

    // 5. Privatentnahme: Teilwert = Wiederbeschaffungspreis
    {
      g++;
      const [what, short, range] = bau ? ['von Baustoffen (Ziegel, Zement)', 'Baustoffe', [180, 480]] : r.pick([['eines Laptops', 'Laptop', [900, 1400]], ['eines Tablets', 'Tablet', [400, 800]]]);
      const ep = round10(r.int(range[0], range[1])), wbp = ep + r.pick([-1, 1, 1]) * round10(ep * r.pick([0.08, 0.12, 0.2])), vk = round10(Math.max(ep, wbp) * 1.25), dd = [r.int(2, 22), r.pick([8, 11, 12])];
      row({ title: 'Privatentnahme', per: per(...dd), text: `Private Entnahme ${what} am ${per(...dd)}; Einstandspreis ${short === 'Baustoffe' ? 'der Baustoffe' : `des ${short}s`} € ${eur(ep)}, Wiederbeschaffungspreis am ${per(...dd)} € ${eur(wbp)}, Verkaufspreis exklusive USt € ${eur(vk)}.`, val: val(wbp, [{ value: ep, msg: 'Nicht der Einstandspreis: Entnahmen werden mit dem Teilwert zum Zeitpunkt der Entnahme bewertet.' }, { value: vk, msg: 'Nicht der Verkaufspreis: Der Teilwert ist hier der Wiederbeschaffungspreis.' }, { value: grossOf(wbp), msg: 'Der Wertansatz ist ohne Umsatzsteuer.' }], ['Teilwert zum Zeitpunkt der Entnahme, bei Waren der Wiederbeschaffungspreis.']), bookings: [bk([['9600', grossOf(wbp)]], [['4900', wbp], ['3500', vatOf(wbp)]], { hint: ['9600 Privat an 4900 Eigenverbrauch 20 % und 3500 Umsatzsteuer.'], calc: [`${E(wbp)} + 20 % USt ${E(vatOf(wbp))} = ${E(grossOf(wbp))}`] })] });
    }
    return {
      title: 'Vermögen und Verbindlichkeiten bewerten', company, layout: 'table', allowNone: true, names: {},
      intro: `Bei ${company} ergeben sich u. a. folgende Sachverhalte.`,
      tasks: ['Ermittle die Wertansätze und stelle die erforderlichen Buchungsanweisungen auf. Ist keine Buchung nötig, tippe auf „Keine Buchung“.'],
      steps,
    };
  });

  // About half of the documents come as a real voucher (invoice, receipt, bank statement); the rest as text like in the book.
  function makeCase(id, seed, o = {}) {
    const t = TEMPLATES.find(x => x.id === id) || TEMPLATES[0], r = makeRng(seed), c = t.make(r), rd = makeRng((seed ^ 0x5bd1e995) >>> 0);
    c.steps.forEach(s => (s.bookings || []).forEach(b => { b.soll = b.soll.filter(l => l.amt > 0); b.haben = b.haben.filter(l => l.amt > 0); }));
    if (c.tasks) c.steps.forEach(s => { if (!s.part && (s.bookings || []).length && c.layout !== 'table') s.part = s.date?.startsWith('31.12') ? 'c' : 'a'; });
    const withDoc = c.steps.filter(s => s.doc), share = o.docs ?? 0.55;
    withDoc.forEach(s => { s.asDoc = rd.next() < share; });
    if (share > 0 && withDoc.length && !withDoc.some(s => s.asDoc)) rd.pick(withDoc).asDoc = true;
    return { id: t.id, seed, tplTitle: t.title, sub: t.sub, allowNone: !!c.allowNone, ...c };
  }
  const caseBookings = c => c.steps.flatMap(s => s.bookings || []);
  const caseEntries = c => c.steps.flatMap((s, si) => [...(s.val ? [{ kind: 'val', si, spec: s.val }] : []), ...(s.afa ? [{ kind: 'afa', si, spec: s.afa }] : []), ...(s.bookings || []).map((b, bi) => ({ kind: 'book', si, bi, b }))]);
  function validateTrainer(raw) {
    const out = {};
    for (const t of TEMPLATES) { const x = raw?.[t.id]; if (x && typeof x === 'object') out[t.id] = { runs: Math.max(0, Math.trunc(Number(x.runs)) || 0), perfect: Math.max(0, Math.trunc(Number(x.perfect)) || 0), bookings: Math.max(0, Math.trunc(Number(x.bookings)) || 0), best: Math.min(100, Math.max(0, Math.round(Number(x.best)) || 0)), at: Number(x.at) || 0 }; }
    return out;
  }
  const trainer = { TEMPLATES: TEMPLATES.map(({ id, title, sub, fig }) => ({ id, title, sub, fig })), makeCase, caseBookings, caseEntries, gradeBooking, gradeAfa, gradeVal, resolveAcc, searchKonten, kontoLabel, kontoName, parseAmount, validate: validateTrainer, eur };

  return { ...E_, buildTest, ACC, eur, afaPlan, booking, r2, trainer, KONTO };
});
