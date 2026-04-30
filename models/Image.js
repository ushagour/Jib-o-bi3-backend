const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const Image = sequelize.define('Image', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    listing_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Listings',
          key: 'id',
        },
      },
    file_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

});

module.exports = Image;