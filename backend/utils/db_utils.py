"""
数据库操作工具模块

本模块提供数据库操作的高级封装，简化常见的CRUD操作。

核心功能：
- 上下文管理器自动管理连接和游标
- 简化的查询接口
- 彩票业务专用的查询函数（期号查找等）

设计原则：
- DRY（Don't Repeat Yourself）：消除重复的数据库操作代码
- 资源安全：使用上下文管理器确保连接正确关闭
- 类型安全：提供类型注解和默认参数
- 业务解耦：将通用操作与业务逻辑分离
"""

from contextlib import contextmanager
from typing import List, Dict, Tuple, Optional, Any
from backend import collect


@contextmanager
def get_db_cursor(dictionary: bool = True, commit: bool = False):
    """
    数据库游标上下文管理器

    功能说明：
        自动管理数据库连接和游标的生命周期，确保资源正确释放。
        使用 with 语句后，无需手动调用 close()。

    参数：
        dictionary (bool): 是否以字典形式返回查询结果
            - True: 返回 [{'field': value, ...}, ...]
            - False: 返回 [(value1, value2, ...), ...]
        commit (bool): 是否在退出时自动提交事务
            - True: 执行 INSERT/UPDATE/DELETE 后自动提交
            - False: 只读操作，不提交事务（默认）

    产出：
        游标对象，可用于执行SQL语句

    示例：
        >>> # 只读查询
        >>> with get_db_cursor() as cursor:
        ...     cursor.execute("SELECT * FROM lottery_result WHERE period=%s", ('2025001',))
        ...     result = cursor.fetchall()
        ...     # 自动关闭连接，即使发生异常

        >>> # 写入操作
        >>> with get_db_cursor(commit=True) as cursor:
        ...     cursor.execute("INSERT INTO places (name) VALUES (%s)", ('新关注点',))
        ...     # 自动提交事务并关闭连接

    设计优势：
        1. 防止连接泄漏：无论是否发生异常，都会关闭连接
        2. 代码简洁：减少重复的 try-finally 代码块
        3. 符合Python惯例：使用 with 语句的标准模式
        4. 事务安全：写入操作自动提交，异常时不提交

    替换前后对比：
        # 旧代码（14行）
        conn = collect.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("INSERT ...")
            conn.commit()
        finally:
            cursor.close()
            conn.close()

        # 新代码（3行）
        with get_db_cursor(commit=True) as cursor:
            cursor.execute("INSERT ...")
            # 自动提交并关闭
    """
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield cursor
        if commit:
            conn.commit()
    finally:
        cursor.close()
        conn.close()


def query_records(
    sql: str,
    params: Tuple = (),
    dictionary: bool = True
) -> List[Dict[str, Any]] | List[Tuple]:
    """
    执行查询并返回所有结果

    功能说明：
        封装完整的查询流程：连接 → 查询 → 获取结果 → 关闭。
        适用于简单的SELECT查询，一行代码完成所有操作。

    参数：
        sql (str): SQL查询语句，使用 %s 作为占位符
        params (Tuple): 查询参数，按顺序替换SQL中的 %s
        dictionary (bool): 是否以字典形式返回结果，默认True

    返回：
        List[Dict] 或 List[Tuple]: 查询结果列表

    示例：
        >>> # 字典模式（推荐）
        >>> rows = query_records(
        ...     "SELECT period, numbers FROM lottery_result WHERE lottery_type=%s LIMIT 10",
        ...     ('am',)
        ... )
        >>> print(rows[0]['period'])  # '2025001'

        >>> # 元组模式
        >>> rows = query_records(
        ...     "SELECT period, numbers FROM lottery_result WHERE period>%s",
        ...     ('2025000',),
        ...     dictionary=False
        ... )
        >>> print(rows[0][0])  # '2025001'

    安全性：
        使用参数化查询防止SQL注入：
        - 正确：query_records("SELECT * WHERE id=%s", (user_input,))
        - 错误：query_records(f"SELECT * WHERE id={user_input}")

    性能提示：
        - 对于大结果集，考虑使用分页或流式查询
        - 尽量在SQL层面进行过滤，减少传输数据量
    """
    with get_db_cursor(dictionary=dictionary) as cursor:
        cursor.execute(sql, params)
        return cursor.fetchall()


