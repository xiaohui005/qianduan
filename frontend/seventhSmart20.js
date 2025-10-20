/**
 * 第7个号码智能推荐20码模块
 * 基于多维度分析推荐最可能出现的20个号码
 */

// 全局变量
window.currentSeventhSmart20Type = 'am';

// 初始化第7个号码智能推荐20码功能
function initSeventhSmart20() {
  console.log('初始化第7个号码智能推荐20码功能');

  // 彩种选择按钮
  const typeBtns = document.querySelectorAll('#seventhSmart20Page .seventh-range-type-btn');
  typeBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      typeBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const lotteryType = this.getAttribute('data-type');
      window.currentSeventhSmart20Type = lotteryType;
    });
  });

  // 开始分析按钮
  const startBtn = document.getElementById('startSeventhSmart20Btn');
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      const lotteryType = window.currentSeventhSmart20Type || 'am';
      loadSeventhSmart20(lotteryType);
    });
  }

  // 导出CSV按钮
  const exportBtn = document.getElementById('exportSeventhSmart20Btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', function() {
      const lotteryType = window.currentSeventhSmart20Type || 'am';
      exportSeventhSmart20CSV(lotteryType);
    });
  }

  // 设置默认值
  window.currentSeventhSmart20Type = 'am';
}

// 加载第7个号码智能推荐20码数据
async function loadSeventhSmart20(lotteryType) {
  const resultDiv = document.getElementById('seventhSmart20Result');
  const summaryDiv = document.getElementById('seventhSmart20Summary');

  if (!resultDiv) return;

  try {
    resultDiv.innerHTML = '<p style="text-align: center; padding: 20px;">正在进行智能分析，请稍候...</p>';
    summaryDiv.style.display = 'none';

    const response = await fetch(`${window.BACKEND_URL}/api/seventh_smart_recommend20?lottery_type=${lotteryType}`);
    const result = await response.json();

    if (result.success) {
      renderSeventhSmart20(result.data, resultDiv, summaryDiv);
    } else {
      resultDiv.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">分析失败: ${result.message}</p>`;
    }
  } catch (error) {
    console.error('加载第7个号码智能推荐20码失败:', error);
    resultDiv.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">加载失败，请检查网络连接或后端服务</p>';
  }
}

