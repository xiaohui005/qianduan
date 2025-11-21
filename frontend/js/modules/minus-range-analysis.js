/**
 * 反向区间分析模块 (Minus Range Analysis Module)
 * 功能：-1~-20反向区间分析，包括最新一期预测、遗漏统计等
 *
 * API端点: GET /range_analysis_minus?lottery_type={am|hk}&pos={pos}&page={page}&page_size={size}&year={year}
 *
 * 主要功能：
 * - 选择彩种（澳门/香港）
 * - 选择下一期球位置（第1-7位）
 * - 显示最新一期开奖号码
 * - 显示最新一期预测区间
 * - 6个反向区间（-1~-20, -5~-24, -10~-29, -15~-34, -20~-39, -25~-44）
 * - 各区间最大遗漏和当前遗漏统计
 * - 年份筛选
 * - 分页浏览
 *
 * @module minus-range-analysis
 */

// ==================== 模块状态 ====================
let currentMinusRangeType = 'am';
let currentMinusRangeNextPos = 7;
let currentMinusRangePage = 1;
let currentMinusRangeYear = '';

// ==================== 辅助函数 ====================
/**
 * 获取号码球颜色类（复用全局函数）
 */
function getBallColorClassLocal(num) {
  if (typeof window.getBallColorClass === 'function') {
    return window.getBallColorClass(num);
  }
  // 降级方案
  const red = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
  const blue = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
  const green = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];
  if (red.includes(num)) return 'number-ball number-ball-red';
  if (blue.includes(num)) return 'number-ball number-ball-blue';
  if (green.includes(num)) return 'number-ball number-ball-green';
  return 'number-ball';
}

/**
 * 更新按钮高亮状态
 */
function updateMinusRangeBtnHighlight() {
  document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
    const isActive = btn.dataset.type === currentMinusRangeType;
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
    const isActive = btn.dataset.pos === String(currentMinusRangeNextPos);
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
    const isActive = btn.dataset.year === currentMinusRangeYear;
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
}

// ==================== 数据加载函数 ====================
/**
 * 加载反向区间分析数据
 * @param {number} page - 页码
 * @param {string} type - 彩种类型 (am|hk)
 * @param {number} nextPos - 下一期球的位置 (1-7)
 * @param {string} year - 年份筛选（可选）
 */
