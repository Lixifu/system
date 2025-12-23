const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Activity, User, Organization, ActivityParticipant, Training, ActivityTraining, Notification } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const upload = require('../config/upload');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { addDays, addWeeks, addMonths, isBefore, isAfter } = require('date-fns');
const { body, validationResult } = require('express-validator');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');

// 活动验证规则
const activityValidationRules = [
    body('title').notEmpty().withMessage('活动标题不能为空').isLength({ max: 100 }).withMessage('活动标题不能超过100个字符'),
    body('description').notEmpty().withMessage('活动描述不能为空'),
    body('type').notEmpty().withMessage('活动类型不能为空').isIn(['short-term', 'long-term', 'one-time']).withMessage('活动类型无效'),
    body('startTime').notEmpty().withMessage('活动开始时间不能为空').isISO8601().withMessage('活动开始时间格式无效'),
    body('endTime').notEmpty().withMessage('活动结束时间不能为空').isISO8601().withMessage('活动结束时间格式无效'),
    body('location').notEmpty().withMessage('活动地点不能为空'),
    body('quota').notEmpty().withMessage('活动名额不能为空').isInt({ gt: 0 }).withMessage('活动名额必须大于0'),
    body('organizationId').notEmpty().withMessage('组织ID不能为空').isInt().withMessage('组织ID必须是数字'),
    body('requirements').optional().isString().withMessage('活动要求必须是字符串')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return res.status(400).json({ message: '输入验证失败', errors: errors.array() });
}

// 获取活动列表
router.get('/', async (req, res) => {
    try {
        // 构建查询条件
        const whereCondition = {};
        
        // 根据标题搜索
        if (req.query.title) {
            whereCondition.title = {
                [Op.like]: `%${req.query.title}%`
            };
        }
        
        // 根据类型搜索
        if (req.query.type) {
            whereCondition.type = req.query.type;
        }
        
        // 根据状态搜索
        if (req.query.status) {
            whereCondition.status = req.query.status;
        }
        
        // 根据地点搜索
        if (req.query.location) {
            whereCondition.location = {
                [Op.like]: `%${req.query.location}%`
            };
        }
        
        // 根据时间范围搜索
        if (req.query.startTime) {
            whereCondition.startTime = {
                [Op.gte]: new Date(req.query.startTime)
            };
        }
        
        if (req.query.endTime) {
            whereCondition.endTime = {
                [Op.lte]: new Date(req.query.endTime)
            };
        }
        
        // 分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        // 获取活动列表
        const { count, rows } = await Activity.findAndCountAll({
            where: whereCondition,
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });
        
        // 批量计算已报名人数
        const activitiesWithCounts = await Activity.calculateRegisteredCounts(rows);
        
        const pagination = {
            total: count,
            page: page,
            pageSize: limit,
            totalPages: Math.ceil(count / limit)
        };
        
        paginationResponse(res, activitiesWithCounts, pagination, '获取活动列表成功');
    } catch (error) {
        errorResponse(res, '获取活动列表失败', 500, { error: error.message });
    }
});

// 搜索活动
router.get('/search', async (req, res) => {
    try {
        const { keyword, type, status, location, startTime, endTime, organizerName, organizationName, page = 1, limit = 20 } = req.query;
        
        // 构建查询条件
        const whereCondition = {};
        
        // 关键词搜索（标题、描述、地点）
        if (keyword) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } },
                { location: { [Op.like]: `%${keyword}%` } }
            ];
        }
        
        // 根据类型搜索
        if (type) {
            whereCondition.type = type;
        }
        
        // 根据状态搜索
        if (status) {
            whereCondition.status = status;
        }
        
        // 根据地点搜索
        if (location) {
            whereCondition.location = { [Op.like]: `%${location}%` };
        }
        
        // 根据时间范围搜索
        if (startTime) {
            whereCondition.startTime = { ...whereCondition.startTime, [Op.gte]: new Date(startTime) };
        }
        
        if (endTime) {
            whereCondition.endTime = { ...whereCondition.endTime, [Op.lte]: new Date(endTime) };
        }
        
        // 计算分页
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
        
        // 执行搜索
        const { count, rows } = await Activity.findAndCountAll({
            where: whereCondition,
            include: [
                {
                    model: User,
                    as: 'organizer',
                    attributes: ['id', 'name'],
                    where: organizerName ? { name: { [Op.like]: `%${organizerName}%` } } : {},
                    required: !!organizerName
                },
                {
                    model: Organization,
                    as: 'organization',
                    attributes: ['id', 'name'],
                    where: organizationName ? { name: { [Op.like]: `%${organizationName}%` } } : {},
                    required: !!organizationName
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: limitNum,
            offset: offset
        });
        
        // 批量计算已报名人数
        const activitiesWithCounts = await Activity.calculateRegisteredCounts(rows);
        
        const pagination = {
            total: count,
            page: pageNum,
            pageSize: limitNum,
            totalPages: Math.ceil(count / limitNum)
        };
        
        paginationResponse(res, activitiesWithCounts, pagination, '搜索活动成功');
    } catch (error) {
        errorResponse(res, '搜索活动失败', 500, { error: error.message });
    }
});

