/**
 * 全局状态管理模块
 * 统一管理应用程序的全局状态
 */

const AppState = {
  // 当前选择的彩种（澳门/香港）
  currentLotteryType: 'am',

  // 分页相关
  currentPage: 1,
  pageSize: 20,

  // 筛选条件
  filters: {},

  // 订阅者列表
  subscribers: [],

  /**
   * 更新状态
   * @param {Object} updates - 要更新的状态对象
   */
  setState(updates) {
    Object.assign(this, updates);
    this.notifySubscribers();
  },

  /**
   * 订阅状态变化
   * @param {Function} callback - 状态变化时的回调函数
   * @returns {Function} 取消订阅的函数
   */
  subscribe(callback) {
    this.subscribers.push(callback);

    // 返回取消订阅的函数
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  },

  /**
   * 通知所有订阅者状态已更新
   */
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      try {
        callback(this);
      } catch (error) {
        console.error('状态订阅回调执行失败:', error);
      }
    });
  },

  /**
   * 获取当前彩种
   * @returns {string} 'am' 或 'hk'
   */
  getLotteryType() {
    return this.currentLotteryType;
  },

  /**
   * 设置当前彩种
   * @param {string} type - 'am' 或 'hk'
   */
  setLotteryType(type) {
    if (type !== 'am' && type !== 'hk') {
      console.warn('无效的彩种类型:', type);
      return;
    }
    this.setState({ currentLotteryType: type });
  },

  /**
   * 获取分页信息
   * @returns {Object} { page, pageSize }
   */
  getPagination() {
    return {
      page: this.currentPage,
      pageSize: this.pageSize
    };
  },

  /**
   * 设置分页信息
   * @param {number} page - 页码
   * @param {number} pageSize - 每页条数
   */
  setPagination(page, pageSize) {
    this.setState({
      currentPage: page,
      pageSize: pageSize || this.pageSize
    });
  },

  /**
   * 重置状态到默认值
   */
  reset() {
    this.currentLotteryType = 'am';
    this.currentPage = 1;
    this.pageSize = 20;
    this.filters = {};
    this.notifySubscribers();
  }
};

// 导出为全局变量（兼容现有代码）
window.AppState = AppState;

console.log('✅ 状态管理模块已加载');
