// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', async function() {
    // 初始化页面
    await initPage();
});

// 页面完全加载后（包括外部资源），检查jsQR库是否可用
window.addEventListener('load', function() {
    // 延迟检查，确保库有足够时间加载
    setTimeout(() => {
        if (typeof jsQR === 'undefined') {
            console.error('jsQR库加载失败，扫码功能可能无法正常工作');
            window.jsQRLoaded = false;
        } else {
            console.log('jsQR库加载成功，扫码功能可以正常使用');
            window.jsQRLoaded = true;
        }
    }, 2000); // 延迟2秒检查
});

// 生成JWT令牌的函数
function generateJWTToken(payload, secret, expiresIn) {
    // 简单的JWT生成实现，用于前端测试
    // 实际项目中应该使用专业的JWT库
    const header = { alg: 'HS256', typ: 'JWT' };
    
    // 正确处理Base64编码，避免URL安全问题
    const base64UrlEncode = (str) => {
        return btoa(JSON.stringify(str))
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const encodedHeader = base64UrlEncode(header);
    
    const now = Math.floor(Date.now() / 1000);
    const exp = expiresIn === '1d' ? now + 86400 : now + 3600;
    const payloadWithExp = { ...payload, iat: now, exp: exp };
    const encodedPayload = base64UrlEncode(payloadWithExp);
    
    // 由于前端无法直接使用Crypto API生成正确的HS256签名
    // 我们将使用一个简化的签名实现，仅用于测试
    // 实际项目中应该使用真实的JWT库或让后端生成令牌
    const signatureInput = encodedHeader + '.' + encodedPayload;
    
    // 简化的签名生成，仅用于前端测试
    // 注意：这个实现不会生成真实的HS256签名，但可以用于模拟
    const generateSimpleSignature = (input, secret) => {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        // 将hash转换为Base64URL格式
        const hashStr = hash.toString(16);
        const paddedHash = hashStr.padStart(64, '0');
        return btoa(paddedHash)
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };
    
    const signature = generateSimpleSignature(signatureInput, secret);
    
    return encodedHeader + '.' + encodedPayload + '.' + signature;
}

// 初始化页面
async function initPage() {
    try {
        console.log('=== 开始页面初始化 ===');
        
        // 绑定登录注册页面事件
        if (typeof bindLoginRegisterEvents === 'function') {
            bindLoginRegisterEvents();
            console.log('登录注册页面事件绑定完成');
        }
        
        // 检查用户是否已登录
        const token = localStorage.getItem('token');
        if (token) {
            console.log('用户已登录，token:', token);
            
            // 用户已登录，显示主系统界面
            if (typeof showMainSystem === 'function') {
                showMainSystem();
                console.log('主系统界面显示完成');
            }
            
            // 更新导航栏
            if (typeof updateNavForLoggedInUser === 'function') {
                updateNavForLoggedInUser();
                console.log('导航栏更新完成');
            }
            
            // 加载用户信息
            if (typeof loadUserProfile === 'function') {
                await loadUserProfile();
                console.log('用户信息加载完成');
            }
            
            // 加载用户注册信息（等待注册信息加载完成后再渲染活动列表）
            if (typeof loadUserRegistrations === 'function') {
                await loadUserRegistrations();
                console.log('用户注册信息加载完成');
            }
            
            // 加载活动列表
            if (typeof loadActivities === 'function') {
                loadActivities();
                console.log('活动列表加载完成');
            }
            
            // 加载培训列表
            if (typeof loadTrainings === 'function') {
                loadTrainings();
                console.log('培训列表加载完成');
            }
        } else {
            console.log('用户未登录');
            
            // 用户未登录，显示登录页面
            if (typeof showLoginPage === 'function') {
                showLoginPage();
                console.log('登录页面显示完成');
            }
            
            // 清除可能残留的报名数据，避免不同用户间数据混淆
            localStorage.removeItem('registeredActivityIds');
            localStorage.removeItem('registeredTrainingIds');
            console.log('残留报名数据清除完成');
        }
        
        console.log('=== 页面初始化完成 ===');
    } catch (error) {
        console.error('页面初始化失败:', error);
        console.error('错误堆栈:', error.stack);
        
        // 初始化失败时，显示登录页面，确保用户可以正常登录
        if (typeof showLoginPage === 'function') {
            showLoginPage();
        }
        
        // 清除可能残留的报名数据，避免不同用户间数据混淆
        localStorage.removeItem('registeredActivityIds');
        localStorage.removeItem('registeredTrainingIds');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        console.log('初始化失败，已清除所有本地存储数据');
    }
}

// 更新登录状态的导航栏
function updateNavForLoggedInUser() {
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.textContent = '退出登录';
        loginBtn.onclick = function(e) {
            e.preventDefault();
            logout();
        };
    }
    
    // 为导航链接添加点击事件处理
    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            
            // 如果是锚点链接，且指向个人中心
            if (href === '#profile') {
                e.preventDefault();
                // 滚动到个人中心区域
                scrollToSection('profile');
                // 从服务器获取最新用户信息
                getUserProfile();
            }
        });
    });
    
    // 根据用户角色显示对应的导航和页面
    showRoleBasedContent();
}

// 根据用户角色显示对应的导航和页面内容
async function showRoleBasedContent() {
    // 获取当前用户
    const userStr = localStorage.getItem('user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    const role = user.role || 'volunteer';
    
    console.log('当前用户角色:', role);
    
    // 隐藏所有角色的内容
    hideAllRoleContent();
    
    // 根据角色显示对应的内容
    switch(role) {
        case 'volunteer':
            showVolunteerContent();
            break;
        case 'organizer':
            await showOrganizerContent();
            break;
        case 'admin':
            await showAdminContent();
            break;
        default:
            showVolunteerContent();
    }
}

// 隐藏所有角色的内容
function hideAllRoleContent() {
    // 隐藏导航
    document.querySelectorAll('.volunteer-nav, .organizer-nav, .admin-nav').forEach(nav => {
        nav.style.display = 'none';
    });
    
    // 隐藏页面内容
    document.querySelectorAll('.volunteer-section, .organizer-section, .admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 停止用户列表定时刷新
    stopUserListRefresh();
    
    // 停止管理方仪表盘定时刷新
    stopAdminDashboardRefresh();
}

// 显示志愿者内容
function showVolunteerContent() {
    // 显示志愿者导航
    document.querySelectorAll('.volunteer-nav').forEach(nav => {
        nav.style.display = 'inline';
    });
    
    // 显示志愿者页面内容
    document.querySelectorAll('.volunteer-section').forEach(section => {
        section.style.display = 'block';
    });
}

// 显示组织方内容
async function showOrganizerContent() {
    // 显示组织方导航
    document.querySelectorAll('.organizer-nav').forEach(nav => {
        nav.style.display = 'inline';
    });
    
    // 显示组织方页面内容
    document.querySelectorAll('.organizer-section').forEach(section => {
        section.style.display = 'block';
    });
    
    // 绑定创建新活动按钮事件
    const createActivityBtn = document.getElementById('createActivityBtn');
    if (createActivityBtn) {
        createActivityBtn.onclick = createActivity;
    }
    
    // 绑定创建新培训按钮事件
    const createTrainingBtn = document.getElementById('createTrainingBtn');
    if (createTrainingBtn) {
        createTrainingBtn.onclick = createTraining;
    }
    
    // 绑定组织设置导航点击事件
    const settingsLink = document.querySelector('a[href="#organizer-settings"]');
    if (settingsLink) {
        settingsLink.addEventListener('click', async (e) => {
            e.preventDefault();
            await loadOrganizerSettings();
            scrollToSection('organizer-settings');
        });
    }
    
    // 加载组织方数据
    await loadOrganizerData();
    
    // 初始化组织设置
    await loadOrganizerSettings();
}

// 显示管理方内容
async function showAdminContent() {
    // 显示管理方导航
    document.querySelectorAll('.admin-nav').forEach(nav => {
        nav.style.display = 'inline';
    });
    
    // 显示管理方页面内容
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'block';
    });
    
    // 加载管理方数据
    await loadAdminData();
    
    // 启动用户列表定时刷新
    startUserListRefresh();
    
    // 启动管理方仪表盘定时刷新
    startAdminDashboardRefresh();
}

// 加载组织方数据
async function loadOrganizerData() {
    console.log('加载组织方数据...');
    
    // 加载组织方活动列表
    await loadOrganizerActivities();
    
    // 加载组织方培训列表
    await loadOrganizerTrainings();
    
    // 渲染组织方仪表盘
    renderOrganizerDashboard();
}

// 加载组织方活动列表
async function loadOrganizerActivities() {
    try {
        // 调用API获取组织方的活动列表
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/activities', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        // 检查数据格式
        let activities = [];
        if (data.data && Array.isArray(data.data)) {
            activities = data.data;
        } else if (Array.isArray(data)) {
            activities = data;
        }
        
        // 转换数据格式以适应前端渲染
        const activitiesToRender = activities.map(activity => ({
            id: activity.id,
            title: activity.title,
            time: new Date(activity.startTime).toLocaleString('zh-CN'),
            location: activity.location,
            quota: activity.quota,
            registered: activity.registeredCount || 0,
            status: activity.status === 'recruiting' ? '招募中' : activity.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        renderOrganizerActivities(activitiesToRender);
    } catch (error) {
        console.error('加载组织方活动列表失败:', error);
        // 加载失败时显示空列表，而不是使用模拟数据
        renderOrganizerActivities([]);
        alert('加载活动列表失败，请稍后重试');
    }
}

// 渲染组织方活动列表
function renderOrganizerActivities(activities) {
    const activityList = document.getElementById('organizerActivityList');
    activityList.innerHTML = '';
    
    if (activities.length === 0) {
        activityList.innerHTML = '<p>暂无活动，点击下方按钮创建新活动</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <h3>${activity.title}</h3>
            <p><strong>时间:</strong> ${activity.time}</p>
            <p><strong>地点:</strong> ${activity.location}</p>
            <p><strong>招募人数:</strong> ${activity.registered || 0}/${activity.quota}</p>
            <p><strong>状态:</strong> ${activity.status}</p>
            <div class="activity-actions">
                <button class="btn" onclick="editActivity(${activity.id})">编辑</button>
                <button class="btn btn-primary" onclick="viewActivityDetail(${activity.id})">查看详情</button>
                <button class="btn btn-success" onclick="viewActivityApplications(${activity.id}, '${activity.title}')">查看报名</button>
                <button class="btn btn-warning" onclick="viewQRCodeManagement(${activity.id}, '${activity.title}')">二维码管理</button>
                <button class="btn btn-danger" onclick="deleteActivity(${activity.id})">删除</button>
            </div>
        `;
        activityList.appendChild(activityItem);
    });
}

// 加载组织方培训列表
async function loadOrganizerTrainings() {
    try {
        // 调用API获取组织方的培训列表
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/trainings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        
        // 检查数据格式
        let trainings = [];
        if (data.data && Array.isArray(data.data)) {
            trainings = data.data;
        } else if (Array.isArray(data)) {
            trainings = data;
        }
        
        // 转换数据格式以适应前端渲染
        const trainingsToRender = trainings.map(training => ({
            id: training.id,
            title: training.title,
            time: new Date(training.startTime).toLocaleString('zh-CN'),
            duration: `${Math.round((new Date(training.endTime) - new Date(training.startTime)) / (1000 * 60 * 60))}小时`,
            teacher: training.teacher,
            status: training.status === 'recruiting' ? '报名中' : training.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        renderOrganizerTrainings(trainingsToRender);
    } catch (error) {
        console.error('加载组织方培训列表失败:', error);
        // 加载失败时使用模拟数据
        const mockTrainings = [
            {
                id: 1,
                title: '志愿者通用培训',
                time: '2024-11-20 09:00',
                duration: '2小时',
                teacher: '张老师',
                status: '报名中'
            }
        ];
        renderOrganizerTrainings(mockTrainings);
    }
}

// 渲染组织方培训列表
function renderOrganizerTrainings(trainings) {
    const trainingList = document.getElementById('organizerTrainingList');
    trainingList.innerHTML = '';
    
    if (trainings.length === 0) {
        trainingList.innerHTML = '<p>暂无培训，点击下方按钮创建新培训</p>';
        return;
    }
    
    trainings.forEach(training => {
        const trainingItem = document.createElement('div');
        trainingItem.className = 'training-item';
        trainingItem.innerHTML = `
            <h3>${training.title}</h3>
            <p><strong>时间:</strong> ${training.time}</p>
            <p><strong>时长:</strong> ${training.duration}</p>
            <p><strong>讲师:</strong> ${training.teacher}</p>
            <p><strong>状态:</strong> ${training.status}</p>
            <div class="activity-actions">
                <button class="btn" onclick="editTraining(${training.id})">编辑</button>
                <button class="btn btn-primary" onclick="viewTrainingDetail(${training.id})">查看详情</button>
                <button class="btn btn-danger" onclick="deleteTraining(${training.id})">删除</button>
            </div>
        `;
        trainingList.appendChild(trainingItem);
    });
}

// 渲染组织方仪表盘
async function renderOrganizerDashboard() {
    try {
        const dashboardStats = document.querySelector('#organizer-dashboard .dashboard-stats');
        
        // 显示加载状态
        dashboardStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <h3>总活动数</h3>
                    <p class="stat-value loading">加载中...</p>
                </div>
                <div class="stat-item">
                    <h3>总培训数</h3>
                    <p class="stat-value loading">加载中...</p>
                </div>
                <div class="stat-item">
                    <h3>已报名志愿者</h3>
                    <p class="stat-value loading">加载中...</p>
                </div>
                <div class="stat-item">
                    <h3>本月新增活动</h3>
                    <p class="stat-value loading">加载中...</p>
                </div>
            </div>
        `;
        
        // 调用API获取仪表盘数据
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/user/dashboard/organizer', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 显示获取的数据
            dashboardStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>总活动数</h3>
                        <p class="stat-value">${data.totalActivities}</p>
                    </div>
                    <div class="stat-item">
                        <h3>总培训数</h3>
                        <p class="stat-value">${data.totalTrainings}</p>
                    </div>
                    <div class="stat-item">
                        <h3>已报名志愿者</h3>
                        <p class="stat-value">${data.totalRegisteredVolunteers}</p>
                    </div>
                    <div class="stat-item">
                        <h3>本月新增活动</h3>
                        <p class="stat-value">${data.newActivitiesThisMonth}</p>
                    </div>
                </div>
            `;
        } else {
            // 显示错误信息
            dashboardStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>总活动数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>总培训数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>已报名志愿者</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>本月新增活动</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="renderOrganizerDashboard()" style="margin-top: 20px;">重试</button>
            `;
        }
    } catch (error) {
        console.error('渲染组织方仪表盘失败:', error);
        
        const dashboardStats = document.querySelector('#organizer-dashboard .dashboard-stats');
        dashboardStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <h3>总活动数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>总培训数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>已报名志愿者</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>本月新增活动</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
            </div>
            <button class="btn btn-primary" onclick="renderOrganizerDashboard()" style="margin-top: 20px;">重试</button>
        `;
    }
}

// 加载管理方数据
async function loadAdminData() {
    console.log('加载管理方数据...');
    
    // 渲染管理方仪表盘
    await renderAdminDashboard();
    
    // 加载组织管理数据
    await loadOrganizations();
    
    // 加载用户管理数据
    await loadUsers();
    
    // 加载待审查活动列表
    await loadActivityReviews();
    
    // 加载系统设置
    await loadSystemSettings();
    
    // 加载数据管理页面
    await loadDataManagement();
}

// 渲染管理方仪表盘
async function renderAdminDashboard() {
    const dashboardStats = document.querySelector('#admin-dashboard .dashboard-stats');
    
    // 显示加载状态
    dashboardStats.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <h3>总用户数</h3>
                <p class="stat-value loading">加载中...</p>
            </div>
            <div class="stat-item">
                <h3>总组织数</h3>
                <p class="stat-value loading">加载中...</p>
            </div>
            <div class="stat-item">
                <h3>总活动数</h3>
                <p class="stat-value loading">加载中...</p>
            </div>
            <div class="stat-item">
                <h3>总培训数</h3>
                <p class="stat-value loading">加载中...</p>
            </div>
        </div>
    `;
    
    try {
        // 调用后端API获取统计数据
        const response = await fetch('http://localhost:3001/api/admin/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 计算总用户数（志愿者数 + 组织方 + 管理方）
            const totalUsers = await fetch('http://localhost:3001/api/user/list', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }).then(res => res.json()).then(data => data.pagination.total);
            
            // 显示获取的数据
            dashboardStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>总用户数</h3>
                        <p class="stat-value">${totalUsers}</p>
                    </div>
                    <div class="stat-item">
                        <h3>总组织数</h3>
                        <p class="stat-value">${result.data.organizationStats.total}</p>
                    </div>
                    <div class="stat-item">
                        <h3>总活动数</h3>
                        <p class="stat-value">${result.data.activityStats.total}</p>
                    </div>
                    <div class="stat-item">
                        <h3>总培训数</h3>
                        <p class="stat-value">${result.data.trainingStats.total}</p>
                    </div>
                </div>
            `;
        } else {
            // 显示错误信息
            dashboardStats.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <h3>总用户数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>总组织数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>总活动数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                    <div class="stat-item">
                        <h3>总培训数</h3>
                        <p class="stat-value error">获取失败</p>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="renderAdminDashboard()" style="margin-top: 20px;">重试</button>
            `;
        }
    } catch (error) {
        console.error('渲染管理方仪表盘失败:', error);
        
        // 显示错误信息
        dashboardStats.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <h3>总用户数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>总组织数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>总活动数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
                <div class="stat-item">
                    <h3>总培训数</h3>
                    <p class="stat-value error">获取失败</p>
                </div>
            </div>
            <button class="btn btn-primary" onclick="renderAdminDashboard()" style="margin-top: 20px;">重试</button>
        `;
    }
}

// 加载组织管理数据
async function loadOrganizations() {
    try {
        // 调用后端API获取组织列表
        const response = await fetch('http://localhost:3001/api/organizations', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 检查数据格式
            let organizations = [];
            if (result.data && Array.isArray(result.data)) {
                organizations = result.data;
            } else if (Array.isArray(result)) {
                organizations = result;
            }
            renderOrganizations(organizations);
        } else {
            console.error('获取组织列表失败:', result.message);
            alert('获取组织列表失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取组织列表失败:', error);
        alert('获取组织列表失败，请稍后重试');
    }
}

// 渲染组织列表
function renderOrganizations(organizations) {
    const organizationList = document.getElementById('organizationList');
    organizationList.innerHTML = '';
    
    if (organizations.length === 0) {
        organizationList.innerHTML = '<p>暂无组织信息</p>';
        return;
    }
    
    organizations.forEach(org => {
        const orgItem = document.createElement('div');
        orgItem.className = 'activity-item';
        orgItem.innerHTML = `
            <h3>${org.name}</h3>
            <p><strong>隶属部门:</strong> ${org.department}</p>
            <p><strong>联系方式:</strong> ${org.contact}</p>
            <p><strong>状态:</strong> ${org.status === 'approved' ? '已通过' : '待审核'}</p>
            <div class="activity-actions">
                <button class="btn" onclick="viewOrganization(${org.id})">查看详情</button>
                <button class="btn btn-primary" onclick="approveOrganization(${org.id})">审核</button>
            </div>
        `;
        organizationList.appendChild(orgItem);
    });
}

// 查看组织详情
async function viewOrganization(organizationId) {
    try {
        // 调用后端API获取组织详情
        const response = await fetch(`http://localhost:3001/api/organizations/${organizationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const organization = result.data || result;
            
            // 创建组织详情模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>组织详情</h2>
                    <div class="organization-details">
                        <div class="form-group">
                            <label>组织名称</label>
                            <p>${organization.name}</p>
                        </div>
                        <div class="form-group">
                            <label>隶属部门</label>
                            <p>${organization.department}</p>
                        </div>
                        <div class="form-group">
                            <label>联系方式</label>
                            <p>${organization.contact}</p>
                        </div>
                        <div class="form-group">
                            <label>线下地点</label>
                            <p>${organization.location}</p>
                        </div>
                        <div class="form-group">
                            <label>状态</label>
                            <p>${organization.status === 'approved' ? '已通过' : '待审核'}</p>
                        </div>
                        <div class="form-group">
                            <label>创建时间</label>
                            <p>${new Date(organization.createdAt).toLocaleString('zh-CN')}</p>
                        </div>
                    </div>
                    <div class="form-group" style="text-align: right;">
                        <button class="btn" onclick="this.closest('.modal').remove()">关闭</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            console.error('获取组织详情失败:', result.message);
            alert('获取组织详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取组织详情失败:', error);
        alert('获取组织详情失败，请稍后重试');
    }
}

// 审核组织资质
async function approveOrganization(organizationId) {
    try {
        // 调用后端API获取组织详情
        const response = await fetch(`http://localhost:3001/api/organizations/${organizationId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const organization = result.data || result;
            
            // 创建组织审核模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>审核组织资质</h2>
                    <div class="organization-approval">
                        <div class="form-group">
                            <label>组织名称</label>
                            <p>${organization.name}</p>
                        </div>
                        <div class="form-group">
                            <label>隶属部门</label>
                            <p>${organization.department}</p>
                        </div>
                        <div class="form-group">
                            <label>联系方式</label>
                            <p>${organization.contact}</p>
                        </div>
                        <div class="form-group">
                            <label>审核结果</label>
                            <div class="radio-group">
                                <label><input type="radio" name="approvalResult" value="approved" checked> 通过</label>
                                <label><input type="radio" name="approvalResult" value="rejected"> 拒绝</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>审核意见</label>
                            <textarea id="approvalComment" rows="4" placeholder="请输入审核意见"></textarea>
                        </div>
                    </div>
                    <div class="form-group" style="text-align: right;">
                        <button class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        <button class="btn btn-primary" onclick="submitOrganizationApproval(${organizationId})">提交审核</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            console.error('获取组织详情失败:', result.message);
            alert('获取组织详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取组织详情失败:', error);
        alert('获取组织详情失败，请稍后重试');
    }
}

// 提交组织审核结果
async function submitOrganizationApproval(organizationId) {
    try {
        const modal = document.querySelector('.modal');
        const approvalResult = modal.querySelector('input[name="approvalResult"]:checked').value;
        const approvalComment = modal.querySelector('#approvalComment').value;
        
        // 调用后端API提交审核结果
        const response = await fetch(`http://localhost:3001/api/organizations/${organizationId}/approve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                status: approvalResult,
                comment: approvalComment
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '审核成功');
            modal.remove();
            // 刷新组织列表
            loadOrganizations();
        } else {
            console.error('提交审核结果失败:', result.message);
            alert(result.message || '提交审核结果失败，请稍后重试');
        }
    } catch (error) {
        console.error('提交审核结果失败:', error);
        alert('提交审核结果失败，请稍后重试');
    }
}

// 加载用户管理数据
async function loadUsers() {
    try {
        // 调用后端API获取用户列表
        const response = await fetch('http://localhost:3001/api/user/list', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 检查数据格式
            let users = [];
            if (result.data && Array.isArray(result.data)) {
                users = result.data;
            } else if (result.pagination && result.data && Array.isArray(result.data)) {
                users = result.data;
            } else if (Array.isArray(result)) {
                users = result;
            }
            renderUsers(users);
        } else {
            console.error('获取用户列表失败:', result.message);
            alert('获取用户列表失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取用户列表失败:', error);
        alert('获取用户列表失败，请稍后重试');
    }
}

// 渲染用户列表
function renderUsers(users) {
    const userList = document.getElementById('userList');
    userList.innerHTML = '';
    
    if (users.length === 0) {
        userList.innerHTML = '<p>暂无用户信息</p>';
        return;
    }
    
    users.forEach(user => {
        const userItem = document.createElement('div');
        userItem.className = 'activity-item';
        userItem.innerHTML = `
            <h3>${user.name}</h3>
            <p><strong>手机号:</strong> ${user.phone}</p>
            <p><strong>邮箱:</strong> ${user.email}</p>
            <p><strong>角色:</strong> ${user.role === 'volunteer' ? '志愿者' : user.role === 'organizer' ? '组织方' : '管理方'}</p>
            <div class="activity-actions">
                <button class="btn" onclick="viewUser(${user.id})">查看详情</button>
                <button class="btn btn-primary" onclick="editUser(${user.id})">编辑角色</button>
            </div>
        `;
        userList.appendChild(userItem);
    });
}

// 查看用户详情
async function viewUser(userId) {
    try {
        // 调用后端API获取用户详情
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const user = result.data || result;
            
            // 创建用户详情模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>用户详情</h2>
                    <div class="user-details">
                        <div class="form-group">
                            <label>姓名</label>
                            <p>${user.name}</p>
                        </div>
                        <div class="form-group">
                            <label>性别</label>
                            <p>${user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '其他'}</p>
                        </div>
                        <div class="form-group">
                            <label>年龄</label>
                            <p>${user.age || '未知'}</p>
                        </div>
                        <div class="form-group">
                            <label>手机号</label>
                            <p>${user.phone}</p>
                        </div>
                        <div class="form-group">
                            <label>邮箱</label>
                            <p>${user.email}</p>
                        </div>
                        <div class="form-group">
                            <label>角色</label>
                            <p>${user.role === 'volunteer' ? '志愿者' : user.role === 'organizer' ? '组织方' : '管理方'}</p>
                        </div>
                        <div class="form-group">
                            <label>注册时间</label>
                            <p>${new Date(user.createdAt).toLocaleString('zh-CN')}</p>
                        </div>
                    </div>
                    <div class="form-group" style="text-align: right;">
                        <button class="btn" onclick="this.closest('.modal').remove()">关闭</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            console.error('获取用户详情失败:', result.message);
            alert('获取用户详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取用户详情失败:', error);
        alert('获取用户详情失败，请稍后重试');
    }
}

// 编辑用户角色和权限
async function editUser(userId) {
    try {
        // 调用后端API获取用户详情
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const user = result.data || result;
            
            // 创建用户编辑模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>编辑用户角色和权限</h2>
                    <form id="editUserForm" data-user-id="${userId}">
                        <div class="form-group">
                            <label>姓名</label>
                            <p>${user.name}</p>
                        </div>
                        <div class="form-group">
                            <label>角色</label>
                            <select id="editUserRole" name="role" required>
                                <option value="volunteer" ${user.role === 'volunteer' ? 'selected' : ''}>志愿者</option>
                                <option value="organizer" ${user.role === 'organizer' ? 'selected' : ''}>组织方</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理方</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>权限设置</label>
                            <div class="permissions-section">
                                <p>注：权限设置将根据角色自动调整</p>
                            </div>
                        </div>
                        <div class="form-group" style="text-align: right;">
                            <button type="submit" class="btn btn-primary">保存修改</button>
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
            
            // 绑定表单提交事件
            const form = modal.querySelector('#editUserForm');
            form.addEventListener('submit', handleEditUser);
        } else {
            console.error('获取用户详情失败:', result.message);
            alert('获取用户详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取用户详情失败:', error);
        alert('获取用户详情失败，请稍后重试');
    }
}

// 处理编辑用户表单提交
async function handleEditUser(e) {
    e.preventDefault();
    
    const form = e.target;
    const userId = form.dataset.userId;
    const formData = new FormData(form);
    const role = formData.get('role');
    
    try {
        // 调用后端API更新用户角色
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                role: role
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '用户角色更新成功');
            form.closest('.modal').remove();
            // 刷新用户列表
            loadUsers();
        } else {
            console.error('更新用户角色失败:', result.message);
            alert(result.message || '更新用户角色失败，请稍后重试');
        }
    } catch (error) {
        console.error('更新用户角色失败:', error);
        alert('更新用户角色失败，请稍后重试');
    }
}

