/**
 * 加减前6码分析模块
 * 功能：分析±6码的命中和遗漏情况
 */

// ==================== 模块状态 ====================
let currentPlusMinus6Type = 'am';
let plusMinus6Page = 1;
let plusMinus6TotalPages = 1;

// ==================== 核心功能函数 ====================

/**
 * 加载加减前6码分析数据
 * @param {string} lotteryType - 彩种类型（am/hk）
 * @param {number} page - 页码
 */
async function loadPlusMinus6Analysis(lotteryType, page = 1) {
  const resultDiv = document.getElementById('plusMinus6Result');

  if (!resultDiv) {
    console.error('未找到 plusMinus6Result 元素');
    return;
  }

  currentPlusMinus6Type = lotteryType;
  plusMinus6Page = page;

  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在分析加减前6码...</div>';

  try {
    // 获取年份筛选值
    const yearSelect = document.getElementById('plusMinus6YearSelect');
    const year = yearSelect ? yearSelect.value : '';

    let url = `${window.BACKEND_URL}/plus_minus6_analysis?lottery_type=${lotteryType}&pos=7&page=${page}&page_size=30`;
    if (year) {
      url += `&year=${year}`;
    }
    console.log('请求URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('加减前6码分析数据:', data);

    if (data && data.header && data.data) {
      plusMinus6Page = data.page || page;
      plusMinus6TotalPages = Math.ceil((data.total || 0) / (data.page_size || 30));
      renderPlusMinus6Analysis(data);
    } else {
      resultDiv.innerHTML = `<div style="color: red; padding: 20px;">分析失败: 数据格式错误</div>`;
    }
  } catch (error) {
    console.error('加载加减前6码分析失败:', error);
    resultDiv.innerHTML = `<div style="color: red; padding: 20px;">加载失败: ${error.message}</div>`;
  }
}

/**
 * 渲染加减前6码分析结果
 * @param {Object} data - 分析数据
 */
function renderPlusMinus6Analysis(data) {
  const resultDiv = document.getElementById('plusMinus6Result');
  if (!resultDiv) return;

  const { header, data: rows, page, total, page_size, max_miss, cur_miss, predict } = data;
  const qrEntries = [];

  let html = '';

  // 统计信息
  if (Array.isArray(max_miss) && Array.isArray(cur_miss)) {
    html += '<div style="margin-bottom:16px;padding:12px;background:#f8f9fa;border-radius:8px;">';
    html += '<h4 style="margin:0 0 8px 0;color:#2980d9;">遗漏统计</h4>';
    for (let i = 0; i < Math.min(max_miss.length, cur_miss.length); i++) {
      html += `<div style="margin-bottom:4px;">加减${i+1}组 - 最大遗漏: <b>${max_miss[i] ?? '-'}</b>，当前遗漏: <b>${cur_miss[i] ?? '-'}</b></div>`;
    }
    html += '</div>';
  }

  // 12码预测
  if (predict && Array.isArray(predict.groups)) {
    html += '<div style="margin-bottom:16px;padding:12px;background:#e7f3ff;border:2px solid #27ae60;border-radius:8px;">';
    html += `<h4 style="margin:0 0 8px 0;color:#27ae60;">${predict.desc || '最新一期12码预测'}</h4>`;
    predict.groups.forEach(g => {
      const qrId = `pm6-qr-${predict.period || 'latest'}-${g.n}`;
      const qrText = g.numbers.join(', ');
      qrEntries.push({ id: qrId, text: qrText });
      html += `
        <div class="pm6-predict-row" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px;flex-wrap:wrap;">
          <div><b>加减${g.n}：</b><span style="color:#2980d9;">${qrText}</span></div>
          <div class="pm6-qr" id="${qrId}" data-qr="${qrText}"></div>
        </div>
      `;
    });
    html += '</div>';
  }

  // 数据表格
  html += `
    <div style="margin-bottom:12px;">
      <button id="exportPlusMinus6Btn" class="btn-secondary">导出CSV</button>
    </div>
    <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;text-align:center;font-size:13px;">
      <thead>
        <tr>
  `;

  // 表头
  header.forEach(h => {
    html += `<th>${h}</th>`;
  });

  html += `
        </tr>
      </thead>
      <tbody>
  `;

  // 数据行
  rows.forEach(row => {
    html += '<tr>';
    row.forEach((cell, idx) => {
      if (idx === 2 && Array.isArray(cell)) {
        // 加减0~6组详情
        let groupHtml = '';
        cell.forEach(g => {
          const hitColor = g.hit ? '#27ae60' : '#c0392b';
          groupHtml += `<div style="margin:2px 0;">加减${g.n}: ${g.numbers.join(',')} | <span style="color:${hitColor};font-weight:bold;">${g.hit ? '✓命中' : '✗未中'}</span> | 遗漏: <b>${g.miss}</b></div>`;
        });
        html += `<td style="text-align:left;padding:8px;">${groupHtml}</td>`;
      } else {
        html += `<td>${cell}</td>`;
      }
    });
    html += '</tr>';
  });

  html += `
      </tbody>
    </table>
  `;

  // 分页
  html += `<div style="margin-top:15px;text-align:center;">`;
  html += `<span style="margin-right:15px;">第 ${page} / ${plusMinus6TotalPages} 页</span>`;

  if (page > 1) {
    html += `<button id="plusMinus6PrevPage" class="btn-secondary" style="margin-right:8px;">上一页</button>`;
  }

  if (page < plusMinus6TotalPages) {
    html += `<button id="plusMinus6NextPage" class="btn-secondary">下一页</button>`;
  }

  html += `</div>`;

  resultDiv.innerHTML = html;

  if (qrEntries.length > 0) {
    if (window.QRTool) {
      window.QRTool.renderBatch(qrEntries, 96);
    } else {
      console.warn('QRTool 未加载，无法渲染加减前6码二维码');
    }
  }

  // 绑定分页按钮事件
  const prevBtn = document.getElementById('plusMinus6PrevPage');
  const nextBtn = document.getElementById('plusMinus6NextPage');
  const exportBtn = document.getElementById('exportPlusMinus6Btn');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (plusMinus6Page > 1) {
        loadPlusMinus6Analysis(currentPlusMinus6Type, plusMinus6Page - 1);
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (plusMinus6Page < plusMinus6TotalPages) {
        loadPlusMinus6Analysis(currentPlusMinus6Type, plusMinus6Page + 1);
      }
    };
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      const url = `${window.BACKEND_URL}/plus_minus6_analysis?lottery_type=${currentPlusMinus6Type}&pos=7&export=csv`;
      window.open(url, '_blank');
    };
  }
}

