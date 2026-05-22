const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { Favorites, Listing, Image, User, Category } = require("../models");
const listingMapper = require("../mappers/listings");
const { createNotification } = require("../utilities/notifications");

router.use(auth);


router.get("/get_all", async (req, res) => {
  try {
    const userId = req.user.userId;
    const favorites = await Favorites.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Listing,
          include: [
            {
              model: Image,
              attributes: ["file_name"],
            },
            {
              model: User,
              attributes: { exclude: ["password"] },
            },
            {
              model: Category,
              attributes: ["id", "name", "icon"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    const resources = favorites
      .map((favorite) => favorite.Listing)
      .filter(Boolean)
      .map(listingMapper);

    res.json(resources);
  }
  catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

    if (String(listing.user_id) !== String(userId)) {
      await createNotification({
        userId: listing.user_id,
        actorId: userId,
        listingId: listing.id,
        type: "like",
        title: "New like on your listing",
        content: `${req.user.username} liked your listing: ${listing.title}`,
      });
    }

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