def query_one_record(
    sql: str,
    params: Tuple = (),
    dictionary: bool = True
) -> Optional[Dict[str, Any]] | Optional[Tuple]:
    """
    执行查询并返回单条结果

    功能说明：
        查询并返回第一条记录，常用于主键查询或唯一性查询。
        如果没有结果，返回 None。

    参数：
        sql (str): SQL查询语句
        params (Tuple): 查询参数
        dictionary (bool): 是否以字典形式返回结果，默认True

    返回：
        Dict 或 Tuple 或 None: 查询结果，无结果时返回None

    示例：
        >>> # 查询最新一期数据
        >>> latest = query_one_record(
        ...     "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT 1",
        ...     ('am',)
        ... )
        >>> if latest:
        ...     print(f"最新期号: {latest['period']}")

    使用场景：
        - 根据主键查询单条记录
        - 获取聚合函数结果（COUNT, MAX, MIN等）
        - 检查记录是否存在
    """
    with get_db_cursor(dictionary=dictionary) as cursor:
        cursor.execute(sql, params)
        return cursor.fetchone()


def execute_update(
    sql: str,
    params: Tuple = ()
) -> int:
    """
    执行INSERT/UPDATE/DELETE语句

    功能说明：
        执行数据修改语句并提交事务，返回受影响的行数。

    参数：
        sql (str): SQL语句（INSERT/UPDATE/DELETE）
        params (Tuple): 查询参数

    返回：
        int: 受影响的行数

    示例：
        >>> # 插入新记录
        >>> affected = execute_update(
        ...     "INSERT INTO lottery_result (period, lottery_type, numbers) VALUES (%s, %s, %s)",
        ...     ('2025100', 'am', '01,05,12,23,35,42,49')
        ... )
        >>> print(f"插入了 {affected} 条记录")

        >>> # 更新记录
        >>> affected = execute_update(
        ...     "UPDATE lottery_result SET numbers=%s WHERE period=%s",
        ...     ('01,02,03,04,05,06,07', '2025100')
        ... )

    事务说明：
        - 每次调用自动提交事务
        - 如需批量操作，请使用 execute_batch()
    """
    conn = collect.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(sql, params)
        conn.commit()
        return cursor.rowcount
    finally:
        cursor.close()
        conn.close()


def execute_batch(
    sql: str,
    params_list: List[Tuple]
) -> int:
    """
    批量执行INSERT/UPDATE语句

    功能说明：
        在单个事务中执行多条语句，提高性能。
        适用于批量插入或更新场景。

    参数：
        sql (str): SQL语句模板
        params_list (List[Tuple]): 参数列表，每个元素对应一条语句

    返回：
        int: 总受影响的行数

    示例：
        >>> # 批量插入推荐结果
        >>> sql = "INSERT INTO recommend_result (period, position, numbers, lottery_type) VALUES (%s, %s, %s, %s)"
        >>> params = [
        ...     ('2025100', 1, '01,05,12,23,35,42,49,48', 'am'),
        ...     ('2025100', 2, '03,08,15,22,31,39,44,46', 'am'),
        ...     ('2025100', 3, '02,07,14,25,33,40,45,47', 'am'),
        ... ]
        >>> total = execute_batch(sql, params)
        >>> print(f"批量插入了 {total} 条记录")

    性能优势：
        - 单次事务提交，减少IO开销
        - 比循环调用 execute_update() 快5-10倍
    """
    conn = collect.get_connection()
    cursor = conn.cursor()
    total_affected = 0
    try:
        for params in params_list:
            cursor.execute(sql, params)
            total_affected += cursor.rowcount
        conn.commit()
        return total_affected
    finally:
        cursor.close()
        conn.close()


