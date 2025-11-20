# 前端功能模块目录

本目录包含从 `upload.js` 拆分出来的独立功能模块，每个模块负责特定的业务功能。

## 设计原则

1. **单一职责**：每个模块只负责一个特定功能领域
2. **文件大小控制**：每个模块控制在 300-800 行以内
3. **低耦合**：模块间依赖关系清晰，易于独立测试
4. **统一接口**：使用 `window.initXxxModule()` 作为初始化函数

## 已有模块

### collect.js - 数据采集模块
**功能**：负责澳门/香港彩票数据的采集功能

**大小**：313 行

**主要功能**：
- 默认源头采集（澳门/香港）
- 文龙珠源头采集（澳门/香港）
- 历史数据采集
- 采集源头切换

**导出接口**：
```javascript
// 初始化函数
window.initCollectModule()

// 可选的功能对象
window.collectModule = {
  collectAomen,           // 采集澳门数据
  collectHongkong,        // 采集香港数据
  collectAomenHistory,    // 采集澳门历史
  collectHongkongHistory, // 采集香港历史
  getCurrentSource        // 获取当前源头
}
```

**使用示例**：
```javascript
// 在 main.js 中调用
if (typeof window.initCollectModule === 'function') {
  window.initCollectModule();
}

// 或者手动调用采集函数
window.collectModule.collectAomen('default');
```

**依赖**：
- `window.BACKEND_URL`（来自 config.js）
- DOM 元素：`collectResult`, `defaultSourceButtons`, `wenlongzhuSourceButtons` 等

---

### recommend.js - 推荐8码模块
**功能**：负责推荐8码的生成和展示功能

**大小**：约 180 行

**主要功能**：
- 推荐8码生成（澳门/香港）
- 推荐结果展示（带号码球）
- 彩种切换（澳门/香港）
- 7个位置的推荐号码显示

**导出接口**：
```javascript
// 初始化函数
window.initRecommendModule()

// 功能对象
window.RecommendModule = {
  generateRecommend,      // 生成推荐
  renderRecommendResult,  // 渲染推荐结果
  handleTypeChange        // 处理彩种切换
}
```

**使用示例**：
```javascript
// 页面切换时自动初始化（在 pages.js 中配置）
if (pageId === 'recommendPage') {
  if (typeof initRecommendModule === 'function') {
    initRecommendModule();
  }
}

// 手动生成推荐
window.RecommendModule.generateRecommend('am');
```

**依赖**：
- `window.API.generateRecommend()`（来自 api.js）
- `getBallColorClass(num)`（来自 utils.js）
- DOM 元素：`recommendResult`, `.recommend-type-btn` 等

**特点**：
- 使用号码球样式显示推荐号码
- 显示推荐基于的期号
- 无数据时显示友好提示
- 加载状态提示

---

### records.js - 开奖记录管理模块
**功能**：负责开奖记录的查询、展示和导出功能

**大小**：450 行

**主要功能**：
- 开奖记录查询（支持日期、期号筛选）
- 记录表格渲染（带号码球和生肖显示）
- 分页功能（澳门/香港独立分页）
- CSV导出（本页导出、全部导出）

**导出接口**：
```javascript
// 初始化函数
window.initRecordsModule()

// 功能对象
window.RecordsModule = {
  queryRecords,        // 查询开奖记录
  exportCurrentPage,   // 导出当前页
  exportAllRecords     // 导出全部记录
}
```

**使用示例**：
```javascript
// 在 main.js 中调用
if (typeof window.initRecordsModule === 'function') {
  window.initRecordsModule();
}

// 或者手动查询记录
window.RecordsModule.queryRecords('recordsTableAreaAm', 1);

// 手动导出
window.RecordsModule.exportAllRecords('am', '澳门开奖记录');
```

**依赖**：
- `window.BACKEND_URL`（来自 config.js）
- `getBallColorClass(num)`（来自 utils.js）
- `downloadCSV(rows, filename)`（来自 utils.js）
- DOM 元素：`queryStartTime`, `queryEndTime`, `queryPeriod`, `queryPageSize`, `queryRecordsBtn`, `recordsTableAreaAm`, `recordsTableAreaHk`

## 模块开发规范

### 1. 文件命名
- 使用小驼峰命名：`moduleName.js`
- 文件名应能清晰表达模块功能

