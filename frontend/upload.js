// 上传表单相关事件（已移除表单时不绑定）
const uploadForm = document.getElementById('uploadForm');
if (uploadForm) {
  uploadForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) return alert('请选择文件');
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    const res = await fetch(window.BACKEND_URL + '/analyze', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    document.getElementById('result').innerText = JSON.stringify(data, null, 2);
  });
}

const buttons = {
  'collectAmBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    collectResult.innerHTML = '正在采集澳门...';
    try {
      const resAm = await fetch(window.BACKEND_URL + '/collect?type=am');
      const dataAm = await resAm.json();
      collectResult.innerHTML = `<b>澳门采集：</b>${JSON.stringify(dataAm)}`;
    } catch (e) {
      collectResult.innerHTML = '采集澳门失败：' + e;
    }
  },
  'collectHkBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    collectResult.innerHTML = '正在采集香港...';
    try {
      const resHk = await fetch(window.BACKEND_URL + '/collect?type=hk');
      const dataHk = await resHk.json();
      collectResult.innerHTML = `<b>香港采集：</b>${JSON.stringify(dataHk)}`;
    } catch (e) {
      collectResult.innerHTML = '采集香港失败：' + e;
    }
  },
  'collectAmWenlongzhuBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    collectResult.innerHTML = '正在采集澳门 (文龙珠)...';
    try {
      const resAm = await fetch(window.BACKEND_URL + '/collect_wenlongzhu?type=am');
      const dataAm = await resAm.json();
      collectResult.innerHTML = `<b>澳门采集 (文龙珠)：</b>${JSON.stringify(dataAm)}`;
    } catch (e) {
      collectResult.innerHTML = '采集澳门 (文龙珠) 失败：' + e;
    }
  },
  'collectHkWenlongzhuBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    collectResult.innerHTML = '正在采集香港 (文龙珠)...';
    try {
      const resHk = await fetch(window.BACKEND_URL + '/collect_wenlongzhu?type=hk');
      const dataHk = await resHk.json();
      collectResult.innerHTML = `<b>香港采集 (文龙珠)：</b>${JSON.stringify(dataHk)}`;
    } catch (e) {
      collectResult.innerHTML = '采集香港 (文龙珠) 失败：' + e;
    }
  },
  'collectAmHistoryBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    const url = document.getElementById('customAmUrl').value;
    collectResult.innerHTML = '正在采集澳门历史开奖记录...';
    try {
      const res = await fetch(window.BACKEND_URL + '/collect_history?type=am' + (url ? '&url=' + encodeURIComponent(url) : ''));
      const data = await res.json();
      collectResult.innerHTML = `<b>澳门历史采集：</b>${JSON.stringify(data)}`;
    } catch (e) {
      collectResult.innerHTML = '采集澳门历史失败：' + e;
    }
  },
  'collectHkHistoryBtn': async function() {
    const collectResult = document.getElementById('collectResult');
    const url = document.getElementById('customHkUrl').value;
    collectResult.innerHTML = '正在采集香港历史开奖记录...';
    try {
      const res = await fetch(window.BACKEND_URL + '/collect_history?type=hk' + (url ? '&url=' + encodeURIComponent(url) : ''));
      const data = await res.json();
      collectResult.innerHTML = `<b>香港历史采集：</b>${JSON.stringify(data)}`;
    } catch (e) {
      collectResult.innerHTML = '采集香港历史失败：' + e;
    }
  },
  'toggleHistoryBtn': function() {
    const area = document.getElementById('historyCollectArea');
    if (area) {
      if (area.style.display === 'none') {
        area.style.display = 'block';
        this.innerText = '隐藏历史采集';
      } else {
        area.style.display = 'none';
        this.innerText = '显示历史采集';
      }
    }
  },
  'queryRecordsBtn': function() {
    queryRecords('recordsTableAreaAm', 1);
    queryRecords('recordsTableAreaHk', 1);
  },
  'recommendBtn': async function() {
    const period = document.getElementById('recommendPeriod').value.trim();
    const resultDiv = document.getElementById('recommendResult');
    if (!period) {
      resultDiv.innerHTML = '<span style="color:red;">请输入期号</span>';
      return;
    }
    resultDiv.innerHTML = '正在生成推荐...';
    try {
      const res = await fetch(window.BACKEND_URL + '/recommend?period=' + encodeURIComponent(period));
      const data = await res.json();
      if (!data.recommend) {
        resultDiv.innerHTML = '<span style="color:red;">暂无推荐结果</span>';
        return;
      }
      let html = `<div style='color:#2980d9;font-size:15px;margin-bottom:8px;'>推荐基于期号：${data.used_period || period}</div>`;
      html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">';
      html += '<tr><th>位置</th><th>推荐8码</th></tr>';
      data.recommend.forEach((nums, idx) => {
        html += `<tr><td>第${idx+1}位</td><td>${nums.map(n => `<span class='${getBallColorClass(n.padStart(2,'0'))}' style='display:inline-block;padding:2px 10px;border-radius:16px;margin:2px 4px;'>${n}</span>`).join('')}</td></tr>`;
      });
      html += '</table>';
      resultDiv.innerHTML = html;
    } catch (e) {
      resultDiv.innerHTML = '推荐失败：' + e;
    }
  }
};

for (const id in buttons) {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', buttons[id]);
  }
}

// 公用：根据号码返回颜色class
function getBallColorClass(num) {
  const red = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
  const blue = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
  const green = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];
  if (red.includes(num)) return 'ball-red';
  if (blue.includes(num)) return 'ball-blue';
  if (green.includes(num)) return 'ball-green';
  return '';
}

// 开奖记录查询与展示
function renderRecordsTable(data, areaId, title) {
  const area = document.getElementById(areaId);
  if (!area) return; // Added check for area existence
  if (!data.records || data.records.length === 0) {
    area.innerHTML = `<div>${title}暂无数据</div>`;
    return;
  }
  // 导出按钮
  let html = `<h3>${title}</h3><button class="export-records-btn" style="margin-bottom:8px;">导出本页</button> <button class="export-records-all-btn" style="margin-bottom:8px;">导出全部</button>`;
  html += `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">
    <tr><th>期号</th><th>开奖时间</th><th>开奖号码/生肖</th></tr>`;
  data.records.forEach(r => {
    const nums = r.numbers ? r.numbers.split(',') : [];
    const animals = r.animals ? r.animals.split(',') : [];
    let numAniRow = nums.map((n, i) => {
      const ani = animals[i] || '';
      const colorClass = getBallColorClass(n.padStart(2, '0'));
      return `<div style='display:inline-block;margin:2px 6px;'>
        <div class='${colorClass}' style='font-size:18px;display:inline-block;padding:2px 10px;border-radius:16px;'>${n}</div>
        <div style='color:#000;font-size:13px;font-weight:bold;'>${ani}</div>
      </div>`;
    }).join('');
    html += `<tr>
      <td>${r.period}</td>
      <td>${r.open_time ? r.open_time.substring(0,10) : ''}</td>
      <td>${numAniRow}</td>
    </tr>`;
  });
  html += '</table>';
  // 分页
  const totalPages = Math.ceil(data.total / data.page_size);
  html += `<div style='margin-top:8px;'>第 ${data.page} / ${totalPages} 页`;
  if (data.page > 1) html += ` <button class='recordsPrevPage' data-area='${areaId}' data-type='${title}'>上一页</button>`;
  if (data.page < totalPages) html += ` <button class='recordsNextPage' data-area='${areaId}' data-type='${title}'>下一页</button>`;
  html += `</div>`;
  area.innerHTML = html;
  // 事件绑定
  Array.from(area.querySelectorAll('.recordsPrevPage')).forEach(btn => {
    btn.onclick = () => queryRecords(areaId, data.page - 1);
  });
  Array.from(area.querySelectorAll('.recordsNextPage')).forEach(btn => {
    btn.onclick = () => queryRecords(areaId, data.page + 1);
  });
  // 导出本页事件
  const exportBtn = area.querySelector('.export-records-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const csvRows = [
        ['期号','开奖时间','开奖号码/生肖'],
        ...data.records.map(r => [
          r.period,
          r.open_time ? r.open_time.substring(0,10) : '',
          r.numbers + (r.animals ? ' / ' + r.animals : '')
        ])
      ];
      downloadCSV(csvRows, `${title}_records.csv`);
    };
  }
  // 导出全部事件
  const exportAllBtn = area.querySelector('.export-records-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = async () => {
      const type = areaId === 'recordsTableAreaAm' ? 'am' : 'hk';
      let url = `${window.BACKEND_URL}/records?page=1&page_size=10000&lottery_type=${type}`;
      // 其它参数可按需拼接
      const res = await fetch(url);
      const allData = await res.json();
      const csvRows = [
        ['期号','开奖时间','开奖号码/生肖'],
        ...allData.records.map(r => [
          r.period,
          r.open_time ? r.open_time.substring(0,10) : '',
          r.numbers + (r.animals ? ' / ' + r.animals : '')
        ])
      ];
      downloadCSV(csvRows, `${title}_records_all.csv`);
    };
  }
}

async function queryRecords(areaId, page = 1) {
  const type = areaId === 'recordsTableAreaAm' ? 'am' : 'hk';
  const start = document.getElementById('queryStartTime').value;
  const end = document.getElementById('queryEndTime').value;
  const pageSize = document.getElementById('queryPageSize').value;
  const period = document.getElementById('queryPeriod').value;
  let url = `${window.BACKEND_URL}/records?page=${page}&page_size=${pageSize}&lottery_type=${type}`;
  if (start) url += `&start_time=${start}`;
  if (end) url += `&end_time=${end}`;
  if (period) url += `&period=${encodeURIComponent(period)}`;
  const area = document.getElementById(areaId);
  if (!area) return; // Added check for area existence
  area.innerHTML = '加载中...';
  const res = await fetch(url);
  const data = await res.json();
  renderRecordsTable(data, areaId, type === 'am' ? '澳门开奖记录' : '香港开奖记录');
}

// 页面加载默认查询第一页
queryRecords('recordsTableAreaAm', 1);
queryRecords('recordsTableAreaHk', 1);

async function generateRecommend(type = 'am') {
  const resultDiv = document.getElementById('recommendResult');
  resultDiv.innerHTML = '正在生成推荐...';
  try {
    const res = await fetch(window.BACKEND_URL + '/recommend?lottery_type=' + type);
    const data = await res.json();
    if (!data.recommend) {
      resultDiv.innerHTML = '<span style="color:red;">暂无推荐结果</span>';
      return;
    }
    let html = `<div style='color:#2980d9;font-size:15px;margin-bottom:8px;'>推荐基于期号：${data.used_period || ''}</div>`;
    html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">';
    html += '<tr><th>位置</th><th>推荐8码</th></tr>';
    data.recommend.forEach((nums, idx) => {
      html += `<tr><td>第${idx+1}位</td><td>${nums.map(n => `<span class='${getBallColorClass(n.padStart(2,'0'))}' style='display:inline-block;padding:2px 10px;border-radius:16px;margin:2px 4px;'>${n}</span>`).join('')}</td></tr>`;
    });
    html += '</table>';
    resultDiv.innerHTML = html;
  } catch (e) {
    resultDiv.innerHTML = '推荐失败：' + e;
  }
}

// 推荐彩种按钮切换
document.querySelectorAll('.recommend-type-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.recommend-type-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    generateRecommend(this.dataset.type);
  });
});

let tensAnalysisCache = {am: null, hk: null};
let currentTensType = 'am';
let currentTensPos = 1;
let tensPageNum = 1;
const TENS_PAGE_SIZE = 20;

function renderTensTable(data, pos, page = 1) {
  const tensResult = document.getElementById('tensResult');
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
    infoBox += `<span style=\"display:inline-block;margin-right:10px;\">${col}</span>`;
  });
  infoBox += '</div>';
  // 每个最大遗漏和期号单独一个小框
  infoBox += '<div style="display:flex;flex-wrap:wrap;gap:10px;">';
  tensCols.forEach(col => {
    infoBox += `<div style=\"border:1px solid #dcdcdc;border-radius:6px;padding:6px 10px;min-width:70px;text-align:center;background:#fff;\">
      <div style=\"font-weight:bold;color:#2980d9;\">${col}</div>
      <div style=\"color:#d35400;\">遗漏:${maxMiss[col]}</div>
      <div style=\"color:#555;\">期号:${maxMissPeriod[col] || ''}</div>
    </div>`;
  });
  infoBox += '</div></div>';
  // 阀值输入框
  let thresholdHtml = '<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">';
  thresholdHtml += '<label for="tensThresholdInput" style="font-weight:bold;font-size:15px;color:#2980d9;">遗漏高亮阀值：</label>';
  thresholdHtml += '<input type="number" id="tensThresholdInput" value="' + (window.tensThreshold || 12) + '" min="1" max="99" style="width:70px;height:32px;font-size:16px;border:1px solid #b5c6e0;border-radius:6px;padding:0 10px;outline:none;transition:border 0.2s;box-shadow:0 1px 2px #f0f4fa;">';
  thresholdHtml += '</div>';
  // 导出按钮
  let exportBtnHtml = '<button class="export-tens-btn" style="margin-bottom:8px;">导出本页</button> <button class="export-tens-all-btn" style="margin-bottom:8px;">导出全部</button>';
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
  if (page > 1) html += ` <button id='tensPrevPage'>上一页</button>`;
  if (page < totalPages) html += ` <button id='tensNextPage'>下一页</button>`;
  html += `</div>`;
  tensResult.innerHTML = html;
  // 年份按钮事件
  document.querySelectorAll('.tens-year-btn').forEach(btn => {
    btn.onclick = function() {
      window.currentTensYear = this.dataset.year;
      loadTensAnalysis(currentTensType, currentTensPos, 1, window.currentTensYear);
    };
  });
  if (page > 1) document.getElementById('tensPrevPage').onclick = () => loadTensAnalysis(currentTensType, currentTensPos, page - 1, window.currentTensYear);
  if (page < totalPages) document.getElementById('tensNextPage').onclick = () => loadTensAnalysis(currentTensType, currentTensPos, page + 1, window.currentTensYear);
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
      downloadCSV(csvRows, '十位分析表.csv');
    };
  }
  // 导出全部
  const exportAllBtn = tensResult.querySelector('.export-tens-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = async () => {
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
      downloadCSV(csvRows, '十位分析表_全部.csv');
    };
  }
}

// 修改 loadTensAnalysis 支持 year 参数，但只用于最大遗漏等统计，不过滤表格数据
function loadTensAnalysis(type, pos, page = 1, year = '') {
  if (type) currentTensType = type;
  if (pos) currentTensPos = pos;
  if (year !== undefined) window.currentTensYear = year;
  else if (window.currentTensYear === undefined) window.currentTensYear = '';
  document.querySelectorAll('.tens-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentTensType);
  });
  document.querySelectorAll('.tens-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentTensPos);
  });
  const tensResult = document.getElementById('tensResult');
  tensResult.innerHTML = '加载中...';
  // 每次切换都重新请求后端，带 year 参数
  let url = window.BACKEND_URL + '/tens_analysis?lottery_type=' + currentTensType;
  if (window.currentTensYear) url += '&year=' + window.currentTensYear;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.data || !data.data.length) {
        tensResult.innerHTML = '<span style="color:red;">暂无数据</span>';
        return;
      }
      renderTensTable(data, currentTensPos, page);
    });
}

document.querySelectorAll('.tens-type-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    loadTensAnalysis(this.dataset.type, currentTensPos);
  });
});
document.querySelectorAll('.tens-pos-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    loadTensAnalysis(currentTensType, parseInt(this.dataset.pos));
  });
});

// 1. 左侧菜单添加个位分析按钮
const sidebar = document.querySelector('.sidebar');
if (sidebar && !document.getElementById('menuUnitsBtn')) {
  const unitsBtn = document.createElement('button');
  unitsBtn.className = 'menu-btn';
  unitsBtn.id = 'menuUnitsBtn';
  unitsBtn.innerText = '第N个码个位分析';
  sidebar.appendChild(unitsBtn);
}

// 2. 主内容区添加个位分析页面容器
if (!document.getElementById('unitsPage')) {
  const mainContent = document.querySelector('.main-content');
  const unitsDiv = document.createElement('div');
  unitsDiv.id = 'unitsPage';
  unitsDiv.style.display = 'none';
  unitsDiv.innerHTML = `
    <h2>第N个码个位分析</h2>
    <div style="margin-bottom:16px;">
      <label class="records-query-label">选择彩种：</label>
      <div class="units-type-group" style="display:inline-block;">
        <button class="units-type-btn active" data-type="am">澳门</button>
        <button class="units-type-btn" data-type="hk">香港</button>
      </div>
      <label class="records-query-label" style="margin-left:24px;">选择位数：</label>
      <div class="units-pos-group" style="display:inline-block;">
        <button class="units-pos-btn active" data-pos="1">第1位</button>
        <button class="units-pos-btn" data-pos="2">第2位</button>
        <button class="units-pos-btn" data-pos="3">第3位</button>
        <button class="units-pos-btn" data-pos="4">第4位</button>
        <button class="units-pos-btn" data-pos="5">第5位</button>
        <button class="units-pos-btn" data-pos="6">第6位</button>
        <button class="units-pos-btn" data-pos="7">第7位</button>
      </div>
    </div>
    <div id="unitsResult" style="margin-top:16px;"></div>
  `;
  mainContent.appendChild(unitsDiv);
}
// 页面切换通用函数
function showOnlyPage(pageId) {
  // 隐藏所有主内容区页面（id以Page结尾的div）
  document.querySelectorAll('.main-content > div[id$="Page"]').forEach(div => {
    div.style.display = 'none';
  });
  // 只显示目标页面
  const page = document.getElementById(pageId);
  if (page) {
    page.style.display = 'block';
    // 确保滚动到主内容区域顶部，避免用户视觉上看到"页面底部"
    const main = document.querySelector('.main-content');
    // 优先滚动整个窗口到主内容顶部
    try {
      const topTarget = main ? main.getBoundingClientRect().top + window.pageYOffset - 10 : 0;
      window.scrollTo({ top: Math.max(topTarget, 0), behavior: 'smooth' });
    } catch (e) {
      // 兜底：尽量滚动到页面顶部或目标区块
      if (typeof window.scrollTo === 'function') {
        window.scrollTo(0, 0);
      }
      if (page.scrollIntoView) {
        page.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }
}

// 1. 左侧主菜单按钮切换逻辑优化
if (typeof pageMap === 'undefined') {
  var pageMap = {
    menuCollectBtn: 'collectPage',
    menuRecordsBtn: 'recordsPage',
    menuRecommendBtn: 'recommendPage',
    menuTensBtn: 'tensPage',
    menuUnitsBtn: 'unitsPage',
    menuRangeBtn: 'rangePage',
    menuSeventhRangeBtn: 'seventhRangePage',
    menuMinusRangeBtn: 'minusRangePage',
    menuPlusMinus6Btn: 'plusMinus6Page',
    // 新增每期分析页面
    menuEachIssueBtn: 'eachIssuePage',
    // 新增波色分析页面
    menuColorAnalysisBtn: 'colorAnalysisPage',
    // 新增第二个号码四肖页面
    menuSecondFourxiaoBtn: 'secondFourxiaoPage',
    menuSixthThreexiaoBtn: 'sixthThreexiaoPage',
    // 新增推荐8码命中情况页面
    menuRecommendHitBtn: 'recommendHitPage',
    // 新增推荐16码命中情况页面
    menuRecommend16HitBtn: 'recommend16HitPage',
    // 新增前6码三中三页面
    menuFront6SzzBtn: 'front6SzzPage',
    // 新增最大遗漏提醒页面
    menuMaxMissAlertBtn: 'maxMissAlertPage',
  };
}
Object.keys(pageMap).forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function() {
      // 菜单高亮
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 页面切换
      showOnlyPage(pageMap[id]);
      // 标题切换
      const titleMap = {
        collectPage: '数据采集',
        recordsPage: '开奖记录',
        recommendPage: '推荐8码',
        tensPage: '第N位十位分析',
        unitsPage: '第N个码个位分析',
        rangePage: '+1~+20区间分析',
        seventhRangePage: '第7个号码+1~+20区间分析',
  secondFourxiaoPage: '第二个号码四肖分析',
        minusRangePage: '-1~-20区间分析',
        plusMinus6Page: '加减前6码分析',
        twentyRangePage: '20区间分析',
        eachIssuePage: '每期分析',
        colorAnalysisPage: '波色分析',
        recommendHitPage: '推荐8码的命中情况',
        recommend16HitPage: '推荐16码的命中情况',
        front6SzzPage: '前6码三中三',
        maxMissAlertPage: '最大遗漏提醒',
      };
      document.getElementById('pageTitle').innerText = titleMap[pageMap[id]] || '';
      // 自动加载数据（如有需要）
      switch (id) {
        case 'menuCollectBtn':
          const collectResult = document.getElementById('collectResult');
          if (collectResult) collectResult.innerHTML = '';
          break;
        case 'menuRecordsBtn':
          queryRecords('recordsTableAreaAm', 1);
          queryRecords('recordsTableAreaHk', 1);
          break;
        case 'menuRecommendBtn':
          let activeBtn = document.querySelector('.recommend-type-btn.active');
          let type = activeBtn ? activeBtn.dataset.type : 'am';
          generateRecommend(type);
          break;
        case 'menuTensBtn':
          loadTensAnalysis(currentTensType, currentTensPos);
          break;
        case 'menuUnitsBtn':
          loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);
          break;
        case 'menuRangeBtn':
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, '');
          break;
        case 'menuSeventhRangeBtn':
          if (typeof loadSeventhRangeAnalysis === 'function') {
            window.seventhRangePage = 1;
            loadSeventhRangeAnalysis(currentSeventhRangeType);
          }
          break;
        case 'menuMinusRangeBtn':
          loadMinusRangeAnalysis(1);
          break;
        case 'menuPlusMinus6Btn':
          loadPlusMinus6Analysis();
          break;
        case 'menuEachIssueBtn':
          loadEachIssueAnalysis(currentType, currentPage);
          break;
        case 'menuColorAnalysisBtn':
          loadColorAnalysis(currentColorType);
          break;
        case 'menuSecondFourxiaoBtn':
          loadSecondFourxiaoAnalysis(currentSeventhRangeType || 'am', window.secondFourxiaoPos || 2);
          break;
        case 'menuSixthThreexiaoBtn':
          loadSixthThreexiaoAnalysis(currentSeventhRangeType || 'am', window.sixthThreexiaoPos || 6);
          break;
        case 'menuRecommendHitBtn':
          initRecommendHitAnalysis();
          break;
        case 'menuRecommend16HitBtn':
          // 确保函数存在后再调用
          if (typeof initRecommend16HitAnalysis === 'function') {
            initRecommend16HitAnalysis();
          } else {
            console.error('initRecommend16HitAnalysis 函数未找到');
            console.log('尝试从recommend16.js加载函数...');
            
            // 尝试动态加载函数
            try {
              // 检查recommend16.js是否加载
              if (typeof window.recommend16Loaded === 'undefined') {
                console.log('recommend16.js 未加载，尝试重新加载...');
                // 这里可以尝试重新加载脚本
              }
              
              // 显示错误信息
              const resultDiv = document.getElementById('recommend16HitResult');
              if (resultDiv) {
                resultDiv.innerHTML = `
                  <div style="text-align:center;color:red;padding:20px;">
                    推荐16码功能加载失败<br>
                    <small>错误：initRecommend16HitAnalysis 函数未找到</small><br>
                    <button onclick="location.reload()" style="margin-top:10px;padding:5px 15px;">刷新页面重试</button>
                  </div>
                `;
              }
            } catch (error) {
              console.error('处理推荐16码功能失败:', error);
            }
          }
          break;
        case 'menuFront6SzzBtn':
          if (typeof initFront6Szz === 'function') {
            initFront6Szz();
          } else {
            console.error('initFront6Szz 未定义');
          }
          break;
        case 'menuMaxMissAlertBtn':
          if (typeof loadMaxMissAlerts === 'function') {
            const thresholdInput = document.getElementById('maxMissThreshold');
            const t = thresholdInput ? parseInt(thresholdInput.value || '0') || 0 : 0;
            loadMaxMissAlerts(t);
          }
          break;
      }
    });
  }
});

// ==================== 前6码三中三（前端） ====================
function initFront6Szz() {
  const page = document.getElementById('front6SzzPage');
  if (!page) return;

  // 彩种切换按钮
  const typeBtns = page.querySelectorAll('.seventh-range-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      window.front6SzzType = this.getAttribute('data-type');
    });
  });
  window.front6SzzType = (page.querySelector('.seventh-range-type-btn.active')?.getAttribute('data-type')) || 'am';

  const startBtn = document.getElementById('startFront6SzzBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      window.front6SzzPage = 1;
      loadFront6Szz(window.front6SzzType || 'am', window.front6SzzPage || 1, 30);
    });
  }

  // 进入页面时默认加载
  window.front6SzzPage = 1;
  loadFront6Szz(window.front6SzzType || 'am', window.front6SzzPage || 1, 30);
}

async function loadFront6Szz(lotteryType, page = 1, pageSize = 30) {
  const resultDiv = document.getElementById('front6SzzResult');
  const statsDiv = document.getElementById('front6SzzStats');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在分析前6码三中三...</div>';
  if (statsDiv) statsDiv.style.display = 'none';
  try {
    const res = await fetch(`${window.BACKEND_URL}/api/front6_sanzhong3?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`);
    const data = await res.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div style="color:red;text-align:center;padding:20px;">分析失败：${data.message}</div>`;
      return;
    }
    window.front6SzzPage = data.data.page || page;
    window.front6SzzTotalPages = data.data.total_pages || 1;
    window.front6SzzType = lotteryType;
    renderFront6Szz(data.data);
  } catch (e) {
    resultDiv.innerHTML = `<div style=\"color:red;text-align:center;padding:20px;\">分析异常：${e.message}</div>`;
  }
}

function renderFront6Szz(data) {
  const resultDiv = document.getElementById('front6SzzResult');
  const statsDiv = document.getElementById('front6SzzStats');
  if (!resultDiv) return;
  const { results, total_triggers, hit_count, hit_rate, current_miss, max_miss, page, total_pages, page_size } = data || {};

  const pagerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="front6SzzPrev" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id="front6SzzNext" class="btn-secondary" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="front6SzzExport" class="btn-secondary">导出CSV</button>
      </div>
    </div>
  `;

  let html = `${pagerHtml}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>触发期数</th>
            <th>开奖时间</th>
            <th>推荐6码</th>
            <th>窗口期(后5期)</th>
            <th>窗口前6号码</th>
            <th>是否命中</th>
            <th>命中期</th>
            <th>命中重合号码</th>
            <th>连续遗漏</th>
          </tr>
        </thead>
        <tbody>
  `;

  (results || []).forEach(r => {
    const rec6 = (r.recommend6 || []).join(',');
    const winStr = (r.window_periods || []).join(', ');
    const winFront6 = (r.window_front6 || []).map(arr => (arr || []).join(',')).join(' | ');
    const isHit = r.is_hit ? '命中' : '遗漏';
    const hitPeriod = (r.hit_detail && r.hit_detail.hit_period) ? r.hit_detail.hit_period : '-';
    const hitNums = (r.hit_detail && r.hit_detail.hit_common_numbers) ? r.hit_detail.hit_common_numbers.join(',') : '';
    html += `
      <tr>
        <td>${r.trigger_period}</td>
        <td>${r.open_time}</td>
        <td style="white-space:nowrap;">${rec6}</td>
        <td>${winStr}</td>
        <td style="font-size:12px;">${winFront6}</td>
        <td class="${r.is_hit ? 'hit' : 'miss'}">${isHit}</td>
        <td>${hitPeriod}</td>
        <td>${hitNums}</td>
        <td>${typeof r.omission_streak === 'number' ? r.omission_streak : ''}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>${pagerHtml}`;
  resultDiv.innerHTML = html;

  if (statsDiv) {
    const totalEl = document.getElementById('front6SzzTotal');
    const hitEl = document.getElementById('front6SzzHitCount');
    const rateEl = document.getElementById('front6SzzHitRate');
    const curMissEl = document.getElementById('front6SzzCurrentMiss');
    const maxMissEl = document.getElementById('front6SzzMaxMiss');
    if (totalEl) totalEl.textContent = String(total_triggers || 0);
    if (hitEl) hitEl.textContent = String(hit_count || 0);
    if (rateEl) rateEl.textContent = String((hit_rate || 0) + '%');
    if (curMissEl) curMissEl.textContent = String(current_miss || 0);
    if (maxMissEl) maxMissEl.textContent = String(max_miss || 0);
    statsDiv.style.display = 'block';
  }

  const prevBtn = document.getElementById('front6SzzPrev');
  const nextBtn = document.getElementById('front6SzzNext');
  const exportBtn = document.getElementById('front6SzzExport');
  if (prevBtn) {
    prevBtn.addEventListener('click', function(){
      if ((page || 1) > 1) {
        loadFront6Szz(window.front6SzzType || 'am', (page - 1), page_size || 30);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function(){
      if (page < total_pages) {
        loadFront6Szz(window.front6SzzType || 'am', (page + 1), page_size || 30);
      }
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', function(){
      const lt = window.front6SzzType || 'am';
      const url = `${window.BACKEND_URL}/api/front6_sanzhong3?lottery_type=${lt}&export=csv`;
      window.open(url, '_blank');
    });
  }
}

// 2. 登记点分析下拉菜单按钮切换逻辑优化
setTimeout(() => {
  const btnMap = [
    { btn: 'menuRegisterFocusBtn', page: 'registerFocusPage', title: '登记关注点' },
    { btn: 'menuRegisterBetBtn', page: 'registerBetPage', title: '投注登记点' },
    { btn: 'menuRegisterFocusResultBtn', page: 'registerFocusResultPage', title: '关注点登记结果' },
    { btn: 'menuRegisterFocusAnalysisBtn', page: 'registerFocusAnalysisPage', title: '关注点分析' },
    { btn: 'menuRegisterBetReportBtn', page: 'registerBetReportPage', title: '投注点报表' },
  ];
  btnMap.forEach(item => {
    const btn = document.getElementById(item.btn);
    if (btn) {
      btn.onclick = function() {
        // 高亮
        btnMap.forEach(i => {
          const b = document.getElementById(i.btn);
          if (b) b.classList.remove('active');
        });
        btn.classList.add('active');
        // 页面切换，先隐藏所有主内容区页面
        document.querySelectorAll('.main-content > div[id$="Page"]').forEach(div => {
          div.style.display = 'none';
        });
        // 只显示当前页面
        const showPage = document.getElementById(item.page);
        if (showPage) showPage.style.display = '';
        // 标题切换
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.innerText = item.title;
        // 特殊处理关注点登记结果页面
        if (item.page === 'registerFocusResultPage') {
          setTimeout(() => { initPlaceResults(); }, 100);
        }
        // 特殊处理关注点分析页面
        if (item.page === 'registerFocusAnalysisPage') {
          setTimeout(() => { initPlaceAnalysis(); }, 100);
        }
      };
    }
  });
}, 0);

// 移除重复的菜单按钮事件绑定逻辑，统一使用上面的pageMap逻辑

// 推荐16码功能备用实现（如果recommend16.js加载失败）
if (typeof initRecommend16HitAnalysis === 'undefined') {
  console.log('recommend16.js 未加载，使用备用实现');
  
  window.initRecommend16HitAnalysis = function() {
    console.log('使用备用的推荐16码初始化函数');
    
    const resultDiv = document.getElementById('recommend16HitResult');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div style="text-align:center;color:red;padding:20px;">
          <h3>推荐16码功能</h3>
          <p>推荐16码功能正在加载中...</p>
          <p><small>如果长时间未显示，请刷新页面重试</small></p>
          <button onclick="location.reload()" style="margin-top:10px;padding:8px 16px;background:#2980d9;color:white;border:none;border-radius:4px;cursor:pointer;">刷新页面</button>
        </div>
      `;
    }
  };
  
  window.analyzeRecommend16Hit = function(lotteryType) {
    console.log('使用备用的推荐16码分析函数');
    const resultDiv = document.getElementById('recommend16HitResult');
    if (resultDiv) {
      resultDiv.innerHTML = `
        <div style="text-align:center;color:red;padding:20px;">
          <h3>推荐16码分析功能</h3>
          <p>推荐16码分析功能正在加载中...</p>
          <p><small>如果长时间未显示，请刷新页面重试</small></p>
          <button onclick="location.reload()" style="margin-top:10px;padding:8px 16px;background:#2980d9;color:white;border:none;border-radius:4px;cursor:pointer;">刷新页面</button>
        </div>
      `;
    }
  };
}

