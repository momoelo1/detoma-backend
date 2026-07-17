// Template di importazione per la categoria "rossi": incolla i dati
// reali in ROSSI e lancia lo script una volta. Rifiuta l'esecuzione
// se la categoria contiene già documenti (vedi guard sotto).
// Uso: node scripts/importRossi.js
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");

const ROSSI = [
  // incolla qui i dati reali (name, regione, description, ...)
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Wine.countDocuments({ category: "rossi" });
  if (existing > 0) {
    console.error(`Esistono già ${existing} vini rossi nel database — importazione annullata per evitare duplicati.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = ROSSI.map((w) => ({ ...w, category: "rossi" }));
  const inserted = await Wine.insertMany(docs);
  console.log(`Importati ${inserted.length} vini rossi.`);

  await mongoose.disconnect();
};

run();
