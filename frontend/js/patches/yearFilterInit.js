/**
 * 年份筛选初始化补丁
 * 为所有分析页面添加年份筛选功能
 */

console.log('📅 加载年份筛选初始化补丁...');

// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
  console.log('📅 开始初始化年份筛选...');

  // 1. 十位分析
  if (typeof initYearFilter === 'function') {
    initYearFilter('tensYearSelect', function(year) {
      console.log('十位分析 - 年份变更:', year);
      if (typeof loadTensAnalysis === 'function') {
        loadTensAnalysis();
      }
    });
  }

  // 2. 个位分析
  if (typeof initYearFilter === 'function') {
    initYearFilter('unitsYearSelect', function(year) {
      console.log('个位分析 - 年份变更:', year);
      if (typeof loadUnitsAnalysis === 'function') {
        loadUnitsAnalysis();
      }
    });
  }

  // 3. +1~+20区间分析
  if (typeof initYearFilter === 'function') {
    initYearFilter('rangeYearSelect', function(year) {
      console.log('+1~+20区间分析 - 年份变更:', year);
      if (typeof loadRangeAnalysis === 'function') {
        loadRangeAnalysis();
      }
    });
  }

  // 4. -1~-20区间分析
  if (typeof initYearFilter === 'function') {
    initYearFilter('minusRangeYearSelect', function(year) {
      console.log('-1~-20区间分析 - 年份变更:', year);
      if (typeof loadMinusRangeAnalysis === 'function') {
        loadMinusRangeAnalysis();
      }
    });
  }

  // 5. 加减前6码分析
  if (typeof initYearFilter === 'function') {
    initYearFilter('plusMinus6YearSelect', function(year) {
      console.log('加减前6码分析 - 年份变更:', year);
      // 这个页面不需要自动重新加载，用户需要点击"开始分析"按钮
    });
  }

  console.log('✅ 年份筛选初始化完成');
});

// 修改全局变量，用于存储年份选择
window.analysisYearFilters = {
  tens: null,
  units: null,
  range: null,
  minusRange: null,
  plusMinus6: null
};

// 拦截并包装原始函数，添加year参数支持
(function() {
  // 十位分析
  const originalLoadTensAnalysis = window.loadTensAnalysis;
  if (originalLoadTensAnalysis) {
    window.loadTensAnalysis = function() {
      const select = document.getElementById('tensYearSelect');
      window.currentTensYear = select ? select.value : null;
      return originalLoadTensAnalysis.apply(this, arguments);
    };
  }

  // 个位分析
  const originalLoadUnitsAnalysis = window.loadUnitsAnalysis;
  if (originalLoadUnitsAnalysis) {
    window.loadUnitsAnalysis = function() {
      const select = document.getElementById('unitsYearSelect');
      window.currentUnitsYear = select ? select.value : null;
      return originalLoadUnitsAnalysis.apply(this, arguments);
    };
  }

  // +1~+20区间分析
  const originalLoadRangeAnalysis = window.loadRangeAnalysis;
  if (originalLoadRangeAnalysis) {
    window.loadRangeAnalysis = function() {
      const select = document.getElementById('rangeYearSelect');
      window.currentRangeYear = select ? select.value : null;
      return originalLoadRangeAnalysis.apply(this, arguments);
    };
  }

  // -1~-20区间分析
  const originalLoadMinusRangeAnalysis = window.loadMinusRangeAnalysis;
  if (originalLoadMinusRangeAnalysis) {
    window.loadMinusRangeAnalysis = function() {
      const select = document.getElementById('minusRangeYearSelect');
      window.currentMinusRangeYear = select ? select.value : null;
      return originalLoadMinusRangeAnalysis.apply(this, arguments);
    };
  }

  // 加减前6码分析
  const originalLoadPlusMinus6Analysis = window.loadPlusMinus6Analysis;
  if (originalLoadPlusMinus6Analysis) {
    window.loadPlusMinus6Analysis = function() {
      const select = document.getElementById('plusMinus6YearSelect');
      window.currentPlusMinus6Year = select ? select.value : null;
      return originalLoadPlusMinus6Analysis.apply(this, arguments);
    };
  }

  console.log('✅ 分析函数year参数包装完成');
})();
