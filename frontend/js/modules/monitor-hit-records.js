/**
 * 监控命中记录模块
 * 显示监控系统预警后实际命中的详细记录
 */

(function() {
'use strict';

// ==================== 状态管理 ====================

let currentType = 'am';
let currentPage = 1;
let pageSize = 20;

// ==================== 核心功能函数 ====================

/**
 * 初始化监控命中记录页面
 */
function initMonitorHitRecords() {
    console.log('初始化监控命中记录页面...');

    const page = document.getElementById('monitorHitRecordsPage');
    if (!page) {
        console.error('未找到监控命中记录页面元素');
        return;
    }

    page.innerHTML = `
        <div style="padding:20px;">
            <!-- 标题 -->
            <h2 style="color:#1976d2;margin:0 0 20px 0;">📊 监控命中记录</h2>

            <!-- 彩种选择 -->
            <div style="margin-bottom:20px;">
                <button class="lottery-type-btn active" data-type="am" onclick="window.MonitorHitRecords.switchType('am')">澳门</button>
                <button class="lottery-type-btn" data-type="hk" onclick="window.MonitorHitRecords.switchType('hk')">香港</button>
                <button class="refresh-btn" onclick="window.MonitorHitRecords.loadRecords()" style="margin-left:20px;">🔄 刷新</button>
            </div>

            <!-- 统计信息 -->
            <div id="monitorHitStats" style="margin-bottom:20px;"></div>

            <!-- 记录列表 -->
            <div id="monitorHitRecordsList"></div>

            <!-- 分页 -->
            <div id="monitorHitPagination" style="margin-top:20px;text-align:center;"></div>
        </div>
    `;

    // 加载统计和记录
    loadStats();
    loadRecords();
}

/**
 * 切换彩种
 */
function switchType(type) {
    currentType = type;
    currentPage = 1;

    // 更新按钮状态
    const buttons = document.querySelectorAll('.lottery-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-type') === type) {
            btn.classList.add('active');
        }
    });

    // 重新加载数据
    loadStats();
    loadRecords();
}

/**
 * 加载统计信息
 */
async function loadStats() {
    const statsDiv = document.getElementById('monitorHitStats');
    if (!statsDiv) return;

    statsDiv.innerHTML = '<div style="text-align:center;color:#999;">加载统计中...</div>';

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/monitor/hit_stats?lottery_type=${currentType}`);
        const data = await response.json();

        if (data.success) {
            renderStats(data);
        } else {
            statsDiv.innerHTML = '<div style="text-align:center;color:#f44336;">加载统计失败</div>';
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        statsDiv.innerHTML = '<div style="text-align:center;color:#f44336;">加载统计失败</div>';
    }
}

/**
 * 渲染统计信息
 */
function renderStats(data) {
    const statsDiv = document.getElementById('monitorHitStats');
    if (!statsDiv) return;

    const byType = data.by_analysis_type || [];

    let html = `
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:20px;border-radius:10px;color:white;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;">
                <div style="text-align:center;">
                    <div style="font-size:32px;font-weight:bold;">${data.total_hits || 0}</div>
                    <div style="opacity:0.9;margin-top:5px;">总命中次数</div>
                </div>
    `;

    // 显示各类型的命中统计
    byType.slice(0, 3).forEach(item => {
        html += `
            <div style="text-align:center;">
                <div style="font-size:24px;font-weight:bold;">${item.hit_count}</div>
                <div style="opacity:0.9;margin-top:5px;">${getAnalysisTypeName(item.analysis_type)}</div>
                <div style="opacity:0.7;font-size:12px;">平均${Math.round(item.avg_wait_periods || 0)}期命中</div>
            </div>
        `;
    });

    html += `
            </div>
        </div>
    `;

    statsDiv.innerHTML = html;
}

/**
 * 加载命中记录
 */
async function loadRecords() {
    const listDiv = document.getElementById('monitorHitRecordsList');
    if (!listDiv) return;

    listDiv.innerHTML = '<div style="text-align:center;color:#999;padding:40px;">加载记录中...</div>';

    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/monitor/hit_records?lottery_type=${currentType}&page=${currentPage}&page_size=${pageSize}`
        );
        const data = await response.json();

        if (data.success) {
            renderRecords(data);
            renderPagination(data);
        } else {
            listDiv.innerHTML = '<div style="text-align:center;color:#f44336;padding:40px;">加载记录失败</div>';
        }
    } catch (error) {
        console.error('加载记录失败:', error);
        listDiv.innerHTML = '<div style="text-align:center;color:#f44336;padding:40px;">加载记录失败</div>';
    }
}

