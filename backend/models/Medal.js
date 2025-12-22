// 勋章模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义勋章模型
const Medal = sequelize.define('Medal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '勋章名称'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '勋章描述'
    },
    image: {
        type: DataTypes.STRING(255),
        comment: '勋章图片URL'
    },
    condition: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '获得条件'
    },
    category: {
        type: DataTypes.STRING(50),
        comment: '勋章分类'
    },
    createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'medals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Medal;