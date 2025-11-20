/**
 * 区间分析模块 (Range Analysis Module)
 * 功能：+1~+20区间分析，包括最新一期预测、遗漏统计、CSV导出等
 *
 * API端点: GET /range_analysis?lottery_type={am|hk}&pos={pos}&page={page}&page_size={size}&year={year}
 *
 * 主要功能：
 * - 选择彩种（澳门/香港）
 * - 选择下一期球位置（第1-7位）
 * - 显示最新一期开奖号码
 * - 显示最新一期预测区间
 * - 6个区间（+1~+20, +5~+24, +10~+29, +15~+34, +20~+39, +25~+44）
 * - 各区间最大遗漏和当前遗漏统计
 * - 年份筛选
 * - CSV导出（本页/全部）
 * - 分页浏览
 *
 * @module range-analysis
 */

// ==================== 模块状态 ====================
let currentRangeType = 'am';
let currentRangePos = 1;
let currentRangeNextPos = 7; // 默认第7位
let currentRangePage = 1;
let currentRangeYear = '';
let rangeAnalysisCache = null;

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

// ==================== 数据加载函数 ====================
/**
 * 加载区间分析数据
 * @param {string} type - 彩种类型 (am|hk)
 * @param {number} nextPos - 下一期球的位置 (1-7)
 * @param {number} page - 页码
 * @param {string} year - 年份筛选（可选）
 */