function loadMinusRangeAnalysis(page, type, nextPos, year) {
  // 参数兜底，防止 undefined
  if (!type) type = 'am';
  if (!nextPos) nextPos = 7;
  if (!page) page = 1;

  if (typeof type === 'string' && type) currentMinusRangeType = type;
  if (typeof nextPos !== 'undefined' && nextPos !== null && nextPos !== '') currentMinusRangeNextPos = Number(nextPos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') currentMinusRangePage = Number(page) || 1;
  if (typeof year !== 'undefined') currentMinusRangeYear = year;

  // 更新按钮高亮
  updateMinusRangeBtnHighlight();

  const minusResult = document.getElementById('minusRangeResult');
  if (!minusResult) return;

  minusResult.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-message">加载中...</div></div>';

  let url = `${window.BACKEND_URL}/range_analysis_minus?lottery_type=${type}&pos=${nextPos}&page=${page}&page_size=20`;
  if (year) url += `&year=${year}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      renderMinusRangeResult(data, type, nextPos, year);
    })
    .catch(error => {
      console.error('加载反向区间分析失败:', error);
      minusResult.innerHTML = `<div class="alert alert-error">加载失败：${error.message}</div>`;
    });
}

// ==================== 渲染函数 ====================
/**
 * 渲染反向区间分析结果
 * @param {Object} data - 后端返回的分析数据
 * @param {string} type - 彩种类型
 * @param {number} nextPos - 位置
 * @param {string} year - 年份
 */
function renderMinusRangeResult(data, type, nextPos, year) {
  const minusResult = document.getElementById('minusRangeResult');
  if (!minusResult) return;

  // 年份按钮组
  let years = data.years || [];
  let yearBtnsHtml = '';
  if (years.length > 0) {
    yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
    yearBtnsHtml += `<button class="minus-range-year-btn${!year ? ' active' : ''}" data-year="">全部</button>`;
    years.forEach(y => {
      yearBtnsHtml += `<button class="minus-range-year-btn${year == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
    });
    yearBtnsHtml += '</div>';
  }

  // 更新年份按钮容器
  const yearBtnsContainer = document.getElementById('minusRangeYearBtns');
  if (yearBtnsContainer) {
    yearBtnsContainer.innerHTML = yearBtnsHtml;
  }

  // 年份按钮事件
  document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
    btn.onclick = function() {
      loadMinusRangeAnalysis(1, currentMinusRangeType, currentMinusRangeNextPos, this.dataset.year);
      updateMinusRangeBtnHighlight();
    };
  });

  // 最新一期开奖号码展示
  let lastOpenHtml = '';
  if (data && data.last_open && data.last_open.balls) {
    const period = data.last_open.period;
    const openTime = data.last_open.open_time;
    const balls = data.last_open.balls;
    lastOpenHtml = `<div style="margin-bottom:10px;padding:8px 16px;border:1px solid #bbb;border-radius:8px;background:#f8fafd;">` +
      `<span style="font-weight:bold;color:#2980d9;">最新一期开奖号码（${period} ${openTime}）：</span> ` +
      balls.map((b, i) => `<span style="display:inline-block;margin-right:8px;"><b>球${i+1}:</b> <span class="${getBallColorClassLocal(b)}">${b}</span></span>`).join('') +
      `</div>`;
  }

  // 最新一期预测统计
  let predictHtml = '';
  if (data.predict && data.predict.ranges) {
    predictHtml = `<div style="margin-bottom:16px;padding:10px 16px;border:2px solid #c0392b;border-radius:10px;background:#fff3f3;">` +
      `<div style="font-size:17px;font-weight:bold;color:#c0392b;margin-bottom:6px;">${data.predict.desc || '最新一期预测'}</div>`;
    for (let i = 0; i < data.predict.ranges.length; i++) {
      predictHtml += `<div style="border:1px solid #c0392b;border-radius:7px;padding:8px 18px;background:#fff3f3;min-width:180px;margin-bottom:8px;display:inline-block;margin-right:18px;">`;
      predictHtml += `<div style="color:#c0392b;font-weight:bold;font-size:15px;">球${i+1}</div>`;
      for (let j = 0; j < data.predict.ranges[i].length; j++) {
        const label = data.predict.ranges[i][j].label;
        const rng = data.predict.ranges[i][j].range;
        predictHtml += `<div style="margin-bottom:2px;"><span style="color:#333;">${label}: <b>${rng}</b></span></div>`;
      }
      predictHtml += '</div>';
    }
    predictHtml += '</div>';
  }

  // 区间表格上方统计信息
  let missHtml = '';
  if (data.max_miss && data.cur_miss && data.max_miss_period) {
    missHtml = '<div style="margin-bottom:12px;display:flex;gap:24px;flex-wrap:wrap;align-items:center;">';
    for (let i = 0; i < 7; i++) {
      missHtml += `<div style="border:1px solid #c0392b;border-radius:7px;padding:8px 18px;background:#fff3f3;min-width:180px;margin-bottom:8px;">
        <div style="color:#c0392b;font-weight:bold;font-size:15px;">球${i+1}</div>`;
      for (let j = 0; j < 6; j++) {
        const label = ['-1~-20', '-5~-24', '-10~-29', '-15~-34', '-20~-39', '-25~-44'][j];
        const maxMiss = data.max_miss[i][j];
        const maxMissPeriod = data.max_miss_period[i][j];
        const curMiss = data.cur_miss[i][j];
        missHtml += `<div style="margin-bottom:2px;"><span style="color:#333;">${label}</span> ` +
          `<span style="color:#c0392b;">最大遗漏: <b>${maxMiss}</b></span> ` +
          `<span style="color:#555;">期号: <b>${maxMissPeriod}</b></span> ` +
          `<span style="color:#2980d9;">当前遗漏: <b>${curMiss}</b></span></div>`;
      }
      missHtml += '</div>';
    }
    missHtml += '</div>';
  }

  // 区间表格
  if (!data.data || !data.data.length) {
    minusResult.innerHTML = lastOpenHtml + predictHtml + missHtml + '<div class="alert alert-error">暂无数据</div>';
    return;
  }

  let html = lastOpenHtml + predictHtml + missHtml + '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';

  let pageData = data.data;
  pageData.forEach(row => {
    html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  });
  html += '</table>';

  // 分页按钮
  html += `<div style='margin-top:8px;'>第 ${data.page} / ${Math.ceil(data.total/data.page_size)} 页`;
  if (data.page > 1) html += ` <button id='minusRangePrevPage' class="btn-secondary">上一页</button>`;
  if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='minusRangeNextPage' class="btn-secondary">下一页</button>`;
  html += `</div>`;

  minusResult.innerHTML = html;

  // 分页按钮事件
  if (data.page > 1) {
    document.getElementById('minusRangePrevPage').onclick = () => loadMinusRangeAnalysis(data.page-1, type, nextPos, year);
  }
  if (data.page < Math.ceil(data.total/data.page_size)) {
    document.getElementById('minusRangeNextPage').onclick = () => loadMinusRangeAnalysis(data.page+1, type, nextPos, year);
  }

  // 查询按钮事件绑定（渲染后再绑定）
  const queryBtn = document.getElementById('minusRangeQueryBtn');
  if (queryBtn) {
    queryBtn.onclick = function() {
      loadMinusRangeAnalysis(1, currentMinusRangeType, currentMinusRangeNextPos, currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  }

  // 彩种按钮事件
  document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
    btn.onclick = function() {
      loadMinusRangeAnalysis(1, this.dataset.type, currentMinusRangeNextPos, currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  });

  // 号码位置按钮事件
  document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
    btn.onclick = function() {
      loadMinusRangeAnalysis(1, currentMinusRangeType, this.dataset.pos, currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  });

  // 每次渲染后都重新高亮
  updateMinusRangeBtnHighlight();
}

// ==================== 模块初始化 ====================
/**
 * 初始化反向区间分析模块
 * - 绑定按钮事件
 * - 执行首次数据加载
 */
function initMinusRangeAnalysisModule() {
  console.log('🎯 Initializing Minus Range Analysis module...');

  // 年份下拉框事件
  const yearSelect = document.getElementById('minusRangeYearSelect');
  if (yearSelect && typeof initYearFilter === 'function') {
    initYearFilter('minusRangeYearSelect', function(year) {
      currentMinusRangeYear = year;
      loadMinusRangeAnalysis(1, currentMinusRangeType, currentMinusRangeNextPos, year);
    });
  }

  // 首次加载：默认澳门第7位
  loadMinusRangeAnalysis(1, currentMinusRangeType, currentMinusRangeNextPos, '');

  console.log('✅ Minus Range Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initMinusRangeAnalysisModule = initMinusRangeAnalysisModule;
window.minusRangeAnalysisModule = {
  loadMinusRangeAnalysis,
  getCurrentType: () => currentMinusRangeType,
  getCurrentPos: () => currentMinusRangeNextPos
};
