const cloudinary = require("cloudinary").v2;
const { scontorna } = require("./scontorno");

// Configures itself automatically from process.env.CLOUDINARY_URL
// (the single connection string shown on the Cloudinary dashboard).

// base64 data URIs start with "data:image/..."; anything else (an
// already-uploaded Cloudinary URL, or empty) is passed through untouched.
const isBase64Image = (value) => typeof value === "string" && value.startsWith("data:image");

// Con `scontorna: true` (solo i vini, per ora) la foto grezza viene caricata,
// passata a utils/scontorno.js e sostituita dalla versione pulita: sul
// documento resta l'URL di quest'ultima, la grezza viene cancellata. Se il
// motore fallisce — rete, crediti finiti, foto strana — si tiene la grezza e
// si scrive un rigo di log: il salvataggio del negozio non deve mai saltare
// per colpa dello scontorno.
//
// La foto pulita arriva da utils/scontorno.js già codificata in **webp** —
// il formato che il negozio usa per le sue foto, con il canale alpha — e
// viene caricata così com'è.
const FORMATO_PULITA = "webp";

const uploadImage = async (img, folder, { scontorna: daScontornare = false } = {}) => {
  if (!isBase64Image(img)) return img;
  const grezza = await cloudinary.uploader.upload(img, { folder });
  if (!daScontornare) return grezza.secure_url;
  try {
    const webp = await scontorna(grezza.secure_url);
    if (!webp) return grezza.secure_url; // arrivata già scontornata
    const pulita = await cloudinary.uploader.upload(
      `data:image/${FORMATO_PULITA};base64,${webp.toString("base64")}`,
      { folder }
    );
    await cloudinary.uploader.destroy(grezza.public_id);
    return pulita.secure_url;
  } catch (err) {
    console.error(`scontorno fallito (${err.message}): tengo la foto com'è`);
    return grezza.secure_url;
  }
};

// Più foto per prodotto (i vini, da 2026-09-09: `img` è un array).
//
// Accetta indifferentemente un array o la stringa singola di prima — il corpo
// che arriva dal pannello admin oggi è ancora una stringa sola, e Mongoose la
// avvolgerebbe comunque — e torna SEMPRE un array. I valori vuoti si buttano
// qui: erano loro a lasciare in archivio il famigerato [""], cioè "una foto"
// che foto non è (vedi il commento su `img` in models/Wine.js).
//
// In parallelo e non in fila: ogni foto nuova costa un caricamento più, per i
// vini, una chiamata allo scontorno, cioè secondi. Tre foto in fila sarebbero
// tre volte l'attesa e su Vercel il salvataggio rischierebbe il timeout della
// funzione; in parallelo l'attesa resta quella della più lenta. Le foto già
// caricate (URL Cloudinary) non fanno nessuna chiamata: `uploadImage` le
// restituisce com'erano, quindi risalvare un vino non ricarica niente.
const uploadImages = async (img, folder, opzioni) => {
  const elenco = (Array.isArray(img) ? img : [img]).filter(Boolean);
  return Promise.all(elenco.map((una) => uploadImage(una, folder, opzioni)));
};

// ricava il public_id (es. "enoteca-detoma/wines/abc123") da un secure_url
// tipo https://res.cloudinary.com/<cloud>/image/upload/v169.../<public_id>.<ext>
const getPublicId = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return match ? match[1] : null;
};

// elimina l'asset da Cloudinary in modo permanente. Se `img` non è un URL
// Cloudinary reale (vuoto, o mai caricato) non fa nulla — non c'è nulla da
// cancellare lato storage, solo il riferimento nel documento va svuotato.
// Accetta anche un array: cancella tutte le foto che contiene.
const deleteImage = async (img) => {
  if (Array.isArray(img)) {
    await Promise.all(img.map(deleteImage));
    return;
  }
  if (typeof img !== "string" || !img.includes("res.cloudinary.com")) return;
  const publicId = getPublicId(img);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = {
  cloudinary,
  uploadImage,
  uploadImages,
  deleteImage,
  isBase64Image,
  FORMATO_PULITA,
};
