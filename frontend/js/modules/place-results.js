/**
 * 关注点登记结果管理模块 (Place Results Management Module)
 * 功能：关注点登记结果的增删改查、分页、查询过滤、遗漏统计
 *
 * API端点:
 * - GET /api/place_results - 获取关注点登记结果（支持分页和查询）
 * - POST /api/place_results - 创建关注点登记结果
 * - PUT /api/place_results/{id} - 更新关注点登记结果
 * - DELETE /api/place_results/{id} - 删除关注点登记结果
 *
 * 主要功能：
 * - 关注点登记结果列表展示（分页）
 * - 添加/编辑/删除登记结果
 * - 查询过滤（关注点、期数、是否正确、日期范围）
 * - 遗漏统计（当前遗漏、最大遗漏）
 * - 关注点按钮选择和自动完成
 *
 * @module place-results
 */

// ==================== 模块状态 ====================
let currentPlaceResultPage = 1;
let currentPlaceResultPageSize = 20;
let currentPlaceResultTotal = 0;
let currentPlaceResultTotalPages = 0;
let editingPlaceResultId = null;

// ==================== 渲染函数 ====================
/**
 * 渲染关注点登记结果表格
 * @param {Array} results - 登记结果列表
 * @param {Array} pageResults - 当前页结果列表
 */
