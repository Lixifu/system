// 数据库初始化脚本
const mysql = require('mysql2/promise');
const config = require('./backend/config/config');

// 创建数据库连接
async function initDatabase() {
    try {
        // 先连接到MySQL服务器，不指定数据库
        const connection = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.username,
            password: config.database.password
        });

        // 创建数据库
        const dbName = config.database.database;
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        console.log(`数据库 ${dbName} 创建成功或已存在`);

        // 关闭连接
        await connection.end();
        console.log('数据库连接已关闭');

        // 连接到新创建的数据库，创建表和测试数据
        console.log('正在同步数据库表结构...');
        
        // 使用sequelize同步模型
        const sequelize = require('./backend/config/db');
        const models = require('./backend/models');
        
        // 同步表结构
        await sequelize.sync({
            force: false,
            alter: true
        });
        
        console.log('数据库表结构同步成功');
        console.log('数据库初始化完成！');
        
        process.exit(0);
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// 执行初始化
initDatabase();