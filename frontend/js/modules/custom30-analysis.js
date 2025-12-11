/**
 * 自主30码选择分析模块
 * 最热10码 + 温号10码 + 最冷10码 = 30码
 */

// ========== 预测功能 ==========

/**
 * 获取最新一期的预测数据
 * @param {string} lotteryType - 彩种类型 (am/hk)
 * @returns {Promise<Object>} 预测结果
 */
async function getLatestPrediction(lotteryType) {
    try {
        const url = `${window.BACKEND_URL}/api/custom30_predict_next?lottery_type=${lotteryType}`;
        const response = await fetch(url);
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('获取最新预测失败:', error);
        return { success: false, message: '网络请求失败' };
    }
}

/**
 * 渲染最新一期预测卡片
 * @param {Object} predictionData - 预测数据
 * @param {string} lotteryType - 彩种类型
 * @returns {string} 预测卡片的HTML字符串
 */
function renderPredictionCard(predictionData, lotteryType) {
    if (!predictionData.success || !predictionData.next_period) {
        return `
            <div class="latest-prediction-card" style="
                background: #f8d7da;
                color: #721c24;
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 25px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            ">
                <h3 style="margin: 0;">🎯 最新一期预测</h3>
                <p style="margin: 5px 0 0 0;">${predictionData.message || '暂无最新预测数据或后端服务异常。'}</p>
            </div>
        `;
    }

    const pred = predictionData.prediction || {};
    const all30Numbers = pred.all30 ? pred.all30.map(num => String(num).padStart(2, '0')).join(',') : '';
    const nextPeriod = predictionData.next_period || '待定';
    const periodText = `${lotteryType.toUpperCase()} ${nextPeriod}`;
    
    // 渲染号码球
    const numberBalls = pred.all30 ? pred.all30.map(num => {
        // 假设 getBallColorClass 是全局函数
        const colorClass = window.getBallColorClass ? window.getBallColorClass(num) : '';
        return `<span class="ball ${colorClass}" style="
            display: inline-block;
            width: 24px;
            height: 24px;
            line-height: 24px;
            text-align: center;
            border-radius: 50%;
            color: white;
            font-size: 12px;
            font-weight: bold;
            margin-right: 4px;
            margin-bottom: 4px;
            background: #3498db; /* 默认蓝色 */
        ">${String(num).padStart(2, '0')}</span>`;
    }).join('') : '暂无号码';

    return `
        <div class="latest-prediction-card" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        ">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 200px;">
                    <h3 style="margin: 0 0 10px 0; color: white; font-size: 20px;">
                        🎯 下一期预测 (${periodText})
                    </h3>
                    <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">预测号码 (30个)</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 100px; overflow-y: auto; background: rgba(255, 255, 255, 0.1); padding: 8px; border-radius: 6px;">
                        ${numberBalls}
                    </div>
                </div>
                
                <div style="
                    width: 100px;
                    height: 100px;
                    background: white;
                    padding: 5px;
                    border-radius: 6px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    margin-left: 20px;
                ">
                    <div id="qrcode-custom30-next" style="width: 90px; height: 90px;"></div>
                    <span style="color: #333; font-size: 10px; margin-top: 5px;">扫码获取号码</span>
                </div>
            </div>
            
            <div style="margin-top: 15px; display: flex; gap: 10px;">
                <button onclick="window.copyNumbersToClipboard('${all30Numbers}')"
                        style="
                            background: rgba(255, 255, 255, 0.2);
                            color: white;
                            border: 1px solid rgba(255, 255, 255, 0.4);
                            padding: 8px 16px;
                            border-radius: 6px;
                            font-weight: bold;
                            cursor: pointer;
                            flex: 1;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        ">
                    📋 复制号码
                </button>
            </div>
        </div>
    `;
}

