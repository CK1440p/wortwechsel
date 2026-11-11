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
    '9600': 'Privat', KV: 'Kursverluste (Aufwand)', KG: 'Kursgewinne (Ertrag)',
  };
  const SUPPLIERS = ['Maschinenbau Steiner GmbH', 'Technik Huber KG', 'Bürowelt Lechner GmbH', 'Montagebau Kern OG', 'Elektro Pichler GmbH', 'Anlagenbau Gruber AG', 'Ladenbau Wimmer GmbH', 'Autohaus Mayrhofer GmbH', 'Nutzfahrzeuge Brandl GmbH', 'IT-Service Moser e. U.'];
  function supplier(r, names, pick) {
    const name = pick || r.pick(SUPPLIERS);
    let no; do no = String(r.int(33010, 33899)); while (names[no]);
    names[no] = name;
    return { no, name };
  }
  const label = (no, names = {}) => `${/^\d/.test(no) ? `${no} ` : ''}${names[no] || ACC[no]}`;
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
      const ans = booking(r, [[s.no, back]], [['KG', back]], { names, pool: ['KV', '2800', '4660'], effect: '↑' });
      return { kicker: 'Buchung', lead: `${fxLead(f)} Die Verbindlichkeit wurde daher mit ${E(f.e1)} bilanziert. Sie ist am 31.12. des Folgejahres noch offen, Kurs dann: 1 € = ${kurs(k2)} USD. Lieferantenkonto ${s.no} (${s.name}).`, ask: 'Buche die Bewertung zum 31.12. des Folgejahres.', answer: ans, hints: [`Wert neu: ${E(e2)}. Unter den Entstehungswert von ${E(f.e0)} darf aber nicht abgewertet werden.`, 'Verbindlichkeit an Ertragskonto.'], solution: [`Neuer Bilanzansatz: ${E(bil2)}`, `Abwertung: ${E(f.e1)} − ${E(bil2)} = ${E(back)}`, step(ans)] };
    }
    const ans = booking(r, [['KV', d]], [[s.no, d]], { names, pool: ['KG', '2500', '1600'], effect: '↓' });
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
    const gross = round100(r.int(25000, 48000)), ans = booking(r, [['0630', gross]], [[s.no, gross]], { names, pool: ['2500', '0640', '3500'] });
    return { kicker: 'Buchung', lead: `Kauf eines Firmen-Pkw mit Verbrennermotor bei ${s.name} (${s.no}) um ${E(gross)} inklusive USt und NoVA.`, ask: 'Verbuche den Kauf.', answer: ans, hints: ['Beim Pkw gibt es keinen Vorsteuerabzug. Der Anschaffungswert ist der Bruttobetrag samt NoVA.'], solution: [step(ans), 'Kein Vorsteuerabzug: Die USt gehört zum Anschaffungswert.'], takeaway: 'Pkw (Verbrenner): Kaufpreis + NoVA + USt, kein Vorsteuerabzug.' };
  });
  const GWG_ITEMS = [['einen Ventilator für die Verwaltung', '0600', [300, 900]], ['ein Tablet', '0620', [700, 1400]], ['einen Bürostuhl', '0600', [400, 1300]], ['einen Drucker', '0620', [250, 1300]], ['eine Kaffeemaschine für den Pausenraum', '0600', [500, 1250]], ['einen Monitor', '0620', [300, 1250]]];
  gen('ak-gwg', 'akauf', 'GWG oder Anlage?', 1, 3, 2, (r, st) => {
    const [what, acc, range] = r.pick(GWG_ITEMS), gross = M.kit.repeat(() => { const g = r.int(range[0], range[1]) - 0.01 * r.pick([0, 0, 1]); const n = g / 1.2; return Math.abs(n - 1000) > 15 ? { g } : null; }).g, net = r2(gross / 1.2), v = r2(gross - net), gwg = net <= 1000, pay = r.pick(['2800', '2700']);
    const ans = booking(r, [[gwg ? '7060' : acc, net], ['2500', v]], [[pay, gross]], { pool: [gwg ? acc : '7060', '7010', '3500', pay === '2800' ? '2700' : '2800'], effect: st >= 2 ? (gwg ? '↓' : 'Ø') : undefined });
    return {
      kicker: 'GWG', lead: `Ein Betrieb kauft ${what} um ${E(gross)} inklusive 20 % USt und bezahlt ${pay === '2800' ? 'mit der Firmendebitkarte (Bank)' : 'bar'}. Die Nutzungsdauer beträgt mehrere Jahre. Geringwertige Wirtschaftsgüter werden sofort abgeschrieben.`,
      ask: `Verbuche den Kauf${st >= 2 ? ' und gib die Auswirkung auf das Eigenkapital an' : ''}.`, answer: ans,
      hints: ['GWG-Grenze: Anschaffungswert bis € 1.000,– **ohne USt**.', `Netto: ${E(gross)} : 1,2 = ${E(net)}.`],
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

  return { ...E_, buildTest, ACC, eur, afaPlan, booking, r2 };
});
