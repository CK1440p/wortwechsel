window.WWSeed = {
  id: 'la-ropa-unidad-4', title: 'La ropa · Unidad 4', frontLang: 'Spanisch', backLang: 'Deutsch', emoji: '👕',
  description: 'Kleidung, Shopping & alles, was dazugehört.',
  pairs: `decidirse por\tsich entscheiden für
de un solo color\teinfarbig
de manga corta/larga\tkurzärmlig/langärmlig
a cuadros\tkariert
aunque\tobwohl
sin mangas\tärmellos
de lunares\tgepunktet
a rayas\tgestreift
la ropa\tdie Kleidung
llevar\ttragen
fuerte\tstark, kräftig
la prenda\tdas Kleidungsstück
la ropa de abrigo\tdie warme Kleidung
blanquiazul\tblauweiß
combinar\tkombinieren
los cordones\tdie Schuhbänder
el baile\tder Ball
la boda\tdie Hochzeit
la noche de película\tder Filmabend
la primera cita\tdas erste Date
ir de tiendas\tshoppen gehen
el fashionista / la fashionista\tder Modefan
la tienda de accesorios\tdas Accessoiregeschäft
los pendientes\tdie Ohrringe
pegar (bien)\tzusammenpassen
la pulsera\tdas Armband
el anillo\tder Ring
el coletero\tdas Haargummi
el bolso\tdie Handtasche
la zapatería\tdas Schuhgeschäft
el número de zapato\tdie Schuhgröße
quedar bien\tgut stehen
la pasión\tdie Leidenschaft
la ocasión\tder Anlass
el reloj\tdie Uhr
la relojería\tdas Uhrengeschäft
la joyería\tdas Juweliergeschäft
el collar\tdie Halskette
acompañar a alguien\tjemanden begleiten
ponerse\tsich anziehen
¡No hay de qué!\tKeine Ursache!
la ayuda\tdie Hilfe
Me da igual\tDas ist mir egal.
la talla\tdie Kleidergröße
el lino\tdas Leinen
el algodón\tdie Baumwolle
el cuero\tdas Leder
la lana\tdie Wolle
la seda\tdie Seide
el corte\tder Schnitt
los probadores\tdie Umkleidekabinen
estrecho\teng
pensar\tdenken
ahí\tda, dort
ir bien con\tgut passen zu
en efectivo\tbar zahlen
con tarjeta\tmit Karte
la factura\tdie Rechnung
prestar\tausleihen
la opinión\tdie Meinung
esperar\twarten
probarse\tanprobieren
la compra online\tder Online-Einkauf
la red\tdas Netz (Internet)
la manera\tdie Art und Weise
a cualquier hora\tjederzeit
relajante\tentspannend
la opción\tdie Option
devolver\tzurückgeben
pasado/pasada de moda\taltmodisch
el traje\tder Anzug
los vaqueros\tdie Jeans
la corbata\tdie Krawatte
la camisa\tdas Hemd
el vestido\tdas Kleid
la blusa\tdie Bluse
la sudadera\tder Kapuzenpulli
la minifalda\tder Minirock
la camiseta\tdas T-Shirt
la chaqueta\tdie Jacke
la falda\tder Rock
el blazer\tder Blazer
los pantalones\tdie Hose
las chanclas\tdie Flipflops
el abrigo\tder Mantel
los zapatos\tdie Schuhe
los zapatos de tacón\tdie Stöckelschuhe
las botas\tdie Stiefel
las zapatillas\tdie Hausschuhe
las zapatillas de deporte\tdie Sportschuhe
la gorra\tdie Mütze
la bufanda\tder Schal
el jersey\tder Pullover
el cinturón\tder Gürtel
el sombrero\tder Hut`
};
window.WWDialogSeed = [
  {
    id: 'dialog-tienda-usted', seed: true, title: 'En la tienda · die Jacke (usted)',
    description: 'Dein Dialog: Jacke zu groß, kleinere Größe, Schal dazu, Bezahlen.',
    lines: [
      { speaker: 'Verkäufer', es: '¡Hola, buenos días! ¿Puedo ayudarle?', de: 'Hallo, guten Tag! Kann ich Ihnen helfen?', task: 'Begrüße den Kunden und biete Hilfe an.' },
      { speaker: 'Kunde', es: 'Buenos días. Sí, busco una chaqueta para el invierno.', de: 'Guten Tag. Ja, ich suche eine Jacke für den Winter.', task: 'Grüße zurück und sag, dass du eine Winterjacke suchst.' },
      { speaker: 'Verkäufer', es: 'Muy bien. ¿Qué talla tiene?', de: 'Sehr gut. Welche Größe haben Sie?', task: 'Frag nach der Größe.' },
      { speaker: 'Kunde', es: 'Normalmente llevo la talla L.', de: 'Normalerweise trage ich Größe L.', task: 'Sag, dass du normalerweise L trägst.' },
      { speaker: 'Verkäufer', es: '¿Y de qué color la quiere?', de: 'Und in welcher Farbe möchten Sie sie?', task: 'Frag nach der Farbe.' },
      { speaker: 'Kunde', es: 'Azul o negra.', de: 'Blau oder schwarz.', task: 'Nenne zwei Farben: Blau oder Schwarz.' },
      { speaker: 'Verkäufer', es: 'Mire, tenemos estas chaquetas de aquí y aquellas de allí, al lado de la ventana.', de: 'Schauen Sie, wir haben diese Jacken hier und jene dort drüben, neben dem Fenster.', task: 'Zeig die Jacken hier und die dort drüben neben dem Fenster.' },
      { speaker: 'Kunde', es: 'Me gusta mucho esta chaqueta azul, pero aquella negra también es bonita. ¿Puedo probármelas?', de: 'Mir gefällt diese blaue Jacke sehr, aber jene schwarze ist auch schön. Kann ich sie anprobieren?', task: 'Dir gefällt die blaue hier, die schwarze dort drüben auch. Frag, ob du beide anprobieren kannst.' },
      { speaker: 'Verkäufer', es: 'Claro. Los probadores están allí, al fondo a la derecha.', de: 'Natürlich. Die Umkleidekabinen sind dort, ganz hinten rechts.', task: 'Sag, wo die Umkleidekabinen sind: dort, ganz hinten rechts.' },
      { speaker: 'Verkäufer', es: '¿Qué tal le quedan las chaquetas?', de: 'Wie passen Ihnen die Jacken?', task: 'Frag, wie die Jacken passen.' },
      { speaker: 'Kunde', es: 'La negra me queda bien, pero la azul me queda demasiado grande. ¿La tiene en una talla más pequeña?', de: 'Die schwarze passt mir gut, aber die blaue ist mir zu groß. Haben Sie sie in einer kleineren Größe?', task: 'Die schwarze passt, die blaue ist zu groß. Frag nach einer kleineren Größe.' },
      { speaker: 'Verkäufer', es: 'Sí, aquí tiene la azul en la talla M.', de: 'Ja, hier haben Sie die blaue in Größe M.', task: 'Gib dem Kunden die blaue Jacke in M.' },
      { speaker: 'Kunde', es: 'Ahora esta me queda perfecta. Me llevo la azul.', de: 'Jetzt passt mir diese perfekt. Ich nehme die blaue.', task: 'Jetzt passt sie perfekt. Sag, dass du die blaue nimmst.' },
      { speaker: 'Verkäufer', es: '¿Necesita algo más? Estos pantalones vaqueros van muy bien con la chaqueta.', de: 'Brauchen Sie noch etwas? Diese Jeans passt sehr gut zu der Jacke.', task: 'Frag, ob er noch etwas braucht, und empfiehl diese Jeans zur Jacke.' },
      { speaker: 'Kunde', es: 'Mmm, no, esos pantalones no me gustan mucho. ¿Cuánto cuesta esa bufanda gris?', de: 'Hm, nein, diese Hose da gefällt mir nicht so. Wie viel kostet der graue Schal da?', task: 'Die Jeans gefällt dir nicht. Frag, was der graue Schal da kostet.' },
      { speaker: 'Verkäufer', es: 'Esa bufanda cuesta 15 euros y la chaqueta 79 euros.', de: 'Dieser Schal kostet 15 Euro und die Jacke 79 Euro.', task: 'Nenne die Preise: Schal 15 €, Jacke 79 €.' },
      { speaker: 'Kunde', es: 'Vale, me llevo las dos cosas.', de: 'Okay, ich nehme beides.', task: 'Sag, dass du beides nimmst.' },
      { speaker: 'Verkäufer', es: 'Son 94 euros en total. ¿Paga en efectivo o con tarjeta?', de: 'Das macht insgesamt 94 Euro. Zahlen Sie bar oder mit Karte?', task: 'Nenne die Summe von 94 € und frag: bar oder mit Karte?' },
      { speaker: 'Kunde', es: 'Con tarjeta, por favor.', de: 'Mit Karte, bitte.', task: 'Sag, dass du mit Karte zahlst.' },
      { speaker: 'Verkäufer', es: 'Aquí tiene. ¡Muchas gracias y hasta luego!', de: 'Bitte schön. Vielen Dank und bis bald!', task: 'Gib ihm die Sachen, bedanke dich und verabschiede dich.' },
      { speaker: 'Kunde', es: '¡Gracias, adiós!', de: 'Danke, auf Wiedersehen!', task: 'Bedanke dich und verabschiede dich.' },
    ],
  },
  {
    id: 'dialog-tienda-tu', seed: true, title: 'En la tienda · zu teuer (tú)',
    description: 'Übung 9 · S. 44: Jacke zu groß, 120 Euro, kein Kauf. Spanische Umsetzung der deutschen Rollenangaben.',
    lines: [
      { speaker: 'Verkäufer', es: '¡Hola! ¿Necesitas ayuda?', de: 'Hallo! Brauchst du Hilfe?', task: 'Begrüße den Kunden und biete Hilfe an.' },
      { speaker: 'Kunde', es: 'Buenos días, busco una chaqueta.', de: 'Guten Tag, ich suche eine Jacke.', task: 'Grüße zurück und sag, dass du eine Jacke suchst.' },
      { speaker: 'Verkäufer', es: '¿Qué talla llevas?', de: 'Welche Größe trägst du?', task: 'Frag, welche Größe der Kunde trägt.' },
      { speaker: 'Kunde', es: 'Llevo la talla M.', de: 'Ich trage Größe M.', task: 'Sag, dass du Größe M trägst.' },
      { speaker: 'Verkäufer', es: 'Mira, ¿te gusta aquella chaqueta azul claro de allí, al fondo de la tienda?', de: 'Schau, gefällt dir jene hellblaue Jacke dort, ganz hinten im Geschäft?', task: 'Zeig die hellblaue Jacke ganz hinten im Geschäft und frag, ob sie ihm gefällt.' },
      { speaker: 'Kunde', es: 'Sí, me gusta mucho. ¿Me la puedo probar? ¿Dónde están los probadores?', de: 'Ja, sie gefällt mir sehr. Kann ich sie anprobieren? Wo sind die Umkleidekabinen?', task: 'Sie gefällt dir. Frag, ob du sie anprobieren kannst und wo die Umkleidekabinen sind.' },
      { speaker: 'Verkäufer', es: 'Los probadores están al final del pasillo a la derecha.', de: 'Die Umkleidekabinen sind am Ende des Gangs rechts.', task: 'Sag, wo die Umkleidekabinen sind: am Ende des Gangs rechts.' },
      { speaker: 'Verkäufer', es: '¿Qué tal te queda?', de: 'Wie steht dir die Jacke?', task: 'Frag, wie dem Kunden die Jacke steht.' },
      { speaker: 'Kunde', es: 'Me queda demasiado grande. ¿Tienes una talla más pequeña?', de: 'Sie ist mir zu groß. Hast du eine kleinere Größe?', task: 'Sie ist zu groß. Frag nach einer kleineren Größe.' },
      { speaker: 'Verkäufer', es: 'Aquí tienes una talla más pequeña. ¿Te queda bien ahora?', de: 'Hier hast du eine kleinere Größe. Passt sie dir jetzt?', task: 'Gib ihm die kleinere Größe und frag, ob sie jetzt passt.' },
      { speaker: 'Kunde', es: 'Ahora me queda muy bien. ¿Cuánto cuesta?', de: 'Jetzt steht sie mir sehr gut. Wie viel kostet sie?', task: 'Sag, dass sie dir sehr gut steht, und frag nach dem Preis.' },
      { speaker: 'Verkäufer', es: 'Cuesta 120 euros.', de: 'Sie kostet 120 Euro.', task: 'Sag, dass sie 120 € kostet.' },
      { speaker: 'Kunde', es: 'Es demasiado cara, no me la llevo. Adiós.', de: 'Sie ist zu teuer, ich nehme sie nicht. Tschüss.', task: 'Sie ist zu teuer. Du nimmst sie nicht und verabschiedest dich.' },
      { speaker: 'Verkäufer', es: 'Lo siento. ¡Adiós!', de: 'Tut mir leid. Tschüss!', task: 'Sag, dass es dir leidtut, und verabschiede dich.' },
    ],
  },
];
window.WWGrammarSeed = [
  {
    id: 'pronombres-demostrativos', title: 'Los pronombres demostrativos',
    description: 'dieser, der da, jener: nach Nähe, Geschlecht und Zahl.',
    tip: 'Der Anfang zeigt die Entfernung: est… ist nah, es… ist mittel weit weg, aquell… ist weit weg. Hinten steht a, os oder as. Nur der Maskulin Singular ist anders: este, ese, aquel.',
    groups: [{ label: 'masculino', columns: ['singular', 'plural'] }, { label: 'femenino', columns: ['singular', 'plural'] }],
    rows: [
      { label: 'aquí', sub: 'cerca', de: 'nah', cells: ['este', 'estos', 'esta', 'estas'] },
      { label: 'ahí', sub: 'distancia media', de: 'mittel weit weg', cells: ['ese', 'esos', 'esa', 'esas'] },
      { label: 'allí', sub: 'lejos', de: 'weit weg', cells: ['aquel', 'aquellos', 'aquella', 'aquellas'] },
    ],
    sentences: [
      { answer: 'Esta', after: ' camisa de aquí es de Bershka.', de: 'Dieses Hemd hier ist von Bershka.' },
      { answer: 'Esos', after: ' anillos de ahí me gustan mucho.', de: 'Die Ringe da gefallen mir sehr.' },
      { answer: 'Estas', after: ' faldas de aquí las llevan mis amigas.', de: 'Diese Röcke hier tragen meine Freundinnen.' },
      { answer: 'Aquellas', after: ' pulseras de allí me encantan.', de: 'Die Armbänder dort drüben finde ich toll.' },
      { answer: 'Ese', after: ' sombrero de ahí lo tiene mi padre.', de: 'Den Hut da hat mein Vater.' },
      { answer: 'Este', after: ' jersey de aquí es muy bonito.', de: 'Dieser Pullover hier ist sehr schön.' },
      { answer: 'Estos', after: ' zapatos de aquí son demasiado caros.', de: 'Diese Schuhe hier sind zu teuer.' },
      { answer: 'Esa', after: ' chaqueta de ahí me queda bien.', de: 'Die Jacke da steht mir gut.' },
      { answer: 'Esas', after: ' botas de ahí son de mi hermana.', de: 'Die Stiefel da gehören meiner Schwester.' },
      { answer: 'Aquel', after: ' abrigo de allí cuesta 120 euros.', de: 'Der Mantel dort drüben kostet 120 Euro.' },
      { answer: 'Aquellos', after: ' pantalones de allí son muy cómodos.', de: 'Die Hose dort drüben ist sehr bequem.' },
      { answer: 'Aquella', after: ' camiseta de allí es demasiado grande.', de: 'Das T-Shirt dort drüben ist zu groß.' },
    ],
  },
];
