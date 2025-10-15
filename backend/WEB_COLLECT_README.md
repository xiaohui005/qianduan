# 网址采集系统使用说明

## 概述

网址采集系统允许你配置多个网址数据源,自动采集预测数据(号码或生肖),并在开奖后自动验证准确性。

## 主要功能

1. **采集源管理**: 配置和管理多个采集网址
2. **灵活数据提取**: 支持 CSS选择器、正则表达式、XPath 三种提取方式
3. **多类型支持**: 支持号码(numbers)和生肖(animals)两种数据类型
4. **自动验证**: 开奖后自动判断预测准确性
5. **统计分析**: 查看各采集源的准确率统计

## 快速开始

### 1. 初始化数据库表

```bash
python backend/init_web_collect_tables.py
```

### 2. 启动后端服务

```bash
python launcher.py
# 或
python backend/main.py
```

### 3. 访问API文档

打开浏览器访问: `http://localhost:8000/docs`

在 "网址采集" 标签下可以看到所有API接口。

## 采集源配置

### 配置字段说明

- **name**: 采集源名称(便于识别)
- **url**: 采集目标网址
- **lottery_type**: 彩种类型 (`am`=澳门, `hk`=香港)
- **data_type**: 数据类型 (`numbers`=号码, `animals`=生肖)
- **extract_config**: 提取配置(JSON格式)
- **is_active**: 是否启用该采集源
- **description**: 采集源描述

### extract_config 配置格式

#### 方式1: CSS选择器

```json
{
  "method": "css",
  "selector": "div.predict-numbers span.number",
  "period_selector": "div.period-info",
  "period_pattern": "(\\d{7})"
}
```

- `method`: 固定为 "css"
- `selector`: 用于提取数据的CSS选择器
- `period_selector`: (可选)提取期号的CSS选择器
- `period_pattern`: 从期号文本中提取期号的正则表达式

#### 方式2: 正则表达式

```json
{
  "method": "regex",
  "pattern": "推荐号码[:：]\\s*([0-9,]+)",
  "period_pattern": "第(\\d+)期"
}
```

- `method`: 固定为 "regex"
- `pattern`: 用于提取数据的正则表达式
- `period_pattern`: 提取期号的正则表达式

#### 方式3: XPath (需要安装 lxml)

```json
{
  "method": "xpath",
  "xpath": "//div[@class='predict']//span[@class='animal']/text()",
  "period_pattern": "(\\d{7})"
}
```

- `method`: 固定为 "xpath"
- `xpath`: XPath表达式
- `period_pattern`: 提取期号的正则表达式

## API接口

### 采集源管理

#### 获取采集源列表
```
GET /api/web_collect/sources?lottery_type=am&page=1&page_size=20
```

#### 创建采集源
```
POST /api/web_collect/sources
Content-Type: application/json

{
  "name": "XX网站生肖预测",
  "url": "https://example.com/predict",
  "lottery_type": "am",
  "data_type": "animals",
  "extract_config": {
    "method": "css",
    "selector": "div.animals span",
    "period_pattern": "(\\d{7})"
  },
  "is_active": true,
  "description": "测试采集源"
}
```

#### 更新采集源
```
PUT /api/web_collect/sources/1
Content-Type: application/json

{
  "is_active": false
}
```

#### 删除采集源
```
DELETE /api/web_collect/sources/1
```

### 采集执行

#### 执行单个采集源
```
POST /api/web_collect/execute/1
```

#### 执行所有启用的采集源
```
POST /api/web_collect/execute_all?lottery_type=am
```

### 结果查询

#### 获取采集结果列表
```
GET /api/web_collect/results?lottery_type=am&verified=false&page=1
```

参数:
- `source_id`: 按采集源筛选
- `lottery_type`: 按彩种筛选
- `period`: 按期号筛选
- `data_type`: 按数据类型筛选
- `is_correct`: 按验证结果筛选 (true/false)
- `verified`: 按是否已验证筛选 (true/false)

### 验证

#### 手动验证指定期号
```
POST /api/web_collect/verify/2025198?lottery_type=am
```

#### 批量验证所有未验证记录
```
POST /api/web_collect/verify_all
```

### 统计

#### 获取统计数据
```
GET /api/web_collect/stats?lottery_type=am
```

返回:
- 总记录数、已验证数、正确数、准确率
- 各采集源的详细统计

## 工作流程

### 完整流程示例

