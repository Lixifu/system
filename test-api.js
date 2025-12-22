// 测试修复后的API端点
const fetch = require('node-fetch');

// 生成测试JWT令牌
function generateJWTToken() {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const payload = {
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        role: 'volunteer',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    
    // 简化的JWT生成，仅用于测试
    const base64UrlEncode = (str) => {
        return Buffer.from(JSON.stringify(str)).toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const signature = 'test-signature'; // 简化的签名，仅用于测试
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function testAPI() {
    const token = generateJWTToken();
    console.log('使用测试令牌:', token);
    
    try {
        const response = await fetch('http://localhost:3001/api/user/activities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        console.log('API响应:', result);
        console.log('状态码:', response.status);
        
        if (response.ok) {
            console.log('✅ API请求成功');
            console.log('返回活动数量:', result.data.length);
            console.log('分页信息:', result.pagination);
        } else {
            console.log('❌ API请求失败');
        }
    } catch (error) {
        console.error('❌ API测试出错:', error);
    }
}

testAPI();
