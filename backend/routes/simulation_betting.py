"""
模拟倍投测试API模块

提供倍投测试和CSV导出接口
"""

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional
from backend.utils.response_utils import success_response
from backend.utils.export_utils import create_csv_response
from backend.utils.simulation_utils import (
    BettingSimulator,
    get_recommend_hit_data,
    get_hot20_hit_data,
    get_two_groups_hit_data,
    get_seventh_smart_hit_data
)
import logging
from datetime import datetime
import io
import csv
from urllib.parse import quote

router = APIRouter()
logger = logging.getLogger(__name__)


def validate_lottery_type(lottery_type: str) -> str:
    """验证彩种类型"""
    if lottery_type not in ['am', 'hk']:
        raise HTTPException(status_code=400, detail='彩种类型必须是am或hk')
    return lottery_type


@router.get("/api/simulation/test")
async def simulate_betting_test(
    lottery_type: str = Query('am', description='彩种类型(am/hk)'),
    analysis_type: str = Query(..., description='分析类型(recommend8/recommend16/hot20/two_groups/seventh_smart)'),
    test_periods: int = Query(100, ge=10, le=500, description='测试期数'),
    start_omission: int = Query(5, ge=1, le=50, description='起投遗漏期数'),
    betting_sequence: str = Query('1,2,4', description='倍投序列(逗号分隔)'),
    stop_loss_count: int = Query(3, ge=1, le=10, description='止损期数'),
    odds: float = Query(2.0, ge=1.1, le=10.0, description='赔率'),
    base_amount: int = Query(100, ge=1, description='基础投注额'),
    position: Optional[int] = Query(None, ge=1, le=7, description='位置(推荐8/16和去10最热20需要)'),
    period: Optional[str] = Query(None, description='期号(推荐8/16需要)')
):
    """
    执行模拟倍投测试

    Returns:
        {
            'success': True,
            'data': {
                'test_config': {配置参数},
                'statistics': {统计指标},
                'details': [每期明细]
            }
        }
    """
    try:
        # 验证彩种
        lottery_type = validate_lottery_type(lottery_type)

        # 解析倍投序列
        try:
            betting_seq = [int(x.strip()) for x in betting_sequence.split(',')]
            if len(betting_seq) < 1:
                raise HTTPException(status_code=400, detail='倍投序列不能为空')
        except ValueError:
            raise HTTPException(status_code=400, detail='倍投序列格式错误，应为逗号分隔的数字，如"1,2,4"')

        # 根据分析类型获取历史数据
        history_data = []

        if analysis_type in ['recommend8', 'recommend16']:
            # 推荐8码/16码需要position和period
            if not position:
                raise HTTPException(status_code=400, detail=f'{analysis_type}分析需要指定位置参数(position)')
            if not period:
                raise HTTPException(status_code=400, detail=f'{analysis_type}分析需要指定期号参数(period)')

            history_data = get_recommend_hit_data(
                lottery_type,
                period,
                analysis_type,
                position,
                test_periods
            )

        elif analysis_type == 'hot20':
            # 去10最热20需要position
            if not position:
                raise HTTPException(status_code=400, detail='去10最热20分析需要指定位置参数(position)')

            history_data = get_hot20_hit_data(
                lottery_type,
                position,
                test_periods
            )

        elif analysis_type == 'two_groups':
            # 2组观察分析固定第7位
            history_data = get_two_groups_hit_data(
                lottery_type,
                test_periods
            )

        elif analysis_type == 'seventh_smart':
            # 第7个号码智能推荐20码
            history_data = get_seventh_smart_hit_data(
                lottery_type,
                test_periods
            )

        else:
            raise HTTPException(status_code=400, detail=f'不支持的分析类型：{analysis_type}')

        # 检查数据量
        if len(history_data) < 10:
            raise HTTPException(status_code=400, detail=f'历史数据不足，需要至少10期，当前只有{len(history_data)}期')

        # 限制测试期数
        if len(history_data) > test_periods:
            history_data = history_data[:test_periods]

        # 执行模拟
        simulator = BettingSimulator(
            start_omission=start_omission,
            betting_sequence=betting_seq,
            stop_loss_count=stop_loss_count,
            odds=odds,
            base_amount=base_amount
        )

        result = simulator.simulate(history_data)

        # 返回结果
        return success_response({
            'test_config': {
                'lottery_type': lottery_type,
                'lottery_type_name': '澳门' if lottery_type == 'am' else '香港',
                'analysis_type': analysis_type,
                'analysis_type_name': _get_analysis_type_name(analysis_type),
                'test_periods': len(history_data),
                'start_omission': start_omission,
                'betting_sequence': betting_seq,
                'stop_loss_count': stop_loss_count,
                'odds': odds,
                'base_amount': base_amount,
                'position': position,
                'period': period
            },
            'statistics': {
                'total_invested': result['total_invested'],
                'total_return': result['total_return'],
                'net_profit': result['net_profit'],
                'hit_rate': result['hit_rate'],
                'hit_count': result['hit_count'],
                'betting_count': result['betting_count'],
                'max_continuous_miss': result['max_continuous_miss']
            },
            'details': result['details']
        })

    except Exception as e:
        logger.error(f'模拟测试失败: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'测试失败: {str(e)}')


@router.get("/api/simulation/export")
async def export_simulation_csv(
    lottery_type: str = Query('am', description='彩种类型(am/hk)'),
    analysis_type: str = Query(..., description='分析类型'),
    test_periods: int = Query(100, ge=10, le=500),
    start_omission: int = Query(5, ge=1, le=50),
    betting_sequence: str = Query('1,2,4'),
    stop_loss_count: int = Query(3, ge=1, le=10),
    odds: float = Query(2.0, ge=1.1, le=10.0),
    base_amount: int = Query(100, ge=1),
    position: Optional[int] = Query(None, ge=1, le=7),
    period: Optional[str] = Query(None)
):
    """
    导出模拟测试结果CSV

    Returns:
        CSV文件流
    """
    try:
        # 调用测试接口获取数据
        test_result = await simulate_betting_test(
            lottery_type=lottery_type,
            analysis_type=analysis_type,
            test_periods=test_periods,
            start_omission=start_omission,
            betting_sequence=betting_sequence,
            stop_loss_count=stop_loss_count,
            odds=odds,
            base_amount=base_amount,
            position=position,
            period=period
        )

        if not test_result.get('success'):
            raise HTTPException(status_code=400, detail=test_result.get('error', '测试失败'))

        data = test_result['data']
        config = data['test_config']
        stats = data['statistics']
        details = data['details']

        # 准备CSV数据（使用二维列表）
        csv_rows = []

        # 标题部分
        csv_rows.append(['=== 模拟倍投测试报告 ==='])
        csv_rows.append(['测试时间', datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
        csv_rows.append(['彩种', config["lottery_type_name"]])
        csv_rows.append(['分析类型', config["analysis_type_name"]])

        if config.get('position'):
            csv_rows.append(['位置', f'第{config["position"]}位'])
        if config.get('period'):
            csv_rows.append(['基准期号', config["period"]])

        csv_rows.append(['测试期数', config["test_periods"]])
        csv_rows.append(['起投遗漏期数', config["start_omission"]])
        csv_rows.append(['倍投序列', ','.join(map(str, config["betting_sequence"]))])
        csv_rows.append(['止损期数', config["stop_loss_count"]])
        csv_rows.append(['赔率', config["odds"]])
        csv_rows.append(['基础投注额', config["base_amount"]])
        csv_rows.append([])

        # 统计指标
        csv_rows.append(['=== 统计指标 ==='])
        csv_rows.append(['累计投注额', stats["total_invested"]])
        csv_rows.append(['累计收益', stats["total_return"]])
        csv_rows.append(['净盈亏', stats["net_profit"]])
        csv_rows.append(['命中率', f'{stats["hit_rate"]}%'])
        csv_rows.append(['命中次数', stats["hit_count"]])
        csv_rows.append(['投注次数', stats["betting_count"]])
        csv_rows.append(['最大连续遗漏', stats["max_continuous_miss"]])
        csv_rows.append([])

        # 投注明细
        csv_rows.append(['=== 投注明细 ==='])
        csv_rows.append(['期号', '遗漏', '是否投注', '倍数', '投注额', '是否命中', '本期收益', '累计投注', '累计收益', '累计盈亏'])

        for detail in details:
            is_betting = '是' if detail['is_betting'] else '否'
            multiplier = detail['multiplier'] if detail['multiplier'] > 0 else ''
            bet_amount = detail['bet_amount'] if detail['bet_amount'] > 0 else ''

            if detail['is_hit'] is None:
                is_hit = ''
            elif detail['is_hit']:
                is_hit = '✓'
            else:
                is_hit = '✗'

            period_return = detail['period_return'] if detail['period_return'] > 0 else ''

            csv_rows.append([
                detail["period"],
                detail["omission"],
                is_betting,
                multiplier,
                bet_amount,
                is_hit,
                period_return,
                detail["cumulative_invested"],
                detail["cumulative_return"],
                detail["cumulative_profit"]
            ])

        # 使用csv.writer生成CSV
        output = io.StringIO()
        writer = csv.writer(output)
        for row in csv_rows:
            writer.writerow(row)

        # 添加BOM
        csv_content = '\ufeff' + output.getvalue()
        filename = f'模拟倍投测试_{config["lottery_type_name"]}_{config["analysis_type"]}_{datetime.now().strftime("%Y%m%d%H%M%S")}.csv'
        encoded_filename = quote(filename)

        return StreamingResponse(
            iter([csv_content.encode('utf-8')]),
            media_type='text/csv; charset=utf-8',
            headers={
                'Content-Disposition': f'attachment; filename*=UTF-8\'\'{encoded_filename}'
            }
        )

    except Exception as e:
        logger.error(f'导出CSV失败: {str(e)}', exc_info=True)
        raise HTTPException(status_code=500, detail=f'导出失败: {str(e)}')


def _get_analysis_type_name(analysis_type: str) -> str:
    """获取分析类型中文名称"""
    names = {
        'recommend8': '推荐8码',
        'recommend16': '推荐16码',
        'hot20': '去10最热20',
        'two_groups': '2组观察分析',
        'seventh_smart': '第7个号码智能推荐20码'
    }
    return names.get(analysis_type, analysis_type)