// 获取活动详情
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id, {
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ]
        });
        if (!activity) {
            return errorResponse(res, '活动不存在', 404);
        }
        
        // 动态计算已报名人数（只统计审核通过的）
        const registeredCount = await activity.countParticipants(['approved']);
        
        // 将计算结果添加到活动对象中
        const activityData = activity.toJSON();
        activityData.registeredCount = registeredCount;
        
        // 只有组织者和管理员可以查看完整的参与者信息
        if (req.user && (req.user.id === activity.organizerId || req.user.role === 'admin')) {
            // 获取完整的参与者信息
            const participants = await ActivityParticipant.findAll({
                where: { activityId: req.params.id },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone', 'email', 'gender', 'age']
                }],
                order: [['createdAt', 'DESC']]
            });
            
            // 格式化参与者信息
            activityData.participants = participants.map(p => ({
                volunteerId: p.user.id,
                volunteerName: p.user.name,
                contactInfo: {
                    phone: p.user.phone,
                    email: p.user.email
                },
                registrationTime: p.createdAt,
                status: p.status,
                signInTime: p.signInTime,
                signOutTime: p.signOutTime,
                duration: p.duration,
                confirmed: p.confirmed,
                gender: p.user.gender,
                age: p.user.age
            }));
        } else {
            // 普通用户只能查看参与者数量，不能查看具体信息
            activityData.participants = [];
        }
        
        successResponse(res, activityData, '获取活动详情成功');
    } catch (error) {
        errorResponse(res, '获取活动详情失败', 500, { error: error.message });
    }
});

// 创建活动
router.post('/', authMiddleware, roleMiddleware(['organizer', 'admin']), activityValidationRules, validate, async (req, res) => {
    try {
        // 验证结束时间是否大于开始时间
        if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
            return errorResponse(res, '活动结束时间必须大于开始时间', 400);
        }
        
        const activity = await Activity.create({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            organizerId: req.user.id,
            organizationId: req.body.organizationId,
            status: req.body.status || 'draft',
            requirements: req.body.requirements
        });

        successResponse(res, activity, '活动创建成功', 201);
    } catch (error) {
        errorResponse(res, '创建活动失败', 500, { error: error.message });
    }
});

// 更新活动
router.put('/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), [
    body('title').optional().isLength({ max: 100 }).withMessage('活动标题不能超过100个字符'),
    body('type').optional().isIn(['short-term', 'long-term', 'one-time']).withMessage('活动类型无效'),
    body('startTime').optional().isISO8601().withMessage('活动开始时间格式无效'),
    body('endTime').optional().isISO8601().withMessage('活动结束时间格式无效'),
    body('quota').optional().isInt({ gt: 0 }).withMessage('活动名额必须大于0'),
    body('organizationId').optional().isInt().withMessage('组织ID必须是数字')
], validate, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return errorResponse(res, '活动不存在', 404);
        }

        // 检查是否是活动组织者或管理员
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权修改该活动', 403);
        }
        
        // 验证结束时间是否大于开始时间（如果两者都提供了）
        if (req.body.startTime && req.body.endTime) {
            if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
                return errorResponse(res, '活动结束时间必须大于开始时间', 400);
            }
        } else if (req.body.startTime && !req.body.endTime) {
            // 如果只提供了开始时间，确保不超过原结束时间
            if (new Date(req.body.startTime) >= new Date(activity.endTime)) {
                return errorResponse(res, '活动开始时间必须小于结束时间', 400);
            }
        } else if (!req.body.startTime && req.body.endTime) {
            // 如果只提供了结束时间，确保不早于原开始时间
            if (new Date(req.body.endTime) <= new Date(activity.startTime)) {
                return errorResponse(res, '活动结束时间必须大于开始时间', 400);
            }
        }

        await activity.update(req.body);
        successResponse(res, activity, '活动更新成功');
    } catch (error) {
        errorResponse(res, '更新活动失败', 500, { error: error.message });
    }
});

// 删除活动
router.delete('/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return errorResponse(res, '活动不存在', 404);
        }

        // 检查是否是活动组织者或管理员
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权删除该活动', 403);
        }

        await activity.destroy();
        successResponse(res, null, '活动删除成功');
    } catch (error) {
        errorResponse(res, '删除活动失败', 500, { error: error.message });
    }
});

// 报名活动
router.post('/:id/register', authMiddleware, async (req, res) => {
    try {
        // 检查用户角色，只有志愿者可以报名活动
        if (req.user.role !== 'volunteer') {
            return res.status(403).json({ message: '只有志愿者角色可以报名活动' });
        }
        
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名
        const existingRegistration = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.user.id
            }
        });
        if (existingRegistration) {
            return res.status(400).json({ message: '您已报名该活动' });
        }
        
        // 动态计算当前已报名人数
        const currentCount = await activity.countParticipants(['approved', 'pending']);
        
        // 检查活动是否已满
        if (currentCount >= activity.quota) {
            return res.status(400).json({ message: '活动名额已满' });
        }

        // 创建报名记录
        await ActivityParticipant.create({
            activityId: req.params.id,
            userId: req.user.id,
            status: 'pending'
        });
        
        // 移除了直接更新registeredCount字段的逻辑，改为通过countParticipants动态计算

        res.status(200).json({ message: '报名成功' });
    } catch (error) {
        res.status(500).json({ message: '报名失败', error: error.message });
    }
});

