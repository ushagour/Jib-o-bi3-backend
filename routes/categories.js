const express = require("express");
const { Categories } = require("../models");
const router = express.Router();

router.get("/", async(req, res) => {
  try {
    const listings = await Categories.findAll();
    res.status(200).json(listings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", (req, res) => {
  const id = req.params.id;

});

module.exports = router;
