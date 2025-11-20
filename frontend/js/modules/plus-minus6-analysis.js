/**
 * 加减前6码分析模块 (Plus Minus 6 Analysis Module)
 * 功能：±6码分析，包括12码预测、遗漏统计、命中情况等
 *
 * API端点: GET /plus_minus6_analysis?lottery_type={am|hk}&pos={pos}&page={page}&page_size={size}&year={year}
 *
 * 主要功能：
 * - 选择彩种（澳门/香港）
 * - 选择球位置（第1-7位）
 * - 加减0~6组（±0, ±1, ±2, ±3, ±4, ±5, ±6）
 * - 12码预测（最大遗漏的2组）
 * - 各组遗漏统计
 * - 命中情况分析
 * - 年份筛选
 * - 分页浏览
 *
 * @module plus-minus6-analysis
 */

// ==================== 模块状态 ====================
let currentPm6Type = 'am';
let currentPm6Pos = 7;
let currentPm6Page = 1;
let currentPm6Year = '';

// ==================== 数据加载函数 ====================
/**
 * 加载加减前6码分析数据
 * @param {string} type - 彩种类型 (am|hk)
 * @param {number} pos - 球位置 (1-7)
 * @param {number} page - 页码
 * @param {string} year - 年份筛选（可选）
 */
