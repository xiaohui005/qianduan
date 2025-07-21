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
    if (!data.recommend || data.recommend.length === 0) {
      resultDiv.innerHTML = '<span style="color:red;">暂无推荐结果</span>';
      return;
    }
    let html = `<div style='color:#2980d9;font-size:15px;margin-bottom:8px;'>
      推荐基于期号：${data.latest_period}<br>
      <small style="color:#555;">本推荐基于近50期历史开奖数据，统计出现频率和平均间隔，优先选择每5期左右出现一次且近期活跃的号码。<br>本推荐适用于期号${data.latest_period}及其后1~5期，直到下一个0或5结尾期号自动生成新推荐。</small>
    </div>`;
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

// 页面切换时自动生成推荐
function showPage(page) {
  const collectPage = document.getElementById('collectPage');
  const recordsPage = document.getElementById('recordsPage');
  const recommendPage = document.getElementById('recommendPage');
  const menuCollectBtn = document.getElementById('menuCollectBtn');
  const menuRecordsBtn = document.getElementById('menuRecordsBtn');
  const menuRecommendBtn = document.getElementById('menuRecommendBtn');
  const pageTitle = document.getElementById('pageTitle');

  if (collectPage) collectPage.style.display = page === 'collect' ? 'block' : 'none';
  if (recordsPage) recordsPage.style.display = page === 'records' ? 'block' : 'none';
  if (recommendPage) recommendPage.style.display = page === 'recommend' ? 'block' : 'none';
  if (menuCollectBtn) menuCollectBtn.classList.toggle('active', page === 'collect');
  if (menuRecordsBtn) menuRecordsBtn.classList.toggle('active', page === 'records');
  if (menuRecommendBtn) menuRecommendBtn.classList.toggle('active', page === 'recommend');
  if (pageTitle) pageTitle.innerText =
    page === 'collect' ? '数据采集' :
    page === 'records' ? '开奖结果' :
    page === 'recommend' ? '推荐8码' : '';
  if (page === 'recommend') generateRecommend();
}

document.getElementById('menuCollectBtn').addEventListener('click', function() { showPage('collect'); });
document.getElementById('menuRecordsBtn').addEventListener('click', function() { showPage('records'); });
document.getElementById('menuRecommendBtn').addEventListener('click', function() {
  const recommendPage = document.getElementById('recommendPage');
  if (recommendPage) {
    showPage('recommend');
  }
});
// 默认显示采集页
showPage('collect');

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