// 5. 个位分析交互与渲染
let currentUnitsType = 'am';
let currentUnitsPos = 1;
let currentUnitsYear = '';
function loadUnitsAnalysis(type, pos, year) {
  if (type) currentUnitsType = type;
  if (pos) currentUnitsPos = pos;
  if (year !== undefined) currentUnitsYear = year;
  document.querySelectorAll('.units-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentUnitsType);
  });
  document.querySelectorAll('.units-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentUnitsPos);
  });
  const unitsResult = document.getElementById('unitsResult');
  unitsResult.innerHTML = '加载中...';
  let url = window.BACKEND_URL + '/units_analysis?lottery_type=' + currentUnitsType;
  if (currentUnitsYear) url += '&year=' + currentUnitsYear;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.data || !data.data.length) {
        unitsResult.innerHTML = '<span style="color:red;">暂无数据</span>';
        return;
      }
      renderUnitsTable(data, currentUnitsPos);
    });
}
function renderUnitsTable(data, pos, page = 1) {
  const PAGE_SIZE = 20;
  const unitsResult = document.getElementById('unitsResult');
  if (!data || !data.data || !data.data[pos-1]) {
    unitsResult.innerHTML = '<span style="color:red;">暂无数据</span>';
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
  let descHtml = `<div style=\"margin-bottom:8px;color:#2980d9;font-size:14px;\">${data.desc}</div>`;
  // 最大遗漏和当前遗漏统计框
  let missHtml = '';
  if (data.max_miss && data.cur_miss && data.max_miss[pos-1] && data.cur_miss[pos-1]) {
    missHtml = `<div style=\"margin-bottom:12px;display:flex;gap:24px;align-items:center;\">`
      + `<div style=\"border:1px solid #d35400;border-radius:7px;padding:8px 18px;background:#fffbe9;min-width:150px;\">`
      + `<div style=\"color:#d35400;font-weight:bold;font-size:15px;\">1组遗漏</div>`
      + `<div style=\"color:#d35400;\">最大: <b>${data.max_miss[pos-1].miss1}</b> 当前: <b>${data.cur_miss[pos-1].miss1}</b></div>`
      + `</div>`
      + `<div style=\"border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:150px;\">`
      + `<div style=\"color:#2980d9;font-weight:bold;font-size:15px;\">2组遗漏</div>`
      + `<div style=\"color:#2980d9;\">最大: <b>${data.max_miss[pos-1].miss2}</b> 当前: <b>${data.cur_miss[pos-1].miss2}</b></div>`
      + `</div>`
      + `<div style=\"border:1px solid #c0392b;border-radius:7px;padding:8px 18px;background:#fff3f3;min-width:180px;\">`
      + `<div style=\"color:#c0392b;font-weight:bold;font-size:15px;\">交替遗漏</div>`
      + `<div style=\"color:#c0392b;\">最大: <b>${data.max_alt_miss && data.max_alt_miss[pos-1] ? data.max_alt_miss[pos-1] : 0}</b> 当前: <b>${data.cur_alt_miss && data.cur_alt_miss[pos-1] ? data.cur_alt_miss[pos-1] : 0}</b></div>`
      + `</div>`
      + `</div>`;
  }
  // 分页数据
  const totalPages = Math.ceil(posData.length / PAGE_SIZE);
  const startIdx = (page - 1) * PAGE_SIZE;
  const pageData = posData.slice(startIdx, startIdx + PAGE_SIZE);
  // 表格
  let anyThresholdHtml = '<div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">';
  anyThresholdHtml += '<label for="anyMissThresholdInput" style="font-weight:bold;font-size:15px;color:#c0392b;">高亮阀值：</label>';
  anyThresholdHtml += '<input type="number" id="anyMissThresholdInput" value="' + (window.anyMissThreshold || 8) + '" min="1" max="99" style="width:70px;height:32px;font-size:16px;border:1px solid #e0b5b5;border-radius:6px;padding:0 10px;outline:none;transition:border 0.2s;box-shadow:0 1px 2px #f0f4fa;">';
  anyThresholdHtml += '</div>';

  let html = anyThresholdHtml + yearBtnsHtml + descHtml + missHtml;
  html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr><th>期号</th><th>开奖号码</th><th>1组遗漏</th><th>2组遗漏</th><th>1组连续命中</th><th>2组连续命中</th><th>交替遗漏</th></tr>';
  const anyThreshold = window.anyMissThreshold;
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
  if (page > 1) html += ` <button id='unitsPrevPage'>上一页</button>`;
  if (page < totalPages) html += ` <button id='unitsNextPage'>下一页</button>`;
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
  if (page > 1) document.getElementById('unitsPrevPage').onclick = () => renderUnitsTable(data, pos, page - 1);
  if (page < totalPages) document.getElementById('unitsNextPage').onclick = () => renderUnitsTable(data, pos, page + 1);
}
// 6. 个位分析按钮事件
setTimeout(() => {
  document.querySelectorAll('.units-type-btn').forEach(btn => {
    btn.onclick = function() {
      loadUnitsAnalysis(this.dataset.type, currentUnitsPos, currentUnitsYear);
    };
  });
  document.querySelectorAll('.units-pos-btn').forEach(btn => {
    btn.onclick = function() {
      loadUnitsAnalysis(currentUnitsType, parseInt(this.dataset.pos), currentUnitsYear);
    };
  });
  const input = document.getElementById('anyMissThresholdInput');
  if (input) {
    input.value = window.anyMissThreshold || 8;
    input.oninput = function() {
      window.anyMissThreshold = parseInt(this.value) || 8;
      input.value = window.anyMissThreshold;
      loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);
    };
  }
}, 0);

// 2. 主内容区添加+1~+20区间分析页面容器（优化：加彩种和下一期球位置下拉选择+查询按钮+年份选择）
if (!document.getElementById('rangePage')) {
  const mainContent = document.querySelector('.main-content');
  const rangeDiv = document.createElement('div');
  rangeDiv.id = 'rangePage';
  rangeDiv.style.display = 'none';
  rangeDiv.innerHTML = `
    <h2>+1~+20区间分析</h2>
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:24px;">
      <div>
        <label class="records-query-label">选择彩种：</label>
        <div id="rangeTypeBtns" style="display:inline-block;">
          <button class="range-type-btn active" data-type="am">澳门</button>
          <button class="range-type-btn" data-type="hk">香港</button>
        </div>
      </div>
      <div>
        <label class="records-query-label">下一期号码位置：</label>
        <div id="rangePosBtns" style="display:inline-block;">
          <button class="range-pos-btn active" data-pos="1">第1位</button>
          <button class="range-pos-btn" data-pos="2">第2位</button>
          <button class="range-pos-btn" data-pos="3">第3位</button>
          <button class="range-pos-btn" data-pos="4">第4位</button>
          <button class="range-pos-btn" data-pos="5">第5位</button>
          <button class="range-pos-btn" data-pos="6">第6位</button>
          <button class="range-pos-btn" data-pos="7">第7位</button>
        </div>
      </div>
      <button id="rangeQueryBtn" style="padding:6px 18px;font-size:15px;">查询</button>
    </div>
    <div id="rangeYearBtns" style="margin-bottom:12px;"></div>
    <div id="rangeResult" style="margin-top:16px;"></div>
  `;
  mainContent.appendChild(rangeDiv);
}
let currentRangeType = 'am';
let currentRangePos = 1;
let currentRangeNextPos = 7; // 默认第7位

