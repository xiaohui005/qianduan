"""数据库查询优化器 - 提供高效的数据库查询方法"""
from typing import List, Dict, Optional, Tuple
from backend.utils.db_utils import get_db_cursor
from backend.utils.cache_utils import cache_result

class QueryOptimizer:
    """数据库查询优化器 - 减少不必要的数据传输和查询"""

    @staticmethod
    @cache_result(timeout_minutes=10)
    def get_recent_records(lottery_type: str, limit: int = 200,
                          year: Optional[str] = None) -> List[Dict]:
        """
        获取最近的开奖记录（优化版 - 使用LIMIT减少数据传输）

        优化点:
        1. 使用LIMIT限制返回记录数
        2. 添加缓存（10分钟）
        3. 支持年份筛选时使用索引

        Args:
            lottery_type: 彩种类型 (am/hk)
            limit: 限制数量（默认200条）
            year: 年份筛选（可选，如 '2025'）

        Returns:
            开奖记录列表 [{period, numbers, open_time}, ...]

        Example:
            # 获取最近100期澳门彩开奖记录
            records = QueryOptimizer.get_recent_records('am', limit=100)

            # 获取2025年的记录
            records = QueryOptimizer.get_recent_records('am', year='2025')
        """
        with get_db_cursor() as cursor:
            if year:
                # 使用年份索引优化查询
                sql = """
                    SELECT period, numbers, open_time
                    FROM lottery_result
                    WHERE lottery_type=%s AND period LIKE %s
                    ORDER BY period DESC
                    LIMIT %s
                """
                cursor.execute(sql, (lottery_type, f"{year}%", limit))
            else:
                # 直接限制数量
                sql = """
                    SELECT period, numbers, open_time
                    FROM lottery_result
                    WHERE lottery_type=%s
                    ORDER BY period DESC
                    LIMIT %s
                """
                cursor.execute(sql, (lottery_type, limit))

            return cursor.fetchall()

    @staticmethod
    @cache_result(timeout_minutes=15)
    def batch_get_records(lottery_type: str, periods: List[str]) -> Dict[str, Dict]:
        """
        批量获取指定期号的记录（避免N+1查询问题）

        优化点:
        1. 使用IN查询一次性获取多条记录
        2. 避免循环查询（N+1问题）
        3. 添加缓存（15分钟）

        Args:
            lottery_type: 彩种类型
            periods: 期号列表 ['2025001', '2025002', ...]

        Returns:
            {period: {period, numbers, open_time}} 字典

        Example:
            # 批量查询3个期号的数据
            records = QueryOptimizer.batch_get_records('am', ['2025001', '2025002', '2025003'])
            print(records['2025001'])  # 获取指定期号的数据
        """
        if not periods:
            return {}

        with get_db_cursor() as cursor:
            # 构造IN查询（一次性获取所有数据）
            placeholders = ','.join(['%s'] * len(periods))
            sql = f"""
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE lottery_type=%s AND period IN ({placeholders})
            """
            cursor.execute(sql, [lottery_type] + periods)
            rows = cursor.fetchall()

            # 转换为字典格式
            return {row['period']: row for row in rows}

    @staticmethod
    @cache_result(timeout_minutes=10)
    def get_position_numbers(lottery_type: str, position: int,
                            limit: int = 200) -> List[int]:
        """
        获取指定位置的所有号码（优化版）

        优化点:
        1. 只查询需要的字段（numbers）
        2. 使用LIMIT限制记录数
        3. 添加缓存（10分钟）

        Args:
            lottery_type: 彩种类型
            position: 位置（0-6，对应第1-7个号码）
            limit: 限制数量

        Returns:
            号码列表 [1, 5, 23, 45, ...]

        Example:
            # 获取第7个号码的最近100期数据
            numbers = QueryOptimizer.get_position_numbers('am', position=6, limit=100)
        """
        with get_db_cursor() as cursor:
            sql = """
                SELECT numbers
                FROM lottery_result
                WHERE lottery_type=%s
                ORDER BY period DESC
                LIMIT %s
            """
            cursor.execute(sql, (lottery_type, limit))
            rows = cursor.fetchall()

            result = []
            for row in rows:
                nums = row['numbers'].split(',')
                if position < len(nums):
                    try:
                        result.append(int(nums[position]))
                    except (ValueError, IndexError):
                        continue

            return result

    @staticmethod
    @cache_result(timeout_minutes=20)
    def get_number_frequency(lottery_type: str, position: int,
                            limit: int = 200) -> Dict[int, int]:
        """
        获取指定位置的号码频率统计（预计算版）

        优化点:
        1. 预计算频率统计
        2. 添加缓存（20分钟）
        3. 减少重复计算

        Args:
            lottery_type: 彩种类型
            position: 位置（0-6）
            limit: 统计最近N期

        Returns:
            {号码: 出现次数} 字典

        Example:
            # 统计第7个号码的频率
            freq = QueryOptimizer.get_number_frequency('am', position=6, limit=100)
            print(f"号码1出现{freq.get(1, 0)}次")
        """
        from collections import Counter

        numbers = QueryOptimizer.get_position_numbers(lottery_type, position, limit)
        return dict(Counter(numbers))

    @staticmethod
    @cache_result(timeout_minutes=20)
    def get_hot_cold_numbers(lottery_type: str, position: int,
                            limit: int = 200, top_n: int = 10) -> Dict[str, List[int]]:
        """
        获取热号和冷号（预计算版）

        优化点:
        1. 基于预计算的频率数据
        2. 添加缓存（20分钟）
        3. 可配置返回数量

        Args:
            lottery_type: 彩种类型
            position: 位置（0-6）
            limit: 统计最近N期
            top_n: 返回最热/最冷的N个号码

        Returns:
            {'hot': [热号列表], 'cold': [冷号列表]}

        Example:
            # 获取第7个号码的热号和冷号（各10个）
            result = QueryOptimizer.get_hot_cold_numbers('am', position=6, limit=200, top_n=10)
            print(f"热号: {result['hot']}")
            print(f"冷号: {result['cold']}")
        """
        freq = QueryOptimizer.get_number_frequency(lottery_type, position, limit)

        if not freq:
            return {'hot': [], 'cold': []}

        # 按频率排序
        sorted_nums = sorted(freq.items(), key=lambda x: x[1], reverse=True)

        return {
            'hot': [num for num, _ in sorted_nums[:top_n]],    # 最热N个
            'cold': [num for num, _ in sorted_nums[-top_n:]]   # 最冷N个
        }

    @staticmethod
    @cache_result(timeout_minutes=10)
    def get_latest_period(lottery_type: str, ending_digit: Optional[str] = None) -> Optional[str]:
        """
        获取最新期号（优化版）

        优化点:
        1. 使用LIMIT 1减少数据传输
        2. 支持按尾号筛选（如获取最新的以0或5结尾的期号）
        3. 添加缓存（10分钟）

        Args:
            lottery_type: 彩种类型
            ending_digit: 期号结尾数字筛选（可选，如 '0' 或 '5'）

        Returns:
            最新期号字符串，如 '2025100'

        Example:
            # 获取最新期号
            latest = QueryOptimizer.get_latest_period('am')

            # 获取最新的以0或5结尾的期号
            latest = QueryOptimizer.get_latest_period('am', ending_digit='0')
        """
        with get_db_cursor() as cursor:
            if ending_digit:
                sql = """
                    SELECT period
                    FROM lottery_result
                    WHERE lottery_type=%s AND period LIKE %s
                    ORDER BY period DESC
                    LIMIT 1
                """
                cursor.execute(sql, (lottery_type, f'%{ending_digit}'))
            else:
                sql = """
                    SELECT period
                    FROM lottery_result
                    WHERE lottery_type=%s
                    ORDER BY period DESC
                    LIMIT 1
                """
                cursor.execute(sql, (lottery_type,))

            row = cursor.fetchone()
            return row['period'] if row else None

    @staticmethod
    @cache_result(timeout_minutes=30)
    def get_period_range_analysis(lottery_type: str, base_period: str,
                                  position: int, offset: int, span: int) -> Dict:
        """
        获取区间分析数据（优化版 - 减少查询次数）

        优化点:
        1. 一次性查询需要的期号范围
        2. 内存中进行区间判断
        3. 添加缓存（30分钟）

        Args:
            lottery_type: 彩种类型
            base_period: 基准期号
            position: 位置（0-6）
            offset: 偏移量（如 1, 5, 10）
            span: 区间跨度（固定20）

        Returns:
            区间分析结果字典

        Example:
            # 分析第1个号码的+1~+20区间
            result = QueryOptimizer.get_period_range_analysis('am', '2025100', 0, 1, 20)
        """
        from backend.utils import wrap_in_range

        # 获取基准期号的数据
        records = QueryOptimizer.batch_get_records(lottery_type, [base_period])
        if base_period not in records:
            return None

        base_record = records[base_period]
        nums = base_record['numbers'].split(',')
        if position >= len(nums):
            return None

        base_num = int(nums[position])

        # 生成区间范围
        range_start = wrap_in_range(base_num + offset, 1, 49)
        range_end = wrap_in_range(base_num + offset + span - 1, 1, 49)

        # 获取后续期号进行验证（这里需要实现具体逻辑）
        # ...

        return {
            'base_period': base_period,
            'base_number': base_num,
            'range_start': range_start,
            'range_end': range_end,
            # 其他分析数据...
        }

    @staticmethod
    def clear_lottery_cache(lottery_type: str):
        """
        清除指定彩种的缓存

        在采集到新数据后调用，确保数据一致性

        Args:
            lottery_type: 彩种类型

        Example:
            # 采集数据后清除缓存
            QueryOptimizer.clear_lottery_cache('am')
        """
        from backend.utils.cache_utils import clear_cache
        clear_cache(lottery_type)
