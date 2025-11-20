/**
 * 统一错误处理模块
 * 提供全局错误捕获和用户友好的错误提示
 */

const ErrorHandler = {
  /**
   * 显示错误消息
   * @param {string} message - 错误消息
   * @param {Error} error - 原始错误对象（可选）
   */
  showError(message, error = null) {
    console.error('错误:', message, error);

    // 使用原有的alert或者可以改进为更好的UI提示
    alert(`❌ ${message}`);

    // 如果有原始错误对象，打印详细信息
    if (error) {
      console.error('详细错误信息:', error);
    }
  },

  /**
   * 显示成功消息
   * @param {string} message - 成功消息
   */
  showSuccess(message) {
    console.log('成功:', message);
    alert(`✅ ${message}`);
  },

  /**
   * 显示警告消息
   * @param {string} message - 警告消息
   */
  showWarning(message) {
    console.warn('警告:', message);
    alert(`⚠️ ${message}`);
  },

  /**
   * 显示加载中状态
   * @param {string} message - 加载消息
   */
  showLoading(message = '加载中...') {
    console.log('加载:', message);
    // TODO: 可以实现一个更好的加载UI
    return { message };
  },

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    // TODO: 实现加载UI的隐藏
  },

  /**
   * 包装异步函数，自动捕获错误
   * @param {Function} fn - 要包装的异步函数
   * @param {string} errorMessage - 自定义错误消息
   * @returns {Function} 包装后的函数
   */
  wrapAsync(fn, errorMessage = '操作失败') {
    return async function (...args) {
      try {
        return await fn.apply(this, args);
      } catch (error) {
        ErrorHandler.showError(errorMessage, error);
        throw error; // 重新抛出错误，让调用者可以进一步处理
      }
    };
  },

  /**
   * API调用错误处理
   * @param {Error} error - API错误对象
   * @param {string} customMessage - 自定义错误消息
   */
  handleApiError(error, customMessage = 'API请求失败') {
    let message = customMessage;

    if (error.response) {
      // 服务器返回了错误响应
      message += `: ${error.response.status} - ${error.response.statusText}`;
      if (error.response.data && error.response.data.detail) {
        message += `\n详情: ${error.response.data.detail}`;
      }
    } else if (error.request) {
      // 请求已发送但没有收到响应
      message += ': 服务器无响应，请检查网络连接';
    } else {
      // 其他错误
      message += `: ${error.message}`;
    }

    this.showError(message, error);
  },

  /**
   * 网络错误处理
   * @param {Error} error - 网络错误对象
   */
  handleNetworkError(error) {
    if (!navigator.onLine) {
      this.showError('网络连接已断开，请检查网络设置');
    } else {
      this.handleApiError(error, '网络请求失败');
    }
  },

  /**
   * 验证错误处理
   * @param {Object} errors - 验证错误对象
   */
  handleValidationErrors(errors) {
    const messages = Object.entries(errors)
      .map(([field, message]) => `${field}: ${message}`)
      .join('\n');

    this.showError(`数据验证失败:\n${messages}`);
  },

  /**
   * 全局错误捕获
   */
  setupGlobalErrorHandler() {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的Promise拒绝:', event.reason);
      this.showError('发生了一个未处理的错误', event.reason);
      event.preventDefault();
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      console.error('全局错误:', event.error);
      this.showError('页面发生错误', event.error);
      event.preventDefault();
    });

    console.log('✅ 全局错误处理已启用');
  }
};

// 初始化全局错误处理
ErrorHandler.setupGlobalErrorHandler();

// 导出为全局变量
window.ErrorHandler = ErrorHandler;

console.log('✅ 错误处理模块已加载');