1. **添加采集源**
   ```bash
   curl -X POST "http://localhost:8000/api/web_collect/sources" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "测试网站",
       "url": "https://example.com/predict",
       "lottery_type": "am",
       "data_type": "numbers",
       "extract_config": {
         "method": "css",
         "selector": "div.numbers span",
         "period_pattern": "(\\d{7})"
       },
       "is_active": true
     }'
   ```

2. **执行采集**
   ```bash
   curl -X POST "http://localhost:8000/api/web_collect/execute_all"
   ```

3. **查看采集结果**
   ```bash
   curl "http://localhost:8000/api/web_collect/results?page=1"
   ```

4. **开奖后自动验证**

   当系统采集到开奖数据时(通过 `/collect` 接口),会自动触发验证:
   ```python
   # 在 backend/routes/collect.py 中已集成
   from backend.services.result_verifier import verify_period
   verify_period(period, lottery_type)
   ```

5. **查看统计**
   ```bash
   curl "http://localhost:8000/api/web_collect/stats"
   ```

## 前端集成

在前端页面中引入模块:

```html
<script src="modules/web_collect.js"></script>
```

基本UI结构:

```html
<div id="webCollectModule">
  <!-- 标签切换 -->
  <div class="tabs">
    <button class="tab-btn active" data-tab="sourcesTab">采集源管理</button>
    <button class="tab-btn" data-tab="resultsTab">采集结果</button>
    <button class="tab-btn" data-tab="statsTab">统计分析</button>
  </div>

  <!-- 采集源管理标签 -->
  <div id="sourcesTab" class="tab-content active">
    <button id="addSourceBtn">添加采集源</button>
    <button id="executeAllBtn">执行所有采集</button>
    <table>
      <thead>...</thead>
      <tbody id="sourcesTableBody"></tbody>
    </table>
    <div id="sourcesPagination"></div>
  </div>

  <!-- 采集结果标签 -->
  <div id="resultsTab" class="tab-content">
    <button id="verifyAllBtn">验证所有</button>
    <table>
      <thead>...</thead>
      <tbody id="resultsTableBody"></tbody>
    </table>
    <div id="resultsPagination"></div>
  </div>

  <!-- 统计分析标签 -->
  <div id="statsTab" class="tab-content">
    <div id="statsDisplay"></div>
  </div>
</div>

<!-- 模态框 -->
<div id="sourceModal" class="modal">
  <div class="modal-content">
    <h3 id="modalTitle">添加采集源</h3>
    <form id="sourceForm">
      <input name="sourceName" placeholder="采集源名称" required>
      <input name="sourceUrl" placeholder="网址" required>
      <select name="lotteryType">
        <option value="am">澳门</option>
        <option value="hk">香港</option>
      </select>
      <select name="dataType">
        <option value="numbers">号码</option>
        <option value="animals">生肖</option>
      </select>
      <textarea name="extractConfig" placeholder="提取配置(JSON)" rows="10"></textarea>
      <label><input type="checkbox" name="isActive"> 启用</label>
      <textarea name="description" placeholder="描述"></textarea>
    </form>
    <button id="saveSourceBtn">保存</button>
    <button id="closeModalBtn">取消</button>
  </div>
</div>
```

## 注意事项

1. **提取配置测试**: 建议先在浏览器开发者工具中测试CSS选择器或正则表达式是否正确
2. **期号格式**: 期号应为7位数字,格式如 "2025198"
3. **数据标准化**:
   - 号码自动格式化为两位数 "01,02,03"
   - 生肖必须是标准十二生肖之一
4. **验证逻辑**: 至少命中1个即判定为"正确"
5. **性能优化**: 大量采集源建议分批执行,避免同时请求过多网址

## 故障排查

### 采集失败
- 检查网址是否可访问
- 检查提取配置是否正确
- 查看后端控制台日志

### 验证失败
- 确认开奖数据已存在于 `lottery_result` 表
- 确认期号格式一致
- 检查数据类型是否匹配

### 前端无法显示
- 检查API地址是否正确 (window.API_BASE)
- 打开浏览器控制台查看错误信息
- 确认后端服务已启动

## 技术支持

遇到问题请检查:
1. 后端日志: 查看控制台输出
2. API文档: http://localhost:8000/docs
3. 数据库表: `collect_sources` 和 `collected_data`

## 扩展功能建议

未来可以添加:
- [ ] 定时自动采集(集成到 scheduler)
- [ ] 采集历史图表展示
- [ ] 导出采集结果为CSV
- [ ] 采集源失败报警通知
- [ ] 支持更多提取方式(JSON API等)
