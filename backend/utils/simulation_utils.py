"""
模拟倍投测试工具模块

提供倍投模拟核心算法和4种分析类型的数据获取函数
"""

from typing import List, Dict, Optional
from collections import defaultdict
from backend.utils.db_utils import get_db_cursor, query_records
from backend.routes.analysis_two_groups import get_cold_9_numbers, analyze_remaining_40_numbers
import logging

logger = logging.getLogger(__name__)


class BettingSimulator:
    """
    倍投模拟器核心算法

    模拟倍投策略在历史数据上的表现，计算盈亏和命中率
    """

    def __init__(
        self,
        start_omission: int = 5,
        betting_sequence: List[int] = None,
        stop_loss_count: int = 3,
        odds: float = 2.0,
        base_amount: int = 100
    ):
        """
        初始化倍投模拟器

        Args:
            start_omission: 起投遗漏期数，达到此值后开始投注
            betting_sequence: 倍投序列，如[1, 2, 4]
            stop_loss_count: 止损期数，连续投注此期数后止损
            odds: 赔率，中奖返还倍数（含本金）
            base_amount: 基础投注额
        """
        self.start_omission = start_omission
        self.betting_sequence = betting_sequence or [1, 2, 4]
        self.stop_loss_count = stop_loss_count
        self.odds = odds
        self.base_amount = base_amount

    def simulate(self, history_data: List[Dict]) -> Dict:
        """
        执行倍投模拟

        Args:
            history_data: 历史数据列表，每个元素包含：
                - period: 期号
                - is_hit: 是否命中（True/False）
                - omission: 当前遗漏值

        Returns:
            {
                'total_invested': 总投注额,
                'total_return': 总收益,
                'net_profit': 净盈亏,
                'hit_rate': 命中率(%),
                'hit_count': 命中次数,
                'betting_count': 投注次数,
                'max_continuous_miss': 最大连续遗漏,
                'details': [每期明细...]
            }
        """
        total_invested = 0
        total_return = 0
        hit_count = 0
        betting_count = 0
        max_continuous_miss = 0
        current_miss = 0

        details = []
        is_betting = False
        betting_step = 0

        for record in history_data:
            period = record['period']
            is_hit = record['is_hit']
            omission = record['omission']

            bet_amount = 0
            multiplier = 0
            period_return = 0
            should_bet = False

            # 判断是否投注
            if is_betting:
                # 已在投注状态，继续投注
                should_bet = True
            elif omission >= self.start_omission:
                # 遗漏达到起投条件，开始投注
                should_bet = True
                is_betting = True
                betting_step = 0

            # 执行投注逻辑
            if should_bet:
                # 如果betting_step超过序列长度，使用最后一个倍数
                seq_index = min(betting_step, len(self.betting_sequence) - 1)
                multiplier = self.betting_sequence[seq_index]
                bet_amount = self.base_amount * multiplier
                total_invested += bet_amount
                betting_count += 1

                if is_hit:
                    # 命中：获得收益，重置状态
                    period_return = bet_amount * self.odds
                    total_return += period_return
                    hit_count += 1
                    is_betting = False
                    betting_step = 0
                    current_miss = 0
                else:
                    # 未命中：更新遗漏
                    current_miss += 1
                    if current_miss > max_continuous_miss:
                        max_continuous_miss = current_miss

                    # 判断止损
                    if betting_step + 1 >= self.stop_loss_count:
                        # 达到止损期数，停止投注
                        is_betting = False
                        betting_step = 0
                    else:
                        # 继续倍投
                        betting_step += 1

            # 记录明细
            net_profit_so_far = total_return - total_invested
            details.append({
                'period': period,
                'omission': omission,
                'is_betting': should_bet,
                'multiplier': multiplier,
                'bet_amount': bet_amount,
                'is_hit': is_hit if should_bet else None,
                'period_return': period_return,
                'cumulative_invested': total_invested,
                'cumulative_return': total_return,
                'cumulative_profit': net_profit_so_far
            })

        # 返回结果
        hit_rate = (hit_count / betting_count * 100) if betting_count > 0 else 0

        return {
            'total_invested': total_invested,
            'total_return': total_return,
            'net_profit': total_return - total_invested,
            'hit_rate': round(hit_rate, 2),
            'hit_count': hit_count,
            'betting_count': betting_count,
            'max_continuous_miss': max_continuous_miss,
            'details': details
        }


