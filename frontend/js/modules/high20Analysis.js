/**
 * 高20码分析模块
 * 功能：基于前600期，组合策略（近期热号+中期稳定号），生成20个号码
 */

/**
 * 初始化高20码分析页面
 */
export function initHigh20Page() {
    const content = document.getElementById('high20Page');
    content.innerHTML = `
        <div class="container-fluid">
            <h2 class="mb-4">高20码分析</h2>

            <!-- 说明卡片 -->
            <div class="alert alert-info">
                <h5>功能说明</h5>
                <p>高20码分析基于前600期历史数据，采用组合策略生成每期20个号码。</p>
                <ul>
                    <li><strong>策略</strong>：近100期热号top10 + 600期中频号10个</li>
                    <li><strong>命中率</strong>：约38%</li>
                    <li><strong>特点</strong>：偶尔会超过6期连续错误，系统会自动标注超5期的情况</li>
                    <li><strong>数据要求</strong>：至少需要601期历史数据</li>
                </ul>
            </div>

            <!-- 操作按钮区 -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-3">
                            <label>选择彩种：</label>
                            <select id="high20LotteryType" class="form-control">
                                <option value="am">澳门</option>
                                <option value="hk">香港</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label>年份筛选：</label>
                            <select id="high20Year" class="form-control">
                                <option value="">全部年份</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label>每页显示：</label>
                            <select id="high20PageSize" class="form-control">
                                <option value="50">50条</option>
                                <option value="100">100条</option>
                                <option value="200">200条</option>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label>&nbsp;</label>
                            <div>
                                <button class="btn btn-primary btn-block" onclick="window.high20Module.loadAnalysis()">
                                    查询分析
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="row mt-2">
                        <div class="col-md-12">
                            <button class="btn btn-success" onclick="window.high20Module.exportData()">
                                导出CSV
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 统计信息卡片 -->
            <div id="high20Statistics" class="card mb-3" style="display:none;">
                <div class="card-header bg-primary text-white">
                    <h5>统计信息</h5>
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">总期数</div>
                                <div class="stat-value" id="high20TotalChecked">0</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">命中期数</div>
                                <div class="stat-value text-success" id="high20HitCount">0</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">命中率</div>
                                <div class="stat-value text-info" id="high20HitRate">0%</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">当前遗漏</div>
                                <div class="stat-value text-primary" id="high20CurrentOmission">0</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">最大连续错</div>
                                <div class="stat-value text-danger" id="high20MaxConsecutive">0</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">超6期次数</div>
                                <div class="stat-value text-warning" id="high20Over5Count">0</div>
                            </div>
                        </div>
                        <div class="col-lg-3 col-md-4 col-sm-6 mb-3">
                            <div class="stat-box">
                                <div class="stat-label">最大遗漏</div>
                                <div class="stat-value" id="high20MaxOmission">0</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 超5期警告 -->
            <div id="high20Over5Alert" class="alert alert-warning" style="display:none;">
                <h6>超过6期连续错误的情况：</h6>
                <div id="high20Over5List"></div>
            </div>

            <!-- 数据表格 -->
            <div class="card">
                <div class="card-header">
                    <h5>高20码分析记录</h5>
                </div>
                <div class="card-body">
                    <div id="high20Loading" class="text-center" style="display:none;">
                        <div class="spinner-border" role="status">
                            <span class="sr-only">加载中...</span>
                        </div>
                    </div>
                    <div id="high20Result"></div>
                    <div id="high20Pagination" class="mt-3"></div>
                </div>
            </div>
        </div>

        <style>
            .stat-box {
                text-align: center;
                padding: 15px;
                border: 1px solid #ddd;
                border-radius: 5px;
                background: #f8f9fa;
            }
            .stat-label {
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
            }
            .over5-row {
                background-color: #fff3cd !important;
            }

            /* 分页样式优化 - 现代化设计 */
            #high20Pagination .pagination {
                display: flex !important;
                flex-direction: row !important;
                justify-content: center !important;
                align-items: center !important;
                margin-bottom: 1.5rem;
                gap: 8px;
                flex-wrap: wrap;
            }

            #high20Pagination .page-item {
                margin: 0;
                display: inline-block;
            }

            #high20Pagination .page-link {
                display: inline-block !important;
                padding: 10px 16px;
                margin: 0;
                border-radius: 8px;
                color: #495057;
                background: linear-gradient(145deg, #ffffff, #f8f9fa);
                border: 2px solid #e9ecef;
                font-weight: 500;
                font-size: 14px;
                min-width: 44px;
                text-align: center;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                white-space: nowrap;
            }

            #high20Pagination .page-link:hover:not(.disabled) {
                background: linear-gradient(145deg, #e3f2fd, #bbdefb);
                border-color: #2196f3;
                color: #1976d2;
                transform: translateY(-2px) scale(1.05);
                box-shadow: 0 4px 12px rgba(33,150,243,0.3);
            }

            #high20Pagination .page-item.active .page-link {
                background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
                border-color: #1976d2;
                color: white;
                font-weight: 600;
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(33,150,243,0.4);
                position: relative;
            }

            #high20Pagination .page-item.active .page-link::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 10px;
                background: linear-gradient(135deg, #64b5f6, #1976d2);
                z-index: -1;
                opacity: 0.3;
                animation: pulse 2s ease-in-out infinite;
            }

            @keyframes pulse {
                0%, 100% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.05); }
            }

            #high20Pagination .page-item.disabled .page-link {
                color: #adb5bd;
                background: linear-gradient(145deg, #f8f9fa, #e9ecef);
                border-color: #dee2e6;
                cursor: not-allowed;
                opacity: 0.6;
            }

            #high20Pagination .page-item.disabled .page-link:hover {
                transform: none;
                box-shadow: 0 2px 4px rgba(0,0,0,0.04);
                background: linear-gradient(145deg, #f8f9fa, #e9ecef);
            }

            /* 省略号样式 */
            #high20Pagination .page-item.disabled span.page-link {
                display: inline-block !important;
                padding: 10px 12px;
                min-width: auto;
            }

            /* 首页/末页按钮特殊样式 */
            #high20Pagination .page-item:first-child .page-link,
            #high20Pagination .page-item:last-child .page-link {
                font-weight: 600;
                padding: 10px 18px;
                background: linear-gradient(145deg, #fff3e0, #ffe0b2);
                border-color: #ffb74d;
                color: #f57c00;
            }

            #high20Pagination .page-item:first-child .page-link:hover:not(.disabled),
            #high20Pagination .page-item:last-child .page-link:hover:not(.disabled) {
                background: linear-gradient(145deg, #ffe0b2, #ffcc80);
                border-color: #ff9800;
                color: #e65100;
                box-shadow: 0 4px 12px rgba(255,152,0,0.3);
            }

            #high20Pagination .page-item:first-child.disabled .page-link,
            #high20Pagination .page-item:last-child.disabled .page-link {
                background: linear-gradient(145deg, #f8f9fa, #e9ecef);
                border-color: #dee2e6;
                color: #adb5bd;
            }

            /* 响应式优化 */
            @media (max-width: 768px) {
                #high20Pagination .page-link {
                    padding: 8px 12px;
                    font-size: 13px;
                    min-width: 38px;
                }
            }
        </style>
    `;

    // 初始化年份选择器
    initYearSelector();

    // 自动加载数据
    loadAnalysis();
}

