// models/index.js
const sequelize = require('../database'); // Import Sequelize instance
const User = require('./User');
const Category = require('./Category');
const Listing = require('./Listing');
const Image = require('./Image');
const Favorites = require('./Favorites');
const Reviews = require('./Reviews');
const Messages = require('./Messages');

// Define relationships
User.hasMany(Listing, { foreignKey: 'user_id' });
Listing.belongsTo(User, { foreignKey: 'user_id' });
/*
When querying the Messages model,
 use the reciver and sender as aliases to include the sender and receiver objects.
*/



User.hasMany(Messages, { foreignKey: 'sender_id', as: 'sentMessages' });
User.hasMany(Messages, { foreignKey: 'receiver_id', as: 'receivedMessages' });

Messages.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Messages.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

Category.hasMany(Listing, { foreignKey: 'category_id' });
Listing.belongsTo(Category, { foreignKey: 'category_id' });

Listing.hasMany(Image, { foreignKey: 'listing_id' });
Image.belongsTo(Listing, { foreignKey: 'listing_id' });

Listing.hasMany(Favorites, { foreignKey: 'listing_id' });
Favorites.belongsTo(Listing, { foreignKey: 'listing_id' });

Listing.hasMany(Reviews, { foreignKey: 'listing_id' });
Reviews.belongsTo(Listing, { foreignKey: 'listing_id' });

Listing.hasMany(Messages, { foreignKey: 'listing_id' });
Messages.belongsTo(Listing, { foreignKey: 'listing_id' });

// Export models and Sequelize instance
module.exports = {
  sequelize,
  User,
  Category,
  Listing,
  Image,
  Favorites,
  Reviews,
  Messages
};