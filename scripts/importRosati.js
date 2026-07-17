// Template di importazione per la categoria "rosati": incolla i dati
// reali in ROSATI e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importRosati.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const ROSATI = [
  // incolla qui i dati reali (name, regione, description, ...)
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