function loadRangeAnalysis(type, nextPos, page, year) {
  if (typeof type === 'string' && type) currentRangeType = type;
  if (typeof nextPos !== 'undefined' && nextPos !== null && nextPos !== '') currentRangeNextPos = Number(nextPos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') currentRangePage = Number(page) || 1;
  if (typeof year !== 'undefined') currentRangeYear = year;

  // 按钮高亮
  document.querySelectorAll('.range-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentRangeType);
  });
  document.querySelectorAll('.range-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentRangeNextPos);
  });

  const rangeResult = document.getElementById('rangeResult');
  if (!rangeResult) return;

  rangeResult.innerHTML = '<div class="loader-container"><div class="loader-spinner"></div><div class="loader-message">加载中...</div></div>';

  let url = `${window.BACKEND_URL}/range_analysis?lottery_type=${currentRangeType}&pos=${currentRangeNextPos}&page=${currentRangePage}&page_size=20`;
  if (currentRangeYear) url += `&year=${currentRangeYear}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      rangeAnalysisCache = data;
      renderRangeResult(data);
    })
    .catch(error => {
      console.error('加载区间分析失败:', error);
      rangeResult.innerHTML = `<div class="alert alert-error">加载失败：${error.message}</div>`;
    });
}

// ==================== 渲染函数 ====================
/**
 * 渲染区间分析结果
 * @param {Object} data - 后端返回的分析数据
 */
function renderRangeResult(data) {
  const rangeResult = document.getElementById('rangeResult');
  if (!rangeResult) return;

  // 年份按钮组
  let years = data.years || [];
  let yearBtnsHtml = '';
  if (years.length > 0) {
    yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
    yearBtnsHtml += `<button class="range-year-btn${!currentRangeYear ? ' active' : ''}" data-year="">全部</button>`;
    years.forEach(y => {
      yearBtnsHtml += `<button class="range-year-btn${currentRangeYear == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
    });
    yearBtnsHtml += '</div>';
  }

  // 年份按钮容器（如果HTML中有的话）
  const yearBtnsContainer = document.getElementById('rangeYearBtns');
  if (yearBtnsContainer) {
    yearBtnsContainer.innerHTML = yearBtnsHtml;
  }

  // 年份按钮事件
  document.querySelectorAll('.range-year-btn').forEach(btn => {
    btn.onclick = function() {
      loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, this.dataset.year);
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
  } else if (data && data.data && data.data.length > 0) {
    // 兼容无last_open时用表格第一行
    let lastRow = data.data[0];
    if (lastRow && lastRow.length >= 9) {
      const period = lastRow[0];
      const openTime = lastRow[1];
      const balls = lastRow.slice(2, 9); // 7个球
      lastOpenHtml = `<div style="margin-bottom:10px;padding:8px 16px;border:1px solid #bbb;border-radius:8px;background:#f8fafd;">` +
        `<span style="font-weight:bold;color:#2980d9;">最新一期开奖号码（${period} ${openTime}）：</span> ` +
        balls.map((b, i) => {
          const ballNum = String(b).split('<')[0];
          return `<span style="display:inline-block;margin-right:8px;"><b>球${i+1}:</b> <span class="${getBallColorClassLocal(ballNum)}">${ballNum}</span></span>`;
        }).join('') +
        `</div>`;
    }
  }

  // 最新一期预测统计
  let predictHtml = '';
  if (data.predict && data.predict.ranges) {
    predictHtml = `<div style="margin-bottom:16px;padding:10px 16px;border:2px solid #2980d9;border-radius:10px;background:#f4f8ff;">` +
      `<div style="font-size:17px;font-weight:bold;color:#2980d9;margin-bottom:6px;">${data.predict.desc || '最新一期预测'}</div>`;
    for (let i = 0; i < data.predict.ranges.length; i++) {
      predictHtml += `<div style="border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:180px;margin-bottom:8px;display:inline-block;margin-right:18px;">`;
      predictHtml += `<div style="color:#2980d9;font-weight:bold;font-size:15px;">球${i+1}</div>`;
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
      missHtml += `<div style="border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:180px;margin-bottom:8px;">
        <div style="color:#2980d9;font-weight:bold;font-size:15px;">球${i+1}</div>`;
      for (let j = 0; j < 6; j++) {
        const label = ['+1~+20', '+5~+24', '+10~+29', '+15~+34', '+20~+39', '+25~+44'][j];
        const maxMiss = data.max_miss[i][j];
        const maxMissPeriod = data.max_miss_period[i][j];
        const curMiss = data.cur_miss[i][j];
        missHtml += `<div style="margin-bottom:2px;"><span style="color:#333;">${label}</span> ` +
          `<span style="color:#2980d9;">最大遗漏: <b>${maxMiss}</b></span> ` +
          `<span style="color:#555;">期号: <b>${maxMissPeriod}</b></span> ` +
          `<span style="color:#2980d9;">当前遗漏: <b>${curMiss}</b></span></div>`;
      }
      missHtml += '</div>';
    }
    missHtml += '</div>';
  }

  // 区间表格
  if (!data.data || !data.data.length) {
    rangeResult.innerHTML = lastOpenHtml + predictHtml + missHtml + '<div class="alert alert-error">暂无数据</div>';
    return;
  }

  let exportBtnHtml = '<button class="export-range-btn btn-primary" style="margin-bottom:8px;">导出本页</button> <button class="export-range-all-btn btn-primary" style="margin-bottom:8px;margin-left:8px;">导出全部</button>';
  let html = lastOpenHtml + predictHtml + missHtml + exportBtnHtml + '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';

  let pageData = data.data;
  if (currentRangeYear) {
    pageData = pageData.filter(row => String(row[0]).startsWith(currentRangeYear));
  }

  pageData.forEach(row => {
    html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
  });
  html += '</table>';

  // 分页按钮
  html += `<div style='margin-top:8px;'>第 ${data.page} / ${Math.ceil(data.total/data.page_size)} 页`;
  if (data.page > 1) html += ` <button id='rangePrevPage' class="btn-secondary">上一页</button>`;
  if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='rangeNextPage' class="btn-secondary">下一页</button>`;
  html += `</div>`;

  rangeResult.innerHTML = html;

  // 分页按钮事件
  if (data.page > 1) {
    document.getElementById('rangePrevPage').onclick = () => loadRangeAnalysis(currentRangeType, currentRangeNextPos, data.page-1, currentRangeYear);
  }
  if (data.page < Math.ceil(data.total/data.page_size)) {
    document.getElementById('rangeNextPage').onclick = () => loadRangeAnalysis(currentRangeType, currentRangeNextPos, data.page+1, currentRangeYear);
  }

  // 导出本页
  const exportBtn = rangeResult.querySelector('.export-range-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const csvRows = [
        data.header,
        ...pageData
      ];
      if (typeof window.downloadCSV === 'function') {
        window.downloadCSV(csvRows, '区间分析表.csv');
      } else {
        console.error('downloadCSV function not found');
      }
    };
  }

  // 导出全部
  const exportAllBtn = rangeResult.querySelector('.export-range-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = async () => {
      try {
        const type = currentRangeType || 'am';
        const pos = currentRangeNextPos || 1;
        let url = `${window.BACKEND_URL}/range_analysis?lottery_type=${type}&pos=${pos}&page=1&page_size=10000`;
        if (currentRangeYear) url += `&year=${currentRangeYear}`;
        const res = await fetch(url);
        const allData = await res.json();
        const csvRows = [
          allData.header,
          ...(allData.data || [])
        ];
        if (typeof window.downloadCSV === 'function') {
          window.downloadCSV(csvRows, '区间分析表_全部.csv');
        } else {
          console.error('downloadCSV function not found');
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
 * 初始化区间分析模块
 * - 绑定彩种切换按钮事件
 * - 绑定位置切换按钮事件
 * - 绑定查询按钮事件
 * - 执行首次数据加载
 */
function initRangeAnalysisModule() {
  console.log('🎯 Initializing Range Analysis module...');

  // 彩种按钮事件
  document.querySelectorAll('.range-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadRangeAnalysis(this.dataset.type, currentRangeNextPos, 1, currentRangeYear);
    });
  });

  // 号码位置按钮事件
  document.querySelectorAll('.range-pos-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      loadRangeAnalysis(currentRangeType, this.dataset.pos, 1, currentRangeYear);
    });
  });

  // 查询按钮事件
  const queryBtn = document.getElementById('rangeQueryBtn');
  if (queryBtn) {
    queryBtn.addEventListener('click', function() {
      loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, currentRangeYear);
    });
  }

  // 首次加载：默认澳门第7位
  loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, '');

  console.log('✅ Range Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initRangeAnalysisModule = initRangeAnalysisModule;
window.rangeAnalysisModule = {
  loadRangeAnalysis,
  renderRangeResult,
  getCurrentType: () => currentRangeType,
  getCurrentPos: () => currentRangeNextPos
};
