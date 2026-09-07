// Scontorna le foto dei vini GIÀ in produzione, una tantum.
//
// Da quando il caricamento passa da utils/scontorno.js le foto nuove arrivano
// pulite; questo script fa lo stesso lavoro su quelle caricate prima. Per ogni
// vino con foto: la scarica, e se non è già scontornata (stesso criterio del
// caricamento) la passa al motore, carica la versione pulita in webp,
// aggiorna `img` sul documento e cancella la vecchia da Cloudinary.
//
//   node scripts/scontornaFotoVini.js --dry-run   # elenca, non tocca niente
//   node scripts/scontornaFotoVini.js             # fa il lavoro
//
// Lanciare con cwd = backend/. Legge MONGODB_URI e CLOUDINARY_URL da .env,
// cioè PRODUZIONE: prima il dry-run, sempre. Da cancellare quando ha finito
// (scripts/ tiene solo roba viva, vedi CLAUDE.md).
require("dotenv").config();
const mongoose = require("mongoose");
const Wine = require("../models/Wine");
const { cloudinary, FORMATO_PULITA } = require("../utils/cloudinary");
const { scontorna, giaScontornata, scaricaImmagine, conTrasformazione, motoreAttivo } = require("../utils/scontorno");

const DRY_RUN = process.argv.includes("--dry-run");
const FOLDER = "enoteca-detoma/wines";

const publicIdDa = (url) => {
  const m = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return m ? m[1] : null;
};

const main = async () => {
  const uri = process.env.MONGODB_URI;
  console.log(`database: ${uri.replace(/\/\/.*@/, "//…@").split("?")[0]}`);
  console.log(`motore:   ${motoreAttivo()}, uscita ${FORMATO_PULITA}${DRY_RUN ? "   (DRY RUN: nessuna scrittura)" : ""}\n`);
  await mongoose.connect(uri);

  const vini = await Wine.find({ img: { $regex: "res\\.cloudinary\\.com" } }).sort({ name: 1 });
  console.log(`${vini.length} vini con foto su Cloudinary\n`);

  let saltati = 0, fatti = 0, falliti = 0;
  for (const vino of vini) {
    const nome = vino.name.trim();
    try {
      const grezza = await scaricaImmagine(conTrasformazione(vino.img, "f_webp"));
      if (giaScontornata(grezza)) {
        saltati++;
        console.log(`  salta    ${nome}  (già scontornata)`);
        continue;
      }
      if (DRY_RUN) {
        fatti++;
        console.log(`  DA FARE  ${nome}  ${grezza.width}x${grezza.height}`);
        continue;
      }
      const webp = await scontorna(vino.img);
      if (!webp) { saltati++; console.log(`  salta    ${nome}`); continue; }
      const pulita = await cloudinary.uploader.upload(
        `data:image/${FORMATO_PULITA};base64,${webp.toString("base64")}`,
        { folder: FOLDER }
      );
      const vecchia = vino.img;
      vino.img = pulita.secure_url;
      await vino.save();
      const vecchioId = publicIdDa(vecchia);
      if (vecchioId) await cloudinary.uploader.destroy(vecchioId);
      fatti++;
      console.log(`  FATTO    ${nome}\n           ${vecchia}\n        -> ${pulita.secure_url}`);
    } catch (err) {
      falliti++;
      console.log(`  ERRORE   ${nome}: ${err.message}`);
    }
  }

  console.log(`\n${DRY_RUN ? "da fare" : "fatti"}: ${fatti}, saltati: ${saltati}, falliti: ${falliti}`);
  await mongoose.disconnect();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
