const http = require('http');

// 测试配置
const TEST_ACTIVITY_ID = 3;
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJvcmdhbml6ZXIiLCJpYXQiOjE3NDQxMjA1MjJ9.0eZ5WZ4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4'; // 替换为有效的组织方token

// HTTP请求函数
function makeHttpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let responseBody = '';
            
            res.on('data', (chunk) => {
                responseBody += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsedBody = JSON.parse(responseBody);
                    resolve({ status: res.statusCode, data: parsedBody });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseBody });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data && (method === 'POST' || method === 'PUT')) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// 测试用例：获取活动二维码信息
async function testGetQRCode() {
    console.log('\n=== 测试获取活动二维码信息 ===');
    try {
        const response = await makeHttpRequest('GET', `/activities/${TEST_ACTIVITY_ID}/qrcode`);
        if (response.status === 200) {
            console.log('✅ 获取二维码成功:', response.data.message);
            console.log('二维码信息:', response.data.qrCode ? '存在' : '不存在');
            return response.data;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('❌ 获取二维码失败:', error.message);
        throw error;
    }
}

// 测试用例：生成新的二维码
async function testGenerateQRCode() {
    console.log('\n=== 测试生成新的二维码 ===');
    try {
        const response = await makeHttpRequest('POST', `/activities/${TEST_ACTIVITY_ID}/qrcode`, {
            expiry: 60,
            usageLimit: 100
        });
        if (response.status === 200) {
            console.log('✅ 生成二维码成功:', response.data.message);
            console.log('新二维码:', response.data.qrCode ? '已生成' : '未生成');
            return response.data;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('❌ 生成二维码失败:', error.message);
        throw error;
    }
}

// 测试用例：更新二维码
async function testUpdateQRCode() {
    console.log('\n=== 测试更新二维码 ===');
    try {
        const response = await makeHttpRequest('PUT', `/activities/${TEST_ACTIVITY_ID}/qrcode`, {
            expiry: 30,
            usageLimit: 50
        });
        if (response.status === 200) {
            console.log('✅ 更新二维码成功:', response.data.message);
            console.log('更新后的二维码:', response.data.qrCode ? '已更新' : '未更新');
            return response.data;
        } else {
            throw new Error(`HTTP ${response.status}: ${response.data.message || '未知错误'}`);
        }
    } catch (error) {
        console.error('❌ 更新二维码失败:', error.message);
        throw error;
    }
}

// 运行所有测试用例
async function runAllTests() {
    console.log('开始测试二维码管理功能...');
    try {
        // 1. 先获取当前二维码
        await testGetQRCode();
        
        // 2. 生成新二维码
        const generateResult = await testGenerateQRCode();
        
        // 3. 验证新二维码已生成
        const getAfterGenerate = await testGetQRCode();
        if (getAfterGenerate.qrCode) {
            console.log('\n✅ 验证：新二维码已成功保存');
        }
        
        // 4. 更新二维码
        await testUpdateQRCode();
        
        // 5. 验证更新后的二维码
        const getAfterUpdate = await testGetQRCode();
        if (getAfterUpdate.qrCode) {
            console.log('\n✅ 验证：二维码已成功更新');
        }
        
        console.log('\n🎉 所有测试用例执行完成！');
    } catch (error) {
        console.error('\n❌ 测试执行失败:', error.message);
    }
}

// 运行测试
runAllTests();
