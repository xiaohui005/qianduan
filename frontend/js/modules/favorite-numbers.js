/**
 * 关注号码管理模块 (Favorite Numbers Module)
 * 功能：关注号码的增删改查、遗漏统计和分析 + 二维码查看
 *
 * API端点:
 * - GET /api/favorite_numbers - 获取关注号码列表
 * - POST /api/favorite_numbers - 创建关注号码
 * - PUT /api/favorite_numbers/{id} - 更新关注号码
 * - DELETE /api/favorite_numbers/{id} - 删除关注号码
 * - GET /api/favorite_numbers/{id}/analysis - 分析关注号码
 *
 * @module favorite-numbers
 */

function initFavoriteNumbersModule() {
  console.log('Initializing Favorite Numbers module...');
  generateYearButtons();
  loadFavoriteNumbers();
  bindFavoriteNumbersEvents();
  console.log('Favorite Numbers module initialized');
}

function generateYearButtons() {
  const yearButtonsDiv = document.querySelector('.year-buttons');
  if (!yearButtonsDiv) return;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= currentYear - 3; year--) {
    years.push(year);
  }

  let buttonsHTML = '<button type="button" class="year-btn active" data-year="">✓ 全部年份</button>';
  years.forEach(year => {
    buttonsHTML += `<button type="button" class="year-btn" data-year="${year}">${year}年</button>`;
  });

  yearButtonsDiv.innerHTML = buttonsHTML;

  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.year-btn').forEach(b => {
        b.classList.remove('active');
        const year = b.getAttribute('data-year');
        b.textContent = year ? `${year}年` : '全部年份';
      });

      this.classList.add('active');
      const selectedYear = this.getAttribute('data-year');
      this.textContent = selectedYear ? `✓ ${selectedYear}年` : '✓ 全部年份';

      loadFavoriteNumbers();
    });
  });
}

async function loadFavoriteNumbers() {
  try {
    console.log('开始加载关注号码...');
    const activeBtn = document.querySelector('.position-btn.active');
    const activeLotteryBtn = document.querySelector('.lottery-btn.active');
    const activeYearBtn = document.querySelector('.year-btn.active');
    const position = activeBtn ? activeBtn.getAttribute('data-position') : 7;
    const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
    const year = activeYearBtn ? activeYearBtn.getAttribute('data-year') : '';

    const minMissInput = document.getElementById('minMissInput');
    const maxMissInput = document.getElementById('maxMissInput');
    const minMiss = minMissInput && minMissInput.value ? parseInt(minMissInput.value) : null;
    const maxMiss = maxMissInput && maxMissInput.value ? parseInt(maxMissInput.value) : null;

    const sortBy = window.currentSortBy || null;

    let url = `${window.BACKEND_URL}/api/favorite_numbers?position=${position}&lottery_type=${lotteryType}`;
    if (year) url += `&year=${year}`;
    if (minMiss !== null) url += `&min_miss=${minMiss}`;
    if (maxMiss !== null) url += `&max_miss=${maxMiss}`;
    if (sortBy) url += `&sort_by=${sortBy}`;

    const res = await fetch(url);
    const result = await res.json();

    if (result.success) {
      renderFavoriteNumbersTable(result.data, lotteryType, position, year);
    } else {
      console.error('加载关注号码失败:', result.message);
    }
  } catch (error) {
    console.error('加载关注号码失败:', error);
  }
}

