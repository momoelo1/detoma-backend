// Migrazione UNA TANTUM: importa gli champagne da frontend/src/data/data.js
// (CHAMPAGNE) nel database. Uso: node scripts/importChampagne.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const CHAMPAGNE = [
  { name: "Belle Epoque Perrier Jouet", regione: "Francia", description: "La bottiglia con gli anemoni dipinti: Champagne floreale e setoso — icona di eleganza dal 1902." },
  { name: "Blanc de Blancs Roederer", regione: "Francia", description: "Blanc de blancs di Roederer: Chardonnay puro, gesso e agrumi — la precisione della grande maison." },
  { name: "Blanc de Blancs Ruinart", regione: "Francia", description: "Il blanc de blancs per antonomasia, dalla maison più antica della Champagne: luminoso e agrumato." },
  { name: "Blanc de Blancs d'Ay Gaston Chiquet", regione: "Francia", description: "Rarità da vigneron: Chardonnay coltivato ad Aÿ, patria del Pinot — carattere unico per intenditori." },
  { name: "Brut Pierre Gimonnet", regione: "Francia", description: "Récoltant della Côte des Blancs: Chardonnay teso e gessoso — Champagne di vigneron, qualità vera." },
  { name: "Brut Laurent Perrier", regione: "Francia", description: "Lo stile Laurent-Perrier: freschezza, agrumi e leggerezza — aperitivo di classe." },
  { name: "Brut Ruinart", regione: "Francia", description: "Ruinart brut: rotondo, luminoso, aristocratico — trecento anni di savoir-faire." },
  { name: "Brut Classic Deutz", regione: "Francia", description: "Deutz Classic: equilibrio, crosta di pane e finezza — la maison discreta amata dai sommelier." },
  { name: "Brut Premier Roederer", regione: "Francia", description: "Il brut storico di Roederer: completo, armonico, profondo — scuola di grande maison." },
  { name: "Brut Prestige Boutillez Vignon", regione: "Francia", description: "Piccolo vigneron della Montagne de Reims: Champagne autentico fuori dai circuiti — una chicca da scoprire." },
  { name: "Brut Reserve Billecart Salmon", regione: "Francia", description: "Billecart-Salmon: finezza proverbiale e perlage sottilissimo — lo Champagne degli intenditori discreti." },
  { name: "Brut Reserve Charles Heidsieck", regione: "Francia", description: "Charles Heidsieck: lunghe riserve in cantina e profondità — tra i brut più premiati al mondo." },
  { name: "Brut Rosè Ruinart", regione: "Francia", description: "Il rosé di Ruinart: frutti di bosco, rotondità e charme — il regalo che non sbaglia." },
  { name: "Brut Traditional Boutillez Vignon", regione: "Francia", description: "Cuvée tradizionale di vigneron: schietta, fragrante, conviviale." },
  { name: "Clos de Goisses Philipponat", regione: "Francia", description: "Il leggendario clos in ripida pendenza sulla Marna: potenza, mineralità e rarità — monumento della Champagne." },
  { name: "Cofanetto Magnum legno Cristal", regione: "Francia", description: "Cristal in magnum, cofanetto di legno: il re degli Champagne in veste da cerimonia." },
  { name: "Cuvée 1522 Philipponat", regione: "Francia", description: "1522, l'anno d'origine della famiglia: cuvée profonda da grandi cru." },
  { name: "Cuvée Prestige Taittinger", regione: "Francia", description: "Taittinger: Chardonnay in evidenza, grazia e fiori bianchi — brindisi di seta." },
  { name: "Cuvée Rosè Brut Laurent Perrier", regione: "Francia", description: "Il rosé più famoso di Francia: macerazione vera e frutti rossi vividi — un classico assoluto." },
  { name: "Dom Ruinart Ruinart", regione: "Francia", description: "La cuvée de prestige di Ruinart: blanc de blancs profondo e cesellato — per momenti irripetibili." },
  { name: "Oenothèque 1996 Dom Perignon", regione: "Francia", description: "Dom Pérignon Oenothèque 1996: sboccatura tardiva di un'annata mitica — collezionismo puro." },
  { name: "Extra Brut Billecart Salmon", regione: "Francia", description: "Extra brut: dosaggio minimo, finezza massima — Billecart in versione tesa." },
  { name: "Grand Blanc 2004 Philipponat", regione: "Francia", description: "Millesimato di Chardonnay: gesso, agrumi canditi e profondità." },
  { name: "Grand Brut Perrier Jouet", regione: "Francia", description: "Il brut di Perrier-Jouët: floreale, arioso, gioioso." },
  { name: "Initial Jacques Selosse", regione: "Francia", description: "Selosse, il vigneron più influente della Champagne: Initial, blanc de blancs magnetico — culto assoluto." },
  { name: "Cuvée Royal Joseph Perrier", regione: "Francia", description: "Joseph Perrier, maison storica di Châlons: morbida e fruttata — fu lo Champagne della regina Vittoria." },
  { name: "La Grande Dame Veuve Clicquot Ponsardin", regione: "Francia", description: "La cuvée dedicata a Madame Clicquot: potenza vellutata dai grandi cru di Pinot Nero." },
  { name: "Cristal Millesimato 2004 Roederer", regione: "Francia", description: "Cristal 2004: nato per uno zar, preciso come un diamante — il mito di Roederer." },
  { name: "Millésime 2002 Laurent Perrier", regione: "Francia", description: "Millesimato 2002: un'annata di riferimento, evoluzione elegante." },
  { name: "Riserva San Pietroburgo Veuve Clicquot Ponsardin", regione: "Francia", description: "Riserva che omaggia la corte russa innamorata della Veuve: ricca e cerimoniale." },
  { name: "Rosè Veuve Clicquot Ponsardin", regione: "Francia", description: "Il rosé della Veuve: fragole, brio e riconoscibilità assoluta." },
  { name: "Rosè 2006 Roederer", regione: "Francia", description: "Rosé millesimato di Roederer: raffinato, vinoso, di lunga scia." },
  { name: "Rosè Reserve Charles Heidsieck", regione: "Francia", description: "Rosé di casa Heidsieck: cremoso e fruttato, con la profondità delle lunghe riserve." },
  { name: "Royale Reserve Philipponat", regione: "Francia", description: "La riserva di casa Philipponnat: Pinot Nero in evidenza, corpo e nerbo." },
  { name: "Special Cuvée Bollinger", regione: "Francia", description: "Bollinger: vinificazione in legno, ampiezza e carattere — lo Champagne di James Bond." },
  { name: "Substance Jacques Selosse", regione: "Francia", description: "Substance: la solera perpetua di Selosse, profondità vertiginosa — tra le bottiglie più ricercate al mondo." },
  { name: "Tradition Gaston Chiquet", regione: "Francia", description: "Vigneron di Dizy: cuvée tradizionale armoniosa — Champagne vero a prezzo umano." },
  { name: "Vintage 2002 Dom Perignon", regione: "Francia", description: "Dom Pérignon 2002: annata celebrata, equilibrio assoluto — il mito nella sua veste migliore." },
  { name: "Vintage 2002 Veuve Clicquot Ponsardin", regione: "Francia", description: "Millesimato 2002 della Veuve: struttura e maturità nobile." },
  { name: "Vintage 2004 Billecart Salmon", regione: "Francia", description: "Millesimato 2004: la finezza Billecart con la profondità dell'annata." },
  { name: "Vintage 2004 Roederer", regione: "Francia", description: "Vintage 2004 di Roederer: preciso, minerale, costruito per durare." },
  { name: "Vintage rosè Dom Perignon", regione: "Francia", description: "Il rosé di Dom Pérignon: raro, profondo, sontuoso — vertice assoluto del rosa." },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "champagne" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} champagne nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = CHAMPAGNE.map((w) => ({ ...w, category: "champagne" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} champagne.`);

  await mongoose.disconnect();
};

run();
