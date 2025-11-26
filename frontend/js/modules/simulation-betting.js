/**
 * 倍投模拟测试模块
 * 模拟在指定期号范围内的倍投策略效果
 */

// 全局变量
let simulationData = null;
let currentStrategy = 'double';  // double: 翻倍, custom: 自定义

/**
 * 初始化倍投模拟页面
 */
async function initSimulationBetting() {
    const container = document.getElementById('simulationBettingPage');

    container.innerHTML = `
        <div class="simulation-container">
            <h2>模拟倍投测试系统</h2>

            <!-- 配置区域 -->
            <div class="config-section">
                <h3>投注配置</h3>

                <div class="form-row">
                    <div class="form-group">
                        <label>彩种类型：</label>
                        <select id="lotteryType" class="form-control">
                            <option value="am">澳门</option>
                            <option value="hk">香港</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>初始金额：</label>
                        <input type="number" id="initialAmount" class="form-control" value="100" min="1" step="1">
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>投注号码（可多选）：</label>
                        <div id="numberSelection" class="number-grid"></div>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>倍投策略：</label>
                        <select id="strategyType" class="form-control">
                            <option value="double">翻倍策略（100→200→400...）</option>
                            <option value="custom">自定义金额数组</option>
                        </select>
                    </div>
                </div>

                <div id="customAmountsContainer" class="form-row" style="display: none;">
                    <div class="form-group" style="flex: 1;">
                        <label>自定义金额数组（逗号分隔）：</label>
                        <input type="text" id="customAmounts" class="form-control"
                               placeholder="例如: 100,150,200,300,500,800">
                        <small class="form-text">最多500个金额，未中奖时按顺序使用</small>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="resetOnWin" checked>
                            中奖后重置倍数（回到初始金额）
                        </label>
                    </div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>起始期号：</label>
                        <input type="text" id="startPeriod" class="form-control" placeholder="例如: 2025001">
                    </div>

                    <div class="form-group">
                        <label>结束期号：</label>
                        <input type="text" id="endPeriod" class="form-control" placeholder="例如: 2025100">
                    </div>

                    <div class="form-group">
                        <button class="btn btn-info" onclick="getLatestPeriods()">获取最新期号</button>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn-primary" onclick="startSimulation()">开始模拟</button>
                    <button class="btn btn-secondary" onclick="clearResults()">清空结果</button>
                </div>
            </div>

            <!-- 结果展示区域 -->
            <div id="resultsSection" style="display: none;">
                <!-- 汇总统计 -->
                <div class="summary-section">
                    <h3>汇总统计</h3>
                    <div id="summaryContent" class="summary-grid"></div>
                </div>

                <!-- 详细记录 -->
                <div class="details-section">
                    <h3>详细记录</h3>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>期号</th>
                                    <th>投注金额</th>
                                    <th>开奖号码</th>
                                    <th>结果</th>
                                    <th>中奖金额</th>
                                    <th>本期盈亏</th>
                                    <th>累计投入</th>
                                    <th>累计盈亏</th>
                                    <th>连续未中</th>
                                </tr>
                            </thead>
                            <tbody id="detailsTableBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 渲染号码选择网格
    renderNumberGrid();

    // 绑定策略切换事件
    document.getElementById('strategyType').addEventListener('change', function() {
        currentStrategy = this.value;
        const customContainer = document.getElementById('customAmountsContainer');
        customContainer.style.display = currentStrategy === 'custom' ? 'block' : 'none';
    });

    // 加载样式
    loadSimulationStyles();
}

/**
 * 渲染号码选择网格（1-49）
 */
function renderNumberGrid() {
    const container = document.getElementById('numberSelection');
    let html = '';

    for (let i = 1; i <= 49; i++) {
        html += `
            <label class="number-item">
                <input type="checkbox" value="${i}" class="number-checkbox">
                <span class="number-label">${i}</span>
            </label>
        `;
    }

    container.innerHTML = html;
}

/**
 * 获取最新期号范围
 */
async function getLatestPeriods() {
    const lotteryType = document.getElementById('lotteryType').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/betting_simulation/periods?lottery_type=${lotteryType}`);
        const data = await response.json();

        if (data.min_period && data.max_period) {
            // 默认显示最近100期
            document.getElementById('endPeriod').value = data.max_period;

            // 计算起始期号（往前100期）
            const maxPeriodNum = parseInt(data.max_period);
            const startPeriodNum = Math.max(maxPeriodNum - 99, parseInt(data.min_period));
            document.getElementById('startPeriod').value = startPeriodNum.toString();

            showMessage(`已加载期号范围：${data.min_period} 至 ${data.max_period}（共${data.total_periods}期）`, 'success');
        } else {
            showMessage('未找到历史数据', 'error');
        }
    } catch (error) {
        console.error('获取期号范围失败:', error);
        showMessage('获取期号范围失败', 'error');
    }
}

