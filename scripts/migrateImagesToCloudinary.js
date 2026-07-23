// One-time migration: uploads every wine's base64 `img` to Cloudinary and
// replaces it with the returned URL. Safe to re-run — wines that already
// have a URL (not a base64 data URI) are skipped.
require("dotenv").config();
const mongoose = require("mongoose");
const config = require("../utils/config");
const Wine = require("../models/Wine");
const { uploadImage } = require("../utils/cloudinary");

const WINE_IMG_FOLDER = "enoteca-detoma/wines";

const run = async () => {
  await mongoose.connect(config.MONGODB_URI);

  const wines = await Wine.find({ img: { $regex: "^data:image" } });
  console.log(`Found ${wines.length} wine(s) with a base64 image to migrate.`);

  for (const wine of wines) {
    try {
      const url = await uploadImage(wine.img, WINE_IMG_FOLDER);
      wine.img = url;
      await wine.save();
      console.log(`Migrated "${wine.name}" -> ${url}`);
    } catch (error) {
      console.error(`Failed to migrate "${wine.name}":`, error.message);
    }
  }

  await mongoose.disconnect();
  console.log("Done.");
};

run();
