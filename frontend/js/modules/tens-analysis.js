/**
 * 十位分析模块 (Tens Analysis Module)
 * 功能：第N位十位分析，包括遗漏统计、年份筛选、CSV导出等
 *
 * API端点: GET /tens_analysis?lottery_type={am|hk}&year={year}
 *
 * 主要功能：
 * - 选择彩种（澳门/香港）
 * - 选择位置（第1-7位）
 * - 十位组合遗漏统计
 * - 年份筛选
 * - 遗漏高亮（可设置阀值）
 * - CSV导出（本页/全部）
 * - 分页浏览
 *
 * @module tens-analysis
 */

// ==================== 模块状态 ====================
let tensAnalysisCache = { am: null, hk: null };
let currentTensType = 'am';
let currentTensPos = 7;
let tensPageNum = 1;
const TENS_PAGE_SIZE = 20;

// ==================== 核心渲染函数 ====================
/**
 * 渲染十位分析表格
 * @param {Object} data - 后端返回的分析数据
 * @param {number} pos - 当前选择的位置（1-7）
 * @param {number} page - 当前页码
 */
function renderTensTable(data, pos, page = 1) {
  const tensResult = document.getElementById('tensResult');
  if (!tensResult) return;

  if (!data || !data.data || !data.data[pos-1] || !data.max_miss || !data.max_miss[pos-1] || !data.max_miss_period || !data.max_miss_period[pos-1]) {
    tensResult.innerHTML = '<span style="color:red;">暂无数据</span>';
    return;
  }

  const tensCols = data.tens_cols;
  const posData = data.data[pos-1];
  const maxMiss = data.max_miss[pos-1];
  const maxMissPeriod = data.max_miss_period[pos-1];
  const totalPages = Math.ceil(posData.length / TENS_PAGE_SIZE);
  const startIdx = (page - 1) * TENS_PAGE_SIZE;
  const pageData = posData.slice(startIdx, startIdx + TENS_PAGE_SIZE);
  tensPageNum = page;

  // 年份按钮组
  let years = [];
  if (posData.length > 0) {
    years = Array.from(new Set(posData.map(row => row.period.substring(0, 4)))).sort();
  }
  let yearBtnsHtml = '';
  if (years.length > 0) {
    yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
    yearBtnsHtml += `<button class="tens-year-btn${!window.currentTensYear ? ' active' : ''}" data-year="">全部</button>`;
    years.forEach(y => {
      yearBtnsHtml += `<button class="tens-year-btn${window.currentTensYear == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
    });
    yearBtnsHtml += '</div>';
  }

  // 组合和最大遗漏信息框
  let infoBox = '<div style="border:1px solid #bbb;padding:10px 12px;margin-bottom:12px;border-radius:8px;background:#fafbfc;">';
  infoBox += '<div style="margin-bottom:6px;"><b>组合：</b>';
  tensCols.forEach(col => {
    infoBox += `<span style="display:inline-block;margin-right:10px;">${col}</span>`;
  });
  infoBox += '</div>';

  // 每个最大遗漏和期号单独一个小框
  infoBox += '<div style="display:flex;flex-wrap:wrap;gap:10px;">';
  tensCols.forEach(col => {
    infoBox += `<div style="border:1px solid #dcdcdc;border-radius:6px;padding:6px 10px;min-width:70px;text-align:center;background:#fff;">
      <div style="font-weight:bold;color:#2980d9;">${col}</div>
      <div style="color:#d35400;">遗漏:${maxMiss[col]}</div>
      <div style="color:#555;">期号:${maxMissPeriod[col] || ''}</div>
    </div>`;
  });
  infoBox += '</div></div>';

  // 阀值输入框
  let thresholdHtml = '<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">';
  thresholdHtml += '<label for="tensThresholdInput" style="font-weight:bold;font-size:15px;color:#2980d9;">遗漏高亮阀值：</label>';
  thresholdHtml += '<input type="number" id="tensThresholdInput" value="' + (window.tensThreshold || 12) + '" min="1" max="99" style="width:70px;height:32px;font-size:16px;border:1px solid #b5c6e0;border-radius:6px;padding:0 10px;outline:none;transition:border 0.2s;box-shadow:0 1px 2px #f0f4fa;">';
  thresholdHtml += '</div>';

  // 导出按钮
  let exportBtnHtml = '<button class="export-tens-btn btn-primary" style="margin-bottom:8px;">导出本页</button> <button class="export-tens-all-btn btn-primary" style="margin-bottom:8px;margin-left:8px;">导出全部</button>';

  let html = thresholdHtml + yearBtnsHtml + infoBox + exportBtnHtml;
  html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr><th>期号</th><th>开奖号码</th>';
  tensCols.forEach(col => html += `<th>${col}</th>`);
  html += '</tr>';

  const threshold = window.tensThreshold || 12;
  pageData.forEach(row => {
    const rowYear = row.period.substring(0, 4);
    const highlight = window.currentTensYear && rowYear === window.currentTensYear;
    html += `<tr${highlight ? " style='background:#ffe9b3;'" : ''}><td>${row.period}</td><td>${row.num}</td>`;
    tensCols.forEach(col => {
      if (row.miss[col] === 0) {
        html += `<td style='color:#e74c3c;font-weight:bold;'>0</td>`;
      } else if (row.miss[col] > threshold) {
        html += `<td style='background:#ffb3b3;color:#c0392b;font-weight:bold;'>${row.miss[col]}</td>`;
      } else {
        html += `<td>${row.miss[col]}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</table>';

  // 分页按钮
  html += `<div style='margin-top:8px;'>第 ${page} / ${totalPages} 页`;
  if (page > 1) html += ` <button id='tensPrevPage' class="btn-secondary">上一页</button>`;
  if (page < totalPages) html += ` <button id='tensNextPage' class="btn-secondary">下一页</button>`;
  html += `</div>`;

  tensResult.innerHTML = html;

  // 年份按钮事件
  document.querySelectorAll('.tens-year-btn').forEach(btn => {
    btn.onclick = function() {
      window.currentTensYear = this.dataset.year;
      loadTensAnalysis(currentTensType, currentTensPos, 1, window.currentTensYear);
    };
  });

  // 分页按钮事件
  if (page > 1) {
    document.getElementById('tensPrevPage').onclick = () => loadTensAnalysis(currentTensType, currentTensPos, page - 1, window.currentTensYear);
  }
  if (page < totalPages) {
    document.getElementById('tensNextPage').onclick = () => loadTensAnalysis(currentTensType, currentTensPos, page + 1, window.currentTensYear);
  }

  // 导出本页
  const exportBtn = tensResult.querySelector('.export-tens-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const csvRows = [
        ['期号','开奖号码',...tensCols],
        ...pageData.map(row => [
          row.period,
          row.num,
          ...tensCols.map(col => row.miss[col])
        ])
      ];
      if (typeof window.downloadCSV === 'function') {
        window.downloadCSV(csvRows, '十位分析表.csv');
      } else {
        console.error('downloadCSV function not found');
      }
    };
  }

  // 导出全部
  const exportAllBtn = tensResult.querySelector('.export-tens-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = async () => {
      try {
        const type = currentTensType || 'am';
        const pos = currentTensPos || 1;
        let url = `${window.BACKEND_URL}/tens_analysis?lottery_type=${type}&pos=${pos}&page=1&page_size=10000`;
        const res = await fetch(url);
        const allData = await res.json();
        const tensColsAll = allData.tens_cols || tensCols;
        const allRows = (allData.data && allData.data[pos-1]) || [];
        const csvRows = [
          ['期号','开奖号码',...tensColsAll],
          ...allRows.map(row => [
            row.period,
            row.num,
            ...tensColsAll.map(col => row.miss[col])
          ])
        ];
        if (typeof window.downloadCSV === 'function') {
          window.downloadCSV(csvRows, '十位分析表_全部.csv');
        } else {
          console.error('downloadCSV function not found');
        }
      } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
      }
    };
  }

  // 阀值输入框事件
  const thresholdInput = document.getElementById('tensThresholdInput');
  if (thresholdInput) {
    thresholdInput.oninput = function() {
      window.tensThreshold = parseInt(this.value) || 12;
      loadTensAnalysis(currentTensType, currentTensPos, page, window.currentTensYear);
    };
  }
}

