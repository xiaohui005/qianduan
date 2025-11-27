// ==================== 查询遗漏期数开奖功能 ====================

console.log('查询遗漏期数开奖模块已加载');

// 标记脚本已加载
window.numberMissingAnalysisLoaded = true;

// 全局变量（使用 miss 前缀避免命名冲突）
let missCurrentLotteryType = 'am';
let missTargetPeriod = '';  // 目标期号
let missCurrentPosition = null;  // 位置筛选（null表示全部位置）
let missSortBy = 'missing_desc';  // 排序方式：missing_desc/missing_asc/number_asc
let missCurrentData = [];  // 当前查询的数据
let missQueryType = 'number';  // 查询类型：number=号码, animal=生肖

// 初始化查询遗漏期数开奖页面
function initNumberMissingAnalysisPage() {
  console.log('初始化查询遗漏期数开奖页面...');

  // 绑定彩种切换按钮事件
  const typeBtns = document.querySelectorAll('#numberMissingAnalysisPage .miss-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      missCurrentLotteryType = this.dataset.type;
      // 切换彩种后，如果已有查询结果，重新查询
      if (missTargetPeriod) {
        loadNumberMissingData();
      }
    });
  });

  // 绑定查询类型切换按钮事件
  const queryTypeBtns = document.querySelectorAll('.miss-query-type-btn');
  queryTypeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      queryTypeBtns.forEach(b => {
        b.classList.remove('active');
        b.style.background = '#f8f9fa';
        b.style.color = '#333';
        b.style.borderColor = '#ddd';
      });
      this.classList.add('active');
      this.style.background = '#3498db';
      this.style.color = 'white';
      this.style.borderColor = '#3498db';

      missQueryType = this.dataset.type;

      // 更新排序选项（生肖模式下改为"生肖升序"）
      const numberSortOption = document.getElementById('numberSortOption');
      if (numberSortOption) {
        numberSortOption.textContent = missQueryType === 'animal' ? '生肖升序' : '号码升序';
      }

      // 切换查询类型后，如果已有查询结果，重新查询
      if (missTargetPeriod) {
        loadNumberMissingData();
      }
    });
  });

  // 绑定位置筛选下拉框事件
  const positionSelect = document.getElementById('missPositionSelect');
  if (positionSelect) {
    positionSelect.addEventListener('change', function() {
      const value = this.value;
      missCurrentPosition = value ? parseInt(value) : null;
      // 如果已有查询结果，重新查询
      if (missTargetPeriod) {
        loadNumberMissingData();
      }
    });
  }

  // 绑定排序下拉框事件
  const sortSelect = document.getElementById('missSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function() {
      missSortBy = this.value;
      // 如果已有数据，重新排序并渲染
      if (missCurrentData.length > 0) {
        renderNumberMissingTable(missCurrentData);
      }
    });
  }

  // 绑定查询按钮事件
  const queryBtn = document.getElementById('queryMissingBtn');
  if (queryBtn) {
    queryBtn.addEventListener('click', handleQueryMissing);
  }

  // 绑定导出CSV按钮事件
  const exportBtn = document.getElementById('exportMissingCsvBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportNumberMissingCsv);
  }

  // 绑定期号输入框的回车事件
  const periodInput = document.getElementById('missPeriodInput');
  if (periodInput) {
    periodInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        handleQueryMissing();
      }
    });
  }

  // 清空结果区域
  const resultDiv = document.getElementById('numberMissingResult');
  if (resultDiv) {
    resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">请输入期号并点击查询</div>';
  }
}

// 处理查询按钮点击
function handleQueryMissing() {
  const periodInput = document.getElementById('missPeriodInput');
  if (!periodInput) {
    console.error('找不到期号输入框');
    return;
  }

  const period = periodInput.value.trim();
  if (!period) {
    alert('请输入期号');
    periodInput.focus();
    return;
  }

  missTargetPeriod = period;
  loadNumberMissingData();
}

// 加载号码遗漏期数数据
async function loadNumberMissingData() {
  const queryTypeText = missQueryType === 'animal' ? '生肖' : '号码';
  console.log(`查询${queryTypeText}遗漏数据：彩种=${missCurrentLotteryType}, 目标期号=${missTargetPeriod}, 位置=${missCurrentPosition || '全部'}`);

  const resultDiv = document.getElementById('numberMissingResult');
  if (!resultDiv) {
    console.error('找不到 numberMissingResult 元素');
    return;
  }

  // 显示加载中
  resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:#666;"><div class="loading-spinner"></div><p style="margin-top:15px;">正在查询数据...</p></div>';

  try {
    // 根据查询类型构建不同的API URL
    const apiEndpoint = missQueryType === 'animal' ? 'animal_missing_analysis' : 'number_missing_analysis';
    let url = `${window.BACKEND_URL}/api/${apiEndpoint}?lottery_type=${missCurrentLotteryType}&target_period=${missTargetPeriod}`;
    if (missCurrentPosition) {
      url += `&position=${missCurrentPosition}`;
    }

    console.log('请求URL:', url);

    const response = await fetch(url);
    const result = await response.json();

    console.log('查询结果:', result);

    if (!result.success) {
      resultDiv.innerHTML = `<div style="text-align:center;padding:40px;color:#f56c6c;">${result.message || '查询失败'}</div>`;
      return;
    }

    missCurrentData = result.data || [];

    if (missCurrentData.length === 0) {
      resultDiv.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">没有数据</div>';
      return;
    }

    // 显示查询信息
    const infoHtml = `
      <div style="margin-bottom:15px;padding:10px;background:#f0f9ff;border-left:4px solid #409eff;color:#333;">
        <strong>查询结果：</strong>目标期号 <strong>${result.target_period}</strong>，
        共统计 <strong>${result.total_periods}</strong> 期数据
        ${missCurrentPosition ? `（仅统计位置 ${missCurrentPosition}）` : '（统计所有位置）'}
      </div>
    `;

    // 渲染表格
    renderNumberMissingTable(missCurrentData, infoHtml);

  } catch (error) {
    console.error('查询失败:', error);
    resultDiv.innerHTML = `<div style="text-align:center;padding:40px;color:#f56c6c;">查询失败: ${error.message}</div>`;
  }
}

