"""
输入验证工具模块
提供通用的输入验证函数，用于确保API接收的参数符合预期
"""

from typing import Optional, List
from fastapi import HTTPException

# 允许的彩票类型
ALLOWED_LOTTERY_TYPES = {'am', 'hk'}

# 允许的年份范围（2020-2099）
MIN_YEAR = 2020
MAX_YEAR = 2099


def validate_lottery_type(lottery_type: str) -> str:
    """
    验证彩票类型参数

    Args:
        lottery_type: 彩票类型（'am' 或 'hk'）

    Returns:
        验证通过的彩票类型

    Raises:
        HTTPException: 如果参数不合法
    """
    if not lottery_type:
        raise HTTPException(status_code=400, detail="彩票类型不能为空")

    lottery_type = lottery_type.lower().strip()

    if lottery_type not in ALLOWED_LOTTERY_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"无效的彩票类型: {lottery_type}，允许的值: {', '.join(ALLOWED_LOTTERY_TYPES)}"
        )

    return lottery_type


def validate_year(year: Optional[str]) -> Optional[str]:
    """
    验证年份参数

    Args:
        year: 年份字符串（可选）

    Returns:
        验证通过的年份，如果为None则返回None

    Raises:
        HTTPException: 如果年份格式不正确或超出范围
    """
    if year is None or year == '':
        return None

    year = year.strip()

    # 验证年份格式（4位数字）
    if not year.isdigit() or len(year) != 4:
        raise HTTPException(status_code=400, detail=f"年份格式不正确: {year}，应为4位数字")

    year_int = int(year)
    if year_int < MIN_YEAR or year_int > MAX_YEAR:
        raise HTTPException(
            status_code=400,
            detail=f"年份超出范围: {year}，允许范围: {MIN_YEAR}-{MAX_YEAR}"
        )

    return year


def validate_period(period: str) -> str:
    """
    验证期号参数

    Args:
        period: 期号（格式：YYYYNNN，如 2025001）

    Returns:
        验证通过的期号

    Raises:
        HTTPException: 如果期号格式不正确
    """
    if not period:
        raise HTTPException(status_code=400, detail="期号不能为空")

    period = period.strip()

    # 验证期号格式（7位数字）
    if not period.isdigit() or len(period) != 7:
        raise HTTPException(
            status_code=400,
            detail=f"期号格式不正确: {period}，应为7位数字（YYYYNNN）"
        )

    # 验证年份部分
    year = period[:4]
    year_int = int(year)
    if year_int < MIN_YEAR or year_int > MAX_YEAR:
        raise HTTPException(
            status_code=400,
            detail=f"期号中的年份超出范围: {year}"
        )

    return period


def validate_position(position: int, min_pos: int = 1, max_pos: int = 7) -> int:
    """
    验证位置参数

    Args:
        position: 位置（1-7）
        min_pos: 最小位置（默认1）
        max_pos: 最大位置（默认7）

    Returns:
        验证通过的位置

    Raises:
        HTTPException: 如果位置超出范围
    """
    if position < min_pos or position > max_pos:
        raise HTTPException(
            status_code=400,
            detail=f"位置超出范围: {position}，允许范围: {min_pos}-{max_pos}"
        )

    return position


def validate_number(number: int, min_num: int = 1, max_num: int = 49) -> int:
    """
    验证号码参数

    Args:
        number: 号码（1-49）
        min_num: 最小号码（默认1）
        max_num: 最大号码（默认49）

    Returns:
        验证通过的号码

    Raises:
        HTTPException: 如果号码超出范围
    """
    if number < min_num or number > max_num:
        raise HTTPException(
            status_code=400,
            detail=f"号码超出范围: {number}，允许范围: {min_num}-{max_num}"
        )

    return number


def validate_page_params(page: int, page_size: int, max_page_size: int = 1000) -> tuple:
    """
    验证分页参数

    Args:
        page: 页码（从1开始）
        page_size: 每页大小
        max_page_size: 最大每页大小（默认1000）

    Returns:
        验证通过的 (page, page_size)

    Raises:
        HTTPException: 如果分页参数不合法
    """
    if page < 1:
        raise HTTPException(status_code=400, detail=f"页码必须大于0: {page}")

    if page_size < 1:
        raise HTTPException(status_code=400, detail=f"每页大小必须大于0: {page_size}")

    if page_size > max_page_size:
        raise HTTPException(
            status_code=400,
            detail=f"每页大小超出限制: {page_size}，最大允许: {max_page_size}"
        )

    return page, page_size


def validate_numbers_string(numbers_str: str, separator: str = ',') -> List[int]:
    """
    验证号码字符串（逗号分隔）

    Args:
        numbers_str: 号码字符串（如 "1,5,12,23"）
        separator: 分隔符（默认逗号）

    Returns:
        验证通过的号码列表

    Raises:
        HTTPException: 如果号码字符串格式不正确
    """
    if not numbers_str or not numbers_str.strip():
        raise HTTPException(status_code=400, detail="号码字符串不能为空")

    try:
        numbers = [int(n.strip()) for n in numbers_str.split(separator) if n.strip()]

        # 验证每个号码
        for num in numbers:
            validate_number(num)

        return numbers
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"号码字符串格式不正确: {numbers_str}，应为逗号分隔的数字"
        )
