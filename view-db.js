// 查看数据库结构和数据的脚本
const sequelize = require('./backend/config/db');
const { Activity, Training, User, Organization, ActivityParticipant, TrainingParticipant } = require('./backend/models');

async function viewDatabase() {
    try {
        console.log('连接数据库...');
        await sequelize.authenticate();
        console.log('数据库连接成功\n');

        // 查看数据库表
        console.log('=== 数据库表列表 ===');
        const tables = await sequelize.getQueryInterface().showAllTables();
        tables.forEach(table => console.log(`- ${table}`));
        console.log('');

        // 查看用户表数据
        console.log('=== 用户表数据 ===');
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'phone', 'role', 'organizationId', 'createdAt'],
            limit: 10
        });
        users.forEach(user => {
            console.log(`ID: ${user.id}, 姓名: ${user.name}, 邮箱: ${user.email}, 手机号: ${user.phone}, 角色: ${user.role}, 所属组织: ${user.organizationId}, 创建时间: ${user.createdAt}`);
        });
        console.log('');

        // 查看组织表数据
        console.log('=== 组织表数据 ===');
        const organizations = await Organization.findAll({
            attributes: ['id', 'name', 'department', 'contact', 'status'],
            limit: 10
        });
        organizations.forEach(organization => {
            console.log(`ID: ${organization.id}, 名称: ${organization.name}, 部门: ${organization.department}, 联系方式: ${organization.contact}, 状态: ${organization.status}`);
        });
        console.log('');

        // 查看活动表数据
        console.log('=== 活动表数据 ===');
        const activities = await Activity.findAll({
            attributes: ['id', 'title', 'type', 'startTime', 'location', 'quota', 'registeredCount', 'status'],
            limit: 10
        });
        activities.forEach(activity => {
            console.log(`ID: ${activity.id}, 标题: ${activity.title}, 类型: ${activity.type}, 时间: ${activity.startTime}, 地点: ${activity.location}, 名额: ${activity.quota}, 已报名: ${activity.registeredCount}, 状态: ${activity.status}`);
        });
        console.log('');

        // 查看培训表数据
        console.log('=== 培训表数据 ===');
        const trainings = await Training.findAll({
            attributes: ['id', 'title', 'type', 'startTime', 'location', 'quota', 'registeredCount', 'status'],
            limit: 10
        });
        trainings.forEach(training => {
            console.log(`ID: ${training.id}, 标题: ${training.title}, 类型: ${training.type}, 时间: ${training.startTime}, 地点: ${training.location}, 名额: ${training.quota}, 已报名: ${training.registeredCount}, 状态: ${training.status}`);
        });
        console.log('');

        console.log('数据库查询完成！');
        await sequelize.close();
    } catch (error) {
        console.error('数据库操作失败:', error);
        await sequelize.close();
    }
}

viewDatabase();