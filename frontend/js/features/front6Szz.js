/**
 * 前6码三中三分析模块
 * 功能：分析前6个号码的三中三命中情况
 */

// ==================== 模块状态 ====================
let currentFront6SzzType = 'am';
let front6SzzPage = 1;
let front6SzzTotalPages = 1;

// ==================== 核心功能函数 ====================

/**
 * 加载前6码三中三数据
 * @param {string} lotteryType - 彩种类型（am/hk）
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 */
async function loadFront6Szz(lotteryType, page = 1, pageSize = 30) {
  const resultDiv = document.getElementById('front6SzzResult');
  const statsDiv = document.getElementById('front6SzzStats');

  if (!resultDiv) {
    console.error('未找到 front6SzzResult 元素');
    return;
  }

  currentFront6SzzType = lotteryType;
  front6SzzPage = page;

  resultDiv.innerHTML = '<div style="text-align: center; padding: 20px;">正在分析前6码三中三...</div>';
  if (statsDiv) statsDiv.style.display = 'none';

  try {
    const url = `${window.BACKEND_URL}/api/front6_sanzhong3?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`;
    console.log('请求URL:', url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log('前6码三中三数据:', data);

    if (data.success) {
      front6SzzPage = data.data.page || page;
      front6SzzTotalPages = data.data.total_pages || 1;
      renderFront6Szz(data.data);
    } else {
      resultDiv.innerHTML = `<div style="color: red; padding: 20px;">分析失败: ${data.message || '未知错误'}</div>`;
    }
  } catch (error) {
    console.error('加载前6码三中三失败:', error);
    resultDiv.innerHTML = `<div style="color: red; padding: 20px;">加载失败: ${error.message}</div>`;
  }
}

/**
 * 渲染前6码三中三结果
 * @param {Object} data - 分析数据
 */
function renderFront6Szz(data) {
  const resultDiv = document.getElementById('front6SzzResult');
  const statsDiv = document.getElementById('front6SzzStats');

  if (!resultDiv) return;

  const { results, total_triggers, hit_count, hit_rate, current_miss, max_miss, page, total_pages, page_size } = data || {};

  // 分页HTML
  const pagerHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="front6SzzPrev" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page || 1}</strong> / <strong>${total_pages || 1}</strong> 页</span>
        <button id="front6SzzNext" class="btn-secondary" ${(!total_pages || page >= total_pages) ? 'disabled' : ''}>下一页</button>
      </div>
      <div>
        <button id="front6SzzExport" class="btn-secondary">导出CSV</button>
      </div>
    </div>
  `;

  // 表格HTML
  let html = `${pagerHtml}
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>触发期数</th>
            <th>开奖时间</th>
            <th>推荐6码</th>
            <th>窗口期(后5期)</th>
            <th>窗口前6号码</th>
            <th>是否命中</th>
            <th>命中期</th>
            <th>命中重合号码</th>
            <th>连续遗漏</th>
          </tr>
        </thead>
        <tbody>
  `;

  (results || []).forEach(r => {
    const rec6 = (r.recommend6 || []).join(',');
    const winStr = (r.window_periods || []).join(', ');
    const winFront6 = (r.window_front6 || []).map(arr => (arr || []).join(',')).join(' | ');
    const isHit = r.is_hit ? '命中' : '遗漏';
    const hitPeriod = (r.hit_detail && r.hit_detail.hit_period) ? r.hit_detail.hit_period : '-';
    const hitNums = (r.hit_detail && r.hit_detail.hit_common_numbers) ? r.hit_detail.hit_common_numbers.join(',') : '';

    html += `
      <tr>
        <td>${r.trigger_period}</td>
        <td>${r.open_time}</td>
        <td style="white-space:nowrap;">${rec6}</td>
        <td>${winStr}</td>
        <td style="font-size:12px;">${winFront6}</td>
        <td class="${r.is_hit ? 'hit' : 'miss'}">${isHit}</td>
        <td>${hitPeriod}</td>
        <td>${hitNums}</td>
        <td>${typeof r.omission_streak === 'number' ? r.omission_streak : ''}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>${pagerHtml}`;
  resultDiv.innerHTML = html;

  // 更新统计信息
  if (statsDiv) {
    const totalEl = document.getElementById('front6SzzTotal');
    const hitEl = document.getElementById('front6SzzHitCount');
    const rateEl = document.getElementById('front6SzzHitRate');
    const curMissEl = document.getElementById('front6SzzCurrentMiss');
    const maxMissEl = document.getElementById('front6SzzMaxMiss');

    if (totalEl) totalEl.textContent = String(total_triggers || 0);
    if (hitEl) hitEl.textContent = String(hit_count || 0);
    if (rateEl) rateEl.textContent = String((hit_rate || 0) + '%');
    if (curMissEl) curMissEl.textContent = String(current_miss || 0);
    if (maxMissEl) maxMissEl.textContent = String(max_miss || 0);

    statsDiv.style.display = 'block';
  }

  // 绑定分页按钮事件
  const prevBtn = document.getElementById('front6SzzPrev');
  const nextBtn = document.getElementById('front6SzzNext');
  const exportBtn = document.getElementById('front6SzzExport');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (front6SzzPage > 1) {
        loadFront6Szz(currentFront6SzzType, front6SzzPage - 1, page_size || 30);
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (front6SzzPage < front6SzzTotalPages) {
        loadFront6Szz(currentFront6SzzType, front6SzzPage + 1, page_size || 30);
      }
    };
  }

  if (exportBtn) {
    exportBtn.onclick = () => {
      const url = `${window.BACKEND_URL}/api/front6_sanzhong3?lottery_type=${currentFront6SzzType}&export=csv`;
      window.open(url, '_blank');
    };
  }
}

// ==================== 模块初始化 ====================

/**
 * 初始化前6码三中三模块
 */
function initFront6Szz() {
  console.log('🎯 初始化前6码三中三模块...');

  // 绑定彩种选择按钮
  document.querySelectorAll('.seventh-range-type-btn').forEach(btn => {
    // 检查是否在front6SzzPage内
    if (btn.closest('#front6SzzPage')) {
      btn.addEventListener('click', function() {
        document.querySelectorAll('#front6SzzPage .seventh-range-type-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFront6SzzType = this.dataset.type;
        front6SzzPage = 1; // 重置页码
      });
    }
  });

  // 绑定开始分析按钮
  const startBtn = document.getElementById('startFront6SzzBtn');
  if (startBtn) {
    startBtn.onclick = () => {
      console.log('开始分析按钮被点击');
      front6SzzPage = 1; // 重置页码
      loadFront6Szz(currentFront6SzzType, front6SzzPage, 30);
    };
    console.log('✅ 开始分析按钮已绑定');
  } else {
    console.warn('⚠️ 未找到开始分析按钮 #startFront6SzzBtn');
  }

  console.log('✅ 前6码三中三模块初始化完成');
}

// ==================== 模块导出 ====================
window.initFront6Szz = initFront6Szz;
window.loadFront6Szz = loadFront6Szz;

console.log('✅ 前6码三中三模块已加载');
