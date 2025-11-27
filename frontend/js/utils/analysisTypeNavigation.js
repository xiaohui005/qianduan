/**
 * 分析类型导航工具
 * 用于从监控命中记录和遗漏监控跳转到对应的分析详情页面
 */

/**
 * 分析类型到页面ID的映射
 */
const ANALYSIS_TYPE_PAGE_MAP = {
    // 推荐相关
    'recommend8': 'recommend8HitPage',
    'recommend16': 'recommend16HitPage',
    'recommend30': 'recommend30HitPage',  // 如果有的话

    // 区间分析
    'plus_range': 'rangeAnalysisPage',
    'minus_range': 'minusRangeAnalysisPage',
    'seventh_range': 'seventhRangeAnalysisPage',

    // 加减前6码
    'plus_minus6': 'plusMinus6Page',

    // 智能推荐
    'seventh_smart20': 'seventhSmart20Page',

    // 肖分析
    'second_fourxiao': 'xiaoAnalysisPage',
    'five_period_threexiao': 'fivePeriodThreexiaoPage',

    // 前6码三中三
    'front6_szz': 'front6SzzPage',

    // 波色分析
    'color_analysis': 'colorAnalysisPage',

    // 关注号码
    'favorite_numbers': 'favoriteNumbersPage',

    // 每期分析
    'each_issue': 'eachIssuePage',

    // 关注点
    'place_results': 'placeResultsPage',

    // 高20码分析
    'high20': 'high20Page'
};

/**
 * 跳转到对应的分析类型页面
 * @param {string} analysisType - 分析类型
 * @param {string} lotteryType - 彩种类型（am/hk）
 * @param {object} context - 上下文信息（可选），如period, detail等
 */
function navigateToAnalysisPage(analysisType, lotteryType = 'am', context = {}) {
    const pageId = ANALYSIS_TYPE_PAGE_MAP[analysisType];

    if (!pageId) {
        console.warn(`分析类型 "${analysisType}" 暂无对应的详情页面`);
        alert(`分析类型"${getAnalysisTypeDisplayName(analysisType)}"暂无对应的详情页面`);
        return;
    }

    // 切换到对应页面
    if (typeof showOnlyPage === 'function') {
        showOnlyPage(pageId);

        // 如果需要切换彩种
        if (lotteryType) {
            // 等待页面加载后切换彩种
            setTimeout(() => {
                switchAnalysisLotteryType(pageId, lotteryType);
            }, 100);
        }

        // 如果有额外的上下文信息，可以触发特定的操作
        if (context.period) {
            setTimeout(() => {
                triggerAnalysisAction(analysisType, context);
            }, 200);
        }
    } else {
        console.error('showOnlyPage 函数不存在');
    }
}

/**
 * 切换分析页面的彩种
 * @param {string} pageId - 页面ID
 * @param {string} lotteryType - 彩种类型
 */
function switchAnalysisLotteryType(pageId, lotteryType) {
    // 查找页面中的彩种切换按钮
    const page = document.getElementById(pageId);
    if (!page) return;

    const buttons = page.querySelectorAll('.lottery-type-btn');
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.type === lotteryType) {
            btn.classList.add('active');
            // 触发点击事件
            btn.click();
        }
    });
}

/**
 * 触发分析页面的特定操作
 * @param {string} analysisType - 分析类型
 * @param {object} context - 上下文信息
 */
function triggerAnalysisAction(analysisType, context) {
    // 根据不同的分析类型执行不同的操作
    // 例如：自动查询指定期号的数据

    console.log(`触发分析操作: ${analysisType}`, context);

    // 这里可以根据具体需求添加更多逻辑
    // 例如：如果是推荐8码，自动加载指定期号的推荐数据
}

/**
 * 获取分析类型的显示名称
 * @param {string} analysisType - 分析类型
 * @returns {string} 显示名称
 */
function getAnalysisTypeDisplayName(analysisType) {
    const names = {
        'recommend8': '推荐8码',
        'recommend16': '推荐16码',
        'recommend30': '推荐30码',
        'hot20': '去10最热20',
        'plus_minus6': '加减前6码',
        'plus_range': '+1~+20区间',
        'minus_range': '-1~-20区间',
        'seventh_range': '第7码区间',
        'favorite_numbers': '关注号码',
        'each_issue': '每期分析',
        'second_fourxiao': '第N位4肖',
        'front6_szz': '前6码三中三',
        'five_period_threexiao': '5期3肖',
        'place_results': '关注点登记结果',
        'seventh_smart20': '第7码智能推荐20码',
        'high20': '高20码分析',
        'color_analysis': '波色分析'
    };

    return names[analysisType] || analysisType;
}

/**
 * 创建可点击的分析类型链接元素
 * @param {string} analysisType - 分析类型
 * @param {string} displayName - 显示名称
 * @param {string} lotteryType - 彩种类型
 * @param {object} context - 上下文信息
 * @returns {string} HTML字符串
 */
function createAnalysisTypeLink(analysisType, displayName, lotteryType, context = {}) {
    const hasPage = ANALYSIS_TYPE_PAGE_MAP[analysisType];
    const style = hasPage
        ? 'color:#1976d2;cursor:pointer;text-decoration:underline;font-weight:600;'
        : 'color:#666;';

    const onclick = hasPage
        ? `navigateToAnalysisPage('${analysisType}', '${lotteryType}', ${JSON.stringify(context).replace(/"/g, '&quot;')})`
        : '';

    const title = hasPage ? '点击查看详情' : '暂无详情页面';

    return `<span style="${style}" onclick="${onclick}" title="${title}">${displayName}</span>`;
}
