// 用户技能关联模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义用户技能关联模型
const UserSkill = sequelize.define('UserSkill', {
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
        comment: '用户ID'
    },
    skillId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'skill_id',
        references: {
            model: 'skills',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: '技能ID'
    },
    proficiency: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        defaultValue: 'beginner',
        comment: '熟练度：beginner（初级）, intermediate（中级）, advanced（高级）, expert（专家）'
    },
    yearsOfExperience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'years_of_experience',
        comment: '经验年限'
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
    tableName: 'user_skills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'skill_id']
        }
    ]
});

module.exports = UserSkill;