"""性能监控工具 - 监控API性能和慢查询"""
import time
from functools import wraps
from typing import Dict, List, Callable
from collections import defaultdict

# 性能统计数据存储
_performance_stats = defaultdict(lambda: {
    'calls': 0,           # 调用次数
    'total_time': 0,      # 总耗时
    'min_time': float('inf'),  # 最小耗时
    'max_time': 0,        # 最大耗时
    'errors': 0           # 错误次数
})

def monitor_performance(func: Callable) -> Callable:
    """
    监控函数执行性能的装饰器

    功能:
    1. 记录函数调用次数
    2. 记录执行时间（最小/最大/平均）
    3. 慢查询告警（超过1秒）
    4. 错误统计

    使用示例:
        @router.get("/some_api")
        @monitor_performance
        def some_api():
            return {"data": "result"}

    Args:
        func: 要监控的函数

    Returns:
        装饰后的函数
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        error_occurred = False

        try:
            result = func(*args, **kwargs)
            return result
        except Exception as e:
            error_occurred = True
            raise
        finally:
            elapsed = time.time() - start_time

            # 记录统计信息
            stats = _performance_stats[func.__name__]
            stats['calls'] += 1
            stats['total_time'] += elapsed
            stats['min_time'] = min(stats['min_time'], elapsed)
            stats['max_time'] = max(stats['max_time'], elapsed)

            if error_occurred:
                stats['errors'] += 1

            # 慢查询告警（超过1秒）
            if elapsed > 1.0:
                print(f"⚠️ [慢查询告警] {func.__name__} 执行时间: {elapsed:.2f}秒")
            elif elapsed > 0.5:
                print(f"⏱️ [性能提示] {func.__name__} 执行时间: {elapsed:.3f}秒")

    return wrapper

def get_performance_report(sort_by: str = 'calls') -> List[Dict]:
    """
    获取性能统计报告

    Args:
        sort_by: 排序字段 ('calls', 'avg_time', 'total_time', 'max_time')

    Returns:
        性能统计报告列表

    Example:
        # 获取按调用次数排序的报告
        report = get_performance_report('calls')

        # 获取按平均耗时排序的报告
        report = get_performance_report('avg_time')
    """
    report = []

    for func_name, stats in _performance_stats.items():
        avg_time = stats['total_time'] / stats['calls'] if stats['calls'] > 0 else 0

        report.append({
            'function': func_name,
            'calls': stats['calls'],
            'avg_time': round(avg_time, 3),
            'min_time': round(stats['min_time'] if stats['min_time'] != float('inf') else 0, 3),
            'max_time': round(stats['max_time'], 3),
            'total_time': round(stats['total_time'], 2),
            'errors': stats['errors'],
            'error_rate': round(stats['errors'] / stats['calls'] * 100, 2) if stats['calls'] > 0 else 0
        })

    # 排序
    if sort_by == 'calls':
        report.sort(key=lambda x: x['calls'], reverse=True)
    elif sort_by == 'avg_time':
        report.sort(key=lambda x: x['avg_time'], reverse=True)
    elif sort_by == 'total_time':
        report.sort(key=lambda x: x['total_time'], reverse=True)
    elif sort_by == 'max_time':
        report.sort(key=lambda x: x['max_time'], reverse=True)

    return report

def get_slow_queries(threshold: float = 1.0) -> List[Dict]:
    """
    获取慢查询列表（平均耗时超过阈值）

    Args:
        threshold: 阈值（秒），默认1秒

    Returns:
        慢查询列表

    Example:
        # 获取平均耗时超过500ms的查询
        slow = get_slow_queries(0.5)
    """
    report = get_performance_report()

    return [
        item for item in report
        if item['avg_time'] >= threshold
    ]

def get_performance_summary() -> Dict:
    """
    获取性能摘要

    Returns:
        性能摘要字典

    Example:
        summary = get_performance_summary()
        print(f"总调用次数: {summary['total_calls']}")
        print(f"慢查询数: {summary['slow_queries_count']}")
    """
    report = get_performance_report()

    total_calls = sum(item['calls'] for item in report)
    total_errors = sum(item['errors'] for item in report)
    slow_queries = [item for item in report if item['avg_time'] >= 1.0]

    # 找出最慢的API
    slowest_api = max(report, key=lambda x: x['avg_time']) if report else None

    # 找出调用最多的API
    most_called_api = max(report, key=lambda x: x['calls']) if report else None

    return {
        'total_calls': total_calls,
        'total_errors': total_errors,
        'error_rate': round(total_errors / total_calls * 100, 2) if total_calls > 0 else 0,
        'total_functions': len(report),
        'slow_queries_count': len(slow_queries),
        'slowest_api': {
            'name': slowest_api['function'],
            'avg_time': slowest_api['avg_time']
        } if slowest_api else None,
        'most_called_api': {
            'name': most_called_api['function'],
            'calls': most_called_api['calls']
        } if most_called_api else None
    }

def reset_performance_stats():
    """
    重置性能统计

    Example:
        # 重置所有统计数据
        reset_performance_stats()
    """
    _performance_stats.clear()
    print("[性能统计] 统计数据已重置")

def print_performance_report():
    """
    在控制台打印性能报告（用于调试）

    Example:
        # 打印性能报告到控制台
        print_performance_report()
    """
    print("\n" + "="*80)
    print("性能监控报告".center(80))
    print("="*80)

    summary = get_performance_summary()
    print(f"\n总调用次数: {summary['total_calls']}")
    print(f"总错误次数: {summary['total_errors']} (错误率: {summary['error_rate']}%)")
    print(f"监控函数数: {summary['total_functions']}")
    print(f"慢查询数: {summary['slow_queries_count']}")

    if summary['slowest_api']:
        print(f"\n最慢API: {summary['slowest_api']['name']} "
              f"(平均: {summary['slowest_api']['avg_time']}秒)")

    if summary['most_called_api']:
        print(f"调用最多: {summary['most_called_api']['name']} "
              f"({summary['most_called_api']['calls']}次)")

    print("\n" + "-"*80)
    print(f"{'函数名':<30} {'调用次数':<10} {'平均耗时':<10} {'最大耗时':<10} {'错误':<8}")
    print("-"*80)

    report = get_performance_report()[:15]  # 只显示前15个
    for item in report:
        print(f"{item['function']:<30} {item['calls']:<10} "
              f"{item['avg_time']:<10.3f} {item['max_time']:<10.3f} "
              f"{item['errors']:<8}")

    print("="*80 + "\n")

class PerformanceMonitor:
    """
    性能监控上下文管理器（用于代码块监控）

    使用示例:
        with PerformanceMonitor("数据采集"):
            # 执行耗时操作
            collect_data()

        # 会自动打印: [性能] 数据采集 完成，耗时: 1.234秒
    """

    def __init__(self, name: str, threshold: float = 1.0):
        """
        Args:
            name: 操作名称
            threshold: 慢操作阈值（秒）
        """
        self.name = name
        self.threshold = threshold
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        elapsed = time.time() - self.start_time

        if exc_type is not None:
            print(f"❌ [性能] {self.name} 失败，耗时: {elapsed:.3f}秒")
        elif elapsed >= self.threshold:
            print(f"⚠️ [性能] {self.name} 完成，耗时: {elapsed:.3f}秒 (超过阈值 {self.threshold}秒)")
        else:
            print(f"✅ [性能] {self.name} 完成，耗时: {elapsed:.3f}秒")