// 渲染遗漏期数表格
function renderNumberMissingTable(data, infoHtml = '') {
  const resultDiv = document.getElementById('numberMissingResult');
  if (!resultDiv) return;

  // 复制数据并排序
  let sortedData = [...data];

  // 判断是号码还是生肖
  const isAnimal = missQueryType === 'animal';
  const itemKey = isAnimal ? 'animal' : 'number';

  switch (missSortBy) {
    case 'missing_desc':
      sortedData.sort((a, b) => b.missing_periods - a.missing_periods);
      break;
    case 'missing_asc':
      sortedData.sort((a, b) => a.missing_periods - b.missing_periods);
      break;
    case 'number_asc':
      if (isAnimal) {
        // 生肖按照12生肖顺序排序
        const animalOrder = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
        sortedData.sort((a, b) => {
          const indexA = animalOrder.indexOf(a.animal);
          const indexB = animalOrder.indexOf(b.animal);
          return indexA - indexB;
        });
      } else {
        // 号码按数字大小排序
        sortedData.sort((a, b) => parseInt(a.number) - parseInt(b.number));
      }
      break;
  }

  // 生成表格HTML
  const headerText = isAnimal ? '生肖' : '号码';
  let tableHtml = `
    <table class="data-table" style="width:100%;">
      <thead>
        <tr>
          <th style="width:100px;">${headerText}</th>
          <th style="width:150px;">最后出现期号</th>
          <th style="width:100px;">所在位置</th>
          <th style="width:120px;">遗漏期数</th>
        </tr>
      </thead>
      <tbody>
  `;

  sortedData.forEach(item => {
    // 根据遗漏期数设置颜色
    let rowClass = '';
    if (item.missing_periods >= 50) {
      rowClass = 'class="miss-hot"';  // 遗漏50期以上：红色
    } else if (item.missing_periods >= 30) {
      rowClass = 'class="miss-warm"';  // 遗漏30-50期：橙色
    }

    const lastPeriod = item.last_period || '<span style="color:#999;">从未出现</span>';
    const lastPosition = item.last_position || '-';
    const displayValue = item[itemKey];

    tableHtml += `
      <tr ${rowClass}>
        <td style="font-weight:bold;font-size:18px;">${displayValue}</td>
        <td>${lastPeriod}</td>
        <td>${lastPosition}</td>
        <td style="font-weight:bold;font-size:16px;">${item.missing_periods} 期</td>
      </tr>
    `;
  });

  tableHtml += `
      </tbody>
    </table>
  `;

  // 添加样式说明
  const legendHtml = `
    <div style="margin-top:15px;padding:10px;background:#fafafa;border-radius:4px;">
      <strong>颜色说明：</strong>
      <span class="miss-hot" style="display:inline-block;padding:3px 10px;margin:0 5px;">遗漏50期以上</span>
      <span class="miss-warm" style="display:inline-block;padding:3px 10px;margin:0 5px;">遗漏30-50期</span>
      <span style="display:inline-block;padding:3px 10px;margin:0 5px;background:#fff;">正常</span>
    </div>
  `;

  resultDiv.innerHTML = infoHtml + tableHtml + legendHtml;
}

// 导出CSV
async function exportNumberMissingCsv() {
  if (!missTargetPeriod) {
    alert('请先查询数据');
    return;
  }

  try {
    // 根据查询类型构建不同的导出URL
    const apiEndpoint = missQueryType === 'animal' ? 'animal_missing_analysis' : 'number_missing_analysis';
    let url = `${window.BACKEND_URL}/api/${apiEndpoint}/export?lottery_type=${missCurrentLotteryType}&target_period=${missTargetPeriod}`;
    if (missCurrentPosition) {
      url += `&position=${missCurrentPosition}`;
    }

    console.log('导出CSV URL:', url);

    // 直接打开下载链接
    window.open(url, '_blank');

  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败: ' + error.message);
  }
}

// 确保函数在全局作用域可访问
window.initNumberMissingAnalysisPage = initNumberMissingAnalysisPage;