/**
 * 初始化年份选择器
 */
function initYearSelector() {
    const yearSelect = document.getElementById('high20Year');
    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelect.appendChild(option);
    }
}

/**
 * 加载分析数据
 */
async function loadAnalysis(page = 1) {
    const lotteryType = document.getElementById('high20LotteryType').value;
    const year = document.getElementById('high20Year').value;
    const pageSize = document.getElementById('high20PageSize').value;

    const loading = document.getElementById('high20Loading');
    const resultDiv = document.getElementById('high20Result');

    loading.style.display = 'block';
    resultDiv.innerHTML = '';

    try {
        const params = new URLSearchParams({
            lottery_type: lotteryType,
            page: page,
            page_size: pageSize
        });

        if (year) {
            params.append('year', year);
        }

        const response = await fetch(`${window.BACKEND_URL}/api/high20_analysis?${params}`);
        const data = await response.json();

        loading.style.display = 'none';

        if (data.code === 200) {
            displayResults(data.data.records);
            displayStatistics(data.data.statistics);
            displayOver5Alert(data.data.over5_periods);
            displayPagination(data.data.pagination, page);
        } else {
            resultDiv.innerHTML = `<div class="alert alert-warning">${data.message}</div>`;
        }
    } catch (error) {
        loading.style.display = 'none';
        resultDiv.innerHTML = `<div class="alert alert-danger">加载失败：${error.message}</div>`;
    }
}