// 第7个号码区间分析相关变量
let currentSeventhRangeType = 'am';
let currentRangePage = 1;
let currentRangeYear = '';
function loadRangeAnalysis(type, nextPos, page, year) {
  if (typeof type === 'string' && type) currentRangeType = type;
  if (typeof nextPos !== 'undefined' && nextPos !== null && nextPos !== '') currentRangeNextPos = Number(nextPos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') currentRangePage = Number(page) || 1;
  if (typeof year !== 'undefined') currentRangeYear = year;
  // 按钮高亮
  document.querySelectorAll('.range-type-btn').forEach(btn => {
    if (btn.dataset.type === currentRangeType) {
      btn.classList.add('active');
      btn.style.background = '#2980d9';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('active');
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
    }
  });
  document.querySelectorAll('.range-pos-btn').forEach(btn => {
    if (btn.dataset.pos == currentRangeNextPos) {
      btn.classList.add('active');
      btn.style.background = '#d35400';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('active');
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
    }
  });
  const rangeResult = document.getElementById('rangeResult');
  rangeResult.innerHTML = '加载中...';
  let url = `${window.BACKEND_URL}/range_analysis?lottery_type=${currentRangeType}&pos=${currentRangeNextPos}&page=${currentRangePage}&page_size=20`;
  if (currentRangeYear) url += `&year=${currentRangeYear}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
      years = data.years || [];
      yearBtnsHtml = '';
      if (years.length > 0) {
        yearBtnsHtml = '<div style="margin-bottom:10px;"><b>年份：</b>';
        yearBtnsHtml += `<button class="range-year-btn${!currentRangeYear ? ' active' : ''}" data-year="">全部</button>`;
        years.forEach(y => {
          yearBtnsHtml += `<button class="range-year-btn${currentRangeYear == y ? ' active' : ''}" data-year="${y}">${y}</button>`;
        });
        yearBtnsHtml += '</div>';
      }
      document.getElementById('rangeYearBtns').innerHTML = yearBtnsHtml;
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
        lastOpenHtml = `<div style=\"margin-bottom:10px;padding:8px 16px;border:1px solid #bbb;border-radius:8px;background:#f8fafd;\">` +
          `<span style=\"font-weight:bold;color:#2980d9;\">最新一期开奖号码（${period} ${openTime}）：</span> ` +
          balls.map((b, i) => `<span style=\"display:inline-block;margin-right:8px;\"><b>球${i+1}:</b> <span class='${getBallColorClass(b)}' style=\"display:inline-block;padding:2px 10px;border-radius:16px;color:#fff;min-width:28px;\">${b}</span></span>`).join('') +
          `</div>`;
      } else if (data && data.data && data.data.length > 0) {
        // 兼容无last_open时用表格第一行
        let lastRow = data.data[0];
        if (lastRow && lastRow.length >= 9) {
          const period = lastRow[0];
          const openTime = lastRow[1];
          const balls = lastRow.slice(2, 9); // 7个球
          lastOpenHtml = `<div style=\"margin-bottom:10px;padding:8px 16px;border:1px solid #bbb;border-radius:8px;background:#f8fafd;\">` +
            `<span style=\"font-weight:bold;color:#2980d9;\">最新一期开奖号码（${period} ${openTime}）：</span> ` +
            balls.map((b, i) => `<span style=\"display:inline-block;margin-right:8px;\"><b>球${i+1}:</b> <span class='${getBallColorClass(b.split('<')[0])}' style=\"display:inline-block;padding:2px 10px;border-radius:16px;color:#fff;min-width:28px;\">${b.split('<')[0]}</span></span>`).join('') +
            `</div>`;
        }
      }
      // 最新一期预测统计
      let predictHtml = '';
      if (data.predict && data.predict.ranges) {
        predictHtml = `<div style=\"margin-bottom:16px;padding:10px 16px;border:2px solid #2980d9;border-radius:10px;background:#f4f8ff;\">` +
          `<div style=\"font-size:17px;font-weight:bold;color:#2980d9;margin-bottom:6px;\">${data.predict.desc || '最新一期预测'}</div>`;
        for (let i = 0; i < data.predict.ranges.length; i++) {
          predictHtml += `<div style=\"border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:180px;margin-bottom:8px;display:inline-block;margin-right:18px;\">`;
          predictHtml += `<div style=\"color:#2980d9;font-weight:bold;font-size:15px;\">球${i+1}</div>`;
          for (let j = 0; j < data.predict.ranges[i].length; j++) {
            const label = data.predict.ranges[i][j].label;
            const rng = data.predict.ranges[i][j].range;
            predictHtml += `<div style=\"margin-bottom:2px;\"><span style=\"color:#333;\">${label}: <b>${rng}</b></span></div>`;
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
            <div style=\"color:#2980d9;font-weight:bold;font-size:15px;\">球${i+1}</div>`;
          for (let j = 0; j < 6; j++) {
            const label = ['+1~+20', '+5~+24', '+10~+29', '+15~+34', '+20~+39', '+25~+44'][j];
            const maxMiss = data.max_miss[i][j];
            const maxMissPeriod = data.max_miss_period[i][j];
            const curMiss = data.cur_miss[i][j];
            missHtml += `<div style=\"margin-bottom:2px;\"><span style=\"color:#333;\">${label}</span> ` +
              `<span style=\"color:#2980d9;\">最大遗漏: <b>${maxMiss}</b></span> ` +
              `<span style=\"color:#555;\">期号: <b>${maxMissPeriod}</b></span> ` +
              `<span style=\"color:#2980d9;\">当前遗漏: <b>${curMiss}</b></span></div>`;
          }
          missHtml += '</div>';
        }
        missHtml += '</div>';
      }
      // 区间表格
      if (!data.data || !data.data.length) {
        rangeResult.innerHTML = lastOpenHtml + predictHtml + missHtml + '<span style="color:red;">暂无数据</span>';
        return;
      }
      let html = lastOpenHtml + predictHtml + missHtml + '<button class="export-range-btn" style="margin-bottom:8px;">导出本页</button> <button class="export-range-all-btn" style="margin-bottom:8px;">导出全部</button>' + '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
      html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';
      let pageData = data.data;
      if (currentRangeYear) {
        pageData = pageData.filter(row => String(row[0]).startsWith(currentRangeYear));
      }
      pageData.forEach(row => {
        html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
      });
      html += '</table>';
      html += `<div style='margin-top:8px;'>第 ${data.page} / ${Math.ceil(data.total/data.page_size)} 页`;
      if (data.page > 1) html += ` <button id='rangePrevPage'>上一页</button>`;
      if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='rangeNextPage'>下一页</button>`;
      html += `</div>`;
      rangeResult.innerHTML = html;
      if (data.page > 1) document.getElementById('rangePrevPage').onclick = () => loadRangeAnalysis(currentRangeType, currentRangeNextPos, data.page-1, currentRangeYear);
      if (data.page < Math.ceil(data.total/data.page_size)) document.getElementById('rangeNextPage').onclick = () => loadRangeAnalysis(currentRangeType, currentRangeNextPos, data.page+1, currentRangeYear);
      // 导出本页
      const exportBtn = rangeResult.querySelector('.export-range-btn');
      if (exportBtn) {
        exportBtn.onclick = () => {
          const csvRows = [
            data.header,
            ...pageData
          ];
          downloadCSV(csvRows, '区间分析表.csv');
        };
      }
      // 导出全部
      const exportAllBtn = rangeResult.querySelector('.export-range-all-btn');
      if (exportAllBtn) {
        exportAllBtn.onclick = async () => {
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
          downloadCSV(csvRows, '区间分析表_全部.csv');
        };
      }
    });
}
setTimeout(() => {
  // 彩种按钮事件
  document.querySelectorAll('.range-type-btn').forEach(btn => {
    btn.onclick = function() {
      loadRangeAnalysis(this.dataset.type, currentRangeNextPos, 1, currentRangeYear);
    };
  });
  // 号码位置按钮事件
  document.querySelectorAll('.range-pos-btn').forEach(btn => {
    btn.onclick = function() {
      loadRangeAnalysis(currentRangeType, this.dataset.pos, 1, currentRangeYear);
    };
  });
  // 查询按钮事件
  const queryBtn = document.getElementById('rangeQueryBtn');
  if (queryBtn) {
    queryBtn.onclick = function() {
      loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, currentRangeYear);
    };
  }
}, 0);
if (document.getElementById('rangePage')) {
  loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, '');
}

// 1. 左侧菜单添加-1~-20区间分析按钮（放到分析推荐菜单内）
const sidebarMenu = document.getElementById('sidebarMenuBtns');
if (sidebarMenu && !document.getElementById('menuMinusRangeBtn')) {
  const minusBtn = document.createElement('button');
  minusBtn.className = 'menu-btn';
  minusBtn.id = 'menuMinusRangeBtn';
  minusBtn.innerText = '-1~-20区间分析';
  sidebarMenu.appendChild(minusBtn);
}
// 2. 主内容区添加-1~-20区间分析页面容器
if (!document.getElementById('minusRangePage')) {
  const mainContent = document.querySelector('.main-content');
  const minusDiv = document.createElement('div');
  minusDiv.id = 'minusRangePage';
  minusDiv.style.display = 'none';
  minusDiv.innerHTML = `
    <h2>-1~-20区间分析</h2>
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:24px;">
      <div>
        <label class="records-query-label" for="minusTypeAm">选择彩种：</label>
        <div id="minusRangeTypeBtns" style="display:inline-block;">
          <button class="minus-range-type-btn" id="minusTypeAm" data-type="am">澳门</button>
          <button class="minus-range-type-btn" id="minusTypeHk" data-type="hk">香港</button>
        </div>
      </div>
      <div>
        <label class="records-query-label" for="minusPos1">下一期号码位置：</label>
        <div id="minusRangePosBtns" style="display:inline-block;">
          <button class="minus-range-pos-btn" id="minusPos1" data-pos="1">第1位</button>
          <button class="minus-range-pos-btn" id="minusPos2" data-pos="2">第2位</button>
          <button class="minus-range-pos-btn" id="minusPos3" data-pos="3">第3位</button>
          <button class="minus-range-pos-btn" id="minusPos4" data-pos="4">第4位</button>
          <button class="minus-range-pos-btn" id="minusPos5" data-pos="5">第5位</button>
          <button class="minus-range-pos-btn" id="minusPos6" data-pos="6">第6位</button>
          <button class="minus-range-pos-btn" id="minusPos7" data-pos="7">第7位</button>
        </div>
      </div>
      <button id="minusRangeQueryBtn" style="padding:6px 18px;font-size:15px;">查询</button>
    </div>
    <div id="minusRangeYearBtns" style="margin-bottom:12px;"></div>
    <div id="minusRangeResult" style="margin-top:16px;"></div>
  `;
  mainContent.appendChild(minusDiv);
}
// 3. 页面切换逻辑扩展
// 直接复用顶部声明的 pageMap
Object.keys(pageMap).forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 使用showOnlyPage函数确保正确隐藏其他模块
      showOnlyPage(pageMap[id]);
      const titleMap = {
        collectPage: '数据采集',
        recordsPage: '开奖记录',
        recommendPage: '推荐8码',
        tensPage: '第N位十位分析',
        unitsPage: '第N个码个位分析',
        rangePage: '+1~+20区间分析',
        minusRangePage: '-1~-20区间分析',
        plusMinus6Page: '加减前6码分析',
        eachIssuePage: '每期分析',
      };
      document.getElementById('pageTitle').innerText = titleMap[pageMap[id]] || '';
      switch (id) {
        case 'menuCollectBtn':
          const collectResult = document.getElementById('collectResult');
          if (collectResult) collectResult.innerHTML = '';
          break;
        case 'menuRecordsBtn':
          queryRecords('recordsTableAreaAm', 1);
          queryRecords('recordsTableAreaHk', 1);
          break;
        case 'menuRecommendBtn':
          let activeBtn = document.querySelector('.recommend-type-btn.active');
          let type = activeBtn ? activeBtn.dataset.type : 'am';
          generateRecommend(type);
          break;
        case 'menuTensBtn':
          loadTensAnalysis(currentTensType, currentTensPos);
          break;
        case 'menuUnitsBtn':
          loadUnitsAnalysis(currentUnitsType, currentUnitsPos, currentUnitsYear);
          break;
        case 'menuRangeBtn':
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, '');
          break;
        case 'menuSeventhRangeBtn':
          if (typeof loadSeventhRangeAnalysis === 'function') loadSeventhRangeAnalysis(currentSeventhRangeType);
          break;
        case 'menuMinusRangeBtn':
          loadMinusRangeAnalysis(1);
          break;
        case 'menuPlusMinus6Btn':
          loadPlusMinus6Analysis();
          break;
        case 'menuEachIssueBtn':
          loadEachIssueAnalysis(currentType, currentPage);
          break;
      }
    });
  }
});
// 4. -1~-20区间分析渲染与查询
window.currentMinusRangeType = 'am';
window.currentMinusRangeNextPos = 7;
window.currentMinusRangePage = 1;
window.currentMinusRangeYear = '';
// 1. 声明高亮函数，放在 loadMinusRangeAnalysis 之前
function updateMinusRangeBtnHighlight() {
  document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
    const isActive = btn.dataset.type === window.currentMinusRangeType;
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
    const isActive = btn.dataset.pos === String(window.currentMinusRangeNextPos);
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
  document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
    const isActive = btn.dataset.year === window.currentMinusRangeYear;
    btn.classList.toggle('minus-active', isActive);
    btn.classList.toggle('active', isActive);
  });
}
function loadMinusRangeAnalysis(page, type, nextPos, year) {
  // 参数兜底，防止 undefined
  if (!type) type = 'am';
  if (!nextPos) nextPos = 7;
  if (!page) page = 1;
  if (typeof type === 'string' && type) window.currentMinusRangeType = type;
  if (typeof nextPos !== 'undefined' && nextPos !== null && nextPos !== '') window.currentMinusRangeNextPos = Number(nextPos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') window.currentMinusRangePage = Number(page) || 1;
  if (typeof year !== 'undefined') window.currentMinusRangeYear = year;
  // 修改按钮class切换逻辑，全部用.minus-active
  document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
    btn.classList.toggle('minus-active', btn.dataset.type === currentMinusRangeType);
  });
  document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
    btn.classList.toggle('minus-active', btn.dataset.pos === String(currentMinusRangeNextPos));
  });
  document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
    btn.classList.toggle('minus-active', btn.dataset.year === currentMinusRangeYear);
  });
  const minusResult = document.getElementById('minusRangeResult');
  minusResult.innerHTML = '加载中...';
  let url = `${window.BACKEND_URL}/range_analysis_minus?lottery_type=${type}&pos=${nextPos}&page=${page}&page_size=20`;
  if (year) url += `&year=${year}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
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
      document.getElementById('minusRangeYearBtns').innerHTML = yearBtnsHtml;
      // 年份按钮事件
      document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
        btn.onclick = function() {
          loadMinusRangeAnalysis(1, window.currentMinusRangeType, window.currentMinusRangeNextPos, this.dataset.year);
          updateMinusRangeBtnHighlight();
        };
      });
      // 复用+1~+20区间分析的渲染逻辑（下方略）
      // 最新一期开奖号码展示
      let lastOpenHtml = '';
      if (data && data.last_open && data.last_open.balls) {
        const period = data.last_open.period;
        const openTime = data.last_open.open_time;
        const balls = data.last_open.balls;
        lastOpenHtml = `<div style=\"margin-bottom:10px;padding:8px 16px;border:1px solid #bbb;border-radius:8px;background:#f8fafd;\">` +
          `<span style=\"font-weight:bold;color:#2980d9;\">最新一期开奖号码（${period} ${openTime}）：</span> ` +
          balls.map((b, i) => `<span style=\"display:inline-block;margin-right:8px;\"><b>球${i+1}:</b> <span class='${getBallColorClass(b)}' style=\"display:inline-block;padding:2px 10px;border-radius:16px;color:#fff;min-width:28px;\">${b}</span></span>`).join('') +
          `</div>`;
      }
      let predictHtml = '';
      if (data.predict && data.predict.ranges) {
        predictHtml = `<div style=\"margin-bottom:16px;padding:10px 16px;border:2px solid #2980d9;border-radius:10px;background:#f4f8ff;\">` +
          `<div style=\"font-size:17px;font-weight:bold;color:#2980d9;margin-bottom:6px;\">${data.predict.desc || '最新一期预测'}</div>`;
        for (let i = 0; i < data.predict.ranges.length; i++) {
          predictHtml += `<div style=\"border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:180px;margin-bottom:8px;display:inline-block;margin-right:18px;\">`;
          predictHtml += `<div style=\"color:#2980d9;font-weight:bold;font-size:15px;\">球${i+1}</div>`;
          for (let j = 0; j < data.predict.ranges[i].length; j++) {
            const label = data.predict.ranges[i][j].label;
            const rng = data.predict.ranges[i][j].range;
            predictHtml += `<div style=\"margin-bottom:2px;\"><span style=\"color:#333;\">${label}: <b>${rng}</b></span></div>`;
          }
          predictHtml += '</div>';
        }
        predictHtml += '</div>';
      }
      let missHtml = '';
      if (data.max_miss && data.cur_miss && data.max_miss_period) {
        missHtml = '<div style="margin-bottom:12px;display:flex;gap:24px;flex-wrap:wrap;align-items:center;">';
        for (let i = 0; i < 7; i++) {
          missHtml += `<div style="border:1px solid #2980d9;border-radius:7px;padding:8px 18px;background:#f4f8ff;min-width:180px;margin-bottom:8px;">
            <div style=\"color:#2980d9;font-weight:bold;font-size:15px;\">球${i+1}</div>`;
          for (let j = 0; j < 6; j++) {
            const label = ['-1~-20', '-5~-24', '-10~-29', '-15~-34', '-20~-39', '-25~-44'][j];
            const maxMiss = data.max_miss[i][j];
            const maxMissPeriod = data.max_miss_period[i][j];
            const curMiss = data.cur_miss[i][j];
            missHtml += `<div style=\"margin-bottom:2px;\"><span style=\"color:#333;\">${label}</span> ` +
              `<span style=\"color:#c0392b;\">最大遗漏: <b>${maxMiss}</b></span> ` +
              `<span style=\"color:#555;\">期号: <b>${maxMissPeriod}</b></span> ` +
              `<span style=\"color:#2980d9;\">当前遗漏: <b>${curMiss}</b></span></div>`;
          }
          missHtml += '</div>';
        }
        missHtml += '</div>';
      }
      if (!data.data || !data.data.length) {
        minusResult.innerHTML = lastOpenHtml + predictHtml + missHtml + '<span style="color:red;">暂无数据</span>';
        return;
      }
      let html = lastOpenHtml + predictHtml + missHtml + '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
      html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';
      let pageData = data.data;
      pageData.forEach(row => {
        html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
      });
      html += '</table>';
      html += `<div style='margin-top:8px;'>第 ${data.page} / ${Math.ceil(data.total/data.page_size)} 页`;
      if (data.page > 1) html += ` <button id='minusRangePrevPage'>上一页</button>`;
      if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='minusRangeNextPage'>下一页</button>`;
      html += `</div>`;
      minusResult.innerHTML = html;
      if (data.page > 1) document.getElementById('minusRangePrevPage').onclick = () => loadMinusRangeAnalysis(data.page-1, type, nextPos, year);
      if (data.page < Math.ceil(data.total/data.page_size)) document.getElementById('minusRangeNextPage').onclick = () => loadMinusRangeAnalysis(data.page+1, type, nextPos, year);
      // 查询按钮事件绑定（渲染后再绑定）
      const queryBtn = document.getElementById('minusRangeQueryBtn');
      if (queryBtn) {
        queryBtn.onclick = function() {
          loadMinusRangeAnalysis(1, window.currentMinusRangeType, window.currentMinusRangeNextPos, window.currentMinusRangeYear);
          updateMinusRangeBtnHighlight();
        };
      }
      // 彩种按钮事件
      document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
        btn.onclick = function() {
          loadMinusRangeAnalysis(1, this.dataset.type, window.currentMinusRangeNextPos, window.currentMinusRangeYear);
          updateMinusRangeBtnHighlight();
        };
      });
      // 号码位置按钮事件
      document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
        btn.onclick = function() {
          loadMinusRangeAnalysis(1, window.currentMinusRangeType, this.dataset.pos, window.currentMinusRangeYear);
          updateMinusRangeBtnHighlight();
        };
      });
      // 每次渲染后都重新高亮
      updateMinusRangeBtnHighlight();
    });
}

// 分析推荐收放按钮事件，收起时隐藏minusRangePage，展开时显示
setTimeout(() => {
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const menuDiv = document.getElementById('sidebarMenuBtns');
  if (toggleBtn && menuDiv) {
    toggleBtn.onclick = function() {
      if (menuDiv.style.display === 'none') {
        menuDiv.style.display = '';
        toggleBtn.innerText = '分析推荐 ▼';
        // 展开时显示minusRangePage（如果当前菜单是minusRangePage）
        if (document.getElementById('menuMinusRangeBtn').classList.contains('active')) {
          document.getElementById('minusRangePage').style.display = '';
        }
      } else {
        menuDiv.style.display = 'none';
        toggleBtn.innerText = '分析推荐 ▲';
        // 收起时隐藏minusRangePage
        document.getElementById('minusRangePage').style.display = 'none';
      }
    };
  }
}, 0);

// 右上角当前时间
function updateTime() {
  const timeEl = document.getElementById('currentTime');
  if (timeEl) {
    const now = new Date();
    timeEl.innerText = now.toLocaleString('zh-CN', { hour12: false });
  }
}
setInterval(updateTime, 1000);
updateTime();

document.getElementById('restartBtn').addEventListener('click', async function() {
  if (confirm("确定要重启后端服务吗？")) {
    alert("正在发送重启指令...");
    try {
      await fetch(window.BACKEND_URL + '/restart');
      alert("重启指令已发送，请稍后刷新页面！");
    } catch (e) {
      alert("重启失败：" + e);
    }
  }
}); 

// 添加样式到页面
(function(){
  const style = document.createElement('style');
  style.innerHTML = `
    .minus-range-type-btn, .minus-range-pos-btn, .minus-range-year-btn {
      background: #f4f6fa;
      color: #2980d9;
      border: 1px solid #b5c6e0;
      border-radius: 5px;
      margin-right: 6px;
      margin-bottom: 4px;
      padding: 4px 16px;
      font-size: 15px;
      cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .minus-range-type-btn.active, .minus-range-type-btn.minus-active {
      background: #2980d9 !important;
      border-color: #2980d9 !important;
      color: #fff !important;
      font-weight: bold;
      box-shadow: 0 2px 8px #e3eaf7;
    }
    .minus-range-pos-btn.active, .minus-range-pos-btn.minus-active {
      background: #d35400 !important;
      border-color: #d35400 !important;
      color: #fff !important;
      font-weight: bold;
      box-shadow: 0 2px 8px #fbeee3;
    }
    .minus-range-year-btn.active, .minus-range-year-btn.minus-active {
      background: #2980d9 !important;
      border-color: #2980d9 !important;
      color: #fff !important;
      font-weight: bold;
      box-shadow: 0 2px 8px #e3eaf7;
    }
    .minus-range-type-btn:not(.active):not(.minus-active), .minus-range-pos-btn:not(.active):not(.minus-active), .minus-range-year-btn:not(.active):not(.minus-active) {
      background: #f0f0f0 !important;
      color: #333 !important;
      border-color: #d0d0d0 !important;
    }
    .minus-range-type-btn:hover:not(.active):not(.minus-active), .minus-range-pos-btn:hover:not(.active):not(.minus-active), .minus-range-year-btn:hover:not(.active):not(.minus-active) {
      background: #e3eaf7 !important;
      color: #2980d9 !important;
    }
    .minus-range-type-btn:focus, .minus-range-pos-btn:focus, .minus-range-year-btn:focus {
      outline: 2px solid #ffb300;
      background: #ffe9b3 !important;
      color: #c0392b !important;
      z-index: 2;
    }
  `;
  document.head.appendChild(style);
})(); 

// 调试按钮聚焦高亮
// 恢复并增强 focusin/focusout 事件监听，打印日志

document.addEventListener('focusin', function(e) {
  if (e.target.classList.contains('minus-range-type-btn') || e.target.classList.contains('minus-range-pos-btn') || e.target.classList.contains('minus-range-year-btn')) {
    console.log('focusin', e.target, e.target.className);
    e.target.classList.add('minus-active');
  }
});
document.addEventListener('focusout', function(e) {
  if (e.target.classList.contains('minus-range-type-btn')) {
    if (e.target.dataset.type !== window.currentMinusRangeType) {
      console.log('focusout', e.target, e.target.className);
      e.target.classList.remove('minus-active');
    }
  }
  if (e.target.classList.contains('minus-range-pos-btn')) {
    if (e.target.dataset.pos !== String(window.currentMinusRangeNextPos)) {
      console.log('focusout', e.target, e.target.className);
      e.target.classList.remove('minus-active');
    }
  }
  if (e.target.classList.contains('minus-range-year-btn')) {
    if (e.target.dataset.year !== window.currentMinusRangeYear) {
      console.log('focusout', e.target, e.target.className);
      e.target.classList.remove('minus-active');
    }
  }
}); 

// 绑定按钮事件，点击时更新全局变量并高亮
function bindMinusRangeBtnEvents() {
  document.querySelectorAll('.minus-range-type-btn').forEach(btn => {
    btn.onclick = function() {
      window.currentMinusRangeType = this.dataset.type;
      loadMinusRangeAnalysis(1, this.dataset.type, window.currentMinusRangeNextPos, window.currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  });
  document.querySelectorAll('.minus-range-pos-btn').forEach(btn => {
    btn.onclick = function() {
      window.currentMinusRangeNextPos = this.dataset.pos;
      loadMinusRangeAnalysis(1, window.currentMinusRangeType, this.dataset.pos, window.currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  });
  document.querySelectorAll('.minus-range-year-btn').forEach(btn => {
    btn.onclick = function() {
      window.currentMinusRangeYear = this.dataset.year;
      loadMinusRangeAnalysis(1, window.currentMinusRangeType, window.currentMinusRangeNextPos, this.dataset.year);
      updateMinusRangeBtnHighlight();
    };
  });
  const queryBtn = document.getElementById('minusRangeQueryBtn');
  if (queryBtn) {
    queryBtn.onclick = function() {
      loadMinusRangeAnalysis(1, window.currentMinusRangeType, window.currentMinusRangeNextPos, window.currentMinusRangeYear);
      updateMinusRangeBtnHighlight();
    };
  }
}

// 1. 左侧菜单添加加减前6码分析按钮（放到分析推荐菜单内）
if (sidebarMenu && !document.getElementById('menuPlusMinus6Btn')) {
  const pm6Btn = document.createElement('button');
  pm6Btn.className = 'menu-btn';
  pm6Btn.id = 'menuPlusMinus6Btn';
  pm6Btn.innerText = '加减前6码分析';
  sidebarMenu.appendChild(pm6Btn);
}
// 2. 主内容区添加加减前6码分析页面容器
if (!document.getElementById('plusMinus6Page')) {
  const mainContent = document.querySelector('.main-content');
  const pm6Div = document.createElement('div');
  pm6Div.id = 'plusMinus6Page';
  pm6Div.style.display = 'none';
  pm6Div.innerHTML = `
    <h2>加减前6码分析</h2>
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:24px;">
      <div>
        <label class="records-query-label">选择彩种：</label>
        <div id="pm6TypeBtns" style="display:inline-block;">
          <button class="pm6-type-btn active" data-type="am">澳门</button>
          <button class="pm6-type-btn" data-type="hk">香港</button>
        </div>
      </div>
      <div>
        <label class="records-query-label">位数：</label>
        <div id="pm6PosBtns" style="display:inline-block;">
          <button class="pm6-pos-btn active" data-pos="1">第1位</button>
          <button class="pm6-pos-btn" data-pos="2">第2位</button>
          <button class="pm6-pos-btn" data-pos="3">第3位</button>
          <button class="pm6-pos-btn" data-pos="4">第4位</button>
          <button class="pm6-pos-btn" data-pos="5">第5位</button>
          <button class="pm6-pos-btn" data-pos="6">第6位</button>
          <button class="pm6-pos-btn" data-pos="7">第7位</button>
        </div>
      </div>
      <button id="pm6QueryBtn" style="padding:6px 18px;font-size:15px;">查询</button>
    </div>
    <div id="pm6YearBtns" style="margin-bottom:12px;"></div>
    <div id="pm6Stats" style="margin-bottom:12px;"></div>
    <div id="pm6Latest" style="margin-bottom:12px;"></div>
    <div id="pm6Predict" style="margin-bottom:12px;"></div>
    <div id="pm6Result" style="margin-top:16px;"></div>
  `;
  mainContent.appendChild(pm6Div);
}
// 3. 页面切换逻辑扩展
if (typeof pageMap === 'undefined') {
  var pageMap = {
    menuCollectBtn: 'collectPage',
    menuRecordsBtn: 'recordsPage',
    menuRecommendBtn: 'recommendPage',
    menuTensBtn: 'tensPage',
    menuUnitsBtn: 'unitsPage',
    menuRangeBtn: 'rangePage',
    menuMinusRangeBtn: 'minusRangePage',
    menuPlusMinus6Btn: 'plusMinus6Page',
    menu20RangeBtn: 'twentyRangePage',
    // 新增每期分析页面
    menuEachIssueBtn: 'eachIssuePage',
  };
} else {
  pageMap.menuPlusMinus6Btn = 'plusMinus6Page';
  pageMap.menu20RangeBtn = 'twentyRangePage';
}
Object.keys(pageMap).forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      Object.values(pageMap).forEach(pid => {
        const page = document.getElementById(pid);
        if (page) page.style.display = 'none';
      });
      document.getElementById(pageMap[id]).style.display = '';
      const titleMap = {
        collectPage: '数据采集',
        recordsPage: '开奖记录',
        recommendPage: '推荐8码',
        tensPage: '第N位十位分析',
        unitsPage: '第N个码个位分析',
        rangePage: '+1~+20区间分析',
        minusRangePage: '-1~-20区间分析',
        plusMinus6Page: '加减前6码分析',
        eachIssuePage: '每期分析',
      };
      document.getElementById('pageTitle').innerText = titleMap[pageMap[id]] || '';
      switch (id) {
        case 'menuPlusMinus6Btn':
          currentPm6Pos = 7; // 默认第7位
          loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, 1, currentPm6Year);
          break;
        // ... existing code ...
      }
    });
  }
});
// 4. 查询与渲染逻辑
let currentPm6Type = 'am';
let currentPm6Pos = 1;
let currentPm6Page = 1;
let currentPm6Year = '';
function loadPlusMinus6Analysis(type, pos, page, year) {
  if (typeof type === 'string' && type) currentPm6Type = type;
  if (typeof pos !== 'undefined' && pos !== null && pos !== '') currentPm6Pos = Number(pos) || 1;
  if (typeof page !== 'undefined' && page !== null && page !== '') currentPm6Page = Number(page) || 1;
  if (typeof year !== 'undefined') currentPm6Year = year;
  // 按钮高亮
  document.querySelectorAll('.pm6-type-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === currentPm6Type);
    if (btn.dataset.type === currentPm6Type) {
      btn.style.background = '#2980d9';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
      btn.style.border = '2px solid #2980d9';
      btn.style.boxShadow = '0 2px 8px #e3eaf7';
    } else {
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
      btn.style.fontWeight = 'normal';
      btn.style.border = '1px solid #b5c6e0';
      btn.style.boxShadow = 'none';
    }
  });
  document.querySelectorAll('.pm6-pos-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pos == currentPm6Pos);
    if (btn.dataset.pos == currentPm6Pos) {
      btn.style.background = '#d35400';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
      btn.style.border = '2px solid #d35400';
      btn.style.boxShadow = '0 2px 8px #fbeee3';
    } else {
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
      btn.style.fontWeight = 'normal';
      btn.style.border = '1px solid #b5c6e0';
      btn.style.boxShadow = 'none';
    }
  });
  document.querySelectorAll('.pm6-year-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.year == currentPm6Year);
    if (btn.dataset.year == currentPm6Year) {
      btn.style.background = '#27ae60';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
      btn.style.border = '2px solid #27ae60';
      btn.style.boxShadow = '0 2px 8px #e3f7e7';
    } else {
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
      btn.style.fontWeight = 'normal';
      btn.style.border = '1px solid #b5c6e0';
      btn.style.boxShadow = 'none';
    }
  });
  const pm6Result = document.getElementById('pm6Result');
  pm6Result.innerHTML = '加载中...';
  let url = `${window.BACKEND_URL}/plus_minus6_analysis?lottery_type=${currentPm6Type}&pos=${currentPm6Pos}&page=${currentPm6Page}&page_size=20`;
  if (currentPm6Year) url += `&year=${currentPm6Year}`;
  fetch(url)
    .then(res => res.json())
    .then(data => {
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
      document.getElementById('pm6YearBtns').innerHTML = yearBtnsHtml;
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
      document.getElementById('pm6Stats').innerHTML = statsHtml;
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
      document.getElementById('pm6Predict').innerHTML = predictHtml;
      // 渲染表格
      let html = '';
      if (data.header && data.data) {
        // 动态渲染所有表头和所有列，保证"下一期开奖号码"能展示出来
        html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">';
        html += '<tr>' + data.header.map(h => `<th>${h}</th>`).join('') + '</tr>';
        data.data.forEach(row => {
          html += '<tr>';
          row.forEach((cell, idx) => {
            if (idx === 2 && Array.isArray(cell)) {
              // 加减1~6组详情
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
        if (data.page > 1) html += ` <button id='pm6PrevPage'>上一页</button>`;
        if (data.page < Math.ceil(data.total/data.page_size)) html += ` <button id='pm6NextPage'>下一页</button>`;
        html += `</div>`;
      } else {
        html = '<span style="color:red;">暂无数据</span>';
      }
      pm6Result.innerHTML = html;
      // 分页按钮事件
      if (data.page > 1) document.getElementById('pm6PrevPage').onclick = () => loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, data.page-1, currentPm6Year);
      if (data.page < Math.ceil(data.total/data.page_size)) document.getElementById('pm6NextPage').onclick = () => loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, data.page+1, currentPm6Year);
    });
}
// 5. 按钮事件绑定
setTimeout(() => {
  document.querySelectorAll('.pm6-type-btn').forEach(btn => {
    btn.onclick = function() {
      loadPlusMinus6Analysis(this.dataset.type, currentPm6Pos, 1, currentPm6Year);
    };
  });
  document.querySelectorAll('.pm6-pos-btn').forEach(btn => {
    btn.onclick = function() {
      loadPlusMinus6Analysis(currentPm6Type, this.dataset.pos, 1, currentPm6Year);
    };
  });
  const queryBtn = document.getElementById('pm6QueryBtn');
  if (queryBtn) {
    queryBtn.onclick = function() {
      loadPlusMinus6Analysis(currentPm6Type, currentPm6Pos, 1, currentPm6Year);
    };
  }
}, 0);
// ... existing code ...
// 登记点分析展开/折叠按钮事件绑定
setTimeout(() => {
  const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');
  const registerMenuBtns = document.getElementById('registerMenuBtns');
  const registerCollapseIcon = document.getElementById('registerCollapseIcon');
  if (toggleRegisterBtn && registerMenuBtns && registerCollapseIcon) {
    toggleRegisterBtn.onclick = function() {
      if (registerMenuBtns.style.display === 'none' || registerMenuBtns.style.display === '') {
        registerMenuBtns.style.display = 'block';
        registerCollapseIcon.innerText = '▲';
      } else {
        registerMenuBtns.style.display = 'none';
        registerCollapseIcon.innerText = '▼';
      }
    };
  }
}, 0);

// ... existing code ...
// 登记点分析下拉菜单按钮事件绑定（已移除重复代码）
// ... existing code ...
// 关注点管理：增删改查
(function() {
  // 工具函数
  function renderPlacesTable(places) {
    const tbody = document.querySelector('#placesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    places.forEach(place => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${place.name}</td>
        <td>${place.description || ''}</td>
        <td>${place.created_at ? place.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
        <td>
          <button class="edit-place-btn" data-id="${place.id}">编辑</button>
          <button class="delete-place-btn" data-id="${place.id}">删除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadPlaces() {
    const res = await fetch(window.BACKEND_URL + '/api/places');
    const data = await res.json();
    renderPlacesTable(data);
  }

  async function addPlace(place) {
    await fetch(window.BACKEND_URL + '/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place)
    });
  }

  async function updatePlace(id, place) {
    await fetch(window.BACKEND_URL + '/api/places/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place)
    });
  }

  async function deletePlace(id) {
    if (!confirm('确定要删除该关注点吗？')) return;
    await fetch(window.BACKEND_URL + '/api/places/' + id, { method: 'DELETE' });
    loadPlaces();
  }

  // 表单事件
  const form = document.getElementById('placeForm');
  if (form) {
    form.onsubmit = async function(e) {
      e.preventDefault();
      const id = document.getElementById('placeId').value;
      const name = document.getElementById('placeName').value.trim();
      const description = document.getElementById('placeDescription').value.trim();
      const place = { name, description };
      if (id) {
        await updatePlace(id, place);
      } else {
        await addPlace(place);
      }
      form.reset();
      document.getElementById('placeId').value = '';
      document.getElementById('cancelEditBtn').style.display = 'none';
      loadPlaces();
    };
  }
  // 取消编辑
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) {
    cancelBtn.onclick = function() {
      form.reset();
      document.getElementById('placeId').value = '';
      cancelBtn.style.display = 'none';
    };
  }
  // 编辑/删除事件委托
  const placesTable = document.getElementById('placesTable');
  if (placesTable) {
    placesTable.addEventListener('click', function(e) {
      if (e.target.classList.contains('edit-place-btn')) {
        const id = e.target.getAttribute('data-id');
        fetch(window.BACKEND_URL + '/api/places')
          .then(res => res.json())
          .then(data => {
            const place = data.find(p => String(p.id) === String(id));
            if (place) {
              document.getElementById('placeId').value = place.id;
              document.getElementById('placeName').value = place.name;
              document.getElementById('placeDescription').value = place.description || '';
              document.getElementById('cancelEditBtn').style.display = '';
            }
          });
      } else if (e.target.classList.contains('delete-place-btn')) {
        const id = e.target.getAttribute('data-id');
        deletePlace(id);
      }
    });
  }
  // 页面切换时自动加载
  const menuRegisterFocusBtn = document.getElementById('menuRegisterFocusBtn');
  if (menuRegisterFocusBtn) {
    menuRegisterFocusBtn.addEventListener('click', function() {
      loadPlaces();
    });
  }
  // 如果页面初始就显示，也可自动加载
  if (document.getElementById('registerFocusPage').style.display !== 'none') {
    loadPlaces();
  }
})();

// 投注登记点管理：增删改查（模糊搜索关注点）
(function() {
  let allPlaces = [];
  let selectedPlaceId = null;

  // 加载所有关注点到内存
  async function fetchAllPlaces() {
    const res = await fetch(window.BACKEND_URL + '/api/places');
    allPlaces = await res.json();
  }

  // 全局变量用于分页
  let allBetsData = [];
  let originalBetsData = []; // 保存原始数据用于重置
  let filteredBetsData = []; // 保存过滤后的数据
  let currentPage = 1;
  const pageSize = 5;

  // 渲染投注记录表格
  function renderBetsTable(bets, page = 1) {
    const tbody = document.querySelector('#betsTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    // 计算分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageBets = bets.slice(startIndex, endIndex);
    
    pageBets.forEach(bet => {
      // 计算输赢金额
      let profitLoss = '';
      let profitClass = '';
      if (bet.is_correct !== null && bet.is_correct !== undefined) {
        const winAmount = parseFloat(bet.win_amount) || 0;
        const betAmount = parseFloat(bet.bet_amount) || 0;
        const profit = winAmount - betAmount;
        profitLoss = profit.toFixed(2);
        
        // 根据输赢金额设置样式类
        if (profit > 0) {
          profitClass = 'profit-positive';
        } else if (profit < 0) {
          profitClass = 'profit-negative';
        } else {
          profitClass = 'profit-zero';
        }
      }
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${bet.place_name || ''}</td>
        <td>${bet.qishu}</td>
        <td>${bet.bet_amount}</td>
        <td>${bet.win_amount}</td>
        <td>${bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误')}</td>
        <td class="${profitClass}">${profitLoss}</td>
        <td>${bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
        <td>
          <button class="edit-bet-btn" data-id="${bet.id}">编辑</button>
          <button class="delete-bet-btn" data-id="${bet.id}">删除</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    
    // 更新统计信息
    updateBetsStats(bets, pageBets);
    
    // 更新分页控件
    updateBetsPagination(bets, page);
    // 添加导出按钮（如果不存在）
    let table = document.getElementById('betsTable');
    if (table && !document.getElementById('export-bets-btn')) {
      const btn = document.createElement('button');
      btn.textContent = '导出本页';
      btn.id = 'export-bets-btn';
      btn.style.marginBottom = '8px';
      table.parentNode.insertBefore(btn, table);
      btn.onclick = () => {
        const csvRows = [
          ['关注点','期数','投注金额','赢取金额','是否正确','输赢金额','创建时间'],
          ...bets.map(bet => {
            // 计算输赢金额
            let profitLoss = '';
            if (bet.is_correct !== null && bet.is_correct !== undefined) {
              const winAmount = parseFloat(bet.win_amount) || 0;
              const betAmount = parseFloat(bet.bet_amount) || 0;
              const profit = winAmount - betAmount;
              profitLoss = profit.toFixed(2);
            }
            
            return [
              bet.place_name || '',
              bet.qishu,
              bet.bet_amount,
              bet.win_amount,
              bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误'),
              profitLoss,
              bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''
            ];
          })
        ];
        downloadCSV(csvRows, '投注记录表.csv');
      };
      // 导出全部按钮
      const allBtn = document.createElement('button');
      allBtn.textContent = '导出全部';
      allBtn.id = 'export-bets-all-btn';
      allBtn.style.marginBottom = '8px';
      allBtn.style.marginLeft = '8px';
      table.parentNode.insertBefore(allBtn, table);
      allBtn.onclick = async () => {
        const res = await fetch(window.BACKEND_URL + '/api/bets');
        const allBets = await res.json();
        const csvRows = [
          ['关注点','期数','投注金额','赢取金额','是否正确','输赢金额','创建时间'],
          ...allBets.map(bet => {
            // 计算输赢金额
            let profitLoss = '';
            if (bet.is_correct !== null && bet.is_correct !== undefined) {
              const winAmount = parseFloat(bet.win_amount) || 0;
              const betAmount = parseFloat(bet.bet_amount) || 0;
              const profit = winAmount - betAmount;
              profitLoss = profit.toFixed(2);
            }
            
            return [
              bet.place_name || '',
              bet.qishu,
              bet.bet_amount,
              bet.win_amount,
              bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误'),
              profitLoss,
              bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''
            ];
          })
        ];
        downloadCSV(csvRows, '投注记录表_全部.csv');
      };
    }
  }

  // 更新统计信息
  function updateBetsStats(bets, pageBets = []) {
    // 总体统计
    const totalBetAmount = bets.reduce((sum, bet) => sum + (parseFloat(bet.bet_amount) || 0), 0);
    const totalWinAmount = bets.reduce((sum, bet) => sum + (parseFloat(bet.win_amount) || 0), 0);
    const totalProfitLoss = totalWinAmount - totalBetAmount;
    
    document.getElementById('totalBetAmount').textContent = `¥${totalBetAmount.toFixed(2)}`;
    document.getElementById('totalWinAmount').textContent = `¥${totalWinAmount.toFixed(2)}`;
    document.getElementById('totalProfitLoss').textContent = `¥${totalProfitLoss.toFixed(2)}`;
    document.getElementById('totalRecords').textContent = bets.length;
    
    // 为总输赢金额设置颜色
    const totalProfitElement = document.getElementById('totalProfitLoss');
    totalProfitElement.className = 'stats-value';
    if (totalProfitLoss > 0) {
      totalProfitElement.classList.add('profit-positive');
    } else if (totalProfitLoss < 0) {
      totalProfitElement.classList.add('profit-negative');
    } else {
      totalProfitElement.classList.add('profit-zero');
    }
    
    // 本页统计
    const pageBetAmount = pageBets.reduce((sum, bet) => sum + (parseFloat(bet.bet_amount) || 0), 0);
    const pageWinAmount = pageBets.reduce((sum, bet) => sum + (parseFloat(bet.win_amount) || 0), 0);
    const pageProfitLoss = pageWinAmount - pageBetAmount;
    
    document.getElementById('pageBetAmount').textContent = `¥${pageBetAmount.toFixed(2)}`;
    document.getElementById('pageWinAmount').textContent = `¥${pageWinAmount.toFixed(2)}`;
    document.getElementById('pageProfitLoss').textContent = `¥${pageProfitLoss.toFixed(2)}`;
    document.getElementById('pageRecords').textContent = pageBets.length;
    
    // 为本页输赢金额设置颜色
    const pageProfitElement = document.getElementById('pageProfitLoss');
    pageProfitElement.className = 'stats-value';
    if (pageProfitLoss > 0) {
      pageProfitElement.classList.add('profit-positive');
    } else if (pageProfitLoss < 0) {
      pageProfitElement.classList.add('profit-negative');
    } else {
      pageProfitElement.classList.add('profit-zero');
    }
  }

  // 更新分页控件
  function updateBetsPagination(bets, currentPage) {
    const totalPages = Math.ceil(bets.length / pageSize);
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, bets.length);
    
    // 更新分页信息
    document.getElementById('paginationInfo').textContent = 
      `显示 ${startRecord}-${endRecord} 条，共 ${bets.length} 条记录`;
    
    // 更新按钮状态
    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
    
    // 生成页码按钮
    const pageNumbersContainer = document.getElementById('pageNumbers');
    pageNumbersContainer.innerHTML = '';
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('span');
      pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.onclick = () => goToPage(i);
      pageNumbersContainer.appendChild(pageBtn);
    }
  }

  // 跳转到指定页面
  function goToPage(page) {
    currentPage = page;
    renderBetsTable(filteredBetsData, page);
  }

  async function loadBets() {
    const res = await fetch(window.BACKEND_URL + '/api/bets');
    const data = await res.json();
    allBetsData = data;
    originalBetsData = [...data]; // 保存原始数据
    filteredBetsData = [...data]; // 初始化过滤数据
    currentPage = 1;
    renderBetsTable(data, 1);
    
    // 绑定分页按钮事件
    bindPaginationEvents();
    
    // 绑定查询按钮事件
    bindQueryEvents();
  }
  
  // 绑定分页按钮事件
  function bindPaginationEvents() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          goToPage(currentPage - 1);
        }
      };
    }
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        const totalPages = Math.ceil(filteredBetsData.length / pageSize);
        if (currentPage < totalPages) {
          goToPage(currentPage + 1);
        }
      };
    }
  }
  
  // 绑定查询按钮事件
  function bindQueryEvents() {
    const queryBtn = document.getElementById('queryBetsBtn');
    const resetBtn = document.getElementById('resetQueryBtn');
    const clearBtn = document.getElementById('clearQueryBtn');
    
    if (queryBtn) {
      queryBtn.onclick = () => {
        filterBets();
      };
    }
    
    if (resetBtn) {
      resetBtn.onclick = () => {
        resetQuery();
      };
    }
    
    if (clearBtn) {
      clearBtn.onclick = () => {
        clearQuery();
      };
    }
    
    // 绑定关注点自动完成功能
    setupQueryPlaceAutocomplete();
  }
  // 过滤投注记录
  function filterBets() {
    const queryPlace = document.getElementById('queryPlace').value.trim().toLowerCase();
    const queryQishu = document.getElementById('queryQishu').value.trim();
    const queryBetAmount = document.getElementById('queryBetAmount').value;
    const queryWinAmount = document.getElementById('queryWinAmount').value;
    const queryIsCorrect = document.getElementById('queryIsCorrect').value;
    const queryProfitLoss = document.getElementById('queryProfitLoss').value;
    const queryStartDate = document.getElementById('queryStartDate').value;
    const queryEndDate = document.getElementById('queryEndDate').value;
    
    // 调试信息
    console.log('查询条件:', {
      queryPlace,
      queryQishu,
      queryBetAmount,
      queryWinAmount,
      queryIsCorrect,
      queryProfitLoss,
      queryStartDate,
      queryEndDate
    });
    
    // 从原始数据开始过滤
    const filteredBets = originalBetsData.filter(bet => {
      // 关注点过滤
      if (queryPlace && !bet.place_name?.toLowerCase().includes(queryPlace)) {
        return false;
      }
      
      // 期数过滤
      if (queryQishu && !bet.qishu?.includes(queryQishu)) {
        return false;
      }
      
      // 投注金额过滤
      if (queryBetAmount) {
        const betAmount = parseFloat(bet.bet_amount) || 0;
        const [minAmount, maxAmount] = parseAmountRange(queryBetAmount);
        
        if (betAmount < minAmount || betAmount > maxAmount) {
          return false;
        }
      }
      
      // 赢取金额过滤
      if (queryWinAmount) {
        const winAmount = parseFloat(bet.win_amount) || 0;
        const [minAmount, maxAmount] = parseAmountRange(queryWinAmount);
        
        if (winAmount < minAmount || winAmount > maxAmount) {
          return false;
        }
      }
      
      // 是否正确过滤
      if (queryIsCorrect !== '') {
        if (queryIsCorrect === 'null') {
          if (bet.is_correct !== null && bet.is_correct !== undefined) {
            return false;
          }
        } else {
          const isCorrect = parseInt(queryIsCorrect);
          if (bet.is_correct !== isCorrect) {
            return false;
          }
        }
      }
      
      // 输赢金额过滤
      if (queryProfitLoss) {
        if (bet.is_correct !== null && bet.is_correct !== undefined) {
          const winAmount = parseFloat(bet.win_amount) || 0;
          const betAmount = parseFloat(bet.bet_amount) || 0;
          const profitLoss = winAmount - betAmount;
          
          const [minProfit, maxProfit] = parseAmountRange(queryProfitLoss);
          
          if (profitLoss < minProfit || profitLoss > maxProfit) {
            return false;
          }
        } else {
          // 如果查询输赢金额但记录未判断，则过滤掉
          return false;
        }
      }
      
      // 创建时间过滤
      if (queryStartDate || queryEndDate) {
        const createdDate = bet.created_at ? bet.created_at.split('T')[0] : '';
        if (queryStartDate && createdDate < queryStartDate) {
          return false;
        }
        if (queryEndDate && createdDate > queryEndDate) {
          return false;
        }
      }
      
      return true;
    });
    
    console.log('过滤前数据量:', originalBetsData.length);
    console.log('过滤后数据量:', filteredBets.length);
    
    // 更新过滤后的数据
    filteredBetsData = filteredBets;
    currentPage = 1;
    renderBetsTable(filteredBets, 1);
    
    // 显示查询结果提示
    if (filteredBets.length === 0) {
      alert('未找到符合条件的记录，请检查查询条件');
    } else {
      console.log('查询成功，找到', filteredBets.length, '条记录');
    }
  }
  
  // 重置查询
  async function resetQuery() {
    // 恢复原始数据
    filteredBetsData = [...originalBetsData];
    currentPage = 1;
    renderBetsTable(filteredBetsData, 1);
    
    // 清空查询条件
    clearQuery();
  }
  
  // 解析金额范围
  function parseAmountRange(rangeStr) {
    if (!rangeStr) return [0, Infinity];
    
    if (rangeStr.includes('-')) {
      const parts = rangeStr.split('-');
      const min = parseFloat(parts[0]) || 0;
      const max = parseFloat(parts[1]) || Infinity;
      return [min, max];
    } else if (rangeStr.includes('+')) {
      const min = parseFloat(rangeStr.replace('+', '')) || 0;
      return [min, Infinity];
    }
    
    return [0, Infinity];
  }
  
  // 清空查询条件
  function clearQuery() {
    document.getElementById('queryPlace').value = '';
    document.getElementById('queryQishu').value = '';
    document.getElementById('queryBetAmount').value = '';
    document.getElementById('queryWinAmount').value = '';
    document.getElementById('queryIsCorrect').value = '';
    document.getElementById('queryProfitLoss').value = '';
    document.getElementById('queryStartDate').value = '';
    document.getElementById('queryEndDate').value = '';
    
    // 隐藏建议下拉框
    const suggest = document.getElementById('queryPlaceSuggest');
    if (suggest) {
      suggest.style.display = 'none';
    }
  }
  // 设置关注点自动完成功能
  function setupQueryPlaceAutocomplete() {
    const input = document.getElementById('queryPlace');
    const suggest = document.getElementById('queryPlaceSuggest');
    
    if (!input || !suggest) return;
    
    let selectedIndex = -1;
    let suggestions = [];
    
    // 输入事件
    input.addEventListener('input', function() {
      const value = this.value.trim().toLowerCase();
      
      if (!value) {
        suggest.style.display = 'none';
        return;
      }
      
      // 从原始数据中获取所有唯一的关注点
      const allPlaces = [...new Set(originalBetsData.map(bet => bet.place_name).filter(name => name))];
      
      // 过滤匹配的关注点
      suggestions = allPlaces.filter(place => 
        place.toLowerCase().includes(value)
      );
      
      if (suggestions.length === 0) {
        suggest.style.display = 'none';
        return;
      }
      
      // 显示建议
      suggest.innerHTML = suggestions.map((place, index) => 
        `<div class="autocomplete-suggestion-item" data-index="${index}">${place}</div>`
      ).join('');
      
      suggest.style.display = 'block';
      selectedIndex = -1;
    });
    
    // 键盘事件
    input.addEventListener('keydown', function(e) {
      const items = suggest.querySelectorAll('.autocomplete-suggestion-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          input.value = suggestions[selectedIndex];
          suggest.style.display = 'none';
        }
      } else if (e.key === 'Escape') {
        suggest.style.display = 'none';
        selectedIndex = -1;
      }
    });
    
    // 点击事件
    suggest.addEventListener('click', function(e) {
      if (e.target.classList.contains('autocomplete-suggestion-item')) {
        const index = parseInt(e.target.getAttribute('data-index'));
        input.value = suggestions[index];
        suggest.style.display = 'none';
        selectedIndex = -1;
      }
    });
    
    // 失焦事件
    input.addEventListener('blur', function() {
      setTimeout(() => {
        suggest.style.display = 'none';
        selectedIndex = -1;
      }, 200);
    });
    
    // 更新选中状态
    function updateSelection(items, index) {
      items.forEach((item, i) => {
        if (i === index) {
          item.classList.add('selected');
        } else {
          item.classList.remove('selected');
        }
      });
    }
  }

  async function addBet(bet) {
    await fetch(window.BACKEND_URL + '/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet)
    });
  }

  async function updateBet(id, bet) {
    await fetch(window.BACKEND_URL + '/api/bets/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bet)
    });
  }

  async function deleteBet(id) {
    if (!confirm('确定要删除该投注记录吗？')) return;
    await fetch(window.BACKEND_URL + '/api/bets/' + id, { method: 'DELETE' });
    // 重新加载数据并保持当前页面
    const res = await fetch(window.BACKEND_URL + '/api/bets');
    const data = await res.json();
    allBetsData = data;
    originalBetsData = [...data]; // 更新原始数据
    filteredBetsData = [...data]; // 更新过滤数据
    
    // 如果当前页面没有数据了，回到上一页
    const totalPages = Math.ceil(filteredBetsData.length / pageSize);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    
    renderBetsTable(filteredBetsData, currentPage);
  }

  // 关注点输入框模糊匹配
  function setupPlaceInput() {
    const input = document.getElementById('betPlaceInput');
    const suggest = document.getElementById('betPlaceSuggest');
    if (!input || !suggest) return;
    input.oninput = function() {
      const val = input.value.trim().toLowerCase();
      if (!val) {
        suggest.innerHTML = '';
        selectedPlaceId = null;
        return;
      }
      const matches = allPlaces.filter(p => p.name.toLowerCase().includes(val));
      if (matches.length === 0) {
        suggest.innerHTML = '<div style="background:#fffbe9;padding:4px 8px;">无匹配关注点</div>';
        selectedPlaceId = null;
        return;
      }
      suggest.innerHTML = matches.map(p => `<div class="bet-place-suggest-item" data-id="${p.id}" style="padding:4px 8px;cursor:pointer;">${p.name}</div>`).join('');
      // 绑定点击
      Array.from(suggest.querySelectorAll('.bet-place-suggest-item')).forEach(item => {
        item.onclick = function() {
          input.value = this.textContent;
          selectedPlaceId = this.getAttribute('data-id');
          suggest.innerHTML = '';
        };
      });
    };
    // 失焦时稍后隐藏建议
    input.onblur = function() {
      setTimeout(() => { suggest.innerHTML = ''; }, 200);
    };
  }

  // 表单事件
  const betForm = document.getElementById('betForm');
  if (betForm) {
    betForm.onsubmit = async function(e) {
      e.preventDefault();
      const id = document.getElementById('betId').value;
      const placeName = document.getElementById('betPlaceInput').value.trim();
      // 根据输入的名称找id
      let place_id = selectedPlaceId;
      if (!place_id) {
        // 尝试精确匹配
        const found = allPlaces.find(p => p.name === placeName);
        if (found) place_id = found.id;
      }
      if (!place_id) {
        alert('请选择有效的关注点');
        return;
      }
      const qishu = document.getElementById('betQishu').value.trim();
      const bet_amount = document.getElementById('betAmount').value;
      const win_amount = document.getElementById('winAmount').value;
      const is_correct = document.getElementById('betIsCorrect').value;
      const bet = { place_id, qishu, bet_amount, win_amount, is_correct: is_correct === '' ? null : Number(is_correct) };
      if (id) {
        await updateBet(id, bet);
      } else {
        await addBet(bet);
      }
      betForm.reset();
      document.getElementById('betId').value = '';
      document.getElementById('cancelBetEditBtn').style.display = 'none';
      selectedPlaceId = null;
      
      // 重新加载数据并跳转到第一页
      const res = await fetch(window.BACKEND_URL + '/api/bets');
      const data = await res.json();
      allBetsData = data;
      originalBetsData = [...data]; // 更新原始数据
      filteredBetsData = [...data]; // 更新过滤数据
      currentPage = 1;
      renderBetsTable(filteredBetsData, 1);
    };
  }
  // 取消编辑
  const cancelBetBtn = document.getElementById('cancelBetEditBtn');
  if (cancelBetBtn) {
    cancelBetBtn.onclick = function() {
      betForm.reset();
      document.getElementById('betId').value = '';
      cancelBetBtn.style.display = 'none';
      selectedPlaceId = null;
    };
  }
  // 编辑/删除事件委托
  const betsTable = document.getElementById('betsTable');
  if (betsTable) {
    betsTable.addEventListener('click', function(e) {
      if (e.target.classList.contains('edit-bet-btn')) {
        const id = e.target.getAttribute('data-id');
        fetch(window.BACKEND_URL + '/api/bets')
          .then(res => res.json())
          .then(data => {
            const bet = data.find(b => String(b.id) === String(id));
            if (bet) {
              document.getElementById('betId').value = bet.id;
              document.getElementById('betPlaceInput').value = bet.place_name || '';
              selectedPlaceId = bet.place_id;
              document.getElementById('betQishu').value = bet.qishu;
              document.getElementById('betAmount').value = bet.bet_amount;
              document.getElementById('winAmount').value = bet.win_amount;
              document.getElementById('betIsCorrect').value = bet.is_correct === null || bet.is_correct === undefined ? '' : String(bet.is_correct);
              document.getElementById('cancelBetEditBtn').style.display = '';
            }
          });
      } else if (e.target.classList.contains('delete-bet-btn')) {
        const id = e.target.getAttribute('data-id');
        deleteBet(id);
      }
    });
  }
  // 页面切换时自动加载
  const menuRegisterBetBtn = document.getElementById('menuRegisterBetBtn');
  if (menuRegisterBetBtn) {
    menuRegisterBetBtn.addEventListener('click', async function() {
      await fetchAllPlaces();
      setupPlaceInput();
      loadBets();
    });
  }
  // 如果页面初始就显示，也可自动加载
  if (document.getElementById('registerBetPage').style.display !== 'none') {
    fetchAllPlaces().then(setupPlaceInput);
    loadBets();
  }
})();
// ... existing code ...
// 6. 每期分析交互与渲染
(function() {
  const menuEachIssueBtn = document.getElementById('menuEachIssueBtn');
  const eachIssuePage = document.getElementById('eachIssuePage');
  const eachIssueResult = document.getElementById('eachIssueResult');
  const typeBtns = document.querySelectorAll('.each-issue-type-btn');
  let currentType = 'am';
  let currentPage = 1;
  let pageSize = 20;
  let totalPages = 1;
  let currentUnitGroup = '';

  if (menuEachIssueBtn) {
    menuEachIssueBtn.addEventListener('click', function() {
      // 使用统一的页面切换逻辑
      document.querySelectorAll('.main-content > div[id$="Page"]').forEach(div => {
        div.style.display = 'none';
      });
      eachIssuePage.style.display = '';
      currentPage = 1;
      loadEachIssueAnalysis(currentType, currentPage);
    });
  }
  if (typeBtns.length) {
    typeBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        typeBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentType = this.dataset.type;
        currentPage = 1;
        loadEachIssueAnalysis(currentType, currentPage);
      });
    });
  }
  // 期数个位分组按钮事件
  const unitBtns = document.querySelectorAll('.each-issue-unit-btn');
  if (unitBtns.length) {
    unitBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        unitBtns.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentUnitGroup = this.dataset.group;
        currentPage = 1;
        loadEachIssueAnalysis(currentType, currentPage);
      });
    });
  }

  async function loadEachIssueAnalysis(type = 'am', page = 1) {
    eachIssueResult.innerHTML = '加载中...';
    try {
      let url = `${window.BACKEND_URL}/each_issue_analysis?lottery_type=${type}&page=${page}&page_size=${pageSize}`;
      if (currentUnitGroup) {
        url += `&unit_group=${currentUnitGroup}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      totalPages = Math.ceil(data.total / data.page_size);
      renderEachIssueTable(
        data.data || [],
        data.page,
        totalPages,
        data.current_max_miss,
        data.current_max_miss_period,
        data.history_max_miss,
        data.history_max_miss_period
      );
    } catch (e) {
      eachIssueResult.innerHTML = '加载失败：' + e;
    }
  }

  function renderEachIssueTable(rows, page, totalPages, currentMaxMiss, currentMaxMissPeriod, historyMaxMiss, historyMaxMissPeriod) {
    if (!rows.length) {
      eachIssueResult.innerHTML = '<span style="color:red;">暂无数据</span>';
      return;
    }
    let html = '';
    
    // 显示当前筛选条件
    let filterInfo = '';
    if (currentUnitGroup) {
      const groupNames = {
        '0': '0/5组',
        '1': '1/6组', 
        '2': '2/7组',
        '3': '3/8组',
        '4': '4/9组'
      };
      filterInfo = `<div style='margin-bottom:12px;padding:8px 12px;background:#e8f4fd;border:1px solid #2980d9;border-radius:6px;color:#2980d9;font-weight:bold;'>
        当前筛选：${groupNames[currentUnitGroup]}（只显示期号个位数为该分组的记录）
      </div>`;
    }
    
    html += filterInfo;
    html += `<div style='margin-bottom:12px;'>
      <b>当前最大遗漏：</b><span style='color:#c0392b;font-weight:bold;'>${currentMaxMiss}</span>
      <span style='color:#888;'>(期号: ${currentMaxMissPeriod || '-'})</span>
      &nbsp;&nbsp;
      <b>历史最大遗漏：</b><span style='color:#2980d9;font-weight:bold;'>${historyMaxMiss}</span>
      <span style='color:#888;'>(期号: ${historyMaxMissPeriod || '-'})</span>
    </div>`;
    html += `<button class="export-each-issue-btn" style="margin-bottom:8px;">导出本页</button> <button class="export-each-issue-all-btn" style="margin-bottom:8px;">导出全部</button>`;
    html += `<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">
      <tr><th>期号</th><th>开奖时间</th><th>开奖号码</th><th>已经有几期没有开了</th><th>状态</th></tr>`;
    rows.forEach(row => {
      let statusHtml = '';
      if (row.stop_reason === 'hit') {
        statusHtml = '<span style="color:green;font-weight:bold;">已命中</span>';
      } else if (row.stop_reason === 'end') {
        statusHtml = '<span style="color:orange;font-weight:bold;">未命中到末期</span>';
      } else {
        statusHtml = '-';
      }
      html += `<tr><td>${row.period}</td><td>${row.open_time}</td><td>${row.numbers}</td><td>${row.miss_count}</td><td>${statusHtml.replace(/<[^>]+>/g, '')}</td></tr>`;
    });
    html += '</table>';
    html += `<div style='margin-top:8px;'>第 ${page} / ${totalPages} 页`;
    if (page > 1) html += ` <button class='eachIssuePrevPage'>上一页</button>`;
    if (page < totalPages) html += ` <button class='eachIssueNextPage'>下一页</button>`;
    html += `</div>`;
    eachIssueResult.innerHTML = html;
    // 事件绑定
    const prevBtn = eachIssueResult.querySelector('.eachIssuePrevPage');
    const nextBtn = eachIssueResult.querySelector('.eachIssueNextPage');
    if (prevBtn) prevBtn.onclick = () => { currentPage -= 1; loadEachIssueAnalysis(currentType, currentPage); };
    if (nextBtn) nextBtn.onclick = () => { currentPage += 1; loadEachIssueAnalysis(currentType, currentPage); };
    // 导出本页
    const exportBtn = eachIssueResult.querySelector('.export-each-issue-btn');
    if (exportBtn) {
      exportBtn.onclick = () => {
        const csvRows = [
          ['期号','开奖时间','开奖号码','已经有几期没有开了','状态'],
          ...rows.map(row => [
            row.period,
            row.open_time,
            row.numbers,
            row.miss_count,
            row.stop_reason === 'hit' ? '已命中' : (row.stop_reason === 'end' ? '未命中到末期' : '-')
          ])
        ];
        downloadCSV(csvRows, '每期分析表.csv');
      };
    }
    // 导出全部
    const exportAllBtn = eachIssueResult.querySelector('.export-each-issue-all-btn');
    if (exportAllBtn) {
      exportAllBtn.onclick = async () => {
        const type = currentType || 'am';
        let url = `${window.BACKEND_URL}/each_issue_analysis?lottery_type=${type}&page=1&page_size=10000`;
        if (currentUnitGroup) {
          url += `&unit_group=${currentUnitGroup}`;
        }
        const res = await fetch(url);
        const allData = await res.json();
        const allRows = Array.isArray(allData.data) ? allData.data : [];
        const csvRows = [
          ['期号','开奖时间','开奖号码','已经有几期没有开了','状态'],
          ...allRows.map(row => [
            row.period,
            row.open_time,
            row.numbers,
            row.miss_count,
            row.stop_reason === 'hit' ? '已命中' : (row.stop_reason === 'end' ? '未命中到末期' : '-')
          ])
        ];
        downloadCSV(csvRows, '每期分析表_全部.csv');
      };
    }
  }
