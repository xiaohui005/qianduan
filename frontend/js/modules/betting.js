/**
 * 投注登记点管理模块 (Betting Management Module)
 * 功能：投注记录的增删改查、分页、查询过滤、统计和导出
 *
 * API端点:
 * - GET /api/bets - 获取所有投注记录
 * - POST /api/bets - 创建投注记录
 * - PUT /api/bets/{id} - 更新投注记录
 * - DELETE /api/bets/{id} - 删除投注记录
 *
 * 主要功能：
 * - 投注记录列表展示（分页）
 * - 添加/编辑/删除投注记录
 * - 查询过滤（关注点、期数、是否正确、日期范围）
 * - 统计信息（总体和本页统计）
 * - CSV导出（本页和全部）
 * - 关注点模糊搜索和自动完成
 *
 * @module betting
 */

// ==================== 模块状态 ====================
let allPlaces = [];
let selectedPlaceId = null;

// 全局变量用于分页
let allBetsData = [];
let originalBetsData = []; // 保存原始数据用于重置
let filteredBetsData = []; // 保存过滤后的数据
let currentPage = 1;
let pageSize = 10; // 默认每页10条，可通过下拉框调整

// ==================== 渲染函数 ====================
/**
 * 渲染投注记录表格
 * @param {Array} bets - 投注记录列表
 * @param {number} page - 当前页码
 */
