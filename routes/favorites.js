const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Favorites, Listing } = require("../models");

router.use(auth);

router.get("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const favorites = await Favorites.findAll({
      where: { user_id: userId },
      attributes: ["listing_id"],
    });

    res.json({
      ok: true,
      data: favorites.map((favorite) => favorite.listing_id),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.user.userId;
    const listing_id = parseInt(req.body.listing_id, 10);

    if (!listing_id || Number.isNaN(listing_id)) {
      return res.status(400).json({ error: "listing_id is required." });
    }

    const listing = await Listing.findByPk(listing_id);
    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const existingFavorite = await Favorites.findOne({
      where: { user_id: userId, listing_id },
    });

    if (existingFavorite) {
      return res.status(200).json({ ok: true, data: existingFavorite, message: "Already favorited." });
    }

    const favorite = await Favorites.create({
      user_id: userId,
      listing_id,
    });

    res.status(201).json({ ok: true, data: favorite });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:listingId", async (req, res) => {
  try {
    const userId = req.user.userId;
    const listingId = parseInt(req.params.listingId, 10);

    const favorite = await Favorites.findOne({
      where: { user_id: userId, listing_id: listingId },
    });

    if (!favorite) {
      return res.status(404).json({ error: "Favorite not found." });
    }

    await favorite.destroy();
    res.json({ ok: true, message: "Favorite removed." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;