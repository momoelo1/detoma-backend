// Migrazione UNA TANTUM: importa i dolci/passiti da frontend/src/data/data.js
// (VINI_DOLCI) nel database. Categoria pubblica: "liquorosi".
// Uso: node scripts/importDolci.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const DOLCI = [
  { name: "Comtess Passito San Michele Appiano", regione: "Alto Adige", description: "Passito aromatico della linea Sanct Valentin: albicocca, miele e spezie — fine pasto elegante." },
  { name: "Moscato Giallo Gaierhof", regione: "Alto Adige", description: "Moscato giallo dolce e profumato: salvia, agrumi e miele leggero — con la pasticceria secca." },
  { name: "Moscato Rosa Franz Haas", regione: "Alto Adige", description: "Rarità alpina: Moscato Rosa profumato di rose e piccoli frutti — dolcezza aristocratica." },
  { name: "Terminum Vendemmia Tardiva Cantina Termeno", regione: "Alto Adige", description: "Vendemmia tardiva di Gewürztraminer: opulenta, esotica, pluripremiata — un gioiello dolce." },
  { name: "Auslese Cuvée Kracher", regione: "Austria", description: "Kracher, il maestro austriaco dei vini dolci: Auslese armoniosa tra miele e frutta gialla." },
  { name: "Beerenauslese cuvèe Kracher", regione: "Austria", description: "Beerenauslese: acini scelti a mano, dolcezza densa retta da grande acidità — scuola austriaca." },
  { name: "Eiswein cuvèe Kracher", regione: "Austria", description: "Vino di ghiaccio: uve gelate in vigna, purezza cristallina e dolcezza tesa." },
  { name: "Icewine Cabernet Franc Inniskillin", regione: "Canada", description: "Icewine rosso dal Canada: fragola candita e sciroppo d'acero nel calice — rarità che stupisce." },
  { name: "Icewine Riesling Inniskillin", regione: "Canada", description: "Il celebre vino di ghiaccio canadese: pesca, miele e freschezza glaciale — dolcezza nordica." },
  { name: "Banyuls L'Etoile", regione: "Francia", description: "Vino dolce naturale del Roussillon: Grenache, frutta cotta e cacao — l'abbinamento giusto col cioccolato." },
  { name: "Banyuls Gran cru 98 L'Etoile", regione: "Francia", anno: "1998", description: "Banyuls grand cru affinato a lungo: noci, spezie e nobile ossidazione — da meditazione." },
  { name: "Sauternes Grand Cru Classè Chateau de Malle", regione: "Francia", description: "Sauternes di castello classificato: botrytis, miele e zafferano — dolcezza nobile bordolese." },
  { name: "Sauternes Les Justices Chateau Les Justices", regione: "Francia", description: "Sauternes generoso e fine: albicocca, miele e freschezza — con foie gras e formaggi blu." },
  { name: "Sauternes 1er cru classè Chateau Rayne Vigneau", regione: "Francia", description: "Premier cru di Sauternes: opulenza, agrumi canditi e lunga scia." },
  { name: "Sauternes 1er cru classè Chateau Guiraud", regione: "Francia", description: "Guiraud, premier cru in biologico: botrytis pura, miele e zenzero." },
  { name: "Sauternes Chateau d'Yquem 94", regione: "Francia", anno: "1994", description: "Yquem: il vino dolce più leggendario del mondo — annata 1994, oro liquido da tramandare." },
  { name: "Sauternes Chateau d'Yquem 96", regione: "Francia", anno: "1996", description: "Yquem 1996: grande annata del mito assoluto di Sauternes — patrimonio da cantina." },
  { name: "Sauternes Chateau Simon", regione: "Francia", description: "Sauternes classico di famiglia: miele, fiori e dolcezza equilibrata." },
  { name: "Sauternes ml.375 Chateau Guiraud", regione: "Francia", description: "Guiraud in mezza bottiglia: la misura giusta per il fine pasto." },
  { name: "Sauternes ml.375 Chateau Simon", regione: "Francia", description: "Mezza bottiglia di Sauternes: dolcezza giusta per due." },
  { name: "Sauternes ml.375 Chateau de S.te Helene", regione: "Francia", description: "Sauternes in formato piccolo: il dessert liquido a portata di cena." },
  { name: "Sauternes Mouton Cadet Philippe de Rothschild", regione: "Francia", description: "Il Sauternes della casa Rothschild: accessibile e ben fatto." },
  { name: "Sauternes Premier Cru Classe Chateau Coutet", regione: "Francia", description: "Coutet, premier cru di Barsac: più fresco e slanciato — la finezza tra i Sauternes." },
  { name: "Sauternes Sainte-Helene Chateau de Malle", regione: "Francia", description: "Seconda etichetta di de Malle: botrytis gentile, prezzo gentile." },
  { name: "Vieux Pineau des Charentes Jean Fillioux", regione: "Francia", description: "Mosto e Cognac invecchiati insieme: il Pineau, aperitivo-dessert delle Charentes." },
  { name: "Picolit Vigna Petrussa", regione: "Friuli", description: "Il Picolit: leggendario dolce friulano da rese minuscole — miele, fiori e nobiltà contadina." },
  { name: "Picolit Jermann", regione: "Friuli", description: "Il Picolit secondo Jermann: raro, elegante, prezioso." },
  { name: "Ramandolo Il longhino Cos", regione: "Friuli", description: "Ramandolo da Verduzzo di collina: albicocca, castagna e dolcezza asciutta — DOCG di nicchia." },
  { name: "Verduzzo Russiz Superiore", regione: "Friuli", description: "Verduzzo dolce del Collio: mela cotogna e miele su tannino gentile — dolcezza friulana." },
  { name: "La Tonsa Dolce Riccardi", regione: "Lombardia", description: "Dolce lombardo di casa Riccardi: morbido e fragrante — con la pasticceria della domenica." },
  { name: "Moscato Spumante dolce Quaquarini", regione: "Lombardia", description: "Moscato spumante dell'Oltrepò: uva aromatica e spuma dolce — festa semplice e sincera." },
  { name: "Passito di Verdea Riccardi", regione: "Lombardia", description: "Passito dall'autoctona Verdea di San Colombano: uva appassita a chilometro zero — rarità di casa nostra." },
  { name: "Passito Sulif Il Mosnel", regione: "Lombardia", description: "Passito franciacortino: frutta candita e miele, sorso elegante." },
  { name: "Barolo Chinato Cappellano", regione: "Piemonte", description: "Il Barolo Chinato originale, dalla ricetta storica di Cappellano: china e spezie — digestivo nobile e mito piemontese." },
  { name: "Barolo Chinato Michele Chiarlo", regione: "Piemonte", description: "Barolo aromatizzato alla china: dolce-amaro e speziato — perfetto col cioccolato fondente." },
  { name: "Brachetto d'Acqui Traversa", regione: "Piemonte", description: "Brachetto dolce e aromatico: rosa, fragola e spuma leggera — con la torta di nocciole." },
  { name: "Brachetto d'Acqui Banfi", regione: "Piemonte", description: "Brachetto fragrante: piccoli frutti rossi e dolcezza ariosa." },
  { name: "Brachetto d'Acqui Bologna", regione: "Piemonte", description: "Il Brachetto di Giacomo Bologna: aromatico, gioioso, di razza." },
  { name: "Moscato d'Asti Saracco", regione: "Piemonte", description: "Il Moscato d'Asti di riferimento: zagara, pesca e dolcezza viva — Saracco è una garanzia." },
  { name: "Moscato d'Asti Forteto della Luja", regione: "Piemonte", description: "Moscato artigianale dei calanchi: aromatico e fine — piccola cantina, grande grazia." },
  { name: "Moscato d'Asti Ceretto", regione: "Piemonte", description: "Moscato di casa Ceretto: fragrante, dolce il giusto, profumatissimo." },
  { name: "Moscato d'Asti Traversa", regione: "Piemonte", description: "Moscato genuino: uva, fiori e allegria — il dolce della merenda piemontese." },
  { name: "Moscato d'Asti magnum Saracco", regione: "Piemonte", description: "Il Saracco in magnum: il panettone ringrazia." },
  { name: "Moscato d'Asti Nivole Chiarlo", regione: "Piemonte", description: "Nivole: il Moscato tra le nuvole di Chiarlo — dolcezza leggera come il nome." },
  { name: "Moscato d'Asti Rocca Uccellette Chiarlo", regione: "Piemonte", description: "Moscato di vigna: aromatico, cremoso, delicato." },
  { name: "Vendemmia Tardiva Moscato Forteto della Luja", regione: "Piemonte", description: "Moscato da vendemmia tardiva: miele, albicocca e complessità — oltre la semplice dolcezza." },
  { name: "Finest Reserve Graham's", regione: "Portogallo", description: "Porto riserva di Graham's: frutti neri, spezie e calore — l'introduzione perfetta al Porto." },
  { name: "Madeira 5 anni Cossart Gordon", regione: "Portogallo", description: "Madeira invecchiato cinque anni: caramello salato, noci e acidità infinita — l'isola nel bicchiere." },
  { name: "Porto 10 anni Graham's", regione: "Portogallo", description: "Tawny dieci anni: nocciola, caramello e legno dolce — con dolci secchi e formaggi." },
  { name: "Porto 20 anni Graham's", regione: "Portogallo", description: "Tawny vent'anni: complessità setosa tra arancia candita e frutta secca — meditazione lusitana." },
  { name: "Porto 30 anni Graham's", regione: "Portogallo", description: "Trent'anni di botte: profondità rara, spezie e velluto — Porto per le grandi occasioni." },
  { name: "Porto Ruby Ramos Pinto", regione: "Portogallo", description: "Ruby giovane e fruttato: mora, prugna e dolcezza diretta — il Porto quotidiano." },
  { name: "Vintage 1995 Noval", regione: "Portogallo", anno: "1995", description: "Porto Vintage di Quinta do Noval, annata 1995: potenza e frutto nero — da decantare e celebrare." },
  { name: "Vintage 2006 Graham's", regione: "Portogallo", anno: "2006", description: "Vintage 2006: la categoria regina del Porto — struttura e lunghissima vita." },
  { name: "Moscato di Trani Kaloro Tormaresca", regione: "Puglia", description: "Moscato di Trani dolce e solare: miele, zagara e Mediterraneo." },
  { name: "Angelu Ruju Sella e Mosca", regione: "Sardegna", description: "Cannonau passito: il rosso dolce di Alghero, spezie e confettura — storico fine pasto isolano." },
  { name: "Vendemmia Tardiva Capichera", regione: "Sardegna", description: "Vermentino tardivo di Capichera: opulento, mediterraneo, raro." },
  { name: "Baglio Florio Florio", regione: "Sicilia", description: "Marsala Vergine di lungo invecchiamento: nocciola, tabacco e mare — l'aristocrazia del Marsala." },
  { name: "Malvasia delle Lipari Hauner", regione: "Sicilia", description: "La Malvasia di Salina secondo Hauner: albicocca, cappero e vulcano — il dolce delle Eolie." },
  { name: "Malvasia delle Lipari ml.375 Hauner", regione: "Sicilia", description: "La Malvasia eoliana in mezza bottiglia: dolcezza d'isola nel formato giusto." },
  { name: "Marsala fine rubino Pellegrino", regione: "Sicilia", description: "Marsala rubino giovane: dolce, caldo, da pasticceria." },
  { name: "Marsala Superiore secco Pellegrino", regione: "Sicilia", description: "Marsala Superiore secco: mandorla e legno — aperitivo d'altri tempi o cucina nobile." },
  { name: "Marsala Vergine Ambra Pellegrino", regione: "Sicilia", description: "Vergine ambrato: solo invecchiamento, nessuna concia — il Marsala dei puristi." },
  { name: "Marsala Vergine Solera Pellegrino", regione: "Sicilia", description: "Metodo solera: annate che si fondono in botte — profondità ossidativa affascinante." },
  { name: "Marsala Vergine Superiore oro Pellegrino", regione: "Sicilia", description: "Vergine oro superiore: elegante, asciutto, lungo." },
  { name: "Marsala Vergine Terre Arse Florio", regione: "Sicilia", description: "Terre Arse: il Marsala Vergine di Florio, asciutto e fumé — con i formaggi erborinati." },
  { name: "Passito Firriato", regione: "Sicilia", description: "Passito siciliano generoso: uva appassita al sole, miele e albicocca." },
  { name: "Passito di Pantelleria Bukkuram De Bartoli", regione: "Sicilia", description: "Bukkuram, il padre dei passiti di Pantelleria: Zibibbo monumentale di Marco De Bartoli — culto." },
  { name: "Passito Pantelleria Ben Ryè Donnafugata", regione: "Sicilia", description: "Ben Ryé, figlio del vento: il passito più celebrato d'Italia — albicocca, scorza candita e mare." },
  { name: "Passito Pantelleria Ben Ryè ml.375 Donnafugata", regione: "Sicilia", description: "Ben Ryé in mezza bottiglia: il gran finale in formato dessert." },
  { name: "Passito Pantelleria Kamma Murana", regione: "Sicilia", description: "Passito artigianale di Salvatore Murana, contrada Kamma: dolcezza contadina d'autore." },
  { name: "Passito Pantelleria liquoroso Pellegrino", regione: "Sicilia", description: "La versione liquorosa del passito: calda, dolce, generosa." },
  { name: "Passito Pantelleria Martingana Murana", regione: "Sicilia", description: "Martingana: il cru leggendario di Murana — tra i più grandi dolci italiani." },
  { name: "Passito Pantelleria Nes Pellegrino", regione: "Sicilia", description: "Nes: passito moderno e profumato — Pantelleria accessibile." },
  { name: "Moscatel Emilìn Lustau", regione: "Spagna", description: "Moscatel di Jerez: uva passa, fiori e dolcezza vellutata — merenda andalusa." },
  { name: "Pedro Ximenes Murillo Lustau", regione: "Spagna", description: "PX: tra i vini più dolci del mondo — melassa, fichi e caffè, da colare sul gelato." },
  { name: "Sherry Solera Lustau", regione: "Spagna", description: "Sherry di solera: secco, salino, mandorlato — l'aperitivo di Jerez." },
  { name: "Aleatico Sovana Antinori", regione: "Toscana", description: "Aleatico dolce della Maremma: rosa, ciliegia e morbidezza — un rosso da dessert." },
  { name: "Muffato della Sala Antinori", regione: "Toscana", description: "Il Muffato della Sala: la botrytis all'italiana — zafferano, miele e albicocca, celebre con gli erborinati." },
  { name: "Vin Santo del Chianti Classico San Felice", regione: "Toscana", description: "Vin Santo tradizionale: caratello, noci e miele — coi cantucci è liturgia toscana." },
  { name: "Vin Santo del Chianti Classico Felsina", regione: "Toscana", description: "Il Vin Santo di Felsina: ossidativo nobile, lunghissimo — tra i migliori di Toscana." },
  { name: "Moscadello di Montalcino Florus Banfi", regione: "Toscana", description: "Moscadello dolce di Montalcino: miele e pesca — la tradizione dolce accanto al Brunello." },
  { name: "Tokaji 1993 Puttonyos 6 Baron Bornemisza", regione: "Ungheria", anno: "1993", description: "Tokaji aszú 6 puttonyos 1993: il vino dei re — albicocca candita, tè e acidità immortale." },
  { name: "I Capitelli Anselmi", regione: "Veneto", description: "I Capitelli: passito d'autore da Garganega — miele d'acacia e frutta candita, celebre nel mondo." },
  { name: "Moscato Dindarello Maculan", regione: "Veneto", description: "Dindarello: Moscato fresco e profumatissimo — la dolcezza leggera di Maculan." },
  { name: "Rosso Passito Madoro Maculan", regione: "Veneto", description: "Passito rosso di Breganze: confettura e spezie — con cioccolato e formaggi stagionati." },
  { name: "Torcolato Maculan", regione: "Veneto", description: "Il Torcolato: Vespaiola appassita al torchio che gli dà il nome — miele, zafferano e fama internazionale." },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "liquorosi" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} dolci/passiti nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = DOLCI.map((w) => ({ ...w, category: "liquorosi" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} dolci/passiti.`);

  await mongoose.disconnect();
};

run();
