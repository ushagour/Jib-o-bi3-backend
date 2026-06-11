const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { createNotification } = require("../utilities/notifications");

const { Reviews, User, Listing, Image } = require("../models");

// Apply auth middleware to all routes
router.use(auth);

// Get reviews for a specific listing - MUST come before generic GET /
router.get("/listing/:listingId", async (req, res) => {
  try {
    const { listingId } = req.params;

    const reviews = await Reviews.findAll({
      where: {
        listing_id: listingId,
      },
      include: [
        { model: User, attributes: ['id', 'name', 'avatar'] },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.send(reviews);
  } catch (error) {
    console.error("Error fetching reviews for listing:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});

//reviews 
router.get("/", async (req, res) => {
  try {
    const assetsBaseUrl = process.env.ASSETS_BASE_URL || "http://localhost:3000/assets/";

    const reviews = await Reviews.findAll({
      include: [
        { model: User,  attributes: ['id', 'name', 'avatar'] },
        {
          model: Listing,
          attributes: ['id', 'title'],
          include: [
            {
              model: Image,
              attributes: ['file_name'],
              required: false,
            },
          ],
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!reviews.length) return res.status(404).send({ error: "No reviews found." });

    const resources = reviews.map((review) => ({
      ...review.toJSON(),
      content: review.comment,
      user: review.User,
      listing: review.Listing
        ? {
            id: review.Listing.id,
            title: review.Listing.title,
            imageUrl: review.Listing.Images?.[0]?.file_name
              ? `${assetsBaseUrl}${review.Listing.Images[0].file_name}_thumb.jpg`
              : null,
          }
        : null,
    }));

    res.send(resources);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});


router.post("/", async (req, res) => {
  const { content, rating, userId, listingId } = req.body;

  if (!content || !rating || !userId || !listingId) {
    return res.status(400).send({ error: "All fields are required." });
  }

  try {
      const newReview = await Reviews.create({
      comment: content,
      rating,
      user_id: userId,
      listing_id: listingId
    });

    const [listing, reviewer] = await Promise.all([
      Listing.findByPk(listingId, { attributes: ['id', 'title', 'user_id'] }),
      User.findByPk(userId, { attributes: ['id', 'name'] }),
    ]);

    if (listing && reviewer && String(listing.user_id) !== String(userId)) {
      await createNotification({
        userId: listing.user_id,
        actorId: userId,
        listingId: listing.id,
        type: 'review',
        title: `New review from ${reviewer.name}`,
        content,
      });
    }

    res.status(201).send({
      ...newReview.toJSON(),
      content: newReview.comment,
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});
router.delete("/:id", async (req, res) => {
  const reviewId = req.params.id;
  const userId = req.user.userId;

  try {
    const review = await Reviews.findByPk(reviewId);
    if (!review) {
      return res.status(404).send({ error: "Review not found." });
    }

    if (String(review.user_id) !== String(userId)) {
      return res.status(403).send({ error: "Only the review owner can delete this review." });
    }

    await review.destroy();
    res.status(200).send({ message: "Review deleted successfully." });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});
// unread review notification bill 
router.get("/unread", async (req, res) => {
  try {
    const userId = req.query.userId || (req.user && req.user.userId);
    if (!userId) {
      return res.status(400).send({ error: "Missing userId." });
    }

    const ownedListings = await Listing.findAll({
      where: { user_id: userId },
      attributes: ['id'],
    });

    const listingIds = ownedListings.map((listing) => listing.id);
    if (!listingIds.length) {
      return res.status(200).send([]);
    }

    const unreadReviews = await Reviews.findAll({
      where: {
        listing_id: listingIds,
      },
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'avatar'],
        },
        {
          model: Listing,
          attributes: ['id', 'title'],
        },
      ],
    });

    const resources = unreadReviews.map((review) => ({
      ...review.toJSON(),
      content: review.comment,
      user: review.User,
      listing: review.Listing,
    }));

    res.send(resources);
  } catch (error) {
    console.error("Error fetching unread reviews:", error);
    res.status(500).send({ error: "Internal server error." });
  }
}); 

module.exports = router;




