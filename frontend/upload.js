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
  let html = `<h3>${title}</h3><table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;">
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

  // 在十位分析页面顶部添加美化后的阀值输入框
  let thresholdHtml = '<div style="margin-bottom:14px;display:flex;align-items:center;gap:10px;">';
  thresholdHtml += '<label for="tensThresholdInput" style="font-weight:bold;font-size:15px;color:#2980d9;">遗漏高亮阀值：</label>';
  thresholdHtml += '<input type="number" id="tensThresholdInput" value="' + (window.tensThreshold || 12) + '" min="1" max="99" style="width:70px;height:32px;font-size:16px;border:1px solid #b5c6e0;border-radius:6px;padding:0 10px;outline:none;transition:border 0.2s;box-shadow:0 1px 2px #f0f4fa;">';
  thresholdHtml += '</div>';

  let html = thresholdHtml + yearBtnsHtml + infoBox;
  html += '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
  html += '<tr><th>期号</th><th>开奖号码</th>';
  tensCols.forEach(col => html += `<th>${col}</th>`);
  html += '</tr>';
  // 不再按年份过滤，只高亮所选年份
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
  if (page > 1) document.getElementById('tensPrevPage').onclick = () => queryRecords(areaId, data.page - 1);
  if (page < totalPages) document.getElementById('tensNextPage').onclick = () => queryRecords(areaId, data.page + 1);
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

// 3. 页面切换逻辑
const pageMap = {
  menuCollectBtn: 'collectPage',
  menuRecordsBtn: 'recordsPage',
  menuRecommendBtn: 'recommendPage',
  menuTensBtn: 'tensPage',
  menuUnitsBtn: 'unitsPage',
  menuRangeBtn: 'rangePage',
};
Object.keys(pageMap).forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', function() {
      // 菜单高亮
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // 页面切换
      Object.values(pageMap).forEach(pid => {
        const page = document.getElementById(pid);
        if (page) page.style.display = 'none';
      });
      document.getElementById(pageMap[id]).style.display = '';
      // 标题切换
      const titleMap = {
        collectPage: '数据采集',
        recordsPage: '开奖记录',
        recommendPage: '推荐8码',
        tensPage: '第N位十位分析',
        unitsPage: '第N个码个位分析',
        rangePage: '+1~+20区间分析',
      };
      document.getElementById('pageTitle').innerText = titleMap[pageMap[id]] || '';
      // 自动加载数据
      switch (id) {
        case 'menuCollectBtn':
          // 采集页面，清空结果
          const collectResult = document.getElementById('collectResult');
          if (collectResult) collectResult.innerHTML = '';
          break;
        case 'menuRecordsBtn':
          queryRecords('recordsTableAreaAm', 1);
          queryRecords('recordsTableAreaHk', 1);
          break;
        case 'menuRecommendBtn':
          // 获取当前选中的彩种
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
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis();
          break;
      }
    });
  }
});

// 4. 菜单按钮事件
// 修复左侧菜单按钮切换事件，保证每个按钮都能切换页面和高亮
const menuBtnMap = [
  {id: 'menuCollectBtn', page: 'collect'},
  {id: 'menuRecordsBtn', page: 'records'},
  {id: 'menuRecommendBtn', page: 'recommend'},
  {id: 'menuTensBtn', page: 'tens'},
  {id: 'menuUnitsBtn', page: 'units'}
];
menuBtnMap.forEach(item => {
  const btn = document.getElementById(item.id);
  if (btn) {
    btn.onclick = function() {
      // 统一页面切换和高亮逻辑，避免showPage未定义
      document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pageMap = {
        menuCollectBtn: 'collectPage',
        menuRecordsBtn: 'recordsPage',
        menuRecommendBtn: 'recommendPage',
        menuTensBtn: 'tensPage',
        menuUnitsBtn: 'unitsPage',
        menuRangeBtn: 'rangePage',
      };
      Object.values(pageMap).forEach(pid => {
        const page = document.getElementById(pid);
        if (page) page.style.display = 'none';
      });
      document.getElementById(pageMap[item.id]).style.display = '';
      // 标题切换
      const titleMap = {
        collectPage: '数据采集',
        recordsPage: '开奖记录',
        recommendPage: '推荐8码',
        tensPage: '第N位十位分析',
        unitsPage: '第N个码个位分析',
        rangePage: '+1~+20区间分析',
      };
      document.getElementById('pageTitle').innerText = titleMap[pageMap[item.id]] || '';
      // 自动加载数据
      switch (item.id) {
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
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1);
          break;
      }
    };
  }
});

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
        predictHtml = `<div style=\"margin-bottom:16px;padding:10px 16px;border:2px solid #d35400;border-radius:10px;background:#fffbe9;\">` +
          `<div style=\"font-size:17px;font-weight:bold;color:#d35400;margin-bottom:6px;\">${data.predict.desc || '最新一期预测'}</div>`;
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
              `<span style=\"color:#c0392b;\">最大遗漏: <b>${maxMiss}</b></span> ` +
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
      let html = lastOpenHtml + predictHtml + missHtml + '<table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">';
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

// 分析推荐收放按钮事件
setTimeout(() => {
  const toggleBtn = document.getElementById('toggleSidebarBtn');
  const menuDiv = document.getElementById('sidebarMenuBtns');
  if (toggleBtn && menuDiv) {
    toggleBtn.onclick = function() {
      if (menuDiv.style.display === 'none') {
        menuDiv.style.display = '';
        toggleBtn.innerText = '分析推荐 ▼';
      } else {
        menuDiv.style.display = 'none';
        toggleBtn.innerText = '分析推荐 ▲';
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
    .units-year-btn, .tens-year-btn, .units-type-btn, .tens-type-btn, .units-pos-btn, .tens-pos-btn, .recommend-type-btn {
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
    .units-year-btn.active, .tens-year-btn.active, .units-type-btn.active, .tens-type-btn.active, .units-pos-btn.active, .tens-pos-btn.active, .recommend-type-btn.active {
      background: #2980d9 !important;
      color: #fff !important;
      border-color: #2980d9;
      font-weight: bold;
      box-shadow: 0 2px 8px #e3eaf7;
    }
  `;
  document.head.appendChild(style);
})(); 