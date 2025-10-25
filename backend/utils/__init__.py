"""
工具箱模块 - 提取通用功能，提高代码复用性

该包包含以下工具模块：
- number_utils: 数值循环处理工具
- db_utils: 数据库操作封装工具
- export_utils: CSV导出工具
- pagination_utils: 分页工具
- validators: 输入验证工具
"""

from .number_utils import (
    plus49_wrap,
    minus49_wrap,
    wrap_in_range,
    apply_offsets
)

from .db_utils import (
    get_db_cursor,
    query_records,
    find_next_period,
    get_latest_period
)

from .export_utils import (
    create_csv_response
)

from .pagination_utils import (
    paginate,
    calculate_pagination
)

from .validators import (
    validate_lottery_type,
    validate_year,
    validate_period,
    validate_position,
    validate_number,
    validate_page_params,
    validate_numbers_string
)

__all__ = [
    # 数值工具
    'plus49_wrap',
    'minus49_wrap',
    'wrap_in_range',
    'apply_offsets',
    # 数据库工具
    'get_db_cursor',
    'query_records',
    'find_next_period',
    'get_latest_period',
    # 导出工具
    'create_csv_response',
    # 分页工具
    'paginate',
    'calculate_pagination',
    # 输入验证工具
    'validate_lottery_type',
    'validate_year',
    'validate_period',
    'validate_position',
    'validate_number',
    'validate_page_params',
    'validate_numbers_string',
]
