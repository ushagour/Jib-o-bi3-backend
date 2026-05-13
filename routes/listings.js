const express = require("express");
const router = express.Router();
const Joi = require("joi");
const multer = require("multer");
const fs = require("fs/promises");
const path = require("path");
const categoriesStore = require("../routes/categories");
const validateWith = require("../middleware/validation");
const auth = require("../middleware/auth");
const imageResize = require("../middleware/imageResize");
const delay = require("../middleware/delay");
const listingMapper = require("../mappers/listings");
const { sequelize, Listing, Image, User, Favorites, Reviews, Category, Orders, Notification } = require("../models");
const config = require("config");
const { createListingUpdateNotifications } = require("../utilities/notifications");

const upload = multer({
  dest: "uploads/",
  limits: { fieldSize: 25 * 1024 * 1024 },
});

// Update the schema to be compatible with Joi v16+
const updateListingSchema = Joi.object({
  title: Joi.string().optional(),
  description: Joi.string().allow("").optional(),
  price: Joi.number().min(1).optional(),
  status: Joi.string().valid('selled', 'still available').optional(),
  category_id: Joi.string().optional(),
  carSize: Joi.string().optional().allow(null, ""),
  carColor: Joi.string().optional().allow(null, ""),
  carModel: Joi.string().optional().allow(null, ""),
  carYear: Joi.number().optional().allow(null, ""),
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
  user_id: Joi.required(),
  carSize: Joi.string().optional().allow(null, ""),
  carColor: Joi.string().optional().allow(null, ""),
  carModel: Joi.string().optional().allow(null, ""),
  carYear: Joi.number().optional().allow(null, ""),
  latitude: Joi.number().optional().allow(null, ""),
  longitude: Joi.number().optional().allow(null, ""),
  location: Joi.object({
    latitude: Joi.number().optional().allow(null, ""),
    longitude: Joi.number().optional().allow(null, ""),
  }).optional().allow(null),
});

