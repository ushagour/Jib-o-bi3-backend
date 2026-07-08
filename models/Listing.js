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
    ai_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
            min: 0,
            max: 100,
        },
        comment: 'AI quality/ranking score (0-100)',
    },
    ai_score_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of last AI score update',
    },
    fraudScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        validate: {
            min: 0,
            max: 100,
        },
        comment: 'Fraud/risk detection score (0-100)',
    },
    flagged: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Flagged for content violations or fraud',
    },
    flagReason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reason for flagging (JSON with violations)',
    },
    moderationStatus: {
        type: DataTypes.ENUM('approved', 'flagged', 'blocked'),
        defaultValue: 'approved',
        comment: 'Content moderation status',
    },
closed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  archived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  archived_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
});

module.exports = Listing;