#!/usr/bin/env python
# -*- coding: utf-8 -*-

with open(r'C:\Users\Administrator\Desktop\six666\frontend\api.js', 'r', encoding='utf-8') as f:
    content = f.read()

new_api = """

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
"""

# 在最后的console.log之前插入
if 'console.log' in content:
    parts = content.rsplit('console.log', 1)
    new_content = parts[0] + new_api + '\n\nconsole.log' + parts[1]
else:
    new_content = content + new_api

with open(r'C:\Users\Administrator\Desktop\six666\frontend\api.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print('API函数已成功添加！')
