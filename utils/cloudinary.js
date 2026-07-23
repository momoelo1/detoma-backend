const cloudinary = require("cloudinary").v2;

// Configures itself automatically from process.env.CLOUDINARY_URL
// (the single connection string shown on the Cloudinary dashboard).

// base64 data URIs start with "data:image/..."; anything else (an
// already-uploaded Cloudinary URL, or empty) is passed through untouched.
const isBase64Image = (value) => typeof value === "string" && value.startsWith("data:image");

const uploadImage = async (img, folder) => {
  if (!isBase64Image(img)) return img;
  const result = await cloudinary.uploader.upload(img, { folder });
  return result.secure_url;
};

module.exports = { cloudinary, uploadImage, isBase64Image };
