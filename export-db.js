// 数据库导出脚本
const fs = require('fs');
const path = require('path');
const models = require('./backend/models');

// 定义导出目录
const EXPORT_DIR = path.join(__dirname, 'database');

// 确保导出目录存在
if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    console.log(`创建导出目录: ${EXPORT_DIR}`);
}

// 导出单个模型的数据
async function exportModelData(modelName, model) {
    try {
        console.log(`开始导出 ${modelName} 数据...`);
        const data = await model.findAll({
            raw: true,
            nest: true
        });
        
        const exportPath = path.join(EXPORT_DIR, `${modelName}.json`);
        fs.writeFileSync(exportPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ 成功导出 ${modelName} 数据: ${data.length} 条记录`);
        return data.length;
    } catch (error) {
        console.error(`❌ 导出 ${modelName} 数据失败:`, error.message);
        return 0;
    }
}

// 导出所有模型数据
async function exportAllData() {
    console.log('开始导出数据库所有数据...');
    
    // 获取所有模型
    const modelNames = Object.keys(models);
    let totalRecords = 0;
    
    // 按顺序导出所有模型数据
    for (const modelName of modelNames) {
        const model = models[modelName];
        const recordCount = await exportModelData(modelName, model);
        totalRecords += recordCount;
    }
    
    console.log('\n📊 导出统计:');
    console.log(`- 导出模型数量: ${modelNames.length}`);
    console.log(`- 导出记录总数: ${totalRecords}`);
    console.log(`- 导出目录: ${EXPORT_DIR}`);
    console.log('\n🎉 数据库数据导出完成!');
}

// 执行导出
exportAllData().catch(error => {
    console.error('导出过程中发生错误:', error);
    process.exit(1);
});