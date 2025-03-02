const express = require("express");
const Category = require("../models/Category");

const router = express.Router();

router.get("/", async(req, res) => {
  try {
    const categories = await Category.findAll();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async(req, res) => {
  const id = req.params.id;

  try {
    const category = await Category.findByPk(id);
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
