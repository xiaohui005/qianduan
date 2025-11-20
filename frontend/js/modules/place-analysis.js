/**
 * 关注点分析模块 (Place Analysis Module)
 * 功能：关注点分析展示、统计卡片、详情记录、导出
 *
 * API端点:
 * - GET /api/place_analysis - 获取所有关注点分析数据
 *
 * 主要功能：
 * - 关注点分析卡片展示
 * - 统计信息（总记录数、正确率、遗漏、连中）
 * - 详细记录表格
 * - CSV导出
 * - 关注点选择按钮
 * - 关注点详情展示
 *
 * @module place-analysis
 */

// ==================== 模块状态 ====================
let placeAnalysisData = [];

// ==================== 数据加载函数 ====================
/**
 * 加载关注点分析数据
 */
async function loadPlaceAnalysis() {
  try {
    console.log('开始加载关注点分析数据...');

    const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
    const result = await response.json();

    console.log('关注点分析API响应:', result);

    if (result.success) {
      placeAnalysisData = result.data;
      renderPlaceAnalysis(placeAnalysisData);
    } else {
      console.error('加载关注点分析失败:', result.message);
      alert('加载关注点分析失败: ' + result.message);
    }
  } catch (error) {
    console.error('加载关注点分析失败:', error);
    alert('加载关注点分析失败: 网络错误');
  }
}

// ==================== 渲染函数 ====================
/**
 * 渲染关注点分析表格
 * @param {Array} places - 关注点列表
 */
