const request = require('supertest');
const app = require('../../../backend/app');
const { Activity, Organization } = require('../../../backend/models');

// 测试活动创建功能 - 通知发送失败的情况
describe('活动创建功能测试 - 通知发送失败', () => {
    let adminToken;
    let organizerToken;
    let existingOrganizationId;

    // 在所有测试前获取认证令牌和创建测试组织
    beforeAll(async () => {
        // 创建测试组织 - 已审核通过
        const existingOrganization = await Organization.create({
            name: '测试组织',
            department: '测试部门',
            contact: '13800138000',
            address: '测试地址',
            description: '这是一个测试组织',
            status: 'approved'
        });
        existingOrganizationId = existingOrganization.id;

        // 注册并登录管理员用户
        await request(app)
            .post('/api/auth/register')
            .send({
                name: '测试管理员',
                email: 'test-admin@example.com',
                phone: '13800138002',
                password: 'password123',
                role: 'admin'
            });
        
        const adminLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test-admin@example.com',
                password: 'password123'
            });
        adminToken = adminLoginResponse.body.data?.token;

        // 注册并登录组织者用户
        await request(app)
            .post('/api/auth/register')
            .send({
                name: '测试组织者',
                email: 'test-organizer@example.com',
                phone: '13800138003',
                password: 'password123',
                role: 'organizer'
            });
        
        const organizerLoginResponse = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'test-organizer@example.com',
                password: 'password123'
            });
        organizerToken = organizerLoginResponse.body.data?.token;
    });

    // 在所有测试后清理测试数据
    afterAll(async () => {
        // 删除测试活动
        await Activity.destroy({
            where: {
                title: ['测试活动 - 通知发送失败', '测试活动 - 通知发送成功']
            }
        });
    });

    // 测试1：组织者创建活动，通知发送失败（模拟不存在的管理员ID）
    test('组织者创建活动，通知发送失败，活动仍然创建成功', async () => {
        // 活动创建前的活动数量
        const beforeCount = await Activity.count();

        const activityData = {
            title: '测试活动 - 通知发送失败',
            description: '这是一个测试活动，用于测试通知发送失败的情况',
            type: 'one-time',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 10,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: existingOrganizationId
        };

        // 组织者创建活动，此时会尝试发送通知给管理员ID=1（可能不存在）
        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${organizerToken}`)
            .send(activityData);

        console.log('组织者创建活动响应:', response.statusCode, response.body);

        // 验证API返回成功响应
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('活动创建成功');
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('id');

        // 验证活动确实存在于数据库中
        const afterCount = await Activity.count();
        expect(afterCount).toBe(beforeCount + 1);

        // 验证活动数据正确
        const createdActivity = await Activity.findByPk(response.body.data.id);
        expect(createdActivity).not.toBeNull();
        expect(createdActivity.title).toBe(activityData.title);
        expect(createdActivity.description).toBe(activityData.description);
        expect(createdActivity.type).toBe(activityData.type);
    });

    // 测试2：管理员创建活动，不需要发送通知，创建成功
    test('管理员创建活动，不需要发送通知，创建成功', async () => {
        // 活动创建前的活动数量
        const beforeCount = await Activity.count();

        const activityData = {
            title: '测试活动 - 通知发送成功',
            description: '这是一个测试活动，管理员创建，不需要发送通知',
            type: 'one-time',
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(), // 1小时后
            location: '测试地点',
            quota: 10,
            requirements: '无特殊要求',
            status: 'draft',
            organizationId: existingOrganizationId
        };

        // 管理员创建活动，此时不会尝试发送通知
        const response = await request(app)
            .post('/api/activities')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(activityData);

        console.log('管理员创建活动响应:', response.statusCode, response.body);

        // 验证API返回成功响应
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('活动创建成功');
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('id');

        // 验证活动确实存在于数据库中
        const afterCount = await Activity.count();
        expect(afterCount).toBe(beforeCount + 1);

        // 验证活动数据正确
        const createdActivity = await Activity.findByPk(response.body.data.id);
        expect(createdActivity).not.toBeNull();
        expect(createdActivity.title).toBe(activityData.title);
        expect(createdActivity.description).toBe(activityData.description);
        expect(createdActivity.type).toBe(activityData.type);
    });
});