// 渲染第7个号码智能推荐20码结果
function renderSeventhSmart20(data, resultDiv, summaryDiv) {
  const {
    recommend_top20,
    analysis_summary,
    confidence_level,
    generated_at
  } = data;

  // 显示并填充摘要信息
  summaryDiv.style.display = 'block';
  document.getElementById('smart20PeriodRange').textContent = analysis_summary.analysis_period_range || '-';
  document.getElementById('smart20TotalPeriods').textContent = analysis_summary.total_analyzed_periods || '0';
  document.getElementById('smart20Confidence').textContent = confidence_level || '-';

  // 根据置信度设置颜色
  const confidenceSpan = document.getElementById('smart20Confidence');
  if (confidence_level === '高') {
    confidenceSpan.style.color = '#27ae60';
  } else if (confidence_level === '中') {
    confidenceSpan.style.color = '#f39c12';
  } else {
    confidenceSpan.style.color = '#e74c3c';
  }

  // 显示热号、冷号、遗漏适中号码
  document.getElementById('smart20HotNumbers').textContent =
    (analysis_summary.hot_numbers || []).join(', ') || '无';
  document.getElementById('smart20ColdNumbers').textContent =
    (analysis_summary.cold_numbers || []).join(', ') || '无';
  document.getElementById('smart20DueNumbers').textContent =
    (analysis_summary.due_numbers || []).join(', ') || '无';

  // 渲染推荐Top20表格
  let html = `
    <div style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 style="margin: 0;">推荐Top20号码</h3>
        <span style="color: #666; font-size: 14px;">生成时间: ${generated_at}</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
            <th style="padding: 12px 8px; text-align: center; width: 60px;">排名</th>
            <th style="padding: 12px 8px; text-align: center; width: 60px;">号码</th>
            <th style="padding: 12px 8px; text-align: center; width: 80px;">综合评分</th>
            <th style="padding: 12px 8px; text-align: center; width: 70px;">总频率</th>
            <th style="padding: 12px 8px; text-align: center; width: 80px;">近30期频率</th>
            <th style="padding: 12px 8px; text-align: center; width: 70px;">当前遗漏</th>
            <th style="padding: 12px 8px; text-align: center; width: 70px;">平均遗漏</th>
            <th style="padding: 12px 8px; text-align: center; width: 90px;">趋势</th>
            <th style="padding: 12px 8px; text-align: left;">推荐理由</th>
          </tr>
        </thead>
        <tbody>
  `;

  recommend_top20.forEach((item, index) => {
    // 根据排名设置不同的背景色
    let bgColor = '#fff';
    if (index < 3) {
      bgColor = '#fff3cd'; // 前3名金色背景
    } else if (index < 8) {
      bgColor = '#d1ecf1'; // 4-8名蓝色背景
    }

    // 根据趋势设置颜色
    let trendColor = '#666';
    if (item.trend === '强烈上升') trendColor = '#e74c3c';
    else if (item.trend === '上升') trendColor = '#f39c12';
    else if (item.trend === '下降') trendColor = '#3498db';

    // 号码背景色
    let numberBg = item.is_hot ? '#ffebee' : '#fff';
    let numberColor = item.is_hot ? '#e74c3c' : '#333';

    html += `
      <tr style="background: ${bgColor}; border-bottom: 1px solid #dee2e6;">
        <td style="padding: 10px 8px; text-align: center; font-weight: bold;">${index + 1}</td>
        <td style="padding: 10px 8px; text-align: center;">
          <span style="display: inline-block; background: ${numberBg}; color: ${numberColor};
                       padding: 4px 8px; border-radius: 4px; font-weight: bold;">
            ${item.number.toString().padStart(2, '0')}
          </span>
        </td>
        <td style="padding: 10px 8px; text-align: center; font-weight: bold; color: #27ae60;">
          ${item.total_score.toFixed(1)}
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          ${item.frequency} (${item.frequency_rate}%)
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          ${item.recent_frequency} (${item.recent_rate}%)
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          ${item.current_miss}
        </td>
        <td style="padding: 10px 8px; text-align: center;">
          ${item.avg_miss}
        </td>
        <td style="padding: 10px 8px; text-align: center; color: ${trendColor}; font-weight: bold;">
          ${item.trend}
        </td>
        <td style="padding: 10px 8px;">
          ${item.reason}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>

      <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 6px; font-size: 13px; color: #666;">
        <p style="margin: 0 0 8px 0;"><strong>说明：</strong></p>
        <ul style="margin: 0; padding-left: 20px;">
          <li>综合评分基于：频率30% + 遗漏25% + 趋势25% + 连号10%（香港彩） + 稳定性10%</li>
          <li>前3名为金色背景，4-8名为蓝色背景，表示推荐优先级</li>
          <li>红色号码为当前热号（近30期频率≥3次）</li>
          <li>趋势分析基于近30期与整体频率对比</li>
          <li>遗漏适中的号码更有可能在近期出现</li>
          <li style="color: #e74c3c; font-weight: bold;">⚠️ 彩票具有随机性，推荐仅供参考，不保证命中率</li>
        </ul>
      </div>
    </div>
  `;

  resultDiv.innerHTML = html;
}

// 导出CSV
function exportSeventhSmart20CSV(lotteryType) {
  const url = `${window.BACKEND_URL}/api/seventh_smart_recommend20?lottery_type=${lotteryType}&export=csv`;
  window.open(url, '_blank');
}

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSeventhSmart20);
} else {
  initSeventhSmart20();
}
