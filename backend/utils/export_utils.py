"""
CSV导出工具模块

本模块提供CSV文件导出的高级封装，统一导出逻辑。

核心功能：
- 简化CSV导出流程
- 统一响应头设置
- 支持自定义文件名和编码

设计原则：
- 单一职责：只负责CSV导出，不处理业务逻辑
- 标准化：统一导出格式和HTTP响应头
- 易用性：一行代码完成导出
"""

import io
import csv
from typing import List, Any
from fastapi.responses import StreamingResponse


def create_csv_response(
    headers: List[str],
    rows: List[List[Any]],
    filename: str,
    encoding: str = 'utf-8-sig'
) -> StreamingResponse:
    """
    创建CSV导出响应

    功能说明：
        将数据转换为CSV格式并生成HTTP响应。
        自动处理中文编码，兼容Excel打开。

    参数：
        headers (List[str]): 表头列表
            示例: ['期号', '开奖时间', '号码']

        rows (List[List[Any]]): 数据行列表，每行是一个列表
            示例: [
                ['2025100', '2025-01-15', '01,05,12'],
                ['2025099', '2025-01-14', '03,08,15']
            ]

        filename (str): 下载文件名，建议包含 .csv 后缀
            示例: 'lottery_data_am_2025.csv'

        encoding (str): 文件编码，默认 'utf-8-sig'
            - 'utf-8-sig': 带BOM的UTF-8，Excel可正常打开（推荐）
            - 'utf-8': 标准UTF-8，部分Excel可能乱码
            - 'gbk': 简体中文编码，兼容老版本Excel

    返回：
        StreamingResponse: FastAPI流式响应对象

    示例：
        >>> # 基本用法
        >>> headers = ['期号', '开奖时间', '号码']
        >>> rows = [
        ...     ['2025100', '2025-01-15', '01,05,12,23,35,42,49'],
        ...     ['2025099', '2025-01-14', '03,08,15,22,31,39,44']
        ... ]
        >>> return create_csv_response(headers, rows, 'lottery_am.csv')

        >>> # 在API路由中使用
        >>> @router.get("/export_data")
        >>> def export_data(lottery_type: str):
        ...     # 查询数据
        ...     data = query_records("SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type=%s", (lottery_type,))
        ...     # 转换为行列表
        ...     rows = [[d['period'], d['open_time'], d['numbers']] for d in data]
        ...     # 导出
        ...     return create_csv_response(
        ...         headers=['期号', '开奖时间', '号码'],
        ...         rows=rows,
        ...         filename=f'lottery_{lottery_type}.csv'
        ...     )

    编码说明：
        - utf-8-sig: 带BOM（Byte Order Mark），Excel可识别UTF-8
        - 如果用户报告乱码，尝试使用 encoding='gbk'
        - 现代浏览器和文本编辑器都支持 utf-8-sig

    性能提示：
        - 对于大数据集（>10万行），考虑使用生成器分批写入
        - 当前实现将所有数据加载到内存，适合中小数据集

    替换前后对比：
        # 旧代码（11行）
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['期号', '开奖时间', '号码'])
        for item in data:
            writer.writerow([item['period'], item['open_time'], item['numbers']])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=lottery.csv"}
        )

        # 新代码（5行）
        rows = [[d['period'], d['open_time'], d['numbers']] for d in data]
        return create_csv_response(
            headers=['期号', '开奖时间', '号码'],
            rows=rows,
            filename='lottery.csv'
        )
    """
    # 创建内存中的字符串IO对象
    output = io.StringIO()

    # 创建CSV写入器
    writer = csv.writer(output)

    # 写入表头
    writer.writerow(headers)

    # 写入数据行
    for row in rows:
        writer.writerow(row)

    # 重置读取位置到开头
    output.seek(0)

    # 获取CSV内容
    csv_content = output.getvalue()

    # 处理编码（如果需要）
    if encoding != 'utf-8':
        csv_bytes = csv_content.encode(encoding)
        content = csv_bytes
        media_type = "text/csv"
    else:
        # UTF-8-sig 需要添加BOM
        if encoding == 'utf-8-sig':
            csv_content = '\ufeff' + csv_content  # 添加BOM
        content = csv_content
        media_type = "text/csv; charset=utf-8"

    # 创建流式响应
    response = StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )

    return response


