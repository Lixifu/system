// 查询数据库中是否存在"chu志愿者"用户
const User = require('./backend/models/User');

async function checkUser() {
    try {
        // 直接查询姓名为"chu志愿者"的用户，不进行sync操作
        const users = await User.findAll({
            where: {
                name: 'chu志愿者'
            }
        });
        
        console.log(`查询到 ${users.length} 个名为"chu志愿者"的用户`);
        if (users.length > 0) {
            users.forEach(user => {
                console.log('用户详情:', {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    createdAt: user.createdAt
                });
            });
        } else {
            console.log('未查询到名为"chu志愿者"的用户，注册功能可能存在问题');
        }
        
        // 关闭数据库连接
        await User.sequelize.close();
    } catch (error) {
        console.error('查询过程中发生错误:', error);
    }
}

checkUser();