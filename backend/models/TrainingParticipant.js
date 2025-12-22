// 培训参与者关联模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义培训参与者模型
const TrainingParticipant = sequelize.define('TrainingParticipant', {
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
    trainingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'training_id',
        references: {
            model: 'trainings',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: '培训ID'
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
        defaultValue: 'pending',
        comment: '报名状态'
    },
    attendance: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '是否出席'
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
    tableName: 'training_participants',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加索引，提高查询性能
    indexes: [
        // 复合索引，用于快速查询特定培训的参与者
        { fields: ['training_id'] },
        // 复合索引，用于快速查询特定用户的培训报名记录
        { fields: ['user_id'] },
        // 复合索引，用于快速查询特定培训的特定状态的参与者
        { fields: ['training_id', 'status'] },
        // 复合索引，用于快速查询特定培训的报名时间排序
        { fields: ['training_id', 'created_at'] },
        // 唯一索引，防止重复报名
        { fields: ['training_id', 'user_id'], unique: true }
    ]
});

module.exports = TrainingParticipant;