// 用户列表定时刷新（每30秒）
let userListRefreshInterval = null;

// 启动用户列表定时刷新
function startUserListRefresh() {
    // 清除现有的定时器（如果存在）
    if (userListRefreshInterval) {
        clearInterval(userListRefreshInterval);
    }
    
    // 设置新的定时器，每30秒刷新一次
    userListRefreshInterval = setInterval(async () => {
        console.log('自动刷新用户列表...');
        await loadUsers();
    }, 30000);
}

// 停止用户列表定时刷新
function stopUserListRefresh() {
    if (userListRefreshInterval) {
        clearInterval(userListRefreshInterval);
        userListRefreshInterval = null;
    }
}

// 管理方仪表盘数据定时刷新（每30秒）
let adminDashboardRefreshInterval = null;

// 启动管理方仪表盘定时刷新
function startAdminDashboardRefresh() {
    // 清除现有的定时器（如果存在）
    if (adminDashboardRefreshInterval) {
        clearInterval(adminDashboardRefreshInterval);
    }
    
    // 设置新的定时器，每30秒自动刷新仪表盘数据
    adminDashboardRefreshInterval = setInterval(async () => {
        console.log('自动刷新管理方仪表盘数据...');
        await renderAdminDashboard();
    }, 30000);
}

// 停止管理方仪表盘定时刷新
function stopAdminDashboardRefresh() {
    if (adminDashboardRefreshInterval) {
        clearInterval(adminDashboardRefreshInterval);
        adminDashboardRefreshInterval = null;
    }
}

// 活动内容审查与监督功能
// 加载待审查活动列表
async function loadActivityReviews() {
    try {
        // 调用后端API获取待审查活动列表
        const response = await fetch('http://localhost:3001/api/activities/admin/pending', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 检查数据格式
            let activities = [];
            if (result.data && Array.isArray(result.data)) {
                activities = result.data;
            } else if (Array.isArray(result)) {
                activities = result;
            }
            renderActivityReviews(activities);
        } else {
            console.error('获取待审查活动列表失败:', result.message);
            alert('获取待审查活动列表失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取待审查活动列表失败:', error);
        alert('获取待审查活动列表失败，请稍后重试');
    }
}

// 渲染待审查活动列表
function renderActivityReviews(activities) {
    const activityReviewList = document.getElementById('activityReviewList');
    activityReviewList.innerHTML = '';
    
    if (activities.length === 0) {
        activityReviewList.innerHTML = '<p>暂无待审查活动</p>';
        return;
    }
    
    activities.forEach(activity => {
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <h3>${activity.title}</h3>
            <p><strong>组织名称:</strong> ${activity.organization?.name || '未知'}</p>
            <p><strong>开始时间:</strong> ${new Date(activity.startTime).toLocaleString('zh-CN')}</p>
            <p><strong>地点:</strong> ${activity.location}</p>
            <p><strong>状态:</strong> ${activity.status === 'pending-review' ? '待审查' : '已审查'}</p>
            <div class="activity-actions">
                <button class="btn" onclick="viewActivityForReview(${activity.id})">查看详情</button>
                <button class="btn btn-primary" onclick="reviewActivity(${activity.id})">审查</button>
            </div>
        `;
        activityReviewList.appendChild(activityItem);
    });
}

// 查看待审查活动详情
async function viewActivityForReview(activityId) {
    try {
        // 调用后端API获取活动详情
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const activity = result.data || result;
            
            // 创建活动详情模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>活动详情</h2>
                    <div class="activity-details">
                        <div class="form-group">
                            <label>活动标题</label>
                            <p>${activity.title}</p>
                        </div>
                        <div class="form-group">
                            <label>活动描述</label>
                            <p>${activity.description}</p>
                        </div>
                        <div class="form-group">
                            <label>组织名称</label>
                            <p>${activity.organization?.name || activity.organizationName}</p>
                        </div>
                        <div class="form-group">
                            <label>开始时间</label>
                            <p>${new Date(activity.startTime).toLocaleString('zh-CN')}</p>
                        </div>
                        <div class="form-group">
                            <label>结束时间</label>
                            <p>${new Date(activity.endTime).toLocaleString('zh-CN')}</p>
                        </div>
                        <div class="form-group">
                            <label>地点</label>
                            <p>${activity.location}</p>
                        </div>
                        <div class="form-group">
                            <label>招募人数</label>
                            <p>${activity.quota}人</p>
                        </div>
                        <div class="form-group">
                            <label>活动类型</label>
                            <p>${activity.type === 'short-term' ? '短期活动' : activity.type === 'long-term' ? '长期活动' : '一次性活动'}</p>
                        </div>
                        <div class="form-group">
                            <label>报名要求</label>
                            <p>${activity.requirements}</p>
                        </div>
                        <div class="form-group">
                            <label>状态</label>
                            <p>${activity.status === 'pending-review' ? '待审查' : activity.status === 'recruiting' ? '招募中' : '已结束'}</p>
                        </div>
                    </div>
                    <div class="form-group" style="text-align: right;">
                        <button class="btn" onclick="this.closest('.modal').remove()">关闭</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            console.error('获取活动详情失败:', result.message);
            alert('获取活动详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取活动详情失败:', error);
        alert('获取活动详情失败，请稍后重试');
    }
}

// 审查活动
async function reviewActivity(activityId) {
    try {
        // 调用后端API获取活动详情
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const activity = result.data || result;
            
            // 创建活动审查模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>审查活动</h2>
                    <form id="reviewActivityForm" data-activity-id="${activityId}">
                        <div class="form-group">
                            <label>活动标题</label>
                            <p>${activity.title}</p>
                        </div>
                        <div class="form-group">
                            <label>组织名称</label>
                            <p>${activity.organization?.name || activity.organizationName}</p>
                        </div>
                        <div class="form-group">
                            <label>审查结果</label>
                            <div class="radio-group">
                                <label><input type="radio" name="reviewResult" value="approved" checked> 通过</label>
                                <label><input type="radio" name="reviewResult" value="rejected"> 拒绝</label>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>审查意见</label>
                            <textarea id="reviewComment" rows="4" placeholder="请输入审查意见"></textarea>
                        </div>
                        <div class="form-group" style="text-align: right;">
                            <button type="submit" class="btn btn-primary">提交审查</button>
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
            
            // 绑定表单提交事件
            const form = modal.querySelector('#reviewActivityForm');
            form.addEventListener('submit', handleReviewActivity);
        } else {
            console.error('获取活动详情失败:', result.message);
            alert('获取活动详情失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取活动详情失败:', error);
        alert('获取活动详情失败，请稍后重试');
    }
}

// 处理活动审查表单提交
async function handleReviewActivity(e) {
    e.preventDefault();
    
    const form = e.target;
    const activityId = form.dataset.activityId;
    const formData = new FormData(form);
    const reviewResult = formData.get('reviewResult');
    const reviewComment = document.getElementById('reviewComment').value;
    
    try {
        // 调用后端API提交审查结果
        const response = await fetch(`http://localhost:3001/api/activities/admin/${activityId}/review`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                reviewStatus: reviewResult,
                rejectReason: reviewComment
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '审查成功');
            form.closest('.modal').remove();
            // 刷新待审查活动列表
            loadActivityReviews();
        } else {
            console.error('提交审查结果失败:', result.message);
            alert(result.message || '提交审查结果失败，请稍后重试');
        }
    } catch (error) {
        console.error('提交审查结果失败:', error);
        alert('提交审查结果失败，请稍后重试');
    }
}

// 系统参数调配功能
// 加载系统设置
async function loadSystemSettings() {
    try {
        // 调用后端API获取系统设置
        const response = await fetch('http://localhost:3001/api/admin/system-settings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            renderSystemSettings(result.data || {});
        } else {
            console.error('获取系统设置失败:', result.message);
            // 使用默认设置
            renderSystemSettings({});
        }
    } catch (error) {
        console.error('获取系统设置失败:', error);
        // 使用默认设置
        renderSystemSettings({});
    }
}

// 渲染系统设置
function renderSystemSettings(settings) {
    const systemSettingsContent = document.getElementById('systemSettingsContent');
    
    systemSettingsContent.innerHTML = `
        <h3>系统参数设置</h3>
        <form id="systemSettingsForm">
            <div class="settings-section">
                <h4>积分规则</h4>
                <div class="form-group">
                    <label for="pointsPerHour">每小时志愿时长积分</label>
                    <input type="number" id="pointsPerHour" name="pointsPerHour" value="${settings.pointsPerHour || 10}" min="1" required>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>证书设置</h4>
                <div class="form-group">
                    <label for="certificateThreshold">证书发放阈值（小时）</label>
                    <input type="number" id="certificateThreshold" name="certificateThreshold" value="${settings.certificateThreshold || 50}" min="1" required>
                </div>
            </div>
            
            <div class="settings-section">
                <h4>活动设置</h4>
                <div class="form-group">
                    <label for="activityApprovalRequired">活动是否需要审核</label>
                    <select id="activityApprovalRequired" name="activityApprovalRequired">
                        <option value="true" ${(settings.activityApprovalRequired === true || settings.activityApprovalRequired === 'true') ? 'selected' : ''}>是</option>
                        <option value="false" ${(settings.activityApprovalRequired === false || settings.activityApprovalRequired === 'false') ? 'selected' : ''}>否</option>
                    </select>
                </div>
            </div>
            
            <div class="form-group" style="text-align: right;">
                <button type="submit" class="btn btn-primary">保存设置</button>
            </div>
        </form>
    `;
    
    // 绑定表单提交事件
    const form = systemSettingsContent.querySelector('#systemSettingsForm');
    form.addEventListener('submit', handleSystemSettingsSubmit);
}

// 处理系统设置表单提交
async function handleSystemSettingsSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    
    const settingsData = {
        pointsPerHour: parseInt(formData.get('pointsPerHour')),
        certificateThreshold: parseInt(formData.get('certificateThreshold')),
        activityApprovalRequired: formData.get('activityApprovalRequired') === 'true'
    };
    
    try {
        // 调用后端API更新系统设置
        const response = await fetch('http://localhost:3001/api/admin/system-settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(settingsData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message || '设置保存成功');
        } else {
            console.error('保存设置失败:', result.message);
            alert(result.message || '保存设置失败，请稍后重试');
        }
    } catch (error) {
        console.error('保存设置失败:', error);
        alert('保存设置失败，请稍后重试');
    }
}

// 数据备份和统计功能
// 加载数据管理页面
async function loadDataManagement() {
    const dataManagementContent = document.getElementById('dataManagementContent');
    
    dataManagementContent.innerHTML = `
        <h3>数据管理</h3>
        
        <div class="data-section">
            <h4>数据备份</h4>
            <div class="data-actions">
                <button class="btn btn-primary" onclick="createDataBackup()">创建数据备份</button>
                <button class="btn" onclick="viewBackupHistory()">查看备份历史</button>
            </div>
        </div>
        
        <div class="data-section">
            <h4>数据统计</h4>
            <div class="stats-actions">
                <button class="btn btn-primary" onclick="generateUserStats()">生成用户统计报告</button>
                <button class="btn" onclick="generateActivityStats()">生成活动统计报告</button>
                <button class="btn" onclick="generateTrainingStats()">生成培训统计报告</button>
            </div>
        </div>
        
        <div class="data-section">
            <h4>数据导出</h4>
            <div class="export-actions">
                <button class="btn btn-primary" onclick="exportUserData()">导出用户数据</button>
                <button class="btn" onclick="exportActivityData()">导出活动数据</button>
                <button class="btn" onclick="exportTrainingData()">导出培训数据</button>
            </div>
        </div>
    `;
}

// 创建数据备份
async function createDataBackup() {
    try {
        if (confirm('确定要创建数据备份吗？')) {
            // 调用后端API创建数据备份
            const response = await fetch('http://localhost:3001/api/admin/data/backup', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message || '数据备份创建成功');
            } else {
                console.error('创建数据备份失败:', result.message);
                alert(result.message || '创建数据备份失败，请稍后重试');
            }
        }
    } catch (error) {
        console.error('创建数据备份失败:', error);
        alert('创建数据备份失败，请稍后重试');
    }
}

