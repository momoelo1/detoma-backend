// Migrazione UNA TANTUM: importa i prodotti "Alimentari" (gastronomia +
// dolceria) fotografati in negozio. Per ogni prodotto carica la foto locale
// su Cloudinary (stessa cartella usata dal controller: enoteca-detoma/alimentari)
// e poi salva il documento nel database con l'URL risultante.
//
// Le immagini sorgente stanno in scripts/import-assets/alimentari/ (stessi
// nomi file IMG_xxxx.jpg delle foto originali).
//
// NOTE PER CHI LANCIA LO SCRIPT:
// - formato (peso in grammi) e prezzo NON sono stati compilati: non erano
//   leggibili/disponibili dalle foto. Vanno aggiunti a mano dal pannello
//   admin dopo l'importazione.
// - Rifiuta l'esecuzione se esistono già alimentari nel database, per
//   evitare duplicati (stesso pattern degli altri script di import).
//
// Uso: node scripts/importAlimentari.js
require("dotenv").config();
const mongoose = require("mongoose");
const Alimentare = require("../models/Alimentare");

const ALIMENTARI = [
  // ---------------------------------------------------------------------
  // DOLCERIA
  // ---------------------------------------------------------------------

  // -- Confetture e Composte --
  {
    name: "Confettura Extra di Pere",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura",
    description:
      "Confettura extra di pere La Posta, gourmet, dal gusto dolce e delicato: perfetta a colazione o abbinata a formaggi freschi.",
    imgFile: "IMG_5663.jpg",
  },
  {
    name: "Amarene Agrimontana",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Preparazione di frutta",
    description:
      "Preparazione di amarene Agrimontana, ciliegie acidule in confettura corposa, ideale per guarnire dolci, yogurt e gelati.",
    imgFile: "IMG_5664.jpg",
  },
  {
    name: "Confettura di Fragole ZERO",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura senza zuccheri aggiunti",
    description:
      "Confettura di fragole Agrimontana della linea ZERO, senza zuccheri aggiunti, per gustare il sapore vero della frutta.",
    imgFile: "IMG_5665.jpg",
  },
  {
    name: "Confettura Extra di Pesche",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura",
    description:
      "Confettura extra di pesche La Posta, ricca di frutta e dal colore dorato: ottima a colazione o per farcire dolci.",
    imgFile: "IMG_5668.jpg",
  },
  {
    name: "Composta Biologica di Fragole",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Composta biologica",
    description:
      "Composta biologica di fragole Brezzo, preparata solo con zuccheri della frutta: un prodotto genuino dal gusto intenso.",
    imgFile: "IMG_5669.jpg",
  },
  {
    name: "Confettura Extra di Ribes Rosso",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura",
    description:
      "Confettura extra di ribes rosso Alpenzu, produzione artigianale alpina dal gusto acidulo e rinfrescante.",
    imgFile: "IMG_5671.jpg",
  },
  {
    name: "Confettura Extra di Pesca di Leonforte I.G.P.",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura IGP",
    description:
      "Confettura Fiasconaro realizzata con la pregiata Pesca di Leonforte I.G.P. siciliana, dal profumo intenso e la polpa succosa.",
    imgFile: "IMG_5673.jpg",
  },
  {
    name: "Confettura di Gelso Nero",
    category: "dolceria",
    sottocategoria: "Confetture e Composte",
    tipo: "Confettura",
    description:
      "Confettura extra di gelso nero siciliano, un frutto antico dal sapore intenso e leggermente aromatico, poco comune sulle tavole.",
    imgFile: "IMG_5675.jpg",
  },

  // -- Frutta Sciroppata --
  {
    name: "Pesche Sciroppate",
    category: "dolceria",
    sottocategoria: "Frutta Sciroppata",
    tipo: "Frutta sciroppata",
    description:
      "Pesche Brezzo sciroppate, dolci e succose: da gustare da sole o per guarnire dessert e coppe gelato.",
    imgFile: "IMG_5657.jpg",
  },
  {
    name: "Ciliegie Sciroppate",
    category: "dolceria",
    sottocategoria: "Frutta Sciroppata",
    tipo: "Frutta sciroppata",
    description:
      "Ciliegie Brezzo sciroppate, dolci e succose: perfette da sole o come guarnizione per dessert e gelati.",
    imgFile: "IMG_5659.jpg",
  },
  {
    name: "Frutti di Bosco Sciroppati",
    category: "dolceria",
    sottocategoria: "Frutta Sciroppata",
    tipo: "Frutta sciroppata",
    description:
      "Misto di frutti di bosco Alpenzu sciroppati, produzione artigianale alpina: mirtilli, lamponi e more pronti da servire.",
    imgFile: "IMG_5672.jpg",
  },

  // -- Creme Dolci --
  {
    name: "Crema al Caramello Salato",
    category: "dolceria",
    sottocategoria: "Creme Dolci",
    tipo: "Crema spalmabile",
    description:
      "Crema siciliana al caramello salato, morbida e avvolgente: da spalmare su pane, fette biscottate o dessert.",
    imgFile: "IMG_5660.jpg",
  },
  {
    name: "Crema al Cacao e Nocciola Bitter",
    category: "dolceria",
    sottocategoria: "Creme Dolci",
    tipo: "Crema spalmabile",
    description:
      "Crema artigianale al cacao e nocciola in versione bitter, dal gusto deciso e meno dolce delle classiche creme spalmabili.",
    imgFile: "IMG_5661.jpg",
  },
  {
    name: "Cremadelizia al Pistacchio",
    category: "dolceria",
    sottocategoria: "Creme Dolci",
    tipo: "Crema spalmabile",
    description:
      "Crema al pistacchio Babbi, vellutata e profumata: ottima da spalmare o come farcitura per dolci e gelati.",
    imgFile: "IMG_5662.jpg",
  },
  {
    name: "Crema di Marroni alla Vaniglia",
    category: "dolceria",
    sottocategoria: "Creme Dolci",
    tipo: "Crema spalmabile",
    description:
      "Crema di marroni Agrimontana profumata alla vaniglia, densa e avvolgente: un classico autunnale da gustare anche da sola.",
    imgFile: "IMG_5666.jpg",
  },

  // -- Miele e Prodotti dell'Alveare --
  {
    name: "Miele di Nettare di Sulla",
    category: "dolceria",
    sottocategoria: "Miele e Prodotti dell'Alveare",
    tipo: "Miele",
    description:
      "Miele di sulla, chiaro e dal gusto delicato, una delle varietà italiane più apprezzate per la sua dolcezza equilibrata.",
    imgFile: "IMG_5674.jpg",
  },
  {
    name: "Miele Italiano di Acacia",
    category: "dolceria",
    sottocategoria: "Miele e Prodotti dell'Alveare",
    tipo: "Miele",
    description:
      "Miele di acacia Brezzo, limpido e dal sapore delicato: tra i mieli italiani più versatili, ottimo con formaggi e dolci.",
    imgFile: "IMG_5676.jpg",
  },
  {
    name: "Miele Italiano di Corbezzolo",
    category: "dolceria",
    sottocategoria: "Miele e Prodotti dell'Alveare",
    tipo: "Miele",
    description:
      "Miele di corbezzolo Brezzo, raro e dal carattere deciso, con note amarognole tipiche di questa varietà pregiata.",
    imgFile: "IMG_5677.jpg",
  },
  {
    name: "MielEnatura Balsamico",
    category: "dolceria",
    sottocategoria: "Miele e Prodotti dell'Alveare",
    tipo: "Miele aromatizzato",
    description:
      "Miscela di miele di eucalipto, pino mugo e menta Brezzo, pensata per un effetto balsamico: ideale nelle bevande calde.",
    imgFile: "IMG_5678.jpg",
  },
  {
    name: "Cocktail d'Api",
    category: "dolceria",
    sottocategoria: "Miele e Prodotti dell'Alveare",
    tipo: "Prodotti dell'alveare",
    description:
      "Selezione Brezzo di miele, polline, pappa reale e propoli: il meglio dell'alveare raccolto in un unico cofanetto.",
    imgFile: "IMG_5681.jpg",
  },

  // -- Confezioni Regalo (dolceria) --
  {
    name: "Sette Giorni di Dolcezza",
    category: "dolceria",
    sottocategoria: "Confezioni Regalo",
    tipo: "Cofanetto regalo",
    description:
      "Cofanetto Brezzo con sette mini confetture, una per ogni giorno della settimana: un'idea regalo golosa e curata.",
    imgFile: "IMG_5679.jpg",
  },
  {
    name: "Le Composte di Frutta Bio",
    category: "dolceria",
    sottocategoria: "Confezioni Regalo",
    tipo: "Cofanetto regalo",
    description:
      "Cofanetto Brezzo con sei composte di frutta biologica in formato mini, completo di cucchiaino in legno: perfetto da regalare.",
    imgFile: "IMG_5680.jpg",
  },

  // ---------------------------------------------------------------------
  // GASTRONOMIA
  // ---------------------------------------------------------------------

  // -- Sughi e Condimenti --
  {
    name: "Passata di Pomodoro",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Salsa pronta",
    description:
      "Passata di pomodoro Brezzo della tradizione mediterranea, prodotto biologico italiano: la base per un buon sugo fatto in casa.",
    imgFile: "IMG_5682.jpg",
  },
  {
    name: "Ragù di Cinghiale",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Sugo pronto",
    description:
      "Ragù di cinghiale Brezzo, sugo pronto dal gusto rustico e deciso: basta scaldarlo per condire la pasta come in Toscana.",
    imgFile: "IMG_5685.jpg",
  },
  {
    name: "Sugo ai Pomodori Secchi",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Sugo pronto",
    description:
      "Sugo gourmet La Posta ai pomodori secchi, saporito e concentrato: ottimo per condire paste corte o bruschette.",
    imgFile: "IMG_5689.jpg",
  },
  {
    name: "Mostarda di Frutta",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Condimento",
    description:
      "Mostarda di frutta gourmet La Posta, agrodolce e speziata: l'accompagnamento classico per bolliti e formaggi stagionati.",
    imgFile: "IMG_5692.jpg",
  },
  {
    name: "Senapata di Pere",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Condimento",
    description:
      "Senapata di pere La Posta, condimento agrodolce alla senape: un abbinamento originale per formaggi e carni bollite.",
    imgFile: "IMG_5693.jpg",
  },
  {
    name: "Sugo con Gambero Rosso",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Sugo pronto",
    description:
      "Sugo Antica Sicilia al gambero rosso, ricco e saporito: pronto per condire spaghetti o linguine in pochi minuti.",
    imgFile: "IMG_5694.jpg",
  },
  {
    name: "Ragù di Chianina",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Sugo pronto",
    description:
      "Ragù di Chianina, senza glutine e senza lattosio, conservanti: il classico ragù toscano pronto da scaldare e servire.",
    imgFile: "IMG_5699.jpg",
  },
  {
    name: "Pronto Pasta alle Cime di Rapa",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Condimento per pasta",
    description:
      "Condimento pronto a base di cime di rapa e olio extravergine d'oliva: il sapore pugliese delle orecchiette in un vasetto.",
    imgFile: "IMG_5703.jpg",
  },
  {
    name: "Salsa con Tartufo Bianco",
    category: "gastronomia",
    sottocategoria: "Sughi e Condimenti",
    tipo: "Salsa al tartufo",
    description:
      "Salsa Giuliano Tartufi al tartufo bianco, intensa e profumata: basta un cucchiaino per arricchire risotti, uova e tagliolini.",
    imgFile: "IMG_5709.jpg",
  },

  // -- Verdure Sott'olio --
  {
    name: "Carciofini Spaccati in Olio d'Oliva",
    category: "gastronomia",
    sottocategoria: "Verdure Sott'olio",
    tipo: "Verdura sott'olio",
    description:
      "Carciofini Brezzo spaccati e conservati in olio d'oliva, teneri e delicati: ottimi come antipasto o per arricchire un tagliere.",
    imgFile: "IMG_5683.jpg",
  },
  {
    name: "Peperoni di Carmagnola",
    category: "gastronomia",
    sottocategoria: "Verdure Sott'olio",
    tipo: "Verdura sott'olio",
    description:
      "Peperoni di Carmagnola Brezzo, dolci e carnosi, lavorati secondo la tradizione piemontese: perfetti in un tagliere di salumi e formaggi.",
    imgFile: "IMG_5686.jpg",
  },
  {
    name: "Peperoni di Carmagnola in Confezione Decorata",
    category: "gastronomia",
    sottocategoria: "Verdure Sott'olio",
    tipo: "Verdura sott'olio",
    description:
      "Peperoni di Carmagnola Brezzo in un vasetto pensato per il regalo, con lo stesso gusto dolce e carnoso della tradizione piemontese.",
    imgFile: "IMG_5687.jpg",
  },

  // -- Paté e Creme Salate --
  {
    name: "Crostino Toscano",
    category: "gastronomia",
    sottocategoria: "Paté e Creme Salate",
    tipo: "Paté",
    description:
      "Crostino toscano Brezzo, paté saporito a base di fegatini secondo la ricetta tradizionale: da spalmare su crostini caldi.",
    imgFile: "IMG_5684.jpg",
  },
  {
    name: "Bruschetta Classica",
    category: "gastronomia",
    sottocategoria: "Paté e Creme Salate",
    tipo: "Condimento per bruschetta",
    description:
      "Bruschetta classica La Posta, condimento a base di pomodoro e verdure: pronta per essere spalmata su pane tostato.",
    imgFile: "IMG_5690.jpg",
  },
  {
    name: "Bruschetta Mediterranea",
    category: "gastronomia",
    sottocategoria: "Paté e Creme Salate",
    tipo: "Condimento per bruschetta",
    description:
      "Bruschetta mediterranea La Posta, con olive e capperi: un condimento sfizioso per crostini e bruschette estive.",
    imgFile: "IMG_5691.jpg",
  },
  {
    name: "Bruschi — Condimento per Bruschetta",
    category: "gastronomia",
    sottocategoria: "Paté e Creme Salate",
    tipo: "Condimento per bruschetta",
    description:
      "Condimento siciliano Antica Sicilia per bruschette, ricco di sapori mediterranei: pronto all'uso su pane tostato.",
    imgFile: "IMG_5696.jpg",
  },

  // -- Pesto --
  {
    name: "Pesto Trapanese",
    category: "gastronomia",
    sottocategoria: "Pesto",
    tipo: "Pesto",
    description:
      "Pesto trapanese Antica Sicilia, con pomodoro, mandorle e basilico: la variante siciliana del pesto, dal gusto mediterraneo.",
    imgFile: "IMG_5695.jpg",
  },
  {
    name: "Pesto Ligure Non Pastorizzato",
    category: "gastronomia",
    sottocategoria: "Pesto",
    tipo: "Pesto",
    description:
      "Pesto ligure non pastorizzato del Frantoio Famiglia Mela, dal 1827: basilico genovese e olio extravergine, come una volta.",
    imgFile: "IMG_5700.jpg",
  },
  {
    name: "Pesto ai Vasetti della Casa Olearia Taggiasca",
    category: "gastronomia",
    sottocategoria: "Pesto",
    tipo: "Pesto",
    description:
      "Pesto genovese con basilico D.O.P. e olio extravergine di oliva Taggiasca: aroma intenso e colore verde brillante.",
    imgFile: "IMG_5702.jpg",
  },

  // -- Conserve Ittiche --
  {
    name: "Filetti di Tonno in Olio d'Oliva",
    category: "gastronomia",
    sottocategoria: "Conserve Ittiche",
    tipo: "Tonno sott'olio",
    description:
      "Filetti di tonno del Frantoio Famiglia Mela, conservati in olio d'oliva al 30%: morbidi e saporiti, pronti da servire.",
    imgFile: "IMG_5701.jpg",
  },
  {
    name: "Filetti di Tonno",
    category: "gastronomia",
    sottocategoria: "Conserve Ittiche",
    tipo: "Tonno sott'olio",
    description:
      "Filetti di tonno Tradizione&Evoluzione, un'eccellenza di Palermo: qualità e lavorazione artigianale in ogni vasetto.",
    imgFile: "IMG_5704.jpg",
  },
  {
    name: "Tonno Rosso — Carloforte",
    category: "gastronomia",
    sottocategoria: "Conserve Ittiche",
    tipo: "Tonno in scatola",
    description:
      "Tonno rosso di Carloforte F.lli Feola, dal 1980, lavorato interamente a mano secondo la tradizione della tonnara sarda.",
    imgFile: "IMG_5705.jpg",
  },

  // -- Panificati e Snack da Forno --
  {
    name: "Spaghettata Siciliana",
    category: "gastronomia",
    sottocategoria: "Panificati e Snack da Forno",
    tipo: "Pasta secca con condimento",
    description:
      "Kit Antica Sicilia con spaghetti e condimento pronto a base di pomodori secchi, funghi e olive: la Sicilia in tavola in pochi minuti.",
    imgFile: "IMG_5697.jpg",
  },
  {
    name: "Scaldatelli Tradizionali",
    category: "gastronomia",
    sottocategoria: "Panificati e Snack da Forno",
    tipo: "Prodotto da forno",
    description:
      "Scaldatelli pugliesi tradizionali, fatti a mano: friabili e sottili, perfetti da sgranocchiare da soli o con affettati.",
    imgFile: "IMG_5706.jpg",
  },
  {
    name: "Bastoncini Pugliesi con Cipolle e Olive",
    category: "gastronomia",
    sottocategoria: "Panificati e Snack da Forno",
    tipo: "Prodotto da forno",
    description:
      "Bastoncini pugliesi fatti a mano con cipolle e olive: uno snack da forno saporito, ottimo anche in accompagnamento a salumi e formaggi.",
    imgFile: "IMG_5707.jpg",
  },
  {
    name: "Tarallini Fragrantini Tradizionali",
    category: "gastronomia",
    sottocategoria: "Panificati e Snack da Forno",
    tipo: "Prodotto da forno",
    description:
      "Tarallini pugliesi tradizionali, fragranti e croccanti: lo snack salato classico da tenere sempre in dispensa.",
    imgFile: "IMG_5708.jpg",
  },

  // -- Confezioni Regalo (gastronomia) --
  {
    name: "Le Salse per Formaggi",
    category: "gastronomia",
    sottocategoria: "Confezioni Regalo",
    tipo: "Cofanetto regalo",
    description:
      "Cofanetto Brezzo con sei salse abbinate ai formaggi (pere e zenzero, cipolle rosse e altre): un'idea regalo per gli amanti dei formaggi.",
    imgFile: "IMG_5688.jpg",
  },
  {
    name: "Salse per Formaggi (formato mini)",
    category: "gastronomia",
    sottocategoria: "Confezioni Regalo",
    tipo: "Cofanetto regalo",
    description:
      "Confezione regalo Brezzo con tre salse in formato mini pensate per accompagnare i formaggi: pratica e curata nei dettagli.",
    imgFile: "IMG_5698.jpg",
  },
];

