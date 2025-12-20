const mongoose = require('mongoose');

// 组织模型架构
const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    department: {
        type: String,
        required: true,
        trim: true
    },
    contact: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
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
organizationSchema.pre('updateOne', function(next) {
    this.set({ updatedAt: Date.now() });
    next();
});

// 创建组织模型
const Organization = mongoose.model('Organization', organizationSchema);

module.exports = Organization;