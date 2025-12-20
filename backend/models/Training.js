const mongoose = require('mongoose');

// 培训课程模型架构
const trainingSchema = new mongoose.Schema({
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
        enum: ['general', 'specialized'],
        required: true
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
    teacher: {
        type: String,
        required: true,
        trim: true
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
    participants: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
trainingSchema.pre('updateOne', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// 创建培训课程模型
const Training = mongoose.model('Training', trainingSchema);

module.exports = Training;