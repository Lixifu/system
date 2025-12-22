// 组织模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义组织模型
const Organization = sequelize.define('Organization', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '组织名称'
    },
    department: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '隶属部门'
    },
    contact: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '联系方式'
    },
    address: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '线下地点'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '组织描述'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        comment: '组织状态'
    },
    logo: {
        type: DataTypes.STRING(255),
        comment: '组织logo URL'
    },
    images: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: '组织图片URL列表'
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
    tableName: 'organizations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Organization;