"""
推荐号码 API 路由 - 重构版

使用统一的工具类简化代码，保持API响应格式不变
"""

from fastapi import APIRouter, Query
from backend.utils import (
    # 推荐算法工具
    generate_recommend_8,
    generate_recommend_16,
    generate_recommend_30,
    save_recommend_8,
    save_recommend_16,
    save_recommend_30,
    get_recommend_history,
    get_recommend_by_period,
    get_recommend_stats,
    # 响应格式化工具
    recommend_response,
    success_response,
    error_response,
    # 错误处理工具
    handle_db_error,
    check_data_exists,
    # 日志工具
    get_logger,
    # 验证工具
    validate_lottery_type
)
# 性能优化工具
from backend.utils.performance_utils import monitor_performance
from backend.utils.cache_utils import cache_result

router = APIRouter()
logger = get_logger(__name__)


@router.get("/recommend")
@monitor_performance  # 性能监控
@cache_result(timeout_minutes=10)  # 缓存10分钟
def recommend_api(lottery_type: str = Query('am')):
    """
    生成推荐8码（基于前50期）

    Args:
        lottery_type: 彩种类型（'am'或'hk'）

    Returns:
        标准推荐响应格式（保持向后兼容）
    """
    try:
        # 验证彩种类型
        lottery_type = validate_lottery_type(lottery_type)

        logger.info(f"收到推荐8码请求，彩种: {lottery_type}")

        # 使用工具类生成推荐
        recommend, base_period = generate_recommend_8(lottery_type)

        # 保存推荐结果
        save_recommend_8(recommend, base_period, lottery_type)

        logger.info(f"推荐8码生成成功，期号: {base_period}")

        # 返回标准推荐响应（兼容现有API格式）
        return {
            "recommend": recommend,
            "latest_period": base_period,
            "used_period": base_period
        }

    except ValueError as e:
        logger.warning(f"推荐8码生成失败: {str(e)}")
        return {
            "recommend": [],
            "latest_period": None,
            "message": str(e)
        }
    except Exception as e:
        logger.error(f"推荐8码API异常: {str(e)}", exc_info=True)
        return handle_db_error(e, "生成推荐8码")


@router.get("/recommend16")
@monitor_performance  # 性能监控
@cache_result(timeout_minutes=10)  # 缓存10分钟
def recommend16_api(lottery_type: str = Query('am')):
    """
    生成推荐16码（基于前100期）

    Args:
        lottery_type: 彩种类型（'am'或'hk'）

    Returns:
        标准推荐响应格式（保持向后兼容）
    """
    try:
        # 验证彩种类型
        lottery_type = validate_lottery_type(lottery_type)

        logger.info(f"收到推荐16码请求，彩种: {lottery_type}")

        # 使用工具类生成推荐
        recommend16, base_period = generate_recommend_16(lottery_type)

        # 保存推荐结果
        save_recommend_16(recommend16, base_period, lottery_type)

        logger.info(f"推荐16码生成成功，期号: {base_period}")

        # 返回标准推荐响应（兼容现有API格式）
        return {
            "recommend16": recommend16,
            "latest_period": base_period,
            "used_period": base_period,
            "message": "推荐16码生成成功"
        }

    except ValueError as e:
        logger.warning(f"推荐16码生成失败: {str(e)}")
        return {
            "recommend16": [],
            "latest_period": None,
            "message": str(e)
        }
    except Exception as e:
        logger.error(f"推荐16码API异常: {str(e)}", exc_info=True)
        return {
            "error": f"服务器内部错误: {str(e)}",
            "recommend16": [],
            "latest_period": None
        }


# ====================
# 推荐8码历史查询
# ====================

@router.get("/api/recommend_history")
def get_recommend_history_api(lottery_type: str = Query('am')):
    """
    获取推荐8码历史记录，按期数分组
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        periods = get_recommend_history(lottery_type, 'recommend_result')

        return success_response(periods)

    except Exception as e:
        logger.error(f"获取推荐8码历史失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐历史失败: {str(e)}")


@router.get("/api/recommend_by_period")
def get_recommend_by_period_api(
    lottery_type: str = Query('am'),
    period: str = Query(...)
):
    """
    获取指定期数的推荐8码数据
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        data = get_recommend_by_period(lottery_type, period, 'recommend_result')

        # 检查数据是否存在
        error = check_data_exists(data, "推荐8码数据", period)
        if error:
            return error

        return success_response(data)

    except Exception as e:
        logger.error(f"获取推荐8码数据失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐数据失败: {str(e)}")


