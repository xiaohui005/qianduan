/**
 * 推荐8码命中情况分析模块
 * 负责推荐8码的命中率分析和统计
 */

// ==================== 推荐8码命中情况分析功能 ====================

// 全局变量
let selectedPosition = 7; // 当前选择的位置

/**
 * 位置选择函数
 */
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

/**
 * 初始化推荐8码命中情况分析
 */
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

/**
 * 分析推荐8码命中情况
 */
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

/**
 * 分析单个推荐数据
 */
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

/**
 * 渲染推荐期数选择界面
 */
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

/**
 * 选择推荐期数进行分析
 */
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

/**
 * 渲染推荐命中情况分析结果
 */
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

/**
 * 计算分组统计信息
 */
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

/**
 * 渲染期数分组分析表格
 */
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

/**
 * 分析近100期按5期周期的统计
 */
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

/**
 * 渲染近100期按5期周期的分析结果
 */
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

/**
 * 导出推荐分析结果
 */
function exportRecommendAnalysis(analysisResults, recommendData, lotteryType) {
  // 这里可以实现导出功能
  alert('导出功能待实现');
}

// 导出模块初始化函数
window.initRecommendHitAnalysis = initRecommendHitAnalysis;

// 导出selectPosition函数（用于HTML onclick事件）
window.selectPosition = selectPosition;
window.selectRecommendPeriod = selectRecommendPeriod;

// 导出模块对象
window.recommendHitModule = {
  analyzeRecommendHit,
  selectRecommendPeriod,
  selectPosition,
  exportRecommendAnalysis
};

console.log('推荐8码命中情况分析模块已加载');
