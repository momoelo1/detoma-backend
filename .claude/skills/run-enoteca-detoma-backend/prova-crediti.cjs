// Prova della guardia sui crediti Cloudinary (`controllaCrediti` in
// utils/cloudinary.js). NON carica niente: `uploader.upload` e `destroy` sono
// sostituiti da finti prima di ogni caso, quindi l'account vero viene solo
// LETTO (usage + Search API) nel primo caso, e solo se `.env` c'è.
//
//   node .claude/skills/run-enoteca-detoma-backend/prova-crediti.cjs     (cwd = backend/)
//
// Le due foto si generano qui con sharp, così la prova non dipende da file
// esterni: una con lo sfondo bianco (va scontornata, quindi passa dal
// controllo) e una già trasparente (non costa niente, il controllo non parte).
const path = require("path");
const ROOT = process.cwd();
require(path.join(ROOT, "node_modules/dotenv")).config({ path: path.join(ROOT, ".env") });
const sharp = require(path.join(ROOT, "node_modules/sharp"));
const { uploadImage, uploadImages, cloudinary } = require(path.join(ROOT, "utils/cloudinary"));
const { errorHandler } = require(path.join(ROOT, "utils/middleware"));

const bottiglia = { input: { create: { width: 100, height: 400, channels: 4, background: "#3a1f12" } }, left: 100, top: 100 };
const dataUri = async (img, fmt) => `data:image/${fmt};base64,${(await img.toFormat(fmt).toBuffer()).toString("base64")}`;

let caricate = 0, chiamateUsage = 0;
cloudinary.uploader.upload = async () => {
  caricate++;
  return { secure_url: "https://res.cloudinary.com/x/image/upload/v1/finta.jpg", public_id: "finta" };
};
cloudinary.uploader.destroy = async () => {};
const usageVero = cloudinary.api.usage.bind(cloudinary.api);
const searchVero = cloudinary.search;
const setUsage = (fn) => { cloudinary.api.usage = async (...a) => { chiamateUsage++; return fn(...a); }; };
const setRecenti = (n) => {
  cloudinary.search = { expression: () => ({ max_results: () => ({ execute: async () => ({ total_count: n }) }) }) };
};
const errOriginale = console.error;
const logServer = [];
console.error = (...a) => logServer.push(a.join(" "));

let ok = 0, ko = 0;
const caso = async (nome, fn, atteso) => {
  caricate = 0; chiamateUsage = 0; logServer.length = 0;
  let esito;
  try { await fn(); esito = "passa"; }
  catch (e) {
    esito = e.name !== "CreditiFotoError" ? `ALTRO ${e.message || e}` : e.message.startsWith("Per qualche") ? "limite" : "controllo";
  }
  const buono = esito === atteso.esito && caricate === atteso.caricate && (atteso.usage === undefined || chiamateUsage === atteso.usage);
  buono ? ok++ : ko++;
  console.log(`${buono ? "OK  " : "FAIL"} ${nome}: ${esito}, caricate ${caricate}, usage() ${chiamateUsage}`);
  if (!buono) logServer.forEach((r) => console.log("     [srv] " + r));
};

