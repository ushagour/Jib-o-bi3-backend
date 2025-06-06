// database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database/development.sqlite', // SQLite database file
    logging: false, // Disable logging for cleaner output
});

module.exports = sequelize;



