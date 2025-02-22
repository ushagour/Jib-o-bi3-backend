const { DataTypes } = require('sequelize');
const sequelize = require('../database'); // Import Sequelize instance

const Category = sequelize.define('Category', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },      
    icon: {
        type: DataTypes.STRING,
        allowNull: false,
    },

});

module.exports = Category;