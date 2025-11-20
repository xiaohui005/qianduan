/**
 * 2组观察分析模块
 * 功能：分析冷门9码，将剩余40码分成高频组和低频组
 */

// 全局变量
let currentAnalysisData = null;
let currentVerificationData = null;

/**
 * 初始化2组观察页面
 */
function initTwoGroupsPage() {
    console.log('[2组观察] 开始初始化页面...');
    const pageContainer = document.getElementById('twoGroupsPage');
    if (!pageContainer) {
        console.error('[2组观察] 找不到 twoGroupsPage 容器');
        return;
    }
    console.log('[2组观察] 找到页面容器，开始渲染...');

    const content = `
        <div class="two-groups-container">
            <h2>2组观察分析</h2>

            <!-- 查询区域 -->
            <div class="query-section">
                <div class="form-group">
                    <label>彩种:</label>
                    <select id="twoGroupsLotteryType">
                        <option value="am">澳门</option>
                        <option value="hk">香港</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>期号:</label>
                    <input type="text" id="twoGroupsPeriod" placeholder="例如: 2025198">
                </div>

                <div class="form-group">
                    <label>历史期数:</label>
                    <input type="number" id="twoGroupsHistoryCount" value="100" min="50" max="200">
                </div>

                <div class="form-group">
                    <label>验证期数:</label>
                    <input type="number" id="twoGroupsVerifyCount" value="30" min="10" max="100">
                </div>

                <div class="button-group">
                    <button onclick="analyzeTwoGroups()" class="btn-primary">开始分析</button>
                    <button onclick="verifyTwoGroups()" class="btn-secondary">验证分组</button>
                    <button onclick="exportTwoGroups()" class="btn-success">导出CSV</button>
                </div>
            </div>

            <!-- 结果展示区域 -->
            <div id="twoGroupsResult" class="result-section" style="display: none;">
                <!-- 冷门9码 -->
                <div class="cold-numbers-section">
                    <h3>冷门9码</h3>
                    <div id="coldNumbersDisplay"></div>
                </div>

                <!-- 高频组 -->
                <div class="group-section">
                    <h3>高频组（20个号码 - 平均间隔最小）</h3>
                    <div id="groupADisplay"></div>
                </div>

                <!-- 低频组 -->
                <div class="group-section">
                    <h3>低频组（20个号码 - 平均间隔较大）</h3>
                    <div id="groupBDisplay"></div>
                </div>
            </div>

            <!-- 验证结果区域 -->
            <div id="twoGroupsVerification" class="verification-section" style="display: none;">
                <h3>验证结果</h3>
                <div id="verificationDisplay"></div>
                <div id="verificationChart"></div>
            </div>
        </div>
    `;

    pageContainer.innerHTML = content;
    console.log('[2组观察] 页面内容已渲染完成');
}

/**
 * 分析2组
 */