// 查看备份历史
async function viewBackupHistory() {
    try {
        // 调用后端API获取备份历史
        const response = await fetch('http://localhost:3001/api/admin/data/backup/history', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            const backups = result.data || [];
            
            // 创建备份历史模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>备份历史</h2>
                    <div class="backup-history">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr>
                                    <th style="border: 1px solid #ddd; padding: 8px;">备份ID</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">备份时间</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">状态</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">大小</th>
                                    <th style="border: 1px solid #ddd; padding: 8px;">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${backups.length > 0 ? backups.map(backup => `
                                    <tr>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${backup.id}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${new Date(backup.created_at).toLocaleString('zh-CN')}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${backup.status}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">${backup.size || '未知'}</td>
                                        <td style="border: 1px solid #ddd; padding: 8px;">
                                            <button class="btn btn-sm" onclick="downloadBackup('${backup.id}')">下载</button>
                                            <button class="btn btn-sm btn-danger" onclick="deleteBackup('${backup.id}')">删除</button>
                                        </td>
                                    </tr>
                                `).join('') : `<tr><td colspan="5" style="text-align: center; border: 1px solid #ddd; padding: 8px;">暂无备份记录</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                    <div class="form-group" style="text-align: right; margin-top: 20px;">
                        <button class="btn" onclick="this.closest('.modal').remove()">关闭</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            console.error('获取备份历史失败:', result.message);
            alert(result.message || '获取备份历史失败，请稍后重试');
        }
    } catch (error) {
        console.error('获取备份历史失败:', error);
        alert('获取备份历史失败，请稍后重试');
    }
}

// 下载备份
async function downloadBackup(backupId) {
    try {
        // 调用后端API下载备份
        const response = await fetch(`http://localhost:3001/api/admin/data/backup/${backupId}/download`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup-${backupId}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const result = await response.json();
            console.error('下载备份失败:', result.message);
            alert(result.message || '下载备份失败，请稍后重试');
        }
    } catch (error) {
        console.error('下载备份失败:', error);
        alert('下载备份失败，请稍后重试');
    }
}

// 删除备份
async function deleteBackup(backupId) {
    try {
        if (confirm('确定要删除这个备份吗？')) {
            // 调用后端API删除备份
            const response = await fetch(`http://localhost:3001/api/admin/data/backup/${backupId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert(result.message || '备份删除成功');
                // 刷新备份历史
                viewBackupHistory();
            } else {
                console.error('删除备份失败:', result.message);
                alert(result.message || '删除备份失败，请稍后重试');
            }
        }
    } catch (error) {
        console.error('删除备份失败:', error);
        alert('删除备份失败，请稍后重试');
    }
}

// 生成用户统计报告
async function generateUserStats() {
    try {
        // 调用后端API生成用户统计报告
        const response = await fetch('http://localhost:3001/api/admin/stats/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('用户统计报告:', result.data);
            // 自动导出用户统计报告
            await exportUserStats();
        } else {
            console.error('生成用户统计报告失败:', result.message);
            alert(result.message || '生成用户统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('生成用户统计报告失败:', error);
        alert('生成用户统计报告失败，请稍后重试');
    }
}

// 生成活动统计报告
async function generateActivityStats() {
    try {
        // 调用后端API生成活动统计报告
        const response = await fetch('http://localhost:3001/api/admin/stats/activities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('活动统计报告:', result.data);
            // 自动导出活动统计报告
            await exportActivityStats();
        } else {
            console.error('生成活动统计报告失败:', result.message);
            alert(result.message || '生成活动统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('生成活动统计报告失败:', error);
        alert('生成活动统计报告失败，请稍后重试');
    }
}

// 生成培训统计报告
async function generateTrainingStats() {
    try {
        // 调用后端API生成培训统计报告
        const response = await fetch('http://localhost:3001/api/admin/stats/trainings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('培训统计报告:', result.data);
            // 自动导出培训统计报告
            await exportTrainingStats();
        } else {
            console.error('生成培训统计报告失败:', result.message);
            alert(result.message || '生成培训统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('生成培训统计报告失败:', error);
        alert('生成培训统计报告失败，请稍后重试');
    }
}

// 导出用户数据
async function exportUserData() {
    try {
        // 调用后端API导出用户数据
        const response = await fetch('http://localhost:3001/api/admin/data/export/users', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const result = await response.json();
            console.error('导出用户数据失败:', result.message);
            alert(result.message || '导出用户数据失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出用户数据失败:', error);
        alert('导出用户数据失败，请稍后重试');
    }
}

// 导出活动数据
async function exportActivityData() {
    try {
        // 调用后端API导出活动数据
        const response = await fetch('http://localhost:3001/api/admin/data/export/activities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activities-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const result = await response.json();
            console.error('导出活动数据失败:', result.message);
            alert(result.message || '导出活动数据失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出活动数据失败:', error);
        alert('导出活动数据失败，请稍后重试');
    }
}

// 导出培训数据
async function exportTrainingData() {
    try {
        // 调用后端API导出培训数据
        const response = await fetch('http://localhost:3001/api/admin/data/export/trainings', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `trainings-${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            const result = await response.json();
            console.error('导出培训数据失败:', result.message);
            alert(result.message || '导出培训数据失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出培训数据失败:', error);
        alert('导出培训数据失败，请稍后重试');
    }
}

// 导出用户统计报告
async function exportUserStats(format = 'csv') {
    try {
        // 调用后端API导出用户统计报告
        const response = await fetch(`http://localhost:3001/api/admin/stats/users/export?format=${format}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `user-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            alert('用户统计报告已生成并自动下载');
        } else {
            const result = await response.json();
            console.error('导出用户统计报告失败:', result.message);
            alert(result.message || '导出用户统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出用户统计报告失败:', error);
        alert('导出用户统计报告失败，请稍后重试');
    }
}

// 导出活动统计报告
async function exportActivityStats(format = 'csv') {
    try {
        // 调用后端API导出活动统计报告
        const response = await fetch(`http://localhost:3001/api/admin/stats/activities/export?format=${format}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `activity-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            alert('活动统计报告已生成并自动下载');
        } else {
            const result = await response.json();
            console.error('导出活动统计报告失败:', result.message);
            alert(result.message || '导出活动统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出活动统计报告失败:', error);
        alert('导出活动统计报告失败，请稍后重试');
    }
}

// 导出培训统计报告
async function exportTrainingStats(format = 'csv') {
    try {
        // 调用后端API导出培训统计报告
        const response = await fetch(`http://localhost:3001/api/admin/stats/trainings/export?format=${format}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            // 处理文件下载
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `training-stats-${new Date().toISOString().slice(0, 10)}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            alert('培训统计报告已生成并自动下载');
        } else {
            const result = await response.json();
            console.error('导出培训统计报告失败:', result.message);
            alert(result.message || '导出培训统计报告失败，请稍后重试');
        }
    } catch (error) {
        console.error('导出培训统计报告失败:', error);
        alert('导出培训统计报告失败，请稍后重试');
    }
}

// 编辑活动
async function editActivity(activityId) {
    try {
        // 调用后端API获取活动详情
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const activity = await response.json();
        
        if (response.ok) {
            // 创建活动编辑模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            // 格式化时间为datetime-local格式
            const formatDateTime = (dateString) => {
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                        // 无效日期，返回当前时间
                        return new Date().toISOString().slice(0, 16);
                    }
                    return date.toISOString().slice(0, 16); // 格式化为 YYYY-MM-DDTHH:MM
                } catch (error) {
                    // 处理错误，返回当前时间
                    return new Date().toISOString().slice(0, 16);
                }
            };
            
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>编辑活动</h2>
                    <form id="editActivityForm" data-activity-id="${activityId}">
                        <div class="form-group">
                            <label for="editActivityTitle">活动标题</label>
                            <input type="text" id="editActivityTitle" name="title" value="${activity.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editActivityDescription">活动描述</label>
                            <textarea id="editActivityDescription" name="description" rows="4" required>${activity.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editActivityType">活动类型</label>
                            <select id="editActivityType" name="type" required>
                                <option value="short-term" ${activity.type === 'short-term' ? 'selected' : ''}>短期活动</option>
                                <option value="long-term" ${activity.type === 'long-term' ? 'selected' : ''}>长期活动</option>
                                <option value="one-time" ${activity.type === 'one-time' ? 'selected' : ''}>一次性活动</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1; margin-right: 10px;">
                                <label for="editActivityStartTime">开始时间</label>
                                <input type="datetime-local" id="editActivityStartTime" name="startTime" value="${formatDateTime(activity.startTime)}" required>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label for="editActivityEndTime">结束时间</label>
                                <input type="datetime-local" id="editActivityEndTime" name="endTime" value="${formatDateTime(activity.endTime)}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editActivityLocation">活动地点</label>
                            <input type="text" id="editActivityLocation" name="location" value="${activity.location || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editActivityQuota">招募人数</label>
                            <input type="number" id="editActivityQuota" name="quota" min="1" value="${activity.quota || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editActivityRequirements">报名要求</label>
                            <textarea id="editActivityRequirements" name="requirements" rows="3">${activity.requirements || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editActivityStatus">活动状态</label>
                            <select id="editActivityStatus" name="status">
                                <option value="draft" ${activity.status === 'draft' ? 'selected' : ''}>草稿</option>
                                <option value="recruiting" ${activity.status === 'recruiting' ? 'selected' : ''}>招募中</option>
                                <option value="ongoing" ${activity.status === 'ongoing' ? 'selected' : ''}>进行中</option>
                                <option value="completed" ${activity.status === 'completed' ? 'selected' : ''}>已结束</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>组织者（必填）</label>
                            <div class="form-row">
                                <div class="form-group" style="flex: 1; margin-right: 10px;">
                                    <label for="editOrganizerName">组织者姓名</label>
                                    <input type="text" id="editOrganizerName" name="organizerName" value="${activity.organizer?.name || activity.organizerName || ''}" required>
                                </div>
                                <div class="form-group" style="flex: 1;">
                                    <label for="editOrganizationName">协会名称</label>
                                    <input type="text" id="editOrganizationName" name="organizationName" value="${activity.organization?.name || activity.organizationName || ''}" required>
                                </div>
                            </div>
                        </div>
                        <input type="hidden" name="organizationId" value="${activity.organizationId || 1}">
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">保存修改</button>
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
            
            // 绑定表单提交事件
            const form = modal.querySelector('#editActivityForm');
            form.addEventListener('submit', handleEditActivity);
        } else {
            console.error('获取活动详情失败，状态码:', response.status);
            console.error('服务器返回:', activity);
            alert('获取活动详情失败: ' + response.status + ' - ' + (activity.message || '未知错误'));
        }
    } catch (error) {
        console.error('获取活动详情失败，错误信息:', error);
        alert('获取活动详情失败，请稍后重试: ' + error.message);
    }
}

// 处理编辑活动表单提交
async function handleEditActivity(e) {
    e.preventDefault();
    
    const form = e.target;
    const activityId = form.dataset.activityId;
    
    const formData = new FormData(form);
    const activityData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        location: formData.get('location'),
        quota: parseInt(formData.get('quota')),
        requirements: formData.get('requirements'),
        status: formData.get('status')
    };
    
    try {
        // 调用后端API更新活动
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(activityData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 更新成功
            alert(data.message || '活动更新成功');
            // 关闭模态框
            form.closest('.modal').remove();
            // 刷新活动列表
            loadOrganizerActivities();
        } else {
            // 更新失败
            alert(data.message || '活动更新失败');
        }
    } catch (error) {
        console.error('更新活动失败:', error);
        alert('更新活动失败，请稍后重试');
    }
}

// 删除活动
async function deleteActivity(activityId) {
    if (confirm('确定要删除这个活动吗？')) {
        try {
            // 调用后端API删除活动（使用正确的端口3001）
            const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 删除成功
                alert(data.message || '活动删除成功');
                // 重新加载活动列表
                loadOrganizerActivities();
            } else {
                // 删除失败
                alert(data.message || '活动删除失败');
            }
        } catch (error) {
            console.error('删除活动失败:', error);
            alert('删除活动失败，请稍后重试');
        }
    }
}

// 编辑培训
async function editTraining(trainingId) {
    try {
        // 调用API获取培训详情
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const training = await response.json();
        
        if (response.ok) {
            // 创建培训编辑模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            // 格式化时间为datetime-local格式
            const formatDateTime = (dateString) => {
                try {
                    const date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                        return new Date().toISOString().slice(0, 16);
                    }
                    return date.toISOString().slice(0, 16);
                } catch (error) {
                    return new Date().toISOString().slice(0, 16);
                }
            };
            
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>编辑培训</h2>
                    <form id="editTrainingForm" data-training-id="${trainingId}">
                        <div class="form-group">
                            <label for="editTrainingTitle">培训标题</label>
                            <input type="text" id="editTrainingTitle" name="title" value="${training.data?.title || training.title || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingDescription">培训描述</label>
                            <textarea id="editTrainingDescription" name="description" rows="4" required>${training.data?.description || training.description || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingType">培训类型</label>
                            <select id="editTrainingType" name="type" required>
                                <option value="general" ${(training.data?.type || training.type) === 'general' ? 'selected' : ''}>通用培训</option>
                                <option value="specialized" ${(training.data?.type || training.type) === 'specialized' ? 'selected' : ''}>专业培训</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1; margin-right: 10px;">
                                <label for="editTrainingStartTime">开始时间</label>
                                <input type="datetime-local" id="editTrainingStartTime" name="startTime" value="${formatDateTime(training.data?.startTime || training.startTime)}" required>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label for="editTrainingEndTime">结束时间</label>
                                <input type="datetime-local" id="editTrainingEndTime" name="endTime" value="${formatDateTime(training.data?.endTime || training.endTime)}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingLocation">培训地点</label>
                            <input type="text" id="editTrainingLocation" name="location" value="${training.data?.location || training.location || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingQuota">招募人数</label>
                            <input type="number" id="editTrainingQuota" name="quota" min="1" value="${training.data?.quota || training.quota || 10}" required>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingTeacher">培训教师</label>
                            <input type="text" id="editTrainingTeacher" name="teacher" value="${training.data?.teacher || training.teacher || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="editTrainingStatus">培训状态</label>
                            <select id="editTrainingStatus" name="status">
                                <option value="draft" ${(training.data?.status || training.status) === 'draft' ? 'selected' : ''}>草稿</option>
                                <option value="recruiting" ${(training.data?.status || training.status) === 'recruiting' ? 'selected' : ''}>招募中</option>
                                <option value="ongoing" ${(training.data?.status || training.status) === 'ongoing' ? 'selected' : ''}>进行中</option>
                                <option value="completed" ${(training.data?.status || training.status) === 'completed' ? 'selected' : ''}>已结束</option>
                            </select>
                        </div>
                        <input type="hidden" name="organizationId" value="${training.data?.organizationId || training.organizationId || 1}">
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">保存修改</button>
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
            
            // 绑定表单提交事件
            const form = modal.querySelector('#editTrainingForm');
            form.addEventListener('submit', handleEditTraining);
        } else {
            alert(training.message || '获取培训详情失败');
        }
    } catch (error) {
        console.error('获取培训详情失败:', error);
        alert('获取培训详情失败，请稍后重试');
    }
}

// 处理编辑培训表单提交
async function handleEditTraining(e) {
    e.preventDefault();
    
    const form = e.target;
    const trainingId = form.dataset.trainingId;
    
    const formData = new FormData(form);
    const trainingData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startTime: new Date(formData.get('startTime')).toISOString(),
        endTime: new Date(formData.get('endTime')).toISOString(),
        location: formData.get('location'),
        quota: parseInt(formData.get('quota')),
        teacher: formData.get('teacher'),
        status: formData.get('status') || 'draft',
        organizationId: parseInt(formData.get('organizationId'))
    };
    
    try {
        console.log('准备更新培训，ID:', trainingId);
        console.log('更新培训数据:', trainingData);
        
        // 调用后端API更新培训
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(trainingData)
        });
        
        console.log('更新培训响应状态:', response.status);
        console.log('更新培训响应状态文本:', response.statusText);
        
        const data = await response.json();
        console.log('更新培训响应数据:', data);
        
        if (response.ok) {
            // 更新成功
            alert(data.message || '培训更新成功');
            // 关闭模态框
            form.closest('.modal').remove();
            // 刷新培训列表
            loadOrganizerTrainings();
        } else {
            // 更新失败
            console.error('更新培训失败，服务器返回:', data);
            alert(data.message || '培训更新失败' + (data.errors ? '：' + data.errors.map(err => err.msg).join('，') : ''));
        }
    } catch (error) {
        console.error('更新培训失败:', error);
        alert('更新培训失败，请稍后重试: ' + error.message);
    }
}

// 删除培训
async function deleteTraining(trainingId) {
    if (confirm('确定要删除这个培训吗？')) {
        try {
            // 调用API删除培训
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 删除成功
                alert(data.message || '培训删除成功');
                // 重新加载培训列表
                loadOrganizerTrainings();
            } else {
                // 删除失败
                alert(data.message || '培训删除失败');
            }
        } catch (error) {
            console.error('删除培训失败:', error);
            alert('删除培训失败，请稍后重试');
        }
    }
}

// 创建新活动
function createActivity() {
    // 创建活动创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>创建新活动</h2>
            <form id="createActivityForm">
                <div class="form-group">
                    <label for="activityTitle">活动标题</label>
                    <input type="text" id="activityTitle" name="title" required>
                </div>
                <div class="form-group">
                    <label for="activityDescription">活动描述</label>
                    <textarea id="activityDescription" name="description" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label for="activityType">活动类型</label>
                    <select id="activityType" name="type" required>
                        <option value="short-term">短期活动</option>
                        <option value="long-term">长期活动</option>
                        <option value="one-time">一次性活动</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1; margin-right: 10px;">
                        <label for="activityStartTime">开始时间</label>
                        <input type="datetime-local" id="activityStartTime" name="startTime" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="activityEndTime">结束时间</label>
                        <input type="datetime-local" id="activityEndTime" name="endTime" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="activityLocation">活动地点</label>
                    <input type="text" id="activityLocation" name="location" required>
                </div>
                <div class="form-group">
                    <label for="activityQuota">招募人数</label>
                    <input type="number" id="activityQuota" name="quota" min="1" required>
                </div>
                <div class="form-group">
                    <label for="activityRequirements">报名要求</label>
                    <textarea id="activityRequirements" name="requirements" rows="3"></textarea>
                </div>
                <div class="form-group">
                    <label for="activityStatus">活动状态</label>
                    <select id="activityStatus" name="status">
                        <option value="draft" selected>草稿</option>
                        <option value="recruiting">招募中</option>
                        <option value="ongoing">进行中</option>
                        <option value="completed">已结束</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>组织者（必填）</label>
                    <div class="form-row">
                        <div class="form-group" style="flex: 1; margin-right: 10px;">
                            <label for="organizerName">组织者姓名</label>
                            <input type="text" id="organizerName" name="organizerName" required>
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="organizationName">协会名称</label>
                            <input type="text" id="organizationName" name="organizationName" required>
                        </div>
                    </div>
                </div>
                <input type="hidden" name="organizationId" value="1">
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">创建活动</button>
                    <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 点击模态框外部关闭模态框
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
    
    // 绑定表单提交事件
    const form = modal.querySelector('#createActivityForm');
    form.addEventListener('submit', handleCreateActivity);
}

// 处理创建活动表单提交
async function handleCreateActivity(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // 转换时间格式为ISO 8601格式
    const startTime = new Date(formData.get('startTime'));
    const endTime = new Date(formData.get('endTime'));
    
    const activityData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: formData.get('location'),
        quota: parseInt(formData.get('quota')),
        requirements: formData.get('requirements'),
        status: formData.get('status') || 'draft', // 使用用户选择的活动状态，默认为草稿
        organizationId: 1 // 使用默认组织ID
    };
    
    try {
        // 调用后端API创建活动（使用正确的端口3001）
        const response = await fetch('http://localhost:3001/api/activities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(activityData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 创建成功
            alert(data.message || '活动创建成功');
            // 关闭模态框
            e.target.closest('.modal').remove();
            // 刷新活动列表
            loadOrganizerActivities();
        } else {
            // 创建失败，显示详细错误信息
            console.error('创建活动失败:', data);
            alert(data.message || '活动创建失败' + (data.errors ? '：' + data.errors.map(err => err.msg).join('，') : ''));
        }
    } catch (error) {
        console.error('创建活动失败:', error);
        alert('创建活动失败，请稍后重试: ' + error.message);
    }
}

// 创建新培训
function createTraining() {
    // 创建培训创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>创建新培训</h2>
            <form id="createTrainingForm">
                <div class="form-group">
                    <label for="trainingTitle">培训标题</label>
                    <input type="text" id="trainingTitle" name="title" required>
                </div>
                <div class="form-group">
                    <label for="trainingDescription">培训描述</label>
                    <textarea id="trainingDescription" name="description" rows="4" required></textarea>
                </div>
                <div class="form-group">
                    <label for="trainingType">培训类型</label>
                    <select id="trainingType" name="type" required>
                        <option value="general">通用培训</option>
                        <option value="specialized">专业培训</option>
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group" style="flex: 1; margin-right: 10px;">
                        <label for="trainingStartTime">开始时间</label>
                        <input type="datetime-local" id="trainingStartTime" name="startTime" required>
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label for="trainingEndTime">结束时间</label>
                        <input type="datetime-local" id="trainingEndTime" name="endTime" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="trainingLocation">培训地点</label>
                    <input type="text" id="trainingLocation" name="location" required>
                </div>
                <div class="form-group">
                    <label for="trainingQuota">招募人数</label>
                    <input type="number" id="trainingQuota" name="quota" min="1" required>
                </div>
                <div class="form-group">
                    <label for="trainingTeacher">培训教师</label>
                    <input type="text" id="trainingTeacher" name="teacher" required>
                </div>

                <div class="form-group">
                    <label for="trainingStatus">培训状态</label>
                    <select id="trainingStatus" name="status">
                        <option value="draft">草稿</option>
                        <option value="recruiting">招募中</option>
                        <option value="ongoing">进行中</option>
                        <option value="completed">已结束</option>
                    </select>
                </div>
                <input type="hidden" name="organizationId" value="1">
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">创建培训</button>
                    <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 点击模态框外部关闭模态框
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
    
    // 绑定表单提交事件
    const form = modal.querySelector('#createTrainingForm');
    form.addEventListener('submit', handleCreateTraining);
}

// 处理创建培训表单提交
async function handleCreateTraining(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const trainingData = {
        title: formData.get('title'),
        description: formData.get('description'),
        type: formData.get('type'),
        startTime: new Date(formData.get('startTime')).toISOString(),
        endTime: new Date(formData.get('endTime')).toISOString(),
        location: formData.get('location'),
        quota: parseInt(formData.get('quota')),
        teacher: formData.get('teacher'),
        status: formData.get('status') || 'draft',
        organizationId: parseInt(formData.get('organizationId'))
    };
    
    try {
        console.log('准备创建培训，数据:', trainingData);
        
        // 调用后端API创建培训
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:3001/api/trainings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(trainingData)
        });
        
        console.log('创建培训响应状态:', response.status);
        console.log('创建培训响应状态文本:', response.statusText);
        
        const data = await response.json();
        console.log('创建培训响应数据:', data);
        
        if (response.ok) {
            // 创建成功
            alert(data.message || '培训创建成功');
            // 关闭模态框
            form.closest('.modal').remove();
            // 刷新培训列表
            loadOrganizerTrainings();
        } else {
            // 创建失败，显示详细错误信息
            console.error('创建培训失败，服务器返回:', data);
            alert(data.message || '培训创建失败' + (data.errors ? '：' + data.errors.map(err => err.msg).join('，') : ''));
        }
    } catch (error) {
        console.error('创建培训失败:', error);
        alert('创建培训失败，请稍后重试: ' + error.message);
    }
}

// 查看组织详情
async function viewOrganization(orgId) {
    try {
        // 调用后端API获取组织详情（使用正确的端口3001）
        const response = await fetch(`http://localhost:3001/api/organizations/${orgId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 创建组织详情模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>${data.name} 详情</h2>
                    <div class="organization-detail">
                        <p><strong>组织ID:</strong> ${data.id}</p>
                        <p><strong>组织名称:</strong> ${data.name}</p>
                        <p><strong>所属部门:</strong> ${data.department}</p>
                        <p><strong>联系方式:</strong> ${data.contact}</p>
                        <p><strong>状态:</strong> ${data.status === 'approved' ? '已通过' : '待审核'}</p>
                        <p><strong>创建时间:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
                        <p><strong>更新时间:</strong> ${new Date(data.updatedAt).toLocaleString()}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            alert(data.message || '获取组织详情失败');
        }
    } catch (error) {
        console.error('获取组织详情失败:', error);
        alert('获取组织详情失败，请稍后重试');
    }
}

// 审核组织
async function approveOrganization(orgId) {
    // 创建组织审核模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            <h2>审核组织</h2>
            <form id="approveOrganizationForm" data-org-id="${orgId}">
                <div class="form-group">
                    <label for="approvalStatus">审核结果</label>
                    <select id="approvalStatus" name="status" required>
                        <option value="approved">通过</option>
                        <option value="rejected">拒绝</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="approvalComment">审核意见</label>
                    <textarea id="approvalComment" name="comment" rows="3" placeholder="请输入审核意见（可选）"></textarea>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">提交审核</button>
                    <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 点击模态框外部关闭模态框
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
    
    // 绑定表单提交事件
    const form = modal.querySelector('#approveOrganizationForm');
    form.addEventListener('submit', handleApproveOrganization);
}

// 处理组织审核表单提交
async function handleApproveOrganization(e) {
    e.preventDefault();
    
    const form = e.target;
    const orgId = form.dataset.orgId;
    
    const formData = new FormData(form);
    const approvalData = {
        status: formData.get('status'),
        comment: formData.get('comment')
    };
    
    try {
        // 调用后端API审核组织
        const response = await fetch(`http://localhost:3001/api/organizations/${orgId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(approvalData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 审核成功
            alert(data.message || '组织审核成功');
            // 关闭模态框
            form.closest('.modal').remove();
            // 刷新组织列表
            loadOrganizations();
        } else {
            // 审核失败
            alert(data.message || '组织审核失败');
        }
    } catch (error) {
        console.error('审核组织失败:', error);
        alert('审核组织失败，请稍后重试');
    }
}

