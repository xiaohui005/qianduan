/**
 * 遗漏监控模块
 * 负责监控各种分析的遗漏情况，找出接近爆发的号码组合
 * 使用数据库配置，每个监控点有独立的参数
 */

// ==================== 状态管理 ====================

let currentMonitorType = 'am'; // 当前选择的彩种

// ==================== 核心功能函数 ====================

/**
 * 获取遗漏监控数据（使用数据库配置）
 * @param {string} type - 彩种类型 (am/hk)
 */
async function fetchOmissionAlerts(type = 'am') {
    const resultDiv = document.getElementById('omissionMonitorResult');

    // 显示加载状态
    resultDiv.innerHTML = '<div style="text-align:center;color:#1976d2;padding:20px;">正在扫描遗漏数据...</div>';

    try {
        // 调用V2 API（使用数据库配置）
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/omission_alerts_v2?lottery_type=${type}`
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        // 渲染结果
        renderOmissionAlerts(data, type);

    } catch (error) {
        console.error('获取遗漏监控数据失败:', error);
        resultDiv.innerHTML = `<div style="text-align:center;color:#f44336;padding:20px;">获取数据失败：${error.message}</div>`;
    }
}

/**
 * 渲染遗漏监控结果
 * @param {Object} data - 监控数据
 * @param {string} type - 彩种类型
 */
function renderOmissionAlerts(data, type) {
    const resultDiv = document.getElementById('omissionMonitorResult');

    if (!data.alerts || data.alerts.length === 0) {
        const message = data.message || '当前没有满足条件的遗漏预警';
        resultDiv.innerHTML = `
            <div style="text-align:center;color:#757575;padding:40px;">
                <div style="font-size:48px;margin-bottom:10px;">✓</div>
                <div style="font-size:18px;font-weight:500;">暂无预警</div>
                <div style="font-size:14px;margin-top:10px;color:#9e9e9e;">
                    ${message}
                </div>
                <div style="font-size:13px;margin-top:10px;color:#999;">
                    已启用配置数：${data.config_count || 0}
                </div>
            </div>
        `;
        return;
    }

    let html = '<div class="omission-monitor-container">';

    // 显示统计摘要
    html += `
        <div class="monitor-summary" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:20px;border-radius:8px;margin-bottom:20px;">
            <div style="font-size:24px;font-weight:600;margin-bottom:10px;">遗漏监控预警</div>
            <div style="display:flex;gap:20px;flex-wrap:wrap;">
                <div style="flex:1;min-width:150px;">
                    <div style="font-size:14px;opacity:0.9;">总预警数</div>
                    <div style="font-size:32px;font-weight:700;margin-top:5px;">${data.total_alerts}</div>
                </div>
                <div style="flex:1;min-width:150px;">
                    <div style="font-size:14px;opacity:0.9;">高优先级</div>
                    <div style="font-size:32px;font-weight:700;margin-top:5px;color:#ffeb3b;">${data.summary.high_priority}</div>
                </div>
                <div style="flex:1;min-width:150px;">
                    <div style="font-size:14px;opacity:0.9;">中优先级</div>
                    <div style="font-size:32px;font-weight:700;margin-top:5px;color:#ffc107;">${data.summary.medium_priority}</div>
                </div>
            </div>
            <div style="font-size:13px;margin-top:15px;opacity:0.85;">
                使用数据库配置进行监控 | 已启用配置数：${data.config_count || 0}
            </div>
        </div>
    `;

    // 创建预警表格
    html += `
        <table class="data-table" style="border-collapse:collapse;width:100%;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
            <thead>
                <tr style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);">
                    <th style="padding:12px;width:80px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">优先级</th>
                    <th style="padding:12px;width:120px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">分析类型</th>
                    <th style="padding:12px;width:100px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">详情</th>
                    <th style="padding:12px;width:100px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">期号</th>
                    <th style="padding:12px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">推荐号码</th>
                    <th style="padding:12px;width:80px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">当前遗漏</th>
                    <th style="padding:12px;width:80px;color:white;font-weight:700;font-size:14px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">最大遗漏</th>
                    <th style="padding:12px;width:80px;color:white;font-weight:700;font-size:14px;text-align:center;">距离最大</th>
                </tr>
            </thead>
            <tbody>
    `;

    // 渲染每个预警项
    data.alerts.forEach((alert, index) => {
        const priorityColor = getPriorityColor(alert.priority);
        const priorityLabel = getPriorityLabel(alert.priority);

        html += `
            <tr style="border-bottom:1px solid #e0e0e0;${index % 2 === 0 ? 'background:#fafafa;' : ''}">
                <td style="padding:12px;text-align:center;">
                    <span style="display:inline-block;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600;background:${priorityColor};color:white;">
                        ${priorityLabel}
                    </span>
                </td>
                <td style="padding:12px;text-align:center;font-weight:500;">
                    ${alert.analysis_type_label || alert.analysis_type}
                </td>
                <td style="padding:12px;text-align:center;color:#1976d2;font-weight:500;">
                    ${alert.detail}
                </td>
                <td style="padding:12px;text-align:center;font-family:monospace;">
                    ${alert.period}
                </td>
                <td style="padding:12px;">
                    ${renderAlertNumbers(alert)}
                </td>
                <td style="padding:12px;text-align:center;font-size:20px;font-weight:700;color:#f44336;">
                    ${alert.current_omission}
                </td>
                <td style="padding:12px;text-align:center;font-size:16px;font-weight:600;color:#757575;">
                    ${alert.max_omission}
                </td>
                <td style="padding:12px;text-align:center;font-size:18px;font-weight:600;color:#ff9800;">
                    ${alert.gap_from_max}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    html += '</div>';
    resultDiv.innerHTML = html;
}

