/**
 * 关注号码管理模块 (Favorite Numbers Module)
 * 功能：关注号码的增删改查、遗漏统计和分析
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

// ==================== 模块初始化 ====================
/**
 * 初始化关注号码管理模块
 */
function initFavoriteNumbersModule() {
  console.log('🎯 Initializing Favorite Numbers module...');

  generateYearButtons();
  loadFavoriteNumbers();
  bindFavoriteNumbersEvents();

  console.log('✅ Favorite Numbers module initialized');
}

// ==================== 年份筛选 ====================
/**
 * 生成年份筛选按钮
 */
function generateYearButtons() {
  const yearButtonsDiv = document.querySelector('.year-buttons');
  if (!yearButtonsDiv) return;

  const currentYear = new Date().getFullYear();
  const years = [];
  for (let year = currentYear; year >= currentYear - 3; year--) {
    years.push(year);
  }

  // 保留"全部"按钮，添加年份按钮
  let buttonsHTML = '<button type="button" class="year-btn active" data-year="">✓ 全部年份</button>';
  years.forEach(year => {
    buttonsHTML += `<button type="button" class="year-btn" data-year="${year}">📆 ${year}年</button>`;
  });

  yearButtonsDiv.innerHTML = buttonsHTML;

  // 绑定年份按钮点击事件
  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      // 移除所有按钮的active类
      document.querySelectorAll('.year-btn').forEach(b => {
        b.classList.remove('active');
        const year = b.getAttribute('data-year');
        b.textContent = year ? `📆 ${year}年` : '全部年份';
      });

      // 设置当前按钮为active
      this.classList.add('active');
      const selectedYear = this.getAttribute('data-year');
      this.textContent = selectedYear ? `✓ ${selectedYear}年` : '✓ 全部年份';

      loadFavoriteNumbers();
    });
  });
}

// ==================== 数据加载 ====================
/**
 * 加载关注号码列表
 */
async function loadFavoriteNumbers() {
  try {
    console.log('开始加载关注号码...');
    const activeBtn = document.querySelector('.position-btn.active');
    const activeLotteryBtn = document.querySelector('.lottery-btn.active');
    const activeYearBtn = document.querySelector('.year-btn.active');
    const position = activeBtn ? activeBtn.getAttribute('data-position') : 7;
    const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';
    const year = activeYearBtn ? activeYearBtn.getAttribute('data-year') : '';

    console.log(`选择的彩种: ${lotteryType}, 位置: ${position}, 年份: ${year || '全部'}`);

    let url = `${window.BACKEND_URL}/api/favorite_numbers?position=${position}&lottery_type=${lotteryType}`;
    if (year) {
      url += `&year=${year}`;
    }

    const res = await fetch(url);
    const result = await res.json();

    console.log('API响应:', result);

    if (result.success) {
      console.log('关注号码数据:', result.data);
      renderFavoriteNumbersTable(result.data, lotteryType, position, year);
    } else {
      console.error('加载关注号码失败:', result.message);
    }
  } catch (error) {
    console.error('加载关注号码失败:', error);
  }
}

/**
 * 渲染关注号码表格
 */
