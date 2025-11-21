"""
工具箱模块 - 提取通用功能，提高代码复用性（优化版）

该包包含以下工具模块：
- number_utils: 数值循环处理工具
- db_utils: 数据库操作封装工具
- export_utils: CSV导出工具
- pagination_utils: 分页工具
- validators: 输入验证工具
- cache_utils: 智能缓存工具（新增）
- query_optimizer: 数据库查询优化器（新增）
- performance_utils: 性能监控工具（新增）
- logger: 结构化日志工具（新增）
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

# 新增：性能优化工具
from .cache_utils import (
    cache_result,
    clear_cache,
    get_cache_stats,
    cache_clear_on_update
)

from .query_optimizer import (
    QueryOptimizer
)

from .performance_utils import (
    monitor_performance,
    get_performance_report,
    get_performance_summary,
    PerformanceMonitor
)

from .logger import (
    get_logger
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
    # 缓存工具（新增）
    'cache_result',
    'clear_cache',
    'get_cache_stats',
    'cache_clear_on_update',
    # 查询优化器（新增）
    'QueryOptimizer',
    # 性能监控（新增）
    'monitor_performance',
    'get_performance_report',
    'get_performance_summary',
    'PerformanceMonitor',
    # 日志工具（新增）
    'get_logger',
]
