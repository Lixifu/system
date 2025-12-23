const request = require('supertest');
const app = require('../../../backend/app');
const { Organization } = require('../../../backend/models');

// 测试活动创建功能 - 组织不存在或未审核通过的情况
describe('活动创建功能测试 - 组织验证', () => {
    let adminToken;
    let organizerToken;
    let existingOrganizationId;
    let pendingOrganizationId;

    // 在所有测试前获取认证令牌和创建测试组织
    beforeAll(async () => {
        // 创建测试组织 - 已审核通过
        const existingOrganization = await Organization.create({
            name: '已审核组织',
            department: '测试部门',
            contact: '13800138000',
            address: '测试地址',
            description: '这是一个已审核通过的测试组织',
            status: 'approved'
        });
        existingOrganizationId = existingOrganization.id;

        // 创建测试组织 - 未审核通过
        const pendingOrganization = await Organization.create({
            name: '未审核组织',
            department: '测试部门',
            contact: '13800138001',
            address: '测试地址',
            description: '这是一个未审核通过的测试组织',
            status: 'pending'
        });
        pendingOrganizationId = pendingOrganization.id;

        // 注册管理员用户
        const adminRegisterResponse = await request(app)
            .post('/api/auth/register')
            .send({
                name: '测试管理员',
                email: 'test-admin@example.com',
                phone: '13800138002',
                password: 'password123',
                role: 'admin'
            });
        console.log('管理员注册响应:', adminRegisterResponse.statusCode, adminRegisterResponse.body);
        
        // 登录管理员用户
        const adminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test-admin@example.com',
                password: 'password123'
            });
        console.log('管理员登录响应:', adminLoginResponse.statusCode, adminLoginResponse.body);
        adminToken = adminLoginResponse.body.data?.token;

        // 注册组织者用户
        const organizerRegisterResponse = await request(app)
            .post('/api/auth/register')
            .send({
                name: '测试组织者',
                email: 'test-organizer@example.com',
                phone: '13800138003',
                password: 'password123',
                role: 'organizer'
            });
        console.log('组织者注册响应:', organizerRegisterResponse.statusCode, organizerRegisterResponse.body);
        
        // 登录组织者用户
        const organizerLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test-organizer@example.com',
                password: 'password123'
            });
        console.log('组织者登录响应:', organizerLoginResponse.statusCode, organizerLoginResponse.body);
        organizerToken = organizerLoginResponse.body.data?.token;
    });

    // 在所有测试后清理测试数据
    afterAll(async () => {
        // 删除测试组织
        await Organization.destroy({
            where: {
                id: [existingOrganizationId, pendingOrganizationId]
            }
        });
    });

    // 测试1：使用不存在的组织ID创建活动
    test('使用不存在的组织ID创建活动，返回具体错误信息', async () => {
        const activityData = {
            title: '测试活动',
            description: '这是一个测试活动',
            type: 'one-time',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 10,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: 999999 // 不存在的组织ID
        };

        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(activityData);

        console.log('使用不存在的组织ID创建活动响应:', response.statusCode, response.body);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('创建活动失败：指定的组织不存在');
        expect(response.body.status).toBe('error');
    });

    // 测试2：使用未审核通过的组织ID创建活动
    test('使用未审核通过的组织ID创建活动，返回具体错误信息', async () => {
        const activityData = {
            title: '测试活动',
            description: '这是一个测试活动',
            type: 'one-time',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 10,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: pendingOrganizationId // 未审核通过的组织ID
        };

        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(activityData);

        console.log('使用未审核通过的组织ID创建活动响应:', response.statusCode, response.body);

        expect(response.statusCode).toBe(400);
        expect(response.body.message).toBe('创建活动失败：指定的组织未审核通过');
        expect(response.body.status).toBe('error');
    });

    // 测试3：使用已审核通过的组织ID创建活动
    test('使用已审核通过的组织ID创建活动，创建成功', async () => {
        const activityData = {
            title: '测试活动',
            description: '这是一个测试活动',
            type: 'one-time',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 10,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: existingOrganizationId // 已审核通过的组织ID
        };

        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(activityData);

        console.log('使用已审核通过的组织ID创建活动响应:', response.statusCode, response.body);

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('活动创建成功');
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('id');
    });

    // 测试4：组织者使用已审核通过的组织ID创建活动
    test('组织者使用已审核通过的组织ID创建活动，创建成功', async () => {
        const activityData = {
            title: '组织者测试活动',
            description: '这是一个组织者测试活动',
            type: 'short-term',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 15,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: existingOrganizationId // 已审核通过的组织ID
        };

        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${organizerToken}`)
            .send(activityData);

        console.log('组织者使用已审核通过的组织ID创建活动响应:', response.statusCode, response.body);

        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('活动创建成功');
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('id');
    });
});
