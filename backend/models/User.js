const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const config = require('../config/config');

// 用户模型架构
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['volunteer', 'organizer', 'admin'],
        default: 'volunteer'
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other'
    },
    age: {
        type: Number,
        min: 12,
        max: 100
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    volunteerHours: {
        type: Number,
        default: 0
    },
    activities: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Activity'
    }],
    trainings: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Training'
    }],
    certificates: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Certificate'
    }],
    medals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medal'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// 密码加密中间件
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// 密码比较方法
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// 更新时间中间件
userSchema.pre('updateOne', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// 创建用户模型
const User = mongoose.model('User', userSchema);

module.exports = User;