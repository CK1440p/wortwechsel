// BWP: Versicherungen (Risikoabsicherung) und Investitionsrechnung (statische Verfahren). Generators only, no DOM.
// Rules follow the school book and the class formula sheet: kalk. Zinsen = (AK + RW) : 2 · i, kalk. AfA = (AK − RW) : ND,
// Rentabilität = (Gewinn + kalk. Zinsen) · 100 : Ø Kapitaleinsatz, Amortisation = (AK − RW) : (Gewinn + AfA).
(function (root, factory) {
  const M = root.WWMath || (typeof require === 'function' ? require('./mathcore.js') : null);
  const api = factory(M);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WWBwp = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (M) {
  'use strict';
  const { field, select, fields, mc, makeRng } = M.kit;
  const r2 = x => Math.round((x + Math.sign(x) * 1e-9) * 100) / 100;
  function eur(x) {
    const v = r2(x), neg = v < 0;
    let [a, b] = Math.abs(v).toFixed(2).split('.');
    a = a.replace(/\B(?=(\d{3})+$)/g, '.');
    return `${neg ? '−' : ''}${a},${b}`;
  }
  const E = x => `€ ${eur(x)}`;
  const dec = (x, d = 2) => { const v = Math.round((x + Math.sign(x) * 1e-9) * 10 ** d) / 10 ** d; let [a, b] = Math.abs(v).toFixed(d).split('.'); a = a.replace(/\B(?=(\d{3})+$)/g, '.'); return `${v < 0 ? '−' : ''}${a}${b ? `,${b}` : ''}`; };
  const int = n => dec(n, 0);
  const pc = x => `${dec(x, Number.isInteger(r2(x)) ? 0 : 2)} %`;
  const clean = traps => traps.filter(t => Number.isFinite(t.value));
  const money = (key, label, value, traps = [], o = {}) => field(key, label, r2(value), { d: 2, tol: 0.011, unit: '€', traps: clean(traps).map(t => ({ ...t, value: r2(t.value) })), ...o });
  const num = (key, label, value, o = {}) => field(key, label, value, { d: 2, ...o, traps: clean(o.traps || []) });
  const sel = (r, key, label, right, wrong) => select(r, key, label, right, wrong);
  // Several right answers: the multi type grades hits minus wrong picks.
  function multi(r, rights, wrongs) { const options = r.shuffle([...rights.map(text => ({ text, ok: true })), ...wrongs.map(text => ({ text, ok: false }))]); return { type: 'multi', options, correct: options.map((o, i) => o.ok ? i : -1).filter(i => i >= 0) }; }
  const tf = items => ({ type: 'tf', items: items.map(([text, truth, why]) => ({ text, truth, why })) });
  const round = (x, step) => Math.round(x / step) * step;
  const GENS = [];
  const gen = (id, topic, label, min, max, rank, make) => GENS.push({ id, topic, label, min, max, rank, make });
  // Same options in every select of one task, so an ordering task reads like one list.
  const selSame = (key, label, options, right) => ({ type: 'sel', key, label, options, correct: options.indexOf(right) });

  // ================= Versicherungsprinzip =================
  const TERMS = [
    ['Prämie', 'Betrag, den der Versicherungsnehmer zahlt, damit der Versicherungsschutz besteht'],
    ['Versicherungssumme', 'Betrag, den das Versicherungsunternehmen im gedeckten Schadensfall höchstens bezahlt'],
    ['Versicherungswert', 'Tatsächlicher Wert der versicherten Sache, z. B. laut Gutachten'],
    ['Polizze', 'Urkunde über den Versicherungsvertrag mit Laufzeit, versicherten Risiken und Prämie'],
    ['Bündelversicherung', 'Ein Versicherungsschein, der mehrere selbstständige Versicherungsverträge zusammenfasst'],
    ['Versicherungsnehmer', 'Person, die mit dem Versicherer den Vertrag abschließt und die Prämie zahlt'],
    ['Begünstigter', 'Person, die im Versicherungsfall die Leistung bekommt, auch wenn sie den Vertrag nicht abgeschlossen hat'],
    ['Versicherungspool', 'Gemeinsamer Topf, in den alle Prämien fließen und aus dem die Schäden bezahlt werden'],
    ['Risikogemeinschaft', 'Viele Menschen mit gleichartigem Risiko, die gemeinsam für den Schaden einzelner aufkommen'],
    ['Gesetzliche Sozialversicherung', 'Pflichtversicherung, die eine Grundabsicherung bei Krankheit, Unfall, Alter und Arbeitslosigkeit bietet'],
    ['Obliegenheiten', 'Pflichten des Versicherungsnehmers aus dem Vertrag, z. B. den Schaden mindern und sofort melden'],
    ['Kulanz', 'Freiwillige Leistung der Versicherung in einem Fall, der eigentlich nicht gedeckt ist'],
  ];
  gen('p-begriff', 'prinzip', 'Begriffe rund um die Versicherung', 1, 3, 1, (r, st) => {
    const [term, def] = r.pick(TERMS), wrong = r.sample(TERMS.filter(t => t[0] !== term), 3);
    if (st === 1) return { kicker: 'Begriff', lead: `„${def}.“`, ask: 'Welcher Begriff ist hier beschrieben?', answer: mc(r, term, wrong.map(t => t[0])), hints: ['Lies genau: Geht es um Geld, eine Person, ein Dokument oder einen Wert?'], solution: [`**${term}**: ${def}.`] };
    return { kicker: 'Begriff', ask: `Was versteht man unter **${term}**?`, answer: mc(r, def, wrong.map(t => t[1])), hints: ['Prämie zahlt der Kunde, die Versicherungssumme zahlt die Versicherung.'], solution: [`**${term}**: ${def}.`] };
  });
  const NEEDS = [
    ['Gefahrengemeinschaft', 'Es müssen möglichst viele Menschen von einem gleichartigen Risiko bedroht sein.', 'Eine Versicherung gegen Hagelschäden an Weingärten findet nur dann genug Kunden, wenn viele Winzer dasselbe Risiko haben.'],
    ['Ungewissheit', 'Man darf nicht wissen, ob und wann der Schaden eintritt.', 'Ein Haus, das bereits brennt, kann nicht mehr gegen Feuer versichert werden.'],
    ['Berechenbarkeit', 'Die Wahrscheinlichkeit eines Schadens wird mit statistischen Methoden geschätzt.', 'Aus den Unfällen der letzten Jahre errechnet die Versicherung, wie oft junge Lenker einen Schaden verursachen.'],
    ['Messbarkeit', 'Der finanzielle Schaden muss sich in Geld ausdrücken lassen.', 'Der Ärger über einen verpatzten Urlaubstag lässt sich nicht in Euro angeben, die Reparatur eines Koffers schon.'],
  ];
  gen('p-voraus', 'prinzip', 'Voraussetzungen für eine Versicherung', 1, 3, 2, (r, st) => {
    const [name, rule, ex] = r.pick(NEEDS), wrong = NEEDS.filter(n => n[0] !== name).map(n => n[0]);
    return { kicker: 'Versicherungsprinzip', lead: st === 1 ? `„${rule}“` : ex, ask: st === 1 ? 'Welche Voraussetzung für die Übernahme eines Risikos ist gemeint?' : 'Welche Voraussetzung für eine Versicherung zeigt dieses Beispiel?', answer: mc(r, name, wrong), hints: ['Die vier Voraussetzungen: Gefahrengemeinschaft, Ungewissheit, Berechenbarkeit, Messbarkeit.'], solution: [`**${name}**: ${rule}`] };
  });
  gen('p-prinzip', 'prinzip', 'Das Prinzip im Lückentext', 1, 3, 3, (r) => {
    const words = ['Schadensfalles', 'Risikogemeinschaft', 'Versicherungsvertrages', 'Prämie', 'Versicherungspool', 'Versicherten'];
    const blank = right => ({ options: r.shuffle(words), correct: 0, right });
    const parts = ['Eine Versicherung schützt vor den finanziellen Folgen eines', blank('Schadensfalles'), '. Dahinter steht die', blank('Risikogemeinschaft'), ': Alle haften für einen. Wer den Abschluss eines', blank('Versicherungsvertrages'), 'unterschreibt und die vorgeschriebene', blank('Prämie'), 'zahlt, hat Anspruch auf Entschädigung. Das Geld kommt aus dem', blank('Versicherungspool'), ', in den alle', blank('Versicherten'), 'einzahlen.'];
    for (const p of parts) if (typeof p !== 'string') { p.correct = p.options.indexOf(p.right); delete p.right; }
    return { kicker: 'Versicherungsprinzip', ask: 'Setze die passenden Begriffe ein.', answer: { type: 'cloze', parts }, hints: ['Viele zahlen ein, wenige bekommen etwas heraus.'], solution: ['Schadensfall → Risikogemeinschaft → Vertrag → Prämie → Versicherungspool → Versicherte.'] };
  });
  const COMPARE = [
    ['Der Schutz entsteht durch ein Gesetz, man kann sich nicht aussuchen, ob man dabei ist.', 'Gesetzliche Sozialversicherung'],
    ['Der Schutz entsteht durch einen Vertrag, den man freiwillig abschließt.', 'Private Versicherung'],
    ['Der Beitrag hängt vom Einkommen ab.', 'Gesetzliche Sozialversicherung'],
    ['Die Prämie hängt vom Risiko und den vereinbarten Leistungen ab.', 'Private Versicherung'],
    ['Das Unternehmen arbeitet nicht gewinnorientiert.', 'Gesetzliche Sozialversicherung'],
    ['Das Unternehmen will Gewinn erzielen.', 'Private Versicherung'],
    ['Die Leistungen sind gesetzlich vorgegeben und bieten eine Grundabsicherung.', 'Gesetzliche Sozialversicherung'],
    ['Die Leistungen werden individuell vereinbart.', 'Private Versicherung'],
    ['Versichern kann sich jede natürliche oder juristische Person, z. B. auch eine GmbH.', 'Private Versicherung'],
    ['Versichert sind unselbstständig und selbstständig Erwerbstätige.', 'Gesetzliche Sozialversicherung'],
  ];
  gen('p-vergleich', 'prinzip', 'Gesetzlich oder privat?', 1, 3, 4, (r, st) => {
    const list = r.sample(COMPARE, st === 1 ? 2 : st === 2 ? 3 : 4), opts = ['Gesetzliche Sozialversicherung', 'Private Versicherung'];
    return { kicker: 'Vergleich', ask: 'Gilt das für die gesetzliche Sozialversicherung oder für private Versicherungsunternehmen?', answer: fields(list.map(([text, right], i) => selSame(`s${i}`, text, opts, right))), hints: ['Gesetzlich: Pflicht, einkommensabhängig, nicht gewinnorientiert. Privat: Vertrag, risikoabhängig, gewinnorientiert.'], solution: list.map(([text, right]) => `${text} → **${right}**`) };
  });
  const PRINCIPLE_TF = [
    ['Mit den Prämien vieler werden die Schäden weniger bezahlt.', true, 'Das ist das Versicherungsprinzip.'],
    ['Versicherungen sind in Österreich ein wichtiger Arbeitgeber und legen viel Geld an, z. B. in Staatsanleihen.', true, 'Sie sind Arbeitgeber und Kapitalanleger.'],
    ['Wegen der Zunahme extremer Wetterereignisse überlegen Versicherungen, welche Risiken sie künftig noch versichern.', true, 'Der Klimawandel verändert die Risikomodelle.'],
    ['Versicherungen setzen KI z. B. für Chatbots, Schadensbearbeitung und Betrugserkennung ein.', true, 'Digitalisierung spart Kosten.'],
    ['Private Versicherungsunternehmen werden in Österreich von der Finanzmarktaufsicht (FMA) kontrolliert.', true, 'Die Versicherungsaufsicht gehört zur FMA.'],
    ['Eine Versicherung zahlt jeden Schaden, auch wenn er im Vertrag nicht vorkommt.', false, 'Gedeckt ist nur, was im Vertrag vereinbart ist.'],
    ['Die Sozialversicherung ist eine freiwillige Versicherung.', false, 'Sie ist eine Pflichtversicherung.'],
    ['Wer eine Versicherung abschließt, bekommt seine Prämien am Ende immer zurück.', false, 'Die Prämie ist der Preis für den Schutz, sie fließt in den Pool.'],
    ['Ein Risiko, das mit Sicherheit eintritt, ist besonders gut versicherbar.', false, 'Es fehlt die Ungewissheit.'],
    ['Strengere Regeln (z. B. ESG-Vorgaben) verursachen für Versicherungen meist höhere Kosten.', true, 'Regulatorische Vorgaben kosten Geld.'],
  ];
  gen('p-tf', 'prinzip', 'Richtig oder falsch?', 2, 3, 5, (r, st) => {
    const items = r.sample(PRINCIPLE_TF, st === 2 ? 3 : 4);
    return { kicker: 'Wissen', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Denk an Risikogemeinschaft, Pflicht und Freiwilligkeit.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Risikopolitische Maßnahmen =================
  const RISK = ['Risiko vermeiden', 'Risiko vermindern', 'Risiko überwälzen', 'Risiko selbst tragen'];
  const RISK_CASES = [
    ['Ein Weinhändler liefert nicht mehr in ein Land mit Bürgerkrieg, obwohl die Nachfrage groß ist.', 'Risiko vermeiden', 'Auf das riskante Geschäft wird ganz verzichtet.'],
    ['Eine Tischlerei lehnt einen Großauftrag eines unbekannten Kunden ab, der keine Anzahlung leisten will.', 'Risiko vermeiden', 'Das Geschäft und damit das Risiko wird gar nicht eingegangen.'],
    ['Ein Start-up verzichtet darauf, mit geliehenem Geld an der Börse zu spekulieren.', 'Risiko vermeiden', 'Die riskante Tätigkeit findet gar nicht statt.'],
    ['Ein Hotel baut eine Sprinkleranlage und Rauchmelder in allen Zimmern ein.', 'Risiko vermindern', 'Ein Brand kann noch passieren, der Schaden wird aber kleiner.'],
    ['Ein Juwelier lässt eine Alarmanlage und ein Sicherheitsglas einbauen.', 'Risiko vermindern', 'Die Wahrscheinlichkeit eines Einbruchs sinkt.'],
    ['Ein Produktionsbetrieb lässt seine Maschinen regelmäßig warten und schult die Mitarbeiter in Arbeitssicherheit.', 'Risiko vermindern', 'Ausfälle und Unfälle werden seltener.'],
    ['Ein Onlineshop sichert seine Daten jeden Tag zusätzlich in einer Cloud.', 'Risiko vermindern', 'Ein Datenverlust richtet weniger Schaden an.'],
    ['Ein Großhändler prüft vor jeder Lieferung auf Rechnung die Zahlungsfähigkeit (Bonität) des Kunden.', 'Risiko vermindern', 'Zahlungsausfälle werden seltener.'],
    ['Eine Bäckerei bezieht ihr Mehl von drei verschiedenen Mühlen statt von einer.', 'Risiko vermindern', 'Fällt ein Lieferant aus, gibt es trotzdem Mehl (Risikostreuung).'],
    ['Ein Betrieb schließt eine Feuerversicherung für seine Lagerhalle ab.', 'Risiko überwälzen', 'Den finanziellen Schaden trägt im Brandfall die Versicherung.'],
    ['Ein Exporteur schließt eine Kreditversicherung gegen den Zahlungsausfall seiner Kunden ab.', 'Risiko überwälzen', 'Das Ausfallsrisiko trägt die Versicherung.'],
    ['Ein Unternehmen least seine Computer, statt sie zu kaufen. Veralten sie, tauscht der Leasinggeber sie aus.', 'Risiko überwälzen', 'Das Risiko der Veralterung liegt beim Vertragspartner.'],
    ['Ein Händler verkauft „ab Werk“: Ab der Übergabe trägt der Käufer das Risiko für den Transport.', 'Risiko überwälzen', 'Das Transportrisiko wird vertraglich auf den Käufer übertragen.'],
    ['Eine Spedition versichert ihre Ladungen mit einer Transportversicherung.', 'Risiko überwälzen', 'Den Schaden bei Verlust trägt die Versicherung.'],
    ['Ein Betrieb versichert seine Kugelschreiber und Büroklammern bewusst nicht.', 'Risiko selbst tragen', 'Der mögliche Schaden ist so klein, dass sich eine Prämie nicht lohnt.'],
    ['Ein Unternehmen vereinbart in der Kaskoversicherung einen Selbstbehalt von € 1.000,–, um Prämie zu sparen.', 'Risiko selbst tragen', 'Kleine Schäden bis zum Selbstbehalt trägt der Betrieb selbst.'],
    ['Ein Modegeschäft weiß, dass die neue Kollektion vielleicht nicht gefällt. Dieses Absatzrisiko lässt sich nicht versichern.', 'Risiko selbst tragen', 'Das allgemeine Unternehmerrisiko muss der Betrieb selbst tragen.'],
    ['Ein Betrieb bildet aus seinen Gewinnen Rücklagen, um mögliche Verluste später selbst abdecken zu können.', 'Risiko selbst tragen', 'Das Risiko bleibt im Betrieb, es wird nur finanziell vorgesorgt.'],
  ];
  gen('r-massnahme', 'risiko', 'Welche Maßnahme ist das?', 1, 3, 1, (r, st) => {
    if (st < 3) { const [text, right, why] = r.pick(RISK_CASES); return { kicker: 'Risikopolitik', lead: text, ask: 'Welche risikopolitische Maßnahme setzt der Betrieb hier?', answer: mc(r, right, RISK.filter(x => x !== right)), hints: ['Vermeiden: gar nicht erst machen. Vermindern: Schaden oder Wahrscheinlichkeit senken. Überwälzen: jemand anderer trägt den Schaden. Selbst tragen: der Betrieb zahlt selbst.'], solution: [`**${right}**. ${why}`] }; }
    const list = []; for (const k of r.shuffle(RISK)) list.push(r.pick(RISK_CASES.filter(c => c[1] === k)));
    const pick = r.sample(list, 3);
    return { kicker: 'Risikopolitik', ask: 'Ordne jedem Fall die risikopolitische Maßnahme zu.', answer: fields(pick.map(([text, right], i) => selSame(`m${i}`, text, RISK, right))), hints: ['Frag dich: Findet das Geschäft statt? Wird etwas getan, damit weniger passiert? Wer zahlt am Ende den Schaden?'], solution: pick.map(([text, right, why]) => `${text} → **${right}**. ${why}`) };
  });
  const RISK_MC = [
    ['Was versteht man unter einem Risiko?', 'Die Gefahr, dass ein Ereignis eintritt, das zu einem Schaden oder Verlust führt', ['Einen sicheren Verlust', 'Die Prämie einer Versicherung', 'Den Gewinn eines Unternehmens']],
    ['Welche Maßnahme ist eine Risikoüberwälzung?', 'Der Abschluss einer Versicherung', ['Der Einbau einer Alarmanlage', 'Der Verzicht auf ein Geschäft', 'Die Bildung von Rücklagen']],
    ['Welches Risiko muss ein Unternehmen immer selbst tragen?', 'Das allgemeine Unternehmerrisiko, z. B. dass die Produkte nicht gekauft werden', ['Das Brandrisiko', 'Das Risiko eines Einbruchs', 'Das Transportrisiko']],
    ['Warum vermeidet ein Unternehmen nicht einfach jedes Risiko?', 'Ohne Risiko gibt es keine Chance auf Gewinn, man müsste auf viele Geschäfte verzichten', ['Weil das gesetzlich verboten ist', 'Weil Versicherungen das verlangen', 'Weil Risiken immer versicherbar sind']],
    ['Wie kann man ein Risiko außer durch eine Versicherung noch überwälzen?', 'Vertraglich auf einen Vertragspartner, z. B. durch Leasing oder Lieferbedingungen', ['Durch eine Alarmanlage', 'Durch Rücklagen', 'Durch einen Selbstbehalt']],
    ['Was ist Risikostreuung?', 'Das Risiko wird auf mehrere Lieferanten, Kunden oder Märkte verteilt, damit ein Ausfall weniger schadet', ['Das Risiko wird auf eine Versicherung übertragen', 'Auf das Geschäft wird verzichtet', 'Der Schaden wird mit Rücklagen bezahlt']],
    ['Wann ist es sinnvoll, ein Risiko selbst zu tragen?', 'Wenn der mögliche Schaden klein ist und die Prämie im Verhältnis zu teuer wäre', ['Wenn der Schaden existenzbedrohend sein kann', 'Bei jedem Brandrisiko', 'Wenn eine Versicherung gesetzlich vorgeschrieben ist']],
    ['Was bedeutet Risiko vermindern?', 'Die Wahrscheinlichkeit oder die Höhe eines Schadens wird durch Maßnahmen gesenkt', ['Das Geschäft wird nicht gemacht', 'Ein anderer trägt den Schaden', 'Man zahlt den Schaden selbst']],
  ];
  gen('r-wissen', 'risiko', 'Grundbegriffe', 1, 3, 2, (r) => {
    const [q, right, wrong] = r.pick(RISK_MC);
    return { kicker: 'Risikopolitik', ask: q, answer: mc(r, right, wrong), hints: ['Vier Maßnahmen: vermeiden, vermindern, überwälzen, selbst tragen.'], solution: [`**${right}**.`] };
  });
  const MATRIX = [
    ['Der Schaden wäre sehr hoch und tritt auch häufig ein.', 'Risiko vermeiden', 'Ein so gefährliches Geschäft lässt man besser bleiben.'],
    ['Der Schaden wäre sehr hoch, tritt aber nur selten ein (z. B. ein Großbrand).', 'Risiko überwälzen', 'Genau dafür gibt es Versicherungen: seltene, aber existenzbedrohende Schäden.'],
    ['Der Schaden ist klein, tritt aber häufig ein (z. B. kleine Fehler in der Produktion).', 'Risiko vermindern', 'Mit Kontrollen, Wartung und Schulungen wird er seltener.'],
    ['Der Schaden ist klein und tritt selten ein.', 'Risiko selbst tragen', 'Eine Versicherung würde mehr kosten, als sie bringt.'],
  ];
  gen('r-matrix', 'risiko', 'Welche Maßnahme passt?', 2, 3, 3, (r, st) => {
    if (st === 2) { const [text, right, why] = r.pick(MATRIX); return { kicker: 'Risikopolitik', lead: text, ask: 'Welche risikopolitische Maßnahme ist hier am sinnvollsten?', answer: mc(r, right, RISK.filter(x => x !== right)), hints: ['Denk an zwei Fragen: Wie hoch wäre der Schaden? Wie oft passiert er?'], solution: [`**${right}**. ${why}`] }; }
    const list = r.shuffle(MATRIX);
    return { kicker: 'Risikopolitik', ask: 'Welche Maßnahme ist jeweils am sinnvollsten?', answer: fields(list.map(([text, right], i) => selSame(`x${i}`, text, RISK, right))), hints: ['Hoch und häufig: vermeiden. Hoch und selten: überwälzen. Klein und häufig: vermindern. Klein und selten: selbst tragen.'], solution: list.map(([text, right, why]) => `${text} → **${right}**. ${why}`) };
  });
  const RISK_TF = [
    ['Mit einer Versicherung wird das Risiko vermieden.', false, 'Der Schaden kann trotzdem eintreten. Die Versicherung trägt nur die finanziellen Folgen: Das Risiko wird überwälzt.'],
    ['Eine Alarmanlage ist eine Maßnahme zur Risikoverminderung.', true, 'Sie senkt die Wahrscheinlichkeit eines Einbruchs.'],
    ['Ein Selbstbehalt bedeutet, dass ein Teil des Risikos selbst getragen wird.', true, 'Kleine Schäden zahlt man selbst.'],
    ['Jedes unternehmerische Risiko lässt sich versichern.', false, 'Das allgemeine Unternehmerrisiko (z. B. Absatzrisiko) muss man selbst tragen.'],
    ['Wer auf ein Geschäft verzichtet, vermeidet das Risiko, verzichtet aber auch auf den möglichen Gewinn.', true, 'Risiko und Chance gehören zusammen.'],
    ['Lieferanten auf mehrere Firmen aufzuteilen, ist eine Form der Risikoverminderung.', true, 'Das nennt man Risikostreuung.'],
    ['Durch Leasing kann ein Risiko auf einen Vertragspartner überwälzt werden.', true, 'Z. B. das Risiko, dass Geräte veralten.'],
    ['Rücklagen zu bilden ist eine Risikoüberwälzung.', false, 'Mit Rücklagen trägt der Betrieb das Risiko selbst, er sorgt nur finanziell vor.'],
  ];
  gen('r-tf', 'risiko', 'Richtig oder falsch?', 1, 3, 4, (r, st) => {
    const items = r.sample(RISK_TF, st === 1 ? 2 : st === 2 ? 3 : 4);
    return { kicker: 'Risikopolitik', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Versichern heißt überwälzen, nicht vermeiden.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Gesetzliche Sozialversicherung =================
  const SV = ['Krankenversicherung', 'Unfallversicherung', 'Pensionsversicherung', 'Arbeitslosenversicherung'];
  const SV_CASES = [
    ['Eine Köchin schneidet sich beim Gemüseschneiden in der Hotelküche tief in die Hand und wird im Krankenhaus genäht.', 'Unfallversicherung', 'Ein Unfall bei der Arbeit ist ein Arbeitsunfall.'],
    ['Ein Lehrling stürzt am Weg in den Betrieb mit dem Fahrrad und bricht sich den Arm.', 'Unfallversicherung', 'Auch der Weg zur und von der Arbeit zählt zum Arbeitsunfall.'],
    ['Ein Maler bekommt nach Jahren mit Lösungsmitteln eine anerkannte Berufskrankheit.', 'Unfallversicherung', 'Die Unfallversicherung deckt Arbeitsunfälle und Berufskrankheiten.'],
    ['Nach einem Arbeitsunfall braucht ein Monteur mehrere Wochen Rehabilitation.', 'Unfallversicherung', 'Rehabilitation nach Arbeitsunfällen zahlt die Unfallversicherung.'],
    ['Ein Angestellter hat eine schwere Grippe und muss zum Arzt und Medikamente nehmen.', 'Krankenversicherung', 'Arztkosten und Medikamente bei Krankheit zahlt die Krankenversicherung.'],
    ['Eine Studentin verletzt sich in ihrer Freizeit beim Skifahren und wird im Krankenhaus behandelt.', 'Krankenversicherung', 'Ein Freizeitunfall ist kein Arbeitsunfall. Die Behandlung zahlt die Krankenversicherung.'],
    ['Eine Mitarbeiterin bekommt ein Baby und erhält acht Wochen vor und nach der Geburt Wochengeld.', 'Krankenversicherung', 'Das Wochengeld zahlt die Krankenversicherung.'],
    ['Ein Vater geht mit seiner Tochter zur kostenlosen Vorsorgeuntersuchung.', 'Krankenversicherung', 'Gesundheitsfördernde Maßnahmen gehören zur Krankenversicherung.'],
    ['Ein 66-jähriger Elektriker geht nach 45 Berufsjahren in den Ruhestand.', 'Pensionsversicherung', 'Die Alterspension sichert den Lebensstandard im Alter.'],
    ['Ein Bauarbeiter kann wegen eines schweren Rückenleidens dauerhaft nicht mehr arbeiten.', 'Pensionsversicherung', 'Bei dauernder Arbeitsunfähigkeit springt die Pensionsversicherung ein.'],
    ['Nach dem Tod ihres Mannes erhält eine Frau jeden Monat eine Witwenpension.', 'Pensionsversicherung', 'Die Hinterbliebenenpension ist eine Leistung der Pensionsversicherung.'],
    ['Ein Verkäufer wird gekündigt und sucht eine neue Stelle.', 'Arbeitslosenversicherung', 'Arbeitslosengeld gibt es über das AMS.'],
    ['Eine Grafikerin bezieht schon länger Arbeitslosengeld. Es ist nun ausgelaufen und sie bekommt Notstandshilfe.', 'Arbeitslosenversicherung', 'Die Notstandshilfe folgt auf das Arbeitslosengeld.'],
  ];
  gen('sv-fall', 'sv', 'Welche Sozialversicherung?', 1, 3, 1, (r, st) => {
    if (st < 3) { const [text, right, why] = r.pick(SV_CASES); return { kicker: 'Sozialversicherung', lead: text, ask: 'Welche gesetzliche Sozialversicherung kommt hier zum Zug?', answer: mc(r, right, SV.filter(x => x !== right)), hints: ['Arbeit oder Arbeitsweg: Unfallversicherung. Freizeit oder Krankheit: Krankenversicherung.'], solution: [`**${right}**. ${why}`] }; }
    const list = r.sample(SV_CASES, 3);
    return { kicker: 'Sozialversicherung', ask: 'Ordne jedem Fall die gesetzliche Sozialversicherung zu.', answer: fields(list.map(([text, right], i) => selSame(`c${i}`, text, SV, right))), hints: ['Achte bei Unfällen darauf, ob sie bei der Arbeit, am Arbeitsweg oder in der Freizeit passieren.'], solution: list.map(([text, right, why]) => `${text} → **${right}**. ${why}`) };
  });
  const SV_FACTS = [
    ['Wer zahlt die Beiträge zur gesetzlichen Sozialversicherung eines Angestellten?', 'Arbeitnehmer und Arbeitgeber anteilig', ['Nur der Arbeitnehmer', 'Nur der Arbeitgeber', 'Nur der Staat']],
    ['Wonach richtet sich die Höhe der Sozialversicherungsbeiträge?', 'Nach dem Einkommen', ['Nach dem Alter', 'Nach dem persönlichen Risiko', 'Nach der Zahl der Arztbesuche']],
    ['Wer wickelt die Arbeitslosenversicherung ab?', 'Das Arbeitsmarktservice (AMS)', ['Die Pensionsversicherungsanstalt (PVA)', 'Die Österreichische Gesundheitskasse (ÖGK)', 'Die Finanzmarktaufsicht (FMA)']],
    ['Bis wann sind Kinder bei ihren Eltern mitversichert, wenn sie studieren?', 'Bis zum 27. Geburtstag', ['Bis zum 18. Geburtstag', 'Bis zum 21. Geburtstag', 'Lebenslang']],
    ['Bis wann sind Kinder ohne Ausbildung bei ihren Eltern mitversichert?', 'Bis zum 18. Geburtstag', ['Bis zum 14. Geburtstag', 'Bis zum 27. Geburtstag', 'Bis zum 25. Geburtstag']],
    ['Wer zahlt im Krankenstand zuerst das Entgelt weiter?', 'Der Arbeitgeber', ['Das AMS', 'Die Pensionsversicherung', 'Eine private Krankenversicherung']],
    ['Wer hat Anspruch auf Arbeitslosengeld?', 'Wer in den letzten zwei Jahren mindestens 52 Wochen beschäftigt war und arbeitsfähig und arbeitswillig ist', ['Jede Person ab 18 Jahren', 'Nur wer selbst gekündigt hat', 'Wer mindestens 10 Jahre gearbeitet hat']],
    ['Wie lange wird Arbeitslosengeld mindestens ausbezahlt?', '20 Wochen', ['4 Wochen', '52 Wochen', 'Unbegrenzt']],
    ['Was ist die Notstandshilfe?', 'Geld für Arbeitslose, deren Arbeitslosengeld erschöpft ist; sie muss jedes Jahr neu beantragt werden', ['Eine einmalige Zahlung bei Kündigung', 'Ein Zuschuss zur Pension', 'Geld bei einem Arbeitsunfall']],
    ['Wie wird die gesetzliche Pension finanziert?', 'Im Umlageverfahren: Die Erwerbstätigen zahlen die Pensionen der Pensionisten (Generationenvertrag)', ['Jeder spart sein eigenes Konto an', 'Nur aus Steuern', 'Aus den Gewinnen privater Versicherungen']],
    ['Warum wird die Pensionsversicherung für den Staat immer teurer?', 'Immer weniger Erwerbstätige müssen für immer mehr Pensionisten aufkommen', ['Weil die Pensionen nicht mehr ausbezahlt werden', 'Weil die Beiträge abgeschafft wurden', 'Weil nur noch Selbstständige einzahlen']],
    ['Wie lange bekommen Frauen im Mutterschutz Wochengeld?', 'Acht Wochen vor und acht Wochen nach der Geburt', ['Vier Wochen nach der Geburt', 'Ein ganzes Jahr', 'Nur am Tag der Geburt']],
  ];
  gen('sv-wissen', 'sv', 'Beiträge und Leistungen', 1, 3, 2, (r) => {
    const [q, right, wrong] = r.pick(SV_FACTS);
    return { kicker: 'Sozialversicherung', ask: q, answer: mc(r, right, wrong), hints: ['Die Sozialversicherung ist Pflicht, einkommensabhängig und wird von Arbeitnehmern und Arbeitgebern finanziert.'], solution: [`**${right}**.`] };
  });
  const PILLARS = [
    ['Die staatliche Alterspension', 'Sozialversicherung (gesetzlich)'], ['Die Arbeitgeberin zahlt für ihre Mitarbeiter in eine Pensionskasse ein', 'Betriebliche Vorsorge (freiwillig)'], ['Eine Lebensversicherung, die man selbst abschließt', 'Private Altersvorsorge (freiwillig)'],
    ['Eine private Rentenversicherung', 'Private Altersvorsorge (freiwillig)'], ['Eine Firmenpension aus einer unternehmenseigenen Pensionskasse', 'Betriebliche Vorsorge (freiwillig)'], ['Die Pension aus den Beiträgen, die vom Gehalt abgezogen werden', 'Sozialversicherung (gesetzlich)'],
  ];
  gen('sv-saeulen', 'sv', '3-Säulen-Modell', 2, 3, 3, (r, st) => {
    const opts = ['Sozialversicherung (gesetzlich)', 'Betriebliche Vorsorge (freiwillig)', 'Private Altersvorsorge (freiwillig)'];
    const list = r.sample(PILLARS, st === 2 ? 2 : 3);
    return { kicker: 'Pensionsvorsorge', lead: 'Weil die gesetzliche Pension oft nicht reicht, um den Lebensstandard zu halten, gibt es drei Säulen der Pensionsvorsorge.', ask: 'Zu welcher Säule gehört das?', answer: fields(list.map(([text, right], i) => selSame(`p${i}`, text, opts, right))), hints: ['Gesetzlich ist nur die erste Säule. Betrieblich zahlt die Firma, privat sorgt man selbst vor.'], solution: list.map(([text, right]) => `${text} → **${right}**`) };
  });
  const SV_TF = [
    ['Die gesetzliche Unfallversicherung zahlt auch die Behandlung nach einem Sportunfall in der Freizeit.', false, 'Sie deckt nur Arbeitsunfälle (inkl. Arbeitsweg) und Berufskrankheiten.'],
    ['Die gesetzliche Krankenversicherung bietet auch Leistungen für Gesunde, z. B. Vorsorgeuntersuchungen.', true, 'Gesundheitsförderung gehört dazu.'],
    ['Bei Medikamenten auf Rezept fällt ein Selbstbehalt in Form der Rezeptgebühr an.', true, 'Die Rezeptgebühr ist ein Selbstbehalt.'],
    ['Die Arbeitslosenversicherung wird vom AMS abgewickelt.', true, 'Das AMS zahlt Arbeitslosengeld und Notstandshilfe aus.'],
    ['Die Notstandshilfe gibt es nur für 20 Wochen.', false, 'Sie ist zeitlich unbegrenzt, muss aber jedes Jahr neu beantragt werden.'],
    ['Zur Pensionsversicherung gehören die Eigenpension und die Hinterbliebenenpension.', true, 'Alters- und Invaliditätspension sowie Witwen-, Witwer- und Waisenpension.'],
    ['Die Sozialversicherung wird ausschließlich aus Steuern bezahlt.', false, 'Den Großteil zahlen Arbeitnehmer und Arbeitgeber mit ihren Beiträgen.'],
    ['Die gesetzliche Sozialversicherung arbeitet gewinnorientiert.', false, 'Sie ist nicht gewinnorientiert, private Versicherungen schon.'],
    ['Die betriebliche Vorsorge und die private Altersvorsorge sind freiwillig.', true, 'Nur die erste Säule ist gesetzlich.'],
    ['Wer wegen Krankheit dauerhaft nicht mehr arbeiten kann, bekommt eine Leistung aus der Pensionsversicherung.', true, 'Sie sichert auch das krankheitsbedingte Ausscheiden ab.'],
  ];
  gen('sv-tf', 'sv', 'Richtig oder falsch?', 2, 3, 4, (r, st) => {
    const items = r.sample(SV_TF, st === 2 ? 3 : 4);
    return { kicker: 'Sozialversicherung', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Unfallversicherung: nur Arbeit und Arbeitsweg.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Private Versicherungen =================
  // [name, group, subgroup]
  const PRIVATE = {
    'Ablebensversicherung': ['Personenversicherung', 'Lebensversicherung'], 'Erlebensversicherung': ['Personenversicherung', 'Lebensversicherung'], 'Rentenversicherung': ['Personenversicherung', 'Lebensversicherung'],
    'Private Krankenversicherung': ['Personenversicherung', 'Krankenversicherung'], 'Private Unfallversicherung': ['Personenversicherung', 'Unfallversicherung'],
    'Private Haftpflichtversicherung': ['Vermögensversicherung', 'Unvorhergesehene Aufwendungen'], 'Rechtsschutzversicherung': ['Vermögensversicherung', 'Unvorhergesehene Aufwendungen'], 'Kfz-Haftpflichtversicherung': ['Vermögensversicherung', 'Unvorhergesehene Aufwendungen'],
    'Haushaltsversicherung': ['Vermögensversicherung', 'Versicherung von Gütern'], 'Wohngebäudeversicherung': ['Vermögensversicherung', 'Versicherung von Gütern'], 'Kfz-Kaskoversicherung': ['Vermögensversicherung', 'Versicherung von Gütern'], 'Kreditversicherung': ['Vermögensversicherung', 'Versicherung von Gütern'], 'Transportversicherung': ['Vermögensversicherung', 'Versicherung von Gütern'],
    'Betriebsunterbrechungsversicherung': ['Vermögensversicherung', 'Versicherung von Ertragsentgang'],
  };
  const PRIV_CASES = [
    ['Beim Fußballspielen im Park trifft Jonas mit dem Ball das Fenster eines parkenden Autos. Der Besitzer will die Reparatur bezahlt haben.', 'Private Haftpflichtversicherung', 'Sie zahlt Schäden, die man anderen versehentlich zufügt.'],
    ['Lea rempelt auf der Skipiste eine Frau an, die sich verletzt und Schmerzensgeld verlangt.', 'Private Haftpflichtversicherung', 'Schäden an anderen Personen deckt die Haftpflicht.'],
    ['Ein Ehepaar streitet mit einem Handwerker, der eine Terrasse mangelhaft gebaut hat, und will ihn klagen.', 'Rechtsschutzversicherung', 'Sie zahlt die Kosten, um eigene Ansprüche durchzusetzen.'],
    ['In die Wohnung von Familie Novak wird eingebrochen. Laptop, Schmuck und Bargeld sind weg.', 'Haushaltsversicherung', 'Sie deckt den Wohnungsinhalt, auch Bargeld und Schmuck.'],
    ['Ein Wasserrohr in der Wand bricht. Der Parkettboden und das Sofa in der Mietwohnung sind kaputt.', 'Haushaltsversicherung', 'Einrichtungsgegenstände bei Wasserschäden deckt die Haushaltsversicherung.'],
    ['Ein Sturm deckt das Dach eines Einfamilienhauses teilweise ab.', 'Wohngebäudeversicherung', 'Schäden am Gebäude selbst deckt die Wohngebäudeversicherung.'],
    ['Ein Familienvater nimmt einen hohen Wohnkredit auf. Stirbt er, soll seine Familie Geld bekommen.', 'Ablebensversicherung', 'Sie zahlt beim Tod der versicherten Person an die Begünstigten.'],
    ['Mia zahlt monatlich ein. Erlebt sie das Ende der Laufzeit, bekommt sie das Geld samt Gewinn ausbezahlt.', 'Erlebensversicherung', 'Ausbezahlt wird am Ende der Laufzeit, wenn man es erlebt.'],
    ['Eine 30-Jährige zahlt bis zur Pension ein und möchte dann jeden Monat einen Betrag ausbezahlt bekommen.', 'Rentenversicherung', 'Man zahlt Kapital ein und bekommt in der Pension eine Rente.'],
    ['Ein Patient möchte im Krankenhaus im Einzelzimmer liegen und vom Wahlarzt operiert werden.', 'Private Krankenversicherung', 'Sonderklasse und Wahlärzte ergänzen die gesetzliche Krankenversicherung.'],
    ['Nach einem Kletterunfall muss ein Bergsteiger mit dem Hubschrauber geborgen werden und bleibt teilweise invalid.', 'Private Unfallversicherung', 'Sie deckt Freizeitunfälle, Bergungskosten und Invalidität.'],
    ['Ein Großhändler fürchtet, dass ein wichtiger Kunde seine Rechnungen nicht mehr bezahlt.', 'Kreditversicherung', 'Sie schützt vor Zahlungsausfall von Kunden.'],
    ['Ein Container mit Ware geht auf dem Seeweg nach Asien verloren.', 'Transportversicherung', 'Sie sichert den Verlust von Waren am Transportweg ab.'],
    ['Nach einem Brand in der Backstube muss eine Bäckerei drei Wochen schließen. Die Miete und die Gehälter laufen weiter.', 'Betriebsunterbrechungsversicherung', 'Sie zahlt entgangenen Gewinn und laufende Kosten bei einer vorübergehenden Schließung.'],
    ['Hagel beschädigt den Lack und die Windschutzscheibe des eigenen Autos.', 'Kfz-Kaskoversicherung', 'Schäden am eigenen Fahrzeug deckt nur die Kasko.'],
    ['Beim Ausparken beschädigt Tim das Auto eines Nachbarn.', 'Kfz-Haftpflichtversicherung', 'Schäden an anderen Fahrzeugen deckt die Kfz-Haftpflicht.'],
  ];
  gen('pr-welche', 'privat', 'Welche Versicherung zahlt?', 1, 3, 1, (r, st) => {
    const [text, right, why] = r.pick(PRIV_CASES), others = Object.keys(PRIVATE).filter(x => x !== right);
    const near = others.filter(x => PRIVATE[x][0] === PRIVATE[right][0]), wrong = r.sample(st === 1 ? others : near.length >= 3 ? near : others, 3);
    return { kicker: 'Private Versicherung', lead: text, ask: 'Welche Versicherung eignet sich, um diesen Schaden zu decken?', answer: mc(r, right, wrong), hints: ['Wer ist geschädigt: man selbst, eine andere Person oder eine Sache? Und geht es um eine Person oder um Vermögen?'], solution: [`**${right}**. ${why}`] };
  });
  gen('pr-art', 'privat', 'Personen- oder Vermögensversicherung', 1, 3, 2, (r, st) => {
    const names = r.sample(Object.keys(PRIVATE), st === 1 ? 3 : 4);
    if (st === 1) return { kicker: 'Einteilung', ask: 'Personenversicherung oder Vermögensversicherung?', answer: fields(names.map((n, i) => selSame(`a${i}`, n, ['Personenversicherung', 'Vermögensversicherung'], PRIVATE[n][0]))), hints: ['Betrifft das Risiko einen Menschen oder das Vermögen?'], solution: names.map(n => `${n} → **${PRIVATE[n][0]}**`) };
    const groups = ['Lebensversicherung', 'Krankenversicherung', 'Unfallversicherung', 'Unvorhergesehene Aufwendungen', 'Versicherung von Gütern', 'Versicherung von Ertragsentgang'];
    return { kicker: 'Einteilung', ask: 'Ordne jede Versicherung ihrer Gruppe zu.', answer: fields(names.map((n, i) => selSame(`a${i}`, n, groups, PRIVATE[n][1]))), hints: ['Unvorhergesehene Aufwendungen: man muss für einen Schaden aufkommen (Haftung, Rechtsstreit). Güter: eine Sache ist kaputt. Ertragsentgang: der Betrieb steht still.'], solution: names.map(n => `${n} → **${PRIVATE[n][1]}** (${PRIVATE[n][0]})`) };
  });
  const PRIV_FACTS = [
    ['Was ist eine Bündelversicherung?', 'Mehrere selbstständige Versicherungsverträge in einem Versicherungsschein', ['Eine Versicherung, die mehrere Personen gemeinsam abschließen', 'Eine Versicherung ohne Selbstbehalt', 'Eine Versicherung, die nur Gebäude deckt']],
    ['Was ist in Österreich bei der Haushaltsversicherung meist mitversichert?', 'Eine private Haftpflichtversicherung', ['Eine Kfz-Kaskoversicherung', 'Eine Lebensversicherung', 'Die gesetzliche Krankenversicherung']],
    ['Was zahlt eine Erlebensversicherung aus?', 'Am Ende der Laufzeit die einbezahlten Prämien samt Gewinn', ['Nur im Todesfall eine Summe an die Begünstigten', 'Schäden an der Wohnung', 'Nur die Kosten im Krankenhaus']],
    ['Wann zahlt eine Ablebensversicherung nicht?', 'Bei Suizid der versicherten Person', ['Bei einem tödlichen Verkehrsunfall', 'Bei einer tödlichen Krankheit', 'Wenn die Begünstigten Kinder sind']],
    ['Was ist ein Krankenhaustagegeld?', 'Ein vereinbarter Betrag für jeden Tag im Krankenhaus', ['Die Rezeptgebühr', 'Das Entgelt des Arbeitgebers im Krankenstand', 'Die Gebühr für die E-Card']],
    ['Wovon hängt die Höhe der Prämie bei einer privaten Versicherung ab?', 'Vom Risiko und von den vereinbarten Leistungen', ['Nur vom Einkommen', 'Vom Wohnort der Versicherungsvertreterin', 'Sie ist für alle gleich hoch']],
    ['Was deckt die Kreditversicherung ab?', 'Den Zahlungsausfall oder Zahlungsverzug von Kunden', ['Die Rückzahlung des eigenen Bankkredits', 'Schäden am Firmenauto', 'Rechtsstreitigkeiten mit Lieferanten']],
  ];
  gen('pr-wissen', 'privat', 'Wissen zu Privatversicherungen', 1, 3, 3, (r) => {
    const [q, right, wrong] = r.pick(PRIV_FACTS);
    return { kicker: 'Private Versicherung', ask: q, answer: mc(r, right, wrong), hints: ['Private Versicherungen ergänzen die Sozialversicherung und werden individuell vereinbart.'], solution: [`**${right}**.`] };
  });
  // Private health insurance: clear percentages and caps, no annual deductible, so the reading is unambiguous.
  gen('pr-kranken', 'privat', 'Private Krankenversicherung rechnen', 2, 3, 4, (r, st) => {
    const m = r.pick([84, 96, 128, 145, 172, 210, 265]), year = m * 12, k = r.int(0, 2);
    const name = r.pick(['Sarah Weiß', 'David Kogler', 'Nina Haas', 'Elias Brunner']);
    if (k === 0) {
      const price = r.pick([60, 70, 75, 80, 90, 95]), n = r.int(11, 18), cap = 10, p = r.pick([70, 80]), pay = cap * price * p / 100;
      return { kicker: 'Private Krankenversicherung', lead: `${name} zahlt für eine private Krankenversicherung monatlich ${E(m)}. Laut Tarif werden ${p} % der Kosten für Physiotherapie ersetzt, höchstens für 10 Behandlungen pro Kalenderjahr. Nach einem Sportunfall braucht ${name.split(' ')[0]} ${n} Einheiten zu je ${E(price)}.`, ask: 'Berechne die Jahresprämie und den Betrag, den die Versicherung für die Physiotherapie ersetzt.',
        answer: fields(money('j', 'Jahresprämie', year, [{ value: m, msg: 'Das ist die Monatsprämie. Mal 12.' }]), money('e', 'Ersatz Physiotherapie', pay, [{ value: n * price * p / 100, msg: `Ersetzt werden höchstens 10 Behandlungen, nicht alle ${n}.` }, { value: cap * price, msg: `Nur ${p} % werden ersetzt.` }, { value: n * price, msg: `Höchstens 10 Behandlungen, davon ${p} %.` }])),
        hints: ['Jahresprämie = Monatsprämie · 12.', `Ersatz = 10 · ${E(price)} · ${p} %.`], solution: [`Jahresprämie: ${E(m)} · 12 = ${E(year)}`, `Ersatz: 10 · ${E(price)} · ${p} % = ${E(pay)} (die übrigen ${n - 10} Einheiten zahlt ${name.split(' ')[0]} selbst)`] };
    }
    if (k === 1) {
      const bill = round(r.int(900, 3800), 10), p = r.pick([70, 75, 80]), cap = st === 3 ? round(bill * r.pick([0.5, 0.6]), 100) : null, pay = cap ? Math.min(bill * p / 100, cap) : bill * p / 100;
      return { kicker: 'Private Krankenversicherung', lead: `${name} zahlt monatlich ${E(m)}. Der Tarif ersetzt ${p} % der Kosten für Zahnersatz${cap ? `, höchstens ${E(cap)} pro Kalenderjahr` : ''}. Eine neue Zahnkrone kostet ${E(bill)}.`, ask: 'Berechne die Jahresprämie und den Ersatz für die Zahnkrone.',
        answer: fields(money('j', 'Jahresprämie', year, [{ value: m, msg: 'Das ist die Monatsprämie. Mal 12.' }]), money('e', 'Ersatz Zahnkrone', pay, [{ value: bill, msg: `Ersetzt werden nur ${p} %.` }, { value: bill * (100 - p) / 100, msg: `Das ist dein Anteil. Die Versicherung zahlt ${p} %.` }, ...(cap ? [{ value: bill * p / 100, msg: `Achte auf die Höchstgrenze von ${E(cap)}.` }] : [])])),
        hints: [`${p} % von ${E(bill)}${cap ? `, aber höchstens ${E(cap)}` : ''}.`], solution: [`Jahresprämie: ${E(m)} · 12 = ${E(year)}`, `${p} % von ${E(bill)} = ${E(bill * p / 100)}${cap ? ` → Höchstgrenze ${E(cap)} → Ersatz ${E(pay)}` : ''}`] };
    }
    const days = r.int(3, 12), daily = r.pick([40, 50, 60, 80, 100]);
    return { kicker: 'Private Krankenversicherung', lead: `${name} hat ein Krankenhaustagegeld von ${E(daily)} pro Tag vereinbart und zahlt dafür vierteljährlich ${E(m)}. Nach einer Operation liegt ${name.split(' ')[0]} ${days} Tage im Krankenhaus.`, ask: 'Berechne die Jahresprämie und das ausbezahlte Krankenhaustagegeld.',
      answer: fields(money('j', 'Jahresprämie', m * 4, [{ value: m * 12, msg: 'Vierteljährlich heißt 4-mal im Jahr.' }, { value: m, msg: 'Das ist eine Vierteljahresprämie. Mal 4.' }]), money('e', 'Krankenhaustagegeld', days * daily, [])),
      hints: ['Vierteljährlich = 4 Zahlungen pro Jahr.'], solution: [`Jahresprämie: ${E(m)} · 4 = ${E(m * 4)}`, `Tagegeld: ${days} · ${E(daily)} = ${E(days * daily)}`] };
  });

  // ================= Vertrag und Schadensfall =================
  const STEPS = ['Anbahnung (Beratungsgespräch)', 'Antrag des Versicherungsnehmers', 'Prüfung des Antrags durch die Versicherung', 'Polizze und Prämienschein werden ausgestellt', 'Rechtzeitige Zahlung der ersten Prämie'];
  gen('v-ablauf', 'vertrag', 'Ablauf bis zum gültigen Vertrag', 1, 3, 1, (r, st) => {
    if (st === 1) {
      const i = r.int(0, STEPS.length - 2);
      return { kicker: 'Abwicklung', ask: `Was folgt beim Abschluss einer Versicherung direkt auf den Schritt „${STEPS[i]}“?`, answer: mc(r, STEPS[i + 1], STEPS.filter((_, n) => n !== i + 1 && n !== i).slice(0, 3)), hints: ['Anbahnung → Antrag → Prüfung → Polizze und Prämienschein → Zahlung der Prämie → gültiger Vertrag.'], solution: [`Nach „${STEPS[i]}“ kommt **${STEPS[i + 1]}**.`] };
    }
    const opts = r.shuffle(STEPS);
    return { kicker: 'Abwicklung', ask: 'Bring die Schritte bis zum gültigen Versicherungsvertrag in die richtige Reihenfolge.', answer: fields(STEPS.map((s, i) => selSame(`s${i}`, `${i + 1}. Schritt`, opts, s))), hints: ['Zuerst wird beraten, am Ende muss die erste Prämie bezahlt werden, sonst gibt es keinen Schutz.'], solution: STEPS.map((s, i) => `${i + 1}. ${s}`).concat('Danach besteht ein gültiger Vertrag mit Schutz im Schadensfall. Auf Wunsch gibt es schon ab der Antragsannahme einen vorläufigen Versicherungsschutz (Deckungszusage).') };
  });
  const WHO = [
    ['Ich stelle den Versicherungsantrag.', 'Versicherungsnehmer'], ['Ich prüfe den Versicherungsantrag.', 'Versicherungsunternehmen'], ['Ich stelle die Polizze und den Prämienschein aus.', 'Versicherungsunternehmen'],
    ['Ich unterschreibe den Versicherungsvertrag.', 'Versicherungsnehmer'], ['Ich bezahle die Prämie.', 'Versicherungsnehmer'], ['Ich bezahle im gedeckten Schadensfall die Entschädigung.', 'Versicherungsunternehmen'],
    ['Ich melde den Schaden unverzüglich.', 'Versicherungsnehmer'], ['Ich lege einen Schadensakt an und schicke bei großen Schäden einen Sachverständigen.', 'Versicherungsunternehmen'], ['Ich drehe nach dem Rohrbruch sofort den Hauptwasserhahn ab.', 'Versicherungsnehmer'],
  ];
  gen('v-wer', 'vertrag', 'Versicherungsnehmer oder Versicherung?', 1, 3, 2, (r, st) => {
    const list = r.sample(WHO, st + 1), opts = ['Versicherungsnehmer', 'Versicherungsunternehmen'];
    return { kicker: 'Vertragspartner', ask: 'Wer sagt das: der Versicherungsnehmer oder das Versicherungsunternehmen?', answer: fields(list.map(([text, right], i) => selSame(`w${i}`, `„${text}“`, opts, right))), hints: ['Der Kunde stellt den Antrag, zahlt die Prämie und meldet Schäden. Die Versicherung prüft, stellt aus und zahlt die Entschädigung.'], solution: list.map(([text, right]) => `„${text}“ → **${right}**`) };
  });
  const PERSONS = [
    () => ({ text: 'Klara Fuchs (42) schließt eine Ablebensversicherung ab. Stirbt sie, sollen ihre beiden Kinder das Geld bekommen. Die Polizze stellt die Alpenland Versicherung AG aus.', q: [['Versicherungsnehmerin', 'Klara Fuchs'], ['Begünstigte', 'Ihre Kinder'], ['Versicherer', 'Alpenland Versicherung AG']] }),
    () => ({ text: 'Die 18-jährige Schülerin Anna Reiter schließt bei der Donauring Versicherung AG eine Erlebensversicherung ab und zahlt vierteljährlich ihre Prämie.', q: [['Versicherungsnehmerin', 'Anna Reiter'], ['Begünstigte', 'Anna Reiter'], ['Versicherer', 'Donauring Versicherung AG']] }),
    () => ({ text: 'Der Unternehmer Paul Wieser versichert das Leben seines Geschäftspartners Max Lang bei der Tauern Versicherung AG. Stirbt Max Lang, bekommt Paul Wieser die Versicherungssumme.', q: [['Versicherungsnehmer', 'Paul Wieser'], ['Begünstigter', 'Paul Wieser'], ['Versicherer', 'Tauern Versicherung AG']] }),
  ];
  gen('v-personen', 'vertrag', 'Wer ist wer im Vertrag?', 2, 3, 3, (r) => {
    const c = r.pick(PERSONS)(), names = [...new Set(c.q.map(x => x[1]).concat(['Die Versicherungsvertreterin', 'Max Lang', 'Klara Fuchs', 'Ihre Kinder', 'Anna Reiter']))].filter(x => c.text.includes(x) || c.q.some(q => q[1] === x));
    const opts = [...new Set([...c.q.map(x => x[1]), ...names])];
    return { kicker: 'Begriffe', lead: c.text, ask: 'Wer hat welche Rolle?', answer: fields(c.q.map(([role, right], i) => selSame(`r${i}`, role, opts, right))), hints: ['Versicherungsnehmer schließt ab und zahlt. Begünstigter bekommt die Leistung. Versicherer ist das Unternehmen.'], solution: c.q.map(([role, who]) => `${role}: **${who}**`) };
  });
  const CLAIM_MC = [
    ['Was muss der Versicherungsnehmer nach einem Schaden als Erstes tun?', 'Den Schaden mindern, also eine Ausbreitung verhindern, und ihn dann sofort melden', ['Erst einmal abwarten, ob die Versicherung sich meldet', 'Den Schaden selbst reparieren lassen und erst danach Fotos machen', 'Die Polizze kündigen']],
    ['Bei welchen Schäden muss in der Haushaltsversicherung zusätzlich eine Anzeige bei der Polizei gemacht werden?', 'Bei Raub, Diebstahl, Einbruch sowie Feuer- oder Explosionsschäden', ['Bei jedem Wasserschaden', 'Nur bei Schäden über € 10.000,–', 'Nie, die Versicherung meldet das selbst']],
    ['Was ist eine Kulanzleistung?', 'Eine freiwillige, oft nur teilweise Leistung in einem nicht gedeckten Schadensfall', ['Die vertraglich vereinbarte Entschädigung', 'Die Prämie für das erste Jahr', 'Ein Selbstbehalt des Kunden']],
    ['Was passiert bei einem größeren Schaden nach der Schadensmeldung?', 'Ein Sachverständiger prüft den Schaden und erstellt ein Gutachten', ['Die Versicherung zahlt sofort ohne Prüfung', 'Der Vertrag endet automatisch', 'Der Kunde muss vor Gericht']],
    ['Was kann der Kunde tun, wenn die Versicherung zu Unrecht nicht zahlt?', 'Einen Rechtsanwalt beiziehen oder sich beim Verband der Versicherungsunternehmen beschweren', ['Gar nichts, die Entscheidung ist endgültig', 'Einfach keine Prämien mehr zahlen', 'Den Schaden noch einmal melden, bis sie zahlt']],
    ['Wie muss der Schaden der Versicherung gemeldet werden?', 'Unverzüglich mit einer Schadensmeldung (Formular online oder auf Papier)', ['Irgendwann innerhalb eines Jahres', 'Nur telefonisch beim Vertreter', 'Gar nicht, die Polizei meldet ihn']],
  ];
  gen('v-schaden', 'vertrag', 'Der Schadensfall', 1, 3, 4, (r, st) => {
    if (st < 3) { const [q, right, wrong] = r.pick(CLAIM_MC); return { kicker: 'Schadensfall', ask: q, answer: mc(r, right, wrong), hints: ['Ablauf: Schaden mindern → melden (Schadensmeldung) → Versicherung bearbeitet intern.'], solution: [`**${right}**.`] }; }
    const rights = ['Der Kunde hat den Schaden absichtlich herbeigeführt.', 'Der Kunde hat seine Pflichten (Obliegenheiten) verletzt.', 'Der Kunde hat die Prämie nicht rechtzeitig bezahlt.'];
    const wrongs = ['Der Schaden ist höher als im Vorjahr.', 'Der Kunde hat den Schaden sofort gemeldet.', 'Der Kunde hat Fotos und Rechnungen geschickt.'];
    return { kicker: 'Schadensfall', ask: 'Aus welchen Gründen muss die Versicherung **nicht** zahlen? Wähle alle passenden.', answer: multi(r, rights, wrongs), hints: ['Es geht um Fehler des Kunden: Vorsatz, Pflichten, Zahlung.'], solution: rights.map(x => `✓ ${x}`) };
  });
  const ENDS = [
    ['Ein Kunde kündigt seine Rechtsschutzversicherung unter Einhaltung der Frist zum Ende der Laufzeit.', 'Kündigung'],
    ['Die Versicherung kündigt, weil ein Kunde trotz Mahnung seit Monaten keine Prämien zahlt.', 'Außerordentliche Kündigung'],
    ['Ein Kunde kündigt sofort, weil die Versicherung einen gedeckten Schaden ohne Grund nicht bezahlt.', 'Außerordentliche Kündigung'],
    ['Eine Frau verkauft ihr Auto und kauft sich kein neues mehr. Die Kfz-Haftpflicht endet.', 'Interessenwegfall'],
    ['Ein Haus wird abgerissen. Die Gebäudeversicherung dafür ist nicht mehr nötig.', 'Interessenwegfall'],
    ['Das Versicherungsunternehmen ist zahlungsunfähig und muss Konkurs anmelden.', 'Konkurs des Versicherers'],
  ];
  gen('v-ende', 'vertrag', 'Wie endet der Vertrag?', 2, 3, 5, (r) => {
    const [text, right] = r.pick(ENDS);
    return { kicker: 'Vertragsende', lead: text, ask: 'Wie wird der Versicherungsvertrag hier beendet?', answer: mc(r, right, ['Kündigung', 'Außerordentliche Kündigung', 'Interessenwegfall', 'Konkurs des Versicherers'].filter(x => x !== right)), hints: ['Fristgerecht = Kündigung. Pflichtverletzung = außerordentlich. Sache oder Gefahr fällt weg = Interessenwegfall.'], solution: [`**${right}**.`] };
  });
  const CONTRACT_TF = [
    ['„Die erste Prämie zahle ich erst, wenn ein Schaden passiert. Unterschrieben habe ich ja schon.“ Diese Aussage stimmt.', false, 'Ohne rechtzeitige Zahlung der ersten Prämie (meist binnen 14 Tagen) gibt es keinen gültigen Schutz.'],
    ['Die erste Prämie muss in der Regel binnen 14 Tagen bezahlt werden.', true, 'Erst dann wird der Versicherungsschutz wirksam.'],
    ['Versicherungen müssen Kunden vor dem Abschluss ausführlich beraten.', true, 'Bei falscher Beratung haften sie für den Schaden.'],
    ['Ein vorläufiger Versicherungsschutz (Deckungszusage) kann vereinbart werden, sobald der Antrag angenommen wurde.', true, 'So ist man schon vor der Polizze geschützt.'],
    ['Die Polizze stellt der Versicherungsnehmer aus.', false, 'Polizze und Prämienschein stellt das Versicherungsunternehmen aus.'],
    ['Bei der Erstbearbeitung prüft die Versicherung, ob das Risiko versicherbar ist und die Angaben stimmen.', true, 'Erst danach wird der Antrag angenommen.'],
    ['Wer bei Vertragsabschluss falsche Angaben macht, verletzt eine Obliegenheit.', true, 'Wahrheitsgemäße Angaben sind Pflicht.'],
    ['Verlässt man die Wohnung nur kurz, muss die Tür nicht abgesperrt werden, der Schutz bleibt trotzdem.', false, 'Türen versperren und Fenster schließen gehört zu den Obliegenheiten.'],
  ];
  gen('v-tf', 'vertrag', 'Richtig oder falsch?', 1, 3, 6, (r, st) => {
    const items = r.sample(CONTRACT_TF, st === 1 ? 2 : st === 2 ? 3 : 4);
    return { kicker: 'Versicherungsvertrag', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Ohne bezahlte erste Prämie kein gültiger Vertrag.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Versicherungsleistung =================
  const KIND_CASES = [
    ['Lebensversicherung', 'Summenversicherung'], ['Unfallversicherung mit vereinbarter Summe bei Invalidität', 'Summenversicherung'], ['Ablebensversicherung', 'Summenversicherung'],
    ['Haushaltsversicherung', 'Schadensversicherung'], ['Haftpflichtversicherung', 'Schadensversicherung'], ['Kaskoversicherung', 'Schadensversicherung'], ['Feuerversicherung für ein Betriebsgebäude', 'Schadensversicherung'],
  ];
  const FORMS = [
    ['Die Versicherung zahlt den Schaden bis zur vereinbarten Versicherungssumme von € 1.000.000,–.', 'Erstrisikoversicherung'],
    ['Bei jedem Schaden trägt der Kunde die ersten € 300,– selbst.', 'Versicherung mit Selbstbehalt'],
    ['Wie viel bezahlt wird, hängt von Schaden, Versicherungssumme und Versicherungswert ab. Ein kaputtes Gerät wird zum Neuwert ersetzt.', 'Vollwertversicherung'],
    ['Der Kunde hat € 500,– Selbstbehalt vereinbart. Bei € 1.400,– Schaden bekommt er € 900,–.', 'Versicherung mit Selbstbehalt'],
    ['Eine Kfz-Haftpflichtversicherung zahlt die verursachten Schäden bis zur vereinbarten Summe.', 'Erstrisikoversicherung'],
  ];
  gen('l-art', 'leistung', 'Summen- oder Schadensversicherung', 1, 3, 1, (r, st) => {
    if (st === 1) { const [name, right] = r.pick(KIND_CASES); return { kicker: 'Versicherungsleistung', ask: `Ist die **${name}** eine Summen- oder eine Schadensversicherung?`, answer: mc(r, right, [right === 'Summenversicherung' ? 'Schadensversicherung' : 'Summenversicherung']), hints: ['Summenversicherung: feste Summe, egal wie hoch der Schaden ist. Schadensversicherung: es zählt der tatsächliche Schaden.'], solution: [`**${right}**. ${right === 'Summenversicherung' ? 'Im Vertrag ist eine feste Summe vereinbart.' : 'Gezahlt wird nach der tatsächlichen Schadenshöhe.'}`] }; }
    const [text, right] = r.pick(FORMS);
    return { kicker: 'Versicherungsleistung', lead: text, ask: 'Welche Gestaltung der Versicherungsleistung ist das?', answer: mc(r, right, ['Erstrisikoversicherung', 'Versicherung mit Selbstbehalt', 'Vollwertversicherung', 'Summenversicherung'].filter(x => x !== right)), hints: ['Bis zur Summe = Erstrisiko. Eigener Anteil = Selbstbehalt. Wert der Sache zählt = Vollwert.'], solution: [`**${right}**.`] };
  });
  const KIND = ['Vollversicherung', 'Überversicherung', 'Unterversicherung'];
  function underCase(r, st) {
    const vw = round(r.int(st === 1 ? 50 : 20, st === 1 ? 200 : 600), st === 1 ? 10 : 5) * 1000, k = st === 1 ? r.pick([0, 1, 2, 2]) : r.pick([0, 1, 2, 2, 2]);
    const vs = k === 0 ? vw : k === 1 ? vw + round(vw * r.pick([0.1, 0.2, 0.3]), 1000) : vw - round(vw * r.pick(st === 1 ? [0.2, 0.25, 0.5] : [0.1, 0.15, 0.2, 0.3, 0.35]), 1000);
    const dmg = round(vw * r.pick([0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.6, 0.75]), st === 1 ? 1000 : 100), pay = vs < vw ? vs * dmg / vw : dmg;
    return { vw, vs, dmg, pay, kind: KIND[k] };
  }
  gen('l-unter', 'leistung', 'Unter-, Über- oder Vollversicherung', 1, 3, 2, (r, st) => {
    const c = underCase(r, st), what = r.pick(['den Hausrat', 'ein Betriebsgebäude', 'die Lagerware', 'eine Werkstatt samt Einrichtung', 'ein Ferienhaus']);
    return { kicker: 'Entschädigung', lead: `Für ${what} wurde eine Versicherungssumme von ${E(c.vs)} vereinbart. Ein Gutachter schätzt den Versicherungswert auf ${E(c.vw)}. Es entsteht ein Schaden von ${E(c.dmg)}.`, ask: 'Berechne die Entschädigung und gib an, welche Versicherung vorliegt.',
      answer: fields(money('e', 'Entschädigung', c.pay, c.vs < c.vw ? [{ value: c.dmg, msg: 'Bei Unterversicherung wird nur der aliquote (anteilige) Teil des Schadens ersetzt.' }, { value: c.vw * c.dmg / c.vs, msg: 'Der Bruch steht verkehrt: Versicherungssumme oben, Versicherungswert unten.' }, { value: c.vs, msg: 'Die Versicherungssumme ist hier nicht die Entschädigung.' }] : [{ value: c.vs * c.dmg / c.vw, msg: 'Bei Voll- und Überversicherung wird der Schaden komplett ersetzt, nicht anteilig.' }, { value: c.vs, msg: 'Ersetzt wird nur der tatsächliche Schaden, nie mehr.' }]), sel(r, 'k', 'Art', c.kind, KIND.filter(x => x !== c.kind))),
      hints: ['Vergleiche zuerst Versicherungssumme und Versicherungswert.', c.vs < c.vw ? 'Entschädigung = Versicherungssumme · Schaden : Versicherungswert.' : 'Ist die Summe mindestens so hoch wie der Wert, wird der ganze Schaden ersetzt.'],
      solution: c.vs < c.vw ? [`Versicherungssumme ${E(c.vs)} < Versicherungswert ${E(c.vw)} → **Unterversicherung**`, `Entschädigung = ${E(c.vs)} · ${E(c.dmg)} : ${E(c.vw)} = **${E(c.pay)}**`] : [`Versicherungssumme ${E(c.vs)} ${c.vs === c.vw ? '=' : '>'} Versicherungswert ${E(c.vw)} → **${c.kind}**`, `Der ganze Schaden wird ersetzt: **${E(c.pay)}**${c.vs > c.vw ? '. Eine Überversicherung ist unnötig, weil man zu viel Prämie zahlt.' : ''}`] };
  });
  gen('l-sb', 'leistung', 'Selbstbehalt', 1, 3, 3, (r, st) => {
    const sb = r.pick([150, 200, 250, 300, 500, 700, 1000]), d1 = round(r.int(Math.round(sb * 0.4), Math.round(sb * 0.95)), 10), d2 = round(r.int(sb * 2, sb * 12), 50);
    const who = r.pick(['Laura Hofer', 'Simon Egger', 'Familie Wallner', 'Die Pichler OG']), what = r.pick(['Kaskoversicherung', 'Haushaltsversicherung', 'Elektronikversicherung']);
    const list = st === 1 ? [d2] : [d1, d2];
    return { kicker: 'Selbstbehalt', lead: `${who} hat in der ${what} einen Selbstbehalt von ${E(sb)} pro Schadensfall vereinbart.`, ask: st === 1 ? `Wie viel zahlt die Versicherung bei einem Schaden von ${E(d2)}?` : `Wie viel zahlt die Versicherung bei einem Schaden von ${E(d1)} und wie viel bei einem Schaden von ${E(d2)}?`,
      answer: fields(list.map((d, i) => money(`s${i}`, `Bei ${E(d)} Schaden`, Math.max(0, d - sb), d < sb ? [{ value: d, msg: 'Der Schaden ist kleiner als der Selbstbehalt.' }, { value: sb - d, msg: 'Liegt der Schaden unter dem Selbstbehalt, zahlt die Versicherung nichts.' }] : [{ value: d, msg: 'Der Selbstbehalt wird abgezogen.' }, { value: sb, msg: 'Das ist der Teil, den der Kunde selbst trägt.' }]))),
      hints: ['Versicherung zahlt = Schaden − Selbstbehalt, aber nie weniger als 0.'], solution: list.map(d => `${E(d)} − ${E(sb)} → **${E(Math.max(0, d - sb))}**${d < sb ? ' (der Schaden liegt unter dem Selbstbehalt)' : ''}`) };
  });
  const LIMITS = [
    { name: 'Sturm, Hagel und Schneedruck am Gebäude', limit: null },
    { name: 'Sturm und Hagel an Sachen im Freien (Gartenmöbel, Markise)', limit: 1500 },
    { name: 'Hochwasser, Überschwemmung, Rückstau', limit: 5000 },
    { name: 'Indirekter Blitzschlag an Elektrogeräten', limit: 1000 },
    { name: 'Austreten von Leitungswasser', limit: null },
  ];
  gen('l-erst', 'leistung', 'Haushalt: Grenzen und Selbstbehalt', 2, 3, 4, (r, st) => {
    const sb = r.pick([100, 150, 200, 250]), mPrem = r.pick([28, 35, 40, 46]), who = r.pick(['Familie Leitner', 'Familie Gruber', 'Familie Steiner', 'Familie Köck']);
    const ev = r.pick(['hagel', 'blitz', 'wasser']);
    let items, pay, text;
    if (ev === 'hagel') { const roof = round(r.int(2500, 11000), 100), garden = round(r.int(st === 2 ? 600 : 1600, st === 2 ? 1400 : 3200), 10); items = [['Dachziegel und Dachrinne', roof, LIMITS[0]], ['Gartenmöbel und Markise', garden, LIMITS[1]]]; text = 'Ein schweres Hagelunwetter beschädigt das Dach und die Gartenmöbel auf der Terrasse.'; }
    else if (ev === 'blitz') { const tv = round(r.int(600, 1600), 1), d2 = round(r.int(200, 700), 1); items = [['Fernseher', tv, LIMITS[3]], ['Türsprechanlage', d2, LIMITS[3]]]; text = 'Bei einem Gewitter schlägt ein Blitz in der Nähe ein. Durch die Überspannung gehen der Fernseher und die Türsprechanlage kaputt.'; }
    else { const cellar = round(r.int(st === 2 ? 2000 : 5200, st === 2 ? 4800 : 9000), 100), pipe = round(r.int(800, 4000), 10); items = [['Rückstau im Keller (Kellerräume, Waschmaschine)', cellar, LIMITS[2]], ['Rohrbruch in der Küche', pipe, LIMITS[4]]]; text = 'Nach Starkregen staut sich Wasser durch den Kanal in den Keller zurück. Zugleich bricht im selben Unwetter ein Wasserrohr in der Küche.'; }
    // One event: items under the same limit share that limit; the deductible is subtracted once.
    const byLimit = new Map(); for (const [, v, l] of items) byLimit.set(l, (byLimit.get(l) || 0) + v);
    const covered = [...byLimit].reduce((s, [l, v]) => s + (l.limit ? Math.min(v, l.limit) : v), 0); pay = Math.max(0, covered - sb);
    const total = items.reduce((s, [, v]) => s + v, 0);
    return { kicker: 'Haushaltsversicherung', lead: `${who} zahlt monatlich ${E(mPrem)} für eine Eigenheim- und Haushaltsversicherung. Pro Schadensfall werden von der Entschädigung ${E(sb)} Selbstbehalt abgezogen. ${text} ${items.map(([n, v]) => `${n}: ${E(v)}`).join(', ')}.`, table: { head: 'row', rows: [['Schadensart (Auszug)', 'Versicherungsschutz'], ...LIMITS.map(l => [l.name, l.limit ? `bis ${E(l.limit)}` : 'voll gedeckt'])] },
      ask: 'Berechne die Jahresprämie und die Entschädigung für diesen Schadensfall.',
      answer: fields(money('j', 'Jahresprämie', mPrem * 12, [{ value: mPrem, msg: 'Das ist die Monatsprämie.' }]), money('e', 'Entschädigung', pay, [{ value: total - sb, msg: 'Achte auf die Höchstgrenzen in der Tabelle.' }, { value: covered, msg: 'Der Selbstbehalt fehlt noch.' }, { value: total, msg: 'Höchstgrenzen und Selbstbehalt fehlen.' }, { value: covered - sb * items.length, msg: 'Der Selbstbehalt wird pro Schadensfall abgezogen, nicht pro Gegenstand.' }])),
      hints: ['Prüfe für jeden Schaden die Grenze in der Tabelle.', 'Grenze gilt für die ganze Schadensart. Am Ende einmal den Selbstbehalt abziehen.'],
      solution: [...[...byLimit].map(([l, v]) => `${l.name}: ${E(v)}${l.limit ? (v > l.limit ? ` → begrenzt auf ${E(l.limit)}` : ` (unter der Grenze von ${E(l.limit)})`) : ' (voll gedeckt)'}`), `Gedeckt: ${E(covered)} − ${E(sb)} Selbstbehalt = **${E(pay)}**`, `Jahresprämie: ${E(mPrem)} · 12 = ${E(mPrem * 12)}`] };
  });
  gen('l-mix', 'leistung', 'Mehrere Schäden und Unterversicherung', 3, 3, 5, (r) => {
    const vw = round(r.int(240, 520), 1) * 1000, vs = vw - round(vw * r.pick([0.04, 0.06, 0.08, 0.1, 0.12]), 1000), a = round(r.int(18, 60), 1) * 1000, b = round(r.int(8, 40), 1) * 1000, c = round(r.int(6, 16), 1) * 1000, p = r.pick([30, 40, 50, 60]);
    const covered = a + b + c * p / 100, pay = vs * covered / vw;
    return { kicker: 'Feuerversicherung', lead: `Ein Einfamilienhaus ist mit ${E(vs)} gegen Feuer versichert. Ersetzt werden Schäden am Haus, nicht aber bewegliche Sachen wie Autos oder Fahrräder. Nach einem Blitzschlag brennt es: Dachstuhl ${E(a)}, Wohnräume ${E(b)}, Carport samt Auto ${E(c)}, davon entfallen ${p} % auf den Carport. Der Gutachter schätzt den Versicherungswert des Hauses auf ${E(vw)}.`,
      ask: 'Berechne den gedeckten Schaden und die Entschädigung. Welche Versicherung liegt vor?',
      answer: fields(money('g', 'Gedeckter Schaden', covered, [{ value: a + b + c, msg: 'Das Auto ist eine bewegliche Sache und nicht gedeckt.' }, { value: a + b, msg: `Der Carport gehört zum Haus, ${p} % von ${E(c)} sind gedeckt.` }]), money('e', 'Entschädigung', pay, [{ value: covered, msg: 'Versicherungssumme und Versicherungswert vergleichen: Es fehlt der aliquote Abzug.' }, { value: vs * (a + b + c) / vw, msg: 'Das Auto ist nicht gedeckt.' }]), sel(r, 'k', 'Art', 'Unterversicherung', ['Vollversicherung', 'Überversicherung'])),
      hints: ['Zuerst nur die gedeckten Teile addieren.', 'Dann: Versicherungssumme · gedeckter Schaden : Versicherungswert.'],
      solution: [`Gedeckt: ${E(a)} + ${E(b)} + ${p} % von ${E(c)} = ${E(covered)}`, `${E(vs)} < ${E(vw)} → **Unterversicherung**`, `Entschädigung = ${E(vs)} · ${E(covered)} : ${E(vw)} = **${E(pay)}**`] };
  });
  const VALUE_MC = [
    ['Was ist der Neuwert?', 'Der Preis eines neuen, gleichartigen Gegenstandes', ['Der Wert unter Berücksichtigung von Alter und Abnutzung', 'Der Kaufpreis, den man vor Jahren bezahlt hat', 'Die vereinbarte Versicherungssumme']],
    ['Was ist der Zeitwert?', 'Der Wert zum Schadenszeitpunkt, Alter und Abnutzung werden berücksichtigt', ['Der Preis eines neuen, gleichartigen Gegenstandes', 'Der Versicherungswert laut Polizze', 'Die Summe aller bezahlten Prämien']],
    ['Warum ist eine Überversicherung nicht sinnvoll?', 'Man zahlt höhere Prämien, bekommt aber trotzdem nur den tatsächlichen Schaden', ['Weil die Versicherung dann gar nichts zahlt', 'Weil der Schaden nur anteilig ersetzt wird', 'Weil sie gesetzlich verboten ist']],
    ['Wie kann eine Unterversicherung vermieden werden?', 'Mit einer Wertanpassungsklausel, die Summe und Prämie jährlich anpasst', ['Mit einem höheren Selbstbehalt', 'Mit einer Erstrisikoversicherung ohne Summe', 'Indem man den Schaden selbst bezahlt']],
    ['Warum begrenzen Versicherungen die Entschädigung gerne auf den Zeitwert?', 'Weil der Zeitwert niedriger ist und sie dann weniger zahlen müssen', ['Weil der Zeitwert immer höher ist als der Neuwert', 'Weil das Gesetz es verlangt', 'Weil der Zeitwert leichter zu schätzen ist als der Schaden']],
    ['Was bedeutet „Unterversicherungsverzicht“ in einer Polizze?', 'Die Versicherung rechnet bei einem Schaden nicht aliquot, auch wenn die Summe zu niedrig ist', ['Der Kunde verzichtet auf jede Entschädigung', 'Die Versicherung zahlt nur den Zeitwert', 'Es gibt keinen Selbstbehalt']],
    ['Wie entsteht häufig eine Überversicherung?', 'Wenn mehrere Versicherungen dasselbe Risiko abdecken', ['Wenn der Versicherungswert steigt', 'Wenn ein Selbstbehalt vereinbart ist', 'Wenn der Kunde die Prämie zu spät zahlt']],
  ];
  gen('l-werte', 'leistung', 'Neuwert, Zeitwert und Co.', 1, 3, 6, (r) => {
    const [q, right, wrong] = r.pick(VALUE_MC);
    return { kicker: 'Versicherungsleistung', ask: q, answer: mc(r, right, wrong), hints: ['Neuwert: neu kaufen. Zeitwert: was es heute noch wert ist.'], solution: [`**${right}**.`] };
  });

  // ================= Kfz-Versicherung und Bonus-Malus =================
  const BM = [50, 50, 60, 60, 70, 70, 80, 80, 100, 100, 120, 120, 140, 140, 170, 170, 200, 200];
  const clampStage = s => Math.max(0, Math.min(17, s));
  const KFZ = ['Kfz-Haftpflichtversicherung', 'Teilkaskoversicherung', 'Vollkaskoversicherung', 'Keine, den Schaden zahlt man selbst'];
  const KFZ_CASES = [
    ['Mona übersieht beim Abbiegen ein entgegenkommendes Auto. Am anderen Auto entsteht ein Schaden von € 3.200,–.', 'Kfz-Haftpflichtversicherung', 'Schäden an anderen Fahrzeugen deckt die Kfz-Haftpflicht.'],
    ['Ein Fußgänger wird bei einem Unfall verletzt, den Lukas verursacht hat.', 'Kfz-Haftpflichtversicherung', 'Schäden an anderen Personen deckt die Kfz-Haftpflicht.'],
    ['Beim Einparken fährt Sophie gegen ein Verkehrszeichen und knickt es um.', 'Kfz-Haftpflichtversicherung', 'Schäden an fremden Sachen zahlt die Kfz-Haftpflicht.'],
    ['Ein Hagelsturm verbeult das Dach des eigenen Autos.', 'Teilkaskoversicherung', 'Naturgewalten wie Hagel deckt schon die Teilkasko.'],
    ['Das Auto wird über Nacht aus der Garage gestohlen.', 'Teilkaskoversicherung', 'Diebstahl ist in der Teilkasko gedeckt.'],
    ['Auf der Landstraße springt ein Reh vor das Auto, die Front ist kaputt.', 'Teilkaskoversicherung', 'Wildunfälle deckt die Teilkasko.'],
    ['Jakob fährt bei Glatteis selbst verschuldet gegen eine Leitplanke. Sein Auto ist stark beschädigt. Er hat eine Vollkasko.', 'Vollkaskoversicherung', 'Selbstverschuldete Unfälle am eigenen Auto deckt nur die Vollkasko.'],
    ['Unbekannte zerkratzen den Lack des Autos am Parkplatz (Vandalismus). Es besteht eine Vollkasko.', 'Vollkaskoversicherung', 'Vandalismus ist nur in der Vollkasko gedeckt.'],
    ['Jan stößt beim Einparken gegen einen Baum. Der Baum bleibt heil, sein eigenes Auto ist verbeult. Er hat nur eine Kfz-Haftpflicht.', 'Keine, den Schaden zahlt man selbst', 'Die Haftpflicht zahlt nie Schäden am eigenen Auto, dafür bräuchte er eine Vollkasko.'],
    ['Eva verursacht einen Auffahrunfall. Ihr eigenes Auto ist kaputt, sie hat keine Kaskoversicherung.', 'Keine, den Schaden zahlt man selbst', 'Den Schaden am eigenen Auto trägt sie selbst, die Haftpflicht zahlt nur den Schaden des anderen.'],
  ];
  gen('k-art', 'kfz', 'Haftpflicht oder Kasko?', 1, 3, 1, (r) => {
    const [text, right, why] = r.pick(KFZ_CASES);
    return { kicker: 'Kfz-Versicherung', lead: text, ask: 'Welche Versicherung zahlt diesen Schaden?', answer: mc(r, right, KFZ.filter(x => x !== right)), hints: ['Haftpflicht: Schäden bei anderen. Teilkasko: Diebstahl, Brand, Wild, Naturgewalten. Vollkasko: zusätzlich selbstverschuldete Unfälle und Vandalismus.'], solution: [`**${right}**. ${why}`] };
  });
  gen('k-stufe', 'kfz', 'Bonus-Malus-Stufe', 1, 3, 2, (r, st) => {
    const name = r.pick(['Patrick', 'Selina', 'Murat', 'Hannah', 'Felix']);
    if (st === 1) {
      const acc = r.chance(0.5), to = acc ? 12 : 8;
      return { kicker: 'Bonus-Malus', lead: `${name} hat gerade den Führerschein gemacht und das erste Auto versichert.`, ask: acc ? 'Auf welcher Prämienstufe beginnt sie oder er, und auf welcher Stufe ist sie oder er nach einem Jahr mit einem Unfall, den die Versicherung bezahlt?' : 'Auf welcher Prämienstufe beginnt sie oder er, und auf welcher Stufe ist sie oder er nach einem schadenfreien Jahr?',
        answer: fields(num('a', 'Startstufe', 9, { d: 0, tol: 0 }), num('b', 'Stufe nach einem Jahr', to, { d: 0, tol: 0, traps: acc ? [{ value: 10, msg: 'Pro Schadensfall geht es um drei Stufen in Richtung Malus.' }, { value: 11, msg: 'Pro Schadensfall drei Stufen nach oben, nicht zwei.' }] : [{ value: 10, msg: 'Schadenfrei heißt Bonus: eine Stufe nach unten.' }] })), hints: ['Man startet bei Stufe 9.', 'Schadenfreies Jahr: −1. Jeder Schadensfall: +3.'], solution: ['Start bei **Stufe 9** (100 %).', acc ? 'Ein Schadensfall: 9 + 3 = **Stufe 12** (140 %).' : 'Schadenfrei: 9 − 1 = **Stufe 8** (100 %).'] };
    }
    const from = r.int(st === 2 ? 4 : 2, 12), years = Array.from({ length: st === 2 ? 2 : 4 }, () => r.chance(0.32) ? r.pick([1, 1, 2]) : 0);
    let s = from; const steps = [];
    for (const n of years) { const before = s; s = clampStage(n ? s + 3 * n : s - 1); steps.push(`${n ? `${n} Schadensfall${n > 1 ? 'e' : ''}: ${before} + ${3 * n}` : `schadenfrei: ${before} − 1`}${(n ? before + 3 * n : before - 1) !== s ? ' (Grenze)' : ''} = ${s}`); }
    const desc = years.map((n, i) => `Jahr ${i + 1}: ${n ? `${n} ${n > 1 ? 'Schäden' : 'Schaden'}, die die Versicherung bezahlt` : 'schadenfrei'}`).join('; ');
    const wrongNaive = years.reduce((x, n) => x + (n ? 3 : -1), from);
    return { kicker: 'Bonus-Malus', lead: `${name} ist derzeit auf Prämienstufe ${from}. ${desc}.`, ask: 'Auf welcher Stufe und bei wie viel Prozent der Grundprämie liegt die Kfz-Haftpflicht danach?',
      answer: fields(num('s', 'Stufe', s, { d: 0, tol: 0, traps: wrongNaive !== s ? [{ value: wrongNaive, msg: 'Jeder einzelne Schadensfall zählt drei Stufen.' }] : [] }), num('p', 'Prämie in % der Grundprämie', BM[s], { d: 0, tol: 0, unit: '%' })), hints: ['Schadenfrei: eine Stufe Richtung Bonus. Jeder Schadensfall: drei Stufen Richtung Malus.', 'Stufen 0–1: 50 %, 2–3: 60 %, 4–5: 70 %, 6–7: 80 %, 8–9: 100 %, 10–11: 120 %, 12–13: 140 %, 14–15: 170 %, 16–17: 200 %.'],
      solution: [...steps, `Stufe ${s} → **${BM[s]} %**`] };
  });
  gen('k-praemie', 'kfz', 'Neue Prämie nach einem Unfall', 2, 3, 3, (r, st) => {
    const s = r.int(st === 2 ? 8 : 0, st === 2 ? 11 : 11), per = r.pick(['monatlich', 'vierteljährlich', 'jährlich']), times = { monatlich: 12, vierteljährlich: 4, jährlich: 1 }[per];
    const prem = r2(r.pick([18, 24, 31, 36, 44, 52, 58, 64, 73, 80, 96]) * (per === 'vierteljährlich' ? 3 : per === 'jährlich' ? 12 : 1) * BM[s] / 100 + r.int(0, 99) / 100);
    const ns = clampStage(s + 3), year = r2(prem * times / BM[s] * BM[ns]);
    return { kicker: 'Bonus-Malus', lead: `${r.pick(['Lucia', 'Tobias', 'Amira', 'Florian'])} ist auf Prämienstufe ${s} (${BM[s]} %) und zahlt ${per} ${E(prem)} für die Kfz-Haftpflicht. Nach einem selbst verschuldeten Parkschaden lässt sie oder er den Schaden von der Versicherung bezahlen.`, ask: 'Berechne die neue Stufe und die neue jährliche Prämie.',
      answer: fields(num('s', 'Neue Stufe', ns, { d: 0, tol: 0, traps: [{ value: s + 1, msg: 'Ein Schadensfall bringt drei Stufen Richtung Malus.' }, { value: s - 1, msg: 'Mit Schaden geht es Richtung Malus, also nach oben.' }] }), money('p', 'Neue jährliche Prämie', year, [{ value: year / times, msg: `Gesucht ist die Jahresprämie: ${per} mal ${times}.` }, { value: prem * times, msg: 'Das ist die bisherige Jahresprämie.' }, { value: prem * times * BM[ns] / 100, msg: `Zuerst auf 100 % zurückrechnen: durch ${BM[s]} %, dann mal ${BM[ns]} %.` }], { tol: 0.03 })),
      hints: [`Neue Stufe: ${s} + 3.`, `Jahresprämie jetzt: ${E(prem)} · ${times}. Daraus 100 % berechnen und dann den neuen Prozentsatz nehmen.`],
      solution: [`Neue Stufe: ${s} + 3 = **${ns}** (${BM[ns]} %)`, `Jahresprämie bisher: ${E(prem)} · ${times} = ${E(prem * times)} (${BM[s]} %)`, `100 % = ${E(prem * times)} : ${BM[s]} · 100 = ${E(prem * times / BM[s] * 100)}`, `Neu: ${E(prem * times / BM[s] * 100)} · ${BM[ns]} % = **${E(year)}**`] };
  });
  // Book example: after a claim compare three years of premiums when you pay yourself or let the insurer pay.
  function bmCompare(r) {
    const s = r.int(6, 12), base = r.pick([960, 1080, 1200, 1320, 1440, 1560, 1680]), dmg = round(r.int(300, 2200), 50);
    const self = [1, 2, 3].map(y => clampStage(s - y)), ins = [1, 2, 3].map(y => clampStage(s + 3 - (y - 1)));
    const ps = self.map(x => r2(base * BM[x] / 100)), pi = ins.map(x => r2(base * BM[x] / 100));
    const ts = r2(ps.reduce((a, b) => a + b, 0) + dmg), ti = r2(pi.reduce((a, b) => a + b, 0));
    return { s, base, dmg, cur: r2(base * BM[s] / 100), self, ins, ps, pi, ts, ti, better: ts < ti ? 'Schaden selbst bezahlen' : 'Versicherung zahlen lassen' };
  }
  gen('k-vergleich', 'kfz', 'Selbst zahlen oder Versicherung?', 3, 3, 4, (r) => {
    const c = bmCompare(r), name = r.pick(['Clara', 'Benedikt', 'Ayşe', 'Oliver']);
    const grid = { title: 'Bonus-Malus-Vergleich über drei Jahre', head: ['', 'Selbst bezahlen', 'Versicherung zahlt'], rows: [
      ...[0, 1, 2].map(i => ({ label: `Jahr ${i + 1}`, cells: [{ k: `a${i}`, note: `Stufe ${c.self[i]}` }, { k: `b${i}`, note: `Stufe ${c.ins[i]}` }] })),
      { label: '+ Schaden', cells: [E(c.dmg), '€ 0,00'] }, { label: 'Gesamtbetrag', total: true, cells: [{ k: 'ts' }, { k: 'ti' }] }, { label: 'Empfehlung', cells: [{ k: 'rec', span: 2 }] },
    ] };
    const answer = fields(...[0, 1, 2].flatMap(i => [money(`a${i}`, `Jahr ${i + 1}, selbst bezahlt`, c.ps[i], [], { tol: 0.03 }), money(`b${i}`, `Jahr ${i + 1}, Versicherung zahlt`, c.pi[i], [], { tol: 0.03 })]), money('ts', 'Gesamt selbst bezahlt', c.ts, [{ value: c.ts - c.dmg, msg: 'Beim Selbstzahlen kommt der Schaden noch dazu.' }], { tol: 0.06 }), money('ti', 'Gesamt Versicherung', c.ti, [], { tol: 0.06 }), selSame('rec', 'Empfehlung', ['Schaden selbst bezahlen', 'Versicherung zahlen lassen'], c.better));
    answer.grid = grid;
    return { kicker: 'Bonus-Malus', lead: `${name} ist auf Prämienstufe ${c.s} und zahlt dafür ${E(c.cur)} im Jahr (${BM[c.s]} %). Beim Ausparken entsteht am Auto eines anderen ein Schaden von ${E(c.dmg)}. ${name} überlegt, den Schaden selbst zu zahlen, um nicht zurückgestuft zu werden. In den nächsten drei Jahren passiert kein weiterer Schaden.`,
      ask: 'Vergleiche die Kosten der nächsten drei Jahre und gib eine Empfehlung ab.', answer,
      hints: [`100 % sind ${E(c.cur)} : ${BM[c.s]} · 100 = ${E(c.base)}.`, `Selbst zahlen: jedes Jahr eine Stufe besser (${c.self.join(', ')}). Versicherung: zuerst ${c.s} + 3 = ${c.ins[0]}, dann jedes Jahr eine Stufe besser.`],
      solution: [`100 % = ${E(c.base)}`, { table: { head: 'row', rows: [['Jahr', 'Selbst: Stufe', 'Prämie', 'Versicherung: Stufe', 'Prämie'], ...[0, 1, 2].map(i => [String(i + 1), `${c.self[i]} (${BM[c.self[i]]} %)`, E(c.ps[i]), `${c.ins[i]} (${BM[c.ins[i]]} %)`, E(c.pi[i])]), ['', '+ Schaden', E(c.dmg), '', '€ 0,00'], ['Gesamt', '', E(c.ts), '', E(c.ti)]] } }, `Empfehlung: **${c.better}**, weil es um ${E(Math.abs(c.ts - c.ti))} günstiger ist.`] };
  });
  const KFZ_TF = [
    ['Die Kfz-Haftpflichtversicherung ist für alle zugelassenen Kraftfahrzeuge verpflichtend.', true, 'Ohne Haftpflicht keine Zulassung.'],
    ['Die Kaskoversicherung ist freiwillig.', true, 'Sie deckt Schäden am eigenen Auto.'],
    ['Die Kfz-Haftpflicht zahlt auch die Reparatur am eigenen Auto, wenn man den Unfall selbst verursacht hat.', false, 'Dafür braucht man eine Vollkasko.'],
    ['Die Prämie der Kfz-Haftpflicht hängt v. a. von der Motorleistung und der Bonus-Malus-Stufe ab.', true, 'Stärkere Autos und schlechtere Stufen kosten mehr.'],
    ['Das Bonus-Malus-System ist gesetzlich vorgeschrieben.', false, 'Es ist nicht vorgeschrieben, aber in den meisten Verträgen vereinbart.'],
    ['Eine Vollkasko lohnt sich vor allem bei Neuwagen.', true, 'Nach einigen Jahren rentiert sich oft ein Wechsel auf Teilkasko.'],
    ['Bei kleinen Schäden kann es sinnvoll sein, den Schaden selbst zu zahlen, um eine Rückstufung zu vermeiden.', true, 'Das Rechenbeispiel über drei Jahre zeigt, was günstiger ist.'],
    ['Bei einem Unfall mit Verletzten muss immer die Polizei gerufen werden.', true, 'Bei Personenschaden ist die Meldung Pflicht.'],
    ['Bei einem reinen Blechschaden muss immer die Polizei kommen.', false, 'Nur wenn der Gegner fehlt, sich nicht mit amtlichem Lichtbildausweis ausweisen kann oder fremdes Eigentum, eine öffentliche Einrichtung oder ein Tier betroffen ist.'],
    ['Eine Visitenkarte reicht als Ausweis des Unfallgegners.', false, 'Es braucht einen amtlichen Lichtbildausweis, sonst muss die Polizei kommen.'],
    ['Wer betrunken fährt, verletzt eine Obliegenheit und riskiert, den Schaden selbst zahlen zu müssen.', true, 'Im schlimmsten Fall verliert man den Versicherungsschutz.'],
    ['Der Europäische Unfallbericht wird vom Verursacher unverzüglich an seine Versicherung geschickt.', true, 'So wird der Unfallhergang festgehalten.'],
  ];
  gen('k-tf', 'kfz', 'Kfz: richtig oder falsch?', 1, 3, 5, (r, st) => {
    const items = r.sample(KFZ_TF, st === 1 ? 2 : st === 2 ? 3 : 4);
    return { kicker: 'Kfz-Versicherung', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Haftpflicht = Pflicht und für andere. Kasko = freiwillig und für das eigene Auto.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });
  const POLICE = [
    ['Beim Ausparken streift man ein parkendes Auto. Der Besitzer ist nicht da.', true, 'Der Unfallgegner ist nicht anwesend (Parkschaden).'],
    ['Zwei Autos haben einen Blechschaden, beide Lenker zeigen ihren Führerschein und füllen den Unfallbericht aus.', false, 'Reiner Sachschaden und beide können sich amtlich ausweisen.'],
    ['Ein Auto fährt gegen einen Gartenzaun.', true, 'Fremdes Eigentum wurde beschädigt.'],
    ['Bei einem Auffahrunfall klagt die Beifahrerin über Nackenschmerzen.', true, 'Es gibt einen Personenschaden.'],
    ['Ein Lenker fährt ein Verkehrszeichen um.', true, 'Eine öffentliche Einrichtung wurde beschädigt.'],
    ['Der Unfallgegner hat nur eine Visitenkarte dabei.', true, 'Ohne amtlichen Lichtbildausweis muss die Polizei kommen.'],
    ['Ein Reh wird angefahren.', true, 'Ein Tier kam zu Schaden.'],
  ];
  gen('k-polizei', 'kfz', 'Muss die Polizei kommen?', 2, 3, 6, (r, st) => {
    const list = r.sample(POLICE, st === 2 ? 3 : 4);
    return { kicker: 'Unfall', ask: 'Muss die Polizei verständigt werden? (Richtig = ja)', answer: tf(list), hints: ['Personenschaden: immer. Sachschaden nur, wenn der Gegner fehlt, sich nicht amtlich ausweisen kann oder fremdes Eigentum, Öffentliches oder ein Tier betroffen ist.'], solution: list.map(([t, v, w]) => `${v ? 'Ja' : 'Nein'}: ${t} ${w}`) };
  });

  // ================= Investitionen: Arten und Prozess =================
  const ANLASS = ['Neuinvestition', 'Ersatzinvestition', 'Rationalisierungsinvestition', 'Erweiterungsinvestition'];
  const ANLASS_CASES = [
    ['Eine Tischlerei ersetzt ihre defekte Kreissäge durch eine gleichartige neue.', 'Ersatzinvestition', 'Ein nicht mehr nutzbares Gerät wird gleichartig ersetzt.'],
    ['Ein Taxiunternehmen kauft ein neues Auto, weil eines nach einem Motorschaden verschrottet wird.', 'Ersatzinvestition', 'Die Leistungsfähigkeit soll erhalten bleiben.'],
    ['Eine Gründerin richtet ihr neues Nagelstudio mit Möbeln und Geräten ein.', 'Neuinvestition', 'Erstmalige Beschaffung bei der Gründung.'],
    ['Ein Café eröffnet und kauft erstmals eine Siebträgermaschine.', 'Neuinvestition', 'Erstmalige Anschaffung.'],
    ['Eine Druckerei tauscht eine alte, funktionierende Maschine gegen eine schnellere, die weniger Strom und Papier verbraucht.', 'Rationalisierungsinvestition', 'Die neue Anlage arbeitet effizienter.'],
    ['Eine Versicherung kauft eine Software, die die Buchhaltung automatisiert.', 'Rationalisierungsinvestition', 'Abläufe werden effizienter und günstiger.'],
    ['Ein Autowerk stellt einen zusätzlichen Roboter auf, um mehr Teile pro Tag zu montieren.', 'Erweiterungsinvestition', 'Die Kapazität wird vergrößert.'],
    ['Eine Supermarktkette baut eine zusätzliche Filiale in einer neuen Wohnsiedlung.', 'Erweiterungsinvestition', 'Die betriebliche Leistungsfähigkeit wird vergrößert.'],
    ['Ein Hotel baut einen zusätzlichen Wellnessbereich mit Außenpool.', 'Erweiterungsinvestition', 'Das Angebot und die Kapazität wachsen.'],
  ];
  gen('i-anlass', 'invest', 'Investitionsanlass', 1, 3, 1, (r) => {
    const [text, right, why] = r.pick(ANLASS_CASES);
    return { kicker: 'Investitionsarten', lead: text, ask: 'Um welchen Investitionsanlass handelt es sich?', answer: mc(r, right, ANLASS.filter(x => x !== right)), hints: ['Erstmals = Neu. Gleichartig ersetzt = Ersatz. Effizienter = Rationalisierung. Mehr Kapazität = Erweiterung.'], solution: [`**${right}**. ${why}`] };
  });
  const GUT = ['Sachinvestition', 'Finanzinvestition', 'Immaterielle Investition'];
  const GUT_CASES = [
    ['Ein Pharmaunternehmen investiert in die Entwicklung eines Patents.', 'Immaterielle Investition'], ['Ein Betrieb kauft eine neue Verpackungsmaschine.', 'Sachinvestition'], ['Eine GmbH kauft Aktien eines Zulieferers.', 'Finanzinvestition'],
    ['Ein Handelsunternehmen kauft eine Lizenz für eine Software.', 'Immaterielle Investition'], ['Eine Bäckerei kauft einen neuen Lieferwagen.', 'Sachinvestition'], ['Ein Unternehmen legt überschüssiges Geld in Anleihen an.', 'Finanzinvestition'],
    ['Eine Bar kauft eine Getränkeanlage.', 'Sachinvestition'], ['Ein Modelabel lässt seine Marke schützen.', 'Immaterielle Investition'], ['Ein Unternehmen beteiligt sich an einer anderen GmbH.', 'Finanzinvestition'],
  ];
  gen('i-gut', 'invest', 'Investitionsgut', 1, 3, 2, (r, st) => {
    if (st === 1) { const [text, right] = r.pick(GUT_CASES); return { kicker: 'Investitionsarten', lead: text, ask: 'Um welches Investitionsgut handelt es sich?', answer: mc(r, right, GUT.filter(x => x !== right)), hints: ['Sach: physisch. Finanz: Wertpapiere, Beteiligungen. Immateriell: Patente, Lizenzen, Marken.'], solution: [`**${right}**.`] }; }
    const [text, right, why] = r.pick(ANLASS_CASES), gut = /Software/.test(text) ? 'Immaterielle Investition' : 'Sachinvestition';
    return { kicker: 'Investitionsarten', lead: text, ask: 'Bestimme Investitionsgut und Investitionsanlass.', answer: fields(selSame('g', 'Investitionsgut', GUT, gut), selSame('a', 'Investitionsanlass', ANLASS, right)), hints: ['Zwei Fragen: Was wird gekauft? Warum wird es gekauft?'], solution: [`Investitionsgut: **${gut}**`, `Investitionsanlass: **${right}**. ${why}`] };
  });
  const PHASES = ['Investitionsplanung', 'Investitionsentscheidung', 'Durchführung der Investition', 'Kontrolle der Investition'];
  const ACTS = [
    ['Der Küchenchef meldet, dass der Herd nicht mehr repariert werden kann.', 'Investitionsplanung'], ['Es wird festgelegt, wie groß der neue Herd sein muss und welche Funktionen er braucht.', 'Investitionsplanung'], ['Die Hotelleitung holt drei Angebote ein.', 'Investitionsplanung'],
    ['Die Angebote werden mit einer Kostenvergleichsrechnung bewertet.', 'Investitionsentscheidung'], ['Es wird geprüft, ob und wie der Kauf finanziert werden kann.', 'Investitionsentscheidung'], ['Die Geschäftsführung entscheidet sich für ein Angebot.', 'Investitionsentscheidung'],
    ['Der Kaufvertrag wird abgeschlossen, die Maschine bestellt.', 'Durchführung der Investition'], ['Die Rechnung wird nach der Lieferung online bezahlt.', 'Durchführung der Investition'],
    ['Nach einem halben Jahr wird geprüft, ob die Maschine die Anforderungen erfüllt.', 'Kontrolle der Investition'], ['Der Lieferant wird bewertet, damit man ihn beim nächsten Mal wieder anfragen kann.', 'Kontrolle der Investition'],
  ];
  gen('i-phase', 'invest', 'Phasen des Investitionsprozesses', 1, 3, 3, (r, st) => {
    if (st === 1) { const [text, right] = r.pick(ACTS); return { kicker: 'Investitionsprozess', lead: text, ask: 'In welche Phase des Investitionsprozesses gehört diese Tätigkeit?', answer: mc(r, right, PHASES.filter(x => x !== right)), hints: ['Planung → Entscheidung → Durchführung → Kontrolle.'], solution: [`**${right}**.`] }; }
    if (st === 2) { const list = r.sample(ACTS, 3); return { kicker: 'Investitionsprozess', ask: 'Ordne jede Tätigkeit der richtigen Phase zu.', answer: fields(list.map(([text, right], i) => selSame(`p${i}`, text, PHASES, right))), hints: ['Bedarf, Kriterien, Angebote: Planung. Bewerten, Finanzierung prüfen, entscheiden: Entscheidung.'], solution: list.map(([t, p]) => `${t} → **${p}**`) }; }
    const opts = r.shuffle(PHASES);
    return { kicker: 'Investitionsprozess', ask: 'Bring die Phasen des Investitionsprozesses in die richtige Reihenfolge.', answer: fields(PHASES.map((p, i) => selSame(`o${i}`, `${i + 1}. Phase`, opts, p))), hints: ['Man kann erst kaufen, wenn man entschieden hat, und erst kontrollieren, wenn gekauft ist.'], solution: PHASES.map((p, i) => `${i + 1}. ${p}`) };
  });
  const CRIT = [
    ['Anschaffungskosten', 'Quantitativ'], ['Laufende Kosten pro Jahr', 'Quantitativ'], ['Erwarteter Umsatz', 'Quantitativ'], ['Gewinn', 'Quantitativ'], ['Rentabilität', 'Quantitativ'], ['Rückflussdauer des Kapitals', 'Quantitativ'], ['Platzbedarf in m²', 'Quantitativ'], ['Kapazität pro Stunde', 'Quantitativ'],
    ['Umweltfreundlichkeit', 'Qualitativ'], ['Zuverlässigkeit des Herstellers', 'Qualitativ'], ['Garantie- und Serviceleistung', 'Qualitativ'], ['Design, das den Kunden gefällt', 'Qualitativ'], ['Arbeitsschutz und Bedienkomfort', 'Qualitativ'], ['Verbesserung der Marktposition', 'Qualitativ'],
  ];
  gen('i-krit', 'invest', 'Quantitative und qualitative Kriterien', 1, 3, 4, (r, st) => {
    const list = r.sample(CRIT, st + 1), opts = ['Quantitativ', 'Qualitativ'];
    return { kicker: 'Entscheidungskriterien', ask: 'Ist das ein quantitatives oder ein qualitatives Kriterium?', answer: fields(list.map(([text, right], i) => selSame(`k${i}`, text, opts, right))), hints: ['Quantitativ = in Zahlen messbar (hard facts). Qualitativ = nicht in Zahlen fassbar (soft facts).'], solution: list.map(([t, k]) => `${t} → **${k}**`) };
  });
  // Scoring-Methode (Nutzwertanalyse) like the book's Excel (S. 71): Ergebnis = Gewichtung · Punkte, Gesamt = Summe, highest Gesamt wins.
  const SCORE = [
    { what: 'Firmen-E-Auto', a: 'Voltara S', b: 'Ecomo 5', crit: ['Anschaffungskosten in EUR', 'Reichweite', 'Ladezeit', 'Herstellergarantie', 'Kofferraum', 'Servicenetz'] },
    { what: 'Kassensystem', a: 'Kassa Plus', b: 'Bonfix', crit: ['Anschaffungskosten in EUR', 'Lizenzkosten pro Jahr', 'Bedienung', 'Schnittstellen', 'Support', 'Ausfallsicherheit'] },
    { what: 'Maturaball-Location', a: 'Clubhaus Mitte', b: 'Kongresssaal Nord', crit: ['Mietkosten in EUR', 'Kapazität in Personen', 'Lage / Erreichbarkeit', 'Ambiente', 'Technik / Ausstattung', 'Floors / Räume'] },
    { what: 'Lieferwagen', a: 'Cargoline', b: 'Transit Pro', crit: ['Anschaffungskosten in EUR', 'Amortisationsdauer in Jahren', 'Ladevolumen', 'Verbrauch', 'Herstellergarantie', 'Reparaturanfälligkeit'] },
    { what: 'Kaffeevollautomat', a: 'Crema One', b: 'Barista X', crit: ['Anschaffungskosten in EUR', 'Kosten je Tasse', 'Geschmack', 'Reinigungsaufwand', 'Kapazität', 'Herstellergarantie'] },
  ];
  // Weights in 5-%-steps, each 5–35 %, together 100 %.
  function weights(r, n) { const w = Array(n).fill(5); let rest = 100 - 5 * n; while (rest > 0) { const i = r.int(0, n - 1); if (w[i] < 35) { w[i] += 5; rest -= 5; } } return w; }
  const sum = list => list.reduce((s, x) => s + x, 0);
  // st 3: sometimes one weight is missing, sometimes the winner has fewer unweighted points (the weighting decides).
  function scoreCase(r, st = 2) {
    const twist = st === 3 && r.chance(0.5), gap = st === 3 && r.chance(0.6);
    for (let tries = 0; tries < 200; tries++) {
      const o = r.pick(SCORE), n = r.pick([5, 6]), pickRest = r.sample(o.crit.slice(1), n - 1), crit = [o.crit[0], ...o.crit.slice(1).filter(k => pickRest.includes(k))];
      const w = weights(r, n), pA = crit.map(() => r.int(1, 5)), pB = crit.map(() => r.int(1, 5));
      const eA = pA.map((p, i) => r2(w[i] * p / 100)), eB = pB.map((p, i) => r2(w[i] * p / 100)), sA = r2(sum(eA)), sB = r2(sum(eB)), rawA = sum(pA), rawB = sum(pB);
      if (Math.abs(sA - sB) < 0.1) continue;
      const aWins = sA > sB, flip = rawA !== rawB && (rawA > rawB) !== aWins;
      if (twist && !flip) continue;
      return { o, crit, w, pA, pB, eA, eB, sA, sB, rawA, rawB, miss: gap ? r.int(0, n - 1) : -1, twist: flip, win: aWins ? o.a : o.b, lose: aWins ? o.b : o.a };
    }
    return null;
  }
  const SCORE_MC = [
    ['Warum schneidet bei der Scoring-Methode eine Alternative besser ab?', 'Sie bekommt bei den hoch gewichteten Kriterien mehr Punkte', ['Sie hat die niedrigsten Anschaffungskosten', 'Sie bekommt bei den meisten Kriterien mehr Punkte, egal wie diese gewichtet sind', 'Sie hat die längste Herstellergarantie']],
    ['Welche Schritte der Scoring-Methode sollte man nicht allein durchführen?', 'Kriterien festlegen, gewichten und Punkte vergeben, am besten im Team mit Fachleuten', ['Die Ergebnisse in Excel addieren', 'Die Zahlen aus den Angeboten übernehmen', 'Das Häkchen bei der Entscheidung setzen']],
    ['Warum sollte man Gewichtung und Punkte nicht allein festlegen?', 'Die Bewertung ist subjektiv. Mehrere Personen machen sie ausgewogener', ['Weil Excel sonst falsch rechnet', 'Weil das Gesetz es verlangt', 'Weil der Lieferant die Gewichtung vorgibt']],
    ['Was ist ein Vorteil der Scoring-Methode?', 'Auch qualitative Kriterien wie Ambiente oder Service fließen in die Entscheidung ein', ['Sie liefert immer ein objektives Ergebnis', 'Sie ersetzt die Kostenvergleichsrechnung', 'Sie braucht keine Gewichtung']],
    ['Was ist ein Nachteil der Scoring-Methode?', 'Gewichtung und Punkte sind subjektiv und können das Ergebnis verzerren', ['Sie kann nur Kosten vergleichen', 'Sie funktioniert nur mit zwei Kriterien', 'Sie berücksichtigt keine qualitativen Kriterien']],
    ['Wie viel ergeben die Gewichtungen aller Kriterien zusammen?', '100 %', ['So viel wie die Summe der Punkte', '10 %', 'Das ist beliebig']],
    ['Wie berechnet man das Ergebnis eines Kriteriums?', 'Gewichtung · Punkte', ['Gewichtung + Punkte', 'Punkte : Gewichtung', 'Punkte · Anzahl der Kriterien']],
    ['Für welche Alternative entscheidet man sich bei der Scoring-Methode?', 'Für die mit dem höchsten Gesamtergebnis', ['Für die mit den meisten Punkten ohne Gewichtung', 'Für die mit dem niedrigsten Gesamtergebnis', 'Für die mit den niedrigsten Anschaffungskosten']],
  ];
  gen('i-scoring', 'invest', 'Scoring-Methode wie in Excel', 1, 3, 6, (r, st) => {
    if (st === 1) { const [q, right, wrong] = r.pick(SCORE_MC); return { kicker: 'Scoring-Methode', ask: q, answer: mc(r, right, wrong), hints: ['Ergebnis = Gewichtung · Punkte, die höchste Summe gewinnt. Gewichtung und Punkte sind subjektiv.'], solution: [`**${right}**.`] }; }
    const c = M.kit.repeat(() => scoreCase(r, st)), { o, crit, w, pA, pB } = c, miss = c.miss, others = sum(w) - (miss >= 0 ? w[miss] : 0);
    const eTraps = (i, p) => [{ value: w[i] * p, msg: `Gewichtung als Dezimalzahl: ${w[i]} % = ${dec(w[i] / 100)}.` }, { value: w[i] / 100 + p, msg: 'Gewichtung **mal** Punkte, nicht plus.' }];
    const sTraps = (P, E) => [{ value: sum(P), msg: 'Die **Ergebnisse** addieren, nicht die Punkte.' }, { value: sum(E) / E.length, msg: 'Nicht den Durchschnitt bilden: die Ergebnisse einfach addieren.' }];
    const answer = fields(
      ...(miss >= 0 ? [num('g', `Gewichtung ${crit[miss]}`, w[miss], { d: 0, unit: '%', traps: [{ value: others, msg: 'Gesucht ist der Rest auf 100 %: 100 % − Summe der anderen Gewichtungen.' }] })] : []),
      ...crit.map((k, i) => num(`a${i}`, `Ergebnis ${o.a}: ${k}`, c.eA[i], { traps: eTraps(i, pA[i]) })),
      ...crit.map((k, i) => num(`b${i}`, `Ergebnis ${o.b}: ${k}`, c.eB[i], { traps: eTraps(i, pB[i]) })),
      num('sA', `Gesamt ${o.a}`, c.sA, { traps: sTraps(pA, c.eA) }), num('sB', `Gesamt ${o.b}`, c.sB, { traps: sTraps(pB, c.eB) }),
      selSame('w', 'Entscheidung für', [o.a, o.b], c.win));
    answer.grid = { wide: true, title: `Scoring-Methode ${o.what}`, head: ['Vergleichsdaten', '', o.a, '', o.b, ''], rows: [
      { label: 'Kriterien', head: true, cells: ['Gewichtung in %', 'Punkte', 'Ergebnis', 'Punkte', 'Ergebnis'] },
      ...crit.map((k, i) => ({ label: k, cells: [i === miss ? { k: 'g' } : `${w[i]} %`, String(pA[i]), { k: `a${i}` }, String(pB[i]), { k: `b${i}` }] })),
      { label: 'Gesamt', total: true, cells: ['100 %', '', { k: 'sA' }, '', { k: 'sB' }] },
      { label: 'Entscheidung für', cells: ['', { k: 'w', span: 4 }] }] };
    const line = (name, P, S) => `**${name}**: ${crit.map((k, i) => `${dec(w[i] / 100)} · ${P[i]}`).join(' + ')} = **${dec(S)}**`;
    return { kicker: 'Scoring-Methode', lead: `Für die Auswahl „${o.what}“ werden zwei Alternativen mit der Scoring-Methode verglichen: ${o.a} und ${o.b}. Gewichtung und Punkte (1 = sehr schlecht bis 5 = sehr gut) stehen schon in der Tabelle.${miss >= 0 ? ' Bei einem Kriterium fehlt die Gewichtung.' : ''}`,
      ask: `${miss >= 0 ? 'Ergänze die fehlende Gewichtung, berechne' : 'Berechne'} die Ergebnisse und das Gesamtergebnis und entscheide dich.`, answer,
      hints: ['Ergebnis = Gewichtung · Punkte, z. B. 25 % · 4 = 0,25 · 4 = 1. In Excel: =C5*B5.', 'Gesamt = Summe der Ergebnisse, in Excel =SUMME(D5:D10). Das höhere Gesamtergebnis gewinnt.', ...(miss >= 0 ? ['Alle Gewichtungen zusammen ergeben 100 %.'] : [])],
      solution: [...(miss >= 0 ? [`Fehlende Gewichtung: 100 % − ${others} % = **${w[miss]} %**`] : []), line(o.a, pA, c.sA), line(o.b, pB, c.sB),
        `Entscheidung für **${c.win}** (höheres Gesamtergebnis)${c.twist ? `, obwohl ${c.lose} ohne Gewichtung mehr Punkte hat (${c.win === o.a ? c.rawB : c.rawA} zu ${c.win === o.a ? c.rawA : c.rawB}). Entscheidend sind die hoch gewichteten Kriterien.` : '.'}`] };
  });
  const INV_MC = [
    ['Was versteht man unter einer Investition?', 'Die Verwendung finanzieller Mittel zur Beschaffung von Vermögen', ['Die Aufnahme eines Kredits', 'Den laufenden Einkauf von Waren für den Verkauf', 'Die Zahlung der Gehälter']],
    ['Wo sieht man in der Bilanz die Investition?', 'Auf der Aktivseite als Vermögen (Mittelverwendung)', ['Auf der Passivseite als Kapital (Mittelherkunft)', 'In der Gewinn- und Verlustrechnung', 'Gar nicht']],
    ['Wo sieht man in der Bilanz die Finanzierung?', 'Auf der Passivseite als Eigen- und Fremdkapital (Mittelherkunft)', ['Auf der Aktivseite als Vermögen', 'Nur im Kassabuch', 'Unter den Forderungen']],
    ['Was kann im schlimmsten Fall aus Fehlinvestitionen folgen?', 'Die Insolvenz, also Zahlungsunfähigkeit', ['Eine höhere Liquidität', 'Ein Zuschuss vom Staat', 'Steuerfreiheit']],
    ['Was umfasst das Investitionsmanagement?', 'Planung, Entscheidung, Durchführung und Kontrolle von Investitionen', ['Nur die Bezahlung der Rechnung', 'Nur die Suche nach einem Kredit', 'Die Lohnverrechnung']],
    ['Welche Anregung für eine Investition kommt von außerhalb des Unternehmens?', 'Eine veränderte Wettbewerbssituation oder Wünsche von Kunden', ['Ein Vorschlag aus der eigenen Produktionsabteilung', 'Die strategische Ausrichtung der Geschäftsführung', 'Eine Idee eines Mitarbeiters']],
    ['Welcher Managementebene ordnet man die Festlegung langfristiger finanzieller Ziele zu?', 'Normatives Management', ['Strategisches Management', 'Operatives Management', 'Keiner']],
    ['Welche Ebene plant die Liquidität für Gehälter und Lieferantenrechnungen?', 'Operatives Management', ['Normatives Management', 'Strategisches Management', 'Die Hausbank']],
    ['Auf welcher Ebene werden Investitionsprojekte bewertet und Budgets geplant?', 'Strategisches Management', ['Normatives Management', 'Operatives Management', 'Beim Lieferanten']],
    ['Was bedeutet Liquidität?', 'Die Fähigkeit, Zahlungsverpflichtungen fristgerecht zu erfüllen', ['Der Gewinn eines Jahres', 'Das gesamte Vermögen', 'Die Verzinsung des Kapitals']],
  ];
  gen('i-wissen', 'invest', 'Investition und Finanzierung', 1, 3, 5, (r) => {
    const [q, right, wrong] = r.pick(INV_MC);
    return { kicker: 'Grundlagen', ask: q, answer: mc(r, right, wrong), hints: ['Investition = Mittelverwendung (Aktiva). Finanzierung = Mittelherkunft (Passiva).'], solution: [`**${right}**.`] };
  });

  // ================= Investitionsrechnung: data =================
  const OBJ = [
    { g: 'm', what: 'Pizzaofen', a: 'Fornara', b: 'Brixen Pro', unit: 'Pizzen', ak: [9000, 24000], q: [18000, 34000], run: [20000, 48000], price: [7, 12] },
    { g: 'm', what: 'Kaffeevollautomat', a: 'Crema One', b: 'Barista X', unit: 'Tassen', ak: [6000, 18000], q: [30000, 60000], run: [6000, 16000], price: [2.5, 4.2] },
    { g: 'f', what: 'Teigknetmaschine', a: 'Knetmax', b: 'Bäckerstolz', unit: 'kg Teig', ak: [12000, 40000], q: [60000, 140000], run: [8000, 22000], price: [0.9, 1.6] },
    { g: 'f', what: 'Etikettiermaschine', a: 'Labelo', b: 'Stickwerk', unit: 'Flaschen', ak: [15000, 55000], q: [150000, 320000], run: [9000, 26000], price: [0.25, 0.6] },
    { g: 'f', what: 'Großwaschmaschine', a: 'Cleanline', b: 'Waschkraft', unit: 'Wäscheteile', ak: [18000, 32000], q: [3000, 6000], run: [3000, 7000], price: [3, 5] },
    { g: 'm', what: '3D-Drucker', a: 'Layerpro', b: 'Printform', unit: 'Bauteile', ak: [8000, 30000], q: [4000, 12000], run: [5000, 15000], price: [4, 9] },
    { g: 'f', what: 'Verpackungsanlage', a: 'Packfix', b: 'Wrapmaster', unit: 'Pakete', ak: [40000, 120000], q: [80000, 200000], run: [25000, 70000], price: [0.8, 1.8] },
  ];
  const ARTS = { 'einen': 'eine', 'ein': 'eine', 'er': 'sie', 'einen neuen': 'eine neue', 'ein alter': 'eine alte', 'einen effizienteren': 'eine effizientere', 'seinen alten': 'seine alte' };
  const art = (o, m) => o.g === 'f' ? ARTS[m] : m, cap = s => s[0].toUpperCase() + s.slice(1);
  // One alternative: AK, RW and ND are drawn so that AfA and Zinsen come out in whole euros or cents.
  function alt(r, o, { rw = true } = {}) {
    const nd = r.pick([4, 5, 6, 8, 10]), afa = round(r.int(o.ak[0], o.ak[1]) / nd, 50), rest = rw && r.chance(0.6) ? round(afa * nd * r.pick([0.05, 0.1, 0.15, 0.2]), 100) : 0;
    const ak = afa * nd + rest, i = r.pick([3, 4, 5, 6, 8]);
    return { ak, rw: rest, nd, i, afa: (ak - rest) / nd, zins: (ak + rest) / 2 * i / 100, kap: (ak + rest) / 2 };
  }
  const zinsTraps = a => [{ value: (a.ak + a.rw) * a.i / 100, msg: 'Die kalk. Zinsen rechnet man vom **durchschnittlich** gebundenen Kapital: (AK + RW) : 2.' }, { value: a.ak * a.i / 100, msg: 'Nicht vom ganzen Anschaffungswert: Ø Kapital = (AK + RW) : 2.' }, { value: (a.ak - a.rw) / 2 * a.i / 100, msg: 'Beim durchschnittlichen Kapital wird der Restwert **addiert**, nicht abgezogen.' }, { value: a.ak / 2 * a.i / 100, msg: 'Der Restwert gehört auch ins durchschnittliche Kapital: (AK + RW) : 2.' }];
  const afaTraps = a => [{ value: a.ak / a.nd, msg: 'Zuerst den Restwert abziehen: (AK − RW) : ND.' }, { value: (a.ak + a.rw) / a.nd, msg: 'Bei der Abschreibung wird der Restwert abgezogen, nicht addiert.' }, { value: (a.ak - a.rw) * a.i / 100, msg: 'Das ist keine Abschreibung: durch die Nutzungsdauer dividieren.' }];
  const zinsTex = a => `(${E(a.ak)} + ${E(a.rw)}) : 2 · ${a.i} % = ${E(a.zins)}`;
  const afaTex = a => `(${E(a.ak)} − ${E(a.rw)}) : ${a.nd} = ${E(a.afa)}`;
  // Excel-like data rows for the grid layout.
  const dataRows = (A, B, rows) => rows.map(([label, f]) => ({ label, data: true, cells: [f(A), f(B)] }));

  // ================= Kostenvergleichsrechnung =================
  gen('kv-zins', 'kosten', 'Kalkulatorische Zinsen', 1, 3, 1, (r, st) => {
    const o = r.pick(OBJ), a = alt(r, o, { rw: st > 1 });
    return { kicker: 'Kalk. Zinsen', lead: `Für ${art(o, 'einen')} ${o.what} betragen die Anschaffungskosten ${E(a.ak)}${a.rw ? `, der Restwert nach ${a.nd} Jahren ${E(a.rw)}` : ', ein Restwert bleibt nicht'}. Der kalkulatorische Zinssatz beträgt ${a.i} % p. a.`, ask: 'Berechne das durchschnittlich gebundene Kapital und die kalkulatorischen Zinsen pro Jahr.',
      answer: fields(money('k', 'Ø gebundenes Kapital', a.kap, [{ value: a.ak + a.rw, msg: 'Noch durch 2 dividieren.' }, { value: (a.ak - a.rw) / 2, msg: 'Der Restwert wird addiert: (AK + RW) : 2.' }]), money('z', 'Kalk. Zinsen', a.zins, zinsTraps(a))),
      hints: ['Ø Kapital = (Anschaffungskosten + Restwert) : 2.', 'Kalk. Zinsen = Ø Kapital · Zinssatz.'], solution: [`Ø Kapital = (${E(a.ak)} + ${E(a.rw)}) : 2 = ${E(a.kap)}`, `Kalk. Zinsen = ${E(a.kap)} · ${a.i} % = **${E(a.zins)}**`] };
  });
  gen('kv-afa', 'kosten', 'Kalkulatorische Abschreibung', 1, 3, 2, (r, st) => {
    const o = r.pick(OBJ), a = alt(r, o, { rw: st > 1 });
    return { kicker: 'Kalk. Abschreibung', lead: `${cap(art(o, 'ein'))} ${o.what} kostet ${E(a.ak)} und wird ${a.nd} Jahre genutzt. ${a.rw ? `Danach kann ${art(o, 'er')} noch um ${E(a.rw)} verkauft werden.` : `Danach ist ${art(o, 'er')} nichts mehr wert.`}${st === 3 ? ` Der Zinssatz beträgt ${a.i} %.` : ''}`, ask: st === 3 ? 'Berechne die kalkulatorische Abschreibung und die kalkulatorischen Zinsen pro Jahr.' : 'Berechne die kalkulatorische Abschreibung pro Jahr.',
      answer: fields(money('a', 'Kalk. Abschreibung', a.afa, afaTraps(a)), ...(st === 3 ? [money('z', 'Kalk. Zinsen', a.zins, zinsTraps(a))] : [])),
      hints: ['Kalk. Abschreibung = (Anschaffungskosten − Restwert) : Nutzungsdauer.'], solution: [`Kalk. Abschreibung = ${afaTex(a)}`, ...(st === 3 ? [`Kalk. Zinsen = ${zinsTex(a)}`] : [])] };
  });
  // Full cost comparison like the Excel solution in the book: data rows, then Zinsen, AfA, Betriebskosten, Gesamtkosten (and Stückkosten).
  function costCase(r, st) {
    for (let tries = 0; tries < 60; tries++) {
      const o = r.pick(OBJ), A = alt(r, o), B = alt(r, o); B.i = A.i; B.zins = B.kap * B.i / 100;
      const varMode = st === 3 && r.chance(0.5), diffQ = st === 3 && !varMode;
      const q = round(r.int(o.q[0], o.q[1]), 100), qA = q, qB = diffQ ? round(q * r.pick([1.08, 1.12, 1.15, 1.2]), 100) : q;
      if (varMode) {
        const vA = r.pick([0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.58, 0.63]), vB = r2(vA + r.pick([-0.08, -0.05, -0.04, 0.04, 0.05, 0.08])), fA = round(r.int(300, 3000), 10), fB = round(r.int(300, 3000), 10);
        if (vB <= 0) continue;
        A.fix = fA; B.fix = fB; A.v = vA; B.v = vB; A.run = r2(fA + vA * q); B.run = r2(fB + vB * q);
      } else { A.run = round(r.int(o.run[0], o.run[1]), 100); B.run = round(A.run * r.pick([0.85, 0.9, 0.94, 1.06, 1.1, 1.15]), 100); }
      for (const X of [A, B]) X.total = r2(X.zins + X.afa + X.run);
      A.q = qA; B.q = qB; A.unit = r2(A.total / qA); B.unit = r2(B.total / qB);
      const key = diffQ ? 'unit' : 'total';
      if (Math.abs(A[key] - B[key]) / Math.max(A[key], B[key]) < 0.01 || A.unit === B.unit) continue;
      if (diffQ && (A.total < B.total) === (A.unit < B.unit)) continue; // make the per-unit view matter
      return { o, A, B, varMode, diffQ, key, win: A[key] < B[key] ? o.a : o.b };
    }
    return null;
  }
  gen('kv-voll', 'kosten', 'Kostenvergleich wie in Excel', 2, 3, 3, (r, st) => {
    const c = M.kit.repeat(() => costCase(r, st)), { o, A, B } = c;
    const data = dataRows(A, B, [['Anschaffungskosten in EUR', x => eur(x.ak)], ...(c.diffQ ? [[`Kapazität p. a. (${o.unit})`, x => int(x.q)]] : []), ['Restwert in EUR', x => eur(x.rw)], ['Nutzungsdauer in Jahren', x => String(x.nd)], ['Zinssatz p. a.', x => `${x.i} %`],
      ...(c.varMode ? [['Fixe Betriebskosten p. a. in EUR', x => eur(x.fix)], [`Variable Kosten je Stück in EUR`, x => eur(x.v)], [`Menge p. a. (${o.unit})`, x => int(x.q)]] : [['Laufende Betriebskosten in EUR', x => eur(x.run)]])]);
    const calc = [{ label: 'Kalk. Zinsen', cells: [{ k: 'zA' }, { k: 'zB' }] }, { label: 'Kalk. Abschreibung', cells: [{ k: 'aA' }, { k: 'aB' }] }, { label: 'Laufende Betriebskosten', cells: [{ k: 'rA' }, { k: 'rB' }] }, { label: 'Gesamtkosten', total: true, cells: [{ k: 'tA' }, { k: 'tB' }] }, ...(c.diffQ ? [{ label: 'Stückkosten', total: true, cells: [{ k: 'uA' }, { k: 'uB' }] }] : []), { label: 'Entscheidung für', cells: [{ k: 'w', span: 2 }] }];
    const runTraps = X => c.varMode ? [{ value: X.fix + X.v, msg: 'Die variablen Kosten je Stück mit der Menge multiplizieren.' }, { value: X.v * X.q, msg: 'Die fixen Betriebskosten kommen noch dazu.' }] : [];
    const totTraps = X => [{ value: X.total - X.zins, msg: 'Die kalk. Zinsen gehören zu den Gesamtkosten.' }, { value: X.total - X.afa, msg: 'Die kalk. Abschreibung gehört zu den Gesamtkosten.' }, { value: X.ak + X.run, msg: 'Nicht die Anschaffungskosten addieren: Gesamtkosten = Zinsen + Abschreibung + Betriebskosten.' }];
    const unitField = (k, X) => num(k, `Stückkosten ${X === A ? o.a : o.b}`, X.total / X.q, { d: X.total / X.q < 1 ? 4 : 2, unit: '€', traps: [{ value: X.total / (X === A ? B.q : A.q), msg: 'Durch die eigene Kapazität dividieren.' }] });
    const answer = fields(money('zA', `Kalk. Zinsen ${o.a}`, A.zins, zinsTraps(A)), money('zB', `Kalk. Zinsen ${o.b}`, B.zins, zinsTraps(B)), money('aA', `Kalk. Abschreibung ${o.a}`, A.afa, afaTraps(A)), money('aB', `Kalk. Abschreibung ${o.b}`, B.afa, afaTraps(B)),
      money('rA', `Betriebskosten ${o.a}`, A.run, runTraps(A)), money('rB', `Betriebskosten ${o.b}`, B.run, runTraps(B)), money('tA', `Gesamtkosten ${o.a}`, A.total, totTraps(A), { tol: 0.03 }), money('tB', `Gesamtkosten ${o.b}`, B.total, totTraps(B), { tol: 0.03 }),
      ...(c.diffQ ? [unitField('uA', A), unitField('uB', B)] : []), selSame('w', 'Entscheidung für', [o.a, o.b], c.win));
    answer.grid = { title: `Kostenvergleichsrechnung ${o.what}`, head: ['Vergleichsdaten', o.a, o.b], rows: [...data, { label: 'Kostenvergleich in EUR', head: true, cells: [o.a, o.b] }, ...calc] };
    const X2 = X => [`**${X === A ? o.a : o.b}**: Zinsen ${zinsTex(X)}; Abschreibung ${afaTex(X)}${c.varMode ? `; Betriebskosten ${E(X.fix)} + ${eur(X.v)} · ${int(X.q)} = ${E(X.run)}` : ''}; Gesamtkosten ${E(X.total)}${c.diffQ ? `; Stückkosten ${E(X.total)} : ${int(X.q)} = ${dec(X.total / X.q, X.total / X.q < 1 ? 4 : 2)} €` : ''}`];
    return { kicker: 'Kostenvergleich', lead: `Ein Betrieb braucht ${art(o, 'einen neuen')} ${o.what}. Zwei Angebote stehen zur Auswahl: ${o.a} und ${o.b}.${c.diffQ ? ' Die Kapazitäten sind unterschiedlich hoch.' : ''}`, ask: `Führe die Kostenvergleichsrechnung durch und entscheide dich${c.diffQ ? ' anhand der Stückkosten' : ''}.`, answer,
      hints: ['Kalk. Zinsen = (AK + RW) : 2 · i. Kalk. Abschreibung = (AK − RW) : ND.', c.diffQ ? 'Bei unterschiedlicher Kapazität entscheiden die **Stückkosten** = Gesamtkosten : Kapazität.' : 'Gesamtkosten = Zinsen + Abschreibung + laufende Betriebskosten. Die niedrigeren gewinnen.'],
      solution: [...X2(A), ...X2(B), `Entscheidung für **${c.win}**, weil ${c.diffQ ? 'die Stückkosten' : 'die Gesamtkosten'} niedriger sind.`] };
  });
  gen('kv-stueck', 'kosten', 'Stückkosten und Entscheidung', 1, 2, 4, (r, st) => {
    const o = r.pick(OBJ), q1 = round(r.int(o.q[0], o.q[1]), 100), q2 = round(q1 * r.pick([1.1, 1.15, 1.25]), 100);
    let t1, t2, u1, u2;
    do { t1 = round(r.int(o.run[0] * 1.2, o.run[1] * 1.3), 1) + r.int(0, 99) / 100; t2 = r2(t1 * r.pick([1.04, 1.06, 1.08, 0.97])); u1 = r2(t1 / q1); u2 = r2(t2 / q2); } while (u1 === u2 || (st === 2 && (t1 < t2) === (u1 < u2)));
    const win = u1 < u2 ? o.a : o.b, d = u1 < 1 ? 4 : 2;
    return { kicker: 'Stückkosten', lead: `Für ${art(o, 'einen')} ${o.what} ergeben sich folgende Gesamtkosten pro Jahr: ${o.a} ${E(t1)} bei einer Kapazität von ${int(q1)} ${o.unit}, ${o.b} ${E(t2)} bei ${int(q2)} ${o.unit}.`, ask: 'Berechne die Stückkosten und entscheide dich.',
      answer: fields(num('a', `Stückkosten ${o.a}`, t1 / q1, { d, unit: '€', traps: [{ value: q1 / t1, msg: 'Umgekehrt: Gesamtkosten : Menge.' }] }), num('b', `Stückkosten ${o.b}`, t2 / q2, { d, unit: '€', traps: [{ value: q2 / t2, msg: 'Umgekehrt: Gesamtkosten : Menge.' }] }), selSame('w', 'Entscheidung für', [o.a, o.b], win)),
      hints: ['Stückkosten = Gesamtkosten : Ausbringungsmenge.', 'Bei unterschiedlicher Kapazität entscheiden die Stückkosten, nicht die Gesamtkosten.'], solution: [`${o.a}: ${E(t1)} : ${int(q1)} = ${dec(t1 / q1, d)} €`, `${o.b}: ${E(t2)} : ${int(q2)} = ${dec(t2 / q2, d)} €`, `Entscheidung für **${win}** (niedrigere Stückkosten).`] };
  });
  // Kritische Menge: Fixkosten = AfA + Zinsen, variable Kosten je Einheit; RW = 0 like in the book.
  function critCase(r) {
    for (;;) {
      const nd = r.pick([8, 10, 12, 15]), i = r.pick([4, 5, 6]), ak1 = round(r.int(300, 1500), 10) * 1000, ak2 = ak1 + round(r.int(100, 700), 10) * 1000;
      const v1 = r.int(60, 160), v2 = v1 - r.int(8, 45);
      const f = ak => ({ ak, afa: ak / nd, zins: ak / 2 * i / 100, fix: ak / nd + ak / 2 * i / 100 }), m1 = f(ak1), m2 = f(ak2), crit = (m2.fix - m1.fix) / (v1 - v2);
      if (crit < 200 || crit > 9000) continue;
      const load = round(crit * r.pick([0.6, 0.75, 1.3, 1.5]), 10);
      return { nd, i, m1: { ...m1, v: v1 }, m2: { ...m2, v: v2 }, crit, load, at: load > crit ? 'Maschine 2' : 'Maschine 1' };
    }
  }
  gen('kv-krit', 'kosten', 'Kritische Menge', 2, 3, 5, (r, st) => {
    const c = critCase(r), what = r.pick(['Druckmaschine', 'Verpackungsmaschine', 'Fräsmaschine', 'Abfüllanlage']);
    const lead = `Ein Unternehmen will eine neue ${what} kaufen, die genaue Auslastung ist noch unbekannt. Maschine 1 kostet ${E(c.m1.ak)} (variable Kosten ${E(c.m1.v)} je Maschinenstunde), Maschine 2 kostet ${E(c.m2.ak)} (variable Kosten ${E(c.m2.v)} je Maschinenstunde). Beide werden ${c.nd} Jahre genutzt, kein Restwert, Zinssatz ${c.i} % p. a.`;
    const fx = [money('f1', 'Fixkosten Maschine 1 (AfA + Zinsen)', c.m1.fix, [{ value: c.m1.afa, msg: 'Die kalk. Zinsen gehören auch zu den Fixkosten.' }, { value: c.m1.afa + c.m1.ak * c.i / 100, msg: 'Zinsen vom durchschnittlichen Kapital: AK : 2 · i.' }]), money('f2', 'Fixkosten Maschine 2 (AfA + Zinsen)', c.m2.fix, [{ value: c.m2.afa, msg: 'Die kalk. Zinsen gehören auch zu den Fixkosten.' }, { value: c.m2.afa + c.m2.ak * c.i / 100, msg: 'Zinsen vom durchschnittlichen Kapital: AK : 2 · i.' }])];
    const cm = num('k', 'Kritische Menge', c.crit, { d: 2, unit: 'Stunden', traps: [{ value: (c.m1.v - c.m2.v) / (c.m2.fix - c.m1.fix), msg: 'Der Bruch steht verkehrt: oben die Fixkostendifferenz, unten die Differenz der variablen Kosten.' }, { value: (c.m2.ak - c.m1.ak) / (c.m1.v - c.m2.v), msg: 'Oben gehört die Differenz der **Fixkosten** (AfA + Zinsen), nicht der Anschaffungskosten.' }] });
    const decide = selSame('d', `Bei ${int(c.load)} Stunden pro Jahr ist günstiger`, ['Maschine 1', 'Maschine 2'], c.at);
    return { kicker: 'Kritische Menge', lead, ask: st === 2 ? 'Berechne die Fixkosten beider Maschinen und die kritische Menge.' : `Berechne Fixkosten und kritische Menge. Welche Maschine ist bei ${int(c.load)} Stunden Auslastung günstiger?`,
      answer: fields(...fx, cm, ...(st === 3 ? [decide] : [])),
      hints: ['Fixkosten pro Jahr = kalk. Abschreibung + kalk. Zinsen. Die laufenden Kosten zählen hier zu den variablen.', 'Kritische Menge = Differenz der Fixkosten : Differenz der variablen Kosten je Einheit (immer größer minus kleiner).', 'Über der kritischen Menge gewinnt die Maschine mit den niedrigeren variablen Kosten.'],
      solution: [`Maschine 1: ${E(c.m1.ak)} : ${c.nd} = ${E(c.m1.afa)}; ${E(c.m1.ak)} : 2 · ${c.i} % = ${E(c.m1.zins)} → Fixkosten ${E(c.m1.fix)}`, `Maschine 2: ${E(c.m2.ak)} : ${c.nd} = ${E(c.m2.afa)}; ${E(c.m2.ak)} : 2 · ${c.i} % = ${E(c.m2.zins)} → Fixkosten ${E(c.m2.fix)}`, `Kritische Menge = (${E(c.m2.fix)} − ${E(c.m1.fix)}) : (${E(c.m1.v)} − ${E(c.m2.v)}) = **${dec(c.crit)} Stunden**`, `Unter ${dec(c.crit)} Stunden ist Maschine 1 günstiger (niedrigere Fixkosten), darüber Maschine 2 (niedrigere variable Kosten).${st === 3 ? ` Bei ${int(c.load)} Stunden: **${c.at}**.` : ''}`] };
  });
  const COST_TF = [
    ['Die Kostenvergleichsrechnung ist rasch durchgeführt und braucht nur wenige Daten.', true, 'Das sind ihre Vorteile.'],
    ['Die Kostenvergleichsrechnung berücksichtigt die Erlöse der Investitionen.', false, 'Erlöse kommen erst in der Gewinnvergleichsrechnung vor.'],
    ['Die Kostenvergleichsrechnung berücksichtigt den Zeitwert des Geldes.', false, 'Sie rechnet mit Durchschnittswerten einer Periode.'],
    ['Sind die Kapazitäten verschieden, vergleicht man die Stückkosten.', true, 'Gesamtkosten : Ausbringungsmenge.'],
    ['Die kalkulatorischen Zinsen werden vom durchschnittlich gebundenen Kapital berechnet.', true, '(AK + RW) : 2 · i.'],
    ['Die teurere Alternative hat oft höhere Fixkosten, aber niedrigere variable Kosten.', true, 'Deshalb gibt es eine kritische Menge.'],
    ['Liegt die Auslastung über der kritischen Menge, ist die Alternative mit den niedrigeren Fixkosten günstiger.', false, 'Darüber geben die niedrigeren variablen Kosten den Ausschlag.'],
    ['Bei der kritischen Menge sind die Gesamtkosten beider Alternativen gleich hoch.', true, 'Darum heißt sie auch Indifferenzmenge.'],
    ['Statische Verfahren arbeiten mit Durchschnittswerten einer Periode.', true, 'Kosten und Erlöse schwanken in Wirklichkeit, das kann zu Fehlprognosen führen.'],
  ];
  gen('kv-tf', 'kosten', 'Beurteilung der Kostenvergleichsrechnung', 1, 3, 6, (r, st) => {
    const items = r.sample(COST_TF, st === 1 ? 2 : st === 2 ? 3 : 4);
    return { kicker: 'Kostenvergleich', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Die Kostenvergleichsrechnung kennt nur Kosten, keine Erlöse und keinen Zeitwert.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Gewinnvergleichsrechnung =================
  gen('gv-einfach', 'gewinn', 'Gewinn = Erlöse − Kosten', 1, 2, 1, (r, st) => {
    const names = r.pick([['Investition X', 'Investition Y'], ['Anlage A', 'Anlage B'], ['Variante 1', 'Variante 2']]);
    let e1, e2, k1, k2;
    do { e1 = round(r.int(60, 400), 5) * 1000; e2 = round(e1 * r.pick([1.08, 1.12, 1.2, 1.3]), 1000); k1 = round(e1 * r.pick([0.6, 0.7, 0.75, 0.8]), 500); k2 = round(e2 * r.pick([0.72, 0.78, 0.82, 0.86]), 500); } while (e1 - k1 === e2 - k2 || (st === 2 && (e2 - k2 > e1 - k1)));
    const g1 = e1 - k1, g2 = e2 - k2, win = g1 > g2 ? names[0] : names[1];
    return { kicker: 'Gewinnvergleich', table: { head: 'row', rows: [['', names[0], names[1]], ['Erlöse pro Jahr', E(e1), E(e2)], ['Gesamtkosten pro Jahr', E(k1), E(k2)]] }, ask: 'Berechne die Gewinne und entscheide dich nach der Gewinnvergleichsrechnung.',
      answer: fields(money('a', `Gewinn ${names[0]}`, g1, [{ value: e1 + k1, msg: 'Gewinn = Erlöse **minus** Kosten.' }]), money('b', `Gewinn ${names[1]}`, g2, [{ value: e2 + k2, msg: 'Gewinn = Erlöse **minus** Kosten.' }]), selSame('w', 'Entscheidung für', names, win)),
      hints: ['Gewinn = Erlöse − Gesamtkosten.', 'Nicht der höhere Umsatz entscheidet, sondern der höhere Gewinn.'], solution: [`${names[0]}: ${E(e1)} − ${E(k1)} = ${E(g1)}`, `${names[1]}: ${E(e2)} − ${E(k2)} = ${E(g2)}`, `Entscheidung für **${win}**${st === 2 ? ', obwohl der Umsatz niedriger ist' : ''}.`] };
  });
  function profitCase(r, st) {
    for (let tries = 0; tries < 80; tries++) {
      const o = r.pick(OBJ), A = alt(r, o), B = alt(r, o); B.i = A.i; B.zins = B.kap * B.i / 100;
      const price = r2(r.range(o.price, 2)), q = round(r.int(o.q[0], o.q[1]), 100);
      const perUnit = st === 3;
      A.q = q; B.q = round(q * r.pick([0.85, 0.9, 1.1, 1.15, 1.2]), 100);
      A.price = price; B.price = perUnit && r.chance(0.3) ? r2(price * 1.05) : price;
      if (perUnit) { A.fix = round(r.int(500, 4000), 10); B.fix = round(r.int(500, 4000), 10); A.v = r2(price * r.pick([0.3, 0.4, 0.5, 0.55])); B.v = r2(price * r.pick([0.3, 0.4, 0.5, 0.55])); A.run = r2(A.fix + A.v * A.q); B.run = r2(B.fix + B.v * B.q); }
      else { A.run = round(price * q * r.pick([0.5, 0.6, 0.7]), 100); B.run = round(A.run * B.q / A.q * r.pick([0.95, 1, 1.05]), 100); }
      for (const X of [A, B]) { X.rev = r2(X.price * X.q); X.cost = r2(X.zins + X.afa + X.run); X.g = r2(X.rev - X.cost); }
      if (A.g <= 0 || B.g <= 0 || Math.abs(A.g - B.g) / Math.max(A.g, B.g) < 0.02) continue;
      return { o, A, B, perUnit, win: A.g > B.g ? o.a : o.b };
    }
    return null;
  }
  gen('gv-voll', 'gewinn', 'Gewinnvergleich wie in Excel', 2, 3, 2, (r, st) => {
    const c = M.kit.repeat(() => profitCase(r, st)), { o, A, B } = c;
    const data = dataRows(A, B, [['Anschaffungskosten in EUR', x => eur(x.ak)], [`Kapazität p. a. (${o.unit})`, x => int(x.q)], ['Restwert in EUR', x => eur(x.rw)], ['Nutzungsdauer in Jahren', x => String(x.nd)], ['Zinssatz p. a.', x => `${x.i} %`],
      ...(c.perUnit ? [['Fixe Betriebskosten p. a. in EUR', x => eur(x.fix)], ['Variable Kosten je Stück in EUR', x => eur(x.v)]] : [['Laufende Betriebskosten in EUR', x => eur(x.run)]]), [`Erlös je Stück in EUR`, x => eur(x.price)]]);
    const answer = fields(money('eA', `Erlöse ${o.a}`, A.rev, [{ value: A.price * B.q, msg: 'Mit der eigenen Kapazität multiplizieren.' }]), money('eB', `Erlöse ${o.b}`, B.rev, [{ value: B.price * A.q, msg: 'Mit der eigenen Kapazität multiplizieren.' }]), money('zA', `Kalk. Zinsen ${o.a}`, A.zins, zinsTraps(A)), money('zB', `Kalk. Zinsen ${o.b}`, B.zins, zinsTraps(B)), money('aA', `Kalk. Abschreibung ${o.a}`, A.afa, afaTraps(A)), money('aB', `Kalk. Abschreibung ${o.b}`, B.afa, afaTraps(B)),
      money('rA', `Betriebskosten ${o.a}`, A.run, c.perUnit ? [{ value: A.fix + A.v, msg: 'Variable Kosten je Stück mal Kapazität.' }] : []), money('rB', `Betriebskosten ${o.b}`, B.run, c.perUnit ? [{ value: B.fix + B.v, msg: 'Variable Kosten je Stück mal Kapazität.' }] : []),
      money('gA', `Gewinn ${o.a}`, A.g, [{ value: A.rev - A.run, msg: 'Zinsen und Abschreibung sind auch Kosten.' }, { value: A.rev - A.cost - A.ak, msg: 'Die Anschaffungskosten stecken schon in der Abschreibung.' }], { tol: 0.03 }), money('gB', `Gewinn ${o.b}`, B.g, [{ value: B.rev - B.run, msg: 'Zinsen und Abschreibung sind auch Kosten.' }, { value: B.rev - B.cost - B.ak, msg: 'Die Anschaffungskosten stecken schon in der Abschreibung.' }], { tol: 0.03 }), selSame('w', 'Entscheidung für', [o.a, o.b], c.win));
    answer.grid = { title: `Gewinnvergleichsrechnung ${o.what}`, head: ['Vergleichsdaten', o.a, o.b], rows: [...data, { label: 'Gewinnvergleich in EUR', head: true, cells: [o.a, o.b] }, { label: 'Erlöse', cells: [{ k: 'eA' }, { k: 'eB' }] }, { label: 'Kosten', sub: true, cells: ['', ''] }, { label: '− Kalk. Zinsen', cells: [{ k: 'zA' }, { k: 'zB' }] }, { label: '− Kalk. Abschreibung', cells: [{ k: 'aA' }, { k: 'aB' }] }, { label: '− Laufende Betriebskosten', cells: [{ k: 'rA' }, { k: 'rB' }] }, { label: 'Gewinn', total: true, cells: [{ k: 'gA' }, { k: 'gB' }] }, { label: 'Entscheidung für', cells: [{ k: 'w', span: 2 }] }] };
    const sol = X => `**${X === A ? o.a : o.b}**: Erlöse ${eur(X.price)} · ${int(X.q)} = ${E(X.rev)}; Zinsen ${E(X.zins)}; Abschreibung ${E(X.afa)}; Betriebskosten ${E(X.run)}; Gewinn ${E(X.rev)} − ${E(X.cost)} = ${E(X.g)}`;
    return { kicker: 'Gewinnvergleich', lead: `Für ${art(o, 'einen neuen')} ${o.what} stehen zwei Angebote zur Wahl. Kapazität${A.price !== B.price ? ' und Qualität sind' : ' ist'} unterschiedlich, deshalb wird eine Gewinnvergleichsrechnung gemacht.`, ask: 'Führe die Gewinnvergleichsrechnung durch und entscheide dich.', answer,
      hints: ['Erlöse = Erlös je Stück · Kapazität.', 'Gewinn = Erlöse − (kalk. Zinsen + kalk. Abschreibung + laufende Betriebskosten).'], solution: [sol(A), sol(B), `Entscheidung für **${c.win}** (höherer Gewinn).`] };
  });
  const PROFIT_TF = [
    ['Die Gewinnvergleichsrechnung erweitert die Kostenvergleichsrechnung um die Erlöse.', true, 'Gewinn = Erlöse − Gesamtkosten.'],
    ['Man verwendet sie, wenn die Kapazität oder die Qualität der Alternativen verschieden ist.', true, 'Dann sind unterschiedliche Verkaufspreise oder Mengen möglich.'],
    ['Der Gewinn allein zeigt, wie gut sich das eingesetzte Kapital verzinst.', false, 'Dafür braucht man die Rentabilitätsvergleichsrechnung.'],
    ['Die Gewinnvergleichsrechnung berücksichtigt den Zeitwert des Geldes.', false, 'Sie arbeitet mit Durchschnittswerten einer Periode.'],
    ['Die Erlöse lassen sich einer Investition nicht immer klar zurechnen.', true, 'Das ist ein Nachteil des Verfahrens.'],
    ['Die Alternative mit dem höchsten Umsatz ist immer die beste.', false, 'Es entscheidet der höchste Gewinn.'],
  ];
  gen('gv-tf', 'gewinn', 'Beurteilung der Gewinnvergleichsrechnung', 1, 3, 3, (r, st) => {
    const items = r.sample(PROFIT_TF, st === 1 ? 2 : st === 2 ? 3 : 4);
    return { kicker: 'Gewinnvergleich', ask: 'Richtig oder falsch?', answer: tf(items), hints: ['Gewinn ja, Kapitaleinsatz und Zeitwert nein.'], solution: items.map(([t, v, w]) => `${v ? 'Richtig' : 'Falsch'}: ${t} ${w}`) };
  });

  // ================= Rentabilität und Amortisation =================
  gen('ra-renta', 'renta', 'Rentabilität berechnen', 1, 3, 1, (r, st) => {
    const o = r.pick(OBJ), a = alt(r, o), g = round(a.kap * r.pick([0.08, 0.12, 0.15, 0.2, 0.3, 0.45, 0.6]), 10) + r.pick([0, 0, 50]);
    if (st === 1) {
      const kap = round(r.int(40, 400), 5) * 1000, gg = round(kap * r.pick([0.06, 0.08, 0.1, 0.12, 0.15, 0.18, 0.2]), 100), z = round(kap * r.pick([0.03, 0.04, 0.05]), 10), rent = (gg + z) * 100 / kap;
      return { kicker: 'Rentabilität', lead: `Eine Investition bringt einen durchschnittlichen Gewinn von ${E(gg)} pro Jahr. Die kalkulatorischen Zinsen betragen ${E(z)}, der durchschnittliche Kapitaleinsatz ${E(kap)}.`, ask: 'Berechne die Rentabilität.',
        answer: fields(num('r', 'Rentabilität', rent, { unit: '%', traps: [{ value: gg * 100 / kap, msg: 'Das wäre die vereinfachte Formel. Laut Buch kommen die kalk. Zinsen zum Gewinn dazu: (Gewinn + Zinsen) · 100 : Ø Kapital.' }, { value: kap / (gg + z), msg: 'Der Bruch steht verkehrt.' }] })),
        hints: ['Rentabilität = (Gewinn + kalk. Zinsen) · 100 : Ø Kapitaleinsatz.'], solution: [`(${E(gg)} + ${E(z)}) · 100 : ${E(kap)} = **${dec(rent)} %**`] };
    }
    const simple = st === 3 && r.chance(0.25), rent = (simple ? g : g + a.zins) * 100 / a.kap;
    return { kicker: 'Rentabilität', lead: `${cap(art(o, 'ein'))} ${o.what} kostet ${E(a.ak)}, Restwert ${E(a.rw)}, Nutzungsdauer ${a.nd} Jahre, Zinssatz ${a.i} %. ${cap(art(o, 'er'))} bringt einen durchschnittlichen Jahresgewinn von ${E(g)}.${simple ? ' Rechne mit der **vereinfachten Formel** ohne kalkulatorische Zinsen.' : ''}`, ask: 'Berechne den durchschnittlichen Kapitaleinsatz, die kalkulatorischen Zinsen und die Rentabilität.',
      answer: fields(money('k', 'Ø Kapitaleinsatz', a.kap, [{ value: a.ak, msg: 'Durchschnittlich: (AK + RW) : 2.' }, { value: (a.ak - a.rw) / 2, msg: 'Der Restwert wird addiert.' }]), money('z', 'Kalk. Zinsen', a.zins, zinsTraps(a)), num('r', 'Rentabilität', rent, { unit: '%', traps: simple ? [{ value: (g + a.zins) * 100 / a.kap, msg: 'Hier ist die vereinfachte Formel verlangt: nur Gewinn · 100 : Ø Kapital.' }] : [{ value: g * 100 / a.kap, msg: 'Die kalk. Zinsen gehören zum Gewinn dazu: (Gewinn + Zinsen) · 100 : Ø Kapital.' }, { value: (g + a.zins) * 100 / a.ak, msg: 'Durch den **durchschnittlichen** Kapitaleinsatz dividieren, nicht durch die Anschaffungskosten.' }] })),
      hints: ['Ø Kapitaleinsatz = (AK + RW) : 2.', simple ? 'Vereinfacht: Rentabilität = Gewinn · 100 : Ø Kapitaleinsatz.' : 'Rentabilität = (Gewinn + kalk. Zinsen) · 100 : Ø Kapitaleinsatz.'],
      solution: [`Ø Kapitaleinsatz = (${E(a.ak)} + ${E(a.rw)}) : 2 = ${E(a.kap)}`, `Kalk. Zinsen = ${E(a.kap)} · ${a.i} % = ${E(a.zins)}`, simple ? `Rentabilität = ${E(g)} · 100 : ${E(a.kap)} = **${dec(rent)} %**` : `Rentabilität = (${E(g)} + ${E(a.zins)}) · 100 : ${E(a.kap)} = **${dec(rent)} %**`] };
  });
  gen('ra-ersparnis', 'renta', 'Rentabilität bei Kostenersparnis', 2, 3, 2, (r, st) => {
    const o = r.pick(OBJ), a = alt(r, o), save = round(a.kap * r.pick([0.1, 0.15, 0.2, 0.25, 0.3]), 10), rent = save * 100 / a.kap, am = (a.ak - a.rw) / save;
    return { kicker: 'Rationalisierung', lead: `${cap(art(o, 'ein alter'))} ${o.what} wird durch ${art(o, 'einen effizienteren')} ersetzt. Die neue Maschine bringt keinen zusätzlichen Erlös, spart aber jährlich ${E(save)} an Kosten. Anschaffungskosten ${E(a.ak)}, Restwert ${E(a.rw)}, Nutzungsdauer ${a.nd} Jahre, Zinssatz ${a.i} %.`, ask: st === 2 ? 'Berechne die Rentabilität der Rationalisierungsinvestition.' : 'Berechne die Rentabilität und die Amortisationsdauer.',
      answer: fields(num('r', 'Rentabilität', rent, { unit: '%', traps: [{ value: (save + a.zins) * 100 / a.kap, msg: 'Bei Kostenersparnis werden die Zinsen **nicht** dazugezählt: Ersparnis · 100 : Ø Kapital.' }, { value: save * 100 / a.ak, msg: 'Durch den durchschnittlichen Kapitaleinsatz (AK + RW) : 2 dividieren.' }] }), ...(st === 3 ? [num('j', 'Amortisationsdauer', am, { unit: 'Jahre', traps: [{ value: a.ak / save, msg: 'Zuerst den Restwert abziehen: (AK − RW) : Ersparnis.' }, { value: (a.ak - a.rw) / (save + a.afa), msg: 'Bei Rationalisierung: (AK − RW) : jährliche Kostenersparnis, ohne Abschreibung.' }] })] : [])),
      hints: ['Rentabilität = Kostenersparnis · 100 : Ø Kapitaleinsatz. Die Zinsen kommen hier nicht dazu, weil die Verzinsung erst ermittelt wird.', 'Amortisationsdauer = (AK − RW) : jährliche Kostenersparnis.'],
      solution: [`Ø Kapitaleinsatz = (${E(a.ak)} + ${E(a.rw)}) : 2 = ${E(a.kap)}`, `Rentabilität = ${E(save)} · 100 : ${E(a.kap)} = **${dec(rent)} %**`, ...(st === 3 ? [`Amortisationsdauer = (${E(a.ak)} − ${E(a.rw)}) : ${E(save)} = **${dec(am)} Jahre**`] : [])] };
  });
  gen('ra-amort', 'renta', 'Amortisationsdauer', 1, 3, 3, (r, st) => {
    if (st === 1) {
      const back = round(r.int(10, 80), 1) * 1000, n = r.pick([2, 2.5, 3, 4, 5, 6]), ak = back * n;
      return { kicker: 'Amortisation', lead: `Eine Investition kostet ${E(ak)} und hat keinen Restwert. Der jährliche Rückfluss (Gewinn + Abschreibung) beträgt ${E(back)}.`, ask: 'Nach wie vielen Jahren hat sich die Investition amortisiert?',
        answer: fields(num('j', 'Amortisationsdauer', n, { unit: 'Jahre', traps: [{ value: back / ak, msg: 'Der Bruch steht verkehrt: Kapital : Rückfluss.' }] })), hints: ['Amortisationsdauer = (AK − RW) : jährlicher Rückfluss.'], solution: [`${E(ak)} : ${E(back)} = **${dec(n)} Jahre**`] };
    }
    let o, a, g;
    do { o = r.pick(OBJ); a = alt(r, o); g = round((a.ak - a.rw) / r.pick([2, 2.5, 3, 3.5, 4]) - a.afa, 10); } while (g <= 0);
    const n = (a.ak - a.rw) / (g + a.afa);
    return { kicker: 'Amortisation', lead: `${cap(art(o, 'ein'))} ${o.what} kostet ${E(a.ak)}, der Restwert nach ${a.nd} Jahren beträgt ${E(a.rw)}. ${cap(art(o, 'er'))} bringt einen durchschnittlichen Jahresgewinn von ${E(g)}.`, ask: 'Berechne die kalkulatorische Abschreibung und die Amortisationsdauer.',
      answer: fields(money('a', 'Kalk. Abschreibung', a.afa, afaTraps(a)), num('j', 'Amortisationsdauer', n, { unit: 'Jahre', traps: [{ value: (a.ak - a.rw) / g, msg: 'Die Abschreibung fließt auch zurück: Nenner = Gewinn + Abschreibung.' }, { value: a.ak / (g + a.afa), msg: 'Im Zähler steht AK − RW.' }] })),
      hints: ['Kalk. Abschreibung = (AK − RW) : ND.', 'Amortisationsdauer = (AK − RW) : (jährlicher Gewinn + kalk. Abschreibung).'], solution: [`Kalk. Abschreibung = ${afaTex(a)}`, `Amortisationsdauer = (${E(a.ak)} − ${E(a.rw)}) : (${E(g)} + ${E(a.afa)}) = **${dec(n)} Jahre**`] };
  });
  function fullCase(r) {
    for (let tries = 0; tries < 80; tries++) {
      const o = r.pick(OBJ), A = alt(r, o), B = alt(r, o); B.i = A.i; B.zins = B.kap * B.i / 100; B.nd = A.nd; B.afa = (B.ak - B.rw) / B.nd;
      for (const X of [A, B]) { X.fix = round(r.int(1500, 6000), 100); X.var = round(r.int(4000, 16000), 100); X.cost = r2(X.afa + X.zins + X.fix + X.var); X.rev = round(X.cost * r.pick([1.2, 1.3, 1.4, 1.5, 1.6]), 1000); X.g = r2(X.rev - X.cost); X.rent = (X.g + X.zins) * 100 / X.kap; X.am = (X.ak - X.rw) / (X.g + X.afa); }
      if (Math.abs(A.rent - B.rent) < 1 || Math.abs(A.g - B.g) < 200) continue;
      return { o, A, B, win: A.rent > B.rent ? o.a : o.b };
    }
    return null;
  }
  gen('ra-voll', 'renta', 'Alle Verfahren an einem Fall', 3, 3, 4, (r) => {
    const c = M.kit.repeat(() => fullCase(r)), { o, A, B } = c;
    const data = dataRows(A, B, [['Anschaffungskosten in EUR', x => eur(x.ak)], ['Restwert in EUR', x => eur(x.rw)], ['Nutzungsdauer in Jahren', x => String(x.nd)], ['Zinssatz p. a.', x => `${x.i} %`], ['Fixe Kosten p. a. in EUR', x => eur(x.fix)], ['Variable Kosten p. a. in EUR', x => eur(x.var)], ['Erlöse p. a. in EUR', x => eur(x.rev)]]);
    const answer = fields(money('cA', `Gesamtkosten ${o.a}`, A.cost, [{ value: A.fix + A.var, msg: 'Kalk. Zinsen und Abschreibung fehlen.' }], { tol: 0.03 }), money('cB', `Gesamtkosten ${o.b}`, B.cost, [{ value: B.fix + B.var, msg: 'Kalk. Zinsen und Abschreibung fehlen.' }], { tol: 0.03 }), money('gA', `Gewinn ${o.a}`, A.g, [], { tol: 0.03 }), money('gB', `Gewinn ${o.b}`, B.g, [], { tol: 0.03 }),
      num('rA', `Rentabilität ${o.a}`, A.rent, { unit: '%', traps: [{ value: A.g * 100 / A.kap, msg: 'Laut Buch: (Gewinn + kalk. Zinsen) · 100 : Ø Kapital.' }] }), num('rB', `Rentabilität ${o.b}`, B.rent, { unit: '%', traps: [{ value: B.g * 100 / B.kap, msg: 'Laut Buch: (Gewinn + kalk. Zinsen) · 100 : Ø Kapital.' }] }),
      num('mA', `Amortisation ${o.a}`, A.am, { unit: 'Jahre', traps: [{ value: (A.ak - A.rw) / A.g, msg: 'Nenner: Gewinn + Abschreibung.' }] }), num('mB', `Amortisation ${o.b}`, B.am, { unit: 'Jahre', traps: [{ value: (B.ak - B.rw) / B.g, msg: 'Nenner: Gewinn + Abschreibung.' }] }), selSame('w', 'Höhere Rentabilität', [o.a, o.b], c.win));
    answer.grid = { title: `Investitionsrechnung ${o.what}`, head: ['Vergleichsdaten', o.a, o.b], rows: [...data, { label: 'Auswertung', head: true, cells: [o.a, o.b] }, { label: 'Gesamtkosten in EUR', cells: [{ k: 'cA' }, { k: 'cB' }] }, { label: 'Gewinn in EUR', cells: [{ k: 'gA' }, { k: 'gB' }] }, { label: 'Rentabilität in %', total: true, cells: [{ k: 'rA' }, { k: 'rB' }] }, { label: 'Amortisationsdauer in Jahren', total: true, cells: [{ k: 'mA' }, { k: 'mB' }] }, { label: 'Höhere Rentabilität', cells: [{ k: 'w', span: 2 }] }] };
    const sol = X => `**${X === A ? o.a : o.b}**: Abschreibung ${E(X.afa)}, Zinsen ${E(X.zins)}, Gesamtkosten ${E(X.cost)}; Gewinn ${E(X.rev)} − ${E(X.cost)} = ${E(X.g)}; Rentabilität (${E(X.g)} + ${E(X.zins)}) · 100 : ${E(X.kap)} = ${dec(X.rent)} %; Amortisation (${E(X.ak)} − ${E(X.rw)}) : (${E(X.g)} + ${E(X.afa)}) = ${dec(X.am)} Jahre`;
    return { kicker: 'Fallstudie', lead: `Ein Betrieb ersetzt ${art(o, 'seinen alten')} ${o.what}. Beide Angebote erfüllen die technischen Anforderungen.`, ask: 'Berechne Gesamtkosten, Gewinn, Rentabilität und Amortisationsdauer beider Angebote.', answer,
      hints: ['Gesamtkosten = kalk. Abschreibung + kalk. Zinsen + fixe + variable Kosten.', 'Rentabilität = (Gewinn + Zinsen) · 100 : Ø Kapital. Amortisation = (AK − RW) : (Gewinn + AfA).'], solution: [sol(A), sol(B), `Höhere Rentabilität: **${c.win}**. Entscheiden sollte man trotzdem erst nach mehreren Kennzahlen und qualitativen Kriterien wie Service, Energieverbrauch oder Platzbedarf.`] };
  });
  // Rentabilitätsvergleich gegen Fremdbezug (Buchtyp: eigenes Gerät statt externem Dienstleister). Gewinn = Fremdbezugskosten − eigene Gesamtkosten.
  const FREMD = [
    { what: 'Farblaserdrucker', firm: 'Eine Steuerberatungskanzlei', buy: 'einen eigenen Farblaserdrucker', a: 'Colorjet 610', b: 'Printline 85', one: 'Ausdruck', many: 'Ausdrucke', ext: 'Bisher lässt sie alles im Copyshop drucken', ak: [900, 2400], fix: [200, 600], v: [0.4, 0.7], gap: [0.12, 0.35], q: [4000, 8000] },
    { what: 'Kaffeevollautomat', firm: 'Ein Büro mit 40 Beschäftigten', buy: 'einen eigenen Kaffeevollautomaten', a: 'Crema One', b: 'Barista X', one: 'Tasse', many: 'Tassen', ext: 'Bisher liefert ein Automatenaufsteller den Kaffee', ak: [3000, 9000], fix: [300, 900], v: [0.15, 0.35], gap: [0.25, 0.5], q: [6000, 14000] },
    { what: 'Großwaschmaschine', firm: 'Ein Hotel', buy: 'eine eigene Großwaschmaschine', a: 'Cleanline', b: 'Waschkraft', one: 'Wäscheteil', many: 'Wäscheteile', ext: 'Bisher wäscht eine externe Wäscherei', ak: [12000, 30000], fix: [800, 2500], v: [0.3, 0.7], gap: [0.4, 0.9], q: [12000, 25000] },
    { what: '3D-Drucker', firm: 'Ein Technikbüro', buy: 'einen eigenen 3D-Drucker', a: 'Layerpro', b: 'Printform', one: 'Bauteil', many: 'Bauteile', ext: 'Bisher lässt es die Bauteile bei einem Dienstleister drucken', ak: [8000, 24000], fix: [600, 2000], v: [1.5, 3.5], gap: [1.5, 3], q: [2000, 5000] },
  ];
  // Both offers share ND, Zinssatz and quantity like in the book; st 3 sometimes makes the cheaper offer lose on Rentabilität.
  function fremdCase(r, st = 2) {
    const twist = st === 3 && r.chance(0.5);
    for (let tries = 0; tries < 120; tries++) {
      const o = r.pick(FREMD), nd = r.pick([4, 5, 6, 8]), i = r.pick([3, 4, 5, 6, 8]), q = round(r.int(o.q[0], o.q[1]), 100);
      const one = () => { const afa = round(r.int(o.ak[0], o.ak[1]) / nd, 10), rw = r.chance(0.6) ? round(afa * nd * r.pick([0.05, 0.1, 0.15, 0.2]), 10) : 0; return { ak: afa * nd + rw, rw, nd, i, afa, kap: (afa * nd + 2 * rw) / 2 }; };
      const A = one(), B = one();
      A.v = r.range(o.v, 2); B.v = r2(A.v * r.pick([0.85, 0.9, 0.93, 1.07, 1.1, 1.15]));
      A.fix = round(r.int(o.fix[0], o.fix[1]), 10); B.fix = round(r.int(o.fix[0], o.fix[1]), 10);
      const p = r2(Math.max(A.v, B.v) + r.range(o.gap, 2)), ext = r2(p * q);
      for (const X of [A, B]) { X.q = q; X.zins = X.kap * i / 100; X.run = r2(X.fix + X.v * q); X.total = r2(X.zins + X.afa + X.run); X.g = r2(ext - X.total); X.rent = (X.g + X.zins) * 100 / X.kap; X.am = (X.ak - X.rw) / (X.g + X.afa); }
      if (A.g <= 0 || B.g <= 0 || Math.abs(A.rent - B.rent) < 1 || Math.abs(A.g - B.g) < 20 || Math.max(A.rent, B.rent) > 250) continue;
      const cheap = A.total < B.total ? 'A' : 'B', best = A.rent > B.rent ? 'A' : 'B';
      if (twist && cheap === best) continue;
      return { o, A, B, p, q, ext, i, twist: cheap !== best, cheap: cheap === 'A' ? o.a : o.b, win: best === 'A' ? o.a : o.b };
    }
    return null;
  }
  gen('ra-fremd', 'renta', 'Rentabilitätsvergleich wie in Excel', 2, 3, 4, (r, st) => {
    const c = M.kit.repeat(() => fremdCase(r, st)), { o, A, B, p, q } = c, amort = st === 3;
    const data = dataRows(A, B, [['Anschaffungskosten in EUR', x => eur(x.ak)], ['Nutzungsdauer in Jahren', x => String(x.nd)], [`Restwert nach ${A.nd} Jahren in EUR`, x => eur(x.rw)], [`Kosten je ${o.one} in EUR`, x => eur(x.v)], ['Fixe Betriebskosten p. a. in EUR', x => eur(x.fix)], ['Zinssatz p. a.', x => `${x.i} %`], [`Anzahl ${o.many} p. a.`, x => int(x.q)]]);
    const nm = X => X === A ? o.a : o.b;
    const runTraps = X => [{ value: X.fix + X.v, msg: `Die Kosten je ${o.one} mit der Anzahl multiplizieren.` }, { value: X.v * X.q, msg: 'Die fixen Betriebskosten kommen noch dazu.' }];
    const totTraps = X => [{ value: X.total - X.zins, msg: 'Die kalk. Zinsen gehören zu den Gesamtkosten.' }, { value: X.total - X.afa, msg: 'Die kalk. Abschreibung gehört zu den Gesamtkosten.' }, { value: X.ak + X.run, msg: 'Nicht die Anschaffungskosten addieren: Gesamtkosten = Zinsen + Abschreibung + Betriebskosten.' }];
    const gTraps = X => [{ value: c.ext - X.run, msg: 'Zinsen und Abschreibung sind auch Kosten: Fremdbezug − **Gesamtkosten**.' }, { value: X.total - c.ext, msg: 'Umgekehrt: Kosten bei Fremdbezug − eigene Gesamtkosten.' }, { value: c.ext - X.total - X.ak, msg: 'Die Anschaffungskosten stecken schon in der Abschreibung.' }];
    const kTraps = X => [{ value: X.ak, msg: 'Durchschnittlich: (AK + RW) : 2.' }, { value: (X.ak - X.rw) / 2, msg: 'Der Restwert wird addiert: (AK + RW) : 2.' }];
    const rTraps = X => [{ value: X.g * 100 / X.kap, msg: 'Das wäre die vereinfachte Formel. Laut Buch kommen die kalk. Zinsen zum Gewinn dazu: (Gewinn + Zinsen) · 100 : Ø Kapital.' }, { value: (X.g + X.zins) * 100 / X.ak, msg: 'Durch den **durchschnittlichen** Kapitaleinsatz dividieren, nicht durch die Anschaffungskosten.' }, { value: X.kap / (X.g + X.zins), msg: 'Der Bruch steht verkehrt.' }];
    const mTraps = X => [{ value: (X.ak - X.rw) / X.g, msg: 'Die Abschreibung fließt auch zurück: Nenner = Gewinn + Abschreibung.' }, { value: X.ak / (X.g + X.afa), msg: 'Im Zähler steht AK − RW.' }];
    const answer = fields(
      money('zA', `Kalk. Zinsen ${o.a}`, A.zins, zinsTraps(A)), money('zB', `Kalk. Zinsen ${o.b}`, B.zins, zinsTraps(B)),
      money('aA', `Kalk. Abschreibung ${o.a}`, A.afa, afaTraps(A)), money('aB', `Kalk. Abschreibung ${o.b}`, B.afa, afaTraps(B)),
      money('rA', `Betriebskosten ${o.a}`, A.run, runTraps(A)), money('rB', `Betriebskosten ${o.b}`, B.run, runTraps(B)),
      money('tA', `Gesamtkosten ${o.a}`, A.total, totTraps(A), { tol: 0.03 }), money('tB', `Gesamtkosten ${o.b}`, B.total, totTraps(B), { tol: 0.03 }),
      money('f', 'Kosten bei Fremdbezug', c.ext, [{ value: p, msg: `Preis je ${o.one} mal Anzahl.` }]),
      money('gA', `Gewinn ${o.a}`, A.g, gTraps(A), { tol: 0.03 }), money('gB', `Gewinn ${o.b}`, B.g, gTraps(B), { tol: 0.03 }),
      money('kA', `Ø Kapitaleinsatz ${o.a}`, A.kap, kTraps(A)), money('kB', `Ø Kapitaleinsatz ${o.b}`, B.kap, kTraps(B)),
      num('pA', `Rentabilität ${o.a}`, A.rent, { unit: '%', traps: rTraps(A) }), num('pB', `Rentabilität ${o.b}`, B.rent, { unit: '%', traps: rTraps(B) }),
      ...(amort ? [num('mA', `Amortisation ${o.a}`, A.am, { unit: 'Jahre', traps: mTraps(A) }), num('mB', `Amortisation ${o.b}`, B.am, { unit: 'Jahre', traps: mTraps(B) })] : []),
      selSame('w', 'Entscheidung für', [o.a, o.b], c.win));
    answer.grid = { title: `Rentabilitätsvergleichsrechnung ${o.what}`, head: ['Vergleichsdaten', o.a, o.b], rows: [...data,
      { label: 'Kostenvergleich in EUR', head: true, cells: [o.a, o.b] }, { label: 'Kalk. Zinsen', cells: [{ k: 'zA' }, { k: 'zB' }] }, { label: 'Kalk. Abschreibung', cells: [{ k: 'aA' }, { k: 'aB' }] }, { label: 'Laufende Betriebskosten', cells: [{ k: 'rA' }, { k: 'rB' }] }, { label: 'Gesamtkosten', total: true, cells: [{ k: 'tA' }, { k: 'tB' }] },
      { label: 'Rentabilitäts­vergleich', head: true, cells: [o.a, o.b] }, { label: `Kosten bei Fremdbezug (${eur(p)} € je ${o.one})`, cells: [{ k: 'f', span: 2 }] }, { label: 'Gewinn (Ersparnis)', cells: [{ k: 'gA' }, { k: 'gB' }] }, { label: 'Ø Kapitaleinsatz', cells: [{ k: 'kA' }, { k: 'kB' }] }, { label: 'Rentabilität in %', total: true, cells: [{ k: 'pA' }, { k: 'pB' }] },
      ...(amort ? [{ label: 'Amortisationsdauer in Jahren', total: true, cells: [{ k: 'mA' }, { k: 'mB' }] }] : []), { label: 'Entscheidung für', cells: [{ k: 'w', span: 2 }] }] };
    const sol = X => `**${nm(X)}**: Zinsen ${zinsTex(X)}; Abschreibung ${afaTex(X)}; Betriebskosten ${E(X.fix)} + ${eur(X.v)} · ${int(q)} = ${E(X.run)}; Gesamtkosten ${E(X.total)}; Gewinn ${E(c.ext)} − ${E(X.total)} = ${E(X.g)}; Rentabilität (${E(X.g)} + ${E(X.zins)}) · 100 : ${E(X.kap)} = ${dec(X.rent)} %${amort ? `; Amortisation (${E(X.ak)} − ${E(X.rw)}) : (${E(X.g)} + ${E(X.afa)}) = ${dec(X.am)} Jahre` : ''}`;
    return { kicker: 'Rentabilitätsvergleich', lead: `${o.firm} möchte ${o.buy} kaufen. Zwei Angebote stehen zur Wahl: ${o.a} und ${o.b}. ${o.ext}, das kostet ${eur(p)} € je ${o.one}.`, ask: `Vergleiche die Rentabilitäten${amort ? ' und Amortisationsdauern' : ''} und entscheide dich für eine der beiden Alternativen.`, answer,
      hints: ['Zuerst die Kostenvergleichsrechnung: Gesamtkosten = kalk. Zinsen + kalk. Abschreibung + fixe + variable Betriebskosten.', `Gewinn = was man sich gegenüber dem Fremdbezug erspart: ${eur(p)} € · ${int(q)} − eigene Gesamtkosten.`, 'Rentabilität = (Gewinn + kalk. Zinsen) · 100 : Ø Kapitaleinsatz, Ø Kapital = (AK + RW) : 2.'],
      solution: [`Kosten bei Fremdbezug = ${eur(p)} € · ${int(q)} = ${E(c.ext)}`, sol(A), sol(B), `Entscheidung für **${c.win}** (höhere Rentabilität)${c.twist ? `, obwohl ${c.cheap} die niedrigeren Gesamtkosten hat: ${c.win} bindet weniger Kapital` : ''}.`] };
  });
  const RA_MC = [
    ['Eine Investition hat eine Rentabilität von 14 %. Was bedeutet das?', 'Das durchschnittlich eingesetzte Kapital verzinst sich mit 14 % pro Jahr', ['14 % des Umsatzes sind Gewinn', 'Die Investition amortisiert sich nach 14 Jahren', 'Die Kosten betragen 14 % der Anschaffungskosten']],
    ['Investition A amortisiert sich nach 3 Jahren, B nach 5 Jahren. Was stimmt?', 'A hat die kürzere Rückflussdauer, andere Kriterien müssen aber auch geprüft werden', ['A ist in jeder Hinsicht besser', 'B bringt automatisch den höheren Gewinn', 'B ist grundsätzlich risikoärmer']],
    ['Was zeigt die Amortisationsdauer?', 'Wie lange es dauert, bis das eingesetzte Kapital durch die Rückflüsse wieder hereinkommt', ['Den jährlichen Gewinn', 'Die Verzinsung des Kapitals', 'Die Höhe der jährlichen Abschreibung']],
    ['Warum ist eine kurze Amortisationsdauer vorteilhaft?', 'Das Kapital ist kürzer gebunden, das Risiko ist geringer', ['Weil dann der Gewinn sicher am höchsten ist', 'Weil dann keine Zinsen anfallen', 'Weil dann die Nutzungsdauer länger ist']],
    ['Was berücksichtigt die Amortisationsrechnung nicht?', 'Was nach dem Rückfluss des Kapitals noch verdient wird', ['Die Anschaffungskosten', 'Den Restwert', 'Die jährlichen Rückflüsse']],
    ['Was ergänzt die Rentabilitätsvergleichsrechnung gegenüber der Gewinnvergleichsrechnung?', 'Das eingesetzte Kapital', ['Die Erlöse', 'Die Abschreibung', 'Die variablen Kosten']],
    ['Wann wird die Rentabilität mit der Kostenersparnis berechnet?', 'Wenn eine Investition keine eigenen Gewinne bringt, z. B. eine Rationalisierung', ['Immer, wenn es einen Restwert gibt', 'Wenn die Nutzungsdauer über 10 Jahre liegt', 'Nie']],
    ['Woraus besteht der jährliche Rückfluss bei der Amortisationsrechnung?', 'Aus Gewinn und kalkulatorischer Abschreibung', ['Nur aus dem Gewinn', 'Aus Gewinn und kalkulatorischen Zinsen', 'Aus den Erlösen']],
    ['Welche Alternative wird bei der Rentabilitätsvergleichsrechnung gewählt?', 'Die mit der höchsten Rentabilität', ['Die mit dem höchsten Kapitaleinsatz', 'Die mit den niedrigsten Anschaffungskosten', 'Die mit der längsten Amortisationsdauer']],
  ];
  gen('ra-deutung', 'renta', 'Ergebnisse deuten', 1, 3, 5, (r) => {
    const [q, right, wrong] = r.pick(RA_MC);
    return { kicker: 'Interpretation', ask: q, answer: mc(r, right, wrong), hints: ['Rentabilität = Verzinsung des Kapitals. Amortisation = Rückflussdauer.'], solution: [`**${right}**.`] };
  });

  // ================= Test simulation =================
  const TOPIC_IDS = ['prinzip', 'risiko', 'sv', 'privat', 'invest', 'kosten', 'gewinn', 'renta', 'vertrag', 'leistung', 'kfz'];
  // Stoff der Schularbeit laut Lehrer: Versicherungen (risikopolitische Maßnahmen, gesetzliche/private Versicherung) und Investitionsrechnung.
  const SA_TOPICS = ['prinzip', 'risiko', 'sv', 'privat', 'invest', 'kosten', 'gewinn', 'renta'];
  const E_ = M.engine(GENS, TOPIC_IDS);
  const mk = (r, id, st = 3) => E_.makeTask(id, st, r.int(1, 1e9));
  const part = (t, points, ask) => ({ points, ask: ask || `${t.lead ? `${t.lead} ` : ''}${t.ask}`, answer: t.answer, solution: t.solution, table: t.table });
  // Splits a grid task into one exam part per row pair so partial credit works like on paper.
  function testKosten(r) {
    const t = mk(r, 'kv-voll', r.chance(0.5) ? 2 : 3), g = t.answer.grid;
    return { title: g.title, lead: `${t.lead} ${t.ask}`, parts: [{ points: 8, ask: 'Fülle die Kostenvergleichsrechnung aus.', answer: t.answer, solution: t.solution }] };
  }
  function testGewinnRenta(r) {
    const fremd = r.chance(0.5), t = fremd ? mk(r, 'ra-fremd', r.chance(0.5) ? 2 : 3) : mk(r, 'ra-voll');
    return { title: fremd ? t.answer.grid.title : 'Fallstudie Investitionsrechnung', lead: t.lead, parts: [{ points: 9, ask: t.ask, answer: t.answer, solution: t.solution }] };
  }
  function testRenta(r) { const a = mk(r, 'ra-renta'), b = mk(r, 'ra-amort'), c = mk(r, 'ra-ersparnis', 2); return { title: 'Rentabilität und Amortisation', lead: '', parts: [part(a, 3), part(b, 3), part(c, 2)] }; }
  function testVersicherungen(r) {
    const list = [mk(r, 'r-massnahme'), mk(r, 'sv-fall'), mk(r, 'pr-welche', 2), mk(r, 'pr-art', 2), mk(r, 'sv-wissen'), mk(r, 'r-wissen')];
    return { title: 'Versicherungen', lead: '', parts: list.map(t => part(t, t.answer.type === 'fields' ? 2 : 1)) };
  }
  function testTheorie(r) {
    const list = [mk(r, 'i-gut', 2), mk(r, 'i-phase', 2), mk(r, 'i-krit', 2), mk(r, 'i-scoring', 2), mk(r, 'kv-tf'), mk(r, 'gv-tf'), mk(r, 'ra-deutung')];
    return { title: 'Investitionsrechnung: Theorie', lead: '', parts: list.map(t => part(t, t.answer.grid ? 4 : t.answer.type === 'tf' ? 2 : t.answer.type === 'fields' ? 2 : 1)) };
  }
  // Extra topics (not in the SA): only when the learner switches off "Nur SA-Stoff".
  function testLeistung(r) { const a = mk(r, 'l-unter'), b = mk(r, 'l-sb'), c = mk(r, 'k-praemie'); return { title: 'Versicherungsleistung und Bonus-Malus', lead: '', parts: [part(a, 3), part(b, 2), part(c, 3)] }; }
  function buildTest(seed, size = 'full', o = {}) {
    const sa = o.focus !== false, r = makeRng(seed);
    const list = size === 'short' ? [testKosten, testVersicherungen] : size === 'inv' ? [testKosten, testGewinnRenta, testRenta] : [testKosten, testGewinnRenta, testVersicherungen, testTheorie, ...(sa ? [] : [testLeistung])];
    const tasks = list.map((make, n) => { const t = make(makeRng(r.int(1, 2 ** 31))); return { plots: [], ...t, parts: t.parts.map((p, i) => ({ ...p, id: `${n}-${i}`, label: String.fromCharCode(97 + i) })) }; });
    return { seed, size, tasks, points: tasks.flatMap(t => t.parts).reduce((s, p) => s + p.points, 0) };
  }

  // The formulas of the class formula sheet, used by the tests to recompute the book examples.
  const calc = {
    zins: (ak, rw, i) => (ak + rw) / 2 * i / 100, afa: (ak, rw, nd) => (ak - rw) / nd, kap: (ak, rw) => (ak + rw) / 2,
    rent: (g, z, kap) => (g + z) * 100 / kap, amort: (ak, rw, back) => (ak - rw) / back, crit: (f1, f2, v1, v2) => Math.abs(f2 - f1) / Math.abs(v1 - v2),
    entsch: (vs, vw, dmg) => vs < vw ? vs * dmg / vw : dmg, bm: (prem, from, to) => prem / BM[from] * BM[to],
  };
  return { ...E_, buildTest, SA_TOPICS, BM, eur, r2, calc, critCase, costCase, profitCase, fullCase, fremdCase, scoreCase, bmCompare, underCase };
});
