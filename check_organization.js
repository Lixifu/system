const { Organization } = require('./backend/models');
const sequelize = require('./backend/config/db');

async function checkOrganization() {
    try {
        await sequelize.authenticate();
        console.log('数据库连接成功');
        
        // 查询所有组织
        const organizations = await Organization.findAll();
        console.log('所有组织:', organizations.map(org => ({ id: org.id, name: org.name, status: org.status })));
        
        // 特别查询"爱心志愿者团队"
        const loveOrg = await Organization.findOne({ where: { name: '爱心志愿者团队' } });
        if (loveOrg) {
            console.log('\n"爱心志愿者团队"存在:', { id: loveOrg.id, name: loveOrg.name, status: loveOrg.status });
        } else {
            console.log('\n"爱心志愿者团队"不存在');
            // 如果不存在，尝试创建
            const newOrg = await Organization.create({
                name: '爱心志愿者团队',
                department: '社区服务中心',
                contact: '0754-88888889',
                address: '社区服务中心',
                description: '爱心志愿者团队',
                status: 'pending'
            });
            console.log('已创建"爱心志愿者团队":', { id: newOrg.id, name: newOrg.name, status: newOrg.status });
        }
        
        await sequelize.close();
    } catch (error) {
        console.error('查询失败:', error.message);
        await sequelize.close();
    }
}

checkOrganization();