// 取消报名
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名
        const registration = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.user.id
            }
        });
        if (!registration) {
            return res.status(400).json({ message: '您未报名该活动' });
        }

        // 删除报名记录
        await registration.destroy();
        
        // 移除了直接更新registeredCount字段的逻辑，改为通过countParticipants动态计算

        res.status(200).json({ message: '取消报名成功' });
    } catch (error) {
        res.status(500).json({ message: '取消报名失败', error: error.message });
    }
});

// 审核报名
router.put('/:id/approve/:userId', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const registration = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.params.userId
            }
        });
        if (!registration) {
            return res.status(404).json({ message: '报名记录不存在' });
        }

        // 获取活动信息
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 更新报名状态
        await registration.update({
            status: 'approved',
            approvedBy: req.user.id,
            approvedAt: new Date(),
            approvalComment: req.body.comment || ''
        });

        // 发送系统通知给志愿者
        await Notification.create({
            userId: req.params.userId,
            title: '活动报名审核通过',
            content: `您报名的活动"${activity.title}"已通过审核，您已成功成为该活动的参与者。\n审核备注：${req.body.comment || '无'}`,
            type: 'activity',
            relatedId: req.params.id
        });

        res.status(200).json({ message: '审核通过' });
    } catch (error) {
        res.status(500).json({ message: '审核失败', error: error.message });
    }
});

// 获取用户参与的活动
router.get('/user/participated', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Activity,
                    as: 'activities',
                    through: { attributes: ['status', 'created_at', 'signInTime', 'signOutTime', 'duration'] },
                    include: [
                        { model: User, as: 'organizer', attributes: ['id', 'name'] },
                        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                    ]
                }
            ]
        });
        res.status(200).json(user.activities);
    } catch (error) {
        res.status(500).json({ message: '获取活动记录失败', error: error.message });
    }
});

// 活动签到
router.post('/:id/signin', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名该活动
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.user.id
            }
        });

        if (!participant) {
            return res.status(400).json({ message: '您未报名该活动' });
        }

        // 检查是否已签到
        if (participant.signInTime) {
            return res.status(400).json({ message: '您已签到' });
        }

        // 更新签到时间
        await participant.update({
            signInTime: new Date(),
            status: 'approved' // 签到时自动通过报名
        });

        res.status(200).json({ message: '签到成功' });
    } catch (error) {
        res.status(500).json({ message: '签到失败', error: error.message });
    }
});

// 活动签退
router.post('/:id/signout', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名该活动
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.user.id
            }
        });

        if (!participant) {
            return res.status(400).json({ message: '您未报名该活动' });
        }

        // 检查是否已签到
        if (!participant.signInTime) {
            return res.status(400).json({ message: '您尚未签到' });
        }

        // 检查是否已签退
        if (participant.signOutTime) {
            return res.status(400).json({ message: '您已签退' });
        }

        // 计算服务时长（小时）
        const signInTime = new Date(participant.signInTime);
        const signOutTime = new Date();
        const durationMs = signOutTime - signInTime;
        const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10; // 保留一位小数

        // 更新签退时间和服务时长
        await participant.update({
            signOutTime: signOutTime,
            duration: durationHours
        });

        // 更新用户的志愿时长
        const user = await User.findByPk(req.user.id);
        await user.increment('volunteerHours', { by: durationHours });

        res.status(200).json({ 
            message: '签退成功',
            duration: durationHours 
        });
    } catch (error) {
        res.status(500).json({ message: '签退失败', error: error.message });
    }
});

// 服务记录确认
router.put('/:id/confirm', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查用户是否已报名该活动
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.user.id
            }
        });

        if (!participant) {
            return res.status(400).json({ message: '您未报名该活动' });
        }

        // 检查是否已签退
        if (!participant.signOutTime) {
            return res.status(400).json({ message: '您尚未签退' });
        }

        // 检查是否已确认
        if (participant.confirmed) {
            return res.status(400).json({ message: '您已确认服务记录' });
        }

        // 更新确认状态
        await participant.update({
            confirmed: true
        });

        res.status(200).json({ message: '服务记录确认成功' });
    } catch (error) {
        res.status(500).json({ message: '服务记录确认失败', error: error.message });
    }
});

