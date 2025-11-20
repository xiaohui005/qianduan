/**
 * 推荐8码模块
 * 负责推荐8码的生成和展示功能
 */

// ==================== 状态管理 ====================

let currentRecommendType = 'am'; // 当前选择的彩种

// ==================== 核心功能函数 ====================

/**
 * 生成推荐8码
 * @param {string} type - 彩种类型 (am/hk)
 */
async function generateRecommend(type = 'am') {
  const resultDiv = document.getElementById('recommendResult');

  // 显示加载状态
  resultDiv.innerHTML = '<div style="text-align:center;color:#1976d2;padding:20px;">正在生成推荐...</div>';

  try {
    // 调用后端API生成推荐
    const data = await API.generateRecommend(type);

    // 检查是否有推荐结果
    if (!data.recommend || data.recommend.length === 0) {
      resultDiv.innerHTML = '<div style="text-align:center;color:#f44336;padding:20px;">暂无推荐结果，请先采集开奖数据</div>';
      return;
    }

    // 渲染推荐结果
    renderRecommendResult(data, type);

  } catch (error) {
    console.error('生成推荐失败:', error);
    resultDiv.innerHTML = `<div style="text-align:center;color:#f44336;padding:20px;">推荐失败：${error.message}</div>`;
  }
}

/**
 * 渲染推荐结果
 * @param {Object} data - 推荐数据
 * @param {string} type - 彩种类型
 */
function renderRecommendResult(data, type) {
  const resultDiv = document.getElementById('recommendResult');

  // 创建结果容器
  let html = '<div class="recommend-result-container">';

  // 显示推荐基于的期号
  if (data.used_period) {
    html += `
      <div class="recommend-info" style="color:#2196f3;font-size:15px;font-weight:500;margin-bottom:15px;padding:10px;background:#e3f2fd;border-radius:4px;">
        推荐基于期号：${data.used_period}
      </div>
    `;
  }

  // 创建推荐表格
  html += `
    <table class="data-table" style="border-collapse:collapse;width:100%;text-align:center;">
      <thead>
        <tr>
          <th style="width:100px;">位置</th>
          <th>推荐8码</th>
        </tr>
      </thead>
      <tbody>
  `;

  // 遍历7个位置的推荐号码
  data.recommend.forEach((numbers, index) => {
    const position = index + 1;

    html += `
      <tr>
        <td style="font-weight:500;">第${position}位</td>
        <td class="numbers-container" style="padding:10px;">
    `;

    // 渲染每个推荐号码（带号码球）
    numbers.forEach(num => {
      const paddedNum = String(num).padStart(2, '0');
      const colorClass = getBallColorClass(paddedNum);

      html += `
        <span class="number-ball ${colorClass}" style="display:inline-block;padding:4px 12px;border-radius:16px;margin:3px 5px;font-weight:500;">
          ${paddedNum}
        </span>
      `;
    });

    html += `
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  html += '</div>';

  // 更新DOM
  resultDiv.innerHTML = html;
}

// ==================== 事件处理 ====================

/**
 * 处理彩种切换
 * @param {string} type - 彩种类型
 */
function handleTypeChange(type) {
  currentRecommendType = type;

  // 更新按钮状态
  document.querySelectorAll('.recommend-type-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.type === type) {
      btn.classList.add('active');
    }
  });

  // 重新生成推荐
  generateRecommend(type);
}

/**
 * 初始化事件监听器
 */
function initEventListeners() {
  // 彩种切换按钮
  document.querySelectorAll('.recommend-type-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const type = this.dataset.type;
      handleTypeChange(type);
    });
  });
}

// ==================== 模块初始化 ====================

/**
 * 初始化推荐8码模块
 */
function initRecommendModule() {
  console.log('初始化推荐8码模块...');

  try {
    // 初始化事件监听器
    initEventListeners();

    // 自动加载默认彩种的推荐
    generateRecommend(currentRecommendType);

    console.log('✅ 推荐8码模块初始化成功');
  } catch (error) {
    console.error('❌ 推荐8码模块初始化失败:', error);
  }
}

// ==================== 导出 ====================

// 导出模块初始化函数
window.initRecommendModule = initRecommendModule;

// 导出其他公共函数（供其他模块调用）
window.RecommendModule = {
  generateRecommend,
  renderRecommendResult,
  handleTypeChange
};

console.log('✅ 推荐8码模块已加载');
