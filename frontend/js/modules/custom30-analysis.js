/**
 * 自主30码选择分析模块
 * 最热10码 + 温号10码 + 最冷10码 = 30码
 */

// 页面渲染函数
window.renderCustom30AnalysisPage = function() {
    const container = document.getElementById('custom30AnalysisPage');
    container.innerHTML = `
        <div class="page-header">
            <h2>🎯 自适应智能30码</h2>
            <p class="page-description">🔄 自适应策略：根据历史集中度动态调整选号</p>
            <ul style="text-align: left; margin: 10px auto; max-width: 800px; font-size: 14px;">
                <li>📊 高频集中（Top10占比>70%）→ 重点选高频号码</li>
                <li>🌐 低频分散（Top10占比<60%）→ 均衡选择+回补</li>
                <li>⚖️ 中等集中（Top10占比60%-70%）→ 平衡策略</li>
                <li>💰 严格控制30码，成本最优</li>
            </ul>
        </div>

        <!-- 查询条件 -->
        <div class="filter-section">
            <div class="filter-row">
                <label>彩种类型：</label>
                <select id="custom30LotteryType" class="filter-select">
                    <option value="am">澳门</option>
                    <option value="hk">香港</option>
                </select>

                <label>年份筛选：</label>
                <input type="number" id="custom30Year" class="filter-input" placeholder="如：2025" min="2020" max="2030">

                <button onclick="queryCustom30Analysis()" class="btn btn-primary">📊 查询</button>
                <button onclick="exportCustom30AnalysisCsv()" class="btn btn-success">📥 导出CSV</button>
            </div>
        </div>

        <!-- 周统计和遗漏查看按钮 -->
        <div class="filter-section">
            <button onclick="showCustom30WeekStats()" class="btn btn-info">📈 查看周统计</button>
            <span class="tip-text">（目标：每周最多错2期）</span>
            <button onclick="showCustom30Omission()" class="btn btn-warning" style="margin-left: 15px;">🔍 查看推荐30码遗漏</button>
            <span class="tip-text">（显示最新推荐30码的遗漏情况）</span>
        </div>

        <!-- 结果表格 -->
        <div id="custom30AnalysisResult"></div>

        <!-- 周统计结果 -->
        <div id="custom30WeekStatsResult" style="display: none; margin-top: 20px;"></div>

        <!-- 推荐30码遗漏结果 -->
        <div id="custom30OmissionResult" style="display: none; margin-top: 20px;"></div>
    `;
};

