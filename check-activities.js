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

const ActivityParticipant = sequelize.define('ActivityParticipant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    field: 'user_id'
  },
  activityId: {
    type: DataTypes.INTEGER,
    field: 'activity_id'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected')
  },
  signInTime: {
    type: DataTypes.DATE,
    field: 'sign_in_time'
  },
  signOutTime: {
    type: DataTypes.DATE,
    field: 'sign_out_time'
  },
  duration: {
    type: DataTypes.FLOAT
  },
  confirmed: {
    type: DataTypes.BOOLEAN
  },
  rating: {
    type: DataTypes.INTEGER
  },
  comment: {
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
  tableName: 'activity_participants',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('volunteer', 'organizer', 'admin'),
    defaultValue: 'volunteer'
  },
  organizationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'organization_id'
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
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义关联
Activity.hasMany(ActivityParticipant, { foreignKey: 'activityId' });
ActivityParticipant.belongsTo(Activity, { foreignKey: 'activityId' });
User.hasMany(ActivityParticipant, { foreignKey: 'userId' });
ActivityParticipant.belongsTo(User, { foreignKey: 'userId' });

async function checkActivities() {
  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 查询两个活动
    const activities = await Activity.findAll({
      where: {
        title: ['儿童安全教育', '123']
      },
      include: [{
        model: ActivityParticipant,
        include: [User]
      }]
    });

    console.log('\n--- 活动检查结果 ---');
    if (activities.length === 0) {
      console.log('未找到指定的活动');
      return;
    }

    activities.forEach(activity => {
      console.log(`\n活动ID: ${activity.id}, 标题: ${activity.title}`);
      console.log(`活动基本信息: 类型=${activity.type}, 状态=${activity.status}, 招募人数=${activity.registeredCount || 0}/${activity.quota}`);
      console.log(`开始时间: ${activity.startTime}, 结束时间: ${activity.endTime}`);
      console.log(`地点: ${activity.location}`);
      
      console.log('\n参与者信息:');
      if (activity.ActivityParticipants && activity.ActivityParticipants.length > 0) {
        activity.ActivityParticipants.forEach(participant => {
          const user = participant.User;
          console.log(`  参与者ID: ${participant.id}, 姓名: ${participant.volunteerName}`);
          console.log(`  用户ID: ${participant.userId}, 用户角色: ${user ? user.role : '未知'}`);
          console.log(`  注册时间: ${participant.registrationTime}`);
          console.log(`  状态: ${participant.status}`);
        });
      } else {
        console.log('  该活动没有参与者');
      }
    });

  } catch (error) {
    console.error('检查活动时出错:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

checkActivities();