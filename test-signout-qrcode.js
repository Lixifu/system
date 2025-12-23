// 测试签退二维码功能的脚本
const http = require('http');

// 使用测试令牌
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6Im9yZ2FuaXplciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.A0_4orz7xSWf1GVWQ5E1sl0YtOlvn_XDPPp6RU1xiYY';

// 测试活动ID
const activityId = 1;

// 辅助函数：发送HTTP请求
function sendRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, data: JSON.parse(responseData) });
                } catch (error) {
                    resolve({ statusCode: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// 测试用例1：获取活动的签到和签退二维码
async function testGetQRCode() {
    console.log('=== 测试用例1：获取活动的签到和签退二维码 ===');
    
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/activities/${activityId}/qrcode`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${testToken}`
            }
        };
        
        const result = await sendRequest(options);
        console.log('状态码:', result.statusCode);
        console.log('响应数据:', result.data);
        console.log('测试结果:', result.statusCode === 200 ? '✅ 通过' : '❌ 失败');
        
        return result.statusCode === 200;
    } catch (error) {
        console.error('测试失败:', error.message);
        console.log('测试结果:', '❌ 失败');
        return false;
    }
}

// 测试用例2：生成签退二维码
async function testGenerateSignOutQRCode() {
    console.log('\n=== 测试用例2：生成签退二维码 ===');
    
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/activities/${activityId}/qrcode`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const data = { type: 'signOut', expiry: 60, usageLimit: 100 };
        const result = await sendRequest(options, data);
        console.log('状态码:', result.statusCode);
        console.log('响应数据:', result.data);
        console.log('测试结果:', result.statusCode === 200 ? '✅ 通过' : '❌ 失败');
        
        return result.statusCode === 200;
    } catch (error) {
        console.error('测试失败:', error.message);
        console.log('测试结果:', '❌ 失败');
        return false;
    }
}

// 测试用例3：更新签退二维码
async function testUpdateSignOutQRCode() {
    console.log('\n=== 测试用例3：更新签退二维码 ===');
    
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/activities/${activityId}/qrcode`,
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const data = { type: 'signOut', expiry: 120, usageLimit: 200 };
        const result = await sendRequest(options, data);
        console.log('状态码:', result.statusCode);
        console.log('响应数据:', result.data);
        console.log('测试结果:', result.statusCode === 200 ? '✅ 通过' : '❌ 失败');
        
        return result.statusCode === 200;
    } catch (error) {
        console.error('测试失败:', error.message);
        console.log('测试结果:', '❌ 失败');
        return false;
    }
}

// 测试用例4：禁用签退二维码
async function testDisableSignOutQRCode() {
    console.log('\n=== 测试用例4：禁用签退二维码 ===');
    
    try {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api/activities/${activityId}/qrcode/disable`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${testToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        const data = { type: 'signOut' };
        const result = await sendRequest(options, data);
        console.log('状态码:', result.statusCode);
        console.log('响应数据:', result.data);
        console.log('测试结果:', result.statusCode === 200 ? '✅ 通过' : '❌ 失败');
        
        return result.statusCode === 200;
    } catch (error) {
        console.error('测试失败:', error.message);
        console.log('测试结果:', '❌ 失败');
        return false;
    }
}

// 主测试函数
async function runTests() {
    console.log('开始测试签退二维码功能...');
    console.log(`测试活动ID: ${activityId}`);
    console.log('\n=====================================\n');
    
    try {
        // 运行所有测试用例
        const test1Result = await testGetQRCode();
        const test2Result = await testGenerateSignOutQRCode();
        const test3Result = await testUpdateSignOutQRCode();
        const test4Result = await testDisableSignOutQRCode();
        
        // 统计测试结果
        const testResults = [test1Result, test2Result, test3Result, test4Result];
        const passedCount = testResults.filter(result => result).length;
        const totalCount = testResults.length;
        
        console.log('\n=====================================');
        console.log(`测试完成！通过: ${passedCount}/${totalCount}`);
        
        if (passedCount === totalCount) {
            console.log('🎉 所有测试用例均通过！');
        } else {
            console.log('⚠️  部分测试用例失败！');
        }
        
    } catch (error) {
        console.error('测试过程中发生错误:', error.message);
    }
}

// 执行测试
runTests();