// 查看用户详情
async function viewUser(userId) {
    try {
        // 调用后端API获取用户详情（使用正确的端口3001和路径）
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 创建用户详情模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>${data.name} 详情</h2>
                    <div class="user-detail">
                        <p><strong>用户ID:</strong> ${data.id}</p>
                        <p><strong>姓名:</strong> ${data.name}</p>
                        <p><strong>手机号:</strong> ${data.phone}</p>
                        <p><strong>邮箱:</strong> ${data.email}</p>
                        <p><strong>角色:</strong> ${data.role === 'volunteer' ? '志愿者' : data.role === 'organizer' ? '组织方' : '管理方'}</p>
                        <p><strong>性别:</strong> ${data.gender === 'male' ? '男' : data.gender === 'female' ? '女' : '其他'}</p>
                        <p><strong>年龄:</strong> ${data.age || '未设置'}</p>
                        <p><strong>志愿时长:</strong> ${data.volunteerHours || 0}小时</p>
                        <p><strong>所属组织:</strong> ${data.organizationId || '无'}</p>
                        <p><strong>创建时间:</strong> ${new Date(data.createdAt).toLocaleString()}</p>
                        <p><strong>更新时间:</strong> ${new Date(data.updatedAt).toLocaleString()}</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
        } else {
            alert(data.message || '获取用户详情失败');
        }
    } catch (error) {
        console.error('获取用户详情失败:', error);
        alert('获取用户详情失败，请稍后重试');
    }
}

// 编辑用户
async function editUser(userId) {
    try {
        // 调用后端API获取用户详情
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const user = await response.json();
        
        if (response.ok) {
            // 创建用户编辑模态框
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    <h2>编辑用户</h2>
                    <form id="editUserForm" data-user-id="${userId}">
                        <div class="form-row">
                            <div class="form-group" style="flex: 1; margin-right: 10px;">
                                <label for="editUserName">姓名</label>
                                <input type="text" id="editUserName" name="name" value="${user.name}" required>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label for="editUserRole">角色</label>
                                <select id="editUserRole" name="role" required>
                                    <option value="volunteer" ${user.role === 'volunteer' ? 'selected' : ''}>志愿者</option>
                                    <option value="organizer" ${user.role === 'organizer' ? 'selected' : ''}>组织方</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理方</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1; margin-right: 10px;">
                                <label for="editUserPhone">手机号</label>
                                <input type="tel" id="editUserPhone" name="phone" value="${user.phone}" required>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label for="editUserEmail">邮箱</label>
                                <input type="email" id="editUserEmail" name="email" value="${user.email}" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group" style="flex: 1; margin-right: 10px;">
                                <label for="editUserGender">性别</label>
                                <select id="editUserGender" name="gender">
                                    <option value="male" ${user.gender === 'male' ? 'selected' : ''}>男</option>
                                    <option value="female" ${user.gender === 'female' ? 'selected' : ''}>女</option>
                                    <option value="other" ${user.gender === 'other' ? 'selected' : ''}>其他</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex: 1;">
                                <label for="editUserAge">年龄</label>
                                <input type="number" id="editUserAge" name="age" value="${user.age || ''}" min="0" max="120">
                            </div>
                        </div>
                        <div class="form-group">
                            <button type="submit" class="btn btn-primary">保存修改</button>
                            <button type="button" class="btn" onclick="this.closest('.modal').remove()">取消</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
            
            // 点击模态框外部关闭模态框
            window.onclick = function(event) {
                if (event.target === modal) {
                    modal.remove();
                }
            };
            
            // 绑定表单提交事件
            const form = modal.querySelector('#editUserForm');
            form.addEventListener('submit', handleEditUser);
        } else {
            alert('获取用户详情失败');
        }
    } catch (error) {
        console.error('获取用户详情失败:', error);
        alert('获取用户详情失败，请稍后重试');
    }
}

