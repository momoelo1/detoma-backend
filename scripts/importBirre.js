// Migrazione UNA TANTUM: importa le birre che finora vivevano in
// frontend/src/data/data.js (BIRRE_32/RIBALDI/GJULIA/MONT_BLANC/DEL_FORTE/
// CALABRAU/SALENTO) nel database, prima che gli array vengano rimossi e
// BEER_CATEGORIES passi a leggere dalla stessa API che questo script popola.
// Uso: node scripts/importBirre.js
require("dotenv").config();
const mongoose = require("mongoose");
const Beer = require("../models/Beer");

const BIRRE_32 = [
  { name: "CURMI", stile: "birra bianca", gradazione: "5,80%" },
  { name: "AUDACE", stile: "birra bionda forte", gradazione: "8,40%" },
  { name: "OPPALE", stile: "birra luppolata", gradazione: "5,50%" },
  { name: "ATRA", stile: "birra bruna", gradazione: "7,30%" },
  { name: "ADMIRAL", stile: "birra rossa", gradazione: "6,30%" },
  { name: "NEBRA", stile: "birra ambrata", gradazione: "8,00%" },
];

const BIRRE_RIBALDI = [
  { name: "Bianca", stile: "birra bianca", gradazione: "6,00%", prezzo: 10.5 },
  { name: "Sicilian Pils", stile: "birra bionda", gradazione: "5,00%", prezzo: 10.5 },
  { name: "India Pale Ale", stile: "birra bionda", gradazione: "6,50%", prezzo: 10.5 },
  { name: "Sicilian Pale Ale", stile: "birra ambrata", gradazione: "6,00%", prezzo: 10.5 },
  { name: "Special Ale", stile: "birra rossa", gradazione: "7,00%", prezzo: 10.5 },
  { name: "Tripel", stile: "birra bionda", gradazione: "9,00%", prezzo: 10.5 },
];

const BIRRE_GJULIA = [
  { name: "Est", stile: "birra weizen", gradazione: "6,00%", prezzo: 10.5 },
  { name: "Nord", stile: "birra bionda", gradazione: "5,50%", prezzo: 10.5 },
  { name: "Ovest", stile: "birra ambrata", gradazione: "7,00%", prezzo: 10.5 },
  { name: "Sud", stile: "birra bionda", gradazione: "8,00%", prezzo: 10.5 },
  { name: "Hellas Joy", stile: "birra bionda Helles", gradazione: "5,20%", prezzo: 9.5 },
  { name: "Nostrana", stile: "birra chiara Bio", gradazione: "5,00%", prezzo: 12.0 },
  { name: "Ipa", stile: "birra chiara Pale Ale", gradazione: "5,80%", prezzo: 11.9 },
  { name: "Ribò", stile: "birra chiara Grape Ale", gradazione: "6,50%", prezzo: 12.5 },
  { name: "Grecale", stile: "birra bionda Grape Ale", gradazione: "10,00%", prezzo: 13.5 },
  { name: "Kristall Cuvée", stile: "birra chiara Grape Ale", gradazione: "6,50%", prezzo: 12.5 },
];

const BIRRE_MONT_BLANC = [
  { name: "LA BLONDE", stile: "bionda", gradazione: "5,80%" },
  { name: "LA BLANCHE", stile: "bianca", gradazione: "4,70%" },
  { name: "LA ROUSSE", stile: "rossa", gradazione: "6,50%" },
];

const BIRRE_DEL_FORTE = [
  { name: "Cento Volte Forte", colore: "Chiara Blanche", gradazione: "4,00%", prezzo: 11 },
  { name: "Gassa D'Amante", colore: "Chiara Golden Ale (senza glutine)", gradazione: "4,50%", prezzo: 10.5 },
  { name: "La Mancina", colore: "Dorata Belgian Strong Ale", gradazione: "7,50%", prezzo: 11 },
  { name: "2 Cilindri", colore: "Nera Porter", gradazione: "5,00%", prezzo: 11.5 },
  { name: "Meridiano 0", colore: "Ambrata Extra Special Bitter (senza glutine)", gradazione: "5,00%", prezzo: 11.5 },
];

const BIRRE_CALABRAU = [
  { name: "Birra del Monaco", stile: "dorata weizen", gradazione: "5,00%", prezzo: 8.5 },
  { name: "MountLion", stile: "bionda dorata helles", gradazione: "5,00%", prezzo: 8.5 },
  { name: "MountLion cl.33", stile: "ambrata doppie Ipa", gradazione: "7,00%", prezzo: 4.9 },
];

const BIRRE_SALENTO = [
  { name: "Beggia", stile: "Belgian Ale Ambrata", gradazione: "7,00%", prezzo: 9 },
  { name: "Taranta", stile: "Belgian Ale Ambrata Speziata", gradazione: "6,00%", prezzo: 9 },
  { name: "Pizzica", stile: "Belgian Ale Dorata", gradazione: "5,00%", prezzo: 9 },
];

const BY_CATEGORY = {
  "32-via-dei-birrai": BIRRE_32,
  ribaldi: BIRRE_RIBALDI,
  gjulia: BIRRE_GJULIA,
  "mont-blanc": BIRRE_MONT_BLANC,
  forte: BIRRE_DEL_FORTE,
  calabrau: BIRRE_CALABRAU,
  salento: BIRRE_SALENTO,
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const existing = await Beer.countDocuments({});
  if (existing > 0) {
    console.error(`Esistono già ${existing} birre nel database — importazione annullata per evitare duplicati.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const docs = Object.entries(BY_CATEGORY).flatMap(([category, beers]) =>
    beers.map((b) => ({ ...b, category })),
  );
  const inserted = await Beer.insertMany(docs);
  console.log(`Importate ${inserted.length} birre.`);

  await mongoose.disconnect();
};

run();
