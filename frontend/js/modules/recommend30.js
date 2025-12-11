/**
 * 推荐30码模块
 * 功能：展示推荐30码的生成、查询、命中统计和周统计
 */

/**
 * 初始化推荐30码页面
 */
export function initRecommend30Page() {
    const content = document.getElementById('recommend30Page');
    content.innerHTML = `
        <style>
            /* 推荐30码页面样式优化 */
            #recommend30Page .pagination {
                display: flex !important;
                flex-wrap: wrap !important;
                list-style: none !important;
                padding-left: 0 !important;
                margin: 15px 0 !important;
            }

            #recommend30Page .pagination .page-item {
                margin: 0 2px !important;
                list-style: none !important;
            }

            #recommend30Page .pagination .page-link {
                display: block !important;
                padding: 0.5rem 0.75rem !important;
                line-height: 1.25 !important;
                color: #007bff !important;
                background-color: #fff !important;
                border: 1px solid #dee2e6 !important;
                border-radius: 0.25rem !important;
                text-decoration: none !important;
                transition: all 0.3s ease !important;
            }

            #recommend30Page .pagination .page-link:hover {
                z-index: 2 !important;
                color: #0056b3 !important;
                background-color: #e9ecef !important;
                border-color: #dee2e6 !important;
                transform: translateY(-2px) !important;
                box-shadow: 0 2px 8px rgba(0,123,255,0.2) !important;
            }

            #recommend30Page .pagination .page-item.active .page-link {
                z-index: 3 !important;
                color: #fff !important;
                background-color: #007bff !important;
                border-color: #007bff !important;
                font-weight: bold !important;
                box-shadow: 0 2px 8px rgba(0,123,255,0.3) !important;
            }

            /* 标签页样式优化 */
            #recommend30Page .nav-tabs {
                border-bottom: 2px solid #dee2e6 !important;
                display: flex !important;
                flex-wrap: wrap !important;
                list-style: none !important;
                padding-left: 0 !important;
                margin-bottom: 20px !important;
            }

            #recommend30Page .nav-tabs .nav-item {
                margin-bottom: -2px !important;
                margin-right: 10px !important;
                list-style: none !important;
            }

            #recommend30Page .nav-tabs .nav-link {
                display: block !important;
                padding: 0.75rem 1.5rem !important;
                border: 2px solid transparent !important;
                border-radius: 0.5rem 0.5rem 0 0 !important;
                color: #6c757d !important;
                background-color: #f8f9fa !important;
                text-decoration: none !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
            }

            #recommend30Page .nav-tabs .nav-link:hover {
                border-color: #e9ecef !important;
                color: #495057 !important;
                background-color: #e9ecef !important;
                transform: translateY(-2px) !important;
            }

            #recommend30Page .nav-tabs .nav-link.active {
                color: #007bff !important;
                background-color: #fff !important;
                border-color: #dee2e6 #dee2e6 #fff !important;
                font-weight: 600 !important;
                box-shadow: 0 -2px 8px rgba(0,123,255,0.15) !important;
            }

            /* 按钮区域优化 */
            #recommend30Page .btn {
                margin-right: 5px !important;
                margin-bottom: 5px !important;
                transition: all 0.3s ease !important;
                font-weight: 500 !important;
                border-radius: 0.375rem !important;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
            }

            #recommend30Page .btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.15) !important;
            }

                        /* 二维码弹窗样式 */
            .qrcode-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                z-index: 1050;
                justify-content: center;
                align-items: center;
            }

            .qrcode-modal.active {
                display: flex;
            }

            .qrcode-content {
                background-color: white;
                border-radius: 10px;
                padding: 20px;
                max-width: 300px;
                width: 90%;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            }

            .qrcode-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
            }

            .qrcode-title {
                font-size: 18px;
                font-weight: bold;
                color: #333;
            }

            .qrcode-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
            }

            .qrcode-close:hover {
                color: #333;
            }

            .qrcode-body {
                text-align: center;
            }

            #qrcodeCanvas {
                border: 1px solid #eee;
                background: white;
                margin: 0 auto 10px;
                display: block;
            }

            .qrcode-info {
                font-size: 12px;
                color: #999;
                margin-top: 10px;
            }
        </style>

        <!-- 二维码弹窗 -->
        <div id="qrcodeModal" class="qrcode-modal">
            <div class="qrcode-content">
                <div class="qrcode-header">
                    <div class="qrcode-title">扫码查看号码</div>
                    <button class="qrcode-close" onclick="window.recommend30Module.closeQRCode()">&times;</button>
                </div>
                <div class="qrcode-body">
                    <canvas id="qrcodeCanvas"></canvas>
                    <div id="qrcodeText" class="qrcode-text"></div>
                    <div class="qrcode-info">使用微信扫码查看号码信息</div>
                </div>
            </div>
        </div>

        <div class="container-fluid">
            <h2 class="mb-4">推荐30码分析</h2>

            <!-- 操作按钮区 -->
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-4">
                            <label>选择彩种：</label>
                            <select id="recommend30LotteryType" class="form-control">
                                <option value="am">澳门</option>
                                <option value="hk">香港</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label>年份筛选：</label>
                            <select id="recommend30Year" class="form-control">
                                <option value="">全部年份</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label>&nbsp;</label>
                            <div>
                                <button class="btn btn-primary" onclick="window.recommend30Module.generateRecommend30()">
                                    生成推荐30码
                                </button>
                                <button class="btn btn-info" onclick="window.recommend30Module.loadHistory()">
                                    查询历史
                                </button>
                                <button class="btn btn-success" onclick="window.recommend30Module.loadWeekStats()">
                                    周统计
                                </button>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label>&nbsp;</label>
                            <div>
                                <button class="btn btn-danger" onclick="window.recommend30Module.loadMissAnalysis()">
                                    查询遗漏期数
                                </button>
                                <button class="btn btn-warning" onclick="window.recommend30Module.exportData()">
                                    导出CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab切换 -->
            <ul class="nav nav-tabs mb-3" id="recommend30Tabs">
                <li class="nav-item">
                    <a class="nav-link active" data-tab="history" href="#" onclick="window.recommend30Module.switchTab('history'); return false;">
                        历史记录
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-tab="weekStats" href="#" onclick="window.recommend30Module.switchTab('weekStats'); return false;">
                        周统计
                    </a>
                </li>
                <li class="nav-item">
                    <a class="nav-link" data-tab="missAnalysis" href="#" onclick="window.recommend30Module.switchTab('missAnalysis'); return false;">
                        遗漏分析
                    </a>
                </li>
            </ul>

            <!-- 历史记录 Tab -->
            <div id="historyTab" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h5>推荐30码历史记录</h5>
                    </div>
                    <div class="card-body">
                        <div id="recommend30HistoryLoading" class="text-center" style="display:none;">
                            <div class="spinner-border" role="status">
                                <span class="sr-only">加载中...</span>
                            </div>
                        </div>
                        <div id="recommend30HistoryResult"></div>
                        <div id="recommend30HistoryPagination" class="mt-3"></div>
                    </div>
                </div>
            </div>

            <!-- 周统计 Tab -->
            <div id="weekStatsTab" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <h5>按周统计（每周错误次数不超过2次）</h5>
                    </div>
                    <div class="card-body">
                        <div id="weekStatsLoading" class="text-center" style="display:none;">
                            <div class="spinner-border" role="status">
                                <span class="sr-only">加载中...</span>
                            </div>
                        </div>
                        <div id="weekStatsResult"></div>
                    </div>
                </div>
            </div>

            <!-- 遗漏分析 Tab -->
            <div id="missAnalysisTab" class="tab-content" style="display:none;">
                <div class="card">
                    <div class="card-header">
                        <h5>遗漏期数分析（仅显示未命中的期数）</h5>
                    </div>
                    <div class="card-body">
                        <div id="missAnalysisLoading" class="text-center" style="display:none;">
                            <div class="spinner-border" role="status">
                                <span class="sr-only">加载中...</span>
                            </div>
                        </div>
                        <div id="missAnalysisResult"></div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 初始化年份选择器
    const yearSelect = document.getElementById('recommend30Year');
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 5; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }

    // 暴露函数到window对象
    window.recommend30Module = {
        generateRecommend30,
        loadHistory,
        loadWeekStats,
        loadMissAnalysis,
        exportData,
        switchTab,
        showQRCode,      // 新增
        closeQRCode      // 新增
    };

    // 默认加载历史记录
    loadHistory();
}

/**
 * 切换Tab
 */
function switchTab(tab) {
    // 更新Tab样式
    document.querySelectorAll('#recommend30Tabs .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`#recommend30Tabs [data-tab="${tab}"]`).classList.add('active');

    // 显示对应内容
    document.getElementById('historyTab').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('weekStatsTab').style.display = tab === 'weekStats' ? 'block' : 'none';
    document.getElementById('missAnalysisTab').style.display = tab === 'missAnalysis' ? 'block' : 'none';

    // 加载数据
    if (tab === 'history') {
        loadHistory();
    } else if (tab === 'weekStats') {
        loadWeekStats();
    } else if (tab === 'missAnalysis') {
        loadMissAnalysis();
    }
}

