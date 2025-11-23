/**
 * 自动采集设置模块
 */

// 使用全局变量
const API_BASE_URL = window.BACKEND_URL || 'http://localhost:8000';

// 简单的消息提示函数
function showMessage(message, type = 'info') {
    const prefix = {
        'success': '✅ ',
        'error': '❌ ',
        'warning': '⚠️ ',
        'info': 'ℹ️ '
    };
    alert((prefix[type] || '') + message);
}

// 页面初始化
async function initAutoCollectPage() {
    const content = `
        <div class="auto-collect-container">
            <div class="settings-header">
                <h2>自动采集设置</h2>
                <button id="refreshStatusBtn" class="btn btn-secondary">
                    <i class="fas fa-sync-alt"></i> 刷新状态
                </button>
            </div>

            <!-- 状态卡片 -->
            <div class="status-card">
                <h3>当前状态</h3>
                <div class="status-grid">
                    <div class="status-item">
                        <span class="status-label">运行状态：</span>
                        <span id="runningStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">自动采集：</span>
                        <span id="enabledStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">澳门采集时间：</span>
                        <span id="amTimeStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">香港采集时间：</span>
                        <span id="hkTimeStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">重试次数：</span>
                        <span id="retryTimesStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">重试间隔：</span>
                        <span id="retryIntervalStatus" class="status-value">-</span>
                    </div>
                    <div class="status-item">
                        <span class="status-label">正常采集间隔：</span>
                        <span id="normalIntervalStatus" class="status-value">-</span>
                    </div>
                </div>
            </div>

            <!-- 定时任务列表 -->
            <div class="jobs-card">
                <h3>定时任务列表</h3>
                <div id="jobsList"></div>
            </div>

            <!-- 控制面板 -->
            <div class="control-panel">
                <h3>控制面板</h3>

                <div class="control-section">
                    <h4>启用/禁用自动采集</h4>
                    <div class="button-group">
                        <button id="enableBtn" class="btn btn-success">
                            <i class="fas fa-play"></i> 启用自动采集
                        </button>
                        <button id="disableBtn" class="btn btn-danger">
                            <i class="fas fa-stop"></i> 禁用自动采集
                        </button>
                    </div>
                </div>

                <div class="control-section">
                    <h4>设置采集时间</h4>
                    <div class="time-settings">
                        <div class="time-input-group">
                            <label>澳门采集时间：</label>
                            <input type="time" id="amTimeInput" class="time-input">
                            <button id="updateAmTimeBtn" class="btn btn-primary">更新</button>
                        </div>
                        <div class="time-input-group">
                            <label>香港采集时间：</label>
                            <input type="time" id="hkTimeInput" class="time-input">
                            <button id="updateHkTimeBtn" class="btn btn-primary">更新</button>
                        </div>
                    </div>
                </div>

                <div class="control-section">
                    <h4>设置重试次数</h4>
                    <div class="retry-settings">
                        <input type="number" id="retryTimesInput" min="1" max="10" class="retry-input" placeholder="重试次数">
                        <button id="updateRetryBtn" class="btn btn-primary">更新重试次数</button>
                    </div>
                </div>

                <div class="control-section">
                    <h4>设置重试间隔</h4>
                    <div class="retry-settings">
                        <input type="number" id="retryIntervalInput" min="1" max="300" class="retry-input" placeholder="秒">
                        <button id="updateRetryIntervalBtn" class="btn btn-primary">更新重试间隔</button>
                        <span class="hint-text">采集失败后等待多久再重试（1-300秒）</span>
                    </div>
                </div>

                <div class="control-section">
                    <h4>设置正常采集间隔</h4>
                    <div class="retry-settings">
                        <input type="number" id="normalIntervalInput" min="1" max="3600" class="retry-input" placeholder="秒">
                        <button id="updateNormalIntervalBtn" class="btn btn-primary">更新正常间隔</button>
                        <span class="hint-text">正常采集的时间间隔（1-3600秒，预留扩展）</span>
                    </div>
                </div>

                <div class="control-section">
                    <h4>手动触发采集（测试用）</h4>
                    <div class="button-group">
                        <button id="triggerAmBtn" class="btn btn-warning">
                            <i class="fas fa-bolt"></i> 立即采集澳门
                        </button>
                        <button id="triggerHkBtn" class="btn btn-warning">
                            <i class="fas fa-bolt"></i> 立即采集香港
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('autoCollectPage').innerHTML = content;

    // 绑定事件
    bindEvents();

    // 加载状态
    await loadStatus();

    // 添加样式
    addStyles();
}

// 绑定事件
function bindEvents() {
    document.getElementById('refreshStatusBtn').addEventListener('click', loadStatus);
    document.getElementById('enableBtn').addEventListener('click', enableAutoCollect);
    document.getElementById('disableBtn').addEventListener('click', disableAutoCollect);
    document.getElementById('updateAmTimeBtn').addEventListener('click', () => updateTime('am'));
    document.getElementById('updateHkTimeBtn').addEventListener('click', () => updateTime('hk'));
    document.getElementById('updateRetryBtn').addEventListener('click', updateRetryTimes);
    document.getElementById('updateRetryIntervalBtn').addEventListener('click', updateRetryInterval);
    document.getElementById('updateNormalIntervalBtn').addEventListener('click', updateNormalInterval);
    document.getElementById('triggerAmBtn').addEventListener('click', () => triggerCollect('am'));
    document.getElementById('triggerHkBtn').addEventListener('click', () => triggerCollect('hk'));
}

// 加载状态
async function loadStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/status`);
        const data = await response.json();

        // 更新状态显示
        document.getElementById('runningStatus').innerHTML =
            data.running ? '<span class="badge-success">运行中</span>' : '<span class="badge-danger">已停止</span>';

        document.getElementById('enabledStatus').innerHTML =
            data.enabled ? '<span class="badge-success">已启用</span>' : '<span class="badge-secondary">已禁用</span>';

        document.getElementById('amTimeStatus').textContent = data.am_time || '-';
        document.getElementById('hkTimeStatus').textContent = data.hk_time || '-';
        document.getElementById('retryTimesStatus').textContent = data.retry_times || '-';
        document.getElementById('retryIntervalStatus').textContent = (data.retry_interval || '-') + (data.retry_interval ? ' 秒' : '');
        document.getElementById('normalIntervalStatus').textContent = (data.normal_interval || '-') + (data.normal_interval ? ' 秒' : '');

        // 更新输入框值
        document.getElementById('amTimeInput').value = data.am_time || '21:30';
        document.getElementById('hkTimeInput').value = data.hk_time || '21:35';
        document.getElementById('retryTimesInput').value = data.retry_times || 3;
        document.getElementById('retryIntervalInput').value = data.retry_interval || 10;
        document.getElementById('normalIntervalInput').value = data.normal_interval || 60;

        // 更新任务列表
        updateJobsList(data.jobs || []);

    } catch (error) {
        showMessage('加载状态失败: ' + error.message, 'error');
    }
}

