// ==================== 号码间隔期数分析功能 ====================

console.log('号码间隔期数分析模块已加载');

// 标记脚本已加载
window.numberGapAnalysisLoaded = true;

// 全局变量（使用 gap 前缀避免命名冲突）
let gapCurrentPage = 1;
let gapPageSize = 50;
let gapCurrentLotteryType = 'am';
let gapCurrentYear = null;

// 初始化号码间隔期数分析页面
function initNumberGapAnalysisPage() {
  console.log('初始化号码间隔期数分析页面...');

  // 绑定彩种切换按钮事件
  const typeBtns = document.querySelectorAll('#numberGapAnalysisPage .gap-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      gapCurrentLotteryType = this.dataset.type;
      gapCurrentPage = 1; // 重置页码
      loadNumberGapData();
    });
  });

  // 绑定年份筛选下拉框事件
  const yearSelect = document.getElementById('gapYearSelect');
  if (yearSelect) {
    yearSelect.addEventListener('change', function() {
      gapCurrentYear = this.value || null;
      gapCurrentPage = 1; // 重置页码
      loadNumberGapData();
    });
  }

  // 绑定导出CSV按钮事件
  const exportBtn = document.getElementById('exportGapCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportNumberGapCsv);
  }

  // 初始化年份下拉框
  initYearOptions();

  // 加载初始数据
  loadNumberGapData();
}

// 初始化年份下拉框选项
function initYearOptions() {
  const yearSelect = document.getElementById('gapYearSelect');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '<option value="">全部年份</option>';

  // 生成最近5年的选项
  for (let year = currentYear; year >= currentYear - 4; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year + '年';
    yearSelect.appendChild(option);
  }
}

