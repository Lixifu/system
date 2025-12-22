const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');
const { globalErrorHandler, AppError } = require('./middlewares/errorHandler');
const { logger, requestLogger } = require('./utils/logger');

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// 请求日志记录
app.use(requestLogger);

// 静态文件服务
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 数据库连接 - Sequelize
const sequelize = require('./config/db');
const models = require('./models');

// 注释掉数据库同步，避免自动创建索引导致的问题
/* sequelize.sync({
    force: false, // 设置为false，保留现有表结构，避免数据丢失
    alter: true   // 启用alter选项，自动更新表结构
})
.then(() => {
    logger.info('数据库同步成功');
})
.catch((error) => {
    logger.error('数据库同步失败:', error);
    // 开发阶段不退出进程，允许继续运行
    logger.info('继续运行应用程序...');
}); */

// 路由配置
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const trainingRoutes = require('./routes/trainings');
const userRoutes = require('./routes/user');
const organizationRoutes = require('./routes/organizations');
const adminRoutes = require('./routes/admin');
const medalRoutes = require('./routes/medals');
const skillRoutes = require('./routes/skills');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/medals', medalRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/notifications', notificationRoutes);

// 模拟数据路由（保留，用于测试）
app.use('/api/mock', require('./routes/mock'));

// 根路由
app.get('/', (req, res) => {
    res.send('志愿者管理系统API');
});

// 404错误处理
app.all('*', (req, res, next) => {
    next(new AppError(`无法找到 ${req.originalUrl} 路径`, 404));
});

// 全局错误处理中间件
app.use(globalErrorHandler);

// 导出应用程序，用于测试和外部调用
module.exports = app;

// 只有当直接运行该文件时才启动服务器
if (require.main === module) {
    // 启动服务器
    const PORT = config.server.port || 3000;
    app.listen(PORT, () => {
        logger.info(`服务器运行在端口 ${PORT}`);
    });
}