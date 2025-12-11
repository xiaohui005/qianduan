/**
 * 肖分析模块
 * 负责第二个号码四肖分析和第6个号码6肖分析
 */

// ==================== 第二个号码四肖分析功能 ====================

/**
 * 初始化第二个号码四肖分析
 */
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

  // 初始化年份选择器
  const yearSelect = document.getElementById('secondFourxiaoYearSelect');
  if (yearSelect) {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2020; y--) {
      const option = document.createElement('option');
      option.value = y;
      option.textContent = y + '年';
      yearSelect.appendChild(option);
    }
  }

  const startBtn = document.getElementById('startSecondFourxiaoAnalysisBtn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      window.secondFourxiaoPage = 1;
      const yearSelect = document.getElementById('secondFourxiaoYearSelect');
      const selectedYear = yearSelect ? yearSelect.value : '';
      window.secondFourxiaoSelectedYear = selectedYear;
      loadSecondFourxiaoAnalysis(window.currentSeventhRangeType || 'am', window.secondFourxiaoPos || 2, window.secondFourxiaoPage || 1, 30, selectedYear);
    });
  }
}

/**
 * 加载第二个号码四肖分析数据
 */
async function loadSecondFourxiaoAnalysis(lotteryType, position, page = 1, pageSize = 30, year = '') {
  const resultDiv = document.getElementById('secondFourxiaoResult');
  const statsDiv = document.getElementById('secondFourxiaoStats');

  if (!resultDiv) return;

  resultDiv.innerHTML = '<div style="text-align:center;padding:20px;">正在分析第二个号码四肖...</div>';
  if (statsDiv) statsDiv.style.display = 'none';

  try {
    let url = `${window.BACKEND_URL}/api/second_number_fourxiao?lottery_type=${lotteryType}&position=${position}&page=${page}&page_size=${pageSize}`;
    if (year) {
      url += `&year=${year}`;
    }
    const res = await fetch(url);
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

/**
 * 渲染第二个号码四肖分析结果
 */
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

  const qrEntries = [];

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

  (results || []).forEach((r, idx) => {
    const generatedNumbersArr = (r.generated_numbers || []).map(num => String(num).trim().padStart(2, '0'));
    const rangeStr = generatedNumbersArr.join(', ');
    const winStr = (r.window_periods || []).join(', ');
    const win7Str = (r.window_seventh_numbers || []).map(x => x == null ? '-' : String(x).padStart(2, '0')).join(', ');

    const rangeHtml = generatedNumbersArr.length > 0
      ? generatedNumbersArr.map(num => {
          const colorClass = window.getBallColorClass ? window.getBallColorClass(num) : '';
          return `<span class="${colorClass}" style="display:inline-block;padding:4px 6px;margin:2px;border-radius:4px;font-weight:600;">${num}</span>`;
        }).join('')
      : '-';

    const qrId = `second-fourxiao-qr-${r.current_period || 'p'}-${idx}`;
    if (generatedNumbersArr.length > 0) {
      qrEntries.push({ id: qrId, text: generatedNumbersArr.join(','), size: 80 });
    }

    html += `
      <tr>
        <td>${r.current_period}</td>
        <td>${r.current_open_time}</td>
        <td>${r.base_position || 2}</td>
        <td>${String(r.current_base ?? r.current_second).padStart(2, '0')}</td>
        <td>
          <div style="max-width:380px;overflow-x:auto;white-space:nowrap;">${rangeHtml || '-'}</div>
          ${generatedNumbersArr.length > 0 ? `
            <div style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <div id="${qrId}" class="second-fourxiao-qr" style="width:80px;height:80px;border:1px solid #eee;border-radius:6px;background:#fff;"></div>
              <span style="font-size:12px;color:#555;">扫码获取16码</span>
            </div>
          ` : ''}
        </td>
        <td>${winStr}</td>
        <td>${win7Str}</td>
        <td class="${r.is_hit ? 'hit' : 'miss'}">${r.is_hit ? '命中' : '遗漏'}</td>
        <td>${r.hit_period || '-'}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>${pagerHtml}`;

  resultDiv.innerHTML = html;

  if (qrEntries.length > 0) {
    if (window.QRTool) {
      window.QRTool.renderBatch(qrEntries, 80);
    } else {
      console.warn('QRTool 未加载，无法渲染第二码四肖二维码');
    }
  }

  // 更新统计信息
  if (statsDiv) {
    document.getElementById('secondFourxiaoTotal').textContent = String(total_triggers || 0);
    document.getElementById('secondFourxiaoHitCount').textContent = String(hit_count || 0);
    document.getElementById('secondFourxiaoMissCount').textContent = String(data.miss_count || 0);
    document.getElementById('secondFourxiaoHitRate').textContent = String((hit_rate || 0) + '%');
    document.getElementById('secondFourxiaoMaxConsecutiveMiss').textContent = String(data.max_consecutive_miss || 0);
    statsDiv.style.display = 'block';
  }

  // 绑定分页与导出
  const prevBtn = document.getElementById('secondFourxiaoPrev');
  const nextBtn = document.getElementById('secondFourxiaoNext');
  const exportBtn = document.getElementById('secondFourxiaoExport');

  if (prevBtn) {
    prevBtn.addEventListener('click', function() {
      if ((page || 1) > 1) {
        loadSecondFourxiaoAnalysis(window.secondFourxiaoLotteryType || 'am', window.secondFourxiaoPosition || 2, (page - 1), page_size || 30, window.secondFourxiaoSelectedYear || '');
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (page < total_pages) {
        loadSecondFourxiaoAnalysis(window.secondFourxiaoLotteryType || 'am', window.secondFourxiaoPosition || 2, (page + 1), page_size || 30, window.secondFourxiaoSelectedYear || '');
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const lt = window.secondFourxiaoLotteryType || 'am';
      const pos = window.secondFourxiaoPosition || 2;
      const year = window.secondFourxiaoSelectedYear || '';
      let url = `${window.BACKEND_URL}/api/second_number_fourxiao?lottery_type=${lt}&position=${pos}&export=csv`;
      if (year) {
        url += `&year=${year}`;
      }
      window.open(url, '_blank');
    });
  }
}

// ==================== 第6个号码6肖分析功能 ====================

/**
 * 初始化第6个号码6肖分析
 */
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
    startBtn.addEventListener('click', async function() {
      const lotteryType = window.currentSixthThreexiaoType || 'am';
      const position = window.sixthThreexiaoPos || 6;
      window.sixthThreexiaoPage = 1;
      await loadSixthThreexiaoAnalysis(lotteryType, position, window.sixthThreexiaoPage || 1, 30);

      // 检测跨位置交替命中模式
      await detectCrossPositionAlternate(lotteryType, position);
    });
  }

  // 设置默认值
  window.currentSixthThreexiaoType = 'am';
  window.sixthThreexiaoPos = 6;
}

/**
 * 检测跨位置交替命中模式
 */
async function detectCrossPositionAlternate(lotteryType, currentPosition) {
  try {
    // 获取所有位置(1-7)的数据，但排除当前位置
    const positions = [1, 2, 3, 4, 5, 6, 7].filter(p => p !== currentPosition);
    const allData = {};

    // 获取当前位置的完整数据
    const currentResponse = await fetch(`${window.BACKEND_URL}/api/sixth_number_threexiao?lottery_type=${lotteryType}&position=${currentPosition}&page=1&page_size=200`);
    const currentResult = await currentResponse.json();
    if (!currentResult.success) return;
    allData[currentPosition] = currentResult.data.results;

    // 获取其他位置的数据
    for (const pos of positions) {
      const response = await fetch(`${window.BACKEND_URL}/api/sixth_number_threexiao?lottery_type=${lotteryType}&position=${pos}&page=1&page_size=200`);
      const result = await response.json();
      if (result.success) {
        allData[pos] = result.data.results;
      }
    }

    // 检测每对位置之间的交替模式
    let alternateWarnings = [];
    for (const otherPos of positions) {
      const warning = checkAlternateBetweenPositions(allData[currentPosition], allData[otherPos], currentPosition, otherPos);
      if (warning) {
        alternateWarnings.push(warning);
      }
    }

    // 显示警告信息
    const warningDiv = document.getElementById('sixthThreexiaoWarning');
    if (warningDiv) {
      if (alternateWarnings.length > 0) {
        console.log('检测到交替命中模式:', alternateWarnings);
        warningDiv.innerHTML = `<strong style="color: #e67e22;">⚠️ ${alternateWarnings.join('<br>')}</strong>`;
        warningDiv.style.display = 'block';
      } else {
        console.log('未检测到交替命中模式');
        warningDiv.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('检测跨位置交替命中失败:', error);
  }
}

/**
 * 检查两个位置之间的交替命中模式
 */
function checkAlternateBetweenPositions(posData1, posData2, pos1, pos2) {
  if (!posData1 || !posData2 || posData1.length < 6 || posData2.length < 6) {
    console.log(`位置${pos1}与${pos2}数据不足，跳过检测`);
    return null;
  }

  // 按期号对齐两个位置的数据（排除预测期）
  const periodMap1 = {};
  const periodMap2 = {};

  posData1.forEach(item => {
    if (item.next_seventh !== null) { // 只统计有下一期开奖的
      periodMap1[item.current_period] = item.is_hit;
    }
  });

  posData2.forEach(item => {
    if (item.next_seventh !== null) { // 只统计有下一期开奖的
      periodMap2[item.current_period] = item.is_hit;
    }
  });

  // 找出共同的期号
  const commonPeriods = Object.keys(periodMap1).filter(p => periodMap2.hasOwnProperty(p));
  commonPeriods.sort((a, b) => b - a); // 降序排列，最新的在前

  if (commonPeriods.length < 3) {
    console.log(`位置${pos1}与${pos2}共同期数不足3期，跳过检测`);
    return null;
  }

  // 检查最近3期的交替模式
  const checkPeriods = commonPeriods.slice(0, Math.min(3, commonPeriods.length));
  let isAlternatingBetween = true;  // 两个位置之间是否交替
  let isPos1SelfAlternating = true; // 位置1自身是否交替
  let isPos2SelfAlternating = true; // 位置2自身是否交替
  const hitPattern = [];

  for (let i = 0; i < checkPeriods.length; i++) {
    const period = checkPeriods[i];
    const hit1 = periodMap1[period];
    const hit2 = periodMap2[period];
    hitPattern.push({
      period,
      [`位置${pos1}`]: hit1 ? '命中' : '遗漏',
      [`位置${pos2}`]: hit2 ? '命中' : '遗漏',
      位置间交替: hit1 !== hit2 ? '✓' : '✗'
    });

    // 检查两个位置之间是否交替：一个命中时另一个不中
    if (hit1 === hit2) {
      isAlternatingBetween = false;
      console.log(`期号${period}: 位置${pos1}=${hit1}, 位置${pos2}=${hit2}, 两者相同，不是交替`);
    }

    // 检查位置1自身是否交替
    if (i > 0) {
      const prevPeriod = checkPeriods[i - 1];
      const prevHit1 = periodMap1[prevPeriod];
      if (hit1 === prevHit1) {
        isPos1SelfAlternating = false;
        console.log(`位置${pos1}自身不交替: 期号${prevPeriod}=${prevHit1}, 期号${period}=${hit1}`);
      }
    }

    // 检查位置2自身是否交替
    if (i > 0) {
      const prevPeriod = checkPeriods[i - 1];
      const prevHit2 = periodMap2[prevPeriod];
      if (hit2 === prevHit2) {
        isPos2SelfAlternating = false;
        console.log(`位置${pos2}自身不交替: 期号${prevPeriod}=${prevHit2}, 期号${period}=${hit2}`);
      }
    }
  }

  console.log(`位置${pos1}与${pos2}最近${checkPeriods.length}期命中模式:`);
  console.table(hitPattern);
  console.log(`位置间是否交替: ${isAlternatingBetween}`);
  console.log(`位置${pos1}自身是否交替: ${isPos1SelfAlternating}`);
  console.log(`位置${pos2}自身是否交替: ${isPos2SelfAlternating}`);

  // 必须同时满足：两个位置之间交替 + 每个位置自身也交替
  if (isAlternatingBetween && isPos1SelfAlternating && isPos2SelfAlternating && checkPeriods.length === 3) {
    const latestPeriod = checkPeriods[0];
    const nextShouldHit1 = !periodMap1[latestPeriod];
    const nextShouldHit2 = !periodMap2[latestPeriod];

    return `检测到最近3期第${pos1}位与第${pos2}位出现交替命中模式（双方自身也交替）！预测下一期第${pos1}位可能${nextShouldHit1 ? '命中' : '遗漏'}，第${pos2}位可能${nextShouldHit2 ? '命中' : '遗漏'}`;
  }

  return null;
}

/**
 * 加载第6个号码6肖分析数据
 */
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
    console.error('加载第6个号码6肖分析失败:', error);
    resultDiv.innerHTML = '<p style="color: red;">加载失败，请检查网络连接</p>';
  }
}

/**
 * 渲染第6个号码6肖分析结果
 */
function renderSixthThreexiao(data, resultDiv, statsDiv) {
  const { results, total_analysis, hit_count, hit_rate, current_miss, max_miss, history_max_miss, base_position, page, total_pages, page_size } = data;

  const pagerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="sixthThreexiaoPrev" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id="sixthThreexiaoNext" class="btn-secondary" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="sixthThreexiaoExport" class="btn-secondary">导出CSV</button>
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

  // 更新统计信息
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
    prevBtn.addEventListener('click', function() {
      if ((page || 1) > 1) {
        loadSixthThreexiaoAnalysis(window.sixthThreexiaoLotteryType || 'am', window.sixthThreexiaoPosition || 6, (page - 1), page_size || 30);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', function() {
      if (page < total_pages) {
        loadSixthThreexiaoAnalysis(window.sixthThreexiaoLotteryType || 'am', window.sixthThreexiaoPosition || 6, (page + 1), page_size || 30);
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const lt = window.sixthThreexiaoLotteryType || 'am';
      const pos = window.sixthThreexiaoPosition || 6;
      const url = `${window.BACKEND_URL}/api/sixth_number_threexiao?lottery_type=${lt}&position=${pos}&export=csv`;
      window.open(url, '_blank');
    });
  }
}

// ==================== 模块初始化 ====================

/**
 * 初始化肖分析模块
 */
function initXiaoAnalysis() {
  console.log('初始化肖分析模块...');

  // 初始化第二个号码四肖分析
  initSecondFourxiaoAnalysis();

  // 初始化第6个号码6肖分析
  initSixthThreexiaoAnalysis();

  console.log('肖分析模块初始化完成');
}

// 导出模块初始化函数
window.initXiaoAnalysis = initXiaoAnalysis;

// 导出子模块初始化函数（保持兼容性）
window.initSecondFourxiaoAnalysis = initSecondFourxiaoAnalysis;
window.initSixthThreexiaoAnalysis = initSixthThreexiaoAnalysis;

// 导出模块对象
window.xiaoAnalysisModule = {
  loadSecondFourxiaoAnalysis,
  loadSixthThreexiaoAnalysis,
  detectCrossPositionAlternate
};

console.log('肖分析模块已加载');

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  initXiaoAnalysis();
});
