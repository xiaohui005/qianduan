"""
通用推荐算法工具模块

提取推荐8码和推荐16码的公共逻辑，避免代码重复
"""

from collections import Counter
from typing import List, Dict, Tuple
from .db_utils import get_db_cursor
from .logger import get_logger

logger = get_logger(__name__)


class RecommendEngine:
    """
    推荐引擎 - 统一的号码推荐算法

    核心算法：
    1. 计算每个位置各号码的出现频率
    2. 计算平均间隔：avg_gap = (period_count - last_idx) / count
    3. 筛选条件：4 <= avg_gap <= 6 的候选号码
    4. 按最后出现位置排序，取前N个
    """

    def __init__(self, lottery_type: str, period_count: int = 50, recommend_count: int = 8):
        """
        初始化推荐引擎

        Args:
            lottery_type: 彩种类型（'am'或'hk'）
            period_count: 使用的历史期数（默认50期）
            recommend_count: 推荐号码数量（默认8个）
        """
        self.lottery_type = lottery_type
        self.period_count = period_count
        self.recommend_count = recommend_count

    def get_base_period(self) -> str | None:
        """
        获取基准期号（最新的0或5结尾期号）

        Returns:
            期号字符串，如果没有则返回None
        """
        with get_db_cursor() as cursor:
            sql = """
            SELECT period
            FROM lottery_result
            WHERE RIGHT(period,1) IN ('0','5') AND lottery_type=%s
            ORDER BY period DESC
            LIMIT 1
            """
            cursor.execute(sql, (self.lottery_type,))
            row = cursor.fetchone()

            if row:
                logger.debug(f"找到基准期号: {row['period']}")
                return row['period']
            else:
                logger.warning(f"未找到0或5结尾的期号，彩种: {self.lottery_type}")
                return None

    def get_historical_data(self, base_period: str) -> List[Dict]:
        """
        获取历史开奖数据

        Args:
            base_period: 基准期号

        Returns:
            历史数据列表（按期号倒序）
        """
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE period <= %s AND lottery_type=%s
            ORDER BY period DESC
            LIMIT %s
            """
            cursor.execute(sql, (base_period, self.lottery_type, self.period_count))
            rows = cursor.fetchall()

            logger.debug(f"获取历史数据: {len(rows)}期")
            return rows

    def calculate_position_stats(self, historical_data: List[Dict]) -> Tuple[List, List]:
        """
        计算位置统计数据

        Args:
            historical_data: 历史开奖数据

        Returns:
            (pos_freq, pos_last_idx)
            - pos_freq: 每个位置的号码频率统计
            - pos_last_idx: 每个位置各号码最后出现的索引
        """
        # 初始化7个位置的统计数据
        pos_freq = [Counter() for _ in range(7)]
        pos_last_idx = [{} for _ in range(7)]

        # 遍历历史数据
        for idx, row in enumerate(historical_data):
            nums = row['numbers'].split(',')

            for i in range(min(7, len(nums))):
                n = nums[i]
                pos_freq[i][n] += 1

                # 记录每个号码最后出现的索引（第一次遍历时的idx就是最后出现）
                if n not in pos_last_idx[i]:
                    pos_last_idx[i][n] = idx

        return pos_freq, pos_last_idx

    def calculate_avg_gap(self, pos_freq: List[Counter], pos_last_idx: List[Dict]) -> List[Dict]:
        """
        计算平均间隔

        Args:
            pos_freq: 位置频率统计
            pos_last_idx: 位置最后出现索引

        Returns:
            每个位置的平均间隔字典列表
        """
        pos_avg_gap = [{} for _ in range(7)]

        for i in range(7):
            for n in pos_freq[i]:
                count = pos_freq[i][n]
                last_idx = pos_last_idx[i][n]

                # 平均间隔 = (总期数 - 最后出现索引) / 出现次数
                avg_gap = (self.period_count - last_idx) / count if count else 999
                pos_avg_gap[i][n] = avg_gap

        return pos_avg_gap

    def select_candidates(
        self,
        pos_avg_gap: List[Dict],
        pos_freq: List[Counter],
        pos_last_idx: List[Dict]
    ) -> List[List[str]]:
        """
        选择候选号码

        Args:
            pos_avg_gap: 平均间隔
            pos_freq: 频率统计
            pos_last_idx: 最后出现索引

        Returns:
            7个位置的推荐号码列表
        """
        recommend = []

        for i in range(7):
            # 1. 筛选平均间隔在4-6之间的候选号码
            candidates = [n for n in pos_avg_gap[i] if 4 <= pos_avg_gap[i][n] <= 6]

            # 2. 按最后出现位置排序（索引越小越靠前，即越早出现）
            candidates.sort(key=lambda n: pos_last_idx[i][n])

            # 3. 如果候选数量不足，补充高频号码
            if len(candidates) < self.recommend_count:
                # 获取不在候选列表中的高频号码
                freq_sorted = [n for n, _ in pos_freq[i].most_common() if n not in candidates]
                candidates += freq_sorted[:self.recommend_count - len(candidates)]

            # 4. 取前N个候选号码并按数值排序
            sorted_candidates = sorted(candidates[:self.recommend_count], key=int)
            recommend.append(sorted_candidates)

        return recommend

    def generate_recommend(self, base_period: str = None) -> Tuple[List[List[str]], str]:
        """
        生成推荐号码（主方法）

        Args:
            base_period: 基准期号（可选，不传则自动查找）

        Returns:
            (recommend, base_period)
            - recommend: 7个位置的推荐号码
            - base_period: 使用的基准期号

        Raises:
            ValueError: 如果没有找到基准期号或历史数据
        """
        # 1. 获取基准期号
        if base_period is None:
            base_period = self.get_base_period()

        if base_period is None:
            raise ValueError("未找到基准期号（0或5结尾）")

        # 2. 获取历史数据
        historical_data = self.get_historical_data(base_period)

        if not historical_data:
            raise ValueError(f"未找到历史数据，基准期号: {base_period}")

        # 3. 计算统计数据
        pos_freq, pos_last_idx = self.calculate_position_stats(historical_data)

        # 4. 计算平均间隔
        pos_avg_gap = self.calculate_avg_gap(pos_freq, pos_last_idx)

        # 5. 选择候选号码
        recommend = self.select_candidates(pos_avg_gap, pos_freq, pos_last_idx)

        logger.info(f"推荐生成成功 [{self.lottery_type}] 期号: {base_period}, 推荐数: {self.recommend_count}")

        return recommend, base_period

    def save_recommend(self, recommend: List[List[str]], base_period: str, table_name: str):
        """
        保存推荐结果到数据库

        Args:
            recommend: 推荐号码
            base_period: 基准期号
            table_name: 表名（'recommend_result' 或 'recommend16_result'）
        """
        with get_db_cursor(commit=True) as cursor:
            for i, nums in enumerate(recommend):
                sql = f"""
                INSERT INTO {table_name} (lottery_type, period, position, numbers, created_at)
                VALUES (%s, %s, %s, %s, NOW())
                ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), created_at=NOW()
                """
                cursor.execute(sql, (self.lottery_type, base_period, i+1, ','.join(nums)))

        logger.info(f"推荐已保存 [{table_name}] 期号: {base_period}")


# ====================
# 便捷函数
# ====================

def generate_recommend_8(lottery_type: str) -> Tuple[List[List[str]], str]:
    """
    生成推荐8码（基于前50期）

    Args:
        lottery_type: 彩种类型

    Returns:
        (recommend, base_period)

    示例:
        recommend, period = generate_recommend_8('am')
    """
    engine = RecommendEngine(lottery_type, period_count=50, recommend_count=8)
    return engine.generate_recommend()


def generate_recommend_16(lottery_type: str) -> Tuple[List[List[str]], str]:
    """
    生成推荐16码（基于前100期）

    Args:
        lottery_type: 彩种类型

    Returns:
        (recommend, base_period)

    示例:
        recommend, period = generate_recommend_16('am')
    """
    engine = RecommendEngine(lottery_type, period_count=100, recommend_count=16)
    return engine.generate_recommend()


def generate_recommend_30(lottery_type: str) -> Tuple[List[List[str]], str]:
    """
    生成推荐30码（基于前150期）

    注意：推荐30码使用最新的任意期号作为基准，而不仅限于0或5结尾
    这样可以确保每次采集到新数据后都能生成最新的推荐

    Args:
        lottery_type: 彩种类型

    Returns:
        (recommend, base_period)

    示例:
        recommend, period = generate_recommend_30('am')
    """
    from .db_utils import get_latest_period

    # 使用最新的任意期号作为基准（不限0或5结尾）
    base_period = get_latest_period(lottery_type)

    if not base_period:
        raise ValueError(f"未找到任何期号数据，彩种: {lottery_type}")

    engine = RecommendEngine(lottery_type, period_count=150, recommend_count=30)
    # 直接传入base_period，避免使用get_base_period()
    return engine.generate_recommend(base_period=base_period)


def save_recommend_8(recommend: List[List[str]], base_period: str, lottery_type: str):
    """
    保存推荐8码到数据库

    Args:
        recommend: 推荐号码
        base_period: 基准期号
        lottery_type: 彩种类型
    """
    engine = RecommendEngine(lottery_type, recommend_count=8)
    engine.save_recommend(recommend, base_period, 'recommend_result')


def save_recommend_16(recommend: List[List[str]], base_period: str, lottery_type: str):
    """
    保存推荐16码到数据库

    Args:
        recommend: 推荐号码
        base_period: 基准期号
        lottery_type: 彩种类型
    """
    engine = RecommendEngine(lottery_type, recommend_count=16)
    engine.save_recommend(recommend, base_period, 'recommend16_result')


def save_recommend_30(recommend: List[List[str]], base_period: str, lottery_type: str):
    """
    保存推荐30码到数据库（只保存第7位置）

    Args:
        recommend: 推荐号码（7个位置）
        base_period: 基准期号
        lottery_type: 彩种类型
    """
    # 只保存第7位置的30码
    with get_db_cursor(commit=True) as cursor:
        sql = """
        INSERT INTO recommend30_result (lottery_type, period, position, numbers, created_at)
        VALUES (%s, %s, %s, %s, NOW())
        ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), created_at=NOW()
        """
        # 第7位置的索引是6
        if len(recommend) >= 7:
            cursor.execute(sql, (lottery_type, base_period, 7, ','.join(recommend[6])))

    logger.info(f"推荐30码已保存 [recommend30_result] 期号: {base_period}, 位置: 7")


# ====================
# 推荐历史查询
# ====================

def get_recommend_history(lottery_type: str, table_name: str = 'recommend_result') -> List[Dict]:
    """
    获取推荐历史记录

    Args:
        lottery_type: 彩种类型
        table_name: 表名

    Returns:
        历史期号列表
    """
    with get_db_cursor() as cursor:
        sql = f"""
        SELECT DISTINCT period, created_at
        FROM {table_name}
        WHERE lottery_type = %s
        ORDER BY period DESC
        """
        cursor.execute(sql, (lottery_type,))
        return cursor.fetchall()


def get_recommend_by_period(
    lottery_type: str,
    period: str,
    table_name: str = 'recommend_result'
) -> Dict | None:
    """
    获取指定期数的推荐数据

    Args:
        lottery_type: 彩种类型
        period: 期号
        table_name: 表名

    Returns:
        推荐数据字典或None
    """
    with get_db_cursor() as cursor:
        sql = f"""
        SELECT position, numbers
        FROM {table_name}
        WHERE lottery_type = %s AND period = %s
        ORDER BY position
        """
        cursor.execute(sql, (lottery_type, period))
        positions = cursor.fetchall()

        if not positions:
            return None

        # 构造推荐号码数组
        recommend_numbers = [""] * 7  # 7个位置
        for pos in positions:
            position = pos['position'] - 1  # 转换为0-6索引
            if 0 <= position < 7:
                recommend_numbers[position] = pos['numbers'].split(',')

        return {
            "period": period,
            "lottery_type": lottery_type,
            "recommend_numbers": recommend_numbers,
            "positions": positions
        }


def get_recommend_stats(lottery_type: str, table_name: str = 'recommend_result') -> Dict:
    """
    获取推荐统计信息

    Args:
        lottery_type: 彩种类型
        table_name: 表名

    Returns:
        统计信息字典
    """
    with get_db_cursor() as cursor:
        # 统计推荐期数数量
        cursor.execute(
            f"SELECT COUNT(DISTINCT period) as total_periods FROM {table_name} WHERE lottery_type = %s",
            (lottery_type,)
        )
        total_periods = cursor.fetchone()['total_periods']

        # 获取最新推荐期数
        cursor.execute(
            f"SELECT MAX(period) as latest_period FROM {table_name} WHERE lottery_type = %s",
            (lottery_type,)
        )
        latest_period = cursor.fetchone()['latest_period']

        # 获取最早推荐期数
        cursor.execute(
            f"SELECT MIN(period) as earliest_period FROM {table_name} WHERE lottery_type = %s",
            (lottery_type,)
        )
        earliest_period = cursor.fetchone()['earliest_period']

        # 获取最近5期
        cursor.execute(
            f"""
            SELECT DISTINCT period, created_at
            FROM {table_name}
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 5
            """,
            (lottery_type,)
        )
        recent_periods = cursor.fetchall()

        return {
            "total_periods": total_periods,
            "latest_period": latest_period,
            "earliest_period": earliest_period,
            "recent_periods": recent_periods,
            "lottery_type": lottery_type
        }
