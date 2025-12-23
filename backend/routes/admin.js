const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const models = require('../models');
const { User, Activity, Training, Organization, ActivityParticipant, TrainingParticipant, Backup } = models;
const sequelize = models.sequelize;
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');
const { createFullBackup, restoreBackup, deleteBackup, exportTableData } = require('../utils/backupUtils');
const fs = require('fs');
const path = require('path');

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

// ==================== 数据备份与恢复接口 ====================

// 创建数据备份
router.post('/data/backup', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const backup = await createFullBackup();
        successResponse(res, backup, '数据备份创建成功');
    } catch (error) {
        errorResponse(res, '创建数据备份失败', 500, error.message);
    }
});

// 获取备份历史
router.get('/data/backup/history', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const { count, rows: backups } = await Backup.findAndCountAll({
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, backups, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取备份历史成功');
    } catch (error) {
        errorResponse(res, '获取备份历史失败', 500, error.message);
    }
});

// 恢复数据备份
router.post('/data/backup/:id/restore', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const backupId = req.params.id;
        const result = await restoreBackup(backupId);
        successResponse(res, result, '数据备份恢复成功');
    } catch (error) {
        errorResponse(res, '恢复数据备份失败', 500, error.message);
    }
});

// 删除数据备份
router.delete('/data/backup/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const backupId = req.params.id;
        const result = await deleteBackup(backupId);
        successResponse(res, result, '数据备份删除成功');
    } catch (error) {
        errorResponse(res, '删除数据备份失败', 500, error.message);
    }
});

// 下载数据备份
router.get('/data/backup/:id/download', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const backupId = req.params.id;
        
        // 获取备份记录
        const backup = await Backup.findByPk(backupId);
        if (!backup) {
            return errorResponse(res, '备份不存在', 404);
        }
        
        // 检查备份文件是否存在
        const backupPath = backup.path;
        if (!fs.existsSync(backupPath)) {
            return errorResponse(res, '备份文件不存在', 404);
        }
        
        // 下载备份文件
        res.download(backupPath, path.basename(backupPath), (err) => {
            if (err) {
                console.error('下载备份文件失败:', err);
                errorResponse(res, '下载备份文件失败', 500, err.message);
            }
        });
    } catch (error) {
        console.error('下载备份失败:', error);
        errorResponse(res, '下载备份失败', 500, error.message);
    }
});

// ==================== 统计分析接口 ====================

// 用户统计报告
router.get('/stats/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 总用户数
        const totalUsers = await User.count();
        
        // 按角色统计
        const usersByRole = await User.findAll({
            attributes: [
                'role',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['role']
        });
        
        // 按月份注册统计
        const usersByMonth = await User.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 志愿者参与情况
        const volunteerParticipation = await User.count({
            include: [
                {
                    model: Activity,
                    as: 'activities',
                    through: { attributes: [] }
                }
            ],
            where: {
                '$activities.id$': {
                    [Op.not]: null
                },
                role: 'volunteer'
            },
            distinct: true
        });
        
        successResponse(res, {
            total: totalUsers,
            byRole: usersByRole,
            byMonth: usersByMonth,
            volunteerParticipation: volunteerParticipation
        }, '获取用户统计报告成功');
    } catch (error) {
        errorResponse(res, '获取用户统计报告失败', 500, error.message);
    }
});

// 活动统计报告
router.get('/stats/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 总活动数
        const totalActivities = await Activity.count();
        
        // 按状态统计
        const activitiesByStatus = await Activity.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });
        
        // 按月份创建统计
        const activitiesByMonth = await Activity.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 总参与人数
        const totalParticipants = await ActivityParticipant.count();
        
        // 计算平均参与人数（使用子查询）
        const avgParticipantsResult = await sequelize.query(`
            SELECT AVG(participant_count) as avgParticipants 
            FROM (
                SELECT COUNT(user_id) as participant_count 
                FROM activity_participants 
                GROUP BY activity_id
            ) as participant_counts
        `, { type: sequelize.QueryTypes.SELECT });
        
        const avgParticipants = avgParticipantsResult.length > 0 ? parseFloat(avgParticipantsResult[0].avgParticipants) : 0;
        
        successResponse(res, {
            total: totalActivities,
            byStatus: activitiesByStatus,
            byMonth: activitiesByMonth,
            avgParticipants: avgParticipants,
            totalParticipants: totalParticipants
        }, '获取活动统计报告成功');
    } catch (error) {
        errorResponse(res, '获取活动统计报告失败', 500, error.message);
    }
});

