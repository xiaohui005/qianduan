/**
 * 推荐8码命中分析模块
 * 功能：分析推荐8码的命中情况、遗漏值和统计信息
 */

// 使用立即执行函数封装，避免变量冲突
(function() {
  'use strict';

// ========== 模块内部状态管理 ==========
let currentLotteryType = 'am';
let currentPosition = 7;
let missThreshold = 0;
let analysisCache = {};  // 缓存各位置的分析结果
let allLotteryRecords = []; // 缓存开奖记录

// ========== 核心算法 ==========

/**
 * 判断推荐号码中是否包含开奖号码
 * @param {Array<string>} recommendNumbers - 推荐号码数组（8个）
 * @param {string} openNumber - 开奖号码
 * @returns {boolean}
 */
function isHit(recommendNumbers, openNumber) {
  return recommendNumbers.includes(openNumber);
}

/**
 * 计算遗漏值
 * @param {string} recommendPeriod - 推荐期号
 * @param {Array<string>} recommendNumbers - 推荐号码
 * @param {Array<Object>} lotteryRecords - 开奖记录（按期号正序排列）
 * @param {number} position - 位置（1-7）
 * @returns {Object} { currentMiss, maxMiss, hitPeriod, hitHistory }
 */
function calculateMissValue(recommendPeriod, recommendNumbers, lotteryRecords, position) {
  // 1. 找到推荐期在开奖记录中的索引
  const recommendIndex = lotteryRecords.findIndex(r => r.period === recommendPeriod);

  if (recommendIndex === -1) {
    // 推荐期没有开奖记录（可能是未来期数）
    return {
      currentMiss: -1,
      maxMiss: 0,
      hitPeriod: null,
      hitHistory: []
    };
  }

  // 2. 从推荐期的下一期开始遍历
  let currentMiss = 0;
  let maxMiss = 0;
  let hitPeriod = null;
  let hitHistory = [];

  for (let i = recommendIndex + 1; i < lotteryRecords.length; i++) {
    const record = lotteryRecords[i];
    const openNumbers = record.numbers.split(',').map(n => n.trim());
    const openNumber = openNumbers[position - 1];  // 获取对应位置的号码

    if (isHit(recommendNumbers, openNumber)) {
      // 命中！
      hitHistory.push({
        period: record.period,
        missBeforeHit: currentMiss,
        openNumber: openNumber
      });
      hitPeriod = record.period;
      maxMiss = Math.max(maxMiss, currentMiss);
      currentMiss = 0;  // 重置遗漏
    } else {
      // 未命中
      currentMiss++;
    }
  }

  // 3. 最后的currentMiss就是当前遗漏值
  maxMiss = Math.max(maxMiss, currentMiss);

  return {
    currentMiss,      // 当前遗漏值（从最后一次命中到现在）
    maxMiss,          // 历史最大遗漏值
    hitPeriod,        // 最后一次命中的期号
    hitHistory        // 所有命中记录
  };
}

// ========== 数据获取和分析 ==========

/**
 * 执行完整的命中分析
 * @param {string} lotteryType - 彩种 (am/hk)
 * @param {number} position - 位置 (1-7)
 * @returns {Array<Object>} 分析结果数组
 */
async function performFullAnalysis8(lotteryType, position) {
  console.log(`开始分析推荐8码命中情况 - 彩种: ${lotteryType}, 位置: ${position}`);

  try {
    // 1. 获取推荐历史
    const historyRes = await fetch(
      `${window.BACKEND_URL}/api/recommend_history?lottery_type=${lotteryType}`
    );
    const historyData = await historyRes.json();
    const recommendPeriods = historyData.data || [];

    if (recommendPeriods.length === 0) {
      console.log('没有推荐历史数据');
      return [];
    }

    console.log(`获取到 ${recommendPeriods.length} 期推荐历史`);

    // 2. 获取开奖记录（如果缓存中没有）
    if (allLotteryRecords.length === 0 || allLotteryRecords[0].lottery_type !== lotteryType) {
      const recordsRes = await fetch(
        `${window.BACKEND_URL}/records?lottery_type=${lotteryType}&page_size=2000`
      );
      const recordsData = await recordsRes.json();
      allLotteryRecords = recordsData.records || [];

      // 按期号正序排序（重要！）
      allLotteryRecords.sort((a, b) => parseInt(a.period) - parseInt(b.period));
      console.log(`获取到 ${allLotteryRecords.length} 期开奖记录`);
    }

    // 3. 遍历每个推荐期，计算分析数据
    const analysisResults = [];

    for (const periodInfo of recommendPeriods) {
      const period = periodInfo.period;

      // 获取该期的推荐数据
      const recommendRes = await fetch(
        `${window.BACKEND_URL}/api/recommend_by_period?lottery_type=${lotteryType}&period=${period}`
      );
      const recommendData = await recommendRes.json();

      if (!recommendData.success || !recommendData.data) {
        console.log(`期号 ${period} 推荐数据无效`);
        continue;
      }

      // 获取指定位置的推荐号码
      const recommendNumbers = recommendData.data.recommend_numbers[position - 1];
      if (!recommendNumbers || recommendNumbers.length === 0) {
        console.log(`期号 ${period} 第${position}位推荐号码为空`);
        continue;
      }

      // 计算遗漏值
      const missData = calculateMissValue(
        period,
        recommendNumbers,
        allLotteryRecords,
        position
      );

      // 获取该期的开奖号码（如果存在）
      const periodRecord = allLotteryRecords.find(r => r.period === period);
      let periodOpenNumber = null;
      if (periodRecord) {
        const openNumbers = periodRecord.numbers.split(',').map(n => n.trim());
        periodOpenNumber = openNumbers[position - 1];
      }

      // 组装结果
      analysisResults.push({
        period: period,
        recommendNumbers: recommendNumbers,
        openNumber: periodOpenNumber,
        currentMiss: missData.currentMiss,
        maxMiss: missData.maxMiss,
        hitPeriod: missData.hitPeriod,
        hitHistory: missData.hitHistory,
        createdAt: periodInfo.created_at
      });
    }

    // 4. 按期号倒序排列（最新的在前面）
    analysisResults.sort((a, b) => parseInt(b.period) - parseInt(a.period));

    console.log(`分析完成，共 ${analysisResults.length} 期数据`);
    return analysisResults;

  } catch (error) {
    console.error('分析过程出错:', error);
    throw error;
  }
}

/**
 * 根据遗漏阈值筛选数据
 * @param {Array<Object>} analysisResults - 分析结果
 * @param {number} missThreshold - 遗漏阈值
 * @returns {Array<Object>}
 */
function filterByMissThreshold8(analysisResults, missThreshold) {
  if (missThreshold <= 0) {
    return analysisResults;  // 显示全部
  }

  return analysisResults.filter(item => {
    // 只显示当前遗漏 >= 阈值的记录
    return item.currentMiss >= missThreshold;
  });
}

// ========== 渲染函数 ==========

/**
 * 渲染分析表格
 * @param {Array<Object>} analysisResults - 分析结果
 * @param {number} position - 位置
 */
function renderAnalysisTable8(analysisResults, position) {
  const resultDiv = document.getElementById('recommend8AnalysisResult');

  // 应用遗漏筛选
  const filteredResults = filterByMissThreshold8(analysisResults, missThreshold);

  if (filteredResults.length === 0) {
    if (missThreshold > 0) {
      resultDiv.innerHTML = `
        <div class="no-data">
          暂无符合条件的数据<br>
          <small>当前遗漏阈值：${missThreshold}，请尝试降低阈值或点击"重置"查看全部</small>
        </div>
      `;
    } else {
      resultDiv.innerHTML = '<div class="no-data">暂无数据</div>';
    }
    return;
  }

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>推荐期号</th>
          <th>第${position}位推荐号码</th>
          <th>该期开奖</th>
          <th>命中情况</th>
          <th>当前遗漏</th>
          <th>最大遗漏</th>
          <th>最后命中期号</th>
        </tr>
      </thead>
      <tbody>
  `;

  filteredResults.forEach(item => {
    // 判断是否高遗漏（>=10）
    const isHighMiss = item.currentMiss >= 10;
    const rowClass = isHighMiss ? 'high-miss' : '';

    // 渲染号码球
    const numberBalls = item.recommendNumbers.map(num => {
      const colorClass = getBallColorClass(num);
      return `<span class="ball ${colorClass}">${num}</span>`;
    }).join('');

    // 命中状态
    let hitStatus = '';
    if (item.currentMiss === 0) {
      hitStatus = '<span class="hit-yes">✅ 已命中</span>';
    } else if (item.currentMiss === -1) {
      hitStatus = '<span class="hit-pending">⏳ 待开奖</span>';
    } else {
      hitStatus = '<span class="hit-no">❌ 遗漏中</span>';
    }

    // 最后命中期号
    const lastHit = item.hitPeriod || '从未命中';

    // 当前遗漏显示
    const currentMissDisplay = item.currentMiss === -1 ? '-' : item.currentMiss;

    html += `
      <tr class="${rowClass}">
        <td>${item.period}</td>
        <td class="numbers-cell">${numberBalls}</td>
        <td>${item.openNumber || '-'}</td>
        <td>${hitStatus}</td>
        <td class="miss-value">${currentMissDisplay}</td>
        <td>${item.maxMiss}</td>
        <td>${lastHit}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  resultDiv.innerHTML = html;
}

/**
 * 渲染统计面板
 * @param {Array<Object>} analysisResults - 分析结果
 */
function renderStatsPanel8(analysisResults) {
  const totalCount = analysisResults.length;
  const hitCount = analysisResults.filter(item => item.currentMiss === 0 || item.hitPeriod).length;
  const missCount = analysisResults.filter(item => item.currentMiss > 0).length;
  const hitRate = totalCount > 0 ? (hitCount / totalCount * 100).toFixed(2) + '%' : '0%';

  document.getElementById('totalCount8').textContent = totalCount;
  document.getElementById('hitCount8').textContent = hitCount;
  document.getElementById('missCount8').textContent = missCount;
  document.getElementById('hitRate8').textContent = hitRate;
}

// ========== 事件处理 ==========

/**
 * 加载并分析数据
 */
async function loadAndAnalyze8() {
  const resultDiv = document.getElementById('recommend8AnalysisResult');
  resultDiv.innerHTML = '<div class="loading">正在加载数据，请稍候...</div>';

  try {
    // 清除缓存（强制刷新）
    analysisCache = {};
    allLotteryRecords = [];

    // 获取当前位置的分析结果
    const results = await performFullAnalysis8(currentLotteryType, currentPosition);
    analysisCache[currentPosition] = results;

    // 渲染结果
    renderCurrentPosition8();

  } catch (error) {
    console.error('分析失败:', error);
    resultDiv.innerHTML = `<div class="error">分析失败: ${error.message}</div>`;
  }
}

/**
 * 渲染当前位置的分析结果
 */
async function renderCurrentPosition8() {
  const results = analysisCache[currentPosition];

  if (!results) {
    // 缓存中没有，需要加载
    const resultDiv = document.getElementById('recommend8AnalysisResult');
    resultDiv.innerHTML = '<div class="loading">正在加载数据，请稍候...</div>';

    try {
      const newResults = await performFullAnalysis8(currentLotteryType, currentPosition);
      analysisCache[currentPosition] = newResults;

      // 渲染统计面板
      renderStatsPanel8(newResults);

      // 渲染表格
      renderAnalysisTable8(newResults, currentPosition);

    } catch (error) {
      console.error('加载失败:', error);
      resultDiv.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
  } else {
    // 使用缓存的数据
    renderStatsPanel8(results);
    renderAnalysisTable8(results, currentPosition);
  }
}

/**
 * 切换彩种
 * @param {string} type - 彩种（am/hk）
 */
function handleTypeChange8(type) {
  currentLotteryType = type;

  // 更新按钮状态
  document.querySelectorAll('#recommend8HitAnalysisPage .type-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    }
  });

  // 清除缓存并重新加载
  loadAndAnalyze8();
}

/**
 * 切换位置
 * @param {number} position - 位置（1-7）
 */
function handlePositionChange8(position) {
  currentPosition = position;

  // 更新按钮状态
  document.querySelectorAll('#recommend8HitAnalysisPage .tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (parseInt(btn.dataset.position) === position) {
      btn.classList.add('active');
    }
  });

  // 渲染当前位置
  renderCurrentPosition8();
}