// 页面渲染函数
window.renderCustom30AnalysisPage = function() {
    const container = document.getElementById('custom30AnalysisPage');
    container.innerHTML = `
        <div class="page-header">
            <h2>🎯 自适应智能30码</h2>
            <p class="page-description">🔄 自适应策略：根据历史集中度动态调整选号</p>
            <ul style="text-align: left; margin: 10px auto; max-width: 800px; font-size: 14px;">
                <li>📊 高频集中（Top10占比>70%）→ 重点选高频号码</li>
                <li>🌐 低频分散（Top10占比<60%）→ 均衡选择+回补</li>
                <li>⚖️ 中等集中（Top10占比60%-70%）→ 平衡策略</li>
                <li>💰 严格控制30码，成本最优</li>
            </ul>
        </div>

        <!-- 查询条件 -->
        <div class="filter-section">
            <div class="filter-row">
                <label>彩种类型：</label>
                <select id="custom30LotteryType" class="filter-select">
                    <option value="am">澳门</option>
                    <option value="hk">香港</option>
                </select>

                <label>年份筛选：</label>
                <input type="number" id="custom30Year" class="filter-input" placeholder="如：2025" min="2020" max="2030">

                <button onclick="queryCustom30Analysis()" class="btn btn-primary">📊 查询</button>
                <button onclick="exportCustom30AnalysisCsv()" class="btn btn-success">📥 导出CSV</button>
            </div>
        </div>

        <!-- 周统计和遗漏查看按钮 -->
        <div class="filter-section">
            <button onclick="showCustom30WeekStats()" class="btn btn-info">📈 查看周统计</button>
            <span class="tip-text">（目标：每周最多错2期）</span>
            <button onclick="showCustom30Omission()" class="btn btn-warning" style="margin-left: 15px;">🔍 查看推荐30码遗漏</button>
            <span class="tip-text">（显示最新推荐30码的遗漏情况）</span>
        </div>

        <!-- 二维码弹窗 -->
        <div id="custom30QRModal" style="
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background: white;
                padding: 20px;
                border-radius: 10px;
                text-align: center;
                max-width: 90vw;
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    border-bottom: 1px solid #eee;
                    padding-bottom: 10px;
                ">
                    <div style="font-weight: bold; color: #333;">扫码查看号码</div>
                    <button onclick="closeCustom30QRCode()" style="
                        background: none;
                        border: none;
                        font-size: 24px;
                        cursor: pointer;
                        color: #999;
                        line-height: 1;
                    ">&times;</button>
                </div>
                <img id="custom30QRImg" style="
                    width: 200px;
                    height: 200px;
                    border: 1px solid #eee;
                    margin: 0 auto 10px;
                    display: block;
                " alt="号码二维码">
                <div style="margin: 10px 0; font-size: 13px; color: #666;">
                    微信扫码查看号码
                </div>
                <!-- 显示号码文本（备用） -->
                <div id="custom30QRText" style="
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                    text-align: left;
                    max-height: 100px;
                    overflow-y: auto;
                    font-size: 12px;
                    word-break: break-all;
                "></div>
                <button onclick="closeCustom30QRCode()" style="
                    padding: 6px 20px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 10px;
                ">关闭</button>
            </div>
        </div>

	        <!-- 最新预测卡片容器 -->
	        <div id="custom30PredictionCard"></div>

	        <!-- 结果表格 -->
	        <div id="custom30AnalysisResult"></div>

        <!-- 周统计结果 -->
        <div id="custom30WeekStatsResult" style="display: none; margin-top: 20px;"></div>

        <!-- 推荐30码遗漏结果 -->
        <div id="custom30OmissionResult" style="display: none; margin-top: 20px;"></div>
    `;
};

