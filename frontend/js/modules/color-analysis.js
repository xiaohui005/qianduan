/**
 * 波色分析模块
 * 负责波色分析、统计和可视化展示
 */

// ==================== 波色分析功能 ====================

// 全局状态变量
let currentColorType = 'am';
let currentColorAnalysisResults = [];
let currentColorAnalysisPage = 1;

// 波色定义
const colorGroups = {
  red: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  blue: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  green: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
};

/**
 * 格式化日期时间
 */
function formatColorAnalysisDateTime(datetime) {
  if (!datetime) return '-';
  const d = new Date(datetime);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * 获取号码所属的波色组
 */
function getNumberColorGroup(number) {
  if (colorGroups.red.includes(number)) return 'red';
  if (colorGroups.blue.includes(number)) return 'blue';
  if (colorGroups.green.includes(number)) return 'green';
  return null;
}

/**
 * 获取波色组名称
 */
function getColorGroupName(colorGroup) {
  switch (colorGroup) {
    case 'red': return '红波';
    case 'blue': return '蓝波';
    case 'green': return '绿波';
    default: return '未知';
  }
}

/**
 * 获取波色组样式
 */
function getColorGroupStyle(colorGroup) {
  switch (colorGroup) {
    case 'red': return 'color: #e74c3c; font-weight: bold;';
    case 'blue': return 'color: #3498db; font-weight: bold;';
    case 'green': return 'color: #27ae60; font-weight: bold;';
    default: return '';
  }
}

/**
 * 加载波色分析数据
 */
async function loadColorAnalysis(type = 'am') {
  console.log(`开始加载波色分析数据: ${type}`);

  const resultDiv = document.getElementById('colorAnalysisResult');
  if (!resultDiv) {
    console.error('找不到colorAnalysisResult元素');
    return;
  }

  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在加载波色分析数据...</div>';

  try {
    const response = await fetch(`${window.BACKEND_URL}/color_analysis?lottery_type=${type}`);
    const data = await response.json();

    if (data.success && data.analysis_results) {
      console.log('波色分析数据加载成功:', data);
      currentColorAnalysisResults = performColorAnalysis(data.analysis_results);
      currentColorType = type;
      currentColorAnalysisPage = 1;
      renderColorAnalysisTable(currentColorAnalysisResults, 1);
      showColorAnalysisStats(currentColorAnalysisResults);
    } else {
      resultDiv.innerHTML = '<div style="text-align:center;color:red;padding:20px;">加载失败：' + (data.message || '未知错误') + '</div>';
    }
  } catch (error) {
    console.error('波色分析加载失败:', error);
    resultDiv.innerHTML = '<div style="text-align:center;color:red;padding:20px;">加载失败：' + error.message + '</div>';
  }
}

/**
 * 执行波色分析
 * 分析每期第2个号码的波色，与下一期第7个号码的波色进行对比
 */
function performColorAnalysis(records) {
  console.log('开始执行波色分析，记录数:', records.length);

  const results = [];

  for (let i = 0; i < records.length - 1; i++) {
    const currentRecord = records[i];
    const nextRecord = records[i + 1];

    // 验证是否是连续期数
    if (!isConsecutivePeriods(currentRecord.period, nextRecord.period)) {
      console.log(`期数${currentRecord.period}和${nextRecord.period}不连续，跳过`);
      continue;
    }

    const currentNumbers = currentRecord.numbers.split(',').map(n => parseInt(n.trim()));
    const nextNumbers = nextRecord.numbers.split(',').map(n => parseInt(n.trim()));

    const currentSecond = currentNumbers[1]; // 第2个号码
    const nextSeventh = nextNumbers[6]; // 下一期第7个号码

    const currentSecondColor = getNumberColorGroup(currentSecond);
    const nextSeventhColor = getNumberColorGroup(nextSeventh);

    results.push({
      currentPeriod: currentRecord.period,
      currentOpenTime: currentRecord.open_time,
      currentNumbers: currentNumbers,
      currentSecond: currentSecond,
      currentSecondColor: currentSecondColor,
      currentSecondColorName: getColorGroupName(currentSecondColor),
      nextPeriod: nextRecord.period,
      nextOpenTime: nextRecord.open_time,
      nextNumbers: nextNumbers,
      nextSeventh: nextSeventh,
      nextSeventhColor: nextSeventhColor,
      nextSeventhColorName: getColorGroupName(nextSeventhColor),
      isHit: currentSecondColor === nextSeventhColor
    });
  }

  console.log('波色分析完成，结果数:', results.length);
  return results;
}

/**
 * 验证两个期数是否连续
 */
function isConsecutivePeriods(period1, period2) {
  const p1 = parseInt(period1);
  const p2 = parseInt(period2);
  return p2 === p1 + 1;
}

/**
 * 渲染波色分析表格
 */
function renderColorAnalysisTable(results, page = 1) {
  const resultDiv = document.getElementById('colorAnalysisResult');
  if (!resultDiv) return;

  const pageSize = 20;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, results.length);
  const pageResults = results.slice(startIndex, endIndex);
  const totalPages = Math.ceil(results.length / pageSize);

  let html = `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #2980d9;">波色分析结果</h3>
      <p style="color: #666;">分析规则：当前期第2个号码的波色与下一期第7个号码的波色对比</p>
      <p style="color: #666;">
        <span style="color: #e74c3c; font-weight: bold;">红波</span>: ${colorGroups.red.join(', ')}
        <br>
        <span style="color: #3498db; font-weight: bold;">蓝波</span>: ${colorGroups.blue.join(', ')}
        <br>
        <span style="color: #27ae60; font-weight: bold;">绿波</span>: ${colorGroups.green.join(', ')}
      </p>
    </div>

    <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <button id="prevColorPage" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin: 0 10px;">第 ${page} / ${totalPages} 页</span>
        <button id="nextColorPage" class="btn-secondary" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="exportColorAnalysisBtn" class="btn-secondary">导出CSV</button>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>当前期数</th>
            <th>开奖时间</th>
            <th>开奖号码</th>
            <th>第2个号码</th>
            <th>第2个号码波色</th>
            <th>下一期期数</th>
            <th>下一期开奖时间</th>
            <th>下一期开奖号码</th>
            <th>下一期第7个号码</th>
            <th>下一期第7个号码波色</th>
            <th>波色是否一致</th>
          </tr>
        </thead>
        <tbody>
  `;

  pageResults.forEach(result => {
    const hitClass = result.isHit ? 'hit' : 'miss';
    const hitText = result.isHit ? '一致' : '不一致';

    html += `
      <tr>
        <td>${result.currentPeriod}</td>
        <td>${formatColorAnalysisDateTime(result.currentOpenTime)}</td>
        <td>${result.currentNumbers.map(n => String(n).padStart(2, '0')).join(', ')}</td>
        <td style="font-weight: bold; font-size: 16px;">${String(result.currentSecond).padStart(2, '0')}</td>
        <td style="${getColorGroupStyle(result.currentSecondColor)}">${result.currentSecondColorName}</td>
        <td>${result.nextPeriod}</td>
        <td>${formatColorAnalysisDateTime(result.nextOpenTime)}</td>
        <td>${result.nextNumbers.map(n => String(n).padStart(2, '0')).join(', ')}</td>
        <td style="font-weight: bold; font-size: 16px;">${String(result.nextSeventh).padStart(2, '0')}</td>
        <td style="${getColorGroupStyle(result.nextSeventhColor)}">${result.nextSeventhColorName}</td>
        <td class="${hitClass}">${hitText}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>

    <div style="margin-top: 15px; text-align: center;">
      <button id="prevColorPageBottom" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
      <span style="margin: 0 10px;">第 ${page} / ${totalPages} 页</span>
      <button id="nextColorPageBottom" class="btn-secondary" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
    </div>
  `;

  resultDiv.innerHTML = html;

  // 绑定分页按钮事件
  const prevBtn = document.getElementById('prevColorPage');
  const nextBtn = document.getElementById('nextColorPage');
  const prevBtnBottom = document.getElementById('prevColorPageBottom');
  const nextBtnBottom = document.getElementById('nextColorPageBottom');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => changeColorAnalysisPage(page - 1));
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => changeColorAnalysisPage(page + 1));
  }
  if (prevBtnBottom) {
    prevBtnBottom.addEventListener('click', () => changeColorAnalysisPage(page - 1));
  }
  if (nextBtnBottom) {
    nextBtnBottom.addEventListener('click', () => changeColorAnalysisPage(page + 1));
  }

  // 绑定导出按钮
  const exportBtn = document.getElementById('exportColorAnalysisBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportColorAnalysis);
  }

  // 更新统计信息（针对当前页）
  updateColorAnalysisStats(results, pageResults);
}

