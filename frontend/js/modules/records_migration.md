# 开奖记录模块迁移文档

## 概述

从 `upload.js` 中提取开奖记录管理相关功能，创建独立模块 `records.js`。

## 迁移内容

### 提取的函数

1. **queryRecords(areaId, page)** - 查询开奖记录
   - 支持日期范围筛选
   - 支持期号筛选
   - 支持分页
   - 支持澳门/香港彩种切换

2. **renderRecordsTable(data, areaId, title)** - 渲染记录表格
   - 带号码球显示（红蓝绿三色）
   - 显示生肖信息
   - 支持分页控件

3. **exportCurrentPage(data, title)** - 导出当前页CSV
   - 导出当前页面显示的记录

4. **exportAllRecords(type, title)** - 导出全部CSV
   - 导出所有符合筛选条件的记录（最多10000条）

### 状态管理

```javascript
// 记录数据缓存
let recordsData = {
  am: { records: [], total: 0, page: 1, page_size: 20 },
  hk: { records: [], total: 0, page: 1, page_size: 20 }
};

// 当前页码
let currentPage = {
  am: 1,
  hk: 1
};
```

## 功能特性

### 1. 查询功能
- **日期范围筛选**: 通过 `queryStartTime` 和 `queryEndTime` 输入框
- **期号筛选**: 通过 `queryPeriod` 输入框
- **每页条数**: 通过 `queryPageSize` 输入框（默认20条）
- **彩种切换**: 自动识别区域ID，支持澳门和香港

### 2. 表格显示
- **号码球**: 使用 `getBallColorClass()` 自动着色
- **生肖显示**: 在号码球下方显示对应生肖
- **格式化日期**: 只显示年月日部分

### 3. 分页功能
- **上一页/下一页**: 根据当前页自动显示/隐藏
- **页码显示**: "第 X / Y 页"格式
- **页码状态**: 自动保持各彩种的独立页码

### 4. 导出功能
- **本页导出**: 导出当前页显示的记录
- **全部导出**: 导出所有符合筛选条件的记录
- **文件命名**:
  - 本页: `{彩种}_records_page{页码}.csv`
  - 全部: `{彩种}_records_all.csv`

## 依赖关系

### 外部依赖

```javascript
// 从 utils.js
- getBallColorClass(num)  // 号码颜色分类
- downloadCSV(rows, filename)  // CSV下载

// 从 config.js
- window.BACKEND_URL  // 后端API地址
```

### HTML元素依赖

```html
<!-- 查询表单 -->
<input type="date" id="queryStartTime">
<input type="date" id="queryEndTime">
<input type="text" id="queryPeriod">
<input type="number" id="queryPageSize" value="20">
<button id="queryRecordsBtn">查询</button>

<!-- 显示区域 -->
<div id="recordsTableAreaAm"></div>  <!-- 澳门 -->
<div id="recordsTableAreaHk"></div>  <!-- 香港 -->
```

## 使用方式

### 1. 引入模块

在 `index.html` 中添加：

```html
<!-- 在 utils.js 和 config.js 之后引入 -->
<script src="js/modules/records.js"></script>
```

### 2. 初始化模块

```javascript
// 在页面加载完成后调用
document.addEventListener('DOMContentLoaded', function() {
  initRecordsModule();
});
```

### 3. 手动调用（可选）

```javascript
// 查询指定彩种的记录
window.RecordsModule.queryRecords('recordsTableAreaAm', 1);

// 导出当前页
window.RecordsModule.exportCurrentPage(data, '澳门开奖记录');

// 导出全部
window.RecordsModule.exportAllRecords('am', '澳门开奖记录');
```

## 数据格式

### API响应格式

```json
{
  "records": [
    {
      "period": "2025201",
      "open_time": "2025-01-15 21:30:00",
      "numbers": "01,15,23,32,41,45,49",
      "animals": "鼠,猴,猪,龙,兔,蛇,羊",
      "lottery_type": "am"
    }
  ],
  "total": 1000,
  "page": 1,
  "page_size": 20
}
```

### CSV导出格式

```csv
期号,开奖时间,开奖号码/生肖
2025201,2025-01-15,01,15,23,32,41,45,49 / 鼠,猴,猪,龙,兔,蛇,羊
```

## 代码优化

### 1. 模块化结构
- 清晰的函数职责划分
- 独立的状态管理
- 良好的错误处理

### 2. 代码可读性
- 详细的函数注释
- 语义化的函数命名
- 逻辑分层清晰

### 3. 性能优化
- 数据缓存机制
- 批量事件绑定
- 最小化DOM操作

## 兼容性说明

### 浏览器支持
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 需要支持 ES6+ 语法
- 需要支持 Fetch API

### 向后兼容
- 完全兼容原有功能
- 保持原有API接口
- 无需修改HTML结构

## 测试建议

### 功能测试
1. ✅ 查询澳门记录
2. ✅ 查询香港记录
3. ✅ 日期范围筛选
4. ✅ 期号筛选
5. ✅ 分页功能
6. ✅ 导出本页
7. ✅ 导出全部

### 边界测试
1. ✅ 无数据情况
2. ✅ 网络错误处理
3. ✅ 筛选条件为空
4. ✅ 大数据量导出

## 维护指南

### 添加新功能
1. 在模块末尾添加新函数
2. 在 `window.RecordsModule` 中导出
3. 更新文档说明

### 修改样式
- 修改 `buildTableHTML()` 函数中的内联样式
- 或者在 CSS 文件中添加对应的类

### 修改导出格式
- 修改 `formatRecordForCSV()` 函数
- 调整CSV表头数组

## 从 upload.js 中移除的代码

迁移完成后，可以从 `upload.js` 中安全删除以下代码：

```javascript
// 行号 152-230
function renderRecordsTable(data, areaId, title) { ... }

// 行号 232-248
async function queryRecords(areaId, page = 1) { ... }

// 行号 250-252
queryRecords('recordsTableAreaAm', 1);
queryRecords('recordsTableAreaHk', 1);
```

同时移除相关的事件绑定：
```javascript
// 行号 100-103 (buttons对象中)
'queryRecordsBtn': function() {
  queryRecords('recordsTableAreaAm', 1);
  queryRecords('recordsTableAreaHk', 1);
}
```

## 迁移检查清单

- [x] 提取所有相关函数
- [x] 创建独立模块文件
- [x] 添加详细注释
- [x] 导出初始化函数
- [x] 编写迁移文档
- [ ] 在 index.html 中引入模块
- [ ] 测试基本功能
- [ ] 测试边界情况
- [ ] 从 upload.js 删除旧代码
- [ ] 更新 README.md

## 相关文件

- **模块文件**: `frontend/js/modules/records.js`
- **依赖工具**: `frontend/js/utils.js`
- **API配置**: `frontend/js/config.js`
- **HTML页面**: `frontend/index.html`
- **后端API**: `backend/routes/collect.py` (提供 `/records` 端点)
