// 测试二维码更新API的脚本
const http = require('http');

// 使用测试令牌
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6Im9yZ2FuaXplciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.A0_4orz7xSWf1GVWQ5E1sl0YtOlvn_XDPPp6RU1xiYY';

// 测试活动ID
const activityId = 1;

// 测试请求选项
function getOptions() {
    return {
        hostname: 'localhost',
        port: 3001,
        path: `/api/activities/${activityId}/qrcode`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testToken}`
        }
    };
}

// 发送测试请求的函数
function sendTestRequest(requestCount) {
    return new Promise((resolve, reject) => {
        const options = getOptions();
        const data = JSON.stringify({ expiry: 60, usageLimit: 100 });
        
        // 更新请求头的Content-Length
        options.headers['Content-Length'] = data.length;
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    console.log(`请求 ${requestCount} 结果: ${res.statusCode}`);
                    console.log(`二维码数据长度: ${result.qrCode ? result.qrCode.length : 0}`);
                    resolve(result.qrCode);
                } catch (error) {
                    reject(new Error(`解析响应失败: ${error.message}`));
                }
            });
        });
        
        req.on('error', (error) => {
            reject(new Error(`请求失败: ${error.message}`));
        });
        
        req.write(data);
        req.end();
    });
}

// 运行测试
async function runTest() {
    console.log('开始测试二维码更新功能...');
    console.log('活动ID:', activityId);
    console.log('\n=====================================\n');
    
    try {
        // 发送两次请求，比较结果
        const qrCode1 = await sendTestRequest(1);
        console.log('\n=====================================\n');
        
        // 等待1秒，确保时间戳不同
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const qrCode2 = await sendTestRequest(2);
        console.log('\n=====================================\n');
        
        // 比较两次结果
        if (qrCode1 && qrCode2) {
            if (qrCode1 !== qrCode2) {
                console.log('✅ 测试通过！每次请求都返回了不同的二维码数据。');
                console.log('   二维码1长度:', qrCode1.length);
                console.log('   二维码2长度:', qrCode2.length);
            } else {
                console.log('❌ 测试失败！两次请求返回了相同的二维码数据。');
            }
        } else {
            console.log('❌ 测试失败！未能获取有效的二维码数据。');
        }
        
    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
    }
}

// 执行测试
runTest();
