# 推荐8码命中情况分析API接口文档

## 概述

本文档描述了推荐8码命中情况分析相关的API接口，这些接口支持前端实现期数选择、搜索筛选和命中分析功能。

## API接口列表

### 1. 获取推荐历史记录

**接口地址：** `GET /api/recommend_history`

**功能描述：** 获取指定彩种的所有推荐8码期数历史记录，按期数分组显示。

**请求参数：**
- `lottery_type` (string, 可选): 彩种类型，支持 `am`(澳门) 和 `hk`(香港)，默认为 `am`

**请求示例：**
```bash
GET /api/recommend_history?lottery_type=am
GET /api/recommend_history?lottery_type=hk
```

**响应格式：**
```json
{
  "success": true,
  "data": [
    {
      "period": "2025200",
      "created_at": "2025-01-20T10:30:00"
    },
    {
      "period": "2025195",
      "created_at": "2025-01-15T10:30:00"
    }
  ]
}
```

**响应字段说明：**
- `success`: 请求是否成功
- `data`: 推荐期数列表
  - `period`: 期数
  - `created_at`: 推荐生成时间

### 2. 获取指定期数推荐数据

**接口地址：** `GET /api/recommend_by_period`

**功能描述：** 获取指定期数的推荐8码数据，用于分析该期的命中情况。

**请求参数：**
- `lottery_type` (string, 必需): 彩种类型，支持 `am`(澳门) 和 `hk`(香港)
- `period` (string, 必需): 期数，如 "2025200"

**请求示例：**
```bash
GET /api/recommend_by_period?lottery_type=am&period=2025200
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "period": "2025200",
    "lottery_type": "am",
    "recommend_numbers": [
      ["01", "02", "03", "04", "05", "06", "07", "08"],
      ["09", "10", "11", "12", "13", "14", "15", "16"],
      ["17", "18", "19", "20", "21", "22", "23", "24"],
      ["25", "26", "27", "28", "29", "30", "31", "32"],
      ["33", "34", "35", "36", "37", "38", "39", "40"],
      ["41", "42", "43", "44", "45", "46", "47", "48"],
      ["49", "01", "02", "03", "04", "05", "06", "07"]
    ],
    "positions": [
      {
        "position": 1,
        "numbers": "01,02,03,04,05,06,07,08"
      },
      {
        "position": 2,
        "numbers": "09,10,11,12,13,14,15,16"
      }
    ]
  }
}
```

**响应字段说明：**
- `success`: 请求是否成功
- `data`: 推荐数据
  - `period`: 期数
  - `lottery_type`: 彩种类型
  - `recommend_numbers`: 7个位置的推荐8码数组
  - `positions`: 位置详细信息

### 3. 获取推荐统计信息

**接口地址：** `GET /api/recommend_stats`

**功能描述：** 获取推荐8码的统计信息，包括总数、最新期数、最早期数等。

**请求参数：**
- `lottery_type` (string, 可选): 彩种类型，支持 `am`(澳门) 和 `hk`(香港)，默认为 `am`

**请求示例：**
```bash
GET /api/recommend_stats?lottery_type=am
GET /api/recommend_stats?lottery_type=hk
```

**响应格式：**
```json
{
  "success": true,
  "data": {
    "total_periods": 25,
    "latest_period": "2025200",
    "earliest_period": "2025005",
    "recent_periods": [
      {
        "period": "2025200",
        "created_at": "2025-01-20T10:30:00"
      },
      {
        "period": "2025195",
        "created_at": "2025-01-15T10:30:00"
      }
    ],
    "lottery_type": "am"
  }
}
```

**响应字段说明：**
- `success`: 请求是否成功
- `data`: 统计信息
  - `total_periods`: 总推荐期数
  - `latest_period`: 最新推荐期数
  - `earliest_period`: 最早推荐期数
  - `recent_periods`: 最近5期推荐期数
  - `lottery_type`: 彩种类型

## 数据库表结构

### recommend_result 表

```sql
CREATE TABLE recommend_result (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `lottery_type` varchar(10) NOT NULL COMMENT '彩种类型，am=澳门，hk=香港',
  `period` varchar(16) NOT NULL COMMENT '推荐基于的期号',
  `position` int(11) NOT NULL COMMENT '位置，1~7',
  `numbers` varchar(50) NOT NULL COMMENT '推荐的8个号码，逗号分隔',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_type_period_position` (`lottery_type`,`period`,`position`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐8码历史记录表';
```

## 错误处理

所有API接口都遵循统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误描述信息"
}
```

常见错误情况：
- 数据库连接失败
- 查询参数无效
- 数据不存在
- 服务器内部错误

## 使用示例

### 前端调用示例

```javascript
// 获取推荐历史
async function getRecommendHistory(lotteryType = 'am') {
  try {
    const response = await fetch(`/api/recommend_history?lottery_type=${lotteryType}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      console.error('获取推荐历史失败:', data.message);
      return [];
    }
  } catch (error) {
    console.error('API调用失败:', error);
    return [];
  }
}

// 获取指定期数推荐数据
async function getRecommendByPeriod(lotteryType, period) {
  try {
    const response = await fetch(`/api/recommend_by_period?lottery_type=${lotteryType}&period=${period}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      console.error('获取推荐数据失败:', data.message);
      return null;
    }
  } catch (error) {
    console.error('API调用失败:', error);
    return null;
  }
}

// 获取推荐统计信息
async function getRecommendStats(lotteryType = 'am') {
  try {
    const response = await fetch(`/api/recommend_stats?lottery_type=${lotteryType}`);
    const data = await response.json();
    
    if (data.success) {
      return data.data;
    } else {
      console.error('获取推荐统计失败:', data.message);
      return null;
    }
  } catch (error) {
    console.error('API调用失败:', error);
    return null;
  }
}
```

## 测试

使用提供的测试脚本 `test_recommend_api.py` 来验证API接口：

```bash
cd backend
python test_recommend_api.py
```

## 注意事项

1. 确保数据库中有推荐数据
2. 期数格式必须与数据库中的格式一致
3. 彩种类型必须是 `am` 或 `hk`
4. 所有时间字段使用ISO 8601格式
5. 推荐号码数组按位置索引（0-6）对应7个位置

## 更新日志

- 2025-01-20: 创建API接口文档
- 2025-01-20: 添加推荐历史、指定期数、统计信息三个API接口
- 2025-01-20: 完善错误处理和响应格式 