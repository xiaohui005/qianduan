"""
分页工具模块

本模块提供数据分页的标准化实现。

核心功能：
- 自动计算分页参数（总页数、偏移量等）
- 数据切片和分页结果封装
- 统一的分页响应格式

设计原则：
- 标准化：统一的分页接口和响应格式
- 安全性：自动处理边界情况（页码越界等）
- 易用性：一行代码完成分页
"""

from typing import List, Any, Dict
from math import ceil


def calculate_pagination(
    total: int,
    page: int,
    page_size: int
) -> Dict[str, Any]:
    """
    计算分页信息

    功能说明：
        根据总记录数、页码和每页大小，计算分页相关的所有参数。
        自动处理边界情况，确保页码在合法范围内。

    参数：
        total (int): 总记录数
        page (int): 当前页码（从1开始）
        page_size (int): 每页记录数

    返回：
        Dict: 分页信息字典，包含以下字段：
            - total: 总记录数
            - page: 当前页码（可能被修正）
            - page_size: 每页记录数
            - total_pages: 总页数
            - has_prev: 是否有上一页
            - has_next: 是否有下一页
            - start_index: 起始索引（用于数据切片）
            - end_index: 结束索引（用于数据切片）

    示例：
        >>> pagination = calculate_pagination(total=100, page=3, page_size=20)
        >>> print(pagination)
        {
            'total': 100,
            'page': 3,
            'page_size': 20,
            'total_pages': 5,
            'has_prev': True,
            'has_next': True,
            'start_index': 40,
            'end_index': 60
        }

        >>> # 页码越界自动修正
        >>> pagination = calculate_pagination(total=50, page=100, page_size=10)
        >>> print(pagination['page'])  # 5（自动修正为最后一页）

    边界处理：
        - 如果 total=0，返回空分页信息（page=1, total_pages=0）
        - 如果 page<1，自动修正为 1
        - 如果 page>total_pages，自动修正为 total_pages

    使用场景：
        - API接口中计算分页元数据
        - 前端展示分页按钮状态
        - 数据库查询前计算 LIMIT/OFFSET
    """
    # 计算总页数
    total_pages = ceil(total / page_size) if total > 0 else 0

    # 修正页码范围
    if page < 1:
        page = 1
    elif total_pages > 0 and page > total_pages:
        page = total_pages

    # 计算索引范围
    start_index = (page - 1) * page_size
    end_index = min(start_index + page_size, total)

    # 判断前后页
    has_prev = page > 1
    has_next = page < total_pages

    return {
        'total': total,
        'page': page,
        'page_size': page_size,
        'total_pages': total_pages,
        'has_prev': has_prev,
        'has_next': has_next,
        'start_index': start_index,
        'end_index': end_index
    }


def paginate(
    data: List[Any],
    page: int,
    page_size: int
) -> Dict[str, Any]:
    """
    一站式分页处理

    功能说明：
        对数据列表进行分页切片，并返回完整的分页结果。
        这是最常用的分页函数，整合了计算和切片逻辑。

    参数：
        data (List[Any]): 待分页的数据列表
        page (int): 当前页码（从1开始）
        page_size (int): 每页记录数

    返回：
        Dict: 分页结果字典，包含以下字段：
            - data: 当前页的数据列表
            - total: 总记录数
            - page: 当前页码
            - page_size: 每页记录数
            - total_pages: 总页数
            - has_prev: 是否有上一页
            - has_next: 是否有下一页

    示例：
        >>> # 基本用法
        >>> all_data = list(range(1, 101))  # 1-100的数字
        >>> result = paginate(all_data, page=3, page_size=20)
        >>> print(result['data'])  # [41, 42, ..., 60]
        >>> print(f"第{result['page']}页，共{result['total_pages']}页")

        >>> # 在API中使用
        >>> @router.get("/records")
        >>> def get_records(page: int = 1, page_size: int = 20):
        ...     # 查询所有数据
        ...     all_records = query_records("SELECT * FROM lottery_result ORDER BY period DESC")
        ...     # 分页
        ...     return paginate(all_records, page, page_size)

    返回示例：
        {
            "data": [记录41, 记录42, ..., 记录60],
            "total": 100,
            "page": 3,
            "page_size": 20,
            "total_pages": 5,
            "has_prev": true,
            "has_next": true
        }

    性能提示：
        - 此函数适用于数据已全部加载到内存的场景
        - 如果数据量超大（>10万），建议使用数据库分页（LIMIT/OFFSET）
        - 对于小于1万条的数据，内存分页性能更好（避免多次查询）

    替换前后对比：
        # 旧代码（15行）
        total = len(all_data)
        total_pages = ceil(total / page_size)
        if page < 1:
            page = 1
        elif page > total_pages:
            page = total_pages
        start = (page - 1) * page_size
        end = start + page_size
        page_data = all_data[start:end]
        return {
            'data': page_data,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages
        }

        # 新代码（1行）
        return paginate(all_data, page, page_size)
    """
    # 计算分页信息
    pagination = calculate_pagination(len(data), page, page_size)

    # 切片数据
    page_data = data[pagination['start_index']:pagination['end_index']]

    # 返回完整结果
    return {
        'data': page_data,
        'total': pagination['total'],
        'page': pagination['page'],
        'page_size': pagination['page_size'],
        'total_pages': pagination['total_pages'],
        'has_prev': pagination['has_prev'],
        'has_next': pagination['has_next']
    }


