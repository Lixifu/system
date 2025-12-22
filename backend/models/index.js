// 模型关联文件 - 定义模型之间的关系
const User = require('./User');
const Activity = require('./Activity');
const Training = require('./Training');
const Organization = require('./Organization');
const ActivityParticipant = require('./ActivityParticipant');
const TrainingParticipant = require('./TrainingParticipant');
const Medal = require('./Medal');
const UserMedal = require('./UserMedal');
const ActivityTraining = require('./ActivityTraining');
const Skill = require('./Skill');
const UserSkill = require('./UserSkill');
const Notification = require('./Notification');

// 定义模型之间的关系

// 1. 用户与组织的关系
User.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

Organization.hasMany(User, {
    foreignKey: 'organizationId',
    as: 'users'
});

// 2. 活动与组织者的关系
Activity.belongsTo(User, {
    foreignKey: 'organizerId',
    as: 'organizer'
});

// 3. 活动与组织的关系
Activity.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

// 4. 培训与组织者的关系
Training.belongsTo(User, {
    foreignKey: 'organizerId',
    as: 'organizer'
});

// 5. 培训与组织的关系
Training.belongsTo(Organization, {
    foreignKey: 'organizationId',
    as: 'organization'
});

// 6. 用户与活动的多对多关系（通过ActivityParticipant）
User.belongsToMany(Activity, {
    through: ActivityParticipant,
    foreignKey: 'userId',
    otherKey: 'activityId',
    as: 'activities'
});

Activity.belongsToMany(User, {
    through: ActivityParticipant,
    foreignKey: 'activityId',
    otherKey: 'userId',
    as: 'participants'
});

// 7. 用户与培训的多对多关系（通过TrainingParticipant）
User.belongsToMany(Training, {
    through: TrainingParticipant,
    foreignKey: 'userId',
    otherKey: 'trainingId',
    as: 'trainings'
});

Training.belongsToMany(User, {
    through: TrainingParticipant,
    foreignKey: 'trainingId',
    otherKey: 'userId',
    as: 'participants'
});

// 8. 用户与勋章的多对多关系（通过UserMedal）
User.belongsToMany(Medal, {
    through: UserMedal,
    foreignKey: 'userId',
    otherKey: 'medalId',
    as: 'medals'
});

Medal.belongsToMany(User, {
    through: UserMedal,
    foreignKey: 'medalId',
    otherKey: 'userId',
    as: 'users'
});

// 9. 活动与培训的多对多关系（通过ActivityTraining）
Activity.belongsToMany(Training, {
    through: ActivityTraining,
    foreignKey: 'activityId',
    otherKey: 'trainingId',
    as: 'requiredTrainings'
});

Training.belongsToMany(Activity, {
    through: ActivityTraining,
    foreignKey: 'trainingId',
    otherKey: 'activityId',
    as: 'relatedActivities'
});

// 10. 用户与技能的多对多关系（通过UserSkill）
User.belongsToMany(Skill, {
    through: UserSkill,
    foreignKey: 'userId',
    otherKey: 'skillId',
    as: 'skills'
});

Skill.belongsToMany(User, {
    through: UserSkill,
    foreignKey: 'skillId',
    otherKey: 'userId',
    as: 'users'
});

// 11. 用户与通知的一对多关系
User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications'
});

Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

// 12. 活动参与者与用户的关系
ActivityParticipant.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

User.hasMany(ActivityParticipant, {
    foreignKey: 'userId',
    as: 'activityParticipations'
});

// 13. 活动参与者与活动的关系
ActivityParticipant.belongsTo(Activity, {
    foreignKey: 'activityId',
    as: 'activity'
});

Activity.hasMany(ActivityParticipant, {
    foreignKey: 'activityId',
    as: 'participations'
});

// 14. 培训参与者与用户的关系
TrainingParticipant.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

User.hasMany(TrainingParticipant, {
    foreignKey: 'userId',
    as: 'trainingParticipations'
});

// 15. 培训参与者与培训的关系
TrainingParticipant.belongsTo(Training, {
    foreignKey: 'trainingId',
    as: 'training'
});

Training.hasMany(TrainingParticipant, {
    foreignKey: 'trainingId',
    as: 'participations'
});

// 导出所有模型
module.exports = {
    User,
    Activity,
    Training,
    Organization,
    ActivityParticipant,
    TrainingParticipant,
    Medal,
    UserMedal,
    ActivityTraining,
    Skill,
    UserSkill,
    Notification
};