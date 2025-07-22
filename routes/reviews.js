const express = require("express");
const app = express();
app.use(express.json()); // Middleware to parse JSON request body

const router = express.Router();
const bcrypt = require("bcrypt");
const multer = require("multer");
const config = require("config");
const e = require("express");

const { Reviews,User,Listing } = require("../models");

//reviews 
router.get("/", async (req, res) => {
  try {
    const reviews = await Reviews.findAll({
      include: [
        { model: User,  attributes: ['id', 'name', 'avatar'] },
        { model: Listing,  attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (!reviews.length) return res.status(404).send({ error: "No reviews found." });

    res.send(reviews);
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
      content,
      rating,
      user_id: userId,
      listing_id: listingId
    });

    res.status(201).send(newReview);
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});
router.delete("/:id", async (req, res) => {
  const reviewId = req.params.id;

  try {
    const review = await Reviews.findByPk(reviewId);
    if (!review) {
      return res.status(404).send({ error: "Review not found." });
    }

    await review.destroy();
    res.status(200).send({ message: "Review deleted successfully." });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).send({ error: "Internal server error." });
  }
});

module.exports = router;