@router.get("/api/recommend_stats")
def get_recommend_stats_api(lottery_type: str = Query('am')):
    """
    获取推荐8码统计信息
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        stats = get_recommend_stats(lottery_type, 'recommend_result')

        return success_response(stats)

    except Exception as e:
        logger.error(f"获取推荐8码统计失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐统计失败: {str(e)}")


# ====================
# 推荐16码历史查询
# ====================

@router.get("/api/recommend16_history")
def get_recommend16_history_api(lottery_type: str = Query('am')):
    """
    获取推荐16码历史记录，按期数分组
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        periods = get_recommend_history(lottery_type, 'recommend16_result')

        return success_response(periods)

    except Exception as e:
        logger.error(f"获取推荐16码历史失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐16码历史失败: {str(e)}")


@router.get("/api/recommend16_by_period")
def get_recommend16_by_period_api(
    lottery_type: str = Query('am'),
    period: str = Query(...)
):
    """
    获取指定期数的推荐16码数据
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        data = get_recommend_by_period(lottery_type, period, 'recommend16_result')

        # 检查数据是否存在
        error = check_data_exists(data, "推荐16码数据", period)
        if error:
            return error

        return success_response(data)

    except Exception as e:
        logger.error(f"获取推荐16码数据失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐16码数据失败: {str(e)}")


@router.get("/api/recommend16_stats")
def get_recommend16_stats_api(lottery_type: str = Query('am')):
    """
    获取推荐16码统计信息
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        stats = get_recommend_stats(lottery_type, 'recommend16_result')

        return success_response(stats)

    except Exception as e:
        logger.error(f"获取推荐16码统计失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐16码统计失败: {str(e)}")


# ====================
# 推荐30码
# ====================

@router.get("/recommend30")
@monitor_performance  # 性能监控
@cache_result(timeout_minutes=10)  # 缓存10分钟
def recommend30_api(lottery_type: str = Query('am')):
    """
    生成推荐30码（基于前150期动态算法）

    根据历史数据的频率和间隔动态生成30码
    每期生成的30码会根据最新数据变化

    Args:
        lottery_type: 彩种类型（'am'或'hk'）

    Returns:
        标准推荐响应格式（保持向后兼容）
    """
    try:
        # 验证彩种类型
        lottery_type = validate_lottery_type(lottery_type)

        logger.info(f"收到推荐30码请求，彩种: {lottery_type}")

        # 使用动态算法生成推荐（基于历史数据）
        recommend30, base_period = generate_recommend_30(lottery_type)

        # 保存推荐结果（只保存第7位置）
        save_recommend_30(recommend30, base_period, lottery_type)

        logger.info(f"推荐30码生成成功，期号: {base_period}")

        # 返回标准推荐响应（兼容现有API格式）
        return {
            "recommend30": recommend30,
            "latest_period": base_period,
            "used_period": base_period,
            "message": "推荐30码生成成功"
        }

    except ValueError as e:
        logger.warning(f"推荐30码生成失败: {str(e)}")
        return {
            "recommend30": [],
            "latest_period": None,
            "message": str(e)
        }
    except Exception as e:
        logger.error(f"推荐30码API异常: {str(e)}", exc_info=True)
        return {
            "error": f"服务器内部错误: {str(e)}",
            "recommend30": [],
            "latest_period": None
        }


@router.get("/api/recommend30_history")
def get_recommend30_history_api(lottery_type: str = Query('am')):
    """
    获取推荐30码历史记录，按期数分组
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        periods = get_recommend_history(lottery_type, 'recommend30_result')

        return success_response(periods)

    except Exception as e:
        logger.error(f"获取推荐30码历史失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐30码历史失败: {str(e)}")


@router.get("/api/recommend30_by_period")
def get_recommend30_by_period_api(
    lottery_type: str = Query('am'),
    period: str = Query(...)
):
    """
    获取指定期数的推荐30码数据
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        data = get_recommend_by_period(lottery_type, period, 'recommend30_result')

        # 检查数据是否存在
        error = check_data_exists(data, "推荐30码数据", period)
        if error:
            return error

        return success_response(data)

    except Exception as e:
        logger.error(f"获取推荐30码数据失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐30码数据失败: {str(e)}")


@router.get("/api/recommend30_stats")
def get_recommend30_stats_api(lottery_type: str = Query('am')):
    """
    获取推荐30码统计信息
    """
    try:
        lottery_type = validate_lottery_type(lottery_type)

        stats = get_recommend_stats(lottery_type, 'recommend30_result')

        return success_response(stats)

    except Exception as e:
        logger.error(f"获取推荐30码统计失败: {str(e)}", exc_info=True)
        return error_response(f"获取推荐30码统计失败: {str(e)}")
