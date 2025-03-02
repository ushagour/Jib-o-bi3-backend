const express = require("express");
const router = express.Router();

const listingsStore = require("../store/listings");
const auth = require("../middleware/auth");
const listingMapper = require("../mappers/listings");

const Listing = require("../models/Listing");
const Image = require("../models/Image");
const User = require("../models/User");


router.get("/", async (req, res) => {
  
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


router.delete("/:id", auth, (req, res) => {
  const listingId = parseInt(req.params.id); // Extract the ID from the URL
  console.log("Deleting listing with ID:", listingId);
  Listing.delete({ where: { id: listingId } });//TODO delete listing from database



  res.send({ message: "Listing deleted successfully." });
});


module.exports = router;
