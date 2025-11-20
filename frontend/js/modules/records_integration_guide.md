# 开奖记录模块集成指南

## 快速开始

本指南将帮助您快速集成开奖记录模块到项目中。

## 步骤1: 引入模块文件

在 `frontend/index.html` 中找到脚本引入部分，在 `</body>` 标签之前添加：

```html
<!-- 工具函数（已有） -->
<script src="js/utils.js"></script>
<script src="js/config.js"></script>

<!-- 功能模块 -->
<script src="js/modules/collect.js"></script>
<script src="js/modules/records.js"></script>  <!-- 👈 添加这一行 -->

<!-- 主程序（已有） -->
<script src="js/main.js"></script>
```

**注意**:
- `records.js` 必须在 `utils.js` 和 `config.js` 之后引入
- `records.js` 必须在 `main.js` 之前引入

## 步骤2: 初始化模块

在 `frontend/js/main.js` 中添加模块初始化代码：

### 方式1: 在现有初始化函数中添加（推荐）

```javascript
function initApp() {
  console.log('初始化应用...');

  // 初始化数据采集模块
  if (typeof window.initCollectModule === 'function') {
    window.initCollectModule();
  }

  // 初始化开奖记录模块 👈 添加这段
  if (typeof window.initRecordsModule === 'function') {
    window.initRecordsModule();
  }

  console.log('应用初始化完成');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initApp);
```

### 方式2: 独立初始化（如果没有initApp函数）

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // 初始化开奖记录模块
  if (typeof window.initRecordsModule === 'function') {
    window.initRecordsModule();
  }
});
```

## 步骤3: 从 upload.js 中移除旧代码

### 3.1 移除函数定义

在 `frontend/upload.js` 或 `frontend/js/upload.js.backup` 中找到并删除以下代码：

```javascript
// 删除这个函数（约152-230行）
function renderRecordsTable(data, areaId, title) {
  // ... 整个函数体
}

// 删除这个函数（约232-248行）
async function queryRecords(areaId, page = 1) {
  // ... 整个函数体
}

// 删除初始化调用（约250-252行）
queryRecords('recordsTableAreaAm', 1);
queryRecords('recordsTableAreaHk', 1);
```

### 3.2 移除事件绑定

找到 `buttons` 对象，删除 `queryRecordsBtn` 的定义：

```javascript
const buttons = {
  // ... 其他按钮

  // 👇 删除这段
  'queryRecordsBtn': function() {
    queryRecords('recordsTableAreaAm', 1);
    queryRecords('recordsTableAreaHk', 1);
  },

  // ... 其他按钮
};
```

### 3.3 移除工具函数引用

如果 `getBallColorClass` 和 `downloadCSV` 函数只在开奖记录功能中使用，可以考虑从 `upload.js` 中移除。但建议保留在 `utils.js` 中供其他模块使用。

## 步骤4: 测试功能

### 4.1 启动项目

```bash
# 使用启动脚本
python launcher.py

