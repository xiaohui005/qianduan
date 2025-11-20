/**
 * UI组件库
 * 提供通用的UI组件和工具函数
 */

const UI = {
  /**
   * 创建号码球元素
   * @param {number|string} number - 号码（1-49）
   * @param {string} colorClass - 颜色类名（可选，自动从utils.js获取）
   * @returns {HTMLElement} 号码球元素
   */
  createNumberBall(number, colorClass = null) {
    const num = parseInt(number, 10);
    const ball = document.createElement('span');
    ball.className = 'number-ball';

    // 如果没有提供颜色类，尝试从utils.js获取
    if (!colorClass && typeof getNumberColorClass === 'function') {
      colorClass = getNumberColorClass(num);
    }

    if (colorClass) {
      ball.classList.add(colorClass);
    }

    // 格式化号码为两位数
    ball.textContent = num < 10 ? `0${num}` : `${num}`;

    return ball;
  },

  /**
   * 创建分页控件
   * @param {Object} options - 分页选项
   * @returns {HTMLElement} 分页控件元素
   */
  createPagination(options) {
    const { currentPage, totalPages, onPageChange } = options;

    const container = document.createElement('div');
    container.className = 'pagination-container';

    // 上一页按钮
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.textContent = '上一页';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.onclick = () => onPageChange(currentPage - 1);

    // 页码显示
    const pageInfo = document.createElement('span');
    pageInfo.className = 'page-info';
    pageInfo.textContent = `第 ${currentPage} / ${totalPages} 页`;

    // 下一页按钮
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.textContent = '下一页';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.onclick = () => onPageChange(currentPage + 1);

    container.appendChild(prevBtn);
    container.appendChild(pageInfo);
    container.appendChild(nextBtn);

    return container;
  },

  /**
   * 创建加载动画
   * @param {string} message - 加载消息
   * @returns {HTMLElement} 加载动画元素
   */
  createLoader(message = '加载中...') {
    const loader = document.createElement('div');
    loader.className = 'loader-container';
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <div class="loader-message">${message}</div>
    `;
    return loader;
  },

  /**
   * 创建表格
   * @param {Object} options - 表格选项
   * @returns {HTMLElement} 表格元素
   */
  createTable(options) {
    const { headers, data, className = 'data-table' } = options;

    const table = document.createElement('table');
    table.className = className;

    // 创建表头
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // 创建表体
    const tbody = document.createElement('tbody');
    data.forEach(row => {
      const tr = document.createElement('tr');
      row.forEach(cell => {
        const td = document.createElement('td');
        if (typeof cell === 'object' && cell.html) {
          td.innerHTML = cell.html;
        } else {
          td.textContent = cell;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return table;
  },

  /**
   * 创建卡片容器
   * @param {Object} options - 卡片选项
   * @returns {HTMLElement} 卡片元素
   */
  createCard(options) {
    const { title, content, className = '' } = options;

    const card = document.createElement('div');
    card.className = `card ${className}`;

    if (title) {
      const header = document.createElement('div');
      header.className = 'card-header';

      const titleEl = document.createElement('h3');
      titleEl.className = 'card-title';
      titleEl.textContent = title;

      header.appendChild(titleEl);
      card.appendChild(header);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    if (typeof content === 'string') {
      body.innerHTML = content;
    } else if (content instanceof HTMLElement) {
      body.appendChild(content);
    }

    card.appendChild(body);

    return card;
  },

  /**
   * 显示/隐藏元素
   * @param {string|HTMLElement} element - 元素或元素ID
   * @param {boolean} show - 是否显示
   */
  toggleElement(element, show) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.style.display = show ? 'block' : 'none';
    }
  },

  /**
   * 清空元素内容
   * @param {string|HTMLElement} element - 元素或元素ID
   */
  clearElement(element) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.innerHTML = '';
    }
  },

  /**
   * 设置元素内容
   * @param {string|HTMLElement} element - 元素或元素ID
   * @param {string|HTMLElement} content - 内容
   */
  setContent(element, content) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      if (typeof content === 'string') {
        el.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        el.innerHTML = '';
        el.appendChild(content);
      }
    }
  },

  /**
   * 添加事件监听器（带错误处理）
   * @param {string|HTMLElement} element - 元素或元素ID
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   */
  on(element, event, handler) {
    const el = typeof element === 'string' ? document.getElementById(element) : element;
    if (el) {
      el.addEventListener(event, (e) => {
        try {
          handler(e);
        } catch (error) {
          console.error(`事件处理失败 (${event}):`, error);
          if (window.ErrorHandler) {
            ErrorHandler.showError('操作失败', error);
          }
        }
      });
    }
  },

  /**
   * 创建按钮
   * @param {Object} options - 按钮选项
   * @returns {HTMLElement} 按钮元素
   */
  createButton(options) {
    const {
      text,
      onClick,
      className = 'btn-primary',
      disabled = false,
      icon = null
    } = options;

    const button = document.createElement('button');
    button.className = className;
    button.disabled = disabled;

    if (icon) {
      button.innerHTML = `<span>${icon}</span> ${text}`;
    } else {
      button.textContent = text;
    }

    if (onClick) {
      button.addEventListener('click', onClick);
    }

    return button;
  },

  /**
   * 格式化日期时间
   * @param {string|Date} date - 日期
   * @param {boolean} includeTime - 是否包含时间
   * @returns {string} 格式化的日期字符串
   */
  formatDateTime(date, includeTime = true) {
    const d = typeof date === 'string' ? new Date(date) : date;

    if (isNaN(d.getTime())) {
      return '-';
    }

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    let result = `${year}-${month}-${day}`;

    if (includeTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      result += ` ${hours}:${minutes}:${seconds}`;
    }

    return result;
  }
};

// 导出为全局变量
window.UI = UI;

console.log('✅ UI组件库已加载');
