// 数据库迁移脚本：将现有活动状态设为"审核已通过"
const sequelize = require('./backend/config/db');
const Activity = require('./backend/models/Activity');

async function migrateActivityStatus() {
    try {
        console.log('开始执行活动状态迁移...');
        
        // 连接数据库
        await sequelize.authenticate();
        console.log('数据库连接成功');
        
        // 查询所有活动
        const activities = await Activity.findAll();
        console.log(`找到 ${activities.length} 个活动`);
        
        // 更新活动状态：将所有draft状态的活动更新为recruiting
        // 其他状态保持不变，因为它们已经是审核通过的状态
        const updatedCount = await Activity.update(
            { status: 'recruiting' },
            { where: { status: 'draft' } }
        );
        
        console.log(`成功更新 ${updatedCount[0]} 个活动状态为"招募中"（审核已通过）`);
        
        // 验证更新结果
        const draftCount = await Activity.count({ where: { status: 'draft' } });
        console.log(`迁移后剩余 ${draftCount} 个草稿状态的活动`);
        
        console.log('活动状态迁移完成！');
        
        // 关闭数据库连接
        await sequelize.close();
        
    } catch (error) {
        console.error('活动状态迁移失败：', error.message);
        process.exit(1);
    }
}

// 执行迁移
migrateActivityStatus();
