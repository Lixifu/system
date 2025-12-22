// 消息通知模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义消息通知模型
const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'user_id',
        references: {
            model: 'users',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '接收用户ID'
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '通知标题'
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '通知内容'
    },
    type: {
        type: DataTypes.ENUM('activity', 'training', 'system', 'organization'),
        defaultValue: 'system',
        comment: '通知类型：activity（活动相关）, training（培训相关）, system（系统通知）, organization（组织通知）'
    },
    relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'related_id',
        comment: '关联ID（如活动ID、培训ID）'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_read',
        comment: '是否已读'
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
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['user_id', 'is_read']
        },
        {
            fields: ['user_id', 'created_at']
        }
    ]
});

module.exports = Notification;