// 活动数据统计
router.get('/:id/stats', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权查看该活动统计数据' });
        }

        // 获取活动参与者
        const participants = await ActivityParticipant.findAll({
            where: {
                activityId: req.params.id
            },
            include: [{ model: User, as: 'user' }]
        });

        // 基础统计
        const totalRegistered = participants.length;
        const totalAttended = participants.filter(p => p.signInTime).length;
        const totalCompleted = participants.filter(p => p.signOutTime).length;

        // 性别统计
        const genderStats = {
            male: participants.filter(p => p.user.gender === 'male').length,
            female: participants.filter(p => p.user.gender === 'female').length,
            other: participants.filter(p => p.user.gender === 'other').length
        };

        // 年龄分布统计
        const ageGroups = {
            '18-25': 0,
            '26-35': 0,
            '36-45': 0,
            '46-55': 0,
            '56+': 0
        };

        participants.forEach(p => {
            const age = p.user.age;
            if (age >= 18 && age <= 25) ageGroups['18-25']++;
            else if (age >= 26 && age <= 35) ageGroups['26-35']++;
            else if (age >= 36 && age <= 45) ageGroups['36-45']++;
            else if (age >= 46 && age <= 55) ageGroups['46-55']++;
            else if (age >= 56) ageGroups['56+']++;
        });

        // 服务时长统计
        const totalDuration = participants.reduce((sum, p) => sum + (p.duration || 0), 0);
        const avgDuration = totalCompleted > 0 ? totalDuration / totalCompleted : 0;

        // 状态统计
        const statusStats = {
            pending: participants.filter(p => p.status === 'pending').length,
            approved: participants.filter(p => p.status === 'approved').length,
            rejected: participants.filter(p => p.status === 'rejected').length,
            attended: totalAttended,
            completed: totalCompleted
        };

        res.status(200).json({
            activityId: activity.id,
            activityTitle: activity.title,
            totalRegistered,
            totalAttended,
            totalCompleted,
            totalDuration,
            avgDuration: parseFloat(avgDuration.toFixed(1)),
            genderStats,
            ageGroups,
            statusStats
        });
    } catch (error) {
        res.status(500).json({ message: '获取活动统计数据失败', error: error.message });
    }
});

// 管理员获取待审核活动列表
router.get('/admin/pending', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: {
                status: 'draft' // 假设草稿状态的活动需要审核
            },
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: '获取待审核活动列表失败', error: error.message });
    }
});

// 管理员审核活动
router.put('/admin/:id/status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 更新活动状态
        await activity.update({
            status: req.body.status // 可以是 'recruiting', 'rejected' 等
        });

        res.status(200).json({ message: '活动审核成功', activity });
    } catch (error) {
        res.status(500).json({ message: '活动审核失败', error: error.message });
    }
});

// 获取长期项目列表
router.get('/long-term', async (req, res) => {
    try {
        const activities = await Activity.findAll({
            where: {
                isLongTerm: true
            },
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(activities);
    } catch (error) {
        res.status(500).json({ message: '获取长期项目列表失败', error: error.message });
    }
});

// 创建长期项目
router.post('/long-term', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.create({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            organizerId: req.user.id,
            organizationId: req.body.organizationId,
            status: req.body.status || 'draft',
            requirements: req.body.requirements,
            isLongTerm: true,
            recurrence: req.body.recurrence
        });

        res.status(201).json({ message: '长期项目创建成功', activity });
    } catch (error) {
        res.status(500).json({ message: '创建长期项目失败', error: error.message });
    }
});

// 更新长期项目
router.put('/long-term/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '长期项目不存在' });
        }

        // 检查是否是活动组织者或管理员
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该长期项目' });
        }

        // 确保更新的是长期项目
        if (!activity.isLongTerm) {
            return res.status(400).json({ message: '该活动不是长期项目' });
        }

        await activity.update({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            status: req.body.status,
            requirements: req.body.requirements,
            recurrence: req.body.recurrence
        });

        res.status(200).json({ message: '长期项目更新成功', activity });
    } catch (error) {
        res.status(500).json({ message: '更新长期项目失败', error: error.message });
    }
});

// 删除长期项目
router.delete('/long-term/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '长期项目不存在' });
        }

        // 检查是否是活动组织者或管理员
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权删除该长期项目' });
        }

        // 确保删除的是长期项目
        if (!activity.isLongTerm) {
            return res.status(400).json({ message: '该活动不是长期项目' });
        }

        await activity.destroy();
        res.status(200).json({ message: '长期项目删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除长期项目失败', error: error.message });
    }
});

// 批量生成活动实例
router.post('/long-term/:id/generate', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const { startDate, endDate } = req.body;
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '长期项目不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作该长期项目' });
        }

        // 确保是长期项目
        if (!activity.isLongTerm) {
            return res.status(400).json({ message: '该活动不是长期项目' });
        }

        // 检查重复规则
        if (!activity.recurrence) {
            return res.status(400).json({ message: '该长期项目没有设置重复规则' });
        }

        const start = new Date(startDate || activity.startTime);
        const end = new Date(endDate || activity.endTime);
        const activitiesToCreate = [];
        let currentDate = new Date(start);

        // 根据重复规则生成活动实例
        while (isBefore(currentDate, end)) {
            // 生成活动实例
            activitiesToCreate.push({
                title: activity.title,
                description: activity.description,
                type: activity.type,
                startTime: new Date(currentDate),
                endTime: new Date(currentDate.setHours(activity.endTime.getHours(), activity.endTime.getMinutes(), activity.endTime.getSeconds())),
                location: activity.location,
                quota: activity.quota,
                organizerId: activity.organizerId,
                organizationId: activity.organizationId,
                status: activity.status,
                requirements: activity.requirements,
                images: activity.images,
                isLongTerm: false, // 生成的是普通活动实例
                parentActivityId: activity.id // 添加父活动ID，用于关联长期项目
            });

            // 根据重复规则更新当前日期
            if (activity.recurrence === 'daily') {
                currentDate = addDays(currentDate, 1);
            } else if (activity.recurrence === 'weekly') {
                currentDate = addWeeks(currentDate, 1);
            } else if (activity.recurrence === 'monthly') {
                currentDate = addMonths(currentDate, 1);
            } else {
                break; // 不支持的重复规则
            }
        }

        // 批量创建活动实例
        const createdActivities = await Activity.bulkCreate(activitiesToCreate);

        res.status(200).json({
            message: '活动实例生成成功',
            generatedCount: createdActivities.length,
            activities: createdActivities
        });
    } catch (error) {
        res.status(500).json({ message: '生成活动实例失败', error: error.message });
    }
});

