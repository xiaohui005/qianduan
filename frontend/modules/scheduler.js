/**
 * 定时采集调度器管理模块
 * 提供前端配置界面
 */

// 全局状态
let schedulerConfig = null;
let schedulerStatus = null;

/**
 * 初始化定时采集配置页面
 */
async function initSchedulerPage() {
  await loadSchedulerConfig();
  await loadSchedulerStatus();
  renderSchedulerPage();
  bindSchedulerEvents();

  // 每30秒刷新一次状态
  setInterval(loadSchedulerStatus, 30000);
}

/**
 * 加载调度器配置
 */
async function loadSchedulerConfig() {
  try {
    schedulerConfig = await getSchedulerConfig();
    console.log('调度器配置:', schedulerConfig);
  } catch (error) {
    console.error('加载配置失败:', error);
    showError('schedulerConfigArea', '加载配置失败');
  }
}

/**
 * 加载调度器状态
 */
async function loadSchedulerStatus() {
  try {
    schedulerStatus = await getSchedulerStatus();
    renderStatusSection();
  } catch (error) {
    console.error('加载状态失败:', error);
  }
}

/**
 * 渲染调度器页面
 */
function renderSchedulerPage() {
  const container = document.getElementById('schedulerPage');
  if (!container) return;

  const html = `
    <div style="max-width: 900px; margin: 0 auto;">
      <h2>定时采集配置</h2>

      <!-- 配置表单 -->
      <div class="scheduler-config-card">
        <h3>采集时间设置</h3>
        <form id="schedulerConfigForm">
          <div style="margin-bottom: 20px;">
            <label class="switch-label">
              <input type="checkbox" id="scheduleEnabled" ${schedulerConfig?.enabled ? 'checked' : ''}>
              <span>启用自动采集</span>
            </label>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="amTime">澳门采集时间：</label>
              <input type="time" id="amTime" value="${schedulerConfig?.am_time || '21:35'}" required>
              <small style="color: #666;">每天在此时间自动采集澳门开奖结果</small>
            </div>

            <div class="form-group">
              <label for="hkTime">香港采集时间：</label>
              <input type="time" id="hkTime" value="${schedulerConfig?.hk_time || '21:30'}" required>
              <small style="color: #666;">每天在此时间自动采集香港开奖结果</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="sourceSelect">数据源：</label>
              <select id="sourceSelect">
                <option value="default" ${schedulerConfig?.source === 'default' ? 'selected' : ''}>默认源</option>
                <option value="wenlongzhu" ${schedulerConfig?.source === 'wenlongzhu' ? 'selected' : ''}>文龙珠源</option>
              </select>
            </div>

            <div class="form-group">
              <label for="retryTimes">失败重试次数：</label>
              <input type="number" id="retryTimes" min="1" max="10" value="${schedulerConfig?.retry_times || 3}">
            </div>
          </div>

          <div style="margin-top: 20px;">
            <button type="submit" class="btn-primary">保存配置</button>
            <button type="button" id="testCollectBtn" class="btn-secondary">立即测试采集</button>
          </div>
        </form>
      </div>

      <!-- 状态显示 -->
      <div class="scheduler-status-card" id="schedulerStatusArea">
        <h3>调度器状态</h3>
        <div id="statusContent">加载中...</div>
      </div>

      <!-- 采集日志 -->
      <div class="scheduler-logs-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <h3>采集日志</h3>
          <button id="refreshLogsBtn" class="btn-secondary">刷新</button>
        </div>
        <div id="schedulerLogsContent">
          <p style="text-align: center; color: #999;">暂无日志</p>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

/**
 * 渲染状态部分
 */
function renderStatusSection() {
  const statusContent = document.getElementById('statusContent');
  if (!statusContent || !schedulerStatus) return;

  const isRunning = schedulerStatus.running;
  const jobCount = schedulerStatus.job_count || 0;
  const jobs = schedulerStatus.jobs || [];

  let html = `
    <div class="status-row">
      <span class="status-label">运行状态：</span>
      <span class="status-badge ${isRunning ? 'status-running' : 'status-stopped'}">
        ${isRunning ? '● 运行中' : '○ 已停止'}
      </span>
    </div>
    <div class="status-row">
      <span class="status-label">任务数量：</span>
      <span>${jobCount} 个</span>
    </div>
    <div class="status-row">
      <span class="status-label">时区：</span>
      <span>${schedulerStatus.timezone || 'Asia/Shanghai'}</span>
    </div>
  `;

  if (jobs.length > 0) {
    html += `
      <div style="margin-top: 15px;">
        <h4 style="margin-bottom: 10px;">计划任务：</h4>
        <table class="scheduler-jobs-table">
          <thead>
            <tr>
              <th>任务名称</th>
              <th>下次执行时间</th>
            </tr>
          </thead>
          <tbody>
    `;

    jobs.forEach(job => {
      html += `
        <tr>
          <td>${job.name || job.id}</td>
          <td>${job.next_run || '-'}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  statusContent.innerHTML = html;
}

