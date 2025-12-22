const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Skill, User, UserSkill } = require('../models');
const { authMiddleware, roleMiddleware } = require('../utils/authMiddleware');
const { body, validationResult } = require('express-validator');

// 技能验证规则
const skillValidationRules = [
    body('name').notEmpty().withMessage('技能名称不能为空').isLength({ max: 50 }).withMessage('技能名称不能超过50个字符'),
    body('description').notEmpty().withMessage('技能描述不能为空'),
    body('category').notEmpty().withMessage('技能分类不能为空')
];

// 用户技能验证规则
const userSkillValidationRules = [
    body('skillId').notEmpty().withMessage('技能ID不能为空').isInt().withMessage('技能ID必须是数字'),
    body('proficiency').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('技能熟练度无效'),
    body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('工作经验年限必须大于等于0')
];

// 验证结果处理中间件
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    return res.status(400).json({ message: '输入验证失败', errors: errors.array() });
}

// 获取技能列表
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
        
        // 根据分类搜索
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
        let order = [['name', 'ASC']];
        if (req.query.sortBy) {
            const sortOrder = req.query.order === 'desc' ? 'DESC' : 'ASC';
            order = [[req.query.sortBy, sortOrder]];
        }
        
        const { count, rows: skills } = await Skill.findAndCountAll({
            where: whereCondition,
            order: order,
            limit: pageSize,
            offset: offset
        });
        
        res.status(200).json({
            data: skills,
            pagination: {
                total: count,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(count / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取技能列表失败', error: error.message });
    }
});

// 获取技能详情
router.get('/:id', async (req, res) => {
    try {
        const skill = await Skill.findByPk(req.params.id);
        if (!skill) {
            return res.status(404).json({ message: '技能不存在' });
        }
        res.status(200).json(skill);
    } catch (error) {
        res.status(500).json({ message: '获取技能详情失败', error: error.message });
    }
});

// 创建技能（仅管理员）
router.post('/', authMiddleware, roleMiddleware(['admin']), skillValidationRules, validate, async (req, res) => {
    try {
        const skill = await Skill.create({
            name: req.body.name,
            description: req.body.description,
            category: req.body.category
        });
        res.status(201).json({ message: '技能创建成功', skill });
    } catch (error) {
        res.status(500).json({ message: '创建技能失败', error: error.message });
    }
});

// 更新技能（仅管理员）
router.put('/:id', authMiddleware, roleMiddleware(['admin']), [
    body('name').optional().isLength({ max: 50 }).withMessage('技能名称不能超过50个字符'),
    body('description').optional().notEmpty().withMessage('技能描述不能为空'),
    body('category').optional().notEmpty().withMessage('技能分类不能为空')
], validate, async (req, res) => {
    try {
        const skill = await Skill.findByPk(req.params.id);
        if (!skill) {
            return res.status(404).json({ message: '技能不存在' });
        }
        await skill.update({
            name: req.body.name,
            description: req.body.description,
            category: req.body.category
        });
        res.status(200).json({ message: '技能更新成功', skill });
    } catch (error) {
        res.status(500).json({ message: '更新技能失败', error: error.message });
    }
});

// 删除技能（仅管理员）
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    try {
        const skill = await Skill.findByPk(req.params.id);
        if (!skill) {
            return res.status(404).json({ message: '技能不存在' });
        }
        await skill.destroy();
        res.status(200).json({ message: '技能删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除技能失败', error: error.message });
    }
});

