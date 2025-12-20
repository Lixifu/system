const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
// const mongoose = require('mongoose');
const config = require('./config/config');

// 创建Express应用
const app = express();

// 中间件配置
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 模拟数据标志
app.set('useMockData', true);

// 数据库连接（注释掉，使用模拟数据）
// mongoose.connect(config.database.url, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
// .then(() => {
//     console.log('数据库连接成功');
// })
// .catch((error) => {
//     console.error('数据库连接失败:', error);
//     process.exit(1);
// });

// 路由配置
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const trainingRoutes = require('./routes/trainings');
const userRoutes = require('./routes/user');

app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/user', userRoutes);

// 模拟数据路由
app.use('/api/mock', require('./routes/mock'));

// 根路由
app.get('/', (req, res) => {
    res.send('志愿者管理系统API');
});

// 404处理
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// 错误处理
app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
        error: {
            message: error.message
        }
    });
});

// 启动服务器
const PORT = config.server.port || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
});

module.exports = app;