/**
 * 显示统计信息
 */
function displayStatistics(stats) {
    const statsCard = document.getElementById('high20Statistics');
    statsCard.style.display = 'block';

    document.getElementById('high20TotalChecked').textContent = stats.total_checked;
    document.getElementById('high20HitCount').textContent = stats.hit_count;
    document.getElementById('high20HitRate').textContent = `${stats.hit_rate}%`;
    document.getElementById('high20CurrentOmission').textContent = stats.current_omission || 0;
    document.getElementById('high20MaxConsecutive').textContent = stats.max_consecutive_miss;
    document.getElementById('high20Over5Count').textContent = stats.over5_count || 0;
    document.getElementById('high20MaxOmission').textContent = stats.max_omission_ever;
}

/**
 * 显示超6期警告
 */
function displayOver5Alert(over5Periods) {
    const alertDiv = document.getElementById('high20Over5Alert');
    const listDiv = document.getElementById('high20Over5List');

    if (!over5Periods || over5Periods.length === 0) {
        alertDiv.style.display = 'none';
        return;
    }

    alertDiv.style.display = 'block';
    let html = '<ul>';
    over5Periods.forEach(item => {
        html += `<li>第<strong>${item.start_period}</strong>期开始，连续错<strong class="text-danger">${item.consecutive_count}</strong>期</li>`;
    });
    html += '</ul>';
    listDiv.innerHTML = html;
}

/**
 * 显示分析结果
 */
function displayResults(records) {
    const resultDiv = document.getElementById('high20Result');

    if (!records || records.length === 0) {
        resultDiv.innerHTML = '<div class="alert alert-info">暂无数据</div>';
        return;
    }

    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover">
                <thead class="thead-light">
                    <tr>
                        <th style="width:8%;">期号</th>
                        <th style="width:48%;">高20码</th>
                        <th style="width:8%;">下期</th>
                        <th style="width:6%;">命中</th>
                        <th style="width:6%;">命中号</th>
                        <th style="width:6%;">遗漏</th>
                        <th style="width:6%;">连错</th>
                        <th style="width:12%;">警告</th>
                    </tr>
                </thead>
                <tbody>
    `;

    records.forEach(record => {
        const hitClass = record.is_hit === 1 ? 'table-success' : '';
        const over5Class = record.over5_alert ? 'over5-row' : '';
        const rowClass = `${hitClass} ${over5Class}`.trim();
        const hitText = record.is_hit === 1 ? '是' : '否';
        const hitNumber = record.hit_number || '-';

        // 格式化高20码显示
        const numbers = record.top20_numbers.split(',');
        const numbersHtml = numbers.map(num => {
            const isHit = parseInt(num) === record.hit_number;
            const numStr = String(num).padStart(2, '0');
            const colorClass = window.getBallColorClass ? window.getBallColorClass(numStr) : '';

            // 命中的号码显示绿色边框高亮，其他号码按波色显示
            if (isHit) {
                return `<span class="badge ${colorClass}" style="border:3px solid #27ae60;box-shadow:0 0 8px rgba(39,174,96,0.6);font-weight:bold;padding:6px 10px;margin:2px;border-radius:6px;">${numStr}</span>`;
            } else {
                return `<span class="badge ${colorClass}" style="padding:6px 10px;margin:2px;border-radius:6px;">${numStr}</span>`;
            }
        }).join(' ');

        const alertHtml = record.over5_alert ?
            `<span class="badge badge-warning">${record.over5_alert}</span>` : '-';

        html += `
            <tr class="${rowClass}">
                <td>${record.period}</td>
                <td>${numbersHtml}</td>
                <td>${record.next_period || '-'}</td>
                <td>${hitText}</td>
                <td>${hitNumber}</td>
                <td>${record.omission}</td>
                <td>${record.consecutive_miss}</td>
                <td>${alertHtml}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    resultDiv.innerHTML = html;
}

/**
 * 显示分页
 */
