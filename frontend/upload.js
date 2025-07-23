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
// 文件顶部只声明一次 pageMap，后续扩展直接复用
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
};
} else {
  pageMap.menuMinusRangeBtn = 'minusRangePage';
  pageMap.menuPlusMinus6Btn = 'plusMinus6Page';
}
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
        minusRangePage: '-1~-20区间分析',
        plusMinus6Page: '加减前6码分析',
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
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, '');
          break;
        case 'menuMinusRangeBtn':
          loadMinusRangeAnalysis(1);
          break;
        case 'menuPlusMinus6Btn':
          loadPlusMinus6Analysis();
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
  {id: 'menuUnitsBtn', page: 'units'},
  {id: 'menuRangeBtn', page: 'range'},
  {id: 'menuMinusRangeBtn', page: 'minusRange'},
  {id: 'menuPlusMinus6Btn', page: 'plusMinus6'},
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
        menuMinusRangeBtn: 'minusRangePage',
        menuPlusMinus6Btn: 'plusMinus6Page',
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
        minusRangePage: '-1~-20区间分析',
        plusMinus6Page: '加减前6码分析',
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
          if (typeof loadRangeAnalysis === 'function') loadRangeAnalysis(currentRangeType, currentRangeNextPos, 1, currentRangeYear);
          break;
        case 'menuMinusRangeBtn':
          loadMinusRangeAnalysis(1);
          break;
        case 'menuPlusMinus6Btn':
          loadPlusMinus6Analysis();
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
        case 'menuMinusRangeBtn':
          loadMinusRangeAnalysis(1);
          break;
        case 'menuPlusMinus6Btn':
          loadPlusMinus6Analysis();
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
  };
} else {
  pageMap.menuPlusMinus6Btn = 'plusMinus6Page';
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