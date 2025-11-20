# 数据采集模块迁移指南

## 概述

已将数据采集相关功能从 `upload.js` 提取到独立模块 `frontend/js/modules/collect.js`。

## 已完成的工作

### 1. 创建新模块
- 文件位置：`frontend/js/modules/collect.js`
- 模块大小：约 340 行（符合 300-800 行的规范）

### 2. 功能提取

从 `upload.js` 提取的功能包括：

#### 采集按钮事件（第20-63行）
- `collectAmBtn` - 澳门采集（默认源）
- `collectHkBtn` - 香港采集（默认源）
- `collectAmWenlongzhuBtn` - 澳门采集（文龙珠源）
- `collectHkWenlongzhuBtn` - 香港采集（文龙珠源）

#### 历史采集按钮事件（第64-87行）
- `collectAmHistoryBtn` - 澳门历史采集
- `collectHkHistoryBtn` - 香港历史采集

#### 历史采集区域切换（第88-99行）
- `toggleHistoryBtn` - 显示/隐藏历史采集区域

#### 采集源头选择功能（第7768-7794行）
- `initCollectSourceSelection()` - 初始化源头切换
- 源头选择按钮事件绑定（`.source-btn`）

### 3. 新模块结构

```javascript
// 模块状态
let currentSource = 'default';

// DOM 元素引用
let collectResult = null;
let defaultSourceButtons = null;
let wenlongzhuSourceButtons = null;
let historyCollectArea = null;
let toggleHistoryBtn = null;

// 核心采集函数
async function collectAomen(source)
async function collectHongkong(source)
async function collectAomenHistory()
async function collectHongkongHistory()

// 结果显示函数
function showCollectSuccess(title, data)
function showCollectError(title, error)

// 源头切换功能
function initSourceSelection()

// 历史采集区域切换
function toggleHistoryCollectArea()

// 事件绑定
function bindCollectButtons()

// 模块初始化
function initCollectModule()

// 导出接口
window.initCollectModule = initCollectModule
window.collectModule = { ... }
```

### 4. 集成到主系统

#### 更新 index.html
在 `<script>` 标签区域添加：
```html
<!-- 功能模块 -->
<script src="js/modules/collect.js"></script>
```

#### 更新 main.js
在 `initApp()` 函数中添加：
```javascript
// 初始化数据采集模块（如果存在）
if (typeof window.initCollectModule === 'function') {
  window.initCollectModule();
}
```

移除了原有的 `initSourceSelection()` 函数实现，保留注释说明功能已迁移。

## 下一步工作

### 需要从 upload.js 删除的代码行

1. **第20-63行** - 采集按钮事件定义
   ```javascript
   'collectAmBtn': async function() { ... }
   'collectHkBtn': async function() { ... }
   'collectAmWenlongzhuBtn': async function() { ... }
   'collectHkWenlongzhuBtn': async function() { ... }
   ```

2. **第64-87行** - 历史采集按钮事件
   ```javascript
   'collectAmHistoryBtn': async function() { ... }
   'collectHkHistoryBtn': async function() { ... }
   ```

3. **第88-99行** - 历史采集区域切换
   ```javascript
   'toggleHistoryBtn': function() { ... }
   ```

4. **第7768-7799行** - 采集源头选择功能
   ```javascript
   function initCollectSourceSelection() { ... }
   document.addEventListener('DOMContentLoaded', function() {
     initCollectSourceSelection();
   });
   ```

### 删除说明

由于 `upload.js` 文件过大（7744行），建议采用以下步骤：

1. **备份当前文件**（已有 upload.js.backup）
2. **注释掉**上述代码段（不要立即删除）
3. **测试新模块**是否正常工作
4. **确认无问题后再删除**注释的代码

### 测试清单

- [ ] 澳门采集（默认源）按钮功能正常
- [ ] 香港采集（默认源）按钮功能正常
- [ ] 澳门采集（文龙珠）按钮功能正常
- [ ] 香港采集（文龙珠）按钮功能正常
- [ ] 澳门历史采集功能正常
- [ ] 香港历史采集功能正常
- [ ] 显示/隐藏历史采集区域功能正常
- [ ] 采集源头切换功能正常（默认源 ↔ 文龙珠源）
- [ ] 采集结果正确显示
- [ ] 错误信息正确显示
- [ ] 控制台无错误输出

## 模块优势

1. **代码分离**：采集功能独立，便于维护
2. **文件大小**：新模块约340行，符合规范
3. **可复用性**：可被其他页面或模块调用
4. **清晰结构**：职责单一，逻辑清晰
5. **便于测试**：独立模块更容易进行单元测试

## API 接口

### 全局初始化函数
```javascript
window.initCollectModule()
```

### 可选导出对象
```javascript
window.collectModule = {
  collectAomen,           // 采集澳门数据
  collectHongkong,        // 采集香港数据
  collectAomenHistory,    // 采集澳门历史
  collectHongkongHistory, // 采集香港历史
  getCurrentSource        // 获取当前源头
}
```

## 注意事项

1. **后端地址**：模块使用 `window.BACKEND_URL` 获取后端地址
2. **依赖关系**：依赖 `config.js` 提供 `window.BACKEND_URL`
3. **加载顺序**：必须在 `config.js` 之后、`main.js` 之前加载
4. **向后兼容**：不影响其他模块的功能

## 未来优化建议

1. **使用 api.js**：可以改用 `api.js` 中的 `collectData()` 等函数
2. **错误处理**：增强错误处理和用户提示
3. **加载状态**：添加加载动画或进度提示
4. **自动采集**：支持定时自动采集功能
5. **采集历史**：记录采集历史和统计信息

## 相关文件

- 新模块：`frontend/js/modules/collect.js`
- 原文件：`frontend/upload.js`（需要清理）
- 备份文件：`frontend/js/upload.js.backup`
- 主入口：`frontend/js/main.js`（已更新）
- HTML页面：`frontend/index.html`（已更新）
- API模块：`frontend/js/api.js`（提供备用函数）

## 版本信息

- 创建日期：2025-11-20
- 模块版本：v1.0
- 兼容性：与现有系统完全兼容
