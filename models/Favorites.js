const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const Favorites = sequelize.define('Favorites', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    listing_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Listing',
          key: 'listing_id',
        },
      },
});

module.exports = Favorites;
