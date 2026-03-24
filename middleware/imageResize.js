const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const outputFolder = path.resolve(__dirname, "../public/assets");

module.exports = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);

  if (!files.length) {
    req.images = [];
    return next();
  }

  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }

  const resizePromises = files.map(async (file) => {
    await sharp(file.path)
      .resize(2000)
      .jpeg({ quality: 50 })
      .toFile(path.resolve(outputFolder, file.filename + "_full.jpg"));

    await sharp(file.path)
      .resize(100)
      .jpeg({ quality: 30 })
      .toFile(path.resolve(outputFolder, file.filename + "_thumb.jpg"));

    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    return file.filename;
  });

  const images = await Promise.all(resizePromises);

  req.images = images;

  next();
};
