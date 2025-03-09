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
const { Listing, Image,User,Favorites,Reviews,Messages } = require("../models");//
const config = require("config");



const Listings = require('../models/Listing');

const upload = multer({
  dest: "uploads/",
  limits: { fieldSize: 25 * 1024 * 1024 },
});


// Update the schema to be compatible with Joi v16+
const schema = Joi.object({
  title: Joi.string().required(),
  userId: Joi.required(),
  description: Joi.string().allow(""),
  price: Joi.number().required().min(1),
  categoryId: Joi.string().required(),
  location: Joi.object({
    latitude: Joi.number().required(),
    longitude: Joi.number().required(),
  }).optional(),
});



// const validateCategoryId = (req, res, next) => {//to added it later 
//   if (!categoriesStore.getCategory(parseInt(req.body.categoryId)))
//     return res.status(400).send({ error: "Invalid categoryId." });
//   next();
// };
// update listings

router.put(
  "/:id",
  [
    upload.array("images", config.get("maxImageCount")), // Handle file uploads
    validateWith(schema), // Validate incoming data
    // validateCategoryId, // Ensure categoryId is valid
    imageResize, // Resize images if provided
  ], auth, 
  async (req, res) => {
    const listingId = parseInt(req.params.id); // Get listing ID from the URL
    const existingListing = store.getListing(listingId);

    console.log('---------back end logs ---------');
    
    console.log(listingId, existingListing);
    
    if (!existingListing) {
      return res.status(404).send({ error: "Listing not found." });
    }

    const updatedListing = {
      ...existingListing, // Retain existing fields
      title: req.body.title || existingListing.title,
      price: req.body.price ? parseFloat(req.body.price) : existingListing.price,
      categoryId: req.body.categoryId
        ? parseInt(req.body.categoryId)
        : existingListing.categoryId,
      description: req.body.description || existingListing.description,
      userId: parseInt(req.body.userId) || existingListing.userId,
    };

    // Update images if provided
    if (req.files && req.files.length > 0) {
      updatedListing.images = req.files.map((file) => ({ fileName: file.filename }));
    }
    // Update location if provided
    if (req.body.location) {
      updatedListing.location = req.body.location;
    }

    // Update the listing in the store
    store.updateListing(listingId, updatedListing);

    console.log("Updated listing:", updatedListing);
    res.status(200).send(updatedListing);
    
  }
);


// router.get("/:id", auth, (req, res) => {
//   const listing = store.getListing(parseInt(req.params.id));
//   if (!listing) return res.status(404).send();
//   const resource = listingMapper(listing);
//   res.send(resource);
// });






// Get all listings
router.get("/", async(req, res) => {
  try {
    const listings = await Listings.findAll({
      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        },
        {
          model: User,
          attributes: ['name'], // Include only the name attribute
        }
      ],
    });

    const resources = listings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



router.get("/my_Listings", async (req, res) => {
  
  try {
    
    
    const myListing = await Listing.findAll( { where: { user_id: req.query.userId },
    
      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        }
      ],
    });
  
    const resources = myListing.map(listingMapper);
    
    res.status(200).json(resources);

  } 
    catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Delete a listing
// Delete a listing
router.delete("/:id", async (req, res) => {
  const listing_id = parseInt(req.params.id); // Extract the ID from the URL

  try {
    const listing = await Listing.findByPk(listing_id, {
      include: [Image,Favorites,Reviews,Messages], // Include associated images
    });
    if (!listing) {
      console.log("Listing not found");
      return res.status(404).send({ error: "Listing not found." });
    }

    
    // Delete records in other associated tables
    await Image.destroy({ where: { listing_id: listing.id } });
    await Favorites.destroy({ where: { listing_id: listing.id } });
    await Reviews.destroy({ where: { listing_id: listing.id } });
    await Messages.destroy({ where: { listing_id: listing.id } });

    // Delete the listing from the database
    await listing.destroy();
    console.log("Listing deleted successfully");
    res.send({ message: "Listing deleted successfully." });
  } catch (error) {
    console.error("Error deleting listing:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
