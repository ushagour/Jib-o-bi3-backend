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


User.hasMany(Messages, { foreignKey: 'sender_id' });
//in this case both sender and receiver are users
Messages.belongsTo(User, { foreignKey: 'sender_id' }); 
Messages.belongsTo(User, { foreignKey: 'receiver_id' }); 


Category.hasMany(Listing, { foreignKey: 'category_id' });
Listing.belongsTo(Category, { foreignKey: 'category_id' });

Listing.hasMany(Image, { foreignKey: 'listing_id' }); // Use 'as: images'
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