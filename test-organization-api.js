// 测试修复后的组织信息API
const fetch = require('node-fetch');
const { execSync } = require('child_process');

async function testOrganizerProfileAPI() {
    try {
        // 使用generate-tokens.js生成组织方token
        console.log('生成组织方token...');
        const token = execSync('node generate-tokens.js organizer').toString().trim();
        console.log('token生成成功');
        console.log('token:', token);
        
        // 测试获取组织信息API
        console.log('\n测试获取组织信息API...');
        const profileResponse = await fetch('http://localhost:3001/api/organizations/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const profileData = await profileResponse.json();
        if (!profileResponse.ok) {
            throw new Error(`获取组织信息失败: ${profileData.message}`);
        }
        
        console.log('获取组织信息成功:');
        console.log({
            name: profileData.name,
            department: profileData.department,
            contact: profileData.contact,
            address: profileData.address,
            description: profileData.description,
            status: profileData.status
        });
        
        // 测试更新组织信息API
        console.log('\n测试更新组织信息API...');
        const updateResponse = await fetch('http://localhost:3001/api/organizations/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: '阳光志愿者协会测试',
                department: '民政部门测试',
                contact: '0754-88888888',
                address: '汕头市金平区中山路123号测试',
                description: '阳光志愿者协会测试描述'
            })
        });
        
        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
            throw new Error(`更新组织信息失败: ${updateData.message}`);
        }
        
        console.log('更新组织信息成功:', updateData.message);
        
        // 再次获取组织信息，验证更新是否成功
        console.log('\n再次获取组织信息，验证更新是否成功...');
        const updatedProfileResponse = await fetch('http://localhost:3001/api/organizations/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const updatedProfileData = await updatedProfileResponse.json();
        if (!updatedProfileResponse.ok) {
            throw new Error(`获取更新后的组织信息失败: ${updatedProfileData.message}`);
        }
        
        console.log('更新后的组织信息:');
        console.log({
            name: updatedProfileData.name,
            department: updatedProfileData.department,
            contact: updatedProfileData.contact,
            address: updatedProfileData.address,
            description: updatedProfileData.description,
            status: updatedProfileData.status
        });
        
        // 恢复原始数据
        console.log('\n恢复原始数据...');
        const restoreResponse = await fetch('http://localhost:3001/api/organizations/profile', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: '阳光志愿者协会',
                department: '民政部门',
                contact: '0754-88888888',
                address: '汕头市金平区中山路123号',
                description: '阳光志愿者协会是一个致力于为社区提供志愿服务的非营利组织，成立于2020年，现有志愿者1000余人。'
            })
        });
        
        const restoreData = await restoreResponse.json();
        if (!restoreResponse.ok) {
            throw new Error(`恢复原始数据失败: ${restoreData.message}`);
        }
        
        console.log('恢复原始数据成功:', restoreData.message);
        
        // 最后验证恢复后的数据
        console.log('\n验证恢复后的组织信息...');
        const finalProfileResponse = await fetch('http://localhost:3001/api/organizations/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const finalProfileData = await finalProfileResponse.json();
        if (!finalProfileResponse.ok) {
            throw new Error(`获取恢复后的组织信息失败: ${finalProfileData.message}`);
        }
        
        console.log('恢复后的组织信息:');
        console.log({
            name: finalProfileData.name,
            department: finalProfileData.department,
            contact: finalProfileData.contact,
            address: finalProfileData.address,
            description: finalProfileData.description,
            status: finalProfileData.status
        });
        
        console.log('\n测试完成，组织信息API正常工作！');
        
    } catch (error) {
        console.error('测试失败:', error);
    }
}

testOrganizerProfileAPI();