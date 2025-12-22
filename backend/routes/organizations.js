const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Organization, User, Activity, Training, ActivityParticipant } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const upload = require('../config/upload');
const { body, validationResult } = require('express-validator');

// 组织验证规则
const organizationValidationRules = [
    body('name').notEmpty().withMessage('组织名称不能为空').isLength({ max: 100 }).withMessage('组织名称不能超过100个字符'),
    body('department').optional().isLength({ max: 50 }).withMessage('部门名称不能超过50个字符'),
    body('contact').notEmpty().withMessage('联系方式不能为空').isLength({ max: 20 }).withMessage('联系方式不能超过20个字符'),
    body('address').notEmpty().withMessage('组织地址不能为空'),
    body('description').notEmpty().withMessage('组织描述不能为空'),
    body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('组织状态无效')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return res.status(400).json({ message: '输入验证失败', errors: errors.array() });
}

// 获取组织信息
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Organization, as: 'organization' }]
        });
        
        if (!user.organization) {
            return res.status(404).json({ message: '您还没有加入任何组织' });
        }
        
        res.status(200).json(user.organization);
    } catch (error) {
        res.status(500).json({ message: '获取组织信息失败', error: error.message });
    }
});

// 更新组织信息
router.put('/profile', authMiddleware, roleMiddleware(['organizer', 'admin']), [
    body('name').optional().isLength({ max: 100 }).withMessage('组织名称不能超过100个字符'),
    body('department').optional().isLength({ max: 50 }).withMessage('部门名称不能超过50个字符'),
    body('contact').optional().isLength({ max: 20 }).withMessage('联系方式不能超过20个字符'),
    body('address').optional().notEmpty().withMessage('组织地址不能为空'),
    body('description').optional().notEmpty().withMessage('组织描述不能为空')
], validate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Organization, as: 'organization' }]
        });
        
        if (!user.organization) {
            return res.status(404).json({ message: '您还没有加入任何组织' });
        }
        
        // 检查用户是否是组织的管理员或组织者
        if (req.user.role !== 'admin') {
            // 这里可以添加更严格的检查，比如检查用户是否是组织的创建者或管理员
            // 暂时简化为只允许组织方和管理员更新
        }
        
        // 更新组织信息
        const updatedOrganization = await user.organization.update({
            name: req.body.name,
            department: req.body.department,
            contact: req.body.contact,
            address: req.body.address,
            description: req.body.description
        });
        
        res.status(200).json({ message: '组织信息更新成功', organization: updatedOrganization });
    } catch (error) {
        res.status(500).json({ message: '更新组织信息失败', error: error.message });
    }
});