// ==================== 数据加载函数 ====================
/**
 * 加载十位分析数据
 * @param {string} type - 彩种类型 (am|hk)
 * @param {number} pos - 位置 (1-7)
 * @param {number} page - 页码
 * @param {string} year - 年份筛选（可选）
 */
function loadTensAnalysis(type, pos, page = 1, year = '') {
  if (type) currentTensType = type;
  if (pos) currentTensPos = pos;
  if (year !== undefined) window.currentTensYear = year;
  else if (window.currentTensYear === undefined) window.currentTensYear = '';

  // 按钮高亮
  document.querySelectorAll('.tens-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentTensType);
  });
  document.querySelectorAll('.tens-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentTensPos);
  });

  const tensResult = document.getElementById('tensResult');
  if (!tensResult) return;

  tensResult.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-message">加载中...</div></div>';

  // 每次切换都重新请求后端，带 year 参数
  let url = window.BACKEND_URL + '/tens_analysis?lottery_type=' + currentTensType;
  if (window.currentTensYear) url += '&year=' + window.currentTensYear;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.data || !data.data.length) {
        tensResult.innerHTML = '<div class="alert alert-error">暂无数据</div>';
        return;
      }
      renderTensTable(data, currentTensPos, page);
    })
    .catch(error => {
      console.error('加载十位分析失败:', error);
      tensResult.innerHTML = `<div class="alert alert-error">加载失败：${error.message}</div>`;
    });
}

// ==================== 模块初始化 ====================
/**
 * 初始化十位分析模块
 * - 绑定彩种切换按钮事件
 * - 绑定位置切换按钮事件
 * - 执行首次数据加载
 */
function initTensAnalysisModule() {
  console.log('🎯 Initializing Tens Analysis module...');

  // 彩种按钮事件
  document.querySelectorAll('.tens-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadTensAnalysis(this.dataset.type, currentTensPos);
    });
  });

  // 位置按钮事件
  document.querySelectorAll('.tens-pos-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadTensAnalysis(currentTensType, parseInt(this.dataset.pos));
    });
  });

  // 年份下拉框事件
  const yearSelect = document.getElementById('tensYearSelect');
  if (yearSelect && typeof initYearFilter === 'function') {
    initYearFilter('tensYearSelect', function(year) {
      loadTensAnalysis(currentTensType, currentTensPos, 1, year);
    });
  }

  // 首次加载：默认澳门第7位
  loadTensAnalysis(currentTensType, currentTensPos, 1, '');

  console.log('✅ Tens Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initTensAnalysisModule = initTensAnalysisModule;
window.tensAnalysisModule = {
  loadTensAnalysis,
  renderTensTable,
  getCurrentType: () => currentTensType,
  getCurrentPos: () => currentTensPos
};
