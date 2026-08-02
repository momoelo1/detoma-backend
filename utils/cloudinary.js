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

// ricava il public_id (es. "enoteca-detoma/wines/abc123") da un secure_url
// tipo https://res.cloudinary.com/<cloud>/image/upload/v169.../<public_id>.<ext>
const getPublicId = (url) => {
  const match = /\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return match ? match[1] : null;
};

// elimina l'asset da Cloudinary in modo permanente. Se `img` non è un URL
// Cloudinary reale (vuoto, o mai caricato) non fa nulla — non c'è nulla da
// cancellare lato storage, solo il riferimento nel documento va svuotato.
const deleteImage = async (img) => {
  if (typeof img !== "string" || !img.includes("res.cloudinary.com")) return;
  const publicId = getPublicId(img);
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = { cloudinary, uploadImage, deleteImage, isBase64Image };
