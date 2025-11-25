/**
 * 数据库视图查看器模块
 * 左侧显示视图列表，右侧用标签页显示打开的视图
 */

// 视图名称到中文描述的映射
const VIEW_NAME_MAP = {
    'lottery_animal_matches_optimized': '香开奥',
    'lottery_am_hk_animal_matches':'奥开香',
    'seventh_number_miss_analysis': '奥20码',
    'hk_group_hit_analysis_view': '香20码',
    'lottery_recommend_view': '16码',
    'lottery_analysis_view': '8码',
    'prediction_analysis_view': '三12两相同码',
    'v_lottery_analysis': '双12相同码',
    'zodiac_analysis_view': '三站2肖'
};

// 全局状态
let allViews = []; // 所有视图列表
let openedTabs = []; // 已打开的标签页
let activeTabId = null; // 当前激活的标签页ID
let viewDataCache = {}; // 视图数据缓存

/**
 * 初始化视图查看器
 */
async function initDatabaseViewsPage() {
    const content = `
        <div class="views-container">
            <!-- 左侧视图列表 -->
            <div class="views-sidebar">
                <div class="sidebar-header">
                    <h3>📋 数据库视图</h3>
                    <button id="refreshViewsBtn" class="btn-icon" title="刷新视图列表">
                        🔄
                    </button>
                </div>
                <div class="search-box">
                    <input type="text" id="viewSearchInput" placeholder="搜索视图..." />
                </div>
                <div class="batch-actions">
                    <button id="openAllViewsBtn" class="batch-btn" title="打开所有视图">
                        📂 打开全部
                    </button>
                    <button id="closeAllViewsBtn" class="batch-btn" title="关闭所有已打开的视图">
                        ✖️ 关闭全部
                    </button>
                </div>
                <div id="viewsList" class="views-list">
                    <div class="loading">加载中...</div>
                </div>
            </div>

            <!-- 右侧标签页区域 -->
            <div class="views-content">
                <div class="tabs-header" id="tabsHeader">
                    <div class="no-tabs">
                        请从左侧选择视图
                    </div>
                </div>
                <div class="tabs-body" id="tabsBody">
                    <div class="empty-state">
                        <div class="empty-icon">📊</div>
                        <p>暂无打开的视图</p>
                        <p class="hint">从左侧列表双击视图名称打开</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('databaseViewsPage').innerHTML = content;

    // 添加样式
    addViewerStyles();

    // 绑定事件
    bindEvents();

    // 加载视图列表
    await loadViewsList();
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 刷新按钮
    const refreshBtn = document.getElementById('refreshViewsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadViewsList);
    }

    // 搜索框
    const searchInput = document.getElementById('viewSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterViews);
    }

    // 批量操作按钮
    const openAllBtn = document.getElementById('openAllViewsBtn');
    if (openAllBtn) {
        openAllBtn.addEventListener('click', openAllViews);
    }

    const closeAllBtn = document.getElementById('closeAllViewsBtn');
    if (closeAllBtn) {
        closeAllBtn.addEventListener('click', closeAllViews);
    }
}

/**
 * 加载视图列表
 */
async function loadViewsList() {
    const viewsList = document.getElementById('viewsList');
    viewsList.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`${window.BACKEND_URL}/api/database/views`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '加载视图列表失败');
        }

        allViews = result.data || [];
        renderViewsList(allViews);
    } catch (error) {
        viewsList.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
}

/**
 * 获取视图的显示名称
 * @param {string} viewName - 视图名称
 * @returns {string} 显示名称（映射表中有则返回中文名，否则返回原视图名）
 */
function getViewDisplayName(viewName) {
    return VIEW_NAME_MAP[viewName] || viewName;
}

/**
 * 检查视图是否有中文映射
 * @param {string} viewName - 视图名称
 * @returns {boolean} 是否有映射
 */
function hasChineseMapping(viewName) {
    return !!VIEW_NAME_MAP[viewName];
}

/**
 * 渲染视图列表
 */
function renderViewsList(views) {
    const viewsList = document.getElementById('viewsList');

    if (views.length === 0) {
        viewsList.innerHTML = '<div class="empty">暂无视图</div>';
        return;
    }

    const html = views.map(view => {
        const displayName = getViewDisplayName(view.view_name);
        const hasMapped = hasChineseMapping(view.view_name);

        // 如果有映射：显示中文名（大）+ 英文名（小灰色）
        // 如果无映射：只显示英文名（大），不显示副标题
        return `
            <div class="view-item ${hasMapped ? 'mapped' : 'unmapped'}" data-view="${view.view_name}">
                <div class="view-name">${displayName}</div>
                ${hasMapped ? `<div class="view-comment">${view.view_name}</div>` : ''}
            </div>
        `;
    }).join('');

    viewsList.innerHTML = html;

    // 绑定视图项点击事件
    document.querySelectorAll('.view-item').forEach(item => {
        item.addEventListener('dblclick', () => {
            const viewName = item.dataset.view;
            openViewTab(viewName);
        });
    });
}

/**
 * 过滤视图
 */
function filterViews() {
    const keyword = document.getElementById('viewSearchInput').value.toLowerCase();
    const filtered = allViews.filter(v => {
        const displayName = getViewDisplayName(v.view_name);
        return v.view_name.toLowerCase().includes(keyword) ||
               displayName.toLowerCase().includes(keyword) ||
               (v.view_comment && v.view_comment.toLowerCase().includes(keyword));
    });
    renderViewsList(filtered);
}

/**
 * 一键打开所有视图
 */
async function openAllViews() {
    if (allViews.length === 0) {
        alert('暂无视图可打开');
        return;
    }

    // 显示加载提示
    const openBtn = document.getElementById('openAllViewsBtn');
    const originalText = openBtn.textContent;
    openBtn.disabled = true;
    openBtn.textContent = '⏳ 打开中...';

    try {
        // 依次打开所有视图
        for (const view of allViews) {
            await openViewTab(view.view_name);
            // 添加小延迟，避免同时请求过多
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        console.log(`成功打开 ${allViews.length} 个视图`);
    } catch (error) {
        alert('打开视图时发生错误: ' + error.message);
    } finally {
        openBtn.disabled = false;
        openBtn.textContent = originalText;
    }
}

/**
 * 一键关闭所有视图
 */
function closeAllViews() {
    if (openedTabs.length === 0) {
        return; // 没有打开的视图，静默返回
    }

    const count = openedTabs.length;

    // 清空所有标签页
    openedTabs = [];
    activeTabId = null;
    viewDataCache = {};

    // 更新UI
    renderTabsHeader();
    showEmptyState();

    console.log(`已关闭 ${count} 个视图标签页`);
}

/**
 * 打开视图标签页
 */
async function openViewTab(viewName) {
    // 检查是否已打开
    const existingTab = openedTabs.find(tab => tab.viewName === viewName);
    if (existingTab) {
        switchTab(existingTab.id);
        return;
    }

    // 创建新标签页
    const tabId = `tab_${Date.now()}`;
    const newTab = {
        id: tabId,
        viewName: viewName,
        currentPage: 1,
        pageSize: 100
    };

    openedTabs.push(newTab);
    activeTabId = tabId;

    // 渲染标签页头部和内容
    renderTabsHeader();
    await loadViewData(tabId);
}

/**
 * 渲染标签页头部
 */
function renderTabsHeader() {
    const tabsHeader = document.getElementById('tabsHeader');

    if (openedTabs.length === 0) {
        tabsHeader.innerHTML = '<div class="no-tabs">请从左侧选择视图</div>';
        return;
    }

    const html = openedTabs.map(tab => {
        const displayName = getViewDisplayName(tab.viewName);
        return `
            <div class="tab ${tab.id === activeTabId ? 'active' : ''}" data-tab-id="${tab.id}">
                <span class="tab-title" title="${tab.viewName}">${displayName}</span>
                <button class="tab-close" data-tab-id="${tab.id}">×</button>
            </div>
        `;
    }).join('');

    tabsHeader.innerHTML = html;

    // 绑定标签页点击事件
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchTab(tab.dataset.tabId);
            }
        });
    });

    // 绑定关闭按钮事件
    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(btn.dataset.tabId);
        });
    });
}

/**
 * 切换标签页
 */
function switchTab(tabId) {
    activeTabId = tabId;
    renderTabsHeader();
    renderTabContent(tabId);
}

/**
 * 关闭标签页
 */
function closeTab(tabId) {
    const index = openedTabs.findIndex(tab => tab.id === tabId);
    if (index === -1) return;

    openedTabs.splice(index, 1);
    delete viewDataCache[tabId];

    // 如果关闭的是当前激活的标签页
    if (activeTabId === tabId) {
        if (openedTabs.length > 0) {
            // 切换到前一个或后一个标签页
            const newIndex = Math.max(0, index - 1);
            activeTabId = openedTabs[newIndex].id;
        } else {
            activeTabId = null;
        }
    }

    renderTabsHeader();
    if (activeTabId) {
        renderTabContent(activeTabId);
    } else {
        showEmptyState();
    }
}

/**
 * 显示空状态
 */
function showEmptyState() {
    const tabsBody = document.getElementById('tabsBody');
    tabsBody.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📊</div>
            <p>暂无打开的视图</p>
            <p class="hint">从左侧列表双击视图名称打开</p>
        </div>
    `;
}

