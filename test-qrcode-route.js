// 测试修改后的二维码生成路由
const http = require('http');

// 测试配置
const TEST_ACTIVITY_ID = 3;

async function testQRCodeRoute() {
    console.log('=== 测试修改后的二维码生成路由 ===');
    
    try {
        // 1. 测试POST路由 - 生成新二维码
        console.log('\n1. 测试POST路由 - 生成新二维码');
        const postResponse = await makeHttpRequest('POST', `/activities/${TEST_ACTIVITY_ID}/qrcode`, {
            expiry: 60,
            usageLimit: 100
        });
        console.log('POST状态码:', postResponse.status);
        console.log('POST响应:', postResponse.data.message);
        console.log('POST生成的二维码长度:', postResponse.data.qrCode ? postResponse.data.qrCode.length : '无');
        
        if (postResponse.status === 200 && postResponse.data.qrCode) {
            console.log('✅ POST路由测试成功');
        } else {
            console.error('❌ POST路由测试失败');
        }
        
        // 2. 测试PUT路由 - 更新二维码
        console.log('\n2. 测试PUT路由 - 更新二维码');
        const putResponse = await makeHttpRequest('PUT', `/activities/${TEST_ACTIVITY_ID}/qrcode`, {
            expiry: 30,
            usageLimit: 50
        });
        console.log('PUT状态码:', putResponse.status);
        console.log('PUT响应:', putResponse.data.message);
        console.log('PUT生成的二维码长度:', putResponse.data.qrCode ? putResponse.data.qrCode.length : '无');
        
        if (putResponse.status === 200 && putResponse.data.qrCode) {
            console.log('✅ PUT路由测试成功');
        } else {
            console.error('❌ PUT路由测试失败');
        }
        
        // 3. 比较两次生成的二维码是否不同
        if (postResponse.data.qrCode && putResponse.data.qrCode) {
            console.log('\n3. 比较两次生成的二维码');
            if (postResponse.data.qrCode !== putResponse.data.qrCode) {
                console.log('✅ 两次生成的二维码不同，修改成功！');
            } else {
                console.error('❌ 两次生成的二维码相同，修改失败！');
            }
        }
        
        // 4. 测试GET路由 - 获取二维码
        console.log('\n4. 测试GET路由 - 获取二维码');
        const getResponse = await makeHttpRequest('GET', `/activities/${TEST_ACTIVITY_ID}/qrcode`);
        console.log('GET状态码:', getResponse.status);
        console.log('GET响应:', getResponse.data.message);
        console.log('GET获取的二维码长度:', getResponse.data.qrCode ? getResponse.data.qrCode.length : '无');
        
        if (getResponse.status === 200) {
            console.log('✅ GET路由测试成功');
        } else {
            console.error('❌ GET路由测试失败');
        }
        
        console.log('\n🎉 所有路由测试完成！');
        
    } catch (error) {
        console.error('\n❌ 测试失败:', error.message);
        console.error('错误堆栈:', error.stack);
    }
}

// HTTP请求函数
function makeHttpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        // 使用测试token
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJvcmdhbml6ZXIiLCJpYXQiOjE3NDQxMjA1MjJ9.0eZ5WZ4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4';
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: `/api${path}`,
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
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

// 运行测试
testQRCodeRoute();