function renderFavoriteNumbersTable(favoriteNumbers, lotteryType, position, year) {
  const tableInfo = document.getElementById('tableInfo');
  if (tableInfo) {
    const lotteryName = lotteryType === 'am' ? '澳门' : '香港';
    const yearText = year ? `<span style="color:#e74c3c;font-weight:bold;">${year}年</span>` : '<span style="color:#27ae60;font-weight:bold;">全部年份</span>';
    tableInfo.innerHTML = `当前分析：<span style="color:#2980d9;font-weight:bold;">${lotteryName}彩种</span> - <span style="color:#e67e22;font-weight:bold;">第${position}位</span>号码遗漏统计 【${yearText}】`;
  }

  const tbody = document.querySelector('#favoriteNumbersTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!favoriteNumbers || favoriteNumbers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#999;">暂无数据</td></tr>';
    return;
  }

  favoriteNumbers.forEach((item, index) => {
    const gap = item.gap !== undefined ? item.gap : (item.max_miss || 0) - (item.current_miss || 0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name || ''}</td>
      <td>${item.numbers || ''}</td>
      <td>${item.current_miss || 0}</td>
      <td>${item.max_miss || 0}</td>
      <td style="font-weight:bold;color:${gap < 5 ? '#e74c3c' : gap < 10 ? '#e67e22' : '#27ae60'};">${gap}</td>
      <td>${item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      <td style="white-space: nowrap;">
        <button class="btn-edit" data-id="${item.id}">编辑</button>
        <button class="btn-delete" data-id="${item.id}">删除</button>
        <button class="btn-analyze" data-id="${item.id}">分析</button>
        <button class="btn-qrcode" data-id="${item.id}">二维码</button>
      </td>
    `;

    row.querySelector('.btn-edit').onclick = () => editFavoriteNumber(item.id);
    row.querySelector('.btn-delete').onclick = () => deleteFavoriteNumber(item.id);
    row.querySelector('.btn-analyze').onclick = () => {
      const pos = document.querySelector('.position-btn.active')?.getAttribute('data-position') || 7;
      analyzeFavoriteNumber(item.id, pos);
    };
    row.querySelector('.btn-qrcode').onclick = () => showFavoriteNumberQRCode(item);

    tbody.appendChild(row);
  });
}

function bindFavoriteNumbersEvents() {
  const form = document.getElementById('favoriteNumbersForm');
  if (form) {
    form.onsubmit = async function (e) {
      e.preventDefault();
      const id = document.getElementById('favoriteNumberId').value;
      const name = document.getElementById('favoriteNumberName').value.trim();
      const numbers = document.getElementById('favoriteNumbers').value.trim();

      if (!name || !numbers) {
        alert('请填写完整信息');
        return;
      }

      try {
        const data = { name, numbers };
        let res;
        if (id) {
          res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }

        const result = await res.json();
        if (result.success) {
          alert(id ? '更新成功' : '添加成功');
          resetFavoriteNumberForm();
          loadFavoriteNumbers();
        } else {
          alert('操作失败: ' + result.message);
        }
      } catch (error) {
        console.error('操作失败:', error);
        alert('操作失败，请检查网络连接');
      }
    };
  }

  const cancelBtn = document.getElementById('cancelFavoriteNumberBtn');
  if (cancelBtn) cancelBtn.onclick = resetFavoriteNumberForm;

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.onclick = loadFavoriteNumbers;

  document.querySelectorAll('.lottery-btn').forEach(btn => {
    btn.onclick = function () {
      document.querySelectorAll('.lottery-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadFavoriteNumbers();
    };
  });

  document.querySelectorAll('.position-btn').forEach(btn => {
    btn.onclick = function () {
      document.querySelectorAll('.position-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadFavoriteNumbers();
    };
  });

  const applyMissFilterBtn = document.getElementById('applyMissFilterBtn');
  if (applyMissFilterBtn) applyMissFilterBtn.onclick = loadFavoriteNumbers;

  const clearMissFilterBtn = document.getElementById('clearMissFilterBtn');
  if (clearMissFilterBtn) {
    clearMissFilterBtn.onclick = function () {
      const min = document.getElementById('minMissInput');
      const max = document.getElementById('maxMissInput');
      if (min) min.value = '';
      if (max) max.value = '';
      loadFavoriteNumbers();
    };
  }

  const sortByGapBtn = document.getElementById('sortByGapBtn');
  if (sortByGapBtn) {
    sortByGapBtn.onclick = function () {
      window.currentSortBy = 'gap_asc';
      loadFavoriteNumbers();
    };
  }

  const sortByDefaultBtn = document.getElementById('sortByDefaultBtn');
  if (sortByDefaultBtn) {
    sortByDefaultBtn.onclick = function () {
      window.currentSortBy = null;
      loadFavoriteNumbers();
    };
  }
}

function resetFavoriteNumberForm() {
  document.getElementById('favoriteNumberId').value = '';
  document.getElementById('favoriteNumberName').value = '';
  document.getElementById('favoriteNumbers').value = '';
  document.getElementById('cancelFavoriteNumberBtn').style.display = 'none';
}

async function editFavoriteNumber(id) {
  try {
    const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers`);
    const result = await res.json();
    if (result.success) {
      const item = result.data.find(item => item.id == id);
      if (item) {
        document.getElementById('favoriteNumberId').value = item.id;
        document.getElementById('favoriteNumberName').value = item.name;
        document.getElementById('favoriteNumbers').value = item.numbers;
        document.getElementById('cancelFavoriteNumberBtn').style.display = 'inline-block';
      }
    }
  } catch (error) {
    console.error('获取关注号码失败:', error);
  }
}

async function deleteFavoriteNumber(id) {
  if (!confirm('确定要删除这个关注号码组吗？')) return;
  try {
    const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      alert('删除成功');
      loadFavoriteNumbers();
    } else {
      alert('删除失败: ' + result.message);
    }
  } catch (error) {
    console.error('删除失败:', error);
    alert('删除失败，请检查网络连接');
  }
}