function renderBetsTable(bets, page = 1) {
  const tbody = document.querySelector('#betsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  // 计算分页
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageBets = bets.slice(startIndex, endIndex);

  pageBets.forEach(bet => {
    // 计算输赢金额
    let profitLoss = '';
    let profitClass = '';
    if (bet.is_correct !== null && bet.is_correct !== undefined) {
      const winAmount = parseFloat(bet.win_amount) || 0;
      const betAmount = parseFloat(bet.bet_amount) || 0;
      const profit = winAmount - betAmount;
      profitLoss = profit.toFixed(2);

      // 根据输赢金额设置样式类
      if (profit > 0) {
        profitClass = 'profit-positive';
      } else if (profit < 0) {
        profitClass = 'profit-negative';
      } else {
        profitClass = 'profit-zero';
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${bet.place_name || ''}</td>
      <td>${bet.qishu}</td>
      <td>${bet.bet_amount}</td>
      <td>${bet.win_amount}</td>
      <td>${bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误')}</td>
      <td class="${profitClass}">${profitLoss}</td>
      <td>${bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      <td>
        <button class="edit-bet-btn" data-id="${bet.id}">编辑</button>
        <button class="delete-bet-btn" data-id="${bet.id}">删除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 更新统计信息
  updateBetsStats(bets, pageBets);

  // 更新分页控件
  updateBetsPagination(bets, page);

  // 添加导出按钮（如果不存在）
  let table = document.getElementById('betsTable');
  if (table && !document.getElementById('export-bets-btn')) {
    const btn = document.createElement('button');
    btn.textContent = '导出本页';
    btn.id = 'export-bets-btn';
    btn.style.marginBottom = '8px';
    table.parentNode.insertBefore(btn, table);
    btn.onclick = () => {
      const csvRows = [
        ['关注点','期数','投注金额','赢取金额','是否正确','输赢金额','创建时间'],
        ...bets.map(bet => {
          // 计算输赢金额
          let profitLoss = '';
          if (bet.is_correct !== null && bet.is_correct !== undefined) {
            const winAmount = parseFloat(bet.win_amount) || 0;
            const betAmount = parseFloat(bet.bet_amount) || 0;
            const profit = winAmount - betAmount;
            profitLoss = profit.toFixed(2);
          }

          return [
            bet.place_name || '',
            bet.qishu,
            bet.bet_amount,
            bet.win_amount,
            bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误'),
            profitLoss,
            bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''
          ];
        })
      ];
      downloadCSV(csvRows, '投注记录表.csv');
    };
    // 导出全部按钮
    const allBtn = document.createElement('button');
    allBtn.textContent = '导出全部';
    allBtn.id = 'export-bets-all-btn';
    allBtn.style.marginBottom = '8px';
    allBtn.style.marginLeft = '8px';
    table.parentNode.insertBefore(allBtn, table);
    allBtn.onclick = async () => {
      const res = await fetch(window.BACKEND_URL + '/api/bets');
      const allBets = await res.json();
      const csvRows = [
        ['关注点','期数','投注金额','赢取金额','是否正确','输赢金额','创建时间'],
        ...allBets.map(bet => {
          // 计算输赢金额
          let profitLoss = '';
          if (bet.is_correct !== null && bet.is_correct !== undefined) {
            const winAmount = parseFloat(bet.win_amount) || 0;
            const betAmount = parseFloat(bet.bet_amount) || 0;
            const profit = winAmount - betAmount;
            profitLoss = profit.toFixed(2);
          }

          return [
            bet.place_name || '',
            bet.qishu,
            bet.bet_amount,
            bet.win_amount,
            bet.is_correct === null || bet.is_correct === undefined ? '未判断' : (bet.is_correct ? '正确' : '错误'),
            profitLoss,
            bet.created_at ? bet.created_at.replace('T', ' ').slice(0, 19) : ''
          ];
        })
      ];
      downloadCSV(csvRows, '投注记录表_全部.csv');
    };
  }
}

/**
 * 更新统计信息
 * @param {Array} bets - 所有投注记录
 * @param {Array} pageBets - 当前页投注记录
 */
function updateBetsStats(bets, pageBets = []) {
  // 总体统计
  const totalBetAmount = bets.reduce((sum, bet) => sum + (parseFloat(bet.bet_amount) || 0), 0);
  const totalWinAmount = bets.reduce((sum, bet) => sum + (parseFloat(bet.win_amount) || 0), 0);
  const totalProfitLoss = totalWinAmount - totalBetAmount;

  document.getElementById('totalBetAmount').textContent = `¥${totalBetAmount.toFixed(2)}`;
  document.getElementById('totalWinAmount').textContent = `¥${totalWinAmount.toFixed(2)}`;
  document.getElementById('totalProfitLoss').textContent = `¥${totalProfitLoss.toFixed(2)}`;
  document.getElementById('totalRecords').textContent = bets.length;

  // 为总输赢金额设置颜色
  const totalProfitElement = document.getElementById('totalProfitLoss');
  totalProfitElement.className = 'stats-value';
  if (totalProfitLoss > 0) {
    totalProfitElement.classList.add('profit-positive');
  } else if (totalProfitLoss < 0) {
    totalProfitElement.classList.add('profit-negative');
  } else {
    totalProfitElement.classList.add('profit-zero');
  }

  // 本页统计
  const pageBetAmount = pageBets.reduce((sum, bet) => sum + (parseFloat(bet.bet_amount) || 0), 0);
  const pageWinAmount = pageBets.reduce((sum, bet) => sum + (parseFloat(bet.win_amount) || 0), 0);
  const pageProfitLoss = pageWinAmount - pageBetAmount;

  document.getElementById('pageBetAmount').textContent = `¥${pageBetAmount.toFixed(2)}`;
  document.getElementById('pageWinAmount').textContent = `¥${pageWinAmount.toFixed(2)}`;
  document.getElementById('pageProfitLoss').textContent = `¥${pageProfitLoss.toFixed(2)}`;
  document.getElementById('pageRecords').textContent = pageBets.length;

  // 为本页输赢金额设置颜色
  const pageProfitElement = document.getElementById('pageProfitLoss');
  pageProfitElement.className = 'stats-value';
  if (pageProfitLoss > 0) {
    pageProfitElement.classList.add('profit-positive');
  } else if (pageProfitLoss < 0) {
    pageProfitElement.classList.add('profit-negative');
  } else {
    pageProfitElement.classList.add('profit-zero');
  }
}

/**
 * 更新分页控件
 * @param {Array} bets - 投注记录列表
 * @param {number} currentPage - 当前页码
 */
function updateBetsPagination(bets, currentPage) {
  const totalPages = Math.ceil(bets.length / pageSize);
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, bets.length);

  // 更新分页信息
  document.getElementById('paginationInfo').textContent =
    `显示 ${startRecord}-${endRecord} 条，共 ${bets.length} 条记录`;

  // 更新按钮状态
  document.getElementById('prevPageBtn').disabled = currentPage <= 1;
  document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;

  // 生成页码按钮
  const pageNumbersContainer = document.getElementById('pageNumbers');
  pageNumbersContainer.innerHTML = '';

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('span');
    pageBtn.className = `page-number ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.onclick = () => goToPage(i);
    pageNumbersContainer.appendChild(pageBtn);
  }
}

/**
 * 跳转到指定页面
 * @param {number} page - 页码
 */
function goToPage(page) {
  currentPage = page;
  renderBetsTable(filteredBetsData, page);
}

// ==================== 数据加载函数 ====================
/**
 * 加载所有投注记录
 */
async function loadBets() {
  const res = await fetch(window.BACKEND_URL + '/api/bets');
  const data = await res.json();

  // 按照期数倒序排序
  data.sort((a, b) => {
    const qishuA = parseInt(a.qishu) || 0;
    const qishuB = parseInt(b.qishu) || 0;
    return qishuB - qishuA; // 倒序：大的在前
  });

  allBetsData = data;
  originalBetsData = [...data]; // 保存原始数据
  filteredBetsData = [...data]; // 初始化过滤数据
  currentPage = 1;
  renderBetsTable(data, 1);

  // 绑定分页按钮事件
  bindPaginationEvents();

  // 绑定查询按钮事件
  bindQueryEvents();
}

/**
 * 加载所有关注点到内存
 */
async function fetchAllPlaces() {
  const res = await fetch(window.BACKEND_URL + '/api/places');
  allPlaces = await res.json();
}

// ==================== API调用函数 ====================
/**
 * 添加投注记录
 * @param {Object} bet - 投注记录数据
 */
async function addBet(bet) {
  await fetch(window.BACKEND_URL + '/api/bets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bet)
  });
}

/**
 * 更新投注记录
 * @param {number} id - 投注记录ID
 * @param {Object} bet - 投注记录数据
 */
async function updateBet(id, bet) {
  await fetch(window.BACKEND_URL + '/api/bets/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bet)
  });
}

/**
 * 删除投注记录
 * @param {number} id - 投注记录ID
 */
async function deleteBet(id) {
  if (!confirm('确定要删除该投注记录吗？')) return;
  await fetch(window.BACKEND_URL + '/api/bets/' + id, { method: 'DELETE' });

  // 重新加载数据并保持当前页面
  const res = await fetch(window.BACKEND_URL + '/api/bets');
  const data = await res.json();

  // 按照期数倒序排序
  data.sort((a, b) => {
    const qishuA = parseInt(a.qishu) || 0;
    const qishuB = parseInt(b.qishu) || 0;
    return qishuB - qishuA; // 倒序：大的在前
  });

  allBetsData = data;
  originalBetsData = [...data]; // 更新原始数据
  filteredBetsData = [...data]; // 更新过滤数据

  // 如果当前页面没有数据了，回到上一页
  const totalPages = Math.ceil(filteredBetsData.length / pageSize);
  if (currentPage > totalPages && totalPages > 0) {
    currentPage = totalPages;
  }

  renderBetsTable(filteredBetsData, currentPage);
}

// ==================== 查询和过滤 ====================
/**
 * 过滤投注记录
 */
function filterBets() {
  const queryPlace = document.getElementById('queryPlace').value.trim().toLowerCase();
  const queryQishu = document.getElementById('queryQishu').value.trim();
  const queryIsCorrect = document.getElementById('queryIsCorrect').value;
  const queryStartDate = document.getElementById('queryStartDate').value;
  const queryEndDate = document.getElementById('queryEndDate').value;

  // 调试信息
  console.log('查询条件:', {
    queryPlace,
    queryQishu,
    queryIsCorrect,
    queryStartDate,
    queryEndDate
  });

  // 从原始数据开始过滤
  const filteredBets = originalBetsData.filter(bet => {
    // 关注点过滤
    if (queryPlace && !bet.place_name?.toLowerCase().includes(queryPlace)) {
      return false;
    }

    // 期数过滤
    if (queryQishu && !bet.qishu?.includes(queryQishu)) {
      return false;
    }

    // 是否正确过滤
    if (queryIsCorrect !== '') {
      if (queryIsCorrect === 'null') {
        if (bet.is_correct !== null && bet.is_correct !== undefined) {
          return false;
        }
      } else {
        const isCorrect = parseInt(queryIsCorrect);
        if (bet.is_correct !== isCorrect) {
          return false;
        }
      }
    }

    // 创建时间过滤
    if (queryStartDate || queryEndDate) {
      const createdDate = bet.created_at ? bet.created_at.split('T')[0] : '';
      if (queryStartDate && createdDate < queryStartDate) {
        return false;
      }
      if (queryEndDate && createdDate > queryEndDate) {
        return false;
      }
    }

    return true;
  });

  console.log('过滤前数据量:', originalBetsData.length);
  console.log('过滤后数据量:', filteredBets.length);

  // 按照期数倒序排序
  filteredBets.sort((a, b) => {
    const qishuA = parseInt(a.qishu) || 0;
    const qishuB = parseInt(b.qishu) || 0;
    return qishuB - qishuA; // 倒序：大的在前
  });

  // 更新过滤后的数据
  filteredBetsData = filteredBets;
  currentPage = 1;
  renderBetsTable(filteredBets, 1);

  // 显示查询结果提示
  if (filteredBets.length === 0) {
    alert('未找到符合条件的记录，请检查查询条件');
  } else {
    console.log('查询成功，找到', filteredBets.length, '条记录');
  }
}

/**
 * 重置查询
 */
async function resetQuery() {
  // 恢复原始数据
  filteredBetsData = [...originalBetsData];
  currentPage = 1;
  renderBetsTable(filteredBetsData, 1);

  // 清空查询条件
  clearQuery();
}

/**
 * 清空查询条件
 */
function clearQuery() {
  document.getElementById('queryPlace').value = '';
  document.getElementById('queryQishu').value = '';
  document.getElementById('queryIsCorrect').value = '';
  document.getElementById('queryStartDate').value = '';
  document.getElementById('queryEndDate').value = '';

  // 隐藏建议下拉框
  const suggest = document.getElementById('queryPlaceSuggest');
  if (suggest) {
    suggest.style.display = 'none';
  }
}

// ==================== 自动完成 ====================
/**
 * 设置关注点自动完成功能
 */
function setupQueryPlaceAutocomplete() {
  const input = document.getElementById('queryPlace');
  const suggest = document.getElementById('queryPlaceSuggest');

  if (!input || !suggest) return;

  let selectedIndex = -1;
  let suggestions = [];

  // 输入事件
  input.addEventListener('input', function() {
    const value = this.value.trim().toLowerCase();

    if (!value) {
      suggest.style.display = 'none';
      return;
    }

    // 从原始数据中获取所有唯一的关注点
    const allPlaces = [...new Set(originalBetsData.map(bet => bet.place_name).filter(name => name))];

    // 过滤匹配的关注点
    suggestions = allPlaces.filter(place =>
      place.toLowerCase().includes(value)
    );

    if (suggestions.length === 0) {
      suggest.style.display = 'none';
      return;
    }

    // 显示建议
    suggest.innerHTML = suggestions.map((place, index) =>
      `<div class="autocomplete-suggestion-item" data-index="${index}">${place}</div>`
    ).join('');

    suggest.style.display = 'block';
    selectedIndex = -1;
  });

  // 键盘事件
  input.addEventListener('keydown', function(e) {
    const items = suggest.querySelectorAll('.autocomplete-suggestion-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateSelection(items, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(items, selectedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        input.value = suggestions[selectedIndex];
        suggest.style.display = 'none';
      }
    } else if (e.key === 'Escape') {
      suggest.style.display = 'none';
      selectedIndex = -1;
    }
  });

  // 点击事件
  suggest.addEventListener('click', function(e) {
    if (e.target.classList.contains('autocomplete-suggestion-item')) {
      const index = parseInt(e.target.getAttribute('data-index'));
      input.value = suggestions[index];
      suggest.style.display = 'none';
      selectedIndex = -1;
    }
  });

  // 失焦事件
  input.addEventListener('blur', function() {
    setTimeout(() => {
      suggest.style.display = 'none';
      selectedIndex = -1;
    }, 200);
  });

  // 更新选中状态
  function updateSelection(items, index) {
    items.forEach((item, i) => {
      if (i === index) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
}

/**
 * 关注点输入框模糊匹配
 */
function setupPlaceInput() {
  const input = document.getElementById('betPlaceInput');
  const suggest = document.getElementById('betPlaceSuggest');
  if (!input || !suggest) return;

  input.oninput = function() {
    const val = input.value.trim().toLowerCase();
    if (!val) {
      suggest.innerHTML = '';
      selectedPlaceId = null;
      return;
    }
    const matches = allPlaces.filter(p => p.name.toLowerCase().includes(val));
    if (matches.length === 0) {
      suggest.innerHTML = '<div style="background:#fffbe9;padding:4px 8px;">无匹配关注点</div>';
      selectedPlaceId = null;
      return;
    }
    suggest.innerHTML = matches.map(p => `<div class="bet-place-suggest-item" data-id="${p.id}" style="padding:4px 8px;cursor:pointer;">${p.name}</div>`).join('');
    // 绑定点击
    Array.from(suggest.querySelectorAll('.bet-place-suggest-item')).forEach(item => {
      item.onclick = function() {
        input.value = this.textContent;
        selectedPlaceId = this.getAttribute('data-id');
        suggest.innerHTML = '';
      };
    });
  };

  // 失焦时稍后隐藏建议
  input.onblur = function() {
    setTimeout(() => { suggest.innerHTML = ''; }, 200);
  };
}

// ==================== 事件绑定 ====================
/**
 * 绑定分页按钮事件
 */
function bindPaginationEvents() {
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');
  const pageSizeSelect = document.getElementById('pageSizeSelect');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        goToPage(currentPage - 1);
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      const totalPages = Math.ceil(filteredBetsData.length / pageSize);
      if (currentPage < totalPages) {
        goToPage(currentPage + 1);
      }
    };
  }

  // 每页显示条数选择框事件
  if (pageSizeSelect) {
    pageSizeSelect.onchange = () => {
      pageSize = parseInt(pageSizeSelect.value);
      currentPage = 1; // 重置到第一页
      renderBetsTable(filteredBetsData, 1);
    };
  }
}

/**
 * 绑定查询按钮事件
 */
function bindQueryEvents() {
  const queryBtn = document.getElementById('queryBetsBtn');
  const resetBtn = document.getElementById('resetQueryBtn');
  const clearBtn = document.getElementById('clearQueryBtn');

  if (queryBtn) {
    queryBtn.onclick = () => {
      filterBets();
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      resetQuery();
    };
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      clearQuery();
    };
  }

  // 绑定关注点自动完成功能
  setupQueryPlaceAutocomplete();
}

/**
 * 绑定表单事件
 */
function bindFormEvents() {
  // 表单事件
  const betForm = document.getElementById('betForm');
  if (betForm) {
    betForm.onsubmit = async function(e) {
      e.preventDefault();
      const id = document.getElementById('betId').value;
      const placeName = document.getElementById('betPlaceInput').value.trim();

      // 根据输入的名称找id
      let place_id = selectedPlaceId;
      if (!place_id) {
        // 尝试精确匹配
        const found = allPlaces.find(p => p.name === placeName);
        if (found) place_id = found.id;
      }
      if (!place_id) {
        alert('请选择有效的关注点');
        return;
      }

      const qishu = document.getElementById('betQishu').value.trim();
      const bet_amount = document.getElementById('betAmount').value;
      const win_amount = document.getElementById('winAmount').value;
      const is_correct = document.getElementById('betIsCorrect').value;
      const bet = { place_id, qishu, bet_amount, win_amount, is_correct: is_correct === '' ? null : Number(is_correct) };

      if (id) {
        await updateBet(id, bet);
      } else {
        await addBet(bet);
      }

      betForm.reset();
      document.getElementById('betId').value = '';
      document.getElementById('cancelBetEditBtn').style.display = 'none';
      selectedPlaceId = null;

      // 重新加载数据并跳转到第一页
      const res = await fetch(window.BACKEND_URL + '/api/bets');
      const data = await res.json();

      // 按照期数倒序排序
      data.sort((a, b) => {
        const qishuA = parseInt(a.qishu) || 0;
        const qishuB = parseInt(b.qishu) || 0;
        return qishuB - qishuA; // 倒序：大的在前
      });

      allBetsData = data;
      originalBetsData = [...data]; // 更新原始数据
      filteredBetsData = [...data]; // 更新过滤数据
      currentPage = 1;
      renderBetsTable(filteredBetsData, 1);
    };
  }

  // 取消编辑
  const cancelBetBtn = document.getElementById('cancelBetEditBtn');
  if (cancelBetBtn) {
    cancelBetBtn.onclick = function() {
      betForm.reset();
      document.getElementById('betId').value = '';
      cancelBetBtn.style.display = 'none';
      selectedPlaceId = null;
    };
  }

  // 编辑/删除事件委托
  const betsTable = document.getElementById('betsTable');
  if (betsTable) {
    betsTable.addEventListener('click', function(e) {
      if (e.target.classList.contains('edit-bet-btn')) {
        const id = e.target.getAttribute('data-id');
        fetch(window.BACKEND_URL + '/api/bets')
          .then(res => res.json())
          .then(data => {
            const bet = data.find(b => String(b.id) === String(id));
            if (bet) {
              document.getElementById('betId').value = bet.id;
              document.getElementById('betPlaceInput').value = bet.place_name || '';
              selectedPlaceId = bet.place_id;
              document.getElementById('betQishu').value = bet.qishu;
              document.getElementById('betAmount').value = bet.bet_amount;
              document.getElementById('winAmount').value = bet.win_amount;
              document.getElementById('betIsCorrect').value = bet.is_correct === null || bet.is_correct === undefined ? '' : String(bet.is_correct);
              document.getElementById('cancelBetEditBtn').style.display = '';
            }
          });
      } else if (e.target.classList.contains('delete-bet-btn')) {
        const id = e.target.getAttribute('data-id');
        deleteBet(id);
      }
    });
  }
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

// ==================== 模块初始化 ====================
/**
 * 初始化投注登记点管理模块
 */
async function initBettingModule() {
  console.log('🎯 Initializing Betting module...');

  await fetchAllPlaces();
  setupPlaceInput();
  bindFormEvents();
  loadBets();

  console.log('✅ Betting module initialized');
}

// ==================== 模块导出 ====================
window.initBettingModule = initBettingModule;
window.bettingModule = {
  loadBets,
  addBet,
  updateBet,
  deleteBet,
  filterBets
};
