/**
 * 最大遗漏提醒模块
 * 功能：显示关注点的当前遗漏与最大遗漏差距提醒
 */

(function() {
  /**
   * 获取最大遗漏提醒数据
   * @param {number} threshold - 最大遗漏差距阈值
   * @returns {Promise<Object>} API响应
   */
  async function fetchMaxMissAlerts(threshold) {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/places_max_miss_alerts?threshold=${encodeURIComponent(threshold)}`);
      return await res.json();
    } catch (e) {
      console.error('获取最大遗漏提醒失败:', e);
      return { success: false, message: String(e) };
    }
  }

  /**
   * 渲染最大遗漏提醒表格
   * @param {Array} data - 最大遗漏提醒数据数组
   */
  function renderMaxMissAlerts(data) {
    const tbody = document.querySelector('#maxMissAlertTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!data || !data.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center;color:#888;">暂无符合条件的关注点</td>`;
      tbody.appendChild(tr);
      return;
    }

    data.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.place_name || '-'}</td>
        <td>${item.description || ''}</td>
        <td>${item.current_miss ?? '-'}</td>
        <td>${item.max_miss ?? '-'}</td>
        <td>${item.gap ?? '-'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * 加载并显示最大遗漏提醒数据
   * @param {number} threshold - 最大遗漏差距阈值
   */
  window.loadMaxMissAlerts = async function(threshold) {
    const result = await fetchMaxMissAlerts(threshold);
    if (!result || !result.success) {
      console.error('最大遗漏提醒接口失败:', result && result.message);
      renderMaxMissAlerts([]);
      return;
    }
    renderMaxMissAlerts(result.data || []);
  };

  /**
   * 初始化最大遗漏提醒模块
   */
  function initMaxMissAlertModule() {
    console.log('🔔 初始化最大遗漏提醒模块...');

    // 绑定刷新按钮
    const refreshBtn = document.getElementById('refreshMaxMissBtn');
    if (refreshBtn) {
      refreshBtn.onclick = function() {
        const thresholdInput = document.getElementById('maxMissThreshold');
        const t = thresholdInput ? parseInt(thresholdInput.value || '0') || 0 : 0;
        window.loadMaxMissAlerts(t);
      };
      console.log('✅ 最大遗漏提醒刷新按钮已绑定');
    } else {
      console.warn('⚠️ 未找到刷新按钮 #refreshMaxMissBtn');
    }

    console.log('✅ 最大遗漏提醒模块初始化完成');
  }

  // 导出初始化函数
  window.initMaxMissAlertModule = initMaxMissAlertModule;
})();

console.log('✅ 最大遗漏提醒模块已加载');
