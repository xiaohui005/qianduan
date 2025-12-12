// State for Greedy20 page
let g20_lotteryType = 'am';

document.addEventListener('DOMContentLoaded', () => {
    const startBtn = document.getElementById('startGreedy20AnalysisBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            g20_lotteryType = document.getElementById('greedy20-lottery-type').value;
            renderGreedy20Page(1, true); // Start analysis and fetch page 1
        });
    }

    const exportBtn = document.getElementById('exportGreedy20CsvBtn');
    if(exportBtn) {
        exportBtn.addEventListener('click', () => {
            const lotteryType = document.getElementById('greedy20-lottery-type').value;
            const url = `${window.BACKEND_URL}/api/analysis/greedy20?lottery_type=${lotteryType}&export=csv`;
            window.location.href = url;
        });
    }

    injectGreedy20Styles();
});

async function renderGreedy20Page(page, isNewAnalysis = false) {
    const summaryDiv = document.getElementById('greedy20-results-summary');
    const recommendationDiv = document.getElementById('greedy20-results-recommendation');
    const historyDiv = document.getElementById('greedy20-results-history');
    const qrCodeContainer = document.getElementById('greedy20-qrcode-container');
    const historyTableBody = document.getElementById('greedy20-history-table-body');
    const paginationContainer = document.getElementById('greedy20-pagination');
    const exportBtn = document.getElementById('exportGreedy20CsvBtn');

    if (isNewAnalysis) {
        summaryDiv.style.display = 'none';
        recommendationDiv.style.display = 'block';
        historyDiv.style.display = 'none';
        qrCodeContainer.innerHTML = '';
        exportBtn.style.display = 'none';
        recommendationDiv.innerHTML = '<div class="loading">正在搜索最优策略并进行分析，请稍候...</div>';
        historyTableBody.innerHTML = '';
        paginationContainer.innerHTML = '';
    } else {
        historyTableBody.innerHTML = '<tr><td colspan="6" class="loading">正在加载...</td></tr>';
    }

    try {
        const data = await window.API.getGreedy20Analysis(g20_lotteryType, page);

        if (data && data.records) {
            if (isNewAnalysis) {
                renderSummary(data);
                renderRecommendation(data);
                exportBtn.style.display = 'inline-block'; // Show export button after successful analysis
            }
            renderHistoryTable(data.records);
            renderGreedy20Pagination(data);
            summaryDiv.style.display = 'block';
            historyDiv.style.display = 'block';
        } else {
            throw new Error(data.detail || '未能获取到有效的分析结果。');
        }
    } catch (error) {
        console.error('贪心20码分析失败:', error);
        if (isNewAnalysis) {
            recommendationDiv.innerHTML = `<div class="error">分析失败: ${error.message}</div>`;
        } else {
            historyTableBody.innerHTML = `<tr><td colspan="6" class="error">加载失败: ${error.message}</td></tr>`;
        }
    }
}

function renderSummary(data) {
    const summaryDiv = document.getElementById('greedy20-results-summary');
    const { message, history_period_used, max_miss, current_miss, strategy_used } = data;
    
    const strategyNameMap = {
        'hot20': '最热20码',
        'next20': '次热20码',
        'cold20': '最冷20码'
    };
    const strategyName = strategyNameMap[strategy_used] || strategy_used;

    summaryDiv.innerHTML = `
        <div class="stats-section">
            <div class="message-banner info-message">${message}</div>
            <h3 class="stats-title">最优策略回测摘要 (只基于第7码)</h3>
            <div class="stats-grid">
                <div class="stats-item"><span class="stats-label">最优策略:</span><span class="stats-value">${strategyName}</span></div>
                <div class="stats-item"><span class="stats-label">最优周期:</span><span class="stats-value">${history_period_used} 期</span></div>
                <div class="stats-item"><span class="stats-label">策略最大遗漏:</span><span class="stats-value" style="color: #e74c3c;">${max_miss}</span></div>
                <div class="stats-item"><span class="stats-label">当前连续遗漏:</span><span class="stats-value" style="color: #f39c12;">${current_miss}</span></div>
            </div>
        </div>`;
}

