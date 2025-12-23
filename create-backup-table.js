// 只创建backups表
const sequelize = require('./backend/config/db');

async function createBackupTable() {
  try {
    console.log('开始创建backups表...');
    
    // 直接执行SQL创建backups表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id VARCHAR(36) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        path VARCHAR(255) NOT NULL,
        size BIGINT NOT NULL,
        status ENUM('completed', 'failed', 'in_progress') DEFAULT 'completed',
        type ENUM('full', 'partial') DEFAULT 'full',
        metadata JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    
    console.log('backups表创建成功！');
    process.exit(0);
  } catch (error) {
    console.error('创建backups表失败:', error);
    process.exit(1);
  }
}

// 执行创建表操作
createBackupTable();
