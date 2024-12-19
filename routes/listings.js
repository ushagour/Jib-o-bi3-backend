const express = require("express");
const router = express.Router();
const Joi = require("joi");
const multer = require("multer");

const store = require("../store/listings");
const categoriesStore = require("../store/categories");
const validateWith = require("../middleware/validation");
const auth = require("../middleware/auth");
const imageResize = require("../middleware/imageResize");
const delay = require("../middleware/delay");
const listingMapper = require("../mappers/listings");
const config = require("config");

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



const validateCategoryId = (req, res, next) => {
  if (!categoriesStore.getCategory(parseInt(req.body.categoryId)))
    return res.status(400).send({ error: "Invalid categoryId." });

  next();
};

router.get("/", (req, res) => {

  const listings = store.getListings();
  const resources = listings.map(listingMapper);
  res.send(resources);
});

//Todo : understand the logic
router.put(
  "/:id",
  [
    upload.array("images", config.get("maxImageCount")), // Handle file uploads
    validateWith(schema), // Validate incoming data
    validateCategoryId, // Ensure categoryId is valid
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

router.post(
  "/",
  [
    //nb: Multer should come first to handle files

    upload.array("images", config.get("maxImageCount")),
    // Validation middleware comes after multer
    validateWith(schema),
    validateCategoryId,
    imageResize,

  ],
  async (req, res) => {


    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ error: "No images uploaded." });
    }

    const listing = {
      title: req.body.title,
      price: parseFloat(req.body.price),
      categoryId: parseInt(req.body.categoryId),
      description: req.body.description,
      userId: parseInt(req.body.userId)
    };


    
    listing.images = req.files.map((file) => ({ fileName: file.filename }));

    listing.dateTime = Date.now();
    
    if (req.body.location) listing.location = req.body.location; // No need to parse the location if it's not provided
    
    
    




    store.addListing(listing);

    res.status(201).send(listing);
  }
);


module.exports = router;
