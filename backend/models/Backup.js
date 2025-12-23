const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义备份模型
const Backup = sequelize.define('Backup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  size: {
    type: DataTypes.BIGINT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('completed', 'failed', 'in_progress'),
    defaultValue: 'completed'
  },
  type: {
    type: DataTypes.ENUM('full', 'partial'),
    defaultValue: 'full'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'backups',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Backup;
