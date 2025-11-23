"""
统一的错误处理工具模块

提供标准化的异常处理、错误响应格式和错误日志记录
"""

from typing import Optional, Dict, Any
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import traceback
from .logger import get_logger

logger = get_logger(__name__)


# ====================
# 自定义异常类
# ====================

class BaseAPIException(Exception):
    """API异常基类"""
    def __init__(self, message: str, error_code: str = "UNKNOWN_ERROR", details: Optional[Dict] = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class DataNotFoundException(BaseAPIException):
    """数据未找到异常"""
    def __init__(self, message: str = "数据未找到", details: Optional[Dict] = None):
        super().__init__(message, "DATA_NOT_FOUND", details)


class ValidationException(BaseAPIException):
    """数据验证异常"""
    def __init__(self, message: str = "数据验证失败", details: Optional[Dict] = None):
        super().__init__(message, "VALIDATION_ERROR", details)


class DatabaseException(BaseAPIException):
    """数据库操作异常"""
    def __init__(self, message: str = "数据库操作失败", details: Optional[Dict] = None):
        super().__init__(message, "DATABASE_ERROR", details)


class ExternalAPIException(BaseAPIException):
    """外部API调用异常"""
    def __init__(self, message: str = "外部API调用失败", details: Optional[Dict] = None):
        super().__init__(message, "EXTERNAL_API_ERROR", details)


class BusinessLogicException(BaseAPIException):
    """业务逻辑异常"""
    def __init__(self, message: str = "业务逻辑错误", details: Optional[Dict] = None):
        super().__init__(message, "BUSINESS_LOGIC_ERROR", details)


# ====================
# 错误处理装饰器
# ====================

def handle_errors(func):
    """
    错误处理装饰器 - 捕获函数中的异常并返回统一格式的错误响应

    使用示例:
        @router.get("/api/example")
        @handle_errors
        async def example_endpoint():
            # 业务逻辑
            return {"data": "success"}
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except BaseAPIException as e:
            logger.error(f"API异常 [{e.error_code}]: {e.message}", exc_info=True)
            return error_response(e.message, e.error_code, e.details)
        except HTTPException as e:
            logger.error(f"HTTP异常 [{e.status_code}]: {e.detail}", exc_info=True)
            return error_response(str(e.detail), f"HTTP_{e.status_code}")
        except Exception as e:
            logger.error(f"未知异常: {str(e)}", exc_info=True)
            return error_response(
                f"服务器内部错误: {str(e)}",
                "INTERNAL_SERVER_ERROR",
                {"traceback": traceback.format_exc()}
            )

    # 处理同步函数
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except BaseAPIException as e:
            logger.error(f"API异常 [{e.error_code}]: {e.message}", exc_info=True)
            return error_response(e.message, e.error_code, e.details)
        except HTTPException as e:
            logger.error(f"HTTP异常 [{e.status_code}]: {e.detail}", exc_info=True)
            return error_response(str(e.detail), f"HTTP_{e.status_code}")
        except Exception as e:
            logger.error(f"未知异常: {str(e)}", exc_info=True)
            return error_response(
                f"服务器内部错误: {str(e)}",
                "INTERNAL_SERVER_ERROR",
                {"traceback": traceback.format_exc()}
            )

    # 判断是否为异步函数
    import inspect
    if inspect.iscoroutinefunction(func):
        return wrapper
    else:
        return sync_wrapper


# ====================
# 错误响应构造函数
# ====================

def error_response(
    message: str,
    error_code: str = "UNKNOWN_ERROR",
    details: Optional[Dict] = None,
    status_code: int = 200
) -> Dict[str, Any]:
    """
    构造标准错误响应

    Args:
        message: 错误消息
        error_code: 错误代码
        details: 详细信息（可选）
        status_code: HTTP状态码（默认200，保持与现有API兼容）

    Returns:
        标准错误响应字典

    示例:
        return error_response("数据未找到", "DATA_NOT_FOUND", {"period": "2025100"})
        # 返回: {"success": False, "message": "数据未找到", "error_code": "DATA_NOT_FOUND", "details": {"period": "2025100"}}
    """
    response = {
        "success": False,
        "message": message,
        "error_code": error_code
    }

    if details:
        response["details"] = details

    return response


# ====================
# 数据库错误处理
# ====================

def handle_db_error(error: Exception, operation: str = "数据库操作") -> Dict[str, Any]:
    """
    处理数据库错误并返回友好的错误信息

    Args:
        error: 数据库异常对象
        operation: 操作描述

    Returns:
        错误响应字典

    示例:
        try:
            cursor.execute(sql)
        except Exception as e:
            return handle_db_error(e, "查询开奖记录")
    """
    error_msg = str(error)

    # 常见数据库错误解析
    if "Duplicate entry" in error_msg:
        user_msg = f"{operation}失败: 数据已存在，请勿重复提交"
        error_code = "DUPLICATE_DATA"
    elif "foreign key constraint" in error_msg.lower():
        user_msg = f"{operation}失败: 关联数据不存在或无法删除"
        error_code = "FOREIGN_KEY_VIOLATION"
    elif "doesn't exist" in error_msg.lower():
        user_msg = f"{operation}失败: 数据表不存在，请联系管理员"
        error_code = "TABLE_NOT_FOUND"
    elif "Connection" in error_msg or "connect" in error_msg.lower():
        user_msg = f"{operation}失败: 数据库连接失败，请稍后重试"
        error_code = "DB_CONNECTION_ERROR"
    elif "Deadlock" in error_msg:
        user_msg = f"{operation}失败: 数据库繁忙，请稍后重试"
        error_code = "DB_DEADLOCK"
    else:
        user_msg = f"{operation}失败: {error_msg}"
        error_code = "DATABASE_ERROR"

    logger.error(f"数据库错误 [{error_code}] {operation}: {error_msg}", exc_info=True)

    return error_response(user_msg, error_code, {"原始错误": error_msg})


# ====================
# 参数验证错误处理
# ====================

def validate_required_params(params: Dict[str, Any], required_fields: list) -> Optional[Dict[str, Any]]:
    """
    验证必需参数是否存在

    Args:
        params: 参数字典
        required_fields: 必需字段列表

    Returns:
        如果验证失败返回错误响应，成功返回None

    示例:
        error = validate_required_params(
            {"name": "test"},
            ["name", "description"]
        )
        if error:
            return error
    """
    missing_fields = []

    for field in required_fields:
        if field not in params or params[field] is None or params[field] == "":
            missing_fields.append(field)

    if missing_fields:
        return error_response(
            f"缺少必需参数: {', '.join(missing_fields)}",
            "MISSING_REQUIRED_PARAMS",
            {"missing_fields": missing_fields}
        )

    return None


# ====================
# 业务逻辑错误处理
# ====================

def check_data_exists(data: Any, data_type: str = "数据", identifier: str = "") -> Optional[Dict[str, Any]]:
    """
    检查数据是否存在

    Args:
        data: 数据对象（None或空列表表示不存在）
        data_type: 数据类型描述
        identifier: 数据标识符（如期号、ID等）

    Returns:
        如果数据不存在返回错误响应，存在返回None

    示例:
        error = check_data_exists(result, "开奖记录", period)
        if error:
            return error
    """
    if data is None or (isinstance(data, list) and len(data) == 0):
        message = f"{data_type}不存在"
        if identifier:
            message += f": {identifier}"

        return error_response(
            message,
            "DATA_NOT_FOUND",
            {"data_type": data_type, "identifier": identifier}
        )

    return None


# ====================
# 外部API错误处理
# ====================

def handle_external_api_error(
    error: Exception,
    api_name: str = "外部API",
    fallback_attempted: bool = False
) -> Dict[str, Any]:
    """
    处理外部API调用错误

    Args:
        error: 异常对象
        api_name: API名称
        fallback_attempted: 是否已尝试备用源

    Returns:
        错误响应字典

    示例:
        try:
            response = httpx.get(url)
        except Exception as e:
            return handle_external_api_error(e, "开奖数据API", fallback_attempted=True)
    """
    error_msg = str(error)

    if "timeout" in error_msg.lower():
        user_msg = f"{api_name}请求超时"
        error_code = "API_TIMEOUT"
    elif "connect" in error_msg.lower() or "connection" in error_msg.lower():
        user_msg = f"{api_name}连接失败"
        error_code = "API_CONNECTION_ERROR"
    elif "404" in error_msg:
        user_msg = f"{api_name}接口不存在"
        error_code = "API_NOT_FOUND"
    else:
        user_msg = f"{api_name}调用失败: {error_msg}"
        error_code = "EXTERNAL_API_ERROR"

    if fallback_attempted:
        user_msg += "，备用源也失败"

    logger.error(f"外部API错误 [{error_code}] {api_name}: {error_msg}", exc_info=True)

    return error_response(user_msg, error_code, {"api": api_name, "原始错误": error_msg})


# ====================
# 通用try-except包装器
# ====================

def safe_execute(operation_name: str, func, *args, **kwargs):
    """
    安全执行函数并处理异常

    Args:
        operation_name: 操作名称（用于日志）
        func: 要执行的函数
        *args, **kwargs: 函数参数

    Returns:
        (success, result_or_error)
        - success=True时，result_or_error是函数返回值
        - success=False时，result_or_error是错误响应字典

    示例:
        success, result = safe_execute(
            "查询开奖记录",
            cursor.execute,
            sql, params
        )
        if not success:
            return result  # 返回错误响应
    """
    try:
        result = func(*args, **kwargs)
        return True, result
    except Exception as e:
        logger.error(f"{operation_name}失败: {str(e)}", exc_info=True)
        error = error_response(
            f"{operation_name}失败: {str(e)}",
            "OPERATION_FAILED",
            {"operation": operation_name, "原始错误": str(e)}
        )
        return False, error


# ====================
# 全局异常处理器（用于FastAPI）
# ====================

async def global_exception_handler(request: Request, exc: Exception):
    """
    全局异常处理器（可在main.py中注册）

    使用示例（在main.py中）:
        from backend.utils.error_handler import global_exception_handler
        app.add_exception_handler(Exception, global_exception_handler)
    """
    logger.error(f"全局异常处理器捕获: {str(exc)}", exc_info=True)

    if isinstance(exc, BaseAPIException):
        return JSONResponse(
            status_code=200,  # 保持与现有API兼容
            content={
                "success": False,
                "message": exc.message,
                "error_code": exc.error_code,
                "details": exc.details
            }
        )

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": f"服务器内部错误: {str(exc)}",
            "error_code": "INTERNAL_SERVER_ERROR"
        }
    )
