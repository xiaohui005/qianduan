/**
 * 数据采集模块
 * 负责澳门/香港彩票数据的采集功能
 *
 * 功能包括：
 * 1. 默认源头采集（澳门/香港）
 * 2. 文龙珠源头采集（澳门/香港）
 * 3. 历史数据采集
 * 4. 采集源头切换
 */

// ==================== 模块状态 ====================

let currentSource = 'default'; // 当前选择的采集源头

// ==================== DOM 元素引用 ====================

let collectResult = null;
let defaultSourceButtons = null;
let wenlongzhuSourceButtons = null;
let historyCollectArea = null;
let toggleHistoryBtn = null;

// ==================== 核心采集函数 ====================

/**
 * 采集数据（澳门）
 * @param {string} source - 数据源 ('default' 或 'wenlongzhu')
 */
async function collectAomen(source = 'default') {
  if (!collectResult) return;

  const sourceText = source === 'wenlongzhu' ? ' (文龙珠)' : '';
  collectResult.innerHTML = `正在采集澳门${sourceText}...`;

  try {
    const endpoint = source === 'wenlongzhu' ? '/collect_wenlongzhu' : '/collect';
    const url = `${window.BACKEND_URL}${endpoint}?type=am`;
    const response = await fetch(url);
    const data = await response.json();

    showCollectSuccess(`澳门采集${sourceText}`, data);
  } catch (error) {
    showCollectError(`采集澳门${sourceText}失败`, error);
  }
}

/**
 * 采集数据（香港）
 * @param {string} source - 数据源 ('default' 或 'wenlongzhu')
 */
async function collectHongkong(source = 'default') {
  if (!collectResult) return;

  const sourceText = source === 'wenlongzhu' ? ' (文龙珠)' : '';
  collectResult.innerHTML = `正在采集香港${sourceText}...`;

  try {
    const endpoint = source === 'wenlongzhu' ? '/collect_wenlongzhu' : '/collect';
    const url = `${window.BACKEND_URL}${endpoint}?type=hk`;
    const response = await fetch(url);
    const data = await response.json();

    showCollectSuccess(`香港采集${sourceText}`, data);
  } catch (error) {
    showCollectError(`采集香港${sourceText}失败`, error);
  }
}

/**
 * 采集历史数据（澳门）
 */
async function collectAomenHistory() {
  if (!collectResult) return;

  const customUrlInput = document.getElementById('customAmUrl');
  const customUrl = customUrlInput ? customUrlInput.value.trim() : '';

  collectResult.innerHTML = '正在采集澳门历史开奖记录...';

  try {
    let url = `${window.BACKEND_URL}/collect_history?type=am`;
    if (customUrl) {
      url += `&url=${encodeURIComponent(customUrl)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    showCollectSuccess('澳门历史采集', data);
  } catch (error) {
    showCollectError('采集澳门历史失败', error);
  }
}

/**
 * 采集历史数据（香港）
 */
async function collectHongkongHistory() {
  if (!collectResult) return;

  const customUrlInput = document.getElementById('customHkUrl');
  const customUrl = customUrlInput ? customUrlInput.value.trim() : '';

  collectResult.innerHTML = '正在采集香港历史开奖记录...';

  try {
    let url = `${window.BACKEND_URL}/collect_history?type=hk`;
    if (customUrl) {
      url += `&url=${encodeURIComponent(customUrl)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    showCollectSuccess('香港历史采集', data);
  } catch (error) {
    showCollectError('采集香港历史失败', error);
  }
}

// ==================== 结果显示函数 ====================

/**
 * 显示采集成功结果
 * @param {string} title - 标题
 * @param {Object} data - 返回的数据
 */
function showCollectSuccess(title, data) {
  if (!collectResult) return;
  collectResult.innerHTML = `<b>${title}：</b>${JSON.stringify(data)}`;
}

/**
 * 显示采集错误结果
 * @param {string} title - 标题
 * @param {Error} error - 错误对象
 */
function showCollectError(title, error) {
  if (!collectResult) return;
  collectResult.innerHTML = `<span style="color:red;">${title}：${error.message || error}</span>`;
}

// ==================== 源头切换功能 ====================

/**
 * 初始化采集源头切换功能
 */
function initSourceSelection() {
  const sourceBtns = document.querySelectorAll('.source-btn');

  if (sourceBtns.length === 0) {
    console.warn('未找到采集源头切换按钮');
    return;
  }

  sourceBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // 移除所有按钮的激活状态
      sourceBtns.forEach(b => b.classList.remove('active'));

      // 添加当前按钮的激活状态
      this.classList.add('active');

      // 获取选择的源头
      const source = this.dataset.source;
      currentSource = source;

      // 切换显示的按钮组
      if (source === 'default') {
        if (defaultSourceButtons) {
          defaultSourceButtons.style.display = 'block';
        }
        if (wenlongzhuSourceButtons) {
          wenlongzhuSourceButtons.style.display = 'none';
        }
      } else if (source === 'wenlongzhu') {
        if (defaultSourceButtons) {
          defaultSourceButtons.style.display = 'none';
        }
        if (wenlongzhuSourceButtons) {
          wenlongzhuSourceButtons.style.display = 'block';
        }
      }

      console.log(`采集源头切换为：${source}`);
    });
  });
}