# ============ 彩票业务专用工具 ============

def find_next_period(
    lottery_type: str,
    current_period: str
) -> Optional[str]:
    """
    查找指定期号的下一期

    功能说明：
        根据当前期号查找时间上的下一期期号。
        如果当前期是最新期，返回 None。

    参数：
        lottery_type (str): 彩种类型（'am' 或 'hk'）
        current_period (str): 当前期号

    返回：
        Optional[str]: 下一期期号，如果不存在则返回None

    示例：
        >>> next_p = find_next_period('am', '2025100')
        >>> if next_p:
        ...     print(f"下一期是: {next_p}")
        ... else:
        ...     print("已是最新期")

    算法说明：
        通过SQL查询找到期号大于当前期的最小期号（按时间升序）。

    使用场景：
        - 区间分析：检查下一期是否命中
        - 推荐验证：获取下一期实际开奖结果
        - 遗漏计算：统计连续遗漏期数
    """
    sql = """
        SELECT period FROM lottery_result
        WHERE lottery_type=%s AND period>%s
        ORDER BY period ASC
        LIMIT 1
    """
    result = query_one_record(sql, (lottery_type, current_period))
    return result['period'] if result else None


def get_latest_period(
    lottery_type: str,
    ending_digit: Optional[str] = None
) -> Optional[str]:
    """
    获取最新期号

    功能说明：
        查询指定彩种的最新期号，可选按期号尾数过滤。

    参数：
        lottery_type (str): 彩种类型（'am' 或 'hk'）
        ending_digit (Optional[str]): 期号结尾数字，如 '0', '5'
            - None: 返回最新期，不考虑尾数
            - '0': 返回最新的以0结尾的期号
            - '5': 返回最新的以5结尾的期号

    返回：
        Optional[str]: 期号，如果不存在则返回None

    示例：
        >>> # 获取最新期
        >>> latest = get_latest_period('am')
        >>> print(f"最新期: {latest}")

        >>> # 获取最新的以0或5结尾的期号（触发推荐生成的期号）
        >>> latest_trigger = get_latest_period('am', '0')
        >>> if not latest_trigger:
        ...     latest_trigger = get_latest_period('am', '5')

    使用场景：
        - 首页展示最新开奖信息
        - 检查是否需要生成推荐号码
        - 数据采集后验证是否为新期号
    """
    if ending_digit is None:
        sql = """
            SELECT period FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT 1
        """
        params = (lottery_type,)
    else:
        sql = """
            SELECT period FROM lottery_result
            WHERE lottery_type=%s AND period LIKE %s
            ORDER BY period DESC
            LIMIT 1
        """
        params = (lottery_type, f'%{ending_digit}')

    result = query_one_record(sql, params)
    return result['period'] if result else None


