
const { DataTypes } = require('sequelize');
const sequelize = require('../database/database'); // Import Sequelize instance

const Orders = sequelize.define('Orders', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    listing_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Listings', // Assuming you have a Listings model
            key: 'id',
        },
    },
    buyer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users', // Assuming you have a Users model
            key: 'id',
        },
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending', // Default status
        validate: {
            isIn: [['pending', 'completed', 'cancelled']],
        },
    },
    total_price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: true,
        },
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

module.exports = Orders;
