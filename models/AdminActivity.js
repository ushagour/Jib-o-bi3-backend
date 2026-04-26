const { DataTypes } = require("sequelize");
const sequelize = require("../database/database");

const AdminActivity = sequelize.define("AdminActivity", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  entity: {
    type: DataTypes.ENUM("user", "listing", "review"),
    allowNull: false,
  },
  action: {
    type: DataTypes.ENUM("create", "update", "delete"),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
  },
});

module.exports = AdminActivity;