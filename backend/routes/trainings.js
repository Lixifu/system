const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Training, User, Organization, TrainingParticipant } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const upload = require('../config/upload');
const { body, validationResult } = require('express-validator');
const { successResponse, paginationResponse, errorResponse } = require('../utils/responseFormatter');

// 培训验证规则
const trainingValidationRules = [
    body('title').notEmpty().withMessage('培训标题不能为空').isLength({ max: 100 }).withMessage('培训标题不能超过100个字符'),
    body('description').notEmpty().withMessage('培训描述不能为空'),
    body('type').notEmpty().withMessage('培训类型不能为空').isIn(['general', 'specialized']).withMessage('培训类型无效'),
    body('startTime').notEmpty().withMessage('培训开始时间不能为空').isISO8601().withMessage('培训开始时间格式无效'),
    body('endTime').notEmpty().withMessage('培训结束时间不能为空').isISO8601().withMessage('培训结束时间格式无效'),
    body('location').notEmpty().withMessage('培训地点不能为空'),
    body('quota').notEmpty().withMessage('培训名额不能为空').isInt({ gt: 0 }).withMessage('培训名额必须大于0'),
    body('teacher').notEmpty().withMessage('培训教师不能为空'),
    body('organizationId').notEmpty().withMessage('组织ID不能为空').isInt().withMessage('组织ID必须是数字')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return errorResponse(res, '输入验证失败', 400, errors.array());
}

// 获取培训列表
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
        
        // 根据讲师搜索
        if (req.query.teacher) {
            whereCondition.teacher = {
                [Op.like]: `%${req.query.teacher}%`
            };
        }
        
        // 分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        // 获取培训列表
        const { count, rows } = await Training.findAndCountAll({
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
        const trainingsWithCounts = await Training.calculateRegisteredCounts(rows);
        
        const pagination = {
            total: count,
            page: page,
            pageSize: limit,
            totalPages: Math.ceil(count / limit)
        };
        
        paginationResponse(res, trainingsWithCounts, pagination, '获取培训列表成功');
    } catch (error) {
        errorResponse(res, '获取培训列表失败', 500, error.message);
    }
});

// 搜索培训
router.get('/search', async (req, res) => {
    try {
        const { keyword, type, status, location, startTime, endTime, teacher, organizerName, organizationName, page = 1, limit = 20 } = req.query;
        
        // 构建查询条件
        const whereCondition = {};
        
        // 关键词搜索（标题、描述、地点、讲师）
        if (keyword) {
            whereCondition[Op.or] = [
                { title: { [Op.like]: `%${keyword}%` } },
                { description: { [Op.like]: `%${keyword}%` } },
                { location: { [Op.like]: `%${keyword}%` } },
                { teacher: { [Op.like]: `%${keyword}%` } }
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
        
        // 根据讲师搜索
        if (teacher) {
            whereCondition.teacher = { [Op.like]: `%${teacher}%` };
        }
        
        // 计算分页
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // 执行搜索
        const { count, rows } = await Training.findAndCountAll({
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
            limit: parseInt(limit),
            offset: offset
        });
        
        paginationResponse(res, rows, {
            total: count,
            page: parseInt(page),
            pageSize: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
        }, '搜索培训成功');
    } catch (error) {
        errorResponse(res, '搜索培训失败', 500, error.message);
    }
});

// 获取培训详情
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id, {
            include: [
                { model: User, as: 'organizer', attributes: ['id', 'name'] },
                { model: Organization, as: 'organization', attributes: ['id', 'name'] }
            ]
        });
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }
        
        // 动态计算已报名人数
        const registeredCount = await training.countParticipants(['approved', 'pending']);
        
        // 将计算结果添加到培训对象中
        const trainingData = training.toJSON();
        trainingData.registeredCount = registeredCount;
        
        // 只有组织者和管理员可以查看完整的参与者信息
        if (req.user && (req.user.id === training.organizerId || req.user.role === 'admin')) {
            // 获取完整的参与者信息
            const participants = await TrainingParticipant.findAll({
                where: { trainingId: req.params.id },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'phone', 'email', 'gender', 'age']
                }],
                order: [['createdAt', 'DESC']]
            });
            
            // 格式化参与者信息
            trainingData.participants = participants.map(p => ({
                volunteerId: p.user.id,
                volunteerName: p.user.name,
                contactInfo: {
                    phone: p.user.phone,
                    email: p.user.email
                },
                registrationTime: p.createdAt,
                status: p.status,
                attendance: p.attendance,
                rating: p.rating,
                comment: p.comment,
                gender: p.user.gender,
                age: p.user.age
            }));
        } else {
            // 普通用户只能查看参与者数量，不能查看具体信息
            trainingData.participants = [];
        }
        
        successResponse(res, trainingData, '获取培训详情成功');
    } catch (error) {
        errorResponse(res, '获取培训详情失败', 500, error.message);
    }
});

