// 测试修复后的API端点
const fetch = require('node-fetch');

// 生成JWT令牌的函数
function generateJWTToken(payload) {
    const secret = 'woshiguozitong123456';
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600; // 1小时过期
    const payloadWithExp = { ...payload, iat: now, exp: exp };
    
    // 简单的Base64URL编码实现
    const base64UrlEncode = (str) => {
        return Buffer.from(JSON.stringify(str))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payloadWithExp);
    
    // 注意：这只是一个简化的签名实现，仅用于测试
    // 真实环境中应该使用crypto模块生成正确的HS256签名
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const generateSimpleSignature = (input, secret) => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Buffer.from(hash.toString(16).padStart(64, '0'))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const signature = generateSimpleSignature(signatureInput, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function testAPI() {
    // 使用真实用户信息生成令牌
    const token = generateJWTToken({
        id: 1,
        name: '测试用户',
        email: 'test@example.com',
        role: 'volunteer'
    });
    
    console.log('使用生成的令牌:', token);
    
    try {
        console.log('发送请求到 /api/user/activities...');
        const response = await fetch('http://localhost:3001/api/user/activities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const responseText = await response.text();
        console.log('HTTP状态码:', response.status);
        console.log('响应内容:', responseText);
        
        // 尝试解析为JSON
        try {
            const result = JSON.parse(responseText);
            console.log('解析后的响应:', result);
        } catch (parseError) {
            console.log('无法解析为JSON:', parseError.message);
        }
        
        if (response.ok) {
            console.log('✅ API请求成功');
        } else {
            console.log('❌ API请求失败');
        }
    } catch (error) {
        console.error('❌ API测试出错:', error);
    }
}

testAPI();
