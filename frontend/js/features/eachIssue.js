/**
 * 每期分析模块
 * 功能：分析每期开奖数据和遗漏情况
 */

// ==================== 模块状态 ====================
let currentEachIssueType = 'am';
let currentEachIssuePage = 1;
let currentEachIssueUnitGroup = '';
let eachIssueTotalPages = 1;
const eachIssuePageSize = 30;

// ==================== 核心功能函数 ====================

/**
 * 加载每期分析数据
 * @param {string} type - 彩种类型（am/hk）
 * @param {number} page - 页码
 */
async function loadEachIssueAnalysis(type = 'am', page = 1) {
  const eachIssueResult = document.getElementById('eachIssueResult');

  if (!eachIssueResult) {
    console.error('未找到 eachIssueResult 元素');
    return;
  }

  currentEachIssueType = type;
  currentEachIssuePage = page;

  eachIssueResult.innerHTML = '<div style="text-align: center; padding: 20px;">正在加载每期分析数据...</div>';

  try {
    let url = `${window.BACKEND_URL}/each_issue_analysis?lottery_type=${type}&page=${page}&page_size=${eachIssuePageSize}`;
    if (currentEachIssueUnitGroup) {
      url += `&unit_group=${currentEachIssueUnitGroup}`;
    }

    console.log('请求URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('每期分析数据:', data);

    eachIssueTotalPages = Math.ceil((data.total || 0) / (data.page_size || eachIssuePageSize));

    renderEachIssueTable(
      data.data || [],
      data.page || page,
      eachIssueTotalPages,
      data.current_max_miss,
      data.current_max_miss_period,
      data.history_max_miss,
      data.history_max_miss_period
    );
  } catch (error) {
    console.error('加载每期分析失败:', error);
    eachIssueResult.innerHTML = `<div style="color: red; padding: 20px;">加载失败: ${error.message}</div>`;
  }
}

/**
 * 渲染每期分析表格
 */
function renderEachIssueTable(rows, page, totalPages, currentMaxMiss, currentMaxMissPeriod, historyMaxMiss, historyMaxMissPeriod) {
  const eachIssueResult = document.getElementById('eachIssueResult');
  if (!eachIssueResult) return;

  if (!rows || rows.length === 0) {
    eachIssueResult.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">暂无数据</div>';
    return;
  }

  let html = '';
  const qrEntries = [];

  // 显示当前筛选条件
  if (currentEachIssueUnitGroup) {
    const groupNames = {
      '0': '0/5组',
      '1': '1/6组',
      '2': '2/7组',
      '3': '3/8组',
      '4': '4/9组'
    };
    html += `<div style="margin-bottom:12px;padding:8px 12px;background:#e8f4fd;border:1px solid #2980d9;border-radius:6px;color:#2980d9;font-weight:bold;">
      当前筛选：${groupNames[currentEachIssueUnitGroup]}（只显示期号个位数为该分组的记录）
    </div>`;
  }

  // 遗漏统计
  html += `<div style="margin-bottom:12px;">
    <b>当前最大遗漏：</b><span style="color:#c0392b;font-weight:bold;">${currentMaxMiss || 0}</span>
    <span style="color:#888;">(期号: ${currentMaxMissPeriod || '-'})</span>
    &nbsp;&nbsp;
    <b>历史最大遗漏：</b><span style="color:#c0392b;font-weight:bold;">${historyMaxMiss || 0}</span>
    <span style="color:#888;">(期号: ${historyMaxMissPeriod || '-'})</span>
  </div>`;

  // 导出按钮
  html += `<div style="margin-bottom:12px;">
    <button class="export-each-issue-btn btn-secondary">导出本页</button>
    <button class="export-each-issue-all-btn btn-secondary" style="margin-left:8px;">导出全部</button>
  </div>`;

  // 表格
  html += `
    <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">
      <thead>
        <tr>
          <th>期号</th>
          <th>开奖时间</th>
          <th>开奖号码</th>
          <th>二维码</th>
          <th>已经有几期没有开了</th>
          <th>状态</th>
        </tr>
      </thead>
      <tbody>
  `;

  rows.forEach(row => {
    const statusText = row.stop_reason === 'hit' ? '<span style="color:green;font-weight:bold;">✓ 已命中</span>' :
                       row.stop_reason === 'end' ? '<span style="color:#888;">未命中到末期</span>' : '-';
    const qrId = `each-issue-qr-${row.period}`;
    const qrText = row.numbers || '';
    qrEntries.push({ id: qrId, text: qrText });
    html += `
      <tr>
        <td>${row.period}</td>
        <td>${row.open_time}</td>
        <td>${row.numbers}</td>
        <td><div class="each-issue-qr" id="${qrId}" data-qr="${qrText}"></div></td>
        <td style="color:#c0392b;font-weight:bold;">${row.miss_count}</td>
        <td>${statusText}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  // 分页
  html += `<div style="margin-top:15px;text-align:center;">`;
  html += `<span style="margin-right:15px;">第 ${page} / ${totalPages} 页</span>`;

  if (page > 1) {
    html += `<button id="eachIssuePrevPage" class="btn-secondary" style="margin-right:8px;">上一页</button>`;
  }

  if (page < totalPages) {
    html += `<button id="eachIssueNextPage" class="btn-secondary">下一页</button>`;
  }

  html += `</div>`;

  eachIssueResult.innerHTML = html;

  if (qrEntries.length > 0) {
    if (window.QRTool) {
      window.QRTool.renderBatch(qrEntries, 96);
    } else {
      console.warn('QRTool 未加载，无法渲染每期分析二维码');
    }
  }

  // 绑定分页按钮事件
  const prevBtn = document.getElementById('eachIssuePrevPage');
  const nextBtn = document.getElementById('eachIssueNextPage');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentEachIssuePage > 1) {
        currentEachIssuePage--;
        loadEachIssueAnalysis(currentEachIssueType, currentEachIssuePage);
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentEachIssuePage < eachIssueTotalPages) {
        currentEachIssuePage++;
        loadEachIssueAnalysis(currentEachIssueType, currentEachIssuePage);
      }
    };
  }

  // 导出本页
  const exportBtn = eachIssueResult.querySelector('.export-each-issue-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const csvRows = [
        ['期号', '开奖时间', '开奖号码', '已经有几期没有开了', '状态'],
        ...rows.map(row => [
          row.period,
          row.open_time,
          row.numbers,
          row.miss_count,
          row.stop_reason === 'hit' ? '已命中' : (row.stop_reason === 'end' ? '未命中到末期' : '-')
        ])
      ];
      if (typeof window.downloadCSV === 'function') {
        window.downloadCSV(csvRows, '每期分析表.csv');
      } else {
        console.error('downloadCSV 函数不存在');
      }
    };
  }

  // 导出全部
  const exportAllBtn = eachIssueResult.querySelector('.export-each-issue-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = async () => {
      try {
        let url = `${window.BACKEND_URL}/each_issue_analysis?lottery_type=${currentEachIssueType}&page=1&page_size=10000`;
        if (currentEachIssueUnitGroup) {
          url += `&unit_group=${currentEachIssueUnitGroup}`;
        }
        const res = await fetch(url);
        const allData = await res.json();
        const allRows = Array.isArray(allData.data) ? allData.data : [];
        const csvRows = [
          ['期号', '开奖时间', '开奖号码', '已经有几期没有开了', '状态'],
          ...allRows.map(row => [
            row.period,
            row.open_time,
            row.numbers,
            row.miss_count,
            row.stop_reason === 'hit' ? '已命中' : (row.stop_reason === 'end' ? '未命中到末期' : '-')
          ])
        ];
        if (typeof window.downloadCSV === 'function') {
          window.downloadCSV(csvRows, '每期分析表_全部.csv');
        } else {
          console.error('downloadCSV 函数不存在');
        }
      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
      }
    };
  }
}

// ==================== 模块初始化 ====================

/**
 * 初始化每期分析模块
 */
function initEachIssue() {
  console.log('🎯 初始化每期分析模块...');

  // 绑定彩种选择按钮
  document.querySelectorAll('.each-issue-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.each-issue-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentEachIssueType = this.dataset.type;
      currentEachIssuePage = 1;
      loadEachIssueAnalysis(currentEachIssueType, currentEachIssuePage);
    });
  });

  // 绑定期数个位分组按钮
  document.querySelectorAll('.each-issue-unit-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.each-issue-unit-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentEachIssueUnitGroup = this.dataset.group;
      currentEachIssuePage = 1;
      loadEachIssueAnalysis(currentEachIssueType, currentEachIssuePage);
    });
  });

  // 自动加载初始数据
  loadEachIssueAnalysis(currentEachIssueType, currentEachIssuePage);

  console.log('✅ 每期分析模块初始化完成');
}

// ==================== 模块导出 ====================
window.initEachIssue = initEachIssue;
window.loadEachIssueAnalysis = loadEachIssueAnalysis;

console.log('✅ 每期分析模块已加载');
