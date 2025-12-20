module.exports = {
    server: {
        port: 3000,
        host: 'localhost'
    },
    database: {
        url: 'mongodb://localhost:27017/volunteer-management-system'
    },
    jwt: {
        secret: 'your-secret-key',
        expiresIn: '1d'
    },
    bcrypt: {
        saltRounds: 10
    }
};