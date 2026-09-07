// Toglie lo sfondo alle foto delle bottiglie, lato server.
//
// Perché qui e non nel pannello: i motori che scontornano bene stanno dietro
// una chiave segreta (Pixelcut vieta esplicitamente le chiamate dal browser,
// e la chiave finirebbe nel bundle pubblico). Il giro è: il pannello carica la
// foto com'è → il controller la mette su Cloudinary → questo modulo la passa
// al motore → la foto pulita, in webp, rimpiazza la grezza. Il sito non sa
// niente. Tutto il lavoro sui pixel lo fa `sharp` su RGBA grezzo: da
// Cloudinary si chiede webp e in webp si riconsegna, nessun PNG di mezzo.
//
// Due motori, scelti da `PIXELCUT_API_KEY`:
// - **Pixelcut** (se la chiave c'è): POST con l'URL della foto, torna un URL
//   temporaneo (1 ora) del risultato. 5 crediti a foto. È l'unico punto in
//   cui può arrivare un PNG — la loro API non produce altro — e viene solo
//   letto.
// - **Cloudinary AI** (altrimenti): la trasformazione `e_background_removal`
//   sulla foto appena caricata, inclusa nel piano. Misurato il 2026-09-07 su
//   foto vere del negozio: toglie lo sfondo (0% → 73% di trasparenza, zero
//   buchi nell'etichetta) ma lascia una MASCHERA MORBIDA — una fascia di
//   parecchi pixel intorno alla bottiglia ad alpha 201-254 (8-10% della tela)
//   più un alone quasi trasparente ma bianco (lo sfondo che trapela). Sulle
//   card si vedeva come un bordo chiaro, peggio su telefono e schermi grandi.
//   `fineedges_y` non cambia un byte. Per questo il risultato passa da
//   `indurisci()`, che sulla stessa foto porta la fascia da 7,7% a 0,5%.
//
// Sia il pannello sia lo script una tantum passano di qua: c'è un solo posto
// che decide cos'è "scontornata" e come si pulisce una maschera.
const sharp = require("sharp");

const MARKER = "/image/upload/";

// inserisce una trasformazione in un secure_url di Cloudinary
const conTrasformazione = (url, t) => {
  const i = url.indexOf(MARKER);
  if (i === -1) throw new Error(`non è un URL Cloudinary: ${url}`);
  const at = i + MARKER.length;
  return url.slice(0, at) + t + "/" + url.slice(at);
};

const attendi = (ms) => new Promise((r) => setTimeout(r, ms));

// Scarica un'immagine. Cloudinary, mentre l'AI sta ancora lavorando su una
// foto nuova, risponde 423: si riprova con calma invece di fallire.
const scarica = async (url, { tentativi = 8, pausa = 1500 } = {}) => {
  let ultimo = null;
  for (let i = 0; i < tentativi; i++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    ultimo = `${res.status} ${res.headers.get("x-cld-error") || ""}`.trim();
    if (res.status !== 423 && res.status !== 420) throw new Error(`scarico fallito: ${ultimo}`);
    await attendi(pausa);
  }
  throw new Error(`scarico fallito dopo ${tentativi} tentativi: ${ultimo}`);
};

// immagine codificata (webp, o quel che arriva) → { width, height, data RGBA }
const decodifica = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
};

// RGBA grezzo → webp. Il colore è lossy (q 90, invisibile su una bottiglia),
// l'alpha è SENZA perdita (`alphaQuality: 100`): è la maschera appena
// indurita, comprimerla la riammorbidirebbe.
const codificaWebp = ({ width, height, data }) =>
  sharp(data, { raw: { width, height, channels: 4 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toBuffer();

// scarica + decodifica, chiedendo a Cloudinary il webp
const scaricaImmagine = async (url) => decodifica(await scarica(url));

// Una foto è già scontornata se i quattro angoli sono trasparenti e almeno un
// terzo della tela lo è. È il caso normale del negozio (18 foto su 21 il
// 2026-09-07 arrivavano già pulite): su queste il motore non va chiamato —
// Cloudinary non farebbe niente e Pixelcut farebbe pagare per niente.
const giaScontornata = ({ width: W, height: H, data: d }) => {
  const alpha = (x, y) => d[(y * W + x) * 4 + 3];
  const angoli = [alpha(0, 0), alpha(W - 1, 0), alpha(0, H - 1), alpha(W - 1, H - 1)];
  if (angoli.some((a) => a > 8)) return false;
  let trasparenti = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 16) trasparenti++;
  return trasparenti / (W * H) > 0.3;
};

// Indurisce una maschera morbida, in tre passi (misurati, vedi in testa):
//  1. i pixel semitrasparenti sono bottiglia fusa con lo sfondo bianco:
//     si ricava il colore vero scomponendo dal bianco, così la frangia che
//     resta non è più chiara del corpo;
//  2. curva sull'alpha: fino a BASSO diventa 0 (fantasmi), da ALTO in su 255
//     (corpo), in mezzo lineare — resta un bordo morbido di 1-2 px, non di 14;
//  3. erosione di 1 px: il pixel opaco che confina col vuoto si ammorbidisce,
//     mangiando l'ultimo filo di alone.
const BASSO = 40;
const ALTO = 215;
const indurisci = (img) => {
  const { width: W, height: H, data: d } = img;
  for (let p = 0; p < W * H; p++) {
    const i = p * 4;
    const a = d[i + 3];
    if (a === 0 || a === 255) continue;
    const f = a / 255;
    for (let k = 0; k < 3; k++) {
      d[i + k] = Math.max(0, Math.min(255, Math.round((d[i + k] - 255 * (1 - f)) / f)));
    }
    d[i + 3] = a <= BASSO ? 0 : a >= ALTO ? 255 : Math.round((255 * (a - BASSO)) / (ALTO - BASSO));
  }
  const alpha = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) alpha[p] = d[p * 4 + 3];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (alpha[p] < 255) continue;
      const minimo = Math.min(alpha[p - 1], alpha[p + 1], alpha[p - W], alpha[p + W]);
      if (minimo < 128) d[p * 4 + 3] = Math.max(128, minimo + 96);
    }
  }
  return img;
};

const motoreCloudinary = async (url) =>
  indurisci(await scaricaImmagine(conTrasformazione(url, "e_background_removal/f_webp")));

const PIXELCUT_URL = "https://api.developer.pixelcut.ai/v1/remove-background";
const motorePixelcut = async (url) => {
  const res = await fetch(PIXELCUT_URL, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.PIXELCUT_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ image_url: url }),
  });
  if (!res.ok) throw new Error(`Pixelcut ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { result_url: risultato } = await res.json();
  if (!risultato) throw new Error("Pixelcut: risposta senza result_url");
  return scaricaImmagine(risultato);
};

const motoreAttivo = () => (process.env.PIXELCUT_API_KEY ? "pixelcut" : "cloudinary");

// Foto già su Cloudinary (secure_url) → Buffer webp scontornato,
// oppure `null` se non c'era niente da togliere.
const scontorna = async (url) => {
  const grezza = await scaricaImmagine(conTrasformazione(url, "f_webp"));
  if (giaScontornata(grezza)) return null;
  const img = motoreAttivo() === "pixelcut" ? await motorePixelcut(url) : await motoreCloudinary(url);
  return codificaWebp(img);
};

module.exports = {
  scontorna,
  giaScontornata,
  indurisci,
  motoreAttivo,
  scaricaImmagine,
  codificaWebp,
  conTrasformazione,
};
