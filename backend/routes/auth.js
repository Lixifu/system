const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// 用户注册
router.post('/register', async (req, res) => {
    try {
        // 检查用户是否已存在
        const existingUser = await User.findOne({ $or: [{ email: req.body.email }, { phone: req.body.phone }] });
        if (existingUser) {
            return res.status(400).json({ message: '用户已存在' });
        }

        // 创建新用户
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            phone: req.body.phone,
            password: req.body.password,
            role: req.body.role || 'volunteer'
        });

        // 保存用户
        await user.save();

        // 生成JWT令牌
        const token = jwt.sign({ id: user._id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        res.status(201).json({
            message: '注册成功',
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: '注册失败', error: error.message });
    }
});

// 用户登录
router.post('/login', async (req, res) => {
    try {
        // 查找用户
        const user = await User.findOne({ $or: [{ email: req.body.email }, { phone: req.body.phone }] });
        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 验证密码
        const isPasswordValid = await user.comparePassword(req.body.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 生成JWT令牌
        const token = jwt.sign({ id: user._id, role: user.role }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });

        res.status(200).json({
            message: '登录成功',
            token: token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: '登录失败', error: error.message });
    }
});

module.exports = router;