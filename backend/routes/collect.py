"""
采集相关 API 路由 - 重构版

使用统一的错误处理和日志工具，保持API响应格式不变
"""

from fastapi import APIRouter, Query
from typing import Optional
from backend import collect, config
from backend.utils import (
    get_db_cursor,
    collection_response,
    error_response,
    paginated_response,
    get_logger,
    handle_external_api_error
)

# 导入性能优化工具
from backend.utils.performance_utils import monitor_performance
from backend.utils.cache_utils import cache_clear_on_update

router = APIRouter()
logger = get_logger(__name__)


def auto_generate_recommendations(lottery_type: str, new_periods: list):
    """
    自动生成推荐号码（统一处理）

    Args:
        lottery_type: 彩种类型
        new_periods: 新采集的期号列表

    Returns:
        生成状态描述
    """
    result_msg = ""

    # 第7个号码智能推荐20码：每次有新数据都生成（不限期号）
    try:
        from .analysis_seventh_smart import _generate_seventh_smart_history_internal
        seventh_result = _generate_seventh_smart_history_internal(lottery_type)
        if seventh_result.get('success'):
            generated = seventh_result.get('generated_count', 0)
            if generated > 0:
                logger.info(f"第7个号码智能推荐20码生成成功: 新增{generated}期")
                result_msg = "生成第7码推荐"
    except Exception as e:
        logger.error(f"生成第7个号码智能推荐20码时出错: {str(e)}", exc_info=True)

    # 推荐8码和16码：仅在0或5结尾期号时生成
    target_periods = [period for period in new_periods if period.endswith(('0', '5'))]
    if target_periods:
        logger.info(f"发现0或5结尾的期数: {target_periods}, 自动生成推荐8码和16码")

        from .recommend import recommend_api, recommend16_api

        # 生成推荐8码
        try:
            recommend_result = recommend_api(lottery_type)
            if recommend_result.get('recommend'):
                logger.info(f"推荐8码生成成功, 基于期号: {recommend_result.get('latest_period')}")
        except Exception as e:
            logger.error(f"生成推荐8码时出错: {str(e)}", exc_info=True)

        # 生成推荐16码
        try:
            recommend16_result = recommend16_api(lottery_type)
            if recommend16_result.get('recommend16'):
                logger.info(f"推荐16码生成成功, 基于期号: {recommend16_result.get('latest_period')}")
        except Exception as e:
            logger.error(f"生成推荐16码时出错: {str(e)}", exc_info=True)

        result_msg = "自动生成所有推荐"

    return result_msg


@router.get("/collect")
@monitor_performance  # 添加性能监控
def collect_api(type: str = None):
    """
    主采集端点（主源 + 备用源双重保障）

    Args:
        type: 彩种类型（'am'或'hk'），None表示采集所有彩种

    Returns:
        采集结果字典 {彩种: 结果描述}
    """
    urls = config.COLLECT_URLS
    result = {}
    types = [type] if type in urls else urls.keys() if not type else []
    fallback_urls = getattr(config, 'FALLBACK_COLLECT_URLS', {})

    for t in types:
        logger.info(f"开始采集: {t}")

        # 尝试主采集源
        try:
            data = collect.fetch_lottery(urls[t], t)
        except Exception as e:
            logger.warning(f"主采集源异常: {str(e)}")
            data = []

        # 主源失败，尝试备用源
        if not data:
            logger.info(f"默认源未采集到数据, 尝试备用源: {t}")
            try:
                data = collect.fetch_lottery(fallback_urls.get(t, ''), t)
            except Exception as e:
                logger.error(f"备用源采集异常: {str(e)}", exc_info=True)

        logger.info(f"采集到{len(data)}条数据: {data[:1] if data else '[]'}")

        # 保存采集结果
        if data:
            collect.save_results(data)

            # 清除相关缓存
            cache_clear_on_update(t)

            # 自动生成推荐
            new_periods = [item['period'] for item in data]
            recommend_msg = auto_generate_recommendations(t, new_periods)

            # 检查并记录监控命中（仅检查最新期）
            if new_periods:
                try:
                    from backend.routes.analysis_monitor import check_and_record_monitor_hits
                    check_and_record_monitor_hits(t, new_periods[-1])
                except Exception as e:
                    logger.error(f"检测监控命中失败: {e}", exc_info=True)

            result[t] = f"采集{len(data)}条,{recommend_msg}" if recommend_msg else f"采集{len(data)}条"
        else:
            result[t] = "无新数据"

    logger.info(f"采集结果: {result}")
    return result