### 2. 模块结构
```javascript
/**
 * 模块名称
 * 模块功能描述
 */

// ==================== 模块状态 ====================
let moduleState = {};

// ==================== DOM 元素引用 ====================
let element1 = null;
let element2 = null;

// ==================== 核心功能函数 ====================
function coreFunction1() { }
function coreFunction2() { }

// ==================== 辅助函数 ====================
function helperFunction1() { }
function helperFunction2() { }

// ==================== 事件处理 ====================
function bindEvents() { }

// ==================== 模块初始化 ====================
function initModule() {
  // 获取 DOM 元素
  // 绑定事件
  // 初始化状态
  console.log('XXX模块初始化完成');
}

// ==================== 导出模块接口 ====================
window.initModule = initModule;
window.moduleName = { /* 公开的函数 */ };
```

### 3. 初始化函数
- 必须提供 `window.initXxxModule()` 函数
- 在函数内获取 DOM 元素引用
- 绑定所需的事件监听器
- 输出初始化完成日志

### 4. 错误处理
- 检查必需的 DOM 元素是否存在
- 使用 try-catch 捕获异步操作错误
- 提供友好的错误提示信息

### 5. 注释规范
- 使用 JSDoc 风格的函数注释
- 重要的代码块添加清晰的注释
- 使用分隔注释区分不同功能区域

## 模块集成

### 在 index.html 中引入
```html
<!-- 功能模块 -->
<script src="js/modules/collect.js"></script>
<script src="js/modules/otherModule.js"></script>
```

### 在 main.js 中初始化
```javascript
function initApp() {
  // 初始化各个功能模块
  if (typeof window.initCollectModule === 'function') {
    window.initCollectModule();
  }
  if (typeof window.initOtherModule === 'function') {
    window.initOtherModule();
  }
}
```

## 待拆分模块

以下是 `upload.js`（7744行）中可以进一步拆分的模块：

### 1. ~~recommend.js - 推荐功能模块~~ ✅ 已完成
**功能**：推荐8码生成、展示
**实际行数**：180 行
**状态**：已迁移完成

### 1.1. recommendHit.js - 推荐8码命中情况模块（待拆分）
**功能**：推荐8码的命中情况分析
**预计行数**：400-500 行

### 2. analysis.js - 基础分析模块
**功能**：区间分析、位置分析等通用分析功能
**预计行数**：600-800 行

### 3. zodiac.js - 生肖分析模块
**功能**：四肖、六肖等生肖相关分析
**预计行数**：400-500 行

### 4. favorites.js - 关注号码模块
**功能**：关注号码管理、遗漏统计
**预计行数**：400-500 行

### 5. betting.js - 投注管理模块
**功能**：投注登记、报表生成
**预计行数**：400-500 行

## 模块拆分流程

1. **识别功能边界**：确定要拆分的功能范围
2. **提取代码**：复制相关代码到新模块
3. **重构接口**：统一初始化和导出接口
4. **更新引用**：在 index.html 和 main.js 中添加引用
5. **测试验证**：确保功能正常工作
6. **清理原文件**：从原文件中删除已拆分的代码
7. **更新文档**：更新本 README 和相关文档

## 相关文档

- [数据采集模块迁移指南](./collect_migration.md)
- [开奖记录模块迁移指南](./records_migration.md)
- [项目开发规范](../../../CLAUDE.md)

## 维护记录

| 日期 | 操作 | 说明 |
|------|------|------|
| 2025-11-20 | 创建目录 | 初始化 modules 目录 |
| 2025-11-20 | 添加 collect.js | 从 upload.js 提取数据采集功能 (313行) |
| 2025-11-20 | 添加 records.js | 从 upload.js 提取开奖记录管理功能 (450行) |
| 2025-11-20 | 添加 recommend.js | 从 upload.js 提取推荐8码功能 (180行) |

## 注意事项

1. **加载顺序很重要**：模块必须在 `main.js` 之前加载
2. **依赖管理**：确保所需的全局变量（如 `window.BACKEND_URL`）已定义
3. **向后兼容**：拆分模块时要确保不影响现有功能
4. **测试充分**：每次拆分后都要进行完整的功能测试
5. **渐进式重构**：不要一次拆分太多，逐步进行

## 未来规划

1. 完成 `upload.js` 的完全模块化拆分
2. 考虑引入模块化方案（如 ES6 模块或 AMD/CMD）
3. 统一模块间的通信机制
4. 添加模块级别的单元测试
5. 优化模块加载性能（按需加载、懒加载等）
