const config = require("config");
const { Category, Messages } = require("../models");

/**
 * Maps a listing object geted from the database and maps it to a more user-friendly format, 
 * @param {Object} listing - The listing object to map.
 * @returns {Object} - The mapped listing object(that containes the images(in case of multiple images)) and user owner.
 */

const mapper = listing => {
  const baseUrl = config.get("assetsBaseUrl");

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
    Category: listing.Category,
    images: listing.Images.map(mapImage), // Map all images
    imageUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).url : null,
    thumbnailUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).thumbnailUrl : null,
    owner: listing.User,   
    latitude: listing.latitude,
    longitude: listing.longitude,
    status: listing.status,
    createdAt: listing.createdAt,
    Messages: listing.Messages ? listing.Messages.map(message => ({
      content: message.content,
      senderId: message.sender_id,
      receiverId: message.receiver_id
    })) : [],
    
  };
};

module.exports = mapper;