/**
 * 绑定事件
 */
function bindSchedulerEvents() {
  // 表单提交
  const form = document.getElementById('schedulerConfigForm');
  if (form) {
    form.addEventListener('submit', handleConfigSubmit);
  }

  // 立即测试采集
  const testBtn = document.getElementById('testCollectBtn');
  if (testBtn) {
    testBtn.addEventListener('click', handleTestCollect);
  }

  // 刷新日志
  const refreshLogsBtn = document.getElementById('refreshLogsBtn');
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', loadSchedulerLogs);
  }
}

/**
 * 处理配置保存
 */
async function handleConfigSubmit(e) {
  e.preventDefault();

  const config = {
    enabled: document.getElementById('scheduleEnabled').checked,
    am_time: document.getElementById('amTime').value,
    hk_time: document.getElementById('hkTime').value,
    source: document.getElementById('sourceSelect').value,
    retry_times: parseInt(document.getElementById('retryTimes').value)
  };

  try {
    const result = await saveSchedulerConfig(config);
    if (result.success) {
      alert('配置已保存并生效！');
      await loadSchedulerStatus();
    } else {
      alert('保存失败：' + result.message);
    }
  } catch (error) {
    console.error('保存配置失败:', error);
    alert('保存失败：' + error.message);
  }
}

/**
 * 处理测试采集
 */
async function handleTestCollect() {
  const source = document.getElementById('sourceSelect').value;

  if (!confirm('确定要立即触发采集吗？\n将同时采集澳门和香港数据。')) {
    return;
  }

  try {
    // 触发澳门采集
    const amResult = await triggerCollect('am', source);
    // 触发香港采集
    const hkResult = await triggerCollect('hk', source);

    alert(`采集已触发：\n澳门：${amResult.message}\n香港：${hkResult.message}`);

    // 1秒后刷新日志
    setTimeout(loadSchedulerLogs, 1000);
  } catch (error) {
    console.error('触发采集失败:', error);
    alert('触发失败：' + error.message);
  }
}

/**
 * 加载采集日志
 */
async function loadSchedulerLogs() {
  try {
    const result = await getSchedulerLogs(50);
    renderLogs(result.logs || []);
  } catch (error) {
    console.error('加载日志失败:', error);
  }
}

/**
 * 渲染日志
 */
function renderLogs(logs) {
  const container = document.getElementById('schedulerLogsContent');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999;">暂无日志</p>';
    return;
  }

  let html = `
    <table class="scheduler-logs-table">
      <thead>
        <tr>
          <th>时间</th>
          <th>彩种</th>
          <th>状态</th>
          <th>消息</th>
          <th>数据量</th>
        </tr>
      </thead>
      <tbody>
  `;

  logs.forEach(log => {
    const statusClass = {
      'success': 'log-success',
      'error': 'log-error',
      'warning': 'log-warning'
    }[log.status] || '';

    html += `
      <tr>
        <td>${log.time}</td>
        <td>${log.lottery_type === 'am' ? '澳门' : '香港'}</td>
        <td><span class="log-status ${statusClass}">${getStatusText(log.status)}</span></td>
        <td>${log.message}</td>
        <td>${log.data_count > 0 ? log.data_count + ' 条' : '-'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

/**
 * 获取状态文本
 */
function getStatusText(status) {
  const statusMap = {
    'success': '成功',
    'error': '失败',
    'warning': '警告'
  };
  return statusMap[status] || status;
}

// 导出函数（如果需要在其他地方调用）
window.initSchedulerPage = initSchedulerPage;

console.log('定时采集调度器模块已加载');
