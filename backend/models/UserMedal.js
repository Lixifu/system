// 用户勋章关联模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义用户勋章模型
const UserMedal = sequelize.define('UserMedal', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        comment: '用户ID'
    },
    medalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'medal_id',
        comment: '勋章ID'
    },
    obtainedAt: {
        type: DataTypes.DATE,
        field: 'obtained_at',
        defaultValue: DataTypes.NOW,
        comment: '获得时间'
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
    tableName: 'user_medals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = UserMedal;