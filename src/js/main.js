// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化页面
    initPage();
    
    // 加载活动列表
    loadActivities();
    
    // 加载培训列表
    loadTrainings();
    
    // 绑定登录按钮事件
    bindLoginEvents();
    
    // 绑定模态框事件
    bindModalEvents();
    
    // 绑定表单事件
    bindFormEvents();
});

// 初始化页面
function initPage() {
    console.log('页面初始化完成');
    
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        // 用户已登录，更新导航栏
        updateNavForLoggedInUser();
        // 加载用户信息
        loadUserProfile();
    }
}

// 更新登录状态的导航栏
function updateNavForLoggedInUser() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.textContent = '退出登录';
    loginBtn.onclick = function(e) {
        e.preventDefault();
        logout();
    };
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    location.reload();
}

// 绑定登录事件
function bindLoginEvents() {
    const loginBtn = document.getElementById('loginBtn');
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        // 显示登录模态框
        showModal('loginModal');
    });
}

// 绑定模态框事件
function bindModalEvents() {
    // 获取模态框元素
    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');
    const activityDetailModal = document.getElementById('activityDetailModal');
    
    // 获取关闭按钮
    const closeBtns = document.querySelectorAll('.close');
    
    // 获取切换表单链接
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    
    // 关闭模态框事件
    closeBtns.forEach(btn => {
        btn.onclick = function() {
            const modal = this.closest('.modal');
            hideModal(modal.id);
        };
    });
    
    // 点击模态框外部关闭模态框
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            hideModal(event.target.id);
        }
    };
    
    // 切换到注册表单
    showRegisterLink.onclick = function(e) {
        e.preventDefault();
        hideModal('loginModal');
        showModal('registerModal');
    };
    
    // 切换到登录表单
    showLoginLink.onclick = function(e) {
        e.preventDefault();
        hideModal('registerModal');
        showModal('loginModal');
    };
}

// 显示模态框
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
}

// 隐藏模态框
function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

// 绑定表单事件
function bindFormEvents() {
    // 登录表单提交
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin(e);
    });
    
    // 注册表单提交
    const registerForm = document.getElementById('registerForm');
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        handleRegister(e);
    });
}

// 处理登录
async function handleLogin(e) {
    const formData = new FormData(e.target);
    const emailPhone = formData.get('emailPhone');
    const password = formData.get('password');
    
    try {
        // 调用登录API
        const response = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: emailPhone,
                phone: emailPhone,
                password
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 登录成功，保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // 隐藏登录模态框
            hideModal('loginModal');
            
            // 更新页面
            updateNavForLoggedInUser();
            loadUserProfile();
            
            alert('登录成功');
        } else {
            // 登录失败
            alert(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        alert('登录请求失败，请稍后重试');
    }
}

// 处理注册
async function handleRegister(e) {
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role');
    
    try {
        // 调用注册API
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                phone,
                email,
                password,
                role
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 注册成功，隐藏注册模态框，显示登录模态框
            hideModal('registerModal');
            showModal('loginModal');
            alert('注册成功，请登录');
        } else {
            // 注册失败
            alert(data.message || '注册失败');
        }
    } catch (error) {
        console.error('注册请求失败:', error);
        alert('注册请求失败，请稍后重试');
    }
}

// 查看活动详情
function viewActivityDetail(activityId) {
    // 这里应该调用API获取活动详情
    // 暂时使用模拟数据
    const mockActivity = {
        id: activityId,
        title: '社区清洁活动',
        description: '我们将组织志愿者清理社区的公园和街道，为社区居民创造一个干净整洁的环境。',
        type: '环保',
        startTime: '2024-11-15 09:00',
        endTime: '2024-11-15 12:00',
        location: '阳光社区',
        quota: 50,
        registeredCount: 30,
        organizer: '张三',
        organization: '阳光志愿者协会',
        status: '招募中',
        requirements: '身体健康，能吃苦耐劳',
        images: []
    };
    
    renderActivityDetail(mockActivity);
    showModal('activityDetailModal');
}

// 渲染活动详情
function renderActivityDetail(activity) {
    const activityDetailContent = document.getElementById('activityDetailContent');
    activityDetailContent.innerHTML = `
        <h2>${activity.title}</h2>
        <div class="activity-detail">
            <p><strong>活动类型:</strong> ${activity.type}</p>
            <p><strong>开始时间:</strong> ${activity.startTime}</p>
            <p><strong>结束时间:</strong> ${activity.endTime}</p>
            <p><strong>活动地点:</strong> ${activity.location}</p>
            <p><strong>招募人数:</strong> ${activity.registeredCount}/${activity.quota}</p>
            <p><strong>组织者:</strong> ${activity.organizer} (${activity.organization})</p>
            <p><strong>活动状态:</strong> ${activity.status}</p>
            <p><strong>报名要求:</strong> ${activity.requirements}</p>
            <h3>活动描述</h3>
            <p>${activity.description}</p>
            <button class="btn btn-primary" onclick="registerActivity(${activity.id})">立即报名</button>
        </div>
    `;
}

