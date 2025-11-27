/**
 * 遗漏监控配置管理模块
 * 为每个监控点提供独立的配置管理
 */

// ==================== 状态管理 ====================

let currentConfigType = 'am'; // 当前彩种
let allConfigs = []; // 所有配置

// ==================== API调用 ====================

/**
 * 获取所有监控配置
 */
async function fetchMonitorConfigs(lottery_type = 'am') {
    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/configs?lottery_type=${lottery_type}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        allConfigs = data.configs || [];

        renderConfigTable(allConfigs);
    } catch (error) {
        console.error('获取监控配置失败:', error);
        showError('获取配置失败：' + error.message);
    }
}

/**
 * 保存单个配置
 */
async function saveMonitorConfig(config) {
    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/config`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            }
        );

        const result = await response.json();

        if (result.success) {
            showSuccess('配置保存成功');
            // 不自动刷新，让用户手动刷新
        } else {
            showError('保存失败：' + result.error);
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showError('保存失败：' + error.message);
    }
}

/**
 * 批量保存配置
 */
async function batchSaveConfigs(configs) {
    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/configs/batch`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ configs })
            }
        );

        const result = await response.json();

        if (result.success) {
            showSuccess(result.message);
            // 不自动刷新，让用户手动刷新
        } else {
            showError('保存失败：' + result.error);
        }
    } catch (error) {
        console.error('批量保存失败:', error);
        showError('保存失败：' + error.message);
    }
}

// ==================== 渲染函数 ====================

/**
 * 渲染配置表格
 */
