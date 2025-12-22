// 查看users表结构
const sequelize = require('./backend/config/db');

async function checkTableStructure() {
    try {
        // 查看users表的结构
        const [results] = await sequelize.query('SHOW CREATE TABLE users;');
        console.log('Users表结构:', results[0]['Create Table']);
        
        // 查看索引数量
        const [indexes] = await sequelize.query('SHOW INDEXES FROM users;');
        console.log('\n索引数量:', indexes.length);
        console.log('索引详情:', indexes.map(index => index.Key_name));
        
        // 关闭数据库连接
        await sequelize.close();
    } catch (error) {
        console.error('查询表结构失败:', error);
    }
}

checkTableStructure();