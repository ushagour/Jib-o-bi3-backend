const { DataTypes } = require('sequelize');
const sequelize = require('../database/database');

const Messages = sequelize.define('Messages', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'User',
          key: 'id',
        },
    },
    receiver_id: {
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
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
});

module.exports = Messages;