// 加载号码间隔期数数据
async function loadNumberGapData() {
  console.log(`加载号码间隔数据：彩种=${gapCurrentLotteryType}, 页码=${gapCurrentPage}, 年份=${gapCurrentYear || '全部'}`);

  const resultDiv = document.getElementById('numberGapResult');
  if (!resultDiv) {
    console.error('找不到 numberGapResult 元素');
    return;
  }

  // 显示加载中
  resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:#666;"><div class="loading-spinner"></div><p style="margin-top:15px;">正在加载数据...</p></div>';

  try {
    // 构建请求URL
    let url = `${window.BACKEND_URL}/api/number_gap_analysis?lottery_type=${gapCurrentLotteryType}&page=${gapCurrentPage}&page_size=${gapPageSize}`;
    if (gapCurrentYear) {
      url += `&year=${gapCurrentYear}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.success && data.data && data.data.length > 0) {
      console.log('获取到号码间隔数据:', data);
      renderNumberGapTable(data);
    } else {
      resultDiv.innerHTML = '<div style="text-align:center;color:#888;padding:40px;">暂无数据</div>';
    }
  } catch (error) {
    console.error('加载号码间隔数据失败:', error);
    resultDiv.innerHTML = `<div style="text-align:center;color:red;padding:40px;">加载失败：${error.message}</div>`;
  }
}

// 渲染号码间隔期数表格
function renderNumberGapTable(data) {
  const resultDiv = document.getElementById('numberGapResult');
  if (!resultDiv) return;

  const { data: records, pagination } = data;

  // 构建表格HTML
  let html = `
    <div class="analysis-result-wrapper">
      <div class="analysis-header">
        <h3 style="color:#2c3e50;margin:0;">号码间隔期数分析</h3>
        <div class="info-bar" style="background:#e8f4f8;padding:12px;border-radius:6px;margin:10px 0;font-size:14px;color:#34495e;">
          <span style="font-weight:600;">📊 数据说明：</span>
          显示每期开奖号码在对应位置距离上次出现的间隔期数。
          <span style="color:#e74c3c;font-weight:600;">首次出现</span>标记为红色。
          间隔0期表示<span style="color:#27ae60;font-weight:600;">连续开出</span>。
        </div>
      </div>

      <div class="table-container" style="overflow-x:auto;">
        <table class="analysis-table" style="width:100%;border-collapse:collapse;margin-top:15px;">
          <thead>
            <tr style="background:#2c3e50;color:white;">
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">期号</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:150px;">开奖时间</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球1(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球2(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球3(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球4(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球5(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球6(间隔)</th>
              <th style="padding:12px;text-align:center;border:1px solid #34495e;min-width:100px;">球7(间隔)</th>
            </tr>
          </thead>
          <tbody>
  `;

  // 填充数据行
  records.forEach((record, index) => {
    const rowBg = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
    html += `<tr style="background:${rowBg};">`;
    html += `<td style="padding:10px;text-align:center;border:1px solid #dee2e6;font-weight:600;">${record.period}</td>`;
    html += `<td style="padding:10px;text-align:center;border:1px solid #dee2e6;">${record.open_time}</td>`;

    // 渲染7个号码及其间隔
    for (let i = 0; i < 7; i++) {
      const num = record.numbers[i];
      const gap = record.gaps[i];

      let cellContent = '';
      let cellStyle = 'padding:10px;text-align:center;border:1px solid #dee2e6;';

      if (gap === -1) {
        // 首次出现，红色高亮
        cellContent = `<div style="font-weight:bold;"><span style="color:#e74c3c;font-size:18px;">${num}</span><br><span style="color:#e74c3c;font-size:12px;">(首次)</span></div>`;
      } else if (gap === 0) {
        // 连续开出，绿色高亮
        cellContent = `<div style="font-weight:bold;"><span style="color:#27ae60;font-size:18px;">${num}</span><br><span style="color:#27ae60;font-size:12px;">(0期)</span></div>`;
      } else if (gap >= 1 && gap <= 3) {
        // 短间隔，蓝色
        cellContent = `<div><span style="color:#2980d9;font-size:18px;font-weight:600;">${num}</span><br><span style="color:#7f8c8d;font-size:12px;">(${gap}期)</span></div>`;
      } else if (gap >= 4 && gap <= 10) {
        // 中等间隔，橙色
        cellContent = `<div><span style="color:#e67e22;font-size:18px;font-weight:600;">${num}</span><br><span style="color:#7f8c8d;font-size:12px;">(${gap}期)</span></div>`;
      } else {
        // 长间隔，紫色
        cellContent = `<div><span style="color:#9b59b6;font-size:18px;font-weight:600;">${num}</span><br><span style="color:#7f8c8d;font-size:12px;">(${gap}期)</span></div>`;
      }

      html += `<td style="${cellStyle}">${cellContent}</td>`;
    }

    html += '</tr>';
  });

  html += `
          </tbody>
        </table>
      </div>
  `;

  // 添加分页控件
  html += renderPagination(pagination);

  // 添加颜色图例说明
  html += `
      <div style="margin-top:20px;padding:15px;background:#f8f9fa;border-radius:8px;border-left:4px solid #3498db;">
        <div style="font-weight:600;color:#2c3e50;margin-bottom:10px;">🎨 颜色说明：</div>
        <div style="display:flex;flex-wrap:wrap;gap:15px;font-size:14px;">
          <span><span style="color:#e74c3c;font-weight:bold;">● 红色</span> - 首次出现</span>
          <span><span style="color:#27ae60;font-weight:bold;">● 绿色</span> - 连续开出(0期)</span>
          <span><span style="color:#2980d9;font-weight:bold;">● 蓝色</span> - 短间隔(1-3期)</span>
          <span><span style="color:#e67e22;font-weight:bold;">● 橙色</span> - 中等间隔(4-10期)</span>
          <span><span style="color:#9b59b6;font-weight:bold;">● 紫色</span> - 长间隔(11期以上)</span>
        </div>
      </div>
    </div>
  `;

  resultDiv.innerHTML = html;
}

// 渲染分页控件
function renderPagination(pagination) {
  const { page, page_size, total, total_pages } = pagination;

  if (total_pages <= 1) {
    return `<div style="text-align:center;color:#7f8c8d;margin-top:20px;font-size:14px;">共 ${total} 条记录</div>`;
  }

  let html = `
    <div class="pagination-wrapper" style="display:flex;justify-content:center;align-items:center;margin-top:20px;gap:10px;flex-wrap:wrap;">
      <span style="color:#7f8c8d;font-size:14px;">共 ${total} 条，第 ${page}/${total_pages} 页</span>
  `;

  // 首页按钮
  if (page > 1) {
    html += `<button class="pagination-btn" onclick="gotoPage(1)" style="padding:8px 15px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;transition:all 0.3s;">首页</button>`;
    html += `<button class="pagination-btn" onclick="gotoPage(${page - 1})" style="padding:8px 15px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;transition:all 0.3s;">上一页</button>`;
  }

  // 页码按钮（显示当前页前后2页）
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(total_pages, page + 2);

  for (let i = startPage; i <= endPage; i++) {
    if (i === page) {
      html += `<button class="pagination-btn active" style="padding:8px 15px;border:2px solid #3498db;background:#3498db;color:white;font-weight:bold;cursor:default;border-radius:4px;">${i}</button>`;
    } else {
      html += `<button class="pagination-btn" onclick="gotoPage(${i})" style="padding:8px 15px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;transition:all 0.3s;">${i}</button>`;
    }
  }

  // 末页按钮
  if (page < total_pages) {
    html += `<button class="pagination-btn" onclick="gotoPage(${page + 1})" style="padding:8px 15px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;transition:all 0.3s;">下一页</button>`;
    html += `<button class="pagination-btn" onclick="gotoPage(${total_pages})" style="padding:8px 15px;border:1px solid #ddd;background:#fff;cursor:pointer;border-radius:4px;transition:all 0.3s;">末页</button>`;
  }

  html += '</div>';

  // 添加分页按钮hover样式
  html += `
    <style>
      .pagination-btn:not(.active):hover {
        background: #3498db !important;
        color: white !important;
        border-color: #3498db !important;
      }
    </style>
  `;

  return html;
}

// 跳转到指定页
function gotoPage(page) {
  gapCurrentPage = page;
  loadNumberGapData();
}

// 导出CSV
async function exportNumberGapCsv() {
  console.log('开始导出CSV...');

  try {
    // 构建导出URL
    let url = `${window.BACKEND_URL}/api/number_gap_analysis/export?lottery_type=${gapCurrentLotteryType}`;
    if (gapCurrentYear) {
      url += `&year=${gapCurrentYear}`;
    }

    // 显示加载提示
    const exportBtn = document.getElementById('exportGapCsvBtn');
    const originalText = exportBtn.textContent;
    exportBtn.textContent = '导出中...';
    exportBtn.disabled = true;

    // 下载文件
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('导出失败');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;

    // 从响应头获取文件名，或使用默认文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = `${currentLotteryType.toUpperCase()}_号码间隔期数分析.csv`;
    if (contentDisposition) {
      const matches = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
      if (matches && matches[1]) {
        filename = decodeURIComponent(matches[1]);
      }
    }

    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(downloadUrl);

    // 恢复按钮状态
    exportBtn.textContent = originalText;
    exportBtn.disabled = false;

    console.log('CSV导出成功');
  } catch (error) {
    console.error('导出CSV失败:', error);
    alert('导出失败：' + error.message);

    // 恢复按钮状态
    const exportBtn = document.getElementById('exportGapCsvBtn');
    exportBtn.textContent = '📥 导出CSV';
    exportBtn.disabled = false;
  }
}

// 确保函数在全局作用域可访问
window.initNumberGapAnalysisPage = initNumberGapAnalysisPage;
window.gotoPage = gotoPage;

console.log('numberGapAnalysis.js 加载完成');
