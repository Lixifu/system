const winston = require('winston');
const path = require('path');

// 定义日志文件路径
const logDir = path.join(__dirname, '../../logs');

// 日志格式配置
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
        return `${timestamp} [${level}] ${message} ${metaString}`;
    })
);

// 控制台日志格式（更简洁）
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level}] ${message}`;
    })
);

// 创建日志记录器
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    format: logFormat,
    transports: [
        // 错误日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // 所有日志文件
        new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
            tailable: true
        }),
        // 控制台输出（开发环境）
        new winston.transports.Console({
            format: consoleFormat
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'exceptions.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logDir, 'rejections.log'),
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// 导出日志记录器
exports.logger = logger;

// 导出便捷的日志方法
exports.log = {
    debug: (message, meta) => logger.debug(message, meta),
    info: (message, meta) => logger.info(message, meta),
    warn: (message, meta) => logger.warn(message, meta),
    error: (message, meta) => logger.error(message, meta),
    http: (message, meta) => logger.http(message, meta)
};

// 中间件：记录HTTP请求日志
exports.requestLogger = (req, res, next) => {
    const start = Date.now();
    
    // 记录请求开始
    logger.http(`${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    
    // 监听响应完成事件，记录响应信息
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`, {
            statusCode: res.statusCode,
            duration: duration,
            ip: req.ip
        });
    });
    
    next();
};