/**
 * 开始模拟
 */
async function startSimulation() {
    // 收集参数
    const lotteryType = document.getElementById('lotteryType').value;
    const initialAmount = parseFloat(document.getElementById('initialAmount').value);
    const startPeriod = document.getElementById('startPeriod').value.trim();
    const endPeriod = document.getElementById('endPeriod').value.trim();
    const strategyType = document.getElementById('strategyType').value;
    const resetOnWin = document.getElementById('resetOnWin').checked;

    // 获取选中的号码
    const selectedNumbers = Array.from(document.querySelectorAll('.number-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    // 参数验证
    if (selectedNumbers.length === 0) {
        showMessage('请至少选择一个投注号码', 'error');
        return;
    }

    if (!startPeriod || !endPeriod) {
        showMessage('请输入起始期号和结束期号', 'error');
        return;
    }

    if (initialAmount <= 0) {
        showMessage('初始金额必须大于0', 'error');
        return;
    }

    // 构建请求体
    const requestBody = {
        lottery_type: lotteryType,
        numbers: selectedNumbers,
        start_period: startPeriod,
        end_period: endPeriod,
        initial_amount: initialAmount,
        strategy: strategyType,
        reset_on_win: resetOnWin
    };

    // 如果是自定义策略，添加自定义金额数组
    if (strategyType === 'custom') {
        const customAmountsStr = document.getElementById('customAmounts').value.trim();
        if (!customAmountsStr) {
            showMessage('请输入自定义金额数组', 'error');
            return;
        }

        try {
            const customAmounts = customAmountsStr.split(',').map(s => {
                const num = parseFloat(s.trim());
                if (isNaN(num) || num <= 0) {
                    throw new Error('金额格式错误');
                }
                return num;
            });

            if (customAmounts.length > 500) {
                showMessage('自定义金额数组最多500个元素', 'error');
                return;
            }

            requestBody.custom_amounts = customAmounts;
        } catch (error) {
            showMessage('自定义金额格式错误，请使用逗号分隔的数字', 'error');
            return;
        }
    }

    // 显示加载提示
    showMessage('正在模拟计算，请稍候...', 'info');

    try {
        const response = await fetch(`${API_BASE_URL}/api/betting_simulation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '模拟失败');
        }

        simulationData = await response.json();

        // 显示结果
        displayResults(simulationData);
        showMessage('模拟完成', 'success');

    } catch (error) {
        console.error('模拟失败:', error);
        showMessage(error.message || '模拟失败', 'error');
    }
}

/**
 * 显示模拟结果
 */
function displayResults(data) {
    // 显示结果区域
    document.getElementById('resultsSection').style.display = 'block';

    // 显示汇总统计
    const summaryHtml = `
        <div class="summary-item">
            <label>总期数：</label>
            <span>${data.summary.total_periods}</span>
        </div>
        <div class="summary-item">
            <label>总投入：</label>
            <span class="amount-negative">¥${data.summary.total_bet.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <label>总收益：</label>
            <span class="amount-positive">¥${data.summary.total_win.toFixed(2)}</span>
        </div>
        <div class="summary-item ${data.summary.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
            <label>净盈亏：</label>
            <span>${data.summary.profit >= 0 ? '+' : ''}¥${data.summary.profit.toFixed(2)}</span>
        </div>
        <div class="summary-item">
            <label>盈亏率：</label>
            <span>${data.summary.profit_rate >= 0 ? '+' : ''}${data.summary.profit_rate.toFixed(2)}%</span>
        </div>
        <div class="summary-item">
            <label>中奖次数：</label>
            <span class="win-count">${data.summary.win_count}</span>
        </div>
        <div class="summary-item">
            <label>未中次数：</label>
            <span class="lose-count">${data.summary.lose_count}</span>
        </div>
        <div class="summary-item">
            <label>中奖率：</label>
            <span>${data.summary.win_rate.toFixed(2)}%</span>
        </div>
        <div class="summary-item">
            <label>最大连续未中：</label>
            <span class="max-lose">${data.summary.max_consecutive_lose}</span>
        </div>
        <div class="summary-item">
            <label>最高投注金额：</label>
            <span class="max-bet">¥${data.summary.max_bet_amount.toFixed(2)}</span>
        </div>
    `;

    document.getElementById('summaryContent').innerHTML = summaryHtml;

    // 显示详细记录（倒序显示）
    const tableBody = document.getElementById('detailsTableBody');
    let tableHtml = '';

    data.details.forEach(detail => {
        const profitClass = detail.profit > 0 ? 'profit-positive' : 'profit-negative';
        const resultClass = detail.is_win ? 'result-win' : 'result-lose';

        tableHtml += `
            <tr>
                <td>${detail.period}</td>
                <td>¥${detail.bet_amount.toFixed(2)}</td>
                <td class="opened-number">${detail.opened_number}</td>
                <td class="${resultClass}">${detail.is_win ? '✓ 中奖' : '✗ 未中'}</td>
                <td>${detail.is_win ? '¥' + detail.win_amount.toFixed(2) : '-'}</td>
                <td class="${profitClass}">${detail.profit >= 0 ? '+' : ''}¥${detail.profit.toFixed(2)}</td>
                <td>¥${detail.cumulative_bet.toFixed(2)}</td>
                <td class="${detail.cumulative_profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                    ${detail.cumulative_profit >= 0 ? '+' : ''}¥${detail.cumulative_profit.toFixed(2)}
                </td>
                <td>${detail.consecutive_lose}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = tableHtml;

    // 滚动到结果区域
    document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 清空结果
 */
function clearResults() {
    simulationData = null;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('summaryContent').innerHTML = '';
    document.getElementById('detailsTableBody').innerHTML = '';

    // 取消所有号码选择
    document.querySelectorAll('.number-checkbox').forEach(cb => cb.checked = false);

    showMessage('已清空结果', 'info');
}

/**
 * 显示消息提示
 */
function showMessage(message, type = 'info') {
    // 如果页面有全局的消息提示函数，使用它
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
    }
}

/**
 * 加载模拟页面样式
 */
function loadSimulationStyles() {
    const styleId = 'betting-simulation-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
        .simulation-container {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }

        .config-section {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .config-section h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }

        .form-row {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .form-group {
            flex: 1;
            min-width: 200px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: #555;
        }

        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .form-control:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.1);
        }

        .form-text {
            display: block;
            margin-top: 5px;
            color: #666;
            font-size: 12px;
        }

        .number-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
            gap: 8px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: #f9f9f9;
            max-height: 300px;
            overflow-y: auto;
        }

        .number-item {
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            user-select: none;
        }

        .number-checkbox {
            display: none;
        }

        .number-label {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            border: 2px solid #ddd;
            border-radius: 4px;
            background: #fff;
            font-weight: 500;
            transition: all 0.2s;
        }

        .number-checkbox:checked + .number-label {
            background: #007bff;
            color: #fff;
            border-color: #007bff;
            transform: scale(1.05);
        }

        .number-label:hover {
            border-color: #007bff;
            transform: scale(1.05);
        }

        .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn-primary {
            background: #007bff;
            color: #fff;
        }

        .btn-primary:hover {
            background: #0056b3;
        }

        .btn-secondary {
            background: #6c757d;
            color: #fff;
        }

        .btn-secondary:hover {
            background: #545b62;
        }

        .btn-info {
            background: #17a2b8;
            color: #fff;
        }

        .btn-info:hover {
            background: #117a8b;
        }

        .summary-section {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }

        .summary-section h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #28a745;
            padding-bottom: 10px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }

        .summary-item {
            padding: 12px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background: #f8f9fa;
        }

        .summary-item label {
            display: block;
            font-size: 13px;
            color: #666;
            margin-bottom: 5px;
        }

        .summary-item span {
            display: block;
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }

        .profit-positive {
            background: #d4edda !important;
            border-color: #c3e6cb !important;
        }

        .profit-positive span {
            color: #155724 !important;
        }

        .profit-negative {
            background: #f8d7da !important;
            border-color: #f5c6cb !important;
        }

        .profit-negative span {
            color: #721c24 !important;
        }

        .amount-positive {
            color: #28a745 !important;
        }

        .amount-negative {
            color: #dc3545 !important;
        }

        .win-count {
            color: #28a745 !important;
        }

        .lose-count {
            color: #dc3545 !important;
        }

        .max-lose {
            color: #ffc107 !important;
        }

        .max-bet {
            color: #ff5722 !important;
        }

        .details-section {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .details-section h3 {
            margin-top: 0;
            color: #333;
            border-bottom: 2px solid #ffc107;
            padding-bottom: 10px;
        }

        .table-responsive {
            overflow-x: auto;
            margin-top: 15px;
        }

        .table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
        }

        .table thead {
            background: #f8f9fa;
        }

        .table th {
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #dee2e6;
        }

        .table td {
            padding: 10px 8px;
            border-bottom: 1px solid #dee2e6;
        }

        .table tbody tr:hover {
            background: #f8f9fa;
        }

        .result-win {
            color: #28a745;
            font-weight: 600;
        }

        .result-lose {
            color: #dc3545;
            font-weight: 600;
        }

        .opened-number {
            font-weight: 600;
            color: #007bff;
            font-size: 16px;
        }
    `;

    document.head.appendChild(style);
}

// 导出函数供全局使用
window.initSimulationBetting = initSimulationBetting;
window.startSimulation = startSimulation;
window.clearResults = clearResults;
window.getLatestPeriods = getLatestPeriods;
