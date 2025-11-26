/**
 * 5期3肖计算前端逻辑
 */

// 全局变量
let currentLotteryType = 'am';
let fivePeriodCurrentPage = 1;
let currentPageSize = 30;
let currentData = null;

/**
 * 初始化5期3肖计算功能
 */
function initFivePeriodThreexiao() {
    console.log('初始化5期3肖计算功能');

    // 绑定彩种选择按钮事件
    bindLotteryTypeButtons();

    // 绑定开始分析按钮事件
    bindStartAnalysisButton();

    // 初始化年份选择器
    initYearSelect();
}

/**
 * 绑定彩种选择按钮事件
 */
function bindLotteryTypeButtons() {
    const buttons = document.querySelectorAll('#fivePeriodThreexiaoPage .seventh-range-type-btn');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // 移除所有按钮的active类
            buttons.forEach(btn => btn.classList.remove('active'));
            // 为当前按钮添加active类
            this.classList.add('active');
            // 更新当前彩种
            currentLotteryType = this.getAttribute('data-type');
            console.log('选择彩种:', currentLotteryType);
        });
    });
}

/**
 * 绑定开始分析按钮事件
 */
function bindStartAnalysisButton() {
    const startBtn = document.getElementById('startFivePeriodThreexiaoBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function() {
            console.log('开始5期3肖计算分析，彩种:', currentLotteryType);
            startFivePeriodThreexiaoAnalysis();
        });
    }
}

/**
 * 初始化年份选择器
 */
function initYearSelect() {
    const yearSelect = document.getElementById('fivePeriodThreexiaoYearSelect');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= 2020; y--) {
            const option = document.createElement('option');
            option.value = y;
            option.textContent = y + '年';
            yearSelect.appendChild(option);
        }
    }
}

/**
 * 开始5期3肖计算分析
 */
async function startFivePeriodThreexiaoAnalysis() {
    const resultDiv = document.getElementById('fivePeriodThreexiaoResult');
    const statsDiv = document.getElementById('fivePeriodThreexiaoStats');
    
    // 显示加载状态
    resultDiv.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #2980d9; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="margin-top: 16px; color: #666;">正在分析5期3肖计算数据...</p>
        </div>
    `;
    
    // 添加旋转动画样式
    if (!document.getElementById('spinStyle')) {
        const style = document.createElement('style');
        style.id = 'spinStyle';
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    try {
        // 获取年份筛选
        const yearSelect = document.getElementById('fivePeriodThreexiaoYearSelect');
        const selectedYear = yearSelect ? yearSelect.value : '';

        // 调用API获取数据
        let url = `${window.BACKEND_URL}/api/five_period_threexiao?lottery_type=${currentLotteryType}&page=${fivePeriodCurrentPage}&page_size=${currentPageSize}`;
        if (selectedYear) {
            url += `&year=${selectedYear}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            currentData = data.data;
            displayFivePeriodThreexiaoResults(data.data);
            displayFivePeriodThreexiaoStats(data.data);
            statsDiv.style.display = 'block';
        } else {
            throw new Error(data.message || '获取数据失败');
        }
    } catch (error) {
        console.error('5期3肖计算分析失败:', error);
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>分析失败</h3>
                <p>${error.message}</p>
                <button onclick="startFivePeriodThreexiaoAnalysis()" class="btn-primary" style="margin-top: 16px;">重试</button>
            </div>
        `;
        statsDiv.style.display = 'none';
    }
}

/**
 * 显示5期3肖计算结果
 */
function displayFivePeriodThreexiaoResults(data) {
    const resultDiv = document.getElementById('fivePeriodThreexiaoResult');
    
    if (!data.results || data.results.length === 0) {
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <h3>暂无数据</h3>
                <p>没有找到符合条件的5期3肖计算数据</p>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="table-container">
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="color: #2980d9; margin: 0;">分析结果</h3>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <label style="font-weight: bold; color: #495057;">每页显示：</label>
                    <select id="pageSizeSelect" onchange="changePageSize()" style="padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">
                        <option value="10" ${currentPageSize === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${currentPageSize === 20 ? 'selected' : ''}>20</option>
                        <option value="30" ${currentPageSize === 30 ? 'selected' : ''}>30</option>
                        <option value="50" ${currentPageSize === 50 ? 'selected' : ''}>50</option>
                    </select>
                    <button onclick="exportToCSV()" class="btn-secondary" style="padding: 6px 12px; font-size: 14px;">导出CSV</button>
                </div>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>触发期数</th>
                        <th>开奖时间</th>
                        <th>前3个号码</th>
                        <th>生成号码</th>
                        <th>窗口期(后5期)</th>
                        <th>窗口第7个号码</th>
                        <th>是否命中</th>
                        <th>命中期</th>
                        <th>当前遗漏</th>
                        <th>最大遗漏</th>
                        <th>历史最大遗漏</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    data.results.forEach(item => {
        const isHit = item.is_hit;
        const hitClass = isHit ? 'hit-yes' : 'hit-no';
        const hitText = isHit ? '命中' : '遗漏';
        
        html += `
            <tr>
                <td style="font-weight: bold; color: #2980d9;">${item.trigger_period}</td>
                <td>${item.open_time}</td>
                <td>
                    <div style="display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;">
                        ${item.first_three_numbers.map(num => `<span class="ball-red" style="padding: 2px 6px; border-radius: 3px; font-size: 12px;">${num}</span>`).join('')}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 2px; flex-wrap: wrap; justify-content: center; max-width: 200px;">
                        ${item.generated_numbers.map(num => `<span class="ball-blue" style="padding: 1px 4px; border-radius: 2px; font-size: 11px;">${num}</span>`).join('')}
                    </div>
                </td>
                <td>
                    <div style="font-size: 12px; color: #666;">
                        ${item.window_periods.join(', ')}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 2px; flex-wrap: wrap; justify-content: center;">
                        ${item.window_seventh_numbers.map(num => 
                            num ? `<span class="ball-green" style="padding: 1px 4px; border-radius: 2px; font-size: 11px;">${num}</span>` : 
                            '<span style="color: #999; font-size: 11px;">-</span>'
                        ).join('')}
                    </div>
                </td>
                <td>
                    <span class="${hitClass}" style="font-weight: bold; padding: 4px 8px; border-radius: 4px; background: ${isHit ? '#d4edda' : '#f8d7da'};">
                        ${hitText}
                    </span>
                </td>
                <td style="color: #666; font-size: 12px;">${item.hit_period || '-'}</td>
                <td>
                    <span style="color: #e74c3c; font-weight: bold;">${item.current_miss}</span>
                </td>
                <td>
                    <span style="color: #f39c12; font-weight: bold;">${item.max_miss}</span>
                </td>
                <td>
                    <span style="color: #8e44ad; font-weight: bold;">${item.history_max_miss}</span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    // 添加分页控件
    if (data.total_pages > 1) {
        html += createPaginationControls(data);
    }
    
    resultDiv.innerHTML = html;
}

