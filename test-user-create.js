// 测试直接创建用户，查看详细错误信息
const User = require('./backend/models/User');

async function testUserCreate() {
    try {
        console.log('开始测试用户创建...');
        
        // 先删除可能存在的测试用户
        await User.destroy({ where: { email: 'test-create@example.com' }, force: true });
        
        // 创建测试用户
        const userData = {
            name: '测试创建用户',
            email: 'test-create@example.com',
            phone: '13800138005',
            password: 'password123',
            role: 'volunteer'
        };
        
        console.log('准备创建用户:', userData);
        const user = await User.create(userData);
        console.log('用户创建成功:', user);
        
        // 验证密码
        const isPasswordValid = await user.comparePassword('password123');
        console.log('密码验证结果:', isPasswordValid);
        
        // 关闭数据库连接
        await User.sequelize.close();
        console.log('测试完成！');
    } catch (error) {
        console.error('测试过程中发生错误:', error);
        console.error('错误详情:', error.original);
        console.error('SQL:', error.sql);
        
        // 关闭数据库连接
        await User.sequelize.close();
    }
}

testUserCreate();