// User模型单元测试
const User = require('../../../backend/models/User');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');

// 测试前清空测试数据
beforeEach(async () => {
    // 清理所有测试中使用的用户数据
    await User.destroy({ 
        where: { 
            [Op.or]: [
                { email: 'test-jest@example.com' },
                { phone: '13800138000' },
                { email: 'test-email1@example.com' },
                { phone: '13800138001' },
                { phone: '13800138002' },
                { email: 'test-phone1@example.com' },
                { phone: '13800138003' },
                { email: 'test-phone2@example.com' },
                { email: 'test-password@example.com' },
                { phone: '13800138004' }
            ]
        }, 
        force: true 
    });
});

// 测试User模型创建
describe('User Model', () => {
    test('should create a new user with encrypted password', async () => {
        // 创建测试用户
        const userData = {
            name: '测试用户',
            email: 'test-jest@example.com',
            phone: '13800138000',
            password: 'password123',
            role: 'volunteer'
        };
        
        console.log('准备创建测试用户:', userData);
        let user;
        try {
            user = await User.create(userData);
            console.log('用户创建成功:', user.id);
        } catch (error) {
            console.error('用户创建失败:', error);
            console.error('错误详情:', error.original);
            console.error('SQL:', error.sql);
            throw error;
        }
        
        // 验证用户创建成功
        expect(user).toBeInstanceOf(User);
        expect(user.name).toBe(userData.name);
        expect(user.email).toBe(userData.email);
        expect(user.phone).toBe(userData.phone);
        expect(user.role).toBe(userData.role);
        
        // 验证密码已加密
        expect(user.password).not.toBe(userData.password);
        const isPasswordValid = await bcrypt.compare(userData.password, user.password);
        expect(isPasswordValid).toBe(true);
        
        // 验证自动生成的字段
        expect(user.id).toBeDefined();
        expect(user.createdAt).toBeDefined();
        expect(user.updatedAt).toBeDefined();
    });
    
    test('should not create a user with duplicate email', async () => {
        // 创建第一个用户
        const userData = {
            name: '测试用户1',
            email: 'test-email1@example.com',
            phone: '13800138001',
            password: 'password123',
            role: 'volunteer'
        };
        await User.create(userData);
        
        // 尝试创建第二个具有相同email的用户，应该失败
        const duplicateUserData = {
            ...userData,
            name: '测试用户2',
            phone: '13800138002'
        };
        
        await expect(User.create(duplicateUserData)).rejects.toThrow();
    });
    
    test('should not create a user with duplicate phone', async () => {
        // 创建第一个用户
        const userData = {
            name: '测试用户1',
            email: 'test-phone1@example.com',
            phone: '13800138003',
            password: 'password123',
            role: 'volunteer'
        };
        await User.create(userData);
        
        // 尝试创建第二个具有相同phone的用户，应该失败
        const duplicateUserData = {
            ...userData,
            name: '测试用户2',
            email: 'test-phone2@example.com'
        };
        
        await expect(User.create(duplicateUserData)).rejects.toThrow();
    });
    
    test('should compare passwords correctly', async () => {
        // 创建测试用户
        const userData = {
            name: '测试用户',
            email: 'test-password@example.com',
            phone: '13800138004',
            password: 'password123',
            role: 'volunteer'
        };
        
        const user = await User.create(userData);
        
        // 验证正确密码
        const isCorrectPassword = await user.comparePassword('password123');
        expect(isCorrectPassword).toBe(true);
        
        // 验证错误密码
        const isIncorrectPassword = await user.comparePassword('wrongpassword');
        expect(isIncorrectPassword).toBe(false);
    });
});