def paginate_with_sql(
    total: int,
    page: int,
    page_size: int
) -> Dict[str, Any]:
    """
    数据库分页参数计算

    功能说明：
        为数据库 LIMIT/OFFSET 查询计算参数。
        适用于大数据集，避免一次性加载所有数据到内存。

    参数：
        total (int): 总记录数（通常通过 COUNT(*) 查询获得）
        page (int): 当前页码（从1开始）
        page_size (int): 每页记录数

    返回：
        Dict: 分页参数字典，包含：
            - limit: SQL LIMIT 参数
            - offset: SQL OFFSET 参数
            - total: 总记录数
            - page: 当前页码
            - page_size: 每页记录数
            - total_pages: 总页数
            - has_prev: 是否有上一页
            - has_next: 是否有下一页

    示例：
        >>> # 第一步：查询总数
        >>> total_result = query_one_record("SELECT COUNT(*) as count FROM lottery_result WHERE lottery_type=%s", ('am',))
        >>> total = total_result['count']
        >>>
        >>> # 第二步：计算分页参数
        >>> pagination = paginate_with_sql(total, page=3, page_size=20)
        >>>
        >>> # 第三步：执行分页查询
        >>> data = query_records(
        ...     "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT %s OFFSET %s",
        ...     ('am', pagination['limit'], pagination['offset'])
        ... )
        >>>
        >>> # 第四步：返回结果
        >>> return {
        ...     'data': data,
        ...     'total': pagination['total'],
        ...     'page': pagination['page'],
        ...     'total_pages': pagination['total_pages']
        ... }

    性能优势：
        - 只查询当前页数据，内存占用小
        - 适合百万级以上数据集
        - 数据库层面过滤，性能更高

    注意事项：
        - 需要执行两次查询（COUNT + SELECT）
        - 对于快速变化的数据，总数可能不准确
        - 索引对分页查询性能影响很大
    """
    # 计算分页信息
    pagination = calculate_pagination(total, page, page_size)

    # 返回SQL参数和元数据
    return {
        'limit': page_size,
        'offset': pagination['start_index'],
        'total': pagination['total'],
        'page': pagination['page'],
        'page_size': pagination['page_size'],
        'total_pages': pagination['total_pages'],
        'has_prev': pagination['has_prev'],
        'has_next': pagination['has_next']
    }


def create_pagination_links(
    base_url: str,
    page: int,
    total_pages: int,
    **query_params
) -> Dict[str, str]:
    """
    生成分页链接

    功能说明：
        为RESTful API生成上一页、下一页、首页、末页的URL。
        符合HATEOAS（超媒体作为应用状态引擎）设计原则。

    参数：
        base_url (str): 基础URL，如 '/api/records'
        page (int): 当前页码
        total_pages (int): 总页数
        **query_params: 其他查询参数，如 lottery_type='am'

    返回：
        Dict: 链接字典，包含：
            - first: 首页链接
            - prev: 上一页链接（如果有）
            - next: 下一页链接（如果有）
            - last: 末页链接

    示例：
        >>> links = create_pagination_links(
        ...     base_url='/api/records',
        ...     page=3,
        ...     total_pages=10,
        ...     lottery_type='am',
        ...     year='2025'
        ... )
        >>> print(links)
        {
            'first': '/api/records?lottery_type=am&year=2025&page=1',
            'prev': '/api/records?lottery_type=am&year=2025&page=2',
            'next': '/api/records?lottery_type=am&year=2025&page=4',
            'last': '/api/records?lottery_type=am&year=2025&page=10'
        }

    使用场景：
        - RESTful API响应中提供分页导航
        - 前端根据链接直接跳转
        - 符合API最佳实践
    """
    # 构建查询字符串
    def build_url(page_num: int) -> str:
        params = {**query_params, 'page': page_num}
        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{base_url}?{query_string}"

    links = {
        'first': build_url(1),
        'last': build_url(total_pages)
    }

    if page > 1:
        links['prev'] = build_url(page - 1)

    if page < total_pages:
        links['next'] = build_url(page + 1)

    return links


