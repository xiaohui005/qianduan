"""
数值处理工具模块

本模块提供彩票号码的循环计算功能，支持1-49范围内的数值环绕处理。

核心功能：
- 数值超出范围后自动循环到有效区间
- 支持正向和反向偏移计算
- 批量号码生成和偏移应用

设计原则：
- 单一职责：每个函数只负责一种计算逻辑
- 纯函数：无副作用，相同输入产生相同输出
- 类型安全：使用类型注解确保正确性
"""

from typing import List


def plus49_wrap(value: int) -> int:
    """
    正向循环包装：将大于49的值循环到1-49范围内

    功能说明：
        当数值超过49时，自动从1重新开始计数。
        例如：50 -> 1, 51 -> 2, 98 -> 49, 99 -> 1

    参数：
        value (int): 待处理的整数值

    返回：
        int: 循环后的值，保证在 [1, 49] 范围内

    示例：
        >>> plus49_wrap(50)
        1
        >>> plus49_wrap(49)
        49
        >>> plus49_wrap(0)
        49
        >>> plus49_wrap(-1)
        48

    算法说明：
        1. 先将超过49的值向下循环
        2. 再将小于等于0的值使用模运算映射到1-49
    """
    while value > 49:
        value = 1 + (value - 50)
    if value <= 0:
        value = ((value - 1) % 49) + 1
    return value


def minus49_wrap(value: int) -> int:
    """
    反向循环包装：将小于1的值循环到1-49范围内

    功能说明：
        当数值小于1时，自动从49向下计数。
        例如：0 -> 49, -1 -> 48, -48 -> 1, -49 -> 49

    参数：
        value (int): 待处理的整数值

    返回：
        int: 循环后的值，保证在 [1, 49] 范围内

    示例：
        >>> minus49_wrap(0)
        49
        >>> minus49_wrap(1)
        1
        >>> minus49_wrap(50)
        1
        >>> minus49_wrap(-5)
        44

    算法说明：
        1. 先将小于1的值向上循环
        2. 再将大于49的值使用模运算映射到1-49
    """
    while value < 1:
        value = 49 + (value - 0)
    if value > 49:
        value = ((value - 1) % 49) + 1
    return value


def wrap_in_range(
    value: int,
    min_val: int = 1,
    max_val: int = 49
) -> int:
    """
    通用循环包装：将数值循环到指定范围内

    功能说明：
        这是一个更通用的循环函数，支持自定义范围边界。
        适用于任何需要循环计算的场景（不仅限于1-49）。

    参数：
        value (int): 待处理的整数值
        min_val (int): 范围下界（包含），默认为1
        max_val (int): 范围上界（包含），默认为49

    返回：
        int: 循环后的值，保证在 [min_val, max_val] 范围内

    示例：
        >>> wrap_in_range(50, 1, 49)
        1
        >>> wrap_in_range(0, 1, 49)
        49
        >>> wrap_in_range(100, 1, 10)
        10
        >>> wrap_in_range(-5, 0, 99)
        94

    算法说明：
        使用模运算实现高效的循环计算：
        1. 将值转换到从0开始的偏移
        2. 对范围长度取模
        3. 转换回原始范围

    设计优势：
        - 比 plus49_wrap/minus49_wrap 更高效（无while循环）
        - 支持任意范围，扩展性强
        - 建议新代码优先使用此函数
    """
    range_size = max_val - min_val + 1
    # 转换为从0开始的偏移量
    offset = (value - min_val) % range_size
    # 转换回原始范围
    return min_val + offset


def apply_offsets(
    base: int,
    offsets: List[int],
    min_val: int = 1,
    max_val: int = 49
) -> List[int]:
    """
    批量应用偏移：基于基础值生成多个偏移后的号码

    功能说明：
        给定一个基础号码和一组偏移量，生成一系列新号码。
        常用于区间分析、号码推荐等场景。

    参数：
        base (int): 基础号码
        offsets (List[int]): 偏移量列表，可以是正数或负数
        min_val (int): 范围下界（包含），默认为1
        max_val (int): 范围上界（包含），默认为49

    返回：
        List[int]: 偏移后的号码列表

    示例：
        >>> apply_offsets(45, [1, 5, 10, 20])
        [46, 1, 6, 16]
        >>> apply_offsets(5, [-1, -5, -10])
        [4, 49, 44]
        >>> apply_offsets(25, list(range(1, 21)))  # 生成 +1~+20 区间
        [26, 27, 28, ..., 45]

    使用场景：
        1. 区间分析：生成 +1~+20, +5~+24 等区间号码
        2. 号码推荐：基于历史号码生成候选号码
        3. 遗漏分析：计算号码的前后邻居

    复杂度：
        时间复杂度 O(n)，其中 n 是 offsets 的长度
    """
    return [wrap_in_range(base + offset, min_val, max_val) for offset in offsets]