// ==================== 模块初始化 ====================

/**
 * 初始化加减前6码分析模块
 */
function initPlusMinus6() {
  console.log('🎯 初始化加减前6码分析模块...');

  // 绑定彩种选择按钮
  document.querySelectorAll('.plus-minus6-type-btn').forEach(btn => {
    // 检查是否在plusMinus6Page内
    if (btn.closest('#plusMinus6Page')) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#plusMinus6Page .plus-minus6-type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentPlusMinus6Type = this.dataset.type;
        plusMinus6Page = 1; // 重置页码
      });
    }
  });

  // 初始化年份下拉框
  const yearSelect = document.getElementById('plusMinus6YearSelect');
  if (yearSelect && typeof initYearFilter === 'function') {
    initYearFilter('plusMinus6YearSelect', function(year) {
      console.log('年份筛选已改变:', year);
      // 年份改变时不自动加载，用户需要点击"开始分析"按钮
    });
    console.log('✅ 年份筛选已初始化');
  } else {
    console.warn('⚠️ 未找到年份下拉框或 initYearFilter 函数未定义');
  }

  // 绑定开始分析按钮
  const startBtn = document.getElementById('startPlusMinus6AnalysisBtn');
  if (startBtn) {
    startBtn.onclick = () => {
      console.log('开始分析按钮被点击');
      plusMinus6Page = 1; // 重置页码
      loadPlusMinus6Analysis(currentPlusMinus6Type, plusMinus6Page);
    };
    console.log('✅ 开始分析按钮已绑定');
  } else {
    console.warn('⚠️ 未找到开始分析按钮 #startPlusMinus6AnalysisBtn');
  }

  console.log('✅ 加减前6码分析模块初始化完成');
}

// ==================== 模块导出 ====================
window.initPlusMinus6 = initPlusMinus6;
window.loadPlusMinus6Analysis = loadPlusMinus6Analysis;

console.log('✅ 加减前6码分析模块已加载');
