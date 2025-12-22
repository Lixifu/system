// 活动培训关联模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义活动培训关联模型
const ActivityTraining = sequelize.define('ActivityTraining', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    activityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'activity_id',
        comment: '活动ID'
    },
    trainingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'training_id',
        comment: '培训ID'
    },
    isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_required',
        comment: '是否为必填培训'
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
    tableName: 'activity_trainings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = ActivityTraining;