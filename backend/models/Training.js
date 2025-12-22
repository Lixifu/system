// 培训模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义培训模型
const Training = sequelize.define('Training', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '课程标题'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '课程描述'
    },
    type: {
        type: DataTypes.ENUM('general', 'specialized'),
        allowNull: false,
        comment: '课程类型'
    },
    startTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'start_time',
        comment: '开始时间'
    },
    endTime: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'end_time',
        comment: '结束时间'
    },
    location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: '上课地点'
    },
    quota: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '招募人数'
    },
    // 已报名人数不再直接存储，而是通过统计TrainingParticipant表动态计算
    // registeredCount: {
    //     type: DataTypes.INTEGER,
    //     defaultValue: 0,
    //     field: 'registered_count',
    //     comment: '已报名人数'
    // },
    teacher: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '讲师'
    },
    organizerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'organizer_id',
        comment: '组织者ID'
    },
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'organization_id',
        comment: '所属组织ID'
    },
    status: {
        type: DataTypes.ENUM('draft', 'recruiting', 'ongoing', 'completed', 'cancelled'),
        defaultValue: 'draft',
        comment: '课程状态'
    },
    images: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: '培训图片URL列表'
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
    tableName: 'trainings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加索引，提高查询性能
    indexes: [
        // 用于快速查询特定组织者的培训
        { fields: ['organizer_id'] },
        // 用于快速查询特定组织的培训
        { fields: ['organization_id'] },
        // 用于快速查询特定状态的培训
        { fields: ['status'] },
        // 用于快速查询特定类型的培训
        { fields: ['type'] },
        // 用于快速查询特定开始时间范围的培训
        { fields: ['start_time'] }
    ]
});

// 移除了直接存储registeredCount的逻辑，不再需要这个beforeSave钩子
// Training.beforeSave(async (training) => {
//     if (training.registeredCount > training.quota) {
//         training.registeredCount = training.quota;
//     }
//     if (training.registeredCount < 0) {
//         training.registeredCount = 0;
//     }
// });

// 移除了syncRegisteredCount方法，改为直接在需要时动态计算

// 添加countParticipants方法，用于动态计算已报名人数
Training.prototype.countParticipants = async function(status = ['approved', 'pending']) {
    // 引入TrainingParticipant模型
    const TrainingParticipant = require('./TrainingParticipant');
    
    // 统计符合条件的参与者数量
    const count = await TrainingParticipant.count({
        where: {
            trainingId: this.id,
            status: status
        }
    });
    
    return count;
};

// 添加静态方法，用于批量计算多个培训的已报名人数
Training.calculateRegisteredCounts = async function(trainings, status = ['approved', 'pending']) {
    if (!Array.isArray(trainings)) {
        trainings = [trainings];
    }
    
    // 引入TrainingParticipant模型
    const TrainingParticipant = require('./TrainingParticipant');
    
    // 使用Promise.all并行计算每个培训的参与者数量
    // 这种方式确保和countParticipants方法使用完全相同的逻辑
    const trainingsWithCounts = await Promise.all(
        trainings.map(async (training) => {
            // 确保培训对象有id属性
            if (!training || !training.id) {
                const trainingData = training.toJSON ? training.toJSON() : training;
                return {
                    ...trainingData,
                    registeredCount: 0
                };
            }
            
            // 统计符合条件的参与者数量
            const count = await TrainingParticipant.count({
                where: {
                    trainingId: training.id,
                    status: status
                }
            });
            
            // 确保返回的是数字类型
            const registeredCount = parseInt(count, 10);
            
            // 将计算结果添加到培训对象中
            const trainingData = training.toJSON ? training.toJSON() : training;
            return {
                ...trainingData,
                registeredCount: registeredCount
            };
        })
    );
    
    return trainingsWithCounts;
};

module.exports = Training;