function renderRecommendation(data) {
    const recommendationDiv = document.getElementById('greedy20-results-recommendation');
    const qrCodeContainer = document.getElementById('greedy20-qrcode-container');
    const { combination, period } = data.next_period_recommendation;

    if (!combination || combination.length === 0) {
        recommendationDiv.innerHTML = `<h3>下一期 (${period}) 推荐号码</h3><div class="error">无法生成推荐号码。</div>`;
        return;
    }

    const numbersHtml = combination.map(num => {
        const numStr = String(num).padStart(2, '0');
        const colorClass = window.getBallColorClass ? getBallColorClass(numStr) : '';
        return `<span class="number-ball ${colorClass}">${numStr}</span>`;
    }).join('');

    recommendationDiv.innerHTML = `
        <h3>下一期 (${period}) 推荐号码</h3>
        <div class="recommendation-grid">${numbersHtml}</div>
        <button id="generate-qr-btn" class="btn-secondary" style="margin-top: 10px;">生成二维码</button>`;
    
    qrCodeContainer.innerHTML = '';
    document.getElementById('generate-qr-btn').addEventListener('click', () => {
        QRTool.render(qrCodeContainer, combination.join(','), 128);
        document.getElementById('generate-qr-btn').style.display = 'none';
    });
}

function renderHistoryTable(records) {
    const historyTableBody = document.getElementById('greedy20-history-table-body');
    let html = '';
    for (const record of records) {
        const isHitClass = record.is_hit ? 'correct' : 'wrong';
        const isHitText = record.is_hit  ;
        const seventh_number = record.actual_seventh_number;
        const recommendation = record.recommendation.split(',').map(n => parseInt(n));

        const recommendedNumbersHtml = '<div class="recommendation-grid-small">' + recommendation.map(num => {
            const numStr = String(num).padStart(2, '0');
            const isHitNumber = (num === seventh_number);
            const colorClass = window.getBallColorClass ? getBallColorClass(numStr) : '';
            const hitClass = isHitNumber ? 'hit-number-highlight' : '';
            return `<span class="number-ball number-ball-sm ${colorClass} ${hitClass}">${numStr}</span>`;
        }).join('') + '</div>';
        
        const seventhBallColor = window.getBallColorClass ? getBallColorClass(String(seventh_number).padStart(2, '0')) : '';

        html += `
            <tr>
                <td>${record.period}</td>
                <td><span class="number-ball number-ball-sm ${seventhBallColor}">${String(seventh_number).padStart(2, '0')}</span></td>
                <td>${recommendedNumbersHtml}</td>
                <td class="${isHitClass}">${isHitText}</td>
                <td>${record.miss_streak_before}</td>
                <td>${record.max_miss_streak_before}</td>
            </tr>`;
    }
    historyTableBody.innerHTML = html;
}

function renderGreedy20Pagination(data) {
    const paginationContainer = document.getElementById('greedy20-pagination');
    const totalPages = Math.ceil(data.total / data.page_size);
    const currentPage = data.page;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    let paginationHtml = '';
    paginationHtml += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="renderGreedy20Page(${currentPage - 1})">上一页</button>`;
    paginationHtml += '<div class="page-numbers">';
    
    const pagesToShow = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
    } else {
        pagesToShow.push(1);
        if (currentPage > 4) pagesToShow.push('...');
        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
            pagesToShow.push(i);
        }
        if (currentPage < totalPages - 3) pagesToShow.push('...');
        pagesToShow.push(totalPages);
    }
    
    [...new Set(pagesToShow)].forEach(p => {
        if (p === '...') {
            paginationHtml += `<span class="page-ellipsis">...</span>`;
        } else {
            paginationHtml += `<span class="page-number ${p === currentPage ? 'active' : ''}" onclick="renderGreedy20Page(${p})">${p}</span>`;
        }
    });

    paginationHtml += '</div>';
    paginationHtml += `<button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="renderGreedy20Page(${currentPage + 1})">下一页</button>`;
    
    paginationContainer.innerHTML = paginationHtml;
}

function injectGreedy20Styles() {
    const styleId = 'greedy20-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
        .recommendation-grid, .recommendation-grid-small { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-start; padding: 5px; }
        .recommendation-grid-small .number-ball-sm { margin: 1px !important; }
        .hit-number-highlight { box-shadow: 0 0 0 3px gold, inset 0 0 0 2px white; transform: scale(1.1); }
        .data-table .correct { color: #27ae60; font-weight: bold; }
        .data-table .wrong { color: #e74c3c; font-weight: bold; }
        .message-banner { padding: 10px; border-radius: 5px; margin-bottom: 15px; text-align: center; font-weight: bold; }
        .info-message { background-color: #e6f7ff; border: 1px solid #91d5ff; color: #0050b3; }
    `;
    document.head.appendChild(style);
}
