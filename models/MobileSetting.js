const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const MobileSetting = sequelize.define('MobileSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  subtitle: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  value_type: {
    type: DataTypes.ENUM('text', 'number', 'boolean', 'json', 'image'),
    allowNull: false,
    defaultValue: 'text',
  },
  image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  feature_enabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  group_name: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = MobileSetting;