// ... existing code ...
})();

// 通用CSV导出函数
function downloadCSV(rows, filename) {
  const process = v => (v == null ? '' : ('' + v).replace(/"/g, '""'));
  const csvContent = rows.map(row => row.map(process).map(v => `"${v}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
// ... existing code ...

// 关注点登记结果相关功能
{
  let currentPlaceResultPage = 1;
  let currentPlaceResultPageSize = 20;
  let currentPlaceResultTotal = 0;
  let currentPlaceResultTotalPages = 0;
  let editingPlaceResultId = null;

  // 渲染关注点登记结果表格
  function renderPlaceResultsTable(results, page = 1) {
    const tbody = document.querySelector('#placeResultsTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!results || results.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }
    
    results.forEach(result => {
      const row = document.createElement('tr');
      row.setAttribute('data-id', result.id); // 添加data-id属性
      const isCorrectText = result.is_correct === 1 ? '正确' : (result.is_correct === 0 ? '错误' : '未判断');
      const isCorrectClass = result.is_correct === 1 ? 'correct' : (result.is_correct === 0 ? 'wrong' : 'unjudged');
      
      row.innerHTML = `
        <td>${result.place_name || '-'}</td>
        <td>${result.qishu}</td>
        <td class="${isCorrectClass}">${isCorrectText}</td>
        <td>${result.created_at}</td>
        <td>
          <button class="btn-edit" data-id="${result.id}">编辑</button>
          <button class="btn-delete" data-id="${result.id}">删除</button>
        </td>
      `;
      tbody.appendChild(row);
    });
    
    // 添加事件委托来处理编辑和删除按钮
    tbody.addEventListener('click', function(e) {
      console.log('表格点击事件:', e.target); // 调试信息
      if (e.target.classList.contains('btn-edit')) {
        const id = parseInt(e.target.dataset.id);
        console.log('点击编辑按钮，ID:', id); // 调试信息
        editPlaceResult(id);
      } else if (e.target.classList.contains('btn-delete')) {
        const id = parseInt(e.target.dataset.id);
        console.log('点击删除按钮，ID:', id); // 调试信息
        deletePlaceResult(id);
      }
    });
  }

  // 更新关注点登记结果统计
  function updatePlaceResultsStats(results, pageResults = []) {
    const totalRecords = results?.total || 0;
    const pageRecords = pageResults.length;
    
    // 总体统计
    let totalCorrect = 0, totalWrong = 0, totalUnjudged = 0;
    if (results?.data) {
      results.data.forEach(result => {
        if (result.is_correct === 1) totalCorrect++;
        else if (result.is_correct === 0) totalWrong++;
        else totalUnjudged++;
      });
    }
    
    // 本页统计
    let pageCorrect = 0, pageWrong = 0, pageUnjudged = 0;
    pageResults.forEach(result => {
      if (result.is_correct === 1) pageCorrect++;
      else if (result.is_correct === 0) pageWrong++;
      else pageUnjudged++;
    });
    
    document.getElementById('totalPlaceResultRecords').textContent = totalRecords;
    document.getElementById('totalCorrectRecords').textContent = totalCorrect;
    document.getElementById('totalWrongRecords').textContent = totalWrong;
    document.getElementById('totalUnjudgedRecords').textContent = totalUnjudged;
    
    document.getElementById('pagePlaceResultRecords').textContent = pageRecords;
    document.getElementById('pageCorrectRecords').textContent = pageCorrect;
    document.getElementById('pageWrongRecords').textContent = pageWrong;
    document.getElementById('pageUnjudgedRecords').textContent = pageUnjudged;
  }

  // 更新关注点登记结果分页
  function updatePlaceResultsPagination(results, currentPage) {
    const total = results?.total || 0;
    const pageSize = results?.page_size || 20;
    const totalPages = results?.total_pages || 0;
    
    currentPlaceResultTotal = total;
    currentPlaceResultTotalPages = totalPages;
    
    // 更新分页信息
    const start = (currentPage - 1) * pageSize + 1;
    const end = Math.min(currentPage * pageSize, total);
    document.getElementById('placeResultsPaginationInfo').textContent = 
      `显示 ${start}-${end} 条，共 ${total} 条记录`;
    
    // 更新分页按钮
    const prevBtn = document.getElementById('prevPlaceResultPageBtn');
    const nextBtn = document.getElementById('nextPlaceResultPageBtn');
    const pageNumbers = document.getElementById('placeResultPageNumbers');
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    
    // 生成页码
    let pageHtml = '';
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === currentPage) {
        pageHtml += `<span class="page-number current">${i}</span>`;
      } else {
        pageHtml += `<span class="page-number" onclick="goToPlaceResultPage(${i})">${i}</span>`;
      }
    }
    pageNumbers.innerHTML = pageHtml;
  }

  // 跳转到指定页
  window.goToPlaceResultPage = function(page) {
    currentPlaceResultPage = page;
    loadPlaceResults();
  };

  // 加载关注点登记结果
  async function loadPlaceResults() {
    try {
      // 首先测试API连接
      console.log('测试API连接...'); // 调试信息
      const testResponse = await fetch(`${window.BACKEND_URL}/`);
      console.log('API连接状态:', testResponse.status); // 调试信息
      
      const params = new URLSearchParams({
        page: currentPlaceResultPage,
        page_size: currentPlaceResultPageSize
      });
      
      // 添加查询条件
      const queryPlace = document.getElementById('queryPlaceResultPlace')?.value;
      const queryQishu = document.getElementById('queryPlaceResultQishu')?.value;
      const queryIsCorrect = document.getElementById('queryPlaceResultIsCorrect')?.value;
      const queryStartDate = document.getElementById('queryPlaceResultStartDate')?.value;
      const queryEndDate = document.getElementById('queryPlaceResultEndDate')?.value;
      
      console.log('查询条件:', { queryPlace, queryQishu, queryIsCorrect, queryStartDate, queryEndDate }); // 调试信息
      
      if (queryPlace && queryPlace.trim()) {
        // 需要根据关注点名称查找ID
        const places = await fetchPlaceResultsPlaces();
        const place = places.find(p => p.name === queryPlace.trim());
        if (place) {
          params.append('place_id', place.id);
          console.log('找到关注点ID:', place.id); // 调试信息
        } else {
          console.log('未找到关注点:', queryPlace); // 调试信息
        }
      }
      if (queryQishu && queryQishu.trim()) {
        params.append('qishu', queryQishu.trim());
      }
      if (queryIsCorrect && queryIsCorrect !== '') {
        if (queryIsCorrect === 'null') {
          // 查询未判断的记录
          params.append('is_correct', 'null');
        } else {
          params.append('is_correct', queryIsCorrect);
        }
      }
      if (queryStartDate && queryStartDate.trim()) {
        params.append('start_date', queryStartDate.trim());
      }
      if (queryEndDate && queryEndDate.trim()) {
        params.append('end_date', queryEndDate.trim());
      }
      
      console.log('请求URL:', `${window.BACKEND_URL}/api/place_results?${params}`); // 调试信息
      
      const response = await fetch(`${window.BACKEND_URL}/api/place_results?${params}`);
      const result = await response.json();
      
      console.log('API响应:', result); // 调试信息
      
      if (result.success) {
        renderPlaceResultsTable(result.data, result.data);
        updatePlaceResultsStats(result, result.data);
        updatePlaceResultsPagination(result, currentPlaceResultPage);
      } else {
        console.error('加载关注点登记结果失败:', result.message);
        alert('查询失败: ' + result.message);
      }
    } catch (error) {
      console.error('加载关注点登记结果失败:', error);
      alert('查询失败: 网络错误');
    }
  }

  // 绑定关注点登记结果分页事件
  function bindPlaceResultsPaginationEvents() {
    const prevBtn = document.getElementById('prevPlaceResultPageBtn');
    const nextBtn = document.getElementById('nextPlaceResultPageBtn');
    
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (currentPlaceResultPage > 1) {
          currentPlaceResultPage--;
          loadPlaceResults();
        }
      };
    }
    
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (currentPlaceResultPage < currentPlaceResultTotalPages) {
          currentPlaceResultPage++;
          loadPlaceResults();
        }
      };
    }
  }

  // 绑定关注点登记结果查询事件
  function bindPlaceResultsQueryEvents() {
    const queryBtn = document.getElementById('queryPlaceResultsBtn');
    const resetBtn = document.getElementById('resetPlaceResultQueryBtn');
    const clearBtn = document.getElementById('clearPlaceResultQueryBtn');
    
    if (queryBtn) {
      queryBtn.onclick = () => {
        console.log('查询按钮被点击'); // 调试信息
        
        // 测试获取所有查询条件
        const queryPlace = document.getElementById('queryPlaceResultPlace')?.value;
        const queryQishu = document.getElementById('queryPlaceResultQishu')?.value;
        const queryIsCorrect = document.getElementById('queryPlaceResultIsCorrect')?.value;
        const queryStartDate = document.getElementById('queryPlaceResultStartDate')?.value;
        const queryEndDate = document.getElementById('queryPlaceResultEndDate')?.value;
        
        console.log('查询按钮点击时的条件:', {
          queryPlace,
          queryQishu,
          queryIsCorrect,
          queryStartDate,
          queryEndDate
        }); // 调试信息
        
        currentPlaceResultPage = 1;
        loadPlaceResults();
      };
    }
    
    if (resetBtn) {
      resetBtn.onclick = () => {
        document.getElementById('queryPlaceResultPlace').value = '';
        document.getElementById('queryPlaceResultQishu').value = '';
        document.getElementById('queryPlaceResultIsCorrect').value = '';
        document.getElementById('queryPlaceResultStartDate').value = '';
        document.getElementById('queryPlaceResultEndDate').value = '';
        // 重置按钮状态
        resetIsCorrectButtons('placeResultsQueryForm');
        currentPlaceResultPage = 1;
        loadPlaceResults();
      };
    }
    
    if (clearBtn) {
      clearBtn.onclick = () => {
        document.getElementById('queryPlaceResultPlace').value = '';
        document.getElementById('queryPlaceResultQishu').value = '';
        document.getElementById('queryPlaceResultIsCorrect').value = '';
        document.getElementById('queryPlaceResultStartDate').value = '';
        document.getElementById('queryPlaceResultEndDate').value = '';
        // 重置按钮状态
        resetIsCorrectButtons('placeResultsQueryForm');
      };
    }
  }

  // 获取关注点列表的函数
  async function fetchPlaceResultsPlaces() {
    try {
      const res = await fetch(window.BACKEND_URL + '/api/places');
      const places = await res.json();
      return places;
    } catch (error) {
      console.error('获取关注点列表失败:', error);
      return [];
    }
  }
  // 设置关注点登记结果关注点按钮选择
  function setupPlaceResultPlaceButtons() {
    console.log('设置关注点登记结果按钮选择功能');
    const buttonsContainer = document.getElementById('placeResultPlaceButtons');
    const hiddenInput = document.getElementById('placeResultPlaceInput');

    if (!buttonsContainer || !hiddenInput) {
      console.log('未找到按钮容器或隐藏输入框元素');
      return;
    }

    console.log('容器元素:', buttonsContainer);
    console.log('容器className:', buttonsContainer.className);

    // 检查所有父元素的显示状态
    let el = buttonsContainer;
    let level = 0;
    while (el && level < 10) {
      const styles = window.getComputedStyle(el);
      console.log(`层级${level} - ${el.tagName}#${el.id || ''}.${el.className || ''} display:${styles.display} visibility:${styles.visibility} height:${styles.height}`);
      el = el.parentElement;
      level++;
    }

    // 强制设置容器可见
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.flexWrap = 'wrap';
    buttonsContainer.style.gap = '8px';
    buttonsContainer.style.padding = '8px';
    buttonsContainer.style.border = '1px solid #ddd';
    buttonsContainer.style.background = '#f8f9fa';
    buttonsContainer.style.minHeight = '50px';
    buttonsContainer.style.height = 'auto';
    buttonsContainer.style.maxHeight = '200px';
    buttonsContainer.style.overflowY = 'auto';

    // 清空容器
    buttonsContainer.innerHTML = '';

    // 获取关注点数据并渲染按钮
    fetchPlaceResultsPlaces()
      .then(places => {
        console.log('获取到关注点数据，数量:', places.length);
        console.log('数据样本:', places.slice(0, 2));

        if (!places || places.length === 0) {
          buttonsContainer.innerHTML = '<p style="color: #999; font-size: 14px;">暂无关注点数据</p>';
          return;
        }

        // 渲染按钮
        const html = places.map(place =>
          `<button type="button" class="place-selection-btn" data-id="${place.id}" data-name="${place.name}" style="display:inline-block!important;padding:6px 12px;border:2px solid #ddd;background:#fff;color:#333;border-radius:20px;cursor:pointer;font-size:13px;margin:4px;">${place.name}</button>`
        ).join('');

        console.log('准备渲染HTML，长度:', html.length);

        // 重新获取容器并设置
        const container = document.getElementById('placeResultPlaceButtons');
        if (container) {
          container.innerHTML = html;
          console.log('渲染完成，容器innerHTML长度:', container.innerHTML.length);

          // 绑定按钮点击事件
          const buttons = container.querySelectorAll('.place-selection-btn');
          console.log('查找到的按钮数量:', buttons.length);

          buttons.forEach(btn => {
            btn.addEventListener('click', function() {
              console.log('按钮被点击:', this.dataset.name);
              // 移除其他按钮的选中状态
              container.querySelectorAll('.place-selection-btn').forEach(b => b.classList.remove('selected'));
              // 添加当前按钮的选中状态
              this.classList.add('selected');
              // 重新获取隐藏输入框（因为表单可能被克隆替换）
              const input = document.getElementById('placeResultPlaceInput');
              if (input) {
                input.value = this.dataset.name;
                input.dataset.placeId = this.dataset.id;
                console.log('选中关注点:', this.dataset.name, 'ID:', this.dataset.id);
                console.log('设置后 input.value:', input.value, 'input.dataset.placeId:', input.dataset.placeId);
              } else {
                console.error('无法找到隐藏输入框！');
              }
            });
          });

          console.log('关注点按钮渲染完成，共', buttons.length, '个按钮');
        } else {
          console.error('无法找到容器元素！');
        }
      })
      .catch(error => {
        console.error('获取关注点列表失败:', error);
        buttonsContainer.innerHTML = '<p style="color: #e74c3c; font-size: 14px;">加载关注点失败</p>';
      });
  }

  // 设置查询关注点登记结果关注点输入自动完成
  function setupQueryPlaceResultPlaceAutocomplete() {
    const input = document.getElementById('queryPlaceResultPlace');
    const suggest = document.getElementById('queryPlaceResultPlaceSuggest');
    
    if (!input || !suggest) return;
    
    // 移除之前的事件监听器，避免重复绑定
    const newInput = input.cloneNode(true);
    newInput.id = 'queryPlaceResultPlace'; // 确保ID正确
    input.parentNode.replaceChild(newInput, input);
    
    const newSuggest = suggest.cloneNode(true);
    newSuggest.id = 'queryPlaceResultPlaceSuggest'; // 确保ID正确
    suggest.parentNode.replaceChild(newSuggest, suggest);
    
    let selectedIndex = -1;
    let suggestions = [];
    
    newInput.addEventListener('input', async function() {
      const value = this.value.trim();
      if (value.length === 0) {
        newSuggest.innerHTML = '';
        return;
      }
      
      try {
        const places = await fetchPlaceResultsPlaces();
        suggestions = places.filter(place => 
          place.name.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10);
        
        if (suggestions.length > 0) {
          let html = '';
          suggestions.forEach((place, index) => {
            html += `<div class="suggestion-item" data-index="${index}" data-id="${place.id}" data-name="${place.name}">${place.name}</div>`;
          });
          newSuggest.innerHTML = html;
          newSuggest.style.display = 'block';
        } else {
          newSuggest.innerHTML = '';
        }
      } catch (error) {
        console.error('获取关注点列表失败:', error);
      }
    });
    
    newInput.addEventListener('blur', function() {
      setTimeout(() => {
        newSuggest.style.display = 'none';
      }, 200);
    });
    
    newSuggest.addEventListener('click', function(e) {
      if (e.target.classList.contains('suggestion-item')) {
        const index = parseInt(e.target.dataset.index);
        const place = suggestions[index];
        newInput.value = place.name;
        newSuggest.style.display = 'none';
      }
    });
    
    newInput.addEventListener('keydown', function(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
        updateSelection(suggestions, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(suggestions, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          const place = suggestions[selectedIndex];
          newInput.value = place.name;
          newSuggest.style.display = 'none';
        }
      }
    });
    
    function updateSelection(items, index) {
      const items_elements = newSuggest.querySelectorAll('.suggestion-item');
      items_elements.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
      });
    }
  }

  // 添加关注点登记结果
  async function addPlaceResult(placeResult) {
    try {
      const response = await fetch(`${window.BACKEND_URL}/api/place_results`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(placeResult)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('添加关注点登记结果失败:', error);
      return { success: false, message: '网络错误' };
    }
  }

  // 更新关注点登记结果
  async function updatePlaceResult(id, placeResult) {
    try {
      const response = await fetch(`${window.BACKEND_URL}/api/place_results/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(placeResult)
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('更新关注点登记结果失败:', error);
      return { success: false, message: '网络错误' };
    }
  }

  // 删除关注点登记结果
  window.deletePlaceResult = async function(id) {
    if (!confirm('确定要删除这条记录吗？')) return;
    
    try {
      const response = await fetch(`${window.BACKEND_URL}/api/place_results/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        alert('删除成功');
        loadPlaceResults();
      } else {
        alert('删除失败: ' + result.message);
      }
    } catch (error) {
      console.error('删除关注点登记结果失败:', error);
      alert('删除失败: 网络错误');
    }
  };

  // 编辑关注点登记结果
  window.editPlaceResult = function(id) {
    console.log('编辑关注点登记结果，ID:', id); // 调试信息
    editingPlaceResultId = id;
    
    // 查找对应的记录
    const table = document.getElementById('placeResultsTable');
    const row = table.querySelector(`tr[data-id="${id}"]`);
    if (!row) {
      console.log('未找到对应的行'); // 调试信息
      return;
    }
    
    const cells = row.cells;
    const placeName = cells[0].textContent;
    const qishu = cells[1].textContent;
    const isCorrect = cells[2].textContent;
    
    console.log('编辑数据:', { placeName, qishu, isCorrect }); // 调试信息
    
    // 填充表单
    document.getElementById('placeResultId').value = id;
    document.getElementById('placeResultQishu').value = qishu;
    
    // 设置关注点按钮选中状态
    fetchPlaceResultsPlaces().then(places => {
      const place = places.find(p => p.name === placeName);
      if (place) {
        // 设置隐藏输入框的值
        const hiddenInput = document.getElementById('placeResultPlaceInput');
        hiddenInput.value = placeName;
        hiddenInput.dataset.placeId = place.id;
        
        // 设置按钮选中状态
        const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
        buttons.forEach(btn => {
          if (btn.dataset.id === place.id.toString()) {
            btn.classList.add('selected');
            console.log('设置关注点按钮选中:', placeName, 'ID:', place.id); // 调试信息
          } else {
            btn.classList.remove('selected');
          }
        });
      }
    });
    
    // 设置是否正确按钮状态
    const isCorrectValue = isCorrect === '正确' ? '1' : (isCorrect === '错误' ? '0' : '');
    setIsCorrectButtonValue('placeResultForm', isCorrectValue);
    
    // 显示取消按钮
    document.getElementById('cancelPlaceResultEditBtn').style.display = 'inline-block';
    
    console.log('编辑表单已填充'); // 调试信息
  };

  // 绑定关注点登记结果表单事件
  function bindPlaceResultFormEvents() {
    const form = document.getElementById('placeResultForm');
    const cancelBtn = document.getElementById('cancelPlaceResultEditBtn');
    
    if (form) {
      // 移除之前的事件监听器，避免重复绑定
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
      
      newForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const placeInput = document.getElementById('placeResultPlaceInput');
        const placeId = placeInput.dataset.placeId || placeInput.value;
        const qishu = document.getElementById('placeResultQishu').value;
        const isCorrect = document.getElementById('placeResultIsCorrect').value;

        console.log('表单提交 - placeId:', placeId, 'qishu:', qishu, 'isCorrect:', isCorrect);
        console.log('placeInput.dataset.placeId:', placeInput.dataset.placeId);
        console.log('placeInput.value:', placeInput.value);

        if (!placeId || !qishu) {
          alert('请填写完整信息（关注点ID: ' + placeId + ', 期数: ' + qishu + '）');
          return;
        }
        
        const placeResult = {
          place_id: parseInt(placeId),
          qishu: qishu,
          is_correct: isCorrect === '' ? null : parseInt(isCorrect)
        };
        
        let result;
        if (editingPlaceResultId) {
          result = await updatePlaceResult(editingPlaceResultId, placeResult);
        } else {
          result = await addPlaceResult(placeResult);
        }
        
        if (result.success) {
          alert(editingPlaceResultId ? '更新成功' : '添加成功');
          newForm.reset();
          editingPlaceResultId = null;
          document.getElementById('cancelPlaceResultEditBtn').style.display = 'none';
          // 重置按钮状态
          resetIsCorrectButtons('placeResultForm');
          // 清除关注点按钮选中状态
          const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
          buttons.forEach(btn => btn.classList.remove('selected'));
          // 清空隐藏输入框
          const hiddenInput = document.getElementById('placeResultPlaceInput');
          hiddenInput.value = '';
          hiddenInput.dataset.placeId = '';
          loadPlaceResults();
        } else {
          alert((editingPlaceResultId ? '更新' : '添加') + '失败: ' + result.message);
        }
      });
    }
    
    if (cancelBtn) {
      // 移除之前的事件监听器
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      newCancelBtn.addEventListener('click', function() {
        document.getElementById('placeResultForm').reset();
        editingPlaceResultId = null;
        this.style.display = 'none';
        // 重置按钮状态
        resetIsCorrectButtons('placeResultForm');
        // 清除关注点按钮选中状态
        const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        // 清空隐藏输入框
        const hiddenInput = document.getElementById('placeResultPlaceInput');
        hiddenInput.value = '';
        hiddenInput.dataset.placeId = '';
      });
    }
  }
  // 绑定是否正确按钮事件
  function bindIsCorrectButtons() {
    console.log('开始绑定是否正确按钮事件'); // 调试信息
    
    // 表单中的是否正确按钮
    const formButtons = document.querySelectorAll('#placeResultForm .is-correct-btn');
    console.log('找到表单按钮数量:', formButtons.length); // 调试信息
    formButtons.forEach(btn => {
      // 移除之前的事件监听器
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', function() {
        const value = this.dataset.value;
        const hiddenInput = document.getElementById('placeResultIsCorrect');
        hiddenInput.value = value;
        console.log('表单按钮点击，设置值:', value); // 调试信息
        
        // 更新按钮状态
        document.querySelectorAll('#placeResultForm .is-correct-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
    
    // 查询表单中的是否正确按钮
    const queryButtons = document.querySelectorAll('#placeResultsQueryForm .is-correct-btn');
    console.log('找到查询按钮数量:', queryButtons.length); // 调试信息
    queryButtons.forEach(btn => {
      // 移除之前的事件监听器
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', function() {
        const value = this.dataset.value;
        const hiddenInput = document.getElementById('queryPlaceResultIsCorrect');
        hiddenInput.value = value;
        console.log('查询按钮点击，设置值:', value); // 调试信息
        console.log('按钮元素:', this); // 调试信息
        console.log('按钮dataset:', this.dataset); // 调试信息
        
        // 更新按钮状态
        document.querySelectorAll('#placeResultsQueryForm .is-correct-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
      });
    });
    
    // 测试按钮点击
    console.log('测试按钮点击事件...'); // 调试信息
    queryButtons.forEach((btn, index) => {
      console.log(`按钮${index + 1}:`, btn.textContent, 'data-value:', btn.dataset.value); // 调试信息
    });
  }

  // 重置是否正确按钮状态
  function resetIsCorrectButtons(formId) {
    const buttons = document.querySelectorAll(`#${formId} .is-correct-btn`);
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // 默认选中第一个按钮（未判断/全部）
    if (buttons.length > 0) {
      buttons[0].classList.add('active');
    }
  }

  // 设置是否正确按钮的初始值
  function setIsCorrectButtonValue(formId, value) {
    const buttons = document.querySelectorAll(`#${formId} .is-correct-btn`);
    const hiddenInput = document.getElementById(formId === 'placeResultForm' ? 'placeResultIsCorrect' : 'queryPlaceResultIsCorrect');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    hiddenInput.value = value;
    
    // 找到对应的按钮并激活
    const targetBtn = Array.from(buttons).find(btn => btn.dataset.value === value);
    if (targetBtn) {
      targetBtn.classList.add('active');
    } else if (buttons.length > 0) {
      // 如果没找到，默认选中第一个
      buttons[0].classList.add('active');
    }
  }

  // 初始化关注点登记结果功能
  function initPlaceResults() {
    console.log('初始化关注点登记结果功能'); // 调试信息
    
    setupPlaceResultPlaceButtons();
    setupQueryPlaceResultPlaceAutocomplete();
    bindPlaceResultFormEvents();
    bindPlaceResultsPaginationEvents();
    bindPlaceResultsQueryEvents();
    bindIsCorrectButtons();
    
    // 设置按钮初始状态
    resetIsCorrectButtons('placeResultForm');
    resetIsCorrectButtons('placeResultsQueryForm');
    
    loadPlaceResults();
  }



  // 页面加载完成后初始化（仅在页面切换时调用）
}
// ... existing code ...

// 关注点分析相关功能
{
  let placeAnalysisData = [];

  // 加载关注点分析数据
  async function loadPlaceAnalysis() {
    try {
      console.log('开始加载关注点分析数据...'); // 调试信息
      
      const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
      const result = await response.json();
      
      console.log('关注点分析API响应:', result); // 调试信息
      
      if (result.success) {
        placeAnalysisData = result.data;
        renderPlaceAnalysis(placeAnalysisData);
      } else {
        console.error('加载关注点分析失败:', result.message);
        alert('加载关注点分析失败: ' + result.message);
      }
    } catch (error) {
      console.error('加载关注点分析失败:', error);
      alert('加载关注点分析失败: 网络错误');
    }
  }

  // 渲染关注点分析表格
  function renderPlaceAnalysis(places) {
    const container = document.getElementById('placeAnalysisResult');
    if (!container) return;
    
    if (!places || places.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无关注点数据</div>';
      return;
    }
    
    let html = '<div class="place-analysis-container">';
    
    places.forEach(place => {
      const totalRecords = place.total_records || 0;
      const correctCount = place.correct_count || 0;
      const wrongCount = place.wrong_count || 0;
      const unjudgedCount = place.unjudged_count || 0;
      const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';
      
      const currentMiss = place.current_miss || 0;
      const maxMiss = place.max_miss || 0;
      const currentStreak = place.current_streak || 0;
      const maxStreak = place.max_streak || 0;
      
      html += `
        <div class="place-analysis-card">
          <div class="place-analysis-header">
            <h3 class="place-name">${place.place_name}</h3>
            <span class="place-description">${place.place_description || ''}</span>
          </div>
          
          <div class="place-analysis-stats">
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">总记录数：</span>
                <span class="stat-value">${totalRecords}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正确记录：</span>
                <span class="stat-value correct">${correctCount}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">错误记录：</span>
                <span class="stat-value wrong">${wrongCount}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">未判断：</span>
                <span class="stat-value unjudged">${unjudgedCount}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">正确率：</span>
                <span class="stat-value">${correctRate}%</span>
              </div>
            </div>
            
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">当前遗漏：</span>
                <span class="stat-value ${currentMiss > 0 ? 'miss' : ''}">${currentMiss}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">历史最大遗漏：</span>
                <span class="stat-value">${maxMiss}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">当前连中：</span>
                <span class="stat-value ${currentStreak > 0 ? 'streak' : ''}">${currentStreak}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">历史最大连中：</span>
                <span class="stat-value">${maxStreak}</span>
              </div>
            </div>
            
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-label">首次记录：</span>
                <span class="stat-value">${place.first_record ? place.first_record.replace('T', ' ').slice(0, 19) : '-'}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">最后记录：</span>
                <span class="stat-value">${place.last_record ? place.last_record.replace('T', ' ').slice(0, 19) : '-'}</span>
              </div>
            </div>
          </div>
          
          <div class="place-analysis-details">
            <h4>详细记录</h4>
            <div class="records-table-container">
              ${renderPlaceRecordsTable(place.records || [])}
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }

  // 渲染关注点记录表格
  function renderPlaceRecordsTable(records) {
    if (!records || records.length === 0) {
      return '<div style="text-align:center;color:#888;padding:10px;">暂无记录</div>';
    }
    
    let html = '<table class="place-records-table">';
    html += '<thead><tr><th>期数</th><th>是否正确</th><th>创建时间</th></tr></thead><tbody>';
    
    records.forEach(record => {
      const isCorrectText = record.is_correct === 1 ? '正确' : (record.is_correct === 0 ? '错误' : '未判断');
      const isCorrectClass = record.is_correct === 1 ? 'correct' : (record.is_correct === 0 ? 'wrong' : 'unjudged');
      
      html += `
        <tr>
          <td>${record.qishu}</td>
          <td class="${isCorrectClass}">${isCorrectText}</td>
          <td>${record.created_at ? record.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

  // 导出关注点分析数据
  function exportPlaceAnalysis() {
    if (!placeAnalysisData || placeAnalysisData.length === 0) {
      alert('暂无数据可导出');
      return;
    }
    
    const csvRows = [
      ['关注点名称', '描述', '总记录数', '正确记录', '错误记录', '未判断', '正确率', '当前遗漏', '历史最大遗漏', '当前连中', '历史最大连中', '首次记录', '最后记录']
    ];
    
    placeAnalysisData.forEach(place => {
      const totalRecords = place.total_records || 0;
      const correctCount = place.correct_count || 0;
      const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';
      
      csvRows.push([
        place.place_name,
        place.place_description || '',
        totalRecords,
        correctCount,
        place.wrong_count || 0,
        place.unjudged_count || 0,
        correctRate + '%',
        place.current_miss || 0,
        place.max_miss || 0,
        place.current_streak || 0,
        place.max_streak || 0,
        place.first_record ? place.first_record.replace('T', ' ').slice(0, 19) : '',
        place.last_record ? place.last_record.replace('T', ' ').slice(0, 19) : ''
      ]);
    });
    
    downloadCSV(csvRows, '关注点分析报告.csv');
  }

  // 绑定关注点分析事件
  function bindPlaceAnalysisEvents() {
    const refreshBtn = document.getElementById('refreshPlaceAnalysisBtn');
    const exportBtn = document.getElementById('exportPlaceAnalysisBtn');
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadPlaceAnalysis);
    }
    
    if (exportBtn) {
      exportBtn.addEventListener('click', exportPlaceAnalysis);
    }
  }

  // 加载关注点选择按钮
  async function loadPlaceSelectionButtons() {
    try {
      console.log('加载关注点选择按钮...'); // 调试信息
      
      const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
      const result = await response.json();
      
      if (result.success) {
        renderPlaceSelectionButtons(result.data);
      } else {
        console.error('加载关注点选择按钮失败:', result.message);
      }
    } catch (error) {
      console.error('加载关注点选择按钮失败:', error);
    }
  }

  // 渲染关注点选择按钮
  function renderPlaceSelectionButtons(places) {
    const container = document.getElementById('placeButtonsContainer');
    if (!container) return;
    
    if (!places || places.length === 0) {
      container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无关注点数据</div>';
      return;
    }
    
    let html = '';
    places.forEach(place => {
      const currentMiss = place.current_miss || 0;
      const currentStreak = place.current_streak || 0;
      
      // 确定状态显示
      let statusText = '';
      let statusClass = 'normal';
      
      if (currentMiss > 0) {
        statusText = `当前遗漏${currentMiss}期`;
        statusClass = 'miss';
      } else if (currentStreak > 0) {
        statusText = `当前连中${currentStreak}期`;
        statusClass = 'streak';
      } else {
        statusText = '正常';
        statusClass = 'normal';
      }
      
      html += `
        <div class="place-button" data-place-id="${place.place_id}" data-place-name="${place.place_name}">
          <div class="place-button-name">${place.place_name}</div>
          <div class="place-button-status ${statusClass}">${statusText}</div>
        </div>
      `;
    });
    
    container.innerHTML = html;
    
    // 绑定按钮点击事件
    bindPlaceButtonEvents();
  }

  // 绑定关注点按钮事件
  function bindPlaceButtonEvents() {
    const buttons = document.querySelectorAll('.place-button');
    buttons.forEach(button => {
      button.addEventListener('click', function() {
        const placeId = this.dataset.placeId;
        const placeName = this.dataset.placeName;
        
        console.log('点击关注点按钮:', placeId, placeName); // 调试信息
        
        // 移除其他按钮的选中状态
        buttons.forEach(btn => btn.classList.remove('selected'));
        
        // 添加当前按钮的选中状态
        this.classList.add('selected');
        
        // 显示关注点详情
        showPlaceDetails(placeId, placeName);
      });
    });
  }

  // 显示关注点详情
  async function showPlaceDetails(placeId, placeName) {
    try {
      console.log('显示关注点详情:', placeId, placeName); // 调试信息
      
      const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
      const result = await response.json();
      
      if (result.success) {
        const place = result.data.find(p => p.place_id == placeId);
        if (place) {
          renderPlaceDetails(place);
        }
      }
    } catch (error) {
      console.error('显示关注点详情失败:', error);
    }
  }

  // 渲染关注点详情
  function renderPlaceDetails(place) {
    const container = document.getElementById('placeDetailsContent');
    const detailsDiv = document.getElementById('selectedPlaceDetails');
    
    if (!container || !detailsDiv) return;
    
    const totalRecords = place.total_records || 0;
    const correctCount = place.correct_count || 0;
    const wrongCount = place.wrong_count || 0;
    const unjudgedCount = place.unjudged_count || 0;
    const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';
    
    const currentMiss = place.current_miss || 0;
    const maxMiss = place.max_miss || 0;
    const currentStreak = place.current_streak || 0;
    const maxStreak = place.max_streak || 0;
    
    let html = `
      <div class="place-details-header">
        <div class="place-details-name">${place.place_name}</div>
        <div class="place-details-description">${place.place_description || ''}</div>
      </div>
      
      <div class="place-details-stats">
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">总记录数</div>
          <div class="place-detail-stat-value">${totalRecords}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">正确记录</div>
          <div class="place-detail-stat-value correct">${correctCount}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">错误记录</div>
          <div class="place-detail-stat-value wrong">${wrongCount}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">正确率</div>
          <div class="place-detail-stat-value">${correctRate}%</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">当前遗漏</div>
          <div class="place-detail-stat-value ${currentMiss > 0 ? 'miss' : ''}">${currentMiss}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">历史最大遗漏</div>
          <div class="place-detail-stat-value">${maxMiss}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">当前连中</div>
          <div class="place-detail-stat-value ${currentStreak > 0 ? 'streak' : ''}">${currentStreak}</div>
        </div>
        <div class="place-detail-stat">
          <div class="place-detail-stat-label">历史最大连中</div>
          <div class="place-detail-stat-value">${maxStreak}</div>
        </div>
      </div>
      
      <div class="place-details-records">
        <h4 style="color:#2980d9;margin-bottom:10px;">详细记录</h4>
        ${renderPlaceDetailsRecordsTable(place.records || [])}
      </div>
    `;
    
    container.innerHTML = html;
    detailsDiv.style.display = 'block';
  }

  // 渲染关注点详情记录表格
  function renderPlaceDetailsRecordsTable(records) {
    if (!records || records.length === 0) {
      return '<div style="text-align:center;color:#888;padding:10px;">暂无记录</div>';
    }
    
    let html = '<table class="place-details-table">';
    html += '<thead><tr><th>期数</th><th>是否正确</th><th>创建时间</th></tr></thead><tbody>';
    
    records.forEach(record => {
      const isCorrectText = record.is_correct === 1 ? '正确' : (record.is_correct === 0 ? '错误' : '未判断');
      const isCorrectClass = record.is_correct === 1 ? 'correct' : (record.is_correct === 0 ? 'wrong' : 'unjudged');
      
      html += `
        <tr>
          <td>${record.qishu}</td>
          <td class="${isCorrectClass}">${isCorrectText}</td>
          <td>${record.created_at ? record.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
        </tr>
      `;
    });
    
    html += '</tbody></table>';
    return html;
  }

  // 初始化关注点分析功能
  function initPlaceAnalysis() {
    console.log('初始化关注点分析功能'); // 调试信息
    bindPlaceAnalysisEvents();
    
    // 加载关注点选择按钮
    loadPlaceSelectionButtons();
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPlaceAnalysis);
  } else {
    setTimeout(initPlaceAnalysis, 100);
  }
}
// 投注点报表功能
(function() {
  let allPlaces = [];
  let selectedPlaceId = null;
  let currentReportData = null;

  // 初始化投注点报表
  function initBetReport() {
    loadAllPlaces();
    bindBetReportEvents();
    setupBetReportPlaceAutocomplete();
  }

  // 加载所有关注点
  async function loadAllPlaces() {
    try {
      const res = await fetch(window.BACKEND_URL + '/api/places');
      allPlaces = await res.json();
    } catch (error) {
      console.error('加载关注点失败:', error);
    }
  }

  // 绑定投注点报表事件
  function bindBetReportEvents() {
    // 生成报表按钮
    const queryBetReportBtn = document.getElementById('queryBetReportBtn');
    if (queryBetReportBtn) {
      queryBetReportBtn.onclick = generateBetReport;
    }

    // 重置按钮
    const resetBetReportBtn = document.getElementById('resetBetReportBtn');
    if (resetBetReportBtn) {
      resetBetReportBtn.onclick = resetBetReport;
    }

    // 导出报表按钮
    const exportBetReportBtn = document.getElementById('exportBetReportBtn');
    if (exportBetReportBtn) {
      exportBetReportBtn.onclick = exportBetReport;
    }

    // 调试数据按钮
    const debugBetsBtn = document.getElementById('debugBetsBtn');
    if (debugBetsBtn) {
      debugBetsBtn.onclick = debugBets;
    }

    // 关注点筛选按钮
    const placeFilterBtn = document.getElementById('placeFilterBtn');
    if (placeFilterBtn) {
      placeFilterBtn.onclick = filterPlaceStats;
    }

    // 关注点重置筛选按钮
    const placeResetFilterBtn = document.getElementById('placeResetFilterBtn');
    if (placeResetFilterBtn) {
      placeResetFilterBtn.onclick = resetPlaceFilter;
    }

    // 关注点排序选择
    const placeSortSelect = document.getElementById('placeSortSelect');
    if (placeSortSelect) {
      placeSortSelect.onchange = filterPlaceStats;
    }
  }

  // 设置关注点自动完成
  function setupBetReportPlaceAutocomplete() {
    const placeInput = document.getElementById('betReportPlace');
    const suggestDiv = document.getElementById('betReportPlaceSuggest');
    
    if (!placeInput || !suggestDiv) return;

    let selectedIndex = -1;
    let filteredPlaces = [];

    placeInput.addEventListener('input', function() {
      const value = this.value.trim();
      if (value === '') {
        suggestDiv.innerHTML = '';
        suggestDiv.style.display = 'none';
        selectedPlaceId = null;
        return;
      }

      filteredPlaces = allPlaces.filter(place => 
        place.name.toLowerCase().includes(value.toLowerCase())
      );

      if (filteredPlaces.length === 0) {
        suggestDiv.innerHTML = '';
        suggestDiv.style.display = 'none';
        return;
      }

      suggestDiv.innerHTML = filteredPlaces.map((place, index) => 
        `<div class="autocomplete-suggestion-item" data-index="${index}" data-id="${place.id}">${place.name}</div>`
      ).join('');
      suggestDiv.style.display = 'block';
      selectedIndex = -1;
    });

    placeInput.addEventListener('keydown', function(e) {
      const items = suggestDiv.querySelectorAll('.autocomplete-suggestion-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          selectPlace(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        suggestDiv.style.display = 'none';
        selectedIndex = -1;
      }
    });

    suggestDiv.addEventListener('click', function(e) {
      if (e.target.classList.contains('autocomplete-suggestion-item')) {
        selectPlace(e.target);
      }
    });

    document.addEventListener('click', function(e) {
      if (!placeInput.contains(e.target) && !suggestDiv.contains(e.target)) {
        suggestDiv.style.display = 'none';
        selectedIndex = -1;
      }
    });

    function updateSelection(items, index) {
      items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
      });
    }

    function selectPlace(item) {
      const placeId = parseInt(item.dataset.id);
      const placeName = item.textContent;
      
      placeInput.value = placeName;
      selectedPlaceId = placeId;
      suggestDiv.style.display = 'none';
      selectedIndex = -1;
    }
  }

  // 生成投注点报表
  async function generateBetReport() {
    const startDate = document.getElementById('betReportStartDate').value;
    const endDate = document.getElementById('betReportEndDate').value;
    const placeName = document.getElementById('betReportPlace').value.trim();

    // 构建查询参数
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (selectedPlaceId) params.append('place_id', selectedPlaceId);

    try {
      const res = await fetch(`${window.BACKEND_URL}/api/bet_report?${params.toString()}`);
      const result = await res.json();
      
      console.log('投注点报表API响应:', result); // 调试信息
      
      if (result.success) {
        currentReportData = result.data;
        console.log('投注点报表数据:', result.data); // 调试信息
        console.log('总体统计:', result.data.overall_stats); // 调试信息
        renderBetReport(result.data);
      } else {
        alert('生成报表失败: ' + result.message);
      }
    } catch (error) {
      console.error('生成报表失败:', error);
      alert('生成报表失败，请检查网络连接');
    }
  }

  // 渲染投注点报表
  function renderBetReport(data) {
    // 渲染总体统计
    renderOverallStats(data.overall_stats);
    
    // 渲染关注点统计
    renderPlaceStats(data.place_stats);
    
    // 渲染时间统计
    renderTimeStats(data.time_stats);
    
    // 渲染输赢分布
    renderDistributionStats(data.profit_loss_distribution);
    
    // 显示所有统计区域
    document.getElementById('betReportOverallStats').style.display = 'block';
    document.getElementById('betReportPlaceStats').style.display = 'block';
    document.getElementById('betReportTimeStats').style.display = 'block';
    document.getElementById('betReportDistribution').style.display = 'block';
    document.getElementById('betReportCharts').style.display = 'block';
  }

  // 渲染总体统计
  function renderOverallStats(stats) {
    console.log('渲染总体统计，数据:', stats); // 调试信息
    
    if (!stats) {
      console.log('stats为空，返回'); // 调试信息
      return;
    }

    console.log('total_bets:', stats.total_bets); // 调试信息
    console.log('total_bet_amount:', stats.total_bet_amount); // 调试信息
    console.log('total_win_amount:', stats.total_win_amount); // 调试信息
    console.log('total_profit_loss:', stats.total_profit_loss); // 调试信息

    document.getElementById('totalBetCount').textContent = stats.total_bets || 0;
    document.getElementById('totalBetAmount').textContent = formatCurrency(stats.total_bet_amount || 0);
    document.getElementById('totalWinAmount').textContent = formatCurrency(stats.total_win_amount || 0);
    document.getElementById('totalProfitLoss').textContent = formatCurrency(stats.total_profit_loss || 0);
    document.getElementById('avgBetAmount').textContent = formatCurrency(stats.avg_bet_amount || 0);
    document.getElementById('avgWinAmount').textContent = formatCurrency(stats.avg_win_amount || 0);
    document.getElementById('avgProfitLoss').textContent = formatCurrency(stats.avg_profit_loss || 0);
    document.getElementById('correctCount').textContent = stats.correct_count || 0;
    document.getElementById('wrongCount').textContent = stats.wrong_count || 0;
    document.getElementById('unjudgedCount').textContent = stats.unjudged_count || 0;

    // 设置输赢金额的颜色
    const totalProfitLossEl = document.getElementById('totalProfitLoss');
    const avgProfitLossEl = document.getElementById('avgProfitLoss');
    
    totalProfitLossEl.className = 'stats-value ' + getProfitLossClass(stats.total_profit_loss);
    avgProfitLossEl.className = 'stats-value ' + getProfitLossClass(stats.avg_profit_loss);
  }

  // 渲染关注点统计
  function renderPlaceStats(placeStats) {
    const tbody = document.querySelector('#betReportPlaceTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!placeStats || placeStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    placeStats.forEach(place => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${place.place_name || '未知'}</td>
        <td>${place.bet_count || 0}</td>
        <td>${formatCurrency(place.total_bet_amount || 0)}</td>
        <td>${formatCurrency(place.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(place.total_profit_loss)}">${formatCurrency(place.total_profit_loss || 0)}</td>
        <td>${formatCurrency(place.avg_bet_amount || 0)}</td>
        <td>${formatCurrency(place.avg_win_amount || 0)}</td>
        <td class="${getProfitLossClass(place.avg_profit_loss)}">${formatCurrency(place.avg_profit_loss || 0)}</td>
        <td>${place.correct_count || 0}</td>
        <td>${place.wrong_count || 0}</td>
        <td>${place.unjudged_count || 0}</td>
        <td>${formatDateTime(place.first_bet)}</td>
        <td>${formatDateTime(place.last_bet)}</td>
        <td>
          <button class="place-action-btn view" onclick="viewPlaceDetail(${place.place_id}, '${place.place_name}')">查看</button>
          <button class="place-action-btn detail" onclick="queryPlaceBets(${place.place_id}, '${place.place_name}')">详情</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 渲染时间统计
  function renderTimeStats(timeStats) {
    const tbody = document.querySelector('#betReportTimeTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!timeStats || timeStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    timeStats.forEach(month => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${month.month}</td>
        <td>${month.bet_count || 0}</td>
        <td>${formatCurrency(month.total_bet_amount || 0)}</td>
        <td>${formatCurrency(month.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(month.total_profit_loss)}">${formatCurrency(month.total_profit_loss || 0)}</td>
        <td>${formatCurrency(month.avg_bet_amount || 0)}</td>
        <td>${formatCurrency(month.avg_win_amount || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 渲染输赢分布统计
  function renderDistributionStats(distribution) {
    const tbody = document.querySelector('#betReportDistributionTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    if (!distribution || distribution.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    distribution.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.profit_loss_range}</td>
        <td>${item.count || 0}</td>
        <td>${formatCurrency(item.total_bet_amount || 0)}</td>
        <td>${formatCurrency(item.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(item.total_profit_loss)}">${formatCurrency(item.total_profit_loss || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // 重置投注点报表
  function resetBetReport() {
    document.getElementById('betReportStartDate').value = '';
    document.getElementById('betReportEndDate').value = '';
    document.getElementById('betReportPlace').value = '';
    selectedPlaceId = null;
    
    // 隐藏所有统计区域
    document.getElementById('betReportOverallStats').style.display = 'none';
    document.getElementById('betReportPlaceStats').style.display = 'none';
    document.getElementById('betReportTimeStats').style.display = 'none';
    document.getElementById('betReportDistribution').style.display = 'none';
    document.getElementById('betReportCharts').style.display = 'none';
    
    currentReportData = null;
  }

  // 关注点筛选功能
  function filterPlaceStats() {
    if (!currentReportData || !currentReportData.place_stats) return;
    
    const filterInput = document.getElementById('placeFilterInput').value.toLowerCase();
    const sortSelect = document.getElementById('placeSortSelect').value;
    
    let filteredData = [...currentReportData.place_stats];
    
    // 按名称筛选
    if (filterInput) {
      filteredData = filteredData.filter(place => 
        place.place_name && place.place_name.toLowerCase().includes(filterInput)
      );
    }
    
    // 排序
    filteredData.sort((a, b) => {
      let aValue = a[sortSelect] || 0;
      let bValue = b[sortSelect] || 0;
      
      // 如果是字符串，按字母顺序排序
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }
      
      // 如果是数字，按数值排序（降序）
      return bValue - aValue;
    });
    
    renderPlaceStats(filteredData);
  }

  // 重置关注点筛选
  function resetPlaceFilter() {
    document.getElementById('placeFilterInput').value = '';
    document.getElementById('placeSortSelect').value = 'total_bet_amount';
    
    if (currentReportData && currentReportData.place_stats) {
      renderPlaceStats(currentReportData.place_stats);
    }
  }

  // 查看关注点详情
  window.viewPlaceDetail = function(placeId, placeName) {
    // 跳转到关注点分析页面
    const analysisBtn = document.getElementById('menuRegisterFocusAnalysisBtn');
    if (analysisBtn) {
      analysisBtn.click();
      
      // 延迟一下，确保页面切换完成
      setTimeout(() => {
        // 查找并点击对应的关注点按钮
        const placeButton = document.querySelector(`.place-button[data-place-id="${placeId}"]`);
        if (placeButton) {
          placeButton.click();
        }
      }, 100);
    }
  };

  // 查询关注点投注详情
  window.queryPlaceBets = function(placeId, placeName) {
    // 跳转到投注登记点页面
    const betBtn = document.getElementById('menuRegisterBetBtn');
    if (betBtn) {
      betBtn.click();
      
      // 延迟一下，确保页面切换完成
      setTimeout(() => {
        // 设置查询条件
        const queryPlaceInput = document.getElementById('queryPlace');
        if (queryPlaceInput) {
          queryPlaceInput.value = placeName;
          
          // 触发查询
          const queryBtn = document.getElementById('queryBetsBtn');
          if (queryBtn) {
            queryBtn.click();
          }
        }
      }, 100);
    }
  };

  // 导出投注点报表
  function exportBetReport() {
    if (!currentReportData) {
      alert('请先生成报表');
      return;
    }

    const data = currentReportData;
    let csvContent = '投注点报表\n\n';

    // 总体统计
    csvContent += '总体统计\n';
    csvContent += '总投注次数,总投注金额,总赢取金额,总输赢金额,平均投注金额,平均赢取金额,平均输赢金额,正确次数,错误次数,未判断次数\n';
    csvContent += `${data.overall_stats.total_bets || 0},${data.overall_stats.total_bet_amount || 0},${data.overall_stats.total_win_amount || 0},${data.overall_stats.total_profit_loss || 0},${data.overall_stats.avg_bet_amount || 0},${data.overall_stats.avg_win_amount || 0},${data.overall_stats.avg_profit_loss || 0},${data.overall_stats.correct_count || 0},${data.overall_stats.wrong_count || 0},${data.overall_stats.unjudged_count || 0}\n\n`;

    // 关注点统计
    csvContent += '关注点统计\n';
    csvContent += '关注点名称,投注次数,投注总额,赢取总额,输赢总额,平均投注,平均赢取,平均输赢,正确次数,错误次数,未判断次数,首次投注,最后投注\n';
    if (data.place_stats && data.place_stats.length > 0) {
      data.place_stats.forEach(place => {
        csvContent += `${place.place_name || '未知'},${place.bet_count || 0},${place.total_bet_amount || 0},${place.total_win_amount || 0},${place.total_profit_loss || 0},${place.avg_bet_amount || 0},${place.avg_win_amount || 0},${place.avg_profit_loss || 0},${place.correct_count || 0},${place.wrong_count || 0},${place.unjudged_count || 0},${place.first_bet || ''},${place.last_bet || ''}\n`;
      });
    }
    csvContent += '\n';

    // 时间统计
    csvContent += '月度统计\n';
    csvContent += '月份,投注次数,投注总额,赢取总额,输赢总额,平均投注,平均赢取,平均输赢\n';
    if (data.time_stats && data.time_stats.length > 0) {
      data.time_stats.forEach(month => {
        csvContent += `${month.month},${month.bet_count || 0},${month.total_bet_amount || 0},${month.total_win_amount || 0},${month.total_profit_loss || 0},${month.avg_bet_amount || 0},${month.avg_win_amount || 0},${month.avg_profit_loss || 0}\n`;
      });
    }
    csvContent += '\n';

    // 输赢分布
    csvContent += '输赢分布\n';
    csvContent += '输赢范围,次数,投注总额,赢取总额,输赢总额\n';
    if (data.profit_loss_distribution && data.profit_loss_distribution.length > 0) {
      data.profit_loss_distribution.forEach(item => {
        csvContent += `${item.profit_loss_range},${item.count || 0},${item.total_bet_amount || 0},${item.total_win_amount || 0},${item.total_profit_loss || 0}\n`;
      });
    }

    // 下载CSV文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `投注点报表_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 工具函数
  function formatCurrency(amount) {
    console.log('formatCurrency输入:', amount, '类型:', typeof amount); // 调试信息
    if (amount === null || amount === undefined) return '¥0.00';
    const result = '¥' + parseFloat(amount).toFixed(2);
    console.log('formatCurrency输出:', result); // 调试信息
    return result;
  }
  function formatDateTime(dateTime) {
    if (!dateTime) return '';
    return dateTime.replace('T', ' ').slice(0, 19);
  }

  function getProfitLossClass(amount) {
    if (amount === null || amount === undefined) return '';
    if (amount > 0) return 'profit-positive';
    if (amount < 0) return 'profit-negative';
    return 'profit-zero';
  }

  // 当页面切换到投注点报表时初始化
  const originalBtnMap = [
    { btn: 'menuRegisterFocusBtn', page: 'registerFocusPage', title: '登记关注点' },
    { btn: 'menuRegisterBetBtn', page: 'registerBetPage', title: '投注登记点' },
    { btn: 'menuRegisterFocusResultBtn', page: 'registerFocusResultPage', title: '关注点登记结果' },
    { btn: 'menuRegisterFocusAnalysisBtn', page: 'registerFocusAnalysisPage', title: '关注点分析' },
    { btn: 'menuRegisterBetReportBtn', page: 'registerBetReportPage', title: '投注点报表' },
  ];

  // 重写投注点报表按钮的点击事件
  setTimeout(() => {
    const betReportBtn = document.getElementById('menuRegisterBetReportBtn');
    if (betReportBtn) {
      betReportBtn.onclick = function() {
        // 高亮
        originalBtnMap.forEach(i => {
          const b = document.getElementById(i.btn);
          if (b) b.classList.remove('active');
        });
        betReportBtn.classList.add('active');
        
        // 页面切换
        const allPages = [
          'collectPage', 'recordsPage', 'recommendPage', 'tensPage', 'unitsPage', 'rangePage', 'minusRangePage', 'plusMinus6Page',
          'registerFocusPage', 'registerBetPage', 'registerFocusResultPage', 'registerFocusAnalysisPage', 'registerBetReportPage',
          'eachIssuePage'
        ];
        allPages.forEach(pid => {
          const page = document.getElementById(pid);
          if (page) page.style.display = 'none';
        });
        
        const showPage = document.getElementById('registerBetReportPage');
        if (showPage) showPage.style.display = '';
        
        // 标题切换
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.innerText = '投注点报表';
        
        // 初始化投注点报表
        initBetReport();
      };
    }

    // 绑定调试按钮事件
    const debugBetsBtn = document.getElementById('debugBetsBtn');
    if (debugBetsBtn) {
      debugBetsBtn.onclick = debugBets;
    }
  }, 0);

  // 调试bets表数据
  async function debugBets() {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/debug/bets`);
      const result = await res.json();
      
      if (result.success) {
        let debugInfo = `调试信息：\n\n`;
        debugInfo += `bets表总记录数: ${result.total_count}\n\n`;
        debugInfo += `表结构:\n`;
        result.table_structure.forEach(field => {
          debugInfo += `${field.Field} - ${field.Type} - ${field.Null} - ${field.Key} - ${field.Default} - ${field.Extra}\n`;
        });
        debugInfo += `\n最近5条记录:\n`;
        result.recent_bets.forEach((bet, index) => {
          debugInfo += `${index + 1}. ID:${bet.id}, 关注点ID:${bet.place_id}, 期数:${bet.qishu}, 投注金额:${bet.bet_amount}, 赢取金额:${bet.win_amount}, 是否正确:${bet.is_correct}, 创建时间:${bet.created_at}\n`;
        });
        
        alert(debugInfo);
      } else {
        alert('调试失败: ' + result.message);
      }
    } catch (error) {
      console.error('调试失败:', error);
      alert('调试失败，请检查网络连接');
    }
  }

  // ==================== 关注号码管理功能 ====================
  
  // 初始化关注号码管理
  function initFavoriteNumbers() {
    loadFavoriteNumbers();
    bindFavoriteNumbersEvents();
  }

  // 加载关注号码列表
  async function loadFavoriteNumbers() {
    try {
      console.log('开始加载关注号码...');
      const activeBtn = document.querySelector('.position-btn.active');
      const activeLotteryBtn = document.querySelector('.lottery-btn.active');
      const position = activeBtn ? activeBtn.getAttribute('data-position') : 7;
      const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
      
      console.log(`选择的彩种: ${lotteryType}, 位置: ${position}`);
      
      const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers?position=${position}&lottery_type=${lotteryType}`);
      const result = await res.json();
      
      console.log('API响应:', result);
      
      if (result.success) {
        console.log('关注号码数据:', result.data);
        renderFavoriteNumbersTable(result.data, lotteryType, position);
      } else {
        console.error('加载关注号码失败:', result.message);
      }
    } catch (error) {
      console.error('加载关注号码失败:', error);
    }
  }
  // 渲染关注号码表格
  function renderFavoriteNumbersTable(favoriteNumbers, lotteryType, position) {
    console.log('开始渲染关注号码表格，数据:', favoriteNumbers);
    
    // 更新表格信息
    const tableInfo = document.getElementById('tableInfo');
    if (tableInfo) {
      const lotteryName = lotteryType === 'am' ? '澳门' : '香港';
      tableInfo.textContent = `当前分析：${lotteryName}彩种 - 第${position}位号码遗漏统计`;
    }
    
    const tbody = document.querySelector('#favoriteNumbersTable tbody');
    if (!tbody) {
      console.error('找不到表格tbody元素');
      return;
    }

    console.log('找到tbody元素，开始清空并渲染');
    tbody.innerHTML = '';
    
    if (!favoriteNumbers || favoriteNumbers.length === 0) {
      console.log('没有数据，显示空状态');
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">暂无数据</td></tr>';
      return;
    }
    
    favoriteNumbers.forEach((item, index) => {
      console.log(`渲染第${index + 1}条数据:`, item);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${item.name || ''}</td>
        <td>${item.numbers || ''}</td>
        <td>${item.current_miss || 0}</td>
        <td>${item.max_miss || 0}</td>
        <td>${formatDateTime(item.created_at) || ''}</td>
        <td>
          <button class="btn-edit" data-id="${item.id}">编辑</button>
          <button class="btn-delete" data-id="${item.id}">删除</button>
          <button class="btn-analyze" data-id="${item.id}">分析</button>
        </td>
      `;
      
      // 绑定按钮事件
      const editBtn = row.querySelector('.btn-edit');
      const deleteBtn = row.querySelector('.btn-delete');
      const analyzeBtn = row.querySelector('.btn-analyze');
      
      editBtn.addEventListener('click', () => editFavoriteNumber(item.id));
      deleteBtn.addEventListener('click', () => deleteFavoriteNumber(item.id));
      analyzeBtn.addEventListener('click', () => {
        const activeBtn = document.querySelector('.position-btn.active');
        const position = activeBtn ? activeBtn.getAttribute('data-position') : 7;
        analyzeFavoriteNumber(item.id, position);
      });
      
      tbody.appendChild(row);
    });
    
    console.log('渲染完成，共渲染', favoriteNumbers.length, '条数据');
  }

  // 绑定关注号码事件
  function bindFavoriteNumbersEvents() {
    const form = document.getElementById('favoriteNumbersForm');
    if (form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const id = document.getElementById('favoriteNumberId').value;
        const name = document.getElementById('favoriteNumberName').value.trim();
        const numbers = document.getElementById('favoriteNumbers').value.trim();
        
        if (!name || !numbers) {
          alert('请填写完整信息');
          return;
        }
        
        try {
          const data = { name, numbers };
          let res;
          
          if (id) {
            // 更新
            res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          } else {
            // 新增
            res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
          }
          
          const result = await res.json();
          if (result.success) {
            alert(id ? '更新成功' : '添加成功');
            resetFavoriteNumberForm();
            loadFavoriteNumbers();
          } else {
            alert('操作失败: ' + result.message);
          }
        } catch (error) {
          console.error('操作失败:', error);
          alert('操作失败，请检查网络连接');
        }
      });
    }

    // 取消编辑按钮
    const cancelBtn = document.getElementById('cancelFavoriteNumberBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', resetFavoriteNumberForm);
    }

    // 刷新按钮
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', loadFavoriteNumbers);
    }

    // 彩种按钮点击事件
    const lotteryBtns = document.querySelectorAll('.lottery-btn');
    lotteryBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // 移除所有按钮的active类
        lotteryBtns.forEach(b => b.classList.remove('active'));
        // 给当前按钮添加active类
        this.classList.add('active');
        // 重新加载数据
        loadFavoriteNumbers();
      });
    });

    // 位置按钮点击事件
    const positionBtns = document.querySelectorAll('.position-btn');
    positionBtns.forEach(btn => {
      btn.addEventListener('click', function() {
        // 移除所有按钮的active类
        positionBtns.forEach(b => b.classList.remove('active'));
        // 给当前按钮添加active类
        this.classList.add('active');
        // 重新加载数据
        loadFavoriteNumbers();
      });
    });
  }

  // 重置关注号码表单
  function resetFavoriteNumberForm() {
    document.getElementById('favoriteNumberId').value = '';
    document.getElementById('favoriteNumberName').value = '';
    document.getElementById('favoriteNumbers').value = '';
    document.getElementById('cancelFavoriteNumberBtn').style.display = 'none';
  }

  // 编辑关注号码
  window.editFavoriteNumber = async function(id) {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers`);
      const result = await res.json();
      
      if (result.success) {
        const item = result.data.find(item => item.id == id);
        if (item) {
          document.getElementById('favoriteNumberId').value = item.id;
          document.getElementById('favoriteNumberName').value = item.name;
          document.getElementById('favoriteNumbers').value = item.numbers;
          document.getElementById('cancelFavoriteNumberBtn').style.display = 'inline-block';
        }
      }
    } catch (error) {
      console.error('获取关注号码失败:', error);
    }
  };

  // 删除关注号码
  window.deleteFavoriteNumber = async function(id) {
    if (!confirm('确定要删除这个关注号码组吗？')) return;
    
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, {
        method: 'DELETE'
      });
      const result = await res.json();
      
      if (result.success) {
        alert('删除成功');
        loadFavoriteNumbers();
      } else {
        alert('删除失败: ' + result.message);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请检查网络连接');
    }
  };

  // 分析关注号码
  window.analyzeFavoriteNumber = async function(id, position = 7) {
    try {
      const activeLotteryBtn = document.querySelector('.lottery-btn.active');
      const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
      
      const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}/analysis?lottery_type=${lotteryType}&position=${position}`);
      const result = await res.json();
      
      if (result.success) {
        showFavoriteNumberAnalysis(result.data);
      } else {
        alert('分析失败: ' + result.message);
      }
    } catch (error) {
      console.error('分析失败:', error);
      alert('分析失败，请检查网络连接');
    }
  };

  // 显示关注号码分析结果
  function showFavoriteNumberAnalysis(data) {
    const analysisResult = document.getElementById('favoriteNumberAnalysisResult');
    if (!analysisResult) return;

    const { favorite_group, numbers, analysis, position_stats, stats } = data;
    
    const activeLotteryBtn = document.querySelector('.lottery-btn.active');
    const activePositionBtn = document.querySelector('.position-btn.active');
    const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
    const position = activePositionBtn ? activePositionBtn.getAttribute('data-position') : 7;
    const lotteryName = lotteryType === 'am' ? '澳门' : '香港';
    
    let html = `
      <div class="analysis-header">
        <h3>关注号码组分析结果</h3>
        <div class="analysis-info">
          <p><strong>号码组名称：</strong>${favorite_group.name}</p>
          <p><strong>关注号码：</strong>${favorite_group.numbers}</p>
          <p><strong>分析彩种：</strong>${lotteryName}</p>
          <p><strong>分析位置：</strong>第${position}位</p>
          <p><strong>创建时间：</strong>${formatDateTime(favorite_group.created_at)}</p>
        </div>
        <button class="pagination-btn" onclick="exportFavoriteAnalysis()" style="margin-top: 10px;">导出Excel</button>
      </div>
    `;



    // 详细记录分页
    const pageSize = 50;
    const currentPage = 1;
    const totalRecords = analysis.length;
    const totalPages = Math.ceil(totalRecords / pageSize);
    
    html += `
      <div class="stats-section">
        <h4>详细记录（共${totalRecords}期）</h4>
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>开奖时间</th>
                <th>开奖号码</th>
                <th>中奖号码</th>
                <th>中奖位置</th>
                <th>是否中奖</th>
                <th>当前遗漏</th>
                <th>当前连中</th>
              </tr>
            </thead>
            <tbody id="analysisTableBody">
    `;
    
    // 取当前页的数据并按开奖时间从大到小排序（最新的开奖时间在前面）
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = analysis.slice(startIndex, endIndex).sort((a, b) => new Date(b.open_time) - new Date(a.open_time));
    
    currentPageData.forEach(record => {
      const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
      const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';
      const isHitClass = record.is_hit ? 'hit-yes' : 'hit-no';
      
      html += `
        <tr>
          <td>${record.period}</td>
          <td>${formatDateTime(record.open_time)}</td>
          <td>${record.open_numbers.join(',')}</td>
          <td>${hitNumbers}</td>
          <td>${hitPositions}</td>
          <td class="${isHitClass}">${record.is_hit ? '是' : '否'}</td>
          <td>${record.current_miss}</td>
          <td>${record.current_streak}</td>
            </tr>
          `;
        });
      
      html += `
              </tbody>
            </table>
          </div>
        
        <!-- 分页控件 -->
        <div class="pagination-container" style="margin-top: 20px;">
          <div class="pagination-info">
            第 ${currentPage} 页，共 ${totalPages} 页，共 ${totalRecords} 条记录
        </div>
          <div class="pagination-controls">
            <button class="pagination-btn" onclick="changeAnalysisPage(1)" ${currentPage === 1 ? 'disabled' : ''}>首页</button>
            <button class="pagination-btn" onclick="changeAnalysisPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>上一页</button>
            <div class="page-numbers">
    `;
    
    // 显示所有页码
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="changeAnalysisPage(${i})">${i}</button>`;
    }
      
      html += `
            </div>
            <button class="pagination-btn" onclick="changeAnalysisPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>下一页</button>
            <button class="pagination-btn" onclick="changeAnalysisPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>末页</button>
          </div>
          </div>
        </div>
      `;

    analysisResult.innerHTML = html;
    analysisResult.style.display = 'block';
    
    // 保存分析数据到全局变量，供分页使用
    window.currentAnalysisData = analysis;
  }
  // 分页切换函数
  window.changeAnalysisPage = function(page) {
    const analysis = window.currentAnalysisData;
    if (!analysis) return;

    const pageSize = 20;
    const totalRecords = analysis.length;
    const totalPages = Math.ceil(totalRecords / pageSize);

    if (page < 1 || page > totalPages) return;

    const tbody = document.getElementById('analysisTableBody');
    if (!tbody) return;

    // 清空表格内容
    tbody.innerHTML = '';

    // 计算当前页的数据并按开奖时间从大到小排序（最新的开奖时间在前面）
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const currentPageData = analysis.slice(startIndex, endIndex).sort((a, b) => new Date(b.open_time) - new Date(a.open_time));

    // 渲染当前页数据
    currentPageData.forEach(record => {
      const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
      const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';
      const isHitClass = record.is_hit ? 'hit-yes' : 'hit-no';

      const row = document.createElement('tr');
      row.innerHTML = `
          <td>${record.period}</td>
          <td>${formatDateTime(record.open_time)}</td>
          <td>${record.open_numbers.join(',')}</td>
          <td>${hitNumbers}</td>
          <td>${hitPositions}</td>
          <td class="${isHitClass}">${record.is_hit ? '是' : '否'}</td>
          <td>${record.current_miss}</td>
          <td>${record.current_streak}</td>
      `;
      tbody.appendChild(row);
    });

    // 更新分页信息
    const paginationInfo = document.querySelector('.pagination-info');
    if (paginationInfo) {
      paginationInfo.textContent = `第 ${page} 页，共 ${totalPages} 页，共 ${totalRecords} 条记录`;
    }

    // 更新分页按钮状态
    const prevBtn = document.querySelector('.pagination-btn[onclick*="changeAnalysisPage(${page - 1})"]');
    const nextBtn = document.querySelector('.pagination-btn[onclick*="changeAnalysisPage(${page + 1})"]');
    const firstBtn = document.querySelector('.pagination-btn[onclick*="changeAnalysisPage(1)"]');
    const lastBtn = document.querySelector('.pagination-btn[onclick*="changeAnalysisPage(${totalPages})"]');

    if (prevBtn) prevBtn.disabled = page === 1;
    if (nextBtn) nextBtn.disabled = page === totalPages;
    if (firstBtn) firstBtn.disabled = page === 1;
    if (lastBtn) lastBtn.disabled = page === totalPages;

    // 更新页码按钮
    const pageNumbers = document.querySelectorAll('.page-number');
    pageNumbers.forEach((btn, index) => {
      const pageNum = parseInt(btn.textContent);
      btn.classList.toggle('active', pageNum === page);
    });
  }

  // 导出关注号码分析结果
  window.exportFavoriteAnalysis = function() {
    const analysis = window.currentAnalysisData;
    if (!analysis || analysis.length === 0) {
      alert('暂无数据可导出');
      return;
    }

    const csvRows = [
      ['期数', '开奖时间', '开奖号码', '中奖号码', '中奖位置', '是否中奖', '当前遗漏', '当前连中']
    ];

    // 按开奖时间从大到小排序
    const sortedData = analysis.slice().sort((a, b) => new Date(b.open_time) - new Date(a.open_time));

    sortedData.forEach(record => {
      const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
      const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';

      csvRows.push([
        record.period,
        formatDateTime(record.open_time),
        record.open_numbers.join(','),
        hitNumbers,
        hitPositions,
        record.is_hit ? '是' : '否',
        record.current_miss,
        record.current_streak
      ]);
    });

    downloadCSV(csvRows, '关注号码分析结果.csv');
  }

  // 当页面切换到关注号码管理时初始化
  setTimeout(() => {
    const favoriteNumbersBtn = document.getElementById('menuFavoriteNumbersBtn');
    if (favoriteNumbersBtn) {
      favoriteNumbersBtn.onclick = function() {
        // 高亮
        originalBtnMap.forEach(i => {
          const b = document.getElementById(i.btn);
          if (b) b.classList.remove('active');
        });
        favoriteNumbersBtn.classList.add('active');
        
        // 页面切换，使用统一的页面切换逻辑
        document.querySelectorAll('.main-content > div[id$="Page"]').forEach(div => {
          div.style.display = 'none';
        });
        
        const showPage = document.getElementById('favoriteNumbersPage');
        if (showPage) showPage.style.display = '';
        
        // 标题切换
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.innerText = '关注号码管理';
        
        // 初始化关注号码管理
        initFavoriteNumbers();
      };
    }
  }, 0);

})();

// 波色分析相关代码
let currentColorType = 'am'; // 当前选中的彩种类型
let currentColorAnalysisResults = []; // 存储当前的分析结果
let currentColorAnalysisPage = 1; // 当前页码

// 简单的日期格式化函数
function formatColorAnalysisDateTime(dateTime) {
  if (!dateTime) return '';
  if (typeof dateTime === 'string') {
    return dateTime.replace('T', ' ').slice(0, 19);
  }
  return dateTime.toString();
}

// 波色定义
const colorGroups = {
  red: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  blue: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  green: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
};

// 获取号码所属的波色组
function getNumberColorGroup(number) {
  if (colorGroups.red.includes(number)) return 'red';
  if (colorGroups.blue.includes(number)) return 'blue';
  if (colorGroups.green.includes(number)) return 'green';
  return null;
}

// 获取波色组的中文名称
function getColorGroupName(color) {
  const colorNames = {
    red: '红组',
    blue: '蓝组',
    green: '绿组'
  };
  return colorNames[color] || '';
}

// 获取波色组的颜色样式
function getColorGroupStyle(color) {
  const colorStyles = {
    red: 'color: #e74c3c; font-weight: bold;',
    blue: 'color: #3498db; font-weight: bold;',
    green: 'color: #27ae60; font-weight: bold;'
  };
  return colorStyles[color] || '';
}

// 加载波色分析
async function loadColorAnalysis(type = 'am') {
  console.log('开始加载波色分析，类型:', type);
  currentColorType = type;
  const resultDiv = document.getElementById('colorAnalysisResult');
  const statsDiv = document.getElementById('colorAnalysisStats');
  
  if (!resultDiv) {
    console.error('找不到 colorAnalysisResult 元素');
    return;
  }
  
  if (!statsDiv) {
    console.error('找不到 colorAnalysisStats 元素');
    return;
  }
  
  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在加载波色分析数据...</div>';
  statsDiv.style.display = 'none';
  
  try {
    // 获取波色分析数据
    console.log(`正在获取${type}彩种的波色分析数据...`);
    const response = await fetch(`${window.BACKEND_URL}/color_analysis?lottery_type=${type}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('波色分析API响应数据:', data);
    
    if (!data.success) {
      console.error('波色分析API返回错误:', data.message);
      resultDiv.innerHTML = `<div style="text-align: center; color: #e74c3c; padding: 20px;">分析失败：${data.message}</div>`;
      return;
    }
    
    const analysisData = data.data;
    const apiAnalysisResults = analysisData.analysis_results || [];
    const latestPrediction = analysisData.latest_prediction;
    const stats = analysisData.stats;
    
    if (apiAnalysisResults.length > 0) {
      // 使用API返回的分析结果
      console.log('波色分析成功，结果数量:', apiAnalysisResults.length);
      console.log('最新预测:', latestPrediction);
      
      // 转换数据格式以适配前端显示
      const convertedResults = apiAnalysisResults.map(result => ({
        currentPeriod: result.current_period,
        currentOpenTime: result.current_open_time,
        currentNumbers: result.current_numbers,
        first6Sorted: result.first6_sorted,
        secondNumber: result.second_number,
        secondNumberColor: result.second_color,
        nextPeriod: result.next_period,
        nextSeventhNumber: result.next_seventh_number,
        nextSeventhColor: result.next_seventh_color,
        isHit: result.is_hit,
        currentMiss: result.current_miss,
        maxMiss: result.max_miss
      }));
      
      // 存储分析结果到全局变量
      currentColorAnalysisResults = convertedResults;
      currentColorAnalysisPage = 1; // 重置到第一页
      
      // 渲染分析结果
      renderColorAnalysisTable(convertedResults, 1);
      
      // 显示统计信息
      showColorAnalysisStats(convertedResults);
      
      // 显示最新预测
      if (latestPrediction) {
        showLatestPrediction(latestPrediction);
      }
      
      return; // 如果有API结果，直接返回，不进行本地分析
    }
    
    // 如果没有API分析结果，显示提示信息
    console.warn('API波色分析结果为空');
    resultDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无分析数据，请稍后再试</div>';
    return;
    
  } catch (error) {
    console.error('波色分析加载失败:', error);
    resultDiv.innerHTML = '<div style="text-align: center; color: #e74c3c; padding: 20px;">加载失败：' + error.message + '</div>';
  }
}
// 执行波色分析
function performColorAnalysis(records) {
  const results = [];
  let currentMiss = 0; // 当前遗漏期数
  let maxMiss = 0; // 最大遗漏期数
  
  for (let i = 0; i < records.length - 1; i++) {
    const currentRecord = records[i];
    const nextRecord = records[i + 1];
    
    // 检查数据完整性
    if (!currentRecord.open_numbers || !Array.isArray(currentRecord.open_numbers) || currentRecord.open_numbers.length < 7) {
      console.warn(`跳过不完整的数据记录: ${currentRecord.period || '未知期数'}`);
      continue;
    }
    
    if (!nextRecord.open_numbers || !Array.isArray(nextRecord.open_numbers) || nextRecord.open_numbers.length < 7) {
      console.warn(`跳过不完整的下期数据记录: ${nextRecord.period || '未知期数'}`);
      continue;
    }
    
    // 检查期数连续性
    if (!isConsecutivePeriods(currentRecord.period, nextRecord.period)) {
      console.warn(`期数不连续，跳过: ${currentRecord.period} -> ${nextRecord.period}`);
      continue;
    } else {
      console.log(`期数连续: ${currentRecord.period} -> ${nextRecord.period}`);
    }
    
    try {
      // 获取当前期前6个号码并排序
      const first6Numbers = currentRecord.open_numbers.slice(0, 6).map(num => {
        const parsed = parseInt(num);
        if (isNaN(parsed)) {
          throw new Error(`无法解析号码: ${num}`);
        }
        return parsed;
      }).sort((a, b) => a - b);
      
      // 获取第二个号码的波色组
      const secondNumber = first6Numbers[1];
      const secondNumberColor = getNumberColorGroup(secondNumber);
      
      // 获取下一期第七个号码的波色组
      const nextSeventhNumber = parseInt(nextRecord.open_numbers[6]);
      if (isNaN(nextSeventhNumber)) {
        console.warn(`无法解析下期第7位号码: ${nextRecord.open_numbers[6]}`);
        continue;
      }
      const nextSeventhColor = getNumberColorGroup(nextSeventhNumber);
      
      // 判断是否命中
      const isHit = secondNumberColor === nextSeventhColor;
      
      // 更新遗漏统计
      if (isHit) {
        // 命中，重置当前遗漏
        currentMiss = 0;
      } else {
        // 遗漏，增加当前遗漏期数
        currentMiss++;
        // 更新最大遗漏
        if (currentMiss > maxMiss) {
          maxMiss = currentMiss;
        }
      }
      
      results.push({
        currentPeriod: currentRecord.period,
        currentOpenTime: currentRecord.open_time,
        currentNumbers: currentRecord.open_numbers,
        first6Sorted: first6Numbers,
        secondNumber: secondNumber,
        secondNumberColor: secondNumberColor,
        nextPeriod: nextRecord.period,
        nextSeventhNumber: nextSeventhNumber,
        nextSeventhColor: nextSeventhColor,
        isHit: isHit,
        currentMiss: currentMiss,
        maxMiss: maxMiss
      });
    } catch (error) {
      console.warn(`处理记录时出错: ${currentRecord.period}`, error);
      continue;
    }
  }
  
  console.log('波色分析完成，结果数量:', results.length);
  console.log('最终统计 - 当前遗漏:', currentMiss, '最大遗漏:', maxMiss);
  return results;
}

// 检查期数是否连续
function isConsecutivePeriods(currentPeriod, nextPeriod) {
  if (!currentPeriod || !nextPeriod) {
    return false;
  }
  
  const current = currentPeriod.toString();
  const next = nextPeriod.toString();
  
  // 如果期数长度不同，可能不是连续的
  if (current.length !== next.length) {
    console.log(`期数长度不同: ${current}(${current.length}) vs ${next}(${next.length})`);
    return false;
  }
  
  // 尝试解析为数字并检查连续性
  const currentNum = parseInt(current);
  const nextNum = parseInt(next);
  
  if (isNaN(currentNum) || isNaN(nextNum)) {
    console.log(`期数解析失败: ${current} -> ${next}`);
    return false;
  }
  
  // 检查是否是连续的期数（相差1）
  const isConsecutive = nextNum === currentNum + 1;
  if (!isConsecutive) {
    console.log(`期数不连续: ${currentNum} + 1 = ${currentNum + 1}, 但下一期是 ${nextNum}`);
  }
  
  return isConsecutive;
}
// 渲染波色分析表格
function renderColorAnalysisTable(results, page = 1) {
  const resultDiv = document.getElementById('colorAnalysisResult');
  
  if (!results || !Array.isArray(results) || results.length === 0) {
    resultDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无分析数据</div>';
    return;
  }
  
  // 对结果按期数从大到小排序
  const sortedResults = [...results].sort((a, b) => {
    const periodA = parseInt(a.currentPeriod) || 0;
    const periodB = parseInt(b.currentPeriod) || 0;
    return periodB - periodA; // 从大到小排序
  });
  
  const pageSize = 20;
  const totalRecords = sortedResults.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  
  // 确保页码在有效范围内
  if (page < 1) page = 1;
  if (page > totalPages) page = totalPages;
  
  // 计算当前页的数据
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = sortedResults.slice(startIndex, endIndex);
  
  let html = `
    <div style="margin-bottom: 16px;">
      <button id="exportColorAnalysisBtn" class="btn-secondary">导出分析</button>
    </div>
    <div class="table-container">
      <table class="data-table" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th>当前期数</th>
            <th>开奖时间</th>
            <th>开奖号码</th>
            <th>前6码排序</th>
            <th>第2位号码</th>
            <th>第2位波色</th>
            <th>下期期数</th>
            <th>下期第7位</th>
            <th>下期第7位波色</th>
            <th>是否命中</th>
            <th>当前遗漏</th>
            <th>最大遗漏</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  currentPageData.forEach(result => {
    // 验证结果项的数据完整性
    if (!result || typeof result.isHit !== 'boolean') {
      console.warn('跳过无效的分析结果项:', result);
      return;
    }
    
    const hitClass = result.isHit ? 'hit-yes' : 'hit-no';
    const hitText = result.isHit ? '命中' : '遗漏';
    
    // 安全地获取数据，提供默认值
    const currentPeriod = result.currentPeriod || '未知';
    const currentOpenTime = result.currentOpenTime ? formatColorAnalysisDateTime(result.currentOpenTime) : '未知';
    const currentNumbers = Array.isArray(result.currentNumbers) ? result.currentNumbers.join(',') : '未知';
    const first6Sorted = Array.isArray(result.first6Sorted) ? result.first6Sorted.join(',') : '未知';
    const secondNumber = result.secondNumber ? result.secondNumber.toString().padStart(2, '0') : '未知';
    const secondNumberColor = result.secondNumberColor || '未知';
    const nextPeriod = result.nextPeriod || '未知';
    const nextSeventhNumber = result.nextSeventhNumber ? result.nextSeventhNumber.toString().padStart(2, '0') : '未知';
    const nextSeventhColor = result.nextSeventhColor || '未知';
    const currentMiss = result.currentMiss !== undefined ? result.currentMiss : 0;
    const maxMiss = result.maxMiss !== undefined ? result.maxMiss : 0;
    
          html += `
        <tr>
          <td>${currentPeriod}</td>
          <td>${currentOpenTime}</td>
          <td>${currentNumbers}</td>
          <td>${first6Sorted}</td>
          <td>${secondNumber}</td>
          <td style="${getColorGroupStyle(secondNumberColor)}">${getColorGroupName(secondNumberColor)}</td>
          <td>${nextPeriod}</td>
          <td>${nextSeventhNumber}</td>
          <td style="${getColorGroupStyle(nextSeventhColor)}">${getColorGroupName(nextSeventhColor)}</td>
          <td class="${hitClass}">${hitText}</td>
          <td class="${currentMiss > 0 ? 'miss-highlight' : ''}">${currentMiss}</td>
          <td>${maxMiss}</td>
        </tr>
      `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
  `;
  
  // 添加分页控件
  if (totalPages > 1) {
    html += `
      <div class="pagination-container" style="margin-top: 20px;">
        <div class="pagination-info">
          <span>显示 ${startIndex + 1}-${Math.min(endIndex, totalRecords)} 条，共 ${totalRecords} 条记录</span>
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="changeColorAnalysisPage(1)" ${page === 1 ? 'disabled' : ''}>首页</button>
          <button class="pagination-btn" onclick="changeColorAnalysisPage(${page - 1})" ${page === 1 ? 'disabled' : ''}>上一页</button>
          <span class="page-numbers">
    `;
    
    // 生成页码按钮
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === page ? 'active' : '';
      html += `<button class="page-number ${activeClass}" onclick="changeColorAnalysisPage(${i})">${i}</button>`;
    }
    
    html += `
          </span>
          <button class="pagination-btn" onclick="changeColorAnalysisPage(${page + 1})" ${page === totalPages ? 'disabled' : ''}>下一页</button>
          <button class="pagination-btn" onclick="changeColorAnalysisPage(${totalPages})" ${page === totalPages ? 'disabled' : ''}>末页</button>
        </div>
      </div>
    `;
  }
  
  resultDiv.innerHTML = html;
  
  // 绑定按钮事件
  bindColorAnalysisEvents();
  
  // 更新统计信息（基于当前页数据）
  updateColorAnalysisStats(results, currentPageData);
}

// 显示波色分析统计信息
function showColorAnalysisStats(results) {
  const statsDiv = document.getElementById('colorAnalysisStats');
  
  if (!results || !Array.isArray(results) || results.length === 0) {
    statsDiv.style.display = 'none';
    return;
  }
  
  updateColorAnalysisStats(results, results);
  statsDiv.style.display = 'block';
}

// 更新波色分析统计信息
function updateColorAnalysisStats(allResults, currentPageResults = []) {
  const statsDiv = document.getElementById('colorAnalysisStats');
  
  if (!statsDiv) return;
  
  // 总体统计
  const totalPeriods = allResults.length;
  const totalHitCount = allResults.filter(r => r && r.isHit).length;
  const totalMissCount = totalPeriods - totalHitCount;
  const totalHitRate = totalPeriods > 0 ? ((totalHitCount / totalPeriods) * 100).toFixed(2) : '0.00';
  
  // 遗漏统计
  const currentMiss = allResults.length > 0 ? (allResults[allResults.length - 1]?.currentMiss || 0) : 0;
  const maxMiss = allResults.length > 0 ? Math.max(...allResults.map(r => r?.maxMiss || 0)) : 0;
  
  // 当前页统计
  const pageHitCount = currentPageResults.filter(r => r && r.isHit).length;
  const pageMissCount = currentPageResults.length - pageHitCount;
  const pageHitRate = currentPageResults.length > 0 ? ((pageHitCount / currentPageResults.length) * 100).toFixed(2) : '0.00';
  
  // 更新总体统计
  const totalColorPeriodsEl = document.getElementById('totalColorPeriods');
  const colorHitCountEl = document.getElementById('colorHitCount');
  const colorMissCountEl = document.getElementById('colorMissCount');
  const colorHitRateEl = document.getElementById('colorHitRate');
  
  if (totalColorPeriodsEl) totalColorPeriodsEl.textContent = totalPeriods;
  if (colorHitCountEl) colorHitCountEl.textContent = totalHitCount;
  if (colorMissCountEl) colorMissCountEl.textContent = totalMissCount;
  if (colorHitRateEl) colorHitRateEl.textContent = totalHitRate + '%';
  
  // 添加遗漏统计到总体统计区域
  const overallStatsSection = statsDiv.querySelector('.stats-section:first-child .stats-grid');
  if (overallStatsSection) {
    // 检查是否已经有遗漏统计，如果没有则添加
    const existingMissStats = overallStatsSection.querySelector('.stats-item[data-miss-stat]');
    if (!existingMissStats) {
      const missStatsHtml = `
        <div class="stats-item" data-miss-stat>
          <span class="stats-label">当前遗漏：</span>
          <span class="stats-value miss-highlight">${currentMiss}</span>
        </div>
        <div class="stats-item" data-miss-stat>
          <span class="stats-label">最大遗漏：</span>
          <span class="stats-value">${maxMiss}</span>
        </div>
      `;
      overallStatsSection.innerHTML += missStatsHtml;
    } else {
      // 更新现有的遗漏统计
      const missItems = overallStatsSection.querySelectorAll('.stats-item[data-miss-stat]');
      if (missItems.length >= 2) {
        missItems[0].querySelector('.stats-value').textContent = currentMiss;
        missItems[1].querySelector('.stats-value').textContent = maxMiss;
      }
    }
  }
  
  // 添加当前页统计
  const pageStatsHtml = `
    <div class="stats-section">
      <h3 class="stats-title">当前页统计</h3>
      <div class="stats-grid">
        <div class="stats-item">
          <span class="stats-label">本页记录数：</span>
          <span class="stats-value">${currentPageResults.length}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">本页命中：</span>
          <span class="stats-value">${pageHitCount}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">本页遗漏：</span>
          <span class="stats-value">${pageMissCount}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">本页命中率：</span>
          <span class="stats-value">${pageHitRate}%</span>
        </div>
      </div>
    </div>
  `;
  
  // 查找或创建当前页统计区域
  let pageStatsSection = statsDiv.querySelector('.stats-section:last-child');
  if (!pageStatsSection || !pageStatsSection.querySelector('.stats-title').textContent.includes('当前页统计')) {
    // 如果没有当前页统计区域，添加一个
    statsDiv.innerHTML += pageStatsHtml;
  } else {
    // 更新现有的当前页统计
    pageStatsSection.innerHTML = pageStatsHtml;
  }
}

// 绑定波色分析事件
function bindColorAnalysisEvents() {
  // 彩种切换按钮
  const colorTypeBtns = document.querySelectorAll('.color-analysis-type-btn');
  colorTypeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      colorTypeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const type = this.dataset.type;
      currentColorType = type;
    });
  });
  
  // 开始分析按钮
  const startBtn = document.getElementById('startColorAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      loadColorAnalysis(currentColorType);
    });
  }
  
  // 导出分析按钮
  const exportBtn = document.getElementById('exportColorAnalysisBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      exportColorAnalysis();
    });
  }
}

// 导出波色分析
function exportColorAnalysis() {
  // 这里可以实现导出功能
  alert('导出功能待实现');
}

// 初始化波色分析
function initColorAnalysis() {
  // 绑定彩种切换按钮事件
  const colorTypeBtns = document.querySelectorAll('.color-analysis-type-btn');
  colorTypeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      colorTypeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const type = this.dataset.type;
      currentColorType = type;
    });
  });
  
  // 绑定开始分析按钮事件
  const startBtn = document.getElementById('startColorAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      loadColorAnalysis(currentColorType);
    });
  }
}

// 分页切换函数
function changeColorAnalysisPage(page) {
  if (!currentColorAnalysisResults || currentColorAnalysisResults.length === 0) {
    console.warn('没有分析数据可供分页');
    return;
  }
  
  const pageSize = 20;
  const totalPages = Math.ceil(currentColorAnalysisResults.length / pageSize);
  
  if (page < 1 || page > totalPages) {
    console.warn('页码超出范围:', page);
    return;
  }
  
  currentColorAnalysisPage = page;
  renderColorAnalysisTable(currentColorAnalysisResults, page);
}

// 显示最新预测
function showLatestPrediction(prediction) {
  const resultDiv = document.getElementById('colorAnalysisResult');
  if (!resultDiv || !prediction) return;
  
  const predictionHtml = `
    <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
      <h3 style="margin: 0 0 10px 0; color: white;">最新预测</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div>
          <strong>当前期数：</strong>${prediction.current_period}
        </div>
        <div>
          <strong>下期期数：</strong>${prediction.next_period}
        </div>
        <div>
          <strong>第2位号码：</strong>${prediction.second_number.toString().padStart(2, '0')}
        </div>
        <div>
          <strong>第2位波色：</strong><span style="${getColorGroupStyle(prediction.second_color)}">${getColorGroupName(prediction.second_color)}</span>
        </div>
        <div>
          <strong>预测波色：</strong><span style="${getColorGroupStyle(prediction.predicted_color)}">${getColorGroupName(prediction.predicted_color)}</span>
        </div>
      </div>
      <div style="margin-top: 10px; font-style: italic; opacity: 0.9;">
        ${prediction.prediction_basis}
      </div>
    </div>
  `;
  
  // 在表格前插入预测信息
  const tableContainer = resultDiv.querySelector('.table-container');
  if (tableContainer) {
    tableContainer.insertAdjacentHTML('beforebegin', predictionHtml);
  } else {
    resultDiv.insertAdjacentHTML('afterbegin', predictionHtml);
  }
}

// 页面加载完成后初始化波色分析
document.addEventListener('DOMContentLoaded', function() {
  initColorAnalysis();
});

// ==================== 推荐8码命中情况分析功能 ====================

// 全局变量
let selectedPosition = 7; // 当前选择的位置

// 位置选择函数
function selectPosition(position) {
  selectedPosition = position;
  
  // 更新按钮状态
  document.querySelectorAll('.position-select-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-position="${position}"]`).classList.add('active');
  
  // 更新显示文本
  const selectedPositionText = document.getElementById('selectedPositionText');
  if (selectedPositionText) {
    selectedPositionText.textContent = `第${position}位`;
  }
  
  console.log(`已选择位置：第${position}位`);
}

// 初始化推荐8码命中情况分析
function initRecommendHitAnalysis() {
  console.log('初始化推荐8码命中情况分析...');
  
  // 绑定彩种切换按钮事件
  const typeBtns = document.querySelectorAll('.recommend-hit-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
  
  // 绑定分析按钮事件
  const analyzeBtn = document.getElementById('analyzeRecommendHitBtn');
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', function() {
      const activeBtn = document.querySelector('.recommend-hit-type-btn.active');
      const lotteryType = activeBtn ? activeBtn.dataset.type : 'am';
      analyzeRecommendHit(lotteryType);
    });
  }
  
  // 显示初始提示
  const resultDiv = document.getElementById('recommendHitResult');
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div style="text-align:center;color:#888;padding:20px;">
        点击"分析命中情况"按钮选择要分析的推荐期数，查看前后10期的命中情况<br>
        <small style="color:#666;margin-top:10px;display:block;">
          <strong>注意：</strong>每个位置的8个推荐号码只与对应位置的开奖号码比较<br>
          <strong>新功能：</strong>支持选择特定位置，并统计近100期按5期周期的开奖情况
        </small>
      </div>
    `;
  }
}

// 分析推荐8码命中情况
async function analyzeRecommendHit(lotteryType) {
  console.log(`开始分析${lotteryType}彩种的推荐8码命中情况...`);
  
  const resultDiv = document.getElementById('recommendHitResult');
  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在获取推荐历史数据...</div>';
  
  try {
    // 获取推荐历史数据
    const response = await fetch(`${window.BACKEND_URL}/api/recommend_history?lottery_type=${lotteryType}`);
    const data = await response.json();
    
    if (data.success && data.data && data.data.length > 0) {
      console.log('获取到推荐历史数据:', data.data);
      // 显示期数选择界面
      renderRecommendPeriodSelection(data.data, lotteryType);
    } else {
      // 如果没有历史数据，尝试获取最新推荐
      console.log('没有历史推荐数据，尝试获取最新推荐...');
      const recommendResponse = await fetch(`${window.BACKEND_URL}/recommend?lottery_type=${lotteryType}`);
      const recommendData = await recommendResponse.json();
      
      if (recommendData.recommend && recommendData.latest_period) {
        console.log('获取到最新推荐数据:', recommendData);
        await analyzeSingleRecommend(recommendData, lotteryType);
      } else {
        resultDiv.innerHTML = '<div style="text-align:center;color:red;padding:20px;">暂无推荐数据</div>';
      }
    }
  } catch (error) {
    console.error('分析推荐命中情况失败:', error);
    resultDiv.innerHTML = `<div style="text-align:center;color:red;padding:20px;">分析失败：${error.message}</div>`;
  }
}
// 分析单个推荐数据
async function analyzeSingleRecommend(recommendData, lotteryType) {
  console.log('分析单个推荐数据:', recommendData);
  
  const resultDiv = document.getElementById('recommendHitResult');
  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在分析命中情况...</div>';
  
  try {
    // 获取开奖记录数据（近100期）
    const recordsResponse = await fetch(`${window.BACKEND_URL}/records?lottery_type=${lotteryType}&page_size=100`);
    const recordsData = await recordsResponse.json();
    
    if (!recordsData.records || recordsData.records.length === 0) {
      resultDiv.innerHTML = '<div style="text-align:center;color:red;padding:20px;">暂无开奖记录数据</div>';
      return;
    }
    
    // 找到推荐期数在记录中的位置
    const recommendPeriod = recommendData.latest_period;
    const recommendIndex = recordsData.records.findIndex(record => record.period === recommendPeriod);
    
    if (recommendIndex === -1) {
      resultDiv.innerHTML = '<div style="text-align:center;color:red;padding:20px;">未找到推荐期数的开奖记录</div>';
      return;
    }
    
    // 分析前后10期的命中情况
    const startIndex = Math.max(0, recommendIndex - 10);
    const endIndex = Math.min(recordsData.records.length, recommendIndex + 11);
    const allRecords = recordsData.records.slice(startIndex, endIndex);
    
    console.log(`分析范围：第${startIndex}期到第${endIndex}期，共${allRecords.length}期`);
    
    // 分析每期的命中情况
    const periodAnalysis = [];
    const recommendNumbers = recommendData.recommend;
    
    allRecords.forEach((record, index) => {
      const period = record.period;
      const openNumbers = record.numbers.split(',').map(n => n.trim());
      const periodResult = {
        period: period,
        openTime: record.open_time,
        openNumbers: openNumbers,
        positions: []
      };
      
      // 分析每个位置的命中情况
      for (let pos = 0; pos < Math.min(7, recommendNumbers.length); pos++) {
        const recommendNums = recommendNumbers[pos];
        if (recommendNums && Array.isArray(recommendNums)) {
          // 只与对应位置的开奖号码比较，不跨位置
          const openNumberAtPosition = openNumbers[pos];
          const isHit = recommendNums.includes(openNumberAtPosition);
          const hitNumbers = isHit ? [openNumberAtPosition] : [];
          const hitCount = isHit ? 1 : 0;
          const hitRate = (hitCount / recommendNums.length * 100).toFixed(2);
          
          // 调试信息
          console.log(`位置${pos + 1}: 推荐号码[${recommendNums.join(',')}], 开奖号码${openNumberAtPosition}, 是否命中: ${isHit}`);
          
          periodResult.positions.push({
            position: pos + 1,
            recommendNumbers: recommendNums,
            openNumberAtPosition: openNumberAtPosition,
            hitNumbers: hitNumbers,
            hitCount: hitCount,
            hitRate: hitRate,
            isHit: isHit
          });
        }
      }
      
      periodAnalysis.push(periodResult);
    });
    
    // 分组分析结果
    const beforeRecommend = periodAnalysis.slice(0, recommendIndex - startIndex);
    const afterRecommend = periodAnalysis.slice(recommendIndex - startIndex + 1);
    
    console.log('分析完成，分组结果:', { beforeRecommend, afterRecommend });
    
    // 渲染分析结果
    renderRecommendHitAnalysis(periodAnalysis, recommendData, lotteryType, beforeRecommend, afterRecommend);
    
    // 额外分析：近100期按5期周期的统计
    await analyzeRecent100Periods(recordsData.records, lotteryType);
    
  } catch (error) {
    console.error('分析单个推荐失败:', error);
    resultDiv.innerHTML = `<div style="text-align:center;color:red;padding:20px;">分析失败：${error.message}</div>`;
  }
}

// 渲染推荐期数选择界面
function renderRecommendPeriodSelection(recommendPeriods, lotteryType) {
  const resultDiv = document.getElementById('recommendHitResult');
  
  let html = `
    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #2980d9;">
      <h3 style="color: #2980d9; margin: 0 0 15px 0;">📅 选择要分析的推荐期数</h3>
      <div style="margin-bottom: 15px;">
        <strong>彩种：</strong>${lotteryType === 'am' ? '澳门' : '香港'}
        <br><strong>共有推荐期数：</strong>${recommendPeriods.length}期
      </div>
    </div>
    
    <!-- 位置选择区域 -->
    <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
      <h4 style="color: #856404; margin: 0 0 15px 0;">🎯 选择要分析的位置</h4>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 15px;">
        <button class="position-select-btn" data-position="1" onclick="selectPosition(1)">第1位</button>
        <button class="position-select-btn" data-position="2" onclick="selectPosition(2)">第2位</button>
        <button class="button position-select-btn" data-position="3" onclick="selectPosition(3)">第3位</button>
        <button class="position-select-btn" data-position="4" onclick="selectPosition(4)">第4位</button>
        <button class="position-select-btn" data-position="5" onclick="selectPosition(5)">第5位</button>
        <button class="position-select-btn" data-position="6" onclick="selectPosition(6)">第6位</button>
        <button class="position-select-btn active" data-position="7" onclick="selectPosition(7)">第7位</button>
      </div>
      <div style="font-size: 12px; color: #666;">
        <em>当前选择：<span id="selectedPositionText">第7位</span></em>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <h4 style="color: #2980d9; margin-bottom: 15px;">推荐期数列表</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
  `;
  
  // 按期数倒序排列（最新的在前面）
  const sortedPeriods = recommendPeriods.sort((a, b) => {
    const periodA = parseInt(a.period) || 0;
    const periodB = parseInt(b.period) || 0;
    return periodB - periodA;
  });
  
  sortedPeriods.forEach((periodData, index) => {
    const period = periodData.period;
    const createdAt = periodData.created_at ? new Date(periodData.created_at).toLocaleString() : '未知时间';
    const isLatest = index === 0;
    
    html += `
      <div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: white; cursor: pointer; transition: all 0.2s; ${isLatest ? 'border-color: #28a745; background: #f8fff9;' : ''}" 
           onclick="selectRecommendPeriod('${period}', '${lotteryType}')">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h5 style="margin: 0; color: #2980d9;">期数：${period}</h5>
          ${isLatest ? '<span style="color: #28a745; font-weight: bold; font-size: 12px;">最新</span>' : ''}
        </div>
        <div style="font-size: 14px; color: #666;">
          <div>生成时间：${createdAt}</div>
          <div>位置数量：7个</div>
        </div>
        <div style="margin-top: 10px; text-align: center;">
          <button class="btn-primary" style="width: 100%;" onclick="event.stopPropagation(); selectRecommendPeriod('${period}', '${lotteryType}')">
            分析此期命中情况
          </button>
        </div>
      </div>
    `;
  });
  
  html += `
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #27ae60;">
      <h4 style="color: #27ae60; margin: 0 0 10px 0;">💡 使用说明</h4>
      <p style="margin: 0; color: #155724;">
        1. 点击任意推荐期数卡片或"分析此期命中情况"按钮<br>
        2. 系统将分析该期推荐8码前后各10期的命中情况<br>
        3. <strong>每个位置的8个推荐号码只与对应位置的开奖号码比较</strong><br>
        4. 可以对比不同期数的推荐效果<br>
        5. 最新期数会以绿色边框标识
      </p>
    </div>
  `;
  
  resultDiv.innerHTML = html;
}

// 选择推荐期数进行分析
async function selectRecommendPeriod(period, lotteryType) {
  const resultDiv = document.getElementById('recommendHitResult');
  resultDiv.innerHTML = `正在分析期数 ${period} 的推荐8码命中情况...`;
  
  try {
    // 获取指定期数的推荐8码数据
    const recommendRes = await fetch(`${window.BACKEND_URL}/api/recommend_by_period?lottery_type=${lotteryType}&period=${period}`);
    const recommendData = await recommendRes.json();
    
    if (!recommendData.success || !recommendData.data) {
      resultDiv.innerHTML = '<span style="color:red;">获取推荐数据失败</span>';
      return;
    }
    
    // 构造推荐数据格式
    const recommendInfo = {
      recommend: recommendData.data.recommend_numbers,
      latest_period: period
    };
    
    // 分析该期推荐
    await analyzeSingleRecommend(recommendInfo, lotteryType);
    
  } catch (error) {
    resultDiv.innerHTML = `<span style="color:red;">分析失败：${error.message}</span>`;
    console.error('分析指定期数推荐失败:', error);
  }
}

// 渲染推荐命中情况分析结果
function renderRecommendHitAnalysis(analysisResults, recommendData, lotteryType, beforeRecommend, afterRecommend) {
  const resultDiv = document.getElementById('recommendHitResult');
  
  let html = `
    <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
      <h3 style="color: #1976d2; margin: 0 0 15px 0;">🎯 推荐8码命中情况分析结果</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div>
          <strong>彩种：</strong>${lotteryType === 'am' ? '澳门' : '香港'}
        </div>
        <div>
          <strong>推荐期数：</strong>${recommendData.latest_period}
        </div>
        <div>
          <strong>分析范围：</strong>前后各10期
        </div>
        <div>
          <strong>总分析期数：</strong>${analysisResults.length}期
        </div>
      </div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <button id="exportAnalysisBtn" class="btn-secondary">导出分析结果</button>
    </div>
  `;
  
  // 推荐期号之前的期数分析
  if (beforeRecommend && beforeRecommend.length > 0) {
    const beforeStats = calculateGroupStats(beforeRecommend);
    html += `
      <div style="margin-bottom: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
        <h4 style="color: #856404; margin: 0 0 15px 0;">📊 推荐期号之前的期数分析（${beforeRecommend.length}期）</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div>
            <strong>总命中次数：</strong>${beforeStats.totalHits}
          </div>
          <div>
            <strong>总位置数：</strong>${beforeStats.totalPositions}
          </div>
          <div>
            <strong>整体命中率：</strong>${beforeStats.overallHitRate}%
          </div>
          <div>
            <strong>平均每期命中：</strong>${beforeStats.avgHitsPerPeriod}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">
          <em>说明：每个位置的8个推荐号码只与对应位置的开奖号码比较</em>
        </div>
      </div>
    `;
    
    html += renderPeriodGroupAnalysis(beforeRecommend, '推荐期号之前的期数详细分析');
  }
  
  // 推荐期号信息
  html += `
    <div style="margin-bottom: 20px; padding: 15px; background: #d1ecf1; border-radius: 8px; border-left: 4px solid #17a2b8;">
      <h4 style="color: #0c5460; margin: 0 0 15px 0;">🎯 推荐期号信息</h4>
      <div style="margin-bottom: 15px;">
        <strong>期数：</strong>${recommendData.latest_period}
        <br><strong>彩种：</strong>${lotteryType === 'am' ? '澳门' : '香港'}
        <br><strong>推荐时间：</strong>${new Date().toLocaleString()}
        <br><strong>第${selectedPosition}位推荐8码：</strong>
        <span style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px; font-weight: bold; color: #2980d9;">
          ${recommendData.recommend && recommendData.recommend[selectedPosition - 1] ? 
            recommendData.recommend[selectedPosition - 1].join(',') : '暂无推荐数据'}
        </span>
      </div>
    </div>
  `;
  
  // 推荐期号之后的期数分析
  if (afterRecommend && afterRecommend.length > 0) {
    const afterStats = calculateGroupStats(afterRecommend);
    html += `
      <div style="margin-bottom: 20px; padding: 15px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
        <h4 style="color: #155724; margin: 0 0 15px 0;">📊 推荐期号之后的期数分析（${afterRecommend.length}期）</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div>
            <strong>总命中次数：</strong>${afterStats.totalHits}
          </div>
          <div>
            <strong>总位置数：</strong>${afterStats.totalPositions}
          </div>
          <div>
            <strong>整体命中率：</strong>${afterStats.overallHitRate}%
          </div>
          <div>
            <strong>平均每期命中：</strong>${afterStats.avgHitsPerPeriod}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">
          <em>说明：每个位置的8个推荐号码只与对应位置的开奖号码比较</em>
        </div>
      </div>
    `;
    
    html += renderPeriodGroupAnalysis(afterRecommend, '推荐期号之后的期数详细分析');
  }
  
  resultDiv.innerHTML = html;
  
  // 绑定导出按钮事件
  const exportBtn = document.getElementById('exportAnalysisBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      exportRecommendAnalysis(analysisResults, recommendData, lotteryType);
    });
  }
}

// 计算分组统计信息
function calculateGroupStats(groupData) {
  let totalHits = 0;
  let totalPositions = 0;
  
  groupData.forEach(period => {
    period.positions.forEach(pos => {
      totalHits += pos.hitCount;
      totalPositions += 1; // 每个位置只算1次，因为只比较对应位置
    });
  });
  
  const overallHitRate = totalPositions > 0 ? (totalHits / totalPositions * 100).toFixed(2) : '0.00';
  const avgHitsPerPeriod = groupData.length > 0 ? (totalHits / groupData.length).toFixed(2) : '0.00';
  
  return {
    totalHits,
    totalPositions,
    overallHitRate,
    avgHitsPerPeriod
  };
}

// 渲染期数分组分析表格
function renderPeriodGroupAnalysis(groupData, groupTitle) {
  let html = `
    <div style="margin-bottom: 20px;">
      <h5 style="color: #495057; margin-bottom: 10px;">${groupTitle}（第${selectedPosition}位）</h5>
      <div class="table-container">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>期数</th>
              <th>开奖时间</th>
              <th>开奖号码</th>
              <th>第${selectedPosition}位号码</th>
              <th>推荐8码</th>
              <th>第${selectedPosition}位分析</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  groupData.forEach((period, index) => {
    const periodLabel = groupTitle.includes('之前') ? `前${groupData.length - index}期` : `后${index + 1}期`;
    
    // 只显示选择位置的数据
    const posData = period.positions[selectedPosition - 1];
    
    // 获取开奖号码和推荐号码
    const openNumber = period.openNumbers[selectedPosition - 1] || '-';
    const recommendNumbers = posData ? posData.recommendNumbers.join(',') : '暂无推荐数据';
    
    html += `
      <tr>
        <td>${period.period}</td>
        <td>${period.openTime}</td>
        <td>${period.openNumbers.join(',')}</td>
        <td>${openNumber}</td>
        <td style="background: #f8f9fa; font-weight: bold; color: #2980d9;">${recommendNumbers}</td>
    `;
    
    if (posData) {
      const hitClass = posData.isHit ? 'hit-yes' : 'hit-no';
      const hitText = posData.isHit ? '命中' : '未中';
      html += `<td class="${hitClass}">
        <div style="color: ${posData.isHit ? '#28a745' : '#dc3545'}; font-weight: bold;">
          ${hitText} (${posData.hitRate}%)
        </div>
      </td>`;
    } else {
      html += '<td>-</td>';
    }
    
    html += '</tr>';
  });
  
  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;
  
  return html;
}

// 分析近100期按5期周期的统计
async function analyzeRecent100Periods(records, lotteryType) {
  console.log('开始分析近100期按5期周期的统计...');
  
  if (!records || records.length === 0) {
    console.log('没有记录数据可供分析');
    return;
  }
  
  // 获取推荐数据用于判断命中
  let recommendData = null;
  try {
    // 尝试获取最新的推荐数据
    const recommendResponse = await fetch(`${window.BACKEND_URL}/recommend?lottery_type=${lotteryType}`);
    const recommendResult = await recommendResponse.json();
    if (recommendResult.recommend && recommendResult.latest_period) {
      recommendData = recommendResult;
    }
  } catch (error) {
    console.log('获取推荐数据失败，将使用开奖号码进行基础分析');
  }
  
  // 按0和5尾数期数分组
  const periodGroups = [];
  let currentGroup = [];
  let groupIndex = 1;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const period = record.period;
    
    // 检查期数是否以0或5结尾
    const isPeriodEnd = period.endsWith('0') || period.endsWith('5');
    
    if (isPeriodEnd && currentGroup.length > 0) {
      // 遇到0或5结尾的期数，且当前组有数据，则结束当前组
      periodGroups.push({
        groupIndex: groupIndex++,
        periods: currentGroup,
        startPeriod: currentGroup[0].period,
        endPeriod: currentGroup[currentGroup.length - 1].period,
        records: currentGroup,
        isCompleteGroup: currentGroup.length === 5
      });
      currentGroup = [record]; // 开始新组
    } else {
      // 添加到当前组
      currentGroup.push(record);
      
      // 如果当前组达到5期，或者到达最后一条记录，则结束当前组
      if (currentGroup.length === 5 || i === records.length - 1) {
        periodGroups.push({
          groupIndex: groupIndex++,
          periods: currentGroup,
          startPeriod: currentGroup[0].period,
          endPeriod: currentGroup[currentGroup.length - 1].period,
          records: currentGroup,
          isCompleteGroup: currentGroup.length === 5
        });
        currentGroup = []; // 重置当前组
      }
    }
  }
  
  // 如果还有未处理的记录，添加到最后一组
  if (currentGroup.length > 0) {
    periodGroups.push({
      groupIndex: groupIndex,
      periods: currentGroup,
      startPeriod: currentGroup[0].period,
      endPeriod: currentGroup[currentGroup.length - 1].period,
      records: currentGroup,
      isCompleteGroup: currentGroup.length === 5
    });
  }
  
  console.log(`近${records.length}期按0/5尾数分组，共${periodGroups.length}组`);
  console.log('分组详情:', periodGroups.map(g => `${g.startPeriod}-${g.endPeriod}(${g.records.length}期)`));
  
  // 渲染近100期统计结果
  renderRecent100PeriodsAnalysis(periodGroups, lotteryType, recommendData);
}
// 渲染近100期按5期周期的分析结果
function renderRecent100PeriodsAnalysis(periodGroups, lotteryType, recommendData) {
  const resultDiv = document.getElementById('recommendHitResult');
  
  let html = `
    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6f42c1;">
      <h3 style="color: #6f42c1; margin: 0 0 20px 0;">📊 近100期按0/5尾数分组统计（第${selectedPosition}位）</h3>
      
      <div style="margin-bottom: 20px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>总期数：</strong>${periodGroups.reduce((sum, group) => sum + group.records.length, 0)}期
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>分组数：</strong>${periodGroups.length}组
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>分析位置：</strong>第${selectedPosition}位
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>推荐数据：</strong>${recommendData ? '已获取' : '未获取'}
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>分组规则：</strong>以0/5尾数期数为界
          </div>
          <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
            <strong>推荐8码：</strong>
            ${recommendData && recommendData.recommend && recommendData.recommend[selectedPosition - 1] ? 
              recommendData.recommend[selectedPosition - 1].join(',') : '暂无推荐数据'}
          </div>
        </div>
      </div>
      
      <div class="table-container">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th>周期组</th>
              <th>期数范围</th>
              <th>期数</th>
              <th>开奖号码</th>
              <th>第${selectedPosition}位号码</th>
              <th>推荐8码</th>
              <th>是否命中</th>
              <th>命中详情</th>
            </tr>
          </thead>
          <tbody>
  `;
  
  let totalHits = 0;
  let totalPeriods = 0;
  
  periodGroups.forEach((group, index) => {
    // 获取第selectedPosition位的开奖号码
    const positionNumbers = group.records.map(record => {
      const numbers = record.numbers.split(',').map(n => n.trim());
      return numbers[selectedPosition - 1] || '-';
    });
    
    // 计算命中情况
    let groupHits = 0;
    let groupDetails = [];
    
    group.records.forEach((record, recordIndex) => {
      const numbers = record.numbers.split(',').map(n => n.trim());
      const positionNumber = numbers[selectedPosition - 1];
      
      if (positionNumber && recommendData && recommendData.recommend) {
        // 检查是否命中推荐号码
        const recommendNums = recommendData.recommend[selectedPosition - 1];
        if (recommendNums && Array.isArray(recommendNums)) {
          const isHit = recommendNums.includes(positionNumber);
          if (isHit) {
            groupHits++;
            groupDetails.push(`第${recordIndex + 1}期: ${positionNumber} ✓`);
          } else {
            groupDetails.push(`第${recordIndex + 1}期: ${positionNumber} ✗`);
          }
        } else {
          groupDetails.push(`第${recordIndex + 1}期: ${positionNumber} -`);
        }
      } else {
        groupDetails.push(`第${recordIndex + 1}期: ${positionNumber || '-'} -`);
      }
      
      totalPeriods++;
    });
    
    // 计算命中率
    const hitRate = group.records.length > 0 ? ((groupHits / group.records.length) * 100).toFixed(1) : '0.0';
    totalHits += groupHits;
    
    // 设置命中状态样式
    const hitStatus = groupHits > 0 ? 
      `<span style="color: #28a745; font-weight: bold;">命中 (${groupHits}/${group.records.length})</span>` : 
      `<span style="color: #dc3545; font-weight: bold;">未命中 (0/${group.records.length})</span>`;
    
    // 设置分组状态样式
    const groupStatus = group.isCompleteGroup ? 
      `<span style="color: #28a745; font-weight: bold;">完整组 (${group.records.length}期)</span>` : 
      `<span style="color: #ffc107; font-weight: bold;">不足组 (${group.records.length}期)</span>`;
    
    // 获取推荐8码
    let recommendCodes = '';
    if (recommendData && recommendData.recommend && recommendData.recommend[selectedPosition - 1]) {
      const recommendNums = recommendData.recommend[selectedPosition - 1];
      if (Array.isArray(recommendNums)) {
        recommendCodes = recommendNums.join(',');
      }
    } else {
      recommendCodes = '暂无推荐数据';
    }
    
    html += `
      <tr>
        <td>第${group.groupIndex}组</td>
        <td>${group.startPeriod} - ${group.endPeriod}</td>
        <td>${group.records.map(r => r.period).join('<br>')}</td>
        <td>${group.records.map(r => r.numbers).join('<br>')}</td>
        <td>${positionNumbers.join('<br>')}</td>
        <td style="background: #f8f9fa; font-weight: bold; color: #2980d9;">${recommendCodes}</td>
        <td>${hitStatus}</td>
        <td>${groupDetails.join('<br>')}</td>
      </tr>
    `;
  });
  
  // 计算总体命中率
  const overallHitRate = totalPeriods > 0 ? ((totalHits / totalPeriods) * 100).toFixed(1) : '0.0';
  
  html += `
          </tbody>
        </table>
      </div>
      
      <!-- 总体统计 -->
      <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
        <h4 style="color: #1976d2; margin: 0 0 15px 0;">📈 总体统计</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
          <div>
            <strong>总期数：</strong>${totalPeriods}期
          </div>
          <div>
            <strong>总命中：</strong>${totalHits}期
          </div>
          <div>
            <strong>总未命中：</strong>${totalPeriods - totalHits}期
          </div>
          <div>
            <strong>整体命中率：</strong><span style="color: #2196f3; font-weight: bold;">${overallHitRate}%</span>
          </div>
        </div>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #27ae60;">
        <h4 style="color: #27ae60; margin: 0 0 10px 0;">💡 分组规则说明</h4>
        <p style="margin: 0; color: #155724;">
          1. <strong>分组规则：</strong>以0和5尾数的期数作为分组起始点<br>
          2. <strong>完整组：</strong>每组最多5期，达到5期自动结束<br>
          3. <strong>不足组：</strong>遇到0/5尾数期数时，不足5期的直接结束<br>
          4. <strong>期数显示：</strong>每行显示具体的期数，便于查看分组情况<br>
          5. <strong>命中判断：</strong>基于推荐8码与对应位置开奖号码的比较<br>
          6. <strong>命中详情：</strong>显示每期的具体命中情况（✓命中 ✗未命中 -无推荐数据）<br>
          7. 可以切换不同位置查看对应的统计结果
        </p>
      </div>
    </div>
  `;
  
  // 在现有内容后添加
  resultDiv.innerHTML += html;
}

// 导出推荐分析结果
function exportRecommendAnalysis(analysisResults, recommendData, lotteryType) {
  // 这里可以实现导出功能
  alert('导出功能待实现');
}

// ==================== 20区间分析功能 ====================

// 20区间分析相关变量
let currentTwentyRangeType = 'am';
let currentTwentyRangePosition = 1;

// 初始化20区间分析页面
function initTwentyRangeAnalysis() {
  // 彩种选择按钮事件
  document.querySelectorAll('.twenty-range-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.twenty-range-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentTwentyRangeType = this.dataset.type;
    });
  });

  // 位置选择按钮事件
  document.querySelectorAll('.position-select-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.position-select-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentTwentyRangePosition = parseInt(this.dataset.position);
    });
  });

  // 开始分析按钮事件
  const startBtn = document.getElementById('start20RangeAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      loadTwentyRangeAnalysis(currentTwentyRangeType, currentTwentyRangePosition);
    });
  }
}