function renderConfigTable(configs) {
    const container = document.getElementById('monitorConfigTable');

    if (!configs || configs.length === 0) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#757575;">
                <div style="font-size:48px;margin-bottom:10px;">⚙️</div>
                <div style="font-size:18px;">暂无配置数据</div>
                <div style="font-size:14px;margin-top:10px;color:#9e9e9e;">
                    请先在数据库中初始化监控配置
                </div>
            </div>
        `;
        return;
    }

    // 按分析类型分组
    const grouped = {};
    configs.forEach(cfg => {
        if (!grouped[cfg.analysis_type]) {
            grouped[cfg.analysis_type] = [];
        }
        grouped[cfg.analysis_type].push(cfg);
    });

    let html = '<div class="config-container">';

    // 渲染每个分析类型的配置
    for (const [analysisType, typeConfigs] of Object.entries(grouped)) {
        const typeName = getAnalysisTypeName(analysisType);

        html += `
            <div class="config-group" style="margin-bottom:30px;">
                <div class="config-group-header" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:15px;border-radius:8px 8px 0 0;font-size:18px;font-weight:600;">
                    ${typeName} (${typeConfigs.length}个配置)
                </div>
                <table class="data-table" style="border-collapse:collapse;width:100%;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                    <thead>
                        <tr style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
                            <th style="padding:12px;text-align:center;width:200px;color:white;font-weight:600;font-size:14px;">详情</th>
                            <th style="padding:12px;text-align:center;width:150px;color:white;font-weight:600;font-size:14px;">最小当前遗漏</th>
                            <th style="padding:12px;text-align:center;width:150px;color:white;font-weight:600;font-size:14px;">距离最大遗漏</th>
                            <th style="padding:12px;text-align:center;width:120px;color:white;font-weight:600;font-size:14px;">近期期数</th>
                            <th style="padding:12px;text-align:center;width:100px;color:white;font-weight:600;font-size:14px;">启用</th>
                            <th style="padding:12px;text-align:center;width:120px;color:white;font-weight:600;font-size:14px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        typeConfigs.forEach((cfg, index) => {
            html += `
                <tr style="border-bottom:1px solid #e0e0e0;${index % 2 === 0 ? 'background:#fafafa;' : ''}">
                    <td style="padding:12px;text-align:center;font-weight:500;">
                        ${cfg.detail || '-'}
                    </td>
                    <td style="padding:12px;text-align:center;">
                        <input type="number"
                               class="config-input"
                               data-config-id="${cfg.id}"
                               data-field="min_current_omission"
                               value="${cfg.min_current_omission}"
                               min="0"
                               max="100"
                               style="width:80px;padding:6px;border:1px solid #ddd;border-radius:4px;text-align:center;">
                    </td>
                    <td style="padding:12px;text-align:center;">
                        <input type="number"
                               class="config-input"
                               data-config-id="${cfg.id}"
                               data-field="max_gap_from_max"
                               value="${cfg.max_gap_from_max}"
                               min="0"
                               max="20"
                               style="width:80px;padding:6px;border:1px solid #ddd;border-radius:4px;text-align:center;">
                    </td>
                    <td style="padding:12px;text-align:center;">
                        <input type="number"
                               class="config-input"
                               data-config-id="${cfg.id}"
                               data-field="recent_periods"
                               value="${cfg.recent_periods || 200}"
                               min="50"
                               max="500"
                               step="50"
                               style="width:90px;padding:6px;border:1px solid #ddd;border-radius:4px;text-align:center;">
                    </td>
                    <td style="padding:12px;text-align:center;">
                        <label class="switch">
                            <input type="checkbox"
                                   class="config-enabled"
                                   data-config-id="${cfg.id}"
                                   ${cfg.enabled ? 'checked' : ''}>
                            <span class="slider round"></span>
                        </label>
                    </td>
                    <td style="padding:12px;text-align:center;">
                        <button class="btn-save-config"
                                data-config-id="${cfg.id}"
                                style="padding:6px 16px;background:#4caf50;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;">
                            保存
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    html += '</div>';

    // 添加批量操作按钮
    html += `
        <div style="text-align:center;margin-top:30px;padding:20px;background:#f9f9f9;border-radius:8px;">
            <button onclick="batchSaveAllConfigs()"
                    style="padding:12px 30px;background:#1976d2;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:600;margin-right:15px;">
                💾 批量保存所有配置
            </button>
            <button onclick="resetToDefaults()"
                    style="padding:12px 30px;background:#ff9800;color:white;border:none;border-radius:4px;cursor:pointer;font-size:16px;font-weight:600;">
                🔄 恢复默认值
            </button>
        </div>
    `;

    container.innerHTML = html;

    // 绑定保存按钮事件
    document.querySelectorAll('.btn-save-config').forEach(btn => {
        btn.addEventListener('click', handleSaveSingleConfig);
    });
}

/**
 * 保存单个配置
 */
function handleSaveSingleConfig(event) {
    const configId = event.target.getAttribute('data-config-id');
    const config = allConfigs.find(c => c.id == configId);

    if (!config) {
        showError('配置不存在');
        return;
    }

    // 获取输入值
    const minInput = document.querySelector(`input[data-config-id="${configId}"][data-field="min_current_omission"]`);
    const maxInput = document.querySelector(`input[data-config-id="${configId}"][data-field="max_gap_from_max"]`);
    const recentPeriodsInput = document.querySelector(`input[data-config-id="${configId}"][data-field="recent_periods"]`);
    const enabledInput = document.querySelector(`input.config-enabled[data-config-id="${configId}"]`);

    const updatedConfig = {
        lottery_type: config.lottery_type,
        analysis_type: config.analysis_type,
        detail: config.detail,
        min_current_omission: parseInt(minInput.value),
        max_gap_from_max: parseInt(maxInput.value),
        recent_periods: parseInt(recentPeriodsInput.value),
        enabled: enabledInput.checked ? 1 : 0,
        priority_level: config.priority_level
    };

    saveMonitorConfig(updatedConfig);
}

/**
 * 批量保存所有配置
 */
function batchSaveAllConfigs() {
    const updatedConfigs = [];

    allConfigs.forEach(cfg => {
        const minInput = document.querySelector(`input[data-config-id="${cfg.id}"][data-field="min_current_omission"]`);
        const maxInput = document.querySelector(`input[data-config-id="${cfg.id}"][data-field="max_gap_from_max"]`);
        const recentPeriodsInput = document.querySelector(`input[data-config-id="${cfg.id}"][data-field="recent_periods"]`);
        const enabledInput = document.querySelector(`input.config-enabled[data-config-id="${cfg.id}"]`);

        updatedConfigs.push({
            lottery_type: cfg.lottery_type,
            analysis_type: cfg.analysis_type,
            detail: cfg.detail,
            min_current_omission: parseInt(minInput.value),
            max_gap_from_max: parseInt(maxInput.value),
            recent_periods: parseInt(recentPeriodsInput.value),
            enabled: enabledInput.checked ? 1 : 0,
            priority_level: cfg.priority_level
        });
    });

    batchSaveConfigs(updatedConfigs);
}

/**
 * 恢复默认值
 */
function resetToDefaults() {
    if (!confirm('确定要将所有配置恢复为默认值吗？\n\n默认值：最小当前遗漏=8，距离最大遗漏=3，近期期数=200')) {
        return;
    }

    const defaultConfigs = allConfigs.map(cfg => ({
        lottery_type: cfg.lottery_type,
        analysis_type: cfg.analysis_type,
        detail: cfg.detail,
        min_current_omission: 8,
        max_gap_from_max: 3,
        recent_periods: 200,
        enabled: 1,
        priority_level: 'medium'
    }));

    batchSaveConfigs(defaultConfigs);
}

/**
 * 获取分析类型名称
 */
function getAnalysisTypeName(type) {
    const names = {
        'hot20': '🔥 去10最热20',
        'plus_minus6': '➕➖ 加减前6码',
        'plus_range': '📈 +1~+20区间',
        'minus_range': '📉 -1~-20区间',
        'favorite_numbers': '⭐ 关注号码',
        'each_issue': '📊 每期分析',
        'front6_szz': '🎯 前6码三中三',
        'seventh_range': '7️⃣ 第7码区间',
        'second_fourxiao': '2️⃣ 第二码4肖',
        'five_period_threexiao': '5️⃣ 5期3肖',
        'place_results': '📍 关注点登记结果',
        'recommend8': '8️⃣ 推荐8码',
        'recommend16': '🔢 推荐16码',
        'recommend30': '3️⃣0️⃣ 推荐30码',
        'seventh_smart20': '🧠 第7码智能推荐20码',
        'high20': '🚀 高20码分析',
        'color_analysis': '🎨 波色分析'
    };
    return names[type] || type;
}

/**
 * 切换彩种
 */
function switchConfigType(type) {
    currentConfigType = type;

    // 更新按钮状态
    const buttons = document.querySelectorAll('#omissionMonitorConfigPage .lottery-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    // 重新加载配置
    fetchMonitorConfigs(type);
}

/**
 * 同步澳门配置到香港
 */
async function syncConfigToHK() {
    if (!confirm('确认将澳门的所有配置同步到香港吗?\n\n⚠️ 这将覆盖香港的所有现有配置!')) {
        return;
    }

    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/sync_config_am_to_hk`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }
        );

        const result = await response.json();

        if (response.ok) {
            showSuccess(`同步成功!\n已同步 ${result.synced_count} 个配置`);
            // 如果当前显示香港,刷新页面
            if (currentConfigType === 'hk') {
                fetchMonitorConfigs('hk');
            }
        } else {
            throw new Error(result.detail || '同步失败');
        }
    } catch (error) {
        console.error('同步配置失败:', error);
        showError('同步失败：' + error.message);
    }
}

// ==================== 提示函数 ====================

function showSuccess(message) {
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// ==================== 页面初始化 ====================

function initOmissionMonitorConfig() {
    console.log('初始化遗漏监控配置页面');
    fetchMonitorConfigs(currentConfigType);
}

// ==================== 导出函数 ====================

window.OmissionMonitorConfig = {
    init: initOmissionMonitorConfig,
    fetch: fetchMonitorConfigs,
    switchType: switchConfigType,
    refresh: () => fetchMonitorConfigs(currentConfigType) // 刷新当前彩种的配置
};

// 导出到全局作用域
window.batchSaveAllConfigs = batchSaveAllConfigs;
window.resetToDefaults = resetToDefaults;
window.syncConfigToHK = syncConfigToHK;