// 查看长期项目生成的活动实例
router.get('/long-term/:id/instances', async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '长期项目不存在' });
        }

        // 确保是长期项目
        if (!activity.isLongTerm) {
            return res.status(400).json({ message: '该活动不是长期项目' });
        }

        // 获取该长期项目生成的所有活动实例
        const instances = await Activity.findAll({
            where: {
                parentActivityId: activity.id
            },
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['startTime', 'ASC']]
        });

        res.status(200).json({
            parentActivity: {
                id: activity.id,
                title: activity.title,
                recurrence: activity.recurrence
            },
            instances: instances,
            total: instances.length
        });
    } catch (error) {
        res.status(500).json({ message: '获取活动实例失败', error: error.message });
    }
});

// 给志愿者评价
router.put('/:id/evaluate/:userId', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权评价该志愿者' });
        }

        // 获取参与者记录
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.params.userId
            }
        });

        if (!participant) {
            return res.status(404).json({ message: '参与者记录不存在' });
        }

        // 更新评价
        await participant.update({
            rating: req.body.rating,
            comment: req.body.comment
        });

        res.status(200).json({ message: '评价成功' });
    } catch (error) {
        res.status(500).json({ message: '评价失败', error: error.message });
    }
});

// 获取志愿者的评价
router.get('/:id/evaluations/:userId', authMiddleware, async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 获取参与者记录
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.params.userId
            },
            attributes: ['rating', 'comment', 'updatedAt']
        });

        if (!participant) {
            return res.status(404).json({ message: '参与者记录不存在' });
        }

        res.status(200).json(participant);
    } catch (error) {
        res.status(500).json({ message: '获取评价失败', error: error.message });
    }
});

// 获取活动所有参与者的评价
router.get('/:id/evaluations', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权查看该活动的评价' });
        }

        // 获取所有参与者记录
        const participants = await ActivityParticipant.findAll({
            where: {
                activityId: req.params.id
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name']
            }],
            attributes: ['userId', 'rating', 'comment', 'updatedAt']
        });

        res.status(200).json(participants);
    } catch (error) {
        res.status(500).json({ message: '获取评价列表失败', error: error.message });
    }
});

// 获取活动的报名记录列表
router.get('/:id/participants', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return errorResponse(res, '活动不存在', 404);
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权查看该活动的报名记录', 403);
        }

        // 构建查询条件
        const whereCondition = {
            activityId: req.params.id
        };
        
        // 构建用户查询条件
        const userWhereCondition = {};
        
        // 根据状态过滤
        if (req.query.status) {
            whereCondition.status = req.query.status;
        }
        
        // 根据志愿者姓名搜索
        if (req.query.name) {
            userWhereCondition.name = {
                [Op.like]: `%${req.query.name}%`
            };
        }
        
        // 根据志愿者手机号搜索
        if (req.query.phone) {
            userWhereCondition.phone = {
                [Op.like]: `%${req.query.phone}%`
            };
        }
        
        // 根据报名时间范围过滤
        if (req.query.startTime) {
            whereCondition.createdAt = {
                [Op.gte]: new Date(req.query.startTime)
            };
        }
        
        if (req.query.endTime) {
            whereCondition.createdAt = {
                ...whereCondition.createdAt,
                [Op.lte]: new Date(req.query.endTime)
            };
        }
        
        // 分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        // 排序参数
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';
        
        // 获取报名记录
        const { count, rows } = await ActivityParticipant.findAndCountAll({
            where: whereCondition,
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'phone', 'email', 'gender', 'age'],
                where: userWhereCondition
            }],
            order: [[sortBy, sortOrder]],
            limit: limit,
            offset: offset,
            // 添加索引，提高查询性能
            indexes: [
                ['activityId', 'userId'],
                ['activityId', 'status'],
                ['activityId', 'createdAt']
            ]
        });
        
        const participants = rows.map(p => ({
            volunteerId: p.user.id,
            volunteerName: p.user.name,
            contactInfo: {
                phone: p.user.phone,
                email: p.user.email
            },
            registrationTime: p.createdAt,
            status: p.status,
            signInTime: p.signInTime,
            signOutTime: p.signOutTime,
            duration: p.duration,
            confirmed: p.confirmed,
            gender: p.user.gender,
            age: p.user.age
        }));

        paginationResponse(res, participants, {
            total: count,
            page: page,
            pageSize: limit,
            totalPages: Math.ceil(count / limit)
        }, '获取报名记录成功');
    } catch (error) {
        errorResponse(res, '获取报名记录失败', 500, error.message);
    }
});