/**
 * 生成推荐30码
 */
async function generateRecommend30() {
    const lotteryType = document.getElementById('recommend30LotteryType').value;

    if (!confirm(`确定要为【${lotteryType === 'am' ? '澳门' : '香港'}】生成推荐30码吗？\n这将为所有期号生成推荐数据。`)) {
        return;
    }

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/recommend30/generate?lottery_type=${lotteryType}`);
        const data = await response.json();

        if (data.success) {
            alert(`生成成功！\n共生成 ${data.generated_count} 期推荐30码`);
            loadHistory();  // 刷新历史记录
        } else {
            alert('生成失败：' + (data.message || '未知错误'));
        }
    } catch (error) {
        console.error('生成推荐30码失败:', error);
        alert('生成失败，请检查网络连接');
    }
}

/**
 * 加载历史记录
 */
async function loadHistory(page = 1) {
    const lotteryType = document.getElementById('recommend30LotteryType').value;
    const year = document.getElementById('recommend30Year').value;
    const pageSize = 50;

    const loading = document.getElementById('recommend30HistoryLoading');
    const resultDiv = document.getElementById('recommend30HistoryResult');
    const paginationDiv = document.getElementById('recommend30HistoryPagination');

    loading.style.display = 'block';
    resultDiv.innerHTML = '';
    paginationDiv.innerHTML = '';

    try {
        let url = `${window.BACKEND_URL}/api/recommend30/history?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`;
        if (year) {
            url += `&year=${year}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        loading.style.display = 'none';

        if (data.success && data.data.length > 0) {
            renderHistoryTable(data.data, resultDiv);
            renderPagination(data.pagination, paginationDiv, page);
        } else {
            resultDiv.innerHTML = '<p class="text-center text-muted">暂无数据</p>';
        }
    } catch (error) {
        loading.style.display = 'none';
        console.error('加载历史记录失败:', error);
        resultDiv.innerHTML = '<p class="text-danger text-center">加载失败，请检查网络连接</p>';
    }
}