// 处理编辑用户表单提交
async function handleEditUser(e) {
    e.preventDefault();
    
    const form = e.target;
    const userId = form.dataset.userId;
    
    const formData = new FormData(form);
    const userData = {
        name: formData.get('name'),
        role: formData.get('role'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        gender: formData.get('gender'),
        age: formData.get('age') || null
    };
    
    try {
        // 调用后端API更新用户信息
        const response = await fetch(`http://localhost:3001/api/user/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 更新成功
            alert(data.message || '用户信息更新成功');
            // 关闭模态框
            form.closest('.modal').remove();
            // 刷新用户列表
            loadUsers();
        } else {
            // 更新失败
            alert(data.message || '用户信息更新失败');
        }
    } catch (error) {
        console.error('更新用户信息失败:', error);
        alert('更新用户信息失败，请稍后重试');
    }
}

// 退出登录
function logout() {
    // 清除所有用户相关数据，避免数据残留
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('registeredActivityIds');
    localStorage.removeItem('registeredTrainingIds');
    location.reload();
}

// 显示主系统界面
function showMainSystem() {
    try {
        const mainSystem = document.getElementById('main-system');
        const loginPage = document.getElementById('login-page');
        const registerPage = document.getElementById('register-page');
        
        if (mainSystem) mainSystem.style.display = 'block';
        if (loginPage) loginPage.style.display = 'none';
        if (registerPage) registerPage.style.display = 'none';
        
        // 绑定模态框事件
        if (typeof bindModalEvents === 'function') {
            bindModalEvents();
        }
    } catch (error) {
        console.error('显示主系统界面失败:', error);
    }
}

// 显示登录页面
function showLoginPage() {
    try {
        const loginPage = document.getElementById('login-page');
        const registerPage = document.getElementById('register-page');
        
        if (loginPage) loginPage.style.display = 'flex';
        if (registerPage) registerPage.style.display = 'none';
    } catch (error) {
        console.error('显示登录页面失败:', error);
    }
}

// 显示注册页面
function showRegisterPage() {
    try {
        const loginPage = document.getElementById('login-page');
        const registerPage = document.getElementById('register-page');
        
        if (loginPage) loginPage.style.display = 'none';
        if (registerPage) registerPage.style.display = 'flex';
    } catch (error) {
        console.error('显示注册页面失败:', error);
    }
}

// 绑定登录注册页面事件
function bindLoginRegisterEvents() {
    // 登录表单提交
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin(e);
        });
    }
    
    // 注册表单提交
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegister(e);
        });
    }
    
    // 用户类型选择交互 - 主注册页面
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const organizationGroup = document.getElementById('organization-name-group');
    const registerModalOrganizationGroup = document.getElementById('registerModalOrganizationGroup');
    
    function toggleOrganizationField() {
        // 检查是主注册页面还是模态框
        const mainRoleSelect = document.getElementById('register-role');
        const modalRoleSelect = document.getElementById('registerRole');
        
        let selectedRole = 'volunteer';
        if (mainRoleSelect) {
            selectedRole = mainRoleSelect.value;
        } else if (modalRoleSelect) {
            selectedRole = modalRoleSelect.value;
        }
        
        if (selectedRole === 'organizer') {
            if (organizationGroup) organizationGroup.style.display = 'block';
            if (registerModalOrganizationGroup) registerModalOrganizationGroup.style.display = 'block';
        } else {
            if (organizationGroup) organizationGroup.style.display = 'none';
            if (registerModalOrganizationGroup) registerModalOrganizationGroup.style.display = 'none';
        }
    }
    
    // 为主注册页面的下拉选择框添加事件监听器
    const mainRoleSelect = document.getElementById('register-role');
    if (mainRoleSelect) {
        mainRoleSelect.addEventListener('change', toggleOrganizationField);
    }
    
    // 初始化时检查默认选中状态
    toggleOrganizationField();
    
    // 切换到注册表单
    const showRegisterLink = document.getElementById('show-register');
    if (showRegisterLink) {
        showRegisterLink.onclick = function(e) {
            e.preventDefault();
            showRegisterPage();
        };
    }
    
    // 切换到登录表单
    const showLoginLink = document.getElementById('show-login');
    if (showLoginLink) {
        showLoginLink.onclick = function(e) {
            e.preventDefault();
            showLoginPage();
        };
    }
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
    if (showRegisterLink) {
        showRegisterLink.onclick = function(e) {
            e.preventDefault();
            hideModal('loginModal');
            showModal('registerModal');
        };
    }
    
    // 切换到登录表单
    if (showLoginLink) {
        showLoginLink.onclick = function(e) {
            e.preventDefault();
            hideModal('registerModal');
            showModal('loginModal');
        };
    }
    
    // 模态框中注册表单的提交事件
    const modalRegisterForm = document.getElementById('registerForm');
    if (modalRegisterForm) {
        modalRegisterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegister(e);
        });
    }
    
    // 模态框中用户类型选择交互
    function initModalRoleInteraction() {
        // 确保模态框已经显示
        const modalRoleSelect = document.getElementById('registerRole');
        const modalOrganizationGroup = document.getElementById('registerModalOrganizationGroup');
        
        function toggleModalOrganizationField() {
            const selectedRole = modalRoleSelect?.value || 'volunteer';
            if (selectedRole === 'organizer') {
                if (modalOrganizationGroup) modalOrganizationGroup.style.display = 'block';
            } else {
                if (modalOrganizationGroup) modalOrganizationGroup.style.display = 'none';
            }
        }
        
        // 为模态框中的角色下拉选择框添加事件监听器
        if (modalRoleSelect) {
            modalRoleSelect.addEventListener('change', toggleModalOrganizationField);
        }
        
        // 初始化模态框中的组织字段显示
        toggleModalOrganizationField();
    }
    
    // 当显示注册模态框时初始化角色交互
    const modalShowRegisterLinks = document.querySelectorAll('[onclick*="registerModal"], #showRegister, #show-register');
    modalShowRegisterLinks.forEach(link => {
        link.addEventListener('click', function() {
            // 延迟执行，确保模态框已经显示
            setTimeout(initModalRoleInteraction, 100);
        });
    });
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

// 退出登录
function logout() {
    // 清除所有用户相关数据，避免数据残留
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('registeredActivityIds');
    localStorage.removeItem('registeredTrainingIds');
    location.reload();
}

// 获取用户已报名的活动和培训列表
async function loadUserRegistrations() {
    const token = localStorage.getItem('token');
    if (!token) {
        // 清除之前的注册信息
        localStorage.setItem('registeredActivityIds', '[]');
        localStorage.setItem('registeredTrainingIds', '[]');
        return;
    }
    
    try {
        console.log('=== 开始获取用户已报名的活动和培训列表 ===');
        console.log('使用的token:', token);
        
        // 清除之前的注册信息，避免数据残留
        localStorage.setItem('registeredActivityIds', '[]');
        localStorage.setItem('registeredTrainingIds', '[]');
        
        // 获取已报名的活动列表
        console.log('开始获取已报名活动列表...');
        const activitiesResponse = await fetch('http://localhost:3001/api/activities/user/participated', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('已报名活动列表响应状态:', activitiesResponse.status);
        const activitiesData = await activitiesResponse.json();
        console.log('已报名活动列表响应数据:', activitiesData);
        
        // 检查返回格式
        let activities = [];
        if (activitiesData.data && Array.isArray(activitiesData.data)) {
            // 分页格式，数据在data字段中
            activities = activitiesData.data;
        } else if (Array.isArray(activitiesData)) {
            // 直接返回数组
            activities = activitiesData;
        } else if (activitiesData.message) {
            // 错误响应，可能是认证失败
            console.error('获取已报名活动失败:', activitiesData.message);
            // 不抛出错误，继续执行
        } else {
            // 其他格式，尝试从中提取活动数据
            console.error('已报名活动列表返回格式不符合预期:', activitiesData);
        }
        
        const registeredActivityIds = activities.map(activity => activity.id);
        localStorage.setItem('registeredActivityIds', JSON.stringify(registeredActivityIds));
        console.log('已报名活动ID列表:', registeredActivityIds);
        
        // 获取已报名的培训列表
        console.log('开始获取已报名培训列表...');
        const trainingsResponse = await fetch('http://localhost:3001/api/trainings/user/participated', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('已报名培训列表响应状态:', trainingsResponse.status);
        const trainingsData = await trainingsResponse.json();
        console.log('已报名培训列表响应数据:', trainingsData);
        
        // 检查返回格式
        let trainings = [];
        if (trainingsData.data && Array.isArray(trainingsData.data)) {
            // 分页格式，数据在data字段中
            trainings = trainingsData.data;
        } else if (Array.isArray(trainingsData)) {
            // 直接返回数组
            trainings = trainingsData;
        } else if (trainingsData.message) {
            // 错误响应，可能是认证失败
            console.error('获取已报名培训失败:', trainingsData.message);
            // 不抛出错误，继续执行
        } else {
            // 其他格式，尝试从中提取培训数据
            console.error('已报名培训列表返回格式不符合预期:', trainingsData);
        }
        
        const registeredTrainingIds = trainings.map(training => training.id);
        localStorage.setItem('registeredTrainingIds', JSON.stringify(registeredTrainingIds));
        console.log('已报名培训ID列表:', registeredTrainingIds);
        
        console.log('=== 获取用户已报名的活动和培训列表完成 ===');
    } catch (error) {
        console.error('获取用户注册信息失败:', error);
        // 确保清除之前的数据，避免旧数据残留
        localStorage.setItem('registeredActivityIds', '[]');
        localStorage.setItem('registeredTrainingIds', '[]');
    }
}

// 处理登录
async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const emailPhone = formData.get('emailPhone');
    const password = formData.get('password');
    
    // 模拟登录功能 - 允许使用测试账号登录
    const testCredentials = [
        // 保留原有测试账号，密码与后端种子数据一致
        {
            email: 'test@example.com',
            phone: '13812345678',
            password: '123456',
            role: 'volunteer'
        },
        // 新测试账号，密码与后端种子数据一致
        {
            email: 'volunteer@example.com',
            phone: '13800000001',
            password: '123456',
            role: 'volunteer'
        },
        { 
            email: 'organizer@example.com',
            phone: '13800000002',
            password: '123456',
            role: 'organizer'
        },
        {
            email: 'admin@example.com',
            phone: '13800000003',
            password: '123456',
            role: 'admin'
        }
    ];
    
    try {
        // 先尝试调用真实API（使用正确的端口3001）
        // 根据输入内容判断是email还是phone
        const isEmail = emailPhone.includes('@');
        const loginData = isEmail ? 
            { email: emailPhone, password } : 
            { phone: emailPhone, password };
        
        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success' && data.data && data.data.token && data.data.user) {
            // 真实API登录成功
            // 清除之前的用户数据，避免数据残留
            localStorage.removeItem('registeredActivityIds');
            localStorage.removeItem('registeredTrainingIds');
            
            localStorage.setItem('token', data.data.token);
            // 提取用户数据，注意API返回格式是data.data.user
            const userData = { ...data.data.user };
            localStorage.setItem('user', JSON.stringify(userData));
            
            // 登录成功后直接刷新页面，确保所有初始化逻辑正确执行
            location.reload();
        } else {
            // 真实API登录失败，检查是否是测试账号
            // 查找匹配的测试账号
            const matchingCredential = testCredentials.find(cred => 
                (cred.email === emailPhone || cred.phone === emailPhone) && 
                cred.password === password
            );
            
            if (matchingCredential) {
                // 测试账号登录成功
                // 使用账号对应的角色，忽略表单选择的角色
                const actualRole = matchingCredential.role;
                
                // 清除之前的用户数据，避免数据残留
                localStorage.removeItem('registeredActivityIds');
                localStorage.removeItem('registeredTrainingIds');
                
                // 生成真实的JWT令牌格式，以便中间件验证通过
                // 为不同的志愿者分配不同的ID，避免报名冲突
                let userId = 1;
                if (actualRole === 'admin') {
                    userId = 1;
                } else if (actualRole === 'organizer') {
                    userId = 2;
                } else {
                    // 为不同的志愿者分配不同的ID
                    if (matchingCredential.email === 'test@example.com' || matchingCredential.phone === '13812345678') {
                        userId = 3;
                    } else if (matchingCredential.email === 'volunteer@example.com' || matchingCredential.phone === '13800000001') {
                        userId = 4;
                    } else {
                        userId = 3;
                    }
                }
                
                const mockUser = {
                    id: userId,
                    name: actualRole === 'admin' ? '管理员' : actualRole === 'organizer' ? '组织方' : '志愿者',
                    phone: matchingCredential.phone,
                    email: matchingCredential.email,
                    role: actualRole,
                    volunteerHours: 0
                };
                
                // 为不同用户分配与后端匹配的硬编码JWT令牌
                let token = '';
                if (actualRole === 'admin') {
                    // 管理员令牌
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY2MjIwNDc1LCJleHAiOjE3NjYzMDY4NzV9.DlZnt84d9zTkbwfhS3KmhaSiAWnJvb6eJYJ95fEhHF4';
                } else if (actualRole === 'organizer') {
                    // 组织方令牌
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6Im9yZ2FuaXplciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.A0_4orz7xSWf1GVWQ5E1sl0YtOlvn_XDPPp6RU1xiYY';
                } else if (userId === 3) {
                    // 志愿者1令牌
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.FJB8SYOkBmtc9RedB2_qxwO8zppPzPqlFXfktFPsOwI';
                } else if (userId === 4) {
                    // 志愿者2令牌
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.7Z9k8a7b6c5d4e3f2g1h0i9j8k7l6m5n4o3p2q1r0s9t8u7v6w5x4y3z2a1b0';
                } else {
                    // 默认志愿者令牌
                    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.FJB8SYOkBmtc9RedB2_qxwO8zppPzPqlFXfktFPsOwI';
                }
                
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(mockUser));
                // 显示主系统界面
                showMainSystem();
                // 更新导航栏
                updateNavForLoggedInUser();
                // 加载用户信息
                loadUserProfile();
                // 加载用户注册信息
                loadUserRegistrations();
                // 加载活动列表
                loadActivities();
                // 加载培训列表
                loadTrainings();
                alert(`${actualRole}账号登录成功`);
            } else {
                // 普通登录失败
                alert(data.message || '登录失败，请检查账号密码');
            }
        }
    } catch (error) {
        console.error('登录请求失败:', error);
        
        // API请求失败，检查是否是测试账号
        // 查找匹配的测试账号
        const matchingCredential = testCredentials.find(cred => 
            (cred.email === emailPhone || cred.phone === emailPhone) && 
            cred.password === password
        );
        
        if (matchingCredential) {
            // 测试账号登录成功
            // 清除之前的用户数据，避免数据残留
            localStorage.removeItem('registeredActivityIds');
            localStorage.removeItem('registeredTrainingIds');
            
            // 使用账号对应的角色，忽略表单选择的角色
            const actualRole = matchingCredential.role;
            
            // 为不同的志愿者分配不同的ID，避免报名冲突
            let userId = 1;
            if (actualRole === 'admin') {
                userId = 1;
            } else if (actualRole === 'organizer') {
                userId = 2;
            } else {
                // 为不同的志愿者分配不同的ID
                if (matchingCredential.email === 'test@example.com' || matchingCredential.phone === '13812345678') {
                    userId = 3;
                } else if (matchingCredential.email === 'volunteer@example.com' || matchingCredential.phone === '13800000001') {
                    userId = 4;
                } else {
                    userId = 3;
                }
            }
            
            // 生成真实的JWT令牌格式，以便中间件验证通过
            const mockUser = {
                id: userId, // 使用数字ID，与try块保持一致
                name: actualRole === 'admin' ? '管理员' : actualRole === 'organizer' ? '组织方' : '志愿者',
                phone: matchingCredential.phone,
                email: matchingCredential.email,
                role: actualRole,
                volunteerHours: 0
            };
            
            // 根据不同角色和用户ID生成不同的JWT令牌
            let token = '';
            if (actualRole === 'admin') {
                // 管理员令牌
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzY2MjIwNDc1LCJleHAiOjE3NjYzMDY4NzV9.DlZnt84d9zTkbwfhS3KmhaSiAWnJvb6eJYJ95fEhHF4';
            } else if (actualRole === 'organizer') {
                // 组织方令牌
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Miwicm9sZSI6Im9yZ2FuaXplciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.A0_4orz7xSWf1GVWQ5E1sl0YtOlvn_XDPPp6RU1xiYY';
            } else if (userId === 3) {
                // 志愿者1令牌
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.FJB8SYOkBmtc9RedB2_qxwO8zppPzPqlFXfktFPsOwI';
            } else if (userId === 4) {
                // 志愿者2令牌
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.7Z9k8a7b6c5d4e3f2g1h0i9j8k7l6m5n4o3p2q1r0s9t8u7v6w5x4y3z2a1b0';
            } else {
                // 默认志愿者令牌
                token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Mywicm9sZSI6InZvbHVudGVlciIsImlhdCI6MTc2NjIyMDQ3NSwiZXhwIjoxNzY2MzA2ODc1fQ.FJB8SYOkBmtc9RedB2_qxwO8zppPzPqlFXfktFPsOwI';
            }
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(mockUser));
            // 显示主系统界面
            showMainSystem();
            // 更新导航栏
            updateNavForLoggedInUser();
            // 加载用户信息
            loadUserProfile();
            // 加载用户注册信息
            loadUserRegistrations();
            // 加载活动列表
            loadActivities();
            // 加载培训列表
            loadTrainings();
            alert(`${actualRole}账号登录成功`);
        } else {
            // 完全登录失败
            alert('登录失败，API服务不可用，请检查网络连接或使用测试账号登录');
        }
    }
}

// 处理注册
async function handleRegister(e) {
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const phone = formData.get('phone');
    const email = formData.get('email');
    const password = formData.get('password');
    const role = formData.get('role') || 'volunteer';
    const organizationName = formData.get('organizationName');
    
    try {
        // 调用注册API（使用正确的端口3001）
        const response = await fetch('http://localhost:3001/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                phone,
                email,
                password,
                role,
                organizationName
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 注册成功，显示登录页面
            showLoginPage();
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
async function viewActivityDetail(activityId) {
    // 获取活动详情内容容器
    const activityDetailContent = document.getElementById('activityDetailContent');
    if (activityDetailContent) {
        // 显示加载状态
        activityDetailContent.innerHTML = '<div class="loading">加载中...<div class="loading-spinner"></div></div>';
    }
    
    // 显示模态框
    showModal('activityDetailModal');
    
    try {
        // 调用API获取活动详情
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`获取活动详情失败，状态码: ${response.status}`);
        }
        
        const activity = await response.json();
        renderActivityDetail(activity.data || activity);
    } catch (error) {
        console.error('获取活动详情失败:', error);
        
        // 显示错误信息和重试按钮
        const activityDetailContent = document.getElementById('activityDetailContent');
        if (activityDetailContent) {
            activityDetailContent.innerHTML = `
                <div class="error-message">
                    <p>获取活动详情失败: ${error.message}</p>
                    <button class="btn btn-primary" onclick="viewActivityDetail(${activityId})">重试</button>
                </div>
            `;
        } else {
            alert('获取活动详情失败，请稍后重试');
        }
    }
}

// 查看培训详情
async function viewTrainingDetail(trainingId) {
    try {
        // 调用API获取培训详情
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('获取培训详情失败');
        }
        
        const training = await response.json();
        renderTrainingDetail(training.data || training);
        showModal('activityDetailModal');
    } catch (error) {
        console.error('获取培训详情失败:', error);
        alert('获取培训详情失败，请稍后重试');
    }
}

// 渲染培训详情
function renderTrainingDetail(training) {
    const activityDetailContent = document.getElementById('activityDetailContent');
    
    // 获取用户信息
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    
    let buttonHtml = '';
    
    // 只有志愿者才显示报名按钮
    if (user && user.role === 'volunteer') {
        // 获取用户已报名的培训ID列表
        const registeredTrainingIds = JSON.parse(localStorage.getItem('registeredTrainingIds') || '[]');
        
        // 检查用户是否已报名该培训
        const isRegistered = registeredTrainingIds.includes(training.id);
        
        buttonHtml = `
            ${isRegistered ? 
                `<button class="btn btn-danger" onclick="cancelTrainingRegistration(${training.id})">取消报名</button>` : 
                `<button class="btn btn-primary" onclick="registerTraining(${training.id})">立即报名</button>`
            }
        `;
    }
    
    // 志愿者信息模块
    let volunteersModule = '';
    if (user && (user.role === 'organizer' || user.role === 'admin')) {
        // 缓存志愿者数据
        trainingVolunteersData[training.id] = training.participants || [];
        
        // 只有组织者和管理员可以查看志愿者信息
        volunteersModule = `
            <h3>报名志愿者信息</h3>
            <div class="volunteers-section">
                <!-- 筛选和导出功能 -->
                <div class="volunteers-controls">
                    <div class="filters">
                        <select id="trainingVolunteerStatusFilter" onchange="filterTrainingVolunteers(${training.id})">
                            <option value="">全部状态</option>
                            <option value="pending">待审核</option>
                            <option value="approved">已通过</option>
                            <option value="rejected">已拒绝</option>
                            <option value="completed">已完成</option>
                        </select>
                        <input type="text" id="trainingVolunteerNameFilter" placeholder="搜索姓名或手机号" oninput="filterTrainingVolunteers(${training.id})">
                        <button class="btn btn-secondary" onclick="exportTrainingVolunteers(${training.id})"><i class="fas fa-download"></i> 导出</button>
                    </div>
                </div>
                
                <!-- 志愿者信息表格 -->
                <div class="table-container">
                    <table class="volunteers-table">
                        <thead>
                            <tr>
                                <th>志愿者姓名</th>
                                <th>手机号</th>
                                <th>邮箱</th>
                                <th>性别</th>
                                <th>年龄</th>
                                <th>报名时间</th>
                                <th>状态</th>
                                <th>是否出席</th>
                                <th>评价评分</th>
                                <th>评价内容</th>
                            </tr>
                        </thead>
                        <tbody id="trainingVolunteersTableBody">
                            ${renderTrainingVolunteers(training.participants || [], 1, 10)}
                        </tbody>
                    </table>
                </div>
                
                <!-- 分页控件 -->
                <div class="pagination" id="trainingVolunteersPagination">
                    <!-- 分页内容将通过JavaScript动态生成 -->
                </div>
            </div>
        `;
    }
    
    activityDetailContent.innerHTML = `
        <h2>${training.title}</h2>
        <div class="activity-detail">
            <p><strong>培训类型:</strong> ${training.type}</p>
            <p><strong>开始时间:</strong> ${training.startTime}</p>
            <p><strong>结束时间:</strong> ${training.endTime}</p>
            <p><strong>培训地点:</strong> ${training.location}</p>
            <p><strong>招募人数:</strong> ${training.registeredCount || 0}/${training.quota}</p>
            <p><strong>讲师:</strong> ${training.teacher}</p>
            <p><strong>组织:</strong> ${training.organization?.name || training.organization || '未知组织'}</p>
            <p><strong>培训状态:</strong> ${training.status}</p>
            <p><strong>报名要求:</strong> ${training.requirements}</p>
            <h3>培训描述</h3>
            <p>${training.description}</p>
            ${buttonHtml}
        </div>
        ${volunteersModule}
    `;
    
    // 初始化培训志愿者分页控件
    if (user && (user.role === 'organizer' || user.role === 'admin')) {
        setTimeout(() => {
            renderFilteredTrainingVolunteers(training.id, training.participants || [], 1);
        }, 0);
    }
}

// 通用分页生成函数
function generatePagination(containerId, totalItems, currentPage, pageSize, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const totalPages = Math.ceil(totalItems / pageSize);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '<div class="pagination-controls">';
    
    // 上一页按钮
    paginationHTML += `<button class="page-btn ${currentPage === 1 ? 'disabled' : ''}" onclick="${currentPage > 1 ? `onPageChange(${currentPage - 1})` : ''}">&lt; 上一页</button>`;
    
    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        // 只显示当前页前后各2页和首尾页
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="onPageChange(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span class="page-ellipsis">...</span>';
        }
    }
    
    // 下一页按钮
    paginationHTML += `<button class="page-btn ${currentPage === totalPages ? 'disabled' : ''}" onclick="${currentPage < totalPages ? `onPageChange(${currentPage + 1})` : ''}">下一页 &gt;</button>`;
    
    paginationHTML += '</div>';
    
    container.innerHTML = paginationHTML;
}

// 培训志愿者数据缓存
let trainingVolunteersData = {};

// 渲染培训志愿者列表
function renderTrainingVolunteers(volunteers, page = 1, pageSize = 10) {
    if (!volunteers || volunteers.length === 0) {
        return '<tr><td colspan="10" class="no-data">暂无报名志愿者</td></tr>';
    }
    
    // 计算分页数据
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVolunteers = volunteers.slice(startIndex, endIndex);
    
    return paginatedVolunteers.map(volunteer => `
        <tr>
            <td>${volunteer.volunteerName}</td>
            <td>${volunteer.contactInfo?.phone || '未提供'}</td>
            <td>${volunteer.contactInfo?.email || '未提供'}</td>
            <td>${volunteer.gender || '未提供'}</td>
            <td>${volunteer.age || '未提供'}</td>
            <td>${volunteer.registrationTime || '未提供'}</td>
            <td>${volunteer.status || '未提供'}</td>
            <td>${volunteer.attendance ? '是' : '否'}</td>
            <td>${volunteer.rating || '未评价'}</td>
            <td>${volunteer.comment || '无'}</td>
        </tr>
    `).join('');
}

// 筛选培训志愿者
function filterTrainingVolunteers(trainingId) {
    // 获取筛选条件
    const statusFilter = document.getElementById('trainingVolunteerStatusFilter')?.value;
    const nameFilter = document.getElementById('trainingVolunteerNameFilter')?.value.toLowerCase();
    
    // 获取原始数据
    const allVolunteers = trainingVolunteersData[trainingId] || [];
    
    // 应用筛选
    let filteredVolunteers = allVolunteers;
    
    if (statusFilter) {
        filteredVolunteers = filteredVolunteers.filter(volunteer => volunteer.status === statusFilter);
    }
    
    if (nameFilter) {
        filteredVolunteers = filteredVolunteers.filter(volunteer => 
            volunteer.volunteerName.toLowerCase().includes(nameFilter) ||
            volunteer.contactInfo?.phone?.includes(nameFilter) ||
            volunteer.contactInfo?.email?.toLowerCase().includes(nameFilter)
        );
    }
    
    // 渲染筛选结果（第一页）
    renderFilteredTrainingVolunteers(trainingId, filteredVolunteers, 1);
}

// 渲染筛选后的培训志愿者
function renderFilteredTrainingVolunteers(trainingId, filteredVolunteers, page = 1, pageSize = 10) {
    // 更新表格内容
    const tableBody = document.getElementById('trainingVolunteersTableBody');
    tableBody.innerHTML = renderTrainingVolunteers(filteredVolunteers, page, pageSize);
    
    // 生成分页控件
    generatePagination('trainingVolunteersPagination', filteredVolunteers.length, page, pageSize, (newPage) => {
        renderFilteredTrainingVolunteers(trainingId, filteredVolunteers, newPage, pageSize);
    });
}

// 导出培训志愿者
function exportTrainingVolunteers(trainingId) {
    // 实现导出功能
    window.location.href = `http://localhost:3001/api/trainings/${trainingId}/export`;
}

// 渲染活动详情
function renderActivityDetail(activity) {
    try {
        const activityDetailContent = document.getElementById('activityDetailContent');
        if (!activityDetailContent) {
            console.error('渲染活动详情失败: activityDetailContent元素不存在');
            return;
        }
        
        // 获取用户信息
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        let buttonHtml = '';
        
        // 只有志愿者才显示报名按钮
        if (user && user.role === 'volunteer') {
            // 获取用户已报名的活动ID列表
            const registeredActivityIds = JSON.parse(localStorage.getItem('registeredActivityIds') || '[]');
            
            // 检查用户是否已报名该活动
            const isRegistered = registeredActivityIds.includes(activity.id);
            
            buttonHtml = `
                ${isRegistered ? 
                    `<button class="btn btn-danger" onclick="cancelActivityRegistration(${activity.id})">取消报名</button>` : 
                    `<button class="btn btn-primary" onclick="registerActivity(${activity.id})">立即报名</button>`
                }
            `;
        }
        
        // 志愿者信息模块
        let volunteersModule = '';
        if (user && (user.role === 'organizer' || user.role === 'admin')) {
            // 缓存志愿者数据
            activityVolunteersData[activity.id] = activity.participants || [];
            
            // 只有组织者和管理员可以查看志愿者信息
            volunteersModule = `
                <h3>报名志愿者信息</h3>
                <div class="volunteers-section">
                    <!-- 筛选和导出功能 -->
                    <div class="volunteers-controls">
                        <div class="filters">
                            <select id="activityVolunteerStatusFilter" onchange="filterActivityVolunteers(${activity.id})">
                                <option value="">全部状态</option>
                                <option value="pending">待审核</option>
                                <option value="approved">已通过</option>
                                <option value="rejected">已拒绝</option>
                            </select>
                            <input type="text" id="activityVolunteerNameFilter" placeholder="搜索姓名或手机号" oninput="filterActivityVolunteers(${activity.id})">
                            <button class="btn btn-secondary" onclick="exportActivityVolunteers(${activity.id})"><i class="fas fa-download"></i> 导出</button>
                        </div>
                    </div>
                    
                    <!-- 志愿者信息表格 -->
                    <div class="table-container">
                        <table class="volunteers-table">
                            <thead>
                                <tr>
                                    <th>志愿者姓名</th>
                                    <th>手机号</th>
                                    <th>邮箱</th>
                                    <th>性别</th>
                                    <th>年龄</th>
                                    <th>报名时间</th>
                                    <th>状态</th>
                                    <th>签到时间</th>
                                    <th>签退时间</th>
                                    <th>服务时长</th>
                                </tr>
                            </thead>
                            <tbody id="activityVolunteersTableBody">
                                ${renderActivityVolunteers(activity.participants || [], 1, 10)}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- 分页控件 -->
                    <div class="pagination" id="activityVolunteersPagination">
                        <!-- 分页内容将通过JavaScript动态生成 -->
                    </div>
                </div>
            `;
        }
        
        activityDetailContent.innerHTML = `
            <h2>${activity.title}</h2>
            <div class="activity-detail">
                <p><strong>活动类型:</strong> ${activity.type}</p>
                <p><strong>开始时间:</strong> ${activity.startTime}</p>
                <p><strong>结束时间:</strong> ${activity.endTime}</p>
                <p><strong>活动地点:</strong> ${activity.location}</p>
                <p><strong>招募人数:</strong> ${activity.registeredCount || 0}/${activity.quota}</p>
                <p><strong>组织者:</strong> ${activity.organizer?.name || activity.organizerName || '未知组织者'} (${activity.organization?.name || activity.organizationName || '未知协会'})</p>
                <p><strong>活动状态:</strong> ${activity.status}</p>
                <p><strong>报名要求:</strong> ${activity.requirements}</p>
                <h3>活动描述</h3>
                <p>${activity.description}</p>
                ${buttonHtml}
            </div>
            ${volunteersModule}
        `;
        
        // 初始化活动志愿者分页控件
        if (user && (user.role === 'organizer' || user.role === 'admin')) {
            setTimeout(() => {
                renderFilteredActivityVolunteers(activity.id, activity.participants || [], 1);
            }, 0);
        }
    } catch (error) {
        console.error('渲染活动详情失败:', error);
    }
}

// 活动志愿者数据缓存
let activityVolunteersData = {};

// 渲染活动志愿者列表
function renderActivityVolunteers(volunteers, page = 1, pageSize = 10) {
    if (!volunteers || volunteers.length === 0) {
        return '<tr><td colspan="10" class="no-data">暂无报名志愿者</td></tr>';
    }
    
    // 计算分页数据
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedVolunteers = volunteers.slice(startIndex, endIndex);
    
    return paginatedVolunteers.map(volunteer => `
        <tr>
            <td>${volunteer.volunteerName}</td>
            <td>${volunteer.contactInfo?.phone || '未提供'}</td>
            <td>${volunteer.contactInfo?.email || '未提供'}</td>
            <td>${volunteer.gender || '未提供'}</td>
            <td>${volunteer.age || '未提供'}</td>
            <td>${volunteer.registrationTime || '未提供'}</td>
            <td>${volunteer.status || '未提供'}</td>
            <td>${volunteer.signInTime || '未签到'}</td>
            <td>${volunteer.signOutTime || '未签退'}</td>
            <td>${volunteer.duration || '0'}小时</td>
        </tr>
    `).join('');
}

// 筛选活动志愿者
function filterActivityVolunteers(activityId) {
    // 获取筛选条件
    const statusFilter = document.getElementById('activityVolunteerStatusFilter')?.value;
    const nameFilter = document.getElementById('activityVolunteerNameFilter')?.value.toLowerCase();
    
    // 获取原始数据
    const allVolunteers = activityVolunteersData[activityId] || [];
    
    // 应用筛选
    let filteredVolunteers = allVolunteers;
    
    if (statusFilter) {
        filteredVolunteers = filteredVolunteers.filter(volunteer => volunteer.status === statusFilter);
    }
    
    if (nameFilter) {
        filteredVolunteers = filteredVolunteers.filter(volunteer => 
            volunteer.volunteerName.toLowerCase().includes(nameFilter) ||
            volunteer.contactInfo?.phone?.includes(nameFilter) ||
            volunteer.contactInfo?.email?.toLowerCase().includes(nameFilter)
        );
    }
    
    // 渲染筛选结果（第一页）
    renderFilteredActivityVolunteers(activityId, filteredVolunteers, 1);
}

// 渲染筛选后的活动志愿者
function renderFilteredActivityVolunteers(activityId, filteredVolunteers, page = 1, pageSize = 10) {
    // 更新表格内容
    const tableBody = document.getElementById('activityVolunteersTableBody');
    tableBody.innerHTML = renderActivityVolunteers(filteredVolunteers, page, pageSize);
    
    // 生成分页控件
    generatePagination('activityVolunteersPagination', filteredVolunteers.length, page, pageSize, (newPage) => {
        renderFilteredActivityVolunteers(activityId, filteredVolunteers, newPage, pageSize);
    });
}

// 导出活动志愿者
function exportActivityVolunteers(activityId) {
    // 实现导出功能
    window.location.href = `http://localhost:3001/api/activities/${activityId}/export`;
}

// 加载活动列表
async function loadActivities() {
    // 获取活动列表容器
    const activityList = document.getElementById('activityList');
    if (!activityList) {
        console.error('渲染活动列表失败: activityList元素不存在');
        return;
    }
    
    // 显示加载状态
    activityList.innerHTML = '<div class="loading">加载中...<div class="loading-spinner"></div></div>';
    
    try {
        // 调用后端API获取活动列表（使用正确的端口3001）
        const response = await fetch('http://localhost:3001/api/activities');
        
        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 检查数据格式，后端返回的是分页格式
        let activitiesToRender = [];
        let activities = [];
        
        // 检查后端返回格式
        if (data.data && Array.isArray(data.data)) {
            // 分页格式，数据在data字段中
            activities = data.data;
        } else if (data.activities && Array.isArray(data.activities)) {
            // 旧格式，数据在activities字段中
            activities = data.activities;
        } else if (Array.isArray(data)) {
            // 直接返回数组
            activities = data;
        } else {
            throw new Error('服务器返回的数据不是预期格式');
        }
        
        // 转换数据格式以适应前端渲染
        activitiesToRender = activities.map(activity => ({
            id: activity.id,
            title: activity.title,
            time: new Date(activity.startTime).toLocaleString('zh-CN'),
            location: activity.location,
            quota: activity.quota,
            registered: activity.registeredCount || 0,
            status: activity.status === 'recruiting' ? '招募中' : activity.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        // 渲染活动列表
        renderActivities(activitiesToRender);
    } catch (error) {
        console.error('加载活动列表失败:', error);
        
        // 显示错误信息和重试按钮
        activityList.innerHTML = `
            <div class="error-message">
                <p>加载活动列表失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadActivities()">重试</button>
            </div>
        `;
    }
}

// 渲染活动列表
function renderActivities(activities) {
    try {
        const activityList = document.getElementById('activityList');
        if (!activityList) {
            console.error('渲染活动列表失败: activityList元素不存在');
            return;
        }
        
        activityList.innerHTML = '';
        
        // 获取用户已报名的活动ID列表
        const registeredActivityIds = JSON.parse(localStorage.getItem('registeredActivityIds') || '[]');
        
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            // 检查用户是否已报名该活动
            const isRegistered = registeredActivityIds.includes(activity.id);
            
            activityItem.innerHTML = `
                <h3>${activity.title}</h3>
                <p><strong>时间:</strong> ${activity.time}</p>
                <p><strong>地点:</strong> ${activity.location}</p>
                <p><strong>招募人数:</strong> ${activity.registered || 0}/${activity.quota}</p>
                <p><strong>状态:</strong> ${activity.status}</p>
                <div class="activity-actions">
                    <button class="btn" onclick="viewActivityDetail(${activity.id})">查看详情</button>
                    ${isRegistered ? 
                        `<button class="btn btn-danger" onclick="cancelActivityRegistration(${activity.id})">取消报名</button>` : 
                        `<button class="btn btn-primary" onclick="registerActivity(${activity.id})">立即报名</button>`
                    }
                </div>
            `;
            activityList.appendChild(activityItem);
        });
    } catch (error) {
        console.error('渲染活动列表失败:', error);
    }
}

// 报名活动
async function registerActivity(activityId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('报名失败: 用户未登录');
        showToast('请先登录', 'warning');
        return;
    }
    
    // 获取当前用户信息
    const user = JSON.parse(localStorage.getItem('user'));
    console.log('当前登录用户:', user);
    
    try {
        // 调用后端API报名活动（使用正确的端口3001）
        console.log('=== 开始报名活动 ===');
        console.log('活动ID:', activityId);
        console.log('用户ID:', user.id);
        console.log('使用的token:', token);
        
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('报名活动响应状态:', response.status);
        console.log('报名活动响应状态文本:', response.statusText);
        
        // 获取响应头信息，用于调试
        const headers = Array.from(response.headers.entries());
        console.log('响应头:', headers);
        
        // 无论响应状态如何，都尝试解析响应数据
        let data = null;
        try {
            data = await response.json();
            console.log('报名活动响应数据:', data);
        } catch (jsonError) {
            console.error('解析响应数据失败:', jsonError);
            // 尝试获取原始响应文本
            const text = await response.text();
            console.error('响应原始文本:', text);
            data = { message: '服务器返回格式错误' };
        }
        
        console.log('=== 报名活动请求完成 ===');
        
        if (response.ok) {
            // 报名成功
            showToast(data.message || '报名成功', 'success');
            
            // 更新已报名活动ID列表
            const registeredActivityIds = JSON.parse(localStorage.getItem('registeredActivityIds') || '[]');
            console.log('更新前已报名活动ID列表:', registeredActivityIds);
            if (!registeredActivityIds.includes(activityId)) {
                registeredActivityIds.push(activityId);
                localStorage.setItem('registeredActivityIds', JSON.stringify(registeredActivityIds));
                console.log('更新后已报名活动ID列表:', registeredActivityIds);
            }
            
            // 刷新活动列表
            loadActivities();
            
            // 检查并刷新组织方活动列表（如果用户是组织方）
            const user = JSON.parse(localStorage.getItem('user'));
            if (user && (user.role === 'organizer' || user.role === 'admin')) {
                loadOrganizerActivities();
            }
            
            // 检查当前是否在活动详情页面，如果是则刷新活动详情
            const activityDetailModal = document.getElementById('activityDetailModal');
            if (activityDetailModal && activityDetailModal.style.display === 'block') {
                // 刷新活动详情，获取最新的已报名人数
                viewActivityDetail(activityId);
            }
        } else {
            // 报名失败
            console.error('报名失败，错误信息:', data.message || '未知错误');
            showToast(data.message || '报名失败', 'error');
        }
    } catch (error) {
        console.error('报名请求失败:', error);
        console.error('错误堆栈:', error.stack);
        showToast('报名请求失败，请稍后重试', 'error');
    }
}

// 取消报名活动
async function cancelActivityRegistration(activityId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }
    
    if (confirm('确定要取消报名该活动吗？')) {
        try {
            // 调用后端API取消报名活动
            console.log('开始取消报名活动，activityId:', activityId);
            console.log('使用的token:', token);
            const response = await fetch(`http://localhost:3001/api/activities/${activityId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('取消报名活动响应状态:', response.status);
            console.log('取消报名活动响应状态文本:', response.statusText);
            
            // 无论响应状态如何，都尝试解析响应数据
            let data = null;
            try {
                data = await response.json();
                console.log('取消报名活动响应数据:', data);
            } catch (jsonError) {
                console.error('解析响应数据失败:', jsonError);
                data = { message: '服务器返回格式错误' };
            }
            
            if (response.ok) {
                // 取消报名成功
                alert(data.message || '取消报名成功');
                
                // 更新已报名活动ID列表
                const registeredActivityIds = JSON.parse(localStorage.getItem('registeredActivityIds') || '[]');
                const updatedIds = registeredActivityIds.filter(id => id !== activityId);
                localStorage.setItem('registeredActivityIds', JSON.stringify(updatedIds));
                
                // 刷新活动列表
                loadActivities();
                
                // 检查并刷新组织方活动列表（如果用户是组织方）
                const user = JSON.parse(localStorage.getItem('user'));
                if (user && (user.role === 'organizer' || user.role === 'admin')) {
                    loadOrganizerActivities();
                }
                
                // 检查当前是否在活动详情页面，如果是则刷新活动详情
                const activityDetailModal = document.getElementById('activityDetailModal');
                if (activityDetailModal && activityDetailModal.style.display === 'block') {
                    // 刷新活动详情，获取最新的已报名人数
                    viewActivityDetail(activityId);
                }
            } else {
                // 取消报名失败
                alert(data.message || '取消报名失败');
            }
        } catch (error) {
            console.error('取消报名请求失败:', error);
            alert('取消报名请求失败，请稍后重试');
        }
    }
}

// 加载培训列表
async function loadTrainings() {
    // 获取培训列表容器
    const trainingList = document.getElementById('trainingList');
    if (!trainingList) {
        console.error('渲染培训列表失败: trainingList元素不存在');
        return;
    }
    
    // 显示加载状态
    trainingList.innerHTML = '<div class="loading">加载中...<div class="loading-spinner"></div></div>';
    
    try {
        // 调用后端API获取培训列表（使用正确的端口3001）
        const response = await fetch('http://localhost:3001/api/trainings');
        
        if (!response.ok) {
            throw new Error(`HTTP错误，状态码: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 检查数据格式，后端返回的是分页格式
        let trainingsToRender = [];
        let trainings = [];
        
        // 检查后端返回格式
        if (data.data && Array.isArray(data.data)) {
            // 分页格式，数据在data字段中
            trainings = data.data;
        } else if (data.trainings && Array.isArray(data.trainings)) {
            // 旧格式，数据在trainings字段中
            trainings = data.trainings;
        } else if (Array.isArray(data)) {
            // 直接返回数组
            trainings = data;
        } else {
            throw new Error('服务器返回的数据不是预期格式');
        }
        
        // 转换数据格式以适应前端渲染
        trainingsToRender = trainings.map(training => ({
            id: training.id,
            title: training.title,
            time: new Date(training.startTime).toLocaleString('zh-CN'),
            duration: `${Math.round((new Date(training.endTime) - new Date(training.startTime)) / (1000 * 60 * 60))}小时`,
            teacher: training.teacher,
            status: training.status === 'recruiting' ? '报名中' : training.status === 'ongoing' ? '进行中' : '已结束'
        }));
        
        renderTrainings(trainingsToRender);
    } catch (error) {
        console.error('加载培训列表失败:', error);
        
        // 显示错误信息和重试按钮
        trainingList.innerHTML = `
            <div class="error-message">
                <p>加载培训列表失败: ${error.message}</p>
                <button class="btn btn-primary" onclick="loadTrainings()">重试</button>
            </div>
        `;
    }
}

// 渲染培训列表
function renderTrainings(trainings) {
    const trainingList = document.getElementById('trainingList');
    trainingList.innerHTML = '';
    
    // 获取用户已报名的培训ID列表
    const registeredTrainingIds = JSON.parse(localStorage.getItem('registeredTrainingIds') || '[]');
    
    trainings.forEach(training => {
        const trainingItem = document.createElement('div');
        trainingItem.className = 'training-item';
        
        // 检查用户是否已报名该培训
        const isRegistered = registeredTrainingIds.includes(training.id);
        
        trainingItem.innerHTML = `
            <h3>${training.title}</h3>
            <p><strong>时间:</strong> ${training.time}</p>
            <p><strong>时长:</strong> ${training.duration}</p>
            <p><strong>讲师:</strong> ${training.teacher}</p>
            <p><strong>状态:</strong> ${training.status}</p>
            ${isRegistered ? 
                `<button class="btn btn-danger" onclick="cancelTrainingRegistration(${training.id})">取消报名</button>` : 
                `<button class="btn btn-primary" onclick="registerTraining(${training.id})">立即报名</button>`
            }
        `;
        trainingList.appendChild(trainingItem);
    });
}

// 报名培训
async function registerTraining(trainingId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }
    
    try {
        // 调用后端API报名培训（使用正确的端口3001）
        console.log('开始报名培训，trainingId:', trainingId);
        console.log('使用的token:', token);
        const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('报名培训响应状态:', response.status);
        console.log('报名培训响应状态文本:', response.statusText);
        
        // 无论响应状态如何，都尝试解析响应数据
        let data = null;
        try {
            data = await response.json();
            console.log('报名培训响应数据:', data);
        } catch (jsonError) {
            console.error('解析响应数据失败:', jsonError);
            data = { message: '服务器返回格式错误' };
        }
        
        if (response.ok) {
            // 报名成功
            alert(data.message || '报名成功');
            
            // 更新已报名培训ID列表
            const registeredTrainingIds = JSON.parse(localStorage.getItem('registeredTrainingIds') || '[]');
            if (!registeredTrainingIds.includes(trainingId)) {
                registeredTrainingIds.push(trainingId);
                localStorage.setItem('registeredTrainingIds', JSON.stringify(registeredTrainingIds));
            }
            
            // 刷新培训列表
            loadTrainings();
        } else {
            // 报名失败
            alert(data.message || '报名失败');
        }
    } catch (error) {
        console.error('报名请求失败:', error);
        alert('报名请求失败，请稍后重试');
    }
}

// 取消报名培训
async function cancelTrainingRegistration(trainingId) {
    // 检查用户是否已登录
    const token = localStorage.getItem('token');
    if (!token) {
        alert('请先登录');
        return;
    }
    
    if (confirm('确定要取消报名该培训吗？')) {
        try {
            // 调用后端API取消报名培训
            console.log('开始取消报名培训，trainingId:', trainingId);
            console.log('使用的token:', token);
            const response = await fetch(`http://localhost:3001/api/trainings/${trainingId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            console.log('取消报名培训响应状态:', response.status);
            console.log('取消报名培训响应状态文本:', response.statusText);
            
            // 无论响应状态如何，都尝试解析响应数据
            let data = null;
            try {
                data = await response.json();
                console.log('取消报名培训响应数据:', data);
            } catch (jsonError) {
                console.error('解析响应数据失败:', jsonError);
                data = { message: '服务器返回格式错误' };
            }
            
            if (response.ok) {
                // 取消报名成功
                alert(data.message || '取消报名成功');
                
                // 更新已报名培训ID列表
                const registeredTrainingIds = JSON.parse(localStorage.getItem('registeredTrainingIds') || '[]');
                const updatedIds = registeredTrainingIds.filter(id => id !== trainingId);
                localStorage.setItem('registeredTrainingIds', JSON.stringify(updatedIds));
                
                // 刷新培训列表
                loadTrainings();
            } else {
                // 取消报名失败
                alert(data.message || '取消报名失败');
            }
        } catch (error) {
            console.error('取消报名请求失败:', error);
            alert('取消报名请求失败，请稍后重试');
        }
    }
}

// 加载用户信息
async function loadUserProfile() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }
        
        // 直接调用getUserProfile函数，统一从服务器获取最新数据
        await getUserProfile();
    } catch (error) {
        console.error('加载用户信息失败:', error);
    }
}

// 从服务器获取最新用户信息
async function getUserProfile() {
    try {
        // 显示加载状态
        const profileContent = document.getElementById('profileContent');
        if (profileContent) {
            profileContent.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading">加载中...</div></div>';
        }
        
        const token = localStorage.getItem('token');
        if (!token) {
            // 如果没有token，显示未登录状态
            const profileContent = document.getElementById('profileContent');
            if (profileContent) {
                profileContent.innerHTML = '<div style="text-align: center; padding: 20px;">请先登录</div>';
            }
            return;
        }
        
        // 发送GET请求获取最新用户信息
        const response = await fetch('http://localhost:3001/api/user/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        let user = null;
        let success = false;
        let errorMessage = '未知错误';
        
        if (response.ok) {
            // 处理成功响应
            if (result.status === 'success') {
                // 统一格式响应: { status: 'success', data: {...} }
                user = result.data;
                success = true;
            } else if (result.id) {
                // 旧格式响应: 直接返回用户对象
                user = result;
                success = true;
            } else {
                // 其他成功响应但格式不符合预期
                errorMessage = '服务器返回格式错误';
                success = false;
            }
        } else {
            // 处理错误响应
            if (result.status === 'error') {
                // 统一格式错误响应
                errorMessage = result.message || '获取个人信息失败';
            } else if (result.message) {
                // 旧格式错误响应
                errorMessage = result.message;
            } else {
                // 其他错误响应
                errorMessage = `HTTP错误: ${response.status} ${response.statusText}`;
            }
            success = false;
        }
        
        if (success && user) {
            // 获取成功，更新本地存储和页面显示
            localStorage.setItem('user', JSON.stringify(user));
            renderUserProfile(user);
            return user;
        } else {
            // 获取失败，显示错误信息
            const profileContent = document.getElementById('profileContent');
            if (profileContent) {
                profileContent.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">获取个人信息失败: ${errorMessage}</div>`;
            }
            throw new Error(errorMessage);
        }
    } catch (error) {
        console.error('获取个人信息失败:', error);
        const profileContent = document.getElementById('profileContent');
        if (profileContent) {
            let errorMessage = '网络错误或服务器异常';
            if (error.message) {
                errorMessage = error.message;
            } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                errorMessage = '网络连接失败，请检查网络设置';
            }
            profileContent.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">获取个人信息失败: ${errorMessage}</div>`;
        }
        throw error;
    }
}

// 渲染用户信息
function renderUserProfile(user) {
    // 为可能缺少的属性设置默认值
    const safeUser = {
        name: user.name || '未知',
        phone: user.phone || '未知',
        email: user.email || '未知',
        gender: user.gender || 'other',
        age: user.age || null,
        volunteerHours: user.volunteerHours || 0,
        certificateCount: user.certificateCount || 0,
        medalCount: user.medalCount || 0
    };
    
    const profileContent = document.getElementById('profileContent');
    if (profileContent) {
        profileContent.innerHTML = `
            <div class="profile-info">
                <div class="profile-section">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>基本信息</h3>
                        <button id="editProfileBtn" class="btn btn-primary">编辑个人信息</button>
                    </div>
                    <p><strong>姓名:</strong> ${safeUser.name}</p>
                    <p><strong>性别:</strong> ${safeUser.gender === 'male' ? '男' : safeUser.gender === 'female' ? '女' : '其他'}</p>
                    <p><strong>年龄:</strong> ${safeUser.age || '未设置'}</p>
                    <p><strong>手机号:</strong> ${safeUser.phone}</p>
                    <p><strong>邮箱:</strong> ${safeUser.email}</p>
                </div>
                <div class="profile-section">
                    <h3>志愿统计</h3>
                    <p><strong>志愿时长:</strong> ${safeUser.volunteerHours}小时</p>
                    <p><strong>获得证书:</strong> ${safeUser.certificateCount}个</p>
                    <p><strong>获得勋章:</strong> ${safeUser.medalCount}枚</p>
                </div>
                <div class="profile-section">
                    <h3>扫码签到/签退</h3>
                    <button id="scanSignBtn" class="btn btn-primary">扫码签到/签退</button>
                </div>
                <div class="profile-section">
                    <h3>活动记录</h3>
                    <button id="viewActivityRecordsBtn" class="btn btn-primary">查看活动记录</button>
                </div>
            </div>
        `;
        
        // 绑定编辑按钮点击事件
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => showEditProfileModal(user));
        }
        
        // 绑定扫码签到按钮点击事件
        const scanSignBtn = document.getElementById('scanSignBtn');
        if (scanSignBtn) {
            scanSignBtn.addEventListener('click', openScanModal);
        }
        
        // 绑定查看活动记录按钮点击事件
        const viewActivityRecordsBtn = document.getElementById('viewActivityRecordsBtn');
        if (viewActivityRecordsBtn) {
            viewActivityRecordsBtn.addEventListener('click', openActivityRecordsModal);
        }
    }
}

