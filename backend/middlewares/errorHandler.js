const { ValidationError } = require('sequelize');
const { logger } = require('../utils/logger');
const { errorResponse } = require('../utils/responseFormatter');

// 自定义错误类
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
        this.isOperational = true;
        this.errors = null;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

// 全局错误处理中间件
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    // 记录错误日志
    if (err.isOperational) {
        logger.error(`${err.statusCode} ${err.message}`, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip
        });
    } else {
        logger.error('非预期错误:', err, {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip
        });
    }
    
    // 开发环境下返回详细错误信息
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        // 生产环境下返回简洁错误信息
        sendErrorProd(err, res);
    }
};

// 开发环境错误处理
const sendErrorDev = (err, res) => {
    errorResponse(res, err.message, err.statusCode, {
        error: err,
        stack: err.stack
    });
};

// 生产环境错误处理
const sendErrorProd = (err, res) => {
    // 只返回可操作的错误信息
    if (err.isOperational) {
        errorResponse(res, err.message, err.statusCode, err.errors);
    } else {
        // 返回通用错误信息
        errorResponse(res, '服务器出现了问题，请稍后重试', 500);
    }
};

// 处理Sequelize验证错误
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = '输入验证失败';
    const appError = new AppError(message, 400);
    appError.errors = errors;
    return appError;
};

// 处理Sequelize唯一约束错误
const handleDuplicateFieldsDB = (err) => {
    const value = err.errors[0]?.value || Object.keys(err.fields)[0];
    const message = `该值 ${value} 已经存在，请使用其他值`;
    return new AppError(message, 400);
};

// 处理Sequelize外键约束错误
const handleForeignKeyErrorDB = (err) => {
    const message = '该操作违反了外键约束，请检查关联数据';
    return new AppError(message, 400);
};

// 导出错误处理相关工具
module.exports = {
    AppError,
    globalErrorHandler,
    handleValidationErrorDB,
    handleDuplicateFieldsDB,
    handleForeignKeyErrorDB
};