def get_recent_periods(
    lottery_type: str,
    limit: int = 50,
    ending_digit: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    获取最近N期的开奖数据

    功能说明：
        查询最近的若干期开奖记录，按期号降序排列。
        可选按期号尾数过滤。

    参数：
        lottery_type (str): 彩种类型（'am' 或 'hk'）
        limit (int): 返回的记录数，默认50期
        ending_digit (Optional[str]): 期号结尾数字过滤

    返回：
        List[Dict]: 开奖记录列表，每条记录包含 period, numbers, animals, open_time 等字段

    示例：
        >>> # 获取最近50期数据用于推荐算法
        >>> recent = get_recent_periods('am', limit=50)
        >>> for record in recent:
        ...     print(f"{record['period']}: {record['numbers']}")

        >>> # 只获取以0或5结尾的期号（推荐生成的基础数据）
        >>> trigger_periods = get_recent_periods('am', limit=20, ending_digit='0')

    使用场景：
        - 推荐算法：基于最近50期生成推荐号码
        - 遗漏分析：计算号码的历史遗漏情况
        - 趋势分析：统计号码出现频率
    """
    if ending_digit is None:
        sql = """
            SELECT * FROM lottery_result
            WHERE lottery_type=%s
            ORDER BY period DESC
            LIMIT %s
        """
        params = (lottery_type, limit)
    else:
        sql = """
            SELECT * FROM lottery_result
            WHERE lottery_type=%s AND period LIKE %s
            ORDER BY period DESC
            LIMIT %s
        """
        params = (lottery_type, f'%{ending_digit}', limit)

    return query_records(sql, params)


def check_period_exists(
    lottery_type: str,
    period: str
) -> bool:
    """
    检查期号是否已存在

    功能说明：
        判断指定彩种的期号是否已经录入数据库。
        常用于数据采集前的去重检查。

    参数：
        lottery_type (str): 彩种类型（'am' 或 'hk'）
        period (str): 期号

    返回：
        bool: 存在返回True，不存在返回False

    示例：
        >>> if not check_period_exists('am', '2025100'):
        ...     # 执行数据采集
        ...     collect_lottery_data('am', '2025100')
        ... else:
        ...     print("该期号已存在，跳过采集")

    使用场景：
        - 数据采集去重：避免重复采集
        - 定时任务检查：判断是否需要采集新数据
        - 数据完整性验证：检查历史数据是否缺失
    """
    sql = """
        SELECT COUNT(*) as count FROM lottery_result
        WHERE lottery_type=%s AND period=%s
    """
    result = query_one_record(sql, (lottery_type, period), dictionary=True)
    return result['count'] > 0 if result else False


# ============ 使用示例 ============

if __name__ == "__main__":
    print("=== 数据库工具模块演示 ===\n")

    # 示例1: 使用上下文管理器
    print("1. 上下文管理器 (get_db_cursor)")
    with get_db_cursor() as cursor:
        cursor.execute("SELECT period, numbers FROM lottery_result WHERE lottery_type=%s LIMIT 3", ('am',))
        rows = cursor.fetchall()
        for row in rows:
            print(f"   期号: {row['period']}, 号码: {row['numbers']}")

    # 示例2: 简化查询
    print("\n2. 简化查询 (query_records)")
    rows = query_records(
        "SELECT period, open_time FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT 5",
        ('am',)
    )
    print(f"   查询到 {len(rows)} 条记录")
    for row in rows:
        print(f"   {row['period']}: {row['open_time']}")

    # 示例3: 单条查询
    print("\n3. 单条查询 (query_one_record)")
    latest = query_one_record(
        "SELECT * FROM lottery_result WHERE lottery_type=%s ORDER BY period DESC LIMIT 1",
        ('am',)
    )
    if latest:
        print(f"   最新期号: {latest['period']}")
        print(f"   开奖号码: {latest['numbers']}")

    # 示例4: 查找下一期
    print("\n4. 查找下一期 (find_next_period)")
    current = '2025100'
    next_period = find_next_period('am', current)
    if next_period:
        print(f"   {current} 的下一期是: {next_period}")
    else:
        print(f"   {current} 已是最新期")

    # 示例5: 获取最新期号
    print("\n5. 获取最新期号 (get_latest_period)")
    latest_period = get_latest_period('am')
    print(f"   澳门彩最新期号: {latest_period}")

    latest_trigger = get_latest_period('am', '0')
    print(f"   最新的以0结尾期号: {latest_trigger}")

    # 示例6: 获取最近N期数据
    print("\n6. 获取最近N期数据 (get_recent_periods)")
    recent = get_recent_periods('am', limit=10)
    print(f"   最近10期期号: {[r['period'] for r in recent]}")

    # 示例7: 检查期号是否存在
    print("\n7. 检查期号是否存在 (check_period_exists)")
    test_periods = ['2025001', '9999999']
    for period in test_periods:
        exists = check_period_exists('am', period)
        status = "存在" if exists else "不存在"
        print(f"   期号 {period}: {status}")