/**
 * 渲染预警号码
 * @param {Object} alert - 预警数据
 */
function renderAlertNumbers(alert) {
    if (alert.numbers.includes('±')) {
        // 加减前6码格式
        return `<span style="font-size:14px;color:#1976d2;font-weight:500;">${alert.numbers}</span>`;
    }

    // 号码列表格式
    const numbers = alert.numbers.split(',').map(n => n.trim());
    let html = '<div style="display:flex;flex-wrap:wrap;gap:3px;">';

    numbers.forEach(num => {
        const paddedNum = String(num).padStart(2, '0');
        const colorClass = getBallColorClass(paddedNum);

        html += `
            <span class="number-ball ${colorClass}" style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:13px;font-weight:500;">
                ${paddedNum}
            </span>
        `;
    });

    html += '</div>';
    return html;
}

/**
 * 获取优先级颜色
 * @param {string} priority - 优先级
 */
function getPriorityColor(priority) {
    const colors = {
        'high': '#f44336',
        'medium': '#ff9800',
        'low': '#4caf50'
    };
    return colors[priority] || '#757575';
}

/**
 * 获取优先级标签
 * @param {string} priority - 优先级
 */
function getPriorityLabel(priority) {
    const labels = {
        'high': '高',
        'medium': '中',
        'low': '低'
    };
    return labels[priority] || '-';
}

/**
 * 刷新监控（手动触发）
 */
function refreshMonitor() {
    fetchOmissionAlerts(currentMonitorType);
}

/**
 * 切换彩种
 * @param {string} type - 彩种类型 (am/hk)
 */
function switchMonitorType(type) {
    currentMonitorType = type;

    // 更新按钮状态
    const buttons = document.querySelectorAll('#omissionMonitorPage .lottery-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    // 重新加载数据
    fetchOmissionAlerts(type);
}

// ==================== 页面初始化 ====================

/**
 * 初始化遗漏监控页面
 */
function initOmissionMonitor() {
    console.log('初始化遗漏监控页面（使用数据库配置）');

    // 自动加载监控数据
    fetchOmissionAlerts(currentMonitorType);
}

// ==================== 导出函数供外部调用 ====================

window.OmissionMonitor = {
    init: initOmissionMonitor,
    fetch: fetchOmissionAlerts,
    switchType: switchMonitorType,
    refreshMonitor: refreshMonitor
};
