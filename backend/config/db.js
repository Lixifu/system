// Sequelize数据库连接配置
const { Sequelize } = require('sequelize');
const config = require('./config');

// 创建Sequelize实例
const sequelize = new Sequelize(
    config.database.database,
    config.database.username,
    config.database.password,
    {
        host: config.database.host,
        port: config.database.port,
        dialect: config.database.dialect,
        timezone: config.database.timezone,
        dialectOptions: config.database.dialectOptions,
        logging: false // 关闭日志输出
    }
);

// 测试数据库连接
sequelize.authenticate()
    .then(() => {
        console.log('数据库连接成功');
    })
    .catch(err => {
        console.error('数据库连接失败:', err);
    });

module.exports = sequelize;