async function analyzeTwoGroups() {
    console.log('[2组观察] analyzeTwoGroups 函数被调用');

    const lotteryType = document.getElementById('twoGroupsLotteryType').value;
    const period = document.getElementById('twoGroupsPeriod').value.trim();
    const historyCount = document.getElementById('twoGroupsHistoryCount').value;

    console.log('[2组观察] 参数:', { lotteryType, period, historyCount });

    if (!period) {
        alert('请输入期号');
        return;
    }

    try {
        showLoading();
        console.log('[2组观察] 开始调用API...');
        const data = await fetchTwoGroupsAnalysis(lotteryType, period, historyCount);
        console.log('[2组观察] API返回数据:', data);

        if (data.success) {
            currentAnalysisData = data.data;
            displayAnalysisResult(data.data);
        } else {
            alert('分析失败: ' + (data.error || '未知错误'));
        }
    } catch (error) {
        console.error('[2组观察] 分析错误:', error);
        alert('分析失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * 验证2组
 */
async function verifyTwoGroups() {
    const lotteryType = document.getElementById('twoGroupsLotteryType').value;
    const period = document.getElementById('twoGroupsPeriod').value.trim();
    const historyCount = document.getElementById('twoGroupsHistoryCount').value;
    const verifyCount = document.getElementById('twoGroupsVerifyCount').value;

    if (!period) {
        alert('请输入期号');
        return;
    }

    try {
        showLoading();
        const data = await fetchTwoGroupsVerification(lotteryType, period, historyCount, verifyCount);

        if (data.success) {
            currentVerificationData = data.data;
            displayVerificationResult(data.data);
        } else {
            alert('验证失败: ' + (data.error || '未知错误'));
        }
    } catch (error) {
        console.error('验证错误:', error);
        alert('验证失败: ' + error.message);
    } finally {
        hideLoading();
    }
}

/**
 * 导出CSV
 */
async function exportTwoGroups() {
    const lotteryType = document.getElementById('twoGroupsLotteryType').value;
    const period = document.getElementById('twoGroupsPeriod').value.trim();
    const historyCount = document.getElementById('twoGroupsHistoryCount').value;
    const verifyCount = document.getElementById('twoGroupsVerifyCount').value;

    if (!period) {
        alert('请输入期号');
        return;
    }

    const url = `${API_BASE}/api/two_groups/export?lottery_type=${lotteryType}&period=${period}&history_count=${historyCount}&verify_count=${verifyCount}`;
    window.open(url, '_blank');
}

/**
 * 显示分析结果
 */
function displayAnalysisResult(data) {
    const resultSection = document.getElementById('twoGroupsResult');
    resultSection.style.display = 'block';

    // 显示冷门9码
    const coldNumbersHtml = `
        <div style="margin-bottom: 15px; padding: 10px; background: #e8daef; border-radius: 4px;">
            <strong>冷门9码号码列表：</strong>
            <span style="color: #6c3483; font-size: 16px; font-weight: bold;">
                ${data.cold_9.numbers.join(', ')}
            </span>
        </div>
        <div class="cold-numbers-grid">
            ${data.cold_9.numbers.map(num => `
                <div class="number-card cold">
                    <div class="number">${num}</div>
                    <div class="count">出现${data.cold_9.statistics[num]}次</div>
                </div>
            `).join('')}
        </div>
        <p class="stats-summary">基于期号: ${data.base_period}，往前${data.history_count}期数据</p>
    `;
    document.getElementById('coldNumbersDisplay').innerHTML = coldNumbersHtml;

    // 显示高频组
    const groupAHtml = `
        <div class="group-summary">
            <span>共 ${data.group_a.count} 个号码</span>
            ${data.group_a.count !== 20 ? '<span style="color: red; margin-left: 10px;">⚠️ 警告：应该是20个号码</span>' : ''}
            <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 4px;">
                <strong>A组号码列表（前20个高频号码）：</strong>
                <span style="color: #856404; font-size: 16px; font-weight: bold;">
                    ${data.group_a.numbers.length > 0 ? data.group_a.numbers.join(', ') : '（无）'}
                </span>
            </div>
        </div>
        <div class="numbers-grid">
            ${data.group_a.numbers.map(num => {
                const stats = data.group_a.statistics[num];
                return `
                    <div class="number-card high-freq" title="出现${stats.count}次，平均间隔${stats.avg_interval.toFixed(2)}期，最大遗漏${stats.max_miss}期">
                        <div class="number">${num}</div>
                        <div class="stats">
                            <span>次数:${stats.count}</span>
                            <span>间隔:${stats.avg_interval.toFixed(1)}</span>
                            <span>遗漏:${stats.max_miss}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    document.getElementById('groupADisplay').innerHTML = groupAHtml;

    // 显示低频组
    const groupBHtml = `
        <div class="group-summary">
            <span>共 ${data.group_b.count} 个号码</span>
            ${data.group_b.count !== 20 ? '<span style="color: red; margin-left: 10px;">⚠️ 警告：应该是20个号码</span>' : ''}
            <div style="margin-top: 10px; padding: 10px; background: #d1ecf1; border-radius: 4px;">
                <strong>B组号码列表（后20个低频号码）：</strong>
                <span style="color: #0c5460; font-size: 16px; font-weight: bold;">
                    ${data.group_b.numbers.length > 0 ? data.group_b.numbers.join(', ') : '（无）'}
                </span>
            </div>
        </div>
        <div class="numbers-grid">
            ${data.group_b.numbers.map(num => {
                const stats = data.group_b.statistics[num];
                return `
                    <div class="number-card low-freq" title="出现${stats.count}次，平均间隔${stats.avg_interval === 999 ? '从未出现' : stats.avg_interval.toFixed(2) + '期'}，最大遗漏${stats.max_miss}期">
                        <div class="number">${num}</div>
                        <div class="stats">
                            <span>次数:${stats.count}</span>
                            <span>间隔:${stats.avg_interval === 999 ? '∞' : stats.avg_interval.toFixed(1)}</span>
                            <span>遗漏:${stats.max_miss}</span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    document.getElementById('groupBDisplay').innerHTML = groupBHtml;
}

/**
 * 显示验证结果
 */
function displayVerificationResult(data) {
    const verificationSection = document.getElementById('twoGroupsVerification');
    verificationSection.style.display = 'block';

    const verification = data.verification;

    const html = `
        <div class="verification-summary">
            <div class="summary-card">
                <h4>总体情况</h4>
                <p>验证期数: ${verification.total_verified} 期</p>
                <p>基准期号: ${data.base_period}</p>
            </div>

            <div class="summary-card highlight">
                <h4>高频组表现</h4>
                <p>命中次数: ${verification.group_a_hits} 次</p>
                <p>命中率: ${verification.group_a_rate}%</p>
                <p>平均间隔: ${verification.group_a_avg_interval} 期</p>
                <p>最大遗漏: ${verification.group_a_max_miss} 期</p>
            </div>

            <div class="summary-card">
                <h4>低频组表现</h4>
                <p>命中次数: ${verification.group_b_hits} 次</p>
                <p>命中率: ${verification.group_b_rate}%</p>
            </div>
        </div>

        <div class="hit-details">
            <div class="detail-section">
                <h4>高频组命中详情</h4>
                <div class="hit-list">
                    ${verification.group_a_hit_details.map(hit => `
                        <span class="hit-item">期号:${hit.period} → ${hit.number}</span>
                    `).join('')}
                </div>
            </div>

            <div class="detail-section">
                <h4>低频组命中详情</h4>
                <div class="hit-list">
                    ${verification.group_b_hit_details.map(hit => `
                        <span class="hit-item">期号:${hit.period} → ${hit.number}</span>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    document.getElementById('verificationDisplay').innerHTML = html;

    // 绘制图表
    drawVerificationChart(verification);
}

/**
 * 绘制验证图表
 */
function drawVerificationChart(verification) {
    const chartDiv = document.getElementById('verificationChart');

    const chartHtml = `
        <div class="chart-container">
            <h4>命中率对比</h4>
            <div class="bar-chart">
                <div class="bar-item">
                    <div class="bar-label">高频组</div>
                    <div class="bar-wrapper">
                        <div class="bar high-freq" style="width: ${verification.group_a_rate}%">
                            ${verification.group_a_rate}%
                        </div>
                    </div>
                </div>
                <div class="bar-item">
                    <div class="bar-label">低频组</div>
                    <div class="bar-wrapper">
                        <div class="bar low-freq" style="width: ${verification.group_b_rate}%">
                            ${verification.group_b_rate}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    chartDiv.innerHTML = chartHtml;
}

/**
 * 显示加载状态
 */
function showLoading() {
    // 简单的加载提示
    const app = document.getElementById('app');
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 20px;
        z-index: 9999;
    `;
    loading.textContent = '分析中...';
    document.body.appendChild(loading);
}

/**
 * 隐藏加载状态
 */
function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
        loading.remove();
    }
}

// CSS样式
const twoGroupsStyles = `
<style>
.two-groups-container {
    padding: 20px;
    max-width: 1400px;
    margin: 0 auto;
}

.query-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.form-group {
    display: inline-block;
    margin-right: 15px;
    margin-bottom: 10px;
}

.form-group label {
    margin-right: 5px;
    font-weight: bold;
}

.form-group input,
.form-group select {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.button-group {
    margin-top: 15px;
}

.button-group button {
    margin-right: 10px;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.btn-primary {
    background: #007bff;
    color: white;
}

.btn-secondary {
    background: #6c757d;
    color: white;
}

.btn-success {
    background: #28a745;
    color: white;
}

.result-section,
.verification-section {
    margin-top: 20px;
}

.cold-numbers-section,
.group-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    margin-bottom: 20px;
}

.cold-numbers-grid,
.numbers-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 10px;
    margin-top: 15px;
}

.number-card {
    padding: 15px;
    border-radius: 8px;
    text-align: center;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    transition: transform 0.2s;
}

.number-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.number-card.cold {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.number-card.high-freq {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
}

.number-card.low-freq {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
}

.number-card .number {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
}

.number-card .count,
.number-card .stats {
    font-size: 12px;
    opacity: 0.9;
}

.number-card .stats span {
    display: block;
    margin-top: 3px;
}

.group-summary {
    font-size: 16px;
    color: #666;
    margin-bottom: 10px;
}

.stats-summary {
    margin-top: 10px;
    color: #666;
    font-size: 14px;
}

.verification-section {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.verification-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 15px;
    margin-bottom: 20px;
}

.summary-card {
    padding: 15px;
    border-radius: 8px;
    background: #f8f9fa;
}

.summary-card.highlight {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.summary-card h4 {
    margin-top: 0;
    margin-bottom: 10px;
}

.summary-card p {
    margin: 5px 0;
}

.hit-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

.detail-section h4 {
    margin-bottom: 10px;
}

.hit-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.hit-item {
    display: inline-block;
    padding: 5px 10px;
    background: #e9ecef;
    border-radius: 4px;
    font-size: 13px;
}

.chart-container {
    margin-top: 20px;
}

.bar-chart {
    margin-top: 15px;
}

.bar-item {
    margin-bottom: 15px;
}

.bar-label {
    font-weight: bold;
    margin-bottom: 5px;
}

.bar-wrapper {
    background: #e9ecef;
    height: 30px;
    border-radius: 4px;
    overflow: hidden;
}

.bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    transition: width 0.5s ease;
}

.bar.high-freq {
    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
}

.bar.low-freq {
    background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
}
</style>
`;

// 在页面加载时注入样式
if (!document.getElementById('twoGroupsStyles')) {
    const styleElement = document.createElement('style');
    styleElement.id = 'twoGroupsStyles';
    styleElement.textContent = twoGroupsStyles.replace(/<\/?style>/g, '');
    document.head.appendChild(styleElement);
}

// 页面加载完成后立即执行
console.log('twoGroups.js 已加载');
console.log('initTwoGroupsPage 函数:', typeof initTwoGroupsPage);
console.log('analyzeTwoGroups 函数:', typeof analyzeTwoGroups);

// 立即修复按钮绑定
(function() {
    console.log('[2组观察] 开始修复按钮绑定...');

    // 等待页面完全加载
    function setupButton() {
        const btn = document.getElementById('menuTwoGroupsBtn');
        const page = document.getElementById('twoGroupsPage');

        if (!btn) {
            console.error('[2组观察] ✗ 找不到按钮，1秒后重试...');
            setTimeout(setupButton, 1000);
            return;
        }

        if (!page) {
            console.error('[2组观察] ✗ 找不到页面容器');
            return;
        }

        console.log('[2组观察] ✓ 找到按钮和页面容器');

        // 清除可能存在的旧事件
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        // 绑定新事件
        newBtn.addEventListener('click', function(e) {
            console.log('[2组观察] ========== 按钮被点击 ==========');

            // 隐藏所有页面
            document.querySelectorAll('[id$="Page"]').forEach(p => {
                p.style.display = 'none';
            });

            // 显示当前页面
            page.style.display = 'block';
            page.style.visibility = 'visible';
            console.log('[2组观察] ✓ 页面已显示');

            // 初始化页面内容
            if (typeof initTwoGroupsPage === 'function') {
                console.log('[2组观察] ✓ 调用 initTwoGroupsPage()');
                initTwoGroupsPage();

                // 检查内容是否生成
                setTimeout(() => {
                    const contentLength = page.innerHTML.length;
                    console.log('[2组观察] 页面内容长度:', contentLength);
                    if (contentLength > 100) {
                        console.log('[2组观察] ✓✓✓ 页面内容已成功生成！');
                    } else {
                        console.error('[2组观察] ✗ 页面内容为空！');
                    }
                }, 100);
            } else {
                console.error('[2组观察] ✗ initTwoGroupsPage 函数不存在');
            }

            // 更新标题
            const titleEl = document.getElementById('pageTitle');
            if (titleEl) {
                titleEl.textContent = '2组观察分析';
            }

            // 更新按钮状态
            document.querySelectorAll('.menu-btn').forEach(b => {
                b.classList.remove('active');
            });
            this.classList.add('active');

            console.log('[2组观察] ========== 处理完成 ==========');
        });

        console.log('[2组观察] ✓✓✓ 按钮事件绑定成功！');
    }

    // 如果 DOM 已加载，立即执行；否则等待
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupButton);
    } else {
        setupButton();
    }
})();

// 导出初始化函数供pages.js调用
window.initTwoGroupsPage = initTwoGroupsPage;