// 创建培训
router.post('/', authMiddleware, roleMiddleware(['organizer', 'admin']), trainingValidationRules, validate, async (req, res) => {
    try {
        // 验证结束时间是否大于开始时间
        if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
            return errorResponse(res, '培训结束时间必须大于开始时间', 400);
        }
        
        const training = await Training.create({
            title: req.body.title,
            description: req.body.description,
            type: req.body.type,
            startTime: req.body.startTime,
            endTime: req.body.endTime,
            location: req.body.location,
            quota: req.body.quota,
            teacher: req.body.teacher,
            organizerId: req.user.id,
            organizationId: req.body.organizationId,
            status: req.body.status || 'draft'
        });

        successResponse(res, training, '培训创建成功', 201);
    } catch (error) {
        errorResponse(res, '创建培训失败', 500, error.message);
    }
});

// 更新培训
router.put('/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), [
    body('title').optional().isLength({ max: 100 }).withMessage('培训标题不能超过100个字符'),
    body('type').optional().isIn(['general', 'specialized']).withMessage('培训类型无效'),
    body('startTime').optional().isISO8601().withMessage('培训开始时间格式无效'),
    body('endTime').optional().isISO8601().withMessage('培训结束时间格式无效'),
    body('quota').optional().isInt({ gt: 0 }).withMessage('培训名额必须大于0'),
    body('teacher').optional().notEmpty().withMessage('培训教师不能为空'),
    body('organizationId').optional().isInt().withMessage('组织ID必须是数字')
], validate, async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查是否是培训组织者或管理员
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权修改该培训', 403);
        }
        
        // 验证结束时间是否大于开始时间（如果两者都提供了）
        if (req.body.startTime && req.body.endTime) {
            if (new Date(req.body.endTime) <= new Date(req.body.startTime)) {
                return errorResponse(res, '培训结束时间必须大于开始时间', 400);
            }
        } else if (req.body.startTime && !req.body.endTime) {
            // 如果只提供了开始时间，确保不超过原结束时间
            if (new Date(req.body.startTime) >= new Date(training.endTime)) {
                return errorResponse(res, '培训开始时间必须小于结束时间', 400);
            }
        } else if (!req.body.startTime && req.body.endTime) {
            // 如果只提供了结束时间，确保不早于原开始时间
            if (new Date(req.body.endTime) <= new Date(training.startTime)) {
                return errorResponse(res, '培训结束时间必须大于开始时间', 400);
            }
        }

        await training.update(req.body);
        successResponse(res, training, '培训更新成功');
    } catch (error) {
        errorResponse(res, '更新培训失败', 500, error.message);
    }
});

// 删除培训
router.delete('/:id', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查是否是培训组织者或管理员
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权删除该培训', 403);
        }

        await training.destroy();
        successResponse(res, null, '培训删除成功');
    } catch (error) {
        errorResponse(res, '删除培训失败', 500, error.message);
    }
});

// 报名培训
router.post('/:id/register', authMiddleware, async (req, res) => {
    try {
        // 检查用户角色，只有志愿者可以报名培训
        if (req.user.role !== 'volunteer') {
            return errorResponse(res, '只有志愿者角色可以报名培训', 403);
        }
        
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查用户是否已报名
        const existingRegistration = await TrainingParticipant.findOne({
            where: {
                trainingId: req.params.id,
                userId: req.user.id
            }
        });
        if (existingRegistration) {
            return errorResponse(res, '您已报名该培训', 400);
        }
        
        // 动态计算当前已报名人数
        const currentCount = await training.countParticipants(['approved', 'pending']);
        
        // 检查培训是否已满
        if (currentCount >= training.quota) {
            return errorResponse(res, '培训名额已满', 400);
        }

        // 创建报名记录
        await TrainingParticipant.create({
            trainingId: req.params.id,
            userId: req.user.id,
            status: 'approved' // 培训默认直接通过
        });
        
        // 移除了直接更新registeredCount字段的逻辑，改为通过countParticipants动态计算

        successResponse(res, null, '报名成功');
    } catch (error) {
        errorResponse(res, '报名失败', 500, error.message);
    }
});