function renderPlaceAnalysis(places) {
  const container = document.getElementById('placeAnalysisResult');
  if (!container) return;

  if (!places || places.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无关注点数据</div>';
    return;
  }

  let html = '<div class="place-analysis-container">';

  places.forEach(place => {
    const totalRecords = place.total_records || 0;
    const correctCount = place.correct_count || 0;
    const wrongCount = place.wrong_count || 0;
    const unjudgedCount = place.unjudged_count || 0;
    const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';

    const currentMiss = place.current_miss || 0;
    const maxMiss = place.max_miss || 0;
    const currentStreak = place.current_streak || 0;
    const maxStreak = place.max_streak || 0;

    html += `
      <div class="place-analysis-card">
        <div class="place-analysis-header">
          <h3 class="place-name">${place.place_name}</h3>
          <span class="place-description">${place.place_description || ''}</span>
        </div>

        <div class="place-analysis-stats">
          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">总记录数：</span>
              <span class="stat-value">${totalRecords}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">正确记录：</span>
              <span class="stat-value correct">${correctCount}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">错误记录：</span>
              <span class="stat-value wrong">${wrongCount}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">未判断：</span>
              <span class="stat-value unjudged">${unjudgedCount}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">正确率：</span>
              <span class="stat-value">${correctRate}%</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">当前遗漏：</span>
              <span class="stat-value ${currentMiss > 0 ? 'miss' : ''}">${currentMiss}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">历史最大遗漏：</span>
              <span class="stat-value">${maxMiss}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前连中：</span>
              <span class="stat-value ${currentStreak > 0 ? 'streak' : ''}">${currentStreak}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">历史最大连中：</span>
              <span class="stat-value">${maxStreak}</span>
            </div>
          </div>

          <div class="stats-row">
            <div class="stat-item">
              <span class="stat-label">首次记录：</span>
              <span class="stat-value">${place.first_record ? place.first_record.replace('T', ' ').slice(0, 19) : '-'}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最后记录：</span>
              <span class="stat-value">${place.last_record ? place.last_record.replace('T', ' ').slice(0, 19) : '-'}</span>
            </div>
          </div>
        </div>

        <div class="place-analysis-details">
          <h4>详细记录</h4>
          <div class="records-table-container">
            ${renderPlaceRecordsTable(place.records || [])}
          </div>
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

/**
 * 渲染关注点记录表格
 * @param {Array} records - 记录列表
 */
function renderPlaceRecordsTable(records) {
  if (!records || records.length === 0) {
    return '<div style="text-align:center;color:#888;padding:10px;">暂无记录</div>';
  }

  let html = '<table class="place-records-table">';
  html += '<thead><tr><th>期数</th><th>是否正确</th><th>创建时间</th></tr></thead><tbody>';

  records.forEach(record => {
    const isCorrectText = record.is_correct === 1 ? '正确' : (record.is_correct === 0 ? '错误' : '未判断');
    const isCorrectClass = record.is_correct === 1 ? 'correct' : (record.is_correct === 0 ? 'wrong' : 'unjudged');

    html += `
      <tr>
        <td>${record.qishu}</td>
        <td class="${isCorrectClass}">${isCorrectText}</td>
        <td>${record.created_at ? record.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  return html;
}

// ==================== 导出函数 ====================
/**
 * 导出关注点分析数据
 */
function exportPlaceAnalysis() {
  if (!placeAnalysisData || placeAnalysisData.length === 0) {
    alert('暂无数据可导出');
    return;
  }

  const csvRows = [
    ['关注点名称', '描述', '总记录数', '正确记录', '错误记录', '未判断', '正确率', '当前遗漏', '历史最大遗漏', '当前连中', '历史最大连中', '首次记录', '最后记录']
  ];

  placeAnalysisData.forEach(place => {
    const totalRecords = place.total_records || 0;
    const correctCount = place.correct_count || 0;
    const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';

    csvRows.push([
      place.place_name,
      place.place_description || '',
      totalRecords,
      correctCount,
      place.wrong_count || 0,
      place.unjudged_count || 0,
      correctRate + '%',
      place.current_miss || 0,
      place.max_miss || 0,
      place.current_streak || 0,
      place.max_streak || 0,
      place.first_record ? place.first_record.replace('T', ' ').slice(0, 19) : '',
      place.last_record ? place.last_record.replace('T', ' ').slice(0, 19) : ''
    ]);
  });

  downloadCSV(csvRows, '关注点分析报告.csv');
}

/**
 * CSV导出辅助函数
 * @param {Array} rows - CSV行数据
 * @param {string} filename - 文件名
 */
function downloadCSV(rows, filename) {
  const process = v => (v == null ? '' : ('' + v).replace(/"/g, '""'));
  const csvContent = rows.map(row => row.map(process).map(v => `"${v}"`).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== 关注点选择按钮 ====================
/**
 * 加载关注点选择按钮
 */
async function loadPlaceSelectionButtons() {
  try {
    console.log('加载关注点选择按钮...');

    const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
    const result = await response.json();

    if (result.success) {
      renderPlaceSelectionButtons(result.data);
    } else {
      console.error('加载关注点选择按钮失败:', result.message);
    }
  } catch (error) {
    console.error('加载关注点选择按钮失败:', error);
  }
}

/**
 * 渲染关注点选择按钮
 * @param {Array} places - 关注点列表
 */
function renderPlaceSelectionButtons(places) {
  const container = document.getElementById('placeButtonsContainer');
  if (!container) return;

  if (!places || places.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">暂无关注点数据</div>';
    return;
  }

  let html = '';
  places.forEach(place => {
    const currentMiss = place.current_miss || 0;
    const currentStreak = place.current_streak || 0;

    // 确定状态显示
    let statusText = '';
    let statusClass = 'normal';

    if (currentMiss > 0) {
      statusText = `当前遗漏${currentMiss}期`;
      statusClass = 'miss';
    } else if (currentStreak > 0) {
      statusText = `当前连中${currentStreak}期`;
      statusClass = 'streak';
    } else {
      statusText = '正常';
      statusClass = 'normal';
    }

    html += `
      <div class="place-button" data-place-id="${place.place_id}" data-place-name="${place.place_name}">
        <div class="place-button-name">${place.place_name}</div>
        <div class="place-button-status ${statusClass}">${statusText}</div>
      </div>
    `;
  });

  container.innerHTML = html;

  // 绑定按钮点击事件
  bindPlaceButtonEvents();
}

/**
 * 绑定关注点按钮事件
 */
function bindPlaceButtonEvents() {
  const buttons = document.querySelectorAll('.place-button');
  buttons.forEach(button => {
    button.addEventListener('click', function() {
      const placeId = this.dataset.placeId;
      const placeName = this.dataset.placeName;

      console.log('点击关注点按钮:', placeId, placeName);

      // 移除其他按钮的选中状态
      buttons.forEach(btn => btn.classList.remove('selected'));

      // 添加当前按钮的选中状态
      this.classList.add('selected');

      // 显示关注点详情
      showPlaceDetails(placeId, placeName);
    });
  });
}

/**
 * 显示关注点详情
 * @param {number} placeId - 关注点ID
 * @param {string} placeName - 关注点名称
 */
async function showPlaceDetails(placeId, placeName) {
  try {
    console.log('显示关注点详情:', placeId, placeName);

    const response = await fetch(`${window.BACKEND_URL}/api/place_analysis`);
    const result = await response.json();

    if (result.success) {
      const place = result.data.find(p => p.place_id == placeId);
      if (place) {
        renderPlaceDetails(place);
      }
    }
  } catch (error) {
    console.error('显示关注点详情失败:', error);
  }
}

/**
 * 渲染关注点详情
 * @param {Object} place - 关注点数据
 */
function renderPlaceDetails(place) {
  const container = document.getElementById('placeDetailsContent');
  const detailsDiv = document.getElementById('selectedPlaceDetails');

  if (!container || !detailsDiv) return;

  const totalRecords = place.total_records || 0;
  const correctCount = place.correct_count || 0;
  const wrongCount = place.wrong_count || 0;
  const unjudgedCount = place.unjudged_count || 0;
  const correctRate = totalRecords > 0 ? ((correctCount / totalRecords) * 100).toFixed(1) : '0.0';

  const currentMiss = place.current_miss || 0;
  const maxMiss = place.max_miss || 0;
  const currentStreak = place.current_streak || 0;
  const maxStreak = place.max_streak || 0;

  let html = `
    <div class="place-details-header">
      <div class="place-details-name">${place.place_name}</div>
      <div class="place-details-description">${place.place_description || ''}</div>
    </div>

    <div class="place-details-stats">
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">总记录数</div>
        <div class="place-detail-stat-value">${totalRecords}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">正确记录</div>
        <div class="place-detail-stat-value correct">${correctCount}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">错误记录</div>
        <div class="place-detail-stat-value wrong">${wrongCount}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">正确率</div>
        <div class="place-detail-stat-value">${correctRate}%</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">当前遗漏</div>
        <div class="place-detail-stat-value ${currentMiss > 0 ? 'miss' : ''}">${currentMiss}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">历史最大遗漏</div>
        <div class="place-detail-stat-value">${maxMiss}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">当前连中</div>
        <div class="place-detail-stat-value ${currentStreak > 0 ? 'streak' : ''}">${currentStreak}</div>
      </div>
      <div class="place-detail-stat">
        <div class="place-detail-stat-label">历史最大连中</div>
        <div class="place-detail-stat-value">${maxStreak}</div>
      </div>
    </div>

    <div class="place-details-records">
      <h4 style="color:#2980d9;margin-bottom:10px;">详细记录</h4>
      ${renderPlaceDetailsRecordsTable(place.records || [])}
    </div>
  `;

  container.innerHTML = html;
  detailsDiv.style.display = 'block';
}

/**
 * 渲染关注点详情记录表格
 * @param {Array} records - 记录列表
 */
function renderPlaceDetailsRecordsTable(records) {
  if (!records || records.length === 0) {
    return '<div style="text-align:center;color:#888;padding:10px;">暂无记录</div>';
  }

  let html = '<table class="place-details-table">';
  html += '<thead><tr><th>期数</th><th>是否正确</th><th>创建时间</th></tr></thead><tbody>';

  records.forEach(record => {
    const isCorrectText = record.is_correct === 1 ? '正确' : (record.is_correct === 0 ? '错误' : '未判断');
    const isCorrectClass = record.is_correct === 1 ? 'correct' : (record.is_correct === 0 ? 'wrong' : 'unjudged');

    html += `
      <tr>
        <td>${record.qishu}</td>
        <td class="${isCorrectClass}">${isCorrectText}</td>
        <td>${record.created_at ? record.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      </tr>
    `;
  });

  html += '</tbody></table>';
  return html;
}

// ==================== 事件绑定 ====================
/**
 * 绑定关注点分析事件
 */
function bindPlaceAnalysisEvents() {
  const refreshBtn = document.getElementById('refreshPlaceAnalysisBtn');
  const exportBtn = document.getElementById('exportPlaceAnalysisBtn');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadPlaceAnalysis);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', exportPlaceAnalysis);
  }
}

// ==================== 模块初始化 ====================
/**
 * 初始化关注点分析模块
 */
function initPlaceAnalysisModule() {
  console.log('🎯 Initializing Place Analysis module...');

  bindPlaceAnalysisEvents();

  // 加载关注点选择按钮
  loadPlaceSelectionButtons();

  console.log('✅ Place Analysis module initialized');
}

// ==================== 模块导出 ====================
window.initPlaceAnalysisModule = initPlaceAnalysisModule;
window.placeAnalysisModule = {
  loadPlaceAnalysis,
  exportPlaceAnalysis,
  loadPlaceSelectionButtons
};
