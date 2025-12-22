// 统一响应格式工具

// 成功响应
const successResponse = (res, data = null, message = '操作成功', statusCode = 200) => {
    const response = {
        status: 'success',
        message,
        timestamp: new Date().toISOString()
    };
    
    if (data) {
        response.data = data;
    }
    
    res.status(statusCode).json(response);
};

// 分页响应
const paginationResponse = (res, data, pagination, message = '操作成功', statusCode = 200) => {
    res.status(statusCode).json({
        status: 'success',
        message,
        data,
        pagination,
        timestamp: new Date().toISOString()
    });
};

// 错误响应
const errorResponse = (res, message = '操作失败', statusCode = 400, errors = null) => {
    const response = {
        status: 'error',
        message,
        timestamp: new Date().toISOString()
    };
    
    if (errors) {
        response.errors = errors;
    }
    
    res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    paginationResponse,
    errorResponse
};
