const config = require("config");

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
    price: `$${listing.price}`,
    imageUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).url : null,
    thumbnailUrl: listing.Images.length > 0 ? mapImage(listing.Images[0]).thumbnailUrl : null,
    ownerName: listing.User ? listing.User.name : null, // Use the owner's name if available} : null,
    latitude: listing.latitude,
    longitude: listing.longitude,
    status: listing.status,
    createdAt: listing.createdAt,
  };
};

module.exports = mapper;