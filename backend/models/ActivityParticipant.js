// 活动参与者关联模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义活动参与者模型
const ActivityParticipant = sequelize.define('ActivityParticipant', {
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
        onDelete: 'RESTRICT',
        comment: '用户ID'
    },
    activityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'activity_id',
        references: {
            model: 'activities',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '活动ID'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        comment: '报名状态'
    },
    signInTime: {
        type: DataTypes.DATE,
        field: 'sign_in_time',
        comment: '签到时间'
    },
    signOutTime: {
        type: DataTypes.DATE,
        field: 'sign_out_time',
        comment: '签退时间'
    },
    duration: {
        type: DataTypes.FLOAT,
        comment: '服务时长（小时）'
    },
    confirmed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '服务记录是否已确认'
    },
    rating: {
        type: DataTypes.INTEGER,
        min: 1,
        max: 5,
        comment: '评价评分（1-5分）'
    },
    comment: {
        type: DataTypes.TEXT,
        comment: '评价内容'
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
    tableName: 'activity_participants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加索引，提高查询性能
    indexes: [
        // 复合索引，用于快速查询特定活动的参与者
        { fields: ['activity_id'] },
        // 复合索引，用于快速查询特定用户的活动报名记录
        { fields: ['user_id'] },
        // 复合索引，用于快速查询特定活动的特定状态的参与者
        { fields: ['activity_id', 'status'] },
        // 复合索引，用于快速查询特定活动的报名时间排序
        { fields: ['activity_id', 'created_at'] },
        // 唯一索引，防止重复报名
        { fields: ['activity_id', 'user_id'], unique: true }
    ]
});

module.exports = ActivityParticipant;