// IMMAGINI ESCLUSE (scelta del negozio, 2026-08-02): i prodotti entrano
// senza foto e le immagini vengono caricate a mano dal pannello admin,
// una per una. Il caricamento su Cloudinary che stava qui è stato tolto:
// `imgFile` resta nei dati sopra come promemoria di quale scatto
// corrisponde a quale prodotto, ma non viene letto né caricato.
//
// `node scripts/importAlimentari.js --dry-run` mostra solo cosa verrebbe
// scritto (e valida ogni documento) senza toccare il database.
const DRY_RUN = process.argv.includes("--dry-run");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Alimentare.countDocuments({});
  if (existing > 0) {
    console.error(
      `Esistono già ${existing} alimentari nel database — importazione annullata per evitare duplicati.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // img: "" — la foto la mette l'admin dal pannello
  const docs = ALIMENTARI.map(({ imgFile, ...rest }) => ({ ...rest, img: "" }));

  if (DRY_RUN) {
    const perReparto = docs.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + 1;
      return acc;
    }, {});
    const gruppi = [...new Set(docs.map((d) => `${d.category} / ${d.sottocategoria}`))];

    // valida ogni documento contro lo schema senza salvarlo: se un campo
    // è sbagliato lo si scopre ora, non a metà inserimento
    for (const d of docs) await new Alimentare(d).validate();

    console.log(`DRY RUN — nessuna scrittura sul database.`);
    console.log(`Documenti pronti: ${docs.length}`, perReparto);
    console.log(`Sottocategorie (${gruppi.length}):`);
    gruppi.forEach((g) => console.log(`  - ${g}`));
    console.log(`Tutti i documenti superano la validazione dello schema.`);
    await mongoose.disconnect();
    return;
  }

  const inserted = await Alimentare.insertMany(docs);
  console.log(`Importati ${inserted.length} alimentari (senza immagini).`);

  await mongoose.disconnect();
};

run();