// 培训统计报告
router.get('/stats/trainings', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 总培训数
        const totalTrainings = await Training.count();
        
        // 按状态统计
        const trainingsByStatus = await Training.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });
        
        // 按月份创建统计
        const trainingsByMonth = await Training.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 总参与人数
        const totalParticipants = await TrainingParticipant.count();
        
        // 计算平均参与人数（使用子查询）
        const avgParticipantsResult = await sequelize.query(`
            SELECT AVG(participant_count) as avgParticipants 
            FROM (
                SELECT COUNT(user_id) as participant_count 
                FROM training_participants 
                GROUP BY training_id
            ) as participant_counts
        `, { type: sequelize.QueryTypes.SELECT });
        
        const avgParticipants = avgParticipantsResult.length > 0 ? parseFloat(avgParticipantsResult[0].avgParticipants) : 0;
        
        successResponse(res, {
            total: totalTrainings,
            byStatus: trainingsByStatus,
            byMonth: trainingsByMonth,
            avgParticipants: avgParticipants,
            totalParticipants: totalParticipants
        }, '获取培训统计报告成功');
    } catch (error) {
        errorResponse(res, '获取培训统计报告失败', 500, error.message);
    }
});

// ==================== 数据导出接口 ====================

// 导出用户数据
router.get('/data/export/users', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const exportPath = await exportTableData('users');
        res.download(exportPath, path.basename(exportPath), (err) => {
            if (err) {
                console.error('下载用户数据失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        errorResponse(res, '导出用户数据失败', 500, error.message);
    }
});

// 导出活动数据
router.get('/data/export/activities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const exportPath = await exportTableData('activities');
        res.download(exportPath, path.basename(exportPath), (err) => {
            if (err) {
                console.error('下载活动数据失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        errorResponse(res, '导出活动数据失败', 500, error.message);
    }
});

// 导出培训数据
router.get('/data/export/trainings', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const exportPath = await exportTableData('trainings');
        res.download(exportPath, path.basename(exportPath), (err) => {
            if (err) {
                console.error('下载培训数据失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        errorResponse(res, '导出培训数据失败', 500, error.message);
    }
});

// 导出用户统计报告
router.get('/stats/users/export', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取导出格式，默认为csv
        const format = req.query.format || 'csv';
        
        // 获取用户统计数据
        const totalUsers = await User.count();
        const usersByRole = await User.findAll({
            attributes: [
                'role',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['role']
        });
        
        // 按月份注册统计
        const usersByMonth = await User.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 志愿者参与情况
        const volunteerParticipation = await User.count({
            include: [
                {
                    model: Activity,
                    as: 'activities',
                    through: { attributes: [] }
                }
            ],
            where: {
                '$activities.id$': {
                    [Op.not]: null
                },
                role: 'volunteer'
            },
            distinct: true
        });
        
        // 生成导出数据
        const exportData = {
            total: totalUsers,
            byRole: usersByRole.map(item => ({ role: item.role, count: item.dataValues.count })),
            byMonth: usersByMonth.map(item => ({ month: item.dataValues.month, count: item.dataValues.count })),
            volunteerParticipation: volunteerParticipation
        };
        
        // 生成导出文件名
        const filename = `user-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
        const exportPath = path.join(__dirname, '../../exports', filename);
        
        // 确保exports目录存在
        if (!fs.existsSync(path.join(__dirname, '../../exports'))) {
            fs.mkdirSync(path.join(__dirname, '../../exports'), { recursive: true });
        }
        
        // 根据格式导出数据
        if (format === 'json') {
            // 导出为JSON格式
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            res.setHeader('Content-Type', 'application/json');
        } else {
            // 默认导出为CSV格式
            const csvContent = [
                ['用户统计报告', '', '', ''],
                ['统计类型', '名称', '数量', ''],
                ['', '', '', ''],
                ['总体统计', '总用户数', totalUsers, ''],
                ['', '参与活动的志愿者数', volunteerParticipation, ''],
                ['', '', '', ''],
                ['按角色统计', '', '', ''],
                ...usersByRole.map(item => ['', item.role, item.dataValues.count, '']),
                ['', '', '', ''],
                ['按月份注册统计', '', '', ''],
                ...usersByMonth.map(item => ['', item.dataValues.month, item.dataValues.count, ''])
            ].map(row => row.join(',')).join('\n');
            
            fs.writeFileSync(exportPath, csvContent);
            res.setHeader('Content-Type', 'text/csv');
        }
        
        // 下载文件
        res.download(exportPath, filename, (err) => {
            if (err) {
                console.error('下载统计报告失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        console.error('导出用户统计报告失败:', error);
        errorResponse(res, '导出用户统计报告失败', 500, error.message);
    }
});

// 导出活动统计报告
router.get('/stats/activities/export', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取导出格式，默认为csv
        const format = req.query.format || 'csv';
        
        // 获取活动统计数据
        const totalActivities = await Activity.count();
        const activitiesByStatus = await Activity.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });
        
        // 按月份创建统计
        const activitiesByMonth = await Activity.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 总参与人数
        const totalParticipants = await ActivityParticipant.count();
        
        // 计算平均参与人数（使用子查询）
        const avgParticipantsResult = await sequelize.query(`
            SELECT AVG(participant_count) as avgParticipants 
            FROM (
                SELECT COUNT(user_id) as participant_count 
                FROM activity_participants 
                GROUP BY activity_id
            ) as participant_counts
        `, { type: sequelize.QueryTypes.SELECT });
        
        const avgParticipants = avgParticipantsResult.length > 0 ? parseFloat(avgParticipantsResult[0].avgParticipants) : 0;
        
        // 生成导出数据
        const exportData = {
            total: totalActivities,
            byStatus: activitiesByStatus.map(item => ({ status: item.status, count: item.dataValues.count })),
            byMonth: activitiesByMonth.map(item => ({ month: item.dataValues.month, count: item.dataValues.count })),
            avgParticipants: avgParticipants,
            totalParticipants: totalParticipants
        };
        
        // 生成导出文件名
        const filename = `activity-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
        const exportPath = path.join(__dirname, '../../exports', filename);
        
        // 确保exports目录存在
        if (!fs.existsSync(path.join(__dirname, '../../exports'))) {
            fs.mkdirSync(path.join(__dirname, '../../exports'), { recursive: true });
        }
        
        // 根据格式导出数据
        if (format === 'json') {
            // 导出为JSON格式
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            res.setHeader('Content-Type', 'application/json');
        } else {
            // 默认导出为CSV格式
            const csvContent = [
                ['活动统计报告', '', '', ''],
                ['统计类型', '名称', '数量', ''],
                ['', '', '', ''],
                ['总体统计', '总活动数', totalActivities, ''],
                ['', '总参与人数', totalParticipants, ''],
                ['', '平均参与人数', avgParticipants.toFixed(2), ''],
                ['', '', '', ''],
                ['按状态统计', '', '', ''],
                ...activitiesByStatus.map(item => ['', item.status, item.dataValues.count, '']),
                ['', '', '', ''],
                ['按月份创建统计', '', '', ''],
                ...activitiesByMonth.map(item => ['', item.dataValues.month, item.dataValues.count, ''])
            ].map(row => row.join(',')).join('\n');
            
            fs.writeFileSync(exportPath, csvContent);
            res.setHeader('Content-Type', 'text/csv');
        }
        
        // 下载文件
        res.download(exportPath, filename, (err) => {
            if (err) {
                console.error('下载统计报告失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        console.error('导出活动统计报告失败:', error);
        errorResponse(res, '导出活动统计报告失败', 500, error.message);
    }
});

// 导出培训统计报告
router.get('/stats/trainings/export', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取导出格式，默认为csv
        const format = req.query.format || 'csv';
        
        // 获取培训统计数据
        const totalTrainings = await Training.count();
        const trainingsByStatus = await Training.findAll({
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status']
        });
        
        // 按月份创建统计
        const trainingsByMonth = await Training.findAll({
            attributes: [
                [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
            order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']]
        });
        
        // 总参与人数
        const totalParticipants = await TrainingParticipant.count();
        
        // 计算平均参与人数（使用子查询）
        const avgParticipantsResult = await sequelize.query(`
            SELECT AVG(participant_count) as avgParticipants 
            FROM (
                SELECT COUNT(user_id) as participant_count 
                FROM training_participants 
                GROUP BY training_id
            ) as participant_counts
        `, { type: sequelize.QueryTypes.SELECT });
        
        const avgParticipants = avgParticipantsResult.length > 0 ? parseFloat(avgParticipantsResult[0].avgParticipants) : 0;
        
        // 生成导出数据
        const exportData = {
            total: totalTrainings,
            byStatus: trainingsByStatus.map(item => ({ status: item.status, count: item.dataValues.count })),
            byMonth: trainingsByMonth.map(item => ({ month: item.dataValues.month, count: item.dataValues.count })),
            avgParticipants: avgParticipants,
            totalParticipants: totalParticipants
        };
        
        // 生成导出文件名
        const filename = `training-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
        const exportPath = path.join(__dirname, '../../exports', filename);
        
        // 确保exports目录存在
        if (!fs.existsSync(path.join(__dirname, '../../exports'))) {
            fs.mkdirSync(path.join(__dirname, '../../exports'), { recursive: true });
        }
        
        // 根据格式导出数据
        if (format === 'json') {
            // 导出为JSON格式
            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            res.setHeader('Content-Type', 'application/json');
        } else {
            // 默认导出为CSV格式
            const csvContent = [
                ['培训统计报告', '', '', ''],
                ['统计类型', '名称', '数量', ''],
                ['', '', '', ''],
                ['总体统计', '总培训数', totalTrainings, ''],
                ['', '总参与人数', totalParticipants, ''],
                ['', '平均参与人数', avgParticipants.toFixed(2), ''],
                ['', '', '', ''],
                ['按状态统计', '', '', ''],
                ...trainingsByStatus.map(item => ['', item.status, item.dataValues.count, '']),
                ['', '', '', ''],
                ['按月份创建统计', '', '', ''],
                ...trainingsByMonth.map(item => ['', item.dataValues.month, item.dataValues.count, ''])
            ].map(row => row.join(',')).join('\n');
            
            fs.writeFileSync(exportPath, csvContent);
            res.setHeader('Content-Type', 'text/csv');
        }
        
        // 下载文件
        res.download(exportPath, filename, (err) => {
            if (err) {
                console.error('下载统计报告失败:', err);
            }
            // 删除临时文件
            fs.unlinkSync(exportPath);
        });
    } catch (error) {
        console.error('导出培训统计报告失败:', error);
        errorResponse(res, '导出培训统计报告失败', 500, error.message);
    }
});

module.exports = router;