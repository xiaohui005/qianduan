/**
 * 个位分析模块 (Units Analysis Module)
 * 功能：第N个码个位分析（1组/2组遗漏和连续命中统计）
 *
 * API端点: GET /units_analysis?lottery_type={am|hk}&year={year}
 *
 * 主要功能：
 * - 选择彩种（澳门/香港）
 * - 选择位置（第1-7位）
 * - 1组/2组遗漏统计
 * - 1组/2组连续命中统计
 * - 交替遗漏统计
 * - 年份筛选
 * - 高亮阀值设置
 * - 分页浏览
 *
 * 说明：
 * - 1组：01,03,05,07,09,11,13,15,17,19,21,23,25,27,29,31,33,35,37,39,41,43,45,47,49
 * - 2组：02,04,06,08,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48
 *
 * @module units-analysis
 */

// ==================== 模块状态 ====================
let currentUnitsType = 'am';
let currentUnitsPos = 7;
let currentUnitsYear = '';
let unitsAnalysisCache = null;

// ==================== 核心渲染函数 ====================
/**
 * 渲染个位分析表格
 * @param {Object} data - 后端返回的分析数据
 * @param {number} pos - 当前选择的位置（1-7）
 * @param {number} page - 当前页码
 */
function renderUnitsTable(data, pos, page = 1) {
  const PAGE_SIZE = 20;
  const unitsResult = document.getElementById('unitsResult');

  if (!unitsResult) return;

  if (!data || !data.data || !data.data[pos-1]) {
    unitsResult.innerHTML = '<div class="alert alert-error">暂无数据</div>';
    return;
  }

  const posData = data.data[pos-1];

  // 年份按钮组
  let years = [];
  if (posData.length > 0) {
    years = Array.from(new Set(posData.map(row => row.period.substring(0, 4)))).sort();
  }
  let yearBtnsHtml = '';
  if (years.length > 0) {
    yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
    yearBtnsHtml += `<button class="units-year-btn${!currentUnitsYear ? ' active' : ''}" data-year="">全部</button>`;
    years.forEach(y => {
      yearBtnsHtml += `<button class="units-year-btn${currentUnitsYear == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
    });
    yearBtnsHtml += '</div>';
  }

  // 说明
  let descHtml = `<div style="margin-bottom:8px;color:#2980d9;font-size:14px;">${data.desc || ''}</div>`;

  // 最大遗漏和当前遗漏统计框
  let missHtml = '';
  if (data.max_miss && data.cur_miss && data.max_miss[pos-1] && data.cur_miss[pos-1]) {
    missHtml = `<div style="margin-bottom:12px;display:flex;gap:24px;align-items:center;">`
      + `<div style="border:1px solid #d35400;border-radius:7px;padding:8px 18px;background:#fffbe9;min-width:150px;">`
      + `<div style="color:#d35400;font-weight:bold;font-size:15px;">1组遗漏</div>`
      + `<div style="color:#d35400;">最大: <b>${data.max_miss[pos-1].miss1}</b> 当前: <b>${data.cur_miss[pos-1].miss1}</b></div>`
      + `</div>`
      + `<div style="border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:150px;">`
      + `<div style="color:#2980d9;font-weight:bold;font-size:15px;">2组遗漏</div>`
      + `<div style="color:#2980d9;">最大: <b>${data.max_miss[pos-1].miss2}</b> 当前: <b>${data.cur_miss[pos-1].miss2}</b></div>`
      + `</div>`
      + `<div style="border:1px solid #c0392b;border-radius:7px;padding:8px 18px;background:#fff3f3;min-width:180px;">`
      + `<div style="color:#c0392b;font-weight:bold;font-size:15px;">交替遗漏</div>`
      + `<div style="color:#c0392b;">最大: <b>${data.max_alt_miss && data.max_alt_miss[pos-1] ? data.max_alt_miss[pos-1] : 0}</b> 当前: <b>${data.cur_alt_miss && data.cur_alt_miss[pos-1] ? data.cur_alt_miss[pos-1] : 0}</b></div>`
      + `</div>`
      + `</div>`;
  }

  // 分页数据
  const totalPages = Math.ceil(posData.length / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageData = posData.slice(startIdx, startIdx + PAGE_SIZE);

  // 阀值输入框
  let anyThresholdHtml = '<div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">';
  anyThresholdHtml += '<label for="anyMissThresholdInput" style="font-weight:bold;font-size:15px;color:#c0392b;">高亮阀值：</label>';
  anyThresholdHtml += '<input type="number" id="anyMissThresholdInput" value="' + (window.anyMissThreshold || 8) + '" min="1" max="99" style="width:70px;height:32px;font-size:16px;border:1px solid #e0b5b5;border-radius:6px;padding:0 10px;outline:none;transition:border 0.2s;box-shadow:0 1px 2px #f0f4fa;">';
  anyThresholdHtml += '</div>';

  let html = anyThresholdHtml + yearBtnsHtml + descHtml + missHtml;
  html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr><th>期号</th><th>开奖号码</th><th>1组遗漏</th><th>2组遗漏</th><th>1组连续命中</th><th>2组连续命中</th><th>交替遗漏</th></tr>';

  const anyThreshold = window.anyMissThreshold || 8;
  pageData.forEach(row => {
    let miss1Val = Number(row.miss1);
    let miss2Val = Number(row.miss2);
    let altMissVal = Number(row.alt_miss);
    let miss1Cell = miss1Val > anyThreshold ? `<td style='background:#ffb3b3;color:#d35400;font-weight:bold;'>${miss1Val}</td>` : `<td>${miss1Val}</td>`;
    let miss2Cell = miss2Val > anyThreshold ? `<td style='background:#b3d1ff;color:#2980d9;font-weight:bold;'>${miss2Val}</td>` : `<td>${miss2Val}</td>`;
    let altMissCell = altMissVal > anyThreshold ? `<td style='background:#ffe066;color:#c0392b;font-weight:bold;'>${altMissVal}</td>` : `<td>${altMissVal}</td>`;
    const rowYear = row.period.substring(0, 4);
    const highlight = currentUnitsYear && rowYear === currentUnitsYear;
    html += `<tr${highlight ? " style='background:#ffe9b3;'" : ''}><td>${row.period}</td><td>${row.num}</td>${miss1Cell}${miss2Cell}<td>${row.hit1}</td><td>${row.hit2}</td>${altMissCell}</tr>`;
  });
  html += '</table>';

  // 分页按钮
  html += `<div style='margin-top:8px;'>第 ${page} / ${totalPages} 页`;
  if (page > 1) html += ` <button id='unitsPrevPage' class="btn-secondary">上一页</button>`;
  if (page < totalPages) html += ` <button id='unitsNextPage' class="btn-secondary">下一页</button>`;
  html += `</div>`;

  unitsResult.innerHTML = html;

  // 年份按钮事件
  document.querySelectorAll('.units-year-btn').forEach(btn => {
    btn.onclick = function() {
      currentUnitsYear = this.dataset.year;
      loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);
    };
  });

  // 分页按钮事件
  if (page > 1) {
    document.getElementById('unitsPrevPage').onclick = () => renderUnitsTable(data, pos, page - 1);
  }
  if (page < totalPages) {
    document.getElementById('unitsNextPage').onclick = () => renderUnitsTable(data, pos, page + 1);
  }

  // 阀值输入框事件
  const input = document.getElementById('anyMissThresholdInput');
  if (input) {
    input.value = window.anyMissThreshold || 8;
    input.oninput = function() {
      window.anyMissThreshold = parseInt(this.value) || 8;
      input.value = window.anyMissThreshold;
      loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);
    };
  }
}

// ==================== 数据加载函数 ====================
/**
 * 加载个位分析数据
 * @param {string} type - 彩种类型 (am|hk)
 * @param {number} pos - 位置 (1-7)
 * @param {string} year - 年份筛选（可选）
 */
function loadUnitsAnalysis(type, pos, year) {
  if (type) currentUnitsType = type;
  if (pos) currentUnitsPos = pos;
  if (year !== undefined) currentUnitsYear = year;

  // 按钮高亮
  document.querySelectorAll('.units-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentUnitsType);
  });
  document.querySelectorAll('.units-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentUnitsPos);
  });

  const unitsResult = document.getElementById('unitsResult');
  if (!unitsResult) return;

  unitsResult.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-message">加载中...</div></div>';

  let url = window.BACKEND_URL + '/units_analysis?lottery_type=' + currentUnitsType;
  if (currentUnitsYear) url += '&year=' + currentUnitsYear;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.data || !data.data.length) {
        unitsResult.innerHTML = '<div class="alert alert-error">暂无数据</div>';
        return;
      }
      unitsAnalysisCache = data;
      renderUnitsTable(data, currentUnitsPos);
    })
    .catch(error => {
      console.error('加载个位分析失败:', error);
      unitsResult.innerHTML = `<div class="alert alert-error">加载失败：${error.message}</div>`;
    });
}

// ==================== 模块初始化 ====================
/**
 * 初始化个位分析模块
 * - 绑定彩种切换按钮事件
 * - 绑定位置切换按钮事件
 * - 执行首次数据加载
 */
function initUnitsAnalysisModule() {
  console.log('🎯 Initializing Units Analysis module...');

  // 彩种按钮事件
  document.querySelectorAll('.units-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadUnitsAnalysis(this.dataset.type, currentUnitsPos, currentUnitsYear);
    });
  });

  // 位置按钮事件
  document.querySelectorAll('.units-pos-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadUnitsAnalysis(currentUnitsType, parseInt(this.dataset.pos), currentUnitsYear);
    });
  });

  // 年份下拉框事件
  const yearSelect = document.getElementById('unitsYearSelect');
  if (yearSelect && typeof initYearFilter === 'function') {
    initYearFilter('unitsYearSelect', function(year) {
      currentUnitsYear = year;
      loadUnitsAnalysis(currentUnitsType, currentUnitsPos, year);
    });
  }

  // 首次加载：默认澳门第7位
  loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);

  console.log('✅ Units Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initUnitsAnalysisModule = initUnitsAnalysisModule;
window.unitsAnalysisModule = {
  loadUnitsAnalysis,
  renderUnitsTable,
  getCurrentType: () => currentUnitsType,
  getCurrentPos: () => currentUnitsPos
};
