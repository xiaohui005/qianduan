/**
 * 模拟倍投测试模块
 *
 * 功能：评估各种分析策略的长期盈亏表现
 */

// 全局配置
const ANALYSIS_TYPES = {
    'recommend8': '推荐8码',
    'recommend16': '推荐16码',
    'hot20': '去10最热20',
    'two_groups': '2组观察分析',
    'seventh_smart': '第7个号码智能推荐20码'
};

let currentTestResult = null;

/**
 * 初始化模拟倍投测试模块
 */
function initSimulationBetting() {
    console.log('初始化模拟倍投测试模块...');

    // 渲染页面HTML
    renderSimulationPage();

    // 绑定事件
    bindSimulationEvents();
}

/**
 * 渲染页面HTML
 */
function renderSimulationPage() {
    const page = document.getElementById('simulationBettingPage');
    if (!page) return;

    page.innerHTML = `
        <div class="simulation-container">
            <h2>📊 模拟倍投测试系统</h2>
            <p class="description">基于历史数据评估不同分析策略的盈亏表现</p>

            <!-- 参数配置面板 -->
            <div class="config-panel card">
                <h3>参数配置</h3>

                <div class="config-grid">
                    <!-- 基础配置 -->
                    <div class="config-row">
                        <label>彩种:</label>
                        <select id="simLotteryType" class="form-control">
                            <option value="am">澳门</option>
                            <option value="hk">香港</option>
                        </select>
                    </div>

                    <div class="config-row">
                        <label>分析类型:</label>
                        <select id="simAnalysisType" class="form-control">
                            <option value="recommend8">推荐8码</option>
                            <option value="recommend16">推荐16码</option>
                            <option value="hot20">去10最热20</option>
                            <option value="two_groups">2组观察分析</option>
                            <option value="seventh_smart">第7个号码智能推荐20码</option>
                        </select>
                    </div>

                    <div class="config-row">
                        <label>测试期数:</label>
                        <input type="number" id="simTestPeriods" class="form-control"
                               value="100" min="10" max="500">
                        <small>范围: 10-500</small>
                    </div>

                    <div class="config-row">
                        <label>起投遗漏期数:</label>
                        <input type="number" id="simStartOmission" class="form-control"
                               value="5" min="1" max="50">
                        <small>遗漏达到此值后开始投注</small>
                    </div>

                    <!-- 条件配置（根据分析类型动态显示） -->
                    <div id="conditionalConfig"></div>
                </div>

                <!-- 高级配置（可折叠） -->
                <div class="advanced-config">
                    <button id="toggleAdvanced" class="btn-secondary">
                        <span id="advancedLabel">展开高级配置</span> ▼
                    </button>
                    <div id="advancedPanel" style="display:none; margin-top: 15px;">
                        <div class="config-grid">
                            <div class="config-row">
                                <label>倍投序列:</label>
                                <input type="text" id="simBettingSeq" class="form-control"
                                       value="1,2,4" placeholder="逗号分隔">
                                <small>如: 1,2,4 表示1倍→2倍→4倍</small>
                            </div>

                            <div class="config-row">
                                <label>止损期数:</label>
                                <input type="number" id="simStopLoss" class="form-control"
                                       value="3" min="1" max="10">
                                <small>连续投注此期数后止损</small>
                            </div>

                            <div class="config-row">
                                <label>赔率:</label>
                                <input type="number" id="simOdds" class="form-control"
                                       value="2.0" min="1.1" max="10" step="0.1">
                                <small>中奖返还倍数（含本金）</small>
                            </div>

                            <div class="config-row">
                                <label>基础投注额:</label>
                                <input type="number" id="simBaseAmount" class="form-control"
                                       value="100" min="1">
                                <small>单位：元</small>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button id="startTestBtn" class="btn-primary">🚀 开始测试</button>
                </div>
            </div>

            <!-- 结果展示面板 -->
            <div id="resultPanel" class="result-panel" style="display:none;">
                <!-- 统计卡片 -->
                <div class="stats-cards-row">
                    <div class="stat-card blue-card">
                        <div class="stat-label">累计投注额</div>
                        <div class="stat-value" id="statInvested">¥0</div>
                    </div>
                    <div class="stat-card" id="profitCard">
                        <div class="stat-label">总盈亏</div>
                        <div class="stat-value" id="statProfit">¥0</div>
                    </div>
                    <div class="stat-card green-card">
                        <div class="stat-label">命中率</div>
                        <div class="stat-value" id="statHitRate">0%</div>
                    </div>
                    <div class="stat-card orange-card">
                        <div class="stat-label">最大连续遗漏</div>
                        <div class="stat-value" id="statMaxMiss">0期</div>
                    </div>
                </div>

                <!-- 盈亏曲线图 -->
                <div class="chart-container card">
                    <h3>盈亏趋势曲线</h3>
                    <canvas id="profitChart" width="800" height="300"></canvas>
                </div>

                <!-- 明细表格 -->
                <div class="table-container card">
                    <h3>投注明细记录 <span id="detailsCount"></span></h3>
                    <div class="table-scroll">
                        <table id="detailsTable" class="simulation-table">
                            <thead>
                                <tr>
                                    <th>期号</th>
                                    <th>遗漏</th>
                                    <th>投注</th>
                                    <th>倍数</th>
                                    <th>投注额</th>
                                    <th>命中</th>
                                    <th>本期收益</th>
                                    <th>累计投注</th>
                                    <th>累计收益</th>
                                    <th>累计盈亏</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                    <button id="exportCsvBtn" class="btn-secondary">📥 导出CSV</button>
                </div>
            </div>

            <!-- 加载提示已移除 -->
        </div>
    `;
}

