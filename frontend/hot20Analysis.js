/**
 * 去10的最热20分析模块 - 每期显示版本
 * 功能：显示每一期的去10期号码和最热20个号码列表
 */

// 全局状态
let currentHot20Type = 'am';
let currentHot20Pos = 7;
let currentHot20Page = 1;
let currentHot20Year = '';

/**
 * 初始化去10最热20分析页面
 */
function initHot20Minus10Page() {
  if (document.getElementById('hot20Minus10Page')) {
    return; // 页面已存在，不重复创建
  }

  const mainContent = document.querySelector('.main-content');
  const pageDiv = document.createElement('div');
  pageDiv.id = 'hot20Minus10Page';
  pageDiv.style.display = 'none';
  pageDiv.innerHTML = `
    <h2>去10的最热20分析（每期显示）</h2>

    <!-- 控制面板 -->
    <div style="margin-bottom:20px;padding:16px;background:#f8f9fa;border-radius:8px;">
      <div style="display:flex;align-items:center;gap:32px;flex-wrap:wrap;">
        <!-- 彩种选择 -->
        <div>
          <label class="records-query-label" style="display:inline-block;min-width:80px;">选择彩种：</label>
          <div id="hot20TypeBtns" style="display:inline-block;">
            <button class="hot20-type-btn active" data-type="am">澳门</button>
            <button class="hot20-type-btn" data-type="hk">香港</button>
          </div>
        </div>

        <!-- 位置选择 -->
        <div>
          <label class="records-query-label" style="display:inline-block;min-width:80px;">号码位置：</label>
          <div id="hot20PosBtns" style="display:inline-block;">
            <button class="hot20-pos-btn" data-pos="1">第1位</button>
            <button class="hot20-pos-btn" data-pos="2">第2位</button>
            <button class="hot20-pos-btn" data-pos="3">第3位</button>
            <button class="hot20-pos-btn" data-pos="4">第4位</button>
            <button class="hot20-pos-btn" data-pos="5">第5位</button>
            <button class="hot20-pos-btn" data-pos="6">第6位</button>
            <button class="hot20-pos-btn active" data-pos="7">第7位</button>
          </div>
        </div>

        <!-- 查询按钮 -->
        <button id="hot20QueryBtn" style="padding:8px 24px;background:#27ae60;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">
          查询
        </button>
      </div>

      <!-- 年份过滤 -->
      <div id="hot20YearBtns" style="margin-top:12px;"></div>
    </div>

    <!-- 说明信息 -->
    <div id="hot20Info" style="margin-bottom:16px;padding:12px;background:#e7f3ff;border-left:4px solid #2980d9;color:#333;border-radius:4px;">
      <strong>分析说明：</strong>"去10"即排除最近10期出现的号码。每期显示该期往前10期出现过的号码（排除集），以及往前200期排除这些号码后最热的20个号码。<br>
      <strong>遗漏说明：</strong>主表格显示的是<span style="color:#e74c3c;font-weight:bold;">20个号码整体的遗漏</span>。如果这20个号码中<strong>任何一个命中，遗漏清0</strong>；如果<strong>全部未命中，遗漏+1</strong>。展开详情可查看每个号码的独立遗漏情况。
    </div>

    <!-- 结果区域 -->
    <div id="hot20Result"></div>
  `;
  mainContent.appendChild(pageDiv);

  // 绑定事件
  bindHot20Events();
}

/**
 * 绑定事件监听器
 */
function bindHot20Events() {
  // 彩种切换
  document.querySelectorAll('.hot20-type-btn').forEach(btn => {
    btn.onclick = () => {
      const type = btn.dataset.type;
      loadHot20Analysis(type, null, 1, null);
    };
  });

  // 位置切换
  document.querySelectorAll('.hot20-pos-btn').forEach(btn => {
    btn.onclick = () => {
      const pos = parseInt(btn.dataset.pos);
      loadHot20Analysis(null, pos, 1, null);
    };
  });

  // 查询按钮
  const queryBtn = document.getElementById('hot20QueryBtn');
  if (queryBtn) {
    queryBtn.onclick = () => {
      loadHot20Analysis(null, null, 1, null);
    };
  }
}

/**
 * 加载去10最热20分析数据
 */
