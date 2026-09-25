const wineRouter = require("express").Router();
const Wine = require("../models/Wine");
const { tokenExtractor } = require("../utils/middleware");
const { uploadImages, deleteImage } = require("../utils/cloudinary");
const { limiteDaQuery, filtroArchivio } = require("../utils/query");

const WINE_IMG_FOLDER = "enoteca-detoma/wines";
// le foto delle bottiglie vengono scontornate al caricamento (utils/scontorno.js)
const WINE_IMG_OPZIONI = { scontorna: true };

// lettura: pubblica, la userà anche il sito del negozio
wineRouter.get("/", async (req, res) => {
  const { category, consigliato, archiviato, limit } = req.query;
  // gli archiviati restano fuori da ogni elenco tranne quello che li chiede
  const filter = filtroArchivio(archiviato);
  if (category) filter.category = category;
  // solo "true" accende il filtro: l'elenco dei NON consigliati non serve
  // a nessuno, e così un valore strano nella query non nasconde il catalogo
  if (consigliato === "true") filter.consigliato = true;
  // .limit(0) in Mongoose vuol dire "tutti", quindi il caso senza limite non
  // ha bisogno di un ramo a parte
  const wines = await Wine.find(filter)
    .sort({ name: 1 })
    .limit(limiteDaQuery(limit));
  res.json(wines);
});

wineRouter.get("/:id", async (req, res) => {
  const wine = await Wine.findById(req.params.id);
  if (!wine) return res.status(404).json({ error: "vino non trovato" });
  res.json(wine);
});

// scrittura: solo l'unico account amministratore
wineRouter.post("/", tokenExtractor, async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "name e category sono obbligatori" });
  }
  if (!Wine.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category deve essere una di: ${Wine.CATEGORIES.join(", ")}` });
  }

  const wine = new Wine({ ...req.body, img: await uploadImages(req.body.img, WINE_IMG_FOLDER, WINE_IMG_OPZIONI) });
  const savedWine = await wine.save();
  res.status(201).json(savedWine);
});

wineRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.body.category && !Wine.CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: `category deve essere una di: ${Wine.CATEGORIES.join(", ")}` });
  }

  const wine = await Wine.findById(req.params.id);
  if (!wine) return res.status(404).json({ error: "vino non trovato" });

  wine.set(req.body);
  // il corpo può portare un array misto: le foto già in archivio arrivano
  // come URL Cloudinary e passano intatte, quelle nuove come base64 e vengono
  // caricate. Una foto TOLTA dall'array resta però su Cloudinary senza che
  // nessuno la referenzi: succedeva già prima quando se ne sostituiva una, e
  // a ripulire quelle orfane resta solo DELETE /:id/image qui sotto.
  if ("img" in req.body) wine.img = await uploadImages(req.body.img, WINE_IMG_FOLDER, WINE_IMG_OPZIONI);

  const updatedWine = await wine.save();
  res.json(updatedWine);
});

// Rimuove SOLO le foto (da Cloudinary e dal documento), non il vino.
//
// `?indice=N` ne toglie una sola; senza parametro le toglie tutte, che è quel
// che questa rotta ha sempre fatto quando la foto era una. Serve un indice e
// non l'URL perché lo stesso file può comparire due volte nell'elenco, e
// perché è quello che il pannello ha già in mano quando si preme la ✕ su una
// miniatura.
//
// Cancella davvero anche dallo storage, subito, senza aspettare un salvataggio:
// è il patto che il pannello ha sempre avuto con chi lo usa, e vale ancora —
// la ✕ su una miniatura già in archivio chiede conferma proprio per questo.
wineRouter.delete("/:id/image", tokenExtractor, async (req, res) => {
  const wine = await Wine.findById(req.params.id);
  if (!wine) return res.status(404).json({ error: "vino non trovato" });

  const { indice } = req.query;
  if (indice === undefined) {
    await deleteImage(wine.img);
    // [] e non "": la stringa vuota, riletta da un campo ormai array, tornava
    // come [""] — un elemento che c'è ma non è una foto (vedi models/Wine.js).
    // I 2 vini che in produzione hanno ancora "" si ripuliscono da soli la
    // prossima volta che passano di qui.
    wine.img = [];
  } else {
    const i = Number.parseInt(indice, 10);
    if (!Number.isInteger(i) || i < 0 || i >= wine.img.length) {
      return res.status(400).json({ error: "indice della foto non valido" });
    }
    await deleteImage(wine.img[i]);
    wine.img.splice(i, 1);
  }

  const updatedWine = await wine.save();
  res.json(updatedWine);
});

wineRouter.delete("/:id", tokenExtractor, async (req, res) => {
  const deletedWine = await Wine.findByIdAndDelete(req.params.id);
  if (!deletedWine) return res.status(404).json({ error: "vino non trovato" });
  res.status(204).end();
});

module.exports = wineRouter;
