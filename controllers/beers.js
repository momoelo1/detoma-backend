const beerRouter = require("express").Router();
const Beer = require("../models/Beer");
const { tokenExtractor } = require("../utils/middleware");
const { uploadImage } = require("../utils/cloudinary");

const BEER_IMG_FOLDER = "enoteca-detoma/beers";

// lettura: pubblica, la userà anche il sito del negozio
beerRouter.get("/", async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const beers = await Beer.find(filter).sort({ name: 1 });
  res.json(beers);
});

beerRouter.get("/:id", async (req, res) => {
  const beer = await Beer.findById(req.params.id);
  if (!beer) return res.status(404).json({ error: "birra non trovata" });
  res.json(beer);
});

// scrittura: solo l'unico account amministratore
beerRouter.post("/", tokenExtractor, async (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: "name e category sono obbligatori" });
  }
  if (!Beer.CATEGORIES.includes(category)) {
    return res.status(400).json({ error: `category deve essere una di: ${Beer.CATEGORIES.join(", ")}` });
  }

  const beer = new Beer({ ...req.body, img: await uploadImage(req.body.img, BEER_IMG_FOLDER) });
  const savedBeer = await beer.save();
  res.status(201).json(savedBeer);
});

beerRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.body.category && !Beer.CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: `category deve essere una di: ${Beer.CATEGORIES.join(", ")}` });
  }

  const beer = await Beer.findById(req.params.id);
  if (!beer) return res.status(404).json({ error: "birra non trovata" });

  beer.set(req.body);
  if ("img" in req.body) beer.img = await uploadImage(req.body.img, BEER_IMG_FOLDER);

  const updatedBeer = await beer.save();
  res.json(updatedBeer);
});

beerRouter.delete("/:id", tokenExtractor, async (req, res) => {
  const deletedBeer = await Beer.findByIdAndDelete(req.params.id);
  if (!deletedBeer) return res.status(404).json({ error: "birra non trovata" });
  res.status(204).end();
});

module.exports = beerRouter;
