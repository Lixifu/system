// 直接执行SQL命令添加签退二维码字段的脚本
const mysql = require('mysql2/promise');
const config = require('./backend/config/config');

async function addSignOutQRCodeField() {
    let connection;
    
    try {
        // 创建数据库连接
        connection = await mysql.createConnection({
            host: config.database.host,
            port: config.database.port,
            user: config.database.username,
            password: config.database.password,
            database: config.database.database
        });
        
        console.log('数据库连接成功');
        
        // 执行SQL命令添加字段
        const sql = `ALTER TABLE activities ADD COLUMN sign_out_qr_code TEXT NULL COMMENT '签退二维码' AFTER qr_code`;
        
        console.log('执行SQL命令:', sql);
        const [result] = await connection.execute(sql);
        
        console.log('字段添加成功:', result);
        console.log('🎉 签退二维码字段已成功添加到activities表！');
        
    } catch (error) {
        console.error('操作失败:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('数据库连接已关闭');
        }
    }
}

// 执行脚本
addSignOutQRCodeField();
