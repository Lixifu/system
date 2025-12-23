// 数据库表结构同步脚本
const sequelize = require('./backend/config/db');
const ActivityParticipant = require('./backend/models/ActivityParticipant');
const User = require('./backend/models/User');
const Activity = require('./backend/models/Activity');

async function syncDatabase() {
    try {
        console.log('开始同步数据库表结构...');
        
        // 只同步ActivityParticipant模型，添加缺失的列
        // 使用alter: true选项，这样会修改现有表结构而不删除数据
        await ActivityParticipant.sync({ alter: true });
        
        console.log('数据库表结构同步成功！');
        process.exit(0);
    } catch (error) {
        console.error('数据库表结构同步失败:', error);
        process.exit(1);
    }
}

syncDatabase();
