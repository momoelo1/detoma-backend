// Migrazione UNA TANTUM: importa i vini rosati da frontend/src/data/data.js
// (VINI_ROSATI) nel database. Uso: node scripts/importRosati.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const ROSATI = [
  { name: "Rosamara Costaripa", regione: "Lombardia", description: "Chiaretto del Garda color petalo di rosa: fragolina, agrumi e sorso fresco — l'eleganza dell'estate sul lago." },
  { name: "Mière Rosato Salento Calò", regione: "Puglia", description: "Rosato salentino da Negroamaro: ciliegia, melograno e sorso sapido — la grande tradizione pugliese del rosa." },
  { name: "Charme Rosè Firriato", regione: "Sicilia", description: "Rosato siciliano luminoso e profumato: piccoli frutti rossi e freschezza — pensato per l'aperitivo al tramonto." },
  { name: "Rosato Perolla Agricola San Felice", regione: "Toscana", description: "Rosato maremmano di Sangiovese: fragrante, asciutto, versatile — da tutto pasto estivo." },
  { name: "Scalabrone Rosato Antinori", regione: "Toscana", description: "Il rosato di Bolgheri di casa Antinori: frutti rossi croccanti e sale marino — porta il nome del brigante della zona." },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "rosati" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} vini rosati nel database — importazione annullata.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = ROSATI.map((w) => ({ ...w, category: "rosati" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} vini rosati.`);

  await mongoose.disconnect();
};

run();
