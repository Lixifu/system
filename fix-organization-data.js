// 修复组织id=1的乱码问题
const { Organization } = require('./backend/models');
const sequelize = require('./backend/config/db');

async function fixOrganizationData() {
    try {
        // 建立数据库连接
        await sequelize.authenticate();
        console.log('数据库连接成功');

        // 恢复组织id=1的原始数据
        const result = await Organization.update(
            {
                name: '阳光志愿者协会',
                department: '民政部门',
                contact: '0754-88888888',
                address: '汕头市金平区中山路123号',
                description: '阳光志愿者协会是一个致力于为社区提供志愿服务的非营利组织，成立于2020年，现有志愿者1000余人。',
                status: 'approved'
            },
            {
                where: { id: 1 }
            }
        );

        console.log(`修复结果：${result[0]}行数据被更新`);

        // 验证修复效果
        const fixedOrganization = await Organization.findByPk(1);
        console.log('修复后的数据：');
        console.log({
            id: fixedOrganization.id,
            name: fixedOrganization.name,
            department: fixedOrganization.department,
            contact: fixedOrganization.contact,
            address: fixedOrganization.address,
            description: fixedOrganization.description,
            status: fixedOrganization.status
        });
    } catch (error) {
        console.error('修复失败:', error);
    } finally {
        // 关闭数据库连接
        await sequelize.close();
    }
}

fixOrganizationData();