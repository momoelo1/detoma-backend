const alimentareRouter = require("express").Router();
const Alimentare = require("../models/Alimentare");
const { tokenExtractor } = require("../utils/middleware");
const { uploadImage, deleteImage } = require("../utils/cloudinary");

const ALIMENTARI_IMG_FOLDER = "enoteca-detoma/alimentari";

// lettura: pubblica, la userà anche il sito del negozio
alimentareRouter.get("/", async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  // ordinati per sottocategoria e poi per nome: la pagina che raggruppa
  // per sottogruppo li riceve già nell'ordine giusto
  const alimentari = await Alimentare.find(filter).sort({
    sottocategoria: 1,
    name: 1,
  });
  res.json(alimentari);
});

alimentareRouter.get("/:id", async (req, res) => {
  const alimentare = await Alimentare.findById(req.params.id);
  if (!alimentare) return res.status(404).json({ error: "prodotto non trovato" });
  res.json(alimentare);
});

// scrittura: solo l'unico account amministratore
alimentareRouter.post("/", tokenExtractor, async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "name e category sono obbligatori" });
  }
  if (!Alimentare.REPARTI.includes(category)) {
    return res.status(400).json({
      error: `category deve essere uno di: ${Alimentare.REPARTI.join(", ")}`,
    });
  }

  const alimentare = new Alimentare({
    ...req.body,
    img: await uploadImage(req.body.img, ALIMENTARI_IMG_FOLDER),
  });
  const savedAlimentare = await alimentare.save();
  res.status(201).json(savedAlimentare);
});

alimentareRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.body.category && !Alimentare.REPARTI.includes(req.body.category)) {
    return res.status(400).json({
      error: `category deve essere uno di: ${Alimentare.REPARTI.join(", ")}`,
    });
  }

  const alimentare = await Alimentare.findById(req.params.id);
  if (!alimentare) return res.status(404).json({ error: "prodotto non trovato" });

  alimentare.set(req.body);
  if ("img" in req.body) {
    alimentare.img = await uploadImage(req.body.img, ALIMENTARI_IMG_FOLDER);
  }

  const updatedAlimentare = await alimentare.save();
  res.json(updatedAlimentare);
});

// rimuove SOLO la foto (Cloudinary + riferimento nel documento)
alimentareRouter.delete("/:id/image", tokenExtractor, async (req, res) => {
  const alimentare = await Alimentare.findById(req.params.id);
  if (!alimentare) return res.status(404).json({ error: "prodotto non trovato" });

  await deleteImage(alimentare.img);
  alimentare.img = "";
  const updatedAlimentare = await alimentare.save();
  res.json(updatedAlimentare);
});

alimentareRouter.delete("/:id", tokenExtractor, async (req, res) => {
  const deleted = await Alimentare.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "prodotto non trovato" });
  res.status(204).end();
});

module.exports = alimentareRouter;
