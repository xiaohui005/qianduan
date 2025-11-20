/**
 * 关注号码管理模块 (Place Management Module)
 * 功能：管理关注号码（登记点）的增删改查
 *
 * API端点:
 * - GET /api/places - 获取所有关注点
 * - POST /api/places - 创建关注点
 * - PUT /api/places/{id} - 更新关注点
 * - DELETE /api/places/{id} - 删除关注点
 *
 * 主要功能：
 * - 关注号码列表展示
 * - 添加新关注号码
 * - 编辑关注号码
 * - 删除关注号码
 * - 表单验证
 *
 * @module place-management
 */

// ==================== 工具函数 ====================
/**
 * 渲染关注点表格
 * @param {Array} places - 关注点列表
 */
function renderPlacesTable(places) {
  const tbody = document.querySelector('#placesTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!places || places.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4" class="text-center">暂无数据</td>';
    tbody.appendChild(tr);
    return;
  }

  places.forEach(place => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${place.name}</td>
      <td>${place.description || ''}</td>
      <td>${place.created_at ? place.created_at.replace('T', ' ').slice(0, 19) : ''}</td>
      <td>
        <button class="edit-place-btn btn-secondary" data-id="${place.id}">编辑</button>
        <button class="delete-place-btn btn-danger" data-id="${place.id}" style="margin-left:8px;">删除</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==================== API调用函数 ====================
/**
 * 加载所有关注点
 */
async function loadPlaces() {
  try {
    const res = await fetch(window.BACKEND_URL + '/api/places');
    if (!res.ok) throw new Error('加载失败');
    const data = await res.json();
    renderPlacesTable(data);
    return data;
  } catch (error) {
    console.error('加载关注点失败:', error);
    alert('加载关注点失败：' + error.message);
    return [];
  }
}

/**
 * 添加关注点
 * @param {Object} place - 关注点数据
 */
async function addPlace(place) {
  try {
    const res = await fetch(window.BACKEND_URL + '/api/places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place)
    });
    if (!res.ok) throw new Error('添加失败');
    return await res.json();
  } catch (error) {
    console.error('添加关注点失败:', error);
    alert('添加关注点失败：' + error.message);
    throw error;
  }
}

/**
 * 更新关注点
 * @param {number} id - 关注点ID
 * @param {Object} place - 关注点数据
 */
async function updatePlace(id, place) {
  try {
    const res = await fetch(window.BACKEND_URL + '/api/places/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(place)
    });
    if (!res.ok) throw new Error('更新失败');
    return await res.json();
  } catch (error) {
    console.error('更新关注点失败:', error);
    alert('更新关注点失败：' + error.message);
    throw error;
  }
}

/**
 * 删除关注点
 * @param {number} id - 关注点ID
 */
async function deletePlace(id) {
  if (!confirm('确定要删除该关注点吗？')) return;

  try {
    const res = await fetch(window.BACKEND_URL + '/api/places/' + id, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('删除失败');
    await loadPlaces();
    alert('删除成功');
  } catch (error) {
    console.error('删除关注点失败:', error);
    alert('删除关注点失败：' + error.message);
  }
}

// ==================== 表单处理 ====================
/**
 * 处理表单提交
 * @param {Event} e - 表单提交事件
 */
async function handlePlaceFormSubmit(e) {
  e.preventDefault();

  const form = document.getElementById('placeForm');
  if (!form) return;

  const id = document.getElementById('placeId').value;
  const name = document.getElementById('placeName').value.trim();
  const description = document.getElementById('placeDescription').value.trim();

  if (!name) {
    alert('请输入关注点名称');
    return;
  }

  const place = { name, description };

  try {
    if (id) {
      // 更新
      await updatePlace(id, place);
      alert('更新成功');
    } else {
      // 添加
      await addPlace(place);
      alert('添加成功');
    }

    // 重置表单
    form.reset();
    document.getElementById('placeId').value = '';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    // 重新加载列表
    await loadPlaces();
  } catch (error) {
    // 错误已在API函数中处理
  }
}

/**
 * 取消编辑
 */
function handleCancelEdit() {
  const form = document.getElementById('placeForm');
  if (form) {
    form.reset();
    document.getElementById('placeId').value = '';
  }

  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
}

/**
 * 编辑关注点
 * @param {number} id - 关注点ID
 */
async function handleEditPlace(id) {
  try {
    const res = await fetch(window.BACKEND_URL + '/api/places');
    const data = await res.json();
    const place = data.find(p => String(p.id) === String(id));

    if (place) {
      document.getElementById('placeId').value = place.id;
      document.getElementById('placeName').value = place.name;
      document.getElementById('placeDescription').value = place.description || '';

      const cancelBtn = document.getElementById('cancelEditBtn');
      if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
      }

      // 滚动到表单位置
      const form = document.getElementById('placeForm');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch (error) {
    console.error('加载关注点详情失败:', error);
    alert('加载关注点详情失败：' + error.message);
  }
}

// ==================== 事件绑定 ====================
/**
 * 绑定表单事件
 */
function bindPlaceFormEvents() {
  // 表单提交事件
  const form = document.getElementById('placeForm');
  if (form) {
    form.removeEventListener('submit', handlePlaceFormSubmit);
    form.addEventListener('submit', handlePlaceFormSubmit);
  }

  // 取消编辑按钮
  const cancelBtn = document.getElementById('cancelEditBtn');
  if (cancelBtn) {
    cancelBtn.removeEventListener('click', handleCancelEdit);
    cancelBtn.addEventListener('click', handleCancelEdit);
  }

  // 表格事件委托（编辑/删除）
  const placesTable = document.getElementById('placesTable');
  if (placesTable) {
    placesTable.removeEventListener('click', handleTableClick);
    placesTable.addEventListener('click', handleTableClick);
  }
}

/**
 * 表格点击事件处理
 * @param {Event} e - 点击事件
 */
function handleTableClick(e) {
  if (e.target.classList.contains('edit-place-btn')) {
    const id = e.target.getAttribute('data-id');
    handleEditPlace(id);
  } else if (e.target.classList.contains('delete-place-btn')) {
    const id = e.target.getAttribute('data-id');
    deletePlace(id);
  }
}

// ==================== 模块初始化 ====================
/**
 * 初始化关注号码管理模块
 */
function initPlaceManagementModule() {
  console.log('🎯 Initializing Place Management module...');

  // 绑定事件
  bindPlaceFormEvents();

  // 加载关注点列表
  loadPlaces();

  console.log('✅ Place Management module initialized');
}

// ==================== 模块导出 ====================
window.initPlaceManagementModule = initPlaceManagementModule;
window.placeManagementModule = {
  loadPlaces,
  addPlace,
  updatePlace,
  deletePlace,
  renderPlacesTable
};