// 第7个号码区间分析相关函数
function initSeventhRangeAnalysis() {
  // 彩种选择按钮事件
  document.querySelectorAll('.seventh-range-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.seventh-range-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentSeventhRangeType = this.dataset.type;
    });
  });

  // 开始分析按钮事件
  const startBtn = document.getElementById('startSeventhRangeAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      loadSeventhRangeAnalysis(currentSeventhRangeType);
    });
  }
}

// 第二个号码四肖：页面初始化与加载
function initSecondFourxiaoAnalysis() {
  document.querySelectorAll('.seventh-range-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.seventh-range-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      window.currentSeventhRangeType = this.dataset.type;
    });
  });
  // 位置选择高亮
  const posContainer = document.getElementById('secondFourxiaoPositions');
  if (posContainer) {
    posContainer.querySelectorAll('.pos-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        posContainer.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        window.secondFourxiaoPos = parseInt(this.dataset.pos, 10) || 2;
      });
    });
  }
  const startBtn = document.getElementById('startSecondFourxiaoAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      window.secondFourxiaoPage = 1;
      loadSecondFourxiaoAnalysis(window.currentSeventhRangeType || 'am', window.secondFourxiaoPos || 2, window.secondFourxiaoPage || 1, 30);
    });
  }
}

async function loadSecondFourxiaoAnalysis(lotteryType, position, page = 1, pageSize = 30) {
  const resultDiv = document.getElementById('secondFourxiaoResult');
  const statsDiv = document.getElementById('secondFourxiaoStats');
  if (!resultDiv) return;
  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在分析第二个号码四肖...</div>';
  if (statsDiv) statsDiv.style.display = 'none';
  try {
    const res = await fetch(`${window.BACKEND_URL}/api/second_number_fourxiao?lottery_type=${lotteryType}&position=${position}&page=${page}&page_size=${pageSize}`);
    const data = await res.json();
    if (!data.success) {
      resultDiv.innerHTML = `<div style="color:red;text-align:center;padding:20px;">分析失败：${data.message}</div>`;
      return;
    }
    window.secondFourxiaoPage = data.data.page || page;
    window.secondFourxiaoTotalPages = data.data.total_pages || 1;
    window.secondFourxiaoLotteryType = lotteryType;
    window.secondFourxiaoPosition = position;
    renderSecondFourxiao(data.data);
  } catch (e) {
    resultDiv.innerHTML = `<div style="color:red;text-align:center;padding:20px;">分析异常：${e.message}</div>`;
  }
}