/**
 * 绑定事件
 */
function bindSimulationEvents() {
    // 分析类型切换
    document.getElementById('simAnalysisType').addEventListener('change', onAnalysisTypeChange);

    // 测试按钮
    document.getElementById('startTestBtn').addEventListener('click', startTest);

    // 导出按钮
    const exportBtn = document.getElementById('exportCsvBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportCsv);
    }

    // 高级配置折叠
    document.getElementById('toggleAdvanced').addEventListener('click', toggleAdvancedConfig);

    // 初始化条件配置
    onAnalysisTypeChange();
}

/**
 * 切换高级配置面板
 */
function toggleAdvancedConfig() {
    const panel = document.getElementById('advancedPanel');
    const label = document.getElementById('advancedLabel');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        label.textContent = '收起高级配置';
    } else {
        panel.style.display = 'none';
        label.textContent = '展开高级配置';
    }
}

/**
 * 分析类型切换事件
 */
function onAnalysisTypeChange() {
    const analysisType = document.getElementById('simAnalysisType').value;
    const conditionalConfig = document.getElementById('conditionalConfig');

    // 根据分析类型显示条件配置
    if (analysisType === 'recommend8' || analysisType === 'recommend16') {
        // 推荐8码/16码需要位置和期号
        conditionalConfig.innerHTML = `
            <div class="config-row">
                <label>位置:</label>
                <select id="simPosition" class="form-control">
                    <option value="1">第1位</option>
                    <option value="2">第2位</option>
                    <option value="3">第3位</option>
                    <option value="4">第4位</option>
                    <option value="5">第5位</option>
                    <option value="6">第6位</option>
                    <option value="7" selected>第7位</option>
                </select>
            </div>
            <div class="config-row">
                <label>基准期号:</label>
                <input type="text" id="simPeriod" class="form-control"
                       placeholder="如: 2025100">
                <small>推荐基于的期号（以0或5结尾）</small>
            </div>
        `;
    } else if (analysisType === 'hot20') {
        // 去10最热20需要位置
        conditionalConfig.innerHTML = `
            <div class="config-row">
                <label>位置:</label>
                <select id="simPosition" class="form-control">
                    <option value="1">第1位</option>
                    <option value="2">第2位</option>
                    <option value="3">第3位</option>
                    <option value="4">第4位</option>
                    <option value="5">第5位</option>
                    <option value="6">第6位</option>
                    <option value="7" selected>第7位</option>
                </select>
            </div>
        `;
    } else {
        // 2组观察和智能推荐20码不需要额外参数
        conditionalConfig.innerHTML = '';
    }
}

/**
 * 收集配置参数
 */
function collectConfig() {
    const config = {
        lottery_type: document.getElementById('simLotteryType').value,
        analysis_type: document.getElementById('simAnalysisType').value,
        test_periods: parseInt(document.getElementById('simTestPeriods').value),
        start_omission: parseInt(document.getElementById('simStartOmission').value),
        betting_sequence: document.getElementById('simBettingSeq').value,
        stop_loss_count: parseInt(document.getElementById('simStopLoss').value),
        odds: parseFloat(document.getElementById('simOdds').value),
        base_amount: parseInt(document.getElementById('simBaseAmount').value)
    };

    // 条件参数
    const positionElem = document.getElementById('simPosition');
    if (positionElem) {
        config.position = parseInt(positionElem.value);
    }

    const periodElem = document.getElementById('simPeriod');
    if (periodElem) {
        config.period = periodElem.value.trim();
    }

    return config;
}

