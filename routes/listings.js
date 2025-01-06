const express = require("express");
const router = express.Router();
const Joi = require("joi");
const multer = require("multer");
const db = require('../database/database');
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





// Get all listings
router.get('/', (req, res) => {
  const query = `
    SELECT * FROM listings
    LEFT JOIN images ON listings.id = images.listing_id
  `;  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
    //after getting the rows, we map them to the format we want,
    //  to sent them to the client
      const resources = rows.map(listingMapper);
      
      res.send(resources);
    }
  });







});

// Add a new listing
router.post('/',
  [
    //nb: Multer should come first to handle files

    upload.array("images", config.get("maxImageCount")),
    // Validation middleware comes after multer
    validateWith(schema),
    validateCategoryId,
    imageResize,

  ],
  
  
  (req, res) => {

    if (!req.files || req.files.length === 0) {
      return res.status(400).send({ error: "No images uploaded." });
    }

    const images = req.files.map((file) => ({ fileName: file.filename }));


    const LocationRecords = req.body.location ? JSON.stringify(req.body.location) : null;

    const listingQuery = `
      INSERT INTO listings (title, description, price, location, userId, categoryId)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const listingData = {
      title: req.body.title,
      description: req.body.description,
      price: parseFloat(req.body.price),
      location: LocationRecords,
      userId: parseInt(req.body.userId),
      categoryId: parseInt(req.body.categoryId),
    };

    db.run(listingQuery, [listingData.title, listingData.description, listingData.price, listingData.location, listingData.userId, listingData.categoryId], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const listingId = this.lastID;

      const imageQuery = `
        INSERT INTO images (listing_id, fileName)
        VALUES (?, ?)
      `;

      const imageInserts = images.map((image) => {
        return new Promise((resolve, reject) => {
          db.run(imageQuery, [listingId, image.fileName], function (err) {
            if (err) {
              return reject(err);
            }
            resolve();
          });
        });
      });

      Promise.all(imageInserts)
        .then(() => {
          res.status(201).json({ message: 'Listing and images added successfully' });
        })
        .catch((err) => {
          res.status(500).json({ error: err.message });
        });
    });
});

module.exports = router;
0