function renderFavoriteNumbersTable(favoriteNumbers, lotteryType, position, year) {
  console.log('开始渲染关注号码表格，数据:', favoriteNumbers);

  // 更新表格信息
  const tableInfo = document.getElementById('tableInfo');
  if (tableInfo) {
    const lotteryName = lotteryType === 'am' ? '澳门' : '香港';
    const yearText = year ? `<span style="color:#e74c3c;font-weight:bold;">${year}年</span>` : '<span style="color:#27ae60;font-weight:bold;">全部年份</span>';
    tableInfo.innerHTML = `当前分析：<span style="color:#2980d9;font-weight:bold;">${lotteryName}彩种</span> - <span style="color:#e67e22;font-weight:bold;">第${position}位</span>号码遗漏统计 【${yearText}】`;
  }

  const tbody = document.querySelector('#favoriteNumbersTable tbody');
  if (!tbody) {
    console.error('找不到表格tbody元素');
    return;
  }

  console.log('找到tbody元素，开始清空并渲染');
  tbody.innerHTML = '';

  if (!favoriteNumbers || favoriteNumbers.length === 0) {
    console.log('没有数据，显示空状态');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">暂无数据</td></tr>';
    return;
  }

  favoriteNumbers.forEach((item, index) => {
    console.log(`渲染第${index + 1}条数据:`, item);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.name || ''}</td>
      <td>${item.numbers || ''}</td>
      <td>${item.current_miss || 0}</td>
      <td>${item.max_miss || 0}</td>
      <td>${item.created_at ? item.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      <td>
        <button class="btn-edit" data-id="${item.id}">编辑</button>
        <button class="btn-delete" data-id="${item.id}">删除</button>
        <button class="btn-analyze" data-id="${item.id}">分析</button>
      </td>
    `;

    // 绑定按钮事件
    const editBtn = row.querySelector('.btn-edit');
    const deleteBtn = row.querySelector('.btn-delete');
    const analyzeBtn = row.querySelector('.btn-analyze');

    editBtn.addEventListener('click', () => editFavoriteNumber(item.id));
    deleteBtn.addEventListener('click', () => deleteFavoriteNumber(item.id));
    analyzeBtn.addEventListener('click', () => {
      const activeBtn = document.querySelector('.position-btn.active');
      const position = activeBtn ? activeBtn.getAttribute('data-position') : 7;
      analyzeFavoriteNumber(item.id, position);
    });

    tbody.appendChild(row);
  });

  console.log('渲染完成，共渲染', favoriteNumbers.length, '条数据');
}

// ==================== 事件绑定 ====================
/**
 * 绑定关注号码事件
 */
function bindFavoriteNumbersEvents() {
  const form = document.getElementById('favoriteNumbersForm');
  if (form) {
    form.onsubmit = async function(e) {
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
          // 更新
          res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          // 新增
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

  // 取消编辑按钮
  const cancelBtn = document.getElementById('cancelFavoriteNumberBtn');
  if (cancelBtn) {
    cancelBtn.onclick = resetFavoriteNumberForm;
  }

  // 刷新按钮
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.onclick = loadFavoriteNumbers;
  }

  // 彩种按钮点击事件
  const lotteryBtns = document.querySelectorAll('.lottery-btn');
  lotteryBtns.forEach(btn => {
    btn.onclick = function() {
      lotteryBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadFavoriteNumbers();
    };
  });

  // 位置按钮点击事件
  const positionBtns = document.querySelectorAll('.position-btn');
  positionBtns.forEach(btn => {
    btn.onclick = function() {
      positionBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      loadFavoriteNumbers();
    };
  });
}

/**
 * 重置关注号码表单
 */
function resetFavoriteNumberForm() {
  document.getElementById('favoriteNumberId').value = '';
  document.getElementById('favoriteNumberName').value = '';
  document.getElementById('favoriteNumbers').value = '';
  document.getElementById('cancelFavoriteNumberBtn').style.display = 'none';
}

// ==================== CRUD操作 ====================
/**
 * 编辑关注号码
 */
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

/**
 * 删除关注号码
 */
async function deleteFavoriteNumber(id) {
  if (!confirm('确定要删除这个关注号码组吗？')) return;

  try {
    const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}`, {
      method: 'DELETE'
    });
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

/**
 * 分析关注号码
 */
async function analyzeFavoriteNumber(id, position = 7) {
  try {
    const activeLotteryBtn = document.querySelector('.lottery-btn.active');
    const lotteryType = activeLotteryBtn ? activeLotteryBtn.getAttribute('data-lottery') : 'am';

    const res = await fetch(`${window.BACKEND_URL}/api/favorite_numbers/${id}/analysis?lottery_type=${lotteryType}&position=${position}`);
    const result = await res.json();

    if (result.success) {
      alert('分析功能需要完整实现，请查看控制台日志');
      console.log('分析结果:', result.data);
    } else {
      alert('分析失败: ' + result.message);
    }
  } catch (error) {
    console.error('分析失败:', error);
    alert('分析失败，请检查网络连接');
  }
}

// ==================== 模块导出 ====================
window.initFavoriteNumbersModule = initFavoriteNumbersModule;
window.favoriteNumbersModule = {
  loadFavoriteNumbers,
  editFavoriteNumber,
  deleteFavoriteNumber,
  analyzeFavoriteNumber
};
