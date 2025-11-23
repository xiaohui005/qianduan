"""自动采集管理 API 路由"""
from fastapi import APIRouter, HTTPException
from typing import Optional

router = APIRouter()

# 导入依赖
from backend.scheduler import (
    get_scheduler_status,
    enable_auto_collect,
    disable_auto_collect,
    update_schedule,
    auto_collect_lottery
)
from backend.config import update_auto_collect_config

# ==================== 辅助函数 ====================

def success_response(msg: str, **kwargs):
    """统一成功响应格式"""
    return {"success": True, "msg": msg, **kwargs}

def error_response(msg: str):
    """统一错误响应格式"""
    return {"success": False, "msg": msg}

def validate_time_format(time_str: str) -> bool:
    """
    验证时间格式 (HH:MM)

    Args:
        time_str: 时间字符串

    Returns:
        bool: 是否有效
    """
    try:
        hour, minute = map(int, time_str.split(':'))
        return 0 <= hour <= 23 and 0 <= minute <= 59
    except:
        return False

def validate_lottery_type(lottery_type: str) -> bool:
    """验证彩种类型"""
    return lottery_type in ['am', 'hk']

# ==================== API 端点 ====================

@router.get("/api/auto_collect/status")
def get_auto_collect_status():
    """获取自动采集状态"""
    return get_scheduler_status()

@router.post("/api/auto_collect/enable")
def enable_auto_collect_api():
    """启用自动采集"""
    try:
        enable_auto_collect()
        update_auto_collect_config('enabled', True)
        return success_response("自动采集已启用")
    except Exception as e:
        return error_response(f"启用失败: {str(e)}")

@router.post("/api/auto_collect/disable")
def disable_auto_collect_api():
    """禁用自动采集"""
    try:
        disable_auto_collect()
        update_auto_collect_config('enabled', False)
        return success_response("自动采集已禁用")
    except Exception as e:
        return error_response(f"禁用失败: {str(e)}")

@router.post("/api/auto_collect/update_time")
def update_collect_time(am_time: Optional[str] = None, hk_time: Optional[str] = None):
    """
    更新自动采集时间

    参数:
        am_time: 澳门采集时间 (格式: "HH:MM")
        hk_time: 香港采集时间 (格式: "HH:MM")
    """
    try:
        # 验证澳门时间
        if am_time:
            if not validate_time_format(am_time):
                return error_response("澳门时间格式错误，应为 HH:MM")
            update_auto_collect_config('am_time', am_time)

        # 验证香港时间
        if hk_time:
            if not validate_time_format(hk_time):
                return error_response("香港时间格式错误，应为 HH:MM")
            update_auto_collect_config('hk_time', hk_time)

        # 更新调度器
        update_schedule(am_time, hk_time)

        return success_response(
            "采集时间已更新",
            am_time=am_time,
            hk_time=hk_time
        )
    except Exception as e:
        return error_response(f"更新失败: {str(e)}")

@router.post("/api/auto_collect/trigger")
def trigger_collect_now(lottery_type: str):
    """
    立即触发采集（手动测试用）

    参数:
        lottery_type: 彩种类型 ('am' or 'hk')
    """
    if not validate_lottery_type(lottery_type):
        return error_response("彩种类型错误，仅支持 am 或 hk")

    try:
        auto_collect_lottery(lottery_type)
        return success_response(f"{lottery_type} 采集任务已触发")
    except Exception as e:
        return error_response(f"采集失败: {str(e)}")

@router.post("/api/auto_collect/retry_times")
def update_retry_times(retry_times: int):
    """
    更新重试次数

    参数:
        retry_times: 重试次数 (1-10)
    """
    if not (1 <= retry_times <= 10):
        return error_response("重试次数必须在 1-10 之间")

    try:
        update_auto_collect_config('retry_times', retry_times)
        return success_response(f"重试次数已更新为 {retry_times}")
    except Exception as e:
        return error_response(f"更新失败: {str(e)}")

@router.post("/api/auto_collect/retry_interval")
def update_retry_interval(retry_interval: int):
    """
    更新重试间隔

    参数:
        retry_interval: 重试间隔（秒，1-300）
    """
    if not (1 <= retry_interval <= 300):
        return error_response("重试间隔必须在 1-300 秒之间")

    try:
        update_auto_collect_config('retry_interval', retry_interval)
        return success_response(f"重试间隔已更新为 {retry_interval} 秒")
    except Exception as e:
        return error_response(f"更新失败: {str(e)}")

@router.post("/api/auto_collect/normal_interval")
def update_normal_interval(normal_interval: int):
    """
    更新正常采集间隔

    参数:
        normal_interval: 正常采集间隔（秒，1-3600）
    """
    if not (1 <= normal_interval <= 3600):
        return error_response("正常采集间隔必须在 1-3600 秒之间")

    try:
        update_auto_collect_config('normal_interval', normal_interval)
        return success_response(f"正常采集间隔已更新为 {normal_interval} 秒")
    except Exception as e:
        return error_response(f"更新失败: {str(e)}")