# 或手动启动
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 新终端
cd frontend
python -m http.server 8080
```

### 4.2 访问页面

打开浏览器访问: http://localhost:8080

### 4.3 测试检查清单

- [ ] 页面加载正常，无JavaScript错误
- [ ] 控制台显示"✅ 开奖记录模块已加载"
- [ ] 控制台显示"初始化开奖记录模块..."
- [ ] 控制台显示"✅ 开奖记录模块初始化完成"
- [ ] 自动加载澳门和香港的开奖记录
- [ ] 点击"查询"按钮可以刷新数据
- [ ] 日期筛选功能正常
- [ ] 期号筛选功能正常
- [ ] 分页功能正常（上一页/下一页）
- [ ] "导出本页"按钮可以下载CSV文件
- [ ] "导出全部"按钮可以下载CSV文件
- [ ] CSV文件包含正确的数据

## 常见问题排查

### 问题1: 页面报错 "initRecordsModule is not a function"

**原因**: `records.js` 未正确加载

**解决方法**:
1. 检查 `index.html` 中是否正确引入了 `records.js`
2. 检查文件路径是否正确
3. 打开浏览器开发者工具的 Network 标签，查看 `records.js` 是否成功加载

### 问题2: 控制台报错 "getBallColorClass is not defined"

**原因**: `utils.js` 未加载或加载顺序错误

**解决方法**:
1. 确保 `utils.js` 在 `records.js` 之前引入
2. 检查 `utils.js` 中是否定义了 `getBallColorClass` 函数

### 问题3: 控制台报错 "window.BACKEND_URL is undefined"

**原因**: `config.js` 未加载或配置错误

**解决方法**:
1. 确保 `config.js` 在 `records.js` 之前引入
2. 检查 `config.js` 中是否正确定义了 `window.BACKEND_URL`

### 问题4: 查询按钮点击后没有反应

**原因**: 事件绑定失败或DOM元素不存在

**解决方法**:
1. 打开浏览器开发者工具控制台，查看是否有错误信息
2. 检查HTML中是否存在 `id="queryRecordsBtn"` 的按钮
3. 检查其他必需的表单元素是否存在

### 问题5: 数据显示为"加载中..."一直不变

**原因**: 后端API请求失败

**解决方法**:
1. 检查后端服务是否正常运行（http://localhost:8000/docs）
2. 打开浏览器开发者工具的 Network 标签，查看API请求的响应
3. 检查 `window.BACKEND_URL` 配置是否正确

### 问题6: CSV导出失败或文件为空

**原因**: `downloadCSV` 函数未定义或数据格式错误

**解决方法**:
1. 确保 `utils.js` 中定义了 `downloadCSV` 函数
2. 检查浏览器控制台是否有错误信息
3. 确认数据格式符合预期

## 浏览器兼容性

### 支持的浏览器
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### 不支持的浏览器
- ❌ Internet Explorer 11 及以下版本
- ❌ 旧版移动浏览器

### 兼容性检查

打开浏览器控制台，运行以下代码检查兼容性：

```javascript
// 检查必需的API支持
console.log('Fetch API:', typeof fetch !== 'undefined');
console.log('Async/Await:', (async () => {})() instanceof Promise);
console.log('Arrow Functions:', (() => {}) instanceof Function);
console.log('Template Literals:', `test` === 'test');
console.log('Spread Operator:', [...[1,2]].length === 2);
```

如果所有输出都是 `true`，则浏览器兼容。

## 性能优化建议

### 1. 减少API请求
- 使用模块内置的数据缓存机制
- 避免频繁切换页码
- 合理设置每页显示数量

### 2. 优化渲染性能
- 大数据量时使用分页，避免一次性渲染过多数据
- 推荐每页显示 20-50 条记录

### 3. 导出优化
- 导出全部数据时，建议先使用筛选条件减少数据量
- 大数据量导出可能需要等待较长时间

## 高级用法

### 手动调用模块函数

```javascript
// 查询指定彩种的记录（第1页）
window.RecordsModule.queryRecords('recordsTableAreaAm', 1);

// 导出当前页数据
const data = {
  records: [...], // 记录数组
  page: 1,
  total: 100,
  page_size: 20
};
window.RecordsModule.exportCurrentPage(data, '澳门开奖记录');

// 导出全部数据
window.RecordsModule.exportAllRecords('am', '澳门开奖记录');
```

### 监听模块事件

```javascript
// 在模块初始化后执行自定义操作
document.addEventListener('DOMContentLoaded', function() {
  if (typeof window.initRecordsModule === 'function') {
    window.initRecordsModule();

    // 自定义初始化后的操作
    console.log('开奖记录模块已准备就绪');
  }
});
```

## 维护建议

### 代码更新
- 修改功能时，优先在 `records.js` 中进行
- 保持模块的独立性，避免与其他模块耦合
- 更新后进行充分测试

### 文档更新
- 功能变更时同步更新文档
- 记录重要的修改历史
- 保持文档的准确性和完整性

### 版本控制
- 重要更新时创建备份
- 使用 Git 进行版本管理
- 记录详细的提交信息

## 相关文档

- [开奖记录模块迁移指南](./records_migration.md)
- [开奖记录模块完成报告](./records_completion_report.md)
- [模块目录说明](./README.md)
- [项目开发规范](../../../CLAUDE.md)

## 获取帮助

如果遇到问题：

1. 查看浏览器控制台的错误信息
2. 检查 Network 标签中的API请求
3. 参考本文档的"常见问题排查"部分
4. 查看模块源代码中的注释
5. 查阅项目文档

---

**最后更新**: 2025-11-20
**文档版本**: 1.0
