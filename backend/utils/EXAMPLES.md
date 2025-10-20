# 工具箱模块使用示例

本文档提供实际业务场景中的使用示例，帮助开发者快速上手。

---

## 目录

1. [数值处理示例](#数值处理示例)
2. [数据库操作示例](#数据库操作示例)
3. [CSV导出示例](#csv导出示例)
4. [分页功能示例](#分页功能示例)
5. [综合应用示例](#综合应用示例)

---

## 数值处理示例

### 示例1: 生成区间号码（最常用）

```python
from backend.utils import number_utils

# 场景：基于当前号码生成 +1~+20 区间
base_number = 25

# 方式1: 使用 generate_interval_range（推荐）
interval = number_utils.generate_interval_range(base_number, 1, 20)
print(interval)  # [26, 27, 28, ..., 45]

# 方式2: 使用 apply_offsets
offsets = list(range(1, 21))
interval = number_utils.apply_offsets(base_number, offsets)
print(interval)  # [26, 27, 28, ..., 45]
```

### 示例2: 生成多个标准区间

```python
from backend.utils import number_utils

base_number = 45

# 生成6个标准区间
intervals = [
    ('+1~+20', 1, 20),
    ('+5~+24', 5, 24),
    ('+10~+29', 10, 29),
    ('+15~+34', 15, 34),
    ('+20~+39', 20, 39),
    ('+25~+44', 25, 44)
]

result = {}
for label, start, end in intervals:
    numbers = number_utils.generate_interval_range(base_number, start, end)
    result[label] = numbers

# result = {
#     '+1~+20': [46, 47, 48, 49, 1, 2, ..., 16],
#     '+5~+24': [1, 2, 3, ..., 20],
#     ...
# }
```

### 示例3: 号码循环计算

```python
from backend.utils import number_utils

# 单个号码循环
print(number_utils.wrap_in_range(50, 1, 49))   # 1
print(number_utils.wrap_in_range(0, 1, 49))    # 49
print(number_utils.wrap_in_range(-5, 1, 49))   # 44

# 批量偏移（用于推荐算法）
base = 48
offsets = [1, 2, 3, 4, 5]  # 生成 48+1, 48+2, ...
results = number_utils.apply_offsets(base, offsets)
print(results)  # [49, 1, 2, 3, 4]
```

---

## 数据库操作示例

### 示例1: 简化查询（最常用）

```python
from backend.utils import db_utils

# 旧代码（10行）
conn = collect.get_connection()
cursor = conn.cursor(dictionary=True)
cursor.execute("SELECT * FROM lottery_result WHERE lottery_type=%s LIMIT 10", ('am',))
rows = cursor.fetchall()
cursor.close()
conn.close()

# 新代码（1行）
rows = db_utils.query_records(
    "SELECT * FROM lottery_result WHERE lottery_type=%s LIMIT 10",
    ('am',)
)
```

### 示例2: 上下文管理器（需要多次操作）

```python
from backend.utils import db_utils

# 适用于需要多次数据库操作的场景
with db_utils.get_db_cursor() as cursor:
    # 第一次查询
    cursor.execute("SELECT COUNT(*) as count FROM lottery_result WHERE lottery_type=%s", ('am',))
    total = cursor.fetchone()['count']

    # 第二次查询
    cursor.execute("SELECT * FROM lottery_result WHERE lottery_type=%s LIMIT 10", ('am',))
    rows = cursor.fetchall()

    # 无需手动关闭连接
```

### 示例3: 彩票业务专用查询

```python
from backend.utils import db_utils

# 获取最新期号
latest_period = db_utils.get_latest_period('am')
print(f"最新期号: {latest_period}")

# 获取最新的以0或5结尾的期号（触发推荐的期号）
latest_trigger = db_utils.get_latest_period('am', ending_digit='0')
if not latest_trigger:
    latest_trigger = db_utils.get_latest_period('am', ending_digit='5')

# 查找下一期
current_period = '2025100'
next_period = db_utils.find_next_period('am', current_period)
if next_period:
    print(f"{current_period} 的下一期是: {next_period}")

# 获取最近50期数据（用于推荐算法）
recent_50 = db_utils.get_recent_periods('am', limit=50)
print(f"获取到 {len(recent_50)} 期历史数据")

# 检查期号是否存在
if not db_utils.check_period_exists('am', '2025100'):
    print("该期号不存在，需要采集")
```

### 示例4: 执行INSERT/UPDATE

```python
from backend.utils import db_utils

# 单条插入
affected = db_utils.execute_update(
    "INSERT INTO lottery_result (period, lottery_type, numbers) VALUES (%s, %s, %s)",
    ('2025100', 'am', '01,05,12,23,35,42,49')
)
print(f"插入了 {affected} 条记录")

# 批量插入（性能更好）
sql = "INSERT INTO recommend_result (period, position, numbers, lottery_type) VALUES (%s, %s, %s, %s)"
params_list = [
    ('2025100', 1, '01,05,12,23,35,42,49,48', 'am'),
    ('2025100', 2, '03,08,15,22,31,39,44,46', 'am'),
    ('2025100', 3, '02,07,14,25,33,40,45,47', 'am'),
]
total = db_utils.execute_batch(sql, params_list)
print(f"批量插入了 {total} 条记录")
```

---

## CSV导出示例

### 示例1: 基础导出

```python
from backend.utils import export_utils
from fastapi import APIRouter

router = APIRouter()

@router.get("/export_lottery")
def export_lottery(lottery_type: str):
    # 查询数据
    data = db_utils.query_records(
        "SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC",
        (lottery_type,)
    )

    # 转换为行列表
    rows = [[d['period'], str(d['open_time']), d['numbers']] for d in data]

    # 导出CSV
    return export_utils.create_csv_response(
        headers=['期号', '开奖时间', '开奖号码'],
        rows=rows,
        filename=f'lottery_{lottery_type}.csv'
    )
```

### 示例2: 从字典直接导出（推荐）

```python
from backend.utils import export_utils, db_utils

@router.get("/export_lottery_v2")
def export_lottery_v2(lottery_type: str):
    # 查询数据
    data = db_utils.query_records(
        "SELECT period, open_time, numbers, animals FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC",
        (lottery_type,)
    )

    # 定义字段映射（键=数据库字段，值=CSV表头）
    field_mapping = {
        'period': '期号',
        'open_time': '开奖时间',
        'numbers': '开奖号码',
        'animals': '生肖'
    }

    # 一行代码完成导出
    return export_utils.create_csv_from_dicts(
        data,
        field_mapping,
        f'lottery_{lottery_type}.csv'
    )
```

### 示例3: 空数据处理

```python
from backend.utils import export_utils, db_utils

@router.get("/export_by_year")
def export_by_year(lottery_type: str, year: str):
    # 查询数据
    data = db_utils.query_records(
        "SELECT period, numbers FROM lottery_result WHERE lottery_type=%s AND period LIKE %s",
        (lottery_type, f'{year}%')
    )

    # 检查是否有数据
    if not data:
        return export_utils.create_empty_csv_response(
            f'lottery_{lottery_type}_{year}.csv',
            f'{year}年暂无数据'
        )

    # 有数据则正常导出
    field_mapping = {'period': '期号', 'numbers': '号码'}
    return export_utils.create_csv_from_dicts(
        data,
        field_mapping,
        f'lottery_{lottery_type}_{year}.csv'
    )
```

### 示例4: 大数据集流式导出

```python
from backend.utils import export_utils, db_utils

@router.get("/export_all_data")
def export_all_data(lottery_type: str):
    """
    导出所有历史数据（可能有几十万条）
    使用流式导出避免内存溢出
    """
    def data_generator():
        offset = 0
        batch_size = 1000
        while True:
            # 分批查询
            batch = db_utils.query_records(
                "SELECT period, numbers FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT %s OFFSET %s",
                (lottery_type, batch_size, offset)
            )
            if not batch:
                break

            # 逐行产出
            for record in batch:
                yield [record['period'], record['numbers']]

            offset += batch_size

    return export_utils.create_streaming_csv_response(
        headers=['期号', '号码'],
        data_generator=data_generator(),
        filename=f'lottery_{lottery_type}_all.csv'
    )
```

---

## 分页功能示例

### 示例1: 内存分页（数据已加载）

```python
from backend.utils import pagination_utils, db_utils

@router.get("/records")
def get_records(lottery_type: str, page: int = 1, page_size: int = 20):
    # 查询所有数据
    all_data = db_utils.query_records(
        "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC",
        (lottery_type,)
    )

    # 一行代码完成分页
    return pagination_utils.paginate(all_data, page, page_size)

# 返回格式：
# {
#     "data": [记录1, 记录2, ..., 记录20],
#     "total": 500,
#     "page": 1,
#     "page_size": 20,
#     "total_pages": 25,
#     "has_prev": false,
#     "has_next": true
# }
```

### 示例2: 数据库分页（大数据集，推荐）

```python
from backend.utils import pagination_utils, db_utils

@router.get("/records_optimized")
def get_records_optimized(lottery_type: str, page: int = 1, page_size: int = 20):
    # 第一步：查询总数
    total_result = db_utils.query_one_record(
        "SELECT COUNT(*) as count FROM lottery_result WHERE lottery_type=%s",
        (lottery_type,)
    )
    total = total_result['count']

    # 第二步：计算分页参数
    pagination = pagination_utils.paginate_with_sql(total, page, page_size)

    # 第三步：执行分页查询
    data = db_utils.query_records(
        "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT %s OFFSET %s",
        (lottery_type, pagination['limit'], pagination['offset'])
    )

    # 第四步：返回结果
    return {
        'data': data,
        'total': pagination['total'],
        'page': pagination['page'],
        'page_size': pagination['page_size'],
        'total_pages': pagination['total_pages'],
        'has_prev': pagination['has_prev'],
        'has_next': pagination['has_next']
    }
```

### 示例3: 带筛选条件的分页

```python
from backend.utils import pagination_utils, db_utils

@router.get("/records_filtered")
def get_records_filtered(
    lottery_type: str,
    year: str = None,
    page: int = 1,
    page_size: int = 20
):
    # 构建SQL和参数
    if year:
        sql = "SELECT * FROM lottery_result WHERE lottery_type=%s AND period LIKE %s ORDER BY period DESC"
        params = (lottery_type, f'{year}%')
    else:
        sql = "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC"
        params = (lottery_type,)

    # 查询数据
    all_data = db_utils.query_records(sql, params)

    # 分页
    return pagination_utils.paginate(all_data, page, page_size)
```

---

## 综合应用示例

### 示例1: 完整的区间分析API

```python
from fastapi import APIRouter, Query
from backend.utils import number_utils, db_utils, export_utils, pagination_utils

router = APIRouter()

@router.get("/interval_analysis")
def interval_analysis_api(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    export: str = Query(None)
):
    """区间分析API，支持分页和CSV导出"""

    # 1. 查询所有历史数据
    all_records = db_utils.query_records(
        "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period ASC",
        (lottery_type,)
    )

    if len(all_records) < 2:
        return {"error": "数据不足"}

    # 2. 定义标准区间
    intervals = [
        ('+1~+20', 1, 20),
        ('+5~+24', 5, 24),
        ('+10~+29', 10, 29),
        ('+15~+34', 15, 34),
        ('+20~+39', 20, 39),
        ('+25~+44', 25, 44)
    ]

    # 3. 分析每一期
    results = []
    for i in range(len(all_records) - 1):
        current = all_records[i]
        next_record = all_records[i + 1]

        # 获取当前期第7个号码
        current_numbers = current['numbers'].split(',')
        seventh_number = int(current_numbers[6]) if len(current_numbers) >= 7 else None

        if seventh_number is None:
            continue

        # 生成各区间并检查命中
        interval_results = []
        next_numbers = next_record['numbers'].split(',')
        next_seventh = int(next_numbers[6]) if len(next_numbers) >= 7 else None

        for label, start, end in intervals:
            # 使用工具生成区间
            interval = number_utils.generate_interval_range(seventh_number, start, end)

            # 检查是否命中
            hit = next_seventh in interval if next_seventh else False

            interval_results.append({
                'label': label,
                'interval': interval,
                'hit': hit
            })

        results.append({
            'period': current['period'],
            'seventh_number': seventh_number,
            'next_period': next_record['period'],
            'next_seventh': next_seventh,
            'intervals': interval_results
        })

    # 4. 如果请求导出CSV
    if export == 'csv':
        rows = []
        for item in results:
            for interval_info in item['intervals']:
                rows.append([
                    item['period'],
                    item['seventh_number'],
                    interval_info['label'],
                    ','.join(map(str, interval_info['interval'][:5])) + '...',  # 只显示前5个
                    item['next_period'],
                    item['next_seventh'],
                    '命中' if interval_info['hit'] else '遗漏'
                ])

        return export_utils.create_csv_response(
            headers=['期号', '第7号码', '区间', '区间号码（部分）', '下一期', '下期第7号码', '结果'],
            rows=rows,
            filename=f'interval_analysis_{lottery_type}.csv'
        )

    # 5. 分页返回JSON
    return pagination_utils.paginate(results, page, page_size)
```

### 示例2: 推荐算法优化版

```python
from backend.utils import number_utils, db_utils

@router.get("/recommend_optimized")
def recommend_optimized_api(lottery_type: str):
    """优化后的推荐算法，使用工具模块"""

    # 1. 获取最近50期数据（使用工具函数）
    recent_50 = db_utils.get_recent_periods(lottery_type, limit=50)

    if len(recent_50) < 50:
        return {"error": "历史数据不足50期"}

    # 2. 为每个位置生成推荐
    recommendations = []
    for position in range(7):
        # 统计该位置各号码的出现频率和最后出现位置
        number_stats = {}

        for idx, record in enumerate(recent_50):
            numbers = record['numbers'].split(',')
            if position < len(numbers):
                num = int(numbers[position])
                if num not in number_stats:
                    number_stats[num] = {'count': 0, 'last_idx': -1}
                number_stats[num]['count'] += 1
                number_stats[num]['last_idx'] = idx

        # 3. 计算平均间隔并筛选候选号码
        candidates = []
        for num, stats in number_stats.items():
            if stats['count'] > 0:
                avg_gap = (50 - stats['last_idx']) / stats['count']
                if 4 <= avg_gap <= 6:
                    candidates.append((num, stats['last_idx'], avg_gap))

        # 4. 按最后出现位置排序，取前8个
        candidates.sort(key=lambda x: x[1])
        top_8 = [num for num, _, _ in candidates[:8]]

        # 5. 为每个推荐号码生成偏移（可选，演示工具使用）
        extended_recommendations = []
        for num in top_8:
            # 生成 +0, +1, +2 三个号码
            offsets = number_utils.apply_offsets(num, [0, 1, 2])
            extended_recommendations.extend(offsets)

        # 去重
        extended_recommendations = list(set(extended_recommendations))[:8]

        recommendations.append({
            'position': position + 1,
            'numbers': number_utils.format_number_with_padding(n) for n in extended_recommendations
        })

    return {'recommendations': recommendations}
```

### 示例3: 数据采集与验证

```python
from backend.utils import db_utils

@router.post("/collect_and_save")
def collect_and_save(lottery_type: str, period: str, numbers: str):
    """采集数据并保存，带重复检查"""

    # 1. 检查期号是否已存在
    if db_utils.check_period_exists(lottery_type, period):
        return {"status": "skipped", "message": "期号已存在"}

    # 2. 保存数据
    affected = db_utils.execute_update(
        "INSERT INTO lottery_result (period, lottery_type, numbers, open_time) VALUES (%s, %s, %s, NOW())",
        (period, lottery_type, numbers)
    )

    # 3. 检查是否需要生成推荐（期号以0或5结尾）
    should_generate_recommend = period.endswith(('0', '5'))

    if should_generate_recommend:
        # 调用推荐生成函数（这里省略）
        pass

    return {
        "status": "success",
        "affected": affected,
        "recommend_generated": should_generate_recommend
    }
```

---

## 性能优化建议

### 1. 数据库查询优化

```python
# 不推荐：多次查询
for period in periods:
    data = db_utils.query_one_record(
        "SELECT * FROM lottery_result WHERE period=%s",
        (period,)
    )

# 推荐：一次查询
periods_str = ','.join(f"'{p}'" for p in periods)
data = db_utils.query_records(
    f"SELECT * FROM lottery_result WHERE period IN ({periods_str})"
)
```

### 2. 分页选择

```python
# 数据量 < 1万：使用内存分页
result = pagination_utils.paginate(all_data, page, page_size)

# 数据量 > 1万：使用数据库分页
pagination = pagination_utils.paginate_with_sql(total, page, page_size)
data = db_utils.query_records(sql, params + (pagination['limit'], pagination['offset']))
```

### 3. CSV导出选择

```python
# 数据量 < 10万：普通导出
return export_utils.create_csv_response(headers, rows, filename)

# 数据量 > 10万：流式导出
return export_utils.create_streaming_csv_response(headers, data_generator(), filename)
```

---

## 常见错误与解决

### 错误1: 导入失败

```python
# 错误
from utils import number_utils  # ModuleNotFoundError

# 正确
from backend.utils import number_utils
```

### 错误2: 数据库连接未关闭

```python
# 错误
cursor = db_utils.get_db_cursor()
cursor.execute(...)  # 连接未关闭

# 正确
with db_utils.get_db_cursor() as cursor:
    cursor.execute(...)  # 自动关闭
```

### 错误3: CSV导出中文乱码

```python
# 如果默认编码乱码，尝试使用 gbk
return export_utils.create_csv_response(
    headers, rows, filename,
    encoding='gbk'  # 兼容老版本Excel
)
```

---

**更新日期**: 2025-01-20
**文档版本**: v1.0
