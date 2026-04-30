const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const Listing = sequelize.define('Listing', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    price: {
        type: DataTypes.FLOAT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('Selled', 'still available'),
        allowNull: false,
        defaultValue: 'still available',
    },
    latitude: {
        type: DataTypes.FLOAT, // For location
    },
    longitude: {
        type: DataTypes.FLOAT, // For location
    },
    carSize: {
        type: DataTypes.STRING,
        allowNull: true, // Optional car field
    },
    carColor: {
        type: DataTypes.STRING,
        allowNull: true, // Optional car field
    },
    carModel: {
        type: DataTypes.STRING,
        allowNull: true, // Optional car field
    },
    carYear: {
        type: DataTypes.INTEGER,
        allowNull: true, // Optional car field
    },
});

module.exports = Listing;