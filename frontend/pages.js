/**
 * 页面管理模块
 * 负责页面切换、菜单管理和标题更新
 */

// 所有页面的映射关系
const PAGE_CONFIG = {
  // 数据相关
  'menuCollectBtn': { pageId: 'collectPage', title: '数据采集' },
  'menuRecordsBtn': { pageId: 'recordsPage', title: '开奖结果' },

  // 分析推荐
  'menuRecommendBtn': { pageId: 'recommendPage', title: '推荐8码' },
  'menuRecommendHitBtn': { pageId: 'recommendHitPage', title: '推荐8码的命中情况' },
  'menuTensBtn': { pageId: 'tensPage', title: '第N位十位分析' },
  'menuUnitsBtn': { pageId: 'unitsPage', title: '第N个码个位分析' },
  'menuRangeBtn': { pageId: 'rangePage', title: '+1~+20区间分析' },
  'menuSeventhRangeBtn': { pageId: 'seventhRangePage', title: '第7个号码+1~+20区间分析' },
  'menuSecondFourxiaoBtn': { pageId: 'secondFourxiaoPage', title: '第二个号码四肖分析' },
  'menuSixthThreexiaoBtn': { pageId: 'sixthThreexiaoPage', title: '第6个号码3肖分析' },
  'menuFront6SzzBtn': { pageId: 'front6SzzPage', title: '前6码三中三' },
  'menuFivePeriodThreexiaoBtn': { pageId: 'fivePeriodThreexiaoPage', title: '5期3肖计算' },
  'menuPlusMinus6Btn': { pageId: 'plusMinus6Page', title: '加减前6码分析' },
  'menuEachIssueBtn': { pageId: 'eachIssuePage', title: '每期分析' },
  'menuColorAnalysisBtn': { pageId: 'colorAnalysisPage', title: '波色分析' },

  // 登记点分析
  'menuRegisterFocusBtn': { pageId: 'registerFocusPage', title: '登记关注点' },
  'menuRegisterFocusResultBtn': { pageId: 'registerFocusResultPage', title: '关注点登记结果' },
  'menuRegisterFocusAnalysisBtn': { pageId: 'registerFocusAnalysisPage', title: '关注点分析' },
  'menuFavoriteNumbersBtn': { pageId: 'favoriteNumbersPage', title: '关注号码管理' },
  'menuRegisterBetBtn': { pageId: 'registerBetPage', title: '投注登记点' },
  'menuRegisterBetReportBtn': { pageId: 'registerBetReportPage', title: '投注点报表' },

  // 提醒
  'menuMaxMissAlertBtn': { pageId: 'maxMissAlertPage', title: '关注点登记最大遗漏提醒' }
};

/**
 * 显示指定页面，隐藏其他页面
 * @param {string} pageId - 要显示的页面ID
 */
function showOnlyPage(pageId) {
  // 获取所有页面元素
  const allPages = document.querySelectorAll('[id$="Page"]');

  // 隐藏所有页面
  allPages.forEach(page => {
    page.style.display = 'none';
  });

  // 显示指定页面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.style.display = 'block';
  } else {
    console.warn(`页面 ${pageId} 不存在`);
  }
}

/**
 * 更新页面标题
 * @param {string} title - 页面标题
 */
function updatePageTitle(title) {
  const pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl) {
    pageTitleEl.textContent = title;
  }
}

/**
 * 初始化侧边栏菜单
 */
function initSidebarMenu() {
  // 绑定菜单按钮点击事件
  Object.keys(PAGE_CONFIG).forEach(buttonId => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener('click', function() {
        const config = PAGE_CONFIG[buttonId];
        showOnlyPage(config.pageId);
        updatePageTitle(config.title);

        // 移除所有菜单按钮的激活状态
        document.querySelectorAll('.menu-btn').forEach(b => {
          b.classList.remove('active');
        });

        // 添加当前按钮的激活状态
        this.classList.add('active');
      });
    }
  });

  // 分析推荐折叠按钮
  const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
  const sidebarMenuBtns = document.getElementById('sidebarMenuBtns');

  if (toggleSidebarBtn && sidebarMenuBtns) {
    // 默认展开
    sidebarMenuBtns.style.display = 'block';

    toggleSidebarBtn.addEventListener('click', function() {
      if (sidebarMenuBtns.style.display === 'none') {
        sidebarMenuBtns.style.display = 'block';
        this.innerHTML = '分析推荐 ▼';
      } else {
        sidebarMenuBtns.style.display = 'none';
        this.innerHTML = '分析推荐 ▶';
      }
    });
  }

  // 登记点分析折叠按钮
  const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');
  const registerMenuBtns = document.getElementById('registerMenuBtns');
  const registerCollapseIcon = document.getElementById('registerCollapseIcon');

  if (toggleRegisterBtn && registerMenuBtns) {
    toggleRegisterBtn.addEventListener('click', function() {
      if (registerMenuBtns.style.display === 'none') {
        registerMenuBtns.style.display = 'block';
        if (registerCollapseIcon) {
          registerCollapseIcon.textContent = '▼';
        }
      } else {
        registerMenuBtns.style.display = 'none';
        if (registerCollapseIcon) {
          registerCollapseIcon.textContent = '▶';
        }
      }
    });
  }

  // 默认显示采集页面
  showOnlyPage('collectPage');
  updatePageTitle('数据采集');

  // 设置默认激活按钮
  const collectBtn = document.getElementById('menuCollectBtn');
  if (collectBtn) {
    collectBtn.classList.add('active');
  }
}

/**
 * 页面初始化
 */
function initPages() {
  // 在 DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebarMenu);
  } else {
    initSidebarMenu();
  }
}

// 立即执行初始化
initPages();

console.log('页面管理模块已加载');
