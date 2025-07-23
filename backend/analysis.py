import pandas as pd
import collect

def simple_analysis(df: pd.DataFrame):
    # 示例：返回每列的唯一值数量
    return df.nunique().to_dict()

def analyze_intervals(lottery_type, period):
    """
    输入: lottery_type (如 'am'), period (如 '2025198')
    输出: {
      'base_period': period,
      'next_period': next_period,
      'base_numbers': [...],
      'next_numbers': [...],
      'analysis': [
        {
          'number': '01',
          'ranges': {
            '+1~+20': [...],
            '+5~+24': [...],
            ...
          },
          'hit': {
            '+1~+20': true/false,
            ...
          }
        }, ...
      ]
    }
    """
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    # 获取当前期开奖号码
    cursor.execute(
        "SELECT numbers FROM lottery_result WHERE period=%s AND lottery_type=%s",
        (period, lottery_type)
    )
    row = cursor.fetchone()
    if not row:
        return {'error': f'未找到期号{period}的数据'}
    base_numbers = row['numbers'].split(',')
    # 获取下一期期号和开奖号码
    cursor.execute(
        "SELECT period, numbers FROM lottery_result WHERE period > %s AND lottery_type=%s ORDER BY period ASC LIMIT 1",
        (period, lottery_type)
    )
    row = cursor.fetchone()
    if not row:
        return {'error': f'未找到期号{period}的下一期数据'}
    next_period = row['period']
    next_numbers = row['numbers'].split(',')
    # 区间定义
    intervals = [('+1~+20', 1, 20), ('+5~+24', 5, 24), ('+10~+29', 10, 29), ('+15~+34', 15, 34), ('+20~+39', 20, 39), ('+25~+44', 25, 44)]
    analysis = []
    for num in base_numbers:
        num_int = int(num)
        ranges = {}
        hit = {}
        for label, start, end in intervals:
            rng = [str(num_int + i).zfill(2) for i in range(start, end+1)]
            ranges[label] = rng
            # 判断下一期开奖号码是否在区间内
            hit[label] = any(n in rng for n in next_numbers)
        analysis.append({
            'number': num,
            'ranges': ranges,
            'hit': hit
        })
    cursor.close()
    conn.close()
    return {
        'base_period': period,
        'next_period': next_period,
        'base_numbers': base_numbers,
        'next_numbers': next_numbers,
        'analysis': analysis
    } 