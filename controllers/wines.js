const wineRouter = require("express").Router();
const Wine = require("../models/Wine");
const { tokenExtractor } = require("../utils/middleware");

// lettura: pubblica, la userà anche il sito del negozio
wineRouter.get("/", async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const wines = await Wine.find(filter).sort({ name: 1 });
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

  const wine = new Wine(req.body);
  const savedWine = await wine.save();
  res.status(201).json(savedWine);
});

wineRouter.put("/:id", tokenExtractor, async (req, res) => {
  if (req.body.category && !Wine.CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: `category deve essere una di: ${Wine.CATEGORIES.join(", ")}` });
  }

  const updatedWine = await Wine.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!updatedWine) return res.status(404).json({ error: "vino non trovato" });
  res.json(updatedWine);
});

wineRouter.delete("/:id", tokenExtractor, async (req, res) => {
  const deletedWine = await Wine.findByIdAndDelete(req.params.id);
  if (!deletedWine) return res.status(404).json({ error: "vino non trovato" });
  res.status(204).end();
});

module.exports = wineRouter;