/**
 * 验证配置参数
 */
function validateConfig(config) {
    if (config.test_periods < 10 || config.test_periods > 500) {
        alert('测试期数必须在10-500之间');
        return false;
    }

    if (config.start_omission < 1 || config.start_omission > 50) {
        alert('起投遗漏期数必须在1-50之间');
        return false;
    }

    if (config.stop_loss_count < 1 || config.stop_loss_count > 10) {
        alert('止损期数必须在1-10之间');
        return false;
    }

    if (config.odds < 1.1 || config.odds > 10) {
        alert('赔率必须在1.1-10之间');
        return false;
    }

    if (config.base_amount < 1) {
        alert('基础投注额必须大于0');
        return false;
    }

    // 验证条件参数
    if ((config.analysis_type === 'recommend8' || config.analysis_type === 'recommend16')) {
        if (!config.position) {
            alert('请选择位置');
            return false;
        }
        if (!config.period) {
            alert('请输入基准期号');
            return false;
        }
    }

    if (config.analysis_type === 'hot20' && !config.position) {
        alert('请选择位置');
        return false;
    }

    return true;
}

/**
 * 构建API URL
 */
function buildApiUrl(config) {
    const params = new URLSearchParams();
    params.append('lottery_type', config.lottery_type);
    params.append('analysis_type', config.analysis_type);
    params.append('test_periods', config.test_periods);
    params.append('start_omission', config.start_omission);
    params.append('betting_sequence', config.betting_sequence);
    params.append('stop_loss_count', config.stop_loss_count);
    params.append('odds', config.odds);
    params.append('base_amount', config.base_amount);

    if (config.position) {
        params.append('position', config.position);
    }
    if (config.period) {
        params.append('period', config.period);
    }

    return `${API_BASE}/api/simulation/test?${params.toString()}`;
}

/**
 * 显示加载状态
 */
function showLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'flex';
        console.log('显示加载状态');
    } else {
        console.error('找不到loadingOverlay元素');
    }
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = 'none';
        console.log('隐藏加载状态成功');
    } else {
        console.error('找不到loadingOverlay元素');
    }
}

/**
 * 开始测试
 */
async function startTest() {
    const config = collectConfig();

    if (!validateConfig(config)) {
        return;
    }

    // showLoading(); // 已禁用加载遮罩

    try {
        const url = buildApiUrl(config);
        console.log('发送请求:', url);

        const response = await fetch(url);
        console.log('收到响应:', response.status);

        // 检查HTTP状态
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP错误:', response.status, errorText);
            let errorMsg = `服务器错误 (${response.status})`;
            try {
                const errorData = JSON.parse(errorText);
                errorMsg = errorData.detail || errorData.message || errorMsg;
            } catch (e) {
                // 无法解析错误信息，使用默认消息
            }
            alert(`测试失败：${errorMsg}`);
            return;
        }

        const data = await response.json();
        console.log('解析数据:', data);

        if (data.success) {
            currentTestResult = data.data;
            console.log('开始显示结果');
            displayResults(data.data);
            console.log('结果显示完成');
        } else {
            alert(`测试失败：${data.message || data.error || '未知错误'}`);
        }
    } catch (error) {
        console.error('测试失败:', error);
        alert(`测试失败：${error.message}`);
    }
}

/**
 * 展示结果
 */
function displayResults(data) {
    try {
        // 显示结果面板
        document.getElementById('resultPanel').style.display = 'block';

        // 滚动到结果面板
        document.getElementById('resultPanel').scrollIntoView({ behavior: 'smooth' });

        // 更新统计卡片
        console.log('更新统计卡片');
        updateStatsCards(data.statistics);

        // 绘制盈亏曲线
        console.log('绘制盈亏曲线');
        drawProfitChart(data.details);

        // 渲染明细表格
        console.log('渲染明细表格');
        renderDetailsTable(data.details);

        console.log('所有结果显示完成');
    } catch (error) {
        console.error('显示结果时出错:', error);
        alert(`显示结果时出错：${error.message}`);
        throw error; // 重新抛出，让外层catch处理
    }
}

/**
 * 更新统计卡片
 */
function updateStatsCards(stats) {
    document.getElementById('statInvested').textContent = `¥${stats.total_invested}`;
    document.getElementById('statProfit').textContent = `¥${stats.net_profit}`;
    document.getElementById('statHitRate').textContent =
        `${stats.hit_rate}% (${stats.hit_count}/${stats.betting_count})`;
    document.getElementById('statMaxMiss').textContent = `${stats.max_continuous_miss}期`;

    // 盈亏卡片颜色
    const profitCard = document.getElementById('profitCard');
    if (stats.net_profit >= 0) {
        profitCard.className = 'stat-card green-card';
    } else {
        profitCard.className = 'stat-card red-card';
    }
}

