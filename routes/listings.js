const express = require("express");
const router = express.Router();
const Joi = require("joi");
const multer = require("multer");
const categoriesStore = require("../routes/categories");
const validateWith = require("../middleware/validation");
const auth = require("../middleware/auth");
const imageResize = require("../middleware/imageResize");
const delay = require("../middleware/delay");
const listingMapper = require("../mappers/listings");
const { Listing, Image, User, Favorites, Reviews, Messages, Category } = require("../models");
const config = require("config");

const Listings = require('../models/Listing');
const e = require("express");

const upload = multer({
  dest: "uploads/",
  limits: { fieldSize: 25 * 1024 * 1024 },
});

// Update the schema to be compatible with Joi v16+
const updateListingSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
  price: Joi.number().min(1).optional(),
  category_id: Joi.string().optional(),
  location: Joi.object({
    latitude: Joi.number().optional(),
    longitude: Joi.number().optional(),
  }).optional(),
});

const addListingSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().allow(""),
  price: Joi.number().required().min(1),
  category_id: Joi.string().required(),
  user_id: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).optional(),
});

// Create a new listing
router.post(
  "/",
  [
    upload.array("images", config.get("maxImageCount")), // Handle file uploads
    validateWith(addListingSchema), // Validate incoming data
    // validateCategoryId, // Ensure categoryId is valid
    imageResize, // Resize images if provided
  ], auth, 
  async (req, res) => {
    try {
      const { title, user_id, description, price, category_id, location } = req.body;

      // Create the listing
      const listing = await Listing.create({
        title,
        user_id,
        description,
        price,
        category_id,
        latitude : location.latitude,
        longitude : location.longitude,
      });

      // Handle images if provided
      if (req.files && req.files.length > 0) {
        const images = req.files.map((file) => ({
          file_name: file.filename,
          listing_id: listing.id,
        }));
        await Image.bulkCreate(images);
      }
    res.status(200).json(listing);


    } catch (error) {
      console.error("Error creating listing:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Update listing
router.put(
  "/:id",
  [
    upload.array("images", config.get("maxImageCount")), // Handle file uploads
    validateWith(updateListingSchema), // Validate incoming data
    imageResize, // Resize images if provided
  ],
  auth,
  async (req, res) => {
    const listingId = parseInt(req.params.id); // Get listing ID from the URL

    try {
      const existingListing = await Listing.findByPk(listingId);


      if (!existingListing) {
        return res.status(404).send({ error: "Listing not found." });
      }

      // Update listing fields
      const updatedListing = {
        title: req.body.title || existingListing.title,
        price: req.body.price ? parseFloat(req.body.price) : existingListing.price,
        category_id: req.body.category_id ? parseInt(req.body.category_id):existingListing.category_id,
        description: req.body.description || existingListing.description,
      };

      // console.log("Updated listing data:", updatedListing); // Log the updated listing data
      

      // Update the listing in the database
      await existingListing.update(updatedListing);

      // // Handle images if provided
      if (req.files && req.files.length > 0) {
        // Delete existing images for the listing
        await Image.destroy({ where: { listing_id: listingId } });

        // Add new images
        const newImages = req.files.map((file) => ({
          file_name: file.filename,
          listing_id: listingId,
        }));

        
        await Image.bulkCreate(newImages);
      }

      // Handle location if provided
      const updatedListingWithImages = await Listing.findByPk(listingId, {
        include: [
          {
            model: Image,
            attributes: ["file_name"], // Include only the file_name attribute
          },
        ],
      });

      res.status(200).json(updatedListingWithImages);
    } catch (error) {
      console.error("Error updating listing:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get all listings
router.get("/", async(req, res) => {
  try {
    const listings = await Listings.findAll(
      {
        order: [['createdAt', 'DESC']], // Order by created_at field in descending order

      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        },
        {
          model: User,
          attributes: ['name'], // Include only the name attribute
          attributes: { exclude: ["password"] }, // Exclude the password field

        }
      ],
    });

    const resources = listings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single listing NB AUTH
router.get("/detail/:id",auth, async (req, res) => {

  try {
    const listing = await Listings.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        },
        {
          model: User,
          // attributes: ['name'], // Include only the name attribute
          attributes: { exclude: ["password"] }, // Exclude the password field

        },
        {
          model: Favorites,
          attributes: ['user_id'], // Include only the user_id attribute
        },
        {
          model: Reviews,
          attributes: ['comment', 'rating'], // Include content and rating attributes
        },
        {
          model: Messages,
          attributes: ['content', 'sender_id', 'receiver_id'], // Include content, sender_id, and receiver_id attributes
        },
        {
          model: Category,
          attributes: ['name', 'id'], // Include only the name attribute
        }

      ],
    });
    //cheacks if the listing is existent in the database
    if (!listing) {
      console.log("Listing not found");
      return res.status(404).send({ error: "Listing not found." });
    }

    const resources = listingMapper(listing);
    
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.get("/total_listings", async (req, res) => {
  try {
    const totalListings = await Listings.count();

    console.log("Total listings:", totalListings); // Log the total listings count
    
    res.status(200).json({  totalListings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my listings 
router.get("/my_listings",auth, async (req, res) => {
  try {
    const myListing = await Listing.findAll({
      where: { user_id: req.query.userId },
      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        }  ,   {
          model: Category,
          attributes: ['name', 'id'], // Include only the name attribute
        }

      ],
    });

    const resources = myListing.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Delete a listing
router.delete("/:id", async (req, res) => {
  const listing_id = parseInt(req.params.id); // Extract the ID from the URL

  try {
    const listing = await Listing.findByPk(listing_id, {
      include: [Image, Favorites, Reviews, Messages], // Include associated images
    });
    if (!listing) {
      return res.status(404).send({ error: "Listing not found." });
    }

    // Delete records in other associated tables
    await Image.destroy({ where: { listing_id: listing.id } });
    await Favorites.destroy({ where: { listing_id: listing.id } });
    await Reviews.destroy({ where: { listing_id: listing.id } });
    await Messages.destroy({ where: { listing_id: listing.id } });

    // Delete the listing from the database
    await listing.destroy();
    res.send({ message: "Listing deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
