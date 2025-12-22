// 删除users表中重复的索引
const sequelize = require('./backend/config/db');

async function fixDuplicateIndexes() {
    try {
        console.log('开始修复重复索引...');
        
        // 获取所有索引
        const [indexes] = await sequelize.query('SHOW INDEXES FROM users;');
        console.log('当前索引数量:', indexes.length);
        
        // 找出需要删除的索引：所有以phone_或email_开头的索引，以及重复的索引
        const indexesToDelete = [];
        
        for (const index of indexes) {
            const indexName = index.Key_name;
            // 保留主键和原始的phone、email索引，以及organization_id索引
            if (indexName === 'PRIMARY' || indexName === 'phone' || indexName === 'email' || indexName === 'organization_id') {
                continue;
            }
            // 删除其他所有索引，特别是phone_2, email_2等
            indexesToDelete.push(indexName);
        }
        
        console.log('需要删除的索引名:', indexesToDelete);
        
        // 删除多余索引
        for (const indexName of indexesToDelete) {
            try {
                await sequelize.query(`ALTER TABLE users DROP INDEX \`${indexName}\`;`);
                console.log(`成功删除索引: ${indexName}`);
            } catch (error) {
                console.error(`删除索引 ${indexName} 失败:`, error.message);
            }
        }
        
        // 验证修复结果
        const [updatedIndexes] = await sequelize.query('SHOW INDEXES FROM users;');
        console.log('修复后索引数量:', updatedIndexes.length);
        console.log('修复后索引详情:', updatedIndexes.map(index => index.Key_name));
        
        // 关闭数据库连接
        await sequelize.close();
        console.log('修复完成！');
    } catch (error) {
        console.error('修复索引过程中发生错误:', error);
    }
}

fixDuplicateIndexes();