// 拒绝活动报名请求
router.put('/:id/participants/:userId/reject', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作该活动' });
        }

        // 获取报名记录
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: req.params.id,
                userId: req.params.userId
            }
        });

        if (!participant) {
            return res.status(404).json({ message: '报名记录不存在' });
        }

        // 更新报名状态为拒绝
        await participant.update({
            status: 'rejected',
            approvedBy: req.user.id,
            approvedAt: new Date(),
            approvalComment: req.body.comment || ''
        });

        // 发送系统通知给志愿者
        await Notification.create({
            userId: req.params.userId,
            title: '活动报名审核未通过',
            content: `您报名的活动"${activity.title}"未通过审核。\n拒绝原因：${req.body.comment || '无'}`,
            type: 'activity',
            relatedId: req.params.id
        });

        res.status(200).json({ message: '报名已拒绝' });
    } catch (error) {
        res.status(500).json({ message: '拒绝报名失败', error: error.message });
    }
});

// 批量审核活动报名
router.put('/:id/participants/batch-approve', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作该活动' });
        }

        const { userIds, comment } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ message: '请提供有效的用户ID列表' });
        }

        // 批量更新报名状态为通过
        await ActivityParticipant.update(
            {
                status: 'approved',
                approvedBy: req.user.id,
                approvedAt: new Date(),
                approvalComment: comment || ''
            },
            {
                where: {
                    activityId: req.params.id,
                    userId: {
                        [Op.in]: userIds
                    }
                }
            }
        );

        // 批量发送系统通知给志愿者
        const notifications = userIds.map(userId => ({
            userId,
            title: '活动报名审核通过',
            content: `您报名的活动"${activity.title}"已通过审核，您已成功成为该活动的参与者。\n审核备注：${comment || '无'}`,
            type: 'activity',
            relatedId: req.params.id
        }));
        await Notification.bulkCreate(notifications);

        res.status(200).json({ message: '批量审核通过成功' });
    } catch (error) {
        res.status(500).json({ message: '批量审核失败', error: error.message });
    }
});

// 批量拒绝活动报名
router.put('/:id/participants/batch-reject', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作该活动' });
        }

        const { userIds, comment } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ message: '请提供有效的用户ID列表' });
        }

        // 批量更新报名状态为拒绝
        await ActivityParticipant.update(
            {
                status: 'rejected',
                approvedBy: req.user.id,
                approvedAt: new Date(),
                approvalComment: comment || ''
            },
            {
                where: {
                    activityId: req.params.id,
                    userId: {
                        [Op.in]: userIds
                    }
                }
            }
        );

        // 批量发送系统通知给志愿者
        const notifications = userIds.map(userId => ({
            userId,
            title: '活动报名审核未通过',
            content: `您报名的活动"${activity.title}"未通过审核。\n拒绝原因：${comment || '无'}`,
            type: 'activity',
            relatedId: req.params.id
        }));
        await Notification.bulkCreate(notifications);

        res.status(200).json({ message: '批量拒绝成功' });
    } catch (error) {
        res.status(500).json({ message: '批量拒绝失败', error: error.message });
    }
});

// 上传活动图片
router.post('/:id/upload', authMiddleware, roleMiddleware(['organizer', 'admin']), upload.single('image'), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        if (!req.file) {
            return res.status(400).json({ message: '未提供图片文件' });
        }

        // 构建图片URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 获取当前图片列表
        const currentImages = activity.images || [];
        
        // 添加新图片
        currentImages.push(imageUrl);
        
        // 更新活动图片
        await activity.update({ images: currentImages });
        
        res.status(200).json({ 
            message: '图片上传成功', 
            imageUrl: imageUrl,
            images: currentImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片上传失败', error: error.message });
    }
});

// 删除活动图片
router.delete('/:id/images/:imageUrl', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 获取当前图片列表
        const currentImages = activity.images || [];
        
        // 删除指定图片
        const updatedImages = currentImages.filter(image => image !== req.params.imageUrl);
        
        // 更新活动图片
        await activity.update({ images: updatedImages });
        
        res.status(200).json({ 
            message: '图片删除成功',
            images: updatedImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片删除失败', error: error.message });
    }
});