// 加载用户活动记录
// 打开活动记录弹窗
async function openActivityRecordsModal() {
    const modal = document.getElementById('activityRecordsModal');
    const modalContent = modal.querySelector('.modal-content');
    const contentDiv = document.getElementById('activityRecordsContent');
    
    // 显示加载状态
    contentDiv.innerHTML = '<div class="loading-indicator"><div class="loading"></div>加载活动记录中...</div>';
    
    // 显示弹窗
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // 禁止背景滚动
    
    // 加载活动记录数据
    try {
        const activities = await loadUserActivityRecords();
        renderUserActivityRecords(activities);
    } catch (error) {
        console.error('加载活动记录失败:', error);
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 30px; color: red;">
                <h4>加载活动记录失败</h4>
                <p>错误信息: ${error.message}</p>
                <div style="margin-top: 20px;">
                    <button id="retryActivityModalBtn" class="btn btn-primary">重试</button>
                </div>
                <div style="margin-top: 15px; font-size: 0.9em;">
                    <p>建议解决方案:</p>
                    <ul style="list-style-type: none; padding: 0;">
                        <li>• 检查网络连接是否正常</li>
                        <li>• 确认您已成功登录</li>
                        <li>• 刷新页面后重试</li>
                        <li>• 如果问题持续，请联系管理员</li>
                    </ul>
                </div>
            </div>
        `;
        
        // 绑定重试按钮点击事件
        const retryBtn = document.getElementById('retryActivityModalBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', async () => {
                await openActivityRecordsModal();
            });
        }
    }
    
    // 绑定关闭按钮事件
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = closeActivityRecordsModal;
    }
    
    // 点击外部区域关闭弹窗
    window.onclick = function(event) {
        if (event.target === modal) {
            closeActivityRecordsModal();
        }
    };
    
    // 键盘Esc键关闭弹窗
    document.onkeydown = function(event) {
        if (event.key === 'Escape' && modal.style.display === 'block') {
            closeActivityRecordsModal();
        }
    };
}

// 关闭活动记录弹窗
function closeActivityRecordsModal() {
    const modal = document.getElementById('activityRecordsModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢复背景滚动
    
    // 移除事件监听器
    document.onkeydown = null;
    window.onclick = null;
}

// 加载用户活动记录
async function loadUserActivityRecords(page = 1, pageSize = 10) {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('请先登录');
    }
    
    // 调用API获取用户活动记录
    const activities = await api.user.getActivities(page, pageSize);
    return activities;
}

// 渲染用户活动记录到弹窗
function renderUserActivityRecords(activities) {
    const contentDiv = document.getElementById('activityRecordsContent');
    if (contentDiv) {
        contentDiv.innerHTML = `
            ${activities.data && activities.data.length > 0 ? `
                <div class="activity-records-list">
                    ${activities.data.map(activity => `
                        <div class="activity-record-item">
                            <h5>${activity.title}</h5>
                            <div class="activity-info">
                                <p><strong>时间:</strong> ${new Date(activity.startTime).toLocaleString()} - ${new Date(activity.endTime).toLocaleString()}</p>
                                <p><strong>地点/方式:</strong> ${activity.location || (activity.online ? '线上' : '线下')}</p>
                                <p><strong>组织方:</strong> ${activity.organization?.name || activity.organizer?.name || '未知'}</p>
                                <p><strong>状态:</strong> 
                                    <span class="activity-status ${activity.status.toLowerCase()}">
                                        ${getActivityStatusText(activity.status)}
                                    </span>
                                </p>
                            </div>
                            ${activity.description ? `
                                <div class="activity-description">
                                    <strong>活动描述:</strong> ${activity.description}
                                </div>
                            ` : ''}
                            ${activity.participants && activity.participants.length > 0 ? `
                                <div class="activity-participants">
                                    <strong>参与人员:</strong>
                                    <div class="participants-list">
                                        ${activity.participants.map(participant => `
                                            <span class="participant-tag">${participant.name} (${participant.role})</span>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                            ${activity.attachments && activity.attachments.length > 0 ? `
                                <div class="activity-attachments">
                                    <strong>相关附件:</strong>
                                    <div class="attachments-list">
                                        ${activity.attachments.map(attachment => `
                                            <a href="${attachment.url}" target="_blank" class="attachment-link">${attachment.name}</a>
                                        `).join('')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
                
                <!-- 分页控制 -->
                ${activities.pagination ? `
                    <div class="activity-records-pagination">
                        <button 
                            class="btn btn-secondary page-btn ${activities.pagination.page === 1 ? 'disabled' : ''}"
                            ${activities.pagination.page === 1 ? 'disabled' : ''}
                            onclick="loadActivityRecordsPage(${activities.pagination.page - 1})"
                        >
                            上一页
                        </button>
                        <span class="page-info">
                            第 ${activities.pagination.page} / ${activities.pagination.totalPages} 页，共 ${activities.pagination.total} 条记录
                        </span>
                        <button 
                            class="btn btn-secondary page-btn ${activities.pagination.page === activities.pagination.totalPages ? 'disabled' : ''}"
                            ${activities.pagination.page === activities.pagination.totalPages ? 'disabled' : ''}
                            onclick="loadActivityRecordsPage(${activities.pagination.page + 1})"
                        >
                            下一页
                        </button>
                    </div>
                ` : ''}
            ` : `
                <div style="text-align: center; padding: 30px; color: #666;">
                    <h4>暂无活动记录</h4>
                    <p>您还没有参与任何活动</p>
                </div>
            `}
        `;
    }
}

// 加载指定页码的活动记录
async function loadActivityRecordsPage(page) {
    const contentDiv = document.getElementById('activityRecordsContent');
    contentDiv.innerHTML = '<div class="loading-indicator"><div class="loading"></div>加载中...</div>';
    
    try {
        const activities = await loadUserActivityRecords(page);
        renderUserActivityRecords(activities);
    } catch (error) {
        console.error('加载活动记录失败:', error);
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 30px; color: red;">
                <h4>加载活动记录失败</h4>
                <p>错误信息: ${error.message}</p>
                <div style="margin-top: 20px;">
                    <button onclick="loadActivityRecordsPage(${page})" class="btn btn-primary">重试</button>
                </div>
            </div>
        `;
    }
}

// 获取活动状态文本
function getActivityStatusText(status) {
    const statusMap = {
        'draft': '草稿',
        'recruiting': '招募中',
        'ongoing': '进行中',
        'completed': '已结束',
        'cancelled': '已取消'
    };
    return statusMap[status] || status;
}

// 扫码功能相关变量
let scanModal = null;
let scanPreview = null;
let scanStatus = null;
let startScanBtn = null;
let stopScanBtn = null;
let stream = null;
let video = null;
let canvasElement = null;
let canvasContext = null;
let scanning = false;
let lastScanTime = 0;
let lastQRContent = '';
const SCAN_INTERVAL = 500; // 识别频率，每500ms识别一次

// 打开扫码模态框
function openScanModal() {
    scanModal = document.getElementById('scanModal');
    scanPreview = document.getElementById('scanPreview');
    scanStatus = document.getElementById('scanStatus');
    startScanBtn = document.getElementById('startScanBtn');
    stopScanBtn = document.getElementById('stopScanBtn');
    
    // 显示模态框
    scanModal.style.display = 'block';
    
    // 初始化扫码区域
    initializeScanArea();
    
    // 绑定按钮事件
    startScanBtn.addEventListener('click', startScan);
    stopScanBtn.addEventListener('click', stopScan);
    
    // 绑定关闭按钮事件
    const closeBtn = scanModal.querySelector('.close');
    closeBtn.addEventListener('click', closeScanModal);
    
    // 点击模态框外部关闭模态框
    window.addEventListener('click', function(event) {
        if (event.target === scanModal) {
            closeScanModal();
        }
    });
}

// 初始化扫码区域
function initializeScanArea() {
    // 清空扫码区域
    scanPreview.innerHTML = '';
    
    // 创建视频元素
    video = document.createElement('video');
    video.setAttribute('autoplay', '');
    video.setAttribute('playsinline', '');
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';
    
    // 创建画布元素用于二维码检测
    canvasElement = document.createElement('canvas');
    // 设置画布样式，使其与视频叠加
    canvasElement.style.position = 'absolute';
    canvasElement.style.top = '0';
    canvasElement.style.left = '0';
    canvasElement.style.width = '100%';
    canvasElement.style.height = '100%';
    canvasElement.style.pointerEvents = 'none'; // 允许点击穿透
    canvasElement.style.zIndex = '10'; // 确保画布在视频上方
    
    canvasContext = canvasElement.getContext('2d', { willReadFrequently: true });
    
    // 添加视频和画布到扫描区域
    scanPreview.appendChild(video);
    scanPreview.appendChild(canvasElement);
    
    // 重置状态变量
    scanning = false;
    lastScanTime = 0;
    lastQRContent = '';
}

// 开始扫描
async function startScan() {
    try {
        // 重置UI状态
        scanStatus.textContent = '正在准备扫码...';
        startScanBtn.style.display = 'none';
        stopScanBtn.style.display = 'inline-block';
        
        // 检查jsQR库是否加载完成
        if (typeof jsQR === 'undefined') {
            // 显示加载状态，提供重试选项
            scanStatus.innerHTML = '二维码识别库正在加载... <button id="retryLoadBtn" class="btn btn-sm">重试</button>';
            
            // 添加重试按钮事件
            const retryBtn = document.getElementById('retryLoadBtn');
            if (retryBtn) {
                retryBtn.onclick = function() {
                    // 重新加载jsQR库
                    location.reload();
                };
            }
            
            // 设置5秒后自动重试
            setTimeout(() => {
                if (typeof jsQR === 'undefined') {
                    scanStatus.innerHTML = '二维码识别库加载失败，<br>请检查网络连接或 <button id="retryBtn" class="btn btn-sm">刷新页面</button> <br>或 <button id="manualInputBtn" class="btn btn-sm">手动输入</button>';
                    
                    // 添加刷新按钮事件
                    const refreshBtn = document.getElementById('retryBtn');
                    if (refreshBtn) {
                        refreshBtn.onclick = function() {
                            location.reload();
                        };
                    }
                    
                    // 添加手动输入按钮事件
                    const manualBtn = document.getElementById('manualInputBtn');
                    if (manualBtn) {
                        manualBtn.onclick = function() {
                            showManualQRInput();
                        };
                    }
                    
                    // 恢复UI状态
                    startScanBtn.style.display = 'inline-block';
                    stopScanBtn.style.display = 'none';
                }
            }, 5000);
            
            return;
        }
        
        // 重置状态变量
        lastScanTime = 0;
        lastQRContent = '';
        
        // 获取摄像头权限，添加更多的视频约束
        const constraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30 }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('摄像头权限获取成功，视频流创建成功');
        
        // 设置视频流
        video.srcObject = stream;
        
        // 监听视频加载元数据事件
        video.onloadedmetadata = () => {
            console.log('视频元数据加载完成，视频尺寸:', video.videoWidth, 'x', video.videoHeight);
        };
        
        // 监听视频可播放事件
        video.oncanplay = () => {
            console.log('视频可播放，开始播放视频');
        };
        
        // 监听视频播放事件
        video.onplay = () => {
            console.log('视频播放开始');
        };
        
        // 监听视频暂停事件
        video.onpause = () => {
            console.log('视频播放暂停');
        };
        
        // 监听视频错误事件
        video.onerror = (e) => {
            console.error('视频播放错误:', e);
            scanStatus.textContent = '视频播放出错，请重试';
        };
        
        await video.play();
        console.log('视频播放成功');
        
        // 更新UI
        scanStatus.textContent = '正在扫描...';
        startScanBtn.style.display = 'none';
        stopScanBtn.style.display = 'inline-block';
        
        // 开始检测二维码
        scanning = true;
        // 立即启动tick函数，确保扫描开始
        requestAnimationFrame(tick);
        console.log('二维码扫描已启动');
    } catch (error) {
        console.error('获取摄像头权限失败:', error);
        let errorMessage = '获取摄像头权限失败';
        
        if (error.name === 'NotAllowedError') {
            errorMessage = '请允许摄像头权限，然后重试';
        } else if (error.name === 'NotFoundError') {
            errorMessage = '未找到可用摄像头';
        } else if (error.name === 'NotReadableError') {
            errorMessage = '摄像头被其他应用占用';
        } else if (error.name === 'OverconstrainedError') {
            errorMessage = '摄像头不支持所需的分辨率';
        } else if (error.name === 'AbortError') {
            errorMessage = '摄像头请求被中止';
        } else if (error.name === 'NotSupportedError') {
            errorMessage = '浏览器不支持摄像头功能';
        }
        
        scanStatus.textContent = errorMessage;
        scanning = false;
        startScanBtn.style.display = 'inline-block';
        stopScanBtn.style.display = 'none';
    }
}

// 显示手动输入二维码界面
function showManualQRInput() {
    scanStatus.innerHTML = `
        <div class="manual-input-container">
            <h4>手动输入二维码内容</h4>
            <input type="text" id="manualQRInput" placeholder="请输入二维码内容" style="width: 100%; padding: 8px; margin: 10px 0;">
            <div style="display: flex; gap: 10px;">
                <button id="submitManualQR" class="btn btn-primary">提交</button>
                <button id="cancelManualQR" class="btn btn-secondary">取消</button>
            </div>
        </div>
    `;
    
    // 添加提交按钮事件
    const submitBtn = document.getElementById('submitManualQR');
    if (submitBtn) {
        submitBtn.onclick = function() {
            const qrContent = document.getElementById('manualQRInput').value.trim();
            if (qrContent) {
                handleScanResult(qrContent);
            } else {
                alert('请输入二维码内容');
            }
        };
    }
    
    // 添加取消按钮事件
    const cancelBtn = document.getElementById('cancelManualQR');
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            scanStatus.textContent = '请将二维码对准扫描框';
            startScanBtn.style.display = 'inline-block';
            stopScanBtn.style.display = 'none';
        };
    }
}