function renderPlaceResultsTable(results, pageResults = []) {
  const tbody = document.querySelector('#placeResultsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!results || results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">暂无数据</td></tr>';
    return;
  }

  pageResults.forEach(result => {
    const row = document.createElement('tr');
    row.setAttribute('data-id', result.id);
    const isCorrectText = result.is_correct === 1 ? '正确' : (result.is_correct === 0 ? '错误' : '未判断');
    const isCorrectClass = result.is_correct === 1 ? 'correct' : (result.is_correct === 0 ? 'wrong' : 'unjudged');

    // 遗漏数据显示
    const currentMiss = result.current_miss !== undefined ? result.current_miss : '-';
    const maxMiss = result.max_miss !== undefined ? result.max_miss : '-';

    // 遗漏数据样式(当前遗漏较高时标红)
    const currentMissStyle = (result.current_miss && result.current_miss >= 5) ? 'color:#e74c3c;font-weight:bold;' : '';
    const maxMissStyle = (result.max_miss && result.max_miss >= 10) ? 'color:#e67e22;font-weight:bold;' : '';

    row.innerHTML = `
      <td>${result.place_name || '-'}</td>
      <td>${result.qishu}</td>
      <td class="${isCorrectClass}">${isCorrectText}</td>
      <td style="${currentMissStyle}">${currentMiss}</td>
      <td style="${maxMissStyle}">${maxMiss}</td>
      <td>${result.created_at}</td>
      <td>
        <button class="btn-edit" data-id="${result.id}">编辑</button>
        <button class="btn-delete" data-id="${result.id}">删除</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // 添加事件委托来处理编辑和删除按钮
  tbody.addEventListener('click', function(e) {
    console.log('表格点击事件:', e.target);
    if (e.target.classList.contains('btn-edit')) {
      const id = parseInt(e.target.dataset.id);
      console.log('点击编辑按钮，ID:', id);
      editPlaceResult(id);
    } else if (e.target.classList.contains('btn-delete')) {
      const id = parseInt(e.target.dataset.id);
      console.log('点击删除按钮，ID:', id);
      deletePlaceResult(id);
    }
  });
}

/**
 * 更新关注点登记结果统计
 * @param {Object} results - API返回的结果对象
 * @param {Array} pageResults - 当前页结果列表
 */
function updatePlaceResultsStats(results, pageResults = []) {
  const totalRecords = results?.total || 0;
  const pageRecords = pageResults.length;

  // 总体统计
  let totalCorrect = 0, totalWrong = 0, totalUnjudged = 0;
  if (results?.data) {
    results.data.forEach(result => {
      if (result.is_correct === 1) totalCorrect++;
      else if (result.is_correct === 0) totalWrong++;
      else totalUnjudged++;
    });
  }

  // 本页统计
  let pageCorrect = 0, pageWrong = 0, pageUnjudged = 0;
  pageResults.forEach(result => {
    if (result.is_correct === 1) pageCorrect++;
    else if (result.is_correct === 0) pageWrong++;
    else pageUnjudged++;
  });

  document.getElementById('totalPlaceResultRecords').textContent = totalRecords;
  document.getElementById('totalCorrectRecords').textContent = totalCorrect;
  document.getElementById('totalWrongRecords').textContent = totalWrong;
  document.getElementById('totalUnjudgedRecords').textContent = totalUnjudged;

  document.getElementById('pagePlaceResultRecords').textContent = pageRecords;
  document.getElementById('pageCorrectRecords').textContent = pageCorrect;
  document.getElementById('pageWrongRecords').textContent = pageWrong;
  document.getElementById('pageUnjudgedRecords').textContent = pageUnjudged;
}

/**
 * 更新关注点登记结果分页
 * @param {Object} results - API返回的结果对象
 * @param {number} currentPage - 当前页码
 */
function updatePlaceResultsPagination(results, currentPage) {
  const total = results?.pagination?.total || 0;
  const pageSize = results?.pagination?.page_size || 20;
  const totalPages = results?.pagination?.total_pages || 0;

  console.log('分页信息:', { total, pageSize, totalPages });

  currentPlaceResultTotal = total;
  currentPlaceResultTotalPages = totalPages;

  // 更新分页信息
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  document.getElementById('placeResultsPaginationInfo').textContent =
    `显示 ${start}-${end} 条，共 ${total} 条记录`;

  // 更新分页按钮
  const prevBtn = document.getElementById('prevPlaceResultPageBtn');
  const nextBtn = document.getElementById('nextPlaceResultPageBtn');
  const pageNumbers = document.getElementById('placeResultPageNumbers');

  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;

  // 生成页码
  let pageHtml = '';
  const maxPages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    if (i === currentPage) {
      pageHtml += `<span class="page-number current">${i}</span>`;
    } else {
      pageHtml += `<span class="page-number" onclick="goToPlaceResultPage(${i})">${i}</span>`;
    }
  }
  pageNumbers.innerHTML = pageHtml;
}

// ==================== 数据加载函数 ====================
/**
 * 获取关注点列表
 */
async function fetchPlaceResultsPlaces() {
  try {
    const res = await fetch(window.BACKEND_URL + '/api/places');
    const places = await res.json();
    return places;
  } catch (error) {
    console.error('获取关注点列表失败:', error);
    return [];
  }
}

/**
 * 加载关注点登记结果
 */
async function loadPlaceResults() {
  try {
    // 首先测试API连接
    console.log('测试API连接...');
    const testResponse = await fetch(`${window.BACKEND_URL}/`);
    console.log('API连接状态:', testResponse.status);

    const params = new URLSearchParams({
      page: currentPlaceResultPage,
      page_size: currentPlaceResultPageSize
    });

    // 添加查询条件
    const queryPlace = document.getElementById('queryPlaceResultPlace')?.value;
    const queryQishu = document.getElementById('queryPlaceResultQishu')?.value;
    const queryIsCorrect = document.getElementById('queryPlaceResultIsCorrect')?.value;
    const queryStartDate = document.getElementById('queryPlaceResultStartDate')?.value;
    const queryEndDate = document.getElementById('queryPlaceResultEndDate')?.value;

    console.log('查询条件:', { queryPlace, queryQishu, queryIsCorrect, queryStartDate, queryEndDate });

    if (queryPlace && queryPlace.trim()) {
      // 需要根据关注点名称查找ID
      const places = await fetchPlaceResultsPlaces();
      const place = places.find(p => p.name === queryPlace.trim());
      if (place) {
        params.append('place_id', place.id);
        console.log('找到关注点ID:', place.id);
      } else {
        console.log('未找到关注点:', queryPlace);
      }
    }
    if (queryQishu && queryQishu.trim()) {
      params.append('qishu', queryQishu.trim());
    }
    if (queryIsCorrect && queryIsCorrect !== '') {
      if (queryIsCorrect === 'null') {
        // 查询未判断的记录
        params.append('is_correct', 'null');
      } else {
        params.append('is_correct', queryIsCorrect);
      }
    }
    if (queryStartDate && queryStartDate.trim()) {
      params.append('start_date', queryStartDate.trim());
    }
    if (queryEndDate && queryEndDate.trim()) {
      params.append('end_date', queryEndDate.trim());
    }

    console.log('请求URL:', `${window.BACKEND_URL}/api/place_results?${params}`);

    const response = await fetch(`${window.BACKEND_URL}/api/place_results?${params}`);
    const result = await response.json();

    console.log('API响应:', result);

    if (result.success) {
      renderPlaceResultsTable(result.data, result.data);
      updatePlaceResultsStats(result, result.data);
      updatePlaceResultsPagination(result, currentPlaceResultPage);
    } else {
      console.error('加载关注点登记结果失败:', result.message);
      alert('查询失败: ' + result.message);
    }
  } catch (error) {
    console.error('加载关注点登记结果失败:', error);
    alert('查询失败: 网络错误');
  }
}

// ==================== API调用函数 ====================
/**
 * 添加关注点登记结果
 * @param {Object} placeResult - 登记结果数据
 */
async function addPlaceResult(placeResult) {
  try {
    const response = await fetch(`${window.BACKEND_URL}/api/place_results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(placeResult)
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('添加关注点登记结果失败:', error);
    return { success: false, message: '网络错误' };
  }
}

/**
 * 更新关注点登记结果
 * @param {number} id - 登记结果ID
 * @param {Object} placeResult - 登记结果数据
 */
async function updatePlaceResult(id, placeResult) {
  try {
    const response = await fetch(`${window.BACKEND_URL}/api/place_results/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(placeResult)
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('更新关注点登记结果失败:', error);
    return { success: false, message: '网络错误' };
  }
}

/**
 * 删除关注点登记结果
 * @param {number} id - 登记结果ID
 */
async function deletePlaceResult(id) {
  if (!confirm('确定要删除这条记录吗？')) return;

  try {
    const response = await fetch(`${window.BACKEND_URL}/api/place_results/${id}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      alert('删除成功');
      loadPlaceResults();
    } else {
      alert('删除失败: ' + result.message);
    }
  } catch (error) {
    console.error('删除关注点登记结果失败:', error);
    alert('删除失败: 网络错误');
  }
}

/**
 * 编辑关注点登记结果
 * @param {number} id - 登记结果ID
 */
function editPlaceResult(id) {
  console.log('编辑关注点登记结果，ID:', id);
  editingPlaceResultId = id;

  // 查找对应的记录
  const table = document.getElementById('placeResultsTable');
  const row = table.querySelector(`tr[data-id="${id}"]`);
  if (!row) {
    console.log('未找到对应的行');
    return;
  }

  const cells = row.cells;
  const placeName = cells[0].textContent;
  const qishu = cells[1].textContent;
  const isCorrect = cells[2].textContent;

  console.log('编辑数据:', { placeName, qishu, isCorrect });

  // 填充表单
  document.getElementById('placeResultId').value = id;
  document.getElementById('placeResultQishu').value = qishu;

  // 设置关注点按钮选中状态
  fetchPlaceResultsPlaces().then(places => {
    const place = places.find(p => p.name === placeName);
    if (place) {
      // 设置隐藏输入框的值
      const hiddenInput = document.getElementById('placeResultPlaceInput');
      hiddenInput.value = placeName;
      hiddenInput.dataset.placeId = place.id;

      // 设置按钮选中状态
      const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
      buttons.forEach(btn => {
        if (btn.dataset.id === place.id.toString()) {
          btn.classList.add('selected');
          console.log('设置关注点按钮选中:', placeName, 'ID:', place.id);
        } else {
          btn.classList.remove('selected');
        }
      });
    }
  });

  // 设置是否正确按钮状态
  const isCorrectValue = isCorrect === '正确' ? '1' : (isCorrect === '错误' ? '0' : '');
  setIsCorrectButtonValue('placeResultForm', isCorrectValue);

  // 显示取消按钮
  document.getElementById('cancelPlaceResultEditBtn').style.display = 'inline-block';

  console.log('编辑表单已填充');
}

// ==================== 关注点选择 ====================
/**
 * 设置关注点按钮选择功能
 */
function setupPlaceResultPlaceButtons() {
  console.log('设置关注点登记结果按钮选择功能');
  const buttonsContainer = document.getElementById('placeResultPlaceButtons');
  const hiddenInput = document.getElementById('placeResultPlaceInput');

  if (!buttonsContainer || !hiddenInput) {
    console.log('未找到按钮容器或隐藏输入框元素');
    return;
  }

  console.log('容器元素:', buttonsContainer);

  // 强制设置容器可见
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.flexWrap = 'wrap';
  buttonsContainer.style.gap = '8px';
  buttonsContainer.style.padding = '8px';
  buttonsContainer.style.border = '1px solid #ddd';
  buttonsContainer.style.background = '#f8f9fa';
  buttonsContainer.style.minHeight = '50px';
  buttonsContainer.style.height = 'auto';
  buttonsContainer.style.maxHeight = '200px';
  buttonsContainer.style.overflowY = 'auto';

  // 清空容器
  buttonsContainer.innerHTML = '';

  // 获取关注点数据并渲染按钮
  fetchPlaceResultsPlaces()
    .then(places => {
      console.log('获取到关注点数据，数量:', places.length);
      console.log('数据样本:', places.slice(0, 2));

      if (!places || places.length === 0) {
        buttonsContainer.innerHTML = '<p style="color: #999; font-size: 14px;">暂无关注点数据</p>';
        return;
      }

      // 渲染按钮
      const html = places.map(place =>
        `<button type="button" class="place-selection-btn" data-id="${place.id}" data-name="${place.name}" style="display:inline-block!important;padding:6px 12px;border:2px solid #ddd;background:#fff;color:#333;border-radius:20px;cursor:pointer;font-size:13px;margin:4px;">${place.name}</button>`
      ).join('');

      console.log('准备渲染HTML，长度:', html.length);

      // 重新获取容器并设置
      const container = document.getElementById('placeResultPlaceButtons');
      if (container) {
        container.innerHTML = html;
        console.log('渲染完成，容器innerHTML长度:', container.innerHTML.length);

        // 绑定按钮点击事件
        const buttons = container.querySelectorAll('.place-selection-btn');
        console.log('查找到的按钮数量:', buttons.length);

        buttons.forEach(btn => {
          btn.addEventListener('click', function() {
            console.log('按钮被点击:', this.dataset.name);
            // 移除其他按钮的选中状态
            container.querySelectorAll('.place-selection-btn').forEach(b => b.classList.remove('selected'));
            // 添加当前按钮的选中状态
            this.classList.add('selected');
            // 重新获取隐藏输入框（因为表单可能被克隆替换）
            const input = document.getElementById('placeResultPlaceInput');
            if (input) {
              input.value = this.dataset.name;
              input.dataset.placeId = this.dataset.id;
              console.log('选中关注点:', this.dataset.name, 'ID:', this.dataset.id);
            } else {
              console.error('无法找到隐藏输入框！');
            }
          });
        });

        console.log('关注点按钮渲染完成，共', buttons.length, '个按钮');
      } else {
        console.error('无法找到容器元素！');
      }
    })
    .catch(error => {
      console.error('获取关注点列表失败:', error);
      buttonsContainer.innerHTML = '<p style="color: #e74c3c; font-size: 14px;">加载关注点失败</p>';
    });
}

/**
 * 设置查询关注点自动完成
 */
function setupQueryPlaceResultPlaceAutocomplete() {
  const input = document.getElementById('queryPlaceResultPlace');
  const suggest = document.getElementById('queryPlaceResultPlaceSuggest');

  if (!input || !suggest) return;

  // 移除之前的事件监听器，避免重复绑定
  const newInput = input.cloneNode(true);
  newInput.id = 'queryPlaceResultPlace';
  input.parentNode.replaceChild(newInput, input);

  const newSuggest = suggest.cloneNode(true);
  newSuggest.id = 'queryPlaceResultPlaceSuggest';
  suggest.parentNode.replaceChild(newSuggest, suggest);

  let selectedIndex = -1;
  let suggestions = [];

  newInput.addEventListener('input', async function() {
    const value = this.value.trim();
    if (value.length === 0) {
      newSuggest.innerHTML = '';
      return;
    }

    try {
      const places = await fetchPlaceResultsPlaces();
      suggestions = places.filter(place =>
        place.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);

      if (suggestions.length > 0) {
        let html = '';
        suggestions.forEach((place, index) => {
          html += `<div class="suggestion-item" data-index="${index}" data-id="${place.id}" data-name="${place.name}">${place.name}</div>`;
        });
        newSuggest.innerHTML = html;
        newSuggest.style.display = 'block';
      } else {
        newSuggest.innerHTML = '';
      }
    } catch (error) {
      console.error('获取关注点列表失败:', error);
    }
  });

  newInput.addEventListener('blur', function() {
    setTimeout(() => {
      newSuggest.style.display = 'none';
    }, 200);
  });

  newSuggest.addEventListener('click', function(e) {
    if (e.target.classList.contains('suggestion-item')) {
      const index = parseInt(e.target.dataset.index);
      const place = suggestions[index];
      newInput.value = place.name;
      newSuggest.style.display = 'none';
    }
  });

  newInput.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      updateSelection(suggestions, selectedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(suggestions, selectedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        const place = suggestions[selectedIndex];
        newInput.value = place.name;
        newSuggest.style.display = 'none';
      }
    }
  });

  function updateSelection(items, index) {
    const items_elements = newSuggest.querySelectorAll('.suggestion-item');
    items_elements.forEach((item, i) => {
      item.classList.toggle('selected', i === index);
    });
  }
}

