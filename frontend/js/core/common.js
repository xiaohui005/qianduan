/**
 * 通用工具函数模块
 * 提供跨模块使用的通用功能，消除代码重复
 */

// ==================== 日期时间格式化 ====================

/**
 * 格式化日期时间为标准格式
 * @param {string|Date} datetime - 日期时间对象或字符串
 * @param {boolean} includeTime - 是否包含时间部分
 * @returns {string} 格式化后的日期时间字符串
 */
function formatDateTime(datetime, includeTime = true) {
  if (!datetime) return '-';

  const d = new Date(datetime);
  if (isNaN(d.getTime())) return '-';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  if (!includeTime) {
    return `${year}-${month}-${day}`;
  }

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日期为简短格式
 * @param {string|Date} datetime - 日期时间对象或字符串
 * @returns {string} 格式化后的日期字符串 (YYYY-MM-DD HH:mm)
 */
function formatDateTimeShort(datetime) {
  if (!datetime) return '-';

  const d = new Date(datetime);
  if (isNaN(d.getTime())) return '-';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ==================== 分页功能 ====================

/**
 * 生成分页HTML
 * @param {Object} options - 分页选项
 * @param {number} options.page - 当前页码
 * @param {number} options.totalPages - 总页数
 * @param {string} options.prevBtnId - 上一页按钮ID
 * @param {string} options.nextBtnId - 下一页按钮ID
 * @param {boolean} options.showExport - 是否显示导出按钮
 * @param {string} options.exportBtnId - 导出按钮ID
 * @returns {string} 分页HTML字符串
 */
function generatePaginationHTML(options) {
  const {
    page = 1,
    totalPages = 1,
    prevBtnId = 'prevBtn',
    nextBtnId = 'nextBtn',
    showExport = false,
    exportBtnId = 'exportBtn'
  } = options;

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:10px 0;">
      <div>
        <button id="${prevBtnId}" class="btn-secondary" ${page <= 1 ? 'disabled' : ''}>上一页</button>
        <span style="margin:0 8px;">第 <strong>${page}</strong> / <strong>${totalPages}</strong> 页</span>
        <button id="${nextBtnId}" class="btn-secondary" ${page >= totalPages ? 'disabled' : ''}>下一页</button>
      </div>
  `;

  if (showExport) {
    html += `
      <div>
        <button id="${exportBtnId}" class="btn-secondary">导出CSV</button>
      </div>
    `;
  }

  html += `</div>`;

  return html;
}

/**
 * 绑定分页按钮事件
 * @param {Object} options - 绑定选项
 * @param {string} options.prevBtnId - 上一页按钮ID
 * @param {string} options.nextBtnId - 下一页按钮ID
 * @param {number} options.currentPage - 当前页码
 * @param {number} options.totalPages - 总页数
 * @param {Function} options.onPageChange - 页码变化回调函数
 */
function bindPaginationEvents(options) {
  const {
    prevBtnId = 'prevBtn',
    nextBtnId = 'nextBtn',
    currentPage,
    totalPages,
    onPageChange
  } = options;

  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1 && onPageChange) {
        onPageChange(currentPage - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages && onPageChange) {
        onPageChange(currentPage + 1);
      }
    });
  }
}

/**
 * 绑定导出按钮事件
 * @param {string} btnId - 导出按钮ID
 * @param {Function} onExport - 导出回调函数
 */
function bindExportEvent(btnId, onExport) {
  const exportBtn = document.getElementById(btnId);
  if (exportBtn && onExport) {
    exportBtn.addEventListener('click', onExport);
  }
}

// ==================== CSV导出 ====================

/**
 * 导出CSV（通过后端URL）
 * @param {string} url - 导出URL
 * @param {Object} params - URL参数
 */
function exportCSV(url, params = {}) {
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const fullUrl = queryString ? `${url}?${queryString}` : url;
  window.open(fullUrl, '_blank');
}

/**
 * 导出CSV（客户端生成）
 * @param {Array} data - 数据数组
 * @param {Array} headers - 表头数组
 * @param {string} filename - 文件名
 */
function exportCSVClient(data, headers, filename = 'export.csv') {
  if (!data || data.length === 0) {
    alert('没有数据可导出');
    return;
  }

  // 生成CSV内容
  let csvContent = headers.join(',') + '\n';

  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header] || '';
      // 处理包含逗号、引号或换行的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  // 创建下载链接
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==================== API调用统一封装 ====================

/**
 * 统一的API调用函数
 * @param {string} url - API URL
 * @param {Object} options - 选项
 * @param {string} options.method - HTTP方法 (GET, POST, PUT, DELETE)
 * @param {Object} options.data - 请求数据（POST/PUT）
 * @param {Object} options.params - URL参数（GET）
 * @param {Function} options.onSuccess - 成功回调
 * @param {Function} options.onError - 错误回调
 * @param {boolean} options.showLoading - 是否显示加载提示
 * @returns {Promise} API响应Promise
 */
async function apiCall(url, options = {}) {
  const {
    method = 'GET',
    data = null,
    params = null,
    onSuccess = null,
    onError = null,
    showLoading = false
  } = options;

  try {
    // 构建URL
    let fullUrl = url;
    if (params) {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      fullUrl = queryString ? `${url}?${queryString}` : url;
    }

    // 构建请求选项
    const fetchOptions = {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      fetchOptions.body = JSON.stringify(data);
    }

    // 发送请求
    const response = await fetch(fullUrl, fetchOptions);
    const result = await response.json();

    // 处理响应
    if (result.success || response.ok) {
      if (onSuccess) {
        onSuccess(result);
      }
      return result;
    } else {
      throw new Error(result.message || '请求失败');
    }
  } catch (error) {
    console.error('API调用失败:', error);
    if (onError) {
      onError(error);
    } else {
      // 默认错误处理
      alert(`操作失败：${error.message}`);
    }
    throw error;
  }
}

// ==================== 表格渲染辅助 ====================

/**
 * 生成表格HTML
 * @param {Object} options - 表格选项
 * @param {Array} options.headers - 表头数组 [{text: '列名', key: 'dataKey', width: '100px'}]
 * @param {Array} options.data - 数据数组
 * @param {Function} options.rowRenderer - 行渲染函数（可选，自定义行内容）
 * @param {string} options.tableClass - 表格CSS类
 * @returns {string} 表格HTML字符串
 */
function generateTableHTML(options) {
  const {
    headers = [],
    data = [],
    rowRenderer = null,
    tableClass = 'data-table'
  } = options;

  let html = `
    <div class="table-container">
      <table class="${tableClass}">
        <thead>
          <tr>
  `;

  // 生成表头
  headers.forEach(header => {
    const width = header.width ? ` style="width: ${header.width};"` : '';
    html += `<th${width}>${header.text}</th>`;
  });

  html += `
          </tr>
        </thead>
        <tbody>
  `;

  // 生成表格行
  if (data.length === 0) {
    html += `
      <tr>
        <td colspan="${headers.length}" style="text-align:center;color:#888;">暂无数据</td>
      </tr>
    `;
  } else {
    data.forEach((row, index) => {
      if (rowRenderer) {
        html += rowRenderer(row, index);
      } else {
        html += '<tr>';
        headers.forEach(header => {
          const value = row[header.key] !== undefined ? row[header.key] : '-';
          html += `<td>${value}</td>`;
        });
        html += '</tr>';
      }
    });
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// ==================== 错误处理 ====================

/**
 * 统一的错误处理函数
 * @param {Error} error - 错误对象
 * @param {string} context - 错误上下文描述
 * @param {boolean} showAlert - 是否显示警告框
 */
function handleError(error, context = '操作', showAlert = true) {
  console.error(`${context}失败:`, error);

  if (showAlert) {
    const message = error.message || '未知错误';
    alert(`${context}失败：${message}`);
  }
}

/**
 * 显示加载提示
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 加载提示文本
 */
function showLoading(element, message = '正在加载...') {
  if (element) {
    element.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">${message}</div>`;
  }
}

/**
 * 显示错误提示
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 错误提示文本
 */
function showError(element, message = '加载失败') {
  if (element) {
    element.innerHTML = `<div style="text-align:center;padding:20px;color:red;">${message}</div>`;
  }
}

/**
 * 显示空数据提示
 * @param {HTMLElement} element - 目标元素
 * @param {string} message - 提示文本
 */
function showEmpty(element, message = '暂无数据') {
  if (element) {
    element.innerHTML = `<div style="text-align:center;padding:20px;color:#888;">${message}</div>`;
  }
}

// ==================== 号码格式化 ====================

/**
 * 格式化号码（补零）
 * @param {number|string} number - 号码
 * @returns {string} 格式化后的号码（两位数）
 */
function formatNumber(number) {
  if (number === null || number === undefined) return '-';
  return String(number).padStart(2, '0');
}

/**
 * 格式化号码数组
 * @param {Array} numbers - 号码数组
 * @param {string} separator - 分隔符
 * @returns {string} 格式化后的号码字符串
 */
function formatNumbers(numbers, separator = ', ') {
  if (!numbers || !Array.isArray(numbers)) return '-';
  return numbers.map(n => formatNumber(n)).join(separator);
}

// ==================== 彩种相关 ====================

/**
 * 获取彩种名称
 * @param {string} type - 彩种代码 (am/hk)
 * @returns {string} 彩种名称
 */
function getLotteryTypeName(type) {
  return type === 'am' ? '澳门' : type === 'hk' ? '香港' : '未知';
}

/**
 * 获取彩种类选择按钮的激活状态
 * @param {string} selector - 按钮选择器
 * @returns {string} 当前激活的彩种类型
 */
function getActiveType(selector = '.lottery-type-btn') {
  const activeBtn = document.querySelector(`${selector}.active`);
  return activeBtn ? activeBtn.dataset.type : 'am';
}

// ==================== 按钮状态管理 ====================

/**
 * 设置按钮激活状态
 * @param {string} selector - 按钮选择器
 * @param {HTMLElement} activeButton - 要激活的按钮
 */
function setActiveButton(selector, activeButton) {
  document.querySelectorAll(selector).forEach(btn => btn.classList.remove('active'));
  if (activeButton) {
    activeButton.classList.add('active');
  }
}

/**
 * 切换按钮激活状态
 * @param {string} selector - 按钮选择器
 * @param {Function} onChange - 状态改变回调
 */
function bindButtonGroupEvents(selector, onChange) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', function() {
      setActiveButton(selector, this);
      if (onChange) {
        onChange(this.dataset.value || this.dataset.type);
      }
    });
  });
}

// ==================== 导出所有函数 ====================

window.CommonUtils = {
  // 日期时间
  formatDateTime,
  formatDateTimeShort,

  // 分页
  generatePaginationHTML,
  bindPaginationEvents,
  bindExportEvent,

  // CSV导出
  exportCSV,
  exportCSVClient,

  // API调用
  apiCall,

  // 表格
  generateTableHTML,

  // 错误处理
  handleError,
  showLoading,
  showError,
  showEmpty,

  // 号码格式化
  formatNumber,
  formatNumbers,

  // 彩种
  getLotteryTypeName,
  getActiveType,

  // 按钮状态
  setActiveButton,
  bindButtonGroupEvents
};

console.log('通用工具模块已加载');
