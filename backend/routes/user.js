const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');

// 获取用户信息
router.get('/profile', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        const user = await User.findById(userId)
            .populate('organization', 'name')
            .populate('certificates')
            .populate('medals');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 隐藏密码
        const userWithoutPassword = {
            ...user.toObject(),
            password: undefined
        };

        res.status(200).json(userWithoutPassword);
    } catch (error) {
        res.status(500).json({ message: '获取用户信息失败', error: error.message });
    }
});

// 更新用户信息
router.put('/profile', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        // 排除密码字段，密码更新应该使用专门的接口
        const updateData = { ...req.body };
        delete updateData.password;

        const user = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        );
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 隐藏密码
        const userWithoutPassword = {
            ...user.toObject(),
            password: undefined
        };

        res.status(200).json({ message: '用户信息更新成功', user: userWithoutPassword });
    } catch (error) {
        res.status(500).json({ message: '更新用户信息失败', error: error.message });
    }
});

// 更新密码
router.put('/password', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 验证旧密码
        const isPasswordValid = await user.comparePassword(req.body.oldPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '旧密码错误' });
        }

        // 更新密码
        user.password = req.body.newPassword;
        await user.save();

        res.status(200).json({ message: '密码更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新密码失败', error: error.message });
    }
});

// 获取用户参加的活动
router.get('/activities', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        const user = await User.findById(userId).populate('activities');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.status(200).json(user.activities || []);
    } catch (error) {
        res.status(500).json({ message: '获取用户活动失败', error: error.message });
    }
});

// 获取用户参加的培训
router.get('/trainings', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        const user = await User.findById(userId).populate('trainings');
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.status(200).json(user.trainings || []);
    } catch (error) {
        res.status(500).json({ message: '获取用户培训失败', error: error.message });
    }
});

// 获取用户志愿时长
router.get('/hours', async (req, res) => {
    try {
        // 从请求中获取用户ID（实际项目中应该从JWT令牌中解析）
        const userId = req.query.userId || req.body.userId;
        if (!userId) {
            return res.status(400).json({ message: '用户ID不能为空' });
        }

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.status(200).json({ volunteerHours: user.volunteerHours });
    } catch (error) {
        res.status(500).json({ message: '获取志愿时长失败', error: error.message });
    }
});

module.exports = router;