// 导出活动报名记录
router.get('/:id/export', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return errorResponse(res, '活动不存在', 404);
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权导出该活动记录', 403);
        }

        // 获取导出格式，默认为CSV
        const format = req.query.format || 'csv';
        
        // 获取活动参与者
        const participants = await ActivityParticipant.findAll({
            where: {
                activityId: req.params.id
            },
            include: [{ model: User, as: 'user' }],
            order: [['createdAt', 'ASC']]
        });

        // 准备数据
        const exportData = participants.map(p => ({
            '用户ID': p.userId,
            '姓名': p.user.name,
            '手机号': p.user.phone,
            '邮箱': p.user.email,
            '性别': p.user.gender,
            '年龄': p.user.age,
            '报名状态': p.status,
            '报名时间': p.createdAt.toLocaleString(),
            '签到时间': p.signInTime ? p.signInTime.toLocaleString() : '未签到',
            '签退时间': p.signOutTime ? p.signOutTime.toLocaleString() : '未签退',
            '服务时长（小时）': p.duration || 0,
            '是否确认': p.confirmed ? '是' : '否'
        }));

        const path = require('path');
        const fs = require('fs');
        
        // 确保temp目录存在
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // 根据格式导出
        if (format === 'excel') {
            // 导出为Excel格式
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('活动报名记录');
            
            // 设置列标题
            const headers = Object.keys(exportData[0]);
            worksheet.columns = headers.map(header => ({
                header: header,
                key: header,
                width: 20
            }));
            
            // 添加数据行
            exportData.forEach(row => {
                worksheet.addRow(row);
            });
            
            // 生成文件名
            const fileName = `activity-${activity.id}-participants-${Date.now()}.xlsx`;
            const filePath = path.join(tempDir, fileName);
            
            // 写入文件
            await workbook.xlsx.writeFile(filePath);
            
            // 发送Excel文件
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            // 删除临时文件
            fileStream.on('end', () => {
                fs.unlinkSync(filePath);
            });
        } else {
            // 导出为CSV格式（原有功能）
            const { createObjectCsvWriter } = require('csv-writer');
            const fileName = `activity-${activity.id}-participants-${Date.now()}.csv`;
            const filePath = path.join(tempDir, fileName);
            
            const csvWriter = createObjectCsvWriter({
                path: filePath,
                header: Object.keys(exportData[0]).map(key => ({ id: key, title: key }))
            });
            
            await csvWriter.writeRecords(exportData);
            
            // 发送CSV文件
            res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-Type', 'text/csv');
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
            
            // 删除临时文件
            fileStream.on('end', () => {
                fs.unlinkSync(filePath);
            });
        }
    } catch (error) {
        errorResponse(res, '导出失败', 500, error.message);
    }
});

// 获取活动关联的培训
router.get('/:id/trainings', async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id, {
            include: [{
                model: Training,
                as: 'requiredTrainings',
                through: {
                    attributes: ['isRequired']
                },
                include: [
                    { model: User, as: 'organizer', attributes: ['id', 'name'] },
                    { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                ]
            }]
        });
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }
        res.status(200).json(activity.requiredTrainings);
    } catch (error) {
        res.status(500).json({ message: '获取活动培训失败', error: error.message });
    }
});

// 为活动关联培训
router.post('/:id/trainings', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        const { trainingId, isRequired } = req.body;
        
        // 检查培训是否存在
        const training = await Training.findByPk(trainingId);
        if (!training) {
            return res.status(404).json({ message: '培训不存在' });
        }

        // 检查是否已关联
        const existingRelation = await ActivityTraining.findOne({
            where: {
                activityId: req.params.id,
                trainingId: trainingId
            }
        });
        
        if (existingRelation) {
            return res.status(400).json({ message: '该培训已关联到活动' });
        }

        // 关联培训
        await ActivityTraining.create({
            activityId: req.params.id,
            trainingId: trainingId,
            isRequired: isRequired || false
        });

        res.status(200).json({ message: '培训关联成功' });
    } catch (error) {
        res.status(500).json({ message: '关联培训失败', error: error.message });
    }
});

// 更新活动培训关联
router.put('/:id/trainings/:trainingId', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 检查关联是否存在
        const relation = await ActivityTraining.findOne({
            where: {
                activityId: req.params.id,
                trainingId: req.params.trainingId
            }
        });
        
        if (!relation) {
            return res.status(404).json({ message: '培训未关联到该活动' });
        }

        // 更新关联信息
        await relation.update({
            isRequired: req.body.isRequired
        });

        res.status(200).json({ message: '培训关联更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新培训关联失败', error: error.message });
    }
});

// 提交活动总结
router.post('/:id/summary', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 检查活动状态，只有已完成的活动才能提交总结
        if (activity.status !== 'completed') {
            return res.status(400).json({ message: '只有已完成的活动才能提交总结' });
        }

        // 更新活动总结
        await activity.update({ summary: req.body.summary });

        res.status(200).json({ message: '活动总结提交成功', summary: req.body.summary });
    } catch (error) {
        res.status(500).json({ message: '提交活动总结失败', error: error.message });
    }
});

// 更新活动总结
router.put('/:id/summary', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 更新活动总结
        await activity.update({ summary: req.body.summary });

        res.status(200).json({ message: '活动总结更新成功', summary: req.body.summary });
    } catch (error) {
        res.status(500).json({ message: '更新活动总结失败', error: error.message });
    }
});

// 获取活动总结
router.get('/:id/summary', async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id, {
            attributes: ['id', 'title', 'summary']
        });
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        res.status(200).json({ summary: activity.summary });
    } catch (error) {
        res.status(500).json({ message: '获取活动总结失败', error: error.message });
    }
});

