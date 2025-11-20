/**
 * API 请求模块
 * 封装所有后端 API 请求
 */

// API 基础URL（从 config.js 获取）
const API_BASE = window.BACKEND_URL || 'http://localhost:8000';

// ==================== 数据采集相关 API ====================

/**
 * 采集数据
 * @param {string} type - 彩种类型 (am/hk)
 * @param {string} source - 数据源 (default/wenlongzhu)
 * @returns {Promise<Object>} 采集结果
 */
async function collectData(type, source = 'default') {
  const endpoint = source === 'wenlongzhu' ? '/collect_wenlongzhu' : '/collect';
  const url = `${API_BASE}${endpoint}?type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 采集历史数据
 * @param {string} type - 彩种类型
 * @param {string} customUrl - 自定义URL
 * @returns {Promise<Object>} 采集结果
 */
async function collectHistory(type, customUrl = '') {
  let url = `${API_BASE}/collect_history?type=${type}`;
  if (customUrl) {
    url += `&url=${encodeURIComponent(customUrl)}`;
  }
  const response = await fetch(url);
  return await response.json();
}

// ==================== 开奖记录相关 API ====================

/**
 * 查询开奖记录
 * @param {string} type - 彩种类型
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {Object} filters - 筛选条件
 * @returns {Promise<Object>} 开奖记录
 */
async function getRecords(type, page = 1, pageSize = 20, filters = {}) {
  let url = `${API_BASE}/records?page=${page}&page_size=${pageSize}&lottery_type=${type}`;

  // 添加筛选条件
  if (filters.startTime) url += `&start_time=${filters.startTime}`;
  if (filters.endTime) url += `&end_time=${filters.endTime}`;
  if (filters.year) url += `&year=${filters.year}`;

  const response = await fetch(url);
  return await response.json();
}

// ==================== 推荐相关 API ====================

/**
 * 生成推荐8码
 * @param {string} type - 彩种类型
 * @returns {Promise<Object>} 推荐结果
 */
async function generateRecommend(type = 'am') {
  const url = `${API_BASE}/recommend?lottery_type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 生成推荐16码
 * @param {string} type - 彩种类型
 * @returns {Promise<Object>} 推荐结果
 */
async function generateRecommend16(type = 'am') {
  const url = `${API_BASE}/recommend16?lottery_type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取推荐命中情况
 * @param {string} type - 彩种类型
 * @returns {Promise<Object>} 命中情况
 */
async function getRecommendHit(type = 'am') {
  const url = `${API_BASE}/recommend_hit?lottery_type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 分析相关 API ====================

/**
 * 获取十位分析
 * @param {string} type - 彩种类型
 * @param {number} pos - 位置
 * @param {number} page - 页码
 * @param {string} year - 年份
 * @returns {Promise<Object>} 分析结果
 */
async function getTensAnalysis(type, pos, page = 1, year = '') {
  let url = `${API_BASE}/tens?lottery_type=${type}&position=${pos}&page=${page}`;
  if (year) url += `&year=${year}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取个位分析
 * @param {string} type - 彩种类型
 * @param {number} pos - 位置
 * @param {string} year - 年份
 * @returns {Promise<Object>} 分析结果
 */
async function getUnitsAnalysis(type, pos, year = '') {
  let url = `${API_BASE}/units?lottery_type=${type}&position=${pos}`;
  if (year) url += `&year=${year}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取区间分析
 * @param {string} type - 彩种类型
 * @param {number} pos - 位置
 * @param {number} page - 页码
 * @param {string} year - 年份
 * @returns {Promise<Object>} 分析结果
 */
async function getRangeAnalysis(type, pos, page = 1, year = '') {
  let url = `${API_BASE}/range?lottery_type=${type}&next_position=${pos}&page=${page}`;
  if (year) url += `&year=${year}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取减法区间分析
 * @param {string} type - 彩种类型
 * @param {number} pos - 位置
 * @param {number} page - 页码
 * @param {string} year - 年份
 * @returns {Promise<Object>} 分析结果
 */
async function getMinusRangeAnalysis(type, pos, page = 1, year = '') {
  let url = `${API_BASE}/minus_range?lottery_type=${type}&next_position=${pos}&page=${page}`;
  if (year) url += `&year=${year}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取加减前6码分析
 * @param {string} type - 彩种类型
 * @param {number} pos - 位置
 * @param {number} page - 页码
 * @param {string} year - 年份
 * @returns {Promise<Object>} 分析结果
 */
async function getPlusMinus6Analysis(type, pos, page = 1, year = '') {
  let url = `${API_BASE}/plus_minus_6?lottery_type=${type}&next_position=${pos}&page=${page}`;
  if (year) url += `&year=${year}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取波色分析
 * @param {string} type - 彩种类型
 * @returns {Promise<Object>} 分析结果
 */
async function getColorAnalysis(type = 'am') {
  const url = `${API_BASE}/color_analysis?lottery_type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取前6码三中三
 * @param {string} type - 彩种类型
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 分析结果
 */
async function getFront6Szz(type, page = 1, pageSize = 30) {
  const url = `${API_BASE}/front6_szz?lottery_type=${type}&page=${page}&page_size=${pageSize}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取第7位20区间分析
 * @param {string} type - 彩种类型
 * @param {number} position - 位置
 * @returns {Promise<Object>} 分析结果
 */
async function getTwentyRangeAnalysis(type, position) {
  const url = `${API_BASE}/twenty_range?lottery_type=${type}&position=${position}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取第7个号码区间分析
 * @param {string} type - 彩种类型
 * @returns {Promise<Object>} 分析结果
 */
async function getSeventhRangeAnalysis(type) {
  const url = `${API_BASE}/seventh_range?lottery_type=${type}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取第2位四肖分析
 * @param {string} type - 彩种类型
 * @param {number} position - 位置
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 分析结果
 */
async function getSecondFourxiaoAnalysis(type, position, page = 1, pageSize = 30) {
  const url = `${API_BASE}/second_fourxiao?lottery_type=${type}&position=${position}&page=${page}&page_size=${pageSize}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取第6位三肖分析
 * @param {string} type - 彩种类型
 * @param {number} position - 位置
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @returns {Promise<Object>} 分析结果
 */
async function getSixthThreexiaoAnalysis(type, position, page = 1, pageSize = 30) {
  const url = `${API_BASE}/sixth_threexiao?lottery_type=${type}&position=${position}&page=${page}&page_size=${pageSize}`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 关注点相关 API ====================

/**
 * 获取关注点列表
 * @returns {Promise<Array>} 关注点列表
 */
async function getPlaces() {
  const url = `${API_BASE}/api/places`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 保存关注点
 * @param {Object} data - 关注点数据
 * @returns {Promise<Object>} 保存结果
 */
async function savePlaces(data) {
  const url = `${API_BASE}/api/places`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * 删除关注点
 * @param {number} id - 关注点ID
 * @returns {Promise<Object>} 删除结果
 */
async function deletePlaces(id) {
  const url = `${API_BASE}/api/places/${id}`;
  const response = await fetch(url, { method: 'DELETE' });
  return await response.json();
}

/**
 * 获取关注点登记结果
 * @param {number} placeId - 关注点ID
 * @param {string} startDate - 开始日期
 * @returns {Promise<Object>} 登记结果
 */
async function getPlaceResults(placeId = null, startDate = '') {
  let url = `${API_BASE}/api/place_results`;
  const params = [];
  if (placeId) params.push(`place_id=${placeId}`);
  if (startDate) params.push(`start_date=${startDate}`);
  if (params.length > 0) url += '?' + params.join('&');

  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取关注点分析
 * @param {string} startDate - 开始日期
 * @returns {Promise<Object>} 分析结果
 */
async function getPlaceAnalysis(startDate = '') {
  let url = `${API_BASE}/api/place_analysis`;
  if (startDate) url += `?start_date=${startDate}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取关注号码列表
 * @returns {Promise<Array>} 关注号码列表
 */
async function getFavoriteNumbers() {
  const url = `${API_BASE}/api/favorite_numbers`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 保存关注号码
 * @param {Object} data - 关注号码数据
 * @returns {Promise<Object>} 保存结果
 */
async function saveFavoriteNumber(data) {
  const url = `${API_BASE}/api/favorite_numbers`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * 删除关注号码
 * @param {number} id - 关注号码ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteFavoriteNumber(id) {
  const url = `${API_BASE}/api/favorite_numbers/${id}`;
  const response = await fetch(url, { method: 'DELETE' });
  return await response.json();
}

// ==================== 投注相关 API ====================

/**
 * 获取投注点列表
 * @returns {Promise<Array>} 投注点列表
 */
async function getBettingPlaces() {
  const url = `${API_BASE}/api/betting_places`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 保存投注点
 * @param {Object} data - 投注点数据
 * @returns {Promise<Object>} 保存结果
 */
async function saveBettingPlace(data) {
  const url = `${API_BASE}/api/betting_places`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await response.json();
}

/**
 * 删除投注点
 * @param {number} id - 投注点ID
 * @returns {Promise<Object>} 删除结果
 */
async function deleteBettingPlace(id) {
  const url = `${API_BASE}/api/betting_places/${id}`;
  const response = await fetch(url, { method: 'DELETE' });
  return await response.json();
}

/**
 * 获取投注报表
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Promise<Object>} 报表数据
 */
async function getBettingReport(startDate = '', endDate = '') {
  let url = `${API_BASE}/api/betting_report`;
  const params = [];
  if (startDate) params.push(`start_date=${startDate}`);
  if (endDate) params.push(`end_date=${endDate}`);
  if (params.length > 0) url += '?' + params.join('&');

  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取最大遗漏提醒
 * @returns {Promise<Object>} 提醒数据
 */
async function getMaxMissAlert() {
  const url = `${API_BASE}/api/max_miss_alert`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 系统相关 API ====================

/**
 * 重启后端服务
 * @returns {Promise<Object>} 重启结果
 */
async function restartBackend() {
  const url = `${API_BASE}/restart`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 定时采集调度器 API ====================

/**
 * 获取调度器状态
 * @returns {Promise<Object>} 调度器状态
 */
async function getSchedulerStatus() {
  const url = `${API_BASE}/api/scheduler/status`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 启动调度器
 * @returns {Promise<Object>} 启动结果
 */
async function startScheduler() {
  const url = `${API_BASE}/api/scheduler/start`;
  const response = await fetch(url, { method: 'POST' });
  return await response.json();
}

/**
 * 停止调度器
 * @returns {Promise<Object>} 停止结果
 */
async function stopScheduler() {
  const url = `${API_BASE}/api/scheduler/stop`;
  const response = await fetch(url, { method: 'POST' });
  return await response.json();
}

/**
 * 获取采集日志
 * @param {number} limit - 日志条数限制
 * @returns {Promise<Object>} 日志数据
 */
async function getSchedulerLogs(limit = 50) {
  const url = `${API_BASE}/api/scheduler/logs?limit=${limit}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 清空采集日志
 * @returns {Promise<Object>} 清空结果
 */
async function clearSchedulerLogs() {
  const url = `${API_BASE}/api/scheduler/logs/clear`;
  const response = await fetch(url, { method: 'POST' });
  return await response.json();
}

/**
 * 手动触发采集
 * @param {string} lotteryType - 彩种类型
 * @param {string} source - 数据源
 * @returns {Promise<Object>} 触发结果
 */
async function triggerCollect(lotteryType, source = 'default') {
  const url = `${API_BASE}/api/scheduler/trigger?lottery_type=${lotteryType}&source=${source}`;
  const response = await fetch(url, { method: 'POST' });
  return await response.json();
}

/**
 * 重新加载调度器配置
 * @returns {Promise<Object>} 重载结果
 */
async function reloadScheduler() {
  const url = `${API_BASE}/api/scheduler/reload`;
  const response = await fetch(url, { method: 'POST' });
  return await response.json();
}

/**
 * 获取调度器配置
 * @returns {Promise<Object>} 配置数据
 */
async function getSchedulerConfig() {
  const url = `${API_BASE}/api/scheduler/config`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 保存调度器配置
 * @param {Object} config - 配置对象
 * @returns {Promise<Object>} 保存结果
 */
async function saveSchedulerConfig(config) {
  const url = `${API_BASE}/api/scheduler/config`;
  const params = new URLSearchParams(config);
  const response = await fetch(url + '?' + params.toString(), { method: 'POST' });
  return await response.json();
}

// ==================== 2组观察相关 API ====================

/**
 * 获取2组分析结果
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {string} period - 期号
 * @param {number} historyCount - 历史期数
 * @returns {Promise<Object>} 分析结果
 */
async function fetchTwoGroupsAnalysis(lotteryType, period, historyCount = 100) {
  const url = `${API_BASE}/api/two_groups/analyze?lottery_type=${lotteryType}&period=${period}&history_count=${historyCount}`;
  const response = await fetch(url);
  return await response.json();
}

/**
 * 获取2组验证结果
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {string} period - 期号
 * @param {number} historyCount - 历史期数
 * @param {number} verifyCount - 验证期数
 * @returns {Promise<Object>} 验证结果
 */
async function fetchTwoGroupsVerification(lotteryType, period, historyCount = 100, verifyCount = 30) {
  const url = `${API_BASE}/api/two_groups/verify?lottery_type=${lotteryType}&period=${period}&history_count=${historyCount}&verify_count=${verifyCount}`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 号码间隔期数分析相关 API ====================

/**
 * 获取号码间隔期数分析数据
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} year - 年份筛选（可选）
 * @returns {Promise<Object>} 分析数据
 */
async function getNumberGapAnalysis(lotteryType, page = 1, pageSize = 50, year = null) {
  let url = `${API_BASE}/api/number_gap_analysis?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`;
  if (year) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  return await response.json();
}

/**
 * 导出号码间隔期数分析CSV
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {string} year - 年份筛选（可选）
 * @returns {Promise<Blob>} CSV文件
 */
async function exportNumberGapAnalysisCsv(lotteryType, year = null) {
  let url = `${API_BASE}/api/number_gap_analysis/export?lottery_type=${lotteryType}`;
  if (year) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  return await response.blob();
}

/**
 * 获取号码间隔统计信息
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @returns {Promise<Object>} 统计数据
 */
async function getNumberGapStats(lotteryType) {
  const url = `${API_BASE}/api/number_gap_analysis/stats?lottery_type=${lotteryType}`;
  const response = await fetch(url);
  return await response.json();
}

// ==================== 查询遗漏期数开奖相关 API ====================

/**
 * 获取号码遗漏期数分析
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {string} targetPeriod - 目标期号
 * @param {number} position - 位置筛选（可选，1-7）
 * @returns {Promise<Object>} 分析数据
 */
async function getNumberMissingAnalysis(lotteryType, targetPeriod, position = null) {
  let url = `${API_BASE}/api/number_missing_analysis?lottery_type=${lotteryType}&target_period=${targetPeriod}`;
  if (position) {
    url += `&position=${position}`;
  }
  const response = await fetch(url);
  return await response.json();
}

/**
 * 导出号码遗漏期数分析CSV
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {string} targetPeriod - 目标期号
 * @param {number} position - 位置筛选（可选，1-7）
 * @returns {Promise<Blob>} CSV文件
 */
async function exportNumberMissingAnalysisCsv(lotteryType, targetPeriod, position = null) {
  let url = `${API_BASE}/api/number_missing_analysis/export?lottery_type=${lotteryType}&target_period=${targetPeriod}`;
  if (position) {
    url += `&position=${position}`;
  }
  const response = await fetch(url);
  return await response.blob();
}

// ==================== 去10最热20分析相关 API ====================

/**
 * 去10的最热20分析
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {number} pos - 位置 (1-7)
 * @param {number} page - 页码
 * @param {number} pageSize - 每页数量
 * @param {string} year - 年份过滤
 * @returns {Promise<Object>} 分析结果
 */
async function getHot20Minus10(lotteryType, pos, page = 1, pageSize = 20, year = '') {
  let url = `${API_BASE}/api/hot20_minus10?lottery_type=${lotteryType}&pos=${pos}&page=${page}&page_size=${pageSize}`;
  if (year) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  return await response.json();
}

/**
 * 导出去10最热20分析CSV
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @param {number} pos - 位置 (1-7)
 * @param {string} year - 年份过滤
 * @returns {Promise<Blob>} CSV文件
 */
async function exportHot20Minus10(lotteryType, pos, year = '') {
  let url = `${API_BASE}/api/hot20_minus10/export_all?lottery_type=${lotteryType}&pos=${pos}`;
  if (year) {
    url += `&year=${year}`;
  }
  const response = await fetch(url);
  return await response.blob();
}


console.log('API 请求模块已加载');