def generate_interval_range(
    base: int,
    start_offset: int,
    end_offset: int,
    min_val: int = 1,
    max_val: int = 49
) -> List[int]:
    """
    生成区间范围：基于基础值生成连续的号码区间

    功能说明：
        生成从 base+start_offset 到 base+end_offset 的所有号码。
        这是 apply_offsets 的特化版本，用于生成连续区间。

    参数：
        base (int): 基础号码
        start_offset (int): 起始偏移量
        end_offset (int): 结束偏移量（包含）
        min_val (int): 范围下界（包含），默认为1
        max_val (int): 范围上界（包含），默认为49

    返回：
        List[int]: 区间内的所有号码

    示例：
        >>> generate_interval_range(25, 1, 20)
        [26, 27, 28, ..., 45]
        >>> generate_interval_range(45, 5, 24)
        [1, 2, 3, ..., 20]
        >>> generate_interval_range(10, -5, 5)
        [5, 6, 7, ..., 15]

    使用场景：
        - 区间分析中快速生成 +1~+20 等标准区间
        - 比手动调用 apply_offsets(base, list(range(start, end+1))) 更清晰
    """
    offsets = list(range(start_offset, end_offset + 1))
    return apply_offsets(base, offsets, min_val, max_val)


def format_number_with_padding(num: int, width: int = 2) -> str:
    """
    格式化号码：添加前导零

    功能说明：
        将数字格式化为固定宽度的字符串，不足部分用0填充。
        彩票系统中常用于显示 01, 02 这样的格式。

    参数：
        num (int): 待格式化的数字
        width (int): 目标字符串宽度，默认为2

    返回：
        str: 格式化后的字符串

    示例：
        >>> format_number_with_padding(5)
        '05'
        >>> format_number_with_padding(49)
        '49'
        >>> format_number_with_padding(7, 3)
        '007'
    """
    return str(num).zfill(width)


def normalize_number(num) -> int:
    """
    标准化号码：将字符串或整数号码统一转换为整数

    功能说明：
        解决号码比较时"4"和"04"被视为不同的问题。
        将所有号码统一转换为整数，确保比较一致性。

    参数：
        num: 号码，可以是字符串（如"04", "4"）或整数（如4）

    返回：
        int: 标准化后的整数

    示例：
        >>> normalize_number("04")
        4
        >>> normalize_number("4")
        4
        >>> normalize_number(4)
        4
        >>> normalize_number(" 04 ")
        4
    """
    if isinstance(num, str):
        return int(num.strip())
    return int(num)


def normalize_number_list(numbers) -> List[int]:
    """
    批量标准化号码列表

    功能说明：
        将号码列表中的所有号码标准化为整数，去除重复。
        常用于命中判断前的预处理。

    参数：
        numbers: 号码列表，元素可以是字符串或整数

    返回：
        List[int]: 标准化后的整数列表

    示例：
        >>> normalize_number_list(["04", "4", "15", "49"])
        [4, 15, 49]
        >>> normalize_number_list([4, "04", 15, "15"])
        [4, 15]
    """
    # 使用set去重，然后转回list
    return list(set(normalize_number(n) for n in numbers))


def normalize_number_set(numbers) -> set:
    """
    批量标准化号码并返回集合

    功能说明：
        将号码列表/集合中的所有号码标准化为整数集合。
        专门用于命中判断的快速查找（in操作）。

    参数：
        numbers: 号码列表或集合，元素可以是字符串或整数

    返回：
        set: 标准化后的整数集合

    示例：
        >>> normalize_number_set(["04", "4", "15", "49"])
        {4, 15, 49}
        >>> normalize_number_set({4, "04", 15, "15"})
        {4, 15}
    """
    return set(normalize_number(n) for n in numbers)


# ============ 使用示例 ============

if __name__ == "__main__":
    print("=== 数值处理工具模块演示 ===\n")

    # 示例1: 正向循环
    print("1. 正向循环 (plus49_wrap)")
    test_values = [49, 50, 51, 98, 99, 0, -1]
    for val in test_values:
        result = plus49_wrap(val)
        print(f"   {val:3d} -> {result:2d}")

    # 示例2: 反向循环
    print("\n2. 反向循环 (minus49_wrap)")
    test_values = [1, 0, -1, -5, -48, -49, 50]
    for val in test_values:
        result = minus49_wrap(val)
        print(f"   {val:3d} -> {result:2d}")

    # 示例3: 通用循环（推荐）
    print("\n3. 通用循环 (wrap_in_range)")
    test_cases = [
        (50, 1, 49),
        (0, 1, 49),
        (100, 1, 10),
        (15, 0, 99),
    ]
    for val, min_v, max_v in test_cases:
        result = wrap_in_range(val, min_v, max_v)
        print(f"   wrap_in_range({val}, {min_v}, {max_v}) -> {result}")

    # 示例4: 批量偏移应用
    print("\n4. 批量偏移应用 (apply_offsets)")
    base = 45
    offsets = [1, 5, 10, 20, 25, 44]
    results = apply_offsets(base, offsets)
    print(f"   基础号码: {base}")
    print(f"   偏移量: {offsets}")
    print(f"   结果: {results}")

    # 示例5: 区间生成
    print("\n5. 区间生成 (generate_interval_range)")
    base = 25
    start, end = 1, 20
    interval = generate_interval_range(base, start, end)
    print(f"   基础号码: {base}")
    print(f"   区间: +{start}~+{end}")
    print(f"   生成号码: {interval[:5]}...{interval[-5:]} (共{len(interval)}个)")

    # 示例6: 号码格式化
    print("\n6. 号码格式化 (format_number_with_padding)")
    numbers = [1, 5, 25, 49]
    formatted = [format_number_with_padding(n) for n in numbers]
    print(f"   原始号码: {numbers}")
    print(f"   格式化后: {formatted}")