// 停止扫描
function stopScan() {
    scanning = false;
    
    // 停止视频流
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    // 更新UI
    scanStatus.textContent = '请将二维码对准扫描框';
    startScanBtn.style.display = 'inline-block';
    stopScanBtn.style.display = 'none';
    
    // 清空视频
    if (video) {
        video.srcObject = null;
    }
}

// 关闭扫码模态框
function closeScanModal() {
    // 停止扫描
    stopScan();
    
    // 隐藏模态框
    if (scanModal) {
        scanModal.style.display = 'none';
    }
}

// 加载组织设置信息
async function loadOrganizerSettings() {
    try {
        const content = document.getElementById('organizerSettingsContent');
        content.innerHTML = '<div style="text-align: center; padding: 20px;"><div class="loading">加载中...</div></div>';
        
        // 调用API获取组织信息
        const organization = await api.organizer.getCurrentOrganization();
        
        renderOrganizerSettings(organization);
    } catch (error) {
        console.error('加载组织设置失败:', error);
        const content = document.getElementById('organizerSettingsContent');
        content.innerHTML = `<div style="text-align: center; padding: 20px; color: red;">加载组织设置失败: ${error.message}</div>`;
    }
}

// 渲染组织设置页面
function renderOrganizerSettings(organization) {
    const content = document.getElementById('organizerSettingsContent');
    if (content) {
        content.innerHTML = `
            <div class="organization-info">
                <div class="profile-section">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h3>组织基本信息</h3>
                        <button id="editOrganizationBtn" class="btn btn-primary">编辑组织信息</button>
                    </div>
                    <p><strong>组织名称:</strong> ${organization.name || '未知'}</p>
                    <p><strong>隶属部门:</strong> ${organization.department || '未知'}</p>
                    <p><strong>联系方式:</strong> ${organization.contact || '未知'}</p>
                    <p><strong>线下地点:</strong> ${organization.address || '未知'}</p>
                    <p><strong>组织描述:</strong> ${organization.description || '暂无描述'}</p>
                    <p><strong>状态:</strong> ${organization.status === 'approved' ? '已通过' : organization.status === 'pending' ? '待审核' : organization.status === 'rejected' ? '已拒绝' : organization.status}</p>
                </div>
                
                <div class="profile-section">
                    <h3>组织Logo</h3>
                    ${organization.logo ? `
                        <div class="logo-preview">
                            <img src="${organization.logo}" alt="组织Logo" style="max-width: 200px; max-height: 200px;">
                        </div>
                    ` : '<p>暂无Logo</p>'}
                </div>
            </div>
        `;
        
        // 绑定编辑组织信息按钮事件
        const editBtn = document.getElementById('editOrganizationBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => showEditOrganizationForm(organization));
        }
    }
}

// 显示编辑组织信息表单
function showEditOrganizationForm(organization) {
    // 创建编辑表单模态框
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>编辑组织信息</h2>
            <form id="editOrganizationForm">
                <div class="form-group">
                    <label for="editOrgName">组织名称</label>
                    <input type="text" id="editOrgName" name="name" value="${organization.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editOrgDepartment">隶属部门</label>
                    <input type="text" id="editOrgDepartment" name="department" value="${organization.department || ''}">
                </div>
                <div class="form-group">
                    <label for="editOrgContact">联系方式</label>
                    <input type="text" id="editOrgContact" name="contact" value="${organization.contact || ''}">
                </div>
                <div class="form-group">
                    <label for="editOrgAddress">线下地点</label>
                    <input type="text" id="editOrgAddress" name="address" value="${organization.address || ''}">
                </div>
                <div class="form-group">
                    <label for="editOrgDescription">组织描述</label>
                    <textarea id="editOrgDescription" name="description" rows="4">${organization.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="editOrgLogo">组织Logo</label>
                    <input type="file" id="editOrgLogo" name="logo" accept="image/*">
                    ${organization.logo ? `<p>当前Logo: <a href="${organization.logo}" target="_blank">查看</a></p>` : ''}
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">保存</button>
                    <button type="button" class="btn btn-secondary" id="cancelEditOrg">取消</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // 绑定关闭按钮事件
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => modal.remove());
    
    // 绑定取消按钮事件
    const cancelBtn = modal.querySelector('#cancelEditOrg');
    cancelBtn.addEventListener('click', () => modal.remove());
    
    // 绑定表单提交事件
    const form = modal.querySelector('#editOrganizationForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleEditOrganization(form, modal, organization);
    });
}

// 处理组织信息编辑
async function handleEditOrganization(form, modal, originalOrg) {
    try {
        const formData = new FormData(form);
        const organizationData = {
            name: formData.get('name'),
            department: formData.get('department'),
            contact: formData.get('contact'),
            address: formData.get('address'),
            description: formData.get('description'),
            // Logo上传处理需要额外的逻辑，这里暂时忽略
        };
        
        // 调用API更新组织信息
        const result = await api.organizer.updateOrganization(organizationData);
        
        // API请求成功（request函数已经处理了非200状态码的情况）
        alert('组织信息更新成功');
        modal.remove();
        
        // 重新加载组织设置信息
        await loadOrganizerSettings();
    } catch (error) {
        console.error('更新组织信息失败:', error);
        alert(`更新组织信息失败: ${error.message}`);
    }
}

// 查看活动报名申请
async function viewActivityApplications(activityId, activityTitle) {
    try {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>${activityTitle} - 报名申请</h2>
                <div id="applicationListContent">
                    <div style="text-align: center; padding: 20px;"><div class="loading">加载中...</div></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // 绑定关闭按钮事件
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => modal.remove());
        
        // 获取报名申请数据（使用正确的participants端点）
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        let applications = [];
        
        if (response.ok) {
            if (data.data && Array.isArray(data.data)) {
                applications = data.data;
            } else if (Array.isArray(data)) {
                applications = data;
            }
        }
        
        // 渲染报名申请列表
        renderApplicationList(modal, applications, activityId);
    } catch (error) {
        console.error('加载报名申请失败:', error);
        alert(`加载报名申请失败: ${error.message}`);
    }
}

// 渲染报名申请列表
function renderApplicationList(modal, applications, activityId) {
    const content = modal.querySelector('#applicationListContent');
    
    if (applications.length === 0) {
        content.innerHTML = '<p>暂无报名申请</p>';
        return;
    }
    
    content.innerHTML = `
        <div class="applications-container">
            <div class="filters" style="margin-bottom: 15px;">
                <select id="statusFilter" class="status-filter">
                    <option value="">全部状态</option>
                    <option value="pending">待审核</option>
                    <option value="approved">已通过</option>
                    <option value="rejected">已拒绝</option>
                </select>
                <select id="genderFilter" class="gender-filter">
                    <option value="">全部性别</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                </select>
                <input type="number" id="ageFilter" placeholder="年龄" min="1" max="150" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                <button id="applyFiltersBtn" class="btn btn-secondary">应用筛选</button>
                <button id="batchApproveBtn" class="btn btn-primary">批量通过</button>
                <button id="batchRejectBtn" class="btn btn-danger">批量拒绝</button>
                <button id="exportListBtn" class="btn btn-success">导出名单</button>
            </div>
            
            <div class="applications-list">
                ${applications.map(app => `
                    <div class="application-item" data-application-id="${app.volunteerId}" data-gender="${app.gender || ''}" data-age="${app.age || ''}">
                        <div class="application-header">
                            <h4>${app.volunteerName || '未知用户'}</h4>
                            <span class="application-status ${app.status}">${getStatusText(app.status)}</span>
                        </div>
                        <div class="application-info">
                            <p><strong>手机号:</strong> ${app.contactInfo?.phone || '未知'}</p>
                            <p><strong>邮箱:</strong> ${app.contactInfo?.email || '未知'}</p>
                            <p><strong>性别:</strong> ${app.gender === 'male' ? '男' : app.gender === 'female' ? '女' : app.gender || '未知'}</p>
                            <p><strong>年龄:</strong> ${app.age || '未知'}</p>
                            <p><strong>报名时间:</strong> ${new Date(app.registrationTime).toLocaleString()}</p>
                            ${app.note ? `<p><strong>备注:</strong> ${app.note}</p>` : ''}
                            ${app.approvalComment ? `<p><strong>审核备注:</strong> ${app.approvalComment}</p>` : ''}
                            ${app.approvedAt ? `<p><strong>审核时间:</strong> ${new Date(app.approvedAt).toLocaleString()}</p>` : ''}
                            ${app.approvedBy ? `<p><strong>审核人:</strong> ${app.approvedBy.name || '未知'}</p>` : ''}
                        </div>
                        <div class="application-actions">
                            ${app.status === 'pending' ? `
                                <button class="btn btn-primary approve-btn" onclick="approveApplication(${activityId}, ${app.volunteerId})">通过</button>
                                <button class="btn btn-danger reject-btn" onclick="rejectApplication(${activityId}, ${app.volunteerId})">拒绝</button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // 绑定事件
    const statusFilter = content.querySelector('#statusFilter');
    const genderFilter = content.querySelector('#genderFilter');
    const ageFilter = content.querySelector('#ageFilter');
    const applyFiltersBtn = content.querySelector('#applyFiltersBtn');
    const batchApproveBtn = content.querySelector('#batchApproveBtn');
    const batchRejectBtn = content.querySelector('#batchRejectBtn');
    const exportListBtn = content.querySelector('#exportListBtn');
    
    // 应用筛选
    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            const status = statusFilter.value;
            const gender = genderFilter.value;
            const age = parseInt(ageFilter.value) || '';
            
            const items = modal.querySelectorAll('.application-item');
            items.forEach(item => {
                const appStatus = item.querySelector('.application-status').textContent.trim();
                const itemGender = item.dataset.gender;
                const itemAge = parseInt(item.dataset.age) || '';
                
                // 检查状态匹配
                const statusMatch = status === '' || getStatusValue(appStatus) === status;
                // 检查性别匹配
                const genderMatch = gender === '' || itemGender === gender;
                // 检查年龄匹配
                const ageMatch = age === '' || itemAge === age;
                
                if (statusMatch && genderMatch && ageMatch) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
    
    // 批量通过
    if (batchApproveBtn) {
        batchApproveBtn.addEventListener('click', async () => {
            const pendingItems = modal.querySelectorAll('.application-item .application-status.pending');
            const applicationIds = Array.from(pendingItems).map(item => {
                return parseInt(item.closest('.application-item').dataset.applicationId);
            });
            
            if (applicationIds.length === 0) {
                alert('没有待审核的报名申请');
                return;
            }
            
            if (confirm(`确定要批量通过 ${applicationIds.length} 个报名申请吗？`)) {
                await batchProcessApplications(activityId, applicationIds, 'approve');
                
                // 重新加载报名申请列表
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                let updatedApplications = [];
                
                if (response.ok) {
                    if (data.data && Array.isArray(data.data)) {
                        updatedApplications = data.data;
                    } else if (Array.isArray(data)) {
                        updatedApplications = data;
                    }
                }
                
                renderApplicationList(modal, updatedApplications, activityId);
            }
        });
    }
    
    // 批量拒绝
    if (batchRejectBtn) {
        batchRejectBtn.addEventListener('click', async () => {
            const pendingItems = modal.querySelectorAll('.application-item .application-status.pending');
            const applicationIds = Array.from(pendingItems).map(item => {
                return parseInt(item.closest('.application-item').dataset.applicationId);
            });
            
            if (applicationIds.length === 0) {
                alert('没有待审核的报名申请');
                return;
            }
            
            if (confirm(`确定要批量拒绝 ${applicationIds.length} 个报名申请吗？`)) {
                await batchProcessApplications(activityId, applicationIds, 'reject');
                
                // 重新加载报名申请列表
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                const data = await response.json();
                let updatedApplications = [];
                
                if (response.ok) {
                    if (data.data && Array.isArray(data.data)) {
                        updatedApplications = data.data;
                    } else if (Array.isArray(data)) {
                        updatedApplications = data;
                    }
                }
                
                renderApplicationList(modal, updatedApplications, activityId);
            }
        });
    }
    
    // 导出名单
    if (exportListBtn) {
        exportListBtn.addEventListener('click', async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants/export`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (response.ok) {
                    // 创建下载链接
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `activity-participants-${activityId}-${new Date().toISOString().slice(0, 10)}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    alert('名单导出成功');
                } else {
                    const data = await response.json();
                    alert(`导出失败: ${data.message || '未知错误'}`);
                }
            } catch (error) {
                console.error('导出名单失败:', error);
                alert(`导出失败: ${error.message}`);
            }
        });
    }
}

// 获取状态文本
function getStatusText(status) {
    const statusMap = {
        'pending': '待审核',
        'approved': '已通过',
        'rejected': '已拒绝'
    };
    return statusMap[status] || status;
}

// 根据状态文本获取状态值
function getStatusValue(statusText) {
    const statusMap = {
        '待审核': 'pending',
        '已通过': 'approved',
        '已拒绝': 'rejected'
    };
    return statusMap[statusText] || statusText;
}

// 显示toast提示
function showToast(message, type = 'success') {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // 添加样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        border-radius: 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transform: translateX(400px);
        transition: transform 0.3s ease;
        opacity: 0;
    `;
    
    // 根据类型设置背景色
    if (type === 'success') {
        toast.style.backgroundColor = '#52c41a';
    } else if (type === 'error') {
        toast.style.backgroundColor = '#ff4d4f';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#faad14';
    } else if (type === 'info') {
        toast.style.backgroundColor = '#1890ff';
    }
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    }, 100);
    
    // 3秒后隐藏并移除
    setTimeout(() => {
        toast.style.transform = 'translateX(400px)';
        toast.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// 批准报名申请
async function approveApplication(activityId, applicationId) {
    try {
        const token = localStorage.getItem('token');
        // 添加审核备注输入
        const comment = prompt('请输入审核备注（可选）:');
        // 使用正确的API端点格式: PUT /:id/approve/:userId
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/approve/${applicationId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment }) // 传递审核备注
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('报名申请已通过', 'success');
            // 重新加载活动列表，更新报名人数
            loadOrganizerActivities();
            
            // 重新加载当前模态框的报名申请列表
            const modal = document.querySelector('.modal.show .application-item[data-application-id="' + applicationId + '"]')?.closest('.modal');
            if (modal) {
                const title = modal.querySelector('h2').textContent;
                const activityTitle = title.split(' - ')[0];
                await viewActivityApplications(activityId, activityTitle);
                modal.remove();
            }
        } else {
            showToast(`操作失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('批准报名申请失败:', error);
        showToast(`操作失败: ${error.message}`, 'error');
    }
}

// 拒绝报名申请
async function rejectApplication(activityId, applicationId) {
    try {
        const token = localStorage.getItem('token');
        const comment = prompt('请输入拒绝原因:');
        if (comment === null) return; // 用户取消操作
        // 使用正确的API端点格式: PUT /:id/participants/:userId/reject
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants/${applicationId}/reject`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment }) // 使用comment字段统一处理审核备注
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('报名申请已拒绝', 'success');
            // 重新加载活动列表
            loadOrganizerActivities();
            
            // 重新加载当前模态框的报名申请列表
            const modal = document.querySelector('.modal.show .application-item[data-application-id="' + applicationId + '"]')?.closest('.modal');
            if (modal) {
                const title = modal.querySelector('h2').textContent;
                const activityTitle = title.split(' - ')[0];
                await viewActivityApplications(activityId, activityTitle);
                modal.remove();
            }
        } else {
            showToast(`操作失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error('拒绝报名申请失败:', error);
        showToast(`操作失败: ${error.message}`, 'error');
    }
}

// 批量处理报名申请
async function batchProcessApplications(activityId, applicationIds, action) {
    try {
        const token = localStorage.getItem('token');
        const endpoint = action === 'approve' ? 'approve' : 'reject';
        
        // 添加批量审核备注输入
        const comment = prompt(`请输入${action === 'approve' ? '批量通过' : '批量拒绝'}的审核备注（可选）:`);
        if (comment === null) return; // 用户取消操作
        
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/participants/batch-${endpoint}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userIds: applicationIds, comment }) // 传递用户ID列表和审核备注
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast(`${action === 'approve' ? '批量通过' : '批量拒绝'}操作成功`, 'success');
            // 重新加载活动列表
            loadOrganizerActivities();
        } else {
            showToast(`${action === 'approve' ? '批量通过' : '批量拒绝'}操作失败: ${data.message || '未知错误'}`, 'error');
        }
    } catch (error) {
        console.error(`${action === 'approve' ? '批量通过' : '批量拒绝'}操作失败:`, error);
        showToast(`${action === 'approve' ? '批量通过' : '批量拒绝'}操作失败: ${error.message}`, 'error');
    }
}

// 查看和管理活动签到二维码
async function viewQRCodeManagement(activityId, activityTitle) {
    try {
        // 创建模态框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>${activityTitle} - 签到二维码管理</h2>
                <div id="qrcodeManagementContent">
                    <div style="text-align: center; padding: 20px;"><div class="loading">加载中...</div></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.style.display = 'block';
        
        // 绑定关闭按钮事件
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', () => modal.remove());
        
        // 获取活动二维码信息
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        let signInQrCode = null;
        let signOutQrCode = null;
        
        if (response.ok) {
            signInQrCode = data.signInQrCode || null;
            signOutQrCode = data.signOutQrCode || null;
        }
        
        // 渲染二维码管理页面
        renderQRCodeManagement(modal, activityId, signInQrCode, signOutQrCode);
    } catch (error) {
        console.error('加载二维码信息失败:', error);
        alert(`加载二维码信息失败: ${error.message}`);
    }
}

// 渲染二维码管理页面
function renderQRCodeManagement(modal, activityId, signInQrCode, signOutQrCode) {
    const content = modal.querySelector('#qrcodeManagementContent');
    
    content.innerHTML = `
        <div class="qrcode-management-container">
            <!-- 签到二维码 -->
            <div class="qrcode-section">
                <h3>当前签到二维码</h3>
                <div class="qrcode-display">
                    <div class="qrcode-preview" id="signInQrCodePreview">
                        ${signInQrCode ? `
                            <img src="${signInQrCode}" alt="签到二维码" style="max-width: 300px; max-height: 300px;">
                        ` : '<p>暂无二维码</p>'}
                        <div id="signInQrCodeLoading" style="display: none; text-align: center; padding: 20px; font-style: italic;">生成中...</div>
                    </div>
                    
                    <div class="qrcode-actions">
                        <button id="generateSignInQRCodeBtn" class="btn btn-primary">生成新签到二维码</button>
                        ${signInQrCode ? `<button id="updateSignInQRCodeBtn" class="btn btn-secondary">更新签到二维码</button>` : ''}
                        ${signInQrCode ? `<button id="downloadSignInQRCodeBtn" class="btn btn-success">下载签到二维码</button>` : ''}
                        ${signInQrCode ? `<button id="disableSignInQRCodeBtn" class="btn btn-danger">禁用签到二维码</button>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- 签退二维码 -->
            <div class="qrcode-section">
                <h3>当前签退二维码</h3>
                <div class="qrcode-display">
                    <div class="qrcode-preview" id="signOutQrCodePreview">
                        ${signOutQrCode ? `
                            <img src="${signOutQrCode}" alt="签退二维码" style="max-width: 300px; max-height: 300px;">
                        ` : '<p>暂无二维码</p>'}
                        <div id="signOutQrCodeLoading" style="display: none; text-align: center; padding: 20px; font-style: italic;">生成中...</div>
                    </div>
                    
                    <div class="qrcode-actions">
                        <button id="generateSignOutQRCodeBtn" class="btn btn-primary">生成新签退二维码</button>
                        ${signOutQrCode ? `<button id="updateSignOutQRCodeBtn" class="btn btn-secondary">更新签退二维码</button>` : ''}
                        ${signOutQrCode ? `<button id="downloadSignOutQRCodeBtn" class="btn btn-success">下载签退二维码</button>` : ''}
                        ${signOutQrCode ? `<button id="disableSignOutQRCodeBtn" class="btn btn-danger">禁用签退二维码</button>` : ''}
                    </div>
                </div>
            </div>
            
            <!-- 通用设置 -->
            <div class="qrcode-settings">
                <h3>二维码设置</h3>
                <div class="form-group">
                    <label for="qrcodeExpiry">有效期（分钟）</label>
                    <input type="number" id="qrcodeExpiry" min="1" max="1440" value="60" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <p class="help-text">设置二维码的有效期，过期后需要重新生成</p>
                </div>
                
                <div class="form-group">
                    <label for="qrcodeUsageLimit">使用次数限制</label>
                    <input type="number" id="qrcodeUsageLimit" min="1" value="100" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;">
                    <p class="help-text">设置二维码的最大使用次数，达到限制后需要重新生成</p>
                </div>
            </div>
        </div>
    `;
    
    // 绑定签到二维码事件
    const generateSignInBtn = content.querySelector('#generateSignInQRCodeBtn');
    const updateSignInBtn = content.querySelector('#updateSignInQRCodeBtn');
    const downloadSignInBtn = content.querySelector('#downloadSignInQRCodeBtn');
    const disableSignInBtn = content.querySelector('#disableSignInQRCodeBtn');
    
    // 生成新签到二维码
    if (generateSignInBtn) {
        generateSignInBtn.addEventListener('click', async () => {
            await generateQRCode(modal, activityId, 'signIn');
        });
    }
    
    // 更新签到二维码
    if (updateSignInBtn) {
        updateSignInBtn.addEventListener('click', async () => {
            await updateQRCode(modal, activityId, 'signIn');
        });
    }
    
    // 下载签到二维码
    if (downloadSignInBtn) {
        downloadSignInBtn.addEventListener('click', async () => {
            await downloadQRCode(signInQrCode, activityId, 'signIn');
        });
    }
    
    // 禁用签到二维码
    if (disableSignInBtn) {
        disableSignInBtn.addEventListener('click', async () => {
            await disableQRCode(modal, activityId, 'signIn');
        });
    }
    
    // 绑定签退二维码事件
    const generateSignOutBtn = content.querySelector('#generateSignOutQRCodeBtn');
    const updateSignOutBtn = content.querySelector('#updateSignOutQRCodeBtn');
    const downloadSignOutBtn = content.querySelector('#downloadSignOutQRCodeBtn');
    const disableSignOutBtn = content.querySelector('#disableSignOutQRCodeBtn');
    
    // 生成新签退二维码
    if (generateSignOutBtn) {
        generateSignOutBtn.addEventListener('click', async () => {
            await generateQRCode(modal, activityId, 'signOut');
        });
    }
    
    // 更新签退二维码
    if (updateSignOutBtn) {
        updateSignOutBtn.addEventListener('click', async () => {
            await updateQRCode(modal, activityId, 'signOut');
        });
    }
    
    // 下载签退二维码
    if (downloadSignOutBtn) {
        downloadSignOutBtn.addEventListener('click', async () => {
            await downloadQRCode(signOutQrCode, activityId, 'signOut');
        });
    }
    
    // 禁用签退二维码
    if (disableSignOutBtn) {
        disableSignOutBtn.addEventListener('click', async () => {
            await disableQRCode(modal, activityId, 'signOut');
        });
    }
}

// 生成新二维码
async function generateQRCode(modal, activityId, type = 'signIn') {
    try {
        // 显示加载状态
        const loadingDiv = modal.querySelector(`#${type}QrCodeLoading`);
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
        
        const expiry = parseInt(modal.querySelector('#qrcodeExpiry').value) || 60;
        const usageLimit = parseInt(modal.querySelector('#qrcodeUsageLimit').value) || 100;
        
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, expiry, usageLimit })
        });
        
        const data = await response.json();
        
        // 重新获取最新的二维码信息
        const refreshResponse = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const refreshData = await refreshResponse.json();
        
        if (response.ok && refreshResponse.ok) {
            // 隐藏加载状态
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            alert(`${type === 'signIn' ? '签到' : '签退'}二维码已生成`);
            renderQRCodeManagement(modal, activityId, refreshData.signInQrCode, refreshData.signOutQrCode);
        } else {
            // 隐藏加载状态
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            alert(`生成${type === 'signIn' ? '签到' : '签退'}二维码失败: ${data.message || '未知错误'}`);
        }
    } catch (error) {
        // 隐藏加载状态
        const loadingDiv = modal.querySelector(`#${type}QrCodeLoading`);
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        console.error(`生成${type === 'signIn' ? '签到' : '签退'}二维码失败:`, error);
        alert(`生成${type === 'signIn' ? '签到' : '签退'}二维码失败: ${error.message}`);
    }
}