// 管理员获取组织列表
router.get('/', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;

        // 构建查询条件
        const whereCondition = {};
        
        // 根据关键词搜索（名称、部门或联系方式）
        if (req.query.keyword) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${req.query.keyword}%` } },
                { department: { [Op.like]: `%${req.query.keyword}%` } },
                { contact: { [Op.like]: `%${req.query.keyword}%` } }
            ];
        }
        
        // 根据状态过滤
        if (req.query.status) {
            whereCondition.status = req.query.status;
        }
        
        // 根据创建时间范围过滤
        if (req.query.startTime) {
            whereCondition.created_at = {
                [Op.gte]: new Date(req.query.startTime)
            };
        }
        
        if (req.query.endTime) {
            whereCondition.created_at = {
                ...whereCondition.created_at,
                [Op.lte]: new Date(req.query.endTime)
            };
        }

        // 查询组织列表
        const { count, rows: organizations } = await Organization.findAndCountAll({
            where: whereCondition,
            include: [{ model: User, as: 'users', attributes: ['id', 'name', 'role'] }],
            limit: pageSize,
            offset: offset,
            order: [[req.query.sortBy || 'created_at', req.query.order || 'DESC']]
        });
        
        res.status(200).json({
            data: organizations,
            pagination: {
                total: count,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取组织列表失败', error: error.message });
    }
});

// 管理员创建组织
router.post('/', authMiddleware, roleMiddleware(['admin']), organizationValidationRules, validate, async (req, res) => {
    try {
        const organization = await Organization.create({
            name: req.body.name,
            department: req.body.department,
            contact: req.body.contact,
            address: req.body.address,
            description: req.body.description,
            status: req.body.status || 'approved'
        });
        
        res.status(201).json({ message: '组织创建成功', organization });
    } catch (error) {
        res.status(500).json({ message: '创建组织失败', error: error.message });
    }
});

// 管理员审核组织资质
router.put('/:id/status', authMiddleware, roleMiddleware(['admin']), [
    body('status').notEmpty().withMessage('组织状态不能为空').isIn(['pending', 'approved', 'rejected']).withMessage('组织状态无效')
], validate, async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        await organization.update({ status: req.body.status });
        
        res.status(200).json({ message: '组织状态更新成功', organization });
    } catch (error) {
        res.status(500).json({ message: '更新组织状态失败', error: error.message });
    }
});

// 管理员获取单个组织详情
router.get('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id, {
            include: [{ model: User, as: 'users', attributes: ['id', 'name', 'role'] }]
        });
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        res.status(200).json(organization);
    } catch (error) {
        res.status(500).json({ message: '获取组织详情失败', error: error.message });
    }
});

// 获取组织成员列表
router.get('/:id/members', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 检查组织是否存在
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        // 构建查询条件
        const whereCondition = {
            organizationId: req.params.id
        };
        
        // 根据关键词搜索成员
        if (req.query.keyword) {
            whereCondition[Op.or] = [
                { name: { [Op.like]: `%${req.query.keyword}%` } },
                { email: { [Op.like]: `%${req.query.keyword}%` } }
            ];
        }
        
        // 根据角色过滤
        if (req.query.role) {
            whereCondition.role = req.query.role;
        }
        
        // 查询组织成员列表
        const { count, rows: members } = await User.findAndCountAll({
            where: whereCondition,
            attributes: {
                exclude: ['password']
            },
            limit: pageSize,
            offset: offset,
            order: [[req.query.sortBy || 'created_at', req.query.order || 'DESC']]
        });
        
        res.status(200).json({
            data: members,
            pagination: {
                total: count,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取组织成员列表失败', error: error.message });
    }
});

// 获取组织统计数据
router.get('/:id/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        // 检查组织是否存在
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        // 获取组织成员总数
        const memberCount = await User.count({
            where: {
                organizationId: req.params.id
            }
        });
        
        // 获取组织活动总数
        const activityCount = await Activity.count({
            where: {
                organizationId: req.params.id
            }
        });
        
        // 获取组织培训总数
        const trainingCount = await Training.count({
            where: {
                organizationId: req.params.id
            }
        });
        
        // 获取组织志愿总时长
        const totalHours = await ActivityParticipant.sum('duration', {
            include: [
                {
                    model: Activity,
                    where: {
                        organizationId: req.params.id
                    }
                }
            ],
            where: {
                duration: { [Op.not]: null }
            }
        }) || 0;
        
        res.status(200).json({
            data: {
                organizationId: req.params.id,
                memberCount,
                activityCount,
                trainingCount,
                totalHours
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取组织统计数据失败', error: error.message });
    }
});

// 组织状态统计
router.get('/stats/status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const stats = await Organization.findAll({
            attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
            group: ['status'],
            order: [[sequelize.fn('COUNT', sequelize.col('status')), 'DESC']]
        });
        
        res.status(200).json({
            data: stats
        });
    } catch (error) {
        res.status(500).json({ message: '获取组织状态统计失败', error: error.message });
    }
});

// 管理员删除组织
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        await organization.destroy();
        
        res.status(200).json({ message: '组织删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除组织失败', error: error.message });
    }
});

// 上传组织logo
router.post('/profile/logo', authMiddleware, roleMiddleware(['organizer', 'admin']), upload.single('logo'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Organization, as: 'organization' }]
        });
        
        if (!user.organization) {
            return res.status(404).json({ message: '您还没有加入任何组织' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: '未提供logo文件' });
        }
        
        // 构建logo URL
        const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 更新组织logo
        await user.organization.update({ logo: logoUrl });
        
        res.status(200).json({ 
            message: 'logo上传成功', 
            logoUrl: logoUrl
        });
    } catch (error) {
        res.status(500).json({ message: 'logo上传失败', error: error.message });
    }
});

// 上传组织图片
router.post('/profile/images', authMiddleware, roleMiddleware(['organizer', 'admin']), upload.single('image'), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Organization, as: 'organization' }]
        });
        
        if (!user.organization) {
            return res.status(404).json({ message: '您还没有加入任何组织' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: '未提供图片文件' });
        }
        
        // 构建图片URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 获取当前图片列表
        const currentImages = user.organization.images || [];
        
        // 添加新图片
        currentImages.push(imageUrl);
        
        // 更新组织图片
        await user.organization.update({ images: currentImages });
        
        res.status(200).json({ 
            message: '图片上传成功', 
            imageUrl: imageUrl,
            images: currentImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片上传失败', error: error.message });
    }
});

// 删除组织图片
router.delete('/profile/images/:imageUrl', authMiddleware, roleMiddleware(['organizer', 'admin']), async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Organization, as: 'organization' }]
        });
        
        if (!user.organization) {
            return res.status(404).json({ message: '您还没有加入任何组织' });
        }
        
        // 获取当前图片列表
        const currentImages = user.organization.images || [];
        
        // 删除指定图片
        const updatedImages = currentImages.filter(image => image !== decodeURIComponent(req.params.imageUrl));
        
        // 更新组织图片
        await user.organization.update({ images: updatedImages });
        
        res.status(200).json({ 
            message: '图片删除成功',
            images: updatedImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片删除失败', error: error.message });
    }
});

// 管理员上传组织logo
router.post('/:id/logo', authMiddleware, roleMiddleware(['admin']), upload.single('logo'), async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: '未提供logo文件' });
        }
        
        // 构建logo URL
        const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 更新组织logo
        await organization.update({ logo: logoUrl });
        
        res.status(200).json({ 
            message: 'logo上传成功', 
            logoUrl: logoUrl
        });
    } catch (error) {
        res.status(500).json({ message: 'logo上传失败', error: error.message });
    }
});

// 管理员上传组织图片
router.post('/:id/images', authMiddleware, roleMiddleware(['admin']), upload.single('image'), async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: '未提供图片文件' });
        }
        
        // 构建图片URL
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        
        // 获取当前图片列表
        const currentImages = organization.images || [];
        
        // 添加新图片
        currentImages.push(imageUrl);
        
        // 更新组织图片
        await organization.update({ images: currentImages });
        
        res.status(200).json({ 
            message: '图片上传成功', 
            imageUrl: imageUrl,
            images: currentImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片上传失败', error: error.message });
    }
});

// 管理员删除组织图片
router.delete('/:id/images/:imageUrl', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const organization = await Organization.findByPk(req.params.id);
        if (!organization) {
            return res.status(404).json({ message: '组织不存在' });
        }
        
        // 获取当前图片列表
        const currentImages = organization.images || [];
        
        // 删除指定图片
        const updatedImages = currentImages.filter(image => image !== decodeURIComponent(req.params.imageUrl));
        
        // 更新组织图片
        await organization.update({ images: updatedImages });
        
        res.status(200).json({ 
            message: '图片删除成功',
            images: updatedImages
        });
    } catch (error) {
        res.status(500).json({ message: '图片删除失败', error: error.message });
    }
});

module.exports = router;