(async () => {
  const sfondo = await dataUri(sharp({ create: { width: 300, height: 600, channels: 3, background: "#ffffff" } }).composite([bottiglia]), "jpeg");
  const pulita = await dataUri(sharp({ create: { width: 300, height: 600, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([bottiglia]), "png");
  const S = { scontorna: true };

  // 0. account vero, sola lettura: qui non si asserisce l'esito (dipende dal
  //    consumo del giorno), si riporta. Bloccato o no, i caricamenti sono finti.
  if (process.env.CLOUDINARY_URL) {
    setUsage(() => usageVero());
    cloudinary.search = searchVero;
    caricate = 0;
    try {
      await uploadImages([sfondo], "prova", S);
      console.log(`INFO account vero: sotto il tetto, la foto sarebbe passata (caricamento finto: ${caricate})`);
    } catch (e) {
      console.log(`INFO account vero: ${e.name} — ${e.message.slice(0, 60)}…  [srv] ${logServer.at(-1) || ""}`);
    }
  }

  await caso("foto già trasparente: niente controllo", () => uploadImages([pulita], "prova", S), { esito: "passa", caricate: 1, usage: 0 });
  await caso("alimentare (niente scontorno): niente controllo", () => uploadImage(sfondo, "prova"), { esito: "passa", caricate: 1, usage: 0 });
  await caso("risalvataggio senza foto nuove", () => uploadImages(["https://res.cloudinary.com/x/image/upload/v1/a.webp"], "prova", S), { esito: "passa", caricate: 0, usage: 0 });

  setUsage(() => ({ credits: { usage: 20, limit: 37 }, last_updated: "2026-10-11" }));
  setRecenti(0);
  await caso("20/37 crediti", () => uploadImages([sfondo], "prova", S), { esito: "passa", caricate: 1 });
  await caso("birra singola, 20/37", () => uploadImage(sfondo, "prova", S), { esito: "passa", caricate: 1 });
  setRecenti(200);
  await caso("20 + 200 scontorni non ancora nel resoconto", () => uploadImages([sfondo], "prova", S), { esito: "limite", caricate: 0 });

  // il bordo: 37 × 0,9 = 33,3
  setUsage(() => ({ credits: { usage: 33.2, limit: 37 }, last_updated: "2026-10-11" }));
  setRecenti(0);
  await caso("33,2 + 1 foto (33,275)", () => uploadImages([sfondo], "prova", S), { esito: "passa", caricate: 1 });
  await caso("33,2 + 2 foto (33,35)", () => uploadImages([sfondo, sfondo], "prova", S), { esito: "limite", caricate: 0 });
  await caso("33,2 + 1 da scontornare + 1 pulita", () => uploadImages([sfondo, pulita], "prova", S), { esito: "passa", caricate: 2 });
  setUsage(() => ({ credits: { usage: 20, limit: 25 }, last_updated: "2026-10-11" }));
  await caso("limite tornato a 25: 20 + 1 (tetto 22,5)", () => uploadImages([sfondo], "prova", S), { esito: "passa", caricate: 1 });
  setUsage(() => ({ credits: { usage: 22.5, limit: 25 }, last_updated: "2026-10-11" }));
  await caso("limite 25: 22,5 + 1", () => uploadImages([sfondo], "prova", S), { esito: "limite", caricate: 0 });

  setUsage(() => { throw { error: { message: "disabled customer" } }; });
  await caso("usage() in errore: si blocca", () => uploadImages([sfondo], "prova", S), { esito: "controllo", caricate: 0 });
  setUsage(() => ({ last_updated: "2026-10-11" }));
  await caso("risposta senza credits: si blocca", () => uploadImages([sfondo], "prova", S), { esito: "controllo", caricate: 0 });

  process.env.PIXELCUT_API_KEY = "finta";
  setUsage(() => { throw new Error("non doveva chiamarlo"); });
  await caso("motore Pixelcut: niente controllo", () => uploadImages([sfondo], "prova", S), { esito: "passa", caricate: 1, usage: 0 });
  delete process.env.PIXELCUT_API_KEY;

  const res = { status(c) { this.c = c; return this; }, json(b) { this.b = b; return this; } };
  errorHandler(Object.assign(new Error("msg di prova"), { name: "CreditiFotoError" }), {}, res, () => {});
  const buono = res.c === 429 && res.b.error === "msg di prova";
  buono ? ok++ : ko++;
  console.log(`${buono ? "OK  " : "FAIL"} errorHandler -> ${res.c} ${JSON.stringify(res.b)}`);

  console.error = errOriginale;
  console.log(`\n${ok} ok, ${ko} fail`);
  process.exit(ko ? 1 : 0);
})();
