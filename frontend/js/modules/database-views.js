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
    'zodiac_analysis_view': '三站2肖',
    'three_stations_non_repeat_stats_simple': '3站非重复统计',
    'two_stations_non_repeat_stats_simple': '两站非重复统计'

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
        <!-- QR Code Modal -->
        <div id="db-view-qr-modal" class="qr-modal" style="display:none;">
            <div class="qr-modal-content">
                <span class="qr-modal-close">&times;</span>
                <div id="db-view-qr-code"></div>
                <p id="db-view-qr-text"></p>
            </div>
        </div>
    `;

    document.getElementById('databaseViewsPage').innerHTML = content;

    // 添加样式
    addViewerStyles();

    // 绑定事件
    bindDatabaseViewsEvents();

    // 加载视图列表
    await loadViewsList();
}

/**
 * 绑定事件
 */
function bindDatabaseViewsEvents() {
    const refreshBtn = document.getElementById('refreshViewsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadViewsList);
    }

    const searchInput = document.getElementById('viewSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterViews);
    }

    const openAllBtn = document.getElementById('openAllViewsBtn');
    if (openAllBtn) {
        openAllBtn.addEventListener('click', openAllViews);
    }

    const closeAllBtn = document.getElementById('closeAllViewsBtn');
    if (closeAllBtn) {
        closeAllBtn.addEventListener('click', closeAllViews);
    }
    
    // QR Code Modal Events
    const modal = document.getElementById('db-view-qr-modal');
    const closeBtn = modal.querySelector('.qr-modal-close');
    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

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

function getViewDisplayName(viewName) {
    return VIEW_NAME_MAP[viewName] || viewName;
}

function hasChineseMapping(viewName) {
    return !!VIEW_NAME_MAP[viewName];
}

function renderViewsList(views) {
    const viewsList = document.getElementById('viewsList');

    if (views.length === 0) {
        viewsList.innerHTML = '<div class="empty">暂无视图</div>';
        return;
    }

    const html = views.map(view => {
        const displayName = getViewDisplayName(view.view_name);
        const hasMapped = hasChineseMapping(view.view_name);

        return `
            <div class="view-item ${hasMapped ? 'mapped' : 'unmapped'}" data-view="${view.view_name}">
                <div class="view-name">${displayName}</div>
                ${hasMapped ? `<div class="view-comment">${view.view_name}</div>` : ''}
            </div>
        `;
    }).join('');

    viewsList.innerHTML = html;

    document.querySelectorAll('.view-item').forEach(item => {
        item.addEventListener('dblclick', () => {
            const viewName = item.dataset.view;
            openViewTab(viewName);
        });
    });
}

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

async function openAllViews() {
    if (allViews.length === 0) {
        alert('暂无视图可打开');
        return;
    }

    const openBtn = document.getElementById('openAllViewsBtn');
    const originalText = openBtn.textContent;
    openBtn.disabled = true;
    openBtn.textContent = '⏳ 打开中...';

    try {
        for (const view of allViews) {
            await openViewTab(view.view_name);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    } catch (error) {
        alert('打开视图时发生错误: ' + error.message);
    } finally {
        openBtn.disabled = false;
        openBtn.textContent = originalText;
    }
}

function closeAllViews() {
    if (openedTabs.length === 0) return;
    openedTabs = [];
    activeTabId = null;
    viewDataCache = {};
    renderTabsHeader();
    showEmptyState();
}

async function openViewTab(viewName) {
    const existingTab = openedTabs.find(tab => tab.viewName === viewName);
    if (existingTab) {
        switchTab(existingTab.id);
        return;
    }

    const tabId = `tab_${Date.now()}`;
    const newTab = { id: tabId, viewName: viewName, currentPage: 1, pageSize: 100 };

    openedTabs.push(newTab);
    activeTabId = tabId;

    renderTabsHeader();
    await loadViewData(tabId);
}

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

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (!e.target.classList.contains('tab-close')) {
                switchTab(tab.dataset.tabId);
            }
        });
    });

    document.querySelectorAll('.tab-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeTab(btn.dataset.tabId);
        });
    });
}

function switchTab(tabId) {
    activeTabId = tabId;
    renderTabsHeader();
    renderTabContent(tabId);
}

function closeTab(tabId) {
    const index = openedTabs.findIndex(tab => tab.id === tabId);
    if (index === -1) return;

    openedTabs.splice(index, 1);
    delete viewDataCache[tabId];

    if (activeTabId === tabId) {
        activeTabId = openedTabs.length > 0 ? openedTabs[Math.max(0, index - 1)].id : null;
    }

    renderTabsHeader();
    if (activeTabId) {
        renderTabContent(activeTabId);
    } else {
        showEmptyState();
    }
}

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
        if (!result.success) throw new Error(result.message || '加载数据失败');
        viewDataCache[tabId] = result;
        renderTabContent(tabId);
    } catch (error) {
        tabsBody.innerHTML = `<div class="error">加载失败: ${error.message}</div>`;
    }
}

function renderTabContent(tabId) {
    const data = viewDataCache[tabId];
    if (!data) {
        loadViewData(tabId);
        return;
    }

    const tab = openedTabs.find(t => t.id === tabId);
    const tabsBody = document.getElementById('tabsBody');
    const displayName = getViewDisplayName(data.view_name);

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
                            ${data.columns.map(col => `<th title="${col.column_comment || col.column_name}">${col.column_name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.data.map(row => `
                            <tr>
                                ${data.columns.map(col => `
                                    <td class="cell-content">${formatCellValue(row[col.column_name], col.column_name)}</td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pagination">
                <div class="pagination-info">
                    显示 ${(data.pagination.page - 1) * data.pagination.page_size + 1} - ${Math.min(data.pagination.page * data.pagination.page_size, data.pagination.total_count)} / 共 ${data.pagination.total_count} 条
                </div>
                <div class="pagination-controls">
                    <button ${data.pagination.page <= 1 ? 'disabled' : ''} onclick="changePage('${tabId}', ${data.pagination.page - 1})">上一页</button>
                    <span>第 ${data.pagination.page} / ${data.pagination.total_pages} 页</span>
                    <button ${data.pagination.page >= data.pagination.total_pages ? 'disabled' : ''} onclick="changePage('${tabId}', ${data.pagination.page + 1})">下一页</button>
                </div>
            </div>
        </div>`;

    tabsBody.innerHTML = tableHtml;
    
    // Add event listener for QR code icons
    tabsBody.querySelector('.data-table').addEventListener('click', function(e) {
        if (e.target.classList.contains('qr-icon')) {
            const text = e.target.dataset.text;
            if (text) {
                const modal = document.getElementById('db-view-qr-modal');
                const qrCodeDiv = document.getElementById('db-view-qr-code');
                const qrTextP = document.getElementById('db-view-qr-text');
                
                qrCodeDiv.innerHTML = '';
                QRTool.render(qrCodeDiv, text, 200);
                qrTextP.textContent = `内容: ${text}`;
                modal.style.display = 'block';
            }
        }
    });
}

function formatCellValue(value, columnName) {
    if (value === null || value === undefined) {
        return '<span class="null-value">NULL</span>';
    }
    const strValue = String(value);
    
    // Only add QR code to non-empty cells that contain numbers separated by commas, or just numbers.
    const hasNumbers = /[0-9]/.test(strValue);
    const likelyNumbers = /^[0-9,]+$/.test(strValue);

    let qrIcon = '';
    if (hasNumbers && likelyNumbers && strValue.length > 0) {
        qrIcon = `<span class="qr-icon" data-text="${strValue}" title="生成二维码"></span>`;
    }
    
    return `<div>${strValue}${qrIcon}</div>`;
}

window.changePage = function(tabId, page) {
    const tab = openedTabs.find(t => t.id === tabId);
    if (!tab) return;
    tab.currentPage = page;
    loadViewData(tabId);
};

window.refreshViewData = function(tabId) {
    loadViewData(tabId);
};

window.exportViewData = async function(tabId) {
    const data = viewDataCache[tabId];
    if (!data) return;
    const displayName = getViewDisplayName(data.view_name);
    const headers = data.columns.map(col => col.column_name);
    const rows = [headers, ...data.data.map(row => data.columns.map(col => row[col.column_name]))];
    downloadCSV(rows, `${displayName}_${data.view_name}.csv`);
};

function addViewerStyles() {
    if (document.getElementById('databaseViewsStyles')) return;
    const style = document.createElement('style');
    style.id = 'databaseViewsStyles';
    style.textContent = `
        .views-container { display: flex; height: calc(100vh - 140px); gap: 0; }
        .views-sidebar { width: 280px; background: #f8f9fa; border-right: 1px solid #ddd; display: flex; flex-direction: column; }
        .sidebar-header { padding: 15px; background: white; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h3 { margin: 0; font-size: 16px; }
        .btn-icon { background: none; border: none; font-size: 16px; cursor: pointer; padding: 5px; border-radius: 4px; }
        .btn-icon:hover { background: #f0f0f0; }
        .search-box { padding: 10px; background: white; border-bottom: 1px solid #ddd; }
        .search-box input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        .batch-actions { padding: 10px; background: white; border-bottom: 1px solid #ddd; display: flex; gap: 8px; }
        .batch-btn { flex: 1; padding: 10px 12px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
        .batch-btn:hover:not(:disabled) { background: #007bff; color: white; transform: translateY(-2px); }
        .views-list { flex: 1; overflow-y: auto; padding: 10px; }
        .view-item { padding: 12px; background: white; border-radius: 4px; margin-bottom: 8px; cursor: pointer; border: 1px solid #e0e0e0; transition: all 0.2s; }
        .view-item:hover { border-color: #007bff; }
        .view-item.mapped { border-left: 3px solid #28a745; }
        .view-item.unmapped { border-left: 3px solid #ffc107; opacity: 0.85; }
        .view-item.unmapped:hover { opacity: 1; }
        .view-name { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .view-item.unmapped .view-name { font-family: 'Courier New', monospace; font-size: 13px; color: #666; }
        .view-comment { font-size: 11px; color: #999; font-family: 'Courier New', monospace; }
        .views-content { flex: 1; display: flex; flex-direction: column; background: white; }
        .tabs-header { display: flex; gap: 4px; padding: 10px 10px 0 10px; background: #f8f9fa; border-bottom: 2px solid #007bff; overflow-x: auto; }
        .no-tabs { padding: 10px; color: #999; text-align: center; width: 100%; }
        .tab { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #e9ecef; border: 1px solid #dee2e6; border-bottom: none; border-radius: 4px 4px 0 0; cursor: pointer; white-space: nowrap; }
        .tab:hover { background: #dee2e6; }
        .tab.active { background: white; border-color: #007bff; border-bottom-color: white; z-index: 1; margin-bottom: -2px; }
        .tab-title { font-size: 14px; font-weight: 500; }
        .tab-close { background: none; border: none; font-size: 18px; line-height: 1; cursor: pointer; color: #999; padding: 0; width: 18px; height: 18px; }
        .tab-close:hover { color: #dc3545; }
        .tabs-body { flex: 1; overflow: auto; padding: 20px; }
        .empty-state { text-align: center; padding: 60px 20px; color: #999; }
        .empty-icon { font-size: 64px; margin-bottom: 20px; }
        .view-data-container { max-width: 100%; }
        .view-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .table-wrapper { overflow-x: auto; border: 1px solid #ddd; border-radius: 4px; }
        .data-table td .qr-icon { display: inline-block; width: 16px; height: 16px; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23888"><path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 21h8v-8h-8v8zm2-6h4v4h-4v-4z"/></svg>'); background-size: contain; background-repeat: no-repeat; margin-left: 8px; cursor: pointer; vertical-align: middle; opacity: 0.5; }
        .data-table td:hover .qr-icon { opacity: 1; }
        .qr-modal { position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); }
        .qr-modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; border: 1px solid #888; width: fit-content; text-align: center; border-radius: 8px; position: relative; }
        .qr-modal-close { color: #aaa; position: absolute; top: 5px; right: 15px; font-size: 28px; font-weight: bold; }
        .qr-modal-close:hover, .qr-modal-close:focus { color: black; text-decoration: none; cursor: pointer; }
    `;
    document.head.appendChild(style);
}

// Export initialization function
window.initDatabaseViewsPage = initDatabaseViewsPage;