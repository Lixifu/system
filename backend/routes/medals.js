const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Medal, User, UserMedal } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const { body, validationResult } = require('express-validator');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');

// 勋章验证规则
const medalValidationRules = [
    body('name').notEmpty().withMessage('勋章名称不能为空').isLength({ max: 50 }).withMessage('勋章名称不能超过50个字符'),
    body('description').notEmpty().withMessage('勋章描述不能为空'),
    body('category').notEmpty().withMessage('勋章分类不能为空'),
    body('image').optional().isURL().withMessage('勋章图片URL格式无效'),
    body('condition').optional().isString().withMessage('勋章获取条件必须是字符串')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return errorResponse(res, '输入验证失败', 400, errors.array());
}

// 获取所有勋章
router.get('/', async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const whereCondition = {};
        
        // 根据名称搜索
        if (req.query.name) {
            whereCondition.name = {
                [Op.like]: `%${req.query.name}%`
            };
        }
        
        // 根据分类过滤
        if (req.query.category) {
            whereCondition.category = req.query.category;
        }
        
        // 根据关键词搜索（名称或描述）
        if (req.query.keyword) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${req.query.keyword}%` } },
                { description: { [Op.like]: `%${req.query.keyword}%` } }
            ];
        }
        
        // 排序条件
        let order = [['createdAt', 'DESC']];
        if (req.query.sortBy) {
            const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';
            order = [[req.query.sortBy, sortOrder]];
        }
        
        const { count, rows: medals } = await Medal.findAndCountAll({
            where: whereCondition,
            order: order,
            limit: pageSize,
            offset: offset
        });
        
        paginationResponse(res, medals, {
            total: count,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(count / pageSize)
        }, '获取勋章列表成功');
    } catch (error) {
        errorResponse(res, '获取勋章列表失败', 500, error.message);
    }
});

// 获取勋章详情
router.get('/:id', async (req, res) => {
    try {
        const medal = await Medal.findByPk(req.params.id);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        successResponse(res, medal, '获取勋章详情成功');
    } catch (error) {
        errorResponse(res, '获取勋章详情失败', 500, error.message);
    }
});

// 创建勋章
router.post('/', authMiddleware, roleMiddleware(['admin']), medalValidationRules, validate, async (req, res) => {
    try {
        const medal = await Medal.create({
            name: req.body.name,
            description: req.body.description,
            image: req.body.image,
            condition: req.body.condition,
            category: req.body.category
        });
        successResponse(res, medal, '勋章创建成功', 201);
    } catch (error) {
        errorResponse(res, '创建勋章失败', 500, error.message);
    }
});

// 更新勋章
router.put('/:id', authMiddleware, roleMiddleware(['admin']), [
    body('name').optional().isLength({ max: 50 }).withMessage('勋章名称不能超过50个字符'),
    body('image').optional().isURL().withMessage('勋章图片URL格式无效')
], validate, async (req, res) => {
    try {
        const medal = await Medal.findByPk(req.params.id);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        
        const updatedMedal = await medal.update({
            name: req.body.name,
            description: req.body.description,
            image: req.body.image,
            condition: req.body.condition,
            category: req.body.category
        });
        successResponse(res, updatedMedal, '勋章更新成功');
    } catch (error) {
        errorResponse(res, '更新勋章失败', 500, error.message);
    }
});

// 删除勋章
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const medal = await Medal.findByPk(req.params.id);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        
        // 删除相关的用户勋章关联
        await UserMedal.destroy({
            where: {
                medalId: req.params.id
            }
        });
        
        await medal.destroy();
        successResponse(res, null, '勋章删除成功');
    } catch (error) {
        errorResponse(res, '删除勋章失败', 500, error.message);
    }
});

// 获取用户的勋章列表
router.get('/user/:userId', authMiddleware, async (req, res) => {
    try {
        // 检查是否是查看自己的勋章或管理员
        if (req.params.userId != req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权查看该用户的勋章', 403);
        }
        
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        const user = await User.findByPk(req.params.userId, {
            include: [{
                model: Medal,
                as: 'medals',
                through: {
                    attributes: ['obtainedAt'],
                    order: [['obtainedAt', 'DESC']],
                    limit: pageSize,
                    offset: offset
                }
            }]
        });
        
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }
        
        // 获取用户勋章总数
        const total = await UserMedal.count({
            where: {
                userId: req.params.userId
            }
        });
        
        paginationResponse(res, user.medals, {
            total: total,
            page: page,
            pageSize: pageSize,
            totalPages: Math.ceil(total / pageSize)
        }, '获取用户勋章列表成功');
    } catch (error) {
        errorResponse(res, '获取用户勋章失败', 500, error.message);
    }
});

// 给用户颁发勋章
router.post('/award/:userId', authMiddleware, roleMiddleware(['admin']), [
    body('medalId').notEmpty().withMessage('勋章ID不能为空').isInt().withMessage('勋章ID必须是数字')
], validate, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.userId);
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }
        
        const medal = await Medal.findByPk(req.body.medalId);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        
        // 检查用户是否已获得该勋章
        const existingUserMedal = await UserMedal.findOne({
            where: {
                userId: req.params.userId,
                medalId: req.body.medalId
            }
        });
        
        if (existingUserMedal) {
            return errorResponse(res, '该用户已获得此勋章', 400);
        }
        
        // 颁发勋章
        await UserMedal.create({
            userId: req.params.userId,
            medalId: req.body.medalId
        });
        
        successResponse(res, null, '勋章颁发成功');
    } catch (error) {
        errorResponse(res, '颁发勋章失败', 500, error.message);
    }
});

// 撤销用户的勋章
router.delete('/revoke/:userId/:medalId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 检查用户是否已获得该勋章
        const userMedal = await UserMedal.findOne({
            where: {
                userId: req.params.userId,
                medalId: req.params.medalId
            }
        });
        
        if (!userMedal) {
            return errorResponse(res, '该用户未获得此勋章', 400);
        }
        
        // 撤销勋章
        await userMedal.destroy();
        
        successResponse(res, null, '勋章撤销成功');
    } catch (error) {
        errorResponse(res, '撤销勋章失败', 500, error.message);
    }
});

// 获取勋章分类统计
router.get('/stats/category', async (req, res) => {
    try {
        const stats = await Medal.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
            group: ['category'],
            order: [[sequelize.fn('COUNT', sequelize.col('category')), 'DESC']]
        });
        
        successResponse(res, stats, '获取勋章分类统计成功');
    } catch (error) {
        errorResponse(res, '获取勋章分类统计失败', 500, error.message);
    }
});

// 批量颁发勋章
router.post('/batch/award', authMiddleware, roleMiddleware(['admin']), [
    body('userIds').notEmpty().withMessage('用户ID列表不能为空').isArray().withMessage('用户ID列表必须是数组'),
    body('medalId').notEmpty().withMessage('勋章ID不能为空').isInt().withMessage('勋章ID必须是数字')
], validate, async (req, res) => {
    try {
        const { userIds, medalId } = req.body;
        
        // 检查勋章是否存在
        const medal = await Medal.findByPk(medalId);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        
        // 批量创建用户勋章关联
        const userMedalData = [];
        
        for (const userId of userIds) {
            // 检查用户是否已获得该勋章
            const existing = await UserMedal.findOne({
                where: {
                    userId: userId,
                    medalId: medalId
                }
            });
            
            if (!existing) {
                userMedalData.push({
                    userId: userId,
                    medalId: medalId
                });
            }
        }
        
        // 批量创建
        await UserMedal.bulkCreate(userMedalData);
        
        successResponse(res, { awardedCount: userMedalData.length }, '勋章批量颁发成功');
    } catch (error) {
        errorResponse(res, '批量颁发勋章失败', 500, error.message);
    }
});

// 检查用户是否符合获得勋章的条件
router.post('/check-eligibility/:userId/:medalId', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const { userId, medalId } = req.params;
        
        // 检查用户和勋章是否存在
        const user = await User.findByPk(userId);
        if (!user) {
            return errorResponse(res, '用户不存在', 404);
        }
        
        const medal = await Medal.findByPk(medalId);
        if (!medal) {
            return errorResponse(res, '勋章不存在', 404);
        }
        
        // 检查用户是否已获得该勋章
        const existing = await UserMedal.findOne({
            where: {
                userId: userId,
                medalId: medalId
            }
        });
        
        if (existing) {
            return successResponse(res, { 
            eligible: false, 
            reason: '用户已获得此勋章' 
        }, '检查勋章获得条件成功');
        }
        
        // 这里可以添加更复杂的条件检查逻辑
        // 例如：检查用户的志愿时长、参与活动次数等
        // 暂时返回一个示例结果
        successResponse(res, { 
            eligible: true, 
            reason: '用户符合获得此勋章的条件' 
        }, '检查勋章获得条件成功');
    } catch (error) {
        errorResponse(res, '检查勋章获得条件失败', 500, error.message);
    }
});

module.exports = router;