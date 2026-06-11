const express = require("express");
const router = express.Router();
const Joi = require("joi");
const { Op } = require("sequelize");
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
  status: Joi.string().valid('sold', 'still available').optional(),
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
      where: {
        archived: false,
        status: "still available",
      },
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
        where: {
          archived: false,
          status: "still available",
        },
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
      where: {
        category_id: categoryId,
        archived: false,
        status: "still available",
      },
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
      where: {
        user_id: req.query.userId,
        archived: false,
        status: {
          [Op.notIn]: ["sold", "selled", "Sold out", "sold out"],
        },
      },
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
      where: {
        archived: false,
        status: "still available",
      },
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

// Update AI score for a listing (admin only)
router.put("/:id/ai-score", auth, async (req, res) => {
  try {
    const { ai_score } = req.body;
    const listingId = parseInt(req.params.id);

    // Validate AI score
    if (ai_score !== null && ai_score !== undefined) {
      if (typeof ai_score !== 'number' || ai_score < 0 || ai_score > 100) {
        return res.status(400).json({ error: "AI score must be between 0 and 100, or null" });
      }
    }

    const listing = await Listing.findByPk(listingId);
    
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // Update AI score and timestamp
    await listing.update({
      ai_score: ai_score || null,
      ai_score_updated_at: ai_score !== null && ai_score !== undefined ? new Date() : null,
    });

    res.status(200).json({
      id: listing.id,
      ai_score: listing.ai_score,
      ai_score_updated_at: listing.ai_score_updated_at,
      title: listing.title,
      message: "AI score updated successfully"
    });
  } catch (error) {
    console.error("Error updating AI score:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get listings with AI scores (for admin dashboard)
router.get("/admin/ai-scores", auth, async (req, res) => {
  try {
    const { sortBy = "ai_score", order = "DESC", limit = 100, offset = 0 } = req.query;
    
    const validSortFields = ["ai_score", "createdAt", "title", "price"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "ai_score";
    const sortOrder = ["ASC", "DESC"].includes(String(order).toUpperCase()) ? order : "DESC";

    const listings = await Listing.findAll({
      attributes: ["id", "title", "price", "ai_score", "ai_score_updated_at", "status", "createdAt"],
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
        {
          model: Category,
          attributes: ["id", "name"],
        },
        {
          model: Image,
          attributes: ["file_name"],
          limit: 1,
        },
      ],
      order: [[sortField, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const total = await Listing.count();

    res.status(200).json({
      data: listings.map(listingMapper),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Error fetching AI scores:", error);
    res.status(500).json({ error: error.message });
  }
});


// Close a listing (mark as sold/closed)
router.put("/:id/close", auth, async (req, res) => {
  const listingId = parseInt(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ error: "Invalid listing id." });
  }

  try {
    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    // Check if user owns this listing
    if (listing.user_id !== req.user.userId) {
      return res.status(403).json({ error: "You don't have permission to close this listing." });
    }

    const normalizedStatus = String(listing.status || "").toLowerCase();

    // Check if already closed/archived
    if (listing.archived || normalizedStatus === "" || normalizedStatus === "sold") {
      return res.status(400).json({ error: "Listing is already closed." });
    }

    // Move listing to archive and mark as sold so it disappears from feed.
    await listing.update({
      status: "sold",
      closed_at: new Date(),
      archived: true,
      archived_at: new Date(),
    });

    // Create notification for the seller
    await Notification.create({
      user_id: listing.user_id,
      type: "listing_update",
      title: "Listing Closed",
      content: `Your listing "${listing.title}" has been closed.`,
      listing_id: listing.id,
    });

    res.status(200).json({
      message: "Listing closed successfully.",
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
        closed_at: listing.closed_at,
      },
    });


  } catch (error) {
    console.error("Error closing listing:", error);
    res.status(500).json({ error: error.message });
  }
});

// Reopen a closed listing
router.put("/:id/reopen", auth, async (req, res) => {
  const listingId = parseInt(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ error: "Invalid listing id." });
  }

  try {
    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    // Check if user owns this listing
    if (listing.user_id !== req.user.userId) {
      return res.status(403).json({ error: "You don't have permission to reopen this listing." });
    }

    const normalizedStatus = String(listing.status || "").toLowerCase();

    // Check if listing is closed/archived
    if (!listing.archived && normalizedStatus !== "sold") {
      return res.status(400).json({ error: "Only closed listings can be reopened." });
    }

    // Restore listing to active feed.
    await listing.update({
      status: "still available",
      closed_at: null,
      archived: false,
      archived_at: null,
    });

    // Create notification for the seller
    await Notification.create({
      user_id: listing.user_id,
      type: "listing_update",
      title: "Listing Reopened",
      content: `Your listing "${listing.title}" has been reopened and is now available for buyers.`,
      listing_id: listing.id,
    });

    res.status(200).json({
      message: "Listing reopened successfully.",
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
      },
    });
  } catch (error) {
    console.error("Error reopening listing:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get all closed listings for the authenticated user
router.get("/closed", auth, async (req, res) => {
  try {
    const closedListings = await Listing.findAll({
      where: {
        user_id: req.user.userId,
        archived: true,
      },
      order: [["closed_at", "DESC"]],
      include: [
        {
          model: Image,
          attributes: ["file_name"],
        },
        {
          model: Category,
          attributes: ["id", "name", "icon"],
        },
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
    });

    const resources = closedListings.map(listingMapper);
    res.status(200).json({
      data: resources,
      total: resources.length,
    });
  } catch (error) {
    console.error("Error fetching closed listings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get closed listings by user ID (for admin)
router.get("/user/:userId/closed", auth, async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  // Check if admin or requesting own listings
  if (req.user.userId !== userId && req.user.role !== "admin") {
    return res.status(403).json({ error: "You don't have permission to view these listings." });
  }

  try {
    const closedListings = await Listing.findAll({
      where: {
        user_id: userId,
        archived: true,
      },
      order: [["closed_at", "DESC"]],
      include: [
        {
          model: Image,
          attributes: ["file_name"],
        },
        {
          model: Category,
          attributes: ["id", "name", "icon"],
        },
      ],
    });

    const resources = closedListings.map(listingMapper);
    res.status(200).json({
      data: resources,
      total: resources.length,
    });
  } catch (error) {
    console.error("Error fetching closed listings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get listing statistics including closed counts
router.get("/stats", auth, async (req, res) => {
  try {
    const totalListings = await Listing.count({ where: { user_id: req.user.userId } });
    const activeListings = await Listing.count({
      where: {
        user_id: req.user.userId,
        status: "still available",
      },
    });
    const closedListings = await Listing.count({
      where: {
        user_id: req.user.userId,
        archived: true,
      },
    });
    const soldListings = await Listing.count({
      where: {
        user_id: req.user.userId,
        status: "sold",
      },
    });

    res.status(200).json({
      total: totalListings,
      active: activeListings,
      closed: closedListings,
      sold: soldListings,
    });
  } catch (error) {
    console.error("Error fetching listing stats:", error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk close listings (for admin)
router.post("/bulk-close", auth, async (req, res) => {
  const { listingIds } = req.body;

  if (!Array.isArray(listingIds) || listingIds.length === 0) {
    return res.status(400).json({ error: "Invalid listing ids array." });
  }

  // Check if admin
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }

  try {
    const results = await Promise.all(
      listingIds.map(async (id) => {
        const listing = await Listing.findByPk(id);
        if (listing && !listing.archived) {
          await listing.update({
            status: "sold",
            closed_at: new Date(),
            archived: true,
            archived_at: new Date(),
          });
          return { id, success: true };
        }
        return { id, success: false, error: "Listing not found or already archived" };
      })
    );

    res.status(200).json({
      message: "Bulk close operation completed.",
      results,
    });
  } catch (error) {
    console.error("Error in bulk close:", error);
    res.status(500).json({ error: error.message });
  }
});

// Archive a listing (soft delete without removing from database)
router.put("/:id/archive", auth, async (req, res) => {
  const listingId = parseInt(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ error: "Invalid listing id." });
  }

  try {
    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    if (listing.user_id !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Permission denied." });
    }

    await listing.update({
      archived: true,
      archived_at: new Date(),
    });

    res.status(200).json({
      message: "Listing archived successfully.",
      listing: { id: listing.id, title: listing.title, archived: true },
    });
  } catch (error) {
    console.error("Error archiving listing:", error);
    res.status(500).json({ error: error.message });
  }
});

// Restore an archived listing
router.put("/:id/restore", auth, async (req, res) => {
  const listingId = parseInt(req.params.id);

  if (Number.isNaN(listingId)) {
    return res.status(400).json({ error: "Invalid listing id." });
  }

  try {
    const listing = await Listing.findByPk(listingId);

    if (!listing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    if (listing.user_id !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ error: "Permission denied." });
    }

    await listing.update({
      archived: false,
      archived_at: null,
    });

    res.status(200).json({
      message: "Listing restored successfully.",
      listing: { id: listing.id, title: listing.title, archived: false },
    });
  } catch (error) {
    console.error("Error restoring listing:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get archived listings
router.get("/archived", auth, async (req, res) => {
  try {
    const archivedListings = await Listing.findAll({
      where: {
        user_id: req.user.userId,
        archived: true,
        status: {
          [Op.notIn]: ["sold", "Sold out", "sold out"],
        },
      },
      order: [["archived_at", "DESC"]],
      include: [
        {
          model: Image,
          attributes: ["file_name"],
        },
        {
          model: Category,
          attributes: ["id", "name", "icon"],
        },
      ],
    });

    const resources = archivedListings.map(listingMapper);
    res.status(200).json({
      data: resources,
      total: resources.length,
    });
  } catch (error) {
    console.error("Error fetching archived listings:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get sold listings (separate from archived listings)
router.get("/sold", auth, async (req, res) => {
  try {
    const soldListings = await Listing.findAll({
      where: {
        user_id: req.user.userId,
        status: {
          [Op.in]: ["sold", "Sold out", "sold out"],
        },
      },
      order: [["closed_at", "DESC"], ["updatedAt", "DESC"]],
      include: [
        {
          model: Image,
          attributes: ["file_name"],
        },
        {
          model: Category,
          attributes: ["id", "name", "icon"],
        },
      ],
    });

    const resources = soldListings.map(listingMapper);
    res.status(200).json({
      data: resources,
      total: resources.length,
    });
  } catch (error) {
    console.error("Error fetching sold listings:", error);
    res.status(500).json({ error: error.message });
  }
});
// Get similar listings by category
router.get("/:id/similar", async (req, res) => {
  try {
    const listingId = parseInt(req.params.id);
    const categoryId = req.query.category ? parseInt(req.query.category) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;

    if (Number.isNaN(listingId)) {
      return res.status(400).json({ error: "Invalid listing id." });
    }

    // Get the original listing to find its category if not provided
    const originalListing = await Listing.findByPk(listingId);
    if (!originalListing) {
      return res.status(404).json({ error: "Listing not found." });
    }

    const filterCategoryId = categoryId || originalListing.category_id;

    const similarListings = await Listing.findAll({
      where: {
        id: { [Op.ne]: listingId },
        category_id: filterCategoryId,
        archived: false,
        status: "still available",
      },
      order: [["createdAt", "DESC"]],
      limit,
      include: [
        {
          model: Image,
          attributes: ["file_name"],
        },
        {
          model: Category,
          attributes: ["id", "name", "icon"],
        },
        {
          model: User,
          attributes: { exclude: ["password"] },
        },
      ],
    });

    const resources = similarListings.map(listingMapper);

    
    res.status(200).json({
      data: resources,
      total: resources.length,
    });
  } catch (error) {
    console.error("Error fetching similar listings:", error);
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