/**
 * 绘制盈亏曲线
 */
function drawProfitChart(details) {
    const canvas = document.getElementById('profitChart');
    const ctx = canvas.getContext('2d');

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (details.length === 0) {
        return;
    }

    // 提取数据
    const profits = details.map(d => d.cumulative_profit);
    const maxProfit = Math.max(...profits, 0);
    const minProfit = Math.min(...profits, 0);
    const range = maxProfit - minProfit || 1;

    // 边距
    const padding = {top: 20, right: 40, bottom: 40, left: 60};
    const chartWidth = canvas.width - padding.left - padding.right;
    const chartHeight = canvas.height - padding.top - padding.bottom;

    // 绘制背景网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    // 水平网格线（5条）
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();

        // Y轴标签
        const value = maxProfit - (range / 5) * i;
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(Math.round(value), padding.left - 10, y + 4);
    }

    // 垂直网格线（10条）
    for (let i = 0; i <= 10; i++) {
        const x = padding.left + (chartWidth / 10) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
    }

    // 绘制零线
    if (minProfit < 0 && maxProfit > 0) {
        const zeroY = padding.top + ((maxProfit / range) * chartHeight);
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, zeroY);
        ctx.lineTo(padding.left + chartWidth, zeroY);
        ctx.stroke();
    }

    // 绘制折线
    ctx.beginPath();
    details.forEach((d, i) => {
        // 处理只有一个点的情况
        const xRatio = details.length > 1 ? (i / (details.length - 1)) : 0.5;
        const x = padding.left + xRatio * chartWidth;
        const y = padding.top + ((maxProfit - d.cumulative_profit) / range) * chartHeight;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.strokeStyle = profits[profits.length - 1] >= 0 ? '#28a745' : '#dc3545';
    ctx.lineWidth = 3;
    ctx.stroke();

    // 绘制坐标轴标签
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('累计盈亏（元）', canvas.width / 2, canvas.height - 5);
}

/**
 * 渲染明细表格
 */
function renderDetailsTable(details) {
    const tbody = document.querySelector('#detailsTable tbody');
    tbody.innerHTML = '';

    document.getElementById('detailsCount').textContent = `（共${details.length}期）`;

    details.forEach(detail => {
        const row = document.createElement('tr');

        // 行样式
        if (detail.is_betting) {
            row.classList.add('betting-row');
            if (detail.is_hit) {
                row.classList.add('hit-row');
            }
        }

        // 构建单元格
        const isBetting = detail.is_betting ? '是' : '否';
        const multiplier = detail.multiplier > 0 ? detail.multiplier + 'x' : '-';
        const betAmount = detail.bet_amount > 0 ? '¥' + detail.bet_amount : '-';

        let isHit = '-';
        if (detail.is_hit === true) {
            isHit = '<span style="color: green; font-weight: bold;">✓</span>';
        } else if (detail.is_hit === false) {
            isHit = '<span style="color: red;">✗</span>';
        }

        const periodReturn = detail.period_return > 0 ? '¥' + detail.period_return : '-';
        const profitColor = detail.cumulative_profit >= 0 ? 'green' : 'red';

        row.innerHTML = `
            <td>${detail.period}</td>
            <td>${detail.omission}</td>
            <td>${isBetting}</td>
            <td>${multiplier}</td>
            <td>${betAmount}</td>
            <td>${isHit}</td>
            <td>${periodReturn}</td>
            <td>¥${detail.cumulative_invested}</td>
            <td>¥${detail.cumulative_return}</td>
            <td style="color: ${profitColor}; font-weight: bold;">
                ¥${detail.cumulative_profit}
            </td>
        `;

        tbody.appendChild(row);
    });
}

/**
 * 导出CSV
 */
function exportCsv() {
    if (!currentTestResult) {
        alert('没有可导出的测试结果');
        return;
    }

    const config = collectConfig();
    const params = new URLSearchParams();

    Object.keys(config).forEach(key => {
        if (config[key] !== undefined && config[key] !== null && config[key] !== '') {
            params.append(key, config[key]);
        }
    });

    const url = `${API_BASE}/api/simulation/export?${params.toString()}`;
    window.open(url, '_blank');
}

// 导出初始化函数
window.initSimulationBetting = initSimulationBetting;
