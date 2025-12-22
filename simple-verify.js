// 简单验证活动和培训模型修改
const Activity = require('./backend/models/Activity');
const Training = require('./backend/models/Training');

console.log('=== 简单验证活动和培训模型修改 ===\n');

// 测试活动模型
console.log('=== 测试活动模型 ===');

// 检查Activity模型是否有countParticipants方法
if (typeof Activity.prototype.countParticipants === 'function') {
    console.log('✅ Activity模型有countParticipants方法');
} else {
    console.log('❌ Activity模型没有countParticipants方法');
}

// 检查Activity模型是否有calculateRegisteredCounts静态方法
if (typeof Activity.calculateRegisteredCounts === 'function') {
    console.log('✅ Activity模型有calculateRegisteredCounts静态方法');
} else {
    console.log('❌ Activity模型没有calculateRegisteredCounts静态方法');
}

// 测试培训模型
console.log('\n=== 测试培训模型 ===');

// 检查Training模型是否有countParticipants方法
if (typeof Training.prototype.countParticipants === 'function') {
    console.log('✅ Training模型有countParticipants方法');
} else {
    console.log('❌ Training模型没有countParticipants方法');
}

// 检查Training模型是否有calculateRegisteredCounts静态方法
if (typeof Training.calculateRegisteredCounts === 'function') {
    console.log('✅ Training模型有calculateRegisteredCounts静态方法');
} else {
    console.log('❌ Training模型没有calculateRegisteredCounts静态方法');
}

// 测试模型属性
console.log('\n=== 测试模型属性 ===');

// 检查Activity模型是否包含registeredCount字段
const activityAttributes = Activity.rawAttributes;
if (activityAttributes.registeredCount) {
    console.log('❌ Activity模型仍然包含registeredCount字段');
} else {
    console.log('✅ Activity模型已移除registeredCount字段');
}

// 检查Training模型是否包含registeredCount字段
const trainingAttributes = Training.rawAttributes;
if (trainingAttributes.registeredCount) {
    console.log('❌ Training模型仍然包含registeredCount字段');
} else {
    console.log('✅ Training模型已移除registeredCount字段');
}

console.log('\n=== 验证完成 ===');