// 查询自主30码分析
window.queryCustom30Analysis = async function(page = 1) {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30AnalysisResult');
    const predictionCardDiv = document.getElementById('custom30PredictionCard');

    // 隐藏周统计和遗漏结果
    document.getElementById('custom30WeekStatsResult').style.display = 'none';
    document.getElementById('custom30OmissionResult').style.display = 'none';

    resultDiv.innerHTML = '<div class="loading">正在加载历史数据...</div>';
    predictionCardDiv.innerHTML = '<div class="loading">正在加载最新预测...</div>';

    try {
        // 1. 获取最新一期预测数据
        const latestPrediction = await getLatestPrediction(lotteryType);
        
        // 2. 渲染预测卡片
        predictionCardDiv.innerHTML = renderPredictionCard(latestPrediction, lotteryType);

        // 3. 生成二维码
        const qrcodeElement = document.getElementById('qrcode-custom30-next');
        if (qrcodeElement && latestPrediction.success && latestPrediction.prediction?.all30) {
            const all30Numbers = latestPrediction.prediction.all30
                .map(num => String(num).padStart(2, '0'))
                .join(',');
            const qrcodeText = `${latestPrediction.next_period}:${all30Numbers}`;
            if (window.QRTool) {
                window.QRTool.render(qrcodeElement, qrcodeText, 90);
            } else {
                qrcodeElement.innerHTML = '<span style="color:red; font-size: 8px;">QR工具未加载</span>';
            }
        }

        // 4. 获取历史分析数据
        const result = await API.getCustom30Analysis(lotteryType, page, 20, year);

        if (!result.success) {
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            resultDiv.innerHTML = '<div class="no-data">暂无历史数据</div>';
            return;
        }

        // 5. 渲染历史表格
        let html = `
            <div class="result-header">
                <h3>历史分析结果</h3>
                <p>共 ${result.total} 条记录，当前第 ${result.page} 页</p>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>期号</th>
                            <th>开奖时间</th>
                            <th>年份-周数</th>
                            <th>评分前10码</th>
                            <th>评分11-20码</th>
                            <th>评分21-30码</th>
                            <th>智能30码</th>
                            <th>操作</th>
                            <th>下期期号</th>
                            <th>下期第7码</th>
                            <th>是否命中</th>
                            <th>遗漏值</th>
                            <th>最大遗漏</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        result.data.forEach(item => {
            const isHit = item.is_hit;
            const hitClass = isHit === true ? 'hit' : (isHit === false ? 'miss' : '');
            const hitText = isHit === true ? '✓ 命中' : (isHit === false ? '✗ 遗漏' : '-');
            
            // 转义号码中的特殊字符
            const escapedCustom30 = escapeNumbers(item.custom30 || '');

            html += `
                <tr>
                    <td>${item.period}</td>
                    <td>${item.open_time || '-'}</td>
                    <td>${item.week_year && item.week_number ? `${item.week_year}-W${String(item.week_number).padStart(2, '0')}` : '-'}</td>
                    <td class="numbers-cell hot">${formatNumbersWithColor(item.hot10)}</td>
                    <td class="numbers-cell warm">${formatNumbersWithColor(item.warm10)}</td>
                    <td class="numbers-cell cold">${formatNumbersWithColor(item.cold10)}</td>
                    <td class="numbers-cell custom30">${formatNumbersWithColor(item.custom30)}</td>
                    <td>
                        <button onclick="showCustom30QRCode('${item.period}', '${escapedCustom30}')" 
                                style="padding: 3px 8px; font-size: 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                ${!item.custom30 ? 'disabled' : ''}>
                            二维码
                        </button>
                    </td>
                    <td>${item.next_period || '-'}</td>
                    <td class="number-ball ${hitClass}">${item.next_number !== null ? formatNumberBall(item.next_number) : '-'}</td>
                    <td class="${hitClass}">${hitText}</td>
                    <td>${item.miss_count !== null ? item.miss_count : '-'}</td>
                    <td>${item.max_miss !== null ? item.max_miss : '-'}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // 添加分页
        if (result.total > result.page_size) {
            const totalPages = Math.ceil(result.total / result.page_size);
            html += createPagination(result.page, totalPages, (p) => `queryCustom30Analysis(${p})`);
        }

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询失败:', error);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 查看周统计
window.showCustom30WeekStats = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30WeekStatsResult');

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">正在加载周统计数据...</div>';

    try {
        console.log('调用API获取周统计...');
        const result = await API.getCustom30WeekStats(lotteryType, year);
        console.log('周统计API返回结果:', result);

        if (!result.success) {
            console.error('API返回失败:', result.message);
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            console.log('API返回空数据');
            resultDiv.innerHTML = '<div class="no-data">暂无周统计数据</div>';
            return;
        }

        console.log('API数据结构:', result);
        const summary = result.summary || {};
        console.log('汇总数据:', summary);

        // 渲染周统计表格
        let html = `
            <div class="result-header">
                <h3>📈 周统计分析</h3>
        `;

        // 如果有汇总数据才显示
        if (Object.keys(summary).length > 0) {
            html += `
                <div class="summary-cards">
                    <div class="summary-card">
                        <div class="card-value">${summary.total_weeks || 0}</div>
                        <div class="card-label">总周数</div>
                    </div>
                    <div class="summary-card">
                        <div class="card-value success">${summary.target_met_weeks || 0}</div>
                        <div class="card-label">达标周数</div>
                    </div>
                    <div class="summary-card">
                        <div class="card-value ${(summary.target_met_rate || 0) >= 80 ? 'success' : 'warning'}">${summary.target_met_rate || 0}%</div>
                        <div class="card-label">达标率</div>
                    </div>
                </div>
            `;
        }

        html += `
                <p class="target-info">目标：每周最多错2期（即遗漏≤2期）</p>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>周</th>
                            <th>总期数</th>
                            <th>命中期数</th>
                            <th>遗漏期数</th>
                            <th>命中率</th>
                            <th>是否达标</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // 处理每一周的数据
        result.data.forEach((weekData, index) => {
            console.log(`处理第${index}周数据:`, weekData);
            
            // 确保数据存在
            if (!weekData) {
                console.warn(`第${index}周数据为空`);
                return;
            }
            
            const weekLabel = weekData.week || `第${index + 1}周`;
            const total = weekData.total || 0;
            const hit = weekData.hit || 0;
            const miss = weekData.miss || 0;
            const hitRate = weekData.hit_rate || 0;
            const isTargetMet = weekData.is_target_met || false;
            
            const targetClass = isTargetMet ? 'success' : 'danger';
            const targetText = isTargetMet ? '✓ 达标' : '✗ 未达标';

            html += `
                <tr class="${targetClass}-row">
                    <td><strong>${weekLabel}</strong></td>
                    <td>${total}</td>
                    <td class="success">${hit}</td>
                    <td class="danger">${miss}</td>
                    <td>${hitRate}%</td>
                    <td class="${targetClass}">${targetText}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询周统计失败:', error);
        console.error('错误堆栈:', error.stack);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 导出CSV
window.exportCustom30AnalysisCsv = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;

    try {
        const blob = await API.exportCustom30Analysis(lotteryType, year);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom30_${lotteryType}_${year || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
    }
};

// 查看推荐30码遗漏情况
window.showCustom30Omission = async function(page = 1) {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;
    const resultDiv = document.getElementById('custom30OmissionResult');

    // 隐藏其他结果区域
    document.getElementById('custom30AnalysisResult').style.display = 'none';
    document.getElementById('custom30WeekStatsResult').style.display = 'none';

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div class="loading">正在加载推荐30码遗漏数据...</div>';

    try {
        const result = await API.getCustom30Omission(lotteryType, page, 50, year);

        if (!result.success) {
            resultDiv.innerHTML = `<div class="error">查询失败：${result.message || '未知错误'}</div>`;
            return;
        }

        if (!result.data || result.data.length === 0) {
            resultDiv.innerHTML = '<div class="no-data">暂无数据</div>';
            return;
        }

        // 渲染表格
        let html = `
            <div class="result-header">
                <h3>🎯 推荐30码遗漏情况</h3>
                <p>每期推荐30码可能不同，表格显示每期推荐的30码及命中情况</p>
                <p>共 ${result.total} 期记录，当前第 ${result.page} 页</p>
                <p class="tip-text">遗漏值正序累加：未命中则+1，命中则重置为0</p>
                <button onclick="exportCustom30OmissionCsv()" class="btn btn-success" style="margin-top: 10px;">📥 导出CSV</button>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>期号</th>
                            <th>开奖时间</th>
                            <th>第7码</th>
                            <th>推荐30码</th>
                            <th>操作</th>
                            <th>是否命中</th>
                            <th>当前遗漏</th>
                            <th>最大遗漏</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        result.data.forEach(item => {
            const isHit = item.is_hit;
            const hitClass = isHit ? 'success' : 'danger';
            const hitText = isHit ? '✓ 是' : '✗ 否';
            
            // 转义号码中的特殊字符
            const escapedRecommended30 = escapeNumbers(item.recommended_30 || '');
            
            // 格式化推荐30码，用逗号分隔，每10个换行
            const nums = item.recommended_30 ? item.recommended_30.split(',').map(n => String(n.trim()).padStart(2, '0')) : [];
            let formatted30 = '-';
            if (nums.length > 0) {
                formatted30 = '';
                for (let i = 0; i < nums.length; i++) {
                    if (i > 0 && i % 10 === 0) {
                        formatted30 += '<br>';
                    }
                    formatted30 += nums[i];
                    if (i < nums.length - 1) {
                        formatted30 += ', ';
                    }
                }
            }

            html += `
                <tr>
                    <td style="font-weight: bold;">${item.period || '-'}</td>
                    <td>${item.open_time || '-'}</td>
                    <td class="number-ball">${item.target_number ? formatNumberBall(item.target_number) : '-'}</td>
                    <td style="text-align: left; font-size: 12px; line-height: 1.6;">${formatted30}</td>
                    <td>
                        <button onclick="showCustom30QRCode('${item.period || ''}', '${escapedRecommended30}')" 
                                style="padding: 3px 8px; font-size: 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;"
                                ${!item.recommended_30 ? 'disabled' : ''}>
                            二维码
                        </button>
                    </td>
                    <td class="${hitClass}">${hitText}</td>
                    <td>${item.omission || 0}</td>
                    <td style="color: #e74c3c; font-weight: bold;">${item.max_omission || 0}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        // 添加分页
        if (result.total > result.page_size) {
            const totalPages = Math.ceil(result.total / result.page_size);
            html += createPagination(result.page, totalPages, (p) => `showCustom30Omission(${p})`);
        }

        resultDiv.innerHTML = html;

    } catch (error) {
        console.error('查询推荐30码遗漏失败:', error);
        resultDiv.innerHTML = `<div class="error">查询失败：${error.message}</div>`;
    }
};

// 导出推荐30码遗漏CSV
window.exportCustom30OmissionCsv = async function() {
    const lotteryType = document.getElementById('custom30LotteryType').value;
    const year = document.getElementById('custom30Year').value;

    try {
        const blob = await API.exportCustom30Omission(lotteryType, year);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `custom30_omission_${lotteryType}_${year || 'all'}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('导出成功！');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败：' + error.message);
    }
};

// 二维码功能函数
/**
 * 显示二维码弹窗（自定义30码页面）
 */
window.showCustom30QRCode = function(period, numbers) {
    console.log('显示自定义30码二维码', period);
    
    // 检查号码是否有效
    if (!numbers || numbers.trim() === '') {
        alert('号码数据为空，无法生成二维码');
        return;
    }
    
    // 只使用号码，不显示期号
    const qrContent = numbers.trim();
    const textDiv = document.getElementById('custom30QRText');
    
    // 显示弹窗
    const modal = document.getElementById('custom30QRModal');
    modal.style.display = 'flex';
    
    // 显示号码文本
    textDiv.textContent = qrContent;
    
    // 使用二维码API生成可扫描的二维码
    generateCustom30QRCode(qrContent);
};

/**
 * 关闭二维码弹窗
 */
window.closeCustom30QRCode = function() {
    const modal = document.getElementById('custom30QRModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

/**
 * 生成二维码
 */
function generateCustom30QRCode(content) {
    const img = document.getElementById('custom30QRImg');
    
    // 确保内容不超过二维码容量限制
    let qrContent = content;
    if (content.length > 200) {
        qrContent = content.substring(0, 200) + '...';
        console.log('内容过长，已截断');
    }
    
    // 编码内容
    const encodedContent = encodeURIComponent(qrContent);
    
    // 使用多个API源，确保二维码能扫
    const apiUrls = [
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedContent}`,
        `https://quickchart.io/qr?text=${encodedContent}&size=200&margin=1`,
        `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=png&data=${encodedContent}`
    ];
    
    // 尝试第一个API
    img.src = apiUrls[0];
    
    // 如果第一个失败，尝试第二个
    img.onerror = function() {
        console.log('第一个API失败，尝试备用API');
        img.src = apiUrls[1];
        
        // 如果第二个也失败，尝试第三个
        img.onerror = function() {
            console.log('第二个API失败，尝试第三个API');
            img.src = apiUrls[2];
            
            // 如果所有都失败，显示提示
            img.onerror = function() {
                console.log('所有API都失败');
                const textDiv = document.getElementById('custom30QRText');
                textDiv.innerHTML = `
                    <div style="color: #e74c3c;">
                        <strong>二维码生成失败</strong><br>
                        请手动复制以下号码：<br>
                        ${content}
                    </div>
                `;
            };
        };
    };
    
    // 二维码加载成功
    img.onload = function() {
        console.log('二维码加载成功');
        const textDiv = document.getElementById('custom30QRText');
        textDiv.innerHTML = `
            <div style="color: #27ae60;">
                <strong>✓ 二维码已生成</strong><br>
                微信扫码查看号码<br>
                如无法扫描，可手动复制
            </div>
        `;
    };
}

// 复制号码到剪贴板函数
window.copyNumbersToClipboard = function(numbers) {
    if (!numbers) {
        alert('没有号码可复制');
        return;
    }
    
    navigator.clipboard.writeText(numbers).then(() => {
        alert('号码已复制到剪贴板！');
    }).catch(err => {
        console.error('复制失败:', err);
        // 备用方法
        const textarea = document.createElement('textarea');
        textarea.value = numbers;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('号码已复制到剪贴板！');
    });
};

// 辅助函数
// 格式化号码（带颜色）
function formatNumbersWithColor(numbersStr) {
    if (!numbersStr) return '-';
    const numbers = numbersStr.split(',').map(n => n.trim());
    return numbers.map(n => formatNumberBall(parseInt(n))).join(' ');
}

// 格式化单个号码为带颜色的球
function formatNumberBall(num) {
    const numStr = String(num).padStart(2, '0');
    const colorClass = window.getBallColorClass ? window.getBallColorClass(numStr) : '';
    return `<span class="ball ${colorClass}">${numStr}</span>`;
}

// 转义号码字符串中的特殊字符
function escapeNumbers(numbersStr) {
    if (!numbersStr) return '';
    // 转义单引号和双引号
    return numbersStr.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// 创建分页组件
function createPagination(currentPage, totalPages, onPageClick) {
    let html = '<div class="pagination">';

    // 上一页
    if (currentPage > 1) {
        html += `<button onclick="${onPageClick(currentPage - 1)}" class="btn btn-sm">上一页</button>`;
    }

    // 页码
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        html += `<button onclick="${onPageClick(1)}" class="btn btn-sm">1</button>`;
        if (startPage > 2) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button onclick="${onPageClick(i)}" class="btn btn-sm ${activeClass}">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += '<span class="pagination-ellipsis">...</span>';
        }
        html += `<button onclick="${onPageClick(totalPages)}" class="btn btn-sm">${totalPages}</button>`;
    }

    // 下一页
    if (currentPage < totalPages) {
        html += `<button onclick="${onPageClick(currentPage + 1)}" class="btn btn-sm">下一页</button>`;
    }

    html += '</div>';
    return html;
}

console.log('自主30码选择分析模块已加载');
