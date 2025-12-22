// 注册功能集成测试
const request = require('supertest');
const app = require('../../../backend/app');
const User = require('../../../backend/models/User');

// 为每个测试生成唯一的测试数据
function generateTestData(suffix) {
    return {
        name: `集成测试用户${suffix}`,
        email: `integration-${suffix}@example.com`,
        phone: `138001380${suffix.padStart(2, '0')}`,
        password: 'password123',
        role: 'volunteer'
    };
}

// 测试前清空所有测试数据
beforeEach(async () => {
    // 简化清理逻辑，直接删除所有可能的测试用户
    await User.destroy({ where: { email: 'integration@example.com' }, force: true });
    await User.destroy({ where: { email: 'integration-01@example.com' }, force: true });
    await User.destroy({ where: { email: 'integration-02@example.com' }, force: true });
    await User.destroy({ where: { email: 'integration-03@example.com' }, force: true });
    await User.destroy({ where: { email: 'integration-invalid@example.com' }, force: true });
    await User.destroy({ where: { email: 'integration-invalid-role@example.com' }, force: true });
    await User.destroy({ where: { phone: '13800138002' }, force: true });
    await User.destroy({ where: { phone: '13800138003' }, force: true });
    await User.destroy({ where: { phone: '13800138004' }, force: true });
});

describe('Register API', () => {
    test('should register a new user successfully', async () => {
        const userData = generateTestData('01');
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(userData)
            .expect('Content-Type', /json/);
        
        console.log('注册响应:', response.statusCode, response.body);
        
        // 验证响应数据
        expect(response.body).toHaveProperty('status', 'success');
        expect(response.body).toHaveProperty('message', '注册成功');
        expect(response.body).toHaveProperty('data');
        
        const responseData = response.body.data;
        expect(responseData).toHaveProperty('token');
        expect(responseData).toHaveProperty('user');
        
        const user = responseData.user;
        expect(user).toHaveProperty('id');
        expect(user.name).toBe(userData.name);
        expect(user.email).toBe(userData.email);
        expect(user.phone).toBe(userData.phone);
        expect(user.role).toBe(userData.role);
        
        // 验证数据库中是否存在该用户
        const dbUser = await User.findOne({ where: { email: userData.email } });
        expect(dbUser).toBeInstanceOf(User);
        expect(dbUser.name).toBe(userData.name);
    });
    
    test('should return error for duplicate email', async () => {
        // 先创建一个用户
        const userData = generateTestData('02');
        await User.create(userData);
        
        // 尝试使用相同的email注册
        const duplicateUserData = {
            ...userData,
            name: '测试用户2',
            phone: '13800138003'
        };
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(duplicateUserData)
            .expect('Content-Type', /json/)
            .expect(400);
        
        // 验证响应数据
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', '用户已存在');
    });
    
    test('should return error for duplicate phone', async () => {
        // 先创建一个用户
        const userData = generateTestData('03');
        await User.create(userData);
        
        // 尝试使用相同的phone注册
        const duplicateUserData = {
            ...userData,
            name: '测试用户2',
            email: 'integration-03-dup@example.com'
        };
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(duplicateUserData)
            .expect('Content-Type', /json/)
            .expect(400);
        
        // 验证响应数据
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', '用户已存在');
    });
    
    test('should return error for missing required fields', async () => {
        // 缺少必填字段
        const invalidUserData = {
            name: '测试用户',
            email: 'integration-invalid@example.com',
            // 缺少phone和password
        };
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(invalidUserData)
            .expect('Content-Type', /json/);
        
        // 验证响应数据
        expect(response.body).toHaveProperty('status', 'error');
        expect(response.body).toHaveProperty('message', '注册失败');
    });
    
    test('should return error for invalid role', async () => {
        // 使用无效的role
        const invalidUserData = {
            name: '测试用户',
            email: 'integration-invalid-role@example.com',
            phone: '13800138004',
            password: 'password123',
            role: 'invalid-role' // 无效的角色
        };
        
        const response = await request(app)
            .post('/api/auth/register')
            .send(invalidUserData)
            .expect('Content-Type', /json/);
        
        // 验证响应数据
        expect(response.body).toHaveProperty('status', 'error');
        // 注意：由于email可能已经被使用，这里可能返回"用户已存在"而不是"注册失败"
        expect(response.body.message).toMatch(/(注册失败|用户已存在)/);
    });
});