// ==================== 事件绑定 ====================
/**
 * 跳转到指定页
 * @param {number} page - 页码
 */
function goToPlaceResultPage(page) {
  currentPlaceResultPage = page;
  loadPlaceResults();
}

/**
 * 绑定分页事件
 */
function bindPlaceResultsPaginationEvents() {
  const prevBtn = document.getElementById('prevPlaceResultPageBtn');
  const nextBtn = document.getElementById('nextPlaceResultPageBtn');

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentPlaceResultPage > 1) {
        currentPlaceResultPage--;
        loadPlaceResults();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentPlaceResultPage < currentPlaceResultTotalPages) {
        currentPlaceResultPage++;
        loadPlaceResults();
      }
    };
  }
}

/**
 * 绑定查询事件
 */
function bindPlaceResultsQueryEvents() {
  const queryBtn = document.getElementById('queryPlaceResultsBtn');
  const resetBtn = document.getElementById('resetPlaceResultQueryBtn');
  const clearBtn = document.getElementById('clearPlaceResultQueryBtn');

  if (queryBtn) {
    queryBtn.onclick = () => {
      console.log('查询按钮被点击');
      currentPlaceResultPage = 1;
      loadPlaceResults();
    };
  }

  if (resetBtn) {
    resetBtn.onclick = () => {
      document.getElementById('queryPlaceResultPlace').value = '';
      document.getElementById('queryPlaceResultQishu').value = '';
      document.getElementById('queryPlaceResultIsCorrect').value = '';
      document.getElementById('queryPlaceResultStartDate').value = '';
      document.getElementById('queryPlaceResultEndDate').value = '';
      // 重置按钮状态
      resetIsCorrectButtons('placeResultsQueryForm');
      currentPlaceResultPage = 1;
      loadPlaceResults();
    };
  }

  if (clearBtn) {
    clearBtn.onclick = () => {
      document.getElementById('queryPlaceResultPlace').value = '';
      document.getElementById('queryPlaceResultQishu').value = '';
      document.getElementById('queryPlaceResultIsCorrect').value = '';
      document.getElementById('queryPlaceResultStartDate').value = '';
      document.getElementById('queryPlaceResultEndDate').value = '';
      // 重置按钮状态
      resetIsCorrectButtons('placeResultsQueryForm');
    };
  }
}

