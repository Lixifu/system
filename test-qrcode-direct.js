const http = require('http');

// 测试配置
const TEST_ACTIVITY_ID = 3;
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGUiOiJvcmdhbml6ZXIiLCJpYXQiOjE3NDQxMjA1MjJ9.0eZ5WZ4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4'; // 使用有效的组织方token

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
                    resolve({ status: res.statusCode, data: parsedBody, raw: responseBody });
                } catch (error) {
                    resolve({ status: res.statusCode, data: responseBody, raw: responseBody });
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

// 直接测试二维码生成
async function testGenerateQRCode() {
    console.log('\n=== 直接测试二维码生成接口 ===');
    try {
        const response = await makeHttpRequest('POST', `/activities/${TEST_ACTIVITY_ID}/qrcode`, {
            expiry: 60,
            usageLimit: 100
        });
        
        console.log('状态码:', response.status);
        console.log('响应数据:', response.data);
        
        if (response.status === 200) {
            console.log('✅ 二维码生成成功');
        } else {
            console.log('❌ 二维码生成失败');
        }
        
        return response;
    } catch (error) {
        console.error('❌ 请求失败:', error.message);
        throw error;
    }
}

// 运行测试
testGenerateQRCode();
