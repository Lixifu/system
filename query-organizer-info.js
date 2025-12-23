// 查询organizer@example.com对应的组织信息
const { User, Organization } = require('./backend/models');
const sequelize = require('./backend/config/db');

async function queryOrganizerInfo() {
    try {
        // 建立数据库连接
        await sequelize.authenticate();
        console.log('数据库连接成功');

        // 查询用户信息
        const user = await User.findOne({
            where: { email: 'organizer@example.com' },
            include: [{ model: Organization, as: 'organization' }]
        });

        if (user) {
            console.log('用户信息:', {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                organizationId: user.organizationId
            });

            if (user.organization) {
                console.log('组织信息:', {
                    id: user.organization.id,
                    name: user.organization.name,
                    department: user.organization.department,
                    contact: user.organization.contact,
                    address: user.organization.address,
                    description: user.organization.description,
                    status: user.organization.status
                });
            } else {
                console.log('该用户没有关联的组织');
            }
        } else {
            console.log('未找到用户organizer@example.com');
        }

        // 查询所有组织信息
        console.log('\n所有组织信息:');
        const organizations = await Organization.findAll();
        organizations.forEach(org => {
            console.log({
                id: org.id,
                name: org.name,
                department: org.department,
                contact: org.contact,
                address: org.address,
                description: org.description
            });
        });
    } catch (error) {
        console.error('查询失败:', error);
    } finally {
        // 关闭数据库连接
        await sequelize.close();
    }
}

queryOrganizerInfo();