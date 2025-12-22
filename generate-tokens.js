const jwt = require('jsonwebtoken');

// 使用新的密钥
const secret = 'woshiguozitong123456';

// 获取命令行参数
const role = process.argv[2] || 'organizer';

// 生成令牌
const token = jwt.sign(
    { id: role === 'admin' ? 1 : role === 'organizer' ? 2 : 3, role: role },
    secret,
    { expiresIn: '1d' }
);

// 只输出token，不包含角色前缀
console.log(token);