def get_recommend_hit_data(
    lottery_type: str,
    period: str,
    recommend_type: str,
    position: int,
    test_periods: int = 100
) -> List[Dict]:
    """
    获取推荐8码/16码的命中数据

    Args:
        lottery_type: 彩种（'am'或'hk'）
        period: 推荐基准期号
        recommend_type: 推荐类型（'recommend8'或'recommend16'）
        position: 位置（1-7）
        test_periods: 测试期数

    Returns:
        历史数据列表，包含period, is_hit, omission字段
    """
    table_name = 'recommend_result' if recommend_type == 'recommend8' else 'recommend16_result'

    with get_db_cursor() as cursor:
        # 1. 获取推荐数据
        sql_recommend = f"""
        SELECT numbers FROM {table_name}
        WHERE lottery_type = %s AND period = %s AND position = %s
        """
        cursor.execute(sql_recommend, (lottery_type, period, position))
        recommend_row = cursor.fetchone()

        if not recommend_row:
            return []

        recommend_nums = set(recommend_row['numbers'].split(','))

        # 2. 获取该期之后的开奖记录
        sql_lottery = """
        SELECT period, numbers FROM lottery_result
        WHERE lottery_type = %s AND period > %s
        ORDER BY period ASC
        LIMIT %s
        """
        cursor.execute(sql_lottery, (lottery_type, period, test_periods))
        lottery_rows = cursor.fetchall()

        # 3. 计算命中和遗漏
        history_data = []
        current_omission = 0

        for row in lottery_rows:
            numbers = row['numbers'].split(',')
            if len(numbers) < position:
                continue

            actual_num = numbers[position - 1]
            is_hit = actual_num in recommend_nums

            if is_hit:
                current_omission = 0
            else:
                current_omission += 1

            history_data.append({
                'period': row['period'],
                'is_hit': is_hit,
                'omission': current_omission
            })

        return history_data


def get_hot20_hit_data(
    lottery_type: str,
    position: int,
    test_periods: int = 100
) -> List[Dict]:
    """
    获取去10最热20的命中数据

    复用analysis_hot20.py中的遗漏计算逻辑

    Args:
        lottery_type: 彩种（'am'或'hk'）
        position: 位置（1-7）
        test_periods: 测试期数

    Returns:
        历史数据列表，包含period, is_hit, omission字段
    """
    with get_db_cursor() as cursor:
        # 获取所有开奖记录
        sql = """
        SELECT period, numbers FROM lottery_result
        WHERE lottery_type = %s
        ORDER BY period DESC
        """
        cursor.execute(sql, (lottery_type,))
        all_rows = cursor.fetchall()

        if len(all_rows) < 10:
            return []

        history_data = []

        # 从第10期开始，计算每期的去10最热20
        for target_idx in range(10, min(len(all_rows), test_periods + 10)):
            target_period = all_rows[target_idx]['period']

            # 获取最近10期（包含当前期）
            recent_10_start = max(0, target_idx - 9)
            recent_10 = all_rows[recent_10_start : target_idx + 1]

            # 构建排除集
            exclude_set = set()
            for row in recent_10:
                nums = row['numbers'].split(',')
                if len(nums) >= position:
                    num = int(nums[position - 1])
                    exclude_set.add(num)

            # 统计前200期频率（排除exclude_set）
            analysis_200 = all_rows[max(0, target_idx - 199) : target_idx + 1]
            number_count = defaultdict(int)

            for row in analysis_200:
                nums = row['numbers'].split(',')
                if len(nums) >= position:
                    num = int(nums[position - 1])
                    if num not in exclude_set:
                        number_count[num] += 1

            # 取Top20
            top20_list = sorted(number_count.items(), key=lambda x: x[1], reverse=True)[:20]
            hot20_numbers = {num for num, freq in top20_list}

            # 检查下期结果
            if target_idx + 1 < len(all_rows):
                next_nums = all_rows[target_idx + 1]['numbers'].split(',')
                if len(next_nums) >= position:
                    next_number = int(next_nums[position - 1])
                    is_hit = next_number in hot20_numbers

                    history_data.append({
                        'period': target_period,
                        'is_hit': is_hit,
                        'omission': 0  # 临时值，后续计算
                    })

        # 计算遗漏值
        current_omission = 0
        for record in history_data:
            if record['is_hit']:
                current_omission = 0
            else:
                current_omission += 1
            record['omission'] = current_omission

        return history_data