// 查询自主30码分析
window.queryCustom30Analysis = async function(page = 1) {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30AnalysisResult');

    // 隐藏周统计
    document.getElementById('custom30WeekStatsResult').style.display = 'none';

    resultDiv.innerHTML = '<div class="loading">正在加载数据...</div>';

    try {
        const result = await API.getCustom30Analysis(lotteryType, page, 50, year);

        if (!result.success) {
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            resultDiv.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }

        // 渲染表格
        let html = `
            <div class="result-header">
                <h3>分析结果</h3>
                <p>共 ${result.total} 条记录，当前第 ${result.page} 页</p>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>期号</th>
                            <th>开奖时间</th>
                            <th>年份-周数</th>
                            <th>评分前10码</th>
                            <th>评分11-20码</th>
                            <th>评分21-30码</th>
                            <th>智能30码</th>
                            <th>下期期号</th>
                            <th>下期第7码</th>
                            <th>是否命中</th>
                            <th>遗漏值</th>
                            <th>最大遗漏</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        result.data.forEach(item => {
            const isHit = item.is_hit;
            const hitClass = isHit === true ? 'hit' : (isHit === false ? 'miss' : '');
            const hitText = isHit === true ? '✓ 命中' : (isHit === false ? '✗ 遗漏' : '-');

            html += `
                <tr>
                    <td>${item.period}</td>
                    <td>${item.open_time || '-'}</td>
                    <td>${item.week_year && item.week_number ? `${item.week_year}-W${String(item.week_number).padStart(2, '0')}` : '-'}</td>
                    <td class="numbers-cell hot">${formatNumbersWithColor(item.hot10)}</td>
                    <td class="numbers-cell warm">${formatNumbersWithColor(item.warm10)}</td>
                    <td class="numbers-cell cold">${formatNumbersWithColor(item.cold10)}</td>
                    <td class="numbers-cell custom30">${formatNumbersWithColor(item.custom30)}</td>
                    <td>${item.next_period || '-'}</td>
                    <td class="number-ball ${hitClass}">${item.next_number !== null ? formatNumberBall(item.next_number) : '-'}</td>
                    <td class="${hitClass}">${hitText}</td>
                    <td>${item.miss_count !== null ? item.miss_count : '-'}</td>
                    <td>${item.max_miss !== null ? item.max_miss : '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // 添加分页
        if (result.total > result.page_size) {
            const totalPages = Math.ceil(result.total / result.page_size);
            html += createPagination(result.page, totalPages, (p) => `queryCustom30Analysis(${p})`);
        }

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询失败:', error);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 查看周统计
window.showCustom30WeekStats = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30WeekStatsResult');

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">正在加载周统计数据...</div>';

    try {
        const result = await API.getCustom30WeekStats(lotteryType, year);

        if (!result.success) {
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            resultDiv.innerHTML = '<div class="no-data">暂无周统计数据</div>';
            return;
        }

        const summary = result.summary;

        // 渲染周统计表格
        let html = `
            <div class="result-header">
                <h3>📈 周统计分析</h3>
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="card-value">${summary.total_weeks}</div>
                        <div class="card-label">总周数</div>
                    </div>
                    <div class="summary-card">
                        <div class="card-value success">${summary.target_met_weeks}</div>
                        <div class="card-label">达标周数</div>
                    </div>
                    <div class="summary-card">
                        <div class="card-value ${summary.target_met_rate >= 80 ? 'success' : 'warning'}">${summary.target_met_rate}%</div>
                        <div class="card-label">达标率</div>
                    </div>
                </div>
                <p class="target-info">目标：每周最多错2期（即遗漏≤2期）</p>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>周</th>
                            <th>总期数</th>
                            <th>命中期数</th>
                            <th>遗漏期数</th>
                            <th>命中率</th>
                            <th>是否达标</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        result.data.forEach(week => {
            const targetClass = week.is_target_met ? 'success' : 'danger';
            const targetText = week.is_target_met ? '✓ 达标' : '✗ 未达标';

            html += `
                <tr class="${targetClass}-row">
                    <td><strong>${week.week}</strong></td>
                    <td>${week.total}</td>
                    <td class="success">${week.hit}</td>
                    <td class="danger">${week.miss}</td>
                    <td>${week.hit_rate}%</td>
                    <td class="${targetClass}">${targetText}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询周统计失败:', error);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 导出CSV
window.exportCustom30AnalysisCsv = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;

    try {
        const blob = await API.exportCustom30Analysis(lotteryType, year);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom30_${lotteryType}_${year || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
    }
};

// 格式化号码（带颜色）
function formatNumbersWithColor(numbersStr) {
    if (!numbersStr) return '-';
    const numbers = numbersStr.split(',').map(n => n.trim());
    return numbers.map(n => formatNumberBall(parseInt(n))).join(' ');
}

// 格式化单个号码为带颜色的球
function formatNumberBall(num) {
    const numStr = String(num).padStart(2, '0');
    const colorClass = window.getBallColorClass ? window.getBallColorClass(numStr) : '';
    return `<span class="ball ${colorClass}">${numStr}</span>`;
}

// 创建分页组件
function createPagination(currentPage, totalPages, onPageClick) {
    let html = '<div class="pagination">';

    // 上一页
    if (currentPage > 1) {
        html += `<button onclick="${onPageClick(currentPage - 1)}" class="btn btn-sm">上一页</button>`;
    }

    // 页码
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="${onPageClick(1)}" class="btn btn-sm">1</button>`;
        if (startPage > 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button onclick="${onPageClick(i)}" class="btn btn-sm ${activeClass}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<button onclick="${onPageClick(totalPages)}" class="btn btn-sm">${totalPages}</button>`;
    }

    // 下一页
    if (currentPage < totalPages) {
        html += `<button onclick="${onPageClick(currentPage + 1)}" class="btn btn-sm">下一页</button>`;
    }

    html += '</div>';
    return html;
}

// 查看推荐30码遗漏情况
window.showCustom30Omission = async function(page = 1) {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30OmissionResult');

    // 隐藏其他结果区域
    document.getElementById('custom30AnalysisResult').style.display = 'none';
    document.getElementById('custom30WeekStatsResult').style.display = 'none';

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">正在加载推荐30码遗漏数据...</div>';

    try {
        const result = await API.getCustom30Omission(lotteryType, page, 50, year);

        if (!result.success) {
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            resultDiv.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }

        // 渲染表格
        let html = `
            <div class="result-header">
                <h3>🎯 推荐30码遗漏情况</h3>
                <p>每期推荐30码可能不同，表格显示每期推荐的30码及命中情况</p>
                <p>共 ${result.total} 期记录，当前第 ${result.page} 页</p>
                <p class="tip-text">遗漏值正序累加：未命中则+1，命中则重置为0</p>
                <button onclick="exportCustom30OmissionCsv()" class="btn btn-success" style="margin-top: 10px;">📥 导出CSV</button>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>期号</th>
                            <th>开奖时间</th>
                            <th>第7码</th>
                            <th>推荐30码</th>
                            <th>是否命中</th>
                            <th>当前遗漏</th>
                            <th>最大遗漏</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        result.data.forEach(item => {
            const isHit = item.is_hit;
            const hitClass = isHit ? 'success' : 'danger';
            const hitText = isHit ? '✓ 是' : '✗ 否';
            
            // 格式化推荐30码，用逗号分隔，每10个换行
            const nums = item.recommended_30.split(',').map(n => String(n.trim()).padStart(2, '0'));
            let formatted30 = '';
            for (let i = 0; i < nums.length; i++) {
                if (i > 0 && i % 10 === 0) {
                    formatted30 += '<br>';
                }
                formatted30 += nums[i];
                if (i < nums.length - 1) {
                    formatted30 += ', ';
                }
            }

            html += `
                <tr>
                    <td style="font-weight: bold;">${item.period}</td>
                    <td>${item.open_time || '-'}</td>
                    <td class="number-ball">${formatNumberBall(item.target_number)}</td>
                    <td style="text-align: left; font-size: 12px; line-height: 1.6;">${formatted30}</td>
                    <td class="${hitClass}">${hitText}</td>
                    <td>${item.omission}</td>
                    <td style="color: #e74c3c; font-weight: bold;">${item.max_omission}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // 添加分页
        if (result.total > result.page_size) {
            const totalPages = Math.ceil(result.total / result.page_size);
            html += createPagination(result.page, totalPages, (p) => `showCustom30Omission(${p})`);
        }

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询推荐30码遗漏失败:', error);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 导出推荐30码遗漏CSV
window.exportCustom30OmissionCsv = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;

    try {
        const blob = await API.exportCustom30Omission(lotteryType, year);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom30_omission_${lotteryType}_${year || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
    }
};

console.log('自主30码选择分析模块已加载');
