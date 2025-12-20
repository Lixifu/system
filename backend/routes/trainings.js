const express = require('express');
const router = express.Router();
const Training = require('../models/Training');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');

// 获取培训列表
router.get('/', async (req, res) => {
    try {
        const trainings = await Training.find()
            .populate('organizer', 'name')
            .populate('organization', 'name');
        res.status(200).json(trainings);
    } catch (error) {
        res.status(500).json({ message: '获取培训列表失败', error: error.message });
    }
});

// 获取培训详情
router.get('/:id', async (req, res) => {
    try {
        const training = await Training.findById(req.params.id)
            .populate('organizer', 'name')
            .populate('organization', 'name');
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }
        res.status(200).json(training);
    } catch (error) {
        res.status(500).json({ message: '获取培训详情失败', error: error.message });
    }
});

// 创建培训
router.post('/', async (req, res) => {
    try {
        const training = new Training({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            teacher: req.body.teacher,
            organizer: req.body.organizer,
            organization: req.body.organization,
            status: req.body.status || 'draft'
        });

        await training.save();
        res.status(201).json({ message: '培训创建成功', training });
    } catch (error) {
        res.status(500).json({ message: '创建培训失败', error: error.message });
    }
});

// 更新培训
router.put('/:id', async (req, res) => {
    try {
        const training = await Training.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }
        res.status(200).json({ message: '培训更新成功', training });
    } catch (error) {
        res.status(500).json({ message: '更新培训失败', error: error.message });
    }
});

// 删除培训
router.delete('/:id', async (req, res) => {
    try {
        const training = await Training.findByIdAndDelete(req.params.id);
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }
        res.status(200).json({ message: '培训删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除培训失败', error: error.message });
    }
});

// 报名培训
router.post('/:id/register', async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }

        // 检查培训是否已满
        if (training.registeredCount >= training.quota) {
            return res.status(400).json({ message: '培训名额已满' });
        }

        // 检查用户是否已报名
        if (training.participants.includes(req.body.userId)) {
            return res.status(400).json({ message: '您已报名该培训' });
        }

        // 添加用户到参与者列表
        training.participants.push(req.body.userId);
        training.registeredCount += 1;

        await training.save();
        res.status(200).json({ message: '报名成功', training });
    } catch (error) {
        res.status(500).json({ message: '报名失败', error: error.message });
    }
});

// 取消报名
router.post('/:id/cancel', async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }

        // 检查用户是否已报名
        const index = training.participants.indexOf(req.body.userId);
        if (index === -1) {
            return res.status(400).json({ message: '您未报名该培训' });
        }

        // 从参与者列表中移除用户
        training.participants.splice(index, 1);
        training.registeredCount -= 1;

        await training.save();
        res.status(200).json({ message: '取消报名成功', training });
    } catch (error) {
        res.status(500).json({ message: '取消报名失败', error: error.message });
    }
});

module.exports = router;