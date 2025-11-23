"""
统一的API响应格式化工具模块

提供标准化的API响应格式，确保前端接收的数据结构一致
"""

from typing import Any, Optional, Dict, List
from datetime import datetime


# ====================
# 标准成功响应
# ====================

def success_response(
    data: Any = None,
    message: str = "操作成功",
    **extra_fields
) -> Dict[str, Any]:
    """
    构造标准成功响应

    Args:
        data: 返回的数据
        message: 成功消息
        **extra_fields: 额外的字段（保持向后兼容）

    Returns:
        标准成功响应字典

    示例:
        # 简单响应
        return success_response({"records": rows})
        # 返回: {"success": True, "message": "操作成功", "data": {"records": rows}}

        # 带额外字段（兼容现有API）
        return success_response(rows, total=100, page=1)
        # 返回: {"success": True, "message": "操作成功", "data": rows, "total": 100, "page": 1}
    """
    response = {
        "success": True,
        "message": message
    }

    if data is not None:
        response["data"] = data

    # 添加额外字段（保持向后兼容）
    response.update(extra_fields)

    return response


def data_response(data: Any, message: str = "查询成功") -> Dict[str, Any]:
    """
    构造数据响应（简化版）

    Args:
        data: 返回的数据
        message: 成功消息

    Returns:
        标准成功响应

    示例:
        return data_response(records, "查询开奖记录成功")
    """
    return success_response(data, message)


# ====================
# 分页响应
# ====================

def paginated_response(
    data: List[Any],
    total: int,
    page: int,
    page_size: int,
    message: str = "查询成功"
) -> Dict[str, Any]:
    """
    构造分页响应

    Args:
        data: 当前页数据列表
        total: 总记录数
        page: 当前页码
        page_size: 每页大小
        message: 成功消息

    Returns:
        标准分页响应

    示例:
        return paginated_response(
            data=records,
            total=500,
            page=1,
            page_size=20
        )
        # 返回: {
        #   "success": True,
        #   "message": "查询成功",
        #   "data": records,
        #   "total": 500,
        #   "page": 1,
        #   "page_size": 20,
        #   "total_pages": 25
        # }
    """
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "success": True,
        "message": message,
        "data": data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


# ====================
# 列表响应（无分页）
# ====================

def list_response(
    data: List[Any],
    message: str = "查询成功",
    count: Optional[int] = None
) -> Dict[str, Any]:
    """
    构造列表响应（不分页）

    Args:
        data: 数据列表
        message: 成功消息
        count: 总数（可选，不传则自动计算）

    Returns:
        标准列表响应

    示例:
        return list_response(records, "查询开奖记录成功")
    """
    return {
        "success": True,
        "message": message,
        "data": data,
        "count": count if count is not None else len(data)
    }


# ====================
# 推荐响应（专用格式）
# ====================

def recommend_response(
    recommend: List[List[str]],
    latest_period: str,
    lottery_type: str,
    recommend_type: str = "8码",
    message: str = "推荐生成成功"
) -> Dict[str, Any]:
    """
    构造推荐响应（兼容现有推荐API格式）

    Args:
        recommend: 推荐号码（7个位置，每个位置8/16个号码）
        latest_period: 基于的最新期号
        lottery_type: 彩种类型
        recommend_type: 推荐类型（"8码"或"16码"）
        message: 成功消息

    Returns:
        推荐响应

    示例:
        return recommend_response(
            recommend=[["1","5","12",...], ...],
            latest_period="2025100",
            lottery_type="am"
        )
    """
    # 兼容现有API字段名
    field_name = "recommend" if recommend_type == "8码" else "recommend16"

    return {
        "success": True,
        "message": message,
        field_name: recommend,
        "latest_period": latest_period,
        "used_period": latest_period,
        "lottery_type": lottery_type,
        "recommend_type": recommend_type
    }


# ====================
# 统计响应
# ====================

def stats_response(
    stats: Dict[str, Any],
    message: str = "统计查询成功"
) -> Dict[str, Any]:
    """
    构造统计响应

    Args:
        stats: 统计数据字典
        message: 成功消息

    Returns:
        统计响应

    示例:
        return stats_response({
            "total_bets": 100,
            "total_amount": 50000,
            "win_rate": 0.65
        })
    """
    return {
        "success": True,
        "message": message,
        "data": stats
    }


# ====================
# 空数据响应
# ====================

def empty_response(message: str = "暂无数据") -> Dict[str, Any]:
    """
    构造空数据响应

    Args:
        message: 提示消息

    Returns:
        空数据响应

    示例:
        return empty_response("暂无开奖记录")
    """
    return {
        "success": True,
        "message": message,
        "data": []
    }


# ====================
# 操作响应（增删改）
# ====================

