const express = require("express");
const router = express.Router();

const listingsStore = require("../store/listings");
const users = require("../store/users");
const auth = require("../middleware/auth");
const listingMapper = require("../mappers/listings");




router.get("/", auth, (req, res) => {
  
  // const user = users.getUserById(req.user.userId);



  // const listings = listingsStore.filterListings(
  //   listing => listing.userId == user.id
  // );
  // const resources = listings.map(listingMapper);
  // res.send(resources);
});


router.delete("/:id", auth, (req, res) => {
  const listingId = parseInt(req.params.id); // Extract the ID from the URL
  console.log("Deleting listing with ID:", listingId);

  const listing = listingsStore.getListing(listingId); // Retrieve the listing by ID
  if (!listing) return res.status(404).send({ error: "Listing not found." });

  listingsStore.deleteListing(listingId); // Delete the listing

  res.send({ message: "Listing deleted successfully." });
});


module.exports = router;
