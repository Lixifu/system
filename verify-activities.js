const { DataTypes } = require('sequelize');

// 导入完整的配置
const config = require('./backend/config/config');

// 创建Sequelize实例
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(
  config.database.database,
  config.database.username,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    timezone: config.database.timezone,
    dialectOptions: config.database.dialectOptions,
    logging: false
  }
);

// 定义模型
const Activity = sequelize.define('Activity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_time'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  quota: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  organizerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'organizer_id'
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'organization_id'
  },
  status: {
    type: DataTypes.ENUM('draft', 'recruiting', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  requirements: {
    type: DataTypes.TEXT
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function verifyActivities() {
  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 查询两个活动
    const activities = await Activity.findAll({
      where: {
        title: ['儿童安全教育', '123']
      }
    });

    console.log('\n--- 活动验证结果 ---');
    
    if (activities.length === 0) {
      console.log('未找到指定的活动');
      return;
    }

    // 验证每个活动的信息完整性
    for (const activity of activities) {
      console.log(`\n活动: ${activity.title} (ID: ${activity.id})`);
      console.log(`  描述: ${activity.description ? '已提供' : '未提供'}`);
      console.log(`  类型: ${activity.type}`);
      console.log(`  开始时间: ${activity.startTime ? '已设置' : '未设置'}`);
      console.log(`  结束时间: ${activity.endTime ? '已设置' : '未设置'}`);
      console.log(`  地点: ${activity.location}`);
      console.log(`  招募人数: ${activity.quota}`);
      console.log(`  组织者ID: ${activity.organizerId}`);
      console.log(`  组织ID: ${activity.organizationId}`);
      console.log(`  状态: ${activity.status}`);
      console.log(`  报名要求: ${activity.requirements ? '已提供' : '未提供'}`);
      console.log(`  创建时间: ${activity.createdAt}`);
      console.log(`  更新时间: ${activity.updatedAt}`);
      
      // 检查必填字段是否完整
      const missingFields = [];
      if (!activity.title) missingFields.push('标题');
      if (!activity.description) missingFields.push('描述');
      if (!activity.type) missingFields.push('类型');
      if (!activity.startTime) missingFields.push('开始时间');
      if (!activity.endTime) missingFields.push('结束时间');
      if (!activity.location) missingFields.push('地点');
      if (!activity.quota) missingFields.push('招募人数');
      if (!activity.organizerId) missingFields.push('组织者ID');
      if (!activity.organizationId) missingFields.push('组织ID');
      if (!activity.status) missingFields.push('状态');
      
      if (missingFields.length > 0) {
        console.log(`  警告: 缺少以下必填字段: ${missingFields.join(', ')}`);
      } else {
        console.log(`  状态: 所有必填字段已完整`);
      }
      
      // 检查状态是否符合系统规范
      const validStatuses = ['draft', 'recruiting', 'ongoing', 'completed', 'cancelled'];
      if (validStatuses.includes(activity.status)) {
        console.log(`  状态类型: 符合系统规范`);
      } else {
        console.log(`  警告: 状态类型不符合系统规范，有效值: ${validStatuses.join(', ')}`);
      }
      
      // 检查时间合理性
      if (activity.startTime && activity.endTime) {
        if (activity.endTime > activity.startTime) {
          console.log(`  时间设置: 合理`);
        } else {
          console.log(`  警告: 结束时间早于或等于开始时间，时间设置不合理`);
        }
      }
      
      // 检查招募人数合理性
      if (activity.quota > 0) {
        console.log(`  招募人数: 合理`);
      } else {
        console.log(`  警告: 招募人数必须大于0`);
      }
    }

  } catch (error) {
    console.error('活动验证出错:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

verifyActivities();