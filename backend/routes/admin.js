const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { User, Activity, Training, Organization, ActivityParticipant } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');

// 平台数据统计
router.get('/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 统计时间范围
        const timeRange = req.query.timeRange || '7d'; // 默认统计7天内的数据
        let startDate = new Date();
        
        // 设置统计起始时间
        if (timeRange === '7d') {
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeRange === '30d') {
            startDate.setDate(startDate.getDate() - 30);
        } else if (timeRange === '90d') {
            startDate.setDate(startDate.getDate() - 90);
        } else if (timeRange === '1y') {
            startDate.setFullYear(startDate.getFullYear() - 1);
        }
        
        // 志愿者统计
        const totalVolunteers = await User.count({
            where: {
                role: 'volunteer'
            }
        });
        
        const newVolunteers = await User.count({
            where: {
                role: 'volunteer',
                createdAt: {
                    [Op.gte]: startDate
                }
            }
        });
        
        // 组织方统计
        const totalOrganizations = await Organization.count();
        const approvedOrganizations = await Organization.count({
            where: {
                status: 'approved'
            }
        });
        
        // 活动统计
        const totalActivities = await Activity.count();
        const newActivities = await Activity.count({
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            }
        });
        
        // 培训统计
        const totalTrainings = await Training.count();
        const newTrainings = await Training.count({
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            }
        });
        
        // 志愿时长统计
        const totalHours = await ActivityParticipant.sum('duration', {
            where: {
                duration: {
                    [Op.not]: null
                }
            }
        }) || 0;
        
        const recentHours = await ActivityParticipant.sum('duration', {
            where: {
                duration: {
                    [Op.not]: null
                },
                updatedAt: {
                    [Op.gte]: startDate
                }
            }
        }) || 0;
        
        // 参与统计
        const totalParticipants = await ActivityParticipant.count();
        const recentParticipants = await ActivityParticipant.count({
            where: {
                createdAt: {
                    [Op.gte]: startDate
                }
            }
        });
        
        successResponse(res, {
            timeRange,
            volunteerStats: {
                total: totalVolunteers,
                new: newVolunteers
            },
            organizationStats: {
                total: totalOrganizations,
                approved: approvedOrganizations
            },
            activityStats: {
                total: totalActivities,
                new: newActivities
            },
            trainingStats: {
                total: totalTrainings,
                new: newTrainings
            },
            hourStats: {
                total: parseFloat(totalHours.toFixed(1)),
                recent: parseFloat(recentHours.toFixed(1))
            },
            participantStats: {
                total: totalParticipants,
                recent: recentParticipants
            }
        }, '获取平台数据统计成功');
    } catch (error) {
        errorResponse(res, '获取平台数据统计失败', 500, error.message);
    }
});

// 管理员获取所有活动列表
router.get('/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const { count, rows: activities } = await Activity.findAndCountAll({
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, activities, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取活动列表成功');
    } catch (error) {
        errorResponse(res, '获取活动列表失败', 500, error.message);
    }
});

// 管理员获取所有培训列表
router.get('/trainings', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const { count, rows: trainings } = await Training.findAndCountAll({
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, trainings, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取培训列表成功');
    } catch (error) {
        errorResponse(res, '获取培训列表失败', 500, error.message);
    }
});

// 管理员获取待审核组织列表
router.get('/organizations/pending', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const { count, rows: pendingOrganizations } = await Organization.findAndCountAll({
            where: {
                status: 'pending'
            },
            include: [
                { model: User, as: 'users', attributes: ['id', 'name', 'role'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, pendingOrganizations, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取待审核组织列表成功');
    } catch (error) {
        errorResponse(res, '获取待审核组织列表失败', 500, error.message);
    }
});

module.exports = router;