function renderSecondFourxiao(data) {
  const resultDiv = document.getElementById('secondFourxiaoResult');
  const statsDiv = document.getElementById('secondFourxiaoStats');
  if (!resultDiv) return;
  const { results, total_triggers, hit_count, hit_rate, page, total_pages, page_size } = data || {};
  const pagerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="secondFourxiaoPrev" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id="secondFourxiaoNext" class="btn-secondary" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="secondFourxiaoExport" class="btn-secondary">导出CSV</button>
      </div>
    </div>
  `;
  let html = `
    ${pagerHtml}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>触发期数</th>
            <th>开奖时间</th>
            <th>基础位置</th>
            <th>基础号码</th>
            <th>生成16码</th>
            <th>窗口期(后5期)</th>
            <th>窗口第7码</th>
            <th>是否命中</th>
            <th>命中期</th>
          </tr>
        </thead>
        <tbody>
  `;
  (results || []).forEach(r => {
    const rangeStr = (r.generated_numbers || []).join(', ');
    const winStr = (r.window_periods || []).join(', ');
    const win7Str = (r.window_seventh_numbers || []).map(x => x == null ? '-' : String(x).padStart(2, '0')).join(', ');
    html += `
      <tr>
        <td>${r.current_period}</td>
        <td>${r.current_open_time}</td>
        <td>${r.base_position || 2}</td>
        <td>${String(r.current_base ?? r.current_second).padStart(2, '0')}</td>
        <td><div style="max-width:380px;overflow-x:auto;white-space:nowrap;">${rangeStr}</div></td>
        <td>${winStr}</td>
        <td>${win7Str}</td>
        <td class="${r.is_hit ? 'hit' : 'miss'}">${r.is_hit ? '命中' : '遗漏'}</td>
        <td>${r.hit_period || '-'}</td>
      </tr>
    `;
  });
  html += `</tbody></table></div>${pagerHtml}`;
  resultDiv.innerHTML = html;
  if (statsDiv) {
    document.getElementById('secondFourxiaoTotal').textContent = String(total_triggers || 0);
    document.getElementById('secondFourxiaoHitCount').textContent = String(hit_count || 0);
    document.getElementById('secondFourxiaoHitRate').textContent = String((hit_rate || 0) + '%');
    statsDiv.style.display = 'block';
  }

  // 绑定分页与导出
  const prevBtn = document.getElementById('secondFourxiaoPrev');
  const nextBtn = document.getElementById('secondFourxiaoNext');
  const exportBtn = document.getElementById('secondFourxiaoExport');
  if (prevBtn) {
    prevBtn.addEventListener('click', function(){
      if ((page || 1) > 1) {
        loadSecondFourxiaoAnalysis(window.secondFourxiaoLotteryType || 'am', window.secondFourxiaoPosition || 2, (page - 1), page_size || 30);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function(){
      if (page < total_pages) {
        loadSecondFourxiaoAnalysis(window.secondFourxiaoLotteryType || 'am', window.secondFourxiaoPosition || 2, (page + 1), page_size || 30);
      }
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', function(){
      const lt = window.secondFourxiaoLotteryType || 'am';
      const pos = window.secondFourxiaoPosition || 2;
      const url = `${window.BACKEND_URL}/api/second_number_fourxiao?lottery_type=${lt}&position=${pos}&export=csv`;
      window.open(url, '_blank');
    });
  }
}

// 初始化第6个号码3肖分析
function initSixthThreexiaoAnalysis() {
  // 彩种选择
  const typeBtns = document.querySelectorAll('#sixthThreexiaoPage .seventh-range-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const lotteryType = this.getAttribute('data-type');
      window.currentSixthThreexiaoType = lotteryType;
    });
  });

  // 位置选择
  const posBtns = document.querySelectorAll('#sixthThreexiaoPage .pos-btn');
  posBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      posBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const position = parseInt(this.getAttribute('data-pos'));
      window.sixthThreexiaoPos = position;
    });
  });

  // 开始分析按钮
  const startBtn = document.getElementById('startSixthThreexiaoAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      const lotteryType = window.currentSixthThreexiaoType || 'am';
      const position = window.sixthThreexiaoPos || 6;
      window.sixthThreexiaoPage = 1;
      loadSixthThreexiaoAnalysis(lotteryType, position, window.sixthThreexiaoPage || 1, 30);
    });
  }

  // 设置默认值
  window.currentSixthThreexiaoType = 'am';
  window.sixthThreexiaoPos = 6;
}

// 加载第6个号码3肖分析数据
async function loadSixthThreexiaoAnalysis(lotteryType, position, page = 1, pageSize = 30) {
  const resultDiv = document.getElementById('sixthThreexiaoResult');
  const statsDiv = document.getElementById('sixthThreexiaoStats');
  
  if (!resultDiv) return;
  
  try {
    resultDiv.innerHTML = '<p>正在加载分析数据...</p>';
    const response = await fetch(`${window.BACKEND_URL}/api/sixth_number_threexiao?lottery_type=${lotteryType}&position=${position}&page=${page}&page_size=${pageSize}`);
    const result = await response.json();
    
    if (result.success) {
      window.sixthThreexiaoPage = result.data.page || page;
      window.sixthThreexiaoTotalPages = result.data.total_pages || 1;
      window.sixthThreexiaoLotteryType = lotteryType;
      window.sixthThreexiaoPosition = position;
      renderSixthThreexiao(result.data, resultDiv, statsDiv);
    } else {
      resultDiv.innerHTML = `<p style="color: red;">加载失败: ${result.message}</p>`;
    }
  } catch (error) {
    console.error('加载第6个号码3肖分析失败:', error);
    resultDiv.innerHTML = '<p style="color: red;">加载失败，请检查网络连接</p>';
  }
}
// 渲染第6个号码3肖分析结果
function renderSixthThreexiao(data, resultDiv, statsDiv) {
  const { results, total_analysis, hit_count, hit_rate, current_miss, max_miss, history_max_miss, base_position, page, total_pages, page_size } = data;
  const pagerHtml = `
    <div style=\"display:flex;justify-content:space-between;align-items:center;margin:10px 0;\">
      <div>
        <button id=\"sixthThreexiaoPrev\" class=\"btn-secondary\" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style=\"margin:0 8px;\">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id=\"sixthThreexiaoNext\" class=\"btn-secondary\" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id=\"sixthThreexiaoExport\" class=\"btn-secondary\">导出CSV</button>
      </div>
    </div>
  `;
  
  let html = `
    ${pagerHtml}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>期号</th>
            <th>开奖时间</th>
            <th>基础位置</th>
            <th>基础号码</th>
            <th>生成号码</th>
            <th>下一期期号</th>
            <th>下一期第7个号码</th>
            <th>命中状态</th>
            <th>当前遗漏</th>
            <th>最大遗漏</th>
            <th>历史最大遗漏</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  results.forEach(item => {
    const hitStatus = item.is_hit ? '<span style="color: #27ae60; font-weight: bold;">命中</span>' : '<span style="color: #e74c3c; font-weight: bold;">遗漏</span>';
    const generatedNums = item.generated_numbers.join(', ');
    
    html += `
      <tr>
        <td>${item.current_period}</td>
        <td>${item.current_open_time}</td>
        <td>第${item.base_position}位</td>
        <td>${item.current_base}</td>
        <td style="font-size: 12px; max-width: 200px; word-wrap: break-word;">${generatedNums}</td>
        <td>${item.next_period}</td>
        <td>${item.next_seventh || '-'}</td>
        <td>${hitStatus}</td>
        <td>${item.current_miss}</td>
        <td>${item.max_miss}</td>
        <td>${item.history_max_miss}</td>
      </tr>
    `;
  });
  
  html += `</tbody></table></div>${pagerHtml}`;
  resultDiv.innerHTML = html;
  
  if (statsDiv) {
    document.getElementById('sixthThreexiaoTotal').textContent = String(total_analysis || 0);
    document.getElementById('sixthThreexiaoHitCount').textContent = String(hit_count || 0);
    document.getElementById('sixthThreexiaoHitRate').textContent = String((hit_rate || 0) + '%');
    document.getElementById('sixthThreexiaoCurrentMiss').textContent = String(current_miss || 0);
    document.getElementById('sixthThreexiaoMaxMiss').textContent = String(max_miss || 0);
    document.getElementById('sixthThreexiaoHistoryMaxMiss').textContent = String(history_max_miss || 0);
    statsDiv.style.display = 'block';
  }

  // 绑定分页与导出
  const prevBtn = document.getElementById('sixthThreexiaoPrev');
  const nextBtn = document.getElementById('sixthThreexiaoNext');
  const exportBtn = document.getElementById('sixthThreexiaoExport');
  if (prevBtn) {
    prevBtn.addEventListener('click', function(){
      if ((page || 1) > 1) {
        loadSixthThreexiaoAnalysis(window.sixthThreexiaoLotteryType || 'am', window.sixthThreexiaoPosition || 6, (page - 1), page_size || 30);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function(){
      if (page < total_pages) {
        loadSixthThreexiaoAnalysis(window.sixthThreexiaoLotteryType || 'am', window.sixthThreexiaoPosition || 6, (page + 1), page_size || 30);
      }
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', function(){
      const lt = window.sixthThreexiaoLotteryType || 'am';
      const pos = window.sixthThreexiaoPosition || 6;
      const url = `${window.BACKEND_URL}/api/sixth_number_threexiao?lottery_type=${lt}&position=${pos}&export=csv`;
      window.open(url, '_blank');
    });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  initSecondFourxiaoAnalysis();
  initSixthThreexiaoAnalysis();
});

// 最大遗漏提醒
(function() {
  async function fetchMaxMissAlerts(threshold) {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/places_max_miss_alerts?threshold=${encodeURIComponent(threshold)}`);
      return await res.json();
    } catch (e) {
      console.error('获取最大遗漏提醒失败:', e);
      return { success: false, message: String(e) };
    }
  }

  function renderMaxMissAlerts(data) {
    const tbody = document.querySelector('#maxMissAlertTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || !data.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">暂无符合条件的关注点</td>`;
      tbody.appendChild(tr);
      return;
    }

    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.place_name || '-'}</td>
        <td>${item.description || ''}</td>
        <td>${item.current_miss ?? '-'}</td>
        <td>${item.max_miss ?? '-'}</td>
        <td>${item.gap ?? '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.loadMaxMissAlerts = async function(threshold) {
    const result = await fetchMaxMissAlerts(threshold);
    if (!result || !result.success) {
      console.error('最大遗漏提醒接口失败:', result && result.message);
      renderMaxMissAlerts([]);
      return;
    }
    renderMaxMissAlerts(result.data || []);
  };

  // 绑定刷新按钮
  setTimeout(() => {
    const refreshBtn = document.getElementById('refreshMaxMissBtn');
    if (refreshBtn) {
      refreshBtn.onclick = function() {
        const thresholdInput = document.getElementById('maxMissThreshold');
        const t = thresholdInput ? parseInt(thresholdInput.value || '0') || 0 : 0;
        window.loadMaxMissAlerts(t);
      };
    }
  }, 0);
})();
// 加载第7个号码区间分析数据
async function loadSeventhRangeAnalysis(lotteryType) {
  const resultDiv = document.getElementById('seventhRangeResult');
  const statsDiv = document.getElementById('seventhRangeStats');
  
  if (!resultDiv) return;
  
  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在分析第7个号码+1~+20区间数据...</div>';
  statsDiv.style.display = 'none';
  
  try {
    const page = window.seventhRangePage || 1;
    const pageSize = 30;
    const response = await fetch(`${window.BACKEND_URL}/api/seventh_number_range_analysis?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`);
    const data = await response.json();
    
    if (data.success) {
      window.seventhRangePage = data.data.page || page;
      window.seventhRangeTotalPages = data.data.total_pages || 1;
      window.seventhRangeLotteryType = lotteryType;
      renderSeventhRangeAnalysis(data.data);
      updateSeventhRangeStats(data.data);
    } else {
      resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">分析失败: ${data.message}</div>`;
    }
  } catch (error) {
    console.error('第7个号码区间分析失败:', error);
    resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">分析失败: ${error.message}</div>`;
  }
}

// 渲染第7个号码区间分析结果
function renderSeventhRangeAnalysis(data) {
  const resultDiv = document.getElementById('seventhRangeResult');
  if (!resultDiv) return;
  
  const { results, lottery_type, page, total_pages, page_size } = data;
  const pagerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="seventhRangePrev" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id="seventhRangeNext" class="btn-secondary" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="seventhRangeExport" class="btn-secondary">导出CSV</button>
      </div>
    </div>
  `;
  
  if (!results || results.length === 0) {
    resultDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无分析数据</div>';
    return;
  }

  // 取本次返回数据中的最新一期期号（用于当"后最近命中"为空时的差值计算）
  let latestPeriod = null;
  try {
    latestPeriod = results.reduce((maxVal, r) => {
      const p = parseInt((r && r.current_period) || '0', 10);
      return isNaN(p) ? maxVal : Math.max(maxVal, p);
    }, 0);
  } catch (e) {
    latestPeriod = null;
  }
  
  let html = `
    ${pagerHtml}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>当前期数</th>
            <th>开奖时间</th>
            <th>当前期第7个号码</th>
            <th>+1~+20区间</th>
            <th>下一期期数</th>
            <th>下一期第7个号码</th>
            <th>是否命中</th>
            <th>自本期起命中数</th>
            <th>自本期起遗漏数</th>
            <th>最大连续遗漏</th>
            <th>固定区间双向遗漏</th>
            <th>前最近命中</th>
            <th>后最近命中</th>
          <th>后最近命中-前最近命中</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  results.forEach(result => {
    const hitClass = result.is_hit ? 'hit' : 'miss';
    const hitText = result.is_hit ? '命中' : '遗漏';
    const rangeStr = result.range_numbers.join(', ');
    
    html += `
      <tr>
        <td>${result.current_period}</td>
        <td>${result.current_open_time}</td>
        <td><strong>${result.current_seventh.toString().padStart(2, '0')}</strong></td>
        <td style="font-size: 12px;">
          <div style="max-width: 380px; overflow-x: auto; white-space: nowrap;">${rangeStr}</div>
        </td>
        <td>${result.next_period}</td>
        <td><strong>${result.next_seventh.toString().padStart(2, '0')}</strong></td>
        <td class="${hitClass}">${hitText}</td>
        <td>${result.series_hit_count ?? 0}</td>
        <td>${result.series_total_miss ?? 0}</td>
        <td>${result.max_miss}</td>
        <td>${result.around_total_omission ?? ''}</td>
        <td>${result.around_prev_hit_period ?? '-'}</td>
        <td>${result.around_next_hit_period ?? '-'}</td>
        <td>${(() => {
          const prev = parseInt(result.around_prev_hit_period ?? '', 10);
          const next = result.around_next_hit_period != null ? parseInt(result.around_next_hit_period, 10) : null;
          if (!isNaN(prev)) {
            if (next != null && !isNaN(next)) {
              return (next - prev);
            }
            if (latestPeriod != null && !isNaN(latestPeriod)) {
              return (latestPeriod - prev);
            }
          }
          return '-';
        })()}</td>
      </tr>
    `;
  });
  
  html += `
        </tbody>
      </table>
    </div>
    ${pagerHtml}
  `;
  
  resultDiv.innerHTML = html;

  // 绑定分页与导出
  const prevBtn = document.getElementById('seventhRangePrev');
  const nextBtn = document.getElementById('seventhRangeNext');
  const exportBtn = document.getElementById('seventhRangeExport');
  if (prevBtn) {
    prevBtn.addEventListener('click', function(){
      if ((page || 1) > 1) {
        const lt = window.seventhRangeLotteryType || 'am';
        window.seventhRangePage = (page - 1);
        loadSeventhRangeAnalysis(lt);
      }
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', function(){
      if (page < total_pages) {
        const lt = window.seventhRangeLotteryType || 'am';
        window.seventhRangePage = (page + 1);
        loadSeventhRangeAnalysis(lt);
      }
    });
  }
  if (exportBtn) {
    exportBtn.addEventListener('click', function(){
      const lt = window.seventhRangeLotteryType || 'am';
      const url = `${window.BACKEND_URL}/api/seventh_number_range_analysis?lottery_type=${lt}&export=csv`;
      window.open(url, '_blank');
    });
  }
}

// 更新第7个号码区间分析统计信息
function updateSeventhRangeStats(data) {
  const statsDiv = document.getElementById('seventhRangeStats');
  if (!statsDiv) return;
  
  const { total_analysis, hit_count, hit_rate, current_miss, max_miss } = data || {};
  
  const el1 = document.getElementById('totalSeventhRangePeriods');
  const el2 = document.getElementById('seventhRangeHitCount');
  const el3 = document.getElementById('seventhRangeHitRate');
  const el4 = document.getElementById('seventhRangeCurrentMiss');
  const el5 = document.getElementById('seventhRangeMaxMiss');
  if (el1) el1.textContent = (total_analysis ?? 0).toString();
  if (el2) el2.textContent = (hit_count ?? 0).toString();
  if (el3) el3.textContent = ((hit_rate ?? 0) + '%').toString();
  if (el4) el4.textContent = (current_miss ?? 0).toString();
  if (el5) el5.textContent = (max_miss ?? 0).toString();
  
  statsDiv.style.display = 'block';
}

// 加载20区间分析数据
async function loadTwentyRangeAnalysis(lotteryType, position) {
  const resultDiv = document.getElementById('twentyRangeResult');
  const statsDiv = document.getElementById('twentyRangeStats');
  
  if (!resultDiv) return;
  
  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在分析20区间数据...</div>';
  statsDiv.style.display = 'none';
  
  try {
    const response = await fetch(`${window.BACKEND_URL}/api/twenty_range_analysis?lottery_type=${lotteryType}&position=${position}`);
    const data = await response.json();
    
    if (data.success) {
      renderTwentyRangeAnalysis(data.data);
      updateTwentyRangeStats(data.data);
    } else {
      resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">分析失败: ${data.message}</div>`;
    }
  } catch (error) {
    console.error('20区间分析失败:', error);
    resultDiv.innerHTML = `<div style="color: red; text-align: center; padding: 20px;">分析失败: ${error.message}</div>`;
  }
}

// 渲染20区间分析结果
function renderTwentyRangeAnalysis(data) {
  const resultDiv = document.getElementById('twentyRangeResult');
  if (!resultDiv) return;
  
  const { analysis_results, lottery_type, position, description } = data;
  
  let html = `
    <div style="margin-bottom: 20px;">
      <h3>20区间分析结果</h3>
      <p style="color: #666; margin: 10px 0;">${description}</p>
      <p style="color: #666; margin: 10px 0;">彩种: ${lottery_type === 'am' ? '澳门' : '香港'} | 位置: 第${position}位</p>
    </div>
  `;
  
  if (analysis_results && analysis_results.length > 0) {
    html += `
      <div class="table-container">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="border: 1px solid #ddd; padding: 8px;">期号</th>
              <th style="border: 1px solid #ddd; padding: 8px;">开奖时间</th>
              <th style="border: 1px solid #ddd; padding: 8px;">开奖号码</th>
              <th style="border: 1px solid #ddd; padding: 8px;">第${position}位号码</th>
              <th style="border: 1px solid #ddd; padding: 8px;">20区间</th>
              <th style="border: 1px solid #ddd; padding: 8px;">当前遗漏</th>
              <th style="border: 1px solid #ddd; padding: 8px;">最大遗漏</th>
              <th style="border: 1px solid #ddd; padding: 8px;">历史最大遗漏</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    analysis_results.slice(0, 50).forEach(record => { // 只显示最近50期
      const posData = record.positions[position - 1];
      if (posData) {
        const rangeStr = posData.range_start <= posData.range_end 
          ? `${posData.range_start}~${posData.range_end}`
          : `${posData.range_start}~${posData.range_end}`;
        
        html += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.period}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.open_time}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${record.numbers.join(',')}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: #2980d9;">${posData.number}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${rangeStr}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: ${posData.current_miss > 10 ? '#e74c3c' : posData.current_miss > 5 ? '#f39c12' : '#27ae60'}; font-weight: bold;">${posData.current_miss}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #e74c3c; font-weight: bold;">${posData.max_miss}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #8e44ad; font-weight: bold;">${posData.historical_max_miss}</td>
          </tr>
        `;
      }
    });
    
    html += `
          </tbody>
        </table>
      </div>
    `;
  } else {
    html += '<div style="text-align: center; color: #888; padding: 20px;">没有找到分析数据</div>';
  }
  
  resultDiv.innerHTML = html;
}