/**
 * 渲染命中记录
 */
function renderRecords(data) {
    const listDiv = document.getElementById('monitorHitRecordsList');
    if (!listDiv) return;

    const records = data.records || [];

    if (records.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center;color:#999;padding:40px;">暂无命中记录</div>';
        return;
    }

    let html = `
        <div style="overflow-x:auto;">
            <table style="width:100%;border-collapse:collapse;background:white;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                <thead>
                    <tr style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;">
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">分析类型</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">详情</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">预警期号</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">预警遗漏</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">命中期号</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">命中号码</th>
                        <th style="padding:12px;text-align:center;border-right:1px solid rgba(255,255,255,0.2);">等待期数</th>
                        <th style="padding:12px;text-align:center;">命中时间</th>
                    </tr>
                </thead>
                <tbody>
    `;

    records.forEach((record, index) => {
        const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
        const hitNumbers = record.hit_numbers ? record.hit_numbers.split(',') : [];

        html += `
            <tr style="background:${bgColor};border-bottom:1px solid #e0e0e0;">
                <td style="padding:12px;text-align:center;">${getAnalysisTypeName(record.analysis_type)}</td>
                <td style="padding:12px;text-align:center;">${record.detail || '-'}</td>
                <td style="padding:12px;text-align:center;font-weight:bold;color:#1976d2;">${record.alert_period}</td>
                <td style="padding:12px;text-align:center;">
                    <span style="color:#f44336;">${record.alert_omission}</span>
                    <span style="color:#999;font-size:12px;">/${record.max_omission}</span>
                </td>
                <td style="padding:12px;text-align:center;font-weight:bold;color:#4caf50;">${record.hit_period}</td>
                <td style="padding:12px;text-align:center;">
                    ${hitNumbers.map((num, idx) => {
                        const isHitNum = num === record.hit_number;
                        return `<span style="display:inline-block;margin:2px;padding:4px 8px;border-radius:4px;
                                background:${isHitNum ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' : '#e0e0e0'};
                                color:${isHitNum ? 'white' : '#333'};font-weight:${isHitNum ? 'bold' : 'normal'};">
                                ${num}</span>`;
                    }).join('')}
                </td>
                <td style="padding:12px;text-align:center;">
                    <span style="color:${record.wait_periods === 0 ? '#4caf50' : '#ff9800'};font-weight:bold;">
                        ${record.wait_periods}期
                    </span>
                </td>
                <td style="padding:12px;text-align:center;font-size:12px;color:#666;">
                    ${new Date(record.hit_time).toLocaleString('zh-CN')}
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    listDiv.innerHTML = html;
}

/**
 * 渲染分页
 */
function renderPagination(data) {
    const paginationDiv = document.getElementById('monitorHitPagination');
    if (!paginationDiv) return;

    const totalPages = data.total_pages || 1;

    if (totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<div style="display:flex;justify-content:center;align-items:center;gap:10px;">';

    // 上一页
    if (currentPage > 1) {
        html += `<button onclick="window.MonitorHitRecords.goToPage(${currentPage - 1})"
                        style="padding:8px 16px;border:1px solid #1976d2;background:white;color:#1976d2;border-radius:4px;cursor:pointer;">
                    上一页
                 </button>`;
    }

    // 页码
    html += `<span style="color:#666;">第 ${currentPage} / ${totalPages} 页 (共 ${data.total} 条)</span>`;

    // 下一页
    if (currentPage < totalPages) {
        html += `<button onclick="window.MonitorHitRecords.goToPage(${currentPage + 1})"
                        style="padding:8px 16px;border:1px solid #1976d2;background:white;color:#1976d2;border-radius:4px;cursor:pointer;">
                    下一页
                 </button>`;
    }

    html += '</div>';
    paginationDiv.innerHTML = html;
}

/**
 * 跳转到指定页
 */
function goToPage(page) {
    currentPage = page;
    loadRecords();
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
        'recommend16': '🔢 推荐16码'
    };
    return names[type] || type;
}

// ==================== 导出函数 ====================

window.MonitorHitRecords = {
    init: initMonitorHitRecords,
    switchType: switchType,
    loadRecords: loadRecords,
    goToPage: goToPage
};

console.log('✅ 监控命中记录模块已加载');

})(); // 闭包结束
