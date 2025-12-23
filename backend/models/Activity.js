// 活动模型 - Sequelize
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// 定义活动模型
const Activity = sequelize.define('Activity', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: '活动标题'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: '活动描述'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: '活动类型'
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
        comment: '活动地点'
    },
    quota: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '招募人数'
    },
    // 已报名人数不再直接存储，而是通过统计ActivityParticipant表动态计算
    // // 已报名人数不再直接存储，而是通过统计ActivityParticipant表动态计算
    // registeredCount: {
    //     type: DataTypes.INTEGER,
    //     defaultValue: 0,
    //     field: 'registered_count',
    //     comment: '已报名人数'
    // },
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
        comment: '活动状态'
    },
    qrCode: {
        type: DataTypes.TEXT,
        field: 'qr_code',
        comment: '签到二维码'
    },
    signOutQrCode: {
        type: DataTypes.TEXT,
        field: 'sign_out_qr_code',
        comment: '签退二维码'
    },
    requirements: {
        type: DataTypes.TEXT,
        comment: '报名要求'
    },
    images: {
        type: DataTypes.JSON,
        defaultValue: [],
        comment: '活动图片URL列表'
    },
    isLongTerm: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_long_term',
        comment: '是否为长期项目'
    },
    recurrence: {
        type: DataTypes.STRING(50),
        field: 'recurrence',
        comment: '重复规则（如：weekly, monthly）'
    },
    summary: {
        type: DataTypes.TEXT,
        field: 'summary',
        comment: '活动总结'
    },
    parentActivityId: {
        type: DataTypes.INTEGER,
        field: 'parent_activity_id',
        references: {
            model: 'activities',
            key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: '父活动ID，用于关联长期项目'
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
    tableName: 'activities',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    // 添加索引，提高查询性能
    indexes: [
        // 用于快速查询特定组织者的活动
        { fields: ['organizer_id'] },
        // 用于快速查询特定组织的活动
        { fields: ['organization_id'] },
        // 用于快速查询特定状态的活动
        { fields: ['status'] }
    ]
});

// 添加countParticipants方法，用于动态计算已报名人数
Activity.prototype.countParticipants = async function(status = ['approved']) {
    try {
        // 数据验证：确保活动ID有效
        if (!this.id) {
            throw new Error('活动ID无效');
        }
        
        // 数据验证：确保status是数组
        if (!Array.isArray(status)) {
            status = [status];
        }
        
        // 引入ActivityParticipant模型
        const ActivityParticipant = require('./ActivityParticipant');
        
        // 统计符合条件的参与者数量
        const count = await ActivityParticipant.count({
            where: {
                activityId: this.id,
                status: status
            }
        });
        
        // 确保返回的是数字类型
        return parseInt(count, 10);
    } catch (error) {
        console.error(`计算活动ID ${this.id} 的参与者数量失败:`, error.message);
        // 返回默认值，确保系统正常运行
        return 0;
    }
};

// 添加静态方法，用于批量计算多个活动的已报名人数
Activity.calculateRegisteredCounts = async function(activities, status = ['approved']) {
    try {
        // 数据验证：确保activities是有效的数组
        if (!activities || (Array.isArray(activities) && activities.length === 0)) {
            return activities || [];
        }
        
        // 数据验证：确保status是数组
        if (!Array.isArray(status)) {
            status = [status];
        }
        
        // 确保activities是数组
        const activityArray = Array.isArray(activities) ? activities : [activities];
        
        // 引入ActivityParticipant模型
        const ActivityParticipant = require('./ActivityParticipant');
        
        // 使用Promise.all并行计算每个活动的参与者数量
        // 这种方式确保和countParticipants方法使用完全相同的逻辑
        const activitiesWithCounts = await Promise.all(
            activityArray.map(async (activity) => {
                // 确保活动对象有id属性
                if (!activity || !activity.id) {
                    const activityData = activity.toJSON ? activity.toJSON() : activity;
                    return {
                        ...activityData,
                        registeredCount: 0
                    };
                }
                
                // 统计符合条件的参与者数量
                const count = await ActivityParticipant.count({
                    where: {
                        activityId: activity.id,
                        status: status
                    }
                });
                
                // 确保返回的是数字类型
                const registeredCount = parseInt(count, 10);
                
                // 将计算结果添加到活动对象中
                const activityData = activity.toJSON ? activity.toJSON() : activity;
                return {
                    ...activityData,
                    registeredCount: registeredCount
                };
            })
        );
        
        return activitiesWithCounts;
    } catch (error) {
        console.error('批量计算活动参与者数量失败:', error.message);
        // 返回原始数据，确保系统正常运行
        return Array.isArray(activities) ? activities : [activities];
    }
};

module.exports = Activity;