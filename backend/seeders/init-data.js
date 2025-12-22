const { Activity, Training, User, Organization } = require('../models');
const sequelize = require('../config/db');

// 初始化数据
async function initData() {
    try {
        console.log('开始初始化数据...');
        
        // 创建组织
        const organization = await Organization.findOrCreate({
            where: { name: '阳光志愿者协会' },
            defaults: {
                department: '民政部门',
                contact: '0754-88888888',
                address: '汕头市金平区中山路123号',
                description: '阳光志愿者协会是一个致力于为社区提供志愿服务的非营利组织，成立于2020年，现有志愿者1000余人。',
                status: 'approved'
            }
        });
        
        // 创建测试用户 - 保留原有测试账号
        const user = await User.findOrCreate({
            where: { email: 'test@example.com' },
            defaults: {
                name: '测试用户',
                phone: '13812345678',
                password: '123456', // 会自动加密
                role: 'volunteer',
                organizationId: organization[0].id
            }
        });
        
        // 创建组织方用户
        const organizer = await User.findOrCreate({
            where: { email: 'organizer@example.com' },
            defaults: {
                name: '组织方测试用户',
                phone: '13800000002',
                password: '123456', // 会自动加密
                role: 'organizer',
                organizationId: organization[0].id
            }
        });
        
        // 创建志愿者用户
        const volunteer = await User.findOrCreate({
            where: { email: 'volunteer@example.com' },
            defaults: {
                name: '志愿者测试用户',
                phone: '13800000001',
                password: '123456', // 会自动加密
                role: 'volunteer',
                organizationId: organization[0].id
            }
        });
        
        // 创建管理员用户
        const admin = await User.findOrCreate({
            where: { email: 'admin@example.com' },
            defaults: {
                name: '管理员测试用户',
                phone: '13800000003',
                password: '123456', // 会自动加密
                role: 'admin',
                organizationId: organization[0].id
            }
        });
        
        // 创建活动
        await Activity.findOrCreate({
            where: { id: 1 },
            defaults: {
                title: '社区清洁活动',
                description: '我们将组织志愿者清理社区的公园和街道，为社区居民创造一个干净整洁的环境。',
                type: '环保',
                startTime: '2024-11-15 09:00:00',
                endTime: '2024-11-15 12:00:00',
                location: '阳光社区',
                quota: 50,
                registeredCount: 30,
                organizerId: organizer[0].id,
                organizationId: organization[0].id,
                status: 'recruiting',
                requirements: '身体健康，能吃苦耐劳'
            }
        });
        
        await Activity.findOrCreate({
            where: { id: 2 },
            defaults: {
                title: '老人陪伴活动',
                description: '我们将组织志愿者前往养老院，陪伴老人聊天、下棋、表演节目等，让老人感受到社会的关爱。',
                type: '助老',
                startTime: '2024-11-16 14:00:00',
                endTime: '2024-11-16 17:00:00',
                location: '幸福养老院',
                quota: 20,
                registeredCount: 15,
                organizerId: organizer[0].id,
                organizationId: organization[0].id,
                status: 'recruiting',
                requirements: '有爱心，耐心，善于沟通'
            }
        });
        
        await Activity.findOrCreate({
            where: { id: 3 },
            defaults: {
                title: '儿童安全教育',
                description: '我们将组织志愿者前往希望小学，为孩子们讲解交通安全、防溺水、防火等安全知识，提高孩子们的安全意识。',
                type: '教育',
                startTime: '2024-11-17 10:00:00',
                endTime: '2024-11-17 12:00:00',
                location: '希望小学',
                quota: 30,
                registeredCount: 25,
                organizerId: organizer[0].id,
                organizationId: organization[0].id,
                status: 'recruiting',
                requirements: '有教育背景，善于与孩子沟通'
            }
        });
        
        // 创建培训
        await Training.findOrCreate({
            where: { id: 1 },
            defaults: {
                title: '志愿者通用培训',
                description: '本培训将介绍志愿者的基本概念、服务礼仪、沟通技巧等，帮助志愿者更好地开展志愿服务。',
                type: 'general',
                startTime: '2024-11-20 09:00:00',
                endTime: '2024-11-20 11:00:00',
                location: '志愿者培训中心',
                quota: 100,
                registeredCount: 80,
                teacher: '张老师',
                organizerId: organizer[0].id,
                organizationId: organization[0].id,
                status: 'recruiting'
            }
        });
        
        await Training.findOrCreate({
            where: { id: 2 },
            defaults: {
                title: '急救知识培训',
                description: '本培训将介绍基本的急救知识和技能，包括心肺复苏、止血、骨折固定等，提高志愿者的应急处理能力。',
                type: 'specialized',
                startTime: '2024-11-22 14:00:00',
                endTime: '2024-11-22 17:00:00',
                location: '急救中心',
                quota: 50,
                registeredCount: 40,
                teacher: '李医生',
                organizerId: organizer[0].id,
                organizationId: organization[0].id,
                status: 'recruiting'
            }
        });
        
        console.log('数据初始化完成！');
    } catch (error) {
        console.error('初始化数据失败:', error);
    } finally {
        sequelize.close();
    }
}

// 执行初始化
initData();
