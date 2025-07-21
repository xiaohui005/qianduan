import main
import collect
from collections import Counter

def run_recommend(lottery_type):
    print(f"开始为 {lottery_type} 生成推荐...")
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    # 查找最新的0或5结尾期号
    sql_base = "SELECT period FROM lottery_result WHERE RIGHT(period,1) IN ('0','5') AND lottery_type=%s ORDER BY period DESC LIMIT 1"
    cursor.execute(sql_base, (lottery_type,))
    row = cursor.fetchone()
    if not row:
        print(f"{lottery_type} 暂无数据，无法生成推荐")
        return
    base_period = row['period']
    sql = "SELECT period, numbers FROM lottery_result WHERE period <= %s AND lottery_type=%s ORDER BY period DESC LIMIT 50"
    cursor.execute(sql, (base_period, lottery_type))
    rows = cursor.fetchall()
    # 统计每个位置的号码出现频率和平均间隔
    pos_freq = [Counter() for _ in range(7)]
    pos_last_idx = [{} for _ in range(7)]
    for idx, row in enumerate(rows):
        nums = row['numbers'].split(',')
        for i in range(min(7, len(nums))):
            n = nums[i]
            pos_freq[i][n] += 1
            if n not in pos_last_idx[i]:
                pos_last_idx[i][n] = idx
    # 计算平均间隔
    pos_avg_gap = [{} for _ in range(7)]
    for i in range(7):
        for n in pos_freq[i]:
            count = pos_freq[i][n]
            last_idx = pos_last_idx[i][n]
            avg_gap = (50 - last_idx) / count if count else 999
            pos_avg_gap[i][n] = avg_gap
    # 推荐逻辑
    recommend = []
    for i in range(7):
        candidates = [n for n in pos_avg_gap[i] if 4 <= pos_avg_gap[i][n] <= 6]
        candidates.sort(key=lambda n: pos_last_idx[i][n])
        if len(candidates) < 8:
            freq_sorted = [n for n, _ in pos_freq[i].most_common() if n not in candidates]
            candidates += freq_sorted[:8-len(candidates)]
        sorted_candidates = sorted(candidates[:8], key=int)
        recommend.append(sorted_candidates)
    # 保存推荐结果到 recommend_result 表
    for i, nums in enumerate(recommend):
        cursor.execute(
            """
            INSERT INTO recommend_result (lottery_type, period, position, numbers, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), created_at=NOW()
            """,
            (lottery_type, base_period, i+1, ','.join(nums))
        )
    conn.commit()
    cursor.close()
    conn.close()
    print(f"{lottery_type} 推荐已生成并保存，基于期号: {base_period}")

if __name__ == "__main__":
    run_recommend('am')
    run_recommend('hk') 