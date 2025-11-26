# -*- coding: utf-8 -*-
"""
倍投模拟测试系统
模拟在指定期号范围内的倍投策略效果
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.utils import get_db_cursor

router = APIRouter()


class SimulationRequest(BaseModel):
    """倍投模拟请求参数"""
    lottery_type: str = Field(..., description="彩种类型: am或hk")
    numbers: List[int] = Field(..., description="投注号码列表", min_items=1, max_items=49)
    start_period: str = Field(..., description="起始期号")
    end_period: str = Field(..., description="结束期号")
    initial_amount: float = Field(..., description="初始投注金额", gt=0)
    strategy: str = Field(default="double", description="倍投策略: double(翻倍)或custom(自定义)")
    custom_amounts: Optional[List[float]] = Field(default=None, description="自定义金额数组")
    reset_on_win: bool = Field(default=True, description="中奖后是否重置倍数")


class SimulationDetail(BaseModel):
    """单期模拟详情"""
    period: str
    bet_amount: float
    opened_number: int
    is_win: bool
    win_amount: float
    profit: float
    cumulative_bet: float
    cumulative_profit: float
    consecutive_lose: int


class SimulationSummary(BaseModel):
    """模拟汇总统计"""
    total_periods: int
    total_bet: float
    total_win: float
    profit: float
    profit_rate: float
    win_count: int
    lose_count: int
    win_rate: float
    max_consecutive_lose: int
    max_bet_amount: float


class SimulationResponse(BaseModel):
    """模拟结果响应"""
    summary: SimulationSummary
    details: List[SimulationDetail]


@router.post("/api/betting_simulation", response_model=SimulationResponse)
async def simulate_betting(request: SimulationRequest):
    """
    执行倍投模拟测试

    Args:
        request: 模拟请求参数

    Returns:
        SimulationResponse: 模拟结果（包含汇总和详细记录）
    """
    # 参数验证
    if request.strategy == "custom" and not request.custom_amounts:
        raise HTTPException(status_code=400, detail="自定义策略必须提供custom_amounts参数")

    if request.custom_amounts and len(request.custom_amounts) > 500:
        raise HTTPException(status_code=400, detail="自定义金额数组最多500个元素")

    # 验证号码范围
    for num in request.numbers:
        if num < 1 or num > 49:
            raise HTTPException(status_code=400, detail=f"号码{num}超出范围(1-49)")

    # 获取历史开奖数据（正序，从旧到新）
    with get_db_cursor() as cursor:
        sql = """
            SELECT period, numbers
            FROM lottery_result
            WHERE lottery_type = %s
              AND period >= %s
              AND period <= %s
            ORDER BY period ASC
        """
        cursor.execute(sql, (request.lottery_type, request.start_period, request.end_period))
        records = cursor.fetchall()

    if not records:
        raise HTTPException(status_code=404, detail="指定期号范围内没有开奖数据")

    if len(records) > 500:
        raise HTTPException(status_code=400, detail=f"期号范围过大({len(records)}期)，最多支持500期")

    # 初始化变量
    details = []
    cumulative_bet = 0.0
    cumulative_profit = 0.0
    consecutive_lose = 0
    max_consecutive_lose = 0
    max_bet_amount = request.initial_amount
    win_count = 0
    lose_count = 0

    # 当前倍数索引（用于自定义策略）
    custom_index = 0
    # 当前连续未中次数（用于翻倍策略）
    lose_streak = 0

    # 遍历每期数据（正序遍历，模拟真实投注过程）
    for record in records:
        period = record['period']
        numbers_str = record['numbers']

        # 解析开奖号码
        try:
            opened_numbers = [int(n.strip()) for n in numbers_str.split(',')]
            if len(opened_numbers) < 7:
                continue  # 跳过数据不完整的期号
            seventh_number = opened_numbers[6]  # 第7个号码（索引6）
        except (ValueError, IndexError):
            continue

        # 计算当前期投注金额
        if request.strategy == "double":
            # 翻倍策略：2^lose_streak * initial_amount
            current_bet = request.initial_amount * (2 ** lose_streak)
        else:
            # 自定义策略：使用数组中的金额
            if custom_index < len(request.custom_amounts):
                current_bet = request.custom_amounts[custom_index]
            else:
                # 如果数组用完，使用最后一个金额
                current_bet = request.custom_amounts[-1]

        # 判断是否中奖
        is_win = seventh_number in request.numbers

        # 计算本期盈亏
        if is_win:
            win_amount = current_bet * 2  # 赔率1:1，返还本金+奖金
            period_profit = current_bet  # 净盈利 = 奖金（本金已返还）
            win_count += 1
            consecutive_lose = 0

            # 中奖后重置策略
            if request.reset_on_win:
                lose_streak = 0
                custom_index = 0
            else:
                # 不重置，继续当前倍数
                pass
        else:
            win_amount = 0
            period_profit = -current_bet  # 亏损
            lose_count += 1
            consecutive_lose += 1
            max_consecutive_lose = max(max_consecutive_lose, consecutive_lose)

            # 未中奖，下期增加倍数
            lose_streak += 1
            custom_index += 1

        # 更新累计统计
        cumulative_bet += current_bet
        cumulative_profit += period_profit
        max_bet_amount = max(max_bet_amount, current_bet)

        # 记录本期详情
        detail = SimulationDetail(
            period=period,
            bet_amount=round(current_bet, 2),
            opened_number=seventh_number,
            is_win=is_win,
            win_amount=round(win_amount, 2),
            profit=round(period_profit, 2),
            cumulative_bet=round(cumulative_bet, 2),
            cumulative_profit=round(cumulative_profit, 2),
            consecutive_lose=consecutive_lose
        )
        details.append(detail)

    # 倒序排列详细记录（最新期在前）
    details.reverse()

    # 计算汇总统计
    profit_rate = (cumulative_profit / cumulative_bet * 100) if cumulative_bet > 0 else 0
    win_rate = (win_count / len(records) * 100) if len(records) > 0 else 0

    summary = SimulationSummary(
        total_periods=len(records),
        total_bet=round(cumulative_bet, 2),
        total_win=round(cumulative_bet + cumulative_profit, 2),
        profit=round(cumulative_profit, 2),
        profit_rate=round(profit_rate, 2),
        win_count=win_count,
        lose_count=lose_count,
        win_rate=round(win_rate, 2),
        max_consecutive_lose=max_consecutive_lose,
        max_bet_amount=round(max_bet_amount, 2)
    )

    return SimulationResponse(summary=summary, details=details)


@router.get("/api/betting_simulation/periods")
async def get_available_periods(
    lottery_type: str = Query(..., description="彩种类型"),
    year: Optional[int] = Query(None, description="年份筛选")
):
    """
    获取可用的期号范围

    Args:
        lottery_type: 彩种类型
        year: 可选的年份筛选

    Returns:
        dict: 包含最早和最晚期号
    """
    with get_db_cursor() as cursor:
        if year:
            sql = """
                SELECT MIN(period) as min_period, MAX(period) as max_period, COUNT(*) as total
                FROM lottery_result
                WHERE lottery_type = %s AND period LIKE %s
            """
            cursor.execute(sql, (lottery_type, f"{year}%"))
        else:
            sql = """
                SELECT MIN(period) as min_period, MAX(period) as max_period, COUNT(*) as total
                FROM lottery_result
                WHERE lottery_type = %s
            """
            cursor.execute(sql, (lottery_type,))

        result = cursor.fetchone()

        if not result or not result['min_period']:
            return {
                "min_period": None,
                "max_period": None,
                "total_periods": 0
            }

        return {
            "min_period": result['min_period'],
            "max_period": result['max_period'],
            "total_periods": result['total']
        }
