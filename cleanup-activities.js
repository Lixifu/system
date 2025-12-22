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

// 定义关联
Activity.hasMany(ActivityParticipant, { foreignKey: 'activityId' });
ActivityParticipant.belongsTo(Activity, { foreignKey: 'activityId' });

async function cleanupActivities() {
  try {
    // 连接数据库
    await sequelize.authenticate();
    console.log('数据库连接成功');

    // 获取两个活动
    const activities = await Activity.findAll({
      where: {
        title: ['儿童安全教育', '123']
      }
    });

    if (activities.length === 0) {
      console.log('未找到指定的活动');
      return;
    }

    console.log('\n--- 开始数据清理 ---');
    
    // 遍历每个活动，清除其参与者信息
    for (const activity of activities) {
      console.log(`\n清理活动: ${activity.title} (ID: ${activity.id})`);
      
      // 删除该活动的所有参与者记录
      const deletedCount = await ActivityParticipant.destroy({
        where: {
          activityId: activity.id
        }
      });
      
      console.log(`已删除 ${deletedCount} 条参与者记录`);
      
      // 检查是否还有参与者
      const remainingParticipants = await ActivityParticipant.count({
        where: {
          activityId: activity.id
        }
      });
      
      if (remainingParticipants === 0) {
        console.log(`活动 ${activity.title} 的参与者信息已全部清除`);
      } else {
        console.log(`警告：活动 ${activity.title} 仍有 ${remainingParticipants} 条参与者记录`);
      }
    }

    console.log('\n--- 数据清理完成 ---');
    
    // 验证清理结果
    console.log('\n--- 验证清理结果 ---');
    for (const activity of activities) {
      const participantCount = await ActivityParticipant.count({
        where: {
          activityId: activity.id
        }
      });
      console.log(`活动 ${activity.title} (ID: ${activity.id}) 当前参与者数量: ${participantCount}`);
    }

  } catch (error) {
    console.error('数据清理出错:', error);
  } finally {
    // 关闭数据库连接
    await sequelize.close();
  }
}

cleanupActivities();