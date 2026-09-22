const distillatoRouter = require("express").Router();
const Distillato = require("../models/Distillato");
const { tokenExtractor } = require("../utils/middleware");
const { uploadImages, deleteImage } = require("../utils/cloudinary");
const { limiteDaQuery } = require("../utils/query");

// Stesse rotte dei vini (controllers/wines.js), scontorno delle foto compreso:
// anche qui sono bottiglie, e passano dallo stesso trattamento (utils/scontorno.js)
const DISTILLATO_IMG_FOLDER = "enoteca-detoma/distillati";
const DISTILLATO_IMG_OPZIONI = { scontorna: true };

const categoriaNonValida = () =>
  `category deve essere una di: ${Distillato.CATEGORIES.join(", ")}`;

// lettura: pubblica, la userà anche il sito del negozio
distillatoRouter.get("/", async (req, res) => {
  const { category, consigliato, limit } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (consigliato === "true") filter.consigliato = true;
  const distillati = await Distillato.find(filter)
    .sort({ name: 1 })
    .limit(limiteDaQuery(limit));
  res.json(distillati);
});

distillatoRouter.get("/:id", async (req, res) => {
  const distillato = await Distillato.findById(req.params.id);
  if (!distillato) return res.status(404).json({ error: "distillato non trovato" });
  res.json(distillato);
});

// scrittura: solo l'unico account amministratore
distillatoRouter.post("/", tokenExtractor, async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "name e category sono obbligatori" });
  }
  if (!Distillato.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: categoriaNonValida() });
  }

  const distillato = new Distillato({
    ...req.body,
    img: await uploadImages(req.body.img, DISTILLATO_IMG_FOLDER, DISTILLATO_IMG_OPZIONI),
  });
  const saved = await distillato.save();
  res.status(201).json(saved);
});

distillatoRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.body.category && !Distillato.CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: categoriaNonValida() });
  }

  const distillato = await Distillato.findById(req.params.id);
  if (!distillato) return res.status(404).json({ error: "distillato non trovato" });

  distillato.set(req.body);
  // array misto come per i vini: gli URL già in archivio passano intatti,
  // i base64 nuovi vengono caricati (e scontornati)
  if ("img" in req.body) {
    distillato.img = await uploadImages(req.body.img, DISTILLATO_IMG_FOLDER, DISTILLATO_IMG_OPZIONI);
  }

  const updated = await distillato.save();
  res.json(updated);
});

// Rimuove SOLO le foto, non il distillato. `?indice=N` ne toglie una,
// senza parametro tutte — stesso patto di DELETE /api/wines/:id/image.
distillatoRouter.delete("/:id/image", tokenExtractor, async (req, res) => {
  const distillato = await Distillato.findById(req.params.id);
  if (!distillato) return res.status(404).json({ error: "distillato non trovato" });

  const { indice } = req.query;
  if (indice === undefined) {
    await deleteImage(distillato.img);
    distillato.img = [];
  } else {
    const i = Number.parseInt(indice, 10);
    if (!Number.isInteger(i) || i < 0 || i >= distillato.img.length) {
      return res.status(400).json({ error: "indice della foto non valido" });
    }
    await deleteImage(distillato.img[i]);
    distillato.img.splice(i, 1);
  }

  const updated = await distillato.save();
  res.json(updated);
});

distillatoRouter.delete("/:id", tokenExtractor, async (req, res) => {
  const deleted = await Distillato.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "distillato non trovato" });
  res.status(204).end();
});

module.exports = distillatoRouter;
