module.exports = {
    server: {
        port: 3001,
        host: 'localhost'
    },
    database: {
      dialect: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',      // 您的MySQL用户名
      password: '123456', // 您的MySQL密码
      database: 'volunteer_management_system',
      timezone: '+08:00',
       dialectOptions: {
           charset: 'utf8mb4'
       }
    },
    jwt: {
        secret: 'woshiguozitong123456',
        expiresIn: '1d'
    },
    bcrypt: {
        saltRounds: 10
    }
};