async function loadHot20Analysis(type, pos, page, year) {
  // 更新状态
  if (type !== null) currentHot20Type = type;
  if (pos !== null) currentHot20Pos = pos;
  if (page !== null) currentHot20Page = page;
  if (year !== undefined) currentHot20Year = year;

  // 更新彩种按钮状态
  document.querySelectorAll('.hot20-type-btn').forEach(btn => {
    if (btn.dataset.type === currentHot20Type) {
      btn.classList.add('active');
      btn.style.background = '#2980d9';
      btn.style.color = '#fff';
    } else {
      btn.classList.remove('active');
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
    }
  });

  // 更新位置按钮状态
  document.querySelectorAll('.hot20-pos-btn').forEach(btn => {
    if (parseInt(btn.dataset.pos) === currentHot20Pos) {
      btn.classList.add('active');
      btn.style.background = '#e67e22';
      btn.style.color = '#fff';
      btn.style.fontWeight = 'bold';
    } else {
      btn.classList.remove('active');
      btn.style.background = '#f0f0f0';
      btn.style.color = '#333';
      btn.style.fontWeight = 'normal';
    }
  });

  // 构建请求URL
  let url = `${window.BACKEND_URL}/api/hot20_minus10?lottery_type=${currentHot20Type}&pos=${currentHot20Pos}&page=${currentHot20Page}&page_size=20`;
  if (currentHot20Year) {
    url += `&year=${currentHot20Year}`;
  }

  // 显示加载中
  const resultDiv = document.getElementById('hot20Result');
  resultDiv.innerHTML = '<p style="text-align:center;padding:40px;color:#666;">加载中...</p>';

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      resultDiv.innerHTML = `<p style="color:#e74c3c;padding:20px;background:#fee;border-radius:6px;">${data.error}</p>`;
      return;
    }

    // 渲染结果
    renderHot20Result(data);

    // 生成年份按钮
    generateHot20YearButtons();

  } catch (error) {
    resultDiv.innerHTML = `<p style="color:#e74c3c;">加载失败：${error.message}</p>`;
  }
}

/**
 * 渲染分析结果
 */
function renderHot20Result(data) {
  const resultDiv = document.getElementById('hot20Result');

  if (!data.data || data.data.length === 0) {
    resultDiv.innerHTML = '<p style="text-align:center;padding:40px;color:#999;">暂无数据</p>';
    return;
  }

  let html = '';

  // 数据信息
  html += `
    <div style="margin-bottom:16px;color:#666;font-size:14px;">
      <span>彩种：<strong>${data.lottery_type === 'am' ? '澳门' : '香港'}</strong></span>
      <span style="margin-left:20px;">位置：<strong>第${data.pos}位</strong></span>
      <span style="margin-left:20px;">共 <strong>${data.total}</strong> 期数据</span>
      ${data.year ? `<span style="margin-left:20px;">年份：<strong>${data.year}</strong></span>` : ''}
    </div>
  `;


  // 导出按钮
  html += `
    <div style="margin-bottom:16px;">
      <button id="hot20ExportBtn" style="padding:6px 16px;background:#27ae60;color:#fff;border:none;border-radius:4px;cursor:pointer;margin-right:8px;">
        📥 导出全部CSV
      </button>
    </div>
  `;

  // 数据表格
  html += `
    <div style="overflow-x:auto;">
      <table class="data-table" style="width:100%;border-collapse:collapse;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <thead>
          <tr style="background:linear-gradient(135deg,#2980d9,#3498db);color:#fff;">
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:100px;">期号</th>
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:150px;">去10期号码</th>
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:200px;">最热20号码</th>
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:120px;">下期结果</th>
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:100px;">当前遗漏</th>
            <th style="padding:12px;text-align:center;border:1px solid #ddd;min-width:120px;">历史最大遗漏</th>
          </tr>
        </thead>
        <tbody>
  `;

  // 数据行
  data.data.forEach((item, index) => {
    const rowBg = index % 2 === 0 ? '#f8f9fa' : '#fff';
    const rowId = `row-${item.period}`;

    // 下期结果显示
    let nextResultHtml = '';
    if (item.next_period && item.next_period_number !== null && item.next_period_number !== undefined) {
      if (item.next_period_in_hot20) {
        nextResultHtml = `<span style="color:#27ae60;font-weight:bold;">✓ 命中: ${item.next_period_number}</span>`;
      } else {
        nextResultHtml = `<span style="color:#e74c3c;font-weight:bold;">✗ 未中: ${item.next_period_number}</span>`;
      }
    } else {
      nextResultHtml = '<span style="color:#999;">-</span>';
    }

    // 当前遗漏颜色（遗漏越大颜色越红）
    const omissionColor = item.current_omission >= 5 ? '#e74c3c' :
                          item.current_omission >= 3 ? '#e67e22' :
                          item.current_omission >= 1 ? '#f39c12' : '#95a5a6';

    html += `
      <tr style="background:${rowBg};">
        <td style="padding:10px;text-align:center;border:1px solid #ddd;font-weight:bold;color:#2980d9;">${item.period}</td>
        <td style="padding:10px;text-align:center;border:1px solid #ddd;color:#e67e22;font-weight:bold;">${item.exclude_numbers_str || '-'}</td>
        <td style="padding:10px;text-align:center;border:1px solid #ddd;color:#27ae60;font-weight:bold;">${item.hot20_str}</td>
        <td style="padding:10px;text-align:center;border:1px solid #ddd;">${nextResultHtml}</td>
        <td style="padding:10px;text-align:center;border:1px solid #ddd;color:${omissionColor};font-weight:bold;font-size:16px;">${item.current_omission}</td>
        <td style="padding:10px;text-align:center;border:1px solid #ddd;color:#9b59b6;font-weight:bold;font-size:16px;">${item.max_omission}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // 分页
  if (data.total_pages > 1) {
    html += renderHot20Pagination(data);
  }

  resultDiv.innerHTML = html;

  // 绑定导出按钮事件
  const exportBtn = document.getElementById('hot20ExportBtn');
  if (exportBtn) {
    exportBtn.onclick = () => exportHot20CSV();
  }

  // 绑定分页按钮事件
  bindHot20PaginationEvents();
}

/**
 * 渲染分页
 */
function renderHot20Pagination(data) {
  const { page, total_pages } = data;

  let html = '<div style="margin-top:20px;text-align:center;">';

  // 上一页
  if (page > 1) {
    html += `<button class="page-btn" data-page="${page - 1}" style="padding:6px 12px;margin:0 4px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;">上一页</button>`;
  }

  // 页码
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(total_pages, page + 2);

  if (startPage > 1) {
    html += `<button class="page-btn" data-page="1" style="padding:6px 12px;margin:0 4px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;">1</button>`;
    if (startPage > 2) html += '<span style="margin:0 4px;">...</span>';
  }

  for (let i = startPage; i <= endPage; i++) {
    const isActive = i === page;
    const bgColor = isActive ? '#2980d9' : '#fff';
    const textColor = isActive ? '#fff' : '#333';
    html += `<button class="page-btn" data-page="${i}" style="padding:6px 12px;margin:0 4px;border:1px solid #ddd;background:${bgColor};color:${textColor};cursor:pointer;border-radius:4px;font-weight:${isActive ? 'bold' : 'normal'};\">${i}</button>`;
  }

  if (endPage < total_pages) {
    if (endPage < total_pages - 1) html += '<span style="margin:0 4px;">...</span>';
    html += `<button class="page-btn" data-page="${total_pages}" style="padding:6px 12px;margin:0 4px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;">${total_pages}</button>`;
  }

  // 下一页
  if (page < total_pages) {
    html += `<button class="page-btn" data-page="${page + 1}" style="padding:6px 12px;margin:0 4px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;">下一页</button>`;
  }

  html += `<span style="margin-left:16px;color:#666;">第 ${page} / ${total_pages} 页</span>`;
  html += '</div>';

  return html;
}

/**
 * 绑定分页按钮事件
 */
function bindHot20PaginationEvents() {
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.onclick = () => {
      const page = parseInt(btn.dataset.page);
      loadHot20Analysis(null, null, page, undefined);
    };
  });
}

