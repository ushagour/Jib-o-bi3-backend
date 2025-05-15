const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const Reviews = sequelize.define('Reviews', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id',
        },
    },
    listing_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Listing',
          key: 'listing_id',
        },
      },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    comment: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
});

module.exports = Reviews;

