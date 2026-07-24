// Migrazione UNA TANTUM: unisce il campo `colore` (rimosso dallo schema)
// dentro `stile` sui documenti esistenti, invece di perdere il dato.
// Se un documento ha entrambi, li concatena; se ha solo colore, colore
// diventa lo stile.
// Uso: node scripts/mergeBeerColoreIntoStile.js
require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../utils/config");

const run = async () => {
  await mongoose.connect(config.MONGODB_URI);
  const coll = mongoose.connection.db.collection("beers");

  const docs = await coll.find({ colore: { $exists: true } }).toArray();
  console.log(`Trovate ${docs.length} birre con "colore" da unire in "stile".`);

  for (const doc of docs) {
    const merged = [doc.stile, doc.colore].filter(Boolean).join(" ").trim();
    await coll.updateOne({ _id: doc._id }, { $set: { stile: merged }, $unset: { colore: "" } });
    console.log(`${doc.name}: stile -> "${merged}"`);
  }

  await mongoose.disconnect();
  console.log("Done.");
};

run();