// 更新20区间分析统计信息
function updateTwentyRangeStats(data) {
  const statsDiv = document.getElementById('twentyRangeStats');
  if (!statsDiv || !data.analysis_results) return;
  
  const results = data.analysis_results;
  const totalPeriods = results.length;
  
  // 计算统计信息
  let totalCurrentMiss = 0;
  let totalMaxMiss = 0;
  let totalHistoricalMaxMiss = 0;
  let maxCurrentMiss = 0;
  let maxMaxMiss = 0;
  let maxHistoricalMaxMiss = 0;
  
  results.forEach(record => {
    const posData = record.positions[data.position - 1];
    if (posData) {
      totalCurrentMiss += posData.current_miss;
      totalMaxMiss += posData.max_miss;
      totalHistoricalMaxMiss += posData.historical_max_miss;
      
      maxCurrentMiss = Math.max(maxCurrentMiss, posData.current_miss);
      maxMaxMiss = Math.max(maxMaxMiss, posData.max_miss);
      maxHistoricalMaxMiss = Math.max(maxHistoricalMaxMiss, posData.historical_max_miss);
    }
  });
  
  const avgCurrentMiss = totalPeriods > 0 ? (totalCurrentMiss / totalPeriods).toFixed(2) : 0;
  const avgMaxMiss = totalPeriods > 0 ? (totalMaxMiss / totalPeriods).toFixed(2) : 0;
  const avgHistoricalMaxMiss = totalPeriods > 0 ? (totalHistoricalMaxMiss / totalPeriods).toFixed(2) : 0;
  
  // 更新统计显示
  document.getElementById('total20RangePeriods').textContent = totalPeriods;
  document.getElementById('twentyRangeHitCount').textContent = totalPeriods;
  document.getElementById('twentyRangeMissCount').textContent = totalCurrentMiss;
  document.getElementById('twentyRangeHitRate').textContent = '100%';
  
  // 添加更多统计信息
  let statsHtml = `
    <div class="stats-section">
      <h3 class="stats-title">总体统计</h3>
      <div class="stats-grid">
        <div class="stats-item">
          <span class="stats-label">总期数：</span>
          <span class="stats-value">${totalPeriods}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">平均当前遗漏：</span>
          <span class="stats-value">${avgCurrentMiss}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">平均最大遗漏：</span>
          <span class="stats-value">${avgMaxMiss}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">平均历史最大遗漏：</span>
          <span class="stats-value">${avgHistoricalMaxMiss}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">最高当前遗漏：</span>
          <span class="stats-value" style="color: #e74c3c;">${maxCurrentMiss}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">最高最大遗漏：</span>
          <span class="stats-value" style="color: #e74c3c;">${maxMaxMiss}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">最高历史最大遗漏：</span>
          <span class="stats-value" style="color: #8e44ad;">${maxHistoricalMaxMiss}</span>
        </div>
      </div>
    </div>
  `;
  
  statsDiv.innerHTML = statsHtml;
  statsDiv.style.display = 'block';
}

// 页面加载完成后初始化20区间分析
document.addEventListener('DOMContentLoaded', function() {
  initTwentyRangeAnalysis();
  initSeventhRangeAnalysis();
});
// ==================== 采集源头选择功能 ====================
// 初始化采集源头选择功能
function initCollectSourceSelection() {
  // 源头选择按钮事件
  document.querySelectorAll('.source-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // 移除所有按钮的active类
      document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
      // 给当前按钮添加active类
      this.classList.add('active');
      
      const source = this.dataset.source;
      
      // 根据选择的源头显示/隐藏对应的按钮组
      const defaultButtons = document.getElementById('defaultSourceButtons');
      const wenlongzhuButtons = document.getElementById('wenlongzhuSourceButtons');
      
      if (source === 'default') {
        defaultButtons.style.display = 'block';
        wenlongzhuButtons.style.display = 'none';
      } else if (source === 'wenlongzhu') {
        defaultButtons.style.display = 'none';
        wenlongzhuButtons.style.display = 'block';
      }
    });
  });
}

// 页面加载完成后初始化采集源头选择
document.addEventListener('DOMContentLoaded', function() {
  initCollectSourceSelection();
});

// 推荐16码功能已移至 recommend16.js 文件中