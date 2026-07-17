// Migrazione UNA TANTUM: importa gli spumanti da frontend/src/data/data.js
// (SPUMANTI) nel database. Uso: node scripts/importSpumanti.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const SPUMANTI = [
  { name: "Blanc de Blanc extra Brut Arunda", regione: "Alto Adige", description: "Metodo classico d'alta quota: Chardonnay teso, perlage fine e dosaggio minimo — bollicine dalla cantina più alta d'Europa." },
  { name: "Brut Rosè Excellor Arunda", regione: "Alto Adige", description: "Rosé di montagna elegante: piccoli frutti, crosta di pane e freschezza alpina — per brindisi fuori dal coro." },
  { name: "Brut Metodo Classico Domm Riccardi", regione: "Lombardia", description: "Metodo classico lombardo: perlage fine, crosta di pane e agrumi — un brindisi dal nome meneghino." },
  { name: "Brut Metodo Classico Domm Magnum Riccardi", regione: "Lombardia", description: "Il Domm in formato magnum: doppia bottiglia, doppia festa — ideale per le tavolate." },
  { name: "Brut Riserva Costaripa", regione: "Lombardia", description: "Riserva spumante gardesana: perlage cremoso e frutto maturo — la mano di Costaripa nelle bollicine." },
  { name: "Brut Rosè Costaripa", regione: "Lombardia", description: "Rosé gardesano raffinato: buccia di cipolla, fragolina e freschezza — bollicine rosa del lago." },
  { name: "Brut Rosè Riccardi", regione: "Lombardia", description: "Rosé brut fragrante: frutti rossi e perlage vivace — aperitivo in rosa senza pensieri." },
  { name: "Brut Spumante Costaripa", regione: "Lombardia", description: "Brut fresco e diretto del Garda: mela, fiori e bollicina pulita — quotidiano da brindisi." },
  { name: "Brut Spumante Magnum Costaripa", regione: "Lombardia", description: "Il brut del Garda in magnum: più grande la bottiglia, più lunga la festa." },
  { name: "Chardonnay Brut Riccardi", regione: "Lombardia", description: "Chardonnay spumantizzato: frutta bianca e perlage cremoso — semplice e ben fatto." },
  { name: "Cuvée Prestige Cà del Bosco", regione: "Lombardia", description: "La Franciacorta più famosa d'Italia: cremosa, precisa, immancabile — il brindisi che non delude mai." },
  { name: "Cuvée Prestige conf. 2 bottiglie Cà del Bosco", regione: "Lombardia", description: "Cuvée Prestige in confezione da due: il regalo che fa sempre bella figura." },
  { name: "Cuvée Prestige conf. 3 bottiglie Cà del Bosco", regione: "Lombardia", description: "Confezione da tre bottiglie: per chi ama regalare, o farsi trovare pronto." },
  { name: "Cuvée Prestige Jeroboam legno Cà del Bosco", regione: "Lombardia", description: "Jeroboam in cassa di legno: tre litri di Franciacorta per le grandi occasioni — un regalo monumentale." },
  { name: "Cuvée Prestige magnum Cà del Bosco", regione: "Lombardia", description: "Il Prestige in magnum: perlage ancora più fine, presenza scenica assicurata." },
  { name: "Franciacorta Blanc de Blancs Conti Ducco", regione: "Lombardia", description: "Franciacorta da solo Chardonnay: fiori bianchi, agrumi e finezza." },
  { name: "Franciacorta Brut Conti Ducco", regione: "Lombardia", description: "Franciacorta brut classica: pane tostato, mela e bollicina ordinata." },
  { name: "Franciacorta Brut Montenisa", regione: "Lombardia", description: "La Franciacorta di casa Antinori: elegante, fresca, signorile." },
  { name: "Franciacorta Brut 61 Berlucchi", regione: "Lombardia", description: "Il 61 celebra l'anno in cui nacque la Franciacorta: fragrante e agrumato — da Berlucchi, il pioniere." },
  { name: "Franciacorta Brut 1996 Cà del Bosco", regione: "Lombardia", description: "Millesimato storico di Cà del Bosco: evoluzione nobile e perlage sottile — per intenditori." },
  { name: "Franciacorta Brut Cà del Bosco", regione: "Lombardia", description: "Il brut di Cà del Bosco: rigore, cremosità e classe — Franciacorta di riferimento." },
  { name: "Franciacorta Brut 61 Berlucchi", regione: "Lombardia", description: "Il 61 celebra l'anno in cui nacque la Franciacorta: fragrante e agrumato — da Berlucchi, il pioniere." },
  { name: "Franciacorta Brut Blanc de Blancs Cavalleri", regione: "Lombardia", description: "Chardonnay in purezza di Cavalleri: teso, gessoso, elegante — Franciacorta d'autore." },
  { name: "Franciacorta Brut Magnum legno Montenisa", regione: "Lombardia", description: "Montenisa in magnum con cassa di legno: il regalo di rappresentanza." },
  { name: "Franciacorta Brut magnum Cavalleri", regione: "Lombardia", description: "Cavalleri in magnum: la finezza raddoppia — per tavolate importanti." },
  { name: "Franciacorta Brut magnum Conti Ducco", regione: "Lombardia", description: "Il brut Conti Ducco in formato magnum — festa per molti." },
  { name: "Franciacorta Brut millesimato Conti Ducco", regione: "Lombardia", description: "Millesimato di annata singola: più profondità e carattere." },
  { name: "Franciacorta Brut pas dosè Cavalleri", regione: "Lombardia", description: "Pas dosé: zero zuccheri aggiunti, tutto terroir — asciutto e verticale, per palati precisi." },
  { name: "Franciacorta Brut Rosè 61 Berlucchi", regione: "Lombardia", description: "Il 61 in rosa: Pinot Nero, fragolina e brio — brindisi con carattere." },
  { name: "Franciacorta Brut Rosè 61 Conti Ducco", regione: "Lombardia", description: "Rosé brut di Franciacorta: frutti rossi e perlage sottile." },
  { name: "Franciacorta Brut Satèn Cavalleri", regione: "Lombardia", description: "Satèn: la Franciacorta di seta, morbida e cremosa — solo Chardonnay e carezze." },
  { name: "Franciacorta Collezione Rosè Cavalleri", regione: "Lombardia", description: "Selezione rosé di Cavalleri: elegante, complessa, rara." },
  { name: "Franciacorta Cremant Conti Ducco", regione: "Lombardia", description: "Stile crémant: pressione più dolce, sorso vellutato — bollicina gentile." },
  { name: "Franciacorta Dosage Zero Cà del Bosco", regione: "Lombardia", description: "Dosage Zéro: la Franciacorta nuda, senza dosaggio — pura, tesa, autentica." },
  { name: "Franciacorta Gran Cuvée Bellavista", regione: "Lombardia", description: "La Gran Cuvée di Bellavista: aristocratica, cremosa, festosa — sinonimo di brindisi elegante." },
  { name: "Franciacorta Gran Cuvée magnum Bellavista", regione: "Lombardia", description: "Bellavista in magnum: eleganza in grande formato." },
  { name: "Franciacorta Gran Cuvée saten Bellavista", regione: "Lombardia", description: "Il Satèn di Bellavista: morbidezza serica e perlage cremoso." },
  { name: "Franciacorta Gran Cuvée Rosè Bellavista", regione: "Lombardia", description: "La Gran Cuvée in rosa: Pinot Nero, grazia e piccoli frutti." },
  { name: "Franciacorta Grandi cru Cavalleri", regione: "Lombardia", description: "Dalle vigne migliori di Cavalleri: profondità, gesso e lunga scia." },
  { name: "Franciacorta Pas dosè Conti Ducco", regione: "Lombardia", description: "Pas dosé asciutto e minerale: per chi ama le bollicine senza trucco." },
  { name: "Franciacorta Pas Operè Bellavista", regione: "Lombardia", description: "Pas Operé: il Bellavista più puro, millesimato e non dosato — da collezionisti." },
  { name: "Franciacorta Saten Cà del Bosco", regione: "Lombardia", description: "Il Satèn di Cà del Bosco: crema, fiori bianchi e seta — dolcezza di tatto, non di zucchero." },
  { name: "Palazzo Lana Brut Saten Berlucchi", regione: "Lombardia", description: "Palazzo Lana: la riserva di Berlucchi, profonda e raffinata — il vertice della casa." },
  { name: "Spumante Rosè Nettare dei Santi", regione: "Lombardia", description: "Bollicine rosa di San Colombano: fragranti e genuine — il brindisi a chilometro zero." },
  { name: "Franciacorta Cuvée Bellavista", regione: "Lombardia", description: "La cuvée d'ingresso di Bellavista: fresca, floreale, subito felice." },
  { name: "Brut Blanc de Blanc Chiarlo", regione: "Piemonte", description: "Blanc de blancs piemontese: agrumi, fiori e perlage vivace — aperitivo di classe." },
  { name: "Brut Pinot Spumante Banfi", regione: "Piemonte", description: "Pinot spumantizzato: fragrante, secco, conviviale." },
  { name: "Ferrari Brut Jeroboam Ferrari", regione: "Trentino", description: "Il Ferrari Brut in jeroboam: tre litri di Trentodoc per fare colpo." },
  { name: "Ferrari Maximum Brut Ferrari", regione: "Trentino", description: "Il Maximum: Chardonnay di montagna, crosta di pane e freschezza — il brindisi italiano per definizione." },
  { name: "Ferrari Maximum Brut magnum Ferrari", regione: "Trentino", description: "Maximum in magnum: perlage più fine, festa più lunga." },
  { name: "Ferrari Maximum Rosè Ferrari", regione: "Trentino", description: "Rosé di Pinot Nero: fragolina, eleganza e brio — il lato rosa di casa Ferrari." },
  { name: "Ferrari Perlè Ferrari", regione: "Trentino", description: "Perlé: millesimato di solo Chardonnay, cremoso e profondo — Trentodoc d'autore." },
  { name: "Ferrari Perlè 2006 magnum Ferrari", regione: "Trentino", description: "Perlé millesimato 2006 in magnum: evoluzione nobile per grandi occasioni." },
  { name: "Ferrari Perlè Nero Ferrari", regione: "Trentino", description: "Perlé Nero: Pinot Nero in purezza, struttura e finezza — il blanc de noirs di Ferrari." },
  { name: "Ferrari Riserva Lunelli 2003 Ferrari", regione: "Trentino", description: "Riserva di famiglia affinata in legno: complessa, ampia, rara." },
  { name: "Ferrari Riserva Lunelli 2004 Ferrari", regione: "Trentino", description: "Riserva Lunelli 2004: profondità, miele e crosta di pane — bollicine da meditazione." },
  { name: "Giulio Ferrari riserva 2001 Ferrari", regione: "Trentino", description: "Il Giulio Ferrari: la riserva italiana più celebrata, oltre dieci anni sui lieviti — leggenda del Trentodoc." },
  { name: "Brut Metodo Classico n. 10 Valdo", regione: "Veneto", description: "Metodo classico Numero 10 di Valdo: perlage fine e sorso asciutto — il lato serio della casa." },
  { name: "Cartizze Superiore Ruggeri", regione: "Veneto", description: "Cartizze: la collina più preziosa di Valdobbiadene — morbido, floreale, festoso." },
  { name: "Cartizze Superiore Foss Marai", regione: "Veneto", description: "Il Cartizze di Foss Marai: cremoso ed elegante — il prosecco vestito da sera." },
  { name: "Cuvée Brut Foss Marai", regione: "Veneto", description: "Cuvée brut fragrante e pulita: pera, fiori e bollicina gentile." },
  { name: "Cuvée brut Magnum Foss Marai", regione: "Veneto", description: "La cuvée Foss Marai in magnum: brindisi generoso." },
  { name: "Origine Brut Valdo", regione: "Veneto", description: "Prosecco brut di casa Valdo: fresco, immediato, affidabile." },
  { name: "Prosecco DOC Ruggeri", regione: "Veneto", description: "Prosecco di scuola Ruggeri: Glera fragrante, mela e fiori — l'aperitivo per antonomasia." },
  { name: "Riserva del Fondatore Valdo", regione: "Veneto", description: "La riserva storica di Valdo: più struttura e finezza del prosecco di ogni giorno." },
  { name: "Riserva del Fondatore Magnum Valdo", regione: "Veneto", description: "La Riserva del Fondatore in magnum: per brindare in tanti." },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "spumanti" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} spumanti nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = SPUMANTI.map((w) => ({ ...w, category: "spumanti" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} spumanti.`);

  await mongoose.disconnect();
};

run();