def create_csv_from_dicts(
    data: List[dict],
    field_mapping: dict,
    filename: str,
    encoding: str = 'utf-8-sig'
) -> StreamingResponse:
    """
    从字典列表创建CSV导出

    功能说明：
        直接从数据库查询结果（字典列表）生成CSV，无需手动转换。
        支持字段重命名和选择性导出。

    参数：
        data (List[dict]): 数据字典列表（通常来自数据库查询）
            示例: [{'period': '2025100', 'numbers': '01,05,12'}, ...]

        field_mapping (dict): 字段映射，键为数据库字段名，值为CSV表头
            示例: {'period': '期号', 'numbers': '开奖号码', 'open_time': '开奖时间'}

        filename (str): 下载文件名

        encoding (str): 文件编码，默认 'utf-8-sig'

    返回：
        StreamingResponse: FastAPI流式响应对象

    示例：
        >>> # 从数据库查询结果直接导出
        >>> data = query_records("SELECT period, numbers, open_time FROM lottery_result WHERE lottery_type=%s", ('am',))
        >>> field_mapping = {
        ...     'period': '期号',
        ...     'open_time': '开奖时间',
        ...     'numbers': '开奖号码'
        ... }
        >>> return create_csv_from_dicts(data, field_mapping, 'lottery_am.csv')

        >>> # 只导出部分字段
        >>> field_mapping = {
        ...     'period': '期号',
        ...     'numbers': '号码'  # 不导出 open_time
        ... }

    设计优势：
        - 无需手动遍历和转换数据
        - 支持字段重命名和顺序控制
        - 只导出需要的字段，提高安全性

    实现原理：
        1. 使用 field_mapping.keys() 作为要提取的字段
        2. 使用 field_mapping.values() 作为CSV表头
        3. 按映射顺序提取每行数据
    """
    # 提取表头（按照 field_mapping 的顺序）
    headers = list(field_mapping.values())

    # 转换数据为行列表
    rows = []
    for record in data:
        row = [record.get(field, '') for field in field_mapping.keys()]
        rows.append(row)

    # 调用基础导出函数
    return create_csv_response(headers, rows, filename, encoding)


def create_empty_csv_response(
    filename: str,
    message: str = "暂无数据"
) -> StreamingResponse:
    """
    创建空CSV响应（用于无数据情况）

    功能说明：
        当查询无结果时，返回包含提示信息的空CSV文件。

    参数：
        filename (str): 下载文件名
        message (str): 提示信息，默认 "暂无数据"

    返回：
        StreamingResponse: 包含提示信息的CSV响应

    示例：
        >>> data = query_records("SELECT * FROM lottery_result WHERE year=%s", ('9999',))
        >>> if not data:
        ...     return create_empty_csv_response('lottery_9999.csv', '该年份暂无数据')
    """
    headers = ['提示']
    rows = [[message]]
    return create_csv_response(headers, rows, filename)


# ============ 高级功能：大数据集流式导出 ============