# ============ 使用示例 ============

if __name__ == "__main__":
    print("=== 分页工具模块演示 ===\n")

    # 示例1: 计算分页信息
    print("1. 计算分页信息 (calculate_pagination)")
    pagination = calculate_pagination(total=100, page=3, page_size=20)
    print(f"   总记录数: {pagination['total']}")
    print(f"   当前页: {pagination['page']}/{pagination['total_pages']}")
    print(f"   数据范围: [{pagination['start_index']}, {pagination['end_index']})")
    print(f"   有上一页: {pagination['has_prev']}, 有下一页: {pagination['has_next']}")

    # 示例2: 内存分页
    print("\n2. 内存分页 (paginate)")
    all_data = [f"记录{i}" for i in range(1, 101)]
    result = paginate(all_data, page=3, page_size=20)
    print(f"   总记录数: {result['total']}")
    print(f"   当前页: {result['page']}/{result['total_pages']}")
    print(f"   当前页数据: {result['data'][:3]}...{result['data'][-3:]} (共{len(result['data'])}条)")

    # 示例3: 边界情况测试
    print("\n3. 边界情况测试")
    test_cases = [
        (100, 0, 20),    # 页码<1
        (100, 999, 20),  # 页码>总页数
        (0, 1, 20),      # 空数据
        (5, 1, 10),      # 数据少于一页
    ]
    for total, page, page_size in test_cases:
        pagination = calculate_pagination(total, page, page_size)
        print(f"   total={total}, page={page} -> 修正为page={pagination['page']}, total_pages={pagination['total_pages']}")

    # 示例4: 数据库分页
    print("\n4. 数据库分页 (paginate_with_sql)")
    sql_pagination = paginate_with_sql(total=500, page=5, page_size=50)
    print(f"   SQL: LIMIT {sql_pagination['limit']} OFFSET {sql_pagination['offset']}")
    print(f"   当前页: {sql_pagination['page']}/{sql_pagination['total_pages']}")

    # 示例5: 生成分页链接
    print("\n5. 生成分页链接 (create_pagination_links)")
    links = create_pagination_links(
        base_url='/api/records',
        page=3,
        total_pages=10,
        lottery_type='am',
        year='2025'
    )
    print(f"   首页: {links['first']}")
    print(f"   上一页: {links.get('prev', '无')}")
    print(f"   下一页: {links.get('next', '无')}")
    print(f"   末页: {links['last']}")

    # 示例6: 完整API场景
    print("\n6. 完整API场景演示")
    print("   模拟数据库查询和分页返回")

    # 模拟数据库数据
    mock_db_data = [
        {'period': f'2025{i:03d}', 'numbers': f'{i:02d},{i+1:02d},{i+2:02d}'}
        for i in range(1, 101)
    ]

    # 分页参数
    page = 3
    page_size = 15

    # 执行分页
    api_result = paginate(mock_db_data, page, page_size)

    print(f"   请求: GET /api/records?page={page}&page_size={page_size}")
    print(f"   响应: {{")
    print(f"     'data': [{len(api_result['data'])} 条记录],")
    print(f"     'total': {api_result['total']},")
    print(f"     'page': {api_result['page']},")
    print(f"     'total_pages': {api_result['total_pages']},")
    print(f"     'has_prev': {api_result['has_prev']},")
    print(f"     'has_next': {api_result['has_next']}")
    print(f"   }}")

    print("\n=== 演示完成 ===")
    print("\n使用建议:")
    print("- 小数据集(<1万): 使用 paginate() 内存分页")
    print("- 大数据集(>1万): 使用 paginate_with_sql() 数据库分页")
    print("- 只需计算参数: 使用 calculate_pagination()")
    print("- RESTful API: 使用 create_pagination_links() 生成链接")
