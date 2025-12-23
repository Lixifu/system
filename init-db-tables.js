// 初始化数据库表结构
const sequelize = require('./backend/config/db');

// 导入所有模型，确保它们被定义
require('./backend/models');

async function initTables() {
  try {
    console.log('开始初始化数据库表结构...');
    
    // 使用sequelize.sync()同步所有模型到数据库
    // force: false 表示只创建不存在的表，不删除已存在的表
    await sequelize.sync({ force: false, alter: true });
    
    console.log('数据库表结构初始化成功！');
    process.exit(0);
  } catch (error) {
    console.error('数据库表结构初始化失败:', error);
    process.exit(1);
  }
}

// 执行初始化
initTables();