/**
 * 应用遗漏筛选
 */
function applyMissFilter8() {
  const inputValue = document.getElementById('missThreshold8Input').value;
  missThreshold = parseInt(inputValue) || 0;

  console.log(`应用遗漏筛选: ${missThreshold}`);

  // 重新渲染（使用缓存数据）
  renderCurrentPosition8();
}

/**
 * 重置遗漏筛选
 */
function resetMissFilter8() {
  missThreshold = 0;
  document.getElementById('missThreshold8Input').value = '0';

  console.log('重置遗漏筛选');

  // 重新渲染（使用缓存数据）
  renderCurrentPosition8();
}

/**
 * 导出CSV
 */
function exportToCSV8() {
  const results = analysisCache[currentPosition];

  if (!results || results.length === 0) {
    alert('暂无数据可导出');
    return;
  }

  // 应用遗漏筛选
  const filteredResults = filterByMissThreshold8(results, missThreshold);

  if (filteredResults.length === 0) {
    alert('筛选后无数据可导出');
    return;
  }

  // 构建CSV内容
  let csv = '推荐期号,推荐号码,该期开奖,命中情况,当前遗漏,最大遗漏,最后命中期号\n';

  filteredResults.forEach(item => {
    const recommendNums = item.recommendNumbers.join(' ');
    const hitStatus = item.currentMiss === 0 ? '已命中' :
                     item.currentMiss === -1 ? '待开奖' : '遗漏中';
    const currentMissDisplay = item.currentMiss === -1 ? '-' : item.currentMiss;
    const lastHit = item.hitPeriod || '从未命中';

    csv += `${item.period},"${recommendNums}",${item.openNumber || '-'},${hitStatus},${currentMissDisplay},${item.maxMiss},${lastHit}\n`;
  });

  // 创建下载链接
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `推荐8码命中分析_${currentLotteryType}_第${currentPosition}位_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log('CSV导出成功');
}

// ========== 初始化 ==========

/**
 * 初始化推荐8码命中分析页面
 */
function initRecommend8HitAnalysis() {
  console.log('初始化推荐8码命中分析页面...');

  // 1. 绑定彩种切换
  document.querySelectorAll('#recommend8HitAnalysisPage .type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      handleTypeChange8(this.dataset.type);
    });
  });

  // 2. 绑定位置标签切换
  document.querySelectorAll('#recommend8HitAnalysisPage .tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      handlePositionChange8(parseInt(this.dataset.position));
    });
  });

  // 3. 绑定遗漏筛选
  const applyBtn = document.getElementById('applyMissFilter8Btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', applyMissFilter8);
  }

  const resetBtn = document.getElementById('resetMissFilter8Btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', resetMissFilter8);
  }

  // 4. 绑定刷新和导出
  const refreshBtn = document.getElementById('refresh8Btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAndAnalyze8);
  }

  const exportBtn = document.getElementById('export8Btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV8);
  }

  // 5. 初始加载
  loadAndAnalyze8();
}

// 将初始化函数暴露到全局作用域
window.initRecommend8HitAnalysis = initRecommend8HitAnalysis;

})(); // 立即执行函数结束