// 消息群发
router.post('/:id/message', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const { title, content, participantStatus } = req.body;
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权操作该活动' });
        }

        // 构建查询条件
        const whereCondition = {
            activityId: req.params.id
        };
        
        // 根据参与者状态过滤
        if (participantStatus) {
            whereCondition.status = participantStatus;
        }

        // 获取符合条件的参与者
        const participants = await ActivityParticipant.findAll({
            where: whereCondition,
            attributes: ['userId']
        });

        if (participants.length === 0) {
            return res.status(400).json({ message: '没有符合条件的参与者' });
        }

        // 批量创建通知
        const notifications = participants.map(participant => ({
            userId: participant.userId,
            title: title,
            content: content,
            type: 'activity',
            relatedId: activity.id
        }));

        await Notification.bulkCreate(notifications);

        res.status(200).json({ 
            message: '消息群发成功', 
            sentCount: notifications.length 
        });
    } catch (error) {
        res.status(500).json({ message: '消息群发失败', error: error.message });
    }
});

// 移除活动培训关联
router.delete('/:id/trainings/:trainingId', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 检查关联是否存在
        const relation = await ActivityTraining.findOne({
            where: {
                activityId: req.params.id,
                trainingId: req.params.trainingId
            }
        });
        
        if (!relation) {
            return res.status(404).json({ message: '培训未关联到该活动' });
        }

        // 删除关联
        await relation.destroy();

        res.status(200).json({ message: '培训关联已移除' });
    } catch (error) {
        res.status(500).json({ message: '移除培训关联失败', error: error.message });
    }
});

// 获取活动签到和签退二维码
router.get('/:id/qrcode', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const activity = await Activity.findByPk(req.params.id);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权访问该活动' });
        }

        res.status(200).json({
            message: '获取二维码成功',
            signInQrCode: activity.qrCode || null,
            signOutQrCode: activity.signOutQrCode || null
        });
    } catch (error) {
        res.status(500).json({ message: '获取二维码失败', error: error.message });
    }
});

// 生成活动二维码（签到/签退）
router.post('/:id/qrcode', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const { type = 'signIn' } = req.body;
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 验证二维码类型
        if (!['signIn', 'signOut'].includes(type)) {
            return res.status(400).json({ message: '无效的二维码类型，支持的类型：signIn, signOut' });
        }

        // 生成二维码内容，格式：activity-{id},{type}-{timestamp}
        const qrContent = `activity-${activity.id},${type}-${Date.now()}`;
        
        // 生成二维码
        const qrCodeDataUrl = await qrcode.toDataURL(qrContent);
        
        // 更新活动二维码
        const updateData = {};
        updateData[type === 'signIn' ? 'qrCode' : 'signOutQrCode'] = qrCodeDataUrl;
        
        await activity.update(updateData);
        
        res.status(200).json({ 
            message: `${type === 'signIn' ? '签到' : '签退'}二维码生成成功`, 
            [type === 'signIn' ? 'signInQrCode' : 'signOutQrCode']: qrCodeDataUrl
        });
    } catch (error) {
        res.status(500).json({ message: '二维码生成失败', error: error.message });
    }
});

// 更新活动二维码（签到/签退）
router.put('/:id/qrcode', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const { type = 'signIn' } = req.body;
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 验证二维码类型
        if (!['signIn', 'signOut'].includes(type)) {
            return res.status(400).json({ message: '无效的二维码类型，支持的类型：signIn, signOut' });
        }

        // 生成新的二维码内容，格式：activity-{id},{type}-{timestamp}
        const qrContent = `activity-${activity.id},${type}-${Date.now()}`;
        
        // 生成新的二维码
        const qrCodeDataUrl = await qrcode.toDataURL(qrContent);
        
        // 更新活动二维码
        const updateData = {};
        updateData[type === 'signIn' ? 'qrCode' : 'signOutQrCode'] = qrCodeDataUrl;
        
        await activity.update(updateData);
        
        res.status(200).json({ 
            message: `${type === 'signIn' ? '签到' : '签退'}二维码更新成功`, 
            [type === 'signIn' ? 'signInQrCode' : 'signOutQrCode']: qrCodeDataUrl
        });
    } catch (error) {
        res.status(500).json({ message: '二维码更新失败', error: error.message });
    }
});

// 禁用活动二维码（签到/签退/全部）
router.post('/:id/qrcode/disable', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const { type = 'all' } = req.body;
        const activity = await Activity.findByPk(req.params.id);
        
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }

        // 检查权限
        if (activity.organizerId !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: '无权修改该活动' });
        }

        // 验证二维码类型
        if (!['signIn', 'signOut', 'all'].includes(type)) {
            return res.status(400).json({ message: '无效的二维码类型，支持的类型：signIn, signOut, all' });
        }

        // 清空活动二维码
        const updateData = {};
        if (type === 'signIn' || type === 'all') {
            updateData.qrCode = null;
        }
        if (type === 'signOut' || type === 'all') {
            updateData.signOutQrCode = null;
        }
        
        await activity.update(updateData);
        
        res.status(200).json({ 
            message: `${type === 'all' ? '所有二维码' : type === 'signIn' ? '签到二维码' : '签退二维码'}已禁用`
        });
    } catch (error) {
        res.status(500).json({ message: '二维码禁用失败', error: error.message });
    }
});

module.exports = router;