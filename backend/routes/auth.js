const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// 用户注册
router.post('/register', async (req, res) => {
    try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [{ email: req.body.email }, { phone: req.body.phone }]
            }
        });
        if (existingUser) {
            return errorResponse(res, '用户已存在', 400);
        }

        // 创建新用户
        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password,
            role: req.body.role || 'volunteer'
        });

        // 生成JWT令牌
        const token = jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        const responseData = {
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        };

        successResponse(res, responseData, '注册成功', 201);
    } catch (error) {
        errorResponse(res, '注册失败', 500, { error: error.message });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        // 构建查询条件
        // 使用OR条件，只需要匹配邮箱或手机号中的一个即可
        const whereCondition = {
            [Op.or]: []
        };
        if (req.body.email) {
            whereCondition[Op.or].push({ email: req.body.email });
        }
        if (req.body.phone) {
            whereCondition[Op.or].push({ phone: req.body.phone });
        }
        
        if (whereCondition[Op.or].length === 0) {
            return errorResponse(res, '请提供邮箱或手机号', 400);
        }

        // 查找用户
        const user = await User.findOne({
            where: whereCondition
        });
        if (!user) {
            return errorResponse(res, '用户名或密码错误', 401);
        }

        // 验证密码
        const isPasswordValid = await user.comparePassword(req.body.password);
        if (!isPasswordValid) {
            return errorResponse(res, '用户名或密码错误', 401);
        }

        // 生成JWT令牌
        const token = jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        const responseData = {
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        };

        successResponse(res, responseData, '登录成功');
    } catch (error) {
        errorResponse(res, '登录失败', 500, { error: error.message });
    }
});

module.exports = router;