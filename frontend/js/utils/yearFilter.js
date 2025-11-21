/**
 * 年份筛选通用工具
 */

/**
 * 初始化年份下拉框
 * @param {string} selectId - 下拉框的ID
 * @param {function} onChange - 年份变化时的回调函数
 */
function initYearFilter(selectId, onChange) {
  const select = document.getElementById(selectId);
  if (!select) {
    console.warn(`未找到年份下拉框: ${selectId}`);
    return;
  }

  // 生成年份选项
  const currentYear = new Date().getFullYear();
  select.innerHTML = '<option value="">全部年份</option>';

  for (let year = currentYear; year >= currentYear - 4; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year + '年';
    select.appendChild(option);
  }

  // 绑定change事件
  if (onChange) {
    select.addEventListener('change', function() {
      onChange(this.value || null);
    });
  }

  console.log(`✅ 年份筛选已初始化: ${selectId}`);
}

// 导出到全局
window.initYearFilter = initYearFilter;
