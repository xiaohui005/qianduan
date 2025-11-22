/**
 * 投注点报表模块 (Bet Report Module)
 * 功能：投注点报表生成、统计分析、数据导出
 *
 * API端点:
 * - GET /api/bet_report - 生成投注点报表
 *
 * 主要功能：
 * - 总体统计（投注次数、金额、输赢等）
 * - 关注点统计（各关注点的投注情况）
 * - 时间统计（按月份统计）
 * - 输赢分布统计
 * - CSV导出
 * - 关注点筛选和排序
 *
 * @module bet-report
 */

(function() {
  // ==================== 模块状态 ====================
  let allPlaces = [];
  let selectedPlaceId = null;
  let currentReportData = null;

  // ==================== 初始化函数 ====================
  /**
   * 初始化投注点报表模块
   */
  function initBetReport() {
    console.log('🎯 Initializing Bet Report module...');
    loadAllPlaces();
    bindBetReportEvents();
    setupBetReportPlaceAutocomplete();
    console.log('✅ Bet Report module initialized');
  }

  // 导出投注点报表初始化函数
  window.initBetReport = initBetReport;

  // ==================== 数据加载函数 ====================
  /**
   * 加载所有关注点
   */
  async function loadAllPlaces() {
    try {
      const res = await fetch(window.BACKEND_URL + '/api/places');
      allPlaces = await res.json();
    } catch (error) {
      console.error('加载关注点失败:', error);
    }
  }

  // ==================== 事件绑定 ====================
  /**
   * 绑定投注点报表事件
   */
  function bindBetReportEvents() {
    // 生成报表按钮
    const queryBetReportBtn = document.getElementById('queryBetReportBtn');
    if (queryBetReportBtn) {
      queryBetReportBtn.onclick = generateBetReport;
    }

    // 重置按钮
    const resetBetReportBtn = document.getElementById('resetBetReportBtn');
    if (resetBetReportBtn) {
      resetBetReportBtn.onclick = resetBetReport;
    }

    // 导出报表按钮
    const exportBetReportBtn = document.getElementById('exportBetReportBtn');
    if (exportBetReportBtn) {
      exportBetReportBtn.onclick = exportBetReport;
    }

    // 调试数据按钮
    const debugBetsBtn = document.getElementById('debugBetsBtn');
    if (debugBetsBtn) {
      debugBetsBtn.onclick = debugBets;
    }

    // 关注点筛选按钮
    const placeFilterBtn = document.getElementById('placeFilterBtn');
    if (placeFilterBtn) {
      placeFilterBtn.onclick = filterPlaceStats;
    }

    // 关注点重置筛选按钮
    const placeResetFilterBtn = document.getElementById('placeResetFilterBtn');
    if (placeResetFilterBtn) {
      placeResetFilterBtn.onclick = resetPlaceFilter;
    }

    // 关注点排序选择
    const placeSortSelect = document.getElementById('placeSortSelect');
    if (placeSortSelect) {
      placeSortSelect.onchange = filterPlaceStats;
    }
  }

  // ==================== 自动完成功能 ====================
  /**
   * 设置关注点自动完成
   */
  function setupBetReportPlaceAutocomplete() {
    const placeInput = document.getElementById('betReportPlace');
    const suggestDiv = document.getElementById('betReportPlaceSuggest');

    if (!placeInput || !suggestDiv) return;

    let selectedIndex = -1;
    let filteredPlaces = [];

    placeInput.addEventListener('input', function() {
      const value = this.value.trim();
      if (value === '') {
        suggestDiv.innerHTML = '';
        suggestDiv.style.display = 'none';
        selectedPlaceId = null;
        return;
      }

      filteredPlaces = allPlaces.filter(place =>
        place.name.toLowerCase().includes(value.toLowerCase())
      );

      if (filteredPlaces.length === 0) {
        suggestDiv.innerHTML = '';
        suggestDiv.style.display = 'none';
        return;
      }

      suggestDiv.innerHTML = filteredPlaces.map((place, index) =>
        `<div class="autocomplete-suggestion-item" data-index="${index}" data-id="${place.id}">${place.name}</div>`
      ).join('');
      suggestDiv.style.display = 'block';
      selectedIndex = -1;
    });

    placeInput.addEventListener('keydown', function(e) {
      const items = suggestDiv.querySelectorAll('.autocomplete-suggestion-item');

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        updateSelection(items, selectedIndex);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedIndex >= 0 && items[selectedIndex]) {
          selectPlace(items[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        suggestDiv.style.display = 'none';
        selectedIndex = -1;
      }
    });

    suggestDiv.addEventListener('click', function(e) {
      if (e.target.classList.contains('autocomplete-suggestion-item')) {
        selectPlace(e.target);
      }
    });

    document.addEventListener('click', function(e) {
      if (!placeInput.contains(e.target) && !suggestDiv.contains(e.target)) {
        suggestDiv.style.display = 'none';
        selectedIndex = -1;
      }
    });

    function updateSelection(items, index) {
      items.forEach((item, i) => {
        item.classList.toggle('selected', i === index);
      });
    }

    function selectPlace(item) {
      const placeId = parseInt(item.dataset.id);
      const placeName = item.textContent;

      placeInput.value = placeName;
      selectedPlaceId = placeId;
      suggestDiv.style.display = 'none';
      selectedIndex = -1;
    }
  }

  // ==================== 报表生成函数 ====================
  /**
   * 生成投注点报表
   */
  async function generateBetReport() {
    const startDate = document.getElementById('betReportStartDate').value;
    const endDate = document.getElementById('betReportEndDate').value;
    const placeName = document.getElementById('betReportPlace').value.trim();

    // 构建查询参数
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    if (selectedPlaceId) params.append('place_id', selectedPlaceId);

    try {
      const res = await fetch(`${window.BACKEND_URL}/api/bet_report?${params.toString()}`);
      const result = await res.json();

      console.log('投注点报表API响应:', result);

      if (result.success) {
        currentReportData = result.data;
        console.log('投注点报表数据:', result.data);
        console.log('总体统计:', result.data.overall_stats);
        renderBetReport(result.data);
      } else {
        alert('生成报表失败: ' + result.message);
      }
    } catch (error) {
      console.error('生成报表失败:', error);
      alert('生成报表失败，请检查网络连接');
    }
  }

  /**
   * 渲染投注点报表
   */
  function renderBetReport(data) {
    // 渲染总体统计
    renderOverallStats(data.overall_stats);

    // 渲染关注点统计
    renderPlaceStats(data.place_stats);

    // 渲染时间统计
    renderTimeStats(data.time_stats);

    // 渲染输赢分布
    renderDistributionStats(data.profit_loss_distribution);

    // 显示所有统计区域
    document.getElementById('betReportOverallStats').style.display = 'block';
    document.getElementById('betReportPlaceStats').style.display = 'block';
    document.getElementById('betReportTimeStats').style.display = 'block';
    document.getElementById('betReportDistribution').style.display = 'block';
    document.getElementById('betReportCharts').style.display = 'block';
  }

  /**
   * 渲染总体统计
   */
  function renderOverallStats(stats) {
    console.log('渲染总体统计，数据:', stats);

    if (!stats) {
      console.log('stats为空，返回');
      return;
    }

    document.getElementById('reportTotalBetCount').textContent = stats.total_bets || 0;
    document.getElementById('reportTotalBetAmount').textContent = formatCurrency(stats.total_bet_amount || 0);
    document.getElementById('reportTotalWinAmount').textContent = formatCurrency(stats.total_win_amount || 0);
    document.getElementById('reportTotalProfitLoss').textContent = formatCurrency(stats.total_profit_loss || 0);
    document.getElementById('reportAvgBetAmount').textContent = formatCurrency(stats.avg_bet_amount || 0);
    document.getElementById('reportAvgWinAmount').textContent = formatCurrency(stats.avg_win_amount || 0);
    document.getElementById('reportAvgProfitLoss').textContent = formatCurrency(stats.avg_profit_loss || 0);
    document.getElementById('reportCorrectCount').textContent = stats.correct_count || 0;
    document.getElementById('reportWrongCount').textContent = stats.wrong_count || 0;
    document.getElementById('reportUnjudgedCount').textContent = stats.unjudged_count || 0;

    // 设置输赢金额的颜色
    const totalProfitLossEl = document.getElementById('reportTotalProfitLoss');
    const avgProfitLossEl = document.getElementById('reportAvgProfitLoss');

    totalProfitLossEl.className = 'stats-value ' + getProfitLossClass(stats.total_profit_loss);
    avgProfitLossEl.className = 'stats-value ' + getProfitLossClass(stats.avg_profit_loss);
  }

  /**
   * 渲染关注点统计
   */
  function renderPlaceStats(placeStats) {
    const tbody = document.querySelector('#betReportPlaceTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!placeStats || placeStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="14" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    placeStats.forEach(place => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${place.place_name || '未知'}</td>
        <td>${place.bet_count || 0}</td>
        <td>${formatCurrency(place.total_bet_amount || 0)}</td>
        <td>${formatCurrency(place.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(place.total_profit_loss)}">${formatCurrency(place.total_profit_loss || 0)}</td>
        <td>${formatCurrency(place.avg_bet_amount || 0)}</td>
        <td>${formatCurrency(place.avg_win_amount || 0)}</td>
        <td class="${getProfitLossClass(place.avg_profit_loss)}">${formatCurrency(place.avg_profit_loss || 0)}</td>
        <td>${place.correct_count || 0}</td>
        <td>${place.wrong_count || 0}</td>
        <td>${place.unjudged_count || 0}</td>
        <td>${formatDateTime(place.first_bet)}</td>
        <td>${formatDateTime(place.last_bet)}</td>
        <td>
          <button class="place-action-btn view" onclick="viewPlaceDetail(${place.place_id}, '${place.place_name}')">查看</button>
          <button class="place-action-btn detail" onclick="queryPlaceBets(${place.place_id}, '${place.place_name}')">详情</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * 渲染时间统计
   */
  function renderTimeStats(timeStats) {
    const tbody = document.querySelector('#betReportTimeTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!timeStats || timeStats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    timeStats.forEach(month => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${month.month}</td>
        <td>${month.bet_count || 0}</td>
        <td>${formatCurrency(month.total_bet_amount || 0)}</td>
        <td>${formatCurrency(month.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(month.total_profit_loss)}">${formatCurrency(month.total_profit_loss || 0)}</td>
        <td>${formatCurrency(month.avg_bet_amount || 0)}</td>
        <td>${formatCurrency(month.avg_win_amount || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  /**
   * 渲染输赢分布统计
   */
  function renderDistributionStats(distribution) {
    const tbody = document.querySelector('#betReportDistributionTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!distribution || distribution.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">暂无数据</td></tr>';
      return;
    }

    distribution.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.profit_loss_range}</td>
        <td>${item.count || 0}</td>
        <td>${formatCurrency(item.total_bet_amount || 0)}</td>
        <td>${formatCurrency(item.total_win_amount || 0)}</td>
        <td class="${getProfitLossClass(item.total_profit_loss)}">${formatCurrency(item.total_profit_loss || 0)}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==================== 重置和筛选 ====================
  /**
   * 重置投注点报表
   */
  function resetBetReport() {
    document.getElementById('betReportStartDate').value = '';
    document.getElementById('betReportEndDate').value = '';
    document.getElementById('betReportPlace').value = '';
    selectedPlaceId = null;

    // 隐藏所有统计区域
    document.getElementById('betReportOverallStats').style.display = 'none';
    document.getElementById('betReportPlaceStats').style.display = 'none';
    document.getElementById('betReportTimeStats').style.display = 'none';
    document.getElementById('betReportDistribution').style.display = 'none';
    document.getElementById('betReportCharts').style.display = 'none';

    currentReportData = null;
  }

  /**
   * 关注点筛选功能
   */
  function filterPlaceStats() {
    if (!currentReportData || !currentReportData.place_stats) return;

    const filterInput = document.getElementById('placeFilterInput').value.toLowerCase();
    const sortSelect = document.getElementById('placeSortSelect').value;

    let filteredData = [...currentReportData.place_stats];

    // 按名称筛选
    if (filterInput) {
      filteredData = filteredData.filter(place =>
        place.place_name && place.place_name.toLowerCase().includes(filterInput)
      );
    }

    // 排序
    filteredData.sort((a, b) => {
      let aValue = a[sortSelect] || 0;
      let bValue = b[sortSelect] || 0;

      // 如果是字符串，按字母顺序排序
      if (typeof aValue === 'string') {
        return aValue.localeCompare(bValue);
      }

      // 如果是数字，按数值排序（降序）
      return bValue - aValue;
    });

    renderPlaceStats(filteredData);
  }

  /**
   * 重置关注点筛选
   */
  function resetPlaceFilter() {
    document.getElementById('placeFilterInput').value = '';
    document.getElementById('placeSortSelect').value = 'total_bet_amount';

    if (currentReportData && currentReportData.place_stats) {
      renderPlaceStats(currentReportData.place_stats);
    }
  }

  // ==================== 导出和跳转 ====================
  /**
   * 查看关注点详情
   */
  window.viewPlaceDetail = function(placeId, placeName) {
    // 跳转到关注点分析页面
    const analysisBtn = document.getElementById('menuRegisterFocusAnalysisBtn');
    if (analysisBtn) {
      analysisBtn.click();

      // 延迟一下，确保页面切换完成
      setTimeout(() => {
        // 查找并点击对应的关注点按钮
        const placeButton = document.querySelector(`.place-button[data-place-id="${placeId}"]`);
        if (placeButton) {
          placeButton.click();
        }
      }, 100);
    }
  };

  /**
   * 查询关注点投注详情
   */
  window.queryPlaceBets = function(placeId, placeName) {
    // 跳转到投注登记点页面
    const betBtn = document.getElementById('menuRegisterBetBtn');
    if (betBtn) {
      betBtn.click();

      // 延迟一下，确保页面切换完成
      setTimeout(() => {
        // 设置查询条件
        const queryPlaceInput = document.getElementById('queryPlace');
        if (queryPlaceInput) {
          queryPlaceInput.value = placeName;

          // 触发查询
          const queryBtn = document.getElementById('queryBetsBtn');
          if (queryBtn) {
            queryBtn.click();
          }
        }
      }, 100);
    }
  };

  /**
   * 导出投注点报表
   */
  function exportBetReport() {
    if (!currentReportData) {
      alert('请先生成报表');
      return;
    }

    const data = currentReportData;
    let csvContent = '投注点报表\n\n';

    // 总体统计
    csvContent += '总体统计\n';
    csvContent += '总投注次数,总投注金额,总赢取金额,总输赢金额,平均投注金额,平均赢取金额,平均输赢金额,正确次数,错误次数,未判断次数\n';
    csvContent += `${data.overall_stats.total_bets || 0},${data.overall_stats.total_bet_amount || 0},${data.overall_stats.total_win_amount || 0},${data.overall_stats.total_profit_loss || 0},${data.overall_stats.avg_bet_amount || 0},${data.overall_stats.avg_win_amount || 0},${data.overall_stats.avg_profit_loss || 0},${data.overall_stats.correct_count || 0},${data.overall_stats.wrong_count || 0},${data.overall_stats.unjudged_count || 0}\n\n`;

    // 关注点统计
    csvContent += '关注点统计\n';
    csvContent += '关注点名称,投注次数,投注总额,赢取总额,输赢总额,平均投注,平均赢取,平均输赢,正确次数,错误次数,未判断次数,首次投注,最后投注\n';
    if (data.place_stats && data.place_stats.length > 0) {
      data.place_stats.forEach(place => {
        csvContent += `${place.place_name || '未知'},${place.bet_count || 0},${place.total_bet_amount || 0},${place.total_win_amount || 0},${place.total_profit_loss || 0},${place.avg_bet_amount || 0},${place.avg_win_amount || 0},${place.avg_profit_loss || 0},${place.correct_count || 0},${place.wrong_count || 0},${place.unjudged_count || 0},${place.first_bet || ''},${place.last_bet || ''}\n`;
      });
    }
    csvContent += '\n';

    // 时间统计
    csvContent += '月度统计\n';
    csvContent += '月份,投注次数,投注总额,赢取总额,输赢总额,平均投注,平均赢取,平均输赢\n';
    if (data.time_stats && data.time_stats.length > 0) {
      data.time_stats.forEach(month => {
        csvContent += `${month.month},${month.bet_count || 0},${month.total_bet_amount || 0},${month.total_win_amount || 0},${month.total_profit_loss || 0},${month.avg_bet_amount || 0},${month.avg_win_amount || 0},${month.avg_profit_loss || 0}\n`;
      });
    }
    csvContent += '\n';

    // 输赢分布
    csvContent += '输赢分布\n';
    csvContent += '输赢范围,次数,投注总额,赢取总额,输赢总额\n';
    if (data.profit_loss_distribution && data.profit_loss_distribution.length > 0) {
      data.profit_loss_distribution.forEach(item => {
        csvContent += `${item.profit_loss_range},${item.count || 0},${item.total_bet_amount || 0},${item.total_win_amount || 0},${item.total_profit_loss || 0}\n`;
      });
    }

    // 下载CSV文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `投注点报表_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ==================== 调试函数 ====================
  /**
   * 调试bets表数据
   */
  async function debugBets() {
    try {
      const res = await fetch(`${window.BACKEND_URL}/api/debug/bets`);
      const result = await res.json();

      if (result.success) {
        let debugInfo = `调试信息：\n\n`;
        debugInfo += `bets表总记录数: ${result.total_count}\n\n`;
        debugInfo += `表结构:\n`;
        result.table_structure.forEach(field => {
          debugInfo += `${field.Field} - ${field.Type} - ${field.Null} - ${field.Key} - ${field.Default} - ${field.Extra}\n`;
        });
        debugInfo += `\n最近5条记录:\n`;
        result.recent_bets.forEach((bet, index) => {
          debugInfo += `${index + 1}. ID:${bet.id}, 关注点ID:${bet.place_id}, 期数:${bet.qishu}, 投注金额:${bet.bet_amount}, 赢取金额:${bet.win_amount}, 是否正确:${bet.is_correct}, 创建时间:${bet.created_at}\n`;
        });

        alert(debugInfo);
      } else {
        alert('调试失败: ' + result.message);
      }
    } catch (error) {
      console.error('调试失败:', error);
      alert('调试失败，请检查网络连接');
    }
  }

  // ==================== 工具函数 ====================
  /**
   * 格式化货币
   */
  function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
  }

  /**
   * 格式化日期时间
   */
  function formatDateTime(dateTime) {
    if (!dateTime) return '';
    return dateTime.replace('T', ' ').slice(0, 19);
  }

  /**
   * 获取输赢金额的CSS类
   */
  function getProfitLossClass(amount) {
    if (amount === null || amount === undefined) return '';
    if (amount > 0) return 'profit-positive';
    if (amount < 0) return 'profit-negative';
    return 'profit-zero';
  }
})();