/**
 * 绑定表单事件
 */
function bindPlaceResultFormEvents() {
  const form = document.getElementById('placeResultForm');
  const cancelBtn = document.getElementById('cancelPlaceResultEditBtn');

  if (form) {
    // 移除之前的事件监听器，避免重复绑定
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    newForm.addEventListener('submit', async function(e) {
      e.preventDefault();

      const placeInput = document.getElementById('placeResultPlaceInput');
      const placeId = placeInput.dataset.placeId || placeInput.value;
      const qishu = document.getElementById('placeResultQishu').value;
      const isCorrect = document.getElementById('placeResultIsCorrect').value;

      console.log('表单提交 - placeId:', placeId, 'qishu:', qishu, 'isCorrect:', isCorrect);

      if (!placeId || !qishu) {
        alert('请填写完整信息（关注点ID: ' + placeId + ', 期数: ' + qishu + '）');
        return;
      }

      const placeResult = {
        place_id: parseInt(placeId),
        qishu: qishu,
        is_correct: isCorrect === '' ? null : parseInt(isCorrect)
      };

      let result;
      if (editingPlaceResultId) {
        result = await updatePlaceResult(editingPlaceResultId, placeResult);
      } else {
        result = await addPlaceResult(placeResult);
      }

      if (result.success) {
        alert(editingPlaceResultId ? '更新成功' : '添加成功');
        newForm.reset();
        editingPlaceResultId = null;
        document.getElementById('cancelPlaceResultEditBtn').style.display = 'none';
        // 重置按钮状态
        resetIsCorrectButtons('placeResultForm');
        // 清除关注点按钮选中状态
        const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
        buttons.forEach(btn => btn.classList.remove('selected'));
        // 清空隐藏输入框
        const hiddenInput = document.getElementById('placeResultPlaceInput');
        hiddenInput.value = '';
        hiddenInput.dataset.placeId = '';
        loadPlaceResults();
      } else {
        alert((editingPlaceResultId ? '更新' : '添加') + '失败: ' + result.message);
      }
    });
  }

  if (cancelBtn) {
    // 移除之前的事件监听器
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.addEventListener('click', function() {
      document.getElementById('placeResultForm').reset();
      editingPlaceResultId = null;
      this.style.display = 'none';
      // 重置按钮状态
      resetIsCorrectButtons('placeResultForm');
      // 清除关注点按钮选中状态
      const buttons = document.querySelectorAll('#placeResultPlaceButtons .place-selection-btn');
      buttons.forEach(btn => btn.classList.remove('selected'));
      // 清空隐藏输入框
      const hiddenInput = document.getElementById('placeResultPlaceInput');
      hiddenInput.value = '';
      hiddenInput.dataset.placeId = '';
    });
  }
}

