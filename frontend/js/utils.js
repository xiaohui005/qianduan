/**
 * 工具函数模块
 * 提供通用的工具函数
 */

// ==================== 颜色相关 ====================

/**
 * 根据号码返回颜色class
 * @param {string} num - 号码（两位数字）
 * @returns {string} 颜色class名称
 */
function getBallColorClass(num) {
  const red = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
  const blue = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
  const green = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];
  if (red.includes(num)) return 'ball-red';
  if (blue.includes(num)) return 'ball-blue';
  if (green.includes(num)) return 'ball-green';
  return '';
}

/**
 * 获取号码的颜色组
 * @param {string} number - 号码
 * @returns {string} 颜色代码 (red/blue/green)
 */
function getNumberColorGroup(number) {
  const num = String(number).padStart(2, '0');
  const red = ["01","02","07","08","12","13","18","19","23","24","29","30","34","35","40","45","46"];
  const blue = ["03","04","09","10","14","15","20","25","26","31","36","37","41","42","47","48"];
  const green = ["05","06","11","16","17","21","22","27","28","32","33","38","39","43","44","49"];

  if (red.includes(num)) return 'red';
  if (blue.includes(num)) return 'blue';
  if (green.includes(num)) return 'green';
  return '';
}

/**
 * 获取颜色组名称
 * @param {string} color - 颜色代码
 * @returns {string} 颜色中文名
 */
function getColorGroupName(color) {
  const colorNames = {
    'red': '红波',
    'blue': '蓝波',
    'green': '绿波'
  };
  return colorNames[color] || '未知';
}

/**
 * 获取颜色组样式
 * @param {string} color - 颜色代码
 * @returns {string} CSS样式字符串
 */
function getColorGroupStyle(color) {
  const styles = {
    'red': 'background: #e74c3c; color: white;',
    'blue': '背景: #3498db; color: white;',
    'green': 'background: #27ae60; color: white;'
  };
  return styles[color] || '';
}

// ==================== 日期时间相关 ====================

/**
 * 格式化日期时间（波色分析专用）
 * @param {string} dateTime - 日期时间字符串
 * @returns {string} 格式化后的日期时间
 */
function formatColorAnalysisDateTime(dateTime) {
  if (!dateTime) return '';
  return dateTime.substring(0, 16).replace('T', ' ');
}

/**
 * 更新页面当前时间
 */
function updateTime() {
  const now = new Date();
  const timeStr = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const timeEl = document.getElementById('currentTime');
  if (timeEl) {
    timeEl.textContent = timeStr;
  }
}

// ==================== 期号相关 ====================

/**
 * 判断两个期号是否连续
 * @param {string} currentPeriod - 当前期号
 * @param {string} nextPeriod - 下一个期号
 * @returns {boolean} 是否连续
 */
function isConsecutivePeriods(currentPeriod, nextPeriod) {
  if (!currentPeriod || !nextPeriod) return false;

  // 提取年份和期数
  const currentYear = currentPeriod.substring(0, 4);
  const nextYear = nextPeriod.substring(0, 4);
  const currentNum = parseInt(currentPeriod.substring(4));
  const nextNum = parseInt(nextPeriod.substring(4));

  // 同一年且期数连续
  if (currentYear === nextYear) {
    return nextNum === currentNum + 1;
  }

  // 跨年情况：当前期是上一年最后一期，下一期是新年第一期
  if (parseInt(nextYear) === parseInt(currentYear) + 1 && nextNum === 1) {
    return true;
  }

  return false;
}

/**
 * 计算下一期期号
 * @param {string} currentPeriod - 当前期号
 * @returns {string} 下一期期号
 */
function calculateNextPeriod(currentPeriod) {
  if (!currentPeriod) return '';
  
  // 尝试解析 YYYYNNN 格式 (7位)
  if (currentPeriod.length === 7 && !isNaN(currentPeriod)) {
     const year = parseInt(currentPeriod.substring(0, 4));
     const seq = parseInt(currentPeriod.substring(4));
     
     // 判断闰年
     const isLeap = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
     const daysInYear = isLeap ? 366 : 365;
     
     if (seq >= daysInYear) {
       return (year + 1) + '001';
     } else {
       return year + String(seq + 1).padStart(3, '0');
     }
  }
  
  // 默认递增，保持长度
  const len = currentPeriod.length;
  const nextVal = parseInt(currentPeriod) + 1;
  return String(nextVal).padStart(len, '0');
}

// ==================== 数据导出相关 ====================

/**
 * 下载CSV文件
 * @param {Array<Array>} rows - 二维数组数据
 * @param {string} filename - 文件名
 */
function downloadCSV(rows, filename) {
  // 转义CSV字段
  const escapeCSV = (val) => {
    if (val == null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  // 生成CSV内容
  const csvContent = rows.map(row => row.map(escapeCSV).join(',')).join('\n');

  // 添加BOM以支持Excel打开中文
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // 创建下载链接
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==================== 数据处理相关 ====================

/**
 * 生成数字序列
 * @param {number} start - 起始数字
 * @param {number} end - 结束数字
 * @param {boolean} padZero - 是否补零
 * @returns {Array<string>} 数字序列
 */
function generateNumberRange(start, end, padZero = true) {
  const range = [];
  for (let i = start; i <= end; i++) {
    range.push(padZero ? String(i).padStart(2, '0') : String(i));
  }
  return range;
}

/**
 * 计算数组平均值
 * @param {Array<number>} arr - 数字数组
 * @returns {number} 平均值
 */
function calculateAverage(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((a, b) => a + b, 0);
  return sum / arr.length;
}

/**
 * 计算数组总和
 * @param {Array<number>} arr - 数字数组
 * @returns {number} 总和
 */
function calculateSum(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0);
}

// ==================== 页面交互相关 ====================

/**
 * 显示加载提示
 * @param {string} elementId - 元素ID
 * @param {string} message - 提示消息
 */
function showLoading(elementId, message = '加载中...') {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div style="text-align: center; padding: 20px; color: #999;">${message}</div>`;
  }
}

/**
 * 显示错误提示
 * @param {string} elementId - 元素ID
 * @param {string} message - 错误消息
 */
function showError(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div style="text-align: center; padding: 20px; color: #e74c3c;">${message}</div>`;
  }
}

/**
 * 显示成功提示
 * @param {string} elementId - 元素ID
 * @param {string} message - 成功消息
 */
function showSuccess(elementId, message) {
  const element = document.getElementById(elementId);
  if (element) {
    element.innerHTML = `<div style="text-align: center; padding: 20px; color: #27ae60;">${message}</div>`;
  }
}

// ==================== 初始化 ====================

// 启动时间更新（每秒更新一次）
setInterval(updateTime, 1000);
updateTime();

console.log('工具函数模块已加载');
