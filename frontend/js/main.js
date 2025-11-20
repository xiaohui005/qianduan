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
// 注意：源头切换功能已移至 js/modules/collect.js 模块
// 这里保留是为了向后兼容，实际功能由 collect 模块提供

// ==================== 主初始化函数 ====================

/**
 * 应用主初始化
 */
function initApp() {
  console.log('开始初始化应用...');

  // 初始化重启按钮
  initRestartButton();

  // 初始化数据采集模块（如果存在）
  if (typeof window.initCollectModule === 'function') {
    window.initCollectModule();
  }

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