// 取消报名
router.post('/:id/cancel', authMiddleware, async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查用户是否已报名
        const registration = await TrainingParticipant.findOne({
            where: {
                trainingId: req.params.id,
                userId: req.user.id
            }
        });
        if (!registration) {
            return errorResponse(res, '您未报名该培训', 400);
        }

        // 删除报名记录
        await registration.destroy();
        
        // 移除了直接更新registeredCount字段的逻辑，改为通过countParticipants动态计算

        successResponse(res, null, '取消报名成功');
    } catch (error) {
        errorResponse(res, '取消报名失败', 500, error.message);
    }
});

// 获取用户参与的培训
router.get('/user/participated', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Training,
                    as: 'trainings',
                    through: { attributes: ['status', 'created_at'] },
                    include: [
                        { model: User, as: 'organizer', attributes: ['id', 'name'] },
                        { model: Organization, as: 'organization', attributes: ['id', 'name'] }
                    ]
                }
            ]
        });
        successResponse(res, user.trainings, '获取培训记录成功');
    } catch (error) {
        errorResponse(res, '获取培训记录失败', 500, error.message);
    }
});

// 上传培训图片
router.post('/:id/upload', authMiddleware, roleMiddleware(['organizer', 'admin']), upload.single('image'), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权修改该培训', 403);
        }

        if (!req.file) {
            return errorResponse(res, '未提供图片文件', 400);
        }

        // 构建图片URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 获取当前图片列表
        const currentImages = training.images || [];
        
        // 添加新图片
        currentImages.push(imageUrl);
        
        // 更新培训图片
        await training.update({ images: currentImages });
        
        successResponse(res, { 
            imageUrl: imageUrl,
            images: currentImages
        }, '图片上传成功');
    } catch (error) {
        errorResponse(res, '图片上传失败', 500, error.message);
    }
});

// 删除培训图片
router.delete('/:id/images/:imageUrl', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权修改该培训', 403);
        }

        // 获取当前图片列表
        const currentImages = training.images || [];
        
        // 删除指定图片
        const updatedImages = currentImages.filter(image => image !== decodeURIComponent(req.params.imageUrl));
        
        // 更新培训图片
        await training.update({ images: updatedImages });
        
        successResponse(res, { images: updatedImages }, '图片删除成功');
    } catch (error) {
        errorResponse(res, '图片删除失败', 500, error.message);
    }
});

// 给培训参与者评价
router.put('/:id/evaluate/:userId', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权评价该参与者', 403);
        }

        // 获取参与者记录
        const participant = await TrainingParticipant.findOne({
            where: {
                trainingId: req.params.id,
                userId: req.params.userId
            }
        });

        if (!participant) {
            return errorResponse(res, '参与者记录不存在', 404);
        }

        // 更新评价
        await participant.update({
            rating: req.body.rating,
            comment: req.body.comment
        });

        successResponse(res, null, '评价成功');
    } catch (error) {
        errorResponse(res, '评价失败', 500, error.message);
    }
});

// 获取培训参与者的评价
router.get('/:id/evaluations/:userId', authMiddleware, async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 获取参与者记录
        const participant = await TrainingParticipant.findOne({
            where: {
                trainingId: req.params.id,
                userId: req.params.userId
            },
            attributes: ['rating', 'comment', 'updatedAt']
        });

        if (!participant) {
            return errorResponse(res, '参与者记录不存在', 404);
        }

        successResponse(res, participant, '获取评价成功');
    } catch (error) {
        errorResponse(res, '获取评价失败', 500, error.message);
    }
});

// 获取培训所有参与者的评价
router.get('/:id/evaluations', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权查看该培训的评价', 403);
        }

        // 获取所有参与者记录
        const participants = await TrainingParticipant.findAll({
            where: {
                trainingId: req.params.id
            },
            include: [{
                model: User,
                as: 'user',
                attributes: ['id', 'name']
            }],
            attributes: ['userId', 'rating', 'comment', 'updatedAt']
        });

        successResponse(res, participants, '获取评价列表成功');
    } catch (error) {
        errorResponse(res, '获取评价列表失败', 500, error.message);
    }
});