function loadPlusMinus6Analysis(type, pos, page, year) {
  if (typeof type === 'string' && type) currentPm6Type = type;
  if (typeof pos !== 'undefined' && pos !== null && pos !== '') currentPm6Pos = Number(pos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') currentPm6Page = Number(page) || 1;
  if (typeof year !== 'undefined') currentPm6Year = year;

  // 按钮高亮
  document.querySelectorAll('.pm6-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentPm6Type);
  });
  document.querySelectorAll('.pm6-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentPm6Pos);
  });
  document.querySelectorAll('.pm6-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.year == currentPm6Year);
  });

  const pm6Result = document.getElementById('pm6Result');
  if (!pm6Result) return;

  pm6Result.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-message">加载中...</div></div>';

  let url = `${window.BACKEND_URL}/plus_minus6_analysis?lottery_type=${currentPm6Type}&pos=${currentPm6Pos}&page=${currentPm6Page}&page_size=20`;
  if (currentPm6Year) url += `&year=${currentPm6Year}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      renderPlusMinus6Result(data);
    })
    .catch(error => {
      console.error('加载±6码分析失败:', error);
      pm6Result.innerHTML = `<div class="alert alert-error">加载失败：${error.message}</div>`;
    });
}

// ==================== 渲染函数 ====================
/**
 * 渲染±6码分析结果
 * @param {Object} data - 后端返回的分析数据
 */
function renderPlusMinus6Result(data) {
  // 年份按钮组
  let years = data.years || [];
  let yearBtnsHtml = '';
  if (years.length > 0) {
    yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
    yearBtnsHtml += `<button class="pm6-year-btn${!currentPm6Year ? ' active' : ''}" data-year="">全部</button>`;
    years.forEach(y => {
      yearBtnsHtml += `<button class="pm6-year-btn${currentPm6Year == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
    });
    yearBtnsHtml += '</div>';
  }

  const yearBtnsContainer = document.getElementById('pm6YearBtns');
  if (yearBtnsContainer) {
    yearBtnsContainer.innerHTML = yearBtnsHtml;
  }

  // 年份按钮事件
  document.querySelectorAll('.pm6-year-btn').forEach(btn => {
    btn.onclick = function() {
      loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, 1, this.dataset.year);
    };
  });

  // 最大遗漏和当前遗漏
  let statsHtml = '';
  if (Array.isArray(data.max_miss) && Array.isArray(data.cur_miss) && data.max_miss.length === 6 && data.cur_miss.length === 6) {
    statsHtml = '<div style="margin-bottom:8px;">';
    for (let i = 0; i < 6; i++) {
      statsHtml += `<div style="margin-bottom:2px;">加减${i+1} 最大遗漏：<b>${data.max_miss[i] ?? '-'}</b>，当前遗漏：<b>${data.cur_miss[i] ?? '-'}</b></div>`;
    }
    statsHtml += '</div>';
  } else {
    statsHtml = '<div style="margin-bottom:8px;">最大遗漏/当前遗漏数据缺失</div>';
  }

  const statsContainer = document.getElementById('pm6Stats');
  if (statsContainer) {
    statsContainer.innerHTML = statsHtml;
  }

  // 只在最大遗漏后展示12码预测分组
  let predictHtml = '';
  if (data.predict && Array.isArray(data.predict.groups)) {
    predictHtml += `<div style='margin-bottom:18px;padding:10px 16px;border:2px solid #27ae60;border-radius:10px;background:#f4f8ff;'>`;
    predictHtml += `<div style='font-size:17px;font-weight:bold;color:#27ae60;margin-bottom:6px;'>${data.predict.desc || '最新一期12码预测'}</div>`;
    data.predict.groups.forEach(g => {
      predictHtml += `<div style='margin-bottom:4px;'><b>加减${g.n}：</b> <span style='color:#2980d9;'>${g.numbers.join(', ')}</span></div>`;
    });
    predictHtml += '</div>';
  }

  const predictContainer = document.getElementById('pm6Predict');
  if (predictContainer) {
    predictContainer.innerHTML = predictHtml;
  }

  // 渲染表格
  const pm6Result = document.getElementById('pm6Result');
  if (!pm6Result) return;

  let html = '';
  if (data.header && data.data) {
    // 动态渲染所有表头和所有列，保证"下一期开奖号码"能展示出来
    html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">';
    html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';
    data.data.forEach(row => {
      html += '<tr>';
      row.forEach((cell, idx) => {
        if (idx === 2 && Array.isArray(cell)) {
          // 加减0~6组详情
          let groupHtml = '';
          cell.forEach(g => {
            groupHtml += `<div>加减${g.n}: ${g.numbers.join(',')} ｜ <span style='color:${g.hit?'#27ae60':'#c0392b'}'>${g.hit?'命中':'未中'}</span> ｜ 当前遗漏: <b>${g.miss}</b></div>`;
          });
          html += `<td>${groupHtml}</td>`;
        } else {
          html += `<td>${cell}</td>`;
        }
      });
      html += '</tr>';
    });
    html += '</table>';

    // 分页
    html += `<div style='margin-top:12px;'>`;
    if (data.page > 1) html += ` <button id='pm6PrevPage' class="btn-secondary">上一页</button>`;
    if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='pm6NextPage' class="btn-secondary">下一页</button>`;
    html += `</div>`;
  } else {
    html = '<div class="alert alert-error">暂无数据</div>';
  }

  pm6Result.innerHTML = html;

  // 分页按钮事件
  if (data.page > 1) {
    document.getElementById('pm6PrevPage').onclick = () => loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, data.page-1, currentPm6Year);
  }
  if (data.page < Math.ceil(data.total/data.page_size)) {
    document.getElementById('pm6NextPage').onclick = () => loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, data.page+1, currentPm6Year);
  }
}

// ==================== 模块初始化 ====================
/**
 * 初始化±6码分析模块
 * - 绑定按钮事件
 * - 执行首次数据加载
 */
function initPlusMinus6AnalysisModule() {
  console.log('🎯 Initializing Plus Minus 6 Analysis module...');

  // 彩种按钮事件
  document.querySelectorAll('.pm6-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadPlusMinus6Analysis(this.dataset.type, currentPm6Pos, 1, currentPm6Year);
    });
  });

  // 位置按钮事件
  document.querySelectorAll('.pm6-pos-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadPlusMinus6Analysis(currentPm6Type, this.dataset.pos, 1, currentPm6Year);
    });
  });

  // 查询按钮事件
  const queryBtn = document.getElementById('pm6QueryBtn');
  if (queryBtn) {
    queryBtn.addEventListener('click', function() {
      loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, 1, currentPm6Year);
    });
  }

  // 首次加载：默认澳门第7位
  loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, 1, currentPm6Year);

  console.log('✅ Plus Minus 6 Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initPlusMinus6AnalysisModule = initPlusMinus6AnalysisModule;
window.plusMinus6AnalysisModule = {
  loadPlusMinus6Analysis,
  getCurrentType: () => currentPm6Type,
  getCurrentPos: () => currentPm6Pos
};
