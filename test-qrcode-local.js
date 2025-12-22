// 直接测试二维码生成逻辑，绕过HTTP请求和认证
const qrcode = require('qrcode');
const { Activity } = require('./backend/models');

async function testLocalQRCodeGeneration() {
    console.log('=== 直接测试二维码生成逻辑 ===');
    
    try {
        // 1. 查找活动
        const activityId = 3;
        const activity = await Activity.findByPk(activityId);
        if (!activity) {
            console.error('❌ 活动不存在');
            return;
        }
        console.log('✅ 找到活动:', activity.title);
        
        // 2. 生成签到URL
        const signInUrl = `http://localhost:3001/api/activities/${activity.id}/signin`;
        console.log('✅ 生成签到URL:', signInUrl);
        
        // 3. 生成二维码
        console.log('🔄 正在生成二维码...');
        const qrCodeDataUrl = await qrcode.toDataURL(signInUrl);
        console.log('✅ 二维码生成成功');
        console.log('二维码数据长度:', qrCodeDataUrl.length);
        console.log('二维码数据前100个字符:', qrCodeDataUrl.substring(0, 100), '...');
        
        // 4. 保存到数据库
        console.log('🔄 正在保存到数据库...');
        await activity.update({ qrCode: qrCodeDataUrl });
        console.log('✅ 保存到数据库成功');
        
        // 5. 验证保存结果
        const updatedActivity = await Activity.findByPk(activityId);
        if (updatedActivity.qrCode) {
            console.log('✅ 验证成功，二维码已保存');
            console.log('保存的二维码数据长度:', updatedActivity.qrCode.length);
        } else {
            console.error('❌ 验证失败，二维码未保存');
        }
        
        console.log('\n🎉 所有测试步骤完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error);
        console.error('错误堆栈:', error.stack);
    }
}

// 运行测试
testLocalQRCodeGeneration();