async function analyzeFavoriteNumber(id, position = 7) {
  const analysisResult = document.getElementById('favoriteNumberAnalysisResult');
  if (!analysisResult) return;

  analysisResult.innerHTML = '<div style="text-align:center;padding:40px;"><div style="font-size:18px;color:#667eea;">正在分析中...</div></div>';
  analysisResult.style.display = 'block';

  try {
    const activeLotteryBtn = document.querySelector('.lottery-btn.active');
    const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';

    const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}/analysis?lottery_type=${lotteryType}&position=${position}`);
    const result = await res.json();

    if (result.success) {
      showFavoriteNumberAnalysis(result.data);
      setTimeout(() => analysisResult.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      analysisResult.innerHTML = `<div style="text-align:center;padding:40px;background:#ffe6e6;border:2px solid #ff4444;border-radius:12px;">
        <div style="font-size:24px;">Failed</div>
        <div style="font-size:18px;color:#cc0000;font-weight:bold;">分析失败</div>
        <div style="margin-top:10px;">${result.message}</div>
      </div>`;
    }
  } catch (error) {
    console.error('分析失败:', error);
    analysisResult.innerHTML = `<div style="text-align:center;padding:40px;background:#ffe6e6;border:2px solid #ff4444;border-radius:12px;">
      <div style="font-size:24px;">Failed</div>
      <div style="font-size:18px;color:#cc0000;font-weight:bold;">分析失败</div>
      <div style="margin-top:10px;">请检查网络连接</div>
    </div>`;
  }
}

/**
 * 显示关注号码分析结果
 */
function showFavoriteNumberAnalysis(data) {
  console.log('🎯 开始显示关注号码分析结果');
  const analysisResult = document.getElementById('favoriteNumberAnalysisResult');
  if (!analysisResult) {
    console.error('❌ 找不到 favoriteNumberAnalysisResult 元素！');
    return;
  }
  console.log('✅ 找到分析结果元素，准备显示数据');

  const { favorite_group, numbers, analysis, position_stats, stats } = data;

  const activeLotteryBtn = document.querySelector('.lottery-btn.active');
  const activePositionBtn = document.querySelector('.position-btn.active');
  const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
  const position = activePositionBtn ? activePositionBtn.getAttribute('data-position') : 7;
  const lotteryName = lotteryType === 'am' ? '澳门' : '香港';

  let html = `
    <div class="analysis-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); animation: slideIn 0.5s ease-out;">
      <h3 style="color: white; font-size: 22px; margin-bottom: 20px; text-align: center; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">📊 关注号码组分析结果</h3>
      <div class="analysis-info" style="background: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 15px; backdrop-filter: blur(10px);">
        <p style="color: white;"><strong style="color: #ffd700;">号码组名称：</strong>${favorite_group.name}</p>
        <p style="color: white;"><strong style="color: #ffd700;">关注号码：</strong>${favorite_group.numbers}</p>
        <p style="color: white;"><strong style="color: #ffd700;">分析彩种：</strong>${lotteryName}</p>
        <p style="color: white;"><strong style="color: #ffd700;">分析位置：</strong>第${position}位</p>
        <p style="color: white;"><strong style="color: #ffd700;">创建时间：</strong>${window.formatDateTime(favorite_group.created_at)}</p>
      </div>
      <button class="pagination-btn" onclick="exportFavoriteAnalysis()" style="margin-top: 15px; background: #ffd700; color: #333; font-weight: bold; border: none; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">📥 导出Excel</button>
    </div>
    <style>
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  `;

  // 重置页码为第1页(每次加载新分析时)
  window.currentAnalysisPage = 1;

  // 详细记录分页
  const pageSize = 20;
  const currentPage = window.currentAnalysisPage;
  const totalRecords = analysis.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  html += `
    <div class="stats-section" style="margin-top: 30px; border: 3px solid #667eea; border-radius: 12px; padding: 20px; background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%); box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
      <h4 style="color: #667eea; font-size: 20px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 3px solid #667eea; text-align: center;">📋 详细记录（共 <span style="color: #e74c3c; font-weight: bold; font-size: 22px;">${totalRecords}</span> 期）</h4>
      <div class="table-container" style="overflow-x: auto; border-radius: 8px;">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <tr>
              <th style="padding: 12px; text-align: center; font-weight: bold;">期数</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">开奖时间</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">开奖号码</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">中奖号码</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">中奖位置</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">是否中奖</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">当前遗漏</th>
              <th style="padding: 12px; text-align: center; font-weight: bold;">历史最大遗漏</th>
            </tr>
          </thead>
          <tbody id="analysisTableBody">
  `;

  // 取当前页的数据并按开奖时间从大到小排序（最新的开奖时间在前面）
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = analysis.slice(startIndex, endIndex).sort((a, b) => new Date(b.open_time) - new Date(a.open_time));

  currentPageData.forEach(record => {
    const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
    const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';
    const isHitClass = record.is_hit ? 'hit-yes' : 'hit-no';

    html += `
      <tr>
        <td>${record.period}</td>
        <td>${window.formatDateTime(record.open_time)}</td>
        <td>${record.open_numbers.join(',')}</td>
        <td>${hitNumbers}</td>
        <td>${hitPositions}</td>
        <td class="${isHitClass}">${record.is_hit ? '是' : '否'}</td>
        <td>${record.current_miss}</td>
        <td>${record.max_miss || 0}</td>
      </tr>
    `;
  });

  html += `
            </tbody>
          </table>
        </div>

      <!-- 分页控件 -->
      <div class="pagination-container" style="margin-top: 25px; text-align: center; padding: 15px; background: rgba(102, 126, 234, 0.05); border-radius: 8px;">
        <div class="pagination-info" style="margin-bottom: 15px; font-size: 16px; color: #667eea; font-weight: bold;">
          第 <span style="color: #e74c3c; font-size: 18px;">${currentPage}</span> / ${totalPages} 页，共 <span style="color: #e74c3c; font-size: 18px;">${totalRecords}</span> 条记录
        </div>
        <div class="pagination-controls" style="display: flex; justify-content: center; gap: 15px;">
          <button class="pagination-btn" id="analysisPrevPageBtn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">⬅️ 上一页</button>
          <button class="pagination-btn" id="analysisNextPageBtn" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 10px 25px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: all 0.3s; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);">下一页 ➡️</button>
        </div>
      </div>
    </div>
  `;

  analysisResult.innerHTML = html;
  analysisResult.style.display = 'block';
  console.log('✅ 分析结果已设置到页面，display = block');
  console.log('📊 HTML内容长度:', html.length);

  // 保存分析数据到全局变量，供分页使用
  window.currentAnalysisData = analysis;

  // 简单直接的事件绑定
  const prevBtn = document.getElementById('analysisPrevPageBtn');
  const nextBtn = document.getElementById('analysisNextPageBtn');

  if (prevBtn) {
    prevBtn.disabled = (currentPage === 1);
    prevBtn.onclick = function() {
      if (window.currentAnalysisPage > 1) {
        window.currentAnalysisPage--;
        refreshAnalysisPage();
      }
    };
  }

  if (nextBtn) {
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.onclick = function() {
      const totalPages = Math.ceil(window.currentAnalysisData.length / 20);
      if (window.currentAnalysisPage < totalPages) {
        window.currentAnalysisPage++;
        refreshAnalysisPage();
      }
    };
  }
}

/**
 * 刷新分析结果分页显示
 */
function refreshAnalysisPage() {
  console.log('refreshAnalysisPage 被调用');
  const analysis = window.currentAnalysisData;
  if (!analysis) {
    console.log('错误: currentAnalysisData 不存在');
    return;
  }

  const pageSize = 20;
  const currentPage = window.currentAnalysisPage || 1;
  const totalRecords = analysis.length;
  const totalPages = Math.ceil(totalRecords / pageSize);

  console.log('currentPage:', currentPage, 'totalPages:', totalPages, 'totalRecords:', totalRecords);

  // 更新表格数据
  const tbody = document.getElementById('analysisTableBody');
  if (!tbody) {
    console.log('错误: analysisTableBody 不存在');
    return;
  }

  tbody.innerHTML = '';

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentPageData = analysis.slice(startIndex, endIndex).sort((a, b) => new Date(b.open_time) - new Date(a.open_time));

  currentPageData.forEach(record => {
    const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
    const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';
    const isHitClass = record.is_hit ? 'hit-yes' : 'hit-no';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.period}</td>
      <td>${window.formatDateTime(record.open_time)}</td>
      <td>${record.open_numbers.join(',')}</td>
      <td>${hitNumbers}</td>
      <td>${hitPositions}</td>
      <td class="${isHitClass}">${record.is_hit ? '是' : '否'}</td>
      <td>${record.current_miss}</td>
      <td>${record.max_miss || 0}</td>
    `;
    tbody.appendChild(row);
  });

  console.log('表格数据已渲染，共', currentPageData.length, '条记录');

  // 更新分页信息
  const paginationInfo = document.querySelector('.pagination-info');
  if (paginationInfo) {
    paginationInfo.innerHTML = `
      第 <span style="color: #e74c3c; font-size: 18px;">${currentPage}</span> / ${totalPages} 页，共 <span style="color: #e74c3c; font-size: 18px;">${totalRecords}</span> 条记录
    `;
  }

  // 更新按钮状态
  const prevBtn = document.getElementById('analysisPrevPageBtn');
  const nextBtn = document.getElementById('analysisNextPageBtn');

  if (prevBtn) {
    prevBtn.disabled = (currentPage === 1);
  }

  if (nextBtn) {
    nextBtn.disabled = (currentPage === totalPages);
  }

  console.log('分页控件状态已更新');
}