// 获取用户技能列表
router.get('/user/:userId', async (req, res) => {
    try {
        // 获取分页参数
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        
        // 构建查询条件
        const includeCondition = [
            {
                model: Skill,
                as: 'skills',
                through: {
                    attributes: ['proficiency', 'yearsOfExperience'],
                    order: [['proficiency', 'DESC'], ['yearsOfExperience', 'DESC']],
                    limit: pageSize,
                    offset: offset
                }
            }
        ];
        
        const user = await User.findByPk(req.params.userId, {
            include: includeCondition
        });
        
        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }
        
        // 获取用户技能总数
        const total = await UserSkill.count({
            where: {
                userId: req.params.userId
            }
        });
        
        res.status(200).json({
            data: user.skills,
            pagination: {
                total: total,
                page: page,
                pageSize: pageSize,
                totalPages: Math.ceil(total / pageSize)
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取用户技能列表失败', error: error.message });
    }
});

// 当前用户添加技能
router.post('/user/skills', authMiddleware, userSkillValidationRules, validate, async (req, res) => {
    try {
        const { skillId, proficiency, yearsOfExperience } = req.body;
        
        // 检查技能是否存在
        const skill = await Skill.findByPk(skillId);
        if (!skill) {
            return res.status(404).json({ message: '技能不存在' });
        }
        
        // 检查是否已添加该技能
        const existingSkill = await UserSkill.findOne({
            where: {
                userId: req.user.id,
                skillId: skillId
            }
        });
        if (existingSkill) {
            return res.status(400).json({ message: '您已添加该技能' });
        }
        
        // 添加技能
        await UserSkill.create({
            userId: req.user.id,
            skillId: skillId,
            proficiency: proficiency || 'beginner',
            yearsOfExperience: yearsOfExperience
        });
        
        res.status(200).json({ message: '技能添加成功' });
    } catch (error) {
        res.status(500).json({ message: '添加技能失败', error: error.message });
    }
});

// 当前用户更新技能
router.put('/user/skills/:skillId', authMiddleware, [
    body('proficiency').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('技能熟练度无效'),
    body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('工作经验年限必须大于等于0')
], validate, async (req, res) => {
    try {
        const { proficiency, yearsOfExperience } = req.body;
        
        // 检查关联是否存在
        const userSkill = await UserSkill.findOne({
            where: {
                userId: req.user.id,
                skillId: req.params.skillId
            }
        });
        if (!userSkill) {
            return res.status(404).json({ message: '技能未添加' });
        }
        
        // 更新技能
        await userSkill.update({
            proficiency: proficiency,
            yearsOfExperience: yearsOfExperience
        });
        
        res.status(200).json({ message: '技能更新成功' });
    } catch (error) {
        res.status(500).json({ message: '更新技能失败', error: error.message });
    }
});

// 当前用户删除技能
router.delete('/user/skills/:skillId', authMiddleware, async (req, res) => {
    try {
        // 检查关联是否存在
        const userSkill = await UserSkill.findOne({
            where: {
                userId: req.user.id,
                skillId: req.params.skillId
            }
        });
        if (!userSkill) {
            return res.status(404).json({ message: '技能未添加' });
        }
        
        // 删除技能
        await userSkill.destroy();
        
        res.status(200).json({ message: '技能删除成功' });
    } catch (error) {
        res.status(500).json({ message: '删除技能失败', error: error.message });
    }
});

// 获取技能分类列表
router.get('/categories', async (req, res) => {
    try {
        const categories = await Skill.findAll({
            attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
            where: {
                category: { [Op.not]: null }
            },
            order: [[sequelize.col('category'), 'ASC']]
        });
        
        res.status(200).json({
            data: categories.map(item => item.category)
        });
    } catch (error) {
        res.status(500).json({ message: '获取技能分类列表失败', error: error.message });
    }
});

// 获取技能统计数据
router.get('/stats', async (req, res) => {
    try {
        // 技能总数
        const totalSkills = await Skill.count();
        
        // 分类统计
        const categoryStats = await Skill.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('category')), 'count']],
            group: ['category'],
            order: [[sequelize.fn('COUNT', sequelize.col('category')), 'DESC']]
        });
        
        // 用户技能关联总数
        const totalUserSkills = await UserSkill.count();
        
        res.status(200).json({
            data: {
                totalSkills,
                categoryStats,
                totalUserSkills
            }
        });
    } catch (error) {
        res.status(500).json({ message: '获取技能统计数据失败', error: error.message });
    }
});

// 批量添加用户技能
router.post('/user/skills/batch', authMiddleware, [
    body('skills').notEmpty().withMessage('技能列表不能为空').isArray().withMessage('技能列表必须是数组'),
    body('skills.*.skillId').notEmpty().withMessage('技能ID不能为空').isInt().withMessage('技能ID必须是数字'),
    body('skills.*.proficiency').optional().isIn(['beginner', 'intermediate', 'advanced', 'expert']).withMessage('技能熟练度无效'),
    body('skills.*.yearsOfExperience').optional().isInt({ min: 0 }).withMessage('工作经验年限必须大于等于0')
], validate, async (req, res) => {
    try {
        const { skills } = req.body;
        const userId = req.user.id;
        
        // 批量创建或更新用户技能
        for (const skillData of skills) {
            const { skillId, proficiency, yearsOfExperience } = skillData;
            
            // 检查技能是否存在
            const skill = await Skill.findByPk(skillId);
            if (!skill) {
                return res.status(404).json({ message: `技能ID ${skillId} 不存在` });
            }
            
            // 检查是否已添加该技能
            const existingSkill = await UserSkill.findOne({
                where: {
                    userId: userId,
                    skillId: skillId
                }
            });
            
            if (existingSkill) {
                // 更新现有技能
                await existingSkill.update({
                    proficiency: proficiency || existingSkill.proficiency,
                    yearsOfExperience: yearsOfExperience || existingSkill.yearsOfExperience
                });
            } else {
                // 添加新技能
                await UserSkill.create({
                    userId: userId,
                    skillId: skillId,
                    proficiency: proficiency || 'beginner',
                    yearsOfExperience: yearsOfExperience
                });
            }
        }
        
        res.status(200).json({ message: '技能批量添加成功' });
    } catch (error) {
        res.status(500).json({ message: '批量添加技能失败', error: error.message });
    }
});

// 批量删除用户技能
router.delete('/user/skills/batch', authMiddleware, [
    body('skillIds').notEmpty().withMessage('技能ID列表不能为空').isArray().withMessage('技能ID列表必须是数组')
], validate, async (req, res) => {
    try {
        const { skillIds } = req.body;
        
        // 批量删除技能
        await UserSkill.destroy({
            where: {
                userId: req.user.id,
                skillId: {
                    [Op.in]: skillIds
                }
            }
        });
        
        res.status(200).json({ message: '技能批量删除成功' });
    } catch (error) {
        res.status(500).json({ message: '批量删除技能失败', error: error.message });
    }
});

module.exports = router;