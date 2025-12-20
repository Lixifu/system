const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 认证中间件
const authMiddleware = (req, res, next) => {
    // 从请求头获取令牌
    const authHeader = req.header('Authorization');
    if (!authHeader) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }

    // 提取令牌
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: '未提供认证令牌' });
    }

    try {
        // 验证令牌
        const decoded = jwt.verify(token, config.jwt.secret);
        
        // 将用户信息添加到请求对象
        req.user = decoded;
        
        next();
    } catch (error) {
        return res.status(401).json({ message: '无效的认证令牌' });
    }
};

// 权限验证中间件
const roleMiddleware = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: '权限不足' });
        }
        next();
    };
};

module.exports = {
    authMiddleware,
    roleMiddleware
};