/**
 * 绑定是否正确按钮事件
 */
function bindIsCorrectButtons() {
  console.log('开始绑定是否正确按钮事件');

  // 表单中的是否正确按钮
  const formButtons = document.querySelectorAll('#placeResultForm .is-correct-btn');
  console.log('找到表单按钮数量:', formButtons.length);
  formButtons.forEach(btn => {
    // 移除之前的事件监听器
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', function() {
      const value = this.dataset.value;
      const hiddenInput = document.getElementById('placeResultIsCorrect');
      hiddenInput.value = value;
      console.log('表单按钮点击，设置值:', value);

      // 更新按钮状态
      document.querySelectorAll('#placeResultForm .is-correct-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  // 查询表单中的是否正确按钮
  const queryButtons = document.querySelectorAll('#placeResultsQueryForm .is-correct-btn');
  console.log('找到查询按钮数量:', queryButtons.length);
  queryButtons.forEach(btn => {
    // 移除之前的事件监听器
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', function() {
      const value = this.dataset.value;
      const hiddenInput = document.getElementById('queryPlaceResultIsCorrect');
      hiddenInput.value = value;
      console.log('查询按钮点击，设置值:', value);

      // 更新按钮状态
      document.querySelectorAll('#placeResultsQueryForm .is-correct-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

/**
 * 重置是否正确按钮状态
 * @param {string} formId - 表单ID
 */
function resetIsCorrectButtons(formId) {
  const buttons = document.querySelectorAll(`#${formId} .is-correct-btn`);
  buttons.forEach(btn => btn.classList.remove('active'));

  // 默认选中第一个按钮（未判断/全部）
  if (buttons.length > 0) {
    buttons[0].classList.add('active');
  }
}

/**
 * 设置是否正确按钮的初始值
 * @param {string} formId - 表单ID
 * @param {string} value - 值
 */
function setIsCorrectButtonValue(formId, value) {
  const buttons = document.querySelectorAll(`#${formId} .is-correct-btn`);
  const hiddenInput = document.getElementById(formId === 'placeResultForm' ? 'placeResultIsCorrect' : 'queryPlaceResultIsCorrect');

  buttons.forEach(btn => btn.classList.remove('active'));
  hiddenInput.value = value;

  // 找到对应的按钮并激活
  const targetBtn = Array.from(buttons).find(btn => btn.dataset.value === value);
  if (targetBtn) {
    targetBtn.classList.add('active');
  } else if (buttons.length > 0) {
    // 如果没找到，默认选中第一个
    buttons[0].classList.add('active');
  }
}

// ==================== 模块初始化 ====================
/**
 * 初始化关注点登记结果模块
 */
function initPlaceResultsModule() {
  console.log('🎯 Initializing Place Results module...');

  setupPlaceResultPlaceButtons();
  setupQueryPlaceResultPlaceAutocomplete();
  bindPlaceResultFormEvents();
  bindPlaceResultsPaginationEvents();
  bindPlaceResultsQueryEvents();
  bindIsCorrectButtons();

  // 设置按钮初始状态
  resetIsCorrectButtons('placeResultForm');
  resetIsCorrectButtons('placeResultsQueryForm');

  loadPlaceResults();

  console.log('✅ Place Results module initialized');
}

// ==================== 模块导出 ====================
window.initPlaceResultsModule = initPlaceResultsModule;
window.placeResultsModule = {
  loadPlaceResults,
  addPlaceResult,
  updatePlaceResult,
  deletePlaceResult
};
window.goToPlaceResultPage = goToPlaceResultPage;
window.deletePlaceResult = deletePlaceResult;
window.editPlaceResult = editPlaceResult;
