const mongoose = require('mongoose');

// 活动模型架构
const activitySchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    quota: {
        type: Number,
        required: true,
        min: 1
    },
    registeredCount: {
        type: Number,
        default: 0
    },
    organizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    organization: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'recruiting', 'ongoing', 'completed', 'cancelled'],
        default: 'draft'
    },
    qrCode: {
        type: String
    },
    participants: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    requirements: {
        type: String,
        trim: true
    },
    images: [{
        type: String,
        trim: true
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

// 更新时间中间件
activitySchema.pre('updateOne', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// 创建活动模型
const Activity = mongoose.model('Activity', activitySchema);

module.exports = Activity;