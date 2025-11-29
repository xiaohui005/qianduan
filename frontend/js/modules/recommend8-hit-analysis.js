/**
 * 推荐8码命中分析模块（基于数据库视图逻辑重写）
 *
 * 核心逻辑：
 * 1. 只看推荐期之后的N期（默认5期）
 * 2. 检查这N期中是否有任意一期命中
 * 3. 显示后续期数的具体号码
 */

(function() {
  'use strict';

// ========== 配置 ==========
const NEXT_PERIODS_COUNT = 5;  // 查看后续多少期

// ========== 模块内部状态 ==========
let currentLotteryType = 'am';
let currentPosition = 7;
let analysisCache = {};  // 缓存各位置的分析结果
let allLotteryRecords = []; // 缓存开奖记录

// ========== 核心算法（与视图逻辑一致）==========

/**
 * 分析单期推荐的命中情况
 * @param {string} recommendPeriod - 推荐期号
 * @param {Array<string>} recommendNumbers - 推荐号码（8个）
 * @param {Array<Object>} lotteryRecords - 所有开奖记录（正序）
 * @param {number} position - 位置（1-7）
 * @returns {Object} 分析结果
 */
function analyzeRecommend(recommendPeriod, recommendNumbers, lotteryRecords, position) {
  // 1. 找到推荐期在开奖记录中的索引
  const recommendIndex = lotteryRecords.findIndex(r => r.period === recommendPeriod);

  if (recommendIndex === -1) {
    // 推荐期没有开奖记录
    return {
      recommendPeriod: recommendPeriod,
      recommendNumbers: recommendNumbers,
      nextPeriods: [],
      isHit: false,
      hitCount: 0,
      hitPeriods: [],
      status: '待开奖'
    };
  }

  // 2. 获取后续N期的数据
  const nextPeriods = [];
  const hitPeriods = [];
  let hitCount = 0;

  // 将推荐号码标准化为整数（解决"4"和"04"等价问题）
  const normalizedRecommendNumbers = recommendNumbers.map(n => parseInt(n.toString().trim()));

  for (let i = 1; i <= NEXT_PERIODS_COUNT; i++) {
    const nextIndex = recommendIndex + i;

    if (nextIndex >= lotteryRecords.length) {
      break;  // 没有更多数据了
    }

    const record = lotteryRecords[nextIndex];
    const openNumbers = record.numbers.split(',').map(n => n.trim());

    if (openNumbers.length >= position) {
      const openNumber = openNumbers[position - 1];
      const normalizedOpenNumber = parseInt(openNumber.toString().trim());
      const isHit = normalizedRecommendNumbers.includes(normalizedOpenNumber);

      nextPeriods.push({
        period: record.period,
        number: openNumber,
        isHit: isHit
      });

      if (isHit) {
        hitCount++;
        hitPeriods.push(record.period);
      }
    }
  }

  // 3. 判断整体命中状态
  const isHit = hitCount > 0;
  const status = nextPeriods.length === 0 ? '待开奖' : (isHit ? '已命中' : '未命中');

  return {
    recommendPeriod: recommendPeriod,
    recommendNumbers: recommendNumbers,
    nextPeriods: nextPeriods,          // 后续期数详情
    isHit: isHit,                       // 是否命中
    hitCount: hitCount,                 // 命中次数
    hitPeriods: hitPeriods,             // 命中的期号列表
    status: status                      // 状态：已命中/未命中/待开奖
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

    // 3. 遍历每个推荐期，分析命中情况
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

      // 分析该期的命中情况
      const result = analyzeRecommend(
        period,
        recommendNumbers,
        allLotteryRecords,
        position
      );

      result.createdAt = periodInfo.created_at;
      analysisResults.push(result);
    }

    // 4. 按期号倒序排列（最新的在前面）
    analysisResults.sort((a, b) => parseInt(b.recommendPeriod) - parseInt(a.recommendPeriod));

    console.log(`分析完成，共 ${analysisResults.length} 期数据`);
    return analysisResults;

  } catch (error) {
    console.error('分析过程出错:', error);
    throw error;
  }
}

// ========== 渲染函数 ==========

/**
 * 渲染分析表格
 * @param {Array<Object>} analysisResults - 分析结果
 * @param {number} position - 位置
 */
function renderAnalysisTable8(analysisResults, position) {
  const resultDiv = document.getElementById('recommend8AnalysisResult');

  if (analysisResults.length === 0) {
    resultDiv.innerHTML = '<div class="no-data">暂无数据</div>';
    return;
  }

  let html = `
    <table class="data-table">
      <thead>
        <tr>
          <th>推荐期号</th>
          <th>第${position}位推荐号码（8个）</th>
          <th>后续${NEXT_PERIODS_COUNT}期号码</th>
          <th>命中情况</th>
          <th>命中次数</th>
        </tr>
      </thead>
      <tbody>
  `;

  analysisResults.forEach(item => {
    // 渲染推荐号码球
    const numberBalls = item.recommendNumbers.map(num => {
      const colorClass = getBallColorClass(num);
      return `<span class="ball ${colorClass}">${num}</span>`;
    }).join('');

    // 渲染后续期数
    let nextPeriodsHtml = '';
    if (item.nextPeriods.length === 0) {
      nextPeriodsHtml = '<span class="text-muted">暂无开奖</span>';
    } else {
      nextPeriodsHtml = item.nextPeriods.map(np => {
        const ballClass = getBallColorClass(np.number);
        const hitClass = np.isHit ? 'hit-ball' : '';
        return `<span class="ball ${ballClass} ${hitClass}" title="${np.period}">${np.number}</span>`;
      }).join(' ');
    }

    // 命中状态
    let statusHtml = '';
    if (item.status === '待开奖') {
      statusHtml = '<span class="hit-pending">⏳ 待开奖</span>';
    } else if (item.isHit) {
      statusHtml = `<span class="hit-yes">✅ 已命中</span><br><small>${item.hitPeriods.join(', ')}</small>`;
    } else {
      statusHtml = '<span class="hit-no">❌ 未命中</span>';
    }

    // 行样式
    const rowClass = item.isHit ? 'hit-row' : '';

    html += `
      <tr class="${rowClass}">
        <td>${item.recommendPeriod}</td>
        <td class="numbers-cell">${numberBalls}</td>
        <td class="next-periods-cell">${nextPeriodsHtml}</td>
        <td>${statusHtml}</td>
        <td>${item.hitCount}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <style>
      .hit-ball {
        box-shadow: 0 0 8px #28a745;
        font-weight: bold;
      }
      .hit-row {
        background-color: #f0f8f0;
      }
      .next-periods-cell .ball {
        margin: 2px;
      }
    </style>
  `;

  resultDiv.innerHTML = html;
}

/**
 * 渲染统计面板
 * @param {Array<Object>} analysisResults - 分析结果
 */
function renderStatsPanel8(analysisResults) {
  const totalCount = analysisResults.length;
  const hitCount = analysisResults.filter(item => item.isHit).length;
  const missCount = analysisResults.filter(item => item.status === '未命中').length;
  const pendingCount = analysisResults.filter(item => item.status === '待开奖').length;
  const hitRate = totalCount > 0 ? (hitCount / totalCount * 100).toFixed(2) + '%' : '0%';

  document.getElementById('totalCount8').textContent = totalCount;
  document.getElementById('hitCount8').textContent = hitCount;
  document.getElementById('missCount8').textContent = missCount;
  document.getElementById('hitRate8').textContent = hitRate;

  console.log(`统计数据 - 总数:${totalCount}, 命中:${hitCount}, 未命中:${missCount}, 待开奖:${pendingCount}, 命中率:${hitRate}`);
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
 * 导出CSV
 */
function exportToCSV8() {
  const results = analysisCache[currentPosition];

  if (!results || results.length === 0) {
    alert('暂无数据可导出');
    return;
  }

  // 构建CSV内容
  let csv = '推荐期号,推荐号码,后续期数,后续号码,命中情况,命中次数,命中期号\n';

  results.forEach(item => {
    const recommendNums = item.recommendNumbers.join(' ');
    const nextPeriods = item.nextPeriods.map(np => np.period).join(';');
    const nextNumbers = item.nextPeriods.map(np => np.number).join(';');
    const hitPeriods = item.hitPeriods.join(';');

    csv += `${item.recommendPeriod},"${recommendNums}","${nextPeriods}","${nextNumbers}",${item.status},${item.hitCount},"${hitPeriods}"\n`;
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

  // 3. 绑定刷新和导出
  const refreshBtn = document.getElementById('refresh8Btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAndAnalyze8);
  }

  const exportBtn = document.getElementById('export8Btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToCSV8);
  }

  // 4. 初始加载
  loadAndAnalyze8();
}

// 将初始化函数暴露到全局作用域
window.initRecommend8HitAnalysis = initRecommend8HitAnalysis;

})(); // 立即执行函数结束