// 更新任务列表
function updateJobsList(jobs) {
    const jobsListDiv = document.getElementById('jobsList');

    if (jobs.length === 0) {
        jobsListDiv.innerHTML = '<p class="no-jobs">暂无定时任务</p>';
        return;
    }

    const jobsHTML = jobs.map(job => `
        <div class="job-item">
            <div class="job-name">${job.name}</div>
            <div class="job-next-run">
                下次执行: ${job.next_run_time || '未安排'}
            </div>
        </div>
    `).join('');

    jobsListDiv.innerHTML = jobsHTML;
}

// 启用自动采集
async function enableAutoCollect() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/enable`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage('自动采集已启用', 'success');
            await loadStatus();
        } else {
            showMessage('启用失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 禁用自动采集
async function disableAutoCollect() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/disable`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage('自动采集已禁用', 'success');
            await loadStatus();
        } else {
            showMessage('禁用失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 更新时间
async function updateTime(type) {
    const timeInput = type === 'am' ? 'amTimeInput' : 'hkTimeInput';
    const time = document.getElementById(timeInput).value;

    if (!time) {
        showMessage('请选择时间', 'error');
        return;
    }

    try {
        const params = new URLSearchParams();
        if (type === 'am') {
            params.append('am_time', time);
        } else {
            params.append('hk_time', time);
        }

        const response = await fetch(`${API_BASE_URL}/api/auto_collect/update_time?${params}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`${type === 'am' ? '澳门' : '香港'}采集时间已更新为 ${time}`, 'success');
            await loadStatus();
        } else {
            showMessage('更新失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 更新重试次数
async function updateRetryTimes() {
    const retryTimes = parseInt(document.getElementById('retryTimesInput').value);

    if (isNaN(retryTimes) || retryTimes < 1 || retryTimes > 10) {
        showMessage('重试次数必须在 1-10 之间', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/retry_times?retry_times=${retryTimes}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`重试次数已更新为 ${retryTimes}`, 'success');
            await loadStatus();
        } else {
            showMessage('更新失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 更新重试间隔
async function updateRetryInterval() {
    const retryInterval = parseInt(document.getElementById('retryIntervalInput').value);

    if (isNaN(retryInterval) || retryInterval < 1 || retryInterval > 300) {
        showMessage('重试间隔必须在 1-300 秒之间', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/retry_interval?retry_interval=${retryInterval}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`重试间隔已更新为 ${retryInterval} 秒`, 'success');
            await loadStatus();
        } else {
            showMessage('更新失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 更新正常采集间隔
async function updateNormalInterval() {
    const normalInterval = parseInt(document.getElementById('normalIntervalInput').value);

    if (isNaN(normalInterval) || normalInterval < 1 || normalInterval > 3600) {
        showMessage('正常采集间隔必须在 1-3600 秒之间', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auto_collect/normal_interval?normal_interval=${normalInterval}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`正常采集间隔已更新为 ${normalInterval} 秒`, 'success');
            await loadStatus();
        } else {
            showMessage('更新失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 手动触发采集
async function triggerCollect(lotteryType) {
    if (!confirm(`确定要立即采集${lotteryType === 'am' ? '澳门' : '香港'}彩票吗？`)) {
        return;
    }

    try {
        showMessage(`正在采集${lotteryType === 'am' ? '澳门' : '香港'}彩票...`, 'info');

        const response = await fetch(`${API_BASE_URL}/api/auto_collect/trigger?lottery_type=${lotteryType}`, {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            showMessage(`${lotteryType === 'am' ? '澳门' : '香港'}采集任务已触发`, 'success');
        } else {
            showMessage('触发失败: ' + data.msg, 'error');
        }
    } catch (error) {
        showMessage('操作失败: ' + error.message, 'error');
    }
}

// 添加样式
function addStyles() {
    if (document.getElementById('autoCollectStyles')) return;

    const style = document.createElement('style');
    style.id = 'autoCollectStyles';
    style.textContent = `
        .auto-collect-container {
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
        }

        .settings-header h2 {
            color: #333;
            margin: 0;
        }

        .status-card, .jobs-card, .control-panel {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .status-card h3, .jobs-card h3, .control-panel h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: #333;
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .status-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .status-label {
            font-weight: 500;
            margin-right: 10px;
            color: #666;
        }

        .status-value {
            font-weight: 600;
            color: #333;
        }

        .badge-success {
            background: #28a745;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
        }

        .badge-danger {
            background: #dc3545;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
        }

        .badge-secondary {
            background: #6c757d;
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
        }

        .job-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 10px;
        }

        .job-name {
            font-weight: 600;
            color: #333;
        }

        .job-next-run {
            color: #666;
            font-size: 14px;
        }

        .no-jobs {
            text-align: center;
            color: #999;
            padding: 20px;
        }

        .control-section {
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }

        .control-section:last-child {
            border-bottom: none;
        }

        .control-section h4 {
            margin-bottom: 15px;
            color: #555;
        }

        .button-group {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .time-settings {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        .time-input-group {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .time-input-group label {
            min-width: 120px;
            font-weight: 500;
        }

        .time-input {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .retry-settings {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }

        .retry-input {
            width: 100px;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .hint-text {
            color: #666;
            font-size: 12px;
            font-style: italic;
            flex-basis: 100%;
            margin-top: -5px;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }

        .btn-primary {
            background: #007bff;
            color: white;
        }

        .btn-success {
            background: #28a745;
            color: white;
        }

        .btn-danger {
            background: #dc3545;
            color: white;
        }

        .btn-warning {
            background: #ffc107;
            color: #333;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn i {
            margin-right: 5px;
        }
    `;

    document.head.appendChild(style);
}

// 导出函数供全局使用
window.initAutoCollectPage = initAutoCollectPage;
