// API请求函数
const API_BASE_URL = 'http://localhost:3000/api';

// 通用请求函数
async function request(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    // 添加认证令牌
    const token = localStorage.getItem('token');
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// 活动相关API
export const activityApi = {
    // 获取活动列表
    getActivities: () => request('/activities'),
    
    // 获取活动详情
    getActivityDetail: (id) => request(`/activities/${id}`),
    
    // 报名活动
    registerActivity: (id, data) => request(`/activities/${id}/register`, 'POST', data),
    
    // 获取用户报名的活动
    getUserActivities: () => request('/user/activities'),
};

// 培训相关API
export const trainingApi = {
    // 获取培训列表
    getTrainings: () => request('/trainings'),
    
    // 获取培训详情
    getTrainingDetail: (id) => request(`/trainings/${id}`),
    
    // 报名培训
    registerTraining: (id, data) => request(`/trainings/${id}/register`, 'POST', data),
    
    // 获取用户报名的培训
    getUserTrainings: () => request('/user/trainings'),
};

// 用户相关API
export const userApi = {
    // 登录
    login: (data) => request('/auth/login', 'POST', data),
    
    // 注册
    register: (data) => request('/auth/register', 'POST', data),
    
    // 获取用户信息
    getProfile: () => request('/user/profile'),
    
    // 更新用户信息
    updateProfile: (data) => request('/user/profile', 'PUT', data),
    
    // 获取用户志愿时长
    getVolunteerHours: () => request('/user/hours'),
    
    // 扫码签到
    scanSign: (qrCode) => request('/user/sign', 'POST', { qrCode }),
};

// 组织相关API
export const organizerApi = {
    // 获取组织列表
    getOrganizers: () => request('/organizers'),
    
    // 获取组织详情
    getOrganizerDetail: (id) => request(`/organizers/${id}`),
};

// 签到相关API
export const signApi = {
    // 获取签到记录
    getSignRecords: () => request('/user/sign-records'),
};