/**
 * 显示波色分析统计信息
 */
function showColorAnalysisStats(results) {
  const statsDiv = document.getElementById('colorAnalysisStats');
  if (!statsDiv) return;

  const totalRecords = results.length;
  const hitRecords = results.filter(r => r.isHit).length;
  const missRecords = totalRecords - hitRecords;
  const hitRate = totalRecords > 0 ? ((hitRecords / totalRecords) * 100).toFixed(2) : '0.00';

  // 统计各波色组合的命中情况
  const colorCombinations = {
    'red-red': 0,
    'red-blue': 0,
    'red-green': 0,
    'blue-red': 0,
    'blue-blue': 0,
    'blue-green': 0,
    'green-red': 0,
    'green-blue': 0,
    'green-green': 0
  };

  results.forEach(r => {
    const key = `${r.currentSecondColor}-${r.nextSeventhColor}`;
    if (colorCombinations.hasOwnProperty(key)) {
      colorCombinations[key]++;
    }
  });

  let html = `
    <div class="stats-section">
      <h3 class="stats-title">波色分析统计</h3>
      <div class="stats-grid">
        <div class="stats-item">
          <span class="stats-label">总分析期数：</span>
          <span class="stats-value">${totalRecords}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">波色一致：</span>
          <span class="stats-value" style="color: #27ae60;">${hitRecords}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">波色不一致：</span>
          <span class="stats-value" style="color: #e74c3c;">${missRecords}</span>
        </div>
        <div class="stats-item">
          <span class="stats-label">一致率：</span>
          <span class="stats-value" style="color: #2980d9;">${hitRate}%</span>
        </div>
      </div>
    </div>

    <div class="stats-section" style="margin-top: 20px;">
      <h3 class="stats-title">波色组合统计</h3>
      <div class="table-container">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th>当前期第2个号码波色</th>
              <th>下一期第7个号码波色</th>
              <th>出现次数</th>
              <th>占比</th>
            </tr>
          </thead>
          <tbody>
  `;

  const combinations = [
    { key: 'red-red', current: '红波', next: '红波', style: 'color: #e74c3c;' },
    { key: 'red-blue', current: '红波', next: '蓝波', style: '' },
    { key: 'red-green', current: '红波', next: '绿波', style: '' },
    { key: 'blue-red', current: '蓝波', next: '红波', style: '' },
    { key: 'blue-blue', current: '蓝波', next: '蓝波', style: 'color: #3498db;' },
    { key: 'blue-green', current: '蓝波', next: '绿波', style: '' },
    { key: 'green-red', current: '绿波', next: '红波', style: '' },
    { key: 'green-blue', current: '绿波', next: '蓝波', style: '' },
    { key: 'green-green', current: '绿波', next: '绿波', style: 'color: #27ae60;' }
  ];

  combinations.forEach(combo => {
    const count = colorCombinations[combo.key];
    const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) : '0.00';
    html += `
      <tr>
        <td style="${combo.key.split('-')[0] === 'red' ? 'color: #e74c3c;' : combo.key.split('-')[0] === 'blue' ? 'color: #3498db;' : 'color: #27ae60;'}">${combo.current}</td>
        <td style="${combo.key.split('-')[1] === 'red' ? 'color: #e74c3c;' : combo.key.split('-')[1] === 'blue' ? 'color: #3498db;' : 'color: #27ae60;'}">${combo.next}</td>
        <td style="${combo.style}">${count}</td>
        <td>${percentage}%</td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  statsDiv.innerHTML = html;
  statsDiv.style.display = 'block';
}

/**
 * 更新波色分析统计信息（包含全部和当前页统计）
 */
function updateColorAnalysisStats(allResults, currentPageResults) {
  // 这个函数可以用于更新当前页的统计
  // 目前使用showColorAnalysisStats显示全部统计
}

/**
 * 绑定波色分析事件
 */
function bindColorAnalysisEvents() {
  // 彩种选择按钮
  const typeBtns = document.querySelectorAll('.color-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentColorType = this.dataset.type;
    });
  });

  // 开始分析按钮
  const startBtn = document.getElementById('startColorAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      loadColorAnalysis(currentColorType);
    });
  }

  // 导出按钮（在renderColorAnalysisTable中动态绑定）
}

/**
 * 导出波色分析结果
 */
function exportColorAnalysis() {
  if (!currentColorAnalysisResults || currentColorAnalysisResults.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  const url = `${window.BACKEND_URL}/color_analysis?lottery_type=${currentColorType}&export=csv`;
  window.open(url, '_blank');
}

/**
 * 初始化波色分析模块
 */
function initColorAnalysis() {
  console.log('初始化波色分析模块...');

  // 设置默认彩种
  currentColorType = 'am';

  // 绑定事件
  bindColorAnalysisEvents();

  // 显示初始提示
  const resultDiv = document.getElementById('colorAnalysisResult');
  if (resultDiv) {
    resultDiv.innerHTML = `
      <div style="text-align:center;color:#888;padding:40px;">
        <p style="font-size: 16px; margin-bottom: 20px;">选择彩种后点击"开始分析"按钮查看波色分析结果</p>
        <p style="color: #666;">
          <span style="color: #e74c3c; font-weight: bold;">红波</span>: ${colorGroups.red.join(', ')}
          <br>
          <span style="color: #3498db; font-weight: bold;">蓝波</span>: ${colorGroups.blue.join(', ')}
          <br>
          <span style="color: #27ae60; font-weight: bold;">绿波</span>: ${colorGroups.green.join(', ')}
        </p>
      </div>
    `;
  }

  console.log('波色分析模块初始化完成');
}

/**
 * 切换波色分析页码
 */
function changeColorAnalysisPage(page) {
  currentColorAnalysisPage = page;
  renderColorAnalysisTable(currentColorAnalysisResults, page);
}

/**
 * 显示最新预测结果（如果后端提供）
 */
function showLatestPrediction(prediction) {
  if (!prediction) return;

  const predictionDiv = document.getElementById('colorAnalysisPrediction');
  if (!predictionDiv) return;

  const { current_period, current_second, current_second_color, predicted_seventh_color } = prediction;

  let html = `
    <div style="padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3; margin-top: 20px;">
      <h4 style="color: #1976d2; margin: 0 0 10px 0;">📊 最新预测</h4>
      <p style="margin: 5px 0;">
        <strong>当前期数：</strong>${current_period}
        <br>
        <strong>当前期第2个号码：</strong><span style="font-weight: bold; font-size: 16px;">${String(current_second).padStart(2, '0')}</span>
        <br>
        <strong>当前期第2个号码波色：</strong><span style="${getColorGroupStyle(current_second_color)}">${getColorGroupName(current_second_color)}</span>
        <br>
        <strong>预测下一期第7个号码波色：</strong><span style="${getColorGroupStyle(predicted_seventh_color)}">${getColorGroupName(predicted_seventh_color)}</span>
      </p>
    </div>
  `;

  predictionDiv.innerHTML = html;
}

// 导出模块初始化函数
window.initColorAnalysis = initColorAnalysis;

// 导出模块对象
window.colorAnalysisModule = {
  loadColorAnalysis,
  exportColorAnalysis,
  changeColorAnalysisPage
};

console.log('波色分析模块已加载');