// 加载活动列表
async function loadActivities() {
    try {
        // 调用后端API获取活动列表
        const response = await fetch('http://localhost:3000/api/mock/activities');
        const activities = await response.json();
        
        // 转换数据格式以适应前端渲染
        const formattedActivities = activities.map(activity => ({
            id: activity._id,
            title: activity.title,
            time: new Date(activity.startTime).toLocaleString('zh-CN'),
            location: activity.location,
            quota: activity.quota,
            registered: activity.registeredCount,
            status: activity.status === 'recruiting' ? '招募中' : activity.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        renderActivities(formattedActivities);
    } catch (error) {
        console.error('加载活动列表失败:', error);
        // 加载失败时使用模拟数据
        const mockActivities = [
            {
                id: 1,
                title: '社区清洁活动',
                time: '2024-11-15 09:00',
                location: '阳光社区',
                quota: 50,
                registered: 30,
                status: '招募中'
            },
            {
                id: 2,
                title: '老人陪伴活动',
                time: '2024-11-16 14:00',
                location: '幸福养老院',
                quota: 20,
                registered: 15,
                status: '招募中'
            },
            {
                id: 3,
                title: '儿童安全教育',
                time: '2024-11-17 10:00',
                location: '希望小学',
                quota: 30,
                registered: 25,
                status: '招募中'
            }
        ];
        renderActivities(mockActivities);
    }
}

// 渲染活动列表
function renderActivities(activities) {
    const activityList = document.getElementById('activityList');
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <h3>${activity.title}</h3>
            <p><strong>时间:</strong> ${activity.time}</p>
            <p><strong>地点:</strong> ${activity.location}</p>
            <p><strong>招募人数:</strong> ${activity.registered}/${activity.quota}</p>
            <p><strong>状态:</strong> ${activity.status}</p>
            <div class="activity-actions">
                <button class="btn" onclick="viewActivityDetail(${activity.id})">查看详情</button>
                <button class="btn btn-primary" onclick="registerActivity(${activity.id})">立即报名</button>
            </div>
        `;
        activityList.appendChild(activityItem);
    });
}

// 报名活动
function registerActivity(activityId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }
    
    // 这里应该调用API报名活动
    alert(`正在报名活动 ${activityId}`);
}

// 加载培训列表
async function loadTrainings() {
    try {
        // 调用后端API获取培训列表
        const response = await fetch('http://localhost:3000/api/mock/trainings');
        const trainings = await response.json();
        
        // 转换数据格式以适应前端渲染
        const formattedTrainings = trainings.map(training => ({
            id: training._id,
            title: training.title,
            time: new Date(training.startTime).toLocaleString('zh-CN'),
            duration: `${Math.round((new Date(training.endTime) - new Date(training.startTime)) / (1000 * 60 * 60))}小时`,
            teacher: training.teacher,
            status: training.status === 'recruiting' ? '报名中' : training.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        renderTrainings(formattedTrainings);
    } catch (error) {
        console.error('加载培训列表失败:', error);
        // 加载失败时使用模拟数据
        const mockTrainings = [
            {
                id: 1,
                title: '志愿者通用培训',
                time: '2024-11-20 09:00',
                duration: '2小时',
                teacher: '张老师',
                status: '报名中'
            },
            {
                id: 2,
                title: '急救知识培训',
                time: '2024-11-22 14:00',
                duration: '3小时',
                teacher: '李医生',
                status: '报名中'
            }
        ];
        renderTrainings(mockTrainings);
    }
}

// 渲染培训列表
function renderTrainings(trainings) {
    const trainingList = document.getElementById('trainingList');
    trainingList.innerHTML = '';
    
    trainings.forEach(training => {
        const trainingItem = document.createElement('div');
        trainingItem.className = 'training-item';
        trainingItem.innerHTML = `
            <h3>${training.title}</h3>
            <p><strong>时间:</strong> ${training.time}</p>
            <p><strong>时长:</strong> ${training.duration}</p>
            <p><strong>讲师:</strong> ${training.teacher}</p>
            <p><strong>状态:</strong> ${training.status}</p>
            <button class="btn btn-primary" onclick="registerTraining(${training.id})">立即报名</button>
        `;
        trainingList.appendChild(trainingItem);
    });
}

// 报名培训
function registerTraining(trainingId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }
    
    // 这里应该调用API报名培训
    alert(`正在报名培训 ${trainingId}`);
}

// 加载用户信息
async function loadUserProfile() {
    try {
        // 这里应该调用API获取用户信息
        // 暂时使用模拟数据
        const mockUser = {
            name: '张三',
            phone: '13800138000',
            email: 'zhangsan@example.com',
            volunteerHours: 120,
            certificateCount: 5,
            medalCount: 3
        };
        
        renderUserProfile(mockUser);
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

// 渲染用户信息
function renderUserProfile(user) {
    const profileContent = document.getElementById('profileContent');
    profileContent.innerHTML = `
        <div class="profile-info">
            <div class="profile-section">
                <h3>基本信息</h3>
                <p><strong>姓名:</strong> ${user.name}</p>
                <p><strong>手机号:</strong> ${user.phone}</p>
                <p><strong>邮箱:</strong> ${user.email}</p>
            </div>
            <div class="profile-section">
                <h3>志愿统计</h3>
                <p><strong>志愿时长:</strong> ${user.volunteerHours}小时</p>
                <p><strong>获得证书:</strong> ${user.certificateCount}个</p>
                <p><strong>获得勋章:</strong> ${user.medalCount}枚</p>
            </div>
        </div>
    `;
}

// 页面滚动到指定区域
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}