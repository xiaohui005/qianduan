/**
 * 开奖记录管理模块
 * 负责开奖记录的查询、展示和导出功能
 *
 * 功能：
 * - 开奖记录查询（支持日期、期号、分页筛选）
 * - 记录表格渲染（带号码球显示）
 * - 分页功能
 * - CSV导出（本页导出、全部导出）
 * - 彩种切换（澳门/香港）
 */

// ==================== 模块状态 ====================

// 记录数据缓存（按彩种分类）
let recordsData = {
  am: { records: [], total: 0, page: 1, page_size: 20 },
  hk: { records: [], total: 0, page: 1, page_size: 20 }
};

// 当前页码
let currentPage = {
  am: 1,
  hk: 1
};

// ==================== 初始化函数 ====================

/**
 * 初始化开奖记录模块
 * 绑定事件监听器并加载初始数据
 */
function initRecordsModule() {
  console.log('初始化开奖记录模块...');

  // 绑定查询按钮
  const queryBtn = document.getElementById('queryRecordsBtn');
  if (queryBtn) {
    queryBtn.addEventListener('click', handleQueryClick);
    console.log('[初始化] 查询按钮事件已绑定');
  } else {
    console.warn('[初始化] 未找到查询按钮 queryRecordsBtn');
  }

  // 页面加载时自动查询第一页
  console.log('[初始化] 准备调用 queryRecords(澳门)');
  queryRecords('recordsTableAreaAm', 1);
  console.log('[初始化] 准备调用 queryRecords(香港)');
  queryRecords('recordsTableAreaHk', 1);

  console.log('✅ 开奖记录模块初始化完成');
}

// ==================== 事件处理函数 ====================

/**
 * 处理查询按钮点击
 */
function handleQueryClick() {
  // 重置页码并查询
  currentPage.am = 1;
  currentPage.hk = 1;
  queryRecords('recordsTableAreaAm', 1);
  queryRecords('recordsTableAreaHk', 1);
}

// ==================== 核心功能函数 ====================

/**
 * 查询开奖记录
 * @param {string} areaId - 目标区域ID（recordsTableAreaAm 或 recordsTableAreaHk）
 * @param {number} page - 页码（默认为1）
 */
