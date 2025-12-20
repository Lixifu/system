const express = require('express');
const router = express.Router();

// 模拟数据
const mockData = {
    users: [
        {
            _id: '1',
            name: '张三',
            phone: '13800138000',
            email: 'zhangsan@example.com',
            password: '$2b$10$7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z',
            role: 'volunteer',
            gender: 'male',
            age: 20,
            organization: null,
            volunteerHours: 120,
            activities: ['1', '2'],
            trainings: ['1'],
            certificates: [],
            medals: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            _id: '2',
            name: '李四',
            phone: '13900139000',
            email: 'lisi@example.com',
            password: '$2b$10$7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z7Z7z',
            role: 'organizer',
            gender: 'female',
            age: 25,
            organization: '1',
            volunteerHours: 0,
            activities: [],
            trainings: [],
            certificates: [],
            medals: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ],
    activities: [
        {
            _id: '1',
            title: '社区清洁活动',
            description: '我们将组织志愿者清理社区的公园和街道，为社区居民创造一个干净整洁的环境。',
            type: '环保',
            startTime: new Date('2024-11-15T09:00:00'),
            endTime: new Date('2024-11-15T12:00:00'),
            location: '阳光社区',
            quota: 50,
            registeredCount: 30,
            organizer: '2',
            organization: '1',
            status: 'recruiting',
            qrCode: 'qrcode1',
            participants: ['1'],
            requirements: '身体健康，能吃苦耐劳',
            images: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            _id: '2',
            title: '老人陪伴活动',
            description: '陪伴养老院的老人，与他们聊天、下棋，给他们带去温暖和快乐。',
            type: '关爱',
            startTime: new Date('2024-11-16T14:00:00'),
            endTime: new Date('2024-11-16T16:00:00'),
            location: '幸福养老院',
            quota: 20,
            registeredCount: 15,
            organizer: '2',
            organization: '1',
            status: 'recruiting',
            qrCode: 'qrcode2',
            participants: ['1'],
            requirements: '有耐心，善于沟通',
            images: [],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            _id: '3',
            title: '儿童安全教育',
            description: '为小学生讲解安全知识，提高他们的安全意识和自我保护能力。',
            type: '教育',
            startTime: new Date('2024-11-17T10:00:00'),
            endTime: new Date('2024-11-17T12:00:00'),
            location: '希望小学',
            quota: 30,
            registeredCount: 25,
            organizer: '2',
            organization: '1',
            status: 'recruiting',
            qrCode: 'qrcode3',
            participants: [],
            requirements: '有教育经验者优先',
            images: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ],
    trainings: [
        {
            _id: '1',
            title: '志愿者通用培训',
            description: '介绍志愿者的基本职责和服务规范，提高志愿者的服务意识和服务能力。',
            type: 'general',
            startTime: new Date('2024-11-20T09:00:00'),
            endTime: new Date('2024-11-20T11:00:00'),
            location: '线上',
            quota: 100,
            registeredCount: 80,
            teacher: '张老师',
            organizer: '2',
            organization: '1',
            status: 'recruiting',
            participants: ['1'],
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            _id: '2',
            title: '急救知识培训',
            description: '讲解基本的急救知识和技能，包括心肺复苏、止血、包扎等。',
            type: 'specialized',
            startTime: new Date('2024-11-22T14:00:00'),
            endTime: new Date('2024-11-22T17:00:00'),
            location: '线下培训室',
            quota: 50,
            registeredCount: 40,
            teacher: '李医生',
            organizer: '2',
            organization: '1',
            status: 'recruiting',
            participants: [],
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ],
    organizations: [
        {
            _id: '1',
            name: '阳光志愿者协会',
            department: '民政部门',
            contact: '0754-88888888',
            address: '汕头市金平区',
            description: '致力于社会公益事业的志愿者组织',
            status: 'approved',
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ]
};

// 模拟数据路由

// 获取用户列表
router.get('/users', (req, res) => {
    res.json(mockData.users);
});

// 获取活动列表
router.get('/activities', (req, res) => {
    res.json(mockData.activities);
});

// 获取培训列表
router.get('/trainings', (req, res) => {
    res.json(mockData.trainings);
});

// 获取组织列表
router.get('/organizations', (req, res) => {
    res.json(mockData.organizations);
});

module.exports = router;