function displayPagination(pagination, currentPage) {
    const paginationDiv = document.getElementById('high20Pagination');

    if (!pagination || pagination.total_pages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    let html = '<nav aria-label="分页导航"><ul class="pagination justify-content-center mb-3">';

    // 首页
    const isFirstPage = currentPage === 1;
    html += `
        <li class="page-item ${isFirstPage ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${isFirstPage ? 'return false;' : `window.high20Module.loadAnalysis(1); return false;`}" ${isFirstPage ? 'tabindex="-1"' : ''}>
                <span aria-hidden="true">&laquo;&laquo;</span> 首页
            </a>
        </li>
    `;

    // 上一页
    const hasPrev = currentPage > 1;
    html += `
        <li class="page-item ${!hasPrev ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${!hasPrev ? 'return false;' : `window.high20Module.loadAnalysis(${currentPage - 1}); return false;`}" ${!hasPrev ? 'tabindex="-1"' : ''}>
                <span aria-hidden="true">&laquo;</span> 上一页
            </a>
        </li>
    `;

    // 页码按钮
    const maxButtons = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(pagination.total_pages, startPage + maxButtons - 1);

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }

    // 显示省略号（如果起始页不是第1页）
    if (startPage > 1) {
        html += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }

    for (let i = startPage; i <= endPage; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `
            <li class="page-item ${activeClass}">
                <a class="page-link" href="#" onclick="window.high20Module.loadAnalysis(${i}); return false;">
                    ${i}
                </a>
            </li>
        `;
    }

    // 显示省略号（如果结束页不是最后一页）
    if (endPage < pagination.total_pages) {
        html += `
            <li class="page-item disabled">
                <span class="page-link">...</span>
            </li>
        `;
    }

    // 下一页
    const hasNext = currentPage < pagination.total_pages;
    html += `
        <li class="page-item ${!hasNext ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${!hasNext ? 'return false;' : `window.high20Module.loadAnalysis(${currentPage + 1}); return false;`}" ${!hasNext ? 'tabindex="-1"' : ''}>
                下一页 <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;

    // 末页
    const isLastPage = currentPage === pagination.total_pages;
    html += `
        <li class="page-item ${isLastPage ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="${isLastPage ? 'return false;' : `window.high20Module.loadAnalysis(${pagination.total_pages}); return false;`}" ${isLastPage ? 'tabindex="-1"' : ''}>
                末页 <span aria-hidden="true">&raquo;&raquo;</span>
            </a>
        </li>
    `;

    html += '</ul></nav>';
    html += `
        <div class="text-center mt-3">
            <div class="pagination-info-card" style="
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 24px;
                border-radius: 50px;
                font-size: 15px;
                font-weight: 600;
                box-shadow: 0 4px 15px rgba(102,126,234,0.4);
                letter-spacing: 0.5px;
            ">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="vertical-align: text-bottom; margin-right: 8px;">
                    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zM2.5 2a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zM1 10.5A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3zm6.5.5A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3zm1.5-.5a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-3a.5.5 0 0 0-.5-.5h-3z"/>
                </svg>
                <span style="opacity: 0.9;">第</span>
                <span style="font-size: 18px; margin: 0 4px;">${currentPage}</span>
                <span style="opacity: 0.9;">/</span>
                <span style="font-size: 18px; margin: 0 4px;">${pagination.total_pages}</span>
                <span style="opacity: 0.9;">页</span>
                <span style="margin: 0 12px; opacity: 0.5;">|</span>
                <span style="opacity: 0.9;">共</span>
                <span style="font-size: 18px; margin: 0 4px; color: #ffd700;">${pagination.total}</span>
                <span style="opacity: 0.9;">条记录</span>
            </div>
        </div>
    `;

    paginationDiv.innerHTML = html;
}

/**
 * 导出CSV
 */
async function exportData() {
    const lotteryType = document.getElementById('high20LotteryType').value;
    const year = document.getElementById('high20Year').value;

    const params = new URLSearchParams({
        lottery_type: lotteryType
    });

    if (year) {
        params.append('year', year);
    }

    const url = `${window.BACKEND_URL}/api/high20_analysis/export_all?${params}`;
    window.open(url, '_blank');
}

// 导出模块函数
window.high20Module = {
    loadAnalysis,
    exportData
};