def create_streaming_csv_response(
    headers: List[str],
    data_generator,
    filename: str,
    encoding: str = 'utf-8-sig'
) -> StreamingResponse:
    """
    流式CSV导出（适用于超大数据集）

    功能说明：
        使用生成器逐行写入CSV，避免一次性加载所有数据到内存。
        适用于百万级以上的数据导出。

    参数：
        headers (List[str]): 表头列表
        data_generator: 数据生成器，每次 yield 一行数据（列表）
        filename (str): 下载文件名
        encoding (str): 文件编码

    返回：
        StreamingResponse: 流式响应对象

    示例：
        >>> def data_generator():
        ...     # 分批查询，避免一次性加载
        ...     offset = 0
        ...     batch_size = 1000
        ...     while True:
        ...         rows = query_records(
        ...             "SELECT * FROM lottery_result LIMIT %s OFFSET %s",
        ...             (batch_size, offset)
        ...         )
        ...         if not rows:
        ...             break
        ...         for row in rows:
        ...             yield [row['period'], row['numbers'], row['open_time']]
        ...         offset += batch_size
        ...
        >>> return create_streaming_csv_response(
        ...     headers=['期号', '号码', '开奖时间'],
        ...     data_generator=data_generator(),
        ...     filename='all_lottery_data.csv'
        ... )

    性能优势：
        - 内存占用恒定，不受数据量影响
        - 适合百万级以上数据导出
        - 用户可立即开始下载，无需等待全部数据准备完毕

    注意事项：
        - 生成器不能重复使用
        - 导出过程中数据库连接保持打开，注意超时设置
    """
    def generate_csv():
        # 创建字符串缓冲区
        output = io.StringIO()
        writer = csv.writer(output)

        # 写入BOM（如果需要）
        if encoding == 'utf-8-sig':
            yield '\ufeff'

        # 写入表头
        writer.writerow(headers)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        # 逐行写入数据
        for row in data_generator:
            writer.writerow(row)
            content = output.getvalue()
            yield content
            # 清空缓冲区，准备下一行
            output.seek(0)
            output.truncate(0)

    return StreamingResponse(
        generate_csv(),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )


# ============ 使用示例 ============

if __name__ == "__main__":
    print("=== CSV导出工具模块演示 ===\n")

    # 示例1: 基本导出
    print("1. 基本CSV导出")
    headers = ['期号', '开奖时间', '号码']
    rows = [
        ['2025100', '2025-01-15 21:30:00', '01,05,12,23,35,42,49'],
        ['2025099', '2025-01-14 21:30:00', '03,08,15,22,31,39,44'],
        ['2025098', '2025-01-13 21:30:00', '02,07,14,25,33,40,45']
    ]
    response = create_csv_response(headers, rows, 'lottery_demo.csv')
    print(f"   生成响应: {response.media_type}")
    print(f"   文件名: lottery_demo.csv")
    print(f"   数据行数: {len(rows)}")

    # 示例2: 从字典列表导出
    print("\n2. 从字典列表导出")
    data = [
        {'period': '2025100', 'numbers': '01,05,12', 'open_time': '2025-01-15'},
        {'period': '2025099', 'numbers': '03,08,15', 'open_time': '2025-01-14'}
    ]
    field_mapping = {
        'period': '期号',
        'open_time': '开奖时间',
        'numbers': '开奖号码'
    }
    response = create_csv_from_dicts(data, field_mapping, 'lottery_from_dict.csv')
    print(f"   字段映射: {field_mapping}")
    print(f"   数据行数: {len(data)}")

    # 示例3: 空数据响应
    print("\n3. 空数据响应")
    response = create_empty_csv_response('empty_data.csv', '该年份暂无数据')
    print(f"   提示信息: 该年份暂无数据")

    # 示例4: 流式导出（演示生成器）
    print("\n4. 流式导出（大数据集）")
    def demo_generator():
        """模拟大数据集生成器"""
        for i in range(1, 101):
            period = f'2025{i:03d}'
            numbers = f'{i:02d},{i+5:02d},{i+10:02d}'
            yield [period, numbers]

    response = create_streaming_csv_response(
        headers=['期号', '号码'],
        data_generator=demo_generator(),
        filename='big_data_demo.csv'
    )
    print(f"   流式导出100行数据")
    print(f"   内存占用恒定")

    print("\n=== 演示完成 ===")
    print("\n使用建议:")
    print("- 小于10万行: 使用 create_csv_response()")
    print("- 大于10万行: 使用 create_streaming_csv_response()")
    print("- 数据库结果: 使用 create_csv_from_dicts()")
    print("- 无数据情况: 使用 create_empty_csv_response()")
