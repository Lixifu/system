const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { User, Organization, Activity, Training, Medal, UserMedal, ActivityParticipant } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const upload = require('../config/upload');

// 导入统一响应格式工具
const { successResponse, errorResponse } = require('../utils/responseFormatter');

// 获取当前用户信息
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            attributes: {
                exclude: ['password'] // 排除密码字段
            }
        });
        
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }

        successResponse(res, user, '获取用户信息成功');
    } catch (error) {
        errorResponse(res, '获取用户信息失败', 500, { error: error.message });
    }
});

// 更新当前用户信息
router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }

        // 排除密码字段，密码更新应该使用专门的接口
        const updateData = { ...req.body };
        delete updateData.password;

        await user.update(updateData);

        // 获取更新后的用户信息，排除密码
        const updatedUser = await User.findByPk(req.user.id, {
            include: [
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            attributes: {
                exclude: ['password']
            }
        });

        // 使用统一响应格式返回结果
        successResponse(res, updatedUser, '用户信息更新成功');
    } catch (error) {
        errorResponse(res, '更新用户信息失败', 500, { error: error.message });
    }
});

// 更新密码
router.put('/password', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 验证旧密码
        const isPasswordValid = await user.comparePassword(req.body.oldPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: '旧密码错误' });
        }

        // 更新密码
        await user.update({ password: req.body.newPassword });

        res.status(200).json({ message: '密码更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新密码失败', error: error.message });
    }
});

// 获取当前用户参加的活动
router.get('/activities', authMiddleware, async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 构建活动查询条件
        const activityWhereCondition = {};
        
        // 根据活动类型过滤
        if (req.query.type) {
            activityWhereCondition.type = req.query.type;
        }
        
        // 根据活动时间范围过滤
        if (req.query.startTime) {
            activityWhereCondition.startTime = {
                [Op.gte]: new Date(req.query.startTime)
            };
        }
        
        if (req.query.endTime) {
            activityWhereCondition.endTime = {
                [Op.lte]: new Date(req.query.endTime)
            };
        }
        
        // 获取活动参与者的状态条件
        const participantWhereCondition = {};
        if (req.query.status) {
            participantWhereCondition.status = req.query.status;
        }
        
        // 使用 ActivityParticipant 模型直接查询，而不是通过 User 关联查询
        // 这样可以更好地处理过滤条件和分页
        const { count, rows: activityParticipants } = await ActivityParticipant.findAndCountAll({
            where: {
                userId: req.user.id,
                ...participantWhereCondition
            },
            include: [
                {
                    model: Activity,
                    as: 'activity', // 关联别名必须与模型定义中的一致
                    include: [
                        { model: User, as: 'organizer', attributes: ['id', 'name'] },
                        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                    ],
                    where: activityWhereCondition
                }
            ],
            attributes: ['status', 'created_at'],
            limit: pageSize,
            offset: offset,
            order: [[{ model: Activity, as: 'activity' }, 'startTime', 'DESC']] // 修复关联别名大小写问题
        });
        
        // 转换数据格式，提取活动信息
        const activities = activityParticipants.map(participant => {
            return {
                ...participant.activity.toJSON(),
                ActivityParticipant: {
                    status: participant.status,
                    created_at: participant.created_at
                }
            };
        });
        
        res.status(200).json({
            data: activities,
            pagination: {
                total: count,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        });
    } catch (error) {
        console.error('获取用户活动失败:', error);
        res.status(500).json({ message: '获取用户活动失败', error: error.message });
    }
});

// 获取当前用户参加的培训
router.get('/trainings', authMiddleware, async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const whereCondition = {};
        
        // 根据培训状态过滤
        if (req.query.status) {
            whereCondition['$trainings.UserTraining.status$'] = req.query.status;
        }
        
        // 根据培训类型过滤
        if (req.query.type) {
            whereCondition['$trainings.type$'] = req.query.type;
        }
        
        // 根据培训时间范围过滤
        if (req.query.startTime) {
            whereCondition['$trainings.startTime$'] = {
                [Op.gte]: new Date(req.query.startTime)
            };
        }
        
        if (req.query.endTime) {
            whereCondition['$trainings.endTime$'] = {
                [Op.lte]: new Date(req.query.endTime)
            };
        }
        
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Training,
                    as: 'trainings',
                    through: {
                        attributes: ['status', 'created_at'],
                        where: req.query.status ? { status: req.query.status } : {}
                    },
                    include: [
                        { model: User, as: 'organizer', attributes: ['id', 'name'] },
                        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                    ],
                    where: whereCondition,
                    limit: pageSize,
                    offset: offset,
                    order: [['startTime', 'DESC']]
                }
            ]
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 获取用户培训总数
        const total = await user.countTrainings({
            where: req.query.status ? { status: req.query.status } : {}
        });

        res.status(200).json({
            data: user.trainings || [],
            pagination: {
                total: total,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取用户培训失败', error: error.message });
    }
});

