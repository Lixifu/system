// 数据导入脚本
const fs = require('fs');
const path = require('path');
const sequelize = require('./backend/config/db');
const models = require('./backend/models');

// 数据库文件夹路径
const DB_FOLDER = path.join(__dirname, 'database');

// 导入报告
const importReport = {
    totalFiles: 0,
    successFiles: 0,
    failedFiles: 0,
    fileReports: [],
    startTime: new Date(),
    endTime: null,
    totalRecords: 0,
    successRecords: 0,
    failedRecords: 0
};

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp}: ${message}`);
}

// 检查文件是否为有效的JSON
function isValidJson(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
        return true;
    } catch (error) {
        return false;
    }
}

// 获取所有JSON文件
function getJsonFiles() {
    return fs.readdirSync(DB_FOLDER)
        .filter(file => file.endsWith('.json'))
        .sort();
}

// 读取JSON文件内容
function readJsonFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

// 导入单个文件的数据
async function importFile(fileName) {
    const fileReport = {
        fileName,
        modelName: fileName.replace('.json', ''),
        totalRecords: 0,
        successRecords: 0,
        failedRecords: 0,
        failedReasons: [],
        status: 'pending',
        startTime: new Date(),
        endTime: null
    };

    try {
        log(`开始导入 ${fileName}...`);
        
        const model = models[fileReport.modelName];
        if (!model) {
            throw new Error(`模型 ${fileReport.modelName} 不存在`);
        }

        const filePath = path.join(DB_FOLDER, fileName);
        const data = readJsonFile(filePath);
        fileReport.totalRecords = data.length;
        importReport.totalRecords += data.length;

        log(`  准备导入 ${data.length} 条记录`);

        // 使用bulkCreate导入数据，忽略重复项
        const result = await model.bulkCreate(data, {
            ignoreDuplicates: true,
            validate: true
        });

        fileReport.successRecords = result.length;
        fileReport.failedRecords = data.length - result.length;
        fileReport.status = 'success';
        fileReport.endTime = new Date();
        
        importReport.successRecords += result.length;
        importReport.failedRecords += fileReport.failedRecords;

        log(`  ✓ 导入成功！成功: ${result.length}, 失败: ${fileReport.failedRecords}`);

    } catch (error) {
        fileReport.status = 'failed';
        fileReport.failedReasons.push(error.message);
        fileReport.endTime = new Date();
        importReport.failedRecords += fileReport.totalRecords;
        log(`  ✗ 导入失败: ${error.message}`);
    }

    return fileReport;
}

// 验证数据完整性
async function validateData() {
    log('\n开始验证数据完整性...');
    
    const validationResults = {};
    let allValid = true;
    
    for (const modelName of Object.keys(models)) {
        try {
            const model = models[modelName];
            const count = await model.count();
            validationResults[modelName] = {
                count: count,
                status: 'success'
            };
            
            log(`  ✓ ${modelName}: ${count} 条记录`);
        } catch (error) {
            validationResults[modelName] = {
                error: error.message,
                status: 'failed'
            };
            log(`  ✗ ${modelName}: 验证失败 - ${error.message}`);
            allValid = false;
        }
    }
    
    return {
        allValid: allValid,
        results: validationResults
    };
}

// 生成导入报告
function generateReport() {
    importReport.endTime = new Date();
    importReport.duration = importReport.endTime - importReport.startTime;
    
    const report = {
        basicInfo: {
            startTime: importReport.startTime.toISOString(),
            endTime: importReport.endTime.toISOString(),
            duration: importReport.duration,
            database: sequelize.config.database,
            dialect: sequelize.config.dialect
        },
        summary: {
            totalFiles: importReport.totalFiles,
            successFiles: importReport.successFiles,
            failedFiles: importReport.failedFiles,
            totalRecords: importReport.totalRecords,
            successRecords: importReport.successRecords,
            failedRecords: importReport.failedRecords,
            successRate: importReport.totalRecords > 0 ? 
                ((importReport.successRecords / importReport.totalRecords) * 100).toFixed(2) + '%' : '0%'
        },
        fileReports: importReport.fileReports
    };
    
    const reportFile = path.join(__dirname, 'import-data-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
    log(`\n导入报告已保存到: ${reportFile}`);
    
    return report;
}

// 显示报告摘要
function showReportSummary(report) {
    log('\n=== 导入报告摘要 ===');
    log(`总文件数: ${report.summary.totalFiles}`);
    log(`成功文件: ${report.summary.successFiles}`);
    log(`失败文件: ${report.summary.failedFiles}`);
    log(`总记录数: ${report.summary.totalRecords}`);
    log(`成功记录: ${report.summary.successRecords}`);
    log(`失败记录: ${report.summary.failedRecords}`);
    log(`成功率: ${report.summary.successRate}`);
    log(`耗时: ${report.basicInfo.duration} 毫秒`);
    
    if (report.summary.failedFiles > 0) {
        log('\n失败的文件:');
        report.fileReports.forEach(fileReport => {
            if (fileReport.status === 'failed') {
                log(`- ${fileReport.fileName}: ${fileReport.failedReasons[0]}`);
            }
        });
    }
    
    log('\n=== 导入完成 ===');
}

// 主导入函数
async function importData() {
    log('=== 数据导入操作开始 ===');
    log('当前操作: 检查文件格式 -> 建立数据库连接 -> 导入数据 -> 验证完整性 -> 生成报告');
    
    try {
        // 1. 检查数据库连接
        await sequelize.authenticate();
        log('✓ 数据库连接成功');
        
        // 2. 获取所有JSON文件
        const jsonFiles = getJsonFiles();
        importReport.totalFiles = jsonFiles.length;
        
        log(`发现 ${jsonFiles.length} 个JSON文件`);
        
        // 3. 检查所有文件是否为有效的JSON
        const invalidFiles = jsonFiles.filter(file => !isValidJson(path.join(DB_FOLDER, file)));
        if (invalidFiles.length > 0) {
            log(`错误：以下文件不是有效的JSON格式: ${invalidFiles.join(', ')}`);
            process.exit(1);
        }
        log('✓ 所有文件格式检查通过');
        
        // 4. 按顺序导入文件（根据关联关系调整顺序）
        // 先导入基础表，再导入关联表
        const importOrder = [
            'User',
            'Organization',
            'Skill',
            'Medal',
            'Activity',
            'Training',
            'ActivityTraining',
            'UserSkill',
            'UserMedal',
            'ActivityParticipant',
            'TrainingParticipant',
            'Notification'
        ];
        
        // 按指定顺序排序文件
        const orderedFiles = importOrder
            .map(modelName => modelName + '.json')
            .filter(file => jsonFiles.includes(file));
        
        // 添加未在指定顺序中的文件
        const remainingFiles = jsonFiles.filter(file => !orderedFiles.includes(file));
        const finalImportOrder = [...orderedFiles, ...remainingFiles];
        
        // 5. 执行导入
        for (const fileName of finalImportOrder) {
            const fileReport = await importFile(fileName);
            importReport.fileReports.push(fileReport);
            
            if (fileReport.status === 'success') {
                importReport.successFiles++;
            } else {
                importReport.failedFiles++;
            }
        }
        
        // 6. 验证数据完整性
        const validationResult = await validateData();
        
        // 7. 生成导入报告
        const report = generateReport();
        
        // 8. 显示报告摘要
        showReportSummary(report);
        
        log('\n=== 数据导入操作成功完成 ===');
        return true;
        
    } catch (error) {
        log(`✗ 操作失败: ${error.message}`);
        log(`错误详情: ${error.stack}`);
        
        // 生成最终报告
        const report = generateReport();
        showReportSummary(report);
        
        log('\n=== 数据导入操作失败 ===');
        return false;
    }
}

// 执行导入
importData();