// 更新二维码
async function updateQRCode(modal, activityId, type = 'signIn') {
    try {
        // 显示加载状态
        const loadingDiv = modal.querySelector(`#${type}QrCodeLoading`);
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
        
        const expiry = parseInt(modal.querySelector('#qrcodeExpiry').value) || 60;
        const usageLimit = parseInt(modal.querySelector('#qrcodeUsageLimit').value) || 100;
        
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, expiry, usageLimit })
        });
        
        const data = await response.json();
        
        // 重新获取最新的二维码信息
        const refreshResponse = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const refreshData = await refreshResponse.json();
        
        if (response.ok && refreshResponse.ok) {
            // 隐藏加载状态
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            alert(`${type === 'signIn' ? '签到' : '签退'}二维码已更新`);
            renderQRCodeManagement(modal, activityId, refreshData.signInQrCode, refreshData.signOutQrCode);
        } else {
            // 隐藏加载状态
            if (loadingDiv) {
                loadingDiv.style.display = 'none';
            }
            alert(`更新${type === 'signIn' ? '签到' : '签退'}二维码失败: ${data.message || '未知错误'}`);
        }
    } catch (error) {
        // 隐藏加载状态
        const loadingDiv = modal.querySelector(`#${type}QrCodeLoading`);
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
        console.error(`更新${type === 'signIn' ? '签到' : '签退'}二维码失败:`, error);
        alert(`更新${type === 'signIn' ? '签到' : '签退'}二维码失败: ${error.message}`);
    }
}

// 下载二维码
async function downloadQRCode(qrCode, activityId, type = 'signIn') {
    try {
        const response = await fetch(qrCode);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-${type}-qrcode-${activityId}-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert(`${type === 'signIn' ? '签到' : '签退'}二维码下载成功`);
    } catch (error) {
        console.error(`下载${type === 'signIn' ? '签到' : '签退'}二维码失败:`, error);
        alert(`下载${type === 'signIn' ? '签到' : '签退'}二维码失败: ${error.message}`);
    }
}

// 禁用二维码
async function disableQRCode(modal, activityId, type = 'signIn') {
    try {
        if (confirm(`确定要禁用当前${type === 'signIn' ? '签到' : '签退'}二维码吗？`)) {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode/disable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type })
            });
            
            const data = await response.json();
            
            // 重新获取最新的二维码信息
            const refreshResponse = await fetch(`http://localhost:3001/api/activities/${activityId}/qrcode`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const refreshData = await refreshResponse.json();
            
            if (response.ok && refreshResponse.ok) {
                alert(data.message);
                renderQRCodeManagement(modal, activityId, refreshData.signInQrCode, refreshData.signOutQrCode);
            } else {
                alert(`禁用${type === 'signIn' ? '签到' : '签退'}二维码失败: ${data.message || '未知错误'}`);
            }
        }
    } catch (error) {
        console.error(`禁用${type === 'signIn' ? '签到' : '签退'}二维码失败:`, error);
        alert(`禁用${type === 'signIn' ? '签到' : '签退'}二维码失败: ${error.message}`);
    }
}

// 帧检测函数
function tick() {
    try {
        if (!scanning || !video || video.readyState !== video.HAVE_ENOUGH_DATA) {
            // 即使未处于扫描状态，也继续请求下一帧，确保视频流持续更新
            requestAnimationFrame(tick);
            return;
        }
        
        // 设置画布大小
        canvasElement.width = video.videoWidth;
        canvasElement.height = video.videoHeight;
        
        // 绘制视频帧到画布
        canvasContext.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
        
        // 获取当前时间，用于控制识别频率
        const currentTime = Date.now();
        
        // 控制识别频率，避免每帧都进行识别
        if (currentTime - lastScanTime > SCAN_INTERVAL) {
            // 检查jsQR库是否可用
            if (typeof jsQR === 'undefined') {
                console.error('jsQR库未加载，无法进行二维码识别');
                scanStatus.textContent = '二维码识别库加载失败，请刷新页面重试';
                lastScanTime = currentTime; // 更新扫描时间，避免频繁报错
                requestAnimationFrame(tick);
                return;
            }
            
            // 尝试获取图像数据，添加错误捕获
            let imageData;
            try {
                imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height);
            } catch (e) {
                console.error('获取图像数据失败:', e);
                lastScanTime = currentTime;
                requestAnimationFrame(tick);
                return;
            }
            
            // 使用jsQR库识别二维码
            let code;
            try {
                // 优化：尝试识别正常和反转颜色的二维码，提高识别率
                code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: "attemptBoth",
                });
            } catch (e) {
                console.error('二维码识别失败:', e);
                lastScanTime = currentTime;
                requestAnimationFrame(tick);
                return;
            }
            
            // 添加调试日志
            console.log('二维码识别结果:', code ? code.data : '未识别到二维码');
            
            // 识别成功且二维码内容有效
            if (code && code.data) {
                // 结果去重，避免重复处理同一二维码
                if (code.data !== lastQRContent) {
                    lastQRContent = code.data;
                    console.log('识别到新的二维码:', code.data);
                    // 处理扫码结果
                    handleScanResult(code.data);
                }
            } else {
                // 未识别到二维码，更新状态显示
                if (scanStatus && scanStatus.textContent !== '正在扫描...') {
                    scanStatus.textContent = '正在扫描...';
                }
            }
            
            // 更新最后扫描时间
            lastScanTime = currentTime;
        }
        
        // 持续请求下一帧，确保视频流持续更新
        requestAnimationFrame(tick);
    } catch (error) {
        console.error('tick函数执行错误:', error);
        // 即使发生错误，也要继续请求下一帧，避免摄像头画面卡死
        requestAnimationFrame(tick);
    }
}

// 模拟二维码扫描（实际项目中应替换为真实的二维码识别）
async function simulateQRCodeScan() {
    // 注释掉自动生成二维码的逻辑，避免过早触发API请求
    // 在真实项目中，这里应该是二维码识别库的调用
    console.log('模拟二维码扫描 - 实际项目中应替换为真实的二维码识别逻辑');
    // 仅在测试时手动调用，不再自动触发
}

// 处理扫码结果
async function handleScanResult(qrContent) {
    // 检查扫描状态，确保只有在扫描中才处理结果
    if (!scanning) {
        console.warn('未处于扫描状态，忽略扫码结果');
        return;
    }
    
    try {
        // 验证二维码内容不能为空
        if (!qrContent || typeof qrContent !== 'string') {
            scanStatus.textContent = '二维码内容无效';
            return;
        }
        
        // 解析二维码内容
        const [activityIdStr, actionStr] = qrContent.split(',');
        
        if (!activityIdStr || !actionStr) {
            scanStatus.textContent = '二维码格式错误';
            return;
        }
        
        // 提取活动ID
        const activityIdMatch = activityIdStr.match(/activity-(\d+)/);
        if (!activityIdMatch) {
            scanStatus.textContent = '二维码格式错误，活动ID无效';
            return;
        }
        const activityId = parseInt(activityIdMatch[1]);
        
        // 提取操作类型，处理带有时间戳的情况（如signIn-1234567890）
        let action;
        if (actionStr.startsWith('signIn')) {
            action = 'signIn';
        } else if (actionStr.startsWith('signOut')) {
            action = 'signOut';
        } else {
            scanStatus.textContent = '二维码格式错误，操作类型无效';
            return;
        }
        
        // 显示扫码结果
        scanStatus.textContent = `正在${action === 'signIn' ? '签到' : '签退'}...`;
        
        // 调用API进行签到/签退
        const result = await api.user.scanSign(qrContent);
        
        // 显示签到/签退结果
        if (result && result.status === 'success') {
            scanStatus.textContent = `${action === 'signIn' ? '签到' : '签退'}成功！${result.message || ''}`;
            
            // 3秒后关闭模态框
            setTimeout(() => {
                closeScanModal();
                // 更新用户信息和志愿时长
                loadUserProfile();
            }, 3000);
        } else {
            scanStatus.textContent = `${action === 'signIn' ? '签到' : '签退'}失败: ${result.message || '未知错误'}`;
        }
        
        // 停止扫描
        scanning = false;
    } catch (error) {
        console.error('处理扫码结果失败:', error);
        
        // 提供更友好的错误提示
        let friendlyMessage = '扫码处理失败';
        const errorMsg = error.message || '';
        
        // 调整错误处理顺序，先处理具体的业务错误，再处理网络错误
        if (errorMsg.includes('401') || errorMsg.includes('未提供认证令牌')) {
            friendlyMessage = '请先登录后再进行扫码操作';
        } else if (errorMsg.includes('404')) {
            if (errorMsg.includes('活动不存在')) {
                friendlyMessage = '该活动不存在或已结束';
            } else if (errorMsg.includes('无法找到')) {
                friendlyMessage = '系统服务暂时不可用，请稍后重试';
            } else {
                friendlyMessage = '请求的资源不存在';
            }
        } else if (errorMsg.includes('二维码格式错误')) {
            friendlyMessage = '二维码格式错误，请使用正确的活动二维码';
        } else if (errorMsg.includes('您未报名该活动')) {
            friendlyMessage = '您未报名该活动，无法进行签到/签退';
        } else if (errorMsg.includes('您已签到')) {
            friendlyMessage = '您已完成签到，请勿重复操作';
        } else if (errorMsg.includes('您尚未签到')) {
            friendlyMessage = '请先完成签到，再进行签退操作';
        } else if (errorMsg.includes('您已签退')) {
            friendlyMessage = '您已完成签退，请勿重复操作';
        } else if (errorMsg.includes('Network response was not ok')) {
            // 从错误信息中提取实际的错误消息
            const actualError = errorMsg.replace('Network response was not ok: ', '');
            friendlyMessage = `扫码处理失败: ${actualError}`;
        } else if (errorMsg.includes('Network')) {
            // 真正的网络连接错误
            friendlyMessage = '网络连接失败，请检查网络设置';
        } else {
            friendlyMessage = `扫码处理失败: ${errorMsg}`;
        }
        
        scanStatus.textContent = friendlyMessage;
        
        // 停止扫描
        scanning = false;
    }
}

// 页面滚动到指定区域
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// 显示编辑个人信息模态框
function showEditProfileModal(user) {
    // 为可能缺少的属性设置默认值
    const safeUser = {
        name: user.name || '',
        gender: user.gender || 'other',
        age: user.age || '',
        phone: user.phone || '',
        email: user.email || ''
    };
    
    // 填充表单数据
    document.getElementById('editName').value = safeUser.name;
    document.getElementById('editGender').value = safeUser.gender;
    document.getElementById('editAge').value = safeUser.age;
    document.getElementById('editPhone').value = safeUser.phone;
    document.getElementById('editEmail').value = safeUser.email;
    
    // 显示模态框
    const modal = document.getElementById('editProfileModal');
    modal.style.display = 'block';
    
    // 绑定关闭按钮事件
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // 绑定取消按钮事件
    const cancelBtn = document.getElementById('cancelEdit');
    cancelBtn.onclick = () => {
        modal.style.display = 'none';
    };
    
    // 点击模态框外部关闭模态框
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
    
    // 绑定表单提交事件
    const form = document.getElementById('editProfileForm');
    form.onsubmit = (event) => {
        event.preventDefault();
        submitEditProfile();
    };
}

// 验证表单数据
function validateProfileForm(formData) {
    const errors = [];
    
    // 验证姓名
    const name = formData.get('name').trim();
    if (!name) {
        errors.push('姓名不能为空');
    } else if (name.length > 50) {
        errors.push('姓名长度不能超过50个字符');
    }
    
    // 验证手机号
    const phone = formData.get('phone').trim();
    if (!phone) {
        errors.push('手机号不能为空');
    } else if (!/^1\d{10}$/.test(phone)) {
        errors.push('手机号格式不正确，应为11位数字');
    }
    
    // 验证邮箱
    const email = formData.get('email').trim();
    if (!email) {
        errors.push('邮箱不能为空');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('邮箱格式不正确');
    }
    
    // 验证年龄
    const age = formData.get('age').trim();
    if (age) {
        const ageNum = parseInt(age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 150) {
            errors.push('年龄应在1-150之间');
        }
    }
    
    // 验证性别
    const gender = formData.get('gender');
    if (!['male', 'female', 'other'].includes(gender)) {
        errors.push('性别选择无效');
    }
    
    return errors;
}

// 提交编辑的个人信息
async function submitEditProfile() {
    // 获取表单数据
    const form = document.getElementById('editProfileForm');
    const formData = new FormData(form);
    
    // 验证表单数据
    const validationErrors = validateProfileForm(formData);
    if (validationErrors.length > 0) {
        alert('表单验证失败:\n' + validationErrors.join('\n'));
        return;
    }
    
    const userData = {
        name: formData.get('name').trim(),
        gender: formData.get('gender'),
        age: formData.get('age') ? parseInt(formData.get('age')) : null,
        phone: formData.get('phone').trim(),
        email: formData.get('email').trim()
    };
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('请先登录');
            return;
        }
        
        // 显示加载状态
        const submitBtn = document.querySelector('#editProfileForm button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.textContent = '保存中...';
        submitBtn.disabled = true;
        
        // 发送PUT请求更新个人信息
        const response = await fetch('http://localhost:3001/api/user/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        // 恢复按钮状态
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
        
        if (response.ok && result.status === 'success') {
            // 更新成功，从服务器获取最新用户信息
            await getUserProfile();
            
            // 关闭模态框
            const modal = document.getElementById('editProfileModal');
            modal.style.display = 'none';
            
            // 显示成功提示
            alert('个人信息更新成功！');
        } else {
            // 更新失败，显示错误信息
            alert(result.message || '个人信息更新失败');
        }
    } catch (error) {
        console.error('更新个人信息失败:', error);
        alert('网络错误，个人信息更新失败');
    }
}