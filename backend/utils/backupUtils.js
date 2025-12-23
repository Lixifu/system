const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sequelize = require('../config/db');
const Backup = require('../models/Backup');

// 备份目录
const BACKUP_DIR = path.join(__dirname, '../../backups');

// 确保备份目录存在
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * 创建完整数据备份
 * @returns {Promise<Object>} 备份信息
 */
const createFullBackup = async () => {
  try {
    // 生成备份文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilename = `full-backup-${timestamp}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // 使用sequelize导出数据库
    const queryInterface = sequelize.getQueryInterface();
    const tables = await queryInterface.showAllTables();
    
    // 创建备份元数据
    const metadata = {
      tables: tables,
      timestamp: new Date().toISOString(),
      version: '1.0',
      type: 'full'
    };
    
    // 导出数据到JSON文件（用于简化恢复）
    const jsonBackupData = {};
    for (const table of tables) {
      const data = await sequelize.query(`SELECT * FROM ${table}`, { type: sequelize.QueryTypes.SELECT });
      jsonBackupData[table] = data;
    }
    
    const jsonBackupPath = path.join(BACKUP_DIR, `full-backup-${timestamp}.json`);
    fs.writeFileSync(jsonBackupPath, JSON.stringify(jsonBackupData, null, 2));
    
    // 获取备份文件大小
    const stats = fs.statSync(jsonBackupPath);
    
    // 创建备份记录
    const backup = await Backup.create({
      filename: backupFilename,
      path: jsonBackupPath,
      size: stats.size,
      status: 'completed',
      type: 'full',
      metadata: metadata
    });
    
    return backup;
  } catch (error) {
    console.error('创建备份失败:', error);
    throw new Error(`创建备份失败: ${error.message}`);
  }
};

/**
 * 恢复数据备份
 * @param {string} backupId - 备份ID
 * @returns {Promise<Object>} 恢复结果
 */
const restoreBackup = async (backupId) => {
  try {
    // 获取备份记录
    const backup = await Backup.findByPk(backupId);
    if (!backup) {
      throw new Error('备份不存在');
    }
    
    if (backup.status !== 'completed') {
      throw new Error('备份未完成，无法恢复');
    }
    
    // 读取备份数据
    const backupData = JSON.parse(fs.readFileSync(backup.path, 'utf8'));
    
    // 开始事务
    await sequelize.transaction(async (transaction) => {
      // 恢复每个表的数据
      for (const [tableName, data] of Object.entries(backupData)) {
        // 清空表
        await sequelize.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`, { transaction });
        
        // 插入数据
        if (data.length > 0) {
          await sequelize.query(
            `INSERT INTO ${tableName} (${Object.keys(data[0]).join(', ')}) VALUES ${data.map(row => 
              `(${Object.values(row).map(val => sequelize.escape(val)).join(', ')})`
            ).join(', ')}`,
            { transaction }
          );
        }
      }
    });
    
    return { success: true, message: '备份恢复成功' };
  } catch (error) {
    console.error('恢复备份失败:', error);
    throw new Error(`恢复备份失败: ${error.message}`);
  }
};

/**
 * 删除备份文件和记录
 * @param {string} backupId - 备份ID
 * @returns {Promise<Object>} 删除结果
 */
const deleteBackup = async (backupId) => {
  try {
    // 获取备份记录
    const backup = await Backup.findByPk(backupId);
    if (!backup) {
      throw new Error('备份不存在');
    }
    
    // 删除备份文件
    if (fs.existsSync(backup.path)) {
      fs.unlinkSync(backup.path);
    }
    
    // 删除备份记录
    await backup.destroy();
    
    return { success: true, message: '备份删除成功' };
  } catch (error) {
    console.error('删除备份失败:', error);
    throw new Error(`删除备份失败: ${error.message}`);
  }
};

/**
 * 导出指定表的数据
 * @param {string} tableName - 表名
 * @returns {Promise<string>} 导出文件路径
 */
const exportTableData = async (tableName) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFilename = `${tableName}-export-${timestamp}.json`;
    const exportPath = path.join(BACKUP_DIR, exportFilename);
    
    // 查询表数据
    const data = await sequelize.query(`SELECT * FROM ${tableName}`, { type: sequelize.QueryTypes.SELECT });
    
    // 写入文件
    fs.writeFileSync(exportPath, JSON.stringify(data, null, 2));
    
    return exportPath;
  } catch (error) {
    console.error(`导出表 ${tableName} 数据失败:`, error);
    throw new Error(`导出表 ${tableName} 数据失败: ${error.message}`);
  }
};

module.exports = {
  createFullBackup,
  restoreBackup,
  deleteBackup,
  exportTableData,
  BACKUP_DIR
};
