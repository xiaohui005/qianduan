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
    this.saveToLocalStorage();
  },

  /**
   * 保存状态到localStorage
   * @param {string} key - 存储键名
   */
  saveToLocalStorage(key = 'appState') {
    try {
      const stateToSave = {
        currentLotteryType: this.currentLotteryType,
        currentPage: this.currentPage,
        pageSize: this.pageSize,
        filters: this.filters
      };
      localStorage.setItem(key, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('保存状态到localStorage失败:', error);
    }
  },

  /**
   * 从localStorage恢复状态
   * @param {string} key - 存储键名
   */
  loadFromLocalStorage(key = 'appState') {
    try {
      const savedState = localStorage.getItem(key);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        Object.assign(this, parsed);
        this.notifySubscribers();
        console.log('✅ 从localStorage恢复状态');
      }
    } catch (error) {
      console.warn('从localStorage恢复状态失败:', error);
    }
  },

  /**
   * 清除localStorage中的状态
   * @param {string} key - 存储键名
   */
  clearLocalStorage(key = 'appState') {
    try {
      localStorage.removeItem(key);
      console.log('✅ 已清除localStorage中的状态');
    } catch (error) {
      console.warn('清除localStorage失败:', error);
    }
  }
};

// 增强版：模块化状态管理器
class StateManager {
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.state = {};
    this.subscribers = new Map();
  }

  /**
   * 获取状态
   * @param {string} key - 状态键
   * @returns {any} 状态值
   */
  get(key) {
    return this.state[key];
  }

  /**
   * 设置状态
   * @param {string|Object} keyOrObject - 状态键或状态对象
   * @param {any} value - 状态值（当第一个参数为键时使用）
   */
  set(keyOrObject, value) {
    if (typeof keyOrObject === 'object') {
      Object.assign(this.state, keyOrObject);
    } else {
      this.state[keyOrObject] = value;
    }
    this.notify(keyOrObject);
    this.persist();
  }

  /**
   * 订阅状态变化
   * @param {string|Function} keyOrCallback - 状态键或回调函数
   * @param {Function} callback - 回调函数（当第一个参数为键时使用）
   * @returns {Function} 取消订阅的函数
   */
  subscribe(keyOrCallback, callback) {
    let key, cb;

    if (typeof keyOrCallback === 'function') {
      // 订阅所有状态变化
      key = '*';
      cb = keyOrCallback;
    } else {
      // 订阅特定键的变化
      key = keyOrCallback;
      cb = callback;
    }

    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, []);
    }
    this.subscribers.get(key).push(cb);

    // 返回取消订阅函数
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        const index = subs.indexOf(cb);
        if (index > -1) {
          subs.splice(index, 1);
        }
      }
    };
  }

  /**
   * 通知订阅者
   * @param {string|Object} keyOrObject - 变化的键或对象
   */
  notify(keyOrObject) {
    const keys = typeof keyOrObject === 'object' ? Object.keys(keyOrObject) : [keyOrObject];

    keys.forEach(key => {
      // 通知特定键的订阅者
      const keySubs = this.subscribers.get(key);
      if (keySubs) {
        keySubs.forEach(cb => {
          try {
            cb(this.state[key], key);
          } catch (error) {
            console.error(`状态订阅回调执行失败 [${this.namespace}.${key}]:`, error);
          }
        });
      }
    });

    // 通知全局订阅者
    const globalSubs = this.subscribers.get('*');
    if (globalSubs) {
      globalSubs.forEach(cb => {
        try {
          cb(this.state);
        } catch (error) {
          console.error(`全局状态订阅回调执行失败 [${this.namespace}]:`, error);
        }
      });
    }
  }

  /**
   * 持久化状态到localStorage
   */
  persist() {
    try {
      const key = `state_${this.namespace}`;
      localStorage.setItem(key, JSON.stringify(this.state));
    } catch (error) {
      console.warn(`持久化状态失败 [${this.namespace}]:`, error);
    }
  }

  /**
   * 从localStorage恢复状态
   */
  restore() {
    try {
      const key = `state_${this.namespace}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        this.state = JSON.parse(saved);
        this.notify('*');
        console.log(`✅ 恢复状态 [${this.namespace}]`);
      }
    } catch (error) {
      console.warn(`恢复状态失败 [${this.namespace}]:`, error);
    }
  }

  /**
   * 清除状态
   */
  clear() {
    this.state = {};
    this.notify('*');
    this.persist();
  }

  /**
   * 重置状态到初始值
   * @param {Object} initialState - 初始状态对象
   */
  reset(initialState = {}) {
    this.state = { ...initialState };
    this.notify('*');
    this.persist();
  }
}

// 创建全局状态管理器实例
const createStateManager = (namespace) => new StateManager(namespace);

// 导出为全局变量（兼容现有代码）
window.AppState = AppState;
window.StateManager = StateManager;
window.createStateManager = createStateManager;

console.log('✅ 状态管理模块已加载');
