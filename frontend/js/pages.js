/**
 * 页面管理模块
 * 负责页面切换、菜单管理和标题更新
 */

// 所有页面的映射关系
const PAGE_CONFIG = {
  // 数据相关
  'menuCollectBtn': { pageId: 'collectPage', title: '数据采集' },
  'menuRecordsBtn': { pageId: 'recordsPage', title: '开奖结果' },
  'menuAutoCollectBtn': { pageId: 'autoCollectPage', title: '自动采集设置' },

  // 分析推荐
  'menuRecommendBtn': { pageId: 'recommendPage', title: '推荐8码' },
  'menuRecommend8HitBtn': { pageId: 'recommend8HitAnalysisPage', title: '推荐8码命中分析', initFunc: 'initRecommend8HitAnalysis' },
  'menuRecommend16Btn': { pageId: 'recommend16Page', title: '推荐16码' },
  'menuRecommend16HitBtn': { pageId: 'recommend16HitAnalysisPage', title: '推荐16码命中分析', initFunc: 'initRecommend16HitAnalysis' },
  'menuTensBtn': { pageId: 'tensPage', title: '第N位十位分析' },
  'menuUnitsBtn': { pageId: 'unitsPage', title: '第N个码个位分析' },
  'menuRangeBtn': { pageId: 'rangePage', title: '+1~+20区间分析' },
  'menuMinusRangeBtn': { pageId: 'minusRangePage', title: '-1~-20区间分析' },
  'menuSeventhRangeBtn': { pageId: 'seventhRangePage', title: '第7个号码+1~+20区间分析' },
  'menuHot20Minus10Btn': { pageId: 'hot20Minus10Page', title: '去10的最热20分析' },
  'menuRecommend30Btn': { pageId: 'recommend30Page', title: '推荐30码分析' },
  'menuHigh20Btn': { pageId: 'high20Page', title: '高20码分析', initFunc: 'initHigh20Page' },
  'menuCustom30Btn': { pageId: 'custom30AnalysisPage', title: '自适应智能30码', initFunc: 'renderCustom30AnalysisPage' },
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
  'menuMaxMissAlertBtn': { pageId: 'maxMissAlertPage', title: '关注点登记最大遗漏提醒' },
  'menuOmissionMonitorBtn': { pageId: 'omissionMonitorPage', title: '遗漏监控' },
  'menuOmissionMonitorConfigBtn': { pageId: 'omissionMonitorConfigPage', title: '遗漏监控配置' },
  'menuMonitorHitRecordsBtn': { pageId: 'monitorHitRecordsPage', title: '监控命中记录' },

  // 模拟倍投测试
  'menuSimulationBettingBtn': { pageId: 'simulationBettingPage', title: '模拟倍投测试' },

  // 数据库管理
  'menuDatabaseViewsBtn': { pageId: 'databaseViewsPage', title: '数据库视图' }
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
    page.classList.add('hidden');
  });

  // 显示指定页面
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    console.log(`[页面管理] ✓ 找到页面容器: ${pageId}`);
    targetPage.style.display = 'block';
    targetPage.classList.remove('hidden');

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

    // 如果是遗漏监控页面,初始化
    if (pageId === 'omissionMonitorPage') {
      console.log('[页面管理] 检测到遗漏监控页面');
      if (typeof window.OmissionMonitor !== 'undefined' && typeof window.OmissionMonitor.init === 'function') {
        console.log('[页面管理] 调用 OmissionMonitor.init()');
        window.OmissionMonitor.init();
      } else {
        console.error('[页面管理] ✗ OmissionMonitor.init 函数不存在');
      }
    }

    // 如果是遗漏监控配置页面,初始化
    if (pageId === 'omissionMonitorConfigPage') {
      console.log('[页面管理] 检测到遗漏监控配置页面');
      if (typeof window.OmissionMonitorConfig !== 'undefined' && typeof window.OmissionMonitorConfig.init === 'function') {
        console.log('[页面管理] 调用 OmissionMonitorConfig.init()');
        window.OmissionMonitorConfig.init();
      } else {
        console.error('[页面管理] ✗ OmissionMonitorConfig.init 函数不存在');
      }
    }

    // 如果是监控命中记录页面,初始化
    if (pageId === 'monitorHitRecordsPage') {
      console.log('[页面管理] 检测到监控命中记录页面');
      if (typeof window.MonitorHitRecords !== 'undefined' && typeof window.MonitorHitRecords.init === 'function') {
        console.log('[页面管理] 调用 MonitorHitRecords.init()');
        window.MonitorHitRecords.init();
      } else {
        console.error('[页面管理] ✗ MonitorHitRecords.init 函数不存在');
      }
    }

    // 如果是模拟倍投测试页面,初始化
    if (pageId === 'simulationBettingPage') {
      console.log('[页面管理] 检测到模拟倍投测试页面');
      if (typeof initSimulationBetting === 'function') {
        console.log('[页面管理] 调用 initSimulationBetting()');
        initSimulationBetting();
      } else {
        console.error('[页面管理] ✗ initSimulationBetting 函数不存在');
      }
    }

    // 如果是开奖记录页面,初始化
    if (pageId === 'recordsPage') {
      console.log('[页面管理] 检测到开奖记录页面');
      if (typeof window.initRecordsModule === 'function') {
        console.log('[页面管理] 调用 initRecordsModule()');
        window.initRecordsModule();
      } else {
        console.error('[页面管理] ✗ initRecordsModule 函数不存在');
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

    // 如果是反向区间分析页面,初始化
    if (pageId === 'minusRangePage') {
      console.log('[页面管理] 检测到-1~-20反向区间分析页面');
      if (typeof window.initMinusRangeAnalysisModule === 'function') {
        console.log('[页面管理] 调用 initMinusRangeAnalysisModule()');
        window.initMinusRangeAnalysisModule();
      } else {
        console.error('[页面管理] ✗ initMinusRangeAnalysisModule 函数不存在');
      }
    }

    // 如果是加减前6码分析页面,初始化
    if (pageId === 'plusMinus6Page') {
      console.log('[页面管理] 检测到加减前6码分析页面');
      if (typeof window.initPlusMinus6 === 'function') {
        console.log('[页面管理] 调用 initPlusMinus6()');
        window.initPlusMinus6();
      } else {
        console.error('[页面管理] ✗ initPlusMinus6 函数不存在');
      }
    }

    // 如果是登记关注点页面,初始化
    if (pageId === 'registerFocusPage') {
      console.log('[页面管理] 检测到登记关注点页面');
      if (typeof window.initPlaceManagementModule === 'function') {
        console.log('[页面管理] 调用 initPlaceManagementModule()');
        window.initPlaceManagementModule();
      } else {
        console.error('[页面管理] ✗ initPlaceManagementModule 函数不存在');
      }
    }

    // 如果是关注号码管理页面,初始化
    if (pageId === 'favoriteNumbersPage') {
      console.log('[页面管理] 检测到关注号码管理页面');
      if (typeof window.initFavoriteNumbersModule === 'function') {
        console.log('[页面管理] 调用 initFavoriteNumbersModule()');
        window.initFavoriteNumbersModule();
      } else {
        console.error('[页面管理] ✗ initFavoriteNumbersModule 函数不存在');
      }
    }

    // 如果是投注登记点页面,初始化
    if (pageId === 'registerBetPage') {
      console.log('[页面管理] 检测到投注登记点页面');
      if (typeof window.initBettingModule === 'function') {
        console.log('[页面管理] 调用 initBettingModule()');
        window.initBettingModule();
      } else {
        console.error('[页面管理] ✗ initBettingModule 函数不存在');
      }
    }

    // 如果是投注点报表页面,初始化
    if (pageId === 'registerBetReportPage') {
      console.log('[页面管理] 检测到投注点报表页面');
      if (typeof window.initBetReport === 'function') {
        console.log('[页面管理] 调用 initBetReport()');
        window.initBetReport();
      } else {
        console.error('[页面管理] ✗ initBetReport 函数不存在');
      }
    }

    // 如果是数据库视图页面,初始化
    if (pageId === 'databaseViewsPage') {
      console.log('[页面管理] 检测到数据库视图页面');
      if (typeof window.initDatabaseViewsPage === 'function') {
        console.log('[页面管理] 调用 initDatabaseViewsPage()');
        window.initDatabaseViewsPage();
      } else {
        console.error('[页面管理] ✗ initDatabaseViewsPage 函数不存在');
      }
    }

    // 如果是关注点登记结果页面,初始化
    if (pageId === 'registerFocusResultPage') {
      console.log('[页面管理] 检测到关注点登记结果页面');
      if (typeof window.initPlaceResultsModule === 'function') {
        console.log('[页面管理] 调用 initPlaceResultsModule()');
        window.initPlaceResultsModule();
      } else {
        console.error('[页面管理] ✗ initPlaceResultsModule 函数不存在');
      }
    }

    // 如果是关注点分析页面,初始化
    if (pageId === 'registerFocusAnalysisPage') {
      console.log('[页面管理] 检测到关注点分析页面');
      if (typeof window.initPlaceAnalysisModule === 'function') {
        console.log('[页面管理] 调用 initPlaceAnalysisModule()');
        window.initPlaceAnalysisModule();
      } else {
        console.error('[页面管理] ✗ initPlaceAnalysisModule 函数不存在');
      }
    }

    // 如果是最大遗漏提醒页面,初始化
    if (pageId === 'maxMissAlertPage') {
      console.log('[页面管理] 检测到最大遗漏提醒页面');
      if (typeof window.initMaxMissAlertModule === 'function') {
        console.log('[页面管理] 调用 initMaxMissAlertModule()');
        window.initMaxMissAlertModule();

        // 初始化后自动加载数据
        if (typeof window.loadMaxMissAlerts === 'function') {
          const thresholdInput = document.getElementById('maxMissThreshold');
          const threshold = thresholdInput ? parseInt(thresholdInput.value || '0') || 0 : 0;
          window.loadMaxMissAlerts(threshold);
        }
      } else {
        console.error('[页面管理] ✗ initMaxMissAlertModule 函数不存在');
      }
    }

    // 如果是波色分析页面,初始化
    if (pageId === 'colorAnalysisPage') {
      console.log('[页面管理] 检测到波色分析页面');
      if (typeof window.initColorAnalysis === 'function') {
        console.log('[页面管理] 调用 initColorAnalysis()');
        window.initColorAnalysis();
      } else {
        console.error('[页面管理] ✗ initColorAnalysis 函数不存在');
      }
    }

    // 如果是推荐16码页面,初始化
    if (pageId === 'recommend16Page') {
      console.log('[页面管理] 检测到推荐16码页面');
      if (typeof initRecommend16Module === 'function') {
        console.log('[页面管理] 调用 initRecommend16Module()');
        initRecommend16Module();
      } else {
        console.error('[页面管理] ✗ initRecommend16Module 函数不存在');
      }
    }

    // 如果是第二个号码四肖分析页面,初始化
    if (pageId === 'secondFourxiaoPage') {
      console.log('[页面管理] 检测到第二个号码四肖分析页面');
      if (typeof window.initSecondFourxiaoAnalysis === 'function') {
        console.log('[页面管理] 调用 initSecondFourxiaoAnalysis()');
        window.initSecondFourxiaoAnalysis();
      } else {
        console.error('[页面管理] ✗ initSecondFourxiaoAnalysis 函数不存在');
      }
    }

    // 如果是第6个号码6肖分析页面,初始化
    if (pageId === 'sixthThreexiaoPage') {
      console.log('[页面管理] 检测到第6个号码6肖分析页面');
      if (typeof window.initSixthThreexiaoAnalysis === 'function') {
        console.log('[页面管理] 调用 initSixthThreexiaoAnalysis()');
        window.initSixthThreexiaoAnalysis();
      } else {
        console.error('[页面管理] ✗ initSixthThreexiaoAnalysis 函数不存在');
      }
    }

    // 如果是5期3肖计算页面,初始化
    if (pageId === 'fivePeriodThreexiaoPage') {
      console.log('[页面管理] 检测到5期3肖计算页面');
      if (typeof window.initFivePeriodThreexiao === 'function') {
        console.log('[页面管理] 调用 initFivePeriodThreexiao()');
        window.initFivePeriodThreexiao();
      } else {
        console.error('[页面管理] ✗ initFivePeriodThreexiao 函数不存在');
      }
    }

    // 如果是第7个号码智能推荐20码页面,初始化
    if (pageId === 'seventhSmart20Page') {
      console.log('[页面管理] 检测到第7个号码智能推荐20码页面');
      if (typeof window.initSeventhSmart20 === 'function') {
        console.log('[页面管理] 调用 initSeventhSmart20()');
        window.initSeventhSmart20();
      } else {
        console.error('[页面管理] ✗ initSeventhSmart20 函数不存在');
      }
    }

    // 如果是第7个号码+1~+20区间分析页面,初始化
    if (pageId === 'seventhRangePage') {
      console.log('[页面管理] 检测到第7个号码+1~+20区间分析页面');
      if (typeof window.initSeventhRangeAnalysis === 'function') {
        console.log('[页面管理] 调用 initSeventhRangeAnalysis()');
        window.initSeventhRangeAnalysis();
      } else {
        console.error('[页面管理] ✗ initSeventhRangeAnalysis 函数不存在');
      }
    }

    // 如果是去10的最热20分析页面,初始化
    if (pageId === 'hot20Minus10Page') {
      console.log('[页面管理] 检测到去10的最热20分析页面');
      if (typeof window.initHot20Minus10Page === 'function') {
        console.log('[页面管理] 调用 initHot20Minus10Page()');
        window.initHot20Minus10Page();
      } else {
        console.error('[页面管理] ✗ initHot20Minus10Page 函数不存在');
      }
    }

    // 如果是推荐30码分析页面,初始化
    if (pageId === 'recommend30Page') {
      console.log('[页面管理] 检测到推荐30码分析页面');
      if (typeof window.initRecommend30Page === 'function') {
        console.log('[页面管理] 调用 initRecommend30Page()');
        window.initRecommend30Page();
      } else {
        console.error('[页面管理] ✗ initRecommend30Page 函数不存在');
      }
    }

    // 如果是高20码分析页面,初始化
    if (pageId === 'high20Page') {
      console.log('[页面管理] 检测到高20码分析页面');
      if (typeof window.initHigh20Page === 'function') {
        console.log('[页面管理] 调用 initHigh20Page()');
        window.initHigh20Page();
      } else {
        console.error('[页面管理] ✗ initHigh20Page 函数不存在');
      }
    }

    // 如果是遗漏监控页面,初始化
    if (pageId === 'omissionMonitorPage') {
      console.log('[页面管理] 检测到遗漏监控页面');
      if (typeof OmissionMonitor !== 'undefined' && typeof OmissionMonitor.init === 'function') {
        console.log('[页面管理] 调用 OmissionMonitor.init()');
        OmissionMonitor.init();
      } else {
        console.error('[页面管理] ✗ OmissionMonitor.init 函数不存在');
      }
    }

    // 如果是前6码三中三页面,初始化
    if (pageId === 'front6SzzPage') {
      console.log('[页面管理] 检测到前6码三中三页面');
      if (typeof window.initFront6Szz === 'function') {
        console.log('[页面管理] 调用 initFront6Szz()');
        window.initFront6Szz();
      } else {
        console.error('[页面管理] ✗ initFront6Szz 函数不存在');
      }
    }

    // 如果是每期分析页面,初始化
    if (pageId === 'eachIssuePage') {
      console.log('[页面管理] 检测到每期分析页面');
      if (typeof window.initEachIssue === 'function') {
        console.log('[页面管理] 调用 initEachIssue()');
        window.initEachIssue();
      } else {
        console.error('[页面管理] ✗ initEachIssue 函数不存在');
      }
    }

    // 通用初始化机制：检查 PAGE_CONFIG 中是否配置了 initFunc
    // 这个机制会在上面所有硬编码的 if 语句都不匹配时生效
    let foundButtonId = null;
    for (const [buttonId, config] of Object.entries(PAGE_CONFIG)) {
      if (config.pageId === pageId && config.initFunc) {
        foundButtonId = buttonId;
        break;
      }
    }

    if (foundButtonId) {
      const config = PAGE_CONFIG[foundButtonId];
      const initFuncName = config.initFunc;

      console.log(`[页面管理] 检测到页面 ${pageId}，尝试调用初始化函数: ${initFuncName}`);

      if (typeof window[initFuncName] === 'function') {
        console.log(`[页面管理] 调用 ${initFuncName}()`);
        window[initFuncName]();
      } else {
        console.error(`[页面管理] ✗ ${initFuncName} 函数不存在`);
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
    // 默认收起
    sidebarMenuBtns.style.display = 'none';
    toggleSidebarBtn.innerHTML = '✨ 分析推荐 ▶';

    toggleSidebarBtn.addEventListener('click', function() {
      if (sidebarMenuBtns.style.display === 'none') {
        sidebarMenuBtns.style.display = 'block';
        this.innerHTML = '✨ 分析推荐 ▼';
      } else {
        sidebarMenuBtns.style.display = 'none';
        this.innerHTML = '✨ 分析推荐 ▶';
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
      // 默认展开 - 使用CSS类
      content.classList.add('show');

      btn.addEventListener('click', function(e) {
        e.stopPropagation(); // 防止触发父级折叠
        const isExpanded = content.classList.contains('show');

        if (!isExpanded) {
          // 展开：先折叠其他所有子分组，腾出空间
          subgroups.forEach(otherGroup => {
            if (otherGroup.contentId !== group.contentId) {
              const otherContent = document.getElementById(otherGroup.contentId);
              const otherIcon = document.getElementById(otherGroup.iconId);
              if (otherContent) {
                otherContent.classList.remove('show');
                if (otherIcon) otherIcon.textContent = '▶';
              }
            }
          });

          content.classList.add('show');
          icon.textContent = '▼';

          // 展开后滚动
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const sidebar = document.querySelector('.sidebar');
              if (btn && sidebar) {
                const titleRect = btn.getBoundingClientRect();
                const sidebarRect = sidebar.getBoundingClientRect();
                const targetOffset = 60;
                const scrollAmount = titleRect.top - sidebarRect.top - targetOffset;
                sidebar.scrollTo({
                  top: Math.max(0, sidebar.scrollTop + scrollAmount),
                  behavior: 'smooth'
                });
              }
            });
          });
        } else {
          // 折叠
          content.classList.remove('show');
          icon.textContent = '▶';
        }
      });
    }
  });

  // 综合管理折叠按钮
  const toggleComprehensiveBtn = document.getElementById('toggleComprehensiveBtn');
  const comprehensiveMenuBtns = document.getElementById('comprehensiveMenuBtns');
  const comprehensiveCollapseIcon = document.getElementById('comprehensiveCollapseIcon');

  if (toggleComprehensiveBtn && comprehensiveMenuBtns) {
    toggleComprehensiveBtn.addEventListener('click', function() {
      if (comprehensiveMenuBtns.classList.contains('hidden')) {
        comprehensiveMenuBtns.classList.remove('hidden');
        comprehensiveMenuBtns.style.display = 'block';
        if (comprehensiveCollapseIcon) {
          comprehensiveCollapseIcon.textContent = '▼';
        }
        setTimeout(() => {
          comprehensiveMenuBtns.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        comprehensiveMenuBtns.classList.add('hidden');
        comprehensiveMenuBtns.style.display = 'none';
        if (comprehensiveCollapseIcon) {
          comprehensiveCollapseIcon.textContent = '▶';
        }
      }
    });
  }

  // 登记点分析折叠按钮
  const toggleRegisterBtn = document.getElementById('toggleRegisterBtn');
  const registerMenuBtns = document.getElementById('registerMenuBtns');
  const registerCollapseIcon = document.getElementById('registerCollapseIcon');

  if (toggleRegisterBtn && registerMenuBtns) {
    toggleRegisterBtn.addEventListener('click', function() {
      // 使用classList.toggle而不是style.display
      if (registerMenuBtns.classList.contains('hidden')) {
        registerMenuBtns.classList.remove('hidden');
        registerMenuBtns.style.display = 'block';
        if (registerCollapseIcon) {
          registerCollapseIcon.textContent = '▼';
        }
        // 展开后滚动到子菜单可视区域
        setTimeout(() => {
          registerMenuBtns.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      } else {
        registerMenuBtns.classList.add('hidden');
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