/**
 * 显示5期3肖计算统计信息
 */
function displayFivePeriodThreexiaoStats(data) {
    document.getElementById('fivePeriodThreexiaoTotal').textContent = data.total_triggers || 0;
    document.getElementById('fivePeriodThreexiaoHitCount').textContent = data.hit_count || 0;
    document.getElementById('fivePeriodThreexiaoMissCount').textContent = data.miss_count || 0;
    document.getElementById('fivePeriodThreexiaoHitRate').textContent = (data.hit_rate || 0) + '%';
    document.getElementById('fivePeriodThreexiaoCurrentMiss').textContent = data.current_miss || 0;
    document.getElementById('fivePeriodThreexiaoMaxMiss').textContent = data.max_miss || 0;
    document.getElementById('fivePeriodThreexiaoHistoryMaxMiss').textContent = data.history_max_miss || 0;
}

/**
 * 创建分页控件
 */
function createPaginationControls(data) {
    const totalPages = data.total_pages;
    const fivePeriodCurrentPage = data.page;
    
    let html = `
        <div class="pagination-container">
            <div class="pagination-info">
                <span>显示第 ${(fivePeriodCurrentPage - 1) * currentPageSize + 1} - ${Math.min(fivePeriodCurrentPage * currentPageSize, data.total_triggers)} 条，共 ${data.total_triggers} 条记录</span>
            </div>
            <div class="pagination-controls">
    `;
    
    // 上一页按钮
    html += `
        <button class="pagination-btn" ${fivePeriodCurrentPage <= 1 ? 'disabled' : ''} onclick="changePage(${fivePeriodCurrentPage - 1})">
            上一页
        </button>
    `;
    
    // 页码按钮
    const startPage = Math.max(1, fivePeriodCurrentPage - 2);
    const endPage = Math.min(totalPages, fivePeriodCurrentPage + 2);
    
    if (startPage > 1) {
        html += `<button class="pagination-btn" onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 0 8px;">...</span>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === fivePeriodCurrentPage;
        html += `
            <button class="pagination-btn ${isActive ? 'active' : ''}" onclick="changePage(${i})" ${isActive ? 'disabled' : ''}>
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 0 8px;">...</span>`;
        }
        html += `<button class="pagination-btn" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // 下一页按钮
    html += `
        <button class="pagination-btn" ${fivePeriodCurrentPage >= totalPages ? 'disabled' : ''} onclick="changePage(${fivePeriodCurrentPage + 1})">
            下一页
        </button>
    `;
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * 改变页码
 */
function changePage(page) {
    if (page < 1) return;
    fivePeriodCurrentPage = page;
    startFivePeriodThreexiaoAnalysis();
}

/**
 * 改变每页显示数量
 */
function changePageSize() {
    const select = document.getElementById('pageSizeSelect');
    currentPageSize = parseInt(select.value);
    fivePeriodCurrentPage = 1;
    startFivePeriodThreexiaoAnalysis();
}

/**
 * 导出CSV
 */
async function exportToCSV() {
    try {
        const yearSelect = document.getElementById('fivePeriodThreexiaoYearSelect');
        const selectedYear = yearSelect ? yearSelect.value : '';

        let url = `${window.BACKEND_URL}/api/five_period_threexiao?lottery_type=${currentLotteryType}&export=csv`;
        if (selectedYear) {
            url += `&year=${selectedYear}`;
        }
        const response = await fetch(url);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `five_period_threexiao_${currentLotteryType}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } else {
            throw new Error('导出失败');
        }
    } catch (error) {
        console.error('导出CSV失败:', error);
        alert('导出失败: ' + error.message);
    }
}

// 导出初始化函数供pages.js调用
window.initFivePeriodThreexiao = initFivePeriodThreexiao;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 检查是否在5期3肖计算页面
    if (document.getElementById('fivePeriodThreexiaoPage')) {
        initFivePeriodThreexiao();
    }
});
