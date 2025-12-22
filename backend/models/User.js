// 用户模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// 定义用户模型
const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '姓名'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: '手机号'
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: '邮箱'
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '密码'
    },
    role: {
        type: DataTypes.ENUM('volunteer', 'organizer', 'admin'),
        defaultValue: 'volunteer',
        comment: '角色'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        defaultValue: 'other',
        comment: '性别'
    },
    age: {
        type: DataTypes.INTEGER,
        comment: '年龄'
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'organization_id',
        comment: '所属组织ID'
    },
    volunteerHours: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        field: 'volunteer_hours',
        comment: '志愿时长'
    },
    avatar: {
        type: DataTypes.STRING(255),
        comment: '用户头像URL'
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加索引，提高查询性能
    indexes: [
        // 用于快速查询特定角色的用户
        { fields: ['role'] },
        // 用于快速查询特定组织的用户
        { fields: ['organization_id'] },
        // 用于快速按姓名搜索用户
        { fields: ['name'] }
    ]
});

// 密码加密钩子
User.beforeSave(async (user) => {
    if (user.changed('password')) {
        const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
        user.password = await bcrypt.hash(user.password, salt);
    }
});

// 密码比较方法
User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;