// models/index.js
const sequelize = require('../database'); // Import Sequelize instance
const User = require('./User');
const Category = require('./Category');
const Listing = require('./Listing');
const Image = require('./Image');


// Define relationships
User.hasMany(Listing, { foreignKey: 'user_id' });
Listing.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Listing, { foreignKey: 'category_id' });
Listing.belongsTo(Category, { foreignKey: 'category_id' });

Listing.hasMany(Image, { foreignKey: 'listing_id' }); // Use 'as: images'
Image.belongsTo(Listing, { foreignKey: 'listing_id' });

// Export models and Sequelize instance
module.exports = {
    sequelize,
    User,
    Category,
    Listing,
    Image,
};