/**
 * 生成年份过滤按钮
 */
function generateHot20YearButtons() {
  const yearBtnsDiv = document.getElementById('hot20YearBtns');
  if (!yearBtnsDiv) return;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= currentYear - 3; year--) {
    years.push(year.toString());
  }

  let html = '<label class="records-query-label" style="margin-right:8px;">年份筛选：</label>';
  html += `<button class="year-filter-btn ${!currentHot20Year ? 'active' : ''}" data-year="" style="padding:4px 12px;margin:0 4px;border:1px solid #ddd;background:${!currentHot20Year ? '#2980d9' : '#fff'};color:${!currentHot20Year ? '#fff' : '#333'};cursor:pointer;border-radius:4px;">全部</button>`;

  years.forEach(year => {
    const isActive = currentHot20Year === year;
    html += `<button class="year-filter-btn ${isActive ? 'active' : ''}" data-year="${year}" style="padding:4px 12px;margin:0 4px;border:1px solid #ddd;background:${isActive ? '#2980d9' : '#fff'};color:${isActive ? '#fff' : '#333'};cursor:pointer;border-radius:4px;">${year}</button>`;
  });

  yearBtnsDiv.innerHTML = html;

  // 绑定年份按钮事件
  document.querySelectorAll('.year-filter-btn').forEach(btn => {
    btn.onclick = () => {
      const year = btn.dataset.year;
      loadHot20Analysis(null, null, 1, year);
    };
  });
}

/**
 * 导出CSV
 */
function exportHot20CSV() {
  const url = `${window.BACKEND_URL}/api/hot20_minus10/export_all?lottery_type=${currentHot20Type}&pos=${currentHot20Pos}${currentHot20Year ? '&year=' + currentHot20Year : ''}`;
  window.open(url, '_blank');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHot20Minus10Page);
} else {
  initHot20Minus10Page();
}
