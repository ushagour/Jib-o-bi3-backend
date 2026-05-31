const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Backup = sequelize.define('Backup', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  backup_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backup_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backup_size: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  backup_format: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'sqlite',
  },
  image_path: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  uploaded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Backup;