function exportFavoriteAnalysis() {
  const analysis = window.currentAnalysisData;
  if (!analysis || analysis.length === 0) {
    alert('暂无数据可导出');
    return;
  }

  const csvRows = [['期数', '开奖时间', '开奖号码', '中奖号码', '中奖位置', '是否中奖', '当前遗漏', '历史最大遗漏']];
  const sortedData = analysis.slice().sort((a, b) => new Date(b.open_time) - new Date(a.open_time));

  sortedData.forEach(record => {
    const hitNumbers = record.hits.length > 0 ? record.hits.join(',') : '-';
    const hitPositions = record.hit_positions.length > 0 ? record.hit_positions.join(',') : '-';
    csvRows.push([
      record.period,
      window.formatDateTime(record.open_time),
      record.open_numbers.join(','),
      hitNumbers,
      hitPositions,
      record.is_hit ? '是' : '否',
      record.current_miss,
      record.max_miss || 0
    ]);
  });

  if (typeof window.downloadCSV === 'function') {
    window.downloadCSV(csvRows, '关注号码分析结果.csv');
  } else {
    alert('导出失败：缺少 downloadCSV 函数');
  }
}
/* ====================== 新增：稳定二维码功能（零依赖） ====================== */
function showFavoriteNumberQRCode(item) {
  const lotteryName = document.querySelector('.lottery-btn.active')?.textContent.includes('澳门') ? '澳门' : '香港';
  const position = document.querySelector('.position-btn.active')?.getAttribute('data-position') || '未知';

  const qrText = `${item.numbers}   `;

  // 创建遮罩层
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100vw;height:100vh;
    background:rgba(0,0,0,0.85);z-index:99999;
    display:flex;align-items:center;justify-content:center;
    backdrop-filter:blur(5px);
  `;

  overlay.innerHTML = `
    <div style="background:#fff;padding:30px 25px;border-radius:20px;text-align:center;max-width:92%;box-shadow:0 20px 60px rgba(0,0,0,0.5);position:relative;">
      <button id="closeQrBtn" style="position:absolute;top:12px;right:15px;background:none;border:none;font-size:28px;cursor:pointer;color:#999;">×</button>
      <h3 style="margin:0 0 20px;color:#333;font-size:21px;">扫一扫查看关注号码</h3>
      <div id="qrContainer" style="margin:20px auto;padding:15px;background:#fff;border:2px solid #eee;border-radius:12px;width:270px;height:270px;">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrText)}" 
             alt="二维码" style="width:100%;height:100%;border-radius:8px;">
      </div>
      <div style="margin:15px 0;padding:15px;background:#f8f9fa;border-radius:10px;font-size:14px;color:#555;line-height:1.7;max-height:160px;overflow-y:auto;">
        ${qrText.replace(/\n/g, '<br>')}
      </div>
      <button style="padding:12px 40px;background:#667eea;color:#fff;border:none;border-radius:10px;font-size:16px;cursor:pointer;">关闭</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // 关闭方式（三种都支持）
  const close = () => {
    if (overlay && overlay.parentNode) {
      document.body.removeChild(overlay);
    }
  };

  overlay.onclick = (e) => {
    if (e.target === overlay || e.target.tagName === 'BUTTON' || e.target.id === 'closeQrBtn') {
      close();
    }
  };
}

/* ====================== 模块导出 ====================== */
window.initFavoriteNumbersModule = initFavoriteNumbersModule;
window.exportFavoriteAnalysis = exportFavoriteAnalysis;
window.showFavoriteNumberQRCode = showFavoriteNumberQRCode;

window.favoriteNumbersModule = {
  loadFavoriteNumbers,
  editFavoriteNumber,
  deleteFavoriteNumber,
  analyzeFavoriteNumber,
  exportFavoriteAnalysis
};