async function queryRecords(areaId, page = 1) {
  console.log(`[查询] queryRecords 被调用，areaId=${areaId}, page=${page}`);

  const type = areaId === 'recordsTableAreaAm' ? 'am' : 'hk';
  const area = document.getElementById(areaId);

  if (!area) {
    console.warn(`[查询] 未找到元素: ${areaId}`);
    return;
  }

  console.log(`[查询] 找到区域元素，彩种=${type}`);

  // 显示加载状态
  area.innerHTML = '<div style="padding: 20px; text-align: center;">加载中...</div>';

  try {
    // 获取筛选条件
    const filters = getQueryFilters();
    console.log(`[查询] 筛选条件:`, filters);

    // 构建请求URL
    const url = buildQueryURL(type, page, filters);
    console.log(`[查询] 请求URL: ${url}`);

    // 发送请求
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[查询] 获取到数据，记录数: ${data.records?.length}, 总数: ${data.total}`);

    // 更新缓存
    recordsData[type] = data;
    currentPage[type] = page;

    // 渲染表格
    const title = type === 'am' ? '澳门开奖记录' : '香港开奖记录';
    renderRecordsTable(data, areaId, title);

  } catch (error) {
    console.error('[查询] 查询开奖记录失败:', error);
    area.innerHTML = `<div style="color: red; padding: 20px;">查询失败: ${error.message}</div>`;
  }
}

/**
 * 获取查询筛选条件
 * @returns {Object} 筛选条件对象
 */
function getQueryFilters() {
  return {
    startTime: document.getElementById('queryStartTime')?.value || '',
    endTime: document.getElementById('queryEndTime')?.value || '',
    pageSize: document.getElementById('queryPageSize')?.value || '20',
    period: document.getElementById('queryPeriod')?.value || ''
  };
}

/**
 * 构建查询URL
 * @param {string} type - 彩种类型（am/hk）
 * @param {number} page - 页码
 * @param {Object} filters - 筛选条件
 * @returns {string} 完整的查询URL
 */
function buildQueryURL(type, page, filters) {
  let url = `${window.BACKEND_URL}/records?page=${page}&page_size=${filters.pageSize}&lottery_type=${type}`;

  if (filters.startTime) {
    url += `&start_time=${filters.startTime}`;
  }
  if (filters.endTime) {
    url += `&end_time=${filters.endTime}`;
  }
  if (filters.period) {
    url += `&period=${encodeURIComponent(filters.period)}`;
  }

  return url;
}

/**
 * 渲染开奖记录表格
 * @param {Object} data - 开奖记录数据
 * @param {string} areaId - 目标区域ID
 * @param {string} title - 表格标题
 */
function renderRecordsTable(data, areaId, title) {
  console.log(`[渲染] 开始渲染表格，区域: ${areaId}, 记录数: ${data.records?.length}`);

  const area = document.getElementById(areaId);
  if (!area) {
    console.warn(`未找到元素: ${areaId}`);
    return;
  }

  // 检查数据是否为空
  if (!data.records || data.records.length === 0) {
    area.innerHTML = `<div style="padding: 20px; text-align: center; color: #999;">${title}暂无数据</div>`;
    return;
  }

  // 构建HTML
  let html = buildTableHTML(data, areaId, title);
  area.innerHTML = html;
  console.log(`[渲染] HTML已设置，准备绑定事件`);

  // 绑定事件
  bindTableEvents(area, areaId, data);
  console.log(`[渲染] 表格渲染完成`);
}

/**
 * 构建表格HTML
 * @param {Object} data - 开奖记录数据
 * @param {string} areaId - 目标区域ID
 * @param {string} title - 表格标题
 * @returns {string} HTML字符串
 */
function buildTableHTML(data, areaId, title) {
  let html = '';

  // 标题和导出按钮
  html += `
    <h3>${title}</h3>
    <div style="margin-bottom: 10px;">
      <button class="export-records-btn" style="margin-right: 8px;">导出本页</button>
      <button class="export-records-all-btn">导出全部</button>
    </div>
  `;

  // 表格
  html += `
    <div class="table-container">
      <table border="1" cellpadding="6" style="border-collapse:collapse;">
        <thead>
          <tr>
            <th>期号</th>
            <th>开奖时间</th>
            <th>开奖号码/生肖</th>
          </tr>
        </thead>
        <tbody>
    `;

  // 表格内容
  data.records.forEach(record => {
    html += buildRecordRow(record);
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  // 分页控件
  html += buildPagination(data, areaId);

  return html;
}

/**
 * 构建单条记录的行HTML
 * @param {Object} record - 单条开奖记录
 * @returns {string} 行HTML字符串
 */
function buildRecordRow(record) {
  const nums = record.numbers ? record.numbers.split(',') : [];
  const animals = record.animals ? record.animals.split(',') : [];

  // 构建号码和生肖显示
  const numAniRow = nums.map((num, index) => {
    const animal = animals[index] || '';
    const paddedNum = num.padStart(2, '0');
    const colorClass = getBallColorClass(paddedNum);

    return `
      <div class='record-number-item' style='display:inline-block;margin:2px 6px;'>
        <div class='${colorClass} record-number-ball' style='font-size:18px;display:inline-block;padding:2px 10px;border-radius:16px;'>
          ${num}
        </div>
        <div class='records-animal-text' style='color:#000;font-size:13px;font-weight:bold;'>${animal}</div>
      </div>
    `;
  }).join('');

  const openTime = record.open_time ? record.open_time.substring(0, 10) : '';

  return `
    <tr>
      <td data-label="期号">${record.period}</td>
      <td data-label="开奖时间">${openTime}</td>
      <td data-label="开奖号码/生肖">${numAniRow}</td>
    </tr>
  `;
}

/**
 * 构建分页控件HTML
 * @param {Object} data - 开奖记录数据
 * @param {string} areaId - 目标区域ID
 * @returns {string} 分页HTML字符串
 */
function buildPagination(data, areaId) {
  const totalPages = Math.ceil(data.total / data.page_size);

  let html = `<div style='margin-top:10px;text-align:center;'>`;
  html += `<span style='margin-right:10px;'>第 ${data.page} / ${totalPages} 页</span>`;

  if (data.page > 1) {
    html += `<button class='recordsPrevPage' data-area='${areaId}' style='margin-right:5px;'>上一页</button>`;
  }

  if (data.page < totalPages) {
    html += `<button class='recordsNextPage' data-area='${areaId}'>下一页</button>`;
  }

  html += `</div>`;

  return html;
}

/**
 * 绑定表格事件
 * @param {HTMLElement} area - 表格容器元素
 * @param {string} areaId - 目标区域ID
 * @param {Object} data - 开奖记录数据
 */
function bindTableEvents(area, areaId, data) {
  console.log(`[事件] 开始绑定表格事件，区域: ${areaId}`);

  // 绑定分页按钮事件
  console.log(`[事件] 准备绑定分页事件`);
  bindRecordsPaginationEvents(area, areaId, data);

  // 绑定导出按钮事件
  console.log(`[事件] 准备绑定导出事件`);
  bindExportEvents(area, areaId, data);

  console.log(`[事件] 表格事件绑定完成`);
}

/**
 * 绑定分页按钮事件（开奖记录专用）
 * @param {HTMLElement} area - 表格容器元素
 * @param {string} areaId - 目标区域ID
 * @param {Object} data - 开奖记录数据
 */
function bindRecordsPaginationEvents(area, areaId, data) {
  console.log(`[分页] 开始绑定分页事件，区域: ${areaId}，当前页: ${data.page}`);

  // 上一页
  const prevButtons = area.querySelectorAll('.recordsPrevPage');
  console.log(`[分页] 找到${prevButtons.length}个上一页按钮`);
  prevButtons.forEach(btn => {
    btn.onclick = () => {
      console.log(`[分页] 上一页按钮被点击，跳转到第${data.page - 1}页`);
      queryRecords(areaId, data.page - 1);
    };
  });

  // 下一页
  const nextButtons = area.querySelectorAll('.recordsNextPage');
  console.log(`[分页] 找到${nextButtons.length}个下一页按钮`);
  nextButtons.forEach(btn => {
    btn.onclick = () => {
      console.log(`[分页] 下一页按钮被点击，跳转到第${data.page + 1}页`);
      queryRecords(areaId, data.page + 1);
    };
  });

  console.log(`[分页] 分页事件绑定完成`);
}

/**
 * 绑定导出按钮事件
 * @param {HTMLElement} area - 表格容器元素
 * @param {string} areaId - 目标区域ID
 * @param {Object} data - 开奖记录数据
 */
function bindExportEvents(area, areaId, data) {
  const type = areaId === 'recordsTableAreaAm' ? 'am' : 'hk';
  const title = type === 'am' ? '澳门开奖记录' : '香港开奖记录';

  // 导出本页
  const exportBtn = area.querySelector('.export-records-btn');
  if (exportBtn) {
    exportBtn.onclick = () => exportCurrentPage(data, title);
  }

  // 导出全部
  const exportAllBtn = area.querySelector('.export-records-all-btn');
  if (exportAllBtn) {
    exportAllBtn.onclick = () => exportAllRecords(type, title);
  }
}

// ==================== 导出功能 ====================

/**
 * 导出当前页数据
 * @param {Object} data - 开奖记录数据
 * @param {string} title - 标题
 */
function exportCurrentPage(data, title) {
  const csvRows = [
    ['期号', '开奖时间', '开奖号码/生肖'],
    ...data.records.map(record => formatRecordForCSV(record))
  ];

  const filename = `${title}_records_page${data.page}.csv`;
  downloadCSV(csvRows, filename);
}

/**
 * 导出全部数据
 * @param {string} type - 彩种类型（am/hk）
 * @param {string} title - 标题
 */
async function exportAllRecords(type, title) {
  try {
    // 获取筛选条件
    const filters = getQueryFilters();

    // 构建URL（获取所有数据，page_size设为10000）
    let url = `${window.BACKEND_URL}/records?page=1&page_size=10000&lottery_type=${type}`;

    if (filters.startTime) {
      url += `&start_time=${filters.startTime}`;
    }
    if (filters.endTime) {
      url += `&end_time=${filters.endTime}`;
    }
    if (filters.period) {
      url += `&period=${encodeURIComponent(filters.period)}`;
    }

    // 发送请求
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status}`);
    }

    const allData = await response.json();

    // 生成CSV
    const csvRows = [
      ['期号', '开奖时间', '开奖号码/生肖'],
      ...allData.records.map(record => formatRecordForCSV(record))
    ];

    const filename = `${title}_records_all.csv`;
    downloadCSV(csvRows, filename);

  } catch (error) {
    console.error('导出全部数据失败:', error);
    alert(`导出失败: ${error.message}`);
  }
}

/**
 * 格式化记录为CSV行
 * @param {Object} record - 单条开奖记录
 * @returns {Array} CSV行数组
 */
function formatRecordForCSV(record) {
  const openTime = record.open_time ? record.open_time.substring(0, 10) : '';
  const numbersAndAnimals = record.numbers + (record.animals ? ' / ' + record.animals : '');

  return [
    record.period,
    openTime,
    numbersAndAnimals
  ];
}

// ==================== 导出模块函数 ====================

// 导出初始化函数到全局
window.initRecordsModule = initRecordsModule;

// 导出其他函数（供其他模块调用）
window.RecordsModule = {
  queryRecords,
  exportCurrentPage,
  exportAllRecords
};

console.log('✅ 开奖记录模块已加载');