/**
 * 加载视图数据
 */
async function loadViewData(tabId) {
    const tab = openedTabs.find(t => t.id === tabId);
    if (!tab) return;

    const tabsBody = document.getElementById('tabsBody');
    tabsBody.innerHTML = '<div class="loading">加载数据中...</div>';

    try {
        const response = await fetch(
            `${window.BACKEND_URL}/api/database/view_data/${tab.viewName}?page=${tab.currentPage}&page_size=${tab.pageSize}`
        );
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || '加载数据失败');
        }

        // 缓存数据
        viewDataCache[tabId] = result;

        // 渲染数据
        renderTabContent(tabId);
    } catch (error) {
        tabsBody.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
}

/**
 * 渲染标签页内容
 */
function renderTabContent(tabId) {
    const data = viewDataCache[tabId];
    if (!data) {
        loadViewData(tabId);
        return;
    }

    const tab = openedTabs.find(t => t.id === tabId);
    const tabsBody = document.getElementById('tabsBody');

    // 获取显示名称
    const displayName = getViewDisplayName(data.view_name);

    // 渲染表格
    const tableHtml = `
        <div class="view-data-container">
            <div class="view-header">
                <h3>${displayName} <small style="color:#999;font-weight:normal;font-size:14px;">(${data.view_name})</small></h3>
                <div class="view-actions">
                    <button class="btn-sm" onclick="refreshViewData('${tabId}')">🔄 刷新</button>
                    <button class="btn-sm" onclick="exportViewData('${tabId}')">📥 导出CSV</button>
                </div>
            </div>

            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${data.columns.map(col => `
                                <th title="${col.column_comment || col.column_name}">
                                    ${col.column_name}
                                    ${col.column_comment ? `<br><small>${col.column_comment}</small>` : ''}
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(row => `
                            <tr>
                                ${data.columns.map(col => `
                                    <td>${formatCellValue(row[col.column_name])}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="pagination">
                <div class="pagination-info">
                    显示 ${(data.pagination.page - 1) * data.pagination.page_size + 1} -
                    ${Math.min(data.pagination.page * data.pagination.page_size, data.pagination.total_count)}
                    / 共 ${data.pagination.total_count} 条
                </div>
                <div class="pagination-controls">
                    <button ${data.pagination.page <= 1 ? 'disabled' : ''}
                            onclick="changePage('${tabId}', ${data.pagination.page - 1})">上一页</button>
                    <span>第 ${data.pagination.page} / ${data.pagination.total_pages} 页</span>
                    <button ${data.pagination.page >= data.pagination.total_pages ? 'disabled' : ''}
                            onclick="changePage('${tabId}', ${data.pagination.page + 1})">下一页</button>
                </div>
            </div>
        </div>
    `;

    tabsBody.innerHTML = tableHtml;
}

/**
 * 格式化单元格值
 */
function formatCellValue(value) {
    if (value === null || value === undefined) {
        return '<span class="null-value">NULL</span>';
    }
    if (typeof value === 'object') {
        return JSON.stringify(value);
    }
    return value;
}

/**
 * 切换页码
 */
window.changePage = function(tabId, page) {
    const tab = openedTabs.find(t => t.id === tabId);
    if (!tab) return;

    tab.currentPage = page;
    delete viewDataCache[tabId]; // 清除缓存
    loadViewData(tabId);
};

/**
 * 刷新视图数据
 */
window.refreshViewData = function(tabId) {
    delete viewDataCache[tabId];
    loadViewData(tabId);
};

/**
 * 导出视图数据为CSV
 */
window.exportViewData = async function(tabId) {
    const data = viewDataCache[tabId];
    if (!data) return;

    // 获取显示名称
    const displayName = getViewDisplayName(data.view_name);

    // CSV头部
    const headers = data.columns.map(col => col.column_name);
    const rows = [headers];

    // CSV数据行
    data.data.forEach(row => {
        const rowData = data.columns.map(col => {
            const value = row[col.column_name];
            if (value === null || value === undefined) return '';
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value);
        });
        rows.push(rowData);
    });

    // 生成CSV内容
    const csvContent = rows.map(row =>
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\r\n');

    // 下载（使用中文名称）
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${displayName}_${data.view_name}_${new Date().getTime()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * 添加样式
 */
function addViewerStyles() {
    if (document.getElementById('databaseViewsStyles')) return;

    const style = document.createElement('style');
    style.id = 'databaseViewsStyles';
    style.textContent = `
        .views-container {
            display: flex;
            height: calc(100vh - 140px);
            gap: 0;
        }

        /* 左侧视图列表 */
        .views-sidebar {
            width: 280px;
            background: #f8f9fa;
            border-right: 1px solid #ddd;
            display: flex;
            flex-direction: column;
        }

        .sidebar-header {
            padding: 15px;
            background: white;
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .sidebar-header h3 {
            margin: 0;
            font-size: 16px;
            color: #333;
        }

        .btn-icon {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 5px;
            border-radius: 4px;
        }

        .btn-icon:hover {
            background: #f0f0f0;
        }

        .search-box {
            padding: 10px;
            background: white;
            border-bottom: 1px solid #ddd;
        }

        .search-box input {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }

        .batch-actions {
            padding: 10px;
            background: white;
            border-bottom: 1px solid #ddd;
            display: flex;
            gap: 8px;
        }

        .batch-btn {
            flex: 1;
            padding: 10px 12px;
            border: 2px solid #007bff;
            background: white;
            color: #007bff;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 600;
            transition: all 0.2s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .batch-btn:hover:not(:disabled) {
            background: #007bff;
            color: white;
            border-color: #0056b3;
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0,123,255,0.3);
        }

        .batch-btn:active:not(:disabled) {
            transform: translateY(0);
            box-shadow: 0 1px 2px rgba(0,123,255,0.2);
        }

        .batch-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            background: #f0f0f0;
            color: #999;
            border-color: #ddd;
        }

        .views-list {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .view-item {
            padding: 12px;
            background: white;
            border-radius: 4px;
            margin-bottom: 8px;
            cursor: pointer;
            border: 1px solid #e0e0e0;
            transition: all 0.2s;
        }

        .view-item:hover {
            border-color: #007bff;
            box-shadow: 0 2px 4px rgba(0,123,255,0.1);
        }

        /* 已映射的视图 */
        .view-item.mapped {
            border-left: 3px solid #28a745;
        }

        /* 未映射的视图 */
        .view-item.unmapped {
            border-left: 3px solid #ffc107;
            opacity: 0.85;
        }

        .view-item.unmapped:hover {
            opacity: 1;
        }

        .view-name {
            font-weight: 600;
            color: #333;
            font-size: 15px;
            margin-bottom: 4px;
        }

        /* 未映射视图的名称样式 */
        .view-item.unmapped .view-name {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #666;
        }

        .view-comment {
            font-size: 11px;
            color: #999;
            font-family: 'Courier New', monospace;
        }

        /* 右侧内容区域 */
        .views-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: white;
        }

        .tabs-header {
            display: flex;
            gap: 4px;
            padding: 10px 10px 0 10px;
            background: #f8f9fa;
            border-bottom: 2px solid #007bff;
            overflow-x: auto;
        }

        .no-tabs {
            padding: 10px;
            color: #999;
            text-align: center;
            width: 100%;
        }

        .tab {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: #e9ecef;
            border: 1px solid #dee2e6;
            border-bottom: none;
            border-radius: 4px 4px 0 0;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
        }

        .tab:hover {
            background: #dee2e6;
        }

        .tab.active {
            background: white;
            border-color: #007bff;
            border-bottom-color: white;
            position: relative;
            z-index: 1;
            margin-bottom: -2px;
        }

        .tab-title {
            font-size: 14px;
            font-weight: 500;
        }

        .tab-close {
            background: none;
            border: none;
            font-size: 18px;
            line-height: 1;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 18px;
            height: 18px;
        }

        .tab-close:hover {
            color: #dc3545;
        }

        .tabs-body {
            flex: 1;
            overflow: auto;
            padding: 20px;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #999;
        }

        .empty-icon {
            font-size: 64px;
            margin-bottom: 20px;
        }

        .empty-state p {
            margin: 10px 0;
        }

        .hint {
            font-size: 14px;
            color: #aaa;
        }

        /* 视图数据容器 */
        .view-data-container {
            max-width: 100%;
        }

        .view-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .view-header h3 {
            margin: 0;
            color: #333;
        }

        .view-actions {
            display: flex;
            gap: 10px;
        }

        .btn-sm {
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            color: #333;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
        }

        .btn-sm:hover {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }

        .btn-sm:active {
            transform: translateY(1px);
        }

        .table-wrapper {
            overflow-x: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
        }

        .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .data-table th {
            background: #1c5fa8;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
            position: sticky;
            top: 0;
            white-space: nowrap;
        }

        .data-table th small {
            font-weight: normal;
            color: rgba(255, 255, 255, 0.8);
            font-size: 11px;
            display: block;
            margin-top: 2px;
        }

        .data-table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e9ecef;
        }

        .data-table tr:hover {
            background: #f8f9fa;
        }

        .null-value {
            color: #999;
            font-style: italic;
        }

        .pagination {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
        }

        .pagination-info {
            font-size: 14px;
            color: #666;
        }

        .pagination-controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .pagination-controls button {
            padding: 6px 12px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
        }

        .pagination-controls button:hover:not(:disabled) {
            background: #007bff;
            color: white;
            border-color: #007bff;
        }

        .pagination-controls button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .loading, .error {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .error {
            color: #dc3545;
        }
    `;

    document.head.appendChild(style);
}

// 导出初始化函数
window.initDatabaseViewsPage = initDatabaseViewsPage;