@router.get("/collect_wenlongzhu")
@monitor_performance  # 添加性能监控
def collect_wenlongzhu_api(type: str = None):
    """
    文龙珠源头采集API

    Args:
        type: 彩种类型（'am'或'hk'），None表示采集所有彩种

    Returns:
        采集结果字典 {彩种: 结果描述}
    """
    wenlongzhu_urls = getattr(config, 'WENLONGZHU_URLS', {})
    result = {}
    types = [type] if type in wenlongzhu_urls else wenlongzhu_urls.keys() if not type else []

    for t in types:
        logger.info(f"开始采集文龙珠源头: {t}")

        try:
            data = collect.fetch_lottery(wenlongzhu_urls[t], t)
            logger.info(f"文龙珠采集到{len(data)}条数据: {data[:1] if data else '[]'}")

            if data:
                collect.save_results(data)

                # 自动生成推荐
                new_periods = [item['period'] for item in data]
                recommend_msg = auto_generate_recommendations(t, new_periods)

                # 检查并记录监控命中（仅检查最新期）
                if new_periods:
                    try:
                        from backend.routes.analysis_monitor import check_and_record_monitor_hits
                        check_and_record_monitor_hits(t, new_periods[-1])
                    except Exception as e:
                        logger.error(f"检测监控命中失败: {e}", exc_info=True)

                result[t] = f"文龙珠采集{len(data)}条,{recommend_msg}" if recommend_msg else f"文龙珠采集{len(data)}条"
            else:
                result[t] = "文龙珠无新数据"

        except Exception as e:
            logger.error(f"文龙珠采集{t}失败: {str(e)}", exc_info=True)
            result[t] = f"文龙珠采集失败: {str(e)}"

    logger.info(f"文龙珠采集结果: {result}")
    return result


@router.get("/records")
@monitor_performance  # 添加性能监控
def get_records(
    lottery_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000)
):
    """
    获取开奖记录，支持分页和多条件筛选

    Args:
        lottery_type: 彩种类型筛选
        start_time: 开始时间
        end_time: 结束时间
        period: 期号筛选
        page: 页码
        page_size: 每页大小（最大10000）

    Returns:
        分页的开奖记录
    """
    try:
        with get_db_cursor() as cursor:
            # 构建查询SQL
            sql = "SELECT * FROM lottery_result WHERE 1=1"
            params = []

            if lottery_type:
                sql += " AND lottery_type=%s"
                params.append(lottery_type)
            if start_time:
                sql += " AND open_time >= %s"
                params.append(start_time)
            if end_time:
                sql += " AND open_time <= %s"
                params.append(end_time)
            if period:
                sql += " AND period=%s"
                params.append(period)

            # 获取总数
            sql_count = f"SELECT COUNT(*) as total FROM ({sql}) t"
            cursor.execute(sql_count, params)
            total = cursor.fetchone()['total']

            # 分页查询
            sql += " ORDER BY open_time DESC, period DESC LIMIT %s OFFSET %s"
            params += [page_size, (page-1)*page_size]
            cursor.execute(sql, params)
            records = cursor.fetchall()

        logger.debug(f"查询开奖记录: 总数{total}, 当前页{page}, 每页{page_size}")

        # 返回标准分页响应
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "records": records
        }

    except Exception as e:
        logger.error(f"查询开奖记录失败: {str(e)}", exc_info=True)
        return error_response(f"查询开奖记录失败: {str(e)}")
