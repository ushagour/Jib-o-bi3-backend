// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        avatar: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'banned'),
            defaultValue: 'active',
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        expoPushToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },role: {
            type: DataTypes.ENUM('admin','Customer'),
            defaultValue: 'Customer',
        },
     
    });



module.exports = User;