/**
 * 第7个号码+1~+20区间分析模块
 * 功能：分析第7个号码在+1~+20区间的命中情况
 */

// ==================== 模块状态 ====================
let currentSeventhRangeType = 'am';
let seventhRangePage = 1;
let seventhRangeTotalPages = 1;

// ==================== 核心功能函数 ====================

/**
 * 加载第7个号码区间分析数据
 * @param {string} lotteryType - 彩种类型（am/hk）
 */
async function loadSeventhRangeAnalysis(lotteryType) {
  const resultDiv = document.getElementById('seventhRangeResult');
  const statsDiv = document.getElementById('seventhRangeStats');

  if (!resultDiv) {
    console.error('未找到 seventhRangeResult 元素');
    return;
  }

  currentSeventhRangeType = lotteryType;
  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在分析第7个号码+1~+20区间数据...</div>';
  if (statsDiv) statsDiv.style.display = 'none';

  try {
    const pageSize = 30;
    const url = `${window.BACKEND_URL}/api/seventh_number_range_analysis?lottery_type=${lotteryType}&page=${seventhRangePage}&page_size=${pageSize}`;
    console.log('请求URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('第7个号码区间分析数据:', data);

    if (data.success) {
      seventhRangePage = data.data.page || 1;
      seventhRangeTotalPages = data.data.total_pages || 1;
      renderSeventhRangeAnalysis(data.data);
      updateSeventhRangeStats(data.data);
    } else {
      resultDiv.innerHTML = `<div style="color: red; padding: 20px;">分析失败: ${data.message || '未知错误'}</div>`;
    }
  } catch (error) {
    console.error('加载第7个号码区间分析失败:', error);
    resultDiv.innerHTML = `<div style="color: red; padding: 20px;">加载失败: ${error.message}</div>`;
  }
}

/**
 * 渲染第7个号码区间分析结果
 * @param {Object} data - 分析数据
 */
function renderSeventhRangeAnalysis(data) {
  const resultDiv = document.getElementById('seventhRangeResult');
  if (!resultDiv) return;

  const { results, page, total_pages } = data;

  if (!results || results.length === 0) {
    resultDiv.innerHTML = '<div style="text-align: center; color: #888; padding: 20px;">暂无数据</div>';
    return;
  }

  let html = `
    <div style="margin-bottom: 15px;">
      <button id="exportSeventhRangeBtn" class="btn-secondary">导出CSV</button>
    </div>
    <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">
      <thead>
        <tr>
          <th>期号</th>
          <th>开奖时间</th>
          <th>第7个号码</th>
          <th>预测区间</th>
          <th>下期第7码</th>
          <th>命中情况</th>
        </tr>
      </thead>
      <tbody>
  `;

  results.forEach(record => {
    const hitStatus = record.is_hit ? '<span style="color: green; font-weight: bold;">✓ 命中</span>' : '<span style="color: red;">✗ 未中</span>';
    const ballClass = getBallColorClass(record.current_seventh);
    const nextBallClass = record.next_seventh ? getBallColorClass(record.next_seventh) : '';

    // 格式化预测区间 - 智能分组连续号码
    const rangeNumbers = record.range_numbers || [];
    let predictedRange = '-';
    if (rangeNumbers.length > 0) {
      const groups = [];
      let start = rangeNumbers[0];
      let end = rangeNumbers[0];

      for (let i = 1; i < rangeNumbers.length; i++) {
        if (rangeNumbers[i] === end + 1) {
          // 连续号码，扩展当前组
          end = rangeNumbers[i];
        } else {
          // 不连续，保存当前组并开始新组
          groups.push(start === end ? `${String(start).padStart(2, '0')}` : `${String(start).padStart(2, '0')}~${String(end).padStart(2, '0')}`);
          start = rangeNumbers[i];
          end = rangeNumbers[i];
        }
      }
      // 保存最后一组
      groups.push(start === end ? `${String(start).padStart(2, '0')}` : `${String(start).padStart(2, '0')}~${String(end).padStart(2, '0')}`);

      predictedRange = groups.join(', ');
    }

    html += `
      <tr>
        <td>${record.current_period}</td>
        <td>${record.current_open_time || '-'}</td>
        <td><span class="${ballClass}">${record.current_seventh}</span></td>
        <td>${predictedRange}</td>
        <td>${record.next_seventh ? `<span class="${nextBallClass}">${record.next_seventh}</span>` : '-'}</td>
        <td>${hitStatus}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
    <div style="margin-top: 15px; text-align: center;">
      <span style="margin-right: 15px;">第 ${page} / ${total_pages} 页</span>
  `;

  if (page > 1) {
    html += `<button id="seventhRangePrevPage" class="btn-secondary" style="margin-right: 8px;">上一页</button>`;
  }

  if (page < total_pages) {
    html += `<button id="seventhRangeNextPage" class="btn-secondary">下一页</button>`;
  }

  html += `</div>`;

  resultDiv.innerHTML = html;

  // 绑定分页按钮事件
  const prevBtn = document.getElementById('seventhRangePrevPage');
  const nextBtn = document.getElementById('seventhRangeNextPage');
  const exportBtn = document.getElementById('exportSeventhRangeBtn');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (seventhRangePage > 1) {
        seventhRangePage--;
        loadSeventhRangeAnalysis(currentSeventhRangeType);
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (seventhRangePage < seventhRangeTotalPages) {
        seventhRangePage++;
        loadSeventhRangeAnalysis(currentSeventhRangeType);
      }
    };
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      const url = `${window.BACKEND_URL}/api/seventh_number_range_analysis?lottery_type=${currentSeventhRangeType}&export=csv`;
      window.open(url, '_blank');
    };
  }
}

/**
 * 更新统计信息
 * @param {Object} data - 分析数据
 */
function updateSeventhRangeStats(data) {
  const statsDiv = document.getElementById('seventhRangeStats');
  if (!statsDiv) return;

  const { total_analysis, hit_count, hit_rate, current_miss, max_miss } = data || {};

  const el1 = document.getElementById('totalSeventhRangePeriods');
  const el2 = document.getElementById('seventhRangeHitCount');
  const el3 = document.getElementById('seventhRangeHitRate');
  const el4 = document.getElementById('seventhRangeCurrentMiss');
  const el5 = document.getElementById('seventhRangeMaxMiss');

  if (el1) el1.textContent = total_analysis || 0;
  if (el2) el2.textContent = hit_count || 0;
  if (el3) el3.textContent = hit_rate ? `${hit_rate}%` : '0%';
  if (el4) el4.textContent = current_miss || 0;
  if (el5) el5.textContent = max_miss || 0;

  statsDiv.style.display = 'block';
}

/**
 * 获取号码球颜色类
 * @param {string} num - 号码
 * @returns {string} CSS类名
 */
function getBallColorClass(num) {
  // 直接使用本地实现，避免递归
  const paddedNum = String(num).padStart(2, '0');
  const red = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
  const blue = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
  const green = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];

  if (red.includes(paddedNum)) return 'number-ball number-ball-red';
  if (blue.includes(paddedNum)) return 'number-ball number-ball-blue';
  if (green.includes(paddedNum)) return 'number-ball number-ball-green';
  return 'number-ball';
}

// ==================== 模块初始化 ====================

/**
 * 初始化第7个号码区间分析模块
 */
function initSeventhRangeAnalysis() {
  console.log('🎯 初始化第7个号码+1~+20区间分析模块...');

  // 绑定彩种选择按钮
  document.querySelectorAll('.seventh-range-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.seventh-range-type-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentSeventhRangeType = this.dataset.type;
      seventhRangePage = 1; // 重置页码
    });
  });

  // 绑定开始分析按钮
  const startBtn = document.getElementById('startSeventhRangeAnalysisBtn');
  if (startBtn) {
    startBtn.onclick = () => {
      seventhRangePage = 1; // 重置页码
      loadSeventhRangeAnalysis(currentSeventhRangeType);
    };
    console.log('✅ 开始分析按钮已绑定');
  } else {
    console.warn('⚠️ 未找到开始分析按钮 #startSeventhRangeAnalysisBtn');
  }

  console.log('✅ 第7个号码+1~+20区间分析模块初始化完成');
}

// ==================== 模块导出 ====================
window.initSeventhRangeAnalysis = initSeventhRangeAnalysis;
window.loadSeventhRangeAnalysis = loadSeventhRangeAnalysis;

console.log('✅ 第7个号码+1~+20区间分析模块已加载');