// Create a new listing
router.post(
  "/",
  [
    upload.array("images", parseInt(process.env.MAX_IMAGE_COUNT) || 10), // Handle file uploads
    validateWith(addListingSchema), // Validate incoming data
    // validateCategoryId, // Ensure categoryId is valid
    imageResize, // Resize images if provided
  ], auth, 
  async (req, res) => {
    try {
      const {
        title,
        user_id,
        description,
        price,
        category_id,
        carSize,
        carColor,
        carModel,
        carYear,
        latitude: latitudeRaw,
        longitude: longitudeRaw,
        location,
      } = req.body;

      const parsedLocation =
        typeof location === "string"
          ? (() => {
              try {
                return JSON.parse(location);
              } catch {
                return null;
              }
            })()
          : location;

      let latitude =
        parsedLocation?.latitude !== undefined && parsedLocation?.latitude !== ""
          ? Number(parsedLocation.latitude)
          : latitudeRaw !== undefined && latitudeRaw !== ""
            ? Number(latitudeRaw)
            : null;

      let longitude =
        parsedLocation?.longitude !== undefined && parsedLocation?.longitude !== ""
          ? Number(parsedLocation.longitude)
          : longitudeRaw !== undefined && longitudeRaw !== ""
            ? Number(longitudeRaw)
            : null;

      if (latitude === 0 || !Number.isFinite(latitude)) latitude = null;
      if (longitude === 0 || !Number.isFinite(longitude)) longitude = null;

      // Create the listing
      const listing = await Listing.create({
        title,
        user_id: req.user?.userId || user_id,
        description,
        price,
        category_id,
        carSize: carSize || null,
        carColor: carColor || null,
        carModel: carModel || null,
        carYear: carYear || null,
        latitude,
        longitude,
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
    upload.array("images", parseInt(process.env.MAX_IMAGE_COUNT) || 10), // Handle file uploads
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
        status: req.body.status || existingListing.status,
        category_id: req.body.category_id ? parseInt(req.body.category_id):existingListing.category_id,
        description: req.body.description || existingListing.description,
        carSize: req.body.carSize !== undefined ? req.body.carSize : existingListing.carSize,
        carColor: req.body.carColor !== undefined ? req.body.carColor : existingListing.carColor,
        carModel: req.body.carModel !== undefined ? req.body.carModel : existingListing.carModel,
        carYear: req.body.carYear !== undefined ? req.body.carYear : existingListing.carYear,
      };

      const changes = {
        title: updatedListing.title !== existingListing.title,
        price: updatedListing.price !== existingListing.price,
        status: updatedListing.status !== existingListing.status,
        category_id: updatedListing.category_id !== existingListing.category_id,
        description: updatedListing.description !== existingListing.description,
      };

      const carFieldsChanged = updatedListing.carSize !== existingListing.carSize ||
        updatedListing.carColor !== existingListing.carColor ||
        updatedListing.carModel !== existingListing.carModel ||
        updatedListing.carYear !== existingListing.carYear;

      if (carFieldsChanged) {
        changes.carDetails = true;
      }

      // console.log("Updated listing data:", updatedListing); // Log the updated listing data
      

      // Update the listing in the database
      await existingListing.update(updatedListing);

      await createListingUpdateNotifications({
        listingId,
        actorId: req.user.userId,
        listingTitle: updatedListing.title,
        changes,
      });

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

// Haversine formula to calculate distance between two points on Earth
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get listings near a given location
router.get("/nearby", async (req, res) => {
  try {
    const { latitude, longitude, distance = 10 } = req.query; // Default distance is 10 km

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ error: "Latitude and longitude are required." });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const dist = parseFloat(distance);

    const listings = await Listing.findAll({
    include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        },
        {
          model: User,
          attributes: ['name'], // Include only the name attribute
          attributes: { exclude: ["password"] }, // Exclude the password field

        }, {
          model: Category,
          attributes: ['name', 'icon'], // Include only the name attribute
        }

      ],
    });

    const nearbyListings = listings
      .map((listing) => {
        if (listing.latitude && listing.longitude) {
          const listingDistance = getDistance(
            lat,
            lon,
            listing.latitude,
            listing.longitude
          );
          if (listingDistance <= dist) {
            return { ...listing.toJSON(), distance: listingDistance };
          }
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance);

      // console.log('filterd nearby listings ', nearbyListings);
      

    const resources = nearbyListings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    console.error("Error fetching nearby listings:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

// Get all listings
router.get("/", async(req, res) => {
  try {
    const listings = await Listing.findAll(
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

        }, {
          model: Category,
          attributes: ['name', 'icon'], // Include only the name attribute
        }

      ],
    });
    // console.log(listings);
    const resources = listings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get listings by category
router.get("/category/:categoryId", async (req, res) => {
  const categoryId = parseInt(req.params.categoryId, 10);

  if (Number.isNaN(categoryId)) {
    return res.status(400).json({ error: "Invalid category id." });
  }

  try {
    const listings = await Listing.findAll({
      where: { category_id: categoryId },
      order: [["createdAt", "DESC"]],
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
    });

    const resources = listings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single listing NB AUTH
router.get("/detail/:id", async (req, res) => {
  try {
    const listing = await Listing.findOne({
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
    const totalListings = await Listing.count();
    
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
router.delete("/:id",auth, async (req, res) => {
  const listing_id = parseInt(req.params.id); // Extract the ID from the URL

  if (Number.isNaN(listing_id)) {
    return res.status(400).json({ error: "Invalid listing id." });
  }

  try {
    const listing = await Listing.findByPk(listing_id, {
        include: [Image, Favorites, Reviews], // Include associated images
    });

    if (!listing) {
      return res.status(404).send({ error: "Listing not found." });
    }

    const imageFileNames = (listing.Images || [])
      .map((image) => image.file_name)
      .filter(Boolean);

    await sequelize.transaction(async (transaction) => {
      // Delete records in all associated tables that reference this listing
      await Image.destroy({ where: { listing_id: listing.id }, transaction });
      await Favorites.destroy({ where: { listing_id: listing.id }, transaction });
        await Reviews.destroy({ where: { listing_id: listing.id }, transaction, individualHooks: true });
      await Orders.destroy({ where: { listing_id: listing.id }, transaction });
      await Notification.destroy({ where: { listing_id: listing.id }, transaction });

      // Delete the listing from the database
      await listing.destroy({ transaction });
    });

    // Best-effort cleanup of uploaded files on disk
    await Promise.all(
      imageFileNames.map(async (fileName) => {
        const filePath = path.join(__dirname, "..", "uploads", fileName);
        try {
          await fs.unlink(filePath);
        } catch (fileError) {
          if (fileError.code !== "ENOENT") {
            console.error(`Failed to remove upload file: ${fileName}`, fileError);
          }
        }
      })
    );

    res.send({ message: "Listing deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Top listings (popular by number of orders)
router.get("/top", async (req, res) => {
  
  try {
    const listings = await Listing.findAll({
      include: [
        {
          model: Image,
          attributes: ['file_name'], // Include only the file_name attribute
        },
        {
          model: Category,
          attributes: ['id', 'name', 'icon'],
        },
        {
          model: User,
          attributes: ['name'], // Include only the name attribute
          attributes: { exclude: ["password"] }, // Exclude the password field

        },
        {
          model: Orders,
          attributes: ['id'],
          required: false,
        }
      ],
    });

    const topListings = listings
      .slice()
      .sort((a, b) => {
        const ordersA = Array.isArray(a.Orders) ? a.Orders.length : 0;
        const ordersB = Array.isArray(b.Orders) ? b.Orders.length : 0;

        if (ordersB !== ordersA) return ordersB - ordersA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);

    const resources = topListings.map(listingMapper);
    res.status(200).json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); 


module.exports = router;