/**
 * 渲染历史记录表格
 */
function renderHistoryTable(data, container) {
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="thead-light">
                    <tr>
                        <th>期号</th>
                        <th>推荐30码</th>
                        <th>操作</th>
                        <th>下一期</th>
                        <th>第7码</th>
                        <th>命中状态</th>
                        <th>当前遗漏</th>
                        <th>最大遗漏</th>
                        <th>周信息</th>
                        <th>生成时间</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(row => {
        // 处理推荐号码显示
        const numbers = row.recommend_numbers.split(',').map(n => parseInt(n));
        const numbersHtml = numbers.map(num => {
            const colorClass = window.getBallColorClass(num);
            return `<span class="badge ${colorClass} mr-1">${num}</span>`;
        }).join('');

        // 命中状态颜色
        let statusBadge = '-';
        if (row.is_hit === 1) {
            statusBadge = '<span class="badge badge-success">命中</span>';
        } else if (row.is_hit === 0) {
            statusBadge = '<span class="badge badge-danger">遗漏</span>';
        }

        // 第7码显示
        let seventhNumHtml = '-';
        if (row.next_number) {
            const colorClass = window.getBallColorClass(row.next_number);
            seventhNumHtml = `<span class="badge ${colorClass}">${row.next_number}</span>`;
        }

        // 周信息
        const weekInfo = row.week_year && row.week_number
            ? `${row.week_year}年第${row.week_number}周`
            : '-';

        html += `
            <tr>
                <td>${row.period}</td>
                <td>${numbersHtml}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" 
                            onclick="window.recommend30Module.showQRCode('${row.period}', '${row.recommend_numbers}')"
                            title="查看二维码">
                        <i class="fas fa-qrcode"></i> 二维码
                    </button>
                </td>
                <td>${row.next_period || '-'}</td>
                <td class="text-center">${seventhNumHtml}</td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center">${row.miss_count}</td>
                <td class="text-center">${row.max_miss}</td>
                <td>${weekInfo}</td>
                <td>${row.created_at || '-'}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
} 
/**
 * 显示二维码弹窗
 */
function showQRCode(period, numbers) {
    const normalizedNumbers = String(numbers || '')
        .replace(/\\'/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
    const qrContent = `${period || ''}:${normalizedNumbers}`;

    const modalHTML = `
        <div id="qrcodeModal" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            display: flex;
            justify-content: center;
            align-items: center;
        ">
            <div style="
                background: #ffffff;
                padding: 25px;
                border-radius: 10px;
                text-align: center;
                max-width: 90vw;
            ">
                <h5 style="margin-bottom: 15px;">Period: ${period}</h5>

                <div id="recommend30Qr" style="
                    width: 220px;
                    height: 220px;
                    border: 2px solid #eee;
                    border-radius: 5px;
                    margin: 0 auto 10px auto;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #fff;
                "></div>

                <div style="margin: 15px 0; font-size: 13px; color: #666;">
                    <div>Scan with WeChat or any QR app</div>
                    <div style="font-size: 11px; color: #999; margin-top: 5px;">
                        Tips:<br>
                        1. Ensure network access<br>
                        2. Screenshot and scan if needed<br>
                        3. Copy numbers manually if scanning fails
                    </div>
                </div>

                <div style="
                    background: #f8f9fa;
                    padding: 10px;
                    border-radius: 5px;
                    margin: 10px 0;
                    text-align: left;
                    max-height: 120px;
                    overflow-y: auto;
                    font-size: 13px;
                    word-break: break-all;
                ">
                    <div><strong>Period:</strong> ${period}</div>
                    <div><strong>Recommended Numbers:</strong></div>
                    <div style="color: #333;">${normalizedNumbers || '-'}</div>
                </div>

                <button onclick="document.getElementById('qrcodeModal').remove()" style="
                    padding: 8px 25px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                ">Close</button>
            </div>
        </div>
    `;

    const oldModal = document.getElementById('qrcodeModal');
    if (oldModal) oldModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const qrContainer = document.getElementById('recommend30Qr');
    if (qrContainer) {
        if (window.QRTool) {
            window.QRTool.render(qrContainer, qrContent, 200);
        } else {
            qrContainer.innerHTML = '<span style="color:#dc3545;">QR tool unavailable</span>';
        }
    }
}


function closeQRCode() {
    const modal = document.getElementById('qrcodeModal');
    if (modal) {
        modal.classList.remove('active');
    }
}


/**
 * 绘制定位方块
 */
function drawPositionSquare(ctx, x, y, size) {
    const cellSize = 4;
    
    // 外层黑色
    ctx.fillStyle = '#000000';
    ctx.fillRect(x, y, size * cellSize, size * cellSize);
    
    // 内层白色
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + cellSize, y + cellSize, (size - 2) * cellSize, (size - 2) * cellSize);
    
    // 中心黑色
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 2 * cellSize, y + 2 * cellSize, (size - 4) * cellSize, (size - 4) * cellSize);
}

/**
 * 渲染分页
 */
function renderPagination(pagination, container, currentPage) {
    const { total_pages } = pagination;

    if (total_pages <= 1) return;

    let html = '<nav><ul class="pagination justify-content-center">';

    // 上一页
    if (currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.recommend30Module.loadHistory(${currentPage - 1}); return false;">上一页</a></li>`;
    }

    // 页码
    const maxPages = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(total_pages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="window.recommend30Module.loadHistory(${i}); return false;">${i}</a></li>`;
    }

    // 下一页
    if (currentPage < total_pages) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.recommend30Module.loadHistory(${currentPage + 1}); return false;">下一页</a></li>`;
    }

    html += '</ul></nav>';
    container.innerHTML = html;
}

/**
 * 加载周统计
 */
async function loadWeekStats() {
    const lotteryType = document.getElementById('recommend30LotteryType').value;
    const year = document.getElementById('recommend30Year').value;

    const loading = document.getElementById('weekStatsLoading');
    const resultDiv = document.getElementById('weekStatsResult');

    loading.style.display = 'block';
    resultDiv.innerHTML = '';

    try {
        let url = `${window.BACKEND_URL}/api/recommend30/week_stats?lottery_type=${lotteryType}`;
        if (year) {
            url += `&year=${year}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        loading.style.display = 'none';

        if (data.success && data.data.length > 0) {
            renderWeekStatsTable(data.data, resultDiv);
        } else {
            resultDiv.innerHTML = '<p class="text-center text-muted">暂无数据</p>';
        }
    } catch (error) {
        loading.style.display = 'none';
        console.error('加载周统计失败:', error);
        resultDiv.innerHTML = '<p class="text-danger text-center">加载失败，请检查网络连接</p>';
    }
}

/**
 * 渲染周统计表格
 */
function renderWeekStatsTable(data, container) {
    let html = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="thead-light">
                    <tr>
                        <th>周标识</th>
                        <th>总期数</th>
                        <th>命中次数</th>
                        <th>错误次数</th>
                        <th>命中率</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.forEach(row => {
        // 状态徽章
        const statusBadge = row.is_exceed
            ? '<span class="badge badge-danger">超标</span>'
            : '<span class="badge badge-success">正常</span>';

        // 错误次数颜色
        const missClass = row.miss_count > 2 ? 'text-danger font-weight-bold' : '';

        html += `
            <tr class="${row.is_exceed ? 'table-danger' : ''}">
                <td>${row.week_label}</td>
                <td class="text-center">${row.total_count}</td>
                <td class="text-center text-success">${row.hit_count}</td>
                <td class="text-center ${missClass}">${row.miss_count}</td>
                <td class="text-center">${row.hit_rate}</td>
                <td class="text-center">${statusBadge}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>

        <div class="alert alert-info mt-3">
            <strong>说明：</strong>每周错误次数不能超过2次。红色标记为超标周。
        </div>
    `;

    container.innerHTML = html;
}

/**
 * 加载遗漏分析
 */
async function loadMissAnalysis(page = 1) {
    const lotteryType = document.getElementById('recommend30LotteryType').value;
    const year = document.getElementById('recommend30Year').value;
    const pageSize = 50;

    const loading = document.getElementById('missAnalysisLoading');
    const resultDiv = document.getElementById('missAnalysisResult');

    loading.style.display = 'block';
    resultDiv.innerHTML = '';

    try {
        let url = `${window.BACKEND_URL}/api/recommend30/miss_analysis?lottery_type=${lotteryType}&page=${page}&page_size=${pageSize}`;
        if (year) {
            url += `&year=${year}`;
        }

        const response = await fetch(url);
        const data = await response.json();

        loading.style.display = 'none';

        if (data.success && data.data.length > 0) {
            renderMissAnalysisTable(data.data, resultDiv);
            // 添加分页控件
            if (data.pagination && data.pagination.total_pages > 1) {
                renderMissAnalysisPagination(data.pagination, resultDiv, page);
            }
        } else {
            resultDiv.innerHTML = '<p class="text-center text-muted">暂无数据</p>';
        }
    } catch (error) {
        loading.style.display = 'none';
        console.error('加载遗漏分析失败:', error);
        resultDiv.innerHTML = '<p class="text-danger text-center">加载失败，请检查网络连接</p>';
    }
}

/**
 * 渲染遗漏分析表格
 */
/**
 * 渲染遗漏分析表格
 */
function renderMissAnalysisTable(data, container) {
    console.log('渲染遗漏分析表格数据:', data); // 调试用
    
    let html = `
        <div class="alert alert-warning">
            <strong>说明：</strong>
            <ul class="mb-0">
                <li><strong>本页面只显示遗漏的期数</strong>（未命中推荐30码的记录）</li>
                <li><strong>当前遗漏：</strong>从上次命中到当前的连续遗漏期数</li>
                <li><strong>最大遗漏：</strong>历史上最大的连续遗漏期数（算法目标：≤2）</li>
                <li>红色背景表示遗漏记录</li>
            </ul>
        </div>

        <div class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="thead-light">
                    <tr>
                        <th>期号</th>
                        <th>推荐30码</th>
                        <th>操作</th>
                        <th>下一期</th>
                        <th>第7码</th>
                        <th>遗漏状态</th>
                        <th>当前遗漏</th>
                        <th>最大遗漏</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (!data || data.length === 0) {
        html += `
            <tr>
                <td colspan="8" class="text-center text-muted">
                    暂无遗漏分析数据
                </td>
            </tr>
        `;
    } else {
        data.forEach((row, index) => {
            console.log(`处理第${index}行数据:`, row); // 调试用
            
            // 检查 recommend_numbers 是否存在
            const numbersStr = row.recommend_numbers || '';
            
            // 处理推荐号码显示（添加空值检查）
            let numbersHtml = '-';
            if (numbersStr && numbersStr.trim() !== '') {
                try {
                    const numbers = numbersStr.split(',').map(n => {
                        const num = parseInt(n.trim());
                        return isNaN(num) ? null : num;
                    }).filter(n => n !== null);
                    
                    if (numbers.length > 0) {
                        numbersHtml = numbers.map(num => {
                            const colorClass = window.getBallColorClass ? window.getBallColorClass(num) : 'badge-secondary';
                            return `<span class="badge ${colorClass} mr-1">${num}</span>`;
                        }).join('');
                    }
                } catch (error) {
                    console.error('处理号码错误:', error, '行数据:', row);
                    numbersHtml = `<span class="text-danger">数据异常</span>`;
                }
            }

            // 命中状态颜色
            const rowClass = (row.is_hit === 1) ? 'table-success' : 'table-danger';
            const statusBadge = (row.is_hit === 1)
                ? '<span class="badge badge-success">命中</span>'
                : '<span class="badge badge-danger">遗漏</span>';

            // 第7码显示
            let seventhNumHtml = '-';
            if (row.next_number) {
                const colorClass = window.getBallColorClass ? window.getBallColorClass(row.next_number) : 'badge-secondary';
                seventhNumHtml = `<span class="badge ${colorClass}">${row.next_number}</span>`;
            }

            // 最大遗漏颜色（超过2次标红）
            const maxMissClass = (row.max_miss > 2) ? 'text-danger font-weight-bold' : '';

            // 转义单引号，防止onclick中断
            const escapedNumbers = (numbersStr || '').replace(/'/g, "\\'");
            
            html += `
                <tr class="${rowClass}">
                    <td>${row.period || '-'}</td>
                    <td>${numbersHtml}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.recommend30Module.showQRCode('${row.period || ''}', '${escapedNumbers}')"
                                title="查看二维码" ${!numbersStr ? 'disabled' : ''}>
                            二维码
                        </button>
                    </td>
                    <td>${row.next_period || '-'}</td>
                    <td class="text-center">${seventhNumHtml}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-center">${row.miss_count || 0}</td>
                    <td class="text-center ${maxMissClass}">${row.max_miss || 0}</td>
                </tr>
            `;
        });
    }

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

/**
 * 渲染遗漏分析分页
 */
function renderMissAnalysisPagination(pagination, container, currentPage) {
    const { total_pages } = pagination;

    if (total_pages <= 1) return;

    let html = '<nav class="mt-3"><ul class="pagination justify-content-center">';

    // 上一页
    if (currentPage > 1) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.recommend30Module.loadMissAnalysis(${currentPage - 1}); return false;">上一页</a></li>`;
    }

    // 页码
    const maxPages = 10;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(total_pages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
        const active = i === currentPage ? 'active' : '';
        html += `<li class="page-item ${active}"><a class="page-link" href="#" onclick="window.recommend30Module.loadMissAnalysis(${i}); return false;">${i}</a></li>`;
    }

    // 下一页
    if (currentPage < total_pages) {
        html += `<li class="page-item"><a class="page-link" href="#" onclick="window.recommend30Module.loadMissAnalysis(${currentPage + 1}); return false;">下一页</a></li>`;
    }

    html += '</ul></nav>';
    container.innerHTML += html;
}

/**
 * 导出数据
 */
async function exportData() {
    const lotteryType = document.getElementById('recommend30LotteryType').value;
    const year = document.getElementById('recommend30Year').value;

    let url = `${window.BACKEND_URL}/api/recommend30/export?lottery_type=${lotteryType}`;
    if (year) {
        url += `&year=${year}`;
    }

    try {
        window.open(url, '_blank');
    } catch (error) {
        console.error('导出失败:', error);
        alert('导出失败，请检查网络连接');
    }
}