// 获取培训的报名记录列表
router.get('/:id/participants', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权查看该培训的报名记录', 403);
        }

        // 构建查询条件
        const whereCondition = {
            trainingId: req.params.id
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
        
        // 根据用户角色决定返回的字段
        // 管理员可以查看所有字段，组织者只能查看基本信息
        const userAttributes = req.user.role === 'admin' 
            ? ['id', 'name', 'phone', 'email', 'gender', 'age']
            : ['id', 'name', 'gender', 'age']; // 组织者只能查看基本信息，不能查看完整联系方式
        
        // 获取报名记录
        const { count, rows } = await TrainingParticipant.findAndCountAll({
            where: whereCondition,
            include: [{
                model: User,
                as: 'user',
                attributes: userAttributes,
                where: userWhereCondition
            }],
            order: [[sortBy, sortOrder]],
            limit: limit,
            offset: offset,
            // 添加索引，提高查询性能
            indexes: [
                ['trainingId', 'userId'],
                ['trainingId', 'status'],
                ['trainingId', 'createdAt']
            ]
        });
        
        // 根据用户角色决定返回的信息完整度
        const participants = rows.map(p => {
            const baseInfo = {
                volunteerId: p.user.id,
                volunteerName: p.user.name,
                registrationTime: p.createdAt,
                status: p.status,
                gender: p.user.gender,
                age: p.user.age
            };
            
            // 管理员可以查看完整信息
            if (req.user.role === 'admin') {
                return {
                    ...baseInfo,
                    contactInfo: {
                        phone: p.user.phone,
                        email: p.user.email
                    },
                    attendance: p.attendance,
                    rating: p.rating,
                    comment: p.comment
                };
            }
            
            // 组织者只能查看基本信息
            return {
                ...baseInfo,
                // 组织者看不到完整联系方式和详细评价
                attendance: p.attendance,
                rating: req.user.role === 'admin' ? p.rating : undefined, // 只有管理员能看到评价
                comment: req.user.role === 'admin' ? p.comment : undefined // 只有管理员能看到评价
            };
        });

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

// 拒绝培训报名请求
router.put('/:id/participants/:userId/reject', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权操作该培训', 403);
        }

        // 获取报名记录
        const participant = await TrainingParticipant.findOne({
            where: {
                trainingId: req.params.id,
                userId: req.params.userId
            }
        });

        if (!participant) {
            return errorResponse(res, '报名记录不存在', 404);
        }

        // 更新报名状态为拒绝
        await participant.update({ status: 'rejected' });

        successResponse(res, null, '报名已拒绝');
    } catch (error) {
        errorResponse(res, '拒绝报名失败', 500, error.message);
    }
});

// 批量审核培训报名
router.put('/:id/participants/batch-approve', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权操作该培训', 403);
        }

        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return errorResponse(res, '请提供有效的用户ID列表', 400);
        }

        // 批量更新报名状态为通过
        await TrainingParticipant.update(
            { status: 'approved' },
            {
                where: {
                    trainingId: req.params.id,
                    userId: {
                        [Op.in]: userIds
                    }
                }
            }
        );

        successResponse(res, null, '批量审核通过成功');
    } catch (error) {
        errorResponse(res, '批量审核失败', 500, error.message);
    }
});

// 批量拒绝培训报名
router.put('/:id/participants/batch-reject', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权操作该培训', 403);
        }

        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return errorResponse(res, '请提供有效的用户ID列表', 400);
        }

        // 批量更新报名状态为拒绝
        await TrainingParticipant.update(
            { status: 'rejected' },
            {
                where: {
                    trainingId: req.params.id,
                    userId: {
                        [Op.in]: userIds
                    }
                }
            }
        );

        successResponse(res, null, '批量拒绝成功');
    } catch (error) {
        errorResponse(res, '批量拒绝失败', 500, error.message);
    }
});

// 导出培训报名记录
router.get('/:id/export', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const training = await Training.findByPk(req.params.id);
        if (!training) {
            return errorResponse(res, '培训不存在', 404);
        }

        // 检查权限
        if (training.organizerId !== req.user.id && req.user.role !== 'admin') {
            return errorResponse(res, '无权导出该培训记录', 403);
        }

        // 获取导出格式，默认为CSV
        const format = req.query.format || 'csv';
        
        // 获取培训参与者
        const participants = await TrainingParticipant.findAll({
            where: {
                trainingId: req.params.id
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
            '出席状态': p.attendance ? '是' : '否',
            '评价评分': p.rating || '未评价',
            '评价内容': p.comment || ''
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
            const worksheet = workbook.addWorksheet('培训报名记录');
            
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
            const fileName = `training-${training.id}-participants-${Date.now()}.xlsx`;
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
            // 导出为CSV格式
            const { createObjectCsvWriter } = require('csv-writer');
            const fileName = `training-${training.id}-participants-${Date.now()}.csv`;
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

module.exports = router;