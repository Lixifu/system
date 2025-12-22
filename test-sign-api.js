// 测试扫码签到API的脚本 - 使用内置http模块
const http = require('http');

// 使用测试令牌
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.FJB8SYOkBmtc9RedB2_qxwO8zppPzPqlFXfktFPsOwI';

// 测试数据
const testData = JSON.stringify({
    qrCode: 'activity-1,signIn'
});

// 请求选项
const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/user/sign',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
        'Content-Length': testData.length
    }
};

// 发送测试请求
const req = http.request(options, (res) => {
    console.log(`状态码: ${res.statusCode}`);
    console.log(`响应头: ${JSON.stringify(res.headers)}`);
    
    res.on('data', (d) => {
        process.stdout.write(d);
    });
    
    res.on('end', () => {
        console.log('\n测试请求完成');
    });
});

req.on('error', (error) => {
    console.error(`测试失败: ${error.message}`);
});

// 发送数据
req.write(testData);
req.end();