def operation_response(
    success: bool = True,
    message: str = "操作成功",
    affected_rows: Optional[int] = None,
    **extra_data
) -> Dict[str, Any]:
    """
    构造操作响应（用于增删改操作）

    Args:
        success: 是否成功
        message: 操作消息
        affected_rows: 影响的行数（可选）
        **extra_data: 额外数据

    Returns:
        操作响应

    示例:
        return operation_response(True, "添加成功", affected_rows=1)
    """
    response = {
        "success": success,
        "message": message
    }

    if affected_rows is not None:
        response["affected_rows"] = affected_rows

    if extra_data:
        response.update(extra_data)

    return response


# ====================
# 采集响应（专用）
# ====================

def collection_response(
    lottery_type: str,
    collected_count: int,
    auto_generated: bool = False,
    message: Optional[str] = None
) -> Dict[str, str]:
    """
    构造采集响应（兼容现有采集API格式）

    Args:
        lottery_type: 彩种类型
        collected_count: 采集数量
        auto_generated: 是否自动生成推荐
        message: 自定义消息（可选）

    Returns:
        采集响应字典（键为彩种，值为结果描述）

    示例:
        return collection_response("am", 5, True)
        # 返回: {"am": "采集5条,自动生成所有推荐"}
    """
    if message:
        result_msg = message
    elif collected_count == 0:
        result_msg = "无新数据"
    elif auto_generated:
        result_msg = f"采集{collected_count}条,自动生成所有推荐"
    else:
        result_msg = f"采集{collected_count}条"

    return {lottery_type: result_msg}


# ====================
# 导出响应提示
# ====================

def export_info_response(
    file_name: str,
    record_count: int,
    message: str = "数据已准备好，正在导出..."
) -> Dict[str, Any]:
    """
    构造导出信息响应（在实际导出前返回）

    Args:
        file_name: 导出文件名
        record_count: 导出记录数
        message: 提示消息

    Returns:
        导出信息响应

    示例:
        return export_info_response("records_2025.csv", 1000)
    """
    return {
        "success": True,
        "message": message,
        "export_info": {
            "file_name": file_name,
            "record_count": record_count,
            "timestamp": datetime.now().isoformat()
        }
    }


# ====================
# 批量操作响应
# ====================

def batch_operation_response(
    total: int,
    success_count: int,
    failed_count: int,
    errors: Optional[List[Dict]] = None,
    message: Optional[str] = None
) -> Dict[str, Any]:
    """
    构造批量操作响应

    Args:
        total: 总操作数
        success_count: 成功数
        failed_count: 失败数
        errors: 错误详情列表（可选）
        message: 自定义消息（可选）

    Returns:
        批量操作响应

    示例:
        return batch_operation_response(
            total=100,
            success_count=95,
            failed_count=5,
            errors=[{"index": 10, "reason": "数据重复"}]
        )
    """
    if message is None:
        if failed_count == 0:
            message = f"批量操作成功，共处理{total}条"
        else:
            message = f"批量操作完成，成功{success_count}条，失败{failed_count}条"

    response = {
        "success": failed_count == 0,
        "message": message,
        "summary": {
            "total": total,
            "success_count": success_count,
            "failed_count": failed_count,
            "success_rate": round(success_count / total * 100, 2) if total > 0 else 0
        }
    }

    if errors:
        response["errors"] = errors

    return response


# ====================
# 验证响应
# ====================

def validation_response(
    valid: bool,
    message: str,
    errors: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    构造验证响应

    Args:
        valid: 是否通过验证
        message: 验证消息
        errors: 错误列表（可选）

    Returns:
        验证响应

    示例:
        return validation_response(
            valid=False,
            message="数据验证失败",
            errors=["期号格式不正确", "彩种类型无效"]
        )
    """
    response = {
        "valid": valid,
        "message": message
    }

    if errors:
        response["errors"] = errors

    return response


# ====================
# 兼容性包装器
# ====================

def legacy_format(data: Any) -> Any:
    """
    兼容旧API格式的包装器

    某些旧API直接返回数据而不是标准响应格式，
    此函数用于在需要时保持兼容性

    Args:
        data: 原始数据

    Returns:
        原始数据（不做任何转换）

    示例:
        # 某些旧API直接返回字典或列表
        return legacy_format({"records": rows})
    """
    return data


# ====================
# 响应格式转换器
# ====================

def convert_to_standard(
    legacy_response: Dict[str, Any],
    data_key: str = "data"
) -> Dict[str, Any]:
    """
    将旧格式响应转换为标准格式

    Args:
        legacy_response: 旧格式响应
        data_key: 数据字段名（默认"data"）

    Returns:
        标准格式响应

    示例:
        # 旧格式: {"records": [...], "total": 100}
        # 转换为: {"success": True, "data": {"records": [...], "total": 100}}
        return convert_to_standard(old_response)
    """
    return {
        "success": True,
        "message": "操作成功",
        data_key: legacy_response
    }
