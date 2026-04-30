// database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/development.sqlite', // SQLite database file
    logging: false // Enable logging for debugging
});

module.exports = sequelize;



