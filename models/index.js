// models/index.js
const sequelize = require('../database/database'); // Import Sequelize instance
const User = require('./User');
const Category = require('./Category');
const Listing = require('./Listing');
const Image = require('./Image');
const Favorites = require('./Favorites');
const Reviews = require('./Reviews');
const Orders = require('./Orders');
const Notification = require('./Notification');
const Message = require('./Message');
const AdminActivity = require('./AdminActivity');
const MobileSetting = require('./MobileSetting');
const { registerActivityHooks } = require('../utilities/activityLogger');

// Define relationships
User.hasMany(Listing, { foreignKey: 'user_id' });
Listing.belongsTo(User, { foreignKey: 'user_id' });

Category.hasMany(Listing, { foreignKey: 'category_id' });
Listing.belongsTo(Category, { foreignKey: 'category_id' });

Listing.hasMany(Image, { foreignKey: 'listing_id' });
Image.belongsTo(Listing, { foreignKey: 'listing_id' });

Listing.hasMany(Favorites, { foreignKey: 'listing_id' });
Favorites.belongsTo(Listing, { foreignKey: 'listing_id' });
User.hasMany(Favorites, { foreignKey: 'user_id' });
Favorites.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Notification, { foreignKey: 'actor_id', as: 'triggeredNotifications' });
Notification.belongsTo(User, { foreignKey: 'actor_id', as: 'actor' });

Listing.hasMany(Notification, { foreignKey: 'listing_id' });
Notification.belongsTo(Listing, { foreignKey: 'listing_id' });

User.hasMany(Message, { foreignKey: 'sender_id', as: 'sentMessages' });
Message.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });

User.hasMany(Message, { foreignKey: 'recipient_id', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'recipient_id', as: 'recipient' });

Listing.hasMany(Message, { foreignKey: 'listing_id' });
Message.belongsTo(Listing, { foreignKey: 'listing_id' });




//reviews relations 

User.hasMany(Reviews, { foreignKey: 'user_id' });
Reviews.belongsTo(User, { foreignKey: 'user_id' });


Listing.hasMany(Reviews, { foreignKey: 'listing_id' });
Reviews.belongsTo(Listing, { foreignKey: 'listing_id' });

// Order relations
Orders.belongsTo(Listing, { foreignKey: 'listing_id' });
Listing.hasMany(Orders, { foreignKey: 'listing_id' });

Orders.belongsTo(User, { foreignKey: 'buyer_id' });
User.hasMany(Orders, { foreignKey: 'buyer_id' });

registerActivityHooks(User, 'user', AdminActivity);
registerActivityHooks(Listing, 'listing', AdminActivity);
registerActivityHooks(Reviews, 'review', AdminActivity);

// Export models and Sequelize instance
module.exports = {
  sequelize,
  User,
  Category,
  Listing,
  Image,
  Favorites,
  Reviews,
  Notification,
  Message,
  Orders,
  AdminActivity,
  MobileSetting,
};