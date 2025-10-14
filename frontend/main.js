/**
 * 主入口文件
 * 负责全局初始化和事件绑定
 */

// ==================== 全局初始化 ====================

console.log('彩票分析系统前端初始化中...');
console.log('后端地址:', window.BACKEND_URL);

// ==================== 重启后端功能 ====================

/**
 * 绑定重启后端按钮
 */
function initRestartButton() {
  const restartBtn = document.getElementById('restartBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', async function() {
      if (!confirm('确定要重启后端服务吗？')) {
        return;
      }

      try {
        await restartBackend();
        alert('后端重启命令已发送，请稍后刷新页面');

        // 3秒后自动刷新页面
        setTimeout(() => {
          location.reload();
        }, 3000);
      } catch (error) {
        console.error('重启后端失败:', error);
        alert('重启后端失败: ' + error.message);
      }
    });
  }
}

// ==================== 源头切换功能 ====================

/**
 * 初始化采集源头切换
 */
function initSourceSelection() {
  const sourceBtns = document.querySelectorAll('.source-btn');
  const defaultSourceButtons = document.getElementById('defaultSourceButtons');
  const wenlongzhuSourceButtons = document.getElementById('wenlongzhuSourceButtons');

  if (sourceBtns.length === 0) return;

  sourceBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // 移除所有按钮的激活状态
      sourceBtns.forEach(b => b.classList.remove('active'));

      // 添加当前按钮的激活状态
      this.classList.add('active');

      // 切换按钮组显示
      const source = this.dataset.source;
      if (source === 'default') {
        if (defaultSourceButtons) defaultSourceButtons.style.display = 'block';
        if (wenlongzhuSourceButtons) wenlongzhuSourceButtons.style.display = 'none';
      } else if (source === 'wenlongzhu') {
        if (defaultSourceButtons) defaultSourceButtons.style.display = 'none';
        if (wenlongzhuSourceButtons) wenlongzhuSourceButtons.style.display = 'block';
      }
    });
  });
}

// ==================== 主初始化函数 ====================

/**
 * 应用主初始化
 */
function initApp() {
  console.log('开始初始化应用...');

  // 初始化重启按钮
  initRestartButton();

  // 初始化源头切换
  initSourceSelection();

  console.log('应用初始化完成');
}

// ==================== 启动应用 ====================

// 确保 DOM 加载完成后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

console.log('主入口模块已加载');