// 获取当前用户志愿时长
router.get('/hours', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['volunteer_hours']
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.status(200).json({ volunteerHours: user.volunteer_hours });
    } catch (error) {
        res.status(500).json({ message: '获取志愿时长失败', error: error.message });
    }
});

// 管理员获取用户列表
router.get('/list', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        // 构建查询条件
        const whereCondition = {};
        
        // 根据关键词搜索（姓名、邮箱或手机号）
        if (req.query.keyword) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${req.query.keyword}%` } },
                { email: { [Op.like]: `%${req.query.keyword}%` } },
                { phone: { [Op.like]: `%${req.query.keyword}%` } }
            ];
        }
        
        // 根据角色过滤
        if (req.query.role) {
            whereCondition.role = req.query.role;
        }
        
        // 根据组织过滤
        if (req.query.organizationId) {
            whereCondition.organizationId = req.query.organizationId;
        }
        
        // 根据状态过滤
        if (req.query.status) {
            whereCondition.status = req.query.status;
        }

        // 查询用户列表
        const { count, rows: users } = await User.findAndCountAll({
            where: whereCondition,
            include: [
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            attributes: {
                exclude: ['password']
            },
            limit: pageSize,
            offset: offset,
            order: [[req.query.sortBy || 'created_at', req.query.order || 'DESC']]
        });

        res.status(200).json({
            data: users,
            pagination: {
                total: count,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取用户列表失败', error: error.message });
    }
});

// 管理员获取单个用户详情
router.get('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            attributes: {
                exclude: ['password']
            }
        });
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: '获取用户详情失败', error: error.message });
    }
});

// 管理员更新用户信息
router.put('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        // 排除密码字段，密码更新应该使用专门的接口
        const updateData = { ...req.body };
        delete updateData.password;

        await user.update(updateData);

        // 获取更新后的用户信息
        const updatedUser = await User.findByPk(req.params.id, {
            include: [
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            attributes: {
                exclude: ['password']
            }
        });

        res.status(200).json({ message: '用户信息更新成功', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: '更新用户信息失败', error: error.message });
    }
});

// 管理员更新用户角色
router.put('/:id/role', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        await user.update({ role: req.body.role });
        res.status(200).json({ message: '用户角色更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新用户角色失败', error: error.message });
    }
});

// 上传用户头像
router.post('/profile/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: '未提供头像文件' });
        }
        
        // 构建头像URL
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 更新用户头像
        await user.update({ avatar: avatarUrl });
        
        res.status(200).json({ 
            message: '头像上传成功', 
            avatarUrl: avatarUrl
        });
    } catch (error) {
        res.status(500).json({ message: '头像上传失败', error: error.message });
    }
});

// 扫码签到/签退
router.post('/sign', authMiddleware, async (req, res) => {
    try {
        const { qrCode } = req.body;
        
        // 解析二维码内容
        const [activityIdStr, actionStr] = qrCode.split(',');
        
        if (!activityIdStr || !actionStr) {
            return res.status(400).json({ message: '二维码格式错误' });
        }
        
        // 提取活动ID
        const activityId = parseInt(activityIdStr.replace('activity-', ''));
        if (isNaN(activityId)) {
            return res.status(400).json({ message: '二维码格式错误，活动ID无效' });
        }
        
        // 提取操作类型，处理带有时间戳的情况（如signIn-1234567890）
        let action;
        if (actionStr.startsWith('signIn')) {
            action = 'signIn';
        } else if (actionStr.startsWith('signOut')) {
            action = 'signOut';
        } else {
            return res.status(400).json({ message: '二维码格式错误，操作类型无效' });
        }
        
        // 检查活动是否存在
        const activity = await Activity.findByPk(activityId);
        if (!activity) {
            return res.status(404).json({ message: '活动不存在' });
        }
        
        // 检查用户是否已报名该活动
        const participant = await ActivityParticipant.findOne({
            where: {
                activityId: activityId,
                userId: req.user.id
            }
        });
        
        if (!participant) {
            return res.status(400).json({ message: '您未报名该活动' });
        }
        
        // 根据action执行签到或签退
        if (action === 'signIn') {
            // 检查是否已签到
            if (participant.signInTime) {
                return res.status(400).json({ message: '您已签到' });
            }
            
            // 更新签到时间
            await participant.update({
                signInTime: new Date(),
                status: 'approved' // 签到时自动通过报名
            });
            
            res.status(200).json({ status: 'success', message: '签到成功' });
        } else if (action === 'signOut') {
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
            if (user) {
                const currentHours = user.volunteer_hours || 0;
                await user.update({
                    volunteer_hours: currentHours + durationHours
                });
            }
            
            res.status(200).json({ status: 'success', message: '签退成功，服务时长已更新' });
        } else {
            return res.status(400).json({ message: '二维码格式错误，操作类型无效' });
        }
    } catch (error) {
        console.error('扫码签到/签退失败:', error);
        res.status(500).json({ message: '扫码签到/签退失败', error: error.message });
    }
});

// 获取志愿者勋章
router.get('/medals', authMiddleware, async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const whereCondition = {};
        
        // 根据勋章分类过滤
        if (req.query.category) {
            whereCondition['$medals.category$'] = req.query.category;
        }
        
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Medal,
                    as: 'medals',
                    through: {
                        attributes: ['createdAt'],
                        order: [['createdAt', 'DESC']],
                        limit: pageSize,
                        offset: offset
                    },
                    where: whereCondition
                }
            ]
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 获取用户勋章总数
        const total = await UserMedal.count({
            where: {
                userId: req.user.id
            }
        });

        res.status(200).json({
            data: user.medals || [],
            pagination: {
                total: total,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取志愿者勋章失败', error: error.message });
    }
});

// 获取志愿者履历
router.get('/resume', authMiddleware, async (req, res) => {
    try {
        // 获取用户基本信息
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Organization, as: 'organization', attributes: ['id', 'name']
                }
            ],
            attributes: {
                exclude: ['password']
            }
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 计算总志愿时长
        const totalHours = await ActivityParticipant.sum('duration', {
            where: {
                userId: req.user.id,
                duration: {
                    [Op.not]: null
                }
            }
        }) || 0;
        
        // 获取最近的活动参与记录
        const recentActivities = await ActivityParticipant.findAll({
            where: {
                userId: req.user.id
            },
            include: [
                {
                    model: Activity,
                    include: [
                        { model: User, as: 'organizer', attributes: ['id', 'name'] },
                        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        // 获取最近获得的勋章
        const recentMedals = await UserMedal.findAll({
            where: {
                userId: req.user.id
            },
            include: [
                { model: Medal }
            ],
            order: [['createdAt', 'DESC']],
            limit: 5
        });
        
        // 获取志愿时长统计（按月份）
        const hoursByMonth = await ActivityParticipant.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalHours']
            ],
            where: {
                userId: req.user.id,
                duration: { [Op.not]: null }
            },
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'DESC']],
            limit: 6
        });
        
        // 获取活动参与统计
        const activityStats = await ActivityParticipant.findAll({
            attributes: [
                ['status', 'status'],
                [sequelize.fn('COUNT', sequelize.col('status')), 'count']
            ],
            where: {
                userId: req.user.id
            },
            group: ['status']
        });
        
        res.status(200).json({
            user: user,
            totalVolunteerHours: totalHours,
            recentActivities: recentActivities,
            recentMedals: recentMedals,
            hoursByMonth: hoursByMonth,
            activityStats: activityStats
        });
    } catch (error) {
        res.status(500).json({ message: '获取志愿者履历失败', error: error.message });
    }
});

// 获取组织方仪表盘数据
router.get('/dashboard/organizer', authMiddleware, roleMiddleware(['organizer']), async (req, res) => {
    try {
        // 获取当前用户
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 计算总活动数
        const totalActivities = await Activity.count({
            where: {
                organizerId: user.id
            }
        });
        
        // 计算总培训数
        const totalTrainings = await Training.count({
            where: {
                organizerId: user.id
            }
        });
        
        // 计算已报名志愿者总数（唯一志愿者数量）
        // 先获取用户组织的所有活动ID
        const userActivities = await Activity.findAll({
            attributes: ['id'],
            where: {
                organizerId: user.id
            }
        });
        const activityIds = userActivities.map(activity => activity.id);
        
        // 然后统计这些活动中不重复的唯一用户数量
        let totalRegisteredVolunteers = 0;
        if (activityIds.length > 0) {
            // 使用GROUP BY和COUNT来统计唯一用户
            const uniqueVolunteers = await ActivityParticipant.findAll({
                attributes: ['user_id'],
                where: {
                    activityId: activityIds
                },
                group: ['user_id']
            });
            totalRegisteredVolunteers = uniqueVolunteers.length;
        }
        
        // 计算本月新增活动数
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const newActivitiesThisMonth = await Activity.count({
            where: {
                organizerId: user.id,
                createdAt: {
                    [Op.gte]: startOfMonth
                }
            }
        });
        
        // 返回仪表盘数据
        res.status(200).json({
            totalActivities: totalActivities,
            totalTrainings: totalTrainings,
            totalRegisteredVolunteers: totalRegisteredVolunteers,
            newActivitiesThisMonth: newActivitiesThisMonth
        });
    } catch (error) {
        res.status(500).json({ message: '获取仪表盘数据失败', error: error.message });
    }
});

module.exports = router;