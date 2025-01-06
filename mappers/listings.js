
const config = require("config");

/*
The role of the mapper in the listings.js
 mapper file is to transform listing objects by modifying their image URLs. Specifically, it takes a listing object,
 processes its images, and returns a new listing object with updated image URLs.
 The URLs are constructed using a base URL from the configuration and appending the image file names with 
 specific suffixes for full and thumbnail versions.
 This ensures that the listing objects have properly formatted image URLs for use in the application.*/
const mapper = listing => {
  
  const baseUrl = config.get("assetsBaseUrl");

  const mapImage = fileName => ({
    url: `${baseUrl}${fileName}_full.jpg`,
    thumbnailUrl: `${baseUrl}${fileName}_thumb.jpg`
  });
  

 const images = mapImage(listing.fileName);
 
 
return {
    ...listing,
    images
  };
  
};

module.exports = mapper;

