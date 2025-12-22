// 技能标签模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义技能标签模型
const Skill = sequelize.define('Skill', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: '技能名称'
    },
    description: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: '技能描述'
    },
    category: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '技能分类'
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
    tableName: 'skills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Skill;