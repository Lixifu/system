const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Notification, User } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const { body, validationResult } = require('express-validator');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');

// 通知验证规则
const notificationValidationRules = [
    body('title').notEmpty().withMessage('通知标题不能为空').isLength({ max: 100 }).withMessage('通知标题不能超过100个字符'),
    body('content').notEmpty().withMessage('通知内容不能为空'),
    body('type').optional().isIn(['system', 'activity', 'training', 'other']).withMessage('通知类型无效'),
    body('userIds').optional().isArray().withMessage('用户ID列表必须是数组'),
    body('relatedId').optional().isInt().withMessage('关联ID必须是数字')
];

// 批量操作验证规则
const batchValidationRules = [
    body('notificationIds').notEmpty().withMessage('通知ID列表不能为空').isArray().withMessage('通知ID列表必须是数组')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return errorResponse(res, '输入验证失败', 400, errors.array());
}

// 获取当前用户的通知列表
router.get('/', authMiddleware, async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const whereCondition = {
            userId: req.user.id
        };
        
        // 根据类型过滤
        if (req.query.type) {
            whereCondition.type = req.query.type;
        }
        
        // 根据已读状态过滤
        if (req.query.isRead !== undefined) {
            whereCondition.isRead = req.query.isRead === 'true';
        }
        
        const { count, rows: notifications } = await Notification.findAndCountAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, notifications, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取通知列表成功');
    } catch (error) {
        errorResponse(res, '获取通知列表失败', 500, error.message);
    }
});

// 获取未读通知数量
router.get('/unread-count', authMiddleware, async (req, res) => {
    try {
        const count = await Notification.count({
            where: {
                userId: req.user.id,
                isRead: false
            }
        });
        
        successResponse(res, { count }, '获取未读通知数量成功');
    } catch (error) {
        errorResponse(res, '获取未读通知数量失败', 500, error.message);
    }
});

// 获取通知详情
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        
        if (!notification) {
            return errorResponse(res, '通知不存在', 404);
        }
        
        // 检查权限
        if (notification.userId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权访问该通知', 403);
        }
        
        successResponse(res, notification, '获取通知详情成功');
    } catch (error) {
        errorResponse(res, '获取通知详情失败', 500, error.message);
    }
});

// 标记通知为已读
router.put('/:id/read', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        
        if (!notification) {
            return errorResponse(res, '通知不存在', 404);
        }
        
        // 检查权限
        if (notification.userId !== req.user.id) {
            return errorResponse(res, '无权操作该通知', 403);
        }
        
        await notification.update({ isRead: true });
        
        successResponse(res, null, '通知已标记为已读');
    } catch (error) {
        errorResponse(res, '标记通知失败', 500, error.message);
    }
});

// 标记所有通知为已读
router.put('/read-all', authMiddleware, async (req, res) => {
    try {
        await Notification.update(
            { isRead: true },
            { where: { userId: req.user.id } }
        );
        
        successResponse(res, null, '所有通知已标记为已读');
    } catch (error) {
        errorResponse(res, '标记所有通知失败', 500, error.message);
    }
});

// 删除通知
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const notification = await Notification.findByPk(req.params.id);
        
        if (!notification) {
            return errorResponse(res, '通知不存在', 404);
        }
        
        // 检查权限
        if (notification.userId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权删除该通知', 403);
        }
        
        await notification.destroy();
        
        successResponse(res, null, '通知已删除');
    } catch (error) {
        errorResponse(res, '删除通知失败', 500, error.message);
    }
});

// 批量删除通知
router.delete('/batch/delete', authMiddleware, batchValidationRules, validate, async (req, res) => {
    try {
        const { notificationIds } = req.body;
        
        await Notification.destroy({
            where: {
                id: {
                    [Op.in]: notificationIds
                },
                userId: req.user.id
            }
        });
        
        successResponse(res, null, '通知已批量删除');
    } catch (error) {
        errorResponse(res, '批量删除通知失败', 500, error.message);
    }
});

// 管理员获取指定用户的通知
router.get('/user/:userId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }
        
        const { count, rows: notifications } = await Notification.findAndCountAll({
            where: { userId: req.params.userId },
            order: [['createdAt', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, notifications, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取用户通知列表成功');
    } catch (error) {
        errorResponse(res, '获取用户通知失败', 500, error.message);
    }
});

// 管理员发送系统通知
router.post('/system', authMiddleware, roleMiddleware(['admin']), notificationValidationRules, validate, async (req, res) => {
    try {
        const { title, content, userIds, type, relatedId } = req.body;
        
        let targetUserIds = [];
        
        if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            // 发送给指定用户
            targetUserIds = userIds;
        } else {
            // 发送给所有用户
            const users = await User.findAll({ attributes: ['id'] });
            targetUserIds = users.map(user => user.id);
        }
        
        // 创建通知
        const notificationData = targetUserIds.map(userId => ({
            userId,
            title,
            content,
            type: type || 'system',
            relatedId
        }));
        
        await Notification.bulkCreate(notificationData);
        
        successResponse(res, { count: notificationData.length }, '系统通知发送成功');
    } catch (error) {
        errorResponse(res, '发送系统通知失败', 500, error.message);
    }
});

module.exports = router;