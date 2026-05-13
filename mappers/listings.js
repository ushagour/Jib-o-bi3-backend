const { Category } = require("../models");

/**
 * Maps a listing object geted from the database and maps it to a more user-friendly format, 
 * @param {Object} listing - The listing object to map.
 * @returns {Object} - The mapped listing object(that containes the images(in case of multiple images)) and user owner.
 */

const mapper = listing => {
  const baseUrl = process.env.ASSETS_BASE_URL || "http://localhost:3000/assets/";

  const mapImage = image => ({
    url: `${baseUrl}${image.file_name}_full.jpg`,
    thumbnailUrl: `${baseUrl}${image.file_name}_thumb.jpg`
  });

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    status: listing.status,
    Category: {
      id: listing.Category?.id,
      icon: listing.Category?.icon,
      name: listing.Category?.name
    },
    images: listing.Images.map(mapImage), // Map all images
    imageUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).url : null,
    thumbnailUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).thumbnailUrl : null,
    // owner: {
      // ...listing.User.toJSON(),
      // isPhoneVerified: listing.User.is_phone_verified,
      // isQuickResponder: listing.User.is_quick_responder,
    // },   
    owner: listing.User, 
    latitude: listing.latitude,
    longitude: listing.longitude,
    status: listing.status,
    state: listing.status,
    createdAt: listing.createdAt,
    carSize: listing.carSize,
    carColor: listing.carColor,
    carModel: listing.carModel,
    carYear: listing.carYear,
    Reviews: listing.Reviews ? listing.Reviews.map(review => ({
      comment: review.comment,
      rating: review.rating
    })) : [],
    
  };
};

module.exports = mapper;