// Migrazione UNA TANTUM: importa i vini bianchi da frontend/src/data/data.js
// (VINI_BIANCHI) nel database, prima che l'array venga rimosso e la
// categoria "bianchi" passi a leggere dalla stessa API.
// Uso: node scripts/importBianchi.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const BIANCHI = [
  { name: "Trebbiano d'Abruzzo Marina Cvetic Masciarelli", regione: "Abruzzo", description: "Trebbiano d'altra dimensione: affinato in legno, cremoso, con agrumi maturi e nocciola — bianco di struttura per pesce importante." },
  { name: "Chardonnay Nals Margreid", regione: "Alto Adige", description: "Chardonnay alpino fresco e agrumato, dal finale sapido — con aperitivi e antipasti di lago." },
  { name: "Chardonnay Merol San Michele Appiano", regione: "Alto Adige", description: "Chardonnay affinato con cura: frutta gialla, lieve nota burrosa e freschezza — elegante con carni bianche." },
  { name: "Chardonnay Pinot Grigio Lageder", regione: "Alto Adige", description: "Blend bianco pulito e luminoso: mela, pera e slancio minerale — un quotidiano di qualità." },
  { name: "Chardonnay Sanct Valentin San Michele Appiano", regione: "Alto Adige", description: "Chardonnay di punta: ricco, cremoso, con legno raffinato e lunga scia — bianco da grandi tavole." },
  { name: "Dies Abbazia di Novacella", regione: "Alto Adige", description: "Bianco fresco di montagna dall'abbazia millenaria: fiori bianchi e mela croccante — pulizia di valle Isarco." },
  { name: "Gewurztraminer Hofstatter", regione: "Alto Adige", description: "Gewürztraminer aromatico: rosa, litchi e spezie dolci su sorso morbido — con cucina speziata e formaggi erborinati." },
  { name: "Gewurztraminer San Michele Appiano", regione: "Alto Adige", description: "Aromatico ed elegante: petali, frutta esotica e finale asciutto — l'esotismo altoatesino." },
  { name: "Gewurztraminer Lageder", regione: "Alto Adige", description: "Gewürztraminer in equilibrio: profumi intensi ma sorso sobrio e fresco — mai stucchevole." },
  { name: "Gewurztraminer Falkenstein", regione: "Alto Adige", description: "Interpretazione secca e verticale del Gewürztraminer: aromi fini e sapidità — per chi lo ama asciutto." },
  { name: "Gewurztraminer Abbazia di Novacella", regione: "Alto Adige", description: "Aromatico dell'abbazia: rosa e spezie su sorso pieno e fresco — con speck e formaggi di malga." },
  { name: "Gewurztraminer Kolbenhof Hofstatter", regione: "Alto Adige", description: "Il cru di Termeno di casa Hofstätter: opulento, speziato, profondo — un riferimento della tipologia." },
  { name: "Gewurztraminer Nussbaumer Cantina Termeno", regione: "Alto Adige", description: "Dal paese che dà il nome al vitigno: intenso, maestoso, celebre — il Gewürztraminer per eccellenza." },
  { name: "Gewurztraminer Sanct Valentin San Michele Appiano", regione: "Alto Adige", description: "Selezione aromatica di vertice: litchi, zenzero e stoffa ricca — grande con formaggi stagionati e cucina orientale." },
  { name: "Kerner Abbazia di Novacella", regione: "Alto Adige", description: "Kerner di valle Isarco: agrumi, erbe alpine e acidità croccante — montagna pura nel bicchiere." },
  { name: "Muller Thurgau Hofstatter", regione: "Alto Adige", description: "Müller Thurgau leggero e profumato: fiori bianchi e mela verde — l'aperitivo di quota." },
  { name: "Muller Thurgau Lageder", regione: "Alto Adige", description: "Fragrante e scattante, con erbe di prato e agrumi — semplicità alpina ben vestita." },
  { name: "Muller Thurgau San Michele Appiano", regione: "Alto Adige", description: "Bianco snello e aromatico dal sorso dissetante — con antipasti leggeri e verdure." },
  { name: "Muller Thurgau Abbazia di Novacella", regione: "Alto Adige", description: "Müller di montagna teso e floreale — l'altitudine in un sorso." },
  { name: "Pinot Bianco San Michele Appiano", regione: "Alto Adige", description: "Il vitigno simbolo della casa: mela golden, fiori e sapidità elegante — bianco gastronomico per eccellenza." },
  { name: "Pinot Bianco Hofstatter", regione: "Alto Adige", description: "Pinot Bianco preciso e cristallino, di beva signorile — con antipasti e pesce d'acqua dolce." },
  { name: "Pinot Bianco Lageder", regione: "Alto Adige", description: "Fresco, essenziale, luminoso — la quotidianità del Pinot Bianco fatta bene." },
  { name: "Pinot Bianco Nals Margreid", regione: "Alto Adige", description: "Pinot Bianco di collina: frutta bianca croccante e finale salato — versatile e gastronomico." },
  { name: "Pinot Bianco Barthenau Hofstatter", regione: "Alto Adige", description: "Cru storico di Pinot Bianco: profondità, cremosità e tensione — dimostra quanto in alto arrivi questo vitigno." },
  { name: "Pinot Bianco Moriz Cantina Termeno", regione: "Alto Adige", description: "Pinot Bianco fragrante dal sorso morbido e pulito — compagno quotidiano di verdure e pesce." },
  { name: "Pinot Grigio Sanct Valentin San Michele Appiano", regione: "Alto Adige", description: "Pinot Grigio di selezione: ricco, speziato, lontano dalle versioni anonime — con risotti e crostacei." },
  { name: "Riesling Falkenstein", regione: "Alto Adige", description: "Riesling di culto della Val Venosta: teso, minerale, agrumato — un bianco di roccia per intenditori." },
  { name: "Riesling Nals Margreid", regione: "Alto Adige", description: "Riesling alpino nervoso e pulito, tra lime e pietra — freschezza tagliente." },
  { name: "Riesling Praepositus Abbazia di Novacella", regione: "Alto Adige", description: "Il Riesling di punta dell'abbazia: profondo, minerale, di lunga evoluzione — il vertice della valle Isarco." },
  { name: "Riesling Rain Lageder", regione: "Alto Adige", description: "Riesling del vigneto Rain: agrumi, erbe e mineralità in un sorso slanciato — precisione biodinamica." },
  { name: "Sauvignon Lahn San Michele Appiano", regione: "Alto Adige", description: "Sauvignon fragrante: sambuco, pompelmo e finale sapido — da aperitivo e piatti di asparagi." },
  { name: "Sauvignon Sanct Valentin San Michele Appiano", regione: "Alto Adige", description: "Tra i Sauvignon italiani più premiati: esplosivo nei profumi, ricco nel sorso — un fuoriclasse." },
  { name: "Sauvignon Voglar Peter Dipoli", regione: "Alto Adige", description: "Sauvignon di montagna serio e longevo: minerale, teso, senza mode — artigianato puro." },
  { name: "Schulthauser San Michele Appiano", regione: "Alto Adige", description: "Pinot Bianco storico di San Michele: cremoso e fresco insieme — un piccolo classico altoatesino." },
  { name: "Sylvaner Abbazia di Novacella", regione: "Alto Adige", description: "Sylvaner di valle Isarco: erbe alpine, mela verde e sale — il bianco dei masi di montagna." },
  { name: "Falanghina Terredora", regione: "Campania", description: "Falanghina fresca e solare: fiori bianchi, pera e agrumi — con la cucina di mare campana è di casa." },
  { name: "Fiano di Avellino Campanaro Feudi San Gregorio", regione: "Campania", description: "Fiano affinato in legno: nocciola, miele e frutta gialla su sorso ricco — un bianco meridionale importante." },
  { name: "Fiano di Avellino Terredora", regione: "Campania", description: "Fiano di Avellino elegante: nocciola, pera e freschezza collinare — tra i grandi bianchi del Sud." },
  { name: "Greco di Tufo Terredora", regione: "Campania", description: "Greco minerale e deciso, con agrumi e pietra focaia — carattere vulcanico da crostacei." },
  { name: "Malvasia Secca Perinelli", regione: "Emilia Romagna", description: "Malvasia aromatica in versione secca: fiori, salvia e beva asciutta — con i salumi piacentini è tradizione." },
  { name: "Ortrugo Perinelli", regione: "Emilia Romagna", description: "L'autoctono bianco piacentino: leggero, fragrante, dissetante — l'aperitivo dei colli." },
  { name: "Gewurztraminer d'Alsace Pierre Frick", regione: "Francia", description: "Gewürztraminer alsaziano in biodinamica: rosa, spezie e frutto candito su sorso avvolgente — con formaggi e cucina speziata." },
  { name: "Chablis Saint Pierre Albert Pic", regione: "Francia", description: "Chablis classico: Chardonnay su suoli di gesso, minerale e teso — ostriche e crostacei lo reclamano." },
  { name: "Pinot Gris Zind Humbrecht", regione: "Francia", description: "Pinot Gris di grande firma alsaziana: ricco, fumé, profondo — bianco da gastronomia importante." },
  { name: "Pouilly Fumé Chateau De Tracy", regione: "Francia", description: "Sauvignon della Loira dal castello storico: pietra focaia, agrumi e finezza — il fumé originale." },
  { name: "Pouilly Fumé De Ladoucette", regione: "Francia", description: "Pouilly Fumé celebre ed elegante: note affumicate, frutto bianco e classe — con pesce in punta di forchetta." },
  { name: "Riesling d'Alsace Pierre Frick", regione: "Francia", description: "Riesling alsaziano naturale: secco, minerale, senza trucco — puro terroir in bottiglia." },
  { name: "Sancerre Comte Lafond De Ladoucette", regione: "Francia", description: "Sancerre aristocratico: Sauvignon floreale e minerale dal sorso cristallino — Loira da manuale." },
  { name: "Sylvaner d'Alsace Pierre Frick", regione: "Francia", description: "Sylvaner artigianale e schietto: fiori bianchi, erbe e beva golosa — semplicità biodinamica." },
  { name: "Capo Martino Jermann", regione: "Friuli", description: "Blend di autoctoni affinato in legno: complesso, cremoso, profondo — uno dei grandi bianchi di Jermann." },
  { name: "Friulano Le Vigne di Zamò", regione: "Friuli", description: "Friulano dei Colli Orientali: mandorla, fiori di campo e sapidità — l'identità bianca del Friuli." },
  { name: "Friulano Russiz Superiore", regione: "Friuli", description: "Friulano di Collio elegante e maturo, dal finale ammandorlato — con il prosciutto di San Daniele è un rito." },
  { name: "Friulano Marco Felluga", regione: "Friuli", description: "Friulano armonico e fresco: pera, mandorla e sorso disteso — quotidiano di classe." },
  { name: "Friulano Livio Felluga", regione: "Friuli", description: "Il Friulano di una casa leggendaria: preciso, sapido, luminoso — eleganza collinare." },
  { name: "Pinot Grigio Le Vigne di Zamò", regione: "Friuli", description: "Pinot Grigio serio: frutta bianca matura, struttura e pulizia — altro che versioni anonime." },
  { name: "Pinot Grigio Marco Felluga", regione: "Friuli", description: "Pinot Grigio di Collio: rotondo, fine, dal sorso pieno — con antipasti e primi di pesce." },
  { name: "Pinot Grigio Dessimis Le Vie di Romans", regione: "Friuli", description: "Cru di Pinot Grigio in stile ramato: ricco, speziato, di grande personalità — un riferimento italiano." },
  { name: "Ribolla Gialla Marco Felluga", regione: "Friuli", description: "Ribolla agile e agrumata, dalla beva scattante — l'aperitivo friulano per eccellenza." },
  { name: "Ronco di Corte Le Vigne di Zamò", regione: "Friuli", description: "Bianco di ronco dei Colli Orientali: struttura, frutto maturo e sapidità — la collina si sente." },
  { name: "Sauvignon Vigna Petrussa", regione: "Friuli", description: "Sauvignon artigianale: sambuco, frutto esotico e freschezza — piccola vigna, grande carattere." },
  { name: "Sauvignon Marco Felluga", regione: "Friuli", description: "Sauvignon di Collio espressivo e ordinato: aromi nitidi, sorso saporito — con asparagi e caprini." },
  { name: "Sauvignon Livio Felluga", regione: "Friuli", description: "Sauvignon elegante, mai sopra le righe: frutto esotico misurato e mineralità — stile Felluga." },
  { name: "Vintage Tunina Jermann", regione: "Friuli", description: "Il grande bianco italiano per antonomasia: blend di vigne vecchie, ricco, floreale, leggendario — un capolavoro friulano." },
  { name: "Pigato Costadevigne", regione: "Liguria", description: "Pigato ligure: macchia mediterranea, pesca e sale — nato per trofie al pesto e pesce alla ligure." },
  { name: "Vermentino Costadevigne", regione: "Liguria", description: "Vermentino di riviera fresco e salino — il mare della Liguria nel bicchiere." },
  { name: "Bianco Convento Annunziata Bellavista", regione: "Lombardia", description: "Chardonnay fermo di Franciacorta dal convento in collina: cremoso, elegante, raro — un bianco di prestigio." },
  { name: "Bianco Rinè Cantrina", regione: "Lombardia", description: "Bianco gardesano di piccola cantina: aromatico, morbido, originale — una chicca del territorio." },
  { name: "Curtefranca bianco Bellavista", regione: "Lombardia", description: "Chardonnay e Pinot Bianco di Franciacorta: fine, fresco, signorile — l'eleganza anche senza bollicine." },
  { name: "Curtefranca bianco Cà del Bosco", regione: "Lombardia", description: "Bianco fermo di una casa mitica: agrumi, fiori e precisione — la Franciacorta in versione tranquilla." },
  { name: "Curtefranca bianco Cavalleri", regione: "Lombardia", description: "Curtefranca luminoso e sapido, di beva armoniosa — con pesce di lago e risotti." },
  { name: "Verdea Nettare dei Santi", regione: "Lombardia", description: "L'autoctono bianco di San Colombano: fragrante, schietto, a chilometro zero — la nostra collina nel calice." },
  { name: "Verdea I.G.T. Nettare dei Santi", regione: "Lombardia", description: "Verdea in versione selezionata: frutto pieno e beva generosa — tradizione lodigiana da riscoprire." },
  { name: "Verdicchio di Jesi Casal di Serra Umani Ronchi", regione: "Marche", description: "Verdicchio di vigna alta: mandorla, anice e sapidità — tra i bianchi italiani che invecchiano meglio." },
  { name: "Falanghina Di Majo Norante", regione: "Molise", description: "Falanghina fragrante e mediterranea: fiori, agrumi e beva facile — con la frittura di paranza." },
  { name: "Greco Di Majo Norante", regione: "Molise", description: "Greco molisano: frutta gialla, mineralità e carattere antico — da una famiglia storica del Sud." },
  { name: "Arneis Michele Chiarlo", regione: "Piemonte", description: "Arneis di Langa: pera, fiori bianchi e mandorla fresca — il bianco gentile del Piemonte." },
  { name: "Blangè Ceretto", regione: "Piemonte", description: "Il bianco piemontese più famoso: Arneis vivace con lievissimo perlage, fresco e immediato — aperitivo irrinunciabile." },
  { name: "Chardonnay Prasuè Saracco", regione: "Piemonte", description: "Chardonnay piemontese fine e fragrante, dal frutto pulito — quotidiano elegante." },
  { name: "Gavi Pio Cesare", regione: "Piemonte", description: "Cortese di Gavi: agrumi, mandorla e sorso teso — il bianco storico delle tavole di pesce piemontesi." },
  { name: "L'altro Chardonnay Pio Cesare", regione: "Piemonte", description: "Chardonnay in acciaio, fresco e diretto: frutta bianca croccante — l'alternativa quotidiana firmata Pio Cesare." },
  { name: "Chardonnay Tormaresca", regione: "Puglia", description: "Chardonnay pugliese fresco e solare: frutta gialla e sorso morbido — con orecchiette e cucina di mare." },
  { name: "Stellato Pala", regione: "Sardegna", description: "Vermentino di vigne affacciate sul mare: salino, agrumato, luminoso — una stella con crudi e bottarga." },
  { name: "Vermentino Capichera", regione: "Sardegna", description: "Il Vermentino di Gallura per eccellenza: ricco, profondo, mediterraneo — un bianco importante di culto." },
  { name: "Vermentino Pala", regione: "Sardegna", description: "Vermentino sardo fragrante: macchia, cedro e freschezza — con fregola e frutti di mare." },
  { name: "Chardonnay Planeta", regione: "Sicilia", description: "Lo Chardonnay che rese celebre Planeta: cremoso, avvolgente, con legno dolce — un classico mediterraneo." },
  { name: "Charme bianco Firriato", regione: "Sicilia", description: "Bianco siciliano morbido e profumato, pensato per piacere — aperitivi al tramonto." },
  { name: "Chiaramonte bianco Firriato", regione: "Sicilia", description: "Bianco solare da uve siciliane: frutta gialla e freschezza — il quotidiano isolano." },
  { name: "Chiarandà Donnafugata", regione: "Sicilia", description: "Chardonnay siciliano di punta: ricco, elegante, con legno ben integrato — per pesce strutturato." },
  { name: "La Segreta Planeta", regione: "Sicilia", description: "Blend fresco e immediato: agrumi, fiori e beva spensierata — il bianco di ogni giorno di Planeta." },
  { name: "Lighea Donnafugata", regione: "Sicilia", description: "Zibibbo secco: zagara e albicocca su sorso asciutto e salino — una sirena mediterranea." },
  { name: "Quater bianco Firriato", regione: "Sicilia", description: "Quattro autoctoni bianchi siciliani in blend: aromatico, sapido, originale — l'isola intera nel calice." },
  { name: "Santagostino bianco Firriato", regione: "Sicilia", description: "Catarratto e Chardonnay: struttura e sole, frutto maturo e freschezza — bianco gastronomico siciliano." },
  { name: "Tripudium Bianco Pellegrino", regione: "Sicilia", description: "Bianco siciliano generoso, morbido e fruttato — una festa quotidiana a tavola." },
  { name: "Vigna di Gabri Donnafugata", regione: "Sicilia", description: "Ansonica elegante: fiori, mandorla e sapidità — dedicato a Gabriella, fondatrice della cantina." },
  { name: "Zibibbo Gibelè Pellegrino", regione: "Sicilia", description: "Zibibbo secco e aromatico: uva moscata, agrumi e sale — profumi di Pantelleria nel bicchiere." },
  { name: "Vermentino Sada", regione: "Toscana", description: "Vermentino della costa toscana: fresco, salmastro, immediato — con cacciucco e crostacei." },
  { name: "Orvieto San Giovanni Antinori", regione: "Umbria", description: "Orvieto classico: fiori bianchi, mela e mandorla su beva fresca — il bianco storico dell'Italia centrale." },
  { name: "Cadetto bianco Lungarotti", regione: "Umbria", description: "Bianco umbro quotidiano di casa Lungarotti: fragrante, semplice, ben fatto — a tutto pasto." },
  { name: "Cervaro della Sala Antinori", regione: "Umbria", description: "Chardonnay e Grechetto affinati in barrique: cremoso, minerale, longevo — il grande bianco italiano per definizione." },
  { name: "Chardonnay Les Cretes", regione: "Valle d'Aosta", description: "Chardonnay di montagna fresco e nitido: mela, agrumi e tensione alpina — purezza valdostana." },
  { name: "Chardonnay Cuvée Bois Les Cretes", regione: "Valle d'Aosta", description: "Il bianco alpino più celebrato: Chardonnay affinato in legno, cremoso e minerale — una vetta delle Alpi." },
  { name: "Bidibi Maculan", regione: "Veneto", description: "Bianco fragrante e originale di casa Maculan: frutto vivace e beva allegra — spensierato per l'aperitivo." },
  { name: "Garganega Camporengo Le Fraghe", regione: "Veneto", description: "Garganega in purezza: fiori bianchi, mela e sapidità gentile — artigianato gardesano." },
  { name: "Le Lave Bertani", regione: "Veneto", description: "Bianco veronese di struttura da suoli vulcanici: morbido, minerale, profondo — con risotti e pesce al forno." },
  { name: "Lugana Pievecroce Costaripa", regione: "Veneto", description: "Lugana del Garda: Turbiana morbida con agrumi, pesca e sale — un bianco amatissimo con il pesce di lago." },
  { name: "Masianco Masi", regione: "Veneto", description: "Pinot Grigio con Verduzzo appassito: più ricco del solito, morbido e fruttato — il bianco in stile Masi." },
  { name: "Soave Capitel Foscarino Anselmi", regione: "Veneto", description: "Cru storico di Garganega: floreale, cremoso, di grande finezza — il Soave che non ti aspetti." },
  { name: "Soave San Vincenzo Anselmi", regione: "Veneto", description: "Garganega fragrante e gentile: fiori, pera e freschezza — un quotidiano d'autore." },
  { name: "Soave Sereole Bertani", regione: "Veneto", description: "Soave classico di collina: mandorla, agrumi e beva elegante — con risotto e verdure di stagione." },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "bianchi" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} vini bianchi nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = BIANCHI.map((w) => ({ ...w, category: "bianchi" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} vini bianchi.`);

  await mongoose.disconnect();
};

run();