// ==================== 历史采集区域切换 ====================

/**
 * 切换历史采集区域显示/隐藏
 */
function toggleHistoryCollectArea() {
  if (!historyCollectArea || !toggleHistoryBtn) return;

  if (historyCollectArea.style.display === 'none' || historyCollectArea.classList.contains('hidden')) {
    // 显示历史采集区域
    historyCollectArea.style.display = 'block';
    historyCollectArea.classList.remove('hidden');
    toggleHistoryBtn.innerText = '隐藏历史采集';
  } else {
    // 隐藏历史采集区域
    historyCollectArea.style.display = 'none';
    historyCollectArea.classList.add('hidden');
    toggleHistoryBtn.innerText = '显示历史采集';
  }
}

// ==================== 事件绑定 ====================

/**
 * 绑定采集按钮事件
 */
function bindCollectButtons() {
  // 默认源头 - 澳门采集按钮
  const collectAmBtn = document.getElementById('collectAmBtn');
  if (collectAmBtn) {
    collectAmBtn.addEventListener('click', () => collectAomen('default'));
  }

  // 默认源头 - 香港采集按钮
  const collectHkBtn = document.getElementById('collectHkBtn');
  if (collectHkBtn) {
    collectHkBtn.addEventListener('click', () => collectHongkong('default'));
  }

  // 文龙珠源头 - 澳门采集按钮
  const collectAmWenlongzhuBtn = document.getElementById('collectAmWenlongzhuBtn');
  if (collectAmWenlongzhuBtn) {
    collectAmWenlongzhuBtn.addEventListener('click', () => collectAomen('wenlongzhu'));
  }

  // 文龙珠源头 - 香港采集按钮
  const collectHkWenlongzhuBtn = document.getElementById('collectHkWenlongzhuBtn');
  if (collectHkWenlongzhuBtn) {
    collectHkWenlongzhuBtn.addEventListener('click', () => collectHongkong('wenlongzhu'));
  }

  // 澳门历史采集按钮
  const collectAmHistoryBtn = document.getElementById('collectAmHistoryBtn');
  if (collectAmHistoryBtn) {
    collectAmHistoryBtn.addEventListener('click', collectAomenHistory);
  }

  // 香港历史采集按钮
  const collectHkHistoryBtn = document.getElementById('collectHkHistoryBtn');
  if (collectHkHistoryBtn) {
    collectHkHistoryBtn.addEventListener('click', collectHongkongHistory);
  }

  // 显示/隐藏历史采集按钮
  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener('click', toggleHistoryCollectArea);
  }
}

// ==================== 模块初始化 ====================

/**
 * 初始化数据采集模块
 * 该函数会在页面加载完成后被调用
 */
function initCollectModule() {
  console.log('初始化数据采集模块...');

  // 获取 DOM 元素引用
  collectResult = document.getElementById('collectResult');
  defaultSourceButtons = document.getElementById('defaultSourceButtons');
  wenlongzhuSourceButtons = document.getElementById('wenlongzhuSourceButtons');
  historyCollectArea = document.getElementById('historyCollectArea');
  toggleHistoryBtn = document.getElementById('toggleHistoryBtn');

  // 检查必需的 DOM 元素是否存在
  if (!collectResult) {
    console.warn('未找到 collectResult 元素');
  }

  // 初始化源头切换功能
  initSourceSelection();

  // 绑定采集按钮事件
  bindCollectButtons();

  // 确保默认显示正确的按钮组
  if (defaultSourceButtons) {
    defaultSourceButtons.style.display = 'block';
  }
  if (wenlongzhuSourceButtons) {
    wenlongzhuSourceButtons.style.display = 'none';
  }
  if (historyCollectArea) {
    historyCollectArea.style.display = 'none';
  }

  console.log('数据采集模块初始化完成');
}

// ==================== 导出模块接口 ====================

// 将初始化函数挂载到全局对象，供外部调用
window.initCollectModule = initCollectModule;

// 导出采集函数，供其他模块调用（可选）
window.collectModule = {
  collectAomen,
  collectHongkong,
  collectAomenHistory,
  collectHongkongHistory,
  getCurrentSource: () => currentSource
};
