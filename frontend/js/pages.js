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
  'menuSeventhSmart20Btn': { pageId: 'seventhSmart20Page', title: '第7个号码智能推荐20码' },
  'menuSecondFourxiaoBtn': { pageId: 'secondFourxiaoPage', title: '第二个号码四肖分析' },
  'menuSixthThreexiaoBtn': { pageId: 'sixthThreexiaoPage', title: '第6个号码6肖分析' },
  'menuFront6SzzBtn': { pageId: 'front6SzzPage', title: '前6码三中三' },
  'menuFivePeriodThreexiaoBtn': { pageId: 'fivePeriodThreexiaoPage', title: '5期3肖计算' },
  'menuPlusMinus6Btn': { pageId: 'plusMinus6Page', title: '加减前6码分析' },
  'menuEachIssueBtn': { pageId: 'eachIssuePage', title: '每期分析' },
  'menuColorAnalysisBtn': { pageId: 'colorAnalysisPage', title: '波色分析' },
  'menuTwoGroupsBtn': { pageId: 'twoGroupsPage', title: '2组观察分析' },
  'menuNumberGapBtn': { pageId: 'numberGapAnalysisPage', title: '号码间隔期数分析' },
  'menuNumberMissingBtn': { pageId: 'numberMissingAnalysisPage', title: '查询遗漏期数开奖' },

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
  console.log(`[页面管理] 切换到页面: ${pageId}`);

  // 获取所有页面元素
  const allPages = document.querySelectorAll('[id$="Page"]');

  // 隐藏所有页面
  allPages.forEach(page => {
    page.style.display = 'none';
  });

  // 显示指定页面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    console.log(`[页面管理] ✓ 找到页面容器: ${pageId}`);
    targetPage.style.display = 'block';

    // 如果是2组观察页面,初始化
    if (pageId === 'twoGroupsPage') {
      console.log('[页面管理] 检测到2组观察页面');
      if (typeof initTwoGroupsPage === 'function') {
        console.log('[页面管理] 调用 initTwoGroupsPage()');
        initTwoGroupsPage();
      } else {
        console.error('[页面管理] ✗ initTwoGroupsPage 函数不存在');
      }
    }

    // 如果是号码间隔期数分析页面,初始化
    if (pageId === 'numberGapAnalysisPage') {
      console.log('[页面管理] 检测到号码间隔期数分析页面');
      if (typeof initNumberGapAnalysisPage === 'function') {
        console.log('[页面管理] 调用 initNumberGapAnalysisPage()');
        initNumberGapAnalysisPage();
      } else {
        console.error('[页面管理] ✗ initNumberGapAnalysisPage 函数不存在');
      }
    }

    // 如果是查询遗漏期数开奖页面,初始化
    if (pageId === 'numberMissingAnalysisPage') {
      console.log('[页面管理] 检测到查询遗漏期数开奖页面');
      if (typeof initNumberMissingAnalysisPage === 'function') {
        console.log('[页面管理] 调用 initNumberMissingAnalysisPage()');
        initNumberMissingAnalysisPage();
      } else {
        console.error('[页面管理] ✗ initNumberMissingAnalysisPage 函数不存在');
      }
    }

    // 如果是推荐8码页面,初始化
    if (pageId === 'recommendPage') {
      console.log('[页面管理] 检测到推荐8码页面');
      if (typeof initRecommendModule === 'function') {
        console.log('[页面管理] 调用 initRecommendModule()');
        initRecommendModule();
      } else {
        console.error('[页面管理] ✗ initRecommendModule 函数不存在');
      }
    }

    // 如果是十位分析页面,初始化
    if (pageId === 'tensPage') {
      console.log('[页面管理] 检测到十位分析页面');
      if (typeof window.initTensAnalysisModule === 'function') {
        console.log('[页面管理] 调用 initTensAnalysisModule()');
        window.initTensAnalysisModule();
      } else {
        console.error('[页面管理] ✗ initTensAnalysisModule 函数不存在');
      }
    }

    // 如果是个位分析页面,初始化
    if (pageId === 'unitsPage') {
      console.log('[页面管理] 检测到个位分析页面');
      if (typeof window.initUnitsAnalysisModule === 'function') {
        console.log('[页面管理] 调用 initUnitsAnalysisModule()');
        window.initUnitsAnalysisModule();
      } else {
        console.error('[页面管理] ✗ initUnitsAnalysisModule 函数不存在');
      }
    }

    // 如果是区间分析页面,初始化
    if (pageId === 'rangePage') {
      console.log('[页面管理] 检测到+1~+20区间分析页面');
      if (typeof window.initRangeAnalysisModule === 'function') {
        console.log('[页面管理] 调用 initRangeAnalysisModule()');
        window.initRangeAnalysisModule();
      } else {
        console.error('[页面管理] ✗ initRangeAnalysisModule 函数不存在');
      }
    }
  } else {
    console.error(`[页面管理] ✗ 页面 ${pageId} 不存在`);
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
  console.log('[页面管理] 开始初始化侧边栏菜单...');

  // 绑定菜单按钮点击事件
  Object.keys(PAGE_CONFIG).forEach(buttonId => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener('click', function() {
        try {
          const config = PAGE_CONFIG[buttonId];
          console.log(`[页面管理] 按钮 ${buttonId} 被点击，切换到页面: ${config.pageId}`);

          console.log(`[页面管理] 准备调用 showOnlyPage("${config.pageId}")`);
          showOnlyPage(config.pageId);
          console.log(`[页面管理] showOnlyPage 调用完成`);

          updatePageTitle(config.title);

          // 移除所有菜单按钮的激活状态
          document.querySelectorAll('.menu-btn').forEach(b => {
            b.classList.remove('active');
          });

          // 添加当前按钮的激活状态
          this.classList.add('active');
        } catch (error) {
          console.error(`[页面管理] ✗ 按钮点击处理出错:`, error);
        }
      });

      // 调试：确认按钮绑定成功
      if (buttonId === 'menuTwoGroupsBtn') {
        console.log('[页面管理] ✓ 2组观察按钮事件已绑定');
      }
    } else {
      console.warn(`[页面管理] ✗ 按钮 ${buttonId} 不存在`);
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

  // 子分组折叠功能
  const subgroups = [
    { btnId: 'toggleRecommendGroup', contentId: 'recommendGroupBtns', iconId: 'recommendGroupIcon' },
    { btnId: 'toggleRangeGroup', contentId: 'rangeGroupBtns', iconId: 'rangeGroupIcon' },
    { btnId: 'togglePositionGroup', contentId: 'positionGroupBtns', iconId: 'positionGroupIcon' },
    { btnId: 'toggleXiaoGroup', contentId: 'xiaoGroupBtns', iconId: 'xiaoGroupIcon' },
    { btnId: 'toggleOtherGroup', contentId: 'otherGroupBtns', iconId: 'otherGroupIcon' }
  ];

  subgroups.forEach(group => {
    const btn = document.getElementById(group.btnId);
    const content = document.getElementById(group.contentId);
    const icon = document.getElementById(group.iconId);

    if (btn && content && icon) {
      // 默认展开
      content.style.display = 'block';

      btn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止触发父级折叠
        if (content.style.display === 'none') {
          content.style.display = 'block';
          icon.textContent = '▼';
        } else {
          content.style.display = 'none';
          icon.textContent = '▶';
        }
      });
    }
  });

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

console.log('页面管理模块已加载');

// 页面加载完成后初始化菜单
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSidebarMenu);
} else {
  initSidebarMenu();
}