def get_two_groups_hit_data(
    lottery_type: str,
    test_periods: int = 100
) -> List[Dict]:
    """
    获取2组观察分析的命中数据

    判断下期第7个号码是否在高频组（group_a）中

    Args:
        lottery_type: 彩种（'am'或'hk'）
        test_periods: 测试期数

    Returns:
        历史数据列表，包含period, is_hit, omission字段
    """
    with get_db_cursor() as cursor:
        # 获取所有开奖记录
        sql = """
        SELECT period, numbers FROM lottery_result
        WHERE lottery_type = %s
        ORDER BY period DESC
        """
        cursor.execute(sql, (lottery_type,))
        all_rows = cursor.fetchall()

        if len(all_rows) < 100:
            return []

        history_data = []

        # 从第100期开始，每期计算2组分析
        for target_idx in range(100, min(len(all_rows), test_periods + 100)):
            target_period = all_rows[target_idx]['period']

            # 获取往前100期数据
            history_100 = all_rows[target_idx - 100 : target_idx]

            # 调用2组分析函数
            try:
                # 先获取冷门9码
                cold_result = get_cold_9_numbers(lottery_type, target_period, 100)
                if not cold_result or 'cold_numbers' not in cold_result:
                    continue

                # 再分析剩余40码
                analysis_result = analyze_remaining_40_numbers(
                    lottery_type,
                    target_period,
                    cold_result['cold_numbers'],
                    100
                )

                if not analysis_result or 'group_a' not in analysis_result:
                    continue

                group_a_numbers = set(analysis_result['group_a'])

                # 检查下期第7个号码
                if target_idx + 1 < len(all_rows):
                    next_nums = all_rows[target_idx + 1]['numbers'].split(',')
                    if len(next_nums) >= 7:
                        next_seventh = int(next_nums[6])
                        is_hit = next_seventh in group_a_numbers

                        history_data.append({
                            'period': target_period,
                            'is_hit': is_hit,
                            'omission': 0  # 临时值，后续计算
                        })
            except Exception as e:
                logger.warning(f'计算2组分析失败 期号{target_period}: {str(e)}')
                continue

        # 计算遗漏值
        current_omission = 0
        for record in history_data:
            if record['is_hit']:
                current_omission = 0
            else:
                current_omission += 1
            record['omission'] = current_omission

        return history_data


def get_seventh_smart_hit_data(
    lottery_type: str,
    test_periods: int = 100
) -> List[Dict]:
    """
    获取第7个号码智能推荐20码的命中数据

    直接查询seventh_smart20_history表，已包含is_hit字段

    Args:
        lottery_type: 彩种（'am'或'hk'）
        test_periods: 测试期数

    Returns:
        历史数据列表，包含period, is_hit, omission字段
    """
    with get_db_cursor() as cursor:
        sql = """
        SELECT period, is_hit FROM seventh_smart20_history
        WHERE lottery_type = %s AND is_hit IS NOT NULL
        ORDER BY period ASC
        LIMIT %s
        """
        cursor.execute(sql, (lottery_type, test_periods))
        rows = cursor.fetchall()

        if not rows:
            return []

        # 计算遗漏值
        history_data = []
        current_omission = 0

        for row in rows:
            is_hit = bool(row['is_hit'])

            if is_hit:
                current_omission = 0
            else:
                current_omission += 1

            history_data.append({
                'period': row['period'],
                'is_hit': is_hit,
                'omission': current_omission
            })

        return history_data
