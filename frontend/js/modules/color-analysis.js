/**
 * 波色分析模块
 * 负责波色分析、统计和可视化展示
 */

// ==================== 波色分析功能 ====================

const COLOR_GROUPS = {
  red: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  blue: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  green: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]
};

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

    if (data.success && data.data && data.data.analysis_results) {
      console.log('波色分析数据加载成功:', data);
      console.log('预测数据:', data.data.latest_prediction);

      // 后端已经完成分析，直接使用返回的结果，不需要再次分析
      currentColorAnalysisResults = data.data.analysis_results;
      currentColorType = type;
      currentColorAnalysisPage = 1;
      renderColorAnalysisTable(currentColorAnalysisResults, 1);
      showColorAnalysisStats(currentColorAnalysisResults);

      // 显示最新一期的预测
      if (data.data.latest_prediction) {
        console.log('调用 showLatestPrediction...');
        showLatestPrediction(data.data.latest_prediction);
      } else {
        console.warn('没有预测数据');
      }
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

  // 按期数倒序排列（最新的在前）
  const sortedResults = [...results].reverse();

  const pageSize = 20;
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedResults.length);
  const pageResults = sortedResults.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedResults.length / pageSize);

  let html = `
    <div style="margin-bottom: 20px;">
      <h3 style="color: #2980d9;">波色分析结果</h3>
      <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 4px solid #2980d9;">
        <p style="color: #666; margin: 5px 0;">
          <strong>分析规则：</strong>当前期开奖号码前6个排序后的第2个号码波色 与 下一期第7个号码波色对比
        </p>
        <p style="color: #666; margin: 5px 0;">
          <strong>当前错误次数：</strong>从最旧期开始累加，遇到"对"清零，遇到"错"累加1
        </p>
        <p style="color: #666; margin: 5px 0;">
          <strong>历史最大错误次数：</strong>记录从最旧期到当前期的最大连续错误次数
        </p>
      </div>
      <p style="color: #666; margin-top: 10px;">
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
            <th>当前期开奖号码</th>
            <th>第2个号码</th>
            <th>第2个号码波色</th>
            <th>下一期期数</th>
            <th>下一期第7个号码</th>
            <th>下一期第7个号码波色</th>
            <th>结果</th>
            <th>当前错误次数</th>
            <th>历史最大错误次数</th>
          </tr>
        </thead>
        <tbody>
  `;

  pageResults.forEach(result => {
    const hitClass = result.is_hit ? 'hit' : 'miss';
    const hitText = result.is_hit ? '对' : '错';
    const currentMiss = result.current_miss || 0;
    const maxMiss = result.max_miss || 0;

    // 当前错误次数的样式：错误次数越多，颜色越深
    let currentMissStyle = '';
    if (currentMiss > 0) {
      const opacity = Math.min(0.3 + currentMiss * 0.1, 1);
      currentMissStyle = `background-color: rgba(231, 76, 60, ${opacity}); color: white; font-weight: bold;`;
    }

    // 历史最大错误次数的样式
    let maxMissStyle = '';
    if (maxMiss > 0 && maxMiss === currentMiss) {
      maxMissStyle = `background-color: #e74c3c; color: white; font-weight: bold;`;
    }

    html += `
      <tr>
        <td>${result.current_period}</td>
        <td>${formatColorAnalysisDateTime(result.current_open_time)}</td>
        <td>${result.current_numbers.map(n => String(n).padStart(2, '0')).join(', ')}</td>
        <td style="font-weight: bold; font-size: 16px;">${String(result.second_number).padStart(2, '0')}</td>
        <td style="${getColorGroupStyle(result.second_color)}">${getColorGroupName(result.second_color)}</td>
        <td>${result.next_period}</td>
        <td style="font-weight: bold; font-size: 16px;">${String(result.next_seventh_number).padStart(2, '0')}</td>
        <td style="${getColorGroupStyle(result.next_seventh_color)}">${getColorGroupName(result.next_seventh_color)}</td>
        <td class="${hitClass}">${hitText}</td>
        <td style="${currentMissStyle}">${currentMiss}</td>
        <td style="${maxMissStyle}">${maxMiss}</td>
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
  const hitRecords = results.filter(r => r.is_hit).length;
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
    const key = `${r.second_color}-${r.next_seventh_color}`;
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
  console.log('[波色分析] 开始绑定事件...');

  // 彩种选择按钮
  const typeBtns = document.querySelectorAll('.color-type-btn');
  console.log('[波色分析] 找到彩种按钮数量:', typeBtns.length);

  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      console.log('[波色分析] 彩种按钮被点击:', this.dataset.type);
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentColorType = this.dataset.type;
      console.log('[波色分析] 当前彩种已切换为:', currentColorType);
    });
  });

  // 开始分析按钮
  const startBtn = document.getElementById('startColorAnalysisBtn');
  console.log('[波色分析] 找到开始分析按钮:', !!startBtn);

  if (startBtn) {
    startBtn.addEventListener('click', function() {
      console.log('[波色分析] 开始分析按钮被点击，当前彩种:', currentColorType);
      loadColorAnalysis(currentColorType);
    });
  } else {
    console.error('[波色分析] 找不到开始分析按钮');
  }

  console.log('[波色分析] 事件绑定完成');
}

/**
 * 导出波色分析结果
 */
function exportColorAnalysis() {
  if (!currentColorAnalysisResults || currentColorAnalysisResults.length === 0) {
    alert('没有可导出的数据');
    return;
  }

  // 使用window.location.href触发下载（更可靠）
  const url = `${window.BACKEND_URL}/color_analysis?lottery_type=${currentColorType}&export=csv`;
  window.location.href = url;
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

  // 显示初始提示（只在没有内容时显示）
  const resultDiv = document.getElementById('colorAnalysisResult');
  if (resultDiv && !resultDiv.querySelector('table')) {
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

  // 不清空预测显示，保持预测框
  const predictionDiv = document.getElementById('colorAnalysisPrediction');
  console.log('[波色分析] 预测框元素:', predictionDiv ? '存在' : '不存在');

  // 只在首次加载且没有数据时隐藏统计信息
  const statsDiv = document.getElementById('colorAnalysisStats');
  if (statsDiv && statsDiv.style.display !== 'block') {
    statsDiv.style.display = 'none';
  }

  console.log('[波色分析] 模块初始化完成');
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
  console.log('showLatestPrediction 被调用，预测数据:', prediction);

  if (!prediction) {
    console.warn('预测数据为空');
    return;
  }

  const predictionDiv = document.getElementById('colorAnalysisPrediction');
  if (!predictionDiv) {
    console.error('找不到 colorAnalysisPrediction 元素');
    return;
  }

  console.log('找到预测显示容器');

  const { current_period, second_number, second_color, predicted_color } = prediction;

  let predictedNumbersArr = [];
  if (prediction.predicted_numbers) {
    predictedNumbersArr = String(prediction.predicted_numbers)
      .split(',')
      .map(n => n.trim())
      .filter(Boolean);
  } else if (COLOR_GROUPS[predicted_color]) {
    predictedNumbersArr = COLOR_GROUPS[predicted_color].map(n => String(n).padStart(2, '0'));
  }
  const predictedNumbersText = predictedNumbersArr.join(', ');
  const predictedNumbersForQr = predictedNumbersArr.join(',');
  const shouldShowQr = predicted_color === 'green' && predictedNumbersArr.length > 0;

  const nextPeriod = prediction.next_period || (parseInt(current_period) + 1);

  let html = `
    <div style="padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); color: white;">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <div style="font-size: 32px; margin-right: 10px;">🔮</div>
        <div>
          <h3 style="margin: 0; font-size: 20px; color: white;">最新预测</h3>
          <div style="font-size: 12px; opacity: 0.9; margin-top: 3px;">基于历史数据的波色分析预测</div>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 8px; padding: 15px; margin-bottom: 15px;">
        <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center;">
          <div style="text-align: center; background: rgba(255,255,255,0.2); padding: 12px; border-radius: 6px;">
            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px;">已开奖期数</div>
            <div style="font-size: 24px; font-weight: bold;">${current_period}</div>
          </div>
          <div style="font-size: 24px; opacity: 0.8;">→</div>
          <div style="text-align: center; background: rgba(255,255,255,0.3); padding: 12px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.5);">
            <div style="font-size: 11px; opacity: 0.8; margin-bottom: 5px;">预测期数</div>
            <div style="font-size: 24px; font-weight: bold;">${nextPeriod}</div>
          </div>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.95); border-radius: 8px; padding: 15px; color: #333;">
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e0e0e0;">
          <div style="font-size: 13px; color: #666; margin-bottom: 6px;">
            <strong>分析依据：</strong>${current_period}期开奖号码前6个排序后的第2个号码
          </div>
          <div style="display: flex; align-items: center;">
            <span style="color: #666; margin-right: 8px;">号码：</span>
            <span style="font-weight: bold; font-size: 22px; margin-right: 12px; color: #333;">${String(second_number).padStart(2, '0')}</span>
            <span style="${getColorGroupStyle(second_color)}; padding: 4px 12px; border-radius: 4px; background: rgba(0,0,0,0.05); font-weight: bold; font-size: 14px;">${getColorGroupName(second_color)}</span>
          </div>
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 6px; text-align: center;">
          <div style="font-size: 13px; opacity: 0.95; margin-bottom: 8px;">预测 ${nextPeriod} 期第7个号码波色为</div>
        <div style="font-size: 28px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
            ${getColorGroupName(predicted_color)}
          </div>
        <div id="colorPredictionQrRow" style="margin-top: 12px; display: ${shouldShowQr ? 'flex' : 'none'}; gap: 10px; flex-wrap: wrap; align-items: center;">
          <div style="font-size: 13px; color: #333; background: rgba(255,255,255,0.85); padding: 8px 12px; border-radius: 6px;">
            <b>号码二维码：</b><span style="color:#2980d9;">${predictedNumbersText}</span>
          </div>
          <div id="colorPredictionQr" class="color-prediction-qr" style="width: 96px; height: 96px; background: #fff; border-radius: 8px; padding: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);"></div>
        </div>
        </div>
      </div>
    </div>
  `;

  predictionDiv.innerHTML = html;

  // 强制显示预测框
  predictionDiv.style.display = 'block';
  predictionDiv.style.visibility = 'visible';
  predictionDiv.style.opacity = '1';

  console.log('预测框HTML已设置，预测期数:', nextPeriod);
  console.log('预测框样式:', {
    display: predictionDiv.style.display,
    visibility: predictionDiv.style.visibility,
    opacity: predictionDiv.style.opacity
  });

  // 调试：检查父元素是否可见
  let parent = predictionDiv.parentElement;
  console.log('预测框父元素:', parent ? parent.id : '无');
  if (parent) {
    console.log('父元素样式:', {
      display: window.getComputedStyle(parent).display,
      visibility: window.getComputedStyle(parent).visibility
    });
  }

  // 调试：检查预测框的实际计算样式
  const computedStyle = window.getComputedStyle(predictionDiv);
  console.log('预测框计算样式:', {
    display: computedStyle.display,
    visibility: computedStyle.visibility,
    opacity: computedStyle.opacity,
    height: computedStyle.height,
    width: computedStyle.width
  });

  // 在绿波预测时渲染二维码
  if (shouldShowQr) {
    if (window.QRTool) {
      window.QRTool.render('colorPredictionQr', predictedNumbersForQr, 96);
    } else {
      console.warn('QRTool 未加载，无法渲染波色预测二维码');
    }
  }
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
