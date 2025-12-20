const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');

// 获取活动列表
router.get('/', async (req, res) => {
    try {
        const activities = await Activity.find()
            .populate('organizer', 'name')
            .populate('organization', 'name');
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: '获取活动列表失败', error: error.message });
    }
});

// 获取活动详情
router.get('/:id', async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id)
            .populate('organizer', 'name')
            .populate('organization', 'name');
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }
        res.status(200).json(activity);
    } catch (error) {
        res.status(500).json({ message: '获取活动详情失败', error: error.message });
    }
});

// 创建活动
router.post('/', async (req, res) => {
    try {
        const activity = new Activity({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            organizer: req.body.organizer,
            organization: req.body.organization,
            status: req.body.status || 'draft',
            requirements: req.body.requirements,
            images: req.body.images
        });

        await activity.save();
        res.status(201).json({ message: '活动创建成功', activity });
    } catch (error) {
        res.status(500).json({ message: '创建活动失败', error: error.message });
    }
});

// 更新活动
router.put('/:id', async (req, res) => {
    try {
        const activity = await Activity.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }
        res.status(200).json({ message: '活动更新成功', activity });
    } catch (error) {
        res.status(500).json({ message: '更新活动失败', error: error.message });
    }
});

// 删除活动
router.delete('/:id', async (req, res) => {
    try {
        const activity = await Activity.findByIdAndDelete(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }
        res.status(200).json({ message: '活动删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除活动失败', error: error.message });
    }
});

// 报名活动
router.post('/:id/register', async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查活动是否已满
        if (activity.registeredCount >= activity.quota) {
            return res.status(400).json({ message: '活动名额已满' });
        }

        // 检查用户是否已报名
        if (activity.participants.includes(req.body.userId)) {
            return res.status(400).json({ message: '您已报名该活动' });
        }

        // 添加用户到参与者列表
        activity.participants.push(req.body.userId);
        activity.registeredCount += 1;

        await activity.save();
        res.status(200).json({ message: '报名成功', activity });
    } catch (error) {
        res.status(500).json({ message: '报名失败', error: error.message });
    }
});

// 取消报名
router.post('/:id/cancel', async (req, res) => {
    try {
        const activity = await Activity.findById(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名
        const index = activity.participants.indexOf(req.body.userId);
        if (index === -1) {
            return res.status(400).json({ message: '您未报名该活动' });
        }

        // 从参与者列表中移除用户
        activity.participants.splice(index, 1);
        activity.registeredCount -= 1;

        await activity.save();
        res.status(200).json({ message: '取消报名成功', activity });
    } catch (error) {
        res.status(500).json({ message: '取消报名失败', error: error.message });
    }
});

module.exports = router;