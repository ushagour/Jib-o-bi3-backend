// database.js
const { Sequelize } = require('sequelize');
const path = require('path');

const defaultStoragePath = process.env.NODE_ENV === 'test'
    ? path.join(__dirname, 'test.sqlite')
    : path.join(__dirname, 'development.sqlite');

const storagePath = process.env.DATABASE_PATH